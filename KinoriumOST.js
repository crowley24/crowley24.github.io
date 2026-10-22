
(function () {
    'use strict';

    /*
     * KINORIUM OST 1.0.0
     * Test Edition
     *
     * Lampa / Android TV / Mobile
     *
     * Cloudflare Worker:
     * https://kinorium-ost.unclezhenya24.workers.dev/
     *
     * Test movie:
     * Gladiator (2000)
     * TMDB: 98
     * Kinorium: 143897
     *
     * FEATURES:
     * - Automatic soundtrack playback
     * - Apple audio preview
     * - Three soundtrack themes
     * - Automatic looping
     * - Stop when leaving movie card
     * - Playback delay
     * - Lampa settings
     * - Independent from Original Soundtrack
     */

    var VERSION = '1.0.0';

    var WORKER =
        'https://kinorium-ost.unclezhenya24.workers.dev/';

    var STORAGE_PREFIX = 'kinorium_ost_';

    var DEFAULTS = {
        enabled: true,
        autoplay: true,
        loop: true,
        delay: 2000,
        volume: 65,
        track: 'The Battle'
    };

    var TEST_MOVIE = {
        tmdb: 98,
        kinorium: '143897',
        title: 'Gladiator',
        year: 2000
    };

    var state = {
        audio: null,
        timer: null,
        request: null,
        cardOpen: false,
        currentMovie: null,
        generation: 0,
        initialized: false,
        lastError: ''
    };

    function log() {
        try {
            console.log.apply(
                console,
                ['[Kinorium OST]'].concat(
                    Array.prototype.slice.call(arguments)
                )
            );
        } catch (e) {}
    }

    function getSetting(key) {
        var storageKey = STORAGE_PREFIX + key;

        try {
            if (
                window.Lampa &&
                Lampa.Storage &&
                typeof Lampa.Storage.get === 'function'
            ) {
                var value = Lampa.Storage.get(
                    storageKey,
                    DEFAULTS[key]
                );

                return value === undefined ||
                    value === null
                    ? DEFAULTS[key]
                    : value;
            }
        } catch (e) {}

        try {
            var stored = localStorage.getItem(
                storageKey
            );

            return stored === null
                ? DEFAULTS[key]
                : JSON.parse(stored);
        } catch (e) {
            return DEFAULTS[key];
        }
    }

    function setSetting(key, value) {
        var storageKey = STORAGE_PREFIX + key;

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

    function enabled() {
        return getSetting('enabled') !== false;
    }

    function clearTimer() {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
    }

    function abortRequest() {
        if (state.request) {
            try {
                state.request.abort();
            } catch (e) {}

            state.request = null;
        }
    }

    function destroyAudio() {
        if (!state.audio) return;

        var audio = state.audio;

        state.audio = null;

        try {
            audio.pause();
        } catch (e) {}

        try {
            audio.onended = null;
            audio.onerror = null;
            audio.oncanplay = null;
            audio.onloadeddata = null;

            audio.removeAttribute('src');
            audio.load();
        } catch (e) {}
    }

    function stopPlayback(reason) {
        state.generation++;

        clearTimer();
        abortRequest();
        destroyAudio();

        state.lastError = '';

        log('Stopped:', reason || 'manual');
    }

    function normalizeTitle(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extractYear(movie) {
        if (!movie) return 0;

        var date =
            movie.release_date ||
            movie.first_air_date ||
            movie.year ||
            '';

        var match = String(date).match(
            /\b(19|20)\d{2}\b/
        );

        return match
            ? Number(match[0])
            : 0;
    }

    function getMovieObject(event) {
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
            var candidate = candidates[i];

            if (
                candidate &&
                typeof candidate === 'object' &&
                (
                    candidate.id ||
                    candidate.title ||
                    candidate.name ||
                    candidate.original_title
                )
            ) {
                return candidate;
            }
        }

        return null;
    }

    function isTestMovie(movie) {
        if (!movie) return false;

        var id = Number(
            movie.id ||
            movie.tmdb_id ||
            0
        );

        var title = normalizeTitle(
            movie.original_title ||
            movie.title ||
            movie.name ||
            ''
        );

        var year = extractYear(movie);

        if (id === TEST_MOVIE.tmdb) {
            return true;
        }

        var validTitle =
            title === 'gladiator' ||
            title === 'гладіатор' ||
            title === 'гладиатор';

        return validTitle &&
            year === TEST_MOVIE.year;
    }

    function isCardVisible() {
        try {
            return Boolean(
                document.querySelector(
                    '.full-start'
                ) ||
                document.querySelector(
                    '.full-descr'
                ) ||
                document.querySelector(
                    '.full-review'
                )
            );
        } catch (e) {
            return false;
        }
    }

    function makeWorkerURL() {
        var url =
            WORKER +
            '?id=' +
            encodeURIComponent(
                TEST_MOVIE.kinorium
            );

        var track = String(
            getSetting('track') ||
            DEFAULTS.track
        );

        if (track && track !== 'auto') {
            url +=
                '&track=' +
                encodeURIComponent(track);
        }

        return url;
    }

    function loadSoundtrack(generation) {
        if (
            generation !== state.generation ||
            !state.cardOpen ||
            !enabled()
        ) {
            return;
        }

        abortRequest();

        var xhr = new XMLHttpRequest();

        state.request = xhr;

        var url = makeWorkerURL();

        log('Request:', url);

        xhr.open('GET', url, true);
        xhr.timeout = 20000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }

            if (state.request === xhr) {
                state.request = null;
            }

            if (
                generation !== state.generation ||
                !state.cardOpen
            ) {
                return;
            }

            if (
                xhr.status < 200 ||
                xhr.status >= 300
            ) {
                state.lastError =
                    'HTTP ' + xhr.status;

                log('Worker error:', state.lastError);
                return;
            }

            var result;

            try {
                result = JSON.parse(
                    xhr.responseText
                );
            } catch (e) {
                state.lastError =
                    'Invalid JSON';

                log(state.lastError);
                return;
            }

            if (
                !result ||
                !result.found ||
                !result.audioUrl
            ) {
                state.lastError =
                    result && result.reason ||
                    'No audio';

                log(
                    'No soundtrack:',
                    state.lastError
                );

                return;
            }

            log(
                'Track:',
                result.track &&
                result.track.name
            );

            playAudio(
                result.audioUrl,
                generation
            );
        };

        xhr.onerror = function () {
            if (
                generation !== state.generation
            ) {
                return;
            }

            state.lastError =
                'Network error';

            log(state.lastError);
        };

        xhr.ontimeout = function () {
            if (
                generation !== state.generation
            ) {
                return;
            }

            state.lastError =
                'Request timeout';

            log(state.lastError);
        };

        try {
            xhr.send();
        } catch (e) {
            state.lastError = String(e);
            log('Request failed:', e);
        }
    }

    function playAudio(url, generation) {
        if (
            generation !== state.generation ||
            !state.cardOpen ||
            !enabled()
        ) {
            return;
        }

        destroyAudio();

        var audio;

        try {
            audio = new Audio();
        } catch (e) {
            state.lastError =
                'HTML5 Audio unavailable';

            log(state.lastError);
            return;
        }

        state.audio = audio;

        audio.preload = 'auto';

        audio.loop =
            getSetting('loop') !== false;

        audio.volume = Math.max(
            0,
            Math.min(
                1,
                Number(
                    getSetting('volume')
                ) / 100
            )
        );

        audio.onended = function () {
            if (
                generation !== state.generation ||
                !state.cardOpen
            ) {
                return;
            }

            if (
                getSetting('loop') !== false
            ) {
                try {
                    audio.currentTime = 0;

                    var promise =
                        audio.play();

                    if (
                        promise &&
                        typeof promise.catch ===
                        'function'
                    ) {
                        promise.catch(
                            function (error) {
                                log(
                                    'Loop error:',
                                    error
                                );
                            }
                        );
                    }
                } catch (e) {
                    log('Loop failed:', e);
                }
            }
        };

        audio.onerror = function () {
            if (
                generation !== state.generation
            ) {
                return;
            }

            var code =
                audio.error &&
                audio.error.code;

            state.lastError =
                'Audio error ' +
                (code || 'unknown');

            log(
                state.lastError,
                audio.error
            );
        };

        audio.src = url;

        try {
            audio.load();

            var promise = audio.play();

            if (
                promise &&
                typeof promise.then ===
                'function'
            ) {
                promise.then(function () {
                    if (
                        generation !==
                        state.generation
                    ) {
                        return;
                    }

                    log('Playback started');
                }).catch(function (error) {
                    if (
                        generation !==
                        state.generation
                    ) {
                        return;
                    }

                    state.lastError =
                        String(
                            error &&
                            error.message ||
                            error
                        );

                    log(
                        'Playback rejected:',
                        state.lastError
                    );
                });
            }
        } catch (e) {
            state.lastError =
                String(e);

            log('Audio failed:', e);
        }
    }

    function schedulePlayback(movie) {
        stopPlayback('new_card');

        state.currentMovie = movie;
        state.cardOpen = true;

        if (!enabled()) return;

        if (
            getSetting('autoplay') === false
        ) {
            log('Autoplay disabled');
            return;
        }

        if (!isTestMovie(movie)) {
            log(
                'Not test movie:',
                movie &&
                (
                    movie.title ||
                    movie.name
                )
            );

            return;
        }

        var generation =
            state.generation;

        var delay = Math.max(
            0,
            Number(
                getSetting('delay')
            ) || 0
        );

        log(
            'Gladiator detected. Delay:',
            delay
        );

        state.timer = setTimeout(
            function () {
                state.timer = null;

                if (
                    generation !==
                    state.generation ||
                    !state.cardOpen
                ) {
                    return;
                }

                loadSoundtrack(
                    generation
                );
            },
            delay
        );
    }

    function handleCardEvent(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (
            type === 'complite' ||
            type === 'complete'
        ) {
            var movie =
                getMovieObject(event);

            if (!movie) {
                log(
                    'Card event without movie'
                );
                return;
            }

            schedulePlayback(movie);
            return;
        }

        if (
            type === 'destroy' ||
            type === 'close' ||
            type === 'back'
        ) {
            state.cardOpen = false;
            state.currentMovie = null;

            stopPlayback(
                'card_' + type
            );
        }
    }

    function addSettings() {
        if (
            !window.Lampa ||
            !Lampa.SettingsApi ||
            typeof Lampa.SettingsApi.addParam !==
            'function'
        ) {
            log(
                'Settings API unavailable'
            );
            return;
        }

        try {
            Lampa.SettingsApi.addComponent({
                component: 'kinorium_ost',
                name: 'Kinorium OST',
                icon:
                    '<svg width="24" height="24" ' +
                    'viewBox="0 0 24 24" ' +
                    'fill="none" stroke="currentColor" ' +
                    'stroke-width="2" ' +
                    'stroke-linecap="round" ' +
                    'stroke-linejoin="round">' +
                    '<path d="M9 18V5l12-2v13"/>' +
                    '<circle cx="6" cy="18" r="3"/>' +
                    '<circle cx="18" cy="16" r="3"/>' +
                    '</svg>'
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'enabled',
                    type: 'trigger',
                    default: true
                },
                field: {
                    name:
                        'Увімкнути Kinorium OST',
                    description:
                        'Окреме тестове джерело музики'
                },
                onChange: function (value) {
                    setSetting(
                        'enabled',
                        value
                    );

                    stopPlayback(
                        'settings_enabled'
                    );
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'autoplay',
                    type: 'trigger',
                    default: true
                },
                field: {
                    name:
                        'Автоматичне відтворення',
                    description:
                        'Запускати музику при відкритті картки'
                },
                onChange: function (value) {
                    setSetting(
                        'autoplay',
                        value
                    );

                    stopPlayback(
                        'settings_autoplay'
                    );
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'loop',
                    type: 'trigger',
                    default: true
                },
                field: {
                    name:
                        'Повторювати композицію',
                    description:
                        'Зациклити аудіофрагмент'
                },
                onChange: function (value) {
                    setSetting(
                        'loop',
                        value
                    );

                    if (state.audio) {
                        state.audio.loop =
                            value !== false;
                    }
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'track',
                    type: 'select',
                    values: {
                        'The Battle':
                            'The Battle',
                        'Elysium':
                            'Elysium',
                        'Now We Are Free':
                            'Now We Are Free'
                    },
                    default: 'The Battle'
                },
                field: {
                    name:
                        'Головна композиція',
                    description:
                        'Тестові теми фільму Гладіатор'
                },
                onChange: function (value) {
                    setSetting(
                        'track',
                        value
                    );

                    if (
                        state.cardOpen &&
                        state.currentMovie &&
                        isTestMovie(
                            state.currentMovie
                        )
                    ) {
                        schedulePlayback(
                            state.currentMovie
                        );
                    }
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'volume',
                    type: 'select',
                    values: {
                        '20': '20%',
                        '35': '35%',
                        '50': '50%',
                        '65': '65%',
                        '80': '80%',
                        '100': '100%'
                    },
                    default: '65'
                },
                field: {
                    name:
                        'Гучність музики',
                    description:
                        'Гучність аудіофрагмента'
                },
                onChange: function (value) {
                    setSetting(
                        'volume',
                        Number(value)
                    );

                    if (state.audio) {
                        state.audio.volume =
                            Math.max(
                                0,
                                Math.min(
                                    1,
                                    Number(value) /
                                    100
                                )
                            );
                    }
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'kinorium_ost',
                param: {
                    name:
                        STORAGE_PREFIX + 'delay',
                    type: 'select',
                    values: {
                        '0': 'Одразу',
                        '1000': '1 секунда',
                        '2000': '2 секунди',
                        '3000': '3 секунди',
                        '5000': '5 секунд'
                    },
                    default: '2000'
                },
                field: {
                    name:
                        'Затримка запуску',
                    description:
                        'Час перед відтворенням музики'
                },
                onChange: function (value) {
                    setSetting(
                        'delay',
                        Number(value)
                    );
                }
            });

            log('Settings registered');
        } catch (e) {
            log(
                'Settings error:',
                e
            );
        }
    }

    function init() {
        if (state.initialized) return;

        if (
            !window.Lampa ||
            !Lampa.Listener ||
            !Lampa.Listener.follow
        ) {
            setTimeout(init, 500);
            return;
        }

        state.initialized = true;

        addSettings();

        Lampa.Listener.follow(
            'full',
            handleCardEvent
        );

        window.addEventListener(
            'pagehide',
            function () {
                state.cardOpen = false;
                stopPlayback('pagehide');
            }
        );

        log(
            'Kinorium OST ' +
            VERSION +
            ' initialized'
        );
    }

    init();

})();
