
(function () {
'use strict';

/*
 * ORIGINAL SOUNDTRACK 1.3.0
 * Lampa / Android TV
 *
 * MusicBrainz soundtrack discovery
 * + existing external audio playback
 * + Web Audio diagnostic
 *
 * No automatic copyrighted audio downloads.
 */

var VERSION = '1.3.0';
var PREFIX = 'ost10_';
var COMPONENT = 'original_soundtrack';

if (window.ost130_ready) return;
window.ost130_ready = true;

var DEMO_URL =
    'https://interactive-examples.mdn.mozilla.net/' +
    'media/cc0-audio/t-rex-roar.mp3';

var MB_API =
    'https://musicbrainz.org/ws/2/';

var CACHE_KEY = PREFIX + 'mb_cache_v1';
var CACHE_DAYS = 14;
var CACHE_MAX = 150;
var REQUEST_GAP = 1200;

var defaults = {
    enabled: true,
    volume: '20',
    delay: '2',
    fragment: '30',
    fade: true,
    loop: true,
    series: false,
    demo_card: false,
    test_sound: false,
    search_enabled: true,
    show_result: true,
    search_test: false
};

var initialized = false;
var audio = null;
var playTimer = null;
var fadeTimer = null;
var operation = 0;

var cardActive = false;
var currentId = '';
var currentUrl = '';
var currentDemo = false;
var currentCard = null;

var testContext = null;
var testNodes = [];
var testTimer = null;
var testActive = false;

var searchToken = 0;
var pending = [];
var queueBusy = false;
var lastRequest = 0;
var memoryCache = {};
var lastResult = null;
var lastError = '';

function log() {
    try {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[OST 1.3]');
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
        Lampa.Storage.set(PREFIX + key, value);
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
    var n = Number(value);
    return isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function volume() {
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
    } catch (e) {}

    return {};
}

function addTrack(id, url) {
    if (!id || !validUrl(url)) return false;

    var data = library();
    data[String(id)] = url.trim();

    set('library', JSON.stringify(data));
    return true;
}

function removeTrack(id) {
    var data = library();
    delete data[String(id)];
    set('library', JSON.stringify(data));
}

/* ======================================
   AUDIO ENGINE
====================================== */

function ensureAudio() {
    if (audio) return audio;

    audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.volume = 0;
    audio.loop = false;
    audio.style.display = 'none';

    audio.setAttribute(
        'playsinline',
        'playsinline'
    );

    audio.addEventListener('error', function () {
        if (audio.error) {
            log(
                'Audio error',
                audio.error.code,
                audio.error.message || ''
            );
        }
    });

    audio.addEventListener('timeupdate', function () {
        if (!cardActive ||
            !bool(get('loop'))) return;

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
    });

    audio.addEventListener('ended', function () {
        if (!cardActive ||
            !bool(get('loop'))) return;

        try {
            audio.currentTime = 0;

            var p = audio.play();

            if (p && p.catch) {
                p.catch(function (e) {
                    log('Loop error', e);
                });
            }
        } catch (e) {}
    });

    try {
        (document.body ||
         document.documentElement).appendChild(audio);
    } catch (e) {}

    return audio;
}

function clearAudioTimers() {
    clearTimeout(playTimer);
    clearInterval(fadeTimer);
    playTimer = null;
    fadeTimer = null;
}

function stopAudio() {
    operation++;
    clearAudioTimers();

    cardActive = false;
    currentId = '';
    currentUrl = '';
    currentDemo = false;
    currentCard = null;

    if (audio) {
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.volume = 0;
        } catch (e) {}
    }
}

function fadeIn(token) {
    if (!audio) return;

    clearInterval(fadeTimer);

    var target = volume();

    if (!bool(get('fade'))) {
        audio.volume = target;
        return;
    }

    var step = 0;

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
            target * step / 20,
            0,
            target
        );

        if (step >= 20) {
            clearInterval(fadeTimer);
            fadeTimer = null;
        }
    }, 100);
}

function playUrl(url, id, token) {
    if (!cardActive ||
        token !== operation ||
        id !== currentId ||
        !validUrl(url)) return;

    stopTest(false);

    var player = ensureAudio();

    try {
        player.pause();
        player.src = url;
        player.volume = 0;
        player.loop = false;
        player.load();

        var promise = player.play();

        if (promise && promise.then) {
            promise.then(function () {
                if (token !== operation ||
                    !cardActive) {
                    player.pause();
                    return;
                }

                fadeIn(token);
            }).catch(function (e) {
                log('Playback failed', e);

                if (token === operation) {
                    notify(
                        'OST: не вдалося запустити MP3'
                    );
                }
            });
        } else {
            fadeIn(token);
        }
    } catch (e) {
        log('Audio exception', e);
    }
}

/* ======================================
   MOVIE CARD
====================================== */

function extractCard(event) {
    if (!event) return null;

    var data = event.data || event;

    return data.movie ||
           data.card ||
           data.object ||
           (data.data && data.data.id
               ? data.data
               : null) ||
           (data.id ? data : null);
}

function isSeries(card) {
    return !!(
        card &&
        (
            card.media_type === 'tv' ||
            card.number_of_seasons !== undefined ||
            card.first_air_date !== undefined
        )
    );
}

function movieInfo(card) {
    if (!card || !card.id) return null;

    var title =
        card.original_title ||
        card.original_name ||
        card.title ||
        card.name ||
        '';

    var year = String(
        card.release_date ||
        card.first_air_date ||
        ''
    ).slice(0, 4);

    return {
        id: String(card.id),
        title: String(title).trim(),
        year: /^\d{4}$/.test(year) ? year : ''
    };
}

function openCard(card) {
    if (!card || !card.id) return;

    if (!bool(get('enabled'))) {
        stopAudio();
        return;
    }

    if (isSeries(card) &&
        !bool(get('series'))) {
        stopAudio();
        return;
    }

    var info = movieInfo(card);

    if (!info) return;

    if (cardActive && currentId === info.id) {
        return;
    }

    stopAudio();

    searchToken++;

    cardActive = true;
    currentId = info.id;
    currentCard = card;

    var tracks = library();
    var url = tracks[info.id];

    if (!validUrl(url) &&
        bool(get('demo_card'))) {
        url = DEMO_URL;
        currentDemo = true;
    }

    if (validUrl(url)) {
        currentUrl = url;

        var token = operation;

        playTimer = setTimeout(function () {
            playUrl(url, info.id, token);
        }, clamp(
            num(get('delay'), 2),
            0,
            10
        ) * 1000);
    }

    if (bool(get('search_enabled')) &&
        info.title) {
        searchForCard(info);
    }
}

/* ======================================
   MUSICBRAINZ CACHE
====================================== */

function loadCache() {
    try {
        var raw = Lampa.Storage.get(
            CACHE_KEY,
            '{}'
        );

        var data = typeof raw === 'string'
            ? JSON.parse(raw)
            : raw;

        if (data &&
            typeof data === 'object' &&
            !Array.isArray(data)) {
            memoryCache = data;
        }
    } catch (e) {
        memoryCache = {};
    }
}

function saveCache() {
    try {
        var keys = Object.keys(memoryCache);

        if (keys.length > CACHE_MAX) {
            keys.sort(function (a, b) {
                return (
                    (memoryCache[a].time || 0) -
                    (memoryCache[b].time || 0)
                );
            });

            while (keys.length > CACHE_MAX) {
                delete memoryCache[keys.shift()];
            }
        }

        set(
            'mb_cache_v1',
            JSON.stringify(memoryCache)
        );
    } catch (e) {
        log('Cache save error', e);
    }
}

function cached(id) {
    var entry = memoryCache[String(id)];

    if (!entry) return null;

    if (
        Date.now() - entry.time >
        CACHE_DAYS * 86400000
    ) {
        delete memoryCache[String(id)];
        return null;
    }

    return entry.result || null;
}

function cacheResult(id, result) {
    memoryCache[String(id)] = {
        time: Date.now(),
        result: result
    };

    saveCache();
}

/* ======================================
   MUSICBRAINZ SEARCH
====================================== */

function normalize(value) {
    var text = String(value || '')
        .toLowerCase()
        .replace(/&/g, ' and ');

    try {
        text = text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    } catch (e) {}

    return text
        .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeLucene(value) {
    return String(value || '')
        .replace(/\\/g, ' ')
        .replace(/[+\-&|!(){}\[\]^"~*?:/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function artistName(group) {
    if (!group) return '';

    var credits = group['artist-credit'];

    if (!Array.isArray(credits)) return '';

    return credits.map(function (item) {
        if (typeof item === 'string') {
            return item;
        }

        return item.name ||
               (item.artist && item.artist.name) ||
               '';
    }).join('').trim();
}

function scoreGroup(group, title, year) {
    var wanted = normalize(title);
    var actual = normalize(group.title);

    if (!wanted || !actual) return -100;

    var score = 0;

    if (actual === wanted) {
        score += 80;
    } else if (
        actual.indexOf(wanted + ' ') === 0
    ) {
        score += 70;
    } else if (
        actual.indexOf(wanted) !== -1
    ) {
        score += 45;
    } else {
        return -100;
    }

    var secondary =
        group['secondary-types'] || [];

    if (secondary.indexOf('Soundtrack') >= 0) {
        score += 35;
    }

    if (/original (motion picture|soundtrack|score)/i
        .test(group.title)) {
        score += 20;
    }

    if (/\b(score|soundtrack)\b/i.test(group.title)) {
        score += 12;
    }

    var releaseYear = parseInt(
        String(group['first-release-date'] || '')
            .slice(0, 4),
        10
    );

    var movieYear = parseInt(year, 10);

    if (releaseYear && movieYear) {
        var difference = Math.abs(
            releaseYear - movieYear
        );

        if (difference <= 1) {
            score += 20;
        } else if (difference <= 3) {
            score += 8;
        } else if (difference > 15) {
            score -= 15;
        }
    }

    score += Math.min(
        10,
        num(group.score, 0) / 10
    );

    return score;
}

function chooseGroup(groups, title, year) {
    if (!Array.isArray(groups)) return null;

    var ranked = groups.map(function (group) {
        return {
            group: group,
            score: scoreGroup(group, title, year)
        };
    });

    ranked.sort(function (a, b) {
        return b.score - a.score;
    });

    if (!ranked.length ||
        ranked[0].score < 85) {
        return null;
    }

    var best = ranked[0];

    return {
        id: best.group.id,
        title: best.group.title,
        artist: artistName(best.group),
        date: best.group['first-release-date'] || '',
        score: Math.round(best.score),
        url: 'https://musicbrainz.org/release-group/' +
             best.group.id
    };
}

/*
 * Shared request queue.
 * No more than one request per 1.2 seconds.
 */

function enqueue(url, callback) {
    pending.push({
        url: url,
        callback: callback
    });

    processQueue();
}

function processQueue() {
    if (queueBusy || !pending.length) return;

    queueBusy = true;

    var wait = Math.max(
        0,
        REQUEST_GAP -
        (Date.now() - lastRequest)
    );

    setTimeout(function () {
        var item = pending.shift();

        if (!item) {
            queueBusy = false;
            return;
        }

        lastRequest = Date.now();

        requestJson(item.url, function (err, data) {
            queueBusy = false;

            try {
                item.callback(err, data);
            } catch (e) {
                log('Callback error', e);
            }

            processQueue();
        });
    }, wait);
}

function requestJson(url, callback) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function done(err, data) {
        if (finished) return;
        finished = true;
        callback(err, data);
    }

    try {
        xhr.open('GET', url, true);
        xhr.timeout = 12000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 &&
                xhr.status < 300) {
                try {
                    done(
                        null,
                        JSON.parse(xhr.responseText)
                    );
                } catch (e) {
                    done('Помилка JSON');
                }
            } else {
                done(
                    'HTTP ' + xhr.status
                );
            }
        };

        xhr.onerror = function () {
            done('Помилка мережі або CORS');
        };

        xhr.ontimeout = function () {
            done('Перевищено час очікування');
        };

        xhr.send();
    } catch (e) {
        done(String(e.message || e));
    }
}

function searchMusicBrainz(info, callback) {
    var safeTitle = escapeLucene(info.title);

    if (!safeTitle) {
        callback('Порожня назва');
        return;
    }

    var query =
        'releasegroup:"' + safeTitle + '"' +
        ' AND secondarytype:soundtrack';

    var url =
        MB_API + 'release-group/' +
        '?query=' + encodeURIComponent(query) +
        '&fmt=json&limit=20';

    enqueue(url, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        var groups =
            data && data['release-groups'];

        var best = chooseGroup(
            groups,
            info.title,
            info.year
        );

        callback(null, best);
    });
}

function showSearchResult(info, result) {
    if (!bool(get('show_result'))) return;

    if (result && result.title) {
        notify(
            'OST знайдено: ' +
            result.title +
            (result.artist
                ? ' — ' + result.artist
                : '')
        );
    } else {
        notify(
            'OST: саундтрек для «' +
            info.title +
            '» не знайдено'
        );
    }
}

function searchForCard(info) {
    var token = searchToken;
    var id = info.id;

    var existing = cached(id);

    if (existing) {
        lastResult = existing;

        log('Cache hit', info.title, existing);

        if (cardActive && currentId === id) {
            showSearchResult(info, existing);
        }

        return;
    }

    log('Searching MusicBrainz', info.title);

    searchMusicBrainz(info, function (err, result) {
        if (err) {
            lastError = err;
            log('MusicBrainz error', err);

            if (token === searchToken &&
                cardActive &&
                currentId === id &&
                bool(get('show_result'))) {
                notify('OST: ' + err);
            }

            return;
        }

        lastError = '';

        var value = result || {
            found: false,
            title: '',
            artist: '',
            id: ''
        };

        cacheResult(id, value);

        if (token !== searchToken ||
            !cardActive ||
            currentId !== id) {
            return;
        }

        lastResult = value;

        log('Search result', value);

        showSearchResult(info, value);
    });
}

/*
 * Independent MusicBrainz test:
 * Interstellar (2014)
 */

function testSearch() {
    notify('OST: пошук Interstellar...');

    searchMusicBrainz({
        id: '157336',
        title: 'Interstellar',
        year: '2014'
    }, function (err, result) {
        set('search_test', false);

        if (err) {
            lastError = err;

            notify('OST: ' + err);
            return;
        }

        lastError = '';
        lastResult = result;

        if (result) {
            notify(
                'OST: ' +
                result.title +
                ' — ' +
                (result.artist || 'Виконавець невідомий')
            );

            log('Test search success', result);
        } else {
            notify(
                'OST: Interstellar не знайдено'
            );
        }
    });
}

/* ======================================
   WEB AUDIO TEST
====================================== */

function stopTest(reset) {
    clearTimeout(testTimer);
    testTimer = null;

    testNodes.forEach(function (node) {
        try { node.stop(); } catch (e) {}
        try { node.disconnect(); } catch (e) {}
    });

    testNodes = [];

    if (testContext) {
        try {
            var p = testContext.close();

            if (p && p.catch) {
                p.catch(function () {});
            }
        } catch (e) {}

        testContext = null;
    }

    testActive = false;

    if (reset) {
        set('test_sound', false);
    }
}

function testSound() {
    stopAudio();
    stopTest(false);

    var Context =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!Context) {
        notify('Web Audio не підтримується');
        return;
    }

    try {
        var ctx = new Context();

        testContext = ctx;
        testActive = true;

        var master = ctx.createGain();
        master.gain.value = volume();
        master.connect(ctx.destination);

        var notes = [
            [261.63, 0.0, 0.6],
            [329.63, 0.7, 0.6],
            [392.00, 1.4, 0.6],
            [523.25, 2.1, 0.9],
            [392.00, 3.2, 0.6],
            [329.63, 4.0, 0.6],
            [293.66, 4.8, 0.6],
            [261.63, 5.6, 1.1]
        ];

        var now = ctx.currentTime + 0.1;

        notes.forEach(function (note) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            var start = now + note[1];
            var end = start + note[2];

            osc.type = 'sine';
            osc.frequency.value = note[0];

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
            var p = ctx.resume();

            if (p && p.catch) {
                p.catch(function (e) {
                    log('Audio resume failed', e);
                });
            }
        }

        testTimer = setTimeout(function () {
            stopTest(true);
        }, 8000);

        notify('OST: тестова мелодія');
    } catch (e) {
        stopTest(true);
        log('Test sound error', e);
    }
}

/* ======================================
   LAMPA LISTENERS
====================================== */

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
            searchToken++;
            stopAudio();
        }
    });

    Lampa.Listener.follow('player', function (event) {
        if (!event) return;

        if (event.type === 'start' ||
            event.type === 'play' ||
            event.type === 'open') {
            searchToken++;
            stopAudio();
            stopTest(true);
        }
    });

    Lampa.Listener.follow('activity', function (event) {
        if (!event) return;

        if (event.type === 'start' &&
            event.component &&
            event.component !== 'full') {
            searchToken++;
            stopAudio();
        }
    });
}

/* ======================================
   SETTINGS
====================================== */

function registerSettings() {
    var api = Lampa.SettingsApi;

    api.addComponent({
        component: COMPONENT,
        name: 'Original Soundtrack',
        icon: 'music'
    });

    function trigger(key, title, description, callback) {
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
                if (callback) callback(value);
            }
        });
    }

    function select(key, title, values, callback) {
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
                if (callback) callback(value);
            }
        });
    }

    trigger(
        'enabled',
        'Увімкнути саундтреки',
        'Фонова музика у картках',
        function (value) {
            if (!bool(value)) {
                searchToken++;
                stopAudio();
            }
        }
    );

    trigger(
        'search_enabled',
        'Автоматичний пошук',
        'Шукати саундтрек через MusicBrainz'
    );

    trigger(
        'show_result',
        'Показувати результат',
        'Повідомлення про знайдену музику'
    );

    trigger(
        'search_test',
        'Перевірити пошук',
        'Пошук саундтреку Interstellar',
        function (value) {
            if (bool(value)) {
                testSearch();
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
        'Пошук і музика для серіалів'
    );

    trigger(
        'demo_card',
        'Тест MP3 у картці',
        'Тестовий аудіоефект замість музики',
        function (value) {
            if (!bool(value) && currentDemo) {
                stopAudio();
            }
        }
    );

    trigger(
        'test_sound',
        'Перевірити звук',
        'Запустити тестову мелодію',
        function (value) {
            if (bool(value)) {
                testSound();
            } else {
                stopTest(false);
            }
        }
    );
}

/* ======================================
   PUBLIC API
====================================== */

function registerPublicApi() {
    window.OriginalSoundtrack = {
        version: VERSION,

        test: testSound,
        testSearch: testSearch,

        stopTest: function () {
            stopTest(true);
        },

        stop: function () {
            searchToken++;
            stopAudio();
            stopTest(true);
        },

        add: function (id, url) {
            var ok = addTrack(id, url);

            notify(
                ok
                    ? 'OST: саундтрек збережено'
                    : 'OST: некоректне посилання'
            );

            return ok;
        },

        remove: function (id) {
            removeTrack(id);
        },

        library: library,

        search: function (title, year, callback) {
            searchMusicBrainz({
                title: title,
                year: year || ''
            }, function (err, result) {
                lastError = err || '';
                lastResult = result || null;

                if (typeof callback === 'function') {
                    callback(err, result);
                }
            });
        },

        clearCache: function () {
            memoryCache = {};
            saveCache();
            notify('OST: кеш очищено');
        },

        lastResult: function () {
            return lastResult;
        },

        status: function () {
            return {
                version: VERSION,
                currentId: currentId,
                cardActive: cardActive,
                currentDemo: currentDemo,
                testActive: testActive,
                playing: !!audio && !audio.paused,
                audioUrl: currentUrl,
                lastResult: lastResult,
                lastError: lastError,
                queueLength: pending.length
            };
        }
    };
}

/* ======================================
   INITIALIZATION
====================================== */

function init() {
    if (initialized) return;
    initialized = true;

    set('test_sound', false);
    set('search_test', false);

    loadCache();
    registerPublicApi();
    registerListeners();

    try {
        registerSettings();
    } catch (e) {
        log('Settings error', e);
    }

    log(
        'Original Soundtrack ' +
        VERSION +
        ' ready'
    );
}

var attempts = 0;

var wait = setInterval(function () {
    attempts++;

    if (
        window.Lampa &&
        Lampa.Storage &&
        Lampa.Listener &&
        Lampa.SettingsApi
    ) {
        clearInterval(wait);
        init();
    }

    if (attempts >= 60) {
        clearInterval(wait);
        log('Initialization timeout');
    }
}, 500);

})();
