
(function () {
    'use strict';

    /*
     * Random Pro 2.1.1
     * Minimal Edition
     * Lampa / TMDB
     */

    var VERSION = '2.1.1';
    var PLUGIN_ID = 'lampa_random_pro';

    if (window.random_pro_211_loaded) return;
    window.random_pro_211_loaded = true;

    var STORAGE_KEY = 'lampa_random_pro_settings';
    var CACHE_KEY = 'lampa_random_pro_cache';
    var HISTORY_KEY = 'lampa_random_pro_history';
    var CURRENT_KEY = 'lampa_random_pro_current';

    var CACHE_TIME = 300000;
    var HISTORY_LIMIT = 200;
    var RESULTS_LIMIT = 20;
    var REQUEST_TIMEOUT = 12000;

    var started = false;
    var menuObserver = null;
    var currentResults = [];
    var memoryCache = null;
    var activeJob = null;
    var requestSerial = 0;
    var refreshLock = false;

    var DEFAULTS = {
        type: 'all',
        genres: [],
        years: 'all',
        minRating: 6.5
    };

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

    var GENRE_MAP = {
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

    var STRATEGIES = [
        { id: 'quality', quota: 8 },
        { id: 'gems', quota: 5 },
        { id: 'popular', quota: 4 },
        { id: 'surprise', quota: 3 }
    ];

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[Random Pro]');
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

    function getStorage(key, fallback) {
        try {
            var value = Lampa.Storage.get(key);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function setStorage(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {
            log('Storage error', e);
        }
    }

    function clone(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (e) {
            return value;
        }
    }

    function unique(items) {
        return items.filter(function (value, index) {
            return items.indexOf(value) === index;
        });
    }

    function shuffle(items) {
        var result = items.slice();

        for (var i = result.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = result[i];
            result[i] = result[j];
            result[j] = tmp;
        }

        return result;
    }

    function random(min, max) {
        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            log(message);
        }
    }

    function getSettings() {
        var saved = getStorage(STORAGE_KEY, {});
        var settings = Object.assign({}, DEFAULTS, saved || {});

        settings.genres = Array.isArray(settings.genres)
            ? unique(settings.genres.map(String))
            : [];

        if (['all', 'movie', 'tv'].indexOf(settings.type) < 0) {
            settings.type = 'all';
        }

        if (['all', 'new', 'retro', '90s'].indexOf(settings.years) < 0) {
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
        setStorage(STORAGE_KEY, settings);
        clearCache();
    }

    function signature(settings) {
        return JSON.stringify({
            type: settings.type,
            genres: settings.genres.slice().sort(),
            years: settings.years,
            rating: settings.minRating
        });
    }

    function clearCache() {
        memoryCache = null;
        setStorage(CACHE_KEY, null);
    }

    function getCache(settings) {
        var cache = memoryCache ||
            getStorage(CACHE_KEY, null);

        if (!cache || !Array.isArray(cache.results)) {
            return null;
        }

        if (Date.now() - cache.time >= CACHE_TIME) {
            return null;
        }

        if (cache.signature !== signature(settings)) {
            return null;
        }

        return clone(cache.results);
    }

    function saveCache(settings, results) {
        var cache = {
            time: Date.now(),
            signature: signature(settings),
            results: clone(results)
        };

        memoryCache = cache;
        setStorage(CACHE_KEY, cache);
    }

    function getHistory() {
        var history = getStorage(HISTORY_KEY, []);
        return Array.isArray(history) ? history : [];
    }

    function remember(results) {
        var history = getHistory();

        results.forEach(function (item) {
            history.push(item.type + '_' + item.id);
        });

        setStorage(
            HISTORY_KEY,
            unique(history).slice(-HISTORY_LIMIT)
        );
    }

    function mapGenres(genres, type) {
        var result = [];

        genres.forEach(function (genre) {
            var id = Number(genre);

            if (type === 'movie') {
                if (MOVIE_GENRES[id]) result.push(id);
            } else if (TV_GENRES[id]) {
                result.push(id);
            } else if (GENRE_MAP[id]) {
                result = result.concat(GENRE_MAP[id]);
            }
        });

        return unique(result);
    }

    function applyYears(params, type, settings) {
        var key = type === 'movie'
            ? 'primary_release_date'
            : 'first_air_date';

        var current = new Date().getFullYear();

        if (settings.years === 'new') {
            params[key + '.gte'] =
                (current - 5) + '-01-01';

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
            item.first_air_date || '';

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

    function buildParams(type, strategy, page, settings) {
        var params = {
            language: tr('uk-UA', 'ru-RU'),
            include_adult: false,
            page: page,
            'vote_average.gte': settings.minRating
        };

        switch (strategy) {
            case 'quality':
                params.sort_by = 'vote_average.desc';
                params['vote_count.gte'] = 500;
                break;

            case 'gems':
                params.sort_by = 'vote_average.desc';
                params['vote_count.gte'] = 50;
                params['vote_count.lte'] = 2500;
                break;

            case 'popular':
                params.sort_by = 'popularity.desc';
                params['vote_count.gte'] = 200;
                break;

            default:
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

        switch (strategy) {
            case 'quality':
                return quality * 0.85 +
                    popular * 0.15 +
                    Math.random() * 5;

            case 'gems':
                return quality * 0.9 +
                    Math.max(0, 20 - popular * 0.2) +
                    Math.random() * 10;

            case 'popular':
                return popular * 0.75 +
                    quality * 0.25 +
                    Math.random() * 5;

            default:
                return quality * 0.3 +
                    popular * 0.15 +
                    Math.random() * 50;
        }
    }

    function requestTmdb(type, params, callback) {
        var completed = false;

        var timeout = setTimeout(function () {
            finish(null);
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

    function buildTasks(settings) {
        var tasks = [];

        var types = settings.type === 'all'
            ? ['movie', 'tv']
            : [settings.type];

        STRATEGIES.forEach(function (strategy) {
            types.forEach(function (type) {
                var pages = [];
                var count = types.length === 2 ? 2 : 3;
                var maxPage = strategy.id === 'gems' ? 10 : 12;

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

    function filterCandidates(items, settings, history) {
        var seen = {};

        return items.filter(function (item) {
            if (!item || !item.id || !item.poster_path) {
                return false;
            }

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

            var selectedGenres = mapGenres(
                settings.genres,
                item.type
            );

            if (selectedGenres.length) {
                var itemGenres = item.genre_ids || [];

                if (!selectedGenres.some(function (id) {
                    return itemGenres.indexOf(id) !== -1;
                })) {
                    return false;
                }
            }

            if (history.indexOf(key) !== -1) {
                return false;
            }

            return true;
        });
    }

    function selectBalanced(items, settings) {
        var history = getHistory();

        var available = filterCandidates(
            items,
            settings,
            history
        );

        if (available.length < RESULTS_LIMIT) {
            available = filterCandidates(
                items,
                settings,
                []
            );
        }

        var selected = [];
        var used = {};

        STRATEGIES.forEach(function (strategy) {
            var candidates = available.map(function (item) {
                return {
                    item: item,
                    score: score(item, strategy.id)
                };
            });

            candidates.sort(function (a, b) {
                return b.score - a.score;
            });

            var pool = candidates.slice(0, 50);
            var added = 0;

            while (pool.length && added < strategy.quota) {
                var index = random(
                    0,
                    Math.min(9, pool.length - 1)
                );

                var candidate = pool.splice(index, 1)[0].item;
                var key = candidate.type + '_' + candidate.id;

                if (used[key]) continue;

                used[key] = true;
                selected.push(candidate);
                added++;
            }
        });

        shuffle(available).forEach(function (item) {
            if (selected.length >= RESULTS_LIMIT) return;

            var key = item.type + '_' + item.id;

            if (!used[key]) {
                used[key] = true;
                selected.push(item);
            }
        });

        return shuffle(selected.slice(0, RESULTS_LIMIT));
    }

    function discover(force, callback) {
        var settings = getSettings();

        if (!force) {
            var cached = getCache(settings);

            if (cached && cached.length) {
                currentResults = cached;
                callback(cached);
                return;
            }

            if (activeJob &&
                activeJob.signature === signature(settings)) {
                activeJob.callbacks.push(callback);
                return;
            }
        }

        var id = ++requestSerial;

        var job = {
            id: id,
            signature: signature(settings),
            callbacks: [callback],
            tasks: buildTasks(settings),
            index: 0,
            active: 0,
            finished: 0,
            results: [],
            completed: false
        };

        activeJob = job;

        function finish() {
            if (job.completed) return;
            job.completed = true;

            if (job.id !== requestSerial) return;

            var results = selectBalanced(
                job.results,
                settings
            );

            if (results.length) {
                currentResults = clone(results);
                saveCache(settings, results);
                remember(results);

                setStorage(
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
            if (job.completed || job.id !== requestSerial) {
                return;
            }

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

                    requestTmdb(
                        task.type,
                        params,
                        function (json) {
                            job.active--;
                            job.finished++;

                            if (job.id !== requestSerial) return;

                            if (json &&
                                Array.isArray(json.results)) {

                                json.results.forEach(function (item) {
                                    item.type = task.type;
                                    item.media_type = task.type;
                                    item.__random_strategy =
                                        task.strategy;

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
     * Results screen
     *
     * Standard Lampa cards and controller.
     */

    function registerComponent() {
        if (!Lampa.Component ||
            typeof Lampa.Component.add !== 'function') {
            return;
        }

        Lampa.Component.add('random_pro_results', function () {
            var self = this;
            var html = $('<div class="random-pro-results"></div>');
            var scroll = new Lampa.Scroll({ mask: true });
            var body = $('<div class="random-pro-grid"></div>');
            var cards = [];
            var lastFocus = null;
            var destroyed = false;

            html.append(scroll.render());
            scroll.append(body);

            function focusFirst() {
                var selectors = body.find('.selector');

                if (!selectors.length) return;

                var target = lastFocus &&
                    $.contains(body[0], lastFocus)
                    ? $(lastFocus)
                    : selectors.eq(0);

                Lampa.Controller.collectionFocus(
                    target,
                    scroll.render()
                );
            }

            function openCard(item) {
                try {
                    Lampa.Activity.push({
                        url: item.type + '/' + item.id,
                        component: 'full',
                        id: item.id,
                        method: item.type,
                        card: item,
                        source: 'tmdb'
                    });
                } catch (e) {
                    log('Open card error', e);
                }
            }

            this.create = function () {
                var results = currentResults.length
                    ? currentResults
                    : getStorage(CURRENT_KEY, []);

                body.empty();
                cards = [];

                results.forEach(function (item) {
                    try {
                        var card = Lampa.Card(item, {
                            card_small: false
                        });

                        card.create();

                        var element = card.render();

                        element.on('hover:focus', function () {
                            lastFocus = element[0];
                        });

                        element.on('hover:enter', function () {
                            openCard(item);
                        });

                        body.append(element);
                        cards.push(card);
                    } catch (e) {
                        log('Card rendering error', e);
                    }
                });

                return this.render();
            };

            this.render = function () {
                return html;
            };

            this.start = function () {
                /*
                 * collectionSet requires a DOM container
                 * as its second argument in this Lampa build.
                 */

                Lampa.Controller.add('content', {
                    toggle: function () {
                        var container = body[0];

                        if (!container) return;

                        Lampa.Controller.collectionSet(
                            'content',
                            container
                        );

                        focusFirst();
                    },

                    up: function () {
                        Lampa.Controller.collectionUp();
                    },

                    down: function () {
                        Lampa.Controller.collectionDown();
                    },

                    left: function () {
                        Lampa.Controller.collectionLeft();
                    },

                    right: function () {
                        Lampa.Controller.collectionRight();
                    },

                    back: function () {
                        Lampa.Activity.backward();
                    }
                });

                Lampa.Controller.toggle('content');
            };

            this.pause = function () {};

            this.stop = function () {};

            this.destroy = function () {
                if (destroyed) return;
                destroyed = true;

                cards.forEach(function (card) {
                    try {
                        if (card.destroy) card.destroy();
                    } catch (e) {}
                });

                try {
                    if (scroll.destroy) scroll.destroy();
                } catch (e) {}

                html.remove();
            };
        });
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
        setStorage(CURRENT_KEY, currentResults);

        try {
            Lampa.Activity.push({
                title: tr(
                    'Може, подивимось?',
                    'Может, посмотрим?'
                ),
                component: 'random_pro_results',
                page: 1
            });
        } catch (e) {
            log('Results screen error', e);
            notify(tr(
                'Не вдалося відкрити добірку',
                'Не удалось открыть подборку'
            ));
        }
    }

    function surpriseMe() {
        if (refreshLock) return;

        refreshLock = true;
        clearCache();

        notify(tr(
            'Шукаю щось цікаве...',
            'Ищу что-нибудь интересное...'
        ));

        discover(true, function (results) {
            refreshLock = false;

            if (!results.length) {
                notify(tr(
                    'Спробуй змінити жанри або рейтинг',
                    'Попробуй изменить жанры или рейтинг'
                ));
                return;
            }

            openResults(results);
        });
    }

    /*
     * Main page row
     */

    function injectMain() {
        if (!Lampa.ContentRows ||
            typeof Lampa.ContentRows.call !== 'function') {
            return;
        }

        if (Lampa.ContentRows.call.__random_pro_211) {
            return;
        }

        var original = Lampa.ContentRows.call;

        function wrapped(screen, params, calls) {
            if (screen === 'main' &&
                Array.isArray(calls)) {

                calls.unshift(function (call) {
                    discover(false, function (results) {
                        call({
                            title: tr(
                                'Може, подивимось?',
                                'Может, посмотрим?'
                            ),
                            results: results || []
                        });
                    });
                });
            }

            return original.apply(this, arguments);
        }

        wrapped.__random_pro_211 = true;
        Lampa.ContentRows.call = wrapped;
    }

    /*
     * Minimal settings
     */

    function showSelect(title, items, onSelect, onBack) {
        Lampa.Select.show({
            title: title,
            items: items,
            onSelect: function (selected) {
                if (selected && onSelect) {
                    onSelect(selected);
                }
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

    function typeName(type) {
        if (type === 'movie') {
            return tr('Фільми', 'Фильмы');
        }

        if (type === 'tv') {
            return tr('Серіали', 'Сериалы');
        }

        return tr(
            'Фільми та серіали',
            'Фильмы и сериалы'
        );
    }

    function yearName(value) {
        var names = {
            all: tr('Усі роки', 'Все годы'),
            new: tr('Останні 5 років', 'Последние 5 лет'),
            retro: tr('До 2005 року', 'До 2005 года'),
            '90s': tr('90-ті', '90-е')
        };

        return names[value] || names.all;
    }

    function openSettings() {
        var settings = getSettings();

        var items = [
            item(
                tr('Тип контенту', 'Тип контента'),
                typeName(settings.type),
                'type'
            ),
            item(
                tr('Жанри', 'Жанры'),
                settings.genres.length
                    ? tr('Обрано: ', 'Выбрано: ') +
                      settings.genres.length
                    : tr('Будь-які', 'Любые'),
                'genres'
            ),
            item(
                tr('Період', 'Период'),
                yearName(settings.years),
                'years'
            ),
            item(
                tr('Мінімальний рейтинг', 'Минимальный рейтинг'),
                settings.minRating.toFixed(1),
                'rating'
            ),
            item(
                tr('Здивуй мене', 'Удиви меня'),
                tr('Нова добірка', 'Новая подборка'),
                'surprise'
            )
        ];

        showSelect(
            'Random Pro',
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
        showSelect(
            tr('Тип контенту', 'Тип контента'),
            [
                item(typeName('all'), '', 'all'),
                item(typeName('movie'), '', 'movie'),
                item(typeName('tv'), '', 'tv')
            ],
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
            item(tr('Готово', 'Готово'), '', '__done'),
            item(
                tr('Очистити вибір', 'Очистить выбор'),
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
            tr('Жанри', 'Жанры'),
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
        showSelect(
            tr('Період', 'Период'),
            [
                item(yearName('all'), '', 'all'),
                item(yearName('new'), '', 'new'),
                item(yearName('retro'), '', 'retro'),
                item(yearName('90s'), '', '90s')
            ],
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
        var items = [];

        for (var rating = 5; rating <= 9; rating += 0.5) {
            items.push(
                item(
                    rating.toFixed(1),
                    '',
                    String(rating)
                )
            );
        }

        showSelect(
            tr('Мінімальний рейтинг', 'Минимальный рейтинг'),
            items,
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
     * Side menu
     */

    function addButton() {
        if (typeof $ !== 'function') return;

        var selector =
            '.menu__item[data-action="' + PLUGIN_ID + '"]';

        if ($(selector).length) return;

        var menu = $('.menu .menu__list').eq(0);
        if (!menu.length) return;

        var button = $(
            '<li class="menu__item selector" ' +
            'data-action="' + PLUGIN_ID + '">' +
            '<div class="menu__ico">' +
            '<span class="random-pro-menu-mark">R</span>' +
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
    }

    /*
     * Styles
     */

    function installStyles() {
        if (document.getElementById('random-pro-211-style')) {
            return;
        }

        var css = [
            '.random-pro-menu-mark{',
            'display:flex;',
            'align-items:center;',
            'justify-content:center;',
            'width:1.6em;',
            'height:1.6em;',
            'border:1px solid currentColor;',
            'border-radius:50%;',
            'font-size:.8em;',
            'font-weight:500;',
            'letter-spacing:-.03em;',
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

            '@media(max-width:600px){',
            '.random-pro-results{padding:1em;}',
            '.random-pro-grid{gap:.6em;}',
            '.random-pro-grid .card{width:30%;}',
            '}'
        ].join('');

        var style = document.createElement('style');
        style.id = 'random-pro-211-style';
        style.textContent = css;

        document.head.appendChild(style);
    }

    function watchMenu() {
        if (menuObserver ||
            typeof MutationObserver === 'undefined') {
            return;
        }

        var menu = document.querySelector('.menu');
        if (!menu) return;

        menuObserver = new MutationObserver(function () {
            if (!document.querySelector(
                '.menu__item[data-action="' + PLUGIN_ID + '"]'
            )) {
                addButton();
            }
        });

        menuObserver.observe(menu, {
            childList: true,
            subtree: true
        });
    }

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

        log('Random Pro ' + VERSION + ' ready');
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
