
(function () {
    'use strict';

    /*
     * Original Soundtrack 1.0.1
     * Lampa / Android TV
     */

    var VERSION = '1.0.1';
    var PREFIX = 'ost10_';

    if (window.ost101_ready) return;
    window.ost101_ready = true;

    var audio = null;
    var startTimer = null;
    var fadeTimer = null;
    var operation = 0;
    var currentId = '';
    var currentCard = null;
    var cardActive = false;
    var initialized = false;

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

    function stop() {
        operation++;
        clearTimers();

        cardActive = false;
        currentId = '';
        currentCard = null;

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

        var target = Math.max(
            0,
            Math.min(
                1,
                number(get('volume'), 20) / 100
            )
        );

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

    function findTrack(card) {
        if (!card || !card.id) return '';

        return library()[String(card.id)] || '';
    }

    function validUrl(url) {
        return /^https?:\/\/\S+$/i.test(url || '');
    }

    function play(url, id, token) {
        if (!cardActive ||
            token !== operation ||
            id !== currentId) {
            return;
        }

        if (!validUrl(url)) {
            console.warn('[OST] Invalid URL');
            return;
        }

        var player = ensureAudio();

        player.pause();
        player.src = url;
        player.loop = bool(get('loop'));
        player.volume = 0;

        var result;

        try {
            result = player.play();
        } catch (e) {
            console.warn('[OST] Play failed:', e);
            return;
        }

        if (result && result.then) {
            result.then(function () {
                if (token !== operation || !cardActive) {
                    player.pause();
                    return;
                }

                fadeIn();
            }).catch(function (error) {
                console.warn(
                    '[OST] Autoplay blocked:',
                    error
                );
            });
        } else {
            fadeIn();
        }
    }

    function extractCard(event) {
        if (!event) return null;

        var data = event.data || event;

        return data.movie ||
               data.card ||
               data.object ||
               (data.id ? data : null);
    }

    function openCard(card) {
        if (!bool(get('enabled')) ||
            !card ||
            !card.id) {
            stop();
            return;
        }

        var isSeries =
            card.first_air_date !== undefined ||
            card.number_of_seasons !== undefined;

        if (isSeries && !bool(get('series'))) {
            stop();
            return;
        }

        var id = String(card.id);

        if (cardActive && currentId === id) return;

        stop();

        cardActive = true;
        currentId = id;
        currentCard = card;

        var url = findTrack(card);
        var token = operation;

        if (!url) {
            console.log(
                '[OST] No soundtrack for TMDB:',
                id
            );
            return;
        }

        var delay = Math.max(
            0,
            number(get('delay'), 2)
        );

        startTimer = setTimeout(function () {
            play(url, id, token);
        }, delay * 1000);
    }

    function handleFull(event) {
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
            stop();
        }
    }

    function registerListeners() {
        if (!Lampa.Listener ||
            !Lampa.Listener.follow) {
            return;
        }

        Lampa.Listener.follow(
            'full',
            handleFull
        );

        Lampa.Listener.follow(
            'player',
            function (event) {
                if (!event) return;

                if (event.type === 'start' ||
                    event.type === 'play' ||
                    event.type === 'open') {
                    stop();
                }
            }
        );

        Lampa.Listener.follow(
            'activity',
            function (event) {
                if (!event) return;

                if (event.type === 'start' &&
                    event.component !== 'full') {
                    stop();
                }
            }
        );
    }

    function registerSettings() {
        if (!Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam) {
            return;
        }

        Lampa.SettingsApi.addComponent({
            component: 'original_soundtrack',
            name: 'Original Soundtrack',
            icon: 'music'
        });

        function addTrigger(key, title, description) {
            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',
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
                        stop();
                    }

                    if (key === 'loop' && audio) {
                        audio.loop = bool(value);
                    }
                }
            });
        }

        function addSelect(
            key,
            title,
            description,
            values
        ) {
            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',
                param: {
                    name: PREFIX + key,
                    type: 'select',
                    default: defaults[key],
                    values: values
                },
                field: {
                    name: title,
                    description: description || ''
                },
                onChange: function (value) {
                    if (key === 'volume' &&
                        audio &&
                        !audio.paused) {

                        audio.volume = Math.max(
                            0,
                            Math.min(
                                1,
                                number(value, 20) / 100
                            )
                        );
                    }
                }
            });
        }

        addTrigger(
            'enabled',
            'Увімкнути саундтреки',
            'Автоматичне відтворення у картці фільму'
        );

        addSelect(
            'volume',
            'Гучність музики',
            'Рекомендовано 20%',
            {
                '10': '10%',
                '15': '15%',
                '20': '20%',
                '25': '25%',
                '30': '30%',
                '40': '40%',
                '50': '50%'
            }
        );

        addSelect(
            'delay',
            'Затримка запуску',
            'Час після відкриття картки',
            {
                '0': 'Без затримки',
                '1': '1 секунда',
                '2': '2 секунди',
                '3': '3 секунди',
                '5': '5 секунд'
            }
        );

        addTrigger(
            'fade',
            'Плавне наростання',
            'Поступове збільшення гучності'
        );

        addTrigger(
            'loop',
            'Повторювати музику',
            'Безперервне відтворення'
        );

        addTrigger(
            'series',
            'Підтримка серіалів',
            'Відтворювати музику в картках серіалів'
        );
    }

    function init() {
        if (initialized) return;
        initialized = true;

        registerListeners();

        try {
            registerSettings();
        } catch (e) {
            console.error(
                '[OST] Settings registration failed:',
                e
            );
        }

        window.OriginalSoundtrack = {
            version: VERSION,

            add: function (tmdbId, url) {
                if (!validUrl(url)) {
                    notify('Некоректне посилання');
                    return false;
                }

                var result = saveTrack(tmdbId, url);

                if (result) {
                    notify('Саундтрек збережено');
                }

                return result;
            },

            remove: function (tmdbId) {
                removeTrack(tmdbId);
                notify('Саундтрек видалено');
            },

            stop: stop,

            play: function (url) {
                stop();

                cardActive = true;
                currentId = 'manual';

                play(url, 'manual', operation);
            },

            library: library,

            status: function () {
                return {
                    version: VERSION,
                    currentId: currentId,
                    active: cardActive,
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

            console.warn(
                '[OST] Initialization timeout'
            );
        }
    }, 500);

})();
