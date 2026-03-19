(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_pro';
    var STORAGE_KEY = 'lampa_random_pro_settings';
    
    var ALL_GENRES = {
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
    };

    function tr(uk, ru) {
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;
    }

    function getSettings() {
        var def = {
            genres: [],
            type: 'all', 
            mode: 'random', 
            years: 'all',  
            noAnimation: true
        };
        var saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign(def, saved || {});
    }

    function saveSettings(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    function getRandomConfig() {
        var s = getSettings();
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';
        var type = s.type === 'all' ? (Math.random() > 0.5 ? 'movie' : 'tv') : s.type;
        var currentYear = new Date().getFullYear();

        var params = {
            'vote_average.gte': 5.5,
            'vote_count.gte': 50,
            'language': lang,
            'sort_by': 'popularity.desc',
            'page': Math.floor(Math.random() * 10) + 1
        };

        // Корекція фільтра по рокам для фільмів та серіалів
        if (s.years === 'new') {
            var dateGte = (currentYear - 5) + '-01-01';
            if (type === 'movie') params['primary_release_date.gte'] = dateGte;
            else params['first_air_date.gte'] = dateGte;
        } else if (s.years === 'retro') {
            var dateLte = '2005-01-01';
            if (type === 'movie') params['primary_release_date.lte'] = dateLte;
            else params['first_air_date.lte'] = dateLte;
        }

        // Режими жанрів
        if (s.mode !== 'trends' && s.genres.length > 0) {
            if (s.mode === 'strict') {
                params.with_genres = s.genres.join(',');
            } else {
                params.with_genres = s.genres[Math.floor(Math.random() * s.genres.length)];
            }
        }

        return { type: type, params: params };
    }

    function filterStrict(results, settings) {
        if (settings.mode !== 'strict' || settings.genres.length === 0) return results;
        
        return results.filter(function(item) {
            // Перевіряємо, чи всі обрані користувачем жанри присутні в об'єкті
            return settings.genres.every(function(gId) {
                return item.genre_ids && item.genre_ids.indexOf(parseInt(gId)) !== -1;
            });
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
                    var method = config.type === 'movie' ? 'discover/movie' : 'discover/tv';

                    Lampa.Api.sources.tmdb.get(method, config.params, function (json) {
                        if (json && json.results) {
                            var filtered = json.results.filter(function(i) {
                                return !(settings.noAnimation && i.genre_ids && i.genre_ids.indexOf(16) !== -1);
                            });
                            
                            // Додаткова перевірка для Strict Mode
                            filtered = filterStrict(filtered, settings);
                            
                            filtered.forEach(function (i) { i.type = config.type; });

                            call({
                                results: filtered.slice(0, 20),
                                title: tr('Випадкова добірка', 'Случайная подборка')
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

        items.push({
            title: '🎬 ' + tr('Тип: ', 'Тип: ') + (s.type === 'all' ? tr('Усе', 'Все') : (s.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы'))),
            value: 'type'
        });

        var modeTitle = s.mode === 'strict' ? tr('Тільки вибрані (Strict)', 'Только выбранные') : 
                        s.mode === 'trends' ? tr('Тренди (Популярне)', 'Тренды') : tr('Один із вибраних (Mix)', 'Один из выбранных');
        items.push({
            title: '🎯 ' + tr('Логіка: ', 'Логика: ') + modeTitle,
            value: 'mode'
        });

        var yearsTitle = s.years === 'new' ? tr('Останні 5 років', 'Последние 5 лет') : 
                         s.years === 'retro' ? tr('Старі (до 2005)', 'Старые') : tr('Будь-які', 'Любые');
        items.push({
            title: '📅 ' + tr('Роки: ', 'Годы: ') + yearsTitle,
            value: 'years'
        });

        items.push({
            title: (s.noAnimation ? '🚫 ' : '✅ ') + tr('Приховати мультфільми', 'Скрыть мультфильмы'),
            value: 'anim'
        });

        items.push({ title: '--- ' + tr('Виберіть жанри нижче', 'Выберите жанры ниже') + ' ---', value: 'none' });

        Object.keys(ALL_GENRES).sort(function(a,b){return ALL_GENRES[a].localeCompare(ALL_GENRES[b])}).forEach(function (id) {
            items.push({
                title: (s.genres.indexOf(id) !== -1 ? '● ' : '○ ') + ALL_GENRES[id],
                value: 'g_' + id
            });
        });

        Lampa.Select.show({
            title: 'Налаштування PRO Random',
            items: items,
            onSelect: function (item) {
                if (item.value === 'none') return;
                var s = getSettings();

                if (item.value === 'type') {
                    s.type = s.type === 'movie' ? 'tv' : s.type === 'tv' ? 'all' : 'movie';
                } else if (item.value === 'mode') {
                    s.mode = s.mode === 'strict' ? 'trends' : s.mode === 'trends' ? 'random' : 'strict';
                } else if (item.value === 'years') {
                    s.years = s.years === 'all' ? 'new' : s.years === 'new' ? 'retro' : 'all';
                } else if (item.value === 'anim') {
                    s.noAnimation = !s.noAnimation;
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
        if ($('.menu__item[data-action="' + PLUGIN_ID + '"]').length) return;

        var button = $('<li class="menu__item selector" data-action="' + PLUGIN_ID + '">' +
            '<div class="menu__ico">🎲</div>' +
            '<div class="menu__text">PRO Random</div>' +
            '</li>');

        button.on('hover:enter', function () {
            var config = getRandomConfig();
            var s = getSettings();
            
            // Щоб уникнути кешування, додаємо timestamp
            var url = 'discover/' + config.type + '?v=' + Date.now();
            
            Lampa.Activity.push({
                url: url,
                title: tr('Рандом: ', 'Рандом: ') + (config.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы')),
                component: 'category_full',
                page: config.params.page,
                genres: config.params.with_genres,
                params: config.params,
                source: 'tmdb'
            });
        });

        button.on('hover:long', function () { openSettings(); });
        $('.menu .menu__list').eq(0).append(button);
    }

    function start() {
        addButton();
        injectToMain();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });

})();
