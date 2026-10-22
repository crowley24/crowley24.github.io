
(function () {
    'use strict';

    /*
     * KINORIUM OST 1.1.1
     * Automatic Search + Navigation Fix
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 1.5.0
     *
     * FEATURES:
     * - Automatic movie search
     * - Automatic year detection
     * - Kinorium featured soundtracks
     * - Apple AudioPreview playback
     * - Automatic repeat
     * - Configurable volume
     * - Configurable startup delay
     * - Stop on movie card exit
     * - Activity/navigation monitoring
     * - Stale request protection
     * - Independent settings
     *
     * Does not modify the production
     * Original Soundtrack plugin.
     */

    var VERSION = '1.1.1';

    var WORKER =
        'https://kinorium-ost.unclezhenya24.workers.dev/';

    var PREFIX = 'kinorium_ost_';

    var DEFAULTS = {
        enabled: true,
        autoplay: true,
        volume: 65,
        delay: 2000,
        repeat: true,
        debug: false
    };

    var state = {
        initialized: false,

        audio: null,
        timer: null,
        request: null,

        movieKey: '',
        movie: null,
        track: null,

        token: 0,

        cardActive: false,
        cardOpenedAt: 0,

        navigationTimer: null,
        navigationGraceUntil: 0,

        lastActivity: '',
        lastFullEvent: '',

        playbackBlocked: false
    };

    function getSetting(key) {
        var name = PREFIX + key;
        var fallback = DEFAULTS[key];

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                return Lampa.Storage.get(
                    name,
                    fallback
                );
            }
        } catch (e) {}

        try {
            var raw = localStorage.getItem(name);

            return raw === null
                ? fallback
                : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function setSetting(key, value) {
        var name = PREFIX + key;

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.set === 'function'
            ) {
                Lampa.Storage.set(
                    name,
                    value
                );

                return;
            }
        } catch (e) {}

        try {
            localStorage.setItem(
                name,
                JSON.stringify(value)
            );
        } catch (e) {}
    }

    function log() {
        if (!getSetting('debug')) return;

        var args = Array.prototype.slice.call(
            arguments
        );

        args.unshift(
            '[Kinorium OST ' + VERSION + ']'
        );

        console.log.apply(console, args);
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function getVolume() {
        var value = Number(
            getSetting('volume')
        );

        if (!isFinite(value)) {
            value = DEFAULTS.volume;
        }

        return clamp(
            value,
            0,
            100
        ) / 100;
    }

    function getDelay() {
        var value = Number(
            getSetting('delay')
        );

        if (!isFinite(value)) {
            value = DEFAULTS.delay;
        }

        return clamp(
            value,
            0,
            10000
        );
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    function extractYear(value) {
        var match = String(
            value || ''
        ).match(
            /\b(?:18|19|20)\d{2}\b/
        );

        return match
            ? Number(match[0])
            : 0;
    }

    function movieFromData(data) {
        if (
            !data ||
            typeof data !== 'object'
        ) {
            return null;
        }

        var movie = data;

        for (var i = 0; i < 4; i++) {
            if (
                movie.data &&
                typeof movie.data === 'object'
            ) {
                movie = movie.data;
                continue;
            }

            if (
                movie.movie &&
                typeof movie.movie === 'object'
            ) {
                movie = movie.movie;
                continue;
            }

            if (
                movie.card &&
                typeof movie.card === 'object'
            ) {
                movie = movie.card;
                continue;
            }

            break;
        }

        var title = String(
            movie.original_title ||
            movie.title ||
            movie.name ||
            movie.original_name ||
            ''
        ).trim();

        if (!title) {
            return null;
        }

        var year = extractYear(
            movie.release_date ||
            movie.first_air_date ||
            movie.year ||
            movie.release_year
        );

        return {
            title: title,
            year: year,
            type: String(
                movie.media_type ||
                movie.type ||
                ''
            ).toLowerCase(),
            tmdbId: String(
                movie.id ||
                movie.tmdb_id ||
                ''
            )
        };
    }

    function movieKey(movie) {
        return [
            normalize(movie.title),
            movie.year,
            movie.tmdbId
        ].join('|');
    }

    function isSeries(movie) {
        return (
            movie.type === 'tv' ||
            movie.type === 'series' ||
            movie.type === 'serial'
        );
    }

    /*
     * LAMPA ACTIVITY DETECTION
     *
     * Lampa.Activity.active() usually
     * returns the current component.
     *
     * Different Lampa builds may return
     * a string or an object.
     */

    function getActiveActivity() {
        try {
            if (
                !window.Lampa ||
                !Lampa.Activity ||
                typeof Lampa.Activity.active !==
                    'function'
            ) {
                return '';
            }

            var active =
                Lampa.Activity.active();

            if (!active) {
                return '';
            }

            if (typeof active === 'string') {
                return active.toLowerCase();
            }

            if (typeof active === 'object') {
                var values = [
                    active.component,
                    active.type,
                    active.name,
                    active.activity,
                    active.url
                ];

                for (
                    var i = 0;
                    i < values.length;
                    i++
                ) {
                    if (
                        typeof values[i] ===
                            'string' &&
                        values[i]
                    ) {
                        return values[i]
                            .toLowerCase();
                    }
                }
            }

        } catch (e) {
            log(
                'Activity detection error',
                e
            );
        }

        return '';
    }

    function isFullActivity(value) {
        if (!value) return false;

        return (
            value === 'full' ||
            value.indexOf('full/') === 0 ||
            value.indexOf('full?') === 0
        );
    }

    function isKnownNonFullActivity(value) {
        if (!value) return false;

        var known = [
            'main',
            'home',
            'category',
            'catalog',
            'search',
            'favorite',
            'favorites',
            'bookmarks',
            'settings',
            'feed',
            'timetable',
            'history',
            'my_list'
        ];

        for (
            var i = 0;
            i < known.length;
            i++
        ) {
            if (
                value === known[i] ||
                value.indexOf(
                    known[i] + '/'
                ) === 0
            ) {
                return true;
            }
        }

        return false;
    }

    function clearPlaybackTimer() {
        if (state.timer) {
            clearTimeout(
                state.timer
            );

            state.timer = null;
        }
    }

    function abortRequest() {
        if (!state.request) {
            return;
        }

        try {
            state.request.abort();
        } catch (e) {}

        state.request = null;
    }

    function destroyAudio() {
        var player = state.audio;

        state.audio = null;

        if (!player) return;

        try {
            player.pause();
            player.loop = false;
            player.removeAttribute('src');
            player.load();
        } catch (e) {}
    }

    function stopPlayback(reason) {
        var wasActive = Boolean(
            state.movieKey ||
            state.audio ||
            state.timer ||
            state.request
        );

        state.token++;

        clearPlaybackTimer();
        abortRequest();
        destroyAudio();

        state.movieKey = '';
        state.movie = null;
        state.track = null;

        state.cardActive = false;
        state.cardOpenedAt = 0;

        state.playbackBlocked = false;

        state.navigationGraceUntil = 0;

        if (wasActive) {
            log(
                'Playback stopped:',
                reason || 'unknown'
            );
        }
    }

    function createAudio() {
        var player = new Audio();

        player.preload = 'auto';

        player.volume = getVolume();

        player.loop = Boolean(
            getSetting('repeat')
        );

        player.addEventListener(
            'error',
            function () {
                log(
                    'Audio error',
                    player.error
                );
            }
        );

        state.audio = player;

        return player;
    }

    function playAudio(url, track, token) {
        if (
            token !== state.token ||
            !state.cardActive
        ) {
            return;
        }

        /*
         * Verify navigation immediately
         * before starting the audio.
         */

        var activity = getActiveActivity();

        if (
            isKnownNonFullActivity(
                activity
            )
        ) {
            stopPlayback(
                'navigation_before_play'
            );

            return;
        }

        destroyAudio();

        state.track = track || null;

        var player = createAudio();

        player.src = url;

        try {
            player.load();

            var promise = player.play();

            if (
                promise &&
                typeof promise.catch ===
                    'function'
            ) {
                promise.catch(
                    function (error) {
                        if (
                            token !==
                            state.token
                        ) {
                            return;
                        }

                        state.playbackBlocked = true;

                        log(
                            'Playback failed',
                            error
                        );
                    }
                );
            }

            log(
                'Playing:',
                track
                    ? track.name
                    : 'Unknown',
                url
            );

        } catch (e) {
            log(
                'Playback exception',
                e
            );
        }
    }

    function buildWorkerURL(movie) {
        var url =
            WORKER +
            '?title=' +
            encodeURIComponent(
                movie.title
            );

        if (movie.year) {
            url +=
                '&year=' +
                movie.year;
        }

        if (getSetting('debug')) {
            url += '&debug=1';
        }

        return url;
    }

    function fetchSoundtrack(movie, token) {
        if (
            token !== state.token ||
            !state.cardActive
        ) {
            return;
        }

        abortRequest();

        var xhr = new XMLHttpRequest();

        state.request = xhr;

        var url = buildWorkerURL(
            movie
        );

        log(
            'Searching:',
            movie.title,
            movie.year
        );

        xhr.open(
            'GET',
            url,
            true
        );

        xhr.timeout = 20000;

        xhr.onreadystatechange =
            function () {
                if (
                    xhr.readyState !== 4
                ) {
                    return;
                }

                if (
                    state.request === xhr
                ) {
                    state.request = null;
                }

                if (
                    token !== state.token ||
                    !state.cardActive
                ) {
                    return;
                }

                if (
                    xhr.status < 200 ||
                    xhr.status >= 300
                ) {
                    log(
                        'Worker HTTP:',
                        xhr.status
                    );

                    return;
                }

                var result;

                try {
                    result = JSON.parse(
                        xhr.responseText
                    );
                } catch (e) {
                    log(
                        'Invalid JSON',
                        e
                    );

                    return;
                }

                if (
                    !result ||
                    !result.success ||
                    !result.found ||
                    !result.playable ||
                    !result.audioUrl
                ) {
                    log(
                        'Soundtrack unavailable',
                        result &&
                            result.reason
                    );

                    return;
                }

                playAudio(
                    result.audioUrl,
                    result.track,
                    token
                );
            };

        xhr.onerror = function () {
            log(
                'Network error'
            );
        };

        xhr.ontimeout = function () {
            log(
                'Worker timeout'
            );
        };

        try {
            xhr.send();
        } catch (e) {
            log(
                'Request error',
                e
            );
        }
    }

    function schedulePlayback(movie) {
        if (
            !movie ||
            !movie.title ||
            !movie.year
        ) {
            return;
        }

        if (
            !getSetting('enabled') ||
            !getSetting('autoplay')
        ) {
            return;
        }

        if (isSeries(movie)) {
            return;
        }

        var key = movieKey(movie);

        if (
            key === state.movieKey &&
            state.cardActive
        ) {
            return;
        }

        stopPlayback(
            'new_movie'
        );

        state.movie = movie;
        state.movieKey = key;

        state.cardActive = true;

        state.cardOpenedAt = Date.now();

        /*
         * Allow the Activity component
         * a short time to transition
         * to the movie card.
         */

        state.navigationGraceUntil =
            Date.now() + 1200;

        var token = state.token;

        log(
            'Movie opened:',
            movie.title,
            movie.year
        );

        state.timer = setTimeout(
            function () {
                state.timer = null;

                if (
                    token !== state.token ||
                    !state.cardActive
                ) {
                    return;
                }

                fetchSoundtrack(
                    movie,
                    token
                );
            },
            getDelay()
        );
    }

    /*
     * NAVIGATION MONITOR
     *
     * This monitor is independent from
     * the 'full' listener.
     *
     * It catches navigation to the main
     * screen even if the full component
     * does not emit 'destroy'.
     */

    function monitorNavigation() {
        if (!state.cardActive) {
            return;
        }

        var activity = getActiveActivity();

        if (!activity) {
            return;
        }

        if (
            activity !==
            state.lastActivity
        ) {
            log(
                'Activity:',
                state.lastActivity,
                '->',
                activity
            );

            state.lastActivity =
                activity;
        }

        if (
            Date.now() <
            state.navigationGraceUntil
        ) {
            return;
        }

        if (
            isKnownNonFullActivity(
                activity
            )
        ) {
            stopPlayback(
                'activity_changed_to_' +
                activity
            );
        }
    }

    function startNavigationMonitor() {
        if (
            state.navigationTimer
        ) {
            return;
        }

        state.navigationTimer =
            setInterval(
                monitorNavigation,
                250
            );
    }

    /*
     * FULL CARD EVENTS
     */

    function handleFullEvent(event) {
        if (!event) return;

        var type = String(
            event.type ||
            event.action ||
            ''
        ).toLowerCase();

        state.lastFullEvent = type;

        log(
            'Full event:',
            type
        );

        if (
            type === 'complite' ||
            type === 'complete' ||
            type === 'ready' ||
            type === 'open' ||
            type === 'start'
        ) {
            var movie = movieFromData(
                event.data ||
                event.movie ||
                event.card ||
                event
            );

            if (movie) {
                schedulePlayback(
                    movie
                );
            }

            return;
        }

        if (
            type === 'destroy' ||
            type === 'close' ||
            type === 'stop' ||
            type === 'back'
        ) {
            stopPlayback(
                'full_event_' + type
            );
        }
    }

    /*
     * ACTIVITY EVENTS
     *
     * An additional listener for Lampa
     * builds that broadcast navigation
     * through the activity channel.
     */

    function handleActivityEvent(event) {
        if (
            !state.cardActive ||
            !event
        ) {
            return;
        }

        var type = String(
            event.type ||
            event.action ||
            ''
        ).toLowerCase();

        var activity =
            getActiveActivity();

        log(
            'Activity event:',
            type,
            activity
        );

        if (
            isKnownNonFullActivity(
                activity
            )
        ) {
            stopPlayback(
                'activity_event_' +
                activity
            );
        }
    }

    function applyVolume() {
        if (state.audio) {
            state.audio.volume =
                getVolume();
        }
    }

    function applyRepeat() {
        if (state.audio) {
            state.audio.loop =
                Boolean(
                    getSetting('repeat')
                );
        }
    }

    function registerSettings() {
        if (
            !Lampa.SettingsApi ||
            typeof Lampa.SettingsApi.addParam !==
                'function'
        ) {
            return;
        }

        try {
            Lampa.SettingsApi.addComponent({
                component: 'kinorium_ost',
                name: 'Kinorium OST',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
            });
        } catch (e) {}

        function addParam(param) {
            try {
                Lampa.SettingsApi.addParam({
                    component: 'kinorium_ost',
                    ...param
                });
            } catch (e) {
                log(
                    'Settings error',
                    e
                );
            }
        }

        addParam({
            param: {
                name: PREFIX + 'enabled',
                type: 'trigger',
                default: DEFAULTS.enabled
            },
            field: {
                name: 'Увімкнути Kinorium OST',
                description:
                    'Тестове джерело саундтреків Kinorium'
            },
            onChange: function (value) {
                setSetting(
                    'enabled',
                    value
                );

                if (!value) {
                    stopPlayback(
                        'disabled'
                    );
                }
            }
        });

        addParam({
            param: {
                name: PREFIX + 'autoplay',
                type: 'trigger',
                default: DEFAULTS.autoplay
            },
            field: {
                name: 'Автоматичне відтворення',
                description:
                    'Запуск музики під час відкриття картки'
            },
            onChange: function (value) {
                setSetting(
                    'autoplay',
                    value
                );

                if (!value) {
                    stopPlayback(
                        'autoplay_disabled'
                    );
                }
            }
        });

        addParam({
            param: {
                name: PREFIX + 'repeat',
                type: 'trigger',
                default: DEFAULTS.repeat
            },
            field: {
                name: 'Повторювати композицію',
                description:
                    'Безперервне повторення аудіофрагмента'
            },
            onChange: function (value) {
                setSetting(
                    'repeat',
                    value
                );

                applyRepeat();
            }
        });

        addParam({
            param: {
                name: PREFIX + 'volume',
                type: 'select',
                values: {
                    '10': '10%',
                    '20': '20%',
                    '30': '30%',
                    '40': '40%',
                    '50': '50%',
                    '60': '60%',
                    '65': '65%',
                    '70': '70%',
                    '80': '80%',
                    '90': '90%',
                    '100': '100%'
                },
                default: String(
                    DEFAULTS.volume
                )
            },
            field: {
                name: 'Гучність',
                description:
                    'Гучність фонового саундтреку'
            },
            onChange: function (value) {
                setSetting(
                    'volume',
                    Number(value)
                );

                applyVolume();
            }
        });

        addParam({
            param: {
                name: PREFIX + 'delay',
                type: 'select',
                values: {
                    '0': 'Без затримки',
                    '1000': '1 секунда',
                    '2000': '2 секунди',
                    '3000': '3 секунди',
                    '4000': '4 секунди',
                    '5000': '5 секунд'
                },
                default: String(
                    DEFAULTS.delay
                )
            },
            field: {
                name: 'Затримка запуску',
                description:
                    'Затримка перед пошуком музики'
            },
            onChange: function (value) {
                setSetting(
                    'delay',
                    Number(value)
                );
            }
        });

        addParam({
            param: {
                name: PREFIX + 'debug',
                type: 'trigger',
                default: DEFAULTS.debug
            },
            field: {
                name: 'Режим діагностики',
                description:
                    'Детальні повідомлення в консолі Lampa'
            },
            onChange: function (value) {
                setSetting(
                    'debug',
                    value
                );
            }
        });
    }

    function init() {
        if (state.initialized) {
            return;
        }

        if (
            !window.Lampa ||
            !Lampa.Listener ||
            typeof Lampa.Listener.follow !==
                'function'
        ) {
            setTimeout(
                init,
                500
            );

            return;
        }

        state.initialized = true;

        registerSettings();

        Lampa.Listener.follow(
            'full',
            handleFullEvent
        );

        Lampa.Listener.follow(
            'activity',
            handleActivityEvent
        );

        startNavigationMonitor();

        window.addEventListener(
            'pagehide',
            function () {
                stopPlayback(
                    'pagehide'
                );
            }
        );

        window.addEventListener(
            'beforeunload',
            function () {
                stopPlayback(
                    'beforeunload'
                );
            }
        );

        log(
            'Initialized',
            VERSION
        );
    }

    init();

})();
