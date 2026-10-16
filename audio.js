
(function () {
    'use strict';

    /* Original Soundtrack — OSTMusic Test 1.0 */

    if (window.ostmusic_test_100) return;
    window.ostmusic_test_100 = true;

    var NAME = 'OSTMusic Test';
    var AUDIO_URL =
        'https://www.ostmusic.org/?format=raw&id=1293&view=file';

    var audio = null;
    var timer = null;
    var fadeTimer = null;
    var generation = 0;
    var cardActive = false;
    var cardId = '';
    var enabled = false;

    var volume = 0.20;
    var delay = 2000;
    var fragment = 30;

    function notify(message) {
        console.log('[OSTMusic Test] ' + message);

        try {
            if (window.Lampa &&
                Lampa.Noty &&
                typeof Lampa.Noty.show === 'function') {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    function clearTimers() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        if (fadeTimer) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function stop() {
        generation++;
        clearTimers();

        if (audio) {
            try {
                audio.pause();
                audio.removeAttribute('src');
                audio.load();
            } catch (e) {}

            audio = null;
        }
    }

    function startFade(player, token) {
        var steps = 20;
        var step = 0;

        player.volume = 0;

        fadeTimer = setInterval(function () {
            if (token !== generation ||
                audio !== player) {
                clearInterval(fadeTimer);
                fadeTimer = null;
                return;
            }

            step++;

            try {
                player.volume =
                    volume * Math.min(step / steps, 1);
            } catch (e) {}

            if (step >= steps) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 100);
    }

    function play() {
        stop();

        var token = generation;
        var player = new Audio();

        audio = player;

        player.preload = 'auto';
        player.volume = 0;
        player.src = AUDIO_URL;

        player.addEventListener('error', function () {
            if (token !== generation) return;

            var code = player.error
                ? player.error.code
                : 'unknown';

            notify('OSTMusic: помилка аудіо (' + code + ')');
            stop();
        });

        player.addEventListener('playing', function () {
            if (token !== generation) return;

            notify('OSTMusic: аудіо відтворюється');
            startFade(player, token);
        }, { once: true });

        player.addEventListener('timeupdate', function () {
            if (token !== generation) return;

            if (fragment > 0 &&
                player.currentTime >= fragment) {
                try {
                    player.currentTime = 0;
                } catch (e) {}
            }
        });

        player.addEventListener('ended', function () {
            if (token !== generation) return;

            try {
                player.currentTime = 0;

                var result = player.play();

                if (result && result.catch) {
                    result.catch(function () {});
                }
            } catch (e) {}
        });

        notify('OSTMusic: підключення до аудіо...');

        try {
            var result = player.play();

            if (result && result.catch) {
                result.catch(function (error) {
                    if (token !== generation) return;

                    notify(
                        'OSTMusic: запуск заблоковано — ' +
                        (error.name || 'невідома помилка')
                    );

                    stop();
                });
            }
        } catch (error) {
            notify('OSTMusic: ' + error.message);
            stop();
        }
    }

    function schedulePlay() {
        stop();

        if (!enabled || !cardActive) return;

        var token = generation;

        timer = setTimeout(function () {
            timer = null;

            if (token !== generation ||
                !enabled ||
                !cardActive) return;

            play();
        }, delay);
    }

    function extractMovie(event) {
        var data = event && event.data;

        if (!data) return null;

        return data.movie ||
               data.card ||
               data.object ||
               (data.data && (
                   data.data.movie ||
                   data.data.card ||
                   data.data.object
               )) ||
               data;
    }

    function isInterstellar(movie) {
        if (!movie) return false;

        var id = movie.id || movie.tmdb_id;

        if (String(id) === '157336') return true;

        var title = String(
            movie.original_title ||
            movie.title ||
            movie.name ||
            ''
        ).toLowerCase();

        return title.indexOf('interstellar') !== -1 ||
               title.indexOf('інтерстеллар') !== -1 ||
               title.indexOf('интерстеллар') !== -1;
    }

    function handleFull(event) {
        if (!event) return;

        var type = String(event.type || '').toLowerCase();

        if (type === 'destroy' ||
            type === 'close') {
            cardActive = false;
            cardId = '';
            stop();
            return;
        }

        if (type !== 'complite' &&
            type !== 'complete') return;

        var movie = extractMovie(event);

        if (!isInterstellar(movie)) {
            cardActive = false;
            cardId = '';
            stop();
            return;
        }

        var nextId = String(
            movie.id ||
            movie.tmdb_id ||
            'interstellar'
        );

        if (cardActive &&
            cardId === nextId &&
            audio) return;

        cardActive = true;
        cardId = nextId;

        schedulePlay();
    }

    function addSettings() {
        if (!window.Lampa ||
            !Lampa.SettingsApi) return;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'ostmusic_test',
                name: 'OSTMusic Test',
                icon: 'music'
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_test',
                param: {
                    name: 'ostmusic_test_play',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Тест: відтворити Cornfield Chase',
                    description: 'Прямий MP3 із OSTMusic'
                },
                onChange: function () {
                    play();
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_test',
                param: {
                    name: 'ostmusic_test_stop',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Зупинити музику'
                },
                onChange: function () {
                    stop();
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_test',
                param: {
                    name: 'ostmusic_test_auto',
                    type: 'select',
                    values: {
                        'false': 'Вимкнено',
                        'true': 'Увімкнено'
                    },
                    default: 'false'
                },
                field: {
                    name: 'Автозапуск у картці Interstellar',
                    description: 'Через 2 секунди після відкриття'
                },
                onChange: function (value) {
                    enabled = String(value) === 'true';

                    if (enabled && cardActive) {
                        schedulePlay();
                    } else {
                        stop();
                    }
                }
            });

            enabled = String(
                Lampa.Storage.get(
                    'ostmusic_test_auto',
                    'false'
                )
            ) === 'true';

        } catch (e) {
            console.warn(
                '[OSTMusic Test] Settings:',
                e
            );
        }
    }

    function addListeners() {
        if (!window.Lampa ||
            !Lampa.Listener ||
            !Lampa.Listener.follow) return;

        Lampa.Listener.follow('full', handleFull);

        Lampa.Listener.follow('player', function (event) {
            if (!event) return;

            var type = String(
                event.type || ''
            ).toLowerCase();

            if (type === 'start' ||
                type === 'play' ||
                type === 'open') {
                cardActive = false;
                stop();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            var type = String(
                event.type || ''
            ).toLowerCase();

            if (type !== 'start') return;

            var data = event.data || {};
            var component = String(
                data.component || ''
            ).toLowerCase();

            if (component &&
                component !== 'full') {
                cardActive = false;
                stop();
            }
        });
    }

    window.OSTMusicTest = {
        version: '1.0',
        play: play,
        stop: stop,
        url: AUDIO_URL,
        status: function () {
            return {
                enabled: enabled,
                cardActive: cardActive,
                playing: !!(
                    audio &&
                    !audio.paused
                ),
                currentTime: audio
                    ? audio.currentTime
                    : 0
            };
        }
    };

    function init() {
        addSettings();
        addListeners();

        console.log(
            '[OSTMusic Test] Ready v1.0'
        );
    }

    if (window.Lampa) {
        init();
    } else {
        var attempts = 0;

        var wait = setInterval(function () {
            attempts++;

            if (window.Lampa) {
                clearInterval(wait);
                init();
            } else if (attempts >= 40) {
                clearInterval(wait);
            }
        }, 500);
    }

})();
