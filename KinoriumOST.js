
(function () {
    'use strict';

    /*
     * KINORIUM OST 1.1.0
     * Automatic Search Edition
     *
     * Lampa / Android TV / Mobile
     *
     * Cloudflare Worker 1.5.0
     *
     * FEATURES:
     * - Automatic movie title detection
     * - Automatic release year detection
     * - Kinorium movie search
     * - Featured soundtrack playback
     * - Apple AudioPreview support
     * - Automatic looping
     * - Delayed playback
     * - Stop on movie card exit
     * - Volume control
     * - Independent settings
     * - Request cancellation
     * - Protection against stale responses
     *
     * Independent from the production
     * Original Soundtrack plugin.
     */

    var VERSION = '1.1.0';

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

    var audio = null;
    var timer = null;
    var request = null;

    var currentMovieKey = '';
    var currentTrack = null;

    var requestToken = 0;
    var initialized = false;

    var playbackBlocked = false;

    function log() {
        if (!getSetting('debug')) return;

        var args = Array.prototype.slice.call(
            arguments
        );

        args.unshift('[Kinorium OST]');

        console.log.apply(console, args);
    }

    function getSetting(key) {
        var storageKey = PREFIX + key;

        var fallback = DEFAULTS[key];

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                return Lampa.Storage.get(
                    storageKey,
                    fallback
                );
            }
        } catch (e) {}

        try {
            var value = localStorage.getItem(
                storageKey
            );

            if (value === null) {
                return fallback;
            }

            return JSON.parse(value);
        } catch (e) {
            return fallback;
        }
    }

    function setSetting(key, value) {
        var storageKey = PREFIX + key;

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.set === 'function'
            ) {
                Lampa.Storage.set(
                    storageKey,
                    value
                );

                return;
            }
        } catch (e) {}

        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(value)
            );
        } catch (e) {}
    }

    function getVolume() {
        var value = Number(
            getSetting('volume')
        );

        if (!isFinite(value)) {
            value = DEFAULTS.volume;
        }

        return Math.max(
            0,
            Math.min(100, value)
        ) / 100;
    }

    function getDelay() {
        var value = Number(
            getSetting('delay')
        );

        if (!isFinite(value)) {
            value = DEFAULTS.delay;
        }

        return Math.max(
            0,
            Math.min(10000, value)
        );
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    function extractYear(value) {
        if (
            value === undefined ||
            value === null
        ) {
            return 0;
        }

        var match = String(value).match(
            /\b(18|19|20)\d{2}\b/
        );

        return match
            ? Number(match[0])
            : 0;
    }

    function movieFromData(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }

        var movie = data;

        if (
            data.movie &&
            typeof data.movie === 'object'
        ) {
            movie = data.movie;
        }

        if (
            data.card &&
            typeof data.card === 'object'
        ) {
            movie = data.card;
        }

        if (
            data.data &&
            typeof data.data === 'object'
        ) {
            movie = data.data;
        }

        if (
            movie.movie &&
            typeof movie.movie === 'object'
        ) {
            movie = movie.movie;
        }

        if (
            movie.card &&
            typeof movie.card === 'object'
        ) {
            movie = movie.card;
        }

        if (!movie || typeof movie !== 'object') {
            return null;
        }

        /*
         * TMDB commonly provides:
         *
         * original_title
         * title
         * release_date
         *
         * We prefer the original title because
         * Kinorium search supports English
         * original movie titles.
         */

        var title = String(
            movie.original_title ||
            movie.title ||
            movie.name ||
            movie.original_name ||
            ''
        ).trim();

        var year = extractYear(
            movie.release_date ||
            movie.first_air_date ||
            movie.year ||
            movie.release_year ||
            ''
        );

        var type = String(
            movie.media_type ||
            movie.type ||
            ''
        ).toLowerCase();

        var tmdbId = String(
            movie.id ||
            movie.tmdb_id ||
            ''
        );

        if (!title) {
            return null;
        }

        return {
            title: title,
            year: year,
            type: type,
            tmdbId: tmdbId
        };
    }

    function getMovieKey(movie) {
        return [
            normalize(movie.title),
            movie.year || 0,
            movie.tmdbId || ''
        ].join('|');
    }

    function isSeries(movie) {
        if (!movie) return false;

        var type = String(
            movie.type || ''
        ).toLowerCase();

        return (
            type === 'tv' ||
            type === 'series' ||
            type === 'serial'
        );
    }

    function clearTimer() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function abortRequest() {
        if (request) {
            try {
                request.abort();
            } catch (e) {}

            request = null;
        }
    }

    function destroyAudio() {
        if (!audio) return;

        try {
            audio.pause();
            audio.loop = false;
            audio.removeAttribute('src');
            audio.load();
        } catch (e) {}

        audio = null;
    }

    function stopPlayback() {
        requestToken++;

        clearTimer();
        abortRequest();
        destroyAudio();

        currentTrack = null;
        currentMovieKey = '';

        playbackBlocked = false;

        log('Playback stopped');
    }

    function createAudio() {
        if (audio) {
            return audio;
        }

        audio = new Audio();

        audio.preload = 'auto';

        audio.volume = getVolume();

        audio.loop = Boolean(
            getSetting('repeat')
        );

        audio.addEventListener(
            'error',
            function () {
                log(
                    'Audio playback error',
                    audio && audio.error
                );
            }
        );

        return audio;
    }

    function playAudio(url, track, token) {
        if (token !== requestToken) {
            return;
        }

        if (!url) {
            log('Audio URL missing');
            return;
        }

        destroyAudio();

        currentTrack = track || null;

        var player = createAudio();

        player.volume = getVolume();

        player.loop = Boolean(
            getSetting('repeat')
        );

        player.src = url;

        try {
            player.load();
        } catch (e) {}

        var promise;

        try {
            promise = player.play();
        } catch (error) {
            log('Playback exception', error);
            return;
        }

        if (
            promise &&
            typeof promise.catch === 'function'
        ) {
            promise.catch(function (error) {
                if (token !== requestToken) {
                    return;
                }

                playbackBlocked = true;

                log(
                    'Autoplay blocked or failed',
                    error
                );
            });
        }

        log(
            'Playing:',
            track ? track.name : '',
            url
        );
    }

    function buildWorkerURL(movie) {
        var url = WORKER +
            '?title=' +
            encodeURIComponent(movie.title);

        if (movie.year) {
            url +=
                '&year=' +
                encodeURIComponent(
                    movie.year
                );
        }

        if (getSetting('debug')) {
            url += '&debug=1';
        }

        return url;
    }

    function fetchSoundtrack(movie, token) {
        if (token !== requestToken) {
            return;
        }

        if (!getSetting('enabled')) {
            return;
        }

        var url = buildWorkerURL(movie);

        log(
            'Searching:',
            movie.title,
            movie.year,
            url
        );

        abortRequest();

        var xhr = new XMLHttpRequest();

        request = xhr;

        xhr.open(
            'GET',
            url,
            true
        );

        xhr.timeout = 20000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (request === xhr) {
                request = null;
            }

            if (token !== requestToken) {
                return;
            }

            if (
                xhr.status < 200 ||
                xhr.status >= 300
            ) {
                log(
                    'Worker HTTP error:',
                    xhr.status
                );

                return;
            }

            var result;

            try {
                result = JSON.parse(
                    xhr.responseText
                );
            } catch (error) {
                log(
                    'Invalid Worker JSON',
                    error
                );

                return;
            }

            log('Worker result:', result);

            if (
                !result ||
                !result.success ||
                !result.found ||
                !result.playable ||
                !result.audioUrl
            ) {
                log(
                    'No playable soundtrack',
                    result && result.reason
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
            if (token !== requestToken) {
                return;
            }

            log('Network error');
        };

        xhr.ontimeout = function () {
            if (token !== requestToken) {
                return;
            }

            log('Worker timeout');
        };

        try {
            xhr.send();
        } catch (error) {
            log(
                'Request exception',
                error
            );
        }
    }

    function schedulePlayback(movie) {
        if (!movie || !movie.title) {
            return;
        }

        if (!getSetting('enabled')) {
            return;
        }

        if (!getSetting('autoplay')) {
            return;
        }

        if (isSeries(movie)) {
            log(
                'TV series skipped:',
                movie.title
            );

            return;
        }

        /*
         * Year is required to avoid
         * confusing remakes with originals.
         */

        if (!movie.year) {
            log(
                'Release year missing:',
                movie.title
            );

            return;
        }

        var key = getMovieKey(movie);

        if (
            key === currentMovieKey &&
            (
                timer ||
                request ||
                audio
            )
        ) {
            return;
        }

        stopPlayback();

        currentMovieKey = key;

        var token = requestToken;

        log(
            'Movie detected:',
            movie.title,
            movie.year
        );

        timer = setTimeout(
            function () {
                timer = null;

                if (
                    token !== requestToken ||
                    currentMovieKey !== key
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

    function handleFullEvent(event) {
        if (!event) return;

        var type = String(
            event.type ||
            event.action ||
            ''
        ).toLowerCase();

        log('Full event:', type);

        /*
         * Lampa emits different event
         * names depending on the build.
         */

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
                schedulePlayback(movie);
            }

            return;
        }

        if (
            type === 'destroy' ||
            type === 'close' ||
            type === 'stop' ||
            type === 'back'
        ) {
            stopPlayback();
        }
    }

    function applyVolume() {
        if (audio) {
            audio.volume = getVolume();
        }
    }

    function applyRepeat() {
        if (audio) {
            audio.loop = Boolean(
                getSetting('repeat')
            );
        }
    }

    function registerSettings() {
        if (
            !window.Lampa ||
            !Lampa.SettingsApi ||
            typeof Lampa.SettingsApi.addParam !==
                'function'
        ) {
            log('SettingsApi unavailable');
            return;
        }

        try {
            Lampa.SettingsApi.addComponent({
                component: 'kinorium_ost',
                name: 'Kinorium OST',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
            });
        } catch (e) {
            log('Settings component:', e);
        }

        function addParam(param) {
            try {
                Lampa.SettingsApi.addParam({
                    component: 'kinorium_ost',
                    ...param
                });
            } catch (e) {
                log(
                    'Settings parameter error:',
                    param.name,
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
                    'Незалежне тестове джерело саундтреків'
            },
            onChange: function (value) {
                setSetting(
                    'enabled',
                    value
                );

                if (!value) {
                    stopPlayback();
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
                    'Запускати саундтрек під час відкриття картки фільму'
            },
            onChange: function (value) {
                setSetting(
                    'autoplay',
                    value
                );

                if (!value) {
                    stopPlayback();
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
                    'Автоматичний повтор аудіофрагмента'
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
                    'Час перед пошуком і запуском музики'
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
                    'Детальна інформація в консолі Lampa'
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
        if (initialized) {
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

        initialized = true;

        registerSettings();

        Lampa.Listener.follow(
            'full',
            handleFullEvent
        );

        /*
         * Additional protection when
         * the browser page is unloaded.
         */

        window.addEventListener(
            'pagehide',
            stopPlayback
        );

        log(
            'Kinorium OST initialized',
            VERSION
        );
    }

    init();

})();
