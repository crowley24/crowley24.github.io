
(function () {
    'use strict';

    /* OSTMusic Dual Test 1.1 — Lampa */

    if (window.ostmusic_dual_110) return;
    window.ostmusic_dual_110 = true;

    var PREFIX = '[OSTMusic 1.1]';
    var BASE = 'https://www.ostmusic.org/?format=raw&id=';
    var SUFFIX = '&view=file';

    var TRACKS = {
        '157336': {
            movie: 'Interstellar',
            title: 'Cornfield Chase',
            artist: 'Hans Zimmer',
            id: 1293
        },
        '27205': {
            movie: 'Inception',
            title: 'Time',
            artist: 'Hans Zimmer',
            id: 1399
        }
    };

    var player = null;
    var startTimer = null;
    var fadeTimer = null;
    var generation = 0;
    var activeMovieId = '';
    var enabled = true;

    var VOLUME = 0.20;
    var DELAY = 2000;
    var FRAGMENT = 30;

    function log(message) {
        console.log(PREFIX, message);
    }

    function notify(message) {
        log(message);

        try {
            if (window.Lampa &&
                Lampa.Noty &&
                typeof Lampa.Noty.show === 'function') {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    function clearTimers() {
        if (startTimer) {
            clearTimeout(startTimer);
            startTimer = null;
        }

        if (fadeTimer) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }

    function stop() {
        generation++;
        clearTimers();

        if (player) {
            var old = player;
            player = null;

            try {
                old.pause();
                old.removeAttribute('src');
                old.load();
            } catch (e) {}
        }
    }

    function fadeIn(audio, token) {
        var step = 0;
        var steps = 20;

        audio.volume = 0;

        if (fadeTimer) {
            clearInterval(fadeTimer);
        }

        fadeTimer = setInterval(function () {
            if (token !== generation ||
                player !== audio) {
                clearInterval(fadeTimer);
                fadeTimer = null;
                return;
            }

            step++;

            try {
                audio.volume = VOLUME *
                    Math.min(step / steps, 1);
            } catch (e) {}

            if (step >= steps) {
                clearInterval(fadeTimer);
                fadeTimer = null;
            }
        }, 100);
    }

    function playTrack(track) {
        if (!track) return;

        stop();

        var token = generation;
        var audio = new Audio();

        player = audio;
        audio.preload = 'auto';
        audio.volume = 0;
        audio.src = BASE + track.id + SUFFIX;

        audio.addEventListener('playing', function () {
            if (token !== generation) return;

            notify(
                'OST: ' + track.artist +
                ' — ' + track.title
            );

            fadeIn(audio, token);
        }, { once: true });

        audio.addEventListener('timeupdate', function () {
            if (token !== generation) return;

            if (audio.currentTime >= FRAGMENT) {
                try {
                    audio.currentTime = 0;
                } catch (e) {}
            }
        });

        audio.addEventListener('ended', function () {
            if (token !== generation) return;

            try {
                audio.currentTime = 0;

                var promise = audio.play();

                if (promise && promise.catch) {
                    promise.catch(function () {});
                }
            } catch (e) {}
        });

        audio.addEventListener('error', function () {
            if (token !== generation) return;

            var code = audio.error
                ? audio.error.code
                : '?';

            notify(
                'OSTMusic: помилка аудіо ' + code
            );

            stop();
        });

        try {
            var promise = audio.play();

            if (promise && promise.catch) {
                promise.catch(function (error) {
                    if (token !== generation) return;

                    notify(
                        'OSTMusic: ' +
                        (error.name || 'Play error')
                    );

                    stop();
                });
            }
        } catch (e) {
            notify('OSTMusic: ' + e.message);
            stop();
        }
    }

    function schedule(movieId) {
        stop();

        if (!enabled || !TRACKS[movieId]) return;

        var token = generation;

        startTimer = setTimeout(function () {
            startTimer = null;

            if (token !== generation ||
                !enabled ||
                activeMovieId !== movieId) {
                return;
            }

            playTrack(TRACKS[movieId]);
        }, DELAY);
    }

    function getMovie(event) {
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

    function resolveId(movie) {
        if (!movie) return '';

        var id = String(
            movie.id ||
            movie.tmdb_id ||
            ''
        );

        if (TRACKS[id]) return id;

        var title = String(
            movie.original_title ||
            movie.title ||
            movie.name ||
            ''
        ).toLowerCase().trim();

        var year = String(
            movie.release_date ||
            movie.year ||
            ''
        ).slice(0, 4);

        if (title === 'interstellar' ||
            title === 'інтерстеллар') {
            return year && year !== '2014'
                ? ''
                : '157336';
        }

        if (title === 'inception' ||
            title === 'початок' ||
            title === 'начало') {
            return year && year !== '2010'
                ? ''
                : '27205';
        }

        return '';
    }

    function onFull(event) {
        if (!event) return;

        var type = String(
            event.type || ''
        ).toLowerCase();

        if (type === 'destroy' ||
            type === 'close') {
            activeMovieId = '';
            stop();
            return;
        }

        if (type !== 'complete' &&
            type !== 'complite') {
            return;
        }

        var id = resolveId(getMovie(event));

        if (!id) {
            activeMovieId = '';
            stop();
            return;
        }

        if (activeMovieId === id &&
            (player || startTimer)) {
            return;
        }

        activeMovieId = id;

        log('Movie: ' + TRACKS[id].movie);
        schedule(id);
    }

    function onPlayer(event) {
        var type = String(
            event && event.type || ''
        ).toLowerCase();

        if (type === 'start' ||
            type === 'play' ||
            type === 'open') {
            activeMovieId = '';
            stop();
        }
    }

    function onActivity(event) {
        var type = String(
            event && event.type || ''
        ).toLowerCase();

        if (type !== 'start') return;

        var data = event.data || {};
        var component = String(
            data.component || ''
        ).toLowerCase();

        if (component && component !== 'full') {
            activeMovieId = '';
            stop();
        }
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'ostmusic_dual',
                name: 'OSTMusic Dual Test',
                icon: 'music'
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_dual',
                param: {
                    name: 'ostmusic_dual_auto',
                    type: 'select',
                    values: {
                        'true': 'Увімкнено',
                        'false': 'Вимкнено'
                    },
                    default: 'true'
                },
                field: {
                    name: 'Автоматична фонова музика',
                    description:
                        'Interstellar та Inception'
                },
                onChange: function (value) {
                    enabled = String(value) === 'true';

                    if (!enabled) {
                        stop();
                    } else if (activeMovieId) {
                        schedule(activeMovieId);
                    }
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_dual',
                param: {
                    name: 'ostmusic_dual_interstellar',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Тест: Cornfield Chase'
                },
                onChange: function () {
                    playTrack(TRACKS['157336']);
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_dual',
                param: {
                    name: 'ostmusic_dual_inception',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Тест: Time'
                },
                onChange: function () {
                    playTrack(TRACKS['27205']);
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'ostmusic_dual',
                param: {
                    name: 'ostmusic_dual_stop',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Зупинити музику'
                },
                onChange: stop
            });

            enabled = String(
                Lampa.Storage.get(
                    'ostmusic_dual_auto',
                    'true'
                )
            ) === 'true';

        } catch (e) {
            console.warn(PREFIX, e);
        }
    }

    function init() {
        addSettings();

        if (Lampa.Listener &&
            Lampa.Listener.follow) {
            Lampa.Listener.follow('full', onFull);
            Lampa.Listener.follow('player', onPlayer);
            Lampa.Listener.follow('activity', onActivity);
        }

        log('Ready');
    }

    window.OSTMusicDual = {
        version: '1.1',
        tracks: TRACKS,
        play: function (id) {
            var key = String(id);

            if (TRACKS[key]) {
                playTrack(TRACKS[key]);
            }
        },
        stop: stop,
        status: function () {
            return {
                enabled: enabled,
                movie: activeMovieId,
                playing: !!(
                    player && !player.paused
                ),
                currentTime: player
                    ? player.currentTime
                    : 0
            };
        }
    };

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
