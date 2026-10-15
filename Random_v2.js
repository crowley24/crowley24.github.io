
(function () {
    'use strict';

    /*
     * RANDOM PRO 2.0
     * Discovery Engine for Lampa
     *
     * Features:
     * - Smart Discovery
     * - Surprise Me
     * - Hidden Gems
     * - Trending
     * - Strict
     * - Top Rated
     * - Multi-page TMDB discovery
     * - Movie / TV genre mapping
     * - Anti-repeat history
     * - Watched filtering
     * - Cache and request management
     * - Remote-friendly settings
     * - Main page recommendations
     */

    var PLUGIN_ID = 'lampa_random_pro';
    var VERSION = '2.0.0';

    if (window.random_pro_20_loaded) return;
    window.random_pro_20_loaded = true;

    var STORAGE_KEY = 'lampa_random_pro_settings';
    var CACHE_KEY = 'lampa_random_pro_cache';
    var HISTORY_KEY = 'lampa_random_pro_history';
    var PIN_KEY = 'lampa_random_pro_pinned';

    var CACHE_DURATION = 5 * 60 * 1000;
    var HISTORY_LIMIT = 200;
    var MAX_PAGES = 5;
    var REQUEST_TIMEOUT = 12000;

    var menuAdded = false;
    var menuObserver = null;
    var currentRequest = null;
    var requestSequence = 0;
    var memoryCache = null;
    var settingsScreenOpen = false;
    var lastRefresh = 0;

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
        10402: [],
        16: [16],
        35: [35],
        80: [80],
        99: [99],
        18: [18],
        10751: [10751],
        9648: [9648],
        37: [37]
    };

    var MODES = [
        {
            id: 'smart',
            name: 'Smart Discovery',
            description: 'Баланс рейтингу, популярності, жанрів і різноманітності'
        },
        {
            id: 'surprise',
            name: 'Surprise Me',
            description: 'Неочікувані фільми та серіали'
        },
        {
            id: 'gems',
            name: 'Hidden Gems',
            description: 'Маловідомі, але якісні знахідки'
        },
        {
            id: 'trends',
            name: 'Trending',
            description: 'Популярний контент'
        },
        {
            id: 'strict',
            name: 'Strict',
            description: 'Відповідність усім обраним жанрам'
        },
        {
            id: 'top',
            name: 'Top Rated',
            description: 'Найкращі оцінки з достатньою кількістю голосів'
        }
    ];

    var DEFAULTS = {
        genres: [],
        excludedGenres: [],
        type: 'all',
        mode: 'smart',
        years: 'all',
        yearFrom: 1980,
        yearTo: new Date().getFullYear(),
        minRating: 6.5,
        minVotes: 100,
        maxResults: 20,
        useCache: true,
        excludeWatched: false,
        antiRepeat: true,
        pageCount: 3,
        pinned: false,
        showMain: true,
        genreLogic: 'any',
        autoRefresh: false
    };

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[Random Pro 2.0]');
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

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function storageGet(key, fallback) {
        try {
            var result = Lampa.Storage.get(key);
            return result === undefined || result === null
                ? fallback
                : result;
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

    function unique(arr) {
        return arr.filter(function (value, index) {
            return arr.indexOf(value) === index;
        });
    }

    function normalizeIds(arr) {
        if (!Array.isArray(arr)) return [];

        return unique(arr.map(function (id) {
            return String(id);
        }));
    }

    function getSettings() {
        var saved = storageGet(STORAGE_KEY, {});
        var settings = Object.assign({}, DEFAULTS, saved || {});

        settings.genres = normalizeIds(settings.genres);
        settings.excludedGenres = normalizeIds(settings.excludedGenres);

        if (settings.mode === 'random') {
            settings.mode = 'surprise';
        }

        if (MODES.every(function (m) {
            return m.id !== settings.mode;
        })) {
            settings.mode = 'smart';
        }

        settings.minRating = Number(settings.minRating);
        if (!isFinite(settings.minRating)) settings.minRating = 6.5;

        settings.minRating = Math.max(
            0,
            Math.min(10, settings.minRating)
        );

        settings.minVotes = Math.max(
            0,
            Number(settings.minVotes) || 0
        );

        settings.maxResults = Math.max(
            10,
            Math.min(50, Number(settings.maxResults) || 20)
        );

        settings.pageCount = Math.max(
            1,
            Math.min(MAX_PAGES, Number(settings.pageCount) || 3)
        );

        return settings;
    }

    function saveSettings(settings) {
        storageSet(STORAGE_KEY, settings);
        clearCache();
    }

    function clearCache() {
        memoryCache = null;
        storageSet(CACHE_KEY, null);
    }

    function cacheSignature(settings) {
        return JSON.stringify({
            genres: settings.genres.slice().sort(),
            excludedGenres: settings.excludedGenres.slice().sort(),
            type: settings.type,
            mode: settings.mode,
            years: settings.years,
            yearFrom: settings.yearFrom,
            yearTo: settings.yearTo,
            minRating: settings.minRating,
            minVotes: settings.minVotes,
            maxResults: settings.maxResults,
            excludeWatched: settings.excludeWatched,
            antiRepeat: settings.antiRepeat,
            pageCount: settings.pageCount,
            genreLogic: settings.genreLogic
        });
    }

    function getCache(settings) {
        if (!settings.useCache) return null;

        var cache = memoryCache || storageGet(CACHE_KEY, null);

        if (!cache || !cache.results) return null;

        if (Date.now() - cache.timestamp > CACHE_DURATION) {
            return null;
        }

        if (cache.signature !== cacheSignature(settings)) {
            return null;
        }

        return clone(cache.results);
    }

    function setCache(settings, results) {
        if (!settings.useCache) return;

        var cache = {
            timestamp: Date.now(),
            signature: cacheSignature(settings),
            results: clone(results)
        };

        memoryCache = cache;
        storageSet(CACHE_KEY, cache);
    }

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

    function rememberResults(results) {
        var history = getHistory();

        results.forEach(function (item) {
            history.push(item.type + '_' + item.id);
        });

        saveHistory(history);
    }

    function clearHistory() {
        storageSet(HISTORY_KEY, []);
    }

    function getPinned() {
        var pinned = storageGet(PIN_KEY, null);

        return Array.isArray(pinned) && pinned.length
            ? clone(pinned)
            : null;
    }

    function setPinned(results) {
        storageSet(PIN_KEY, clone(results));
    }

    function clearPinned() {
        storageSet(PIN_KEY, null);
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

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getContentType(settings) {
        if (settings.type !== 'all') return settings.type;
        return Math.random() < 0.5 ? 'movie' : 'tv';
    }

    function mapGenres(ids, type) {
        ids = normalizeIds(ids);

        if (type === 'movie') {
            return ids.filter(function (id) {
                return !!MOVIE_GENRES[id];
            }).map(Number);
        }

        var mapped = [];

        ids.forEach(function (id) {
            if (TV_GENRES[id]) {
                mapped.push(Number(id));
            } else if (GENRE_MAP[id]) {
                mapped = mapped.concat(GENRE_MAP[id]);
            }
        });

        return unique(mapped);
    }

    function getSelectedGenres(settings, type) {
        return mapGenres(settings.genres, type);
    }

    function getExcludedGenres(settings, type) {
        return mapGenres(settings.excludedGenres, type);
    }

    function dateParameters(settings, type, params) {
        var prefix = type === 'movie'
            ? 'primary_release_date'
            : 'first_air_date';

        var year = new Date().getFullYear();

        if (settings.years === 'new') {
            params[prefix + '.gte'] = (year - 5) + '-01-01';
            params[prefix + '.lte'] = new Date()
                .toISOString()
                .substring(0, 10);
        } else if (settings.years === 'retro') {
            params[prefix + '.lte'] = '2005-12-31';
        } else if (settings.years === '90s') {
            params[prefix + '.gte'] = '1990-01-01';
            params[prefix + '.lte'] = '1999-12-31';
        } else if (settings.years === 'custom') {
            params[prefix + '.gte'] =
                settings.yearFrom + '-01-01';

            params[prefix + '.lte'] =
                settings.yearTo + '-12-31';
        }
    }

    function buildParameters(settings, type, page) {
        var lang = tr('uk-UA', 'ru-RU');

        var params = {
            language: lang,
            page: page,
            include_adult: false,
            'vote_average.gte': settings.minRating
        };

        var mode = settings.mode;

        if (mode === 'trends') {
            params.sort_by = 'popularity.desc';
            params['vote_count.gte'] = Math.max(
                settings.minVotes,
                100
            );
        } else if (mode === 'top') {
            params.sort_by = 'vote_average.desc';
            params['vote_count.gte'] = Math.max(
                settings.minVotes,
                500
            );
        } else if (mode === 'gems') {
            params.sort_by = 'vote_average.desc';
            params['vote_count.gte'] = Math.max(
                30,
                Math.min(settings.minVotes, 100)
            );
            params['vote_count.lte'] = 3000;
        } else if (mode === 'surprise') {
            params.sort_by = Math.random() < 0.5
                ? 'popularity.desc'
                : 'vote_average.desc';

            params['vote_count.gte'] = Math.max(
                30,
                Math.floor(settings.minVotes / 2)
            );
        } else {
            params.sort_by = Math.random() < 0.35
                ? 'vote_average.desc'
                : 'popularity.desc';

            params['vote_count.gte'] = settings.minVotes;
        }

        dateParameters(settings, type, params);

        var genres = getSelectedGenres(settings, type);
        var excluded = getExcludedGenres(settings, type);

        if (mode !== 'trends' && genres.length) {
            if (mode === 'strict' ||
                settings.genreLogic === 'all') {
                params.with_genres = genres.join(',');
            } else {
                params.with_genres = genres.join('|');
            }
        }

        if (excluded.length) {
            params.without_genres = excluded.join(',');
        }

        return params;
    }

    function getYear(item) {
        var date = item.release_date || item.first_air_date || '';
        var year = parseInt(date.substring(0, 4), 10);
        return isFinite(year) ? year : 0;
    }

    function matchesYear(item, settings) {
        if (settings.years === 'all') return true;

        var year = getYear(item);
        if (!year) return false;

        var current = new Date().getFullYear();

        if (settings.years === 'new') {
            return year >= current - 5 && year <= current;
        }

        if (settings.years === 'retro') {
            return year <= 2005;
        }

        if (settings.years === '90s') {
            return year >= 1990 && year <= 1999;
        }

        if (settings.years === 'custom') {
            return year >= settings.yearFrom &&
                   year <= settings.yearTo;
        }

        return true;
    }

    function matchesGenres(item, settings, type) {
        var ids = item.genre_ids || [];

        var selected = getSelectedGenres(settings, type);
        var excluded = getExcludedGenres(settings, type);

        if (excluded.some(function (id) {
            return ids.indexOf(id) !== -1;
        })) {
            return false;
        }

        if (settings.mode === 'trends' || !selected.length) {
            return true;
        }

        if (settings.mode === 'strict' ||
            settings.genreLogic === 'all') {
            return selected.every(function (id) {
                return ids.indexOf(id) !== -1;
            });
        }

        return selected.some(function (id) {
            return ids.indexOf(id) !== -1;
        });
    }

    function isWatched(item) {
        var id = String(item.id);
        var type = item.type || item.media_type || 'movie';

        var sources = [
            storageGet('files_watched', {}),
            storageGet('history', {}),
            storageGet('watched', {})
        ];

        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];

            if (!source) continue;

            if (!Array.isArray(source) &&
                typeof source === 'object') {
                if (source[id] ||
                    source[type + '_' + id] ||
                    source[type + ':' + id]) {
                    return true;
                }
            }

            if (Array.isArray(source)) {
                for (var j = 0; j < source.length; j++) {
                    var entry = source[j];

                    if (!entry || typeof entry !== 'object') {
                        continue;
                    }

                    var entryId = entry.id ||
                                  entry.movie_id ||
                                  entry.tv_id;

                    if (String(entryId) === id) {
                        var entryType = entry.type ||
                                        entry.media_type;

                        if (!entryType || entryType === type) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    function qualityScore(item, settings) {
        var rating = Number(item.vote_average) || 0;
        var votes = Number(item.vote_count) || 0;
        var popularity = Number(item.popularity) || 0;

        var voteConfidence = Math.min(
            1,
            Math.log(votes + 1) / Math.log(5001)
        );

        var ratingScore = rating * 10 * voteConfidence;
        var popularityScore = Math.min(
            100,
            Math.log(popularity + 1) * 15
        );

        var score;

        switch (settings.mode) {
            case 'top':
                score = ratingScore * 0.9 +
                        popularityScore * 0.1;
                break;

            case 'trends':
                score = popularityScore * 0.8 +
                        ratingScore * 0.2;
                break;

            case 'gems':
                score = ratingScore * 0.85 +
                        Math.max(0, 25 - popularityScore * 0.2);
                break;

            case 'surprise':
                score = ratingScore * 0.35 +
                        popularityScore * 0.15 +
                        Math.random() * 45;
                break;

            case 'strict':
                score = ratingScore * 0.7 +
                        popularityScore * 0.2 +
                        Math.random() * 10;
                break;

            default:
                score = ratingScore * 0.55 +
                        popularityScore * 0.25 +
                        Math.random() * 20;
        }

        return score;
    }

    function filterResults(results, settings) {
        var history = getHistory();
        var seen = {};

        var filtered = results.filter(function (item) {
            if (!item || !item.id) return false;

            var key = item.type + '_' + item.id;

            if (seen[key]) return false;
            seen[key] = true;

            if (!item.poster_path) return false;

            if ((Number(item.vote_average) || 0) <
                settings.minRating) {
                return false;
            }

            if (!matchesYear(item, settings)) return false;

            if (!matchesGenres(item, settings, item.type)) {
                return false;
            }

            if (settings.excludeWatched && isWatched(item)) {
                return false;
            }

            if (settings.antiRepeat &&
                history.indexOf(key) !== -1) {
                return false;
            }

            return true;
        });

        filtered.forEach(function (item) {
            item.__random_score = qualityScore(item, settings);
        });

        filtered.sort(function (a, b) {
            return b.__random_score - a.__random_score;
        });

        return filtered;
    }

    function prepareResults(results, settings) {
        var sorted = filterResults(results, settings);

        var selected = [];

        if (settings.mode === 'surprise') {
            selected = shuffle(sorted).slice(
                0,
                settings.maxResults
            );
        } else {
            var pool = sorted.slice(
                0,
                Math.max(settings.maxResults * 2, 30)
            );

            while (pool.length &&
                   selected.length < settings.maxResults) {
                var range = Math.min(8, pool.length);
                var index = randomInt(0, range - 1);

                selected.push(pool.splice(index, 1)[0]);
            }
        }

        selected.forEach(function (item) {
            delete item.__random_score;
        });

        return selected;
    }

    function tmdbRequest(type, params, success, error) {
        var completed = false;

        var timer = setTimeout(function () {
            if (completed) return;

            completed = true;
            error('timeout');
        }, REQUEST_TIMEOUT);

        function done(callback, value) {
            if (completed) return;

            completed = true;
            clearTimeout(timer);
            callback(value);
        }

        try {
            var method = 'discover/' + type;

            Lampa.Api.sources.tmdb.get(
                method,
                params,
                function (json) {
                    done(success, json);
                },
                function (err) {
                    done(error, err);
                }
            );
        } catch (e) {
            done(error, e);
        }
    }

    function buildTasks(settings) {
        var tasks = [];
        var types;

        if (settings.type === 'all') {
            types = ['movie', 'tv'];
        } else {
            types = [settings.type];
        }

        types.forEach(function (type) {
            var pages = [];
            var maxPage = settings.mode === 'gems' ? 12 : 15;

            while (pages.length < settings.pageCount) {
                var page = randomInt(1, maxPage);

                if (pages.indexOf(page) === -1) {
                    pages.push(page);
                }
            }

            pages.forEach(function (page) {
                tasks.push({
                    type: type,
                    page: page
                });
            });
        });

        return shuffle(tasks);
    }

    function discover(options, callback) {
        options = options || {};

        var settings = getSettings();

        if (!options.force) {
            if (settings.pinned) {
                var pinned = getPinned();

                if (pinned) {
                    callback(pinned, null);
                    return;
                }
            }

            var cached = getCache(settings);

            if (cached) {
                callback(cached, null);
                return;
            }
        }

        var requestId = ++requestSequence;
        var tasks = buildTasks(settings);
        var allResults = [];

        var cursor = 0;
        var running = 0;
        var finished = 0;
        var concurrency = 2;
        var done = false;

        currentRequest = requestId;

        function finish() {
            if (done) return;
            done = true;

            if (requestId !== requestSequence) return;

            var results = prepareResults(
                allResults,
                settings
            );

            /*
             * If anti-repeat exhausted the candidate pool,
             * retry selection without history exclusion.
             * History itself remains preserved.
             */
            if (!results.length &&
                settings.antiRepeat &&
                allResults.length) {
                var fallbackSettings = Object.assign(
                    {},
                    settings,
                    { antiRepeat: false }
                );

                results = prepareResults(
                    allResults,
                    fallbackSettings
                );
            }

            if (results.length) {
                if (settings.antiRepeat) {
                    rememberResults(results);
                }

                setCache(settings, results);

                if (settings.pinned) {
                    setPinned(results);
                }
            }

            callback(
                results,
                results.length ? null : 'empty'
            );
        }

        function next() {
            if (requestId !== requestSequence || done) {
                return;
            }

            while (running < concurrency &&
                   cursor < tasks.length) {
                (function (task) {
                    running++;

                    var params = buildParameters(
                        settings,
                        task.type,
                        task.page
                    );

                    tmdbRequest(
                        task.type,
                        params,
                        function (json) {
                            running--;
                            finished++;

                            if (requestId !== requestSequence) {
                                return;
                            }

                            if (json &&
                                Array.isArray(json.results)) {
                                json.results.forEach(function (item) {
                                    item.type = task.type;
                                    item.media_type = task.type;
                                    allResults.push(item);
                                });
                            }

                            if (finished >= tasks.length) {
                                finish();
                            } else {
                                next();
                            }
                        },
                        function (err) {
                            running--;
                            finished++;

                            log('TMDB request failed', err);

                            if (requestId !== requestSequence) {
                                return;
                            }

                            if (finished >= tasks.length) {
                                finish();
                            } else {
                                next();
                            }
                        }
                    );
                })(tasks[cursor++]);
            }

            if (!running && cursor >= tasks.length) {
                finish();
            }
        }

        next();
    }

    function modeName(id) {
        var mode = MODES.filter(function (m) {
            return m.id === id;
        })[0];

        return mode ? mode.name : 'Smart Discovery';
    }

    function typeName(type) {
        if (type === 'movie') return tr('Фільми', 'Фильмы');
        if (type === 'tv') return tr('Серіали', 'Сериалы');
        return tr('Фільми та серіали', 'Фильмы и сериалы');
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            log(message);
        }
    }

    function refreshRecommendations(openAfter) {
        var now = Date.now();

        if (now - lastRefresh < 800) return;
        lastRefresh = now;

        clearCache();
        clearPinned();

        notify(tr(
            '🎲 Створюємо нову добірку...',
            '🎲 Создаем новую подборку...'
        ));

        discover({ force: true }, function (results, error) {
            if (error || !results.length) {
                notify(tr(
                    'Не вдалося знайти відповідний контент',
                    'Не удалось найти подходящий контент'
                ));
                return;
            }

            notify(tr(
                '✨ Нова добірка готова',
                '✨ Новая подборка готова'
            ));

            if (openAfter) {
                openResults(results);
            } else {
                try {
                    Lampa.Activity.replace({
                        component: 'main',
                        source: 'tmdb'
                    });
                } catch (e) {
                    log('Main refresh unavailable', e);
                }
            }
        });
    }

    function openResults(results) {
        if (!results || !results.length) {
            notify(tr(
                'Добірка порожня',
                'Подборка пуста'
            ));
            return;
        }

        /*
         * category_full uses a Lampa-compatible
         * data source when supported by the build.
         * Fallback: open a TMDB discovery category.
         */

        var settings = getSettings();
        var type = settings.type === 'all'
            ? results[0].type
            : settings.type;

        var params = buildParameters(settings, type, 1);

        try {
            Lampa.Activity.push({
                url: 'discover/' + type,
                title: '🎲 Random Pro · ' + modeName(settings.mode),
                component: 'category_full',
                source: 'tmdb',
                page: 1,
                params: params,
                genres: params.with_genres
            });
        } catch (e) {
            notify(tr(
                'Не вдалося відкрити добірку',
                'Не удалось открыть подборку'
            ));
        }
    }

    function mainRowTitle() {
        var settings = getSettings();

        return '🎲 Random Pro  ·  ' +
               modeName(settings.mode) +
               '  ·  ⭐ ' +
               settings.minRating.toFixed(1) + '+';
    }

    function injectToMain() {
        if (!Lampa.ContentRows ||
            typeof Lampa.ContentRows.call !== 'function') {
            return;
        }

        if (Lampa.ContentRows.call.__random_pro_20) {
            return;
        }

        var original = Lampa.ContentRows.call;

        function wrapped(screen, params, calls) {
            if (screen === 'main' &&
                Array.isArray(calls) &&
                getSettings().showMain) {

                calls.unshift(function (call) {
                    discover({}, function (results) {
                        call({
                            results: results || [],
                            title: mainRowTitle()
                        });
                    });
                });
            }

            return original.apply(this, arguments);
        }

        wrapped.__random_pro_20 = true;
        wrapped.__random_pro_original = original;

        Lampa.ContentRows.call = wrapped;

        log('Main row installed');
    }

    function showSelect(title, items, onSelect, onBack) {
        settingsScreenOpen = true;

        Lampa.Select.show({
            title: title,
            items: items,
            onSelect: function (item) {
                if (item && onSelect) {
                    onSelect(item);
                }
            },
            onBack: function () {
                settingsScreenOpen = false;

                if (onBack) {
                    onBack();
                } else {
                    try {
                        Lampa.Controller.toggle('content');
                    } catch (e) {}
                }
            }
        });
    }

    function settingItem(icon, title, subtitle, value) {
        return {
            title: icon + '  ' + title,
            subtitle: subtitle || '',
            value: value
        };
    }

    function updateSetting(key, value, reopen) {
        var settings = getSettings();
        settings[key] = value;

        saveSettings(settings);

        if (reopen) {
            setTimeout(reopen, 60);
        }
    }

    function openMainSettings() {
        var settings = getSettings();

        var items = [
            settingItem(
                '🎛️',
                tr('Основні параметри', 'Основные параметры'),
                typeName(settings.type) + ' · ' +
                modeName(settings.mode),
                'general'
            ),
            settingItem(
                '🎬',
                tr('Жанри', 'Жанры'),
                tr('Обрано: ', 'Выбрано: ') +
                settings.genres.length,
                'genres'
            ),
            settingItem(
                '⭐',
                tr('Якість контенту', 'Качество контента'),
                tr('Рейтинг: ', 'Рейтинг: ') +
                settings.minRating.toFixed(1),
                'quality'
            ),
            settingItem(
                '📅',
                tr('Період випуску', 'Период выпуска'),
                settings.years,
                'years'
            ),
            settingItem(
                '🕘',
                tr('Історія та повтори', 'История и повторы'),
                tr('Захист від повторів', 'Защита от повторов'),
                'history'
            ),
            settingItem(
                '⚙️',
                tr('Додатково', 'Дополнительно'),
                tr('Кеш, запити та головна', 'Кеш, запросы и главная'),
                'advanced'
            ),
            settingItem(
                '🎲',
                tr('Створити нову добірку', 'Создать новую подборку'),
                tr('Оновити рекомендації', 'Обновить рекомендации'),
                'refresh'
            ),
            settingItem(
                '🗑️',
                tr('Скинути налаштування', 'Сбросить настройки'),
                tr('Повернути стандартні значення', 'Вернуть стандартные значения'),
                'reset'
            )
        ];

        showSelect(
            '🎲 Random Pro 2.0 · Settings',
            items,
            function (item) {
                switch (item.value) {
                    case 'general':
                        openGeneralSettings();
                        break;
                    case 'genres':
                        openGenreSettings();
                        break;
                    case 'quality':
                        openQualitySettings();
                        break;
                    case 'years':
                        openYearSettings();
                        break;
                    case 'history':
                        openHistorySettings();
                        break;
                    case 'advanced':
                        openAdvancedSettings();
                        break;
                    case 'refresh':
                        refreshRecommendations(false);
                        break;
                    case 'reset':
                        confirmReset();
                        break;
                }
            },
            function () {
                Lampa.Controller.toggle('content');
            }
        );
    }

    function openGeneralSettings() {
        var settings = getSettings();

        var items = [
            settingItem(
                '🎬',
                tr('Тип контенту', 'Тип контента'),
                typeName(settings.type),
                'type'
            ),
            settingItem(
                '🧠',
                tr('Режим рекомендацій', 'Режим рекомендаций'),
                modeName(settings.mode),
                'mode'
            ),
            settingItem(
                '📊',
                tr('Кількість результатів', 'Количество результатов'),
                String(settings.maxResults),
                'count'
            ),
            settingItem(
                '↩️',
                tr('Назад', 'Назад'),
                '',
                'back'
            )
        ];

        showSelect(
            tr('Основні параметри', 'Основные параметры'),
            items,
            function (item) {
                if (item.value === 'type') {
                    openTypeSelect();
                } else if (item.value === 'mode') {
                    openModeSelect();
                } else if (item.value === 'count') {
                    openCountSelect();
                } else {
                    openMainSettings();
                }
            },
            openMainSettings
        );
    }

    function openTypeSelect() {
        var options = [
            { title: tr('Усе', 'Все'), value: 'all' },
            { title: tr('Фільми', 'Фильмы'), value: 'movie' },
            { title: tr('Серіали', 'Сериалы'), value: 'tv' }
        ];

        showSelect(
            tr('Тип контенту', 'Тип контента'),
            options,
            function (item) {
                updateSetting('type', item.value, openGeneralSettings);
            },
            openGeneralSettings
        );
    }

    function openModeSelect() {
        var items = MODES.map(function (mode) {
            return {
                title: mode.name,
                subtitle: mode.description,
                value: mode.id
            };
        });

        showSelect(
            tr('Режим рекомендацій', 'Режим рекомендаций'),
            items,
            function (item) {
                updateSetting('mode', item.value, openGeneralSettings);
            },
            openGeneralSettings
        );
    }

    function openCountSelect() {
        var items = [10, 20, 30, 40, 50].map(function (n) {
            return {
                title: String(n),
                value: String(n)
            };
        });

        showSelect(
            tr('Кількість результатів', 'Количество результатов'),
            items,
            function (item) {
                updateSetting(
                    'maxResults',
                    Number(item.value),
                    openGeneralSettings
                );
            },
            openGeneralSettings
        );
    }

    function openGenreSettings() {
        var settings = getSettings();

        var items = [
            settingItem(
                '🎯',
                tr('Логіка жанрів', 'Логика жанров'),
                settings.genreLogic === 'all'
                    ? tr('Усі жанри', 'Все жанры')
                    : tr('Будь-який жанр', 'Любой жанр'),
                'logic'
            ),
            settingItem(
                '✅',
                tr('Вибрати жанри', 'Выбрать жанры'),
                tr('Обрано: ', 'Выбрано: ') +
                settings.genres.length,
                'include'
            ),
            settingItem(
                '🚫',
                tr('Виключити жанри', 'Исключить жанры'),
                tr('Виключено: ', 'Исключено: ') +
                settings.excludedGenres.length,
                'exclude'
            ),
            settingItem(
                '🧹',
                tr('Очистити всі жанри', 'Очистить все жанры'),
                '',
                'clear'
            ),
            settingItem(
                '↩️',
                tr('Назад', 'Назад'),
                '',
                'back'
            )
        ];

        showSelect(
            tr('Налаштування жанрів', 'Настройки жанров'),
            items,
            function (item) {
                if (item.value === 'logic') {
                    updateSetting(
                        'genreLogic',
                        settings.genreLogic === 'all'
                            ? 'any'
                            : 'all',
                        openGenreSettings
                    );
                } else if (item.value === 'include') {
                    openGenreList(false);
                } else if (item.value === 'exclude') {
                    openGenreList(true);
                } else if (item.value === 'clear') {
                    settings.genres = [];
                    settings.excludedGenres = [];
                    saveSettings(settings);
                    openGenreSettings();
                } else {
                    openMainSettings();
                }
            },
            openMainSettings
        );
    }

    function openGenreList(exclude) {
        var settings = getSettings();
        var key = exclude ? 'excludedGenres' : 'genres';
        var selected = settings[key];

        var ids = Object.keys(MOVIE_GENRES).sort(function (a, b) {
            return MOVIE_GENRES[a].localeCompare(MOVIE_GENRES[b], 'uk');
        });

        var items = ids.map(function (id) {
            return {
                title: (selected.indexOf(id) !== -1
                    ? '●  '
                    : '○  ') + MOVIE_GENRES[id],
                value: id
            };
        });

        items.unshift({
            title: '✓  ' + tr('Готово', 'Готово'),
            value: '__done'
        });

        items.push({
            title: '✕  ' + tr('Очистити вибір', 'Очистить выбор'),
            value: '__clear'
        });

        showSelect(
            exclude
                ? tr('Виключені жанри', 'Исключенные жанры')
                : tr('Обрані жанри', 'Выбранные жанры'),
            items,
            function (item) {
                if (item.value === '__done') {
                    openGenreSettings();
                    return;
                }

                if (item.value === '__clear') {
                    settings[key] = [];
                } else {
                    var id = String(item.value);
                    var index = settings[key].indexOf(id);

                    if (index === -1) {
                        settings[key].push(id);
                    } else {
                        settings[key].splice(index, 1);
                    }

                    var other = exclude
                        ? 'genres'
                        : 'excludedGenres';

                    var otherIndex = settings[other].indexOf(id);

                    if (otherIndex !== -1) {
                        settings[other].splice(otherIndex, 1);
                    }
                }

                saveSettings(settings);
                openGenreList(exclude);
            },
            openGenreSettings
        );
    }

    function openQualitySettings() {
        var settings = getSettings();

        var items = [
            settingItem(
                '⭐',
                tr('Мінімальний рейтинг', 'Минимальный рейтинг'),
                settings.minRating.toFixed(1),
                'rating'
            ),
            settingItem(
                '👥',
                tr('Мінімум голосів', 'Минимум голосов'),
                String(settings.minVotes),
                'votes'
            ),
            settingItem(
                '↩️',
                tr('Назад', 'Назад'),
                '',
                'back'
            )
        ];

        showSelect(
            tr('Якість контенту', 'Качество контента'),
            items,
            function (item) {
                if (item.value === 'rating') {
                    openRatingSelect();
                } else if (item.value === 'votes') {
                    openVotesSelect();
                } else {
                    openMainSettings();
                }
            },
            openMainSettings
        );
    }

    function openRatingSelect() {
        var items = [];

        for (var rating = 5; rating <= 9; rating += 0.5) {
            items.push({
                title: '⭐ ' + rating.toFixed(1),
                value: String(rating)
            });
        }

        showSelect(
            tr('Мінімальний рейтинг', 'Минимальный рейтинг'),
            items,
            function (item) {
                updateSetting(
                    'minRating',
                    Number(item.value),
                    openQualitySettings
                );
            },
            openQualitySettings
        );
    }

    function openVotesSelect() {
        var votes = [0, 30, 50, 100, 200, 500, 1000];

        showSelect(
            tr('Мінімум голосів', 'Минимум голосов'),
            votes.map(function (n) {
                return {
                    title: String(n),
                    value: String(n)
                };
            }),
            function (item) {
                updateSetting(
                    'minVotes',
                    Number(item.value),
                    openQualitySettings
                );
            },
            openQualitySettings
        );
    }

    function openYearSettings() {
        var settings = getSettings();

        var labels = {
            all: tr('Будь-які', 'Любые'),
            new: tr('Останні 5 років', 'Последние 5 лет'),
            retro: tr('Класика до 2005', 'Классика до 2005'),
            '90s': tr('90-ті', '90-е'),
            custom: tr('Власний діапазон', 'Свой диапазон')
        };

        var items = Object.keys(labels).map(function (id) {
            return {
                title: (settings.years === id ? '● ' : '○ ') +
                       labels[id],
                value: id
            };
        });

        if (settings.years === 'custom') {
            items.push({
                title: tr('Від року: ', 'От года: ') +
                       settings.yearFrom,
                value: 'from'
            });

            items.push({
                title: tr('До року: ', 'До года: ') +
                       settings.yearTo,
                value: 'to'
            });
        }

        items.push({
            title: '↩️ ' + tr('Назад', 'Назад'),
            value: 'back'
        });

        showSelect(
            tr('Період випуску', 'Период выпуска'),
            items,
            function (item) {
                if (item.value === 'back') {
                    openMainSettings();
                } else if (item.value === 'from' ||
                           item.value === 'to') {
                    openYearNumberSelect(item.value);
                } else {
                    updateSetting(
                        'years',
                        item.value,
                        openYearSettings
                    );
                }
            },
            openMainSettings
        );
    }

    function openYearNumberSelect(which) {
        var settings = getSettings();
        var current = new Date().getFullYear();
        var items = [];

        for (var year = current; year >= 1950; year -= 1) {
            items.push({
                title: String(year),
                value: String(year)
            });
        }

        showSelect(
            which === 'from'
                ? tr('Початковий рік', 'Начальный год')
                : tr('Кінцевий рік', 'Конечный год'),
            items,
            function (item) {
                var year = Number(item.value);

                if (which === 'from') {
                    settings.yearFrom = year;

                    if (settings.yearTo < year) {
                        settings.yearTo = year;
                    }
                } else {
                    settings.yearTo = year;

                    if (settings.yearFrom > year) {
                        settings.yearFrom = year;
                    }
                }

                saveSettings(settings);
                openYearSettings();
            },
            openYearSettings
        );
    }

    function openHistorySettings() {
        var settings = getSettings();
        var history = getHistory();

        var items = [
            settingItem(
                settings.antiRepeat ? '✅' : '○',
                tr('Захист від повторів', 'Защита от повторов'),
                settings.antiRepeat
                    ? tr('Увімкнено', 'Включено')
                    : tr('Вимкнено', 'Выключено'),
                'repeat'
            ),
            settingItem(
                settings.excludeWatched ? '✅' : '○',
                tr('Виключити переглянуті', 'Исключить просмотренные'),
                '',
                'watched'
            ),
            settingItem(
                '📚',
                tr('Історія рекомендацій', 'История рекомендаций'),
                String(history.length) + ' / ' + HISTORY_LIMIT,
                'info'
            ),
            settingItem(
                '🗑️',
                tr('Очистити історію', 'Очистить историю'),
                '',
                'clear'
            ),
            settingItem(
                '↩️',
                tr('Назад', 'Назад'),
                '',
                'back'
            )
        ];

        showSelect(
            tr('Історія та повтори', 'История и повторы'),
            items,
            function (item) {
                if (item.value === 'repeat') {
                    updateSetting(
                        'antiRepeat',
                        !settings.antiRepeat,
                        openHistorySettings
                    );
                } else if (item.value === 'watched') {
                    updateSetting(
                        'excludeWatched',
                        !settings.excludeWatched,
                        openHistorySettings
                    );
                } else if (item.value === 'clear') {
                    clearHistory();
                    clearCache();
                    openHistorySettings();
                } else if (item.value === 'back') {
                    openMainSettings();
                }
            },
            openMainSettings
        );
    }

    function openAdvancedSettings() {
        var settings = getSettings();

        var items = [
            settingItem(
                settings.useCache ? '✅' : '○',
                tr('Кешування', 'Кеширование'),
                tr('Зберігати добірку 5 хвилин', 'Хранить подборку 5 минут'),
                'cache'
            ),
            settingItem(
                '📡',
                tr('Сторінок TMDB', 'Страниц TMDB'),
                String(settings.pageCount),
                'pages'
            ),
            settingItem(
                settings.showMain ? '✅' : '○',
                tr('Добірка на головній', 'Подборка на главной'),
                '',
                'main'
            ),
            settingItem(
                settings.pinned ? '📌' : '○',
                tr('Закріпити добірку', 'Закрепить подборку'),
                '',
                'pin'
            ),
            settingItem(
                '🧹',
                tr('Очистити кеш', 'Очистить кеш'),
                '',
                'clear'
            ),
            settingItem(
                'ℹ️',
                'Random Pro ' + VERSION,
                'Discovery Engine',
                'version'
            ),
            settingItem(
                '↩️',
                tr('Назад', 'Назад'),
                '',
                'back'
            )
        ];

        showSelect(
            tr('Додаткові параметри', 'Дополнительные параметры'),
            items,
            function (item) {
                if (item.value === 'cache') {
                    updateSetting(
                        'useCache',
                        !settings.useCache,
                        openAdvancedSettings
                    );
                } else if (item.value === 'pages') {
                    openPageCountSelect();
                } else if (item.value === 'main') {
                    updateSetting(
                        'showMain',
                        !settings.showMain,
                        openAdvancedSettings
                    );
                } else if (item.value === 'pin') {
                    settings.pinned = !settings.pinned;

                    if (!settings.pinned) clearPinned();

                    saveSettings(settings);
                    openAdvancedSettings();
                } else if (item.value === 'clear') {
                    clearCache();
                    openAdvancedSettings();
                } else if (item.value === 'back') {
                    openMainSettings();
                }
            },
            openMainSettings
        );
    }

    function openPageCountSelect() {
        var items = [];

        for (var n = 1; n <= MAX_PAGES; n++) {
            items.push({
                title: String(n),
                value: String(n)
            });
        }

        showSelect(
            tr('Кількість сторінок', 'Количество страниц'),
            items,
            function (item) {
                updateSetting(
                    'pageCount',
                    Number(item.value),
                    openAdvancedSettings
                );
            },
            openAdvancedSettings
        );
    }

    function confirmReset() {
        showSelect(
            tr('Скинути налаштування?', 'Сбросить настройки?'),
            [
                {
                    title: tr('Ні, залишити', 'Нет, оставить'),
                    value: 'no'
                },
                {
                    title: tr('Так, скинути', 'Да, сбросить'),
                    value: 'yes'
                }
            ],
            function (item) {
                if (item.value === 'yes') {
                    saveSettings(clone(DEFAULTS));
                    clearHistory();
                    clearPinned();
                }

                openMainSettings();
            },
            openMainSettings
        );
    }

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
            openRandomMenu();
        });

        button.on('hover:long', function () {
            openMainSettings();
        });

        menu.append(button);
        menuAdded = true;
    }

    function openRandomMenu() {
        var settings = getSettings();

        var items = [
            settingItem(
                '🎲',
                tr('Нова випадкова добірка', 'Новая случайная подборка'),
                modeName(settings.mode),
                'generate'
            ),
            settingItem(
                '📌',
                tr('Поточна добірка', 'Текущая подборка'),
                tr('Відкрити збережену', 'Открыть сохраненную'),
                'current'
            ),
            settingItem(
                '🔄',
                tr('Оновити рекомендації', 'Обновить рекомендации'),
                tr('Примусовий новий пошук', 'Принудительный новый поиск'),
                'refresh'
            ),
            settingItem(
                '⚙️',
                tr('Налаштування', 'Настройки'),
                'Random Pro ' + VERSION,
                'settings'
            )
        ];

        showSelect(
            '🎲 Random Pro 2.0',
            items,
            function (item) {
                if (item.value === 'settings') {
                    openMainSettings();
                } else if (item.value === 'refresh') {
                    refreshRecommendations(true);
                } else if (item.value === 'generate') {
                    discover({}, function (results) {
                        openResults(results);
                    });
                } else if (item.value === 'current') {
                    var pinned = getPinned();
                    var cached = getCache(settings);

                    if (pinned || cached) {
                        openResults(pinned || cached);
                    } else {
                        discover({}, function (results) {
                            openResults(results);
                        });
                    }
                }
            },
            function () {
                Lampa.Controller.toggle('menu');
            }
        );
    }

    function installStyles() {
        if (document.getElementById('random-pro-20-style')) {
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
            'transform:scale(1.12);',
            '}',

            '.menu__item[data-action="lampa_random_pro"] ',
            '.menu__text{',
            'font-weight:500;',
            '}',

            '@media (prefers-reduced-motion:reduce){',
            '.random-pro-icon{transition:none!important;}',
            '}'
        ].join('');

        var style = document.createElement('style');
        style.id = 'random-pro-20-style';
        style.textContent = css;

        document.head.appendChild(style);
    }

    function watchMenu() {
        if (menuObserver ||
            typeof MutationObserver === 'undefined') {
            return;
        }

        var root = document.querySelector('.menu');

        if (!root) return;

        menuObserver = new MutationObserver(function () {
            if (!$(
                '.menu__item[data-action="' + PLUGIN_ID + '"]'
            ).length) {
                menuAdded = false;
                addButton();
            }
        });

        menuObserver.observe(root, {
            childList: true,
            subtree: true
        });
    }

    function start() {
        if (!window.Lampa ||
            !Lampa.Storage ||
            !Lampa.Select) {
            return;
        }

        installStyles();
        injectToMain();
        addButton();
        watchMenu();

        log('Random Pro ' + VERSION + ' started');
    }

    function boot() {
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
    }

    boot();

})();
