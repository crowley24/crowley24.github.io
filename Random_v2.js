(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_pro_plus';
    var STORAGE_KEY = 'lampa_random_pro_settings';
    var HISTORY_KEY = 'lampa_random_history';

    var ALL_GENRES = {
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
    };

    function getSettings() {
        return Object.assign({
            genres: [],
            type: 'all',
            mode: 'strict',
            noAnimation: true
        }, Lampa.Storage.get(STORAGE_KEY) || {});
    }

    function saveSettings(s) {
        Lampa.Storage.set(STORAGE_KEY, s);
    }

    function getHistory() {
        return Lampa.Storage.get(HISTORY_KEY) || [];
    }

    function saveHistory(list) {
        Lampa.Storage.set(HISTORY_KEY, list.slice(-30));
    }

    function filterResults(results, settings) {
        return results.filter(function (item) {

            if (!item.genre_ids) return false;

            if (settings.noAnimation && item.genre_ids.indexOf(16) !== -1) return false;

            if (settings.mode === 'strict' && settings.genres.length > 1) {
                return settings.genres.every(function (g) {
                    return item.genre_ids.indexOf(parseInt(g)) !== -1;
                });
            }

            return true;
        });
    }

    function removeSeen(results) {
        var history = getHistory();

        return results.filter(function (item) {
            return history.indexOf(item.id) === -1;
        });
    }

    function remember(results) {
        var history = getHistory();
        results.forEach(function (i) {
            history.push(i.id);
        });
        saveHistory(history);
    }

    function getConfig() {
        var s = getSettings();
        var genres = s.genres.length ? s.genres : Object.keys(ALL_GENRES);
        var randomGenre = genres[Math.floor(Math.random() * genres.length)];

        var type = 'movie';
        if (s.type === 'tv') type = 'tv';
        else if (s.type === 'all') type = Math.random() > 0.5 ? 'movie' : 'tv';

        return {
            type: type,
            params: {
                with_genres: randomGenre,
                page: Math.floor(Math.random() * 50) + 1,
                'vote_average.gte': 6,
                'vote_count.gte': 200
            }
        };
    }

    function loadRandom(callback, attempt) {
        attempt = attempt || 0;

        var config = getConfig();
        var settings = getSettings();
        var method = config.type === 'movie' ? 'discover/movie' : 'discover/tv';

        Lampa.Api.sources.tmdb.get(method, config.params, function (json) {

            if (!json || !json.results) return callback([]);

            var res = filterResults(json.results, settings);
            res = removeSeen(res);

            if (res.length < 5 && attempt < 3) {
                loadRandom(callback, attempt + 1);
                return;
            }

            res.forEach(function (i) {
                i.type = config.type;
            });

            remember(res);
            callback(res);

        }, function () {
            callback([]);
        });
    }

    function injectRow() {
        if (Lampa.ContentRows.call.__pro_plus) return;
        Lampa.ContentRows.call.__pro_plus = true;

        var original = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {

            if (screen === 'main') {

                calls.unshift(function (call) {

                    loadRandom(function (results) {

                        call({
                            results: results,
                            title: '🎲 PRO Random  🔄'
                        });

                        // кнопка оновити
                        setTimeout(function () {
                            $('.content__title:contains("PRO Random")')
                                .off('hover:enter')
                                .on('hover:enter', function () {

                                    Lampa.Controller.toggle('content');

                                    setTimeout(function () {
                                        Lampa.Activity.replace({
                                            url: '',
                                            component: 'main'
                                        });
                                    }, 100);
                                });
                        }, 500);

                    });

                });
            }

            original.apply(this, arguments);
        };
    }

    function addSwipe() {
        var startX = 0;

        $(document).on('touchstart', function (e) {
            startX = e.originalEvent.touches[0].clientX;
        });

        $(document).on('touchend', function (e) {
            var endX = e.originalEvent.changedTouches[0].clientX;

            if (Math.abs(startX - endX) > 100) {
                Lampa.Activity.replace({ component: 'main' });
            }
        });
    }

    function addButton() {
        var btn = $('<li class="menu__item selector"><div class="menu__ico">🎲</div><div class="menu__text">PRO Random</div></li>');

        btn.on('hover:enter', function () {
            loadRandom(function (results) {

                Lampa.Activity.push({
                    title: 'PRO Random',
                    component: 'category_full',
                    results: results
                });

            });
        });

        $('.menu .menu__list').append(btn);
    }

    function start() {
        injectRow();
        addSwipe();
        addButton();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') start();
    });

})();
