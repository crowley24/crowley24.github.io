
(function () {
    'use strict';

    /*
     * RANDOM PRO 2.1
     * Smart Random Edition
     * Lampa / TMDB
     *
     * Simple outside. Smart inside.
     */

    var VERSION = '2.1.0';
    var PLUGIN_ID = 'lampa_random_pro';

    if (window.random_pro_21_loaded) return;
    window.random_pro_21_loaded = true;

    var STORAGE_KEY = 'lampa_random_pro_settings';
    var CACHE_KEY = 'lampa_random_pro_cache';
    var HISTORY_KEY = 'lampa_random_pro_history';
    var CURRENT_KEY = 'lampa_random_pro_current';

    var CACHE_TIME = 5 * 60 * 1000;
    var HISTORY_LIMIT = 200;
    var RESULTS_LIMIT = 20;
    var REQUEST_TIMEOUT = 12000;

    var menuAdded = false;
    var menuObserver = null;
    var rowInstalled = false;
    var componentInstalled = false;
    var started = false;

    var requestId = 0;
    var activeJob = null;
    var memoryCache = null;
    var currentResults = null;

    var MOVIE_GENRES = {
        28: 'Бойовик',
        12: 'Пригоди',
        16: 'Мультфільм',
        35: 'Комедія',
        80: 'Кримінал',
        99: 'Документальний',
        18: 'Драма',
        10751: 'Сімейний',
        14: 'Фентезі',
        36: 'Історія',
        27: 'Жахи',
        10402: 'Музика',
        9648: 'Містика',
        10749: 'Мелодрама',
        878: 'Фантастика',
        53: 'Трилер',
        10752: 'Військовий',
        37: 'Вестерн'
    };

    var TV_GENRES = {
        10759: 'Бойовик та пригоди',
        16: 'Мультфільм',
        35: 'Комедія',
        80: 'Кримінал',
        99: 'Документальний',
        18: 'Драма',
        10751: 'Сімейний',
        10762: 'Дитячий',
        9648: 'Містика',
        10763: 'Новини',
        10764: 'Реаліті',
        10765: 'Фантастика та фентезі',
        10766: 'Мильна опера',
        10767: 'Ток-шоу',
        10768: 'Війна та політика',
        37: 'Вестерн'
    };

    /*
     * Logical genre groups.
     * Used for movie -> TV conversion.
     */

    var GENRE_GROUPS = {
        28: [10759],
        12: [10759],
        878: [10765],
        14: [10765],
        10752: [10768],
        10749: [18],
        36: [18],
        53: [80, 9648],
        27: [9648, 10765],
        16: [16],
        35: [35],
        80: [80],
        99: [99],
        18: [18],
        10751: [10751],
        9648: [9648],
        37: [37]
    };

    var DEFAULTS = {
        type: 'all',
        genres: [],
        years: 'all',
        minRating: 6.5
    };

    /*
     * Utility
     */

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[Random Pro 2.1]');
            console.log.apply(console, args);
        } catch (e) {}
    }

    function tr(uk, ru) {
        try {
            return Lampa.Storage.get('language', 'uk') === 'ru'
                ? ru
                : uk;
        } catch (e) {
            return uk;
        }
    }

    function storageGet(key, fallback) {
        try {
            var value = Lampa.Storage.get(key);
            return value === undefined || value === null
                ? fallback
                : value;
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {
            log('Storage error', e);
        }
    }

    function clone(data) {
        try {
            return JSON.parse(JSON.stringify(data));
        } catch (e) {
            return data;
        }
    }

    function unique(array) {
        return array.filter(function (item, index) {
            return array.indexOf(item) === index;
        });
    }

    function shuffle(array) {
        var result = array.slice();

        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = result[i];
            result[i] = result[j];
            result[j] = temp;
        }

        return result;
    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            log(message);
        }
    }

    /*
     * Settings
     */

    function getSettings() {
        var saved = storageGet(STORAGE_KEY, {});

        var settings = Object.assign(
            {},
            DEFAULTS,
            saved || {}
        );

        if (!Array.isArray(settings.genres)) {
            settings.genres = [];
        }

        settings.genres = unique(
            settings.genres.map(String)
        );

        if (['all', 'movie', 'tv'].indexOf(settings.type) === -1) {
            settings.type = 'all';
        }

        if (['all', 'new', 'retro', '90s'].indexOf(settings.years) === -1) {
            settings.years = 'all';
        }

        settings.minRating = Number(settings.minRating);

        if (!isFinite(settings.minRating)) {
            settings.minRating = 6.5;
        }

        settings.minRating = Math.max(
            5,
            Math.min(9, settings.minRating)
        );

        return settings;
    }

    function saveSettings(settings) {
        storageSet(STORAGE_KEY, settings);
        clearCache();
    }

    function settingsSignature(settings) {
        return JSON.stringify({
            type: settings.type,
            genres: settings.genres.slice().sort(),
            years: settings.years,
            rating: settings.minRating
        });
    }

    /*
     * Cache
     */

    function clearCache() {
        memoryCache = null;
        storageSet(CACHE_KEY, null);
    }

    function getCache(settings) {
        var cache = memoryCache ||
                    storageGet(CACHE_KEY, null);

        if (!cache || !Array.isArray(cache.results)) {
            return null;
        }

        if (Date.now() - cache.time > CACHE_TIME) {
            return null;
        }

        if (cache.signature !== settingsSignature(settings)) {
            return null;
        }

        return clone(cache.results);
    }

    function setCache(settings, results) {
        var cache = {
            time: Date.now(),
            signature: settingsSignature(settings),
            results: clone(results)
        };

        memoryCache = cache;
        storageSet(CACHE_KEY, cache);
    }

    /*
     * History
     */

    function getHistory() {
        var history = storageGet(HISTORY_KEY, []);
        return Array.isArray(history) ? history : [];
    }

    function saveHistory(history) {
        storageSet(
            HISTORY_KEY,
            unique(history).slice(-HISTORY_LIMIT)
        );
    }

    function remember(results) {
        var history = getHistory();

        results.forEach(function (item) {
            history.push(item.type + '_' + item.id);
        });

        saveHistory(history);
    }

    /*
     * Genres
     */

    function mapGenres(genres, type) {
        var result = [];

        genres.forEach(function (genre) {
            var id = Number(genre);

            if (type === 'movie') {
                if (MOVIE_GENRES[id]) {
                    result.push(id);
                }
            } else {
                if (TV_GENRES[id]) {
                    result.push(id);
                } else if (GENRE_GROUPS[id]) {
                    result = result.concat(GENRE_GROUPS[id]);
                }
            }
        });

        return unique(result);
    }

    /*
     * Years
     */

    function applyYears(params, type, settings) {
        var key = type === 'movie'
            ? 'primary_release_date'
            : 'first_air_date';

        var year = new Date().getFullYear();

        if (settings.years === 'new') {
            params[key + '.gte'] = (year - 5) + '-01-01';
            params[key + '.lte'] =
                new Date().toISOString().substring(0, 10);
        } else if (settings.years === 'retro') {
            params[key + '.lte'] = '2005-12-31';
        } else if (settings.years === '90s') {
            params[key + '.gte'] = '1990-01-01';
            params[key + '.lte'] = '1999-12-31';
        }
    }

    function matchesYear(item, settings) {
        if (settings.years === 'all') return true;

        var date = item.release_date ||
                   item.first_air_date ||
                   '';

        var year = parseInt(date.substring(0, 4), 10);

        if (!year) return false;

        var current = new Date().getFullYear();

        if (settings.years === 'new') {
            return year >= current - 5 &&
                   year <= current;
        }

        if (settings.years === 'retro') {
            return year <= 2005;
        }

        if (settings.years === '90s') {
            return year >= 1990 && year <= 1999;
        }

        return true;
    }

    /*
     * Smart Random Engine
     *
     * Target balance:
     *
     * 40% Quality
     * 25% Hidden Gems
     * 20% Popular
     * 15% Surprise
     */

    var STRATEGIES = [
        { id: 'quality', count: 8 },
        { id: 'gems', count: 5 },
        { id: 'popular', count: 4 },
        { id: 'surprise', count: 3 }
    ];

    function buildParams(type, strategy, page, settings) {
        var params = {
            language: tr('uk-UA', 'ru-RU'),
            include_adult: false,
            page: page,
            'vote_average.gte': settings.minRating
        };

        if (strategy === 'quality') {
            params.sort_by = 'vote_average.desc';
            params['vote_count.gte'] = 500;
        }

        if (strategy === 'gems') {
            params.sort_by = 'vote_average.desc';
            params['vote_count.gte'] = 50;
            params['vote_count.lte'] = 2500;
        }

        if (strategy === 'popular') {
            params.sort_by = 'popularity.desc';
            params['vote_count.gte'] = 200;
        }

        if (strategy === 'surprise') {
            params.sort_by = Math.random() < 0.5
                ? 'popularity.desc'
                : 'vote_average.desc';

            params['vote_count.gte'] = 30;
        }

        applyYears(params, type, settings);

        var genres = mapGenres(settings.genres, type);

        if (genres.length) {
            params.with_genres = genres.join('|');
        }

        return params;
    }

    function score(item, strategy) {
        var rating = Number(item.vote_average) || 0;
        var votes = Number(item.vote_count) || 0;
        var popularity = Number(item.popularity) || 0;

        var confidence = Math.min(
            1,
            Math.log(votes + 1) / Math.log(5001)
        );

        var quality = rating * 10 * confidence;
        var popular = Math.min(
            100,
            Math.log(popularity + 1) * 15
        );

        if (strategy === 'quality') {
            return quality * 0.85 +
                   popular * 0.15 +
                   Math.random() * 5;
        }

        if (strategy === 'gems') {
            return quality * 0.9 +
                   Math.max(0, 20 - popular * 0.2) +
                   Math.random() * 10;
        }

        if (strategy === 'popular') {
            return popular * 0.75 +
                   quality * 0.25 +
                   Math.random() * 5;
        }

        return quality * 0.3 +
               popular * 0.15 +
               Math.random() * 50;
    }

    /*
     * TMDB request
     */

    function tmdbRequest(type, params, callback) {
        var completed = false;

        var timeout = setTimeout(function () {
            if (completed) return;
            completed = true;
            callback(null);
        }, REQUEST_TIMEOUT);

        function finish(data) {
            if (completed) return;

            completed = true;
            clearTimeout(timeout);
            callback(data);
        }

        try {
            Lampa.Api.sources.tmdb.get(
                'discover/' + type,
                params,
                function (json) {
                    finish(json);
                },
                function () {
                    finish(null);
                }
            );
        } catch (e) {
            finish(null);
        }
    }

    /*
     * Candidate tasks
     */

    function buildTasks(settings) {
        var tasks = [];

        var types = settings.type === 'all'
            ? ['movie', 'tv']
            : [settings.type];

        STRATEGIES.forEach(function (strategy) {
            types.forEach(function (type) {
                var pages = [];

                var maxPage = strategy.id === 'gems'
                    ? 10
                    : 12;

                var count = settings.type === 'all'
                    ? 2
                    : 3;

                while (pages.length < count) {
                    var page = random(1, maxPage);

                    if (pages.indexOf(page) === -1) {
                        pages.push(page);
                    }
                }

                pages.forEach(function (page) {
                    tasks.push({
                        type: type,
                        strategy: strategy.id,
                        page: page
                    });
                });
            });
        });

        return shuffle(tasks);
    }

    /*
     * Candidate filtering
     */

    function filterCandidates(items, settings, history) {
        var seen = {};

        return items.filter(function (item) {
            if (!item || !item.id) return false;
            if (!item.poster_path) return false;

            var key = item.type + '_' + item.id;

            if (seen[key]) return false;
            seen[key] = true;

            if ((Number(item.vote_average) || 0) <
                settings.minRating) {
                return false;
            }

            if (!matchesYear(item, settings)) {
                return false;
            }

            var genres = mapGenres(
                settings.genres,
                item.type
            );

            if (genres.length) {
                var itemGenres = item.genre_ids || [];

                var matched = genres.some(function (id) {
                    return itemGenres.indexOf(id) !== -1;
                });

                if (!matched) return false;
            }

            if (history.indexOf(key) !== -1) {
                return false;
            }

            return true;
        });
    }

    /*
     * Balanced selection
     */

    function selectBalanced(items, settings) {
        var history = getHistory();

        var filtered = filterCandidates(
            items,
            settings,
            history
        );

        if (filtered.length < RESULTS_LIMIT) {
            filtered = filterCandidates(
                items,
                settings,
                []
            );
        }

        var selected = [];
        var used = {};

        STRATEGIES.forEach(function (strategy) {
            var candidates = filtered.map(function (item) {
                return {
                    item: item,
                    value: score(item, strategy.id)
                };
            });

            candidates.sort(function (a, b) {
                return b.value - a.value;
            });

            var pool = candidates.slice(0, 50);

            var added = 0;

            while (pool.length && added < strategy.count) {
                var range = Math.min(10, pool.length);
                var index = random(0, range - 1);
                var candidate = pool.splice(index, 1)[0].item;

                var key = candidate.type + '_' + candidate.id;

                if (used[key]) continue;

                used[key] = true;
                selected.push(candidate);
                added++;
            }
        });

        if (selected.length < RESULTS_LIMIT) {
            var rest = shuffle(filtered);

            rest.forEach(function (item) {
                if (selected.length >= RESULTS_LIMIT) return;

                var key = item.type + '_' + item.id;

                if (!used[key]) {
                    used[key] = true;
                    selected.push(item);
                }
            });
        }

        return shuffle(selected.slice(0, RESULTS_LIMIT));
    }

    /*
     * Discovery
     */

    function discover(force, callback) {
        var settings = getSettings();

        if (!force) {
            var cached = getCache(settings);

            if (cached && cached.length) {
                currentResults = cached;
                callback(cached);
                return;
            }
        }

        if (!force && activeJob &&
            activeJob.signature === settingsSignature(settings)) {
            activeJob.callbacks.push(callback);
            return;
        }

        var id = ++requestId;
        var tasks = buildTasks(settings);

        var job = {
            id: id,
            signature: settingsSignature(settings),
            callbacks: [callback],
            tasks: tasks,
            index: 0,
            active: 0,
            finished: 0,
            results: [],
            done: false
        };

        activeJob = job;

        function finish() {
            if (job.done) return;
            job.done = true;

            if (job.id !== requestId) return;

            var results = selectBalanced(
                job.results,
                settings
            );

            if (results.length) {
                currentResults = results;

                setCache(settings, results);
                remember(results);

                storageSet(
                    CURRENT_KEY,
                    clone(results)
                );
            }

            activeJob = null;

            job.callbacks.forEach(function (fn) {
                try {
                    fn(results);
                } catch (e) {
                    log('Callback error', e);
                }
            });
        }

        function next() {
            if (job.done || job.id !== requestId) return;

            while (job.active < 2 &&
                   job.index < job.tasks.length) {
                (function (task) {
                    job.active++;

                    var params = buildParams(
                        task.type,
                        task.strategy,
                        task.page,
                        settings
                    );

                    tmdbRequest(
                        task.type,
                        params,
                        function (json) {
                            job.active--;
                            job.finished++;

                            if (job.id !== requestId) return;

                            if (json &&
                                Array.isArray(json.results)) {
                                json.results.forEach(function (item) {
                                    item.type = task.type;
                                    item.media_type = task.type;

                                    job.results.push(item);
                                });
                            }

                            if (job.finished >= job.tasks.length) {
                                finish();
                            } else {
                                next();
                            }
                        }
                    );
                })(job.tasks[job.index++]);
            }

            if (!job.active &&
                job.index >= job.tasks.length) {
                finish();
            }
        }

        next();
    }

    /*
     * Main page
     */

    function injectMain() {
        if (!Lampa.ContentRows ||
            typeof Lampa.ContentRows.call !== 'function') {
            return;
        }

        if (Lampa.ContentRows.call.__random_pro_21) {
            return;
        }

        var original = Lampa.ContentRows.call;

        function wrapped(screen, params, calls) {
            if (screen === 'main' &&
                Array.isArray(calls)) {
                calls.unshift(function (call) {
                    discover(false, function (results) {
                        call({
                            title: '🎲 ' +
                                tr('Може, подивимось?', 'Может, посмотрим?'),
                            results: results || []
                        });
                    });
                });
            }

            return original.apply(this, arguments);
        }

        wrapped.__random_pro_21 = true;

        Lampa.ContentRows.call = wrapped;
        rowInstalled = true;
    }

    /*
     * Results component
     *
     * Uses Lampa's standard category card rendering
     * where available.
     */

    function registerComponent() {
        if (componentInstalled) return;

        if (!Lampa.Component ||
            typeof Lampa.Component.add !== 'function') {
            return;
        }

        Lampa.Component.add('random_pro_results', function () {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({ mask: true });
            var html = $('<div class="random-pro-results"></div>');
            var body = $('<div class="random-pro-grid"></div>');
            var cards = [];

            html.append(scroll.render());
            scroll.append(body);

            this.create = function () {
                var results = currentResults ||
                    storageGet(CURRENT_KEY, []);

                body.empty();
                cards = [];

                results.forEach(function (item) {
                    try {
                        var card = Lampa.Card(item, {
                            card_small: false
                        });

                        card.create();

                        card.on('hover:enter', function () {
                            Lampa.Activity.push({
                                url: item.type + '/' + item.id,
                                component: 'full',
                                id: item.id,
                                method: item.type,
                                card: item,
                                source: 'tmdb'
                            });
                        });

                        body.append(card.render());
                        cards.push(card);
                    } catch (e) {
                        log('Card error', e);
                    }
                });

                return this.render();
            };

            this.render = function () {
                return html;
            };

            this.start = function () {
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(
                            body.find('.selector')
                        );

                        Lampa.Controller.collectionFocus(
                            body.find('.selector').eq(0),
                            scroll.render()
                        );
                    },
                    up: function () {
                        Lampa.Controller.collectionFocus(
                            body.find('.selector').eq(0),
                            scroll.render()
                        );
                    },
                    down: function () {},
                    left: function () {},
                    right: function () {},
                    back: function () {
                        Lampa.Activity.backward();
                    }
                });

                Lampa.Controller.toggle('content');
            };

            this.pause = function () {};
            this.stop = function () {};
            this.destroy = function () {
                cards.forEach(function (card) {
                    if (card.destroy) card.destroy();
                });

                if (scroll.destroy) scroll.destroy();
                if (network.clear) network.clear();

                html.remove();
            };
        });

        componentInstalled = true;
    }

    function openResults(results) {
        if (!results || !results.length) {
            notify(tr(
                'Не вдалося знайти рекомендації',
                'Не удалось найти рекомендации'
            ));
            return;
        }

        currentResults = clone(results);
        storageSet(CURRENT_KEY, currentResults);

        try {
            Lampa.Activity.push({
                title: '🎲 ' +
                    tr('Може, подивимось?', 'Может, посмотрим?'),
                component: 'random_pro_results',
                page: 1
            });
        } catch (e) {
            log('Open results error', e);
            notify(tr(
                'Помилка відкриття добірки',
                'Ошибка открытия подборки'
            ));
        }
    }

    /*
     * Refresh
     */

    function surpriseMe() {
        clearCache();

        notify(tr(
            '🎲 Шукаю щось цікаве...',
            '🎲 Ищу что-нибудь интересное...'
        ));

        discover(true, function (results) {
            if (!results.length) {
                notify(tr(
                    'Спробуй інші жанри або рейтинг',
                    'Попробуй другие жанры или рейтинг'
                ));
                return;
            }

            notify(tr(
                '✨ Знайшла дещо цікаве!',
                '✨ Нашла кое-что интересное!'
            ));

            openResults(results);
        });
    }

    /*
     * Settings UI
     */

    function showSelect(title, items, onSelect, onBack) {
        Lampa.Select.show({
            title: title,
            items: items,
            onSelect: function (item) {
                if (item && onSelect) onSelect(item);
            },
            onBack: function () {
                if (onBack) onBack();
                else Lampa.Controller.toggle('menu');
            }
        });
    }

    function item(title, subtitle, value) {
        return {
            title: title,
            subtitle: subtitle || '',
            value: value
        };
    }

    function typeTitle(type) {
        if (type === 'movie') {
            return tr('Фільми', 'Фильмы');
        }

        if (type === 'tv') {
            return tr('Серіали', 'Сериалы');
        }

        return tr('Фільми та серіали', 'Фильмы и сериалы');
    }

    function yearsTitle(years) {
        var names = {
            all: tr('Усі роки', 'Все годы'),
            new: tr('Останні 5 років', 'Последние 5 лет'),
            retro: tr('Класика до 2005', 'Классика до 2005'),
            '90s': tr('90-ті', '90-е')
        };

        return names[years] || names.all;
    }

    function openSettings() {
        var settings = getSettings();

        var items = [
            item(
                '🎬 ' + tr('Що шукаємо?', 'Что ищем?'),
                typeTitle(settings.type),
                'type'
            ),
            item(
                '🎭 ' + tr('Жанри', 'Жанры'),
                settings.genres.length
                    ? tr('Обрано: ', 'Выбрано: ') +
                      settings.genres.length
                    : tr('Будь-які', 'Любые'),
                'genres'
            ),
            item(
                '📅 ' + tr('Період', 'Период'),
                yearsTitle(settings.years),
                'years'
            ),
            item(
                '⭐ ' + tr('Рейтинг', 'Рейтинг'),
                tr('Від ', 'От ') +
                settings.minRating.toFixed(1),
                'rating'
            ),
            item(
                '🎲 ' + tr('Здивуй мене!', 'Удиви меня!'),
                tr('Знайти нову добірку', 'Найти новую подборку'),
                'surprise'
            )
        ];

        showSelect(
            '🎲 Random Pro 2.1',
            items,
            function (selected) {
                switch (selected.value) {
                    case 'type':
                        openType();
                        break;
                    case 'genres':
                        openGenres();
                        break;
                    case 'years':
                        openYears();
                        break;
                    case 'rating':
                        openRating();
                        break;
                    case 'surprise':
                        surpriseMe();
                        break;
                }
            },
            function () {
                Lampa.Controller.toggle('menu');
            }
        );
    }

    function openType() {
        var options = [
            item(tr('Фільми та серіали', 'Фильмы и сериалы'), '', 'all'),
            item(tr('Фільми', 'Фильмы'), '', 'movie'),
            item(tr('Серіали', 'Сериалы'), '', 'tv')
        ];

        showSelect(
            tr('Що шукаємо?', 'Что ищем?'),
            options,
            function (selected) {
                var settings = getSettings();
                settings.type = selected.value;

                saveSettings(settings);
                openSettings();
            },
            openSettings
        );
    }

    function openGenres() {
        var settings = getSettings();

        var ids = Object.keys(MOVIE_GENRES).sort(function (a, b) {
            return MOVIE_GENRES[a].localeCompare(
                MOVIE_GENRES[b],
                'uk'
            );
        });

        var items = [
            item(
                '✓ ' + tr('Готово', 'Готово'),
                '',
                '__done'
            ),
            item(
                '✕ ' + tr('Очистити вибір', 'Очистить выбор'),
                '',
                '__clear'
            )
        ];

        ids.forEach(function (id) {
            var selected = settings.genres.indexOf(id) !== -1;

            items.push(
                item(
                    (selected ? '●  ' : '○  ') +
                    MOVIE_GENRES[id],
                    '',
                    id
                )
            );
        });

        showSelect(
            tr('Оберіть жанри', 'Выберите жанры'),
            items,
            function (selected) {
                if (selected.value === '__done') {
                    openSettings();
                    return;
                }

                if (selected.value === '__clear') {
                    settings.genres = [];
                } else {
                    var id = String(selected.value);
                    var index = settings.genres.indexOf(id);

                    if (index === -1) {
                        settings.genres.push(id);
                    } else {
                        settings.genres.splice(index, 1);
                    }
                }

                saveSettings(settings);
                openGenres();
            },
            openSettings
        );
    }

    function openYears() {
        var options = [
            item(tr('Усі роки', 'Все годы'), '', 'all'),
            item(tr('Останні 5 років', 'Последние 5 лет'), '', 'new'),
            item(tr('Класика до 2005', 'Классика до 2005'), '', 'retro'),
            item(tr('90-ті', '90-е'), '', '90s')
        ];

        showSelect(
            tr('Період випуску', 'Период выпуска'),
            options,
            function (selected) {
                var settings = getSettings();
                settings.years = selected.value;

                saveSettings(settings);
                openSettings();
            },
            openSettings
        );
    }

    function openRating() {
        var options = [];

        for (var n = 5; n <= 9; n += 0.5) {
            options.push(
                item(
                    '⭐ ' + n.toFixed(1),
                    '',
                    String(n)
                )
            );
        }

        showSelect(
            tr('Мінімальний рейтинг', 'Минимальный рейтинг'),
            options,
            function (selected) {
                var settings = getSettings();
                settings.minRating = Number(selected.value);

                saveSettings(settings);
                openSettings();
            },
            openSettings
        );
    }

    /*
     * Menu
     */

    function addButton() {
        if (typeof $ !== 'function') return;

        var selector =
            '.menu__item[data-action="' + PLUGIN_ID + '"]';

        if ($(selector).length) {
            menuAdded = true;
            return;
        }

        var menu = $('.menu .menu__list').eq(0);

        if (!menu.length) return;

        var button = $(
            '<li class="menu__item selector" ' +
            'data-action="' + PLUGIN_ID + '">' +
            '<div class="menu__ico">' +
            '<span class="random-pro-icon">🎲</span>' +
            '</div>' +
            '<div class="menu__text">Random Pro</div>' +
            '</li>'
        );

        button.on('hover:enter', function () {
            openSettings();
        });

        button.on('hover:long', function () {
            surpriseMe();
        });

        menu.append(button);
        menuAdded = true;
    }

    /*
     * Styles
     */

    function installStyles() {
        if (document.getElementById('random-pro-21-style')) {
            return;
        }

        var css = [
            '.menu__item[data-action="lampa_random_pro"] .menu__ico{',
            'display:flex;',
            'align-items:center;',
            'justify-content:center;',
            '}',

            '.random-pro-icon{',
            'font-size:1.35em;',
            'line-height:1;',
            'transition:transform .2s ease;',
            '}',

            '.menu__item[data-action="lampa_random_pro"].focus ',
            '.random-pro-icon{',
            'transform:scale(1.1);',
            '}',

            '.random-pro-results{',
            'width:100%;',
            'height:100%;',
            'padding:1.5em 2em;',
            'box-sizing:border-box;',
            '}',

            '.random-pro-grid{',
            'display:flex;',
            'flex-wrap:wrap;',
            'gap:1em;',
            'align-items:flex-start;',
            '}',

            '.random-pro-grid .card{',
            'width:10.5em;',
            'flex-shrink:0;',
            '}',

            '@media (max-width:600px){',
            '.random-pro-results{padding:1em;}',
            '.random-pro-grid{gap:.6em;}',
            '.random-pro-grid .card{width:30%;}',
            '}',

            '@media (prefers-reduced-motion:reduce){',
            '.random-pro-icon{transition:none!important;}',
            '}'
        ].join('');

        var style = document.createElement('style');
        style.id = 'random-pro-21-style';
        style.textContent = css;

        document.head.appendChild(style);
    }

    /*
     * Menu observer
     */

    function watchMenu() {
        if (menuObserver ||
            typeof MutationObserver === 'undefined') {
            return;
        }

        var menu = document.querySelector('.menu');

        if (!menu) return;

        menuObserver = new MutationObserver(function () {
            var button = document.querySelector(
                '.menu__item[data-action="' + PLUGIN_ID + '"]'
            );

            if (!button) {
                menuAdded = false;
                addButton();
            }
        });

        menuObserver.observe(menu, {
            childList: true,
            subtree: true
        });
    }

    /*
     * Initialization
     */

    function start() {
        if (started) return;

        if (!window.Lampa ||
            !Lampa.Storage ||
            !Lampa.Select) {
            return;
        }

        started = true;

        installStyles();
        registerComponent();
        injectMain();
        addButton();
        watchMenu();

        log('Smart Random Edition started');
    }

    if (window.appready) {
        start();
    } else if (window.Lampa &&
               Lampa.Listener &&
               Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }

})();
