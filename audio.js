
(function () {
    'use strict';

    /* Original Soundtrack 1.0 — Lampa */
    var VERSION = '1.0.0';
    var PREFIX = 'ost10_';

    if (window.ost10_initialized) return;
    window.ost10_initialized = true;

    var audio = null;
    var timer = null;
    var fadeTimer = null;
    var requestId = 0;
    var currentId = '';
    var currentCard = null;
    var cardActive = false;
    var settingsRegistered = false;

    var defaults = {
        enabled: true,
        volume: 20,
        delay: 2,
        fade: true,
        loop: true,
        series: false,
        library: '{}'
    };

    function get(key) {
        try {
            var value = Lampa.Storage.get(PREFIX + key);
            return value === undefined || value === null
                ? defaults[key] : value;
        } catch (e) {
            return defaults[key];
        }
    }

    function set(key, value) {
        Lampa.Storage.set(PREFIX + key, value);
    }

    function notify(message) {
        try {
            Lampa.Noty.show(message);
        } catch (e) {
            console.log('[OST]', message);
        }
    }

    function ensureAudio() {
        if (audio) return audio;

        audio = new Audio();
        audio.preload = 'auto';
        audio.loop = !!get('loop');
        audio.volume = 0;

        audio.addEventListener('error', function () {
            if (cardActive && audio.error) {
                console.warn('[OST] Audio error:', audio.error.code);
            }
        });

        return audio;
    }

    function clearTimers() {
        clearTimeout(timer);
        clearInterval(fadeTimer);
        timer = null;
        fadeTimer = null;
    }

    function stop() {
        requestId++;
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
            Math.min(1, Number(get('volume')) / 100)
        );

        if (!get('fade')) {
            audio.volume = target;
            return;
        }

        var steps = 20;
        var step = 0;

        audio.volume = 0;

        fadeTimer = setInterval(function () {
            if (!audio || audio.paused) {
                clearInterval(fadeTimer);
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
            var data = JSON.parse(get('library') || '{}');
            return data && typeof data === 'object'
                ? data : {};
        } catch (e) {
            return {};
        }
    }

    function saveTrack(id, url) {
        if (!id || !url) return;

        var data = library();
        data[String(id)] = url.trim();

        set('library', JSON.stringify(data));
    }

    function findTrack(card) {
        if (!card) return '';

        var id = String(card.id || '');
        var data = library();

        return data[id] || '';
    }

    function isSupportedUrl(url) {
        try {
            var parsed = new URL(url);
            return parsed.protocol === 'https:' ||
                   parsed.protocol === 'http:';
        } catch (e) {
            return false;
        }
    }

    function play(url, id, operation) {
        if (!cardActive ||
            operation !== requestId ||
            id !== currentId) return;

        if (!isSupportedUrl(url)) {
            console.warn('[OST] Invalid audio URL');
            return;
        }

        var player = ensureAudio();

        player.pause();
        player.src = url;
        player.loop = !!get('loop');
        player.volume = 0;

        var promise = player.play();

        if (promise && promise.then) {
            promise.then(function () {
                if (operation !== requestId || !cardActive) {
                    player.pause();
                    return;
                }
                fadeIn();
            }).catch(function (error) {
                console.warn('[OST] Playback blocked:', error);
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
        if (!get('enabled') || !card || !card.id) {
            stop();
            return;
        }

        var isSeries =
            card.number_of_seasons !== undefined ||
            card.first_air_date !== undefined;

        if (isSeries && !get('series')) {
            stop();
            return;
        }

        var id = String(card.id);
        var url = findTrack(card);

        if (cardActive && currentId === id) return;

        stop();

        cardActive = true;
        currentId = id;
        currentCard = card;

        var operation = requestId;

        if (!url) {
            console.log('[OST] No soundtrack:', id);
            return;
        }

        timer = setTimeout(function () {
            play(url, id, operation);
        }, Math.max(0, Number(get('delay')) * 1000));
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
        if (!window.Lampa ||
            !Lampa.Listener ||
            !Lampa.Listener.follow) return;

        Lampa.Listener.follow('full', handleFull);

        Lampa.Listener.follow('player', function (event) {
            if (!event) return;

            if (event.type === 'start' ||
                event.type === 'play' ||
                event.type === 'open') {
                stop();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (event.type === 'start' &&
                event.component !== 'full') {
                stop();
            }
        });
    }

    function addSettings() {
        if (settingsRegistered) return;
        if (!Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam) return;

        settingsRegistered = true;

        Lampa.SettingsApi.addComponent({
            component: 'original_soundtrack',
            name: 'Original Soundtrack',
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
        });

        function param(name, type, title, values, onChange) {
            Lampa.SettingsApi.addParam({
                component: 'original_soundtrack',
                param: {
                    name: PREFIX + name,
                    type: type,
                    default: defaults[name],
                    values: values || undefined
                },
                field: {
                    name: title
                },
                onChange: function (value) {
                    if (onChange) onChange(value);
                }
            });
        }

        param('enabled', 'trigger', 'Увімкнути саундтреки',
            null, function (value) {
                if (!value || value === 'false') stop();
            });

        param('volume', 'select', 'Гучність', {
            '10': '10%',
            '15': '15%',
            '20': '20%',
            '25': '25%',
            '30': '30%',
            '40': '40%',
            '50': '50%'
        }, function (value) {
            if (audio && !audio.paused) {
                audio.volume = Number(value) / 100;
            }
        });

        param('delay', 'select', 'Затримка запуску', {
            '0': 'Без затримки',
            '1': '1 секунда',
            '2': '2 секунди',
            '3': '3 секунди',
            '5': '5 секунд'
        });

        param('fade', 'trigger', 'Плавне наростання звуку');

        param('loop', 'trigger', 'Повторювати композицію',
            null, function (value) {
                if (audio) {
                    audio.loop = value === true ||
                                 value === 'true';
                }
            });

        param('series', 'trigger', 'Підтримка серіалів');

        Lampa.SettingsApi.addParam({
            component: 'original_soundtrack',
            param: {
                name: PREFIX + 'library',
                type: 'input',
                default: '{}'
            },
            field: {
                name: 'Бібліотека саундтреків (JSON)',
                description: 'TMDB ID та прямі посилання на аудіо'
            }
        });
    }

    function init() {
        if (!window.Lampa) return;

        registerListeners();
        addSettings();

        window.OriginalSoundtrack = {
            version: VERSION,

            add: function (tmdbId, url) {
                saveTrack(tmdbId, url);
                notify('Саундтрек збережено');
            },

            stop: stop,

            play: function (url) {
                stop();

                cardActive = true;
                currentId = 'manual';

                play(url, 'manual', requestId);
            },

            library: library,

            status: function () {
                return {
                    version: VERSION,
                    card: currentId,
                    active: cardActive,
                    playing: !!audio && !audio.paused
                };
            }
        };

        console.log('[OST] Original Soundtrack ' +
                    VERSION + ' initialized');
    }

    if (window.Lampa &&
        Lampa.Listener &&
        Lampa.SettingsApi) {
        init();
    } else {
        var attempts = 0;

        var wait = setInterval(function () {
            attempts++;

            if (window.Lampa &&
                Lampa.Listener &&
                Lampa.SettingsApi) {
                clearInterval(wait);
                init();
            }

            if (attempts >= 60) {
                clearInterval(wait);
                console.warn('[OST] Lampa not ready');
            }
        }, 500);
    }

})();
