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
            type: 'all', // movie / tv / all
            mode: 'strict', // strict / random
            noAnimation: true
        };

        var saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign(def, saved || {});
    }

    function saveSettings(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    function filterResults(results, settings) {
        var selected = settings.genres;

        return results.filter(function (item) {

            if (!item.genre_ids) return false;

            // 🚫 без мультфільмів
            if (settings.noAnimation && item.genre_ids.indexOf(16) !== -1) {
                return false;
            }

            // 🎯 строгий режим
            if (settings.mode === 'strict' && selected.length > 1) {
                return selected.every(function (g) {
                    return item.genre_ids.indexOf(parseInt(g)) !== -1;
                });
            }

            return true;
        });
    }

    function getRandomConfig() {
        var s = getSettings();

        var genres = s.genres.length ? s.genres : Object.keys(ALL_GENRES);

        var randomGenre = genres[Math.floor(Math.random() * genres.length)];

        var type = 'movie';
        if (s.type === 'tv') type = 'tv';
        else if (s.type === 'all') type = Math.random() > 0.5 ? 'movie' : 'tv';

        return {
            type: type,
            genre: randomGenre,
            params: {
                with_genres: randomGenre,
                'vote_average.gte': 6,
                'vote_count.gte': 200,
                page: Math.floor(Math.random() * 40) + 1,
                language: Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU'
            }
        };
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

                            var filtered = filterResults(json.results, settings);

                            filtered.forEach(function (i) {
                                i.type = config.type;
                            });

                            call({
                                results: filtered,
                                title: '🎲 ' + tr('Випадкова добірка', 'Случайная подборка')
                            });

                        } else call({ results: [] });

                    }, function () {
                        call({ results: [] });
                    });

                });
            }

            original.apply(this, arguments);
        };
    }

    function openSettings(button) {
        var s = getSettings();

        var items = [];

        // тип
        items.push({
            title: '🎬 ' + tr('Тип: ', 'Тип: ') + s.type,
            value: 'type'
        });

        // режим
        items.push({
            title: '🎯 ' + tr('Режим: ', 'Режим: ') + s.mode,
            value: 'mode'
        });

        // мультфільми
        items.push({
            title: (s.noAnimation ? '🚫 ' : '✅ ') + tr('Без мультфільмів', 'Без мультфильмов'),
            value: 'anim'
        });

        // жанри
        Object.keys(ALL_GENRES).forEach(function (id) {
            items.push({
                title: (s.genres.indexOf(id) !== -1 ? '✓ ' : '') + ALL_GENRES[id],
                value: 'g_' + id
            });
        });

        Lampa.Select.show({
            title: 'PRO Random',

            items: items,

            onSelect: function (item) {

                var s = getSettings();

                if (item.value === 'type') {
                    s.type = s.type === 'movie' ? 'tv' : s.type === 'tv' ? 'all' : 'movie';
                }

                else if (item.value === 'mode') {
                    s.mode = s.mode === 'strict' ? 'random' : 'strict';
                }

                else if (item.value === 'anim') {
                    s.noAnimation = !s.noAnimation;
                }

                else if (item.value.indexOf('g_') === 0) {
                    var id = item.value.replace('g_', '');
                    var idx = s.genres.indexOf(id);

                    if (idx > -1) s.genres.splice(idx, 1);
                    else s.genres.push(id);
                }

                saveSettings(s);

                setTimeout(function () {
                    openSettings(button);
                }, 50);

                return true;
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

            Lampa.Activity.push({
                url: 'discover/' + config.type + '?with_genres=' + config.params.with_genres,
                title: 'PRO Random',
                component: 'category_full',
                source: 'tmdb'
            });
        });

        button.on('hover:long', function () {
            openSettings(button);
        });

        $('.menu .menu__list').eq(0).append(button);
    }

    function start() {
        addButton();
        injectToMain();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });

})();
