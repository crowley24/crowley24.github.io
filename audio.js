
(function () {
'use strict';

/*
 * ORIGINAL SOUNDTRACK 1.5.0
 * Lampa / Android TV
 *
 * MusicBrainz album + track discovery
 * Main theme selection
 * Jamendo Audio Source Finder
 * Strict original artist matching
 * Manual MP3 playback
 * Demo and sound test
 *
 * Source Finder is diagnostic only.
 */

if (window.ost150_ready) return;
window.ost150_ready = true;

var VERSION = '1.5.0';
var P = 'ost10_';
var COMPONENT = 'original_soundtrack';

var MB = 'https://musicbrainz.org/ws/2/';
var JAM = 'https://api.jamendo.com/v3.0/tracks/';

var DEMO =
    'https://interactive-examples.mdn.mozilla.net/' +
    'media/cc0-audio/t-rex-roar.mp3';

var CACHE_KEY = P + 'discovery_v150';
var CACHE_TTL = 14 * 86400000;

var defaults = {
    enabled: true,
    search_enabled: true,
    show_result: false,
    source_enabled: true,
    source_test: false,
    source_card: false,
    jamendo_id: '',
    volume: '20',
    delay: '2',
    fragment: '30',
    fade: true,
    loop: true,
    series: false,
    demo_card: false,
    test_sound: false,
    search_test: false
};

var ready = false;
var cache = {};
var lastResult = null;
var lastSource = null;
var lastError = '';

var activeCard = null;
var cardToken = 0;

var audio = null;
var audioTimer = null;
var fadeTimer = null;
var audioGeneration = 0;

var testContext = null;
var testOscillators = [];
var testTimer = null;

var mbQueue = [];
var mbBusy = false;
var mbLastRequest = 0;

var sourceBusy = false;

/* ===================================
   UTILITIES
=================================== */

function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[OST 1.5]');

    try {
        console.log.apply(console, args);
    } catch (e) {}
}

function notify(text) {
    try {
        Lampa.Noty.show(text);
    } catch (e) {
        log(text);
    }
}

function get(key) {
    try {
        var value = Lampa.Storage.get(
            P + key,
            defaults[key]
        );

        return value == null ? defaults[key] : value;
    } catch (e) {
        return defaults[key];
    }
}

function set(key, value) {
    try {
        Lampa.Storage.set(P + key, value);
    } catch (e) {
        log('Storage:', e);
    }
}

function enabled(value) {
    return value === true ||
           value === 'true' ||
           value === 1 ||
           value === '1';
}

function num(value, fallback) {
    var result = Number(value);
    return isFinite(result) ? result : fallback;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalize(value) {
    var text = String(value || '').toLowerCase();

    try {
        text = text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    } catch (e) {}

    return text
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanQuery(text) {
    return String(text || '')
        .replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function urlOK(url) {
    return typeof url === 'string' &&
        /^https?:\/\/\S+$/i.test(url);
}

function artistName(object) {
    var credits = object && object['artist-credit'];

    if (!Array.isArray(credits)) return '';

    return credits.map(function (item) {
        if (typeof item === 'string') return item;

        return item.name ||
            (item.artist && item.artist.name) ||
            '';
    }).join('').trim();
}

/* ===================================
   CACHE
=================================== */

function loadCache() {
    try {
        var raw = Lampa.Storage.get(CACHE_KEY, '{}');
        var data = typeof raw === 'string'
            ? JSON.parse(raw)
            : raw;

        if (data && typeof data === 'object') {
            cache = data;
        }
    } catch (e) {
        cache = {};
    }
}

function cacheGet(key) {
    var entry = cache[key];

    if (!entry) return null;

    if (Date.now() - entry.time > CACHE_TTL) {
        delete cache[key];
        return null;
    }

    return entry.data;
}

function cacheSet(key, data) {
    cache[key] = {
        time: Date.now(),
        data: data
    };

    var keys = Object.keys(cache);

    if (keys.length > 80) {
        keys.sort(function (a, b) {
            return cache[a].time - cache[b].time;
        });

        while (keys.length > 80) {
            delete cache[keys.shift()];
        }
    }

    try {
        set('discovery_v150', JSON.stringify(cache));
    } catch (e) {
        log('Cache error', e);
    }
}

/* ===================================
   HTTP
=================================== */

function request(url, callback) {
    var xhr = new XMLHttpRequest();
    var done = false;

    function finish(error, data) {
        if (done) return;
        done = true;
        callback(error, data);
    }

    try {
        xhr.open('GET', url, true);
        xhr.timeout = 15000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    finish(
                        null,
                        JSON.parse(xhr.responseText)
                    );
                } catch (e) {
                    finish('Помилка JSON');
                }
            } else {
                finish('HTTP ' + xhr.status);
            }
        };

        xhr.onerror = function () {
            finish('Помилка мережі або CORS');
        };

        xhr.ontimeout = function () {
            finish('Перевищено час очікування');
        };

        xhr.send();
    } catch (e) {
        finish(String(e.message || e));
    }
}

/*
 * MusicBrainz allows no more than
 * one request per second per client.
 */

function mbRequest(url, callback) {
    mbQueue.push({
        url: url,
        callback: callback
    });

    processMB();
}

function processMB() {
    if (mbBusy || !mbQueue.length) return;

    mbBusy = true;

    var wait = Math.max(
        0,
        1300 - (Date.now() - mbLastRequest)
    );

    setTimeout(function () {
        var item = mbQueue.shift();

        if (!item) {
            mbBusy = false;
            return;
        }

        mbLastRequest = Date.now();

        request(item.url, function (error, data) {
            mbBusy = false;

            try {
                item.callback(error, data);
            } catch (e) {
                log('MB callback:', e);
            }

            processMB();
        });
    }, wait);
}

/* ===================================
   MUSICBRAINZ ALBUM
=================================== */

function scoreAlbum(group, title, year) {
    var wanted = normalize(title);
    var actual = normalize(group.title);

    if (!wanted || !actual) return -100;

    var score = 0;

    if (actual === wanted) {
        score += 80;
    } else if (actual.indexOf(wanted + ' ') === 0) {
        score += 70;
    } else if (actual.indexOf(wanted) >= 0) {
        score += 45;
    } else {
        return -100;
    }

    var types = group['secondary-types'] || [];

    if (types.indexOf('Soundtrack') >= 0) {
        score += 35;
    }

    if (/original (motion picture|soundtrack|score)/i
        .test(group.title)) {
        score += 20;
    }

    if (/\b(score|soundtrack)\b/i.test(group.title)) {
        score += 12;
    }

    var albumYear = parseInt(
        String(group['first-release-date'] || '')
            .slice(0, 4),
        10
    );

    var movieYear = parseInt(year, 10);

    if (albumYear && movieYear) {
        var diff = Math.abs(albumYear - movieYear);

        if (diff <= 1) score += 20;
        else if (diff <= 3) score += 8;
        else if (diff > 15) score -= 15;
    }

    score += Math.min(10, num(group.score, 0) / 10);

    return score;
}

function findAlbum(info, callback) {
    var query =
        'releasegroup:"' +
        cleanQuery(info.title) +
        '" AND secondarytype:soundtrack';

    var url =
        MB + 'release-group/?query=' +
        encodeURIComponent(query) +
        '&fmt=json&limit=20';

    mbRequest(url, function (error, data) {
        if (error) return callback(error);

        var groups = data['release-groups'] || [];

        groups.sort(function (a, b) {
            return scoreAlbum(b, info.title, info.year) -
                   scoreAlbum(a, info.title, info.year);
        });

        if (
            !groups.length ||
            scoreAlbum(groups[0], info.title, info.year) < 85
        ) {
            callback(null, null);
            return;
        }

        var group = groups[0];

        callback(null, {
            id: group.id,
            title: group.title,
            artist: artistName(group),
            date: group['first-release-date'] || ''
        });
    });
}

/* ===================================
   MUSICBRAINZ RELEASE
=================================== */

function releaseScore(release) {
    var score = 0;

    if (release.status === 'Official') score += 35;
    if (release.status === 'Bootleg') score -= 60;
    if (release.country === 'US') score += 10;
    if (release.country === 'GB') score += 8;

    var media = release.media || [];
    var count = 0;

    media.forEach(function (item) {
        count += num(item['track-count'], 0);
    });

    if (count >= 8 && count <= 45) score += 15;
    if (count > 60) score -= 10;

    return score;
}

function findRelease(album, callback) {
    var url =
        MB + 'release/?release-group=' +
        encodeURIComponent(album.id) +
        '&fmt=json&limit=50';

    mbRequest(url, function (error, data) {
        if (error) return callback(error);

        var releases = data.releases || [];

        releases.sort(function (a, b) {
            return releaseScore(b) - releaseScore(a);
        });

        if (!releases.length) {
            return callback('Реліз не знайдено');
        }

        callback(null, {
            id: releases[0].id,
            title: releases[0].title
        });
    });
}

/* ===================================
   MAIN THEME
=================================== */

var KNOWN_THEMES = {
    'interstellar|2014': [
        'Cornfield Chase',
        'Day One',
        'Stay',
        'No Time for Caution'
    ],
    'inception|2010': [
        'Time',
        'Dream Is Collapsing'
    ],
    'gladiator|2000': [
        'Now We Are Free',
        'The Battle'
    ],
    'the dark knight|2008': [
        'Why So Serious',
        'A Dark Knight'
    ],
    'jurassic park|1993': [
        'Theme from Jurassic Park',
        'Journey to the Island'
    ],
    'harry potter and the philosophers stone|2001': [
        'Hedwigs Theme'
    ],
    'harry potter and the sorcerers stone|2001': [
        'Hedwigs Theme'
    ],
    'pirates of the caribbean the curse of the black pearl|2003': [
        'Hes a Pirate',
        'The Medallion Calls'
    ],
    'the lord of the rings the fellowship of the ring|2001': [
        'The Fellowship',
        'Concerning Hobbits'
    ]
};

function scoreTrack(track, movie) {
    var title = normalize(track.title);
    var film = normalize(movie);
    var score = 0;

    if (/\bmain theme\b/.test(title)) score += 120;
    if (/\bmain titles?\b/.test(title)) score += 115;
    if (/\bopening titles?\b/.test(title)) score += 105;
    if (/\bopening theme\b/.test(title)) score += 105;
    if (/\btitle theme\b/.test(title)) score += 105;
    if (/\btheme from\b/.test(title)) score += 95;
    if (/\btheme\b/.test(title)) score += 70;
    if (/\boverture\b/.test(title)) score += 65;

    if (film && title === film) score += 105;

    if (/\b(remix|karaoke|interview|dialogue|trailer)\b/
        .test(title)) {
        score -= 70;
    }

    if (track.position === 1) score += 15;
    else if (track.position === 2) score += 8;

    if (track.length >= 60000 &&
        track.length <= 480000) {
        score += 10;
    }

    return score;
}

function chooseTheme(tracks, movie, year) {
    if (!tracks.length) return null;

    var key = normalize(movie) + '|' + year;
    var known = KNOWN_THEMES[key] || [];

    for (var i = 0; i < known.length; i++) {
        var wanted = normalize(known[i]);

        for (var j = 0; j < tracks.length; j++) {
            var actual = normalize(tracks[j].title);

            if (
                actual === wanted ||
                actual.indexOf(wanted + ' ') === 0
            ) {
                return {
                    id: tracks[j].id,
                    title: tracks[j].title,
                    score: 200 - i,
                    confidence: 'high',
                    reason: 'Відома тема фільму'
                };
            }
        }
    }

    var ranked = tracks.map(function (track) {
        return {
            track: track,
            score: scoreTrack(track, movie)
        };
    });

    ranked.sort(function (a, b) {
        return b.score - a.score;
    });

    var best = ranked[0];

    if (best.score >= 35) {
        return {
            id: best.track.id,
            title: best.track.title,
            score: best.score,
            confidence:
                best.score >= 85 ? 'high' : 'medium',
            reason: 'Автоматичний вибір'
        };
    }

    var candidates = tracks.filter(function (track) {
        return !/\b(remix|karaoke|dialogue|interview|trailer)\b/
            .test(normalize(track.title)) &&
            (track.length >= 60000 || !track.length);
    });

    if (!candidates.length) return null;

    return {
        id: candidates[0].id,
        title: candidates[0].title,
        score: scoreTrack(candidates[0], movie),
        confidence: 'low',
        reason: 'Резервний кандидат'
    };
}

function findTracks(release, info, callback) {
    var url =
        MB + 'release/' +
        encodeURIComponent(release.id) +
        '?inc=recordings&fmt=json';

    mbRequest(url, function (error, data) {
        if (error) return callback(error);

        var tracks = [];

        (data.media || []).forEach(function (medium, disc) {
            (medium.tracks || []).forEach(function (item, index) {
                var recording = item.recording || {};
                var title = item.title || recording.title;

                if (!title) return;

                tracks.push({
                    id: recording.id || item.id || '',
                    title: title,
                    disc: disc + 1,
                    position: num(item.position, index + 1),
                    length: num(
                        item.length || recording.length,
                        0
                    )
                });
            });
        });

        if (!tracks.length) {
            return callback('Треклист порожній');
        }

        callback(null, {
            tracks: tracks,
            theme: chooseTheme(
                tracks,
                info.title,
                info.year
            )
        });
    });
}

function discover(info, callback) {
    var key =
        info.id + '|' +
        normalize(info.title) + '|' +
        info.year;

    var cached = cacheGet(key);

    if (cached) {
        return callback(null, cached, true);
    }

    findAlbum(info, function (error, album) {
        if (error) return callback(error);

        if (!album) {
            var empty = {
                found: false,
                album: null,
                release: null,
                theme: null,
                tracks: []
            };

            cacheSet(key, empty);
            return callback(null, empty, false);
        }

        findRelease(album, function (releaseError, release) {
            if (releaseError) {
                return callback(releaseError);
            }

            findTracks(release, info, function (trackError, data) {
                if (trackError) {
                    return callback(trackError);
                }

                var result = {
                    found: true,
                    movie: info.title,
                    year: info.year,
                    album: album,
                    release: release,
                    theme: data.theme,
                    tracks: data.tracks
                };

                cacheSet(key, result);
                callback(null, result, false);
            });
        });
    });
}

/* ===================================
   AUDIO SOURCE FINDER
=================================== */

/*
 * Jamendo results are NOT assumed
 * to be original soundtrack recordings.
 *
 * Strict matching requires both:
 * 1. Track title
 * 2. Artist name
 *
 * A stream URL is metadata only here.
 * This version does not auto-play it.
 */

function sourceScore(item, theme, artist) {
    var title = normalize(item.name);
    var wanted = normalize(theme);
    var performer = normalize(item.artist_name);
    var expected = normalize(artist);

    var score = 0;

    if (!title || !wanted || !performer || !expected) {
        return 0;
    }

    if (title === wanted) {
        score += 60;
    } else if (
        title.indexOf(wanted + ' ') === 0
    ) {
        score += 40;
    } else {
        return 0;
    }

    if (performer === expected) {
        score += 40;
    } else {
        return 0;
    }

    if (
        /\b(cover|tribute|remix|karaoke|reimagined)\b/
            .test(title)
    ) {
        score -= 50;
    }

    return Math.max(0, score);
}

function searchJamendo(theme, artist, callback) {
    var clientId = String(
        get('jamendo_id') || ''
    ).trim();

    if (!clientId) {
        callback(
            'Не задано Jamendo client_id'
        );
        return;
    }

    if (!theme || !artist) {
        callback(
            'Немає назви композиції або виконавця'
        );
        return;
    }

    var url =
        JAM +
        '?client_id=' + encodeURIComponent(clientId) +
        '&format=json' +
        '&limit=50' +
        '&search=' + encodeURIComponent(theme) +
        '&audioformat=mp31';

    request(url, function (error, data) {
        if (error) return callback(error);

        if (
            !data ||
            !data.headers ||
            data.headers.status !== 'success'
        ) {
            var message = data && data.headers
                ? data.headers.error_message
                : 'Невідома помилка Jamendo';

            return callback(
                message || 'Помилка Jamendo API'
            );
        }

        var items = data.results || [];

        var ranked = items.map(function (item) {
            return {
                id: item.id,
                title: item.name,
                artist: item.artist_name,
                album: item.album_name || '',
                duration: item.duration || 0,
                audio: item.audio || '',
                license: item.license_ccurl || '',
                score: sourceScore(
                    item,
                    theme,
                    artist
                )
            };
        });

        ranked.sort(function (a, b) {
            return b.score - a.score;
        });

        var exact = ranked.filter(function (item) {
            return item.score >= 90 &&
                   urlOK(item.audio);
        });

        callback(null, {
            provider: 'Jamendo',
            searchedTitle: theme,
            searchedArtist: artist,
            candidates: ranked.slice(0, 10),
            exactMatches: exact,
            found: exact.length > 0,
            status: exact.length
                ? 'Точний збіг у каталозі'
                : 'Точного збігу немає'
        });
    });
}

function findSource(result, callback) {
    if (
        !result ||
        !result.found ||
        !result.theme ||
        !result.album
    ) {
        return callback(
            'Головну композицію ще не визначено'
        );
    }

    if (sourceBusy) {
        return callback(
            'Пошук джерела вже виконується'
        );
    }

    sourceBusy = true;

    searchJamendo(
        result.theme.title,
        result.album.artist,
        function (error, data) {
            sourceBusy = false;

            lastError = error || '';
            lastSource = data || null;

            log('Audio Source Finder:', error, data);

            callback(error, data);
        }
    );
}

function sourceMessage(error, data) {
    if (error) return 'OST: ' + error;

    if (data && data.found) {
        return 'OST: точний збіг знайдено у Jamendo';
    }

    return 'OST: оригінальний запис у Jamendo не знайдено';
}

function testSource() {
    if (sourceBusy) {
        notify('OST: пошук уже виконується');
        return;
    }

    notify('OST: перевірка джерела Interstellar...');

    discover({
        id: '157336',
        title: 'Interstellar',
        year: '2014'
    }, function (error, result) {
        set('source_test', false);

        if (error) {
            notify('OST: ' + error);
            return;
        }

        lastResult = result;

        findSource(result, function (sourceError, data) {
            notify(sourceMessage(sourceError, data));
        });
    });
}

/* ===================================
   MANUAL AUDIO LIBRARY
=================================== */

function library() {
    try {
        var raw = Lampa.Storage.get(
            P + 'library',
            '{}'
        );

        var data = typeof raw === 'string'
            ? JSON.parse(raw)
            : raw;

        return data && typeof data === 'object'
            ? data
            : {};
    } catch (e) {
        return {};
    }
}

function addTrack(id, url) {
    if (!id || !urlOK(url)) return false;

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

/* ===================================
   AUDIO PLAYBACK
=================================== */

function stopAudio() {
    audioGeneration++;

    clearTimeout(audioTimer);
    clearInterval(fadeTimer);

    audioTimer = null;
    fadeTimer = null;

    if (audio) {
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
            audio.volume = 0;
        } catch (e) {}
    }
}

function ensureAudio() {
    if (audio) return audio;

    audio = document.createElement('audio');

    audio.preload = 'auto';
    audio.volume = 0;
    audio.style.display = 'none';

    audio.setAttribute('playsinline', 'playsinline');

    audio.addEventListener('timeupdate', function () {
        if (!activeCard || !enabled(get('loop'))) {
            return;
        }

        var fragment = clamp(
            num(get('fragment'), 30),
            10,
            60
        );

        if (audio.currentTime >= fragment) {
            try {
                audio.currentTime = 0;
            } catch (e) {}
        }
    });

    audio.addEventListener('ended', function () {
        if (!activeCard || !enabled(get('loop'))) {
            return;
        }

        try {
            audio.currentTime = 0;
            var p = audio.play();

            if (p && p.catch) {
                p.catch(function () {});
            }
        } catch (e) {}
    });

    (document.body || document.documentElement)
        .appendChild(audio);

    return audio;
}

function fadeIn(generation) {
    var player = audio;
    if (!player) return;

    clearInterval(fadeTimer);

    var target = clamp(
        num(get('volume'), 20) / 100,
        0,
        1
    );

    if (!enabled(get('fade'))) {
        player.volume = target;
        return;
    }

    var step = 0;
    player.volume = 0;

    fadeTimer = setInterval(function () {
        if (
            generation !== audioGeneration ||
            player.paused
        ) {
            clearInterval(fadeTimer);
            return;
        }

        step++;

        player.volume = clamp(
            target * step / 20,
            0,
            target
        );

        if (step >= 20) {
            clearInterval(fadeTimer);
        }
    }, 100);
}

function playAudio(url, generation) {
    if (
        generation !== audioGeneration ||
        !activeCard ||
        !urlOK(url)
    ) {
        return;
    }

    stopTest(false);

    var player = ensureAudio();

    try {
        player.pause();
        player.src = url;
        player.volume = 0;
        player.load();

        var p = player.play();

        if (p && p.then) {
            p.then(function () {
                if (
                    generation !== audioGeneration ||
                    !activeCard
                ) {
                    player.pause();
                    return;
                }

                fadeIn(generation);
            }).catch(function (error) {
                log('Playback:', error);
            });
        } else {
            fadeIn(generation);
        }
    } catch (e) {
        log('Audio:', e);
    }
}

/* ===================================
   WEB AUDIO TEST
=================================== */

function stopTest(reset) {
    clearTimeout(testTimer);
    testTimer = null;

    testOscillators.forEach(function (osc) {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e) {}
    });

    testOscillators = [];

    if (testContext) {
        try {
            var p = testContext.close();
            if (p && p.catch) {
                p.catch(function () {});
            }
        } catch (e) {}

        testContext = null;
    }

    if (reset) set('test_sound', false);
}

function testSound() {
    stopAudio();
    stopTest(false);

    var Context =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!Context) {
        notify('OST: Web Audio недоступний');
        return;
    }

    try {
        var ctx = new Context();
        testContext = ctx;

        var master = ctx.createGain();

        master.gain.value = clamp(
            num(get('volume'), 20) / 100,
            0,
            1
        );

        master.connect(ctx.destination);

        var notes = [
            261.63,
            329.63,
            392.00,
            523.25,
            392.00,
            329.63,
            293.66,
            261.63
        ];

        var start = ctx.currentTime + 0.1;

        notes.forEach(function (frequency, index) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            var from = start + index * 0.7;
            var to = from + 0.6;

            osc.type = 'sine';
            osc.frequency.value = frequency;

            gain.gain.setValueAtTime(0, from);
            gain.gain.linearRampToValueAtTime(
                0.5,
                from + 0.05
            );
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                to
            );

            osc.connect(gain);
            gain.connect(master);

            osc.start(from);
            osc.stop(to + 0.05);

            testOscillators.push(osc);
        });

        if (ctx.state === 'suspended') {
            var resume = ctx.resume();

            if (resume && resume.catch) {
                resume.catch(function () {});
            }
        }

        testTimer = setTimeout(function () {
            stopTest(true);
        }, 7000);

        notify('OST: тестова мелодія');
    } catch (e) {
        stopTest(true);
        log('Web Audio:', e);
    }
}

/* ===================================
   LAMPA CARD
=================================== */

function extractCard(event) {
    var data = event && (event.data || event);

    if (!data) return null;

    return data.movie ||
        data.card ||
        data.object ||
        (data.data && data.data.id ? data.data : null) ||
        (data.id ? data : null);
}

function isSeries(card) {
    return card.media_type === 'tv' ||
        card.number_of_seasons !== undefined ||
        card.first_air_date !== undefined;
}

function movieInfo(card) {
    if (!card || !card.id) return null;

    var title =
        card.original_title ||
        card.original_name ||
        card.title ||
        card.name ||
        '';

    var date =
        card.release_date ||
        card.first_air_date ||
        '';

    var year = String(date).slice(0, 4);

    return {
        id: String(card.id),
        title: String(title).trim(),
        year: /^\d{4}$/.test(year) ? year : ''
    };
}

function closeCard() {
    cardToken++;
    activeCard = null;
    stopAudio();
}

function openCard(card) {
    if (!card || !card.id) return;

    if (!enabled(get('enabled'))) {
        closeCard();
        return;
    }

    if (
        isSeries(card) &&
        !enabled(get('series'))
    ) {
        closeCard();
        return;
    }

    var info = movieInfo(card);
    if (!info) return;

    if (
        activeCard &&
        activeCard.id === info.id
    ) {
        return;
    }

    closeCard();

    activeCard = info;
    var token = cardToken;

    var saved = library();
    var url = saved[info.id];

    if (!urlOK(url) && enabled(get('demo_card'))) {
        url = DEMO;
    }

    if (urlOK(url)) {
        var generation = audioGeneration;

        audioTimer = setTimeout(function () {
            if (token !== cardToken) return;

            playAudio(url, generation);
        }, clamp(
            num(get('delay'), 2),
            0,
            10
        ) * 1000);
    }

    if (!enabled(get('search_enabled'))) return;

    discover(info, function (error, result) {
        if (token !== cardToken) return;

        if (error) {
            lastError = error;

            if (enabled(get('show_result'))) {
                notify('OST: ' + error);
            }

            return;
        }

        lastResult = result;
        lastError = '';

        if (enabled(get('show_result'))) {
            if (result.theme) {
                notify(
                    'OST: ' + result.theme.title +
                    ' — ' + result.album.artist
                );
            } else {
                notify('OST: головну тему не визначено');
            }
        }

        if (
            enabled(get('source_enabled')) &&
            enabled(get('source_card')) &&
            result.theme
        ) {
            findSource(result, function (sourceError, data) {
                if (
                    token === cardToken &&
                    enabled(get('show_result'))
                ) {
                    notify(
                        sourceMessage(sourceError, data)
                    );
                }
            });
        }
    });
}

function registerListeners() {
    Lampa.Listener.follow('full', function (event) {
        if (!event) return;

        if (
            event.type === 'complite' ||
            event.type === 'complete'
        ) {
            var card = extractCard(event);
            if (card) openCard(card);
        }

        if (
            event.type === 'destroy' ||
            event.type === 'close'
        ) {
            closeCard();
        }
    });

    Lampa.Listener.follow('player', function (event) {
        if (!event) return;

        if (
            event.type === 'start' ||
            event.type === 'play' ||
            event.type === 'open'
        ) {
            closeCard();
            stopTest(true);
        }
    });

    Lampa.Listener.follow('activity', function (event) {
        if (
            event &&
            event.type === 'start' &&
            event.component &&
            event.component !== 'full'
        ) {
            closeCard();
        }
    });
}

/* ===================================
   SETTINGS
=================================== */

function registerSettings() {
    var api = Lampa.SettingsApi;

    api.addComponent({
        component: COMPONENT,
        name: 'Original Soundtrack',
        icon: 'music'
    });

    function trigger(key, name, description, callback) {
        api.addParam({
            component: COMPONENT,
            param: {
                name: P + key,
                type: 'trigger',
                default: defaults[key]
            },
            field: {
                name: name,
                description: description || ''
            },
            onChange: function (value) {
                if (callback) callback(value);
            }
        });
    }

    function select(key, name, values, callback) {
        api.addParam({
            component: COMPONENT,
            param: {
                name: P + key,
                type: 'select',
                default: defaults[key],
                values: values
            },
            field: {
                name: name
            },
            onChange: function (value) {
                if (callback) callback(value);
            }
        });
    }

    trigger(
        'enabled',
        'Увімкнути Original Soundtrack',
        'Основний перемикач',
        function (value) {
            if (!enabled(value)) closeCard();
        }
    );

    trigger(
        'search_enabled',
        'Пошук саундтреків MusicBrainz',
        'Автоматичне визначення головної теми'
    );

    trigger(
        'show_result',
        'Показувати результат пошуку',
        'Повідомлення на картці'
    );

    trigger(
        'search_test',
        'Перевірити Interstellar',
        'Перевірка головної композиції',
        function (value) {
            if (!enabled(value)) return;

            notify('OST: пошук Cornfield Chase...');

            discover({
                id: '157336',
                title: 'Interstellar',
                year: '2014'
            }, function (error, result) {
                set('search_test', false);

                if (error) {
                    notify('OST: ' + error);
                    return;
                }

                lastResult = result;

                notify(
                    result.theme
                        ? 'OST: ' + result.theme.title
                        : 'OST: головну тему не визначено'
                );
            });
        }
    );

    trigger(
        'source_enabled',
        'Audio Source Finder',
        'Модуль перевірки джерел'
    );

    trigger(
        'source_card',
        'Шукати джерело при відкритті картки',
        'Лише діагностика, без відтворення'
    );

    /*
     * Lampa uses input parameters
     * for editable text fields.
     */

    api.addParam({
        component: COMPONENT,
        param: {
            name: P + 'jamendo_id',
            type: 'input',
            default: ''
        },
        field: {
            name: 'Jamendo Client ID',
            description: 'Ідентифікатор застосунку Jamendo API'
        }
    });

    trigger(
        'source_test',
        'Перевірити джерело Interstellar',
        'Пошук Cornfield Chase у Jamendo',
        function (value) {
            if (enabled(value)) {
                testSource();
            }
        }
    );

    select(
        'volume',
        'Гучність',
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
        'Плавне наростання звуку',
        'Fade In'
    );

    trigger(
        'loop',
        'Повторювати фрагмент',
        'Циклічне відтворення'
    );

    trigger(
        'series',
        'Підтримка серіалів',
        'Пошук саундтреків серіалів'
    );

    trigger(
        'demo_card',
        'Тестовий MP3 у картці',
        'Діагностичний звук, не саундтрек'
    );

    trigger(
        'test_sound',
        'Перевірити звук',
        'Синтезована мелодія',
        function (value) {
            if (enabled(value)) {
                testSound();
            } else {
                stopTest(false);
            }
        }
    );
}

/* ===================================
   PUBLIC API
=================================== */

function registerAPI() {
    window.OriginalSoundtrack = {
        version: VERSION,

        add: function (id, url) {
            var success = addTrack(id, url);

            notify(
                success
                    ? 'OST: MP3 збережено'
                    : 'OST: некоректне посилання'
            );

            return success;
        },

        remove: removeTrack,
        library: library,

        test: testSound,
        testSearch: function () {
            discover({
                id: '157336',
                title: 'Interstellar',
                year: '2014'
            }, function (error, result) {
                lastError = error || '';
                lastResult = result || null;

                notify(
                    error
                        ? 'OST: ' + error
                        : result.theme
                            ? 'OST: ' + result.theme.title
                            : 'OST: тему не визначено'
                );
            });
        },

        testSource: testSource,

        search: function (title, year, callback) {
            discover({
                id: 'manual_' +
                    normalize(title) +
                    '_' + (year || ''),
                title: title,
                year: year || ''
            }, function (error, result) {
                lastError = error || '';
                lastResult = result || null;

                if (typeof callback === 'function') {
                    callback(error, result);
                }
            });
        },

        findSource: function (callback) {
            findSource(
                lastResult,
                callback || function (error, data) {
                    notify(sourceMessage(error, data));
                }
            );
        },

        stop: function () {
            closeCard();
            stopTest(true);
        },

        clearCache: function () {
            cache = {};
            set('discovery_v150', '{}');
            notify('OST: кеш очищено');
        },

        lastResult: function () {
            return lastResult;
        },

        lastSource: function () {
            return lastSource;
        },

        tracks: function () {
            return lastResult && lastResult.tracks
                ? lastResult.tracks
                : [];
        },

        theme: function () {
            return lastResult
                ? lastResult.theme
                : null;
        },

        status: function () {
            return {
                version: VERSION,
                card: activeCard,
                playing: !!audio && !audio.paused,
                theme: lastResult && lastResult.theme,
                source: lastSource,
                lastError: lastError,
                sourceBusy: sourceBusy,
                mbQueue: mbQueue.length
            };
        }
    };
}

/* ===================================
   START
=================================== */

function init() {
    if (ready) return;
    ready = true;

    set('test_sound', false);
    set('search_test', false);
    set('source_test', false);

    loadCache();
    registerAPI();
    registerListeners();

    try {
        registerSettings();
    } catch (e) {
        log('Settings error:', e);
    }

    log('Original Soundtrack ' + VERSION + ' ready');
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
