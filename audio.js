
(function () {
    'use strict';

    /*
     * Original Soundtrack 1.2.0
     * Lampa / Android TV
     *
     * - Web Audio diagnostic test
     * - External MP3 test on movie cards
     * - TMDB ID soundtrack library
     * - 30-second fragment looping
     * - Fade in / fade out
     * - Stop on card exit / player launch
     *
     * External demo audio:
     * MDN CC0 audio example (sound effect).
     */

    var VERSION = '1.2.0';
    var PREFIX = 'ost10_';
    var COMPONENT = 'original_soundtrack';

    if (window.ost120_ready) return;
    window.ost120_ready = true;

    var DEMO_URL =
        'https://interactive-examples.mdn.mozilla.net/' +
        'media/cc0-audio/t-rex-roar.mp3';

    var defaults = {
        enabled: true,
        volume: '20',
        delay: '2',
        fade: true,
        loop: true,
        series: false,
        demo_card: false,
        test_sound: false,
        fragment: '30'
    };

    var audio = null;
    var playTimer = null;
    var fadeTimer = null;
    var operation = 0;

    var cardActive = false;
    var currentId = '';
    var currentUrl = '';
    var currentIsDemo = false;

    var initialized = false;

    var testContext = null;
    var testNodes = [];
    var testTimer = null;
    var testActive = false;

    var audioUnlocked = false;

    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[OST 1.2]');
            console.log.apply(console, args);
        } catch (e) {}
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            log(message);
        }
    }

    function get(key) {
        try {
            var value = Lampa.Storage.get(
                PREFIX + key,
                defaults[key]
            );

            return value == null
                ? defaults[key]
                : value;
        } catch (e) {
            return defaults[key];
        }
    }

    function set(key, value) {
        try {
            Lampa.Storage.set(
                PREFIX + key,
                value
            );
        } catch (e) {
            log('Storage error', e);
        }
    }

    function bool(value) {
        return value === true ||
               value === 'true' ||
               value === 1 ||
               value === '1';
    }

    function num(value, fallback) {
        var result = Number(value);

        return isFinite(result)
            ? result
            : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function targetVolume() {
        return clamp(
            num(get('volume'), 20) / 100,
            0,
            1
        );
    }

    function validUrl(url) {
        return typeof url === 'string' &&
               /^https?:\/\/\S+$/i.test(url.trim());
    }

    function library() {
        try {
            var raw = Lampa.Storage.get(
                PREFIX + 'library',
                '{}'
            );

            var data = typeof raw === 'string'
                ? JSON.parse(raw)
                : raw;

            if (data &&
                typeof data === 'object' &&
                !Array.isArray(data)) {
                return data;
            }
        } catch (e) {
            log('Library error', e);
        }

        return {};
    }

    function saveLibrary(data) {
        set('library', JSON.stringify(data));
    }

    function addTrack(id, url) {
        if (!id || !validUrl(url)) {
            return false;
        }

        var data = library();

        data[String(id)] = url.trim();

        saveLibrary(data);

        log('Track added', id);

        return true;
    }

    function removeTrack(id) {
        var data = library();

        delete data[String(id)];

        saveLibrary(data);
    }

    function ensureAudio() {
        if (audio) return audio;

        audio = document.createElement('audio');

        audio.preload = 'auto';
        audio.volume = 0;
        audio.loop = false;

        audio.setAttribute(
            'playsinline',
            'playsinline'
        );

        audio.addEventListener(
            'loadedmetadata',
            function () {
                log(
                    'Audio metadata loaded',
                    audio.duration
                );
            }
        );

        audio.addEventListener(
            'playing',
            function () {
                log('Audio playing');
            }
        );

        audio.addEventListener(
            'error',
            function () {
                if (!audio.error) return;

                log(
                    'Audio error',
                    audio.error.code,
                    audio.error.message || ''
                );
            }
        );

        audio.addEventListener(
            'timeupdate',
            function () {
                if (!cardActive ||
                    !bool(get('loop'))) {
                    return;
                }

                var limit = clamp(
                    num(get('fragment'), 30),
                    10,
                    60
                );

                if (audio.currentTime >= limit) {
                    try {
                        audio.currentTime = 0;
                    } catch (e) {}
                }
            }
        );

        audio.addEventListener(
            'ended',
            function () {
                if (!cardActive ||
                    !bool(get('loop'))) {
                    return;
                }

                try {
                    audio.currentTime = 0;

                    var promise = audio.play();

                    if (promise && promise.catch) {
                        promise.catch(function (e) {
                            log('Loop error', e);
                        });
                    }
                } catch (e) {
                    log('Loop restart failed', e);
                }
            }
        );

        /*
         * Append audio element to the document
         * for compatibility with some WebViews.
         */
        audio.style.display = 'none';

        try {
            (document.body ||
             document.documentElement).appendChild(audio);
        } catch (e) {}

        return audio;
    }

    function clearPlaybackTimers() {
        clearTimeout(playTimer);
        clearInterval(fadeTimer);

        playTimer = null;
        fadeTimer = null;
    }

    function releaseAudio() {
        if (!audio) return;

        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.volume = 0;
        } catch (e) {
            log('Release error', e);
        }
    }

    function stopPlayback() {
        operation++;

        clearPlaybackTimers();

        cardActive = false;
        currentId = '';
        currentUrl = '';
        currentIsDemo = false;

        releaseAudio();
    }

    function fadeIn(token) {
        if (!audio) return;

        clearInterval(fadeTimer);

        var target = targetVolume();

        if (!bool(get('fade'))) {
            audio.volume = target;
            return;
        }

        var step = 0;
        var steps = 20;

        audio.volume = 0;

        fadeTimer = setInterval(function () {
            if (!audio ||
                audio.paused ||
                token !== operation) {

                clearInterval(fadeTimer);
                fadeTimer = null;
                return;
            }

            step++;

            audio.volume = clamp(
                target * step / steps,
                0,
                target
            );

            if (step >= steps) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 100);
    }

    function fadeOut(callback) {
        if (!audio || audio.paused) {
            if (callback) callback();
            return;
        }

        clearInterval(fadeTimer);

        var initial = audio.volume;
        var step = 0;
        var steps = 8;

        fadeTimer = setInterval(function () {
            step++;

            if (audio) {
                audio.volume = clamp(
                    initial * (1 - step / steps),
                    0,
                    1
                );
            }

            if (step >= steps) {
                clearInterval(fadeTimer);
                fadeTimer = null;

                if (callback) callback();
            }
        }, 50);
    }

    function playUrl(url, id, token) {
        if (!cardActive ||
            token !== operation ||
            currentId !== id) {
            return;
        }

        if (!validUrl(url)) return;

        stopTest(false);

        var player = ensureAudio();

        try {
            player.pause();

            player.src = url;
            player.volume = 0;
            player.loop = false;

            player.load();

            var result = player.play();

            if (result && result.then) {
                result.then(function () {
                    if (!cardActive ||
                        token !== operation) {
                        player.pause();
                        return;
                    }

                    audioUnlocked = true;

                    fadeIn(token);
                }).catch(function (error) {
                    log('External audio blocked', error);

                    if (token === operation) {
                        notify(
                            'OST: зовнішній звук не запустився'
                        );
                    }
                });
            } else {
                audioUnlocked = true;
                fadeIn(token);
            }
        } catch (e) {
            log('Playback exception', e);

            notify('OST: помилка відтворення MP3');
        }
    }

    function isSeries(card) {
        return !!(
            card &&
            (
                card.number_of_seasons !== undefined ||
                card.first_air_date !== undefined ||
                card.media_type === 'tv'
            )
        );
    }

    function extractCard(event) {
        if (!event) return null;

        var data = event.data || event;

        if (data.movie && data.movie.id) {
            return data.movie;
        }

        if (data.card && data.card.id) {
            return data.card;
        }

        if (data.object && data.object.id) {
            return data.object;
        }

        if (data.data && data.data.id) {
            return data.data;
        }

        if (data.id) {
            return data;
        }

        return null;
    }

    function resolveUrl(id) {
        var tracks = library();
        var url = tracks[String(id)];

        if (validUrl(url)) {
            return {
                url: url,
                demo: false
            };
        }

        if (bool(get('demo_card'))) {
            return {
                url: DEMO_URL,
                demo: true
            };
        }

        return null;
    }

    function openCard(card) {
        if (!card || !card.id) return;

        if (!bool(get('enabled'))) {
            stopPlayback();
            return;
        }

        if (isSeries(card) &&
            !bool(get('series'))) {
            stopPlayback();
            return;
        }

        var id = String(card.id);

        if (cardActive && currentId === id) {
            return;
        }

        stopPlayback();

        cardActive = true;
        currentId = id;

        var source = resolveUrl(id);

        if (!source) {
            log('No soundtrack for TMDB', id);
            return;
        }

        currentUrl = source.url;
        currentIsDemo = source.demo;

        var token = operation;

        var delay = clamp(
            num(get('delay'), 2),
            0,
            10
        );

        log(
            'Opening card',
            id,
            source.demo ? 'DEMO' : 'TRACK'
        );

        playTimer = setTimeout(function () {
            playUrl(
                source.url,
                id,
                token
            );
        }, delay * 1000);
    }

    /*
     * Web Audio diagnostic melody
     */

    function stopTest(resetSwitch) {
        clearTimeout(testTimer);
        testTimer = null;

        testNodes.forEach(function (node) {
            try {
                node.stop();
            } catch (e) {}

            try {
                node.disconnect();
            } catch (e) {}
        });

        testNodes = [];

        if (testContext) {
            try {
                var result = testContext.close();

                if (result && result.catch) {
                    result.catch(function () {});
                }
            } catch (e) {}

            testContext = null;
        }

        testActive = false;

        if (resetSwitch) {
            set('test_sound', false);
        }
    }

    function testSound() {
        stopPlayback();
        stopTest(false);

        var Context =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!Context) {
            notify('Web Audio не підтримується');
            set('test_sound', false);
            return;
        }

        try {
            var ctx = new Context();

            testContext = ctx;
            testActive = true;

            var master = ctx.createGain();

            master.gain.value = targetVolume();
            master.connect(ctx.destination);

            var notes = [
                [261.63, 0.00, 0.65],
                [329.63, 0.75, 0.65],
                [392.00, 1.50, 0.65],
                [523.25, 2.25, 0.95],
                [392.00, 3.40, 0.65],
                [329.63, 4.20, 0.65],
                [293.66, 5.00, 0.65],
                [261.63, 5.80, 1.20]
            ];

            var now = ctx.currentTime + 0.1;

            notes.forEach(function (note) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = note[0];

                var start = now + note[1];
                var end = start + note[2];

                gain.gain.setValueAtTime(0, start);

                gain.gain.linearRampToValueAtTime(
                    0.5,
                    start + 0.05
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.001,
                    end
                );

                osc.connect(gain);
                gain.connect(master);

                osc.start(start);
                osc.stop(end + 0.05);

                testNodes.push(osc);
            });

            if (ctx.state === 'suspended') {
                var resume = ctx.resume();

                if (resume && resume.catch) {
                    resume.catch(function (e) {
                        log('Web Audio resume error', e);
                    });
                }
            }

            testTimer = setTimeout(function () {
                stopTest(true);
            }, 8000);

            notify('OST: тестова мелодія запущена');
        } catch (e) {
            stopTest(true);

            log('Web Audio error', e);
            notify('OST: помилка звукового тесту');
        }
    }

    /*
     * Lampa lifecycle
     */

    function registerListeners() {
        Lampa.Listener.follow('full', function (event) {
            if (!event || !event.type) return;

            if (event.type === 'complite' ||
                event.type === 'complete') {

                var card = extractCard(event);

                if (card && card.id) {
                    openCard(card);
                }
            }

            if (event.type === 'destroy' ||
                event.type === 'close') {
                stopPlayback();
            }
        });

        Lampa.Listener.follow('player', function (event) {
            if (!event) return;

            if (event.type === 'start' ||
                event.type === 'play' ||
                event.type === 'open') {

                stopPlayback();
                stopTest(true);
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (event.type === 'start' &&
                event.component &&
                event.component !== 'full') {
                stopPlayback();
            }
        });
    }

    /*
     * Settings
     */

    function registerSettings() {
        var api = Lampa.SettingsApi;

        api.addComponent({
            component: COMPONENT,
            name: 'Original Soundtrack',
            icon: 'music'
        });

        function trigger(key, name, description, onChange) {
            api.addParam({
                component: COMPONENT,
                param: {
                    name: PREFIX + key,
                    type: 'trigger',
                    default: defaults[key]
                },
                field: {
                    name: name,
                    description: description || ''
                },
                onChange: function (value) {
                    if (onChange) onChange(value);
                }
            });
        }

        function select(key, name, values, onChange) {
            api.addParam({
                component: COMPONENT,
                param: {
                    name: PREFIX + key,
                    type: 'select',
                    default: defaults[key],
                    values: values
                },
                field: {
                    name: name
                },
                onChange: function (value) {
                    if (onChange) onChange(value);
                }
            });
        }

        trigger(
            'enabled',
            'Увімкнути саундтреки',
            'Фонова музика в картках фільмів',
            function (value) {
                if (!bool(value)) {
                    stopPlayback();
                }
            }
        );

        select(
            'volume',
            'Гучність музики',
            {
                '10': '10%',
                '15': '15%',
                '20': '20%',
                '25': '25%',
                '30': '30%',
                '40': '40%',
                '50': '50%'
            },
            function (value) {
                if (audio && !audio.paused) {
                    audio.volume = clamp(
                        num(value, 20) / 100,
                        0,
                        1
                    );
                }
            }
        );

        select(
            'delay',
            'Затримка запуску',
            {
                '0': 'Без затримки',
                '1': '1 секунда',
                '2': '2 секунди',
                '3': '3 секунди',
                '5': '5 секунд'
            }
        );

        select(
            'fragment',
            'Тривалість фрагмента',
            {
                '10': '10 секунд',
                '20': '20 секунд',
                '30': '30 секунд',
                '45': '45 секунд',
                '60': '60 секунд'
            }
        );

        trigger(
            'fade',
            'Плавне наростання',
            'Fade In протягом 2 секунд'
        );

        trigger(
            'loop',
            'Повторювати музику',
            'Повторювати обраний фрагмент'
        );

        trigger(
            'series',
            'Підтримка серіалів',
            'Відтворювати музику для серіалів'
        );

        trigger(
            'demo_card',
            'Тест MP3 у картці',
            'Відтворювати тестовий аудіоефект MDN, якщо немає саундтреку',
            function (value) {
                if (!bool(value) && currentIsDemo) {
                    stopPlayback();
                }
            }
        );

        trigger(
            'test_sound',
            'Перевірити звук',
            'Увімкнути для запуску тестової мелодії',
            function (value) {
                if (bool(value)) {
                    testSound();
                } else {
                    stopTest(false);
                }
            }
        );
    }

    /*
     * Public API
     */

    function registerPublicApi() {
        window.OriginalSoundtrack = {
            version: VERSION,

            test: testSound,

            stopTest: function () {
                stopTest(true);
            },

            stop: function () {
                stopPlayback();
                stopTest(true);
            },

            add: function (id, url) {
                var result = addTrack(id, url);

                notify(
                    result
                        ? 'OST: саундтрек збережено'
                        : 'OST: некоректне посилання'
                );

                return result;
            },

            remove: function (id) {
                removeTrack(id);
                notify('OST: саундтрек видалено');
            },

            library: library,

            /*
             * Manual external audio test.
             * Not linked to a movie card.
             */
            testMp3: function () {
                stopPlayback();
                stopTest(true);

                var player = ensureAudio();

                player.pause();
                player.src = DEMO_URL;
                player.volume = targetVolume();
                player.loop = false;

                var result = player.play();

                if (result && result.catch) {
                    result.catch(function (e) {
                        log('Manual MP3 test failed', e);
                        notify('OST: MP3 не запустився');
                    });
                }

                return result;
            },

            status: function () {
                return {
                    version: VERSION,
                    currentId: currentId,
                    cardActive: cardActive,
                    currentIsDemo: currentIsDemo,
                    testActive: testActive,
                    audioUnlocked: audioUnlocked,
                    playing: !!audio && !audio.paused,
                    audioUrl: currentUrl
                };
            }
        };
    }

    function init() {
        if (initialized) return;
        initialized = true;

        /*
         * Reset saved diagnostic switch.
         */
        set('test_sound', false);

        registerPublicApi();
        registerListeners();

        try {
            registerSettings();
        } catch (e) {
            log('Settings error', e);
        }

        log('Original Soundtrack ' + VERSION + ' ready');
    }

    var attempts = 0;

    var wait = setInterval(function () {
        attempts++;

        if (window.Lampa &&
            Lampa.Storage &&
            Lampa.Listener &&
            Lampa.SettingsApi) {

            clearInterval(wait);
            init();
        }

        if (attempts >= 60) {
            clearInterval(wait);

            log('Initialization timeout');
        }
    }, 500);

})();
