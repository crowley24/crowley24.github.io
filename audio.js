
(function () {
    'use strict';

    /*
     * Original Soundtrack 1.1.0
     * Lampa / Android TV
     * Audio diagnostics + soundtrack playback
     */

    var VERSION = '1.1.0';
    var PREFIX = 'ost10_';
    var COMPONENT = 'original_soundtrack';

    if (window.ost110_ready) return;
    window.ost110_ready = true;

    var audio = null;
    var startTimer = null;
    var fadeTimer = null;
    var operation = 0;
    var currentId = '';
    var cardActive = false;
    var initialized = false;

    var testContext = null;
    var testNodes = [];
    var testTimer = null;
    var testActive = false;

    var defaults = {
        enabled: true,
        volume: '20',
        delay: '2',
        fade: true,
        loop: true,
        series: false
    };

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

    function bool(value) {
        return value === true ||
               value === 'true' ||
               value === 1 ||
               value === '1';
    }

    function number(value, fallback) {
        var n = Number(value);
        return isFinite(n) ? n : fallback;
    }

    function volume() {
        return Math.max(
            0,
            Math.min(1, number(get('volume'), 20) / 100)
        );
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            console.log('[OST]', message);
        }
    }

    function clearTimers() {
        clearTimeout(startTimer);
        clearInterval(fadeTimer);
        startTimer = null;
        fadeTimer = null;
    }

    function ensureAudio() {
        if (audio) return audio;

        audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.loop = bool(get('loop'));
        audio.volume = 0;

        audio.addEventListener('error', function () {
            if (audio.error) {
                console.warn(
                    '[OST] Audio error:',
                    audio.error.code
                );
            }
        });

        return audio;
    }

    function stopPlayback() {
        operation++;
        clearTimers();

        cardActive = false;
        currentId = '';

        if (audio) {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.volume = 0;
        }
    }

    function fadeIn() {
        if (!audio) return;

        clearInterval(fadeTimer);

        var target = volume();

        if (!bool(get('fade'))) {
            audio.volume = target;
            return;
        }

        var step = 0;
        var steps = 20;

        audio.volume = 0;

        fadeTimer = setInterval(function () {
            if (!audio || audio.paused) {
                clearInterval(fadeTimer);
                fadeTimer = null;
                return;
            }

            step++;

            audio.volume = Math.min(
                target,
                target * step / steps
            );

            if (step >= steps) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 100);
    }

    function library() {
        try {
            var raw = Lampa.Storage.get(
                PREFIX + 'library',
                '{}'
            );

            var data = JSON.parse(raw);

            return data &&
                   typeof data === 'object' &&
                   !Array.isArray(data)
                ? data
                : {};
        } catch (e) {
            return {};
        }
    }

    function saveTrack(id, url) {
        if (!id || !url) return false;

        var data = library();
        data[String(id)] = String(url).trim();

        Lampa.Storage.set(
            PREFIX + 'library',
            JSON.stringify(data)
        );

        return true;
    }

    function removeTrack(id) {
        var data = library();
        delete data[String(id)];

        Lampa.Storage.set(
            PREFIX + 'library',
            JSON.stringify(data)
        );
    }

    function validUrl(url) {
        return /^https?:\/\/\S+$/i.test(url || '');
    }

    function playTrack(url, id, token) {
        if (!cardActive ||
            token !== operation ||
            id !== currentId) return;

        if (!validUrl(url)) return;

        stopTest();

        var player = ensureAudio();

        player.pause();
        player.src = url;
        player.loop = bool(get('loop'));
        player.volume = 0;

        try {
            var promise = player.play();

            if (promise && promise.then) {
                promise.then(function () {
                    if (token !== operation ||
                        !cardActive) {
                        player.pause();
                        return;
                    }

                    fadeIn();
                }).catch(function (error) {
                    console.warn(
                        '[OST] Playback error:',
                        error
                    );
                });
            } else {
                fadeIn();
            }
        } catch (e) {
            console.warn('[OST] Play failed:', e);
        }
    }

    function openCard(card) {
        if (!bool(get('enabled')) ||
            !card ||
            !card.id) {
            stopPlayback();
            return;
        }

        var isSeries =
            card.first_air_date !== undefined ||
            card.number_of_seasons !== undefined;

        if (isSeries && !bool(get('series'))) {
            stopPlayback();
            return;
        }

        var id = String(card.id);

        if (cardActive && currentId === id) return;

        stopPlayback();

        cardActive = true;
        currentId = id;

        var url = library()[id];
        var token = operation;

        if (!url) {
            console.log('[OST] No track:', id);
            return;
        }

        var delay = Math.max(
            0,
            number(get('delay'), 2)
        );

        startTimer = setTimeout(function () {
            playTrack(url, id, token);
        }, delay * 1000);
    }

    function extractCard(event) {
        if (!event) return null;

        var data = event.data || event;

        return data.movie ||
               data.card ||
               data.object ||
               (data.id ? data : null);
    }

    function stopTest() {
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
                testContext.close();
            } catch (e) {}
            testContext = null;
        }

        testActive = false;
    }

    function testSound() {
        stopPlayback();
        stopTest();

        var AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            notify('Web Audio API не підтримується');
            return;
        }

        try {
            var ctx = new AudioContextClass();
            testContext = ctx;
            testActive = true;

            var master = ctx.createGain();
            master.gain.value = volume();
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
                var oscillator = ctx.createOscillator();
                var gain = ctx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.value = note[0];

                var start = now + note[1];
                var end = start + note[2];

                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(
                    0.5, start + 0.05
                );
                gain.gain.exponentialRampToValueAtTime(
                    0.001, end
                );

                oscillator.connect(gain);
                gain.connect(master);

                oscillator.start(start);
                oscillator.stop(end + 0.05);

                testNodes.push(oscillator);
            });

            if (ctx.state === 'suspended') {
                ctx.resume().catch(function (error) {
                    console.warn(
                        '[OST] AudioContext resume:',
                        error
                    );
                });
            }

            testTimer = setTimeout(function () {
                stopTest();
            }, 8000);

            notify('Тест звуку запущено');

        } catch (e) {
            stopTest();
            console.error('[OST] Test error:', e);
            notify('Не вдалося запустити тест');
        }
    }

    function registerListeners() {
        if (!Lampa.Listener ||
            !Lampa.Listener.follow) return;

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
                stopTest();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (event.type === 'start' &&
                event.component !== 'full') {
                stopPlayback();
            }
        });
    }

    function registerSettings() {
        var api = Lampa.SettingsApi;

        api.addComponent({
            component: COMPONENT,
            name: 'Original Soundtrack',
            icon: 'music'
        });

        function trigger(key, title, description) {
            api.addParam({
                component: COMPONENT,
                param: {
                    name: PREFIX + key,
                    type: 'trigger',
                    default: defaults[key]
                },
                field: {
                    name: title,
                    description: description || ''
                },
                onChange: function (value) {
                    if (key === 'enabled' &&
                        !bool(value)) {
                        stopPlayback();
                    }

                    if (key === 'loop' && audio) {
                        audio.loop = bool(value);
                    }
                }
            });
        }

        function select(key, title, values) {
            api.addParam({
                component: COMPONENT,
                param: {
                    name: PREFIX + key,
                    type: 'select',
                    default: defaults[key],
                    values: values
                },
                field: {
                    name: title
                },
                onChange: function (value) {
                    if (key === 'volume' &&
                        audio &&
                        !audio.paused) {
                        audio.volume = Math.max(
                            0,
                            Math.min(1, Number(value) / 100)
                        );
                    }
                }
            });
        }

        trigger(
            'enabled',
            'Увімкнути саундтреки',
            'Автоматична фонова музика'
        );

        select('volume', 'Гучність музики', {
            '10': '10%',
            '15': '15%',
            '20': '20%',
            '25': '25%',
            '30': '30%',
            '40': '40%',
            '50': '50%'
        });

        select('delay', 'Затримка запуску', {
            '0': 'Без затримки',
            '1': '1 секунда',
            '2': '2 секунди',
            '3': '3 секунди',
            '5': '5 секунд'
        });

        trigger(
            'fade',
            'Плавне наростання',
            'Fade In протягом 2 секунд'
        );

        trigger(
            'loop',
            'Повторювати музику',
            'Безперервне відтворення'
        );

        trigger(
            'series',
            'Підтримка серіалів',
            'Фонова музика для серіалів'
        );

        api.addParam({
            component: COMPONENT,
            param: {
                name: PREFIX + 'test_sound',
                type: 'static'
            },
            field: {
                name: 'Перевірити звук',
                description: 'Відтворити тестову мелодію'
            },
            onChange: function () {
                testSound();
            }
        });

        api.addParam({
            component: COMPONENT,
            param: {
                name: PREFIX + 'stop_test',
                type: 'static'
            },
            field: {
                name: 'Зупинити тест',
                description: 'Негайно вимкнути звук'
            },
            onChange: function () {
                stopTest();
                notify('Тест зупинено');
            }
        });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        registerListeners();

        try {
            registerSettings();
        } catch (e) {
            console.error(
                '[OST] Settings error:',
                e
            );
        }

        window.OriginalSoundtrack = {
            version: VERSION,
            test: testSound,
            stopTest: stopTest,
            stop: function () {
                stopPlayback();
                stopTest();
            },
            add: function (id, url) {
                if (!validUrl(url)) return false;

                return saveTrack(id, url);
            },
            remove: removeTrack,
            library: library,
            status: function () {
                return {
                    version: VERSION,
                    currentId: currentId,
                    active: cardActive,
                    testActive: testActive,
                    playing: !!audio && !audio.paused
                };
            }
        };

        console.log(
            '[OST] Original Soundtrack ' +
            VERSION + ' ready'
        );
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
            console.warn('[OST] Lampa init timeout');
        }
    }, 500);

})();
