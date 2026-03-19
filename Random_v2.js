(function () {  
    'use strict';  
  
    var PLUGIN_ID = 'lampa_random_pro';  
    var PLUGIN_VERSION = '2.0.0';  
    var STORAGE_KEY = 'lampa_random_pro_settings';  
    var CACHE_KEY = 'lampa_random_pro_cache';  
    var STATS_KEY = 'lampa_random_pro_stats';  
    var CACHE_DURATION = 5 * 60 * 1000;  
      
    var menuAdded = false;  
  
    // Розширений список жанрів з міжнародною підтримкою  
    var ALL_GENRES = {  
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',  
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',  
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',  
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн', 10770: 'ТВ-фільм', 10762: 'Дитячий',  
        10763: 'Новини', 10764: 'Реаліті-шоу', 10765: 'Ток-шоу', 10766: 'Воєнний', 10767: 'Науково-популярний'  
    };  
  
    // Країни виробництва  
    var ALL_COUNTRIES = {  
        'US': 'США', 'GB': 'Велика Британія', 'FR': 'Франція', 'DE': 'Німеччина',  
        'IT': 'Італія', 'ES': 'Іспанія', 'JP': 'Японія', 'KR': 'Південна Корея',  
        'CN': 'Китай', 'RU': 'Росія', 'UA': 'Україна', 'CA': 'Канада',  
        'AU': 'Австралія', 'IN': 'Індія', 'BR': 'Бразилія', 'MX': 'Мексика'  
    };  
  
    // Розширені описи логік підборки  
    var LOGIC_DESCRIPTIONS = {  
        strict: {  
            title: 'Тільки вибрані (Strict)',  
            description: 'Показує фільми/серіали, що містять ВСІ обрані жанри. Максимально точна фільтрація.',  
            icon: '🎯'  
        },  
        smart: {  
            title: 'Розумний (Smart)',  
            description: 'Інтелектуальний підбір з урахуванням популярності жанрів. Частіше показує трендові жанри.',  
            icon: '🧠'  
        },  
        trends: {  
            title: 'Тренди (Популярне)',  
            description: 'Показує тільки популярний контент без фільтрації по жанрах. Сортування за популярністю.',  
            icon: '🔥'  
        },  
        random: {  
            title: 'Один із вибраних (Mix)',  
            description: 'Випадковий вибір одного з обраних жанрів для кожної підбірки.',  
            icon: '🎲'  
        },  
        personalized: {  
            title: 'Персоналізований (AI)',  
            description: 'Рекомендації на основі вашої історії переглядів та уподобань.',  
            icon: '🤖'  
        },  
        discovery: {  
            title: 'Відкриття (Explore)',  
            description: 'Нові та маловідомі фільми/серіали з високим рейтингом.',  
            icon: '🔍'  
        }  
    };  
  
    // Функція інтернаціоналізації з підтримкою Lampa.Lang  
    function t(key) {  
        if (typeof Lampa !== 'undefined' && Lampa.Lang && Lampa.Lang.translate) {  
            return Lampa.Lang.translate('random_pro_' + key) || key;  
        }  
        return key;  
    }  
  
    function tr(uk, ru) {  
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;  
    }  
  
    function getSettings() {  
        var def = {  
            genres: [],  
            countries: [],  
            type: 'all',  
            mode: 'smart',  
            years: 'all',  
            minRating: 6.5,  
            maxResults: 20,  
            useCache: true,  
            excludeWatched: false,  
            enableStats: true,  
            premiumMode: false  
        };  
        var saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign(def, saved || {});  
    }  
  
    function saveSettings(data) {  
        Lampa.Storage.set(STORAGE_KEY, data);  
        clearCache();  
        updateStats();  
    }  
  
    function getStats() {  
        return Lampa.Storage.get(STATS_KEY) || {  
            totalGenerated: 0,  
            favoriteGenres: {},  
            lastUsed: null,  
            usageCount: 0  
        };  
    }  
  
    function updateStats() {  
        if (!getSettings().enableStats) return;  
          
        var stats = getStats();  
        stats.totalGenerated++;  
        stats.lastUsed = Date.now();  
        stats.usageCount++;  
          
        var s = getSettings();  
        s.genres.forEach(function(genre) {  
            stats.favoriteGenres[genre] = (stats.favoriteGenres[genre] || 0) + 1;  
        });  
          
        Lampa.Storage.set(STATS_KEY, stats);  
    }  
  
    function getCache() {  
        if (!getSettings().useCache) return null;  
        var cached = Lampa.Storage.get(CACHE_KEY);  
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {  
            if (cached.version === PLUGIN_VERSION) {  
                return cached.data;  
            }  
        }  
        return null;  
    }  
  
    function setCache(data, config) {  
        if (!getSettings().useCache) return;  
        Lampa.Storage.set(CACHE_KEY, {  
            data: data,  
            config: config,  
            timestamp: Date.now(),  
            version: PLUGIN_VERSION  
        });  
    }  
  
    function clearCache() {  
        Lampa.Storage.set(CACHE_KEY, null);  
    }  
  
    function getRandomConfig() {  
        var s = getSettings();  
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';  
        var type = s.type === 'all' ? (Math.random() > 0.5 ? 'movie' : 'tv') : s.type;  
        var currentYear = new Date().getFullYear();  
  
        var params = {  
            'vote_average.gte': s.minRating,  
            'vote_count.gte': s.premiumMode ? 100 : 150,  
            'language': lang,  
            'sort_by': 'popularity.desc',  
            'page': Math.floor(Math.random() * (s.premiumMode ? 25 : 15)) + 1  
        };  
  
        // Фільтрація по роках  
        if (s.years === 'new') {  
            var startDate = new Date();  
            startDate.setFullYear(currentYear - 5);  
            var dateGte = startDate.toISOString().split('T')[0];  
            var dateLte = new Date().toISOString().split('T')[0];  
              
            if (type === 'movie') {  
                params['primary_release_date.gte'] = dateGte;  
                params['primary_release_date.lte'] = dateLte;  
            } else {  
                params['first_air_date.gte'] = dateGte;  
                params['first_air_date.lte'] = dateLte;  
            }  
        } else if (s.years === 'retro') {  
            if (type === 'movie') {  
                params['primary_release_date.lte'] = '2005-12-31';  
            } else {  
                params['first_air_date.lte'] = '2005-12-31';  
            }  
        } else if (s.years === '90s') {  
            if (type === 'movie') {  
                params['primary_release_date.gte'] = '1990-01-01';  
                params['primary_release_date.lte'] = '1999-12-31';  
            } else {  
                params['first_air_date.gte'] = '1990-01-01';  
                params['first_air_date.lte'] = '1999-12-31';  
            }  
        }  
  
        // Фільтрація по країнах  
        if (s.countries && s.countries.length > 0) {  
            params.with_countries = s.countries.join(',');  
        }  
  
        // Розширені режими жанрів  
        if (s.mode !== 'trends' && s.genres.length > 0) {  
            if (s.mode === 'strict') {  
                params.with_genres = s.genres.join(',');  
            } else if (s.mode === 'smart') {  
                var popularGenres = [28, 12, 35, 18, 53, 878];  
                var availablePopular = s.genres.filter(function(g) {  
                    return popularGenres.indexOf(parseInt(g)) !== -1;  
                });  
                  
                if (availablePopular.length > 0 && Math.random() > 0.4) {  
                    params.with_genres = availablePopular[Math.floor(Math.random() * availablePopular.length)];  
                } else {  
                    params.with_genres = s.genres[Math.floor(Math.random() * s.genres.length)];  
                }  
            } else if (s.mode === 'personalized') {  
                var stats = getStats();  
                var favoriteGenre = Object.keys(stats.favoriteGenres).reduce(function(a, b) {  
                    return stats.favoriteGenres[a] > stats.favoriteGenres[b] ? a : b;  
                });  
                params.with_genres = favoriteGenre || s.genres[Math.floor(Math.random() * s.genres.length)];  
            } else if (s.mode === 'discovery') {  
                params['vote_count.lte'] = 1000;  
                params.with_genres = s.genres[Math.floor(Math.random() * s.genres.length)];  
            } else {  
                params.with_genres = s.genres[Math.floor(Math.random() * s.genres.length)];  
            }  
        }  
  
        return { type: type, params: params };  
    }  
  
    function filterByYearAndRating(results, settings) {  
        var currentYear = new Date().getFullYear();  
          
        return results.filter(function(item) {  
            if (item.vote_average < settings.minRating) return false;  
              
            if (settings.years === 'new') {  
                var itemYear = item.release_date ? parseInt(item.release_date.split('-')[0]) :   
                              item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null;  
                if (itemYear && (itemYear < currentYear - 5 || itemYear > currentYear)) return false;  
            } else if (settings.years === 'retro') {  
                var itemYear = item.release_date ? parseInt(item.release_date.split('-')[0]) :   
                              item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null;  
                if (itemYear && itemYear > 2005) return false;  
            } else if (settings.years === '90s') {  
                var itemYear = item.release_date ? parseInt(item.release_date.split('-')[0]) :   
                              item.first_air_date ? parseInt(item.first_air_date.split('-')[0]) : null;  
                if (itemYear && (itemYear < 1990 || itemYear > 1999)) return false;  
            }  
              
            return true;  
        });  
    }  
  
    function filterStrict(results, settings) {  
        if (settings.mode !== 'strict' || settings.genres.length === 0) return results;  
          
        return results.filter(function(item) {  
            return settings.genres.every(function(gId) {  
                return item.genre_ids && item.genre_ids.indexOf(parseInt(gId)) !== -1;  
            });  
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
                            title: tr('Випадкова добірка', 'Случайная подборка') + ' 📋'  
                        });  
                        return;  
                    }  
  
                    var method = config.type === 'movie' ? 'discover/movie' : 'discover/tv';  
  
                    Lampa.Api.sources.tmdb.get(method, config.params, function (json) {  
                        if (json && json.results) {  
                            var filtered = json.results;  
                              
                            filtered = filterByYearAndRating(filtered, settings);  
                            filtered = filterStrict(filtered, settings);  
                            filtered = filterWatched(filtered);  
                              
                            filtered.sort(function(a, b) {  
                                return (b.vote_average || 0) - (a.vote_average || 0);  
                            });  
                              
                            filtered.forEach(function (i) { i.type = config.type; });  
  
                            var results = filtered.slice(0, settings.maxResults);  
                              
                            setCache({ results: results, key: cacheKey }, config);  
                            updateStats();  
  
                            call({  
                                results: results,  
                                title: tr('Випадкова добірка', 'Случайная подборка') + ' ✨'  
                            });  
                        } else call({ results: [] });  
                    }, function () { call({ results: [] }); });  
                });  
            }  
            original.apply(this, arguments);  
        };  
    }  
  
    function showStatistics() {  
        var stats = getStats();  
        var s = getSettings();  
          
        var items = [  
            {  
                title: '📊 ' + tr('Загальна статистика', 'Общая статистика'),  
                subtitle: tr('Всього згенеровано підбірок', 'Всего сгенерировано подборок') + ': ' + stats.totalGenerated,  
                value: 'total'  
            },  
            {  
                title: '🎬 ' + tr('Використань', 'Использований') + ': ' + stats.usageCount,  
                subtitle: tr('Останнє використання', 'Последнее использование') + ': ' +   
                         (stats.lastUsed ? new Date(stats.lastUsed).toLocaleString() : tr('Ніколи', 'Никогда')),  
                value: 'usage'  
            }  
        ];  
  
        // Улюблені жанри  
        var topGenres = Object.keys(stats.favoriteGenres)  
            .sort(function(a, b) { return stats.favoriteGenres[b] - stats.favoriteGenres[a]; })  
            .slice(0, 5);  
              
        if (topGenres.length > 0) {  
            items.push({  
                title: '❤️ ' + tr('Улюблені жанри', 'Любимые жанры'),  
                subtitle: topGenres.map(function(g) { return ALL_GENRES[g] || g; }).join(', '),  
                value: 'genres'  
            });  
        }  
  
        Lampa.Select.show({  
            title: '📈 ' + tr('Статистика PRO Random', 'Статистика PRO Random'),  
            items: items,  
            onSelect: function () {},  
            onBack: function () { openSettings(); }  
        });  
    }  
  
    function openSettings() {  
        var s = getSettings();  
        var items = [];  
  
        // Тип контенту  
        items.push({  
            title: '🎬 ' + tr('Тип: ', 'Тип: ') + (s.type === 'all' ? tr('Усе', 'Все') : (s.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы'))),  
            subtitle: tr('Оберіть тип контенту', 'Выберите тип контента'),  
            value: 'type'  
        });  
  
        // Режим логіки з детальним описом  
        var modeInfo = LOGIC_DESCRIPTIONS[s.mode];  
        items.push({  
            title: modeInfo.icon + ' ' + tr('Логіка: ', 'Логика: ') + modeInfo.title,  
            subtitle: modeInfo.description,  
            value: 'mode',  
            badge: s.mode.toUpperCase()  
        });  
  
        // Фільтр по країнах  
        if (s.countries.length > 0) {  
            var countriesText = s.countries.map(function(c) { return ALL_COUNTRIES[c] || c; }).join(', ');  
            items.push({  
                title: '🌍 ' + tr('Країни: ', 'Страны: ') + countriesText,  
                subtitle: tr('Фільтрація за країнами виробництва', 'Фильтрация по странам производства'),  
                value: 'countries'  
            });  
        }  
  
        // Фільтр по роках  
        var yearsTitle = s.years === 'new' ? tr('Останні 5 років', 'Последние 5 лет') :   
                         s.years === 'retro' ? tr('Класика (до 2005)', 'Классика') :  
                         s.years === '90s' ? tr('90-ті', '90-е') : tr('Будь-які', 'Любые');  
        items.push({  
            title: '📅 ' + tr('Роки: ', 'Годы: ') + yearsTitle,  
            subtitle: tr('Період випуску контенту', 'Период выпуска контента'),  
            value: 'years'  
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
            subtitle: tr('Кількість фільмів у добірці', 'Количество фильмов в подборке'),  
            value: 'maxResults'  
        });  
  
        // Преміум режим  
        items.push({  
            title: (s.premiumMode ? '💎 ' : '🔒 ') + tr('Преміум режим', 'Премиум режим'),  
            subtitle: tr('Розширені можливості фільтрації', 'Расширенные возможности фильтрации'),  
            value: 'premium'  
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
            title: (s.enableStats ? '✅ ' : '🚫 ') + tr('Статистика використання', 'Статистика использования'),  
            subtitle: tr('Відстеження популярності жанрів', 'Отслеживание популярности жанров'),  
            value: 'stats'  
        });  
  
        // Статистика  
        if (s.enableStats) {  
            items.push({  
                title: '📈 ' + tr('Переглянути статистику', 'Просмотреть статистику'),  
                subtitle: tr('Аналіз ваших вподобань', 'Анализ ваших предпочтений'),  
                value: 'statistics'  
            });  
        }  
  
        items.push({     
            title: '--- ' + tr('Виберіть жанри нижче', 'Выберите жанры ниже') + ' ---',     
            subtitle: tr('Оберіть жанри для фільтрації', 'Выберите жанры для фильтрации'),  
            value: 'none'     
        });  
  
        // Жанри  
        Object.keys(ALL_GENRES).sort(function(a,b){return ALL_GENRES[a].localeCompare(ALL_GENRES[b])}).forEach(function (id) {    
            items.push({    
                title: (s.genres.indexOf(id) !== -1 ? '● ' : '○ ') + ALL_GENRES[id],    
                value: 'g_' + id    
            });    
        });  
  
        // Країни  
        if (s.countries.length > 0 || items.some(function(i) { return i.value === 'countries'; })) {  
            items.push({     
                title: '--- ' + tr('Виберіть країни нижче', 'Выберите страны ниже') + ' ---',     
                subtitle: tr('Оберіть країни для фільтрації', 'Выберите страны для фильтрации'),  
                value: 'none_countries'     
            });  
  
            Object.keys(ALL_COUNTRIES).sort(function(a,b){return ALL_COUNTRIES[a].localeCompare(ALL_COUNTRIES[b])}).forEach(function (code) {    
                items.push({    
                    title: (s.countries.indexOf(code) !== -1 ? '● ' : '○ ') + ALL_COUNTRIES[code],    
                    value: 'c_' + code    
                });    
            });  
        }  
  
        Lampa.Select.show({    
            title: '⚙️ PRO Random ' + tr('Налаштування', 'Настройки'),    
            items: items,    
            onSelect: function (item) {    
                if (item.value === 'none' || item.value === 'none_countries') return;    
                var s = getSettings();    
  
                if (item.value === 'type') {    
                    s.type = s.type === 'movie' ? 'tv' : s.type === 'tv' ? 'all' : 'movie';    
                } else if (item.value === 'mode') {    
                    var modes = ['strict', 'smart', 'trends', 'random', 'personalized', 'discovery'];    
                    var currentIndex = modes.indexOf(s.mode);    
                    s.mode = modes[(currentIndex + 1) % modes.length];    
                } else if (item.value === 'years') {    
                    s.years = s.years === 'all' ? 'new' : s.years === 'new' ? 'retro' : s.years === 'retro' ? '90s' : 'all';    
                } else if (item.value === 'rating') {    
                    s.minRating = s.minRating >= 9.0 ? 5.0 : s.minRating + 0.5;    
                } else if (item.value === 'maxResults') {    
                    s.maxResults = s.maxResults >= 50 ? 10 : s.maxResults + 10;    
                } else if (item.value === 'premium') {    
                    s.premiumMode = !s.premiumMode;    
                } else if (item.value === 'cache') {    
                    s.useCache = !s.useCache;    
                } else if (item.value === 'watched') {    
                    s.excludeWatched = !s.excludeWatched;    
                } else if (item.value === 'stats') {    
                    s.enableStats = !s.enableStats;    
                } else if (item.value === 'statistics') {    
                    showStatistics();    
                    return;    
                } else if (item.value === 'countries') {    
                    openCountriesSettings();    
                    return;    
                } else if (item.value.indexOf('g_') === 0) {    
                    var id = item.value.replace('g_', '');    
                    var idx = s.genres.indexOf(id);    
                    if (idx > -1) s.genres.splice(idx, 1);    
                    else s.genres.push(id);    
                } else if (item.value.indexOf('c_') === 0) {    
                    var code = item.value.replace('c_', '');    
                    var idx = s.countries.indexOf(code);    
                    if (idx > -1) s.countries.splice(idx, 1);    
                    else s.countries.push(code);    
                }    
  
                saveSettings(s);    
                openSettings();    
            },    
            onBack: function () { Lampa.Controller.toggle('content'); }    
        });    
    }  
  
    function openCountriesSettings() {  
        var s = getSettings();  
        var items = [];  
  
        Object.keys(ALL_COUNTRIES).sort(function(a,b){return ALL_COUNTRIES[a].localeCompare(ALL_COUNTRIES[b])}).forEach(function (code) {    
            items.push({    
                title: (s.countries.indexOf(code) !== -1 ? '● ' : '○ ') + ALL_COUNTRIES[code],    
                value: code    
            });    
        });  
  
        Lampa.Select.show({  
            title: '🌍 ' + tr('Країни виробництва', 'Страны производства'),  
            items: items,  
            onSelect: function (item) {  
                var s = getSettings();  
                var idx = s.countries.indexOf(item.value);  
                if (idx > -1) s.countries.splice(idx, 1);  
                else s.countries.push(item.value);  
                saveSettings(s);  
                openCountriesSettings();  
            },  
            onBack: function () { openSettings(); }  
        });  
    }  
  
    function addButton() {    
        if (menuAdded) return;    
            
        if ($('.menu__item[data-action="' + PLUGIN_ID + '"]').length) {    
            menuAdded = true;    
            return;    
        }    
  
        var button = $('<li class="menu__item selector" data-action="' + PLUGIN_ID + '">' +    
            '<div class="menu__ico">✨</div>' +    
            '<div class="menu__text">PRO Random</div>' +    
            '<div class="menu__badge">PRO</div>' +    
            '</li>');    
  
        // Додаємо преміальні CSS класи  
        button.addClass('menu__item--premium');  
  
        button.on('hover:enter', function () {    
            var config = getRandomConfig();    
            var s = getSettings();    
                
            var url = 'discover/' + config.type + '?v=' + Date.now();    
                
            Lampa.Activity.push({    
                url: url,    
                title: '🎲 ' + tr('Рандом: ', 'Рандом: ') + (config.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіалы', 'Сериалы')),    
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
  
        // Додаємо анімацію при наведенні  
        button.on('hover:focus', function () {  
            button.addClass('menu__item--focused');  
        }).on('hover:blur', function () {  
            button.removeClass('menu__item--focused');  
        });  
            
        $('.menu .menu__list').eq(0).append(button);    
        menuAdded = true;    
    }  
  
    // Додаємо CSS стилі для преміум вигляду  
    function addStyles() {  
        if ($('#random-pro-styles').length) return;  
          
        var styles = `  
            <style id="random-pro-styles">  
                .menu__item--premium {  
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  
                    border-radius: 12px;  
                    margin: 4px 0;  
                    transition: all 0.3s ease;  
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);  
                }  
                  
                .menu__item--premium .menu__ico {  
                    color: #fff;  
                    font-size: 24px;  
                }  
                  
                .menu__item--premium .menu__text {  
                    color: #fff;  
                    font-weight: 600;  
                }  
                  
                .menu__item--premium .menu__badge {  
                    background: rgba(255, 255, 255, 0.2);  
                    color: #fff;  
                    padding: 2px 6px;  
                    border-radius: 4px;  
                    font-size: 10px;  
                    font-weight: bold;  
                    margin-left: 8px;  
                }  
                  
                .menu__item--premium:hover,  
                .menu__item--premium.menu__item--focused {  
                    transform: translateY(-2px);  
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);  
                }  
                  
                .menu__item--premium .menu__badge {  
                    animation: pulse 2s infinite;  
                }  
                  
                @keyframes pulse {  
                    0% { opacity: 1; }  
                    50% { opacity: 0.7; }  
                    100% { opacity: 1; }  
                }  
            </style>  
        `;  
          
        $('head').append(styles);  
    }  
  
    function start() {    
        addStyles();  
        addButton();    
        injectToMain();    
    }    
  
    if (window.appready) start();    
    else Lampa.Listener.follow('app', function (e) {     
        if (e.type === 'ready') {    
            menuAdded = false; // Скидаємо при оновленні    
            start();     
        }    
    });    
  
})();  
  
