
(function () {
    'use strict';

    /*
     * KINORIUM OST 1.2.0
     * Smooth Audio Edition
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 1.5.0
     *
     * - Automatic movie search
     * - TV series support
     * - Immediate Worker request
     * - Minimum playback delay
     * - Smooth fade-in
     * - Adjustable fade duration
     * - Adjustable volume
     * - Automatic repeat
     * - Navigation monitoring
     * - Immediate stop on card exit
     * - Stale request protection
     * - Diagnostic logging
     *
     * Independent test plugin.
     */

    var VERSION = '1.2.0';

    var WORKER =
        'https://kinorium-ost.unclezhenya24.workers.dev/';

    var PREFIX = 'kinorium_ost_';

    var DEFAULTS = {
        enabled: true,
        autoplay: true,
        series: true,
        repeat: true,
        volume: 65,
        delay: 2000,
        fade: true,
        fadeDuration: 3000,
        debug: false
    };

    var state = {
        initialized: false,
        audio: null,
        request: null,
        startTimer: null,
        fadeTimer: null,
        navigationTimer: null,

        movie: null,
        movieKey: '',
        track: null,

        token: 0,
        cardActive: false,
        openedAt: 0,
        navigationGraceUntil: 0,
        lastActivity: '',

        readyResult: null,
        playbackStarted: false
    };

    function storageGet(key) {
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

    function storageSet(key, value) {
        var name = PREFIX + key;

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.set === 'function'
            ) {
                Lampa.Storage.set(name, value);
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

    function setting(key) {
        var value = storageGet(key);

        if (
            key === 'enabled' ||
            key === 'autoplay' ||
            key === 'series' ||
            key === 'repeat' ||
            key === 'fade' ||
            key === 'debug'
        ) {
            return (
                value === true ||
                value === 1 ||
                value === '1' ||
                value === 'true'
            );
        }

        return value;
    }

    function log() {
        if (!setting('debug')) return;

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

    function numberSetting(
        key,
        minimum,
        maximum
    ) {
        var value = Number(setting(key));

        if (!isFinite(value)) {
            value = DEFAULTS[key];
        }

        return clamp(
            value,
            minimum,
            maximum
        );
    }

    function targetVolume() {
        return numberSetting(
            'volume',
            0,
            100
        ) / 100;
    }

    function delayMs() {
        return numberSetting(
            'delay',
            0,
            10000
        );
    }

    function fadeMs() {
        return numberSetting(
            'fadeDuration',
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

        var type = String(
            movie.media_type ||
            movie.type ||
            ''
        ).toLowerCase();

        var series = (
            type === 'tv' ||
            type === 'series' ||
            type === 'serial' ||
            (
                !movie.release_date &&
                !!movie.first_air_date
            )
        );

        var title = String(
            series
                ? (
                    movie.original_name ||
                    movie.name ||
                    movie.original_title ||
                    movie.title ||
                    ''
                )
                : (
                    movie.original_title ||
                    movie.title ||
                    movie.original_name ||
                    movie.name ||
                    ''
                )
        ).trim();

        var year = extractYear(
            series
                ? (
                    movie.first_air_date ||
                    movie.release_date ||
                    movie.year
                )
                : (
                    movie.release_date ||
                    movie.first_air_date ||
                    movie.year
                )
        );

        if (!title) {
            return null;
        }

        return {
            title: title,
            year: year,
            series: series,
            tmdbId: String(
                movie.id ||
                movie.tmdb_id ||
                ''
            )
        };
    }

    function getMovieKey(movie) {
        return [
            normalize(movie.title),
            movie.year,
            movie.series ? 'tv' : 'movie',
            movie.tmdbId
        ].join('|');
    }

    /*
     * ACTIVITY MONITORING
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

            var active = Lampa.Activity.active();

            if (!active) return '';

            if (typeof active === 'string') {
                return active.toLowerCase();
            }

            var fields = [
                active.component,
                active.type,
                active.name,
                active.activity
            ];

            for (
                var i = 0;
                i < fields.length;
                i++
            ) {
                if (
                    typeof fields[i] === 'string' &&
                    fields[i]
                ) {
                    return fields[i]
                        .toLowerCase();
                }
            }
        } catch (e) {
            log('Activity error:', e);
        }

        return '';
    }

    function isNonFullActivity(value) {
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
            'history',
            'timetable',
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

    function clearStartTimer() {
        if (state.startTimer) {
            clearTimeout(
                state.startTimer
            );

            state.startTimer = null;
        }
    }

    function clearFadeTimer() {
        if (state.fadeTimer) {
            clearInterval(
                state.fadeTimer
            );

            state.fadeTimer = null;
        }
    }

    function abortRequest() {
        var xhr = state.request;

        state.request = null;

        if (!xhr) return;

        try {
            xhr.abort();
        } catch (e) {}
    }

    function destroyAudio() {
        clearFadeTimer();

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
            state.cardActive ||
            state.audio ||
            state.request ||
            state.startTimer
        );

        state.token++;

        clearStartTimer();
        abortRequest();
        destroyAudio();

        state.movie = null;
        state.movieKey = '';
        state.track = null;

        state.cardActive = false;
        state.openedAt = 0;
        state.navigationGraceUntil = 0;

        state.readyResult = null;
        state.playbackStarted = false;

        if (wasActive) {
            log(
                'Stopped:',
                reason || 'unknown'
            );
        }
    }

    /*
     * SMOOTH FADE-IN
     *
     * The audio starts at zero volume.
     * Volume increases only after
     * playback has actually started.
     */

    function startFade(player, token) {
        clearFadeTimer();

        if (
            !setting('fade') ||
            fadeMs() <= 0
        ) {
            player.volume = targetVolume();
            return;
        }

        var duration = fadeMs();

        var startedAt = Date.now();

        player.volume = 0;

        state.fadeTimer = setInterval(
            function () {
                if (
                    token !== state.token ||
                    !state.cardActive ||
                    state.audio !== player
                ) {
                    clearFadeTimer();
                    return;
                }

                if (player.paused) {
                    return;
                }

                var elapsed =
                    Date.now() - startedAt;

                var progress = clamp(
                    elapsed / duration,
                    0,
                    1
                );

                /*
                 * Smoothstep easing:
                 * gentle beginning and end.
                 */

                var eased =
                    progress *
                    progress *
                    (3 - 2 * progress);

                player.volume =
                    targetVolume() * eased;

                if (progress >= 1) {
                    player.volume =
                        targetVolume();

                    clearFadeTimer();
                }
            },
            50
        );
    }

    function createAudio() {
        var player = new Audio();

        player.preload = 'auto';

        player.loop = setting('repeat');

        player.volume = setting('fade')
            ? 0
            : targetVolume();

        player.addEventListener(
            'error',
            function () {
                log(
                    'Audio error:',
                    player.error
                );
            }
        );

        state.audio = player;

        return player;
    }

    function playAudio(result, token) {
        if (
            token !== state.token ||
            !state.cardActive ||
            state.playbackStarted
        ) {
            return;
        }

        var activity = getActiveActivity();

        if (isNonFullActivity(activity)) {
            stopPlayback(
                'navigation_before_play'
            );

            return;
        }

        if (
            !result ||
            !result.audioUrl
        ) {
            return;
        }

        state.playbackStarted = true;

        destroyAudio();

        state.track = result.track || null;

        var player = createAudio();

        player.src = result.audioUrl;

        var promise;

        try {
            player.load();

            promise = player.play();
        } catch (e) {
            log('Play exception:', e);
            return;
        }

        function onStarted() {
            if (
                token !== state.token ||
                state.audio !== player
            ) {
                return;
            }

            startFade(
                player,
                token
            );

            log(
                'Playing:',
                state.track
                    ? state.track.name
                    : 'Unknown'
            );
        }

        if (
            promise &&
            typeof promise.then === 'function'
        ) {
            promise.then(
                onStarted
            ).catch(
                function (error) {
                    if (
                        token !== state.token
                    ) {
                        return;
                    }

                    log(
                        'Autoplay failed:',
                        error
                    );

                    state.playbackStarted = false;
                }
            );
        } else {
            /*
             * Compatibility fallback for
             * older Android WebViews.
             */

            if (!player.paused) {
                onStarted();
            } else {
                player.addEventListener(
                    'playing',
                    onStarted,
                    { once: true }
                );
            }
        }
    }

    /*
     * START SCHEDULER
     *
     * Network request begins immediately.
     *
     * Playback begins when BOTH conditions
     * are satisfied:
     *
     * 1. Worker response is ready.
     * 2. Minimum delay has elapsed.
     */

    function tryStart(token) {
        if (
            token !== state.token ||
            !state.cardActive ||
            state.playbackStarted ||
            !state.readyResult
        ) {
            return;
        }

        var elapsed =
            Date.now() - state.openedAt;

        var remaining =
            delayMs() - elapsed;

        if (remaining > 0) {
            clearStartTimer();

            state.startTimer = setTimeout(
                function () {
                    state.startTimer = null;

                    tryStart(token);
                },
                remaining
            );

            return;
        }

        playAudio(
            state.readyResult,
            token
        );
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

        if (setting('debug')) {
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

        var url = buildWorkerURL(movie);

        log(
            'Worker request:',
            movie.title,
            movie.year,
            movie.series ? 'TV' : 'Movie'
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

                if (state.request === xhr) {
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
                        'Invalid Worker JSON:',
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
                        'No playable soundtrack:',
                        movie.title,
                        result
                            ? result.reason
                            : 'empty_response',
                        result &&
                            result.search
                            ? result.search.method
                            : ''
                    );

                    return;
                }

                state.readyResult = result;

                log(
                    'Soundtrack ready:',
                    result.track
                        ? result.track.name
                        : '',
                    'Search:',
                    result.search
                        ? result.search.method
                        : ''
                );

                tryStart(token);
            };

        xhr.onerror = function () {
            if (token === state.token) {
                log('Network error');
            }
        };

        xhr.ontimeout = function () {
            if (token === state.token) {
                log('Worker timeout');
            }
        };

        try {
            xhr.send();
        } catch (e) {
            log(
                'XHR exception:',
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
            !setting('enabled') ||
            !setting('autoplay')
        ) {
            return;
        }

        if (
            movie.series &&
            !setting('series')
        ) {
            log(
                'Series disabled:',
                movie.title
            );

            return;
        }

        var key = getMovieKey(movie);

        if (
            state.cardActive &&
            state.movieKey === key
        ) {
            return;
        }

        stopPlayback('new_movie');

        state.movie = movie;
        state.movieKey = key;
        state.cardActive = true;

        state.openedAt = Date.now();

        state.navigationGraceUntil =
            Date.now() + 1200;

        state.readyResult = null;
        state.playbackStarted = false;

        var token = state.token;

        log(
            'Card opened:',
            movie.title,
            movie.year
        );

        /*
         * The request starts immediately.
         * No two-second network delay.
         */

        fetchSoundtrack(
            movie,
            token
        );
    }

    /*
     * NAVIGATION PROTECTION
     */

    function monitorNavigation() {
        if (!state.cardActive) {
            return;
        }

        var activity = getActiveActivity();

        if (!activity) return;

        if (
            activity !== state.lastActivity
        ) {
            log(
                'Activity:',
                state.lastActivity,
                '->',
                activity
            );

            state.lastActivity = activity;
        }

        if (
            Date.now() <
            state.navigationGraceUntil
        ) {
            return;
        }

        if (isNonFullActivity(activity)) {
            stopPlayback(
                'activity_changed_to_' +
                activity
            );
        }
    }

    function handleActivityEvent(event) {
        if (!state.cardActive) {
            return;
        }

        var activity = getActiveActivity();

        if (isNonFullActivity(activity)) {
            stopPlayback(
                'activity_event_' +
                activity
            );
        }
    }

    function handleFullEvent(event) {
        if (!event) return;

        var type = String(
            event.type ||
            event.action ||
            ''
        ).toLowerCase();

        log('Full event:', type);

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
            stopPlayback(
                'full_event_' + type
            );
        }
    }

    function applyVolume() {
        if (!state.audio) return;

        /*
         * Do not interrupt an active
         * fade-in with an abrupt jump.
         */

        if (!state.fadeTimer) {
            state.audio.volume =
                targetVolume();
        }
    }

    function applyRepeat() {
        if (state.audio) {
            state.audio.loop =
                setting('repeat');
        }
    }

    function applyFadeSetting() {
        if (!state.audio) return;

        clearFadeTimer();

        state.audio.volume =
            targetVolume();
    }

    /*
     * SETTINGS
     */

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
                    param: param.param,
                    field: param.field,
                    onChange: param.onChange
                });
            } catch (e) {
                log(
                    'Settings error:',
                    param.param.name,
                    e
                );
            }
        }

        function changedValue(value) {
            if (
                value &&
                typeof value === 'object' &&
                Object.prototype.hasOwnProperty.call(
                    value,
                    'value'
                )
            ) {
                return value.value;
            }

            return value;
        }

        function addTrigger(
            key,
            title,
            description,
            callback
        ) {
            addParam({
                param: {
                    name: PREFIX + key,
                    type: 'trigger',
                    default: DEFAULTS[key]
                },
                field: {
                    name: title,
                    description: description
                },
                onChange: function (value) {
                    var next = changedValue(value);

                    var enabled = (
                        next === true ||
                        next === 1 ||
                        next === '1' ||
                        next === 'true'
                    );

                    storageSet(
                        key,
                        enabled
                    );

                    if (callback) {
                        callback(enabled);
                    }
                }
            });
        }

        function addSelect(
            key,
            title,
            description,
            values,
            callback
        ) {
            addParam({
                param: {
                    name: PREFIX + key,
                    type: 'select',
                    values: values,
                    default: String(
                        DEFAULTS[key]
                    )
                },
                field: {
                    name: title,
                    description: description
                },
                onChange: function (value) {
                    var next = Number(
                        changedValue(value)
                    );

                    if (!isFinite(next)) {
                        return;
                    }

                    storageSet(
                        key,
                        next
                    );

                    if (callback) {
                        callback(next);
                    }
                }
            });
        }

        addTrigger(
            'enabled',
            'Увімкнути Kinorium OST',
            'Незалежне джерело саундтреків',
            function (enabled) {
                if (!enabled) {
                    stopPlayback('disabled');
                }
            }
        );

        addTrigger(
            'autoplay',
            'Автоматичне відтворення',
            'Запускати музику під час відкриття картки',
            function (enabled) {
                if (!enabled) {
                    stopPlayback(
                        'autoplay_disabled'
                    );
                }
            }
        );

        addTrigger(
            'series',
            'Саундтреки серіалів',
            'Шукати музику також для серіалів',
            function (enabled) {
                if (
                    !enabled &&
                    state.movie &&
                    state.movie.series
                ) {
                    stopPlayback(
                        'series_disabled'
                    );
                }
            }
        );

        addTrigger(
            'repeat',
            'Повторювати композицію',
            'Безперервний повтор аудіофрагмента',
            applyRepeat
        );

        addSelect(
            'volume',
            'Гучність',
            'Максимальна гучність фонового аудіо',
            {
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
            applyVolume
        );

        addSelect(
            'delay',
            'Мінімальна затримка',
            'Час від відкриття картки до можливого запуску музики',
            {
                '0': 'Без затримки',
                '500': '0,5 секунди',
                '1000': '1 секунда',
                '1500': '1,5 секунди',
                '2000': '2 секунди',
                '3000': '3 секунди',
                '4000': '4 секунди',
                '5000': '5 секунд'
            },
            function () {
                if (
                    state.cardActive &&
                    state.readyResult &&
                    !state.playbackStarted
                ) {
                    tryStart(state.token);
                }
            }
        );

        addTrigger(
            'fade',
            'Плавне наростання звуку',
            'Поступово збільшувати гучність після запуску',
            applyFadeSetting
        );

        addSelect(
            'fadeDuration',
            'Тривалість наростання',
            'Час досягнення встановленої гучності',
            {
                '500': '0,5 секунди',
                '1000': '1 секунда',
                '1500': '1,5 секунди',
                '2000': '2 секунди',
                '3000': '3 секунди',
                '4000': '4 секунди',
                '5000': '5 секунд'
            }
        );

        addTrigger(
            'debug',
            'Режим діагностики',
            'Показувати пошук, помилки й причини відсутності аудіо'
        );
    }

    /*
     * INITIALIZATION
     */

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
            setTimeout(init, 500);
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

        state.navigationTimer =
            setInterval(
                monitorNavigation,
                250
            );

        window.addEventListener(
            'pagehide',
            function () {
                stopPlayback('pagehide');
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

        console.log(
            '[Kinorium OST] ' +
            VERSION +
            ' initialized'
        );
    }

    init();

})();
