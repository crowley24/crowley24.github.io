
(function () {
    'use strict';

    /*
     * ORIGINAL SOUNDTRACK 2.3
     * YouTube test edition
     *
     * First Blood (1982):
     * Dan Hill — It's a Long Road
     * YouTube video: 8DD0mzPhVSU
     *
     * Other movies:
     * Original OSTMusic Worker
     *
     * Lampa / Android TV / Mobile
     */

    var PLUGIN_ID = 'crowley_original_soundtrack_v23';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var WORKER =
        'https://ostmusic-search.unclezhenya24.workers.dev';

    var PREFIX = 'crowley_ost_';
    var CACHE_PREFIX = PREFIX + 'cache_v23_';
    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

    var RAMBO_YOUTUBE_ID = '8DD0mzPhVSU';

    var DEFAULTS = {
        enabled: true,
        volume: 20,
        delay: 2,
        fade: true,
        cache: true,
        verifiedOnly: false
    };

    var currentAudio = null;
    var currentTimer = null;
    var fadeTimer = null;
    var currentRequest = null;

    var youtubePlayer = null;
    var youtubeReady = false;
    var youtubeLoading = false;
    var youtubeContainer = null;
    var youtubeWatchdog = null;
    var youtubeToken = 0;

    var currentToken = 0;
    var activeCard = false;
    var currentMovieKey = '';
    var memoryCache = {};

    var initialized = false;
    var settingsAdded = false;

    // STORAGE

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

    function targetVolumePercent() {
        return Math.min(
            100,
            Math.max(0, numberSetting('volume', 20))
        );
    }

    function targetVolume() {
        return targetVolumePercent() / 100;
    }

    // HELPERS

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[Original Soundtrack 2.3]');
            console.log.apply(console, args);
        } catch (e) {}
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/ё/g, 'е')
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

    // FIRST BLOOD MATCH

    function isFirstBlood(movie) {
        if (!movie) return false;

        var titles = [
            movie.original_title,
            movie.original_name,
            movie.title,
            movie.name
        ];

        var year = getYear(movie);

        for (var i = 0; i < titles.length; i++) {
            var title = normalize(titles[i]);

            if (!title) continue;

            var englishMatch =
                title === 'first blood' ||
                title === 'rambo: first blood' ||
                title === 'rambo first blood';

            var ukrainianMatch =
                title.indexOf('перша кров') !== -1;

            var russianMatch =
                title.indexOf('первая кровь') !== -1;

            if (
                englishMatch ||
                ukrainianMatch ||
                russianMatch
            ) {
                // If year is available, make sure this is
                // the original 1982 film.
                return !year || year === 1982;
            }
        }

        return false;
    }

    // CACHE

    function cacheKey(movie) {
        return [
            normalize(getMovieTitle(movie)),
            getYear(movie)
        ].join('|');
    }

    function getCached(movie) {
        if (!boolSetting('cache')) return null;

        var key = cacheKey(movie);
        var entry = memoryCache[key];

        if (entry) {
            if (
                Date.now() - entry.time < CACHE_TTL &&
                entry.data &&
                entry.data.found &&
                entry.data.track &&
                entry.data.track.file
            ) {
                return entry.data;
            }

            delete memoryCache[key];
        }

        try {
            var raw = localStorage.getItem(
                CACHE_PREFIX + key
            );

            if (!raw) return null;

            entry = JSON.parse(raw);

            if (
                !entry ||
                !entry.time ||
                Date.now() - entry.time >= CACHE_TTL ||
                !entry.data ||
                !entry.data.found ||
                !entry.data.track ||
                !entry.data.track.file
            ) {
                localStorage.removeItem(
                    CACHE_PREFIX + key
                );

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

    // TIMERS

    function clearTimers() {
        if (currentTimer !== null) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }

        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }

        if (youtubeWatchdog !== null) {
            clearTimeout(youtubeWatchdog);
            youtubeWatchdog = null;
        }
    }

    // NATIVE AUDIO STOP

    function stopAudio() {
        var audio = currentAudio;
        currentAudio = null;

        if (!audio) return;

        try {
            audio.pause();
            audio.loop = false;
            audio.removeAttribute('src');
            audio.load();
        } catch (e) {}
    }

    // YOUTUBE CLEANUP

    function removeYouTubeContainer() {
        if (youtubeContainer) {
            try {
                if (youtubeContainer.parentNode) {
                    youtubeContainer.parentNode.removeChild(
                        youtubeContainer
                    );
                }
            } catch (e) {}

            youtubeContainer = null;
        }
    }

    function stopYouTube() {
        youtubeToken++;

        if (youtubeWatchdog !== null) {
            clearTimeout(youtubeWatchdog);
            youtubeWatchdog = null;
        }

        var player = youtubePlayer;

        youtubePlayer = null;

        if (player) {
            try {
                player.stopVideo();
            } catch (e) {}

            try {
                player.destroy();
            } catch (e) {}
        }

        removeYouTubeContainer();
    }

    // STOP EVERYTHING

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

        clearTimers();
        cancelRequest();
        stopAudio();
        stopYouTube();

        currentMovieKey = '';
    }

    // FADE-IN FOR NATIVE AUDIO

    function startFade(audio, token) {
        if (fadeTimer !== null) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }

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
                clearInterval(fadeTimer);
                fadeTimer = null;
                return;
            }

            var progress = Math.min(
                1,
                (Date.now() - started) / duration
            );

            audio.volume = target * progress;

            if (progress >= 1) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 60);
    }

    // YOUTUBE API

    function loadYouTubeAPI(callback) {
        if (
            window.YT &&
            typeof window.YT.Player === 'function'
        ) {
            callback();
            return;
        }

        if (!window._crowleyYTCallbacks) {
            window._crowleyYTCallbacks = [];
        }

        window._crowleyYTCallbacks.push(callback);

        if (youtubeLoading) return;

        youtubeLoading = true;

        var previousReady = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function () {
            youtubeLoading = false;

            try {
                if (typeof previousReady === 'function') {
                    previousReady();
                }
            } catch (e) {}

            var callbacks = window._crowleyYTCallbacks || [];
            window._crowleyYTCallbacks = [];

            callbacks.forEach(function (fn) {
                try {
                    fn();
                } catch (e) {
                    log('YouTube callback error:', e);
                }
            });
        };

        var existing = document.querySelector(
            'script[src*="youtube.com/iframe_api"]'
        );

        if (!existing) {
            var script = document.createElement('script');

            script.src =
                'https://www.youtube.com/iframe_api';

            script.async = true;

            script.onerror = function () {
                youtubeLoading = false;
                log('Could not load YouTube IFrame API');
            };

            document.head.appendChild(script);
        }
    }

    function createYouTubeContainer() {
        removeYouTubeContainer();

        var container = document.createElement('div');

        container.id =
            'crowley-ost-youtube-' + Date.now();

        /*
         * Keep the player in the document.
         * display:none may prevent playback in some webviews.
         * This tiny off-screen player is only a test strategy.
         */
        container.style.position = 'fixed';
        container.style.width = '200px';
        container.style.height = '112px';
        container.style.left = '-220px';
        container.style.top = '0';
        container.style.opacity = '0.01';
        container.style.pointerEvents = 'none';
        container.style.overflow = 'hidden';
        container.style.zIndex = '-1';

        document.body.appendChild(container);

        youtubeContainer = container;

        return container;
    }

    function startYouTube(movie, token) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        stopAudio();
        stopYouTube();

        var ytToken = youtubeToken;

        loadYouTubeAPI(function () {
            if (
                token !== currentToken ||
                !activeCard ||
                !isEnabled()
            ) {
                return;
            }

            var container = createYouTubeContainer();

            var playerDiv = document.createElement('div');

            playerDiv.id =
                'crowley-ost-youtube-player-' + Date.now();

            container.appendChild(playerDiv);

            try {
                youtubePlayer = new YT.Player(
                    playerDiv.id,
                    {
                        width: '200',
                        height: '112',

                        videoId: RAMBO_YOUTUBE_ID,

                        playerVars: {
                            autoplay: 1,
                            controls: 0,
                            disablekb: 1,
                            fs: 0,
                            playsinline: 1,
                            rel: 0
                        },

                        events: {
                            onReady: function (event) {
                                if (
                                    token !== currentToken ||
                                    !activeCard ||
                                    !youtubePlayer
                                ) {
                                    try {
                                        event.target.stopVideo();
                                    } catch (e) {}

                                    return;
                                }

                                try {
                                    event.target.setVolume(
                                        targetVolumePercent()
                                    );

                                    event.target.playVideo();
                                } catch (e) {}

                                log(
                                    'YouTube player ready:',
                                    'First Blood (1982)'
                                );

                                /*
                                 * Autoplay can be blocked.
                                 * Wait for playback or log a timeout.
                                 */
                                if (youtubeWatchdog !== null) {
                                    clearTimeout(youtubeWatchdog);
                                }

                                youtubeWatchdog = setTimeout(
                                    function () {
                                        youtubeWatchdog = null;

                                        if (
                                            token === currentToken &&
                                            activeCard &&
                                            youtubePlayer
                                        ) {
                                            var state = -1;

                                            try {
                                                state =
                                                    youtubePlayer.getPlayerState();
                                            } catch (e) {}

                                            if (state !== 1) {
                                                log(
                                                    'YouTube did not start automatically. ' +
                                                    'Autoplay may be blocked.'
                                                );
                                            }
                                        }
                                    },
                                    8000
                                );
                            },

                            onStateChange: function (event) {
                                if (
                                    token !== currentToken ||
                                    !activeCard
                                ) {
                                    return;
                                }

                                // 1 = playing
                                if (event.data === 1) {
                                    if (youtubeWatchdog !== null) {
                                        clearTimeout(youtubeWatchdog);
                                        youtubeWatchdog = null;
                                    }

                                    log('YouTube soundtrack playing');
                                }

                                // 0 = ended; repeat the soundtrack
                                if (event.data === 0) {
                                    try {
                                        event.target.seekTo(0, true);
                                        event.target.playVideo();
                                    } catch (e) {}
                                }

                                // -1 = unstarted, 3 = buffering
                                if (
                                    event.data === -1 ||
                                    event.data === 3
                                ) {
                                    // Wait for the player to start.
                                }
                            },

                            onError: function (event) {
                                log(
                                    'YouTube player error:',
                                    event.data
                                );
                            }
                        }
                    }
                );

            } catch (e) {
                log('Could not create YouTube player:', e);
            }
        });
    }

    // FULL TRACK PLAYBACK VIA WORKER

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
                log('Unsupported audio source');
                return;
            }
        } catch (e) {
            return;
        }

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

                startFade(audio, token);
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

                log('Audio playback error:', track.name);
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
                            'Audio start blocked:',
                            error && error.message
                        );
                    }
                });
            }
        } catch (e) {
            log('Playback failed:', e);
        }

        log(
            'Playing full track:',
            track.name,
            '—',
            track.artist
        );
    }

    // WORKER API

    function requestSoundtrack(movie, token) {
        var title = getMovieTitle(movie);
        var year = getYear(movie);

        if (!title) return;

        var cached = getCached(movie);

        if (cached) {
            log('Using cached OST:', title);
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
            !data.track
        ) {
            log(
                'OST not identified:',
                data && data.reason
            );

            return;
        }

        if (
            boolSetting('verifiedOnly') &&
            data.confidence !== 'verified'
        ) {
            log('Skipping unverified theme');
            return;
        }

        log(
            'Found:',
            data.track.name,
            'Selection:',
            data.selection,
            'Confidence:',
            data.confidence
        );

        playTrack(data.track, token);
    }

    // MOVIE CARD

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

            // First Blood uses YouTube.
            if (isFirstBlood(movie)) {
                log(
                    'Matched First Blood (1982); ' +
                    'using YouTube test source'
                );

                startYouTube(movie, token);
                return;
            }

            // All other movies retain the original Worker.
            requestSoundtrack(movie, token);

        }, delay);
    }

    function closeMovie() {
        activeCard = false;
        stopAll();
    }

    // LAMPA EVENTS

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

    // SETTINGS

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
                    description:
                        'Стандартно 20%'
                },
                onChange: function () {
                    if (currentAudio) {
                        if (fadeTimer !== null) {
                            clearInterval(fadeTimer);
                            fadeTimer = null;
                        }

                        currentAudio.volume = targetVolume();
                    }

                    if (youtubePlayer) {
                        try {
                            youtubePlayer.setVolume(
                                targetVolumePercent()
                            );
                        } catch (e) {}
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
                        'Час перед запуском музики'
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
                        'Fade-in для прямих аудіофайлів'
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
                        'Швидший повторний запуск OSTMusic'
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

    // INITIALIZATION

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

        log('Original Soundtrack 2.3 initialized');
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
