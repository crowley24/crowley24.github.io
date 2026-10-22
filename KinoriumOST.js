(function () {
    'use strict';

    /*
     * KINORIUM OST 1.4.0
     * Premium Diagnostics
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 1.5.1+
     *
     * FEATURES:
     * - Automatic movie and series soundtrack search
     * - Missing-year support
     * - Immediate Worker request
     * - Minimum playback delay
     * - Smooth fade-in
     * - Live volume adjustment
     * - Adjustable fade duration
     * - Automatic repeat
     * - Controlled playback retry
     * - Audio startup timeout
     * - Navigation grace period
     * - Immediate stop on card exit
     * - Stale request protection
     * - Safe timer and event cleanup
     * - On-screen diagnostic notifications
     * - Track title and playback status
     * - Human-readable error messages
     *
     * Independent test plugin.
     */

    var VERSION = '1.4.0';

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

    var MAX_PLAY_RETRIES = 1;
    var RETRY_DELAY = 700;
    var PLAY_START_TIMEOUT = 12000;
    var NOTICE_DURATION = 3500;

    var state = {
        initialized: false,

        audio: null,
        request: null,

        startTimer: null,
        fadeTimer: null,
        navigationTimer: null,
        retryTimer: null,
        playTimeoutTimer: null,

        movie: null,
        movieKey: '',
        track: null,

        token: 0,

        cardActive: false,
        openedAt: 0,
        navigationGraceUntil: 0,
        lastActivity: '',

        readyResult: null,

        playbackStarted: false,
        playbackState: 'idle',

        playAttempt: 0,
        audioGeneration: 0,

        fadeStartedAt: 0,
        fadeStartVolume: 0,
        fadeTargetVolume: 0,
        fadeDurationMs: 0,

        notice: null,
        noticeTimer: null,
        noticeToken: 0
    };

    /*
     * STORAGE
     */

    function storageGet(key) {
        var name = PREFIX + key;
        var fallback = DEFAULTS[key];

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                var value = Lampa.Storage.get(name, fallback);

                return value === undefined || value === null
                    ? fallback
                    : value;
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

        var args = Array.prototype.slice.call(arguments);

        args.unshift('[Kinorium OST ' + VERSION + ']');

        console.log.apply(console, args);
    }

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function numberSetting(key, minimum, maximum) {
        var value = Number(setting(key));

        if (!isFinite(value)) {
            value = DEFAULTS[key];
        }

        return clamp(value, minimum, maximum);
    }

    function targetVolume() {
        return numberSetting('volume', 0, 100) / 100;
    }

    function delayMs() {
        return numberSetting('delay', 0, 10000);
    }

    function fadeMs() {
        return numberSetting('fadeDuration', 0, 10000);
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
    }

    function extractYear(value) {
        var match = String(value || '').match(
            /\b(?:18|19|20)\d{2}\b/
        );

        return match ? Number(match[0]) : 0;
    }

    /*
     * ON-SCREEN DIAGNOSTICS
     *
     * Notifications are displayed only when debug is enabled.
     * The panel is created once and reused.
     * All displayed text is inserted using textContent.
     */

    function removeNotice() {
        state.noticeToken++;

        if (state.noticeTimer !== null) {
            clearTimeout(state.noticeTimer);
            state.noticeTimer = null;
        }

        if (state.notice) {
            try {
                state.notice.remove();
            } catch (e) {
                if (
                    state.notice.parentNode
                ) {
                    state.notice.parentNode.removeChild(
                        state.notice
                    );
                }
            }

            state.notice = null;
        }
    }

    function noticeStyle(element, styles) {
        Object.keys(styles).forEach(function (key) {
            element.style[key] = styles[key];
        });
    }

    function showNotice(title, message, type, duration) {
        if (!setting('debug')) {
            removeNotice();
            return;
        }

        if (!state.cardActive) return;

        if (!document.body) return;

        removeNotice();

        var noticeToken = state.noticeToken;

        var colors = {
            info: '#8ab4f8',
            success: '#81c995',
            warning: '#fdd663',
            error: '#f28b82'
        };

        var icons = {
            info: '\u25cf',
            success: '\u266b',
            warning: '\u26a0',
            error: '\u2715'
        };

        var panel = document.createElement('div');

        panel.setAttribute(
            'data-kinorium-ost-notice',
            'true'
        );

        noticeStyle(panel, {
            position: 'fixed',
            top: 'max(18px, env(safe-area-inset-top))',
            right: 'max(18px, env(safe-area-inset-right))',
            zIndex: '2147483000',
            width: 'min(360px, calc(100vw - 36px))',
            boxSizing: 'border-box',
            padding: '13px 16px',
            borderRadius: '12px',
            background: 'rgba(20, 22, 27, 0.96)',
            border: '1px solid rgba(255,255,255,0.13)',
            borderLeft: '3px solid ' + (
                colors[type] || colors.info
            ),
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
            opacity: '0',
            transform: 'translateY(-8px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
            pointerEvents: 'none',
            overflow: 'hidden'
        });

        var header = document.createElement('div');

        noticeStyle(header, {
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            marginBottom: message ? '5px' : '0',
            fontWeight: '700',
            fontSize: '14px'
        });

        var icon = document.createElement('span');

        icon.textContent = icons[type] || icons.info;

        noticeStyle(icon, {
            flex: '0 0 auto',
            color: colors[type] || colors.info,
            fontSize: '16px'
        });

        var heading = document.createElement('span');

        heading.textContent = String(title || 'KINORIUM OST');

        noticeStyle(heading, {
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            overflowWrap: 'anywhere'
        });

        header.appendChild(icon);
        header.appendChild(heading);
        panel.appendChild(header);

        if (message) {
            var description = document.createElement('div');

            description.textContent = String(message);

            noticeStyle(description, {
                color: 'rgba(255,255,255,0.78)',
                fontSize: '13px',
                lineHeight: '1.4',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word'
            });

            panel.appendChild(description);
        }

        document.body.appendChild(panel);

        state.notice = panel;

        requestAnimationFrame(function () {
            if (
                state.notice !== panel ||
                state.noticeToken !== noticeToken
            ) {
                return;
            }

            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });

        var visibleFor = typeof duration === 'number'
            ? duration
            : NOTICE_DURATION;

        state.noticeTimer = setTimeout(
            function () {
                if (
                    state.notice !== panel ||
                    state.noticeToken !== noticeToken
                ) {
                    return;
                }

                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-8px)';

                setTimeout(function () {
                    if (state.notice === panel) {
                        removeNotice();
                    }
                }, 220);
            },
            Math.max(500, visibleFor)
        );
    }

    function diagnosticSearching() {
        showNotice(
            'Пошук саундтреку',
            state.movie
                ? state.movie.title
                : 'Шукаю доступне аудіо…',
            'info',
            2500
        );
    }

    function diagnosticPlaying(result) {
        var track = result && result.track
            ? result.track
            : state.track;

        var title = track && track.name
            ? String(track.name)
            : '';

        var artist = track && track.artist
            ? String(track.artist)
            : '';

        var message = title || (
            state.movie
                ? state.movie.title
                : 'Аудіо'
        );

        if (artist) {
            message += ' — ' + artist;
        }

        showNotice(
            'Музика відтворюється',
            message,
            'success',
            4000
        );
    }

    function diagnosticNotFound(result) {
        var message = 'Не вдалося знайти відповідний саундтрек.';

        if (result && result.reason) {
            var reason = String(result.reason).toLowerCase();

            if (
                reason.indexOf('audio') !== -1 ||
                reason.indexOf('playable') !== -1
            ) {
                message = 'Запис знайдено, але доступного аудіо немає.';
            } else if (
                reason.indexOf('network') !== -1
            ) {
                message = 'Не вдалося отримати відповідь через мережу.';
            }
        }

        if (
            result &&
            result.found &&
            (!result.playable || !result.audioUrl)
        ) {
            message = 'Запис знайдено, але доступного аудіо немає.';
        }

        showNotice(
            'Саундтрек недоступний',
            message,
            'warning'
        );
    }

    function diagnosticFailure(reason, errorCode) {
        var title = 'Помилка відтворення';
        var message = 'Не вдалося запустити аудіо.';

        switch (reason) {
            case 'media_error':
                title = 'Помилка аудіо';
                message = 'Медіаджерело повернуло помилку.';
                if (errorCode) {
                    message += ' Код: ' + errorCode + '.';
                }
                break;

            case 'startup_timeout':
                title = 'Аудіо не запустилося';
                message = 'Минув час очікування початку відтворення.';
                break;

            case 'worker_http':
                title = 'Помилка сервера';
                message = 'Worker повернув HTTP-помилку.';
                break;

            case 'worker_timeout':
                title = 'Сервер не відповідає';
                message = 'Перевищено час очікування відповіді Worker.';
                break;

            case 'network':
                title = 'Помилка мережі';
                message = 'Не вдалося з’єднатися з Worker.';
                break;

            case 'invalid_json':
                title = 'Помилка відповіді';
                message = 'Worker повернув відповідь невідомого формату.';
                break;

            case 'xhr_exception':
                title = 'Помилка запиту';
                message = 'Не вдалося відправити запит до Worker.';
                break;

            case 'play_exception':
                title = 'Помилка запуску';
                message = 'Під час запуску аудіо виникла помилка.';
                break;

            case 'blocked':
                title = 'Запуск заблоковано';
                message = 'Браузер або середовище Lampa заборонили автозапуск.';
                break;

            default:
                if (
                    String(reason || '').indexOf('play_rejected_') === 0
                ) {
                    title = 'Аудіо не запустилося';
                    message = 'Плеєр відхилив запит на відтворення.';
                }
                break;
        }

        showNotice(
            title,
            message,
            'error',
            4500
        );
    }

    /*
     * MOVIE DATA
     */

    function movieFromData(data) {
        if (!data || typeof data !== 'object') {
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

        if (!title) return null;

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
                typeof Lampa.Activity.active !== 'function'
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

            for (var i = 0; i < fields.length; i++) {
                if (
                    typeof fields[i] === 'string' &&
                    fields[i]
                ) {
                    return fields[i].toLowerCase();
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

        for (var i = 0; i < known.length; i++) {
            if (
                value === known[i] ||
                value.indexOf(known[i] + '/') === 0
            ) {
                return true;
            }
        }

        return false;
    }

    /*
     * TIMER MANAGEMENT
     */

    function clearStartTimer() {
        if (state.startTimer !== null) {
            clearTimeout(state.startTimer);
            state.startTimer = null;
        }
    }

    function clearFadeTimer() {
        if (state.fadeTimer !== null) {
            clearInterval(state.fadeTimer);
            state.fadeTimer = null;
        }
    }

    function clearRetryTimer() {
        if (state.retryTimer !== null) {
            clearTimeout(state.retryTimer);
            state.retryTimer = null;
        }
    }

    function clearPlayTimeout() {
        if (state.playTimeoutTimer !== null) {
            clearTimeout(state.playTimeoutTimer);
            state.playTimeoutTimer = null;
        }
    }

    function clearPlaybackTimers() {
        clearStartTimer();
        clearFadeTimer();
        clearRetryTimer();
        clearPlayTimeout();
    }

    /*
     * REQUEST MANAGEMENT
     */

    function abortRequest() {
        var xhr = state.request;

        state.request = null;

        if (!xhr) return;

        try {
            xhr.onreadystatechange = null;
            xhr.onerror = null;
            xhr.ontimeout = null;
            xhr.abort();
        } catch (e) {}
    }

    /*
     * AUDIO MANAGEMENT
     */

    function destroyAudio() {
        clearFadeTimer();
        clearPlayTimeout();

        state.audioGeneration++;

        var player = state.audio;

        state.audio = null;

        if (!player) return;

        try {
            player.onplaying = null;
            player.onplay = null;
            player.onpause = null;
            player.onended = null;
            player.onerror = null;
            player.onwaiting = null;
            player.onstalled = null;

            player.pause();
            player.loop = false;
            player.removeAttribute('src');
            player.load();
        } catch (e) {}
    }

    function setPlaybackState(nextState, details) {
        if (state.playbackState === nextState) return;

        var previous = state.playbackState;

        state.playbackState = nextState;

        log(
            'Playback state:',
            previous,
            '->',
            nextState,
            details || ''
        );
    }

    function stopPlayback(reason) {
        var wasActive = Boolean(
            state.cardActive ||
            state.audio ||
            state.request ||
            state.startTimer ||
            state.retryTimer ||
            state.playTimeoutTimer
        );

        state.token++;

        clearPlaybackTimers();
        abortRequest();
        destroyAudio();
        removeNotice();

        state.movie = null;
        state.movieKey = '';
        state.track = null;

        state.cardActive = false;
        state.openedAt = 0;
        state.navigationGraceUntil = 0;

        state.readyResult = null;

        state.playbackStarted = false;
        state.playbackState = 'idle';
        state.playAttempt = 0;

        state.fadeStartedAt = 0;
        state.fadeStartVolume = 0;
        state.fadeTargetVolume = 0;
        state.fadeDurationMs = 0;

        if (wasActive) {
            log('Stopped:', reason || 'unknown');
        }
    }

    /*
     * FADE ENGINE
     */

    function startFade(player, token, startVolume) {
        clearFadeTimer();

        if (
            token !== state.token ||
            state.audio !== player
        ) {
            return;
        }

        var target = targetVolume();
        var duration = fadeMs();

        if (!setting('fade') || duration <= 0) {
            player.volume = target;

            state.fadeStartedAt = 0;
            state.fadeDurationMs = 0;
            state.fadeStartVolume = target;
            state.fadeTargetVolume = target;

            return;
        }

        var initial = typeof startVolume === 'number'
            ? startVolume
            : player.volume;

        initial = clamp(initial, 0, 1);

        state.fadeStartedAt = Date.now();
        state.fadeStartVolume = initial;
        state.fadeTargetVolume = target;
        state.fadeDurationMs = duration;

        player.volume = initial;

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

                if (player.paused) return;

                var elapsed = Date.now() - state.fadeStartedAt;

                var progress = clamp(
                    elapsed / Math.max(1, state.fadeDurationMs),
                    0,
                    1
                );

                var eased =
                    progress *
                    progress *
                    (3 - 2 * progress);

                var volume =
                    state.fadeStartVolume +
                    (
                        state.fadeTargetVolume -
                        state.fadeStartVolume
                    ) * eased;

                player.volume = clamp(volume, 0, 1);

                if (progress >= 1) {
                    player.volume = state.fadeTargetVolume;

                    clearFadeTimer();

                    log(
                        'Fade completed:',
                        player.volume
                    );
                }
            },
            50
        );
    }

    function retargetFade() {
        var player = state.audio;

        if (!player) return;

        if (
            !state.playbackStarted ||
            player.paused
        ) {
            player.volume = setting('fade')
                ? 0
                : targetVolume();

            return;
        }

        var current = player.volume;

        startFade(
            player,
            state.token,
            current
        );
    }

    function createAudio(token) {
        var player = new Audio();

        player.preload = 'auto';
        player.loop = setting('repeat');
        player.volume = setting('fade')
            ? 0
            : targetVolume();

        var generation = ++state.audioGeneration;

        player.addEventListener(
            'error',
            function () {
                if (
                    token !== state.token ||
                    state.audio !== player ||
                    generation !== state.audioGeneration
                ) {
                    return;
                }

                clearPlayTimeout();

                var error = player.error;

                log(
                    'Audio playback error:',
                    error
                        ? {
                            code: error.code,
                            message: error.message
                        }
                        : 'unknown'
                );

                handleAudioFailure(
                    token,
                    player,
                    'media_error',
                    error ? error.code : 0
                );
            }
        );

        player.addEventListener(
            'waiting',
            function () {
                if (
                    token === state.token &&
                    state.audio === player
                ) {
                    log('Audio buffering');
                }
            }
        );

        player.addEventListener(
            'stalled',
            function () {
                if (
                    token === state.token &&
                    state.audio === player
                ) {
                    log('Audio stalled');
                }
            }
        );

        player.addEventListener(
            'ended',
            function () {
                if (
                    token !== state.token ||
                    state.audio !== player
                ) {
                    return;
                }

                log('Audio ended');

                if (setting('repeat')) {
                    try {
                        player.currentTime = 0;

                        var promise = player.play();

                        if (
                            promise &&
                            typeof promise.catch === 'function'
                        ) {
                            promise.catch(function (error) {
                                log(
                                    'Repeat failed:',
                                    error && error.name
                                        ? error.name
                                        : error
                                );
                            });
                        }
                    } catch (e) {
                        log('Repeat exception:', e);
                    }
                }
            }
        );

        state.audio = player;

        return player;
    }

    /*
     * PLAYBACK FAILURE HANDLING
     */

    function handleAudioFailure(token, player, reason, errorCode) {
        if (
            token !== state.token ||
            state.audio !== player ||
            !state.cardActive
        ) {
            return;
        }

        state.playbackStarted = false;

        clearFadeTimer();
        clearPlayTimeout();

        var retryable = (
            reason === 'media_error' &&
            state.playAttempt < MAX_PLAY_RETRIES &&
            state.readyResult &&
            !!state.readyResult.audioUrl
        );

        if (!retryable) {
            setPlaybackState('error', reason);

            log(
                'Playback failed permanently:',
                reason,
                'code:',
                errorCode || 0
            );

            diagnosticFailure(reason, errorCode);

            destroyAudio();

            return;
        }

        state.playAttempt++;

        setPlaybackState('retry_wait', reason);

        log(
            'Scheduling retry:',
            state.playAttempt,
            'of',
            MAX_PLAY_RETRIES
        );

        showNotice(
            'Повторна спроба',
            'Відновлюю відтворення аудіо…',
            'warning',
            1800
        );

        destroyAudio();

        clearRetryTimer();

        state.retryTimer = setTimeout(
            function () {
                state.retryTimer = null;

                if (
                    token !== state.token ||
                    !state.cardActive ||
                    !state.readyResult
                ) {
                    return;
                }

                log('Retrying audio playback');

                startAudioAttempt(
                    state.readyResult,
                    token
                );
            },
            RETRY_DELAY
        );
    }

    /*
     * AUDIO STARTUP
     */

    function onAudioStarted(player, token, attempt) {
        if (
            token !== state.token ||
            !state.cardActive ||
            state.audio !== player ||
            attempt !== state.playAttempt ||
            state.playbackStarted
        ) {
            return;
        }

        clearPlayTimeout();
        clearRetryTimer();

        state.playbackStarted = true;

        setPlaybackState('playing');

        if (setting('fade')) {
            startFade(player, token, player.volume);
        } else {
            clearFadeTimer();
            player.volume = targetVolume();
        }

        log(
            'Playing:',
            state.track
                ? state.track.name
                : 'Unknown'
        );

        diagnosticPlaying(state.readyResult);
    }

    function startAudioAttempt(result, token) {
        if (
            token !== state.token ||
            !state.cardActive ||
            !result ||
            !result.audioUrl
        ) {
            return;
        }

        clearRetryTimer();
        clearPlayTimeout();
        clearFadeTimer();

        destroyAudio();

        state.playbackStarted = false;

        setPlaybackState('starting');

        var player = createAudio(token);
        var attempt = state.playAttempt;

        var started = false;

        function onStarted() {
            if (started) return;

            started = true;

            onAudioStarted(
                player,
                token,
                attempt
            );
        }

        player.addEventListener(
            'playing',
            onStarted
        );

        player.addEventListener(
            'play',
            function () {
                if (
                    token === state.token &&
                    state.audio === player
                ) {
                    log('Audio play event');
                }
            }
        );

        player.src = result.audioUrl;

        log(
            'Starting audio:',
            state.track
                ? state.track.name
                : 'Unknown',
            'attempt:',
            attempt + 1,
            'URL:',
            result.audioUrl
        );

        state.playTimeoutTimer = setTimeout(
            function () {
                state.playTimeoutTimer = null;

                if (
                    token !== state.token ||
                    state.audio !== player ||
                    state.playbackStarted
                ) {
                    return;
                }

                log(
                    'Audio startup timeout:',
                    PLAY_START_TIMEOUT
                );

                handleAudioFailure(
                    token,
                    player,
                    'startup_timeout',
                    0
                );
            },
            PLAY_START_TIMEOUT
        );

        try {
            player.load();

            var promise = player.play();

            if (
                promise &&
                typeof promise.then === 'function'
            ) {
                promise.then(function () {
                    if (
                        token === state.token &&
                        state.audio === player &&
                        !player.paused
                    ) {
                        onStarted();
                    }
                }).catch(function (error) {
                    if (
                        token !== state.token ||
                        state.audio !== player
                    ) {
                        return;
                    }

                    clearPlayTimeout();

                    state.playbackStarted = false;

                    var name = error && error.name
                        ? error.name
                        : 'UnknownError';

                    var message = error && error.message
                        ? error.message
                        : '';

                    log(
                        'Audio play rejected:',
                        name,
                        message
                    );

                    if (
                        name === 'NotAllowedError' ||
                        name === 'SecurityError'
                    ) {
                        setPlaybackState(
                            'blocked',
                            name
                        );

                        log(
                            'Playback blocked by browser autoplay policy'
                        );

                        diagnosticFailure('blocked', 0);

                        destroyAudio();

                        return;
                    }

                    if (
                        name === 'AbortError' &&
                        token !== state.token
                    ) {
                        return;
                    }

                    handleAudioFailure(
                        token,
                        player,
                        'play_rejected_' + name,
                        0
                    );
                });
            } else if (!player.paused) {
                onStarted();
            }
        } catch (e) {
            clearPlayTimeout();

            state.playbackStarted = false;

            log(
                'Play exception:',
                e && e.name
                    ? e.name
                    : '',
                e && e.message
                    ? e.message
                    : e
            );

            handleAudioFailure(
                token,
                player,
                'play_exception',
                0
            );
        }
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

        if (
            isNonFullActivity(activity) &&
            Date.now() >= state.navigationGraceUntil
        ) {
            stopPlayback('navigation_before_play');
            return;
        }

        if (!result || !result.audioUrl) {
            setPlaybackState('error', 'missing_audio_url');

            log('Cannot play: audioUrl is missing');

            diagnosticNotFound(result);

            return;
        }

        state.track = result.track || null;
        state.playAttempt = 0;

        startAudioAttempt(result, token);
    }

    /*
     * START SCHEDULER
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

        if (
            state.playbackState === 'starting' ||
            state.playbackState === 'retry_wait' ||
            state.playbackState === 'blocked' ||
            state.playbackState === 'error'
        ) {
            return;
        }

        var elapsed = Date.now() - state.openedAt;
        var remaining = delayMs() - elapsed;

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

        playAudio(state.readyResult, token);
    }

    /*
     * WORKER REQUEST
     */

    function buildWorkerURL(movie) {
        var url =
            WORKER +
            '?title=' +
            encodeURIComponent(movie.title);

        if (movie.year) {
            url += '&year=' + encodeURIComponent(movie.year);
        }

        if (movie.series) {
            url += '&type=tv';
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

        setPlaybackState('searching');

        log(
            'Worker request:',
            movie.title,
            movie.year || '(year missing)',
            movie.series ? 'TV' : 'Movie',
            url
        );

        diagnosticSearching();

        xhr.open('GET', url, true);
        xhr.timeout = 20000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

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
                setPlaybackState('error', 'worker_http');

                log('Worker HTTP:', xhr.status);

                diagnosticFailure('worker_http', xhr.status);

                return;
            }

            var result;

            try {
                result = JSON.parse(xhr.responseText);
            } catch (e) {
                setPlaybackState('error', 'invalid_json');

                log('Invalid Worker JSON:', e);

                diagnosticFailure('invalid_json', 0);

                return;
            }

            if (
                !result ||
                !result.success ||
                !result.found ||
                !result.playable ||
                !result.audioUrl
            ) {
                setPlaybackState('not_found');

                log(
                    'No playable soundtrack:',
                    movie.title,
                    result
                        ? result.reason
                        : 'empty_response',
                    result && result.search
                        ? result.search.method
                        : '',
                    result
                );

                diagnosticNotFound(result);

                return;
            }

            state.readyResult = result;

            setPlaybackState('ready');

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
                setPlaybackState('error', 'network');

                log('Network error');

                diagnosticFailure('network', 0);
            }
        };

        xhr.ontimeout = function () {
            if (token === state.token) {
                setPlaybackState('error', 'worker_timeout');

                log('Worker timeout');

                diagnosticFailure('worker_timeout', 0);
            }
        };

        try {
            xhr.send();
        } catch (e) {
            if (state.request === xhr) {
                state.request = null;
            }

            setPlaybackState('error', 'xhr_exception');

            log('XHR exception:', e);

            diagnosticFailure('xhr_exception', 0);
        }
    }

    /*
     * CARD SCHEDULER
     */

    function schedulePlayback(movie) {
        if (!movie || !movie.title) {
            log('Card ignored: title missing');
            return;
        }

        if (
            !setting('enabled') ||
            !setting('autoplay')
        ) {
            log('Autoplay disabled');
            return;
        }

        if (
            movie.series &&
            !setting('series')
        ) {
            log('Series disabled:', movie.title);
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
            state.openedAt + 1200;

        state.lastActivity = getActiveActivity();

        state.readyResult = null;

        state.playbackStarted = false;
        state.playbackState = 'idle';
        state.playAttempt = 0;

        log(
            'Card opened:',
            movie.title,
            movie.year || '(year missing)',
            movie.series ? 'TV' : 'Movie',
            'Activity:',
            state.lastActivity || '(unknown)'
        );

        fetchSoundtrack(movie, state.token);
    }

    /*
     * NAVIGATION PROTECTION
     */

    function monitorNavigation() {
        if (!state.cardActive) return;

        var activity = getActiveActivity();

        if (!activity) return;

        if (activity !== state.lastActivity) {
            log(
                'Activity:',
                state.lastActivity,
                '->',
                activity
            );

            state.lastActivity = activity;
        }

        if (Date.now() < state.navigationGraceUntil) {
            return;
        }

        if (isNonFullActivity(activity)) {
            stopPlayback('activity_changed_to_' + activity);
        }
    }

    function handleActivityEvent(event) {
        if (!state.cardActive) return;

        if (Date.now() < state.navigationGraceUntil) {
            log(
                'Activity event ignored during grace period:',
                event && (event.type || event.name || '')
            );

            return;
        }

        var activity = getActiveActivity();

        if (isNonFullActivity(activity)) {
            stopPlayback('activity_event_' + activity);
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
            stopPlayback('full_event_' + type);
        }
    }

    /*
     * LIVE SETTINGS
     */

    function applyVolume() {
        if (!state.audio) return;

        if (state.fadeTimer) {
            retargetFade();
            return;
        }

        if (state.playbackStarted) {
            state.audio.volume = targetVolume();
        }
    }

    function applyRepeat() {
        if (state.audio) {
            state.audio.loop = setting('repeat');
        }
    }

    function applyFadeSetting() {
        var player = state.audio;

        if (!player) return;

        if (!state.playbackStarted) {
            player.volume = setting('fade')
                ? 0
                : targetVolume();

            return;
        }

        retargetFade();
    }

    function applyFadeDuration() {
        if (!state.audio || !state.playbackStarted) {
            return;
        }

        retargetFade();
    }

    function applyDelay() {
        if (
            state.cardActive &&
            state.readyResult &&
            !state.playbackStarted &&
            state.playbackState === 'ready'
        ) {
            clearStartTimer();
            tryStart(state.token);
        }
    }

    /*
     * SETTINGS
     */

    function registerSettings() {
        if (
            !Lampa.SettingsApi ||
            typeof Lampa.SettingsApi.addParam !== 'function'
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
                Object.prototype.hasOwnProperty.call(value, 'value')
            ) {
                return value.value;
            }

            return value;
        }

        function addTrigger(key, title, description, callback) {
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

                    storageSet(key, enabled);

                    if (callback) callback(enabled);
                }
            });
        }

        function addSelect(key, title, description, values, callback) {
            addParam({
                param: {
                    name: PREFIX + key,
                    type: 'select',
                    values: values,
                    default: String(DEFAULTS[key])
                },
                field: {
                    name: title,
                    description: description
                },
                onChange: function (value) {
                    var next = Number(changedValue(value));

                    if (!isFinite(next)) return;

                    storageSet(key, next);

                    if (callback) callback(next);
                }
            });
        }

        addTrigger(
            'enabled',
            'Увімкнути Kinorium OST',
            'Незалежне джерело саундтреків',
            function (enabled) {
                if (!enabled) stopPlayback('disabled');
            }
        );

        addTrigger(
            'autoplay',
            'Автоматичне відтворення',
            'Запускати музику під час відкриття картки',
            function (enabled) {
                if (!enabled) stopPlayback('autoplay_disabled');
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
                    stopPlayback('series_disabled');
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
            applyDelay
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
            },
            applyFadeDuration
        );

        addTrigger(
            'debug',
            'Режим діагностики',
            'Показувати назву композиції та причини помилок',
            function (enabled) {
                if (!enabled) {
                    removeNotice();
                } else if (state.cardActive) {
                    if (state.playbackStarted) {
                        diagnosticPlaying(state.readyResult);
                    } else if (
                        state.playbackState === 'searching'
                    ) {
                        diagnosticSearching();
                    } else if (
                        state.playbackState === 'not_found'
                    ) {
                        diagnosticNotFound(null);
                    }
                }
            }
        );
    }

    /*
     * INITIALIZATION
     */

    function init() {
        if (state.initialized) return;

        if (
            !window.Lampa ||
            !Lampa.Listener ||
            typeof Lampa.Listener.follow !== 'function'
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

        state.navigationTimer = setInterval(
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
                stopPlayback('beforeunload');
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
