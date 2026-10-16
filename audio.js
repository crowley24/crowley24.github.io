
(function () {
'use strict';

/*
 * ORIGINAL SOUNDTRACK 1.4.1
 * Lampa / Android TV
 *
 * MusicBrainz soundtrack discovery
 * Release and tracklist lookup
 * Intelligent main theme selection
 * Interstellar: Cornfield Chase priority
 *
 * Audio engine:
 * Manual MP3 by TMDB ID
 * Demo MP3
 * Volume / delay / fade / loop
 * Web Audio test
 *
 * No automatic copyrighted audio downloads.
 */

var VERSION = '1.4.1';
var PREFIX = 'ost10_';
var COMPONENT = 'original_soundtrack';

if (window.ost141_ready) return;
window.ost141_ready = true;

var MB = 'https://musicbrainz.org/ws/2/';

var DEMO =
    'https://interactive-examples.mdn.mozilla.net/' +
    'media/cc0-audio/t-rex-roar.mp3';

var CACHE_KEY = PREFIX + 'mb_cache_v3';
var CACHE_LIFETIME = 14 * 86400000;
var CACHE_LIMIT = 120;
var REQUEST_INTERVAL = 1250;

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
    show_result: false,
    search_test: false
};

var initialized = false;

var audio = null;
var audioTimer = null;
var fadeTimer = null;
var audioToken = 0;

var cardActive = false;
var currentCard = null;
var currentId = '';
var currentUrl = '';
var currentDemo = false;

var searchToken = 0;
var lastResult = null;
var lastError = '';

var cache = {};
var jobs = [];
var busy = false;
var lastRequest = 0;

var testContext = null;
var testOscillators = [];
var testTimer = null;

/* ===================================
   HELPERS
=================================== */

function log() {
    try {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[OST 1.4.1]');
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

function yes(value) {
    return value === true ||
           value === 'true' ||
           value === 1 ||
           value === '1';
}

function number(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getVolume() {
    return clamp(
        number(get('volume'), 20) / 100,
        0,
        1
    );
}

function validUrl(url) {
    return typeof url === 'string' &&
        /^https?:\/\/\S+$/i.test(url.trim());
}

function normalize(text) {
    text = String(text || '').toLowerCase();

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
        .replace(/\\/g, ' ')
        .replace(/[+\-&|!(){}\[\]^"~*?:/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function artistName(data) {
    var credits = data && data['artist-credit'];

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
        var raw = Lampa.Storage.get(
            CACHE_KEY,
            '{}'
        );

        var data = typeof raw === 'string'
            ? JSON.parse(raw)
            : raw;

        if (
            data &&
            typeof data === 'object' &&
            !Array.isArray(data)
        ) {
            cache = data;
        }
    } catch (e) {
        cache = {};
    }
}

function saveCache() {
    try {
        var keys = Object.keys(cache);

        if (keys.length > CACHE_LIMIT) {
            keys.sort(function (a, b) {
                return (cache[a].time || 0) -
                       (cache[b].time || 0);
            });

            while (keys.length > CACHE_LIMIT) {
                delete cache[keys.shift()];
            }
        }

        set('mb_cache_v3', JSON.stringify(cache));
    } catch (e) {
        log('Cache save error', e);
    }
}

function cacheGet(key) {
    var entry = cache[String(key)];

    if (!entry) return null;

    if (
        Date.now() - entry.time >
        CACHE_LIFETIME
    ) {
        delete cache[String(key)];
        return null;
    }

    return entry.result || null;
}

function cachePut(key, result) {
    cache[String(key)] = {
        time: Date.now(),
        result: result
    };

    saveCache();
}

/* ===================================
   MUSICBRAINZ REQUESTS
=================================== */

function requestJson(url, callback) {
    var xhr = new XMLHttpRequest();
    var finished = false;

    function done(error, data) {
        if (finished) return;

        finished = true;
        callback(error, data);
    }

    try {
        xhr.open('GET', url, true);
        xhr.timeout = 15000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (
                xhr.status >= 200 &&
                xhr.status < 300
            ) {
                try {
                    done(
                        null,
                        JSON.parse(xhr.responseText)
                    );
                } catch (e) {
                    done(
                        'Некоректна відповідь MusicBrainz'
                    );
                }
            } else {
                done(
                    'MusicBrainz HTTP ' + xhr.status
                );
            }
        };

        xhr.onerror = function () {
            done('Помилка мережі або CORS');
        };

        xhr.ontimeout = function () {
            done(
                'MusicBrainz: час очікування вичерпано'
            );
        };

        xhr.send();
    } catch (e) {
        done(String(e.message || e));
    }
}

function enqueue(url, callback) {
    jobs.push({
        url: url,
        callback: callback
    });

    processQueue();
}

function processQueue() {
    if (busy || !jobs.length) return;

    busy = true;

    var wait = Math.max(
        0,
        REQUEST_INTERVAL -
        (Date.now() - lastRequest)
    );

    setTimeout(function () {
        var job = jobs.shift();

        if (!job) {
            busy = false;
            return;
        }

        lastRequest = Date.now();

        requestJson(
            job.url,
            function (error, data) {
                busy = false;

                try {
                    job.callback(error, data);
                } catch (e) {
                    log('Callback error', e);
                }

                processQueue();
            }
        );
    }, wait);
}

/* ===================================
   SOUNDTRACK ALBUM
=================================== */

function albumScore(group, title, year) {
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

    var types =
        group['secondary-types'] || [];

    if (types.indexOf('Soundtrack') >= 0) {
        score += 35;
    }

    if (
        /original (motion picture|soundtrack|score)/i
            .test(group.title)
    ) {
        score += 20;
    }

    if (
        /\b(score|soundtrack)\b/i
            .test(group.title)
    ) {
        score += 12;
    }

    var albumYear = parseInt(
        String(
            group['first-release-date'] || ''
        ).slice(0, 4),
        10
    );

    var filmYear = parseInt(year, 10);

    if (albumYear && filmYear) {
        var difference = Math.abs(
            albumYear - filmYear
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
        number(group.score, 0) / 10
    );

    return score;
}

function chooseAlbum(groups, title, year) {
    if (!Array.isArray(groups)) return null;

    var ranked = groups.map(function (group) {
        return {
            group: group,
            score: albumScore(
                group,
                title,
                year
            )
        };
    });

    ranked.sort(function (a, b) {
        return b.score - a.score;
    });

    if (
        !ranked.length ||
        ranked[0].score < 85
    ) {
        return null;
    }

    var best = ranked[0];

    return {
        id: best.group.id,
        title: best.group.title,
        artist: artistName(best.group),
        date:
            best.group['first-release-date'] || '',
        score: Math.round(best.score),
        url:
            'https://musicbrainz.org/release-group/' +
            best.group.id
    };
}

function findAlbum(info, callback) {
    var title = cleanQuery(info.title);

    if (!title) {
        callback('Немає назви фільму');
        return;
    }

    var query =
        'releasegroup:"' + title + '"' +
        ' AND secondarytype:soundtrack';

    var url =
        MB + 'release-group/' +
        '?query=' + encodeURIComponent(query) +
        '&fmt=json&limit=20';

    enqueue(url, function (error, data) {
        if (error) {
            callback(error);
            return;
        }

        callback(
            null,
            chooseAlbum(
                data && data['release-groups'],
                info.title,
                info.year
            )
        );
    });
}

/* ===================================
   RELEASE
=================================== */

function releaseScore(release) {
    var score = 0;
    var status = String(
        release.status || ''
    );

    if (status === 'Official') score += 35;
    if (status === 'Promotion') score -= 15;
    if (status === 'Bootleg') score -= 60;

    var country = String(
        release.country || ''
    );

    if (country === 'US') score += 10;
    if (country === 'GB') score += 8;
    if (country === 'XW') score += 5;

    if (release.date) score += 5;

    var media = release.media || [];

    if (Array.isArray(media) && media.length) {
        score += 10;
    }

    var count = 0;

    media.forEach(function (medium) {
        count += number(
            medium['track-count'],
            0
        );
    });

    if (count >= 8 && count <= 45) {
        score += 15;
    } else if (count > 60) {
        score -= 10;
    }

    return score;
}

function chooseRelease(releases) {
    if (
        !Array.isArray(releases) ||
        !releases.length
    ) {
        return null;
    }

    var ranked = releases.slice().sort(
        function (a, b) {
            return releaseScore(b) -
                   releaseScore(a);
        }
    );

    return ranked[0];
}

function findRelease(album, callback) {
    var url =
        MB + 'release/' +
        '?release-group=' +
        encodeURIComponent(album.id) +
        '&fmt=json&limit=50';

    enqueue(url, function (error, data) {
        if (error) {
            callback(error);
            return;
        }

        var release = chooseRelease(
            data && data.releases
        );

        if (!release) {
            callback(
                'Реліз альбому не знайдено'
            );
            return;
        }

        callback(null, {
            id: release.id,
            title: release.title,
            date: release.date || '',
            country: release.country || '',
            status: release.status || ''
        });
    });
}

/* ===================================
   MAIN THEME SELECTION 1.4.1
=================================== */

/*
 * Known themes are suggestions, not
 * fabricated tracklist entries.
 *
 * A preferred title is selected ONLY
 * if it exists in the real tracklist.
 */

var KNOWN_THEMES = {
    'interstellar|2014': [
        'Cornfield Chase',
        'Day One',
        'Stay',
        'No Time for Caution'
    ],

    'gladiator|2000': [
        'Now We Are Free',
        'The Battle'
    ],

    'inception|2010': [
        'Time',
        'Dream Is Collapsing'
    ],

    'the dark knight|2008': [
        'Why So Serious?',
        'A Dark Knight'
    ],

    'pirates of the caribbean the curse of the black pearl|2003': [
        "He's a Pirate",
        'The Medallion Calls'
    ],

    'the lord of the rings the fellowship of the ring|2001': [
        'The Fellowship',
        'Concerning Hobbits'
    ],

    'harry potter and the philosophers stone|2001': [
        "Hedwig's Theme"
    ],

    'harry potter and the sorcerers stone|2001': [
        "Hedwig's Theme"
    ],

    'star wars|1977': [
        'Main Title',
        'Star Wars Main Title'
    ],

    'jurassic park|1993': [
        'Theme from Jurassic Park',
        'Journey to the Island'
    ],

    'titanic|1997': [
        'My Heart Will Go On',
        'Rose'
    ]
};

function preferredThemes(filmTitle, year) {
    var key =
        normalize(filmTitle) +
        '|' +
        String(year || '');

    return KNOWN_THEMES[key] || [];
}

function trackScore(track, filmTitle) {
    var title = normalize(track.title);
    var film = normalize(filmTitle);

    if (!title) return -100;

    var score = 0;

    if (/\bmain theme\b/.test(title)) {
        score += 120;
    }

    if (/\bmain titles?\b/.test(title)) {
        score += 115;
    }

    if (/\bopening titles?\b/.test(title)) {
        score += 105;
    }

    if (/\bopening theme\b/.test(title)) {
        score += 105;
    }

    if (/\btitle theme\b/.test(title)) {
        score += 105;
    }

    if (/\btheme from\b/.test(title)) {
        score += 95;
    }

    if (/\btheme\b/.test(title)) {
        score += 70;
    }

    if (/\boverture\b/.test(title)) {
        score += 65;
    }

    if (/\bprologue\b/.test(title)) {
        score += 30;
    }

    if (film && title === film) {
        score += 105;
    }

    if (
        film &&
        title.indexOf(film + ' theme') === 0
    ) {
        score += 115;
    }

    if (/\bend credits?\b/.test(title)) {
        score += 20;
    }

    if (/\bfinale\b/.test(title)) {
        score += 15;
    }

    if (
        /\b(remix|karaoke|demo|interview)\b/
            .test(title)
    ) {
        score -= 45;
    }

    if (
        /\b(dialogue|trailer|bonus)\b/
            .test(title)
    ) {
        score -= 70;
    }

    var position = number(
        track.position,
        99
    );

    if (position === 1) {
        score += 15;
    } else if (position === 2) {
        score += 8;
    } else if (position === 3) {
        score += 5;
    }

    var duration = number(
        track.length,
        0
    );

    if (
        duration >= 60000 &&
        duration <= 480000
    ) {
        score += 10;
    }

    return score;
}

function themeObject(track, score, reason, confidence) {
    return {
        id: track.id,
        title: track.title,
        position: track.position,
        disc: track.disc,
        length: track.length,
        score: score,
        reason: reason,
        confidence: confidence
    };
}

function chooseTheme(tracks, filmTitle, year) {
    if (
        !Array.isArray(tracks) ||
        !tracks.length
    ) {
        return null;
    }

    var preferred = preferredThemes(
        filmTitle,
        year
    );

    /*
     * Priority 1:
     * Exact match with known composition.
     */

    for (
        var i = 0;
        i < preferred.length;
        i++
    ) {
        var wanted = normalize(preferred[i]);

        for (
            var j = 0;
            j < tracks.length;
            j++
        ) {
            var actual = normalize(
                tracks[j].title
            );

            if (
                actual === wanted ||
                actual.indexOf(
                    wanted + ' '
                ) === 0
            ) {
                return themeObject(
                    tracks[j],
                    200 - i,
                    'Відома музична тема фільму',
                    'high'
                );
            }
        }
    }

    /*
     * Priority 2:
     * General main-theme naming.
     */

    var ranked = tracks.map(
        function (track) {
            return {
                track: track,
                score: trackScore(
                    track,
                    filmTitle
                )
            };
        }
    );

    ranked.sort(function (a, b) {
        return b.score - a.score;
    });

    var best = ranked[0];

    if (!best) return null;

    if (best.score >= 85) {
        return themeObject(
            best.track,
            best.score,
            'Сильний збіг за назвою',
            'high'
        );
    }

    if (best.score >= 35) {
        return themeObject(
            best.track,
            best.score,
            'Імовірна головна тема',
            'medium'
        );
    }

    /*
     * Priority 3:
     * Conservative fallback.
     *
     * We do not label the first track
     * as a confirmed main theme.
     */

    var candidates = tracks.filter(
        function (track) {
            var title = normalize(
                track.title
            );

            var length = number(
                track.length,
                0
            );

            if (
                /\b(dialogue|interview|trailer|bonus|remix|karaoke)\b/
                    .test(title)
            ) {
                return false;
            }

            return length >= 60000 ||
                   length === 0;
        }
    );

    if (!candidates.length) {
        return null;
    }

    var fallback = candidates[0];

    return themeObject(
        fallback,
        trackScore(
            fallback,
            filmTitle
        ),
        'Резервний кандидат, не підтверджена головна тема',
        'low'
    );
}

/* ===================================
   TRACKLIST
=================================== */

function loadTracklist(
    release,
    filmTitle,
    year,
    callback
) {
    var url =
        MB + 'release/' +
        encodeURIComponent(release.id) +
        '?inc=recordings&fmt=json';

    enqueue(url, function (error, data) {
        if (error) {
            callback(error);
            return;
        }

        var media = data && data.media;

        if (!Array.isArray(media)) {
            callback(
                'MusicBrainz не повернув треклист'
            );
            return;
        }

        var tracks = [];

        media.forEach(
            function (medium, discIndex) {
                var items =
                    medium.tracks || [];

                items.forEach(
                    function (item, index) {
                        var recording =
                            item.recording || {};

                        var title =
                            item.title ||
                            recording.title ||
                            '';

                        if (!title) return;

                        tracks.push({
                            id:
                                recording.id ||
                                item.id ||
                                '',
                            title: title,
                            position: number(
                                item.position,
                                index + 1
                            ),
                            disc: discIndex + 1,
                            length: number(
                                item.length ||
                                recording.length,
                                0
                            )
                        });
                    }
                );
            }
        );

        if (!tracks.length) {
            callback(
                'Список композицій порожній'
            );
            return;
        }

        callback(null, {
            tracks: tracks,
            theme: chooseTheme(
                tracks,
                filmTitle,
                year
            )
        });
    });
}

/* ===================================
   COMPLETE DISCOVERY
=================================== */

function discover(info, callback) {
    var existing = cacheGet(info.id);

    if (existing) {
        callback(null, existing, true);
        return;
    }

    findAlbum(info, function (error, album) {
        if (error) {
            callback(error);
            return;
        }

        if (!album) {
            var missing = {
                found: false,
                album: null,
                release: null,
                theme: null,
                tracks: []
            };

            cachePut(info.id, missing);

            callback(
                null,
                missing,
                false
            );

            return;
        }

        findRelease(
            album,
            function (releaseError, release) {
                if (releaseError) {
                    callback(releaseError);
                    return;
                }

                loadTracklist(
                    release,
                    info.title,
                    info.year,
                    function (trackError, trackData) {
                        if (trackError) {
                            callback(trackError);
                            return;
                        }

                        var result = {
                            found: true,
                            movie: info.title,
                            year: info.year,
                            album: album,
                            release: release,
                            theme: trackData.theme,
                            tracks: trackData.tracks
                        };

                        cachePut(
                            info.id,
                            result
                        );

                        callback(
                            null,
                            result,
                            false
                        );
                    }
                );
            }
        );
    });
}

function resultMessage(result) {
    if (!result || !result.found) {
        return 'OST: саундтрек не знайдено';
    }

    if (!result.theme) {
        return 'OST: альбом знайдено, головну тему не визначено';
    }

    var theme = result.theme;

    if (theme.confidence === 'low') {
        return 'OST кандидат: ' +
            theme.title +
            ' (не підтверджено)';
    }

    return 'OST знайдено: ' +
        theme.title +
        (result.album.artist
            ? ' — ' + result.album.artist
            : '');
}

function searchCard(info) {
    var token = ++searchToken;

    discover(
        info,
        function (error, result, fromCache) {
            if (
                token !== searchToken ||
                !cardActive ||
                currentId !== info.id
            ) {
                return;
            }

            if (error) {
                lastError = error;

                log(
                    'Search error',
                    error
                );

                if (yes(get('show_result'))) {
                    notify('OST: ' + error);
                }

                return;
            }

            lastError = '';
            lastResult = result;

            log(
                'Soundtrack discovered',
                result,
                fromCache
                    ? 'CACHE'
                    : 'NETWORK'
            );

            if (yes(get('show_result'))) {
                notify(
                    resultMessage(result)
                );
            }
        }
    );
}

function testSearch() {
    notify(
        'OST: аналіз Interstellar...'
    );

    discover({
        id: '157336',
        title: 'Interstellar',
        year: '2014'
    }, function (error, result) {
        set('search_test', false);

        if (error) {
            lastError = error;

            notify(
                'OST: ' + error
            );

            return;
        }

        lastError = '';
        lastResult = result;

        notify(
            resultMessage(result)
        );

        if (result && result.found) {
            log(
                'Album:',
                result.album
            );

            log(
                'Release:',
                result.release
            );

            log(
                'Selected theme:',
                result.theme
            );

            log(
                'All tracks:',
                result.tracks
            );
        }
    });
}

/* ===================================
   MANUAL AUDIO LIBRARY
=================================== */

function library() {
    try {
        var raw = Lampa.Storage.get(
            PREFIX + 'library',
            '{}'
        );

        var data =
            typeof raw === 'string'
                ? JSON.parse(raw)
                : raw;

        if (
            data &&
            typeof data === 'object' &&
            !Array.isArray(data)
        ) {
            return data;
        }
    } catch (e) {}

    return {};
}

function addTrack(id, url) {
    if (
        !id ||
        !validUrl(url)
    ) {
        return false;
    }

    var data = library();

    data[String(id)] = url.trim();

    set(
        'library',
        JSON.stringify(data)
    );

    return true;
}

function removeTrack(id) {
    var data = library();

    delete data[String(id)];

    set(
        'library',
        JSON.stringify(data)
    );
}

/* ===================================
   AUDIO ENGINE
=================================== */

function ensureAudio() {
    if (audio) return audio;

    audio = document.createElement(
        'audio'
    );

    audio.preload = 'auto';
    audio.volume = 0;
    audio.loop = false;
    audio.style.display = 'none';

    audio.setAttribute(
        'playsinline',
        'playsinline'
    );

    audio.addEventListener(
        'timeupdate',
        function () {
            if (
                !cardActive ||
                !yes(get('loop'))
            ) {
                return;
            }

            var fragment = clamp(
                number(
                    get('fragment'),
                    30
                ),
                10,
                60
            );

            if (
                audio.currentTime >=
                fragment
            ) {
                try {
                    audio.currentTime = 0;
                } catch (e) {}
            }
        }
    );

    audio.addEventListener(
        'ended',
        function () {
            if (
                !cardActive ||
                !yes(get('loop'))
            ) {
                return;
            }

            try {
                audio.currentTime = 0;

                var promise =
                    audio.play();

                if (
                    promise &&
                    promise.catch
                ) {
                    promise.catch(
                        function (e) {
                            log(
                                'Loop error',
                                e
                            );
                        }
                    );
                }
            } catch (e) {}
        }
    );

    audio.addEventListener(
        'error',
        function () {
            if (audio.error) {
                log(
                    'Audio error',
                    audio.error.code,
                    audio.error.message || ''
                );
            }
        }
    );

    try {
        (
            document.body ||
            document.documentElement
        ).appendChild(audio);
    } catch (e) {}

    return audio;
}

function clearAudioTimers() {
    clearTimeout(audioTimer);
    clearInterval(fadeTimer);

    audioTimer = null;
    fadeTimer = null;
}

function stopAudio() {
    audioToken++;

    clearAudioTimers();

    cardActive = false;
    currentCard = null;
    currentId = '';
    currentUrl = '';
    currentDemo = false;

    if (audio) {
        try {
            audio.pause();
            audio.removeAttribute(
                'src'
            );
            audio.load();
            audio.volume = 0;
        } catch (e) {}
    }
}

function fadeIn(token) {
    if (!audio) return;

    clearInterval(fadeTimer);

    var target = getVolume();

    if (!yes(get('fade'))) {
        audio.volume = target;
        return;
    }

    var step = 0;

    audio.volume = 0;

    fadeTimer = setInterval(
        function () {
            if (
                !audio ||
                audio.paused ||
                token !== audioToken
            ) {
                clearInterval(
                    fadeTimer
                );

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
                clearInterval(
                    fadeTimer
                );

                fadeTimer = null;
            }
        },
        100
    );
}

function playUrl(url, id, token) {
    if (
        !cardActive ||
        token !== audioToken ||
        id !== currentId ||
        !validUrl(url)
    ) {
        return;
    }

    stopTest(false);

    var player = ensureAudio();

    try {
        player.pause();

        player.src = url;
        player.volume = 0;
        player.loop = false;

        player.load();

        var promise =
            player.play();

        if (
            promise &&
            promise.then
        ) {
            promise.then(
                function () {
                    if (
                        token !== audioToken ||
                        !cardActive
                    ) {
                        player.pause();
                        return;
                    }

                    fadeIn(token);
                }
            ).catch(
                function (e) {
                    log(
                        'Playback error',
                        e
                    );
                }
            );
        } else {
            fadeIn(token);
        }
    } catch (e) {
        log(
            'Audio exception',
            e
        );
    }
}

/* ===================================
   MOVIE CARD
=================================== */

function extractCard(event) {
    if (!event) return null;

    var data =
        event.data || event;

    return data.movie ||
        data.card ||
        data.object ||
        (
            data.data &&
            data.data.id
                ? data.data
                : null
        ) ||
        (
            data.id
                ? data
                : null
        );
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
    if (
        !card ||
        !card.id
    ) {
        return null;
    }

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

    var year =
        String(date).slice(0, 4);

    return {
        id: String(card.id),
        title: String(title).trim(),
        year:
            /^\d{4}$/.test(year)
                ? year
                : ''
    };
}

function openCard(card) {
    if (
        !card ||
        !card.id
    ) {
        return;
    }

    if (!yes(get('enabled'))) {
        stopAudio();
        return;
    }

    if (
        isSeries(card) &&
        !yes(get('series'))
    ) {
        stopAudio();
        return;
    }

    var info = movieInfo(card);

    if (!info) return;

    if (
        cardActive &&
        currentId === info.id
    ) {
        return;
    }

    stopAudio();

    cardActive = true;
    currentCard = card;
    currentId = info.id;

    var tracks = library();
    var url = tracks[info.id];

    if (
        !validUrl(url) &&
        yes(get('demo_card'))
    ) {
        url = DEMO;
        currentDemo = true;
    }

    if (validUrl(url)) {
        currentUrl = url;

        var token = audioToken;

        audioTimer = setTimeout(
            function () {
                playUrl(
                    url,
                    info.id,
                    token
                );
            },
            clamp(
                number(
                    get('delay'),
                    2
                ),
                0,
                10
            ) * 1000
        );
    }

    if (
        yes(get('search_enabled')) &&
        info.title
    ) {
        searchCard(info);
    }
}

/* ===================================
   WEB AUDIO TEST
=================================== */

function stopTest(reset) {
    clearTimeout(testTimer);

    testTimer = null;

    testOscillators.forEach(
        function (osc) {
            try {
                osc.stop();
            } catch (e) {}

            try {
                osc.disconnect();
            } catch (e) {}
        }
    );

    testOscillators = [];

    if (testContext) {
        try {
            var promise =
                testContext.close();

            if (
                promise &&
                promise.catch
            ) {
                promise.catch(
                    function () {}
                );
            }
        } catch (e) {}

        testContext = null;
    }

    if (reset) {
        set(
            'test_sound',
            false
        );
    }
}

function testSound() {
    stopAudio();
    stopTest(false);

    var Context =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!Context) {
        notify(
            'OST: Web Audio недоступний'
        );
        return;
    }

    try {
        var ctx = new Context();

        testContext = ctx;

        var master =
            ctx.createGain();

        master.gain.value =
            getVolume();

        master.connect(
            ctx.destination
        );

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

        var now =
            ctx.currentTime + 0.1;

        notes.forEach(
            function (note) {
                var osc =
                    ctx.createOscillator();

                var gain =
                    ctx.createGain();

                var start =
                    now + note[1];

                var end =
                    start + note[2];

                osc.type = 'sine';

                osc.frequency.value =
                    note[0];

                gain.gain.setValueAtTime(
                    0,
                    start
                );

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

                testOscillators.push(
                    osc
                );
            }
        );

        if (
            ctx.state === 'suspended'
        ) {
            var resume =
                ctx.resume();

            if (
                resume &&
                resume.catch
            ) {
                resume.catch(
                    function (e) {
                        log(
                            'Audio resume error',
                            e
                        );
                    }
                );
            }
        }

        testTimer = setTimeout(
            function () {
                stopTest(true);
            },
            8000
        );

        notify(
            'OST: тестова мелодія'
        );
    } catch (e) {
        stopTest(true);

        log(
            'Web Audio error',
            e
        );
    }
}

/* ===================================
   LAMPA EVENTS
=================================== */

function registerListeners() {
    Lampa.Listener.follow(
        'full',
        function (event) {
            if (
                !event ||
                !event.type
            ) {
                return;
            }

            if (
                event.type === 'complite' ||
                event.type === 'complete'
            ) {
                var card =
                    extractCard(event);

                if (
                    card &&
                    card.id
                ) {
                    openCard(card);
                }
            }

            if (
                event.type === 'destroy' ||
                event.type === 'close'
            ) {
                searchToken++;
                stopAudio();
            }
        }
    );

    Lampa.Listener.follow(
        'player',
        function (event) {
            if (!event) return;

            if (
                event.type === 'start' ||
                event.type === 'play' ||
                event.type === 'open'
            ) {
                searchToken++;
                stopAudio();
                stopTest(true);
            }
        }
    );

    Lampa.Listener.follow(
        'activity',
        function (event) {
            if (!event) return;

            if (
                event.type === 'start' &&
                event.component &&
                event.component !== 'full'
            ) {
                searchToken++;
                stopAudio();
            }
        }
    );
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

    function trigger(
        key,
        title,
        description,
        callback
    ) {
        api.addParam({
            component: COMPONENT,

            param: {
                name: PREFIX + key,
                type: 'trigger',
                default: defaults[key]
            },

            field: {
                name: title,
                description:
                    description || ''
            },

            onChange: function (value) {
                if (callback) {
                    callback(value);
                }
            }
        });
    }

    function select(
        key,
        title,
        values,
        callback
    ) {
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
                if (callback) {
                    callback(value);
                }
            }
        });
    }

    trigger(
        'enabled',
        'Увімкнути Original Soundtrack',
        'Автоматичний пошук та фоновий звук',
        function (value) {
            if (!yes(value)) {
                searchToken++;
                stopAudio();
            }
        }
    );

    trigger(
        'search_enabled',
        'Автоматичний пошук музики',
        'Пошук альбому та головної теми'
    );

    trigger(
        'show_result',
        'Показувати знайдену композицію',
        'Повідомлення поверх картки'
    );

    trigger(
        'search_test',
        'Перевірити пошук Interstellar',
        'Пошук Cornfield Chase у треклисті',
        function (value) {
            if (yes(value)) {
                testSearch();
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
            if (
                audio &&
                !audio.paused
            ) {
                audio.volume = clamp(
                    number(value, 20) / 100,
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
        'Fade In протягом 2 секунд'
    );

    trigger(
        'loop',
        'Повторювати фрагмент',
        'Безперервний повтор музики'
    );

    trigger(
        'series',
        'Підтримка серіалів',
        'Пошук музики для серіалів'
    );

    trigger(
        'demo_card',
        'Тест MP3 у картці',
        'Діагностичний аудіоефект',
        function (value) {
            if (
                !yes(value) &&
                currentDemo
            ) {
                stopAudio();
            }
        }
    );

    trigger(
        'test_sound',
        'Перевірити звук',
        'Синтезована тестова мелодія',
        function (value) {
            if (yes(value)) {
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

function registerApi() {
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
            var ok = addTrack(
                id,
                url
            );

            notify(
                ok
                    ? 'OST: MP3 збережено'
                    : 'OST: неправильне посилання'
            );

            return ok;
        },

        remove: removeTrack,

        library: library,

        search: function (
            title,
            year,
            callback
        ) {
            discover({
                id:
                    'manual_' +
                    normalize(title) +
                    '_' +
                    String(year || ''),

                title: title,
                year: year || ''
            }, function (error, result) {
                lastError =
                    error || '';

                lastResult =
                    result || null;

                if (
                    typeof callback ===
                    'function'
                ) {
                    callback(
                        error,
                        result
                    );
                }
            });
        },

        clearCache: function () {
            cache = {};
            saveCache();

            notify(
                'OST: кеш очищено'
            );
        },

        lastResult: function () {
            return lastResult;
        },

        tracks: function () {
            return lastResult &&
                lastResult.tracks
                    ? lastResult.tracks
                    : [];
        },

        theme: function () {
            return lastResult &&
                lastResult.theme
                    ? lastResult.theme
                    : null;
        },

        status: function () {
            return {
                version: VERSION,

                currentId: currentId,

                cardActive: cardActive,

                currentDemo: currentDemo,

                playing:
                    !!audio &&
                    !audio.paused,

                audioUrl: currentUrl,

                lastResult: lastResult,

                lastError: lastError,

                queueLength: jobs.length
            };
        }
    };
}

/* ===================================
   INITIALIZATION
=================================== */

function init() {
    if (initialized) return;

    initialized = true;

    set(
        'test_sound',
        false
    );

    set(
        'search_test',
        false
    );

    loadCache();

    registerApi();

    registerListeners();

    try {
        registerSettings();
    } catch (e) {
        log(
            'Settings error',
            e
        );
    }

    log(
        'Original Soundtrack ' +
        VERSION +
        ' ready'
    );
}

var attempts = 0;

var wait = setInterval(
    function () {
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

            log(
                'Initialization timeout'
            );
        }
    },
    500
);

})();
