(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_pro';
    var STORAGE_KEY = 'lampa_random_pro_settings';
    var API_BASE = 'https://api.themoviedb.org/3/';
    
    // Дефолтні жанри про всяк випадок (поки не завантажились з API)
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
            mode: 'strict', 
            noAnimation: true,
            minRating: 6
        };
        var saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign(def, saved || {});
    }

    function saveSettings(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    // Оновлена функція конфігурації (виправляє Strict Mode)
    function getRandomConfig() {
        var s = getSettings();
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';
        
        var type = s.type;
        if (type === 'all') type = Math.random() > 0.5 ? 'movie' : 'tv';

        var params = {
            'vote_average.gte': s.minRating,
            'vote_count.gte': 150,
            'language': lang,
            'page': Math.floor(Math.random() * 15) + 1 // Обмежено для стабільності
        };

        // Логіка вибору жанрів для запиту
        if (s.genres.length > 0) {
            if (s.mode === 'strict') {
                // TMDB API: коми означають "AND" (суворий режим)
                params.with_genres = s.genres.join(',');
            } else {
                // Вибираємо один випадковий з обраних
                params.with_genres = s.genres[Math.floor(Math.random() * s.genres.length)];
            }
        }

        return {
            type: type,
            params: params
        };
    }

    function filterResults(results, settings) {
        return results.filter(function (item) {
            if (!item.genre_ids) return false;
            // Глобальний фільтр мультфільмів
            if (settings.noAnimation && item.genre_ids.indexOf(16) !== -1) return false;
            return true;
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
                        if (json && json.results && json.results.length > 0) {
                            var filtered = filterResults(json.results, settings);
                            filtered.forEach(function (i) { i.type = config.type; });

                            call({
                                results: filtered,
                                title: '🎲 ' + tr('Випадкова добірка', 'Случайная подборка') + (settings.mode === 'strict' ? ' (Strict)' : '')
                            });
                        } else {
                            call({ results: [] });
                        }
                    }, function () {
                        call({ results: [] });
                    });
                });
            }
            original.apply(this, arguments);
        };
    }

    function openSettings() {
        var s = getSettings();
        var items = [];

        items.push({
            title: '🎬 ' + tr('Тип: ', 'Тип: ') + (s.type === 'all' ? tr('Усе', 'Все') : s.type),
            value: 'type'
        });

        items.push({
            title: '🎯 ' + tr('Режим: ', 'Режим: ') + (s.mode === 'strict' ? tr('Суворий (І)', 'Строгий (И)') : tr('Мікс (АБО)', 'Микс (ИЛИ)')),
            value: 'mode'
        });

        items.push({
            title: (s.noAnimation ? '🚫 ' : '✅ ') + tr('Без мультфільмів', 'Без мультфильмов'),
            value: 'anim'
        });

        items.push({ title: '--- ' + tr('Жанри', 'Жанры') + ' ---', value: 'none' });

        Object.keys(ALL_GENRES).forEach(function (id) {
            items.push({
                title: (s.genres.indexOf(id) !== -1 ? '● ' : '○ ') + ALL_GENRES[id],
                value: 'g_' + id
            });
        });

        Lampa.Select.show({
            title: 'PRO Random Settings',
            items: items,
            onSelect: function (item) {
                if (item.value === 'none') return;
                var s = getSettings();

                if (item.value === 'type') {
                    s.type = s.type === 'movie' ? 'tv' : s.type === 'tv' ? 'all' : 'movie';
                } else if (item.value === 'mode') {
                    s.mode = s.mode === 'strict' ? 'random' : 'strict';
                } else if (item.value === 'anim') {
                    s.noAnimation = !s.noAnimation;
                } else if (item.value.indexOf('g_') === 0) {
                    var id = item.value.replace('g_', '');
                    var idx = s.genres.indexOf(id);
                    if (idx > -1) s.genres.splice(idx, 1);
                    else s.genres.push(id);
                }

                saveSettings(s);
                openSettings(); // Перевідкриваємо для оновлення статусів
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
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
            // Перехід до повної категорії
            Lampa.Activity.push({
                url: config.type === 'movie' ? 'discover/movie' : 'discover/tv',
                title: tr('Рандом: ', 'Рандом: ') + (config.type === 'movie' ? tr('Фільми', 'Фильмы') : tr('Серіали', 'Сериалы')),
                component: 'category_full',
                page: 1,
                genres: config.params.with_genres,
                source: 'tmdb'
            });
        });

        button.on('hover:long', function () {
            openSettings();
        });

        $('.menu .menu__list').eq(0).append(button);
    }

    // Завантаження актуальних назв жанрів від TMDB
    function updateGenres() {
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';
        Lampa.Api.sources.tmdb.get('genre/movie/list', { language: lang }, function (data) {
            if (data && data.genres) {
                data.genres.forEach(function (g) {
                    ALL_GENRES[g.id] = g.name;
                });
            }
        });
    }

    function start() {
        updateGenres();
        addButton();
        injectToMain();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });

})();
