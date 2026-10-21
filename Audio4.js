
(function () {
    'use strict';

    /*
     * ORIGINAL SOUNDTRACK 2.5.1
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 2.8.2
     *
     * Sources:
     * - YouTube IFrame Player
     * - OSTMusic.org
     *
     * Features:
     * - Automatic soundtrack search
     * - YouTube and OSTMusic support
     * - Automatic repeat
     * - Startup delay
     * - Volume control
     * - Smooth fade-in
     * - Stop when leaving movie card
     * - Positive-result cache
     * - Real cache clearing button
     * - Real diagnostics button
     * - YouTube playback diagnostics
     * - YouTube startup watchdog
     * - Automatic playback retry
     */

    var PLUGIN_ID = 'crowley_original_soundtrack_v24';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var VERSION = '2.5.1';

    var WORKER =
        'https://ostmusic-search.unclezhenya24.workers.dev';

    var PREFIX = 'crowley_ost_';
    var CACHE_PREFIX = PREFIX + 'cache_v25_';
    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

    var DEFAULTS = {
        enabled: true,
        volume: 20,
        delay: 2,
        fade: true,
        cache: true,
        verifiedOnly: false
    };

    var audio = null;
    var ytPlayer = null;
    var ytContainer = null;

    var timer = null;
    var fadeTimer = null;
    var watchdog = null;
    var request = null;

    var token = 0;
    var active = false;
    var movieKeyActive = '';
    var initialized = false;
    var settingsAdded = false;

    var memoryCache = {};
    var ytCallbacks = [];
    var ytLoading = false;
    var ytScriptTimeout = null;

    var ytRetry = 0;
    var ytPlaying = false;
    var ytFadeDone = false;

    var lastStatus = 'Очікування відкриття картки';
    var currentMovie = null;

    // --------------------------------------------------
    // LOGGING
    // --------------------------------------------------

    function log() {
        var args = Array.prototype.slice.call(arguments);

        args.unshift(
            '[Original Soundtrack ' + VERSION + ']'
        );

        try {
            console.log.apply(console, args);
        } catch (e) {}
    }

    function status(message, notify) {
        lastStatus = message;
        log(message);

        if (notify) {
            noty(message);
        }
    }

    function noty(message) {
        try {
            if (
                Lampa.Noty &&
                typeof Lampa.Noty.show === 'function'
            ) {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    // --------------------------------------------------
    // STORAGE
    // --------------------------------------------------

    function getSetting(key) {
        try {
            return Lampa.Storage.get(
                PREFIX + key,
                DEFAULTS[key]
            );
        } catch (e) {
            return DEFAULTS[key];
        }
    }

    function setSetting(key, value) {
        try {
            Lampa.Storage.set(
                PREFIX + key,
                value
            );
        } catch (e) {}
    }

    function bool(key) {
        var value = getSetting(key);

        return (
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1'
        );
    }

    function num(key, fallback) {
        var value = Number(getSetting(key));

        return isFinite(value)
            ? value
            : fallback;
    }

    function volume() {
        return Math.max(
            0,
            Math.min(100, num('volume', 20))
        );
    }

    // --------------------------------------------------
    // MOVIE HELPERS
    // --------------------------------------------------

    function norm(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function titleOf(movie) {
        return String(
            movie &&
            (
                movie.original_title ||
                movie.original_name ||
                movie.title ||
                movie.name
            ) ||
            ''
        ).trim();
    }

    function yearOf(movie) {
        var value = String(
            movie &&
            (
                movie.release_date ||
                movie.first_air_date ||
                movie.year
            ) ||
            ''
        );

        var match = value.match(
            /\b(?:18|19|20)\d{2}\b/
        );

        return match ? Number(match[0]) : 0;
    }

    function keyOf(movie) {
        return [
            String(
                movie.id ||
                movie.tmdb_id ||
                ''
            ),
            norm(titleOf(movie)),
            yearOf(movie)
        ].join('|');
    }

    function movieFromEvent(event) {
        if (!event) return null;

        var candidates = [
            event.data && event.data.movie,
            event.data && event.data.card,
            event.data && event.data.data,
            event.movie,
            event.card,
            event.data
        ];

        for (
            var i = 0;
            i < candidates.length;
            i++
        ) {
            var item = candidates[i];

            if (
                item &&
                typeof item === 'object' &&
                (
                    item.original_title ||
                    item.original_name ||
                    item.title ||
                    item.name
                )
            ) {
                return item;
            }
        }

        return null;
    }

    // --------------------------------------------------
    // YOUTUBE URL
    // --------------------------------------------------

    function youtubeId(value) {
        try {
            var url = new URL(
                String(value || '').trim()
            );

            if (url.protocol !== 'https:') {
                return '';
            }

            var host = url.hostname.toLowerCase();

            var allowed = [
                'youtube.com',
                'www.youtube.com',
                'm.youtube.com',
                'music.youtube.com',
                'youtu.be',
                'www.youtu.be',
                'youtube-nocookie.com',
                'www.youtube-nocookie.com'
            ];

            if (allowed.indexOf(host) < 0) {
                return '';
            }

            var id = '';

            if (
                host === 'youtu.be' ||
                host === 'www.youtu.be'
            ) {
                id = url.pathname
                    .split('/')
                    .filter(Boolean)[0];
            } else {
                id = url.searchParams.get('v');

                if (!id) {
                    var match = url.pathname.match(
                        /^\/(?:embed|shorts|live)\/([^/?]+)/
                    );

                    id = match && match[1];
                }
            }

            return /^[A-Za-z0-9_-]{11}$/.test(id || '')
                ? id
                : '';

        } catch (e) {
            return '';
        }
    }

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    function cachedKey(movie) {
        return (
            CACHE_PREFIX +
            norm(titleOf(movie)) +
            '|' +
            yearOf(movie)
        );
    }

    function cacheValid(entry) {
        return Boolean(
            entry &&
            entry.time &&
            Date.now() - entry.time < CACHE_TTL &&
            entry.data &&
            entry.data.success &&
            entry.data.found &&
            entry.data.track &&
            entry.data.track.file
        );
    }

    function getCached(movie) {
        if (!bool('cache')) return null;

        var key = cachedKey(movie);
        var entry = memoryCache[key];

        if (cacheValid(entry)) {
            return entry.data;
        }

        delete memoryCache[key];

        try {
            entry = JSON.parse(
                localStorage.getItem(key)
            );

            if (cacheValid(entry)) {
                memoryCache[key] = entry;
                return entry.data;
            }

            localStorage.removeItem(key);

        } catch (e) {}

        return null;
    }

    function putCached(movie, data) {
        if (!bool('cache')) return;

        if (
            !data ||
            !data.success ||
            !data.found ||
            !data.track ||
            !data.track.file
        ) {
            return;
        }

        var key = cachedKey(movie);

        var entry = {
            time: Date.now(),
            data: data
        };

        memoryCache[key] = entry;

        try {
            localStorage.setItem(
                key,
                JSON.stringify(entry)
            );
        } catch (e) {}
    }

    function clearCache() {
        memoryCache = {};

        var count = 0;

        try {
            var keys = [];

            for (
                var i = 0;
                i < localStorage.length;
                i++
            ) {
                var key = localStorage.key(i);

                if (
                    key &&
                    key.indexOf(
                        PREFIX + 'cache_'
                    ) === 0
                ) {
                    keys.push(key);
                }
            }

            keys.forEach(function (key) {
                localStorage.removeItem(key);
                count++;
            });

        } catch (e) {}

        status(
            'Кеш OST очищено (' + count + ')',
            true
        );
    }

    // --------------------------------------------------
    // TIMERS
    // --------------------------------------------------

    function clearFade() {
        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function clearWatchdog() {
        if (watchdog !== null) {
            clearTimeout(watchdog);
            watchdog = null;
        }
    }

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    function stopAudio() {
        var current = audio;

        audio = null;
        clearFade();

        if (!current) return;

        try {
            current.pause();
            current.loop = false;
            current.removeAttribute('src');
            current.load();
        } catch (e) {}
    }

    function stopYT() {
        var player = ytPlayer;
        var container = ytContainer;

        ytPlayer = null;
        ytContainer = null;

        ytPlaying = false;
        ytFadeDone = false;

        clearFade();
        clearWatchdog();

        if (player) {
            try {
                player.stopVideo();
            } catch (e) {}

            try {
                player.destroy();
            } catch (e) {}
        }

        if (
            container &&
            container.parentNode
        ) {
            try {
                container.parentNode.removeChild(
                    container
                );
            } catch (e) {}
        }
    }

    function stopAll() {
        token++;

        if (request) {
            try {
                request.abort();
            } catch (e) {}

            request = null;
        }

        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }

        clearFade();
        clearWatchdog();

        stopAudio();
        stopYT();

        movieKeyActive = '';
        currentMovie = null;
    }

    // --------------------------------------------------
    // AUDIO FADE
    // --------------------------------------------------

    function audioFade(current, currentToken) {
        clearFade();

        var target = volume() / 100;

        if (!bool('fade')) {
            current.volume = target;
            return;
        }

        current.volume = 0;

        var started = Date.now();

        fadeTimer = setInterval(function () {
            if (
                currentToken !== token ||
                audio !== current
            ) {
                clearFade();
                return;
            }

            var progress = Math.min(
                1,
                (Date.now() - started) / 1800
            );

            current.volume = target * progress;

            if (progress >= 1) {
                clearFade();
            }
        }, 60);
    }

    // --------------------------------------------------
    // OSTMUSIC PLAYBACK
    // --------------------------------------------------

    function playOST(track, currentToken) {
        if (
            currentToken !== token ||
            !active ||
            !bool('enabled')
        ) {
            return;
        }

        var url;

        try {
            url = new URL(track.file);

            if (
                url.protocol !== 'https:' ||
                url.hostname !== 'www.ostmusic.org'
            ) {
                status(
                    'Недозволене джерело OSTMusic'
                );
                return;
            }

        } catch (e) {
            status('Некоректний URL OSTMusic');
            return;
        }

        stopYT();
        stopAudio();

        var current = new Audio();

        audio = current;
        current.preload = 'auto';
        current.loop = true;
        current.volume = 0;

        current.addEventListener(
            'playing',
            function () {
                if (
                    currentToken !== token ||
                    audio !== current
                ) {
                    return;
                }

                status(
                    'OSTMusic відтворюється: ' +
                    track.name
                );

                audioFade(
                    current,
                    currentToken
                );
            },
            { once: true }
        );

        current.addEventListener(
            'error',
            function () {
                if (
                    currentToken !== token ||
                    audio !== current
                ) {
                    return;
                }

                status(
                    'Помилка OSTMusic: ' +
                    track.name,
                    true
                );

                stopAudio();
            }
        );

        current.src = url.href;

        try {
            var promise = current.play();

            if (
                promise &&
                typeof promise.catch === 'function'
            ) {
                promise.catch(function (error) {
                    if (
                        currentToken === token &&
                        audio === current
                    ) {
                        status(
                            'OSTMusic заблоковано: ' +
                            (
                                error.message ||
                                error
                            ),
                            true
                        );
                    }
                });
            }

        } catch (e) {
            status(
                'OSTMusic: ' + e.message,
                true
            );
        }
    }

    // --------------------------------------------------
    // YOUTUBE API
    // --------------------------------------------------

    function flushYT() {
        var callbacks = ytCallbacks.slice();

        ytCallbacks = [];

        callbacks.forEach(function (callback) {
            try {
                callback();
            } catch (e) {
                log('YT callback error:', e);
            }
        });
    }

    function ytReady() {
        if (
            !window.YT ||
            typeof window.YT.Player !== 'function'
        ) {
            return;
        }

        ytLoading = false;

        if (ytScriptTimeout) {
            clearTimeout(ytScriptTimeout);
            ytScriptTimeout = null;
        }

        status('YouTube API готовий');

        flushYT();
    }

    function ensureYT(callback) {
        if (
            window.YT &&
            typeof window.YT.Player === 'function'
        ) {
            callback();
            return;
        }

        ytCallbacks.push(callback);

        if (ytLoading) return;

        ytLoading = true;

        var previous =
            window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function () {
            try {
                if (
                    typeof previous === 'function'
                ) {
                    previous();
                }
            } catch (e) {}

            ytReady();
        };

        var script = document.querySelector(
            'script[src*="youtube.com/iframe_api"]'
        );

        if (!script) {
            script = document.createElement('script');

            script.src =
                'https://www.youtube.com/iframe_api';

            script.async = true;

            script.onerror = function () {
                ytLoading = false;
                ytCallbacks = [];

                status(
                    'Помилка завантаження YouTube API',
                    true
                );
            };

            (
                document.head ||
                document.documentElement
            ).appendChild(script);
        }

        ytScriptTimeout = setTimeout(
            function () {
                if (
                    window.YT &&
                    typeof window.YT.Player === 'function'
                ) {
                    ytReady();
                    return;
                }

                ytLoading = false;
                ytCallbacks = [];

                status(
                    'YouTube API не відповідає',
                    true
                );
            },
            12000
        );
    }

    // --------------------------------------------------
    // YOUTUBE VOLUME
    // --------------------------------------------------

    function setYTVolume(player, value) {
        try {
            player.setVolume(
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(value)
                    )
                )
            );
        } catch (e) {}
    }

    function ytFade(player, currentToken) {
        if (ytFadeDone) return;

        ytFadeDone = true;
        clearFade();

        var target = volume();

        if (!bool('fade')) {
            setYTVolume(player, target);
            return;
        }

        setYTVolume(player, 0);

        var started = Date.now();

        fadeTimer = setInterval(function () {
            if (
                currentToken !== token ||
                player !== ytPlayer
            ) {
                clearFade();
                return;
            }

            var progress = Math.min(
                1,
                (Date.now() - started) / 1800
            );

            setYTVolume(
                player,
                target * progress
            );

            if (progress >= 1) {
                clearFade();
            }
        }, 60);
    }

    // --------------------------------------------------
    // YOUTUBE ERRORS
    // --------------------------------------------------

    function ytErrorDescription(code) {
        var errors = {
            2: 'некоректний ID',
            5: 'HTML5-плеєр не підтримує відео',
            100: 'відео недоступне',
            101: 'вбудовування заборонене',
            150: 'вбудовування заборонене',
            153: 'відсутня ідентифікація клієнта'
        };

        return errors[code] || 'невідома помилка';
    }

    // --------------------------------------------------
    // YOUTUBE WATCHDOG
    // --------------------------------------------------

    function ytWatch(
        player,
        currentToken,
        videoId
    ) {
        clearWatchdog();

        watchdog = setTimeout(function () {
            if (
                currentToken !== token ||
                player !== ytPlayer ||
                !active ||
                ytPlaying
            ) {
                return;
            }

            if (ytRetry < 1) {
                ytRetry++;

                status(
                    'YouTube не запустився, ' +
                    'повторна спроба: ' +
                    videoId,
                    true
                );

                try {
                    player.loadVideoById(videoId);
                    player.playVideo();
                } catch (e) {
                    status(
                        'Помилка повторного запуску: ' +
                        e.message,
                        true
                    );
                }

                ytWatch(
                    player,
                    currentToken,
                    videoId
                );

            } else {
                status(
                    'YouTube не почав відтворення: ' +
                    videoId,
                    true
                );
            }

        }, 9000);
    }

    // --------------------------------------------------
    // YOUTUBE PLAYBACK
    // --------------------------------------------------

    function playYT(
        videoUrl,
        track,
        currentToken
    ) {
        if (
            currentToken !== token ||
            !active ||
            !bool('enabled')
        ) {
            return;
        }

        var videoId = youtubeId(videoUrl);

        if (!videoId) {
            status(
                'Некоректне посилання YouTube',
                true
            );
            return;
        }

        stopAudio();
        stopYT();

        ytRetry = 0;

        status(
            'Створення YouTube-плеєра: ' +
            videoId
        );

        ensureYT(function () {
            if (
                currentToken !== token ||
                !active ||
                !bool('enabled')
            ) {
                return;
            }

            var container =
                document.createElement('div');

            container.id =
                'crowley-ost-yt-' +
                currentToken +
                '-' +
                Date.now();

            container.style.cssText =
                'position:fixed;' +
                'left:-10000px;' +
                'top:0;' +
                'width:200px;' +
                'height:200px;' +
                'overflow:hidden;' +
                'opacity:0.01;' +
                'pointer-events:none;';

            container.setAttribute(
                'aria-hidden',
                'true'
            );

            document.body.appendChild(container);

            ytContainer = container;

            var player;

            try {
                player = new window.YT.Player(
                    container.id,
                    {
                        width: '200',
                        height: '200',
                        videoId: videoId,

                        playerVars: {
                            autoplay: 1,
                            controls: 0,
                            disablekb: 1,
                            fs: 0,
                            playsinline: 1,
                            rel: 0,
                            loop: 1,
                            playlist: videoId,
                            modestbranding: 1
                        },

                        events: {
                            onReady: function (event) {
                                if (
                                    currentToken !== token ||
                                    !active ||
                                    player !== ytPlayer
                                ) {
                                    return;
                                }

                                status(
                                    'YouTube готовий: ' +
                                    videoId
                                );

                                setYTVolume(
                                    event.target,
                                    bool('fade')
                                        ? 0
                                        : volume()
                                );

                                try {
                                    event.target.playVideo();
                                } catch (error) {
                                    status(
                                        'playVideo: ' +
                                        error.message,
                                        true
                                    );
                                }

                                ytWatch(
                                    event.target,
                                    currentToken,
                                    videoId
                                );
                            },

                            onStateChange: function (event) {
                                if (
                                    currentToken !== token ||
                                    player !== ytPlayer
                                ) {
                                    return;
                                }

                                log(
                                    'YouTube state:',
                                    event.data,
                                    'video:',
                                    videoId
                                );

                                if (event.data === 1) {
                                    ytPlaying = true;

                                    clearWatchdog();

                                    status(
                                        'YouTube відтворюється: ' +
                                        (
                                            track.name ||
                                            videoId
                                        )
                                    );

                                    ytFade(
                                        event.target,
                                        currentToken
                                    );
                                }

                                if (event.data === 0) {
                                    try {
                                        event.target.seekTo(
                                            0,
                                            true
                                        );

                                        event.target.playVideo();
                                    } catch (e) {}
                                }
                            },

                            onError: function (event) {
                                if (
                                    currentToken !== token ||
                                    player !== ytPlayer
                                ) {
                                    return;
                                }

                                status(
                                    'YouTube помилка ' +
                                    event.data +
                                    ': ' +
                                    ytErrorDescription(
                                        event.data
                                    ),
                                    true
                                );

                                stopYT();
                            }
                        }
                    }
                );

                ytPlayer = player;

                status(
                    'YouTube-плеєр створено: ' +
                    videoId
                );

                ytWatch(
                    player,
                    currentToken,
                    videoId
                );

            } catch (e) {
                status(
                    'Не вдалося створити ' +
                    'YouTube-плеєр: ' +
                    e.message,
                    true
                );

                if (container.parentNode) {
                    container.parentNode.removeChild(
                        container
                    );
                }

                if (ytContainer === container) {
                    ytContainer = null;
                }
            }
        });
    }

    // --------------------------------------------------
    // WORKER RESULT
    // --------------------------------------------------

    function handleResult(data, currentToken) {
        if (
            currentToken !== token ||
            !active ||
            !bool('enabled')
        ) {
            return;
        }

        if (
            !data ||
            !data.found ||
            !data.track ||
            !data.track.file
        ) {
            status(
                'Саундтрек не знайдено: ' +
                (
                    data &&
                    data.reason ||
                    'невідома причина'
                )
            );
            return;
        }

        if (
            bool('verifiedOnly') &&
            data.confidence !== 'verified'
        ) {
            status(
                'Пропущено неперевірену композицію'
            );
            return;
        }

        status(
            'Знайдено ' +
            data.track.name +
            ' (' +
            (
                data.source ||
                data.track.source ||
                'ostmusic'
            ) +
            ')'
        );

        if (
            String(
                data.source ||
                data.track.source ||
                ''
            ).toLowerCase() === 'youtube'
        ) {
            playYT(
                data.track.file,
                data.track,
                currentToken
            );

        } else {
            playOST(
                data.track,
                currentToken
            );
        }
    }

    // --------------------------------------------------
    // WORKER API
    // --------------------------------------------------

    function requestSoundtrack(
        movie,
        currentToken
    ) {
        var title = titleOf(movie);
        var year = yearOf(movie);

        if (!title) return;

        var cached = getCached(movie);

        if (cached) {
            status(
                'Композиція з кешу: ' +
                title
            );

            handleResult(
                cached,
                currentToken
            );

            return;
        }

        var url =
            WORKER +
            '?title=' +
            encodeURIComponent(title) +
            '&year=' +
            encodeURIComponent(year);

        var xhr = new XMLHttpRequest();

        request = xhr;

        xhr.open('GET', url, true);
        xhr.timeout = 15000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (request === xhr) {
                request = null;
            }

            if (
                currentToken !== token ||
                !active
            ) {
                return;
            }

            if (
                xhr.status < 200 ||
                xhr.status >= 300
            ) {
                status(
                    'Worker HTTP ' +
                    xhr.status,
                    true
                );
                return;
            }

            var data;

            try {
                data = JSON.parse(
                    xhr.responseText
                );
            } catch (e) {
                status(
                    'Worker повернув некоректний JSON',
                    true
                );
                return;
            }

            if (
                !data ||
                !data.success
            ) {
                status(
                    'Помилка Worker',
                    true
                );
                return;
            }

            putCached(movie, data);

            handleResult(
                data,
                currentToken
            );
        };

        xhr.onerror = function () {
            if (currentToken === token) {
                status(
                    'Помилка мережі Worker',
                    true
                );
            }
        };

        xhr.ontimeout = function () {
            if (currentToken === token) {
                status(
                    'Таймаут Worker',
                    true
                );
            }
        };

        try {
            xhr.send();
        } catch (e) {
            status(
                'Запит Worker: ' +
                e.message,
                true
            );
        }
    }

    // --------------------------------------------------
    // MOVIE CARD
    // --------------------------------------------------

    function openMovie(movie) {
        if (!bool('enabled')) {
            active = false;
            stopAll();
            return;
        }

        if (
            !movie ||
            !titleOf(movie)
        ) {
            return;
        }

        var key = keyOf(movie);

        if (
            active &&
            movieKeyActive === key
        ) {
            return;
        }

        stopAll();

        active = true;
        currentMovie = movie;
        movieKeyActive = key;

        var currentToken = token;

        var delay = Math.max(
            0,
            num('delay', 2)
        ) * 1000;

        status(
            'Картка: ' +
            titleOf(movie) +
            ' (' +
            yearOf(movie) +
            ')'
        );

        timer = setTimeout(function () {
            timer = null;

            if (
                currentToken === token &&
                active
            ) {
                requestSoundtrack(
                    movie,
                    currentToken
                );
            }

        }, delay);
    }

    function closeMovie() {
        active = false;
        stopAll();
    }

    // --------------------------------------------------
    // LAMPA EVENTS
    // --------------------------------------------------

    function onFull(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (
            [
                'destroy',
                'close',
                'back'
            ].indexOf(type) >= 0
        ) {
            closeMovie();
            return;
        }

        if (
            [
                'complite',
                'complete',
                'start',
                'open'
            ].indexOf(type) >= 0
        ) {
            var movie = movieFromEvent(event);

            if (movie) {
                openMovie(movie);
            }
        }
    }

    function onPlayer(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (
            [
                'start',
                'play',
                'open',
                'ready',
                'loading'
            ].indexOf(type) >= 0
        ) {
            closeMovie();
        }
    }

    // --------------------------------------------------
    // SETTINGS
    // --------------------------------------------------

    function addSettings() {
        if (
            settingsAdded ||
            !window.Lampa ||
            !Lampa.SettingsApi
        ) {
            return;
        }

        settingsAdded = true;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'original_soundtrack',
                name: 'Original Soundtrack',

                icon:
                    '<svg viewBox="0 0 24 24" ' +
                    'width="24" height="24" ' +
                    'fill="none" stroke="currentColor" ' +
                    'stroke-width="2" ' +
                    'stroke-linecap="round" ' +
                    'stroke-linejoin="round">' +
                    '<path d="M9 18V5l12-2v13"/>' +
                    '<circle cx="6" cy="18" r="3"/>' +
                    '<circle cx="18" cy="16" r="3"/>' +
                    '</svg>'
            });

            function param(
                name,
                type,
                defaultValue,
                field,
                values,
                change
            ) {
                var config = {
                    name: PREFIX + name,
                    type: type,
                    default: defaultValue
                };

                if (values) {
                    config.values = values;
                }

                Lampa.SettingsApi.addParam({
                    component: 'original_soundtrack',
                    param: config,
                    field: field,

                    onChange: function (value) {
                        setSetting(
                            name,
                            value
                        );

                        if (change) {
                            change(value);
                        }
                    }
                });
            }

            param(
                'enabled',
                'trigger',
                true,
                {
                    name:
                        'Увімкнути Original Soundtrack',
                    description:
                        'Автоматична музика в картці фільму'
                },
                null,
                function (value) {
                    if (
                        value === false ||
                        value === 'false' ||
                        value === 0 ||
                        value === '0'
                    ) {
                        closeMovie();
                    }
                }
            );

            param(
                'volume',
                'select',
                '20',
                {
                    name: 'Гучність музики',
                    description: 'Стандартно 20%'
                },
                {
                    '5': '5%',
                    '10': '10%',
                    '15': '15%',
                    '20': '20%',
                    '25': '25%',
                    '30': '30%',
                    '40': '40%',
                    '50': '50%'
                },
                function () {
                    clearFade();

                    if (audio) {
                        audio.volume =
                            volume() / 100;
                    }

                    if (ytPlayer) {
                        setYTVolume(
                            ytPlayer,
                            volume()
                        );
                    }
                }
            );

            param(
                'delay',
                'select',
                '2',
                {
                    name: 'Затримка запуску',
                    description:
                        'Час перед пошуком композиції'
                },
                {
                    '0': 'Без затримки',
                    '1': '1 секунда',
                    '2': '2 секунди',
                    '3': '3 секунди',
                    '5': '5 секунд'
                }
            );

            param(
                'fade',
                'trigger',
                true,
                {
                    name: 'Плавне наростання звуку',
                    description:
                        'Fade-in приблизно 1,8 секунди'
                },
                null,
                function (value) {
                    if (
                        value === false ||
                        value === 'false' ||
                        value === 0 ||
                        value === '0'
                    ) {
                        clearFade();

                        if (audio) {
                            audio.volume =
                                volume() / 100;
                        }

                        if (ytPlayer) {
                            setYTVolume(
                                ytPlayer,
                                volume()
                            );
                        }
                    }
                }
            );

            param(
                'cache',
                'trigger',
                true,
                {
                    name: 'Кешувати результати',
                    description:
                        'Швидший повторний запуск музики'
                }
            );

            param(
                'verifiedOnly',
                'trigger',
                false,
                {
                    name: 'Лише перевірені теми',
                    description:
                        'Відтворювати тільки перевірені композиції'
                }
            );

            // ------------------------------------------
            // ACTION BUTTON HELPER
            // ------------------------------------------

            function addActionButton(
                name,
                title,
                description,
                action
            ) {
                Lampa.SettingsApi.addParam({
                    component: 'original_soundtrack',

                    param: {
                        name: PREFIX + name,
                        type: 'button'
                    },

                    field: {
                        name: title,
                        description: description
                    },

                    onRender: function (item) {
                        if (
                            !item ||
                            typeof item.on !== 'function'
                        ) {
                            return;
                        }

                        item.on(
                            'hover:enter click',
                            function () {
                                try {
                                    action();
                                } catch (e) {
                                    log(
                                        'Помилка кнопки:',
                                        name,
                                        e
                                    );

                                    noty(
                                        'Помилка виконання дії OST'
                                    );
                                }
                            }
                        );
                    }
                });
            }

            // ------------------------------------------
            // CLEAR CACHE BUTTON
            // ------------------------------------------

            addActionButton(
                'clear_cache_action',
                'Очистити кеш OST',
                'Натисни OK, щоб видалити кеш',
                function () {
                    clearCache();
                }
            );

            // ------------------------------------------
            // DIAGNOSTICS BUTTON
            // ------------------------------------------

            addActionButton(
                'show_status_action',
                'Показати стан OST',
                'Поточний етап пошуку та відтворення',
                function () {
                    log(
                        'Діагностика OST:',
                        lastStatus
                    );

                    noty(
                        'OST: ' + lastStatus
                    );
                }
            );

            log('Налаштування зареєстровані');

        } catch (e) {
            settingsAdded = false;

            log(
                'Помилка налаштувань',
                e
            );
        }
    }

    // --------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------

    function initialize() {
        if (
            initialized ||
            !window.Lampa ||
            !Lampa.Listener ||
            typeof Lampa.Listener.follow !== 'function'
        ) {
            return;
        }

        initialized = true;

        addSettings();

        Lampa.Listener.follow(
            'full',
            onFull
        );

        Lampa.Listener.follow(
            'player',
            onPlayer
        );

        Lampa.Listener.follow(
            'activity',
            function (event) {
                if (!event) return;

                var type = String(
                    event.type || ''
                ).toLowerCase();

                if (
                    type !== 'start' &&
                    type !== 'activity'
                ) {
                    return;
                }

                var component =
                    event.component ||
                    (
                        event.object &&
                        event.object.component
                    ) ||
                    (
                        event.activity &&
                        event.activity.component
                    ) ||
                    '';

                if (
                    component &&
                    component !== 'full' &&
                    component !== 'settings' &&
                    active
                ) {
                    closeMovie();
                }
            }
        );

        status(
            'Original Soundtrack ' +
            VERSION +
            ' запущено'
        );
    }

    function boot() {
        if (
            window.Lampa &&
            Lampa.Listener
        ) {
            initialize();
        } else {
            setTimeout(
                boot,
                500
            );
        }
    }

    boot();

})();
