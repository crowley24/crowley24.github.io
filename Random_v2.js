(function () {  
    'use strict';  
  
    var PLUGIN_ID = 'lampa_random_pro';  
    var STORAGE_KEY = 'lampa_random_pro_settings';  
    var CACHE_KEY = 'lampa_random_pro_cache';  
    var HISTORY_KEY = 'lampa_random_pro_history';  
    var CACHE_DURATION = 3 * 60 * 1000; // Зменшено для частіших оновлень  
      
    var menuAdded = false;  
  
    // Розширені жанри з категоріями  
    var GENRE_CATEGORIES = {  
        action: [28, 53, 10752], // Бойовик, Трилер, Військовий  
        drama: [18, 10749, 36], // Драма, Мелодрама, Історія  
        comedy: [35, 10751], // Комедія, Сімейний  
        scifi: [878, 14, 27], // Фантастика, Фентезі, Жахи  
        adventure: [12, 37], // Пригоди, Вестерн  
        other: [99, 10402, 9648] // Документальний, Музика, Містика  
    };  
  
    var ALL_GENRES = {  
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',  
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',  
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',  
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'  
    };  
  
    // Нова логіка підборки з інтелектуальними режимами  
    var SELECTION_STRATEGIES = {  
        balanced: {  
            title: 'Збалансований',  
            description: 'Оптимальне поєднання популярності та рейтингу',  
            weight: { popularity: 0.4, rating: 0.4, random: 0.2 }  
        },  
        discovery: {  
            title: 'Відкриття',  
            description: 'Менш відомі, але якісні фільми',  
            weight: { popularity: 0.1, rating: 0.6, random: 0.3 }  
        },  
        trending: {  
            title: 'Тренди',  
            description: 'Тільки популярний контент',  
            weight: { popularity: 0.7, rating: 0.2, random: 0.1 }  
        },  
        hidden_gems: {  
            title: 'Приховані перлини',  
            description: 'Високий рейтинг, низька популярність',  
            weight: { popularity: 0.1, rating: 0.7, random: 0.2 }  
        },  
        mixed: {  
            title: 'Мікс',  
            description: 'Повністю випадковий вибір',  
            weight: { popularity: 0.3, rating: 0.3, random: 0.4 }  
        }  
    };  
  
    function tr(uk, ru) {  
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;  
    }  
  
    function getSettings() {  
        var def = {  
            genres: [],  
            type: 'all',  
            strategy: 'balanced',  
            yearRange: 'modern',  
            minRating: 6.0,  
            maxResults: 20,  
            useCache: false, // Вимкнено за замовчуванням для різноманітності  
            excludeWatched: true,  
            enableHistory: true,  
            diversityMode: 'high'  
        };  
        var saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign(def, saved || {});  
    }  
  
    function saveSettings(data) {  
        Lampa.Storage.set(STORAGE_KEY, data);  
        clearCache();  
    }  
  
    function getHistory() {  
        return Lampa.Storage.get(HISTORY_KEY) || [];  
    }  
  
    function addToHistory(items) {  
        if (!getSettings().enableHistory) return;  
          
        var history = getHistory();  
        var newItems = items.slice(0, 5); // Зберігаємо тільки перші 5  
          
        newItems.forEach(function(item) {  
            if (!history.find(function(h) { return h.id === item.id; })) {  
                history.unshift({  
                    id: item.id,  
                    title: item.title || item.name,  
                    added: Date.now()  
                });  
            }  
        });  
          
        // Обмежуємо історію  
        history = history.slice(0, 100);  
        Lampa.Storage.set(HISTORY_KEY, history);  
    }  
  
    function getCache() {  
        if (!getSettings().useCache) return null;  
        var cached = Lampa.Storage.get(CACHE_KEY);  
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {  
            return cached.data;  
        }  
        return null;  
    }  
  
    function setCache(data, config) {  
        if (!getSettings().useCache) return;  
        Lampa.Storage.set(CACHE_KEY, {  
            data: data,  
            config: config,  
            timestamp: Date.now()  
        });  
    }  
  
    function clearCache() {  
        Lampa.Storage.set(CACHE_KEY, null);  
    }  
  
    // Нова система діапазонів років  
    function getYearParameters(rangeFilter, type) {  
        var currentYear = new Date().getFullYear();  
        var ranges = {  
            'latest': { start: currentYear - 2, end: currentYear },  
            'modern': { start: currentYear - 10, end: currentYear },  
            '2000s': { start: 2000, end: 2009 },  
            '90s': { start: 1990, end: 1999 },  
            '80s': { start: 1980, end: 1989 },  
            'classic': { start: 1950, end: 1990 },  
            'golden': { start: 1930, end: 1970 },  
            'all': { start: 1900, end: currentYear }  
        };  
  
        var selected = ranges[rangeFilter] || ranges.modern;  
        var dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';  
          
        return {  
            [dateField + '.gte']: selected.start + '-01-01',  
            [dateField + '.lte']: selected.end + '-12-31'  
        };  
    }  
  
    // Інтелектуальний вибір жанрів  
    function selectGenres(settings) {  
        if (settings.genres.length === 0) return null;  
          
        var strategy = SELECTION_STRATEGIES[settings.strategy];  
        var history = getHistory();  
          
        // Аналізуємо історію для уникнення повторень  
        var recentGenres = new Set();  
        history.slice(0, 20).forEach(function(item) {  
            // Тут можна додати логіку отримання жанрів з історії  
        });  
          
        if (settings.strategy === 'discovery' || settings.strategy === 'hidden_gems') {  
            // Вибираємо менш популярні жанри  
            var lessPopular = settings.genres.filter(function(g) {  
                return ![28, 35, 18].includes(parseInt(g)); // Виключаємо найпопулярніші  
            });  
              
            if (lessPopular.length > 0 && Math.random() > 0.3) {  
                return lessPopular[Math.floor(Math.random() * lessPopular.length)];  
            }  
        }  
          
        // Випадковий вибір з урахуванням ваги  
        if (Math.random() > 0.6 && settings.genres.length > 1) {  
            // Комбінація жанрів  
            var numGenres = Math.min(Math.floor(Math.random() * 2) + 1, settings.genres.length);  
            var selected = [];  
            var temp = settings.genres.slice();  
              
            for (var i = 0; i < numGenres; i++) {  
                var idx = Math.floor(Math.random() * temp.length);  
                selected.push(temp[idx]);  
                temp.splice(idx, 1);  
            }  
              
            return selected.join(',');  
        }  
          
        return settings.genres[Math.floor(Math.random() * settings.genres.length)];  
    }  
  
    // Динамічне сортування  
    function getSortOrder(strategy) {  
        var orders = {  
            'balanced': ['popularity.desc', 'vote_average.desc', 'vote_count.desc'],  
            'discovery': ['vote_average.desc', 'vote_count.desc', 'popularity.desc'],  
            'trending': ['popularity.desc', 'vote_count.desc', 'revenue.desc'],  
            'hidden_gems': ['vote_average.desc', 'vote_count.asc', 'popularity.desc'],  
            'mixed': ['popularity.desc', 'vote_average.desc', 'release_date.desc']  
        };  
          
        var strategyOrders = orders[strategy] || orders.balanced;  
        return strategyOrders[Math.floor(Math.random() * strategyOrders.length)];  
    }  
  
    // Нова функція конфігурації з розширеною логікою  
    function getRandomConfig() {  
        var s = getSettings();  
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';  
        var type = s.type === 'all' ? (Math.random() > 0.5 ? 'movie' : 'tv') : s.type;  
          
        // Розширений діапазон сторінок для максимальної різноманітності  
        var maxPages = s.strategy === 'trending' ? 20 : 100;  
        var strategy = SELECTION_STRATEGIES[s.strategy];  
          
        var params = {  
            'language': lang,  
            'sort_by': getSortOrder(s.strategy),  
            'page': Math.floor(Math.random() * maxPages) + 1,  
            'vote_average.gte': s.minRating - (Math.random() * 1.5), // Невелика варіація рейтингу  
            'vote_count.gte': Math.floor(Math.random() * 100) + 50 // Динамічний поріг голосів  
        };  
  
        // Додаємо параметри років  
        var yearParams = getYearParameters(s.yearRange, type);  
        Object.assign(params, yearParams);  
  
        // Інтелектуальний вибір жанрів  
        var selectedGenres = selectGenres(s);  
        if (selectedGenres) {  
            params.with_genres = selectedGenres;  
        }  
  
        // Додаємо випадкові фільтри для різноманітності  
        if (Math.random() > 0.7) {  
            // Випадкове виключення жанрів  
            var excludeGenres = [99, 10763]; // Документальний, Новини  
            params.without_genres = excludeGenres[Math.floor(Math.random() * excludeGenres.length)];  
        }  
  
        if (Math.random() > 0.8) {  
            // Фільтрація по мовах  
            var languages = ['uk', 'ru', 'en'];  
            params.with_original_language = languages[Math.floor(Math.random() * languages.length)];  
        }  
  
        return { type: type, params: params };  
    }  
  
    // Покращена фільтрація з урахуванням історії  
    function filterResults(results, settings) {  
        var history = getHistory();  
        var historyIds = new Set(history.map(function(h) { return h.id; }));  
          
        return results.filter(function(item) {  
            // Виключаємо з історії  
            if (settings.enableHistory && historyIds.has(item.id)) {  
                return Math.random() > 0.9; // 10% шанс показати повторно  
            }  
              
            // Додаткова перевірка рейтингу  
            if (item.vote_average < settings.minRating - 0.5) return false;  
              
            return true;  
        });  
    }  
  
    function filterWatched(results) {  
        if (!getSettings().excludeWatched) return results;  
          
        var watched = Lampa.Storage.get('files_watched') || {};  
        return results.filter(function(item) {  
            return !watched[item.id];  
        });  
    }  
  
    function injectToMain() {  
        if (Lampa.ContentRows.call.__random_pro) return;  
        Lampa.ContentRows.call.__random_pro = true;  
  
        var original = Lampa.ContentRows.call;  
        Lampa.ContentRows.call = function (screen, params, calls) {  
            if (screen === 'main') {  
                calls.unshift(function (call) {  
                    var config = getRandomConfig();  
                    var settings = getSettings();  
                    var cacheKey = JSON.stringify(config);  
                      
                    var cached = getCache();  
                    if (cached && cached.key === cacheKey) {  
                        call({  
                            results: cached.results,  
                            title: tr('Випадкова добірка', 'Случайная подборка') + ' 🎲'  
                        });  
                        return;  
                    }  
  
                    var method = config.type === 'movie' ? 'discover/movie' : 'discover/tv';  
  
                    Lampa.Api.sources.tmdb.get(method, config.params, function (json) {  
                        if (json && json.results) {  
                            var filtered = json.results;  
                              
                            filtered = filterResults(filtered, settings);  
                            filtered = filterWatched(filtered);  
                              
                            // Інтелектуальне сортування  
                            var strategy = SELECTION_STRATEGIES[settings.strategy];  
                            filtered.sort(function(a, b) {  
                                var scoreA = (a.popularity || 0) * strategy.weight.popularity +   
                                             (a.vote_average || 0) * strategy.weight.rating * 10 +  
                                             Math.random() * strategy.weight.random * 5;  
                                var scoreB = (b.popularity || 0) * strategy.weight.popularity +   
                                             (b.vote_average || 0) * strategy.weight.rating * 10 +  
                                             Math.random() * strategy.weight.random * 5;  
                                return scoreB - scoreA;  
                            });  
                              
                            filtered.forEach(function (i) { i.type = config.type; });  
  
                            var results = filtered.slice(0, settings.maxResults);  
                              
                            addToHistory(results);  
                            setCache({ results: results, key: cacheKey }, config);  
  
                            var strategyTitle = SELECTION_STRATEGIES[settings.strategy].title;  
                            call({  
                                results: results,  
                                title: tr('Випадкова добірка', 'Случайная подборка') + ' (' + strategyTitle + ') ✨'  
                            });  
                        } else call({ results: [] });  
                    }, function () { call({ results: [] }); });  
                });  
            }  
            original.apply(this, arguments);  
        };  
    }  
  
    function openSettings() {  
        var s = getSettings();  
        var items = [];  
  
        // Тип контенту  
        items.push({  
            title: '🎬 ' + tr('Тип: ', 'Тип: ') + (s.type === 'all' ? tr('Усе', 'Все') : (s.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы'))),  
            value: 'type'  
        });  
  
        // Стратегія підбору  
        var strategyInfo = SELECTION_STRATEGIES[s.strategy];  
        items.push({  
            title: '🎯 ' + tr('Стратегія: ', 'Стратегия: ') + strategyInfo.title,  
            subtitle: strategyInfo.description,  
            value: 'strategy'  
        });  
  
        // Діапазон років  
        var yearTitles = {  
            'latest': tr('Новинки (2 роки)', 'Новинки (2 года)'),  
            'modern': tr('Сучасні (10 років)', 'Современные (10 лет)'),  
            '2000s': tr('2000-ні', '2000-е'),  
            '90s': tr('90-ті', '90-е'),  
            '80s': tr('80-ті', '80-е'),  
            'classic': tr('Класика (1950-1990)', 'Классика (1950-1990)'),  
            'golden': tr('Золота ера (1930-1950)', 'Золотая эра (1930-1950)'),  
            'all': tr('Всі часи', 'Все времена')  
        };  
          
        items.push({  
            title: '📅 ' + tr('Роки: ', 'Годы: ') + (yearTitles[s.yearRange] || tr('Сучасні', 'Современные')),  
            subtitle: tr('Період випуску контенту', 'Период выпуска контента'),  
            value: 'yearRange'  
        });  
  
        // Мінімальний рейтинг  
        items.push({  
            title: '⭐ ' + tr('Рейтинг: ', 'Рейтинг: ') + s.minRating.toFixed(1),  
            subtitle: tr('Мінімальний рейтинг фільмів', 'Минимальный рейтинг фильмов'),  
            value: 'rating'  
        });  
  
        // Кількість результатів  
        items.push({  
            title: '📊 ' + tr('Результатів: ', 'Результатов: ') + s.maxResults,  
            value: 'maxResults'  
        });  
  
        // Режим різноманітності  
        items.push({  
            title: '🎲 ' + tr('Різноманітність: ', 'Разнообразие: ') + (s.diversityMode === 'high' ? tr('Висока', 'Высокая') : tr('Нормальна', 'Нормальная')),  
            subtitle: tr('Рівень випадковості підбору', 'Уровень случайности подбора'),  
            value: 'diversity'  
        });  
  
        // Опції  
        items.push({  
            title: (s.useCache ? '✅ ' : '🚫 ') + tr('Використовувати кеш', 'Использовать кеш'),  
            subtitle: tr('Прискорює завантаження', 'Ускоряет загрузку'),  
            value: 'cache'  
        });  
  
        items.push({  
            title: (s.excludeWatched ? '✅ ' : '🚫 ') + tr('Виключити переглянуті', 'Исключить просмотренные'),  
            subtitle: tr('Не показувати переглянуті фільми', 'Не показывать просмотренные фильмы'),  
            value: 'watched'  
        });  
  
        items.push({  
            title: (s.enableHistory ? '✅ ' : '🚫 ') + tr('Історія підбірок', 'История подборок'),  
            subtitle: tr('Відстеження для уникнення повторів', 'Отслеживание для избежания повторов'),  
            value: 'history'  
        });  
  
        items.push({     
            title: '--- ' + tr('Виберіть жанри нижче', 'Выберите жанры ниже') + ' ---',     
            subtitle: tr('Оберіть жанри для фільтрації', 'Выберите жанры для фильтрации'),  
            value: 'none'     
        });  
  
        // Жанри з категоріями  
        Object.keys(GENRE_CATEGORIES).forEach(function(category) {  
            var categoryGenres = GENRE_CATEGORIES[category];  
            var hasSelected = categoryGenres.some(function(g) { return s.genres.indexOf(g.toString()) !== -1; });  
              
            items.push({  
                title: (hasSelected ? '📂 ' : '📁 ') + tr(category.charAt(0).toUpperCase() + category.slice(1), category.charAt(0).toUpperCase() + category.slice(1)),  
                subtitle: categoryGenres.map(function(g) { return ALL_GENRES[g]; }).join(', '),  
                value: 'category_' + category  
            });  
        });  
  
        // Окремі жанри  
        Object.keys(ALL_GENRES).sort(function(a,b){return ALL_GENRES[a].localeCompare(ALL_GENRES[b])}).forEach(function (id) {    
            items.push({    
                title: (s.genres.indexOf(id) !== -1 ? '● ' : '○ ') + ALL_GENRES[id],    
                value: 'g_' + id    
            });    
        });  
  
        Lampa.Select.show({    
            title: '🎲 PRO Random ' + tr('Налаштування', 'Настройки'),    
            items: items,    
            onSelect: function (item) {    
                if (item.value === 'none') return;    
                var s = getSettings();    
  
                if (item.value === 'type') {    
                    s.type = s.type === 'movie' ? 'tv' : s.type === 'tv' ? 'all' : 'movie';    
                } else if (item.value === 'strategy') {    
                    var strategies = Object.keys(SELECTION_STRATEGIES);  
                    var currentIndex = strategies.indexOf(s.strategy);  
                    s.strategy = strategies[(currentIndex + 1) % strategies.length];  
                } else if (item.value === 'yearRange') {  
                    var ranges = ['latest', 'modern', '2000s', '90s', '80s', 'classic', 'golden', 'all'];  
                    var currentIndex = ranges.indexOf(s.yearRange);  
                    s.yearRange = ranges[(currentIndex + 1) % ranges.length];  
                } else if (item.value === 'rating') {    
                    s.minRating = s.minRating >= 9.0 ? 4.0 : s.minRating + 0.5;    
                } else if (item.value === 'maxResults') {    
                    s.maxResults = s.maxResults >= 50 ? 10 : s.maxResults + 10;    
                } else if (item.value === 'diversity') {  
                    s.diversityMode = s.diversityMode === 'high' ? 'normal' : 'high';  
                } else if (item.value === 'cache') {    
                    s.useCache = !s.useCache;    
                } else if (item.value === 'watched') {    
                    s.excludeWatched = !s.excludeWatched;    
                } else if (item.value === 'history') {  
                    s.enableHistory = !s.enableHistory;  
                    if (!s.enableHistory) {  
                        Lampa.Storage.set(HISTORY_KEY, []);  
                    }  
                } else if (item.value.indexOf('category_') === 0) {  
                    var category = item.value.replace('category_', '');  
                    var categoryGenres = GENRE_CATEGORIES[category];  
                    var hasAll = categoryGenres.every(function(g) { return s.genres.indexOf(g.toString()) !== -1; });  
                      
                    if (hasAll) {  
                        // Видаляємо всі жанри категорії  
                        categoryGenres.forEach(function(g) {  
                            var idx = s.genres.indexOf(g.toString());  
                            if (idx > -1) s.genres.splice(idx, 1);  
                        });  
                    } else {  
                        // Додаємо всі жанри категорії  
                        categoryGenres.forEach(function(g) {  
                            if (s.genres.indexOf(g.toString()) === -1) {  
                                s.genres.push(g.toString());  
                            }  
                        });  
                    }  
                } else if (item.value.indexOf('g_') === 0) {    
                    var id = item.value.replace('g_', '');    
                    var idx = s.genres.indexOf(id);    
                    if (idx > -1) s.genres.splice(idx, 1);    
                    else s.genres.push(id);    
                }    
  
                saveSettings(s);    
                openSettings();    
            },    
            onBack: function () { Lampa.Controller.toggle('content'); }    
        });    
    }  
  
    function addButton() {    
        if (menuAdded) return;    
            
        if ($('.menu__item[data-action="' + PLUGIN_ID + '"]').length) {    
            menuAdded = true;    
            return;    
        }    
  
        var button = $('<li class="menu__item selector" data-action="' + PLUGIN_ID + '">' +    
            '<div class="menu__ico">🎲</div>' +    
            '<div class="menu__text">PRO Random</div>' +    
            '</li>');    
  
        button.on('hover:enter', function () {    
            var config = getRandomConfig();    
            var s = getSettings();    
                
            var url = 'discover/' + config.type + '?v=' + Date.now();    
            var strategyTitle = SELECTION_STRATEGIES[s.strategy].title;  
                
            Lampa.Activity.push({    
                url: url,    
                title: '🎲 ' + tr('Рандом: ', 'Рандом: ') + (config.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы')) + ' (' + strategyTitle + ')',  
                component: 'category_full',    
                page: config.params.page,    
                genres: config.params.with_genres,    
                params: config.params,    
                source: 'tmdb'    
            });    
        });    
  
        button.on('hover:long', function () {     
            openSettings();     
        });    
            
        $('.menu .menu__list').eq(0).append(button);    
        menuAdded = true;    
    }    
  
    function start() {    
        addButton();    
        injectToMain();    
    }    
  
    if (window.appready) start();    
    else Lampa.Listener.follow('app', function (e) {     
        if (e.type === 'ready') {    
            menuAdded = false;    
            start();     
        }    
    });    
  
})();
  
