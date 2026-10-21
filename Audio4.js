
(function () {
    'use strict';

    /*
     * ORIGINAL SOUNDTRACK 2.4
     *
     * Lampa / Android TV / Mobile
     * Cloudflare Worker 2.8.2
     *
     * Sources:
     * - YouTube IFrame Player, selected by JSON catalog
     * - OSTMusic.org direct audio
     *
     * Features:
     * - Automatic source detection
     * - Full-length OSTMusic playback
     * - YouTube playback from catalog URL
     * - Automatic repeat
     * - Configurable startup delay
     * - Configurable volume
     * - Fade-in for both sources
     * - Stop on card exit / player start
     * - Positive-result cache
     * - Request and playback race protection
     */

    var PLUGIN_ID = 'crowley_original_soundtrack_v24';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var WORKER =
        'https://ostmusic-search.unclezhenya24.workers.dev';

    var PREFIX = 'crowley_ost_';
    var CACHE_PREFIX = PREFIX + 'cache_v24_';
    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

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
    var currentRequest = null;

    var currentToken = 0;
    var activeCard = false;
    var currentMovieKey = '';

    var memoryCache = {};
    var initialized = false;
    var settingsAdded = false;

    var youtubeCallbacks = [];
    var youtubeApiLoading = false;
    var youtubeApiFailed = false;

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

    function boolSetting(key) {
        var value = getSetting(key);

        return (
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1'
        );
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
    // HELPERS
    // --------------------------------------------------

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);

            args.unshift('[Original Soundtrack 2.4]');

            console.log.apply(console, args);
        } catch (e) {}
    }

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

        for (var i = 0; i < candidates.length; i++) {
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

    function isValidCachedEntry(entry) {
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
            });

        } catch (e) {}

        log('Cache cleared');
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

    function clearTimers() {
        if (currentTimer !== null) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }

        clearFade();
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
        var duration = 1800;

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
                (Date.now() - started) / duration
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
                fileUrl.hostname !== 'www.ostmusic.org'
            ) {
                log('Unsupported OSTMusic audio source');
                return;
            }
        } catch (e) {
            return;
        }

        stopYouTube();
        stopAudio();

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

                log('OSTMusic playback error:', track.name);

                stopAudio();
            }
        );

        audio.src = fileUrl.href;

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
                        log(
                            'OSTMusic start blocked:',
                            error && error.message
                        );
                    }
                });
            }
        } catch (e) {
            log('OSTMusic playback failed:', e);
        }

        log(
            'Playing OSTMusic:',
            track.name,
            '—',
            track.artist,
            'Duration:',
            track.duration || 'unknown'
        );
    }

    // --------------------------------------------------
    // YOUTUBE API
    // --------------------------------------------------

    function flushYouTubeCallbacks() {
        var callbacks = youtubeCallbacks.slice();

        youtubeCallbacks = [];

        callbacks.forEach(function (callback) {
            try {
                callback();
            } catch (e) {
                log('YouTube callback error:', e);
            }
        });
    }

    function onYouTubeAPIReady() {
        youtubeApiLoading = false;
        youtubeApiFailed = false;

        log('YouTube IFrame API ready');

        flushYouTubeCallbacks();
    }

    function ensureYouTubeAPI(callback) {
        if (
            window.YT &&
            typeof window.YT.Player === 'function'
        ) {
            callback();
            return;
        }

        youtubeCallbacks.push(callback);

        if (youtubeApiLoading) return;

        youtubeApiLoading = true;
        youtubeApiFailed = false;

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

        if (existingScript) return;

        var script = document.createElement('script');

        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;

        script.onerror = function () {
            youtubeApiLoading = false;
            youtubeApiFailed = true;

            youtubeCallbacks = [];

            log('Could not load YouTube IFrame API');
        };

        var firstScript = document.getElementsByTagName('script')[0];

        if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(
                script,
                firstScript
            );
        } else {
            (document.head || document.documentElement)
                .appendChild(script);
        }
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
        var duration = 1800;

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
                (Date.now() - started) / duration
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

    // --------------------------------------------------
    // YOUTUBE PLAYBACK
    // --------------------------------------------------

    function playYouTube(videoUrl, track, token) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        var videoId = getYouTubeId(videoUrl);

        if (!videoId) {
            log('Invalid YouTube video URL');
            return;
        }

        stopAudio();
        stopYouTube();

        ensureYouTubeAPI(function () {
            if (
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

            /*
             * Keep the player attached to the DOM.
             * Do not use display:none: YouTube may refuse
             * to initialize or play in a hidden element.
             */
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
                        playlist: videoId,
                        modestbranding: 1
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

                            log(
                                'YouTube player ready:',
                                track && track.name
                                    ? track.name
                                    : videoId
                            );
                        },

                        onStateChange: function (event) {
                            if (
                                token !== currentToken ||
                                player !== currentYouTubePlayer
                            ) {
                                return;
                            }

                            // YT.PlayerState.ENDED = 0
                            // YT.PlayerState.PLAYING = 1

                            if (event.data === 1) {
                                startYouTubeFade(
                                    event.target,
                                    token
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

                            log(
                                'YouTube playback error:',
                                event.data
                            );

                            stopYouTube();
                        }
                    }
                });

                currentYouTubePlayer = player;

            } catch (e) {
                log('Could not create YouTube player:', e);

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
            log('Using cached soundtrack:', title);

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
                log('Worker HTTP error:', xhr.status);
                return;
            }

            var data;

            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                log('Invalid Worker JSON');
                return;
            }

            if (!data || !data.success) {
                log('Worker returned an error');
                return;
            }

            setCached(movie, data);

            handleResult(data, token);
        };

        xhr.onerror = function () {
            if (token === currentToken) {
                log('Worker network error');
            }
        };

        xhr.ontimeout = function () {
            if (token === currentToken) {
                log('Worker timeout');
            }
        };

        try {
            xhr.send();
        } catch (e) {
            log('Worker request failed:', e);
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
            log(
                'Soundtrack not identified:',
                data && data.reason
            );

            return;
        }

        if (
            boolSetting('verifiedOnly') &&
            data.confidence !== 'verified'
        ) {
            log('Skipping unverified soundtrack');
            return;
        }

        log(
            'Found:',
            data.track.name,
            'Source:',
            data.source || data.track.source || 'ostmusic',
            'Selection:',
            data.selection,
            'Confidence:',
            data.confidence
        );

        if (isYouTubeResult(data)) {
            playYouTube(
                data.track.file,
                data.track,
                token
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

        var token = currentToken;

        var delay = Math.max(
            0,
            numberSetting('delay', 2)
        ) * 1000;

        log('Movie:', title, getYear(movie));

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
                    if (
                        value === false ||
                        value === 'false' ||
                        value === 0 ||
                        value === '0'
                    ) {
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

                    if (
                        value === false ||
                        value === 'false' ||
                        value === 0 ||
                        value === '0'
                    ) {
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
                        'Швидший повторний запуск музики'
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

            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',

                param: {
                    name: PREFIX + 'clear_cache',
                    type: 'static'
                },

                field: {
                    name: 'Очистити кеш OST',
                    description:
                        'Видалити збережені результати пошуку'
                },

                onChange: function () {
                    clearCache();

                    try {
                        if (
                            Lampa.Noty &&
                            Lampa.Noty.show
                        ) {
                            Lampa.Noty.show(
                                'Кеш OST очищено'
                            );
                        }
                    } catch (e) {}
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

        log('Original Soundtrack 2.4 initialized');
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
