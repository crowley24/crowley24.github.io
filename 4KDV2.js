
(function () {
'use strict';

/* 4K Pro 63.1.0 — Lampa / Jackett / TorrServer */
if (window.uadv631_ready) return;
window.uadv631_ready = true;

var VERSION = '63.1.0';
var P = 'uadv62_';
var GB = 1073741824, MB = 1048576;
var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';
var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv|webm)$/i;
var $ = window.jQuery || window.$;

var cache = {}, cacheOrder = [];
var busy = false, dialog = null, toastTimer = null;
var activeController = null, operationId = 0;
var mounted = false, settingsDone = false;

function log() {
    try {
        console.log.apply(console,
            ['[4K Pro ' + VERSION + ']'].concat(
                [].slice.call(arguments)));
    } catch (e) {}
}
function get(k, d) {
    try {
        var v = Lampa.Storage.get(P + k);
        return v == null ? d : v;
    } catch (e) { return d; }
}
function set(k, v) {
    try { Lampa.Storage.set(P + k, v); } catch (e) {}
}
function field(k) {
    try {
        return Lampa.Storage.field(k) ||
            Lampa.Storage.get(k) || '';
    } catch (e) { return ''; }
}
function on(k) {
    return String(get(k, 'false')) === 'true';
}
function clean(s) {
    return String(s || '')
        .replace(/[:\/\\|?*<>"']/g, ' ')
        .replace(/\s+/g, ' ').trim();
}
function normalize(s) {
    return clean(s).toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ').trim();
}
function size(n) {
    return (Number(n || 0) / GB).toFixed(1) + ' GB';
}
function scheme(s) {
    s = String(s || '').trim();
    return /^https?:\/\//i.test(s) ? s : 'http://' + s;
}
function trim(s) {
    return String(s || '').replace(/\/+$/, '');
}
function isSeries(m) {
    return !!(m && (
        m.media_type === 'tv' ||
        m.first_air_date ||
        m.number_of_seasons
    ) && !m.release_date);
}
function titleOf(m) {
    return m.title || m.name ||
        m.original_title || m.original_name || 'Відео';
}
function yearOf(m) {
    return String(
        m.release_date || m.first_air_date || ''
    ).slice(0, 4);
}
function posterOf(m) {
    var p = m.poster_path || m.img || '';
    return /^\//.test(p) ?
        'https://image.tmdb.org/t/p/w500' + p : p;
}
function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}
function err(e) {
    return e && e.message ? e.message : String(e);
}
function abortError() {
    return Error('Операцію скасовано');
}
function check(id) {
    if (id !== operationId) throw abortError();
}
function resetCache() {
    cache = {};
    cacheOrder = [];
}

/* Notifications */

function note(message) {
    var old = document.getElementById('uadv631-toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (toastTimer) clearTimeout(toastTimer);

    var el = document.createElement('div');
    el.id = 'uadv631-toast';
    el.className = 'uadv631-toast';
    el.textContent = String(message || '');
    document.body.appendChild(el);

    requestAnimationFrame(function () {
        el.classList.add('visible');
    });

    toastTimer = setTimeout(function () {
        el.classList.remove('visible');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 240);
    }, 3100);
}

/* Network */

async function request(url, options, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () {
        ctrl.abort();
    }, ms || 12000);

    var external = options && options.signal;
    var abort = function () { ctrl.abort(); };

    if (external) {
        if (external.aborted) ctrl.abort();
        else external.addEventListener('abort', abort);
    }

    try {
        var opt = Object.assign({}, options || {}, {
            signal: ctrl.signal
        });
        var response = await fetch(url, opt);
        if (!response.ok) {
            throw Error(
                'HTTP ' + response.status +
                ' — ' + url.split('?')[0]
            );
        }
        return response;
    } finally {
        clearTimeout(timer);
        if (external) external.removeEventListener('abort', abort);
    }
}

/* Jackett */

function jackett() {
    var u = field('jackett_url');
    if (!u) throw Error('Налаштуй адресу Jackett у Lampa');
    return {
        base: trim(scheme(u))
            .replace(/\/api\/v2\.0.*$/i, '')
            .replace(/\/jackett$/i, ''),
        key: field('jackett_key')
    };
}
function tsBase() {
    var u = field('torrserver_url');
    if (!u) throw Error('Налаштуй адресу TorrServer у Lampa');
    return trim(scheme(u));
}
function tsHeaders() {
    var h = {'Content-Type': 'application/json'};
    var token = field('torrserver_token');
    var user = field('torrserver_user') ||
        field('torrserver_login');
    var pass = field('torrserver_pass') ||
        field('torrserver_password');

    if (token) h.Authorization = 'Bearer ' + token;
    else if (user || pass) {
        try {
            h.Authorization = 'Basic ' +
                btoa(unescape(encodeURIComponent(user + ':' + pass)));
        } catch (e) {}
    }
    return h;
}
function tsStreamBase() {
    var base = tsBase();
    var u = field('torrserver_user') ||
        field('torrserver_login');
    var p = field('torrserver_pass') ||
        field('torrserver_password');

    if (u || p) {
        try {
            var x = new URL(base);
            x.username = u;
            x.password = p;
            return trim(x.toString());
        } catch (e) {}
    }
    return base;
}
function streamAuth() {
    var t = field('torrserver_token');
    return t ? '&authorization=' +
        encodeURIComponent('Bearer ' + t) : '';
}

/* Parse Jackett results */

function xmlResults(text) {
    var doc = new DOMParser().parseFromString(
        text, 'application/xml'
    );
    if (doc.getElementsByTagName('parsererror').length) {
        throw Error('Некоректна XML-відповідь Jackett');
    }

    return [].map.call(
        doc.getElementsByTagName('item'),
        function (it) {
            var attrs = {};
            [].forEach.call(
                it.getElementsByTagName('*'),
                function (el) {
                    if (el.localName === 'attr' &&
                        el.getAttribute('name')) {
                        attrs[
                            el.getAttribute('name').toLowerCase()
                        ] = el.getAttribute('value') || '';
                    }
                }
            );
            function val(tag) {
                var a = it.getElementsByTagName(tag);
                return a.length ?
                    (a[0].textContent || '').trim() : '';
            }
            var en = it.getElementsByTagName('enclosure')[0];
            var dl = en ? en.getAttribute('url') || '' : '';
            var magnet = attrs.magneturl || '';

            return {
                title: val('title'),
                link: magnet || val('link') || dl,
                magnet: magnet,
                dl: dl,
                size: Number(
                    val('size') || attrs.size ||
                    (en && en.getAttribute('length')) || 0
                ),
                seed: Number(attrs.seeders || attrs.peers || 0),
                tracker: String(
                    attrs.jackettindexer ||
                    attrs.indexer ||
                    attrs.jackettindexerid || ''
                ).toLowerCase()
            };
        }
    );
}
function jsonResults(json) {
    var a = Array.isArray(json) ? json :
        (json.Results || json.results || json.items || []);

    return (Array.isArray(a) ? a : []).map(function (x) {
        var magnet = x.MagnetUri ||
            x.MagnetUrl || x.magnet || '';
        return {
            title: x.Title || x.title || '',
            link: magnet || x.Link || x.link || '',
            magnet: magnet,
            dl: x.DownloadUrl || x.downloadUrl || '',
            size: Number(x.Size || x.size || 0),
            seed: Number(
                x.Seeders || x.seeders ||
                x.Peers || x.peers || 0
            ),
            tracker: String(
                x.Tracker || x.tracker ||
                x.TrackerId || x.trackerId || ''
            ).toLowerCase()
        };
    });
}
async function searchJackett(q, cats, mode, signal) {
    var j = jackett();
    var params = new URLSearchParams();
    if (j.key) params.set('apikey', j.key);

    var endpoint;
    if (mode === 'xml') {
        params.set('t', 'search');
        params.set('q', q);
        cats.split(',').forEach(function (c) {
            params.append('cat', c);
        });
        endpoint = '/api/v2.0/indexers/all/results/torznab/';
    } else {
        params.set('Query', q);
        cats.split(',').forEach(function (c) {
            params.append('Category[]', c);
        });
        endpoint = '/api/v2.0/indexers/all/results';
    }

    var response = await request(
        j.base + endpoint + '?' + params.toString(),
        {
            method: 'GET',
            credentials: 'omit',
            signal: signal
        },
        11000
    );

    return mode === 'xml' ?
        xmlResults(await response.text()) :
        jsonResults(await response.json());
}

/* Ukrainian audio confirmation */

function uaConfirmed(title) {
    var t = String(title || '');
    return /(?:^|[^a-zа-яіїєґ0-9])(?:ukr|ukrainian|українська|українською|укр(?:аїнська)?[. _-]*(?:озвучка|дубляж|дубл|звук|аудіо)|ua[. _-]*(?:dub|audio|voice|озвучка|дубляж)|(?:озвучка|дубляж|аудіо|мова)[. _:-]*(?:укр|українська)|ukr[. _-]*(?:dub|audio|voice))(?:$|[^a-zа-яіїєґ0-9])/i.test(t);
}

/* Quality detection */

function releaseTraits(r) {
    var t = String(r.title || '');
    return {
        k4: /2160p|\b4k\b|\buhd\b/i.test(t),
        fhd: /1080p/i.test(t),
        dv: /dolby[ ._-]*vision|\bdovi\b|(?:^|[ ._-])dv(?:$|[ ._-])/i.test(t),
        hdrPlus: /hdr[ ._-]*10\+/i.test(t),
        hdr: /\bhdr(?:10)?\b/i.test(t),
        remux: /remux/i.test(t),
        bluray: /blu[ ._-]?ray|bdrip|bdmv/i.test(t),
        web: /web[ ._-]?dl/i.test(t),
        atmos: /atmos|truehd/i.test(t),
        dts: /dts[ ._-]?(?:hd|x)/i.test(t),
        eac3: /e[ ._-]?ac[ ._-]?3|ddp/i.test(t)
    };
}
function score(r) {
    var f = releaseTraits(r), s = 0;
    var quality = String(get('quality', '4k'));

    s += quality === '1080' ?
        (f.fhd ? 240 : f.k4 ? 100 : 0) :
        (f.k4 ? 240 : f.fhd ? 100 : 0);

    var hdr = String(get('hdr', 'dv'));
    if (hdr === 'sdr') {
        s += (!f.dv && !f.hdrPlus && !f.hdr) ? 85 : 0;
    } else if (hdr === 'hdr') {
        s += f.hdrPlus ? 85 : f.hdr ? 75 : f.dv ? 55 : 0;
    } else {
        s += f.dv ? 85 : f.hdrPlus ? 75 : f.hdr ? 65 : 0;
    }

    var source = String(get('source', 'auto'));
    if (source === 'webdl') {
        s += f.web ? 65 : f.remux ? 50 : f.bluray ? 40 : 0;
    } else if (source === 'bluray') {
        s += f.bluray && !f.remux ? 65 :
            f.remux ? 58 : f.web ? 40 : 0;
    } else {
        s += f.remux ? 65 : f.bluray ? 55 : f.web ? 40 : 0;
    }

    var audio = String(get('audio', 'auto'));
    if (
        (audio === 'atmos' && f.atmos) ||
        (audio === 'dts' && f.dts) ||
        (audio === 'eac3' && f.eac3)
    ) s += 25;

    s += Math.min(
        25, Math.log2(1 + Math.max(0, r.seed)) * 3
    );
    s += Math.min(12, Number(r.size || 0) / GB / 6);
    return s;
}

/*
 * STRICT MOVIE MATCHING 63.1.0
 *
 * A movie must match its title and release year.
 * Series retain independent season/episode matching.
 */

/* Words that may separate release titles from technical metadata */
var RELEASE_MARKERS = /^(?:2160p|1080p|720p|480p|4k|uhd|hdr|hdr10|hdr10plus|dv|dovi|dolby|vision|bluray|blu|ray|bdrip|brrip|web|webdl|webrip|remux|hdtv|dvdrip|x264|x265|h264|h265|hevc|av1|avc|atmos|truehd|dts|ddp|eac3|aac|ac3|proper|repack|extended|unrated|criterion|imax|multi|ukr|eng|rutracker|toloka)$/i;

function titleTokens(s) {
    return normalize(s).split(' ').filter(Boolean);
}

function movieTitleMatch(releaseTitle, expectedTitle) {
    var expected = titleTokens(expectedTitle);
    var actual = titleTokens(releaseTitle);

    if (!expected.length || !actual.length) return false;

    /*
     * Require contiguous words in the correct order.
     * This avoids accepting unrelated titles that merely
     * contain the same words in different positions.
     */
    for (var i = 0; i <= actual.length - expected.length; i++) {
        var equal = true;
        for (var j = 0; j < expected.length; j++) {
            if (actual[i + j] !== expected[j]) {
                equal = false;
                break;
            }
        }
        if (!equal) continue;

        /*
         * Avoid a partial match inside a longer title:
         * "The Thing" should not match "The Thing Returns".
         * Release metadata or year is an acceptable boundary.
         */
        var next = actual[i + expected.length];
        if (!next) return true;

        if (/^(?:19|20)\d{2}$/.test(next)) return true;
        if (RELEASE_MARKERS.test(next)) return true;

        /*
         * A year can appear later after edition information,
         * but the exact title alone is not enough to accept
         * arbitrary additional words.
         */
    }
    return false;
}

function releaseYears(title) {
    /*
     * Extract standalone calendar years, excluding numbers
     * embedded inside resolution/codec strings.
     */
    var text = String(title || '');
    var result = [];
    var re = /(?:^|[^\d])((?:19|20)\d{2})(?=$|[^\d])/g;
    var m;

    while ((m = re.exec(text))) {
        var y = Number(m[1]);
        if (y >= 1900 && y <= 2099 &&
            result.indexOf(String(y)) < 0) {
            result.push(String(y));
        }
    }
    return result;
}

function strictMovieMatch(r, movie) {
    var expectedYear = yearOf(movie);
    var title = String(r.title || '');

    var original = movie.original_title ||
        movie.original_name || titleOf(movie);
    var localized = movie.title ||
        movie.name || original;

    var titleOK =
        movieTitleMatch(title, original) ||
        movieTitleMatch(title, localized);

    if (!titleOK) return false;

    if (expectedYear) {
        var years = releaseYears(title);

        /*
         * Strict rule: the expected year must be present.
         * Missing year = reject.
         *
         * Multiple years are rejected when they contain
         * another plausible movie year. This deliberately
         * prioritizes safety over finding every release.
         */
        if (!years.length) return false;
        if (years.indexOf(expectedYear) < 0) return false;

        if (years.some(function (y) {
            return y !== expectedYear;
        })) return false;
    }

    return true;
}

function searchQueries(movie) {
    var orig = clean(
        movie.original_title ||
        movie.original_name ||
        titleOf(movie)
    );
    var local = clean(
        movie.title || movie.name || orig
    );
    var year = yearOf(movie);
    var series = isSeries(movie);
    var result = [];

    function add(q) {
        q = clean(q);
        if (q && result.indexOf(q) < 0) result.push(q);
    }

    if (!series) {
        /*
         * Movies: always include year when known.
         * No yearless fallback for dated movies.
         */
        if (year) {
            add(orig + ' ' + year);
            if (normalize(local) !== normalize(orig)) {
                add(local + ' ' + year);
            }
        } else {
            add(orig);
            if (normalize(local) !== normalize(orig)) {
                add(local);
            }
        }
    } else {
        /*
         * Series: preserve broad search to find season packs.
         */
        var pref = field('parse_lang') || 'df';
        var combos = {
            df: orig,
            df_year: orig + ' ' + year,
            df_lg: orig + ' ' + local,
            df_lg_year: orig + ' ' + local + ' ' + year,
            lg: local,
            lg_year: local + ' ' + year,
            lg_df: local + ' ' + orig,
            lg_df_year: local + ' ' + orig + ' ' + year
        };
        add(combos[pref] || orig);
        add(orig);
        if (normalize(local) !== normalize(orig)) add(local);
    }

    return result.slice(0, 4);
}

function releaseKey(r) {
    var magnet = r.magnet || r.link || '';
    var hash = magnet.match(/[?&]xt=urn:btih:([^&]+)/i);
    return hash ?
        hash[1].toLowerCase() :
        normalize(r.title) + ':' + String(r.size);
}

function seriesTitleMatch(r, movie) {
    var original = normalize(
        movie.original_name ||
        movie.original_title ||
        titleOf(movie)
    );
    var localized = normalize(
        movie.name || movie.title || ''
    );
    var title = normalize(r.title);

    function matches(s) {
        if (!s) return false;
        var words = s.split(' ').filter(function (w) {
            return w.length > 1;
        });
        if (!words.length) return false;
        var tokens = title.split(' ');
        return words.every(function (w) {
            return tokens.indexOf(w) !== -1;
        });
    }

    return matches(original) || matches(localized);
}

function relevant(r, movie) {
    if (isSeries(movie)) {
        return seriesTitleMatch(r, movie);
    }
    return strictMovieMatch(r, movie);
}

/* Search and rank releases */

async function findReleases(movie, id) {
    var series = isSeries(movie);
    var cats = series ? SERIES_CATS : MOVIE_CATS;
    var qs = searchQueries(movie);
    var cfg = jackett();

    var key = [
        VERSION, cfg.base, cfg.key, cats,
        qs.join('|'),
        get('minSeeds', '5'),
        get('maxSize', '70'),
        get('uaPolicy', 'strict'),
        get('quality', '4k'),
        get('hdr', 'dv'),
        get('source', 'auto'),
        get('audio', 'auto'),
        get('toloka', 'false')
    ].join('~');

    if (cache[key] &&
        Date.now() - cache[key].time < 300000) {
        return cache[key].items.slice();
    }

    var all = [], errors = [], success = false;

    /*
     * Do not stop at the first Ukrainian release.
     * Search all planned queries and combine the results.
     */
    for (var i = 0; i < qs.length; i++) {
        check(id);

        var results = await Promise.allSettled([
            searchJackett(
                qs[i], cats, 'xml',
                activeController.signal
            ),
            searchJackett(
                qs[i], cats, 'json',
                activeController.signal
            )
        ]);

        results.forEach(function (r) {
            if (r.status === 'fulfilled') {
                success = true;
                all = all.concat(r.value);
            } else {
                errors.push(err(r.reason));
            }
        });
    }

    check(id);

    if (!success) {
        throw Error(
            'Jackett недоступний: ' +
            (errors[0] || 'помилка пошуку')
        );
    }

    var seen = {};
    var min = Number(get('minSeeds', '5'));
    var max = Number(get('maxSize', '70')) * GB;

    all = all.filter(function (r) {
        if (!r.link || !r.title || !r.size) return false;
        if (r.seed < min) return false;
        if (!series && r.size > max) return false;

        /*
         * Reject incorrect title/year before scoring.
         */
        if (!relevant(r, movie)) {
            log('Відхилено:', r.title);
            return false;
        }

        var k = releaseKey(r);
        if (seen[k]) return false;
        seen[k] = true;
        return true;
    });

    var toloka = on('toloka');

    all.sort(function (a, b) {
        if (toloka) {
            var at = /toloka/i.test(a.tracker);
            var bt = /toloka/i.test(b.tracker);
            if (at !== bt) return at ? -1 : 1;
        }
        return score(b) - score(a);
    });

    if (cacheOrder.length >= 20) {
        delete cache[cacheOrder.shift()];
    }
    cacheOrder.push(key);
    cache[key] = {
        time: Date.now(),
        items: all.slice()
    };

    log('Перевірених релізів:', all.length);
    return all;
}

/* TorrServer */

async function tsPost(body, ms) {
    var response = await request(
        tsBase() + '/torrents',
        {
            method: 'POST',
            headers: tsHeaders(),
            body: JSON.stringify(body),
            signal: activeController && activeController.signal
        },
        ms || 12000
    );
    return response.json();
}

function hashOf(result, fallback) {
    if (!result || typeof result !== 'object') {
        return fallback;
    }
    var h = result.hash || result.Hash ||
        result.id || result.Id || '';
    return typeof h === 'string' && h ? h : fallback;
}

function fileStats(result) {
    if (Array.isArray(result)) return result;
    if (!result) return [];
    return result.file_stats ||
        result.FileStats ||
        result.files ||
        result.Files ||
        (result.stats && result.stats.file_stats) || [];
}

async function addTorrent(release, movie, id) {
    var link = release.magnet ||
        release.dl || release.link;
    if (!link) throw Error('Немає посилання на торрент');

    var response = await tsPost({
        action: 'add',
        link: link,
        title: '[LAMPA] ' + titleOf(movie),
        poster: posterOf(movie),
        data: JSON.stringify({
            lampa: true,
            movie: {
                id: movie.id,
                title: titleOf(movie)
            }
        }),
        save_to_db: false
    }, 18000);

    check(id);

    return {
        hash: hashOf(response, link),
        link: link,
        response: response
    };
}

async function getFiles(hash, link, id) {
    var attempts = 10;

    for (var i = 0; i < attempts; i++) {
        check(id);
        try {
            var data = await tsPost({
                action: 'get',
                hash: hash
            }, 11000);

            var files = fileStats(data);
            if (Array.isArray(files) && files.length) {
                return files;
            }
        } catch (e) {
            check(id);
            log('Files attempt:', i + 1, err(e));
        }

        if (i < attempts - 1) await wait(1300);
    }

    throw Error(
        'TorrServer не надав список файлів. ' +
        'Перевір доступність торента.'
    );
}

function filePath(f) {
    return String(
        f.path || f.Path || f.name || f.Name || ''
    );
}
function fileSize(f) {
    return Number(
        f.length || f.Length || f.size || f.Size || 0
    );
}
function fileIndex(f, fallback) {
    var raw = f.id != null ? f.id :
        (f.Id != null ? f.Id :
        (f.index != null ? f.index : f.Index));
    var n = Number(raw);
    return raw != null && isFinite(n) && n >= 0 ?
        n + 1 : fallback + 1;
}

function videos(files) {
    return files.map(function (f, i) {
        return {
            file: f,
            path: filePath(f),
            size: fileSize(f),
            index: fileIndex(f, i)
        };
    }).filter(function (x) {
        return VIDEO.test(x.path) &&
            x.size > 100 * MB &&
            !/\b(sample|trailer|featurette|extra)\b/i.test(x.path);
    });
}

function streamUrl(hash, entry) {
    var name = entry.path.split(/[\\/]/).pop() ||
        'video.mkv';

    return tsStreamBase() +
        '/stream/' + encodeURIComponent(name) +
        '?link=' + encodeURIComponent(hash) +
        '&index=' + entry.index +
        '&play=1' + streamAuth();
}

function play(url, title) {
    closeDialog();
    if (window.Lampa &&
        Lampa.Player &&
        typeof Lampa.Player.play === 'function') {
        Lampa.Player.play({
            url: url,
            title: title,
            timeline: 0
        });
    } else {
        window.location.href = url;
    }
}

async function startMovie(movie, release, id) {
    note('Перевіряю відеофайли…');

    var added = await addTorrent(release, movie, id);
    var list = videos(
        await getFiles(added.hash, added.link, id)
    );

    check(id);

    if (!list.length) {
        throw Error(
            'У торренті немає доступного відеофайлу'
        );
    }

    list.sort(function (a, b) {
        return b.size - a.size;
    });

    var best = list[0];

    if (
        list.length > 1 &&
        best.size < 0.55 * list.reduce(function (sum, x) {
            return sum + x.size;
        }, 0)
    ) {
        showFilePicker(movie, added.hash, list);
        return;
    }

    note('Запускаю ' + size(best.size));
    play(
        streamUrl(added.hash, best),
        titleOf(movie)
    );
}

/* Dialogs */

function closeDialog() {
    if (dialog) {
        var d = dialog;
        dialog = null;
        d.close();
    }
}

function openDialog(title, items, onBack) {
    closeDialog();

    var overlay = document.createElement('div');
    overlay.className = 'uadv631-overlay';

    var panel = document.createElement('div');
    panel.className = 'uadv631-panel';

    var header = document.createElement('div');
    header.className = 'uadv631-header';

    var heading = document.createElement('div');
    heading.className = 'uadv631-heading';
    heading.textContent = title;

    var closeBtn = document.createElement('button');
    closeBtn.className = 'uadv631-close';
    closeBtn.textContent = '✕';

    header.appendChild(heading);
    header.appendChild(closeBtn);

    var list = document.createElement('div');
    list.className = 'uadv631-list';

    panel.appendChild(header);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var rows = [], selected = 0, closed = false;

    function focus(n) {
        if (!rows.length) return;

        selected = Math.max(
            0, Math.min(rows.length - 1, n)
        );

        rows.forEach(function (r, i) {
            r.classList.toggle(
                'focus', i === selected
            );
        });

        rows[selected].focus();

        if (rows[selected].scrollIntoView) {
            rows[selected].scrollIntoView({
                block: 'nearest'
            });
        }
    }

    function close() {
        if (closed) return;
        closed = true;

        document.removeEventListener(
            'keydown', keyboard, true
        );

        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }

        if (dialog && dialog.close === close) {
            dialog = null;
        }
    }

    function back() {
        close();
        if (onBack) onBack();
    }

    function keyboard(e) {
        var k = e.key || e.keyCode;

        if (
            k === 'Escape' ||
            k === 'Backspace' ||
            k === 'BrowserBack' ||
            k === 27 || k === 8 ||
            k === 461 || k === 10009
        ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            back();
            return;
        }

        if (
            k === 'ArrowDown' || k === 40 ||
            k === 'ArrowUp' || k === 38
        ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focus(
                selected +
                (k === 'ArrowDown' || k === 40 ? 1 : -1)
            );
            return;
        }

        if (k === 'Enter' || k === 13) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (rows[selected]) rows[selected].click();
        }
    }

    (items || []).forEach(function (item, index) {
        var row = document.createElement('div');
        row.className = 'uadv631-row selector';
        row.tabIndex = 0;

        var name = document.createElement('div');
        name.className = 'uadv631-row-title';
        name.textContent = item.title || '';
        row.appendChild(name);

        if (item.subtitle) {
            var sub = document.createElement('div');
            sub.className = 'uadv631-row-sub';
            sub.textContent = item.subtitle;
            row.appendChild(sub);
        }

        row.addEventListener('click', function () {
            selected = index;
            if (item.action) item.action();
        });

        row.addEventListener('focus', function () {
            selected = index;
            rows.forEach(function (r, i) {
                r.classList.toggle(
                    'focus', i === selected
                );
            });
        });

        list.appendChild(row);
        rows.push(row);
    });

    closeBtn.addEventListener('click', back);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) back();
    });

    document.addEventListener(
        'keydown', keyboard, true
    );

    dialog = {close: close};
    focus(0);
}

function info(r) {
    var f = releaseTraits(r), labels = [];

    labels.push(
        f.k4 ? '4K' :
        f.fhd ? '1080p' : 'Відео'
    );

    if (f.dv) labels.push('Dolby Vision');
    else if (f.hdrPlus) labels.push('HDR10+');
    else if (f.hdr) labels.push('HDR');

    if (f.remux) labels.push('REMUX');
    else if (f.bluray) labels.push('Blu-ray');
    else if (f.web) labels.push('WEB-DL');

    labels.push(size(r.size));
    labels.push('Сідери: ' + r.seed);

    return labels.join(' · ');
}

function showFilePicker(movie, hash, list) {
    openDialog(
        '4K Pro · Відеофайли',
        list.map(function (entry) {
            return {
                title: entry.path.split(/[\\/]/).pop(),
                subtitle: size(entry.size),
                action: function () {
                    play(
                        streamUrl(hash, entry),
                        titleOf(movie)
                    );
                }
            };
        })
    );
}

function releasePicker(movie, releases) {
    openDialog(
        '4K Pro · Обери реліз',
        releases.slice(0, 60).map(function (r) {
            return {
                title: r.title,
                subtitle: info(r),
                action: function () {
                    execute(function (id) {
                        return startMovie(movie, r, id);
                    });
                }
            };
        })
    );
}

function fallbackPicker(movie, releases) {
    openDialog(
        'Українську озвучку не підтверджено',
        [
            {
                title: 'Показати інші релізи',
                subtitle: 'Вибрати вручну',
                action: function () {
                    releasePicker(movie, releases);
                }
            },
            {
                title: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

async function movieFlow(movie, releases, id) {
    var ua = releases.filter(function (r) {
        return uaConfirmed(r.title);
    });

    if (ua.length) {
        if (String(get('playMode', 'auto')) === 'manual') {
            releasePicker(movie, ua);
        } else {
            await startMovie(movie, ua[0], id);
        }
        return;
    }

    if (get('uaPolicy', 'strict') === 'strict') {
        note(
            'Немає релізів із підтвердженою ' +
            'українською озвучкою'
        );
        return;
    }

    var fallback = String(get('fallback', 'ask'));

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
    } else if (fallback === 'auto') {
        await startMovie(movie, releases[0], id);
    } else {
        fallbackPicker(movie, releases);
    }
}

/* Series and episodes */

function seasonsFromTitle(title) {
    var t = String(title || '');
    var seasons = {}, m;

    var range =
        /(?:season|сезон|\bS)\s*0*(\d{1,2})\s*[-–]\s*0*(\d{1,2})/i.exec(t);

    if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);
        if (a > 0 && b >= a && b - a <= 30) {
            for (var n = a; n <= b; n++) {
                seasons[n] = true;
            }
        }
    }

    var re =
        /\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*0*(\d{1,2})/gi;

    while ((m = re.exec(t))) {
        var sn = Number(m[1] || m[2]);
        if (sn > 0) seasons[sn] = true;
    }

    return Object.keys(seasons).map(Number);
}

function episodeFromPath(path, season) {
    var name = String(path || '')
        .split(/[\\/]/).pop();

    var m =
        /S(\d{1,2})E(\d{1,3})/i.exec(name) ||
        /(\d{1,2})x(\d{1,3})/i.exec(name);

    if (m) {
        return Number(m[1]) === season ?
            Number(m[2]) : 0;
    }

    m = /(?:episode|ep|серія|серия)[ ._-]*0*(\d{1,3})/i.exec(name);
    return m ? Number(m[1]) : 0;
}

function showSeasons(movie, releases) {
    var groups = {}, unknown = [];

    releases.forEach(function (r) {
        var seasons = seasonsFromTitle(r.title);

        if (!seasons.length) {
            unknown.push(r);
            return;
        }

        seasons.forEach(function (n) {
            (groups[n] || (groups[n] = [])).push(r);
        });
    });

    var nums = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) { return a - b; });

    var items = nums.map(function (n) {
        return {
            title: 'Сезон ' + n,
            subtitle: 'Релізів: ' + groups[n].length,
            action: function () {
                openSeason(movie, n, groups[n]);
            }
        };
    });

    if (unknown.length) {
        items.push({
            title: 'Сезон не визначено',
            subtitle: 'Релізів: ' + unknown.length,
            action: function () {
                chooseUnknownSeason(movie, unknown);
            }
        });
    }

    if (!items.length) {
        note('Не вдалося визначити сезони');
        return;
    }

    openDialog('4K Pro · Сезони', items);
}

function chooseUnknownSeason(movie, releases) {
    var max = Math.max(
        1, Math.min(
            30, Number(movie.number_of_seasons || 10)
        )
    );
    var items = [];

    for (var i = 1; i <= max; i++) {
        (function (n) {
            items.push({
                title: 'Сезон ' + n,
                subtitle: 'Перевірити серії у файлах',
                action: function () {
                    openSeason(movie, n, releases);
                }
            });
        })(i);
    }

    openDialog('Вкажи сезон', items);
}

function openSeason(movie, season, releases) {
    execute(function (id) {
        return loadEpisodes(
            movie, season, releases, id
        );
    });
}

async function loadEpisodes(movie, season, releases, id) {
    closeDialog();
    note('Шукаю серії сезону ' + season + '…');

    var episodes = {};
    var limit = Math.min(8, releases.length);
    var successful = 0;

    for (var i = 0; i < limit; i++) {
        check(id);
        var r = releases[i];

        try {
            var added = await addTorrent(r, movie, id);
            var files = videos(
                await getFiles(
                    added.hash, added.link, id
                )
            );

            successful++;

            files.forEach(function (entry) {
                if (entry.size < 250 * MB) return;

                var ep = episodeFromPath(
                    entry.path, season
                );
                if (!ep) return;

                if (
                    !episodes[ep] ||
                    score(r) > episodes[ep].rank ||
                    (
                        score(r) === episodes[ep].rank &&
                        entry.size > episodes[ep].entry.size
                    )
                ) {
                    episodes[ep] = {
                        entry: entry,
                        hash: added.hash,
                        rank: score(r)
                    };
                }
            });
        } catch (e) {
            check(id);
            log('Episode scan:', err(e));
        }

        if (Object.keys(episodes).length >= 24) {
            break;
        }
    }

    check(id);

    var nums = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) { return a - b; });

    if (!nums.length) {
        if (!successful) {
            throw Error(
                'TorrServer не зміг прочитати ' +
                'файли серіалу'
            );
        }
        note(
            'Серії сезону ' + season +
            ' не розпізнано'
        );
        return;
    }

    openDialog(
        'Сезон ' + season + ' · Серії',
        nums.map(function (n) {
            var ep = episodes[n];

            return {
                title: 'Серія ' + n,
                subtitle: size(ep.entry.size) +
                    ' · ' +
                    ep.entry.path.split(/[\\/]/).pop(),
                action: function () {
                    play(
                        streamUrl(ep.hash, ep.entry),
                        titleOf(movie) +
                        ' S' + season +
                        'E' + ('0' + n).slice(-2)
                    );
                }
            };
        }),
        function () {
            showSeasons(movie, releases);
        }
    );
}

function seriesFlow(movie, releases) {
    var ua = releases.filter(function (r) {
        return uaConfirmed(r.title);
    });

    if (ua.length) {
        showSeasons(movie, ua);
        return;
    }

    if (get('uaPolicy', 'strict') === 'strict') {
        note(
            'Немає серіалів із підтвердженою ' +
            'українською озвучкою'
        );
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
    } else if (fallback === 'auto') {
        showSeasons(movie, releases);
    } else {
        openDialog(
            'Українську озвучку не підтверджено',
            [
                {
                    title: 'Показати інші сезони',
                    action: function () {
                        showSeasons(movie, releases);
                    }
                },
                {
                    title: 'Скасувати',
                    action: closeDialog
                }
            ]
        );
    }
}

/* Operation manager */

async function execute(task) {
    if (busy) {
        note(
            'Дочекайся завершення ' +
            'попередньої операції'
        );
        return;
    }

    busy = true;
    var id = ++operationId;
    activeController = new AbortController();

    try {
        await task(id);
    } catch (e) {
        if (id === operationId) {
            log('Operation:', e);
            note(err(e));
        }
    } finally {
        if (id === operationId) {
            busy = false;
            activeController = null;
        }
    }
}

function run(data) {
    execute(async function (id) {
        var movie = data && data.movie;

        if (!movie) {
            throw Error(
                'Не вдалося отримати дані фільму'
            );
        }

        note(
            'Шукаю: ' + titleOf(movie) +
            (yearOf(movie) ? ' (' + yearOf(movie) + ')' : '')
        );

        var releases = await findReleases(movie, id);

        if (!releases.length) {
            throw Error(
                'Релізів не знайдено. ' +
                'Перевір назву, рік, Jackett, ' +
                'сідерів і розмір.'
            );
        }

        if (isSeries(movie)) {
            seriesFlow(movie, releases);
        } else {
            await movieFlow(movie, releases, id);
        }
    });
}

/* Settings */

function addSetting(item) {
    try {
        Lampa.SettingsApi.addParam({
            component: 'uadv62',
            param: {
                name: P + item.name,
                type: 'select',
                values: item.values,
                default: String(item.def)
            },
            field: {
                name: item.title,
                description: item.description || ''
            },
            onChange: function (v) {
                set(item.name, v);
                resetCache();
            }
        });
    } catch (e) {
        log('Setting:', item.name, err(e));
    }
}

function registerSettings() {
    if (settingsDone || !Lampa.SettingsApi) return;
    settingsDone = true;

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',
            name: '4K Pro',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M8 9v6M12 9v6M16 9v6"/></svg>'
        });
    } catch (e) {}

    [
        {
            name: 'playMode',
            title: 'Запуск фільму',
            def: 'auto',
            values: {
                auto: 'Автоматично',
                manual: 'Вибір вручну'
            }
        },
        {
            name: 'uaPolicy',
            title: 'Українська озвучка',
            description:
                'Суворий режим вимагає явної ' +
                'мовної позначки в назві релізу',
            def: 'strict',
            values: {
                strict: 'Тільки підтверджена за назвою',
                prefer: 'Пріоритет української + резерв'
            }
        },
        {
            name: 'quality',
            title: 'Роздільність',
            def: '4k',
            values: {
                '4k': '4K / 2160p',
                '1080': 'Full HD / 1080p'
            }
        },
        {
            name: 'hdr',
            title: 'Пріоритет HDR',
            def: 'dv',
            values: {
                dv: 'Dolby Vision → HDR10+ → HDR',
                hdr: 'HDR10+ → HDR → DV',
                sdr: 'SDR'
            }
        },
        {
            name: 'source',
            title: 'Джерело',
            def: 'auto',
            values: {
                auto: 'REMUX → Blu-ray → WEB-DL',
                bluray: 'Blu-ray → REMUX → WEB-DL',
                webdl: 'WEB-DL → REMUX → Blu-ray'
            }
        },
        {
            name: 'audio',
            title: 'Звукова доріжка',
            def: 'auto',
            values: {
                auto: 'Автоматично',
                atmos: 'Dolby Atmos / TrueHD',
                dts: 'DTS-HD / DTS:X',
                eac3: 'Dolby Digital Plus'
            }
        },
        {
            name: 'minSeeds',
            title: 'Мінімум сідерів',
            def: '5',
            values: {
                '0': 'Без обмеження',
                '1': '1',
                '3': '3',
                '5': '5',
                '10': '10',
                '20': '20'
            }
        },
        {
            name: 'maxSize',
            title: 'Максимальний розмір фільму',
            def: '70',
            values: {
                '30': '30 GB',
                '50': '50 GB',
                '70': '70 GB',
                '90': '90 GB',
                '120': '120 GB',
                '200': '200 GB'
            }
        },
        {
            name: 'toloka',
            title: 'Пріоритет Toloka',
            def: 'false',
            values: {
                'false': 'Вимкнено',
                'true': 'Увімкнено'
            }
        },
        {
            name: 'fallback',
            title: 'За відсутності української (резервний режим)',
            def: 'ask',
            values: {
                ask: 'Запитати',
                none: 'Не запускати',
                auto: 'Інший реліз автоматично'
            }
        },
        {
            name: 'design',
            title: 'Інтерфейс',
            def: 'premium',
            values: {
                premium: 'Premium Dark',
                compact: 'Compact TV'
            }
        }
    ].forEach(addSetting);
}

/* Full-start button */

function button() {
    var b = document.createElement('div');

    b.className =
        'full-start__button selector uadv631-button';
    b.setAttribute('data-uadv631', '1');
    b.tabIndex = 0;

    b.innerHTML =
        '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<rect x="2" y="4" width="20" height="16" rx="4"/>' +
        '<path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none"/>' +
        '</svg><span>4K Pro</span>';

    return $(b);
}

function attach(root, ev) {
    var bar = root.find(
        '.full-start-new__buttons,' +
        '.full-start__buttons,' +
        '.full-actions'
    ).eq(0);

    if (!bar.length) return false;

    if (bar.find('[data-uadv631="1"]').length) {
        return true;
    }

    /*
     * Remove previous-version buttons.
     */
    bar.find(
        '[data-uadv-button="1"],' +
        '[data-uadv630="1"]'
    ).remove();

    var b = button();
    var click = function () {
        run(ev.data);
    };

    b.on('hover:enter click', click);
    b.on('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            click();
        }
    });

    bar.prepend(b);

    try {
        Lampa.Controller.collectionSet(bar);
    } catch (e) {}

    return true;
}

function mountButton() {
    if (mounted) return;
    mounted = true;

    Lampa.Listener.follow('full', function (ev) {
        if (
            !ev ||
            ev.type !== 'complite' ||
            !ev.object ||
            !ev.data ||
            !ev.data.movie
        ) return;

        var root;
        try {
            root = ev.object.activity.render();
        } catch (e) {
            return;
        }

        if (!root || !root.length || attach(root, ev)) {
            return;
        }

        var observer = new MutationObserver(function () {
            if (attach(root, ev)) {
                observer.disconnect();
            }
        });

        observer.observe(root[0], {
            childList: true,
            subtree: true
        });

        setTimeout(function () {
            observer.disconnect();
        }, 7000);
    });
}

/* Premium Dark / Compact TV */

function styles() {
    if (document.getElementById('uadv631-css')) return;

    var css = [
        '.uadv631-button{background:#202733!important;color:#eef3fa!important;border:1px solid #394453!important;border-radius:10px!important;order:-9999!important;box-shadow:0 5px 18px rgba(0,0,0,.28)!important}',
        '.uadv631-button.focus,.uadv631-button:hover{background:#344254!important;border-color:#a8c1db!important}',
        '.uadv631-button svg{flex-shrink:0}',
        '.uadv631-toast{position:fixed;left:50%;bottom:7%;transform:translate(-50%,12px);z-index:1000002;max-width:88vw;padding:14px 22px;background:#1a2029;color:#f3f6fa;border:1px solid #485365;border-radius:12px;box-shadow:0 12px 35px #0009;font-size:17px;text-align:center;opacity:0;visibility:hidden;transition:opacity .2s,transform .2s;pointer-events:none}',
        '.uadv631-toast.visible{opacity:1;visibility:visible;transform:translate(-50%,0)}',
        '.uadv631-overlay{position:fixed;inset:0;z-index:1000001;background:rgba(3,6,12,.85);display:flex;align-items:center;justify-content:center;padding:2vh 2vw;box-sizing:border-box}',
        '.uadv631-panel{width:min(1050px,96vw);max-height:90vh;display:flex;flex-direction:column;background:#121820;color:#f3f6fb;border:1px solid #34404e;border-radius:18px;overflow:hidden;box-shadow:0 22px 70px #000b}',
        '.uadv631-header{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:22px 26px;background:#1b2530;border-bottom:1px solid #34404e}',
        '.uadv631-heading{font-size:26px;font-weight:750;line-height:1.2}',
        '.uadv631-close{border:1px solid #4c5867;border-radius:9px;background:#283441;color:#fff;font-size:19px;width:40px;height:40px;cursor:pointer}',
        '.uadv631-list{padding:12px;overflow-y:auto;overscroll-behavior:contain}',
        '.uadv631-row{padding:16px 20px;margin-bottom:8px;border:1px solid transparent;border-radius:12px;background:#1c2530;outline:none;cursor:pointer}',
        '.uadv631-row.focus,.uadv631-row:hover{background:#304054;border-color:#b2c7e0;box-shadow:inset 0 0 0 1px #b2c7e0}',
        '.uadv631-row-title{font-size:21px;font-weight:650;line-height:1.35;overflow-wrap:anywhere}',
        '.uadv631-row-sub{font-size:15px;color:#afbfce;margin-top:6px;line-height:1.4}',
        '@media(max-width:600px){.uadv631-panel{width:97vw;max-height:92vh;border-radius:13px}.uadv631-header{padding:15px}.uadv631-heading{font-size:19px}.uadv631-row{padding:12px}.uadv631-row-title{font-size:16px}.uadv631-row-sub{font-size:12px}.uadv631-toast{font-size:14px;padding:11px 15px}}',
        '@media(prefers-reduced-motion:reduce){.uadv631-toast{transition:none}}'
    ].join('');

    var s = document.createElement('style');
    s.id = 'uadv631-css';
    s.textContent = css;
    document.head.appendChild(s);
}

/* Initialization */

function init() {
    if (
        !window.Lampa ||
        !Lampa.Listener ||
        !Lampa.Storage ||
        !$
    ) {
        setTimeout(init, 600);
        return;
    }

    var defaults = {
        playMode: 'auto',
        uaPolicy: 'strict',
        quality: '4k',
        hdr: 'dv',
        source: 'auto',
        audio: 'auto',
        minSeeds: '5',
        maxSize: '70',
        toloka: 'false',
        fallback: 'ask',
        design: 'premium'
    };

    Object.keys(defaults).forEach(function (k) {
        if (get(k, null) == null) {
            set(k, defaults[k]);
        }
    });

    styles();
    registerSettings();
    mountButton();

    log(
        'Initialized; strict movie year matching enabled; ' +
        'existing uadv62_ settings preserved'
    );
}

init();

})();
