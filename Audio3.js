
(function () {
    'use strict';

    /*
     * ORIGINAL SOUNDTRACK 2.1
     * For Lampa / Android TV / Mobile
     *
     * Cloudflare Worker:
     * https://ostmusic-search.unclezhenya24.workers.dev
     *
     * Features:
     * - Automatic movie OST search
     * - Original movie title + release year
     * - Verified / heuristic theme selection
     * - 2-second startup delay
     * - 20% audio volume
     * - Smooth fade-in
     * - 30-second repeating segment
     * - Automatic stop when leaving movie card
     * - Stop when video playback starts
     * - Result caching
     * - Race-condition protection
     * - Lampa settings
     */

    var PLUGIN_ID = 'crowley_original_soundtrack_v21';

    if (window[PLUGIN_ID]) {
        return;
    }

    window[PLUGIN_ID] = true;

    var WORKER =
        'https://ostmusic-search.unclezhenya24.workers.dev';

    var PREFIX = 'crowley_ost_';

    var DEFAULTS = {
        enabled: true,
        volume: 20,
        delay: 2,
        fragment: 30,
        fade: true,
        cache: true,
        verifiedOnly: false
    };

    var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

    var currentAudio = null;
    var currentTimer = null;
    var fadeTimer = null;
    var loopTimer = null;

    var currentRequest = null;
    var currentToken = 0;

    var activeCard = false;
    var currentMovieKey = '';

    var memoryCache = {};

    var initialized = false;
    var settingsAdded = false;

    /*
     * Storage
     */

    function getSetting(key) {
        var defaultValue = DEFAULTS[key];

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                var value = Lampa.Storage.get(
                    PREFIX + key,
                    defaultValue
                );

                return value === undefined ||
                    value === null
                    ? defaultValue
                    : value;
            }
        } catch (e) {}

        return defaultValue;
    }

    function setSetting(key, value) {
        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.set === 'function'
            ) {
                Lampa.Storage.set(
                    PREFIX + key,
                    value
                );
            }
        } catch (e) {}
    }

    function isEnabled() {
        var value = getSetting('enabled');

        return value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1';
    }

    function boolSetting(key) {
        var value = getSetting(key);

        return value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1';
    }

    function numberSetting(key, fallback) {
        var value = Number(getSetting(key));

        return isFinite(value)
            ? value
            : fallback;
    }

    /*
     * Helpers
     */

    function log() {
        try {
            var args = Array.prototype.slice.call(
                arguments
            );

            args.unshift('[Original Soundtrack]');

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

        var date =
            movie.release_date ||
            movie.first_air_date ||
            movie.year ||
            '';

        var match = String(date).match(
            /\b(18|19|20)\d{2}\b/
        );

        return match
            ? Number(match[0])
            : 0;
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

    /*
     * Cache
     */

    function cacheKey(movie) {
        return [
            normalize(getMovieTitle(movie)),
            getYear(movie)
        ].join('|');
    }

    function getCached(movie) {
        if (!boolSetting('cache')) {
            return null;
        }

        var key = cacheKey(movie);

        var entry = memoryCache[key];

        if (
            entry &&
            Date.now() - entry.time < CACHE_TTL
        ) {
            return entry.data;
        }

        try {
            var raw = localStorage.getItem(
                PREFIX + 'cache_' + key
            );

            if (!raw) return null;

            entry = JSON.parse(raw);

            if (
                !entry ||
                !entry.time ||
                Date.now() - entry.time >= CACHE_TTL
            ) {
                localStorage.removeItem(
                    PREFIX + 'cache_' + key
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
        if (!boolSetting('cache')) {
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
                PREFIX + 'cache_' + key,
                JSON.stringify(entry)
            );
        } catch (e) {}
    }

    function clearCache() {
        memoryCache = {};

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
            });
        } catch (e) {}

        log('Cache cleared');
    }

    /*
     * Audio cleanup
     */

    function clearTimers() {
        if (currentTimer) {
            clearTimeout(currentTimer);
            currentTimer = null;
        }

        if (fadeTimer) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }

        if (loopTimer) {
            clearInterval(loopTimer);
            loopTimer = null;
        }
    }

    function stopAudio() {
        clearTimers();

        if (currentAudio) {
            try {
                currentAudio.pause();

                currentAudio.removeAttribute(
                    'src'
                );

                currentAudio.load();
            } catch (e) {}

            currentAudio = null;
        }
    }

    function cancelRequest() {
        if (currentRequest) {
            try {
                currentRequest.abort();
            } catch (e) {}

            currentRequest = null;
        }
    }

    function stopAll() {
        currentToken++;

        cancelRequest();
        stopAudio();

        currentMovieKey = '';
    }

    /*
     * Audio playback
     */

    function startFade(audio, token) {
        if (!boolSetting('fade')) {
            audio.volume = Math.min(
                1,
                Math.max(
                    0,
                    numberSetting('volume', 20) / 100
                )
            );

            return;
        }

        var target = Math.min(
            1,
            Math.max(
                0,
                numberSetting('volume', 20) / 100
            )
        );

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
                (Date.now() - started) /
                    duration
            );

            audio.volume =
                target * progress;

            if (progress >= 1) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 60);
    }

    function playTrack(track, token) {
        if (
            token !== currentToken ||
            !activeCard ||
            !isEnabled()
        ) {
            return;
        }

        if (
            !track ||
            !track.file
        ) {
            return;
        }

        var fileUrl;

        try {
            fileUrl = new URL(
                track.file
            );

            if (
                fileUrl.protocol !== 'https:' ||
                fileUrl.hostname !==
                    'www.ostmusic.org'
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
        audio.loop = false;
        audio.volume = 0;

        var fragment = Math.max(
            5,
            numberSetting('fragment', 30)
        );

        function restartFragment() {
            if (
                token !== currentToken ||
                currentAudio !== audio
            ) {
                return;
            }

            try {
                audio.currentTime = 0;

                if (audio.paused) {
                    var retry = audio.play();

                    if (
                        retry &&
                        typeof retry.catch ===
                            'function'
                    ) {
                        retry.catch(function () {});
                    }
                }
            } catch (e) {}
        }

        audio.addEventListener(
            'ended',
            restartFragment
        );

        audio.addEventListener(
            'error',
            function () {
                if (
                    token === currentToken &&
                    currentAudio === audio
                ) {
                    log(
                        'Audio playback error',
                        track.name
                    );
                    stopAudio();
                }
            }
        );

        audio.addEventListener(
            'playing',
            function () {
                if (
                    token !== currentToken ||
                    currentAudio !== audio
                ) {
                    return;
                }

                if (!fadeTimer) {
                    startFade(audio, token);
                }
            },
            { once: true }
        );

        audio.src = fileUrl.href;

        loopTimer = setInterval(function () {
            if (
                token !== currentToken ||
                currentAudio !== audio
            ) {
                return;
            }

            try {
                if (
                    audio.currentTime >= fragment
                ) {
                    restartFragment();
                }
            } catch (e) {}
        }, 250);

        try {
            var promise = audio.play();

            if (
                promise &&
                typeof promise.catch ===
                    'function'
            ) {
                promise.catch(function (error) {
                    if (
                        token === currentToken
                    ) {
                        log(
                            'Audio start blocked:',
                            error &&
                            error.message
                        );
                    }
                });
            }
        } catch (e) {
            log('Playback failed', e);
        }

        log(
            'Playing:',
            track.name,
            '—',
            track.artist
        );
    }

    /*
     * Worker API
     */

    function requestSoundtrack(movie, token) {
        var title =
            getMovieTitle(movie);

        var year =
            getYear(movie);

        if (!title) return;

        var cached = getCached(movie);

        if (cached) {
            handleResult(
                cached,
                token
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

        currentRequest = xhr;

        xhr.open(
            'GET',
            url,
            true
        );

        xhr.timeout = 15000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

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
                log(
                    'Worker HTTP error:',
                    xhr.status
                );

                return;
            }

            var data;

            try {
                data = JSON.parse(
                    xhr.responseText
                );
            } catch (e) {
                log('Invalid Worker JSON');
                return;
            }

            if (!data || !data.success) {
                log('Worker returned an error');
                return;
            }

            setCached(movie, data);

            handleResult(
                data,
                token
            );
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
            log('Worker request failed', e);
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
            log(
                'Skipping unverified theme'
            );

            return;
        }

        log(
            'Found:',
            data.track.name,
            'Confidence:',
            data.confidence
        );

        playTrack(
            data.track,
            token
        );
    }

    /*
     * Movie card
     */

    function openMovie(movie) {
        if (!isEnabled()) {
            stopAll();
            return;
        }

        if (!movie) {
            return;
        }

        var title =
            getMovieTitle(movie);

        if (!title) {
            return;
        }

        var key =
            movieKey(movie);

        if (
            activeCard &&
            currentMovieKey === key
        ) {
            return;
        }

        stopAll();

        activeCard = true;
        currentMovieKey = key;

        var token =
            currentToken;

        var delay = Math.max(
            0,
            numberSetting('delay', 2)
        ) * 1000;

        log(
            'Movie:',
            title,
            getYear(movie)
        );

        currentTimer = setTimeout(function () {
            currentTimer = null;

            if (
                token !== currentToken ||
                !activeCard
            ) {
                return;
            }

            requestSoundtrack(
                movie,
                token
            );
        }, delay);
    }

    function closeMovie() {
        activeCard = false;
        stopAll();
    }

    /*
     * Lampa events
     */

    function handleFullEvent(event) {
        if (!event) return;

        var type =
            String(event.type || '')
                .toLowerCase();

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
            type === 'complete'
        ) {
            var movie =
                getMovieFromEvent(event);

            if (movie) {
                openMovie(movie);
            }

            return;
        }

        if (
            type === 'start' ||
            type === 'open'
        ) {
            var candidate =
                getMovieFromEvent(event);

            if (candidate) {
                openMovie(candidate);
            }
        }
    }

    function handlePlayerEvent(event) {
        if (!event) return;

        var type =
            String(event.type || '')
                .toLowerCase();

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

    /*
     * Settings
     */

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
                    'fill="none" ' +
                    'stroke="currentColor" ' +
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
                    component:
                        'original_soundtrack',
                    param: Object.assign(
                        {
                            name:
                                PREFIX + name
                        },
                        config.param
                    ),
                    field: config.field,
                    onChange: function (value) {
                        setSetting(
                            name,
                            value
                        );

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
                    name:
                        'Увімкнути Original Soundtrack',
                    description:
                        'Автоматичне відтворення OST у картці фільму'
                },
                onChange: function (value) {
                    if (
                        value === false ||
                        value === 'false'
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
                onChange: function (value) {
                    if (currentAudio) {
                        currentAudio.volume =
                            Math.min(
                                1,
                                Number(value) / 100
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
                    name:
                        'Затримка запуску',
                    description:
                        'Час перед пошуком музики'
                }
            });

            addParam('fragment', {
                param: {
                    type: 'select',
                    default: '30',
                    values: {
                        '15': '15 секунд',
                        '20': '20 секунд',
                        '30': '30 секунд',
                        '45': '45 секунд',
                        '60': '60 секунд'
                    }
                },
                field: {
                    name:
                        'Тривалість фрагмента',
                    description:
                        'Після завершення фрагмент повторюється'
                }
            });

            addParam('fade', {
                param: {
                    type: 'trigger',
                    default: true
                },
                field: {
                    name:
                        'Плавне наростання звуку',
                    description:
                        'Fade-in приблизно 1,8 секунди'
                }
            });

            addParam('cache', {
                param: {
                    type: 'trigger',
                    default: true
                },
                field: {
                    name:
                        'Кешувати результати',
                    description:
                        'Швидший повторний запуск OST'
                }
            });

            addParam('verifiedOnly', {
                param: {
                    type: 'trigger',
                    default: false
                },
                field: {
                    name:
                        'Лише перевірені теми',
                    description:
                        'Не запускати композиції, обрані автоматичним алгоритмом'
                }
            });

            Lampa.SettingsApi.addParam({
                component:
                    'original_soundtrack',
                param: {
                    name:
                        PREFIX + 'clear_cache',
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

            log(
                'Settings error:',
                e
            );
        }
    }

    /*
     * Initialization
     */

    function initialize() {
        if (initialized) {
            return;
        }

        if (
            !window.Lampa ||
            !Lampa.Listener ||
            typeof Lampa.Listener.follow !==
                'function'
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

        /*
         * Additional protection when Lampa
         * navigates away from the movie card.
         */
        Lampa.Listener.follow(
            'activity',
            function (event) {
                if (!event) return;

                var type =
                    String(
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

        log(
            'Original Soundtrack 2.1 initialized'
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
