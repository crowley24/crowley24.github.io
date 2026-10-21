
(function () {
    'use strict';

    /*
     * ORIGINAL SOUNDTRACK 2.5 PREMIUM
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 2.8.2
     *
     * Sources:
     * - OSTMusic.org direct MP3
     * - YouTube IFrame Player API
     *
     * Features:
     * - Automatic soundtrack playback
     * - Original soundtrack catalog support
     * - YouTube and OSTMusic playback
     * - Full-length tracks and automatic repeat
     * - Configurable volume and startup delay
     * - Smooth fade-in
     * - Reliable cleanup on card exit
     * - Request and playback race protection
     * - Source-specific cache expiration
     * - Cache clearing and diagnostics
     * - YouTube error reporting and startup watchdog
     * - One automatic YouTube startup retry
     */

    // Keep the original guard ID to avoid two versions
    // initializing in the same Lampa session.
    var PLUGIN_ID = 'crowley_original_soundtrack_v24';
    var VERSION = '2.5';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var WORKER =
        'https://ostmusic-search.unclezhenya24.workers.dev';

    var PREFIX = 'crowley_ost_';
    var CACHE_PREFIX = PREFIX + 'cache_v25_';

    var CACHE_TTL_OST = 7 * 24 * 60 * 60 * 1000;
    var CACHE_TTL_YOUTUBE = 24 * 60 * 60 * 1000;

    var YOUTUBE_TIMEOUT = 12000;
    var YOUTUBE_RETRY_DELAY = 1000;
    var FADE_DURATION = 1800;

    var DEFAULTS = {
        enabled: true,
        volume: 20,
        delay: 2,
        fade: true,
        cache: true,
        verifiedOnly: false
    };

    var currentAudio = null;
    var currentYouTubePlayer = null;
    var currentYouTubeContainer = null;

    var currentTimer = null;
    var fadeTimer = null;
    var youtubeWatchdog = null;
    var youtubeRetryTimer = null;
    var currentRequest = null;

    var currentToken = 0;
    var activeCard = false;
    var currentMovieKey = '';
    var currentMovieTitle = '';

    var memoryCache = {};
    var initialized = false;
    var settingsAdded = false;

    var youtubeCallbacks = [];
    var youtubeApiLoading = false;
    var youtubeApiTimer = null;

    var youtubeStarted = false;
    var youtubeRetryCount = 0;

    var lastStatus = 'Очікування відкриття картки';
    var lastSource = '';
    var lastTrack = '';
    var lastError = '';

    // --------------------------------------------------
    // STORAGE
    // --------------------------------------------------

    function getSetting(key) {
        var fallback = DEFAULTS[key];

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                var value = Lampa.Storage.get(
                    PREFIX + key,
                    fallback
                );

                return value == null ? fallback : value;
            }
        } catch (e) {}

        return fallback;
    }

    function setSetting(key, value) {
        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.set === 'function'
            ) {
                Lampa.Storage.set(PREFIX + key, value);
            }
        } catch (e) {}
    }

    function boolValue(value) {
        return (
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1'
        );
    }

    function boolSetting(key) {
        return boolValue(getSetting(key));
    }

    function isEnabled() {
        return boolSetting('enabled');
    }

    function numberSetting(key, fallback) {
        var value = Number(getSetting(key));

        return isFinite(value) ? value : fallback;
    }

    function targetVolume() {
        return Math.min(
            1,
            Math.max(
                0,
                numberSetting('volume', 20) / 100
            )
        );
    }

    // --------------------------------------------------
    // LOGGING AND STATUS
    // --------------------------------------------------

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);

            args.unshift(
                '[Original Soundtrack ' + VERSION + ']'
            );

            console.log.apply(console, args);
        } catch (e) {}
    }

    function setStatus(message) {
        lastStatus = String(message || '');

        log(lastStatus);
    }

    function setError(message) {
        lastError = String(message || '');

        setStatus(lastError);
    }

    function notify(message) {
        try {
            if (
                window.Lampa &&
                Lampa.Noty &&
                typeof Lampa.Noty.show === 'function'
            ) {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    function showStatus() {
        var message =
            'Original Soundtrack ' + VERSION +
            '\nСтан: ' + lastStatus +
            '\nФільм: ' + (currentMovieTitle || '—') +
            '\nДжерело: ' + (lastSource || '—') +
            '\nКомпозиція: ' + (lastTrack || '—') +
            '\nПомилка: ' + (lastError || 'Немає');

        log(message);

        notify(message);
    }

    // --------------------------------------------------
    // MOVIE HELPERS
    // --------------------------------------------------

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getYear(movie) {
        if (!movie) return 0;

        var value =
            movie.release_date ||
            movie.first_air_date ||
            movie.year ||
            '';

        var match = String(value).match(
            /\b(18|19|20)\d{2}\b/
        );

        return match ? Number(match[0]) : 0;
    }

    function getMovieTitle(movie) {
        if (!movie) return '';

        return String(
            movie.original_title ||
            movie.original_name ||
            movie.title ||
            movie.name ||
            ''
        ).trim();
    }

    function getMovieId(movie) {
        if (!movie) return '';

        return String(
            movie.id ||
            movie.tmdb_id ||
            ''
        );
    }

    function movieKey(movie) {
        return [
            getMovieId(movie),
            normalize(getMovieTitle(movie)),
            getYear(movie)
        ].join('|');
    }

    function getMovieFromEvent(event) {
        if (!event) return null;

        var candidates = [
            event.data && event.data.movie,
            event.data && event.data.card,
            event.data && event.data.data,
            event.movie,
            event.card,
            event.data
        ];

        var best = null;
        var bestScore = -1;

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];

            if (
                !item ||
                typeof item !== 'object' ||
                !getMovieTitle(item)
            ) {
                continue;
            }

            var score = 0;

            if (item.original_title || item.original_name) {
                score += 4;
            }

            if (getYear(item)) {
                score += 3;
            }

            if (getMovieId(item)) {
                score += 2;
            }

            if (item.release_date || item.first_air_date) {
                score += 1;
            }

            if (score > bestScore) {
                best = item;
                bestScore = score;
            }
        }

        return best;
    }

    // --------------------------------------------------
    // YOUTUBE URL
    // --------------------------------------------------

    function getYouTubeId(value) {
        try {
            var url = new URL(String(value || '').trim());

            if (url.protocol !== 'https:') return '';

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

            if (allowed.indexOf(host) === -1) {
                return '';
            }

            var id = '';

            if (
                host === 'youtu.be' ||
                host === 'www.youtu.be'
            ) {
                id = url.pathname
                    .split('/')
                    .filter(Boolean)[0] || '';
            } else {
                id = url.searchParams.get('v') || '';

                if (!id) {
                    var match = url.pathname.match(
                        /^\/(?:embed|shorts|live)\/([^/?]+)/
                    );

                    if (match) id = match[1];
                }
            }

            return /^[a-zA-Z0-9_-]{11}$/.test(id)
                ? id
                : '';

        } catch (e) {
            return '';
        }
    }

    function isYouTubeResult(data) {
        if (!data || !data.track) return false;

        var source = String(
            data.source ||
            data.track.source ||
            ''
        ).toLowerCase();

        return source === 'youtube';
    }

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    function cacheKey(movie) {
        return [
            normalize(getMovieTitle(movie)),
            getYear(movie)
        ].join('|');
    }

    function cacheTTL(data) {
        return isYouTubeResult(data)
            ? CACHE_TTL_YOUTUBE
            : CACHE_TTL_OST;
    }

    function isValidCachedEntry(entry) {
        if (
            !entry ||
            !entry.time ||
            !entry.data ||
            !entry.data.success ||
            !entry.data.found ||
            !entry.data.track ||
            !entry.data.track.file
        ) {
            return false;
        }

        var age = Date.now() - entry.time;

        return (
            age >= 0 &&
            age < cacheTTL(entry.data)
        );
    }

    function getCached(movie) {
        if (!boolSetting('cache')) return null;

        var key = cacheKey(movie);
        var entry = memoryCache[key];

        if (entry) {
            if (isValidCachedEntry(entry)) {
                return entry.data;
            }

            delete memoryCache[key];
        }

        try {
            var storageKey = CACHE_PREFIX + key;
            var raw = localStorage.getItem(storageKey);

            if (!raw) return null;

            entry = JSON.parse(raw);

            if (!isValidCachedEntry(entry)) {
                localStorage.removeItem(storageKey);
                return null;
            }

            memoryCache[key] = entry;

            return entry.data;

        } catch (e) {
            return null;
        }
    }

    function setCached(movie, data) {
        if (!boolSetting('cache')) return;

        if (
            !data ||
            !data.success ||
            !data.found ||
            !data.track ||
            !data.track.file
        ) {
            return;
        }

        var key = cacheKey(movie);

        var entry = {
            time: Date.now(),
            data: data
        };

        memoryCache[key] = entry;

        try {
            localStorage.setItem(
                CACHE_PREFIX + key,
                JSON.stringify(entry)
            );
        } catch (e) {}
    }

    function clearCache() {
        memoryCache = {};

        var removed = 0;

        try {
            var keys = [];

            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);

                if (
                    key &&
                    key.indexOf(PREFIX + 'cache_') === 0
                ) {
                    keys.push(key);
                }
            }

            keys.forEach(function (key) {
                localStorage.removeItem(key);
                removed++;
            });

        } catch (e) {}

        setStatus(
            'Кеш очищено. Видалено записів: ' + removed
        );

        return removed;
    }

    // --------------------------------------------------
    // TIMERS AND CLEANUP
    // --------------------------------------------------

    function clearFade() {
        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function clearYouTubeWatchdog() {
        if (youtubeWatchdog !== null) {
            clearTimeout(youtubeWatchdog);
            youtubeWatchdog = null;
        }
    }

    function clearYouTubeRetry() {
        if (youtubeRetryTimer !== null) {
            clearTimeout(youtubeRetryTimer);
            youtubeRetryTimer = null;
        }
    }

    function clearTimers() {
        if (currentTimer !== null) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }

        clearFade();
        clearYouTubeWatchdog();
        clearYouTubeRetry();
    }

    function stopAudio() {
        var audio = currentAudio;

        currentAudio = null;

        if (!audio) return;

        clearFade();

        try {
            audio.pause();
            audio.loop = false;
            audio.removeAttribute('src');
            audio.load();
        } catch (e) {}
    }

    function stopYouTube() {
        var player = currentYouTubePlayer;
        var container = currentYouTubeContainer;

        currentYouTubePlayer = null;
        currentYouTubeContainer = null;

        clearFade();
        clearYouTubeWatchdog();

        if (player) {
            try {
                player.stopVideo();
            } catch (e) {}

            try {
                player.destroy();
            } catch (e) {}
        }

        if (container && container.parentNode) {
            try {
                container.parentNode.removeChild(container);
            } catch (e) {}
        }
    }

    function cancelRequest() {
        if (!currentRequest) return;

        var xhr = currentRequest;

        currentRequest = null;

        try {
            xhr.abort();
        } catch (e) {}
    }

    function stopAll() {
        currentToken++;

        cancelRequest();
        clearTimers();
        stopAudio();
        stopYouTube();

        youtubeStarted = false;
        youtubeRetryCount = 0;

        currentMovieKey = '';
    }

    // --------------------------------------------------
    // AUDIO FADE-IN
    // --------------------------------------------------

    function startAudioFade(audio, token) {
        clearFade();

        var target = targetVolume();

        if (!boolSetting('fade')) {
            audio.volume = target;
            return;
        }

        audio.volume = 0;

        var started = Date.now();

        fadeTimer = setInterval(function () {
            if (
                token !== currentToken ||
                audio !== currentAudio
            ) {
                clearFade();
                return;
            }

            var progress = Math.min(
                1,
                (Date.now() - started) / FADE_DURATION
            );

            audio.volume = target * progress;

            if (progress >= 1) {
                clearFade();
            }
        }, 60);
    }

    // --------------------------------------------------
    // OSTMusic PLAYBACK
    // --------------------------------------------------

    function playTrack(track, token) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        if (!track || !track.file) return;

        var fileUrl;

        try {
            fileUrl = new URL(track.file);

            if (
                fileUrl.protocol !== 'https:' ||
                (
                    fileUrl.hostname !== 'www.ostmusic.org' &&
                    fileUrl.hostname !== 'ostmusic.org'
                )
            ) {
                setError('Непідтримуване джерело OSTMusic');
                return;
            }
        } catch (e) {
            setError('Некоректне посилання OSTMusic');
            return;
        }

        stopYouTube();
        stopAudio();

        lastSource = 'OSTMusic';
        lastTrack = track.name || '';
        lastError = '';

        var audio = new Audio();

        currentAudio = audio;

        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = 0;

        audio.addEventListener(
            'playing',
            function () {
                if (
                    token !== currentToken ||
                    audio !== currentAudio
                ) {
                    return;
                }

                startAudioFade(audio, token);

                setStatus(
                    'Відтворення OSTMusic: ' + lastTrack
                );
            },
            { once: true }
        );

        audio.addEventListener(
            'error',
            function () {
                if (
                    token !== currentToken ||
                    audio !== currentAudio
                ) {
                    return;
                }

                setError(
                    'Помилка відтворення OSTMusic: ' +
                    (track.name || 'невідомий трек')
                );

                stopAudio();
            }
        );

        audio.src = fileUrl.href;

        setStatus('Запуск OSTMusic: ' + lastTrack);

        try {
            var promise = audio.play();

            if (
                promise &&
                typeof promise.catch === 'function'
            ) {
                promise.catch(function (error) {
                    if (
                        token === currentToken &&
                        audio === currentAudio
                    ) {
                        setError(
                            'OSTMusic: ' +
                            (
                                error && error.message
                                    ? error.message
                                    : 'запуск заблоковано'
                            )
                        );
                    }
                });
            }
        } catch (e) {
            setError('Не вдалося запустити OSTMusic');
        }
    }

    // --------------------------------------------------
    // YOUTUBE API
    // --------------------------------------------------

    function flushYouTubeCallbacks(success) {
        var callbacks = youtubeCallbacks.slice();

        youtubeCallbacks = [];

        callbacks.forEach(function (callback) {
            try {
                callback(success);
            } catch (e) {
                log('YouTube callback error:', e);
            }
        });
    }

    function onYouTubeAPIReady() {
        youtubeApiLoading = false;

        if (youtubeApiTimer !== null) {
            clearTimeout(youtubeApiTimer);
            youtubeApiTimer = null;
        }

        setStatus('YouTube IFrame API готовий');

        flushYouTubeCallbacks(true);
    }

    function ensureYouTubeAPI(callback) {
        if (
            window.YT &&
            typeof window.YT.Player === 'function'
        ) {
            callback(true);
            return;
        }

        youtubeCallbacks.push(callback);

        if (youtubeApiLoading) return;

        youtubeApiLoading = true;

        var previousCallback =
            window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function () {
            try {
                if (typeof previousCallback === 'function') {
                    previousCallback();
                }
            } catch (e) {}

            onYouTubeAPIReady();
        };

        var existingScript = document.querySelector(
            'script[src*="youtube.com/iframe_api"]'
        );

        if (!existingScript) {
            var script = document.createElement('script');

            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;

            script.onerror = function () {
                youtubeApiLoading = false;

                if (youtubeApiTimer !== null) {
                    clearTimeout(youtubeApiTimer);
                    youtubeApiTimer = null;
                }

                setError(
                    'Не вдалося завантажити YouTube API'
                );

                flushYouTubeCallbacks(false);
            };

            (document.head || document.documentElement)
                .appendChild(script);
        }

        youtubeApiTimer = setTimeout(function () {
            if (
                window.YT &&
                typeof window.YT.Player === 'function'
            ) {
                onYouTubeAPIReady();
                return;
            }

            youtubeApiLoading = false;
            youtubeApiTimer = null;

            setError('Тайм-аут завантаження YouTube API');

            flushYouTubeCallbacks(false);

        }, 12000);
    }

    // --------------------------------------------------
    // YOUTUBE VOLUME / FADE
    // --------------------------------------------------

    function setYouTubeVolume(player, value) {
        try {
            player.setVolume(
                Math.max(
                    0,
                    Math.min(100, Math.round(value))
                )
            );
        } catch (e) {}
    }

    function startYouTubeFade(player, token) {
        clearFade();

        var target = targetVolume() * 100;

        if (!boolSetting('fade')) {
            setYouTubeVolume(player, target);
            return;
        }

        setYouTubeVolume(player, 0);

        var started = Date.now();

        fadeTimer = setInterval(function () {
            if (
                token !== currentToken ||
                player !== currentYouTubePlayer
            ) {
                clearFade();
                return;
            }

            var progress = Math.min(
                1,
                (Date.now() - started) / FADE_DURATION
            );

            setYouTubeVolume(
                player,
                target * progress
            );

            if (progress >= 1) {
                clearFade();
            }
        }, 60);
    }

    function youtubeErrorDescription(code) {
        switch (Number(code)) {
            case 2:
                return 'Некоректний ID відео';
            case 5:
                return 'Помилка HTML5-плеєра';
            case 100:
                return 'Відео недоступне або видалене';
            case 101:
            case 150:
                return 'Вбудовування відео заборонене';
            case 153:
                return 'Відсутня ідентифікація клієнта';
            default:
                return 'Невідома помилка';
        }
    }

    // --------------------------------------------------
    // YOUTUBE PLAYBACK
    // --------------------------------------------------

    function playYouTube(videoUrl, track, token, retry) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        var videoId = getYouTubeId(videoUrl);

        if (!videoId) {
            setError('Некоректне посилання YouTube');
            return;
        }

        if (!retry) {
            youtubeRetryCount = 0;
            youtubeStarted = false;
        }

        stopAudio();
        stopYouTube();

        lastSource = 'YouTube';
        lastTrack = track && track.name
            ? track.name
            : videoId;

        lastError = '';

        setStatus(
            'Запуск YouTube: ' + lastTrack
        );

        ensureYouTubeAPI(function (success) {
            if (
                !success ||
                token !== currentToken ||
                !activeCard ||
                !isEnabled()
            ) {
                return;
            }

            var container = document.createElement('div');

            container.id =
                'crowley-ost-youtube-' +
                String(token) +
                '-' +
                String(Date.now());

            container.style.position = 'fixed';
            container.style.left = '-10000px';
            container.style.top = '0';
            container.style.width = '200px';
            container.style.height = '200px';
            container.style.overflow = 'hidden';
            container.style.opacity = '0.01';
            container.style.pointerEvents = 'none';

            container.setAttribute('aria-hidden', 'true');

            document.body.appendChild(container);

            currentYouTubeContainer = container;

            var player;

            function startWatchdog() {
                clearYouTubeWatchdog();

                youtubeWatchdog = setTimeout(function () {
                    if (
                        token !== currentToken ||
                        !activeCard ||
                        youtubeStarted
                    ) {
                        return;
                    }

                    stopYouTube();

                    if (youtubeRetryCount < 1) {
                        youtubeRetryCount++;

                        setStatus(
                            'YouTube не стартував. Повторна спроба'
                        );

                        youtubeRetryTimer = setTimeout(
                            function () {
                                youtubeRetryTimer = null;

                                if (
                                    token === currentToken &&
                                    activeCard
                                ) {
                                    playYouTube(
                                        videoUrl,
                                        track,
                                        token,
                                        true
                                    );
                                }
                            },
                            YOUTUBE_RETRY_DELAY
                        );

                    } else {
                        setError(
                            'YouTube не почав відтворення'
                        );
                    }

                }, YOUTUBE_TIMEOUT);
            }

            try {
                player = new window.YT.Player(container.id, {
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
                        playlist: videoId
                    },

                    events: {
                        onReady: function (event) {
                            if (
                                token !== currentToken ||
                                player !== currentYouTubePlayer ||
                                !activeCard
                            ) {
                                try {
                                    event.target.destroy();
                                } catch (e) {}

                                return;
                            }

                            setYouTubeVolume(
                                event.target,
                                boolSetting('fade')
                                    ? 0
                                    : targetVolume() * 100
                            );

                            try {
                                event.target.playVideo();
                            } catch (e) {}

                            startWatchdog();
                        },

                        onStateChange: function (event) {
                            if (
                                token !== currentToken ||
                                player !== currentYouTubePlayer
                            ) {
                                return;
                            }

                            if (event.data === 1) {
                                clearYouTubeWatchdog();

                                if (!youtubeStarted) {
                                    youtubeStarted = true;

                                    startYouTubeFade(
                                        event.target,
                                        token
                                    );
                                }

                                setStatus(
                                    'Відтворення YouTube: ' +
                                    lastTrack
                                );
                            }

                            if (event.data === 0) {
                                try {
                                    event.target.seekTo(0, true);
                                    event.target.playVideo();
                                } catch (e) {}
                            }
                        },

                        onError: function (event) {
                            if (
                                token !== currentToken ||
                                player !== currentYouTubePlayer
                            ) {
                                return;
                            }

                            var code = Number(event.data);

                            setError(
                                'YouTube ' +
                                code +
                                ': ' +
                                youtubeErrorDescription(code)
                            );

                            stopYouTube();
                        }
                    }
                });

                currentYouTubePlayer = player;

                startWatchdog();

            } catch (e) {
                setError(
                    'Не вдалося створити YouTube-плеєр'
                );

                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }

                if (currentYouTubeContainer === container) {
                    currentYouTubeContainer = null;
                }
            }
        });
    }

    // --------------------------------------------------
    // WORKER API
    // --------------------------------------------------

    function requestSoundtrack(movie, token) {
        var title = getMovieTitle(movie);
        var year = getYear(movie);

        if (!title) return;

        var cached = getCached(movie);

        if (cached) {
            setStatus(
                'Композицію отримано з кешу: ' + title
            );

            handleResult(cached, token);
            return;
        }

        var url =
            WORKER +
            '?title=' +
            encodeURIComponent(title) +
            '&year=' +
            encodeURIComponent(year);

        var xhr = new XMLHttpRequest();

        currentRequest = xhr;

        xhr.open('GET', url, true);
        xhr.timeout = 15000;

        setStatus('Пошук композиції: ' + title);

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (currentRequest === xhr) {
                currentRequest = null;
            }

            if (
                token !== currentToken ||
                !activeCard
            ) {
                return;
            }

            if (
                xhr.status < 200 ||
                xhr.status >= 300
            ) {
                setError(
                    'Worker HTTP ' + xhr.status
                );
                return;
            }

            var data;

            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                setError('Некоректна відповідь Worker');
                return;
            }

            if (!data || !data.success) {
                setError('Worker повернув помилку');
                return;
            }

            setCached(movie, data);
            handleResult(data, token);
        };

        xhr.onerror = function () {
            if (token === currentToken) {
                setError('Помилка мережі Worker');
            }
        };

        xhr.ontimeout = function () {
            if (token === currentToken) {
                setError('Тайм-аут Worker');
            }
        };

        try {
            xhr.send();
        } catch (e) {
            setError('Не вдалося виконати запит Worker');
        }
    }

    function handleResult(data, token) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        if (
            !data ||
            !data.found ||
            !data.track ||
            !data.track.file
        ) {
            setStatus('Саундтрек не знайдено');
            return;
        }

        if (
            boolSetting('verifiedOnly') &&
            data.confidence !== 'verified'
        ) {
            setStatus(
                'Композицію пропущено: не перевірена'
            );
            return;
        }

        lastSource = isYouTubeResult(data)
            ? 'YouTube'
            : 'OSTMusic';

        lastTrack = data.track.name || '';
        lastError = '';

        log(
            'Found:',
            lastTrack,
            'Source:',
            lastSource,
            'Selection:',
            data.selection,
            'Confidence:',
            data.confidence
        );

        if (isYouTubeResult(data)) {
            playYouTube(
                data.track.file,
                data.track,
                token,
                false
            );
            return;
        }

        playTrack(data.track, token);
    }

    // --------------------------------------------------
    // MOVIE CARD
    // --------------------------------------------------

    function openMovie(movie) {
        if (!isEnabled()) {
            activeCard = false;
            stopAll();
            return;
        }

        if (!movie) return;

        var title = getMovieTitle(movie);

        if (!title) return;

        var key = movieKey(movie);

        if (
            activeCard &&
            currentMovieKey === key
        ) {
            return;
        }

        stopAll();

        activeCard = true;
        currentMovieKey = key;
        currentMovieTitle = title;

        lastSource = '';
        lastTrack = '';
        lastError = '';

        var token = currentToken;

        var delay = Math.max(
            0,
            numberSetting('delay', 2)
        ) * 1000;

        setStatus(
            'Відкрито картку: ' +
            title +
            ' (' + getYear(movie) + ')'
        );

        currentTimer = setTimeout(function () {
            currentTimer = null;

            if (
                token !== currentToken ||
                !activeCard
            ) {
                return;
            }

            requestSoundtrack(movie, token);

        }, delay);
    }

    function closeMovie() {
        activeCard = false;
        stopAll();
    }

    // --------------------------------------------------
    // LAMPA EVENTS
    // --------------------------------------------------

    function handleFullEvent(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (
            type === 'destroy' ||
            type === 'close' ||
            type === 'back'
        ) {
            closeMovie();
            return;
        }

        if (
            type === 'complite' ||
            type === 'complete' ||
            type === 'start' ||
            type === 'open'
        ) {
            var movie = getMovieFromEvent(event);

            if (movie) {
                openMovie(movie);
            }
        }
    }

    function handlePlayerEvent(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (
            type === 'start' ||
            type === 'play' ||
            type === 'open' ||
            type === 'ready' ||
            type === 'loading'
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

            function addParam(name, config) {
                Lampa.SettingsApi.addParam({
                    component: 'original_soundtrack',

                    param: Object.assign(
                        {
                            name: PREFIX + name
                        },
                        config.param
                    ),

                    field: config.field,

                    onChange: function (value) {
                        setSetting(name, value);

                        if (config.onChange) {
                            config.onChange(value);
                        }
                    }
                });
            }

            addParam('enabled', {
                param: {
                    type: 'trigger',
                    default: true
                },

                field: {
                    name: 'Увімкнути Original Soundtrack',
                    description:
                        'Автоматична музика в картці фільму'
                },

                onChange: function (value) {
                    if (!boolValue(value)) {
                        closeMovie();
                    }
                }
            });

            addParam('volume', {
                param: {
                    type: 'select',
                    default: '20',

                    values: {
                        '5': '5%',
                        '10': '10%',
                        '15': '15%',
                        '20': '20%',
                        '25': '25%',
                        '30': '30%',
                        '40': '40%',
                        '50': '50%'
                    }
                },

                field: {
                    name: 'Гучність музики',
                    description: 'Стандартно 20%'
                },

                onChange: function () {
                    clearFade();

                    if (currentAudio) {
                        currentAudio.volume = targetVolume();
                    }

                    if (currentYouTubePlayer) {
                        setYouTubeVolume(
                            currentYouTubePlayer,
                            targetVolume() * 100
                        );
                    }
                }
            });

            addParam('delay', {
                param: {
                    type: 'select',
                    default: '2',

                    values: {
                        '0': 'Без затримки',
                        '1': '1 секунда',
                        '2': '2 секунди',
                        '3': '3 секунди',
                        '5': '5 секунд'
                    }
                },

                field: {
                    name: 'Затримка запуску',
                    description:
                        'Час перед пошуком композиції'
                }
            });

            addParam('fade', {
                param: {
                    type: 'trigger',
                    default: true
                },

                field: {
                    name: 'Плавне наростання звуку',
                    description:
                        'Fade-in приблизно 1,8 секунди'
                },

                onChange: function (value) {
                    clearFade();

                    if (!boolValue(value)) {
                        if (currentAudio) {
                            currentAudio.volume = targetVolume();
                        }

                        if (currentYouTubePlayer) {
                            setYouTubeVolume(
                                currentYouTubePlayer,
                                targetVolume() * 100
                            );
                        }
                    }
                }
            });

            addParam('cache', {
                param: {
                    type: 'trigger',
                    default: true
                },

                field: {
                    name: 'Кешувати результати',
                    description:
                        'OSTMusic — 7 днів, YouTube — 24 години'
                }
            });

            addParam('verifiedOnly', {
                param: {
                    type: 'trigger',
                    default: false
                },

                field: {
                    name: 'Лише перевірені теми',
                    description:
                        'Відтворювати тільки перевірені композиції'
                }
            });

            /*
             * Action trigger.
             * Every change executes the action, then resets
             * its storage value to false.
             */

            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',

                param: {
                    name: PREFIX + 'clear_cache_action',
                    type: 'trigger',
                    default: false
                },

                field: {
                    name: 'Очистити кеш OST',
                    description:
                        'Видалити збережені результати'
                },

                onChange: function () {
                    var count = clearCache();

                    setSetting('clear_cache_action', false);

                    notify(
                        'Кеш OST очищено: ' +
                        count +
                        ' записів'
                    );
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',

                param: {
                    name: PREFIX + 'show_status_action',
                    type: 'trigger',
                    default: false
                },

                field: {
                    name: 'Стан відтворення OST',
                    description:
                        'Переглянути останній стан і помилку'
                },

                onChange: function () {
                    setSetting('show_status_action', false);

                    showStatus();
                }
            });

            log('Settings registered');

        } catch (e) {
            settingsAdded = false;

            log('Settings error:', e);
        }
    }

    // --------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------

    function initialize() {
        if (initialized) return;

        if (
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
            handleFullEvent
        );

        Lampa.Listener.follow(
            'player',
            handlePlayerEvent
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

                var activity =
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
                    activity &&
                    activity !== 'full' &&
                    activity !== 'settings'
                ) {
                    if (activeCard) {
                        closeMovie();
                    }
                }
            }
        );

        setStatus(
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
            setTimeout(boot, 500);
        }
    }

    boot();

})();
