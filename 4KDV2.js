
(function () {
'use strict';

/*
 * 4K Pro 63.0.4
 * Lampa / Jackett / TorrServer
 *
 * BASE: Original 63.0.0
 *
 * Search logic: UNCHANGED
 * Torrent scoring: UNCHANGED
 * TorrServer logic: UNCHANGED
 * Ukrainian audio detection: UNCHANGED
 *
 * Updated:
 * - Premium dialog design
 * - Remote Back handling
 * - Dialog transitions
 * - Focus restoration
 * - Double activation protection
 */

if (window.uadv634_ready) return;
window.uadv634_ready = true;

var VERSION = '63.0.4';
var P = 'uadv62_';

var GB = 1073741824;
var MB = 1048576;

var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';

var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv|webm)$/i;

var $ = window.jQuery || window.$;

var cache = {};
var cacheOrder = [];

var busy = false;
var dialog = null;
var toastTimer = null;

var activeController = null;
var operationId = 0;
var mounted = false;
var settingsDone = false;

var dialogSequence = 0;
var lastDialogAction = 0;
var dialogKeyLock = false;

/* ========================================
   ORIGINAL UTILITIES
======================================== */

function log() {
    try {
        console.log.apply(
            console,
            ['[4K Pro ' + VERSION + ']'].concat(
                [].slice.call(arguments)
            )
        );
    } catch (e) {}
}

function get(k, d) {
    try {
        var v = Lampa.Storage.get(P + k);
        return v == null ? d : v;
    } catch (e) {
        return d;
    }
}

function set(k, v) {
    try {
        Lampa.Storage.set(P + k, v);
    } catch (e) {}
}

function field(k) {
    try {
        return Lampa.Storage.field(k) ||
            Lampa.Storage.get(k) ||
            '';
    } catch (e) {
        return '';
    }
}

function on(k) {
    return String(get(k, 'false')) === 'true';
}

function clean(s) {
    return String(s || '')
        .replace(/[:\/\\|?*<>"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(s) {
    return clean(s)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function size(n) {
    return (
        Number(n || 0) / GB
    ).toFixed(1) + ' GB';
}

function scheme(s) {
    s = String(s || '').trim();

    return /^https?:\/\//i.test(s)
        ? s
        : 'http://' + s;
}

function trim(s) {
    return String(s || '')
        .replace(/\/+$/, '');
}

function isSeries(m) {
    return !!(
        m &&
        (
            m.media_type === 'tv' ||
            m.first_air_date ||
            m.number_of_seasons
        ) &&
        !m.release_date
    );
}

function titleOf(m) {
    return m.title ||
        m.name ||
        m.original_title ||
        m.original_name ||
        'Відео';
}

function yearOf(m) {
    return String(
        m.release_date ||
        m.first_air_date ||
        ''
    ).slice(0, 4);
}

function posterOf(m) {
    var p = m.poster_path || m.img || '';

    return /^\//.test(p)
        ? 'https://image.tmdb.org/t/p/w500' + p
        : p;
}

function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function err(e) {
    return e && e.message
        ? e.message
        : String(e);
}

function abortError() {
    return Error('Операцію скасовано');
}

function check(id) {
    if (id !== operationId) {
        throw abortError();
    }
}

function resetCache() {
    cache = {};
    cacheOrder = [];
}

/* ========================================
   ORIGINAL NOTIFICATIONS
======================================== */

function note(message) {
    var old = document.getElementById(
        'uadv630-toast'
    );

    if (old) {
        old.parentNode.removeChild(old);
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    var el = document.createElement('div');

    el.id = 'uadv630-toast';
    el.className = 'uadv630-toast';
    el.textContent = String(message || '');

    document.body.appendChild(el);

    requestAnimationFrame(function () {
        el.classList.add('visible');
    });

    toastTimer = setTimeout(function () {
        el.classList.remove('visible');

        setTimeout(function () {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 240);
    }, 3100);
}

/* ========================================
   ORIGINAL NETWORK
======================================== */

async function request(url, options, ms) {
    var ctrl = new AbortController();

    var timer = setTimeout(function () {
        ctrl.abort();
    }, ms || 12000);

    var external = options && options.signal;

    var abort = function () {
        ctrl.abort();
    };

    if (external) {
        if (external.aborted) {
            ctrl.abort();
        } else {
            external.addEventListener(
                'abort',
                abort
            );
        }
    }

    try {
        var opt = Object.assign(
            {},
            options || {},
            {
                signal: ctrl.signal
            }
        );

        var response = await fetch(
            url,
            opt
        );

        if (!response.ok) {
            throw Error(
                'HTTP ' +
                response.status +
                ' — ' +
                url.split('?')[0]
            );
        }

        return response;
    } finally {
        clearTimeout(timer);

        if (external) {
            external.removeEventListener(
                'abort',
                abort
            );
        }
    }
}

/* ========================================
   ORIGINAL JACKETT CONFIG
======================================== */

function jackett() {
    var u = field('jackett_url');

    if (!u) {
        throw Error(
            'Налаштуй адресу Jackett у Lampa'
        );
    }

    return {
        base: trim(scheme(u))
            .replace(/\/api\/v2\.0.*$/i, '')
            .replace(/\/jackett$/i, ''),
        key: field('jackett_key')
    };
}

/* ========================================
   ORIGINAL TORRSERVER CONFIG
======================================== */

function tsBase() {
    var u = field('torrserver_url');

    if (!u) {
        throw Error(
            'Налаштуй адресу TorrServer у Lampa'
        );
    }

    return trim(scheme(u));
}

function tsHeaders() {
    var h = {
        'Content-Type': 'application/json'
    };

    var token = field(
        'torrserver_token'
    );

    var user =
        field('torrserver_user') ||
        field('torrserver_login');

    var pass =
        field('torrserver_pass') ||
        field('torrserver_password');

    if (token) {
        h.Authorization =
            'Bearer ' + token;
    } else if (user || pass) {
        try {
            h.Authorization =
                'Basic ' +
                btoa(
                    unescape(
                        encodeURIComponent(
                            user + ':' + pass
                        )
                    )
                );
        } catch (e) {}
    }

    return h;
}

function tsStreamBase() {
    var base = tsBase();

    var u =
        field('torrserver_user') ||
        field('torrserver_login');

    var p =
        field('torrserver_pass') ||
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

    return t
        ? '&authorization=' +
          encodeURIComponent('Bearer ' + t)
        : '';
}

/* ========================================
   ORIGINAL XML RESULTS
======================================== */

function xmlResults(text) {
    var doc = new DOMParser()
        .parseFromString(
            text,
            'application/xml'
        );

    if (
        doc.getElementsByTagName(
            'parsererror'
        ).length
    ) {
        throw Error(
            'Некоректна XML-відповідь Jackett'
        );
    }

    return [].map.call(
        doc.getElementsByTagName('item'),
        function (it) {
            var attrs = {};

            [].forEach.call(
                it.getElementsByTagName('*'),
                function (el) {
                    if (
                        el.localName === 'attr' &&
                        el.getAttribute('name')
                    ) {
                        attrs[
                            el.getAttribute('name')
                                .toLowerCase()
                        ] = el.getAttribute('value') || '';
                    }
                }
            );

            function val(tag) {
                var a = it.getElementsByTagName(
                    tag
                );

                return a.length
                    ? (a[0].textContent || '').trim()
                    : '';
            }

            var en = it.getElementsByTagName(
                'enclosure'
            )[0];

            var dl = en
                ? en.getAttribute('url') || ''
                : '';

            var magnet = attrs.magneturl || '';

            return {
                title: val('title'),
                link: magnet || val('link') || dl,
                magnet: magnet,
                dl: dl,
                size: Number(
                    val('size') ||
                    attrs.size ||
                    (
                        en &&
                        en.getAttribute('length')
                    ) ||
                    0
                ),
                seed: Number(
                    attrs.seeders ||
                    attrs.peers ||
                    0
                ),
                tracker: String(
                    attrs.jackettindexer ||
                    attrs.indexer ||
                    attrs.jackettindexerid ||
                    ''
                ).toLowerCase()
            };
        }
    );
}

/* ========================================
   ORIGINAL JSON RESULTS
======================================== */

function jsonResults(json) {
    var a = Array.isArray(json)
        ? json
        : (
            json.Results ||
            json.results ||
            json.items ||
            []
        );

    return (
        Array.isArray(a) ? a : []
    ).map(function (x) {
        var magnet =
            x.MagnetUri ||
            x.MagnetUrl ||
            x.magnet ||
            '';

        return {
            title: x.Title || x.title || '',
            link: magnet ||
                x.Link ||
                x.link ||
                '',
            magnet: magnet,
            dl: x.DownloadUrl ||
                x.downloadUrl ||
                '',
            size: Number(
                x.Size ||
                x.size ||
                0
            ),
            seed: Number(
                x.Seeders ||
                x.seeders ||
                x.Peers ||
                x.peers ||
                0
            ),
            tracker: String(
                x.Tracker ||
                x.tracker ||
                x.TrackerId ||
                x.trackerId ||
                ''
            ).toLowerCase()
        };
    });
}

/* ========================================
   ORIGINAL JACKETT SEARCH
======================================== */

async function searchJackett(
    q,
    cats,
    mode,
    signal
) {
    var j = jackett();
    var params = new URLSearchParams();

    if (j.key) {
        params.set('apikey', j.key);
    }

    var endpoint;

    if (mode === 'xml') {
        params.set('t', 'search');
        params.set('q', q);

        cats.split(',').forEach(function (c) {
            params.append('cat', c);
        });

        endpoint =
            '/api/v2.0/indexers/all/results/torznab/';
    } else {
        params.set('Query', q);

        cats.split(',').forEach(function (c) {
            params.append('Category[]', c);
        });

        endpoint =
            '/api/v2.0/indexers/all/results';
    }

    var response = await request(
        j.base +
        endpoint +
        '?' +
        params.toString(),
        {
            method: 'GET',
            credentials: 'omit',
            signal: signal
        },
        11000
    );

    return mode === 'xml'
        ? xmlResults(await response.text())
        : jsonResults(await response.json());
}

/* ========================================
   ORIGINAL UKRAINIAN AUDIO DETECTION
======================================== */

function uaConfirmed(title) {
    var t = String(title || '');

    return /(?:^|[^a-zа-яіїєґ0-9])(?:ukr|ukrainian|українська|українською|укр(?:аїнська)?[. _-]*(?:озвучка|дубляж|дубл|звук|аудіо)|ua[. _-]*(?:dub|audio|voice|озвучка|дубляж)|(?:озвучка|дубляж|аудіо|мова)[. _:-]*(?:укр|українська)|ukr[. _-]*(?:dub|audio|voice))(?:$|[^a-zа-яіїєґ0-9])/i.test(t);
}

/* ========================================
   ORIGINAL RELEASE TRAITS
======================================== */

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

/* ========================================
   ORIGINAL RELEASE SCORING
======================================== */

function score(r) {
    var f = releaseTraits(r);
    var s = 0;

    var quality = String(
        get('quality', '4k')
    );

    s += quality === '1080'
        ? (
            f.fhd ? 240 :
            f.k4 ? 100 : 0
        )
        : (
            f.k4 ? 240 :
            f.fhd ? 100 : 0
        );

    var hdr = String(
        get('hdr', 'dv')
    );

    if (hdr === 'sdr') {
        s += (
            !f.dv &&
            !f.hdrPlus &&
            !f.hdr
        ) ? 85 : 0;
    } else if (hdr === 'hdr') {
        s += f.hdrPlus ? 85 :
            f.hdr ? 75 :
            f.dv ? 55 : 0;
    } else {
        s += f.dv ? 85 :
            f.hdrPlus ? 75 :
            f.hdr ? 65 : 0;
    }

    var source = String(
        get('source', 'auto')
    );

    if (source === 'webdl') {
        s += f.web ? 65 :
            f.remux ? 50 :
            f.bluray ? 40 : 0;
    } else if (source === 'bluray') {
        s += f.bluray && !f.remux ? 65 :
            f.remux ? 58 :
            f.web ? 40 : 0;
    } else {
        s += f.remux ? 65 :
            f.bluray ? 55 :
            f.web ? 40 : 0;
    }

    var audio = String(
        get('audio', 'auto')
    );

    if (
        audio === 'atmos' && f.atmos ||
        audio === 'dts' && f.dts ||
        audio === 'eac3' && f.eac3
    ) {
        s += 25;
    }

    s += Math.min(
        25,
        Math.log2(
            1 + Math.max(0, r.seed)
        ) * 3
    );

    s += Math.min(
        12,
        Number(r.size || 0) / GB / 6
    );

    return s;
}

/* ========================================
   ORIGINAL SEARCH QUERIES
   UNCHANGED
======================================== */

function searchQueries(movie) {
    var orig = clean(
        movie.original_title ||
        movie.original_name ||
        titleOf(movie)
    );

    var local = clean(
        movie.title ||
        movie.name ||
        orig
    );

    var year = yearOf(movie);
    var series = isSeries(movie);

    var pref = field('parse_lang') ||
        (
            series
                ? 'df'
                : 'df_year'
        );

    var combos = {
        df: orig,
        df_year: orig + ' ' + year,
        df_lg: orig + ' ' + local,
        df_lg_year:
            orig + ' ' + local + ' ' + year,
        lg: local,
        lg_year: local + ' ' + year,
        lg_df: local + ' ' + orig,
        lg_df_year:
            local + ' ' + orig + ' ' + year
    };

    var result = [];

    function add(q) {
        q = clean(q);

        if (
            q &&
            result.indexOf(q) < 0
        ) {
            result.push(q);
        }
    }

    add(combos[pref] || orig);
    add(orig);

    if (local !== orig) {
        add(local);
    }

    if (year && !series) {
        add(orig + ' ' + year);
    }

    return result.slice(0, 4);
}

/* ========================================
   ORIGINAL RELEASE KEY
======================================== */

function releaseKey(r) {
    var magnet =
        r.magnet ||
        r.link ||
        '';

    var hash = magnet.match(
        /[?&]xt=urn:btih:([^&]+)/i
    );

    return hash
        ? hash[1].toLowerCase()
        : normalize(r.title) +
          ':' +
          String(r.size);
}

/* ========================================
   ORIGINAL RELEVANCE
   UNCHANGED
======================================== */

function relevant(r, movie) {
    var name = normalize(
        movie.original_title ||
        movie.original_name ||
        titleOf(movie)
    );

    var local = normalize(
        movie.title ||
        movie.name ||
        ''
    );

    var t = normalize(r.title);

    function matches(s) {
        if (!s) return false;

        var words = s.split(' ').filter(
            function (w) {
                return w.length > 1;
            }
        );

        if (!words.length) {
            return false;
        }

        return words.every(function (w) {
            return t.split(' ')
                .indexOf(w) !== -1;
        });
    }

    if (
        !matches(name) &&
        !matches(local)
    ) {
        return false;
    }

    var year = yearOf(movie);

    if (
        !isSeries(movie) &&
        year
    ) {
        var years = String(r.title)
            .match(/(?:19|20)\d{2}/g) || [];

        if (
            years.length &&
            years.indexOf(year) < 0
        ) {
            return false;
        }
    }

    return true;
}

/* ========================================
   ORIGINAL FIND RELEASES
   UNCHANGED
======================================== */

async function findReleases(movie, id) {
    var series = isSeries(movie);

    var cats = series
        ? SERIES_CATS
        : MOVIE_CATS;

    var qs = searchQueries(movie);
    var cfg = jackett();

    var key = [
        cfg.base,
        cfg.key,
        cats,
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

    if (
        cache[key] &&
        Date.now() -
        cache[key].time < 300000
    ) {
        return cache[key].items.slice();
    }

    var all = [];
    var errors = [];
    var success = false;

    for (var i = 0; i < qs.length; i++) {
        check(id);

        var results = await Promise.allSettled([
            searchJackett(
                qs[i],
                cats,
                'xml',
                activeController.signal
            ),
            searchJackett(
                qs[i],
                cats,
                'json',
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

        if (
            all.some(function (r) {
                return uaConfirmed(r.title) &&
                    relevant(r, movie);
            })
        ) {
            break;
        }
    }

    check(id);

    if (!success) {
        throw Error(
            'Jackett недоступний: ' +
            (
                errors[0] ||
                'помилка пошуку'
            )
        );
    }

    var seen = {};

    var min = Number(
        get('minSeeds', '5')
    );

    var max = Number(
        get('maxSize', '70')
    ) * GB;

    all = all.filter(function (r) {
        if (
            !r.link ||
            !r.title ||
            !r.size ||
            r.seed < min ||
            (
                !series &&
                r.size > max
            )
        ) {
            return false;
        }

        if (!relevant(r, movie)) {
            return false;
        }

        var k = releaseKey(r);

        if (seen[k]) {
            return false;
        }

        seen[k] = true;

        return true;
    });

    var toloka = on('toloka');

    all.sort(function (a, b) {
        if (toloka) {
            var at = /toloka/i.test(
                a.tracker
            );

            var bt = /toloka/i.test(
                b.tracker
            );

            if (at !== bt) {
                return at ? -1 : 1;
            }
        }

        return score(b) - score(a);
    });

    if (cacheOrder.length >= 20) {
        delete cache[
            cacheOrder.shift()
        ];
    }

    cacheOrder.push(key);

    cache[key] = {
        time: Date.now(),
        items: all.slice()
    };

    log('Релізів:', all.length);

    return all;
}

/* ========================================
   ORIGINAL TORRSERVER REQUEST
======================================== */

async function tsPost(body, ms) {
    var response = await request(
        tsBase() + '/torrents',
        {
            method: 'POST',
            headers: tsHeaders(),
            body: JSON.stringify(body),
            signal:
                activeController &&
                activeController.signal
        },
        ms || 12000
    );

    return response.json();
}

function hashOf(result, fallback) {
    if (
        !result ||
        typeof result !== 'object'
    ) {
        return fallback;
    }

    var h =
        result.hash ||
        result.Hash ||
        result.id ||
        result.Id ||
        '';

    return typeof h === 'string' && h
        ? h
        : fallback;
}

function fileStats(result) {
    if (Array.isArray(result)) {
        return result;
    }

    if (!result) {
        return [];
    }

    return result.file_stats ||
        result.FileStats ||
        result.files ||
        result.Files ||
        (
            result.stats &&
            result.stats.file_stats
        ) ||
        [];
}

async function addTorrent(
    release,
    movie,
    id
) {
    var link =
        release.magnet ||
        release.dl ||
        release.link;

    if (!link) {
        throw Error(
            'Немає посилання на торрент'
        );
    }

    var response = await tsPost(
        {
            action: 'add',
            link: link,
            title:
                '[LAMPA] ' +
                titleOf(movie),
            poster: posterOf(movie),
            data: JSON.stringify({
                lampa: true,
                movie: {
                    id: movie.id,
                    title: titleOf(movie)
                }
            }),
            save_to_db: false
        },
        18000
    );

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
            var data = await tsPost(
                {
                    action: 'get',
                    hash: hash
                },
                11000
            );

            var files = fileStats(data);

            if (
                Array.isArray(files) &&
                files.length
            ) {
                return files;
            }
        } catch (e) {
            log(
                'Files attempt:',
                i + 1,
                err(e)
            );
        }

        if (i < attempts - 1) {
            await wait(1300);
        }
    }

    throw Error(
        'TorrServer не надав список файлів. Перевір доступність торента.'
    );
}

function filePath(f) {
    return String(
        f.path ||
        f.Path ||
        f.name ||
        f.Name ||
        ''
    );
}

function fileSize(f) {
    return Number(
        f.length ||
        f.Length ||
        f.size ||
        f.Size ||
        0
    );
}

function fileIndex(f, fallback) {
    var raw = f.id != null
        ? f.id
        : (
            f.Id != null
                ? f.Id
                : (
                    f.index != null
                        ? f.index
                        : f.Index
                )
        );

    var n = Number(raw);

    return raw != null &&
        isFinite(n) &&
        n >= 0
        ? n + 1
        : fallback + 1;
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
            !/\b(sample|trailer|featurette|extra)\b/i.test(
                x.path
            );
    });
}

function streamUrl(hash, entry) {
    var name = entry.path
        .split(/[\\/]/)
        .pop() || 'video.mkv';

    return tsStreamBase() +
        '/stream/' +
        encodeURIComponent(name) +
        '?link=' +
        encodeURIComponent(hash) +
        '&index=' +
        entry.index +
        '&play=1' +
        streamAuth();
}

function play(url, title) {
    closeDialog();

    if (
        window.Lampa &&
        Lampa.Player &&
        typeof Lampa.Player.play ===
            'function'
    ) {
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

    var added = await addTorrent(
        release,
        movie,
        id
    );

    var list = videos(
        await getFiles(
            added.hash,
            added.link,
            id
        )
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
        best.size <
        0.55 *
        list.reduce(function (sum, x) {
            return sum + x.size;
        }, 0)
    ) {
        showFilePicker(
            movie,
            added.hash,
            list
        );

        return;
    }

    note(
        'Запускаю ' +
        size(best.size)
    );

    play(
        streamUrl(
            added.hash,
            best
        ),
        titleOf(movie)
    );
}

/* ========================================
   NEW PREMIUM DIALOG UTILITIES
======================================== */

function el(tag, className, text) {
    var node = document.createElement(tag);

    if (className) {
        node.className = className;
    }

    if (
        text !== undefined &&
        text !== null
    ) {
        node.textContent = String(text);
    }

    return node;
}

function dialogBadges(r) {
    var f = releaseTraits(r);
    var result = [];

    function add(text, kind) {
        result.push({
            text: text,
            kind: kind || 'neutral'
        });
    }

    if (f.k4) {
        add('4K ULTRA HD', 'blue');
    } else if (f.fhd) {
        add('1080P', 'blue');
    }

    if (f.dv) {
        add('DOLBY VISION', 'purple');
    } else if (f.hdrPlus) {
        add('HDR10+', 'gold');
    } else if (f.hdr) {
        add('HDR', 'gold');
    }

    if (f.remux) {
        add('REMUX');
    } else if (f.bluray) {
        add('BLU-RAY');
    } else if (f.web) {
        add('WEB-DL');
    }

    if (f.atmos) {
        add('ATMOS');
    } else if (f.dts) {
        add('DTS-HD');
    }

    if (uaConfirmed(r.title)) {
        add('УКРАЇНСЬКА', 'green');
    }

    return result;
}

function dialogStats(r) {
    return [
        {
            label: 'РОЗМІР',
            value: size(r.size)
        },
        {
            label: 'СІДЕРИ',
            value: String(r.seed)
        },
        {
            label: 'ОЗВУЧКА',
            value: uaConfirmed(r.title)
                ? 'UA'
                : 'Не визначено'
        }
    ];
}

/* ========================================
   SAFE DIALOG CLOSE
======================================== */

function closeDialog() {
    if (!dialog) return;

    var old = dialog;
    dialog = null;

    old.close();
}

/* ========================================
   NEW PREMIUM DIALOG ENGINE
======================================== */

function openDialog(title, items, onBack) {
    closeDialog();

    items = items || [];

    var id = ++dialogSequence;

    var overlay = el(
        'div',
        'uadv630-overlay'
    );

    var panel = el(
        'div',
        'uadv630-panel'
    );

    if (
        get('design', 'premium') ===
        'compact'
    ) {
        panel.classList.add(
            'uadv630-compact'
        );
    }

    var header = el(
        'div',
        'uadv630-header'
    );

    var headerLeft = el(
        'div',
        'uadv630-header-left'
    );

    var eyebrow = el(
        'div',
        'uadv630-eyebrow',
        '4K PRO  ·  PREMIUM EXPERIENCE'
    );

    var heading = el(
        'div',
        'uadv630-heading',
        title
    );

    var subtitle = el(
        'div',
        'uadv630-header-sub',
        'Вибери потрібний пункт'
    );

    headerLeft.appendChild(eyebrow);
    headerLeft.appendChild(heading);
    headerLeft.appendChild(subtitle);

    var closeBtn = el(
        'button',
        'uadv630-close',
        '✕'
    );

    closeBtn.type = 'button';
    closeBtn.tabIndex = -1;

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    var list = el(
        'div',
        'uadv630-list'
    );

    var footer = el(
        'div',
        'uadv630-footer'
    );

    footer.appendChild(
        el(
            'span',
            '',
            '↑ ↓  Навігація'
        )
    );

    footer.appendChild(
        el(
            'span',
            '',
            'OK  Вибрати'
        )
    );

    footer.appendChild(
        el(
            'span',
            '',
            '↩  Назад'
        )
    );

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(footer);

    overlay.appendChild(panel);

    document.body.appendChild(overlay);

    var rows = [];
    var selected = 0;
    var closed = false;
    var activating = false;

    var previousFocus =
        document.activeElement;

    var openedAt = Date.now();

    /*
     * Do not change Lampa.Controller.
     * Its active controller must remain
     * exactly as it was before the dialog.
     */

    function stopEvent(e) {
        if (!e) return;

        if (e.cancelable) {
            e.preventDefault();
        }

        e.stopPropagation();

        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
        }
    }

    function focus(n) {
        if (
            closed ||
            !rows.length
        ) {
            return;
        }

        selected = Math.max(
            0,
            Math.min(
                rows.length - 1,
                n
            )
        );

        rows.forEach(function (row, i) {
            row.classList.toggle(
                'focus',
                i === selected
            );
        });

        var target = rows[selected];

        try {
            target.focus({
                preventScroll: true
            });
        } catch (e) {
            target.focus();
        }

        try {
            target.scrollIntoView({
                block: 'nearest',
                behavior: 'auto'
            });
        } catch (e) {}
    }

    function restoreFocus() {
        if (
            previousFocus &&
            document.contains(previousFocus)
        ) {
            try {
                previousFocus.focus({
                    preventScroll: true
                });
            } catch (e) {
                try {
                    previousFocus.focus();
                } catch (ex) {}
            }
        }
    }

    function close() {
        if (closed) return;

        closed = true;

        document.removeEventListener(
            'keydown',
            keyboard,
            true
        );

        document.removeEventListener(
            'keyup',
            keyup,
            true
        );

        window.removeEventListener(
            'keydown',
            keyboard,
            true
        );

        window.removeEventListener(
            'keyup',
            keyup,
            true
        );

        if (overlay.parentNode) {
            overlay.parentNode.removeChild(
                overlay
            );
        }

        if (
            dialog &&
            dialog.id === id
        ) {
            dialog = null;
        }

        /*
         * Crucial:
         * Never toggle, disable or remove
         * the Lampa controller.
         */
        restoreFocus();
    }

    function back() {
        if (closed) return;

        close();

        if (
            typeof onBack ===
            'function'
        ) {
            setTimeout(function () {
                onBack();
            }, 90);
        }
    }

    function activate(index) {
        if (
            closed ||
            activating ||
            !items[index]
        ) {
            return;
        }

        var now = Date.now();

        /*
         * Ignore an Enter key that opened
         * this dialog and is still held.
         */
        if (
            now - openedAt < 160 ||
            now - lastDialogAction < 240 ||
            dialogKeyLock
        ) {
            return;
        }

        activating = true;
        lastDialogAction = now;

        var action = items[index].action;

        /*
         * Remove old dialog and handlers
         * before opening the next dialog.
         */
        close();

        if (
            typeof action ===
            'function'
        ) {
            setTimeout(function () {
                try {
                    action();
                } catch (e) {
                    log(
                        'Dialog action:',
                        err(e)
                    );

                    note(err(e));
                }
            }, 90);
        }
    }

    function keyInfo(e) {
        var k = e.key || '';
        var c = e.keyCode || e.which;

        return {
            back:
                k === 'Escape' ||
                k === 'Backspace' ||
                k === 'BrowserBack' ||
                k === 'GoBack' ||
                c === 27 ||
                c === 8 ||
                c === 461 ||
                c === 10009,

            up:
                k === 'ArrowUp' ||
                c === 38,

            down:
                k === 'ArrowDown' ||
                c === 40,

            left:
                k === 'ArrowLeft' ||
                c === 37,

            right:
                k === 'ArrowRight' ||
                c === 39,

            enter:
                k === 'Enter' ||
                k === 'NumpadEnter' ||
                c === 13
        };
    }

    function keyboard(e) {
        if (closed) return;

        var k = keyInfo(e);

        if (
            !k.back &&
            !k.up &&
            !k.down &&
            !k.left &&
            !k.right &&
            !k.enter
        ) {
            return;
        }

        stopEvent(e);

        if (k.back) {
            if (!e.repeat) {
                back();
            }

            return;
        }

        if (k.up) {
            if (!e.repeat) {
                focus(selected - 1);
            }

            return;
        }

        if (k.down) {
            if (!e.repeat) {
                focus(selected + 1);
            }

            return;
        }

        if (k.left || k.right) {
            return;
        }

        if (k.enter && !e.repeat) {
            dialogKeyLock = true;

            activateFromKey();
        }
    }

    function activateFromKey() {
        /*
         * A key press is processed only
         * once. The lock is released on
         * keyup, not by a short timer.
         */
        if (
            closed ||
            activating ||
            !items[selected]
        ) {
            return;
        }

        var now = Date.now();

        if (
            now - openedAt < 160 ||
            now - lastDialogAction < 240
        ) {
            return;
        }

        activating = true;
        lastDialogAction = now;

        var action = items[selected].action;

        close();

        if (
            typeof action ===
            'function'
        ) {
            setTimeout(function () {
                try {
                    action();
                } catch (e) {
                    log(
                        'Dialog key action:',
                        err(e)
                    );

                    note(err(e));
                }
            }, 90);
        }
    }

    function keyup(e) {
        if (closed) return;

        var k = keyInfo(e);

        if (
            k.back ||
            k.up ||
            k.down ||
            k.left ||
            k.right ||
            k.enter
        ) {
            stopEvent(e);
        }

        if (k.enter) {
            dialogKeyLock = false;
        }
    }

    items.forEach(function (item, index) {
        var row = el(
            'div',
            'uadv630-row selector'
        );

        row.tabIndex = 0;

        if (item.featured) {
            row.classList.add(
                'uadv630-featured'
            );
        }

        var body = el(
            'div',
            'uadv630-row-body'
        );

        if (item.featured) {
            body.appendChild(
                el(
                    'div',
                    'uadv630-recommended',
                    '★  РЕКОМЕНДОВАНО'
                )
            );
        }

        var name = el(
            'div',
            'uadv630-row-title',
            item.title || ''
        );

        body.appendChild(name);

        if (
            item.badges &&
            item.badges.length
        ) {
            var badges = el(
                'div',
                'uadv630-badges'
            );

            item.badges.forEach(
                function (badge) {
                    badges.appendChild(
                        el(
                            'span',
                            'uadv630-badge ' +
                            'uadv630-badge-' +
                            (
                                badge.kind ||
                                'neutral'
                            ),
                            badge.text
                        )
                    );
                }
            );

            body.appendChild(badges);
        }

        if (
            item.stats &&
            item.stats.length
        ) {
            var stats = el(
                'div',
                'uadv630-stats'
            );

            item.stats.forEach(
                function (stat) {
                    var cell = el(
                        'div',
                        'uadv630-stat'
                    );

                    cell.appendChild(
                        el(
                            'div',
                            'uadv630-stat-label',
                            stat.label
                        )
                    );

                    cell.appendChild(
                        el(
                            'div',
                            'uadv630-stat-value',
                            stat.value
                        )
                    );

                    stats.appendChild(cell);
                }
            );

            body.appendChild(stats);
        }

        if (item.subtitle) {
            body.appendChild(
                el(
                    'div',
                    'uadv630-row-sub',
                    item.subtitle
                )
            );
        }

        row.appendChild(body);

        row.appendChild(
            el(
                'div',
                'uadv630-row-arrow',
                '›'
            )
        );

        row.addEventListener(
            'click',
            function (e) {
                if (closed) return;

                stopEvent(e);

                selected = index;

                /*
                 * Mouse/touch activation.
                 * Remote Enter uses keyboard().
                 */
                if (e.detail !== 0) {
                    activate(index);
                }
            }
        );

        row.addEventListener(
            'focus',
            function () {
                if (closed) return;

                selected = index;

                rows.forEach(
                    function (r, i) {
                        r.classList.toggle(
                            'focus',
                            i === selected
                        );
                    }
                );
            }
        );

        list.appendChild(row);
        rows.push(row);
    });

    closeBtn.addEventListener(
        'click',
        function (e) {
            stopEvent(e);
            back();
        }
    );

    overlay.addEventListener(
        'click',
        function (e) {
            if (e.target === overlay) {
                stopEvent(e);
                back();
            }
        }
    );

    /*
     * Capture remote keys while modal
     * is open. No Controller.toggle().
     *
     * Window capture runs before Lampa's
     * document-level keyboard listeners.
     */
    window.addEventListener(
        'keydown',
        keyboard,
        true
    );

    window.addEventListener(
        'keyup',
        keyup,
        true
    );

    document.addEventListener(
        'keydown',
        keyboard,
        true
    );

    document.addEventListener(
        'keyup',
        keyup,
        true
    );

    dialog = {
        id: id,
        close: close,
        back: back
    };

    requestAnimationFrame(function () {
        if (closed) return;

        overlay.classList.add(
            'uadv630-visible'
        );

        focus(0);
    });
}

/* ========================================
   ORIGINAL RELEASE INFORMATION
======================================== */

function info(r) {
    var f = releaseTraits(r);
    var labels = [];

    labels.push(
        f.k4
            ? '4K'
            : f.fhd
                ? '1080p'
                : 'Відео'
    );

    if (f.dv) {
        labels.push('Dolby Vision');
    } else if (f.hdrPlus) {
        labels.push('HDR10+');
    } else if (f.hdr) {
        labels.push('HDR');
    }

    if (f.remux) {
        labels.push('REMUX');
    } else if (f.bluray) {
        labels.push('Blu-ray');
    } else if (f.web) {
        labels.push('WEB-DL');
    }

    labels.push(size(r.size));
    labels.push('Сідери: ' + r.seed);

    return labels.join(' · ');
}

/* ========================================
   PREMIUM FILE PICKER
======================================== */

function showFilePicker(movie, hash, list) {
    openDialog(
        'Відеофайли',
        list.map(function (entry) {
            return {
                title: entry.path
                    .split(/[\\/]/)
                    .pop(),

                stats: [
                    {
                        label: 'РОЗМІР',
                        value: size(entry.size)
                    }
                ],

                action: function () {
                    play(
                        streamUrl(
                            hash,
                            entry
                        ),
                        titleOf(movie)
                    );
                }
            };
        })
    );
}

/* ========================================
   PREMIUM RELEASE PICKER
======================================== */

function releasePicker(movie, releases) {
    openDialog(
        'Обери реліз',
        releases.slice(0, 60).map(
            function (r, index) {
                return {
                    title: r.title,

                    featured: index === 0,

                    badges: dialogBadges(r),

                    stats: dialogStats(r),

                    subtitle:
                        r.tracker
                            ? 'Трекер: ' +
                              r.tracker
                            : '',

                    action: function () {
                        execute(function (id) {
                            return startMovie(
                                movie,
                                r,
                                id
                            );
                        });
                    }
                };
            }
        )
    );
}

/* ========================================
   PREMIUM FALLBACK DIALOG
======================================== */

function fallbackPicker(movie, releases) {
    openDialog(
        'Українську озвучку не підтверджено',
        [
            {
                title:
                    'Показати інші релізи',

                subtitle:
                    'Доступно релізів: ' +
                    releases.length,

                badges: [
                    {
                        text: 'РУЧНИЙ ВИБІР',
                        kind: 'blue'
                    }
                ],

                action: function () {
                    releasePicker(
                        movie,
                        releases
                    );
                }
            },
            {
                title: 'Скасувати',

                subtitle:
                    'Повернутися до фільму',

                action: function () {}
            }
        ]
    );
}

/* ========================================
   ORIGINAL MOVIE FLOW
======================================== */

async function movieFlow(
    movie,
    releases,
    id
) {
    var ua = releases.filter(
        function (r) {
            return uaConfirmed(
                r.title
            );
        }
    );

    if (ua.length) {
        if (
            String(
                get('playMode', 'auto')
            ) === 'manual'
        ) {
            releasePicker(
                movie,
                ua
            );
        } else {
            await startMovie(
                movie,
                ua[0],
                id
            );
        }

        return;
    }

    if (
        get('uaPolicy', 'strict') ===
        'strict'
    ) {
        note(
            'Немає релізів із підтвердженою українською озвучкою'
        );

        return;
    }

    var fallback = String(
        get('fallback', 'ask')
    );

    if (fallback === 'none') {
        note(
            'Українську озвучку не знайдено'
        );
    } else if (fallback === 'auto') {
        await startMovie(
            movie,
            releases[0],
            id
        );
    } else {
        fallbackPicker(
            movie,
            releases
        );
    }
}

/* ========================================
   ORIGINAL SEASON DETECTION
======================================== */

function seasonsFromTitle(title) {
    var t = String(title || '');
    var seasons = {};
    var m;

    var range =
        /(?:season|сезон|\bS)\s*0*(\d{1,2})\s*[-–]\s*0*(\d{1,2})/i.exec(t);

    if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);

        if (
            a > 0 &&
            b >= a &&
            b - a <= 30
        ) {
            for (
                var n = a;
                n <= b;
                n++
            ) {
                seasons[n] = true;
            }
        }
    }

    var re =
        /\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*0*(\d{1,2})/gi;

    while (
        (m = re.exec(t))
    ) {
        var sn = Number(
            m[1] || m[2]
        );

        if (sn > 0) {
            seasons[sn] = true;
        }
    }

    return Object.keys(seasons)
        .map(Number);
}

/* ========================================
   ORIGINAL EPISODE DETECTION
======================================== */

function episodeFromPath(path, season) {
    var name = String(path || '')
        .split(/[\\/]/)
        .pop();

    var m =
        /S(\d{1,2})E(\d{1,3})/i.exec(name) ||
        /(\d{1,2})x(\d{1,3})/i.exec(name);

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m =
        /(?:episode|ep|серія|серия)[ ._-]*0*(\d{1,3})/i.exec(name);

    return m
        ? Number(m[1])
        : 0;
}

/* ========================================
   SEASONS WITH PREMIUM DIALOG
======================================== */

function showSeasons(movie, releases) {
    var groups = {};
    var unknown = [];

    releases.forEach(function (r) {
        var seasons = seasonsFromTitle(
            r.title
        );

        if (!seasons.length) {
            unknown.push(r);
            return;
        }

        seasons.forEach(function (n) {
            (
                groups[n] ||
                (groups[n] = [])
            ).push(r);
        });
    });

    var nums = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    var items = nums.map(function (n) {
        return {
            title:
                'Сезон ' + n,

            subtitle:
                'Релізів: ' +
                groups[n].length,

            action: function () {
                openSeason(
                    movie,
                    n,
                    groups[n]
                );
            }
        };
    });

    if (unknown.length) {
        items.push({
            title:
                'Сезон не визначено',

            subtitle:
                'Релізів: ' +
                unknown.length,

            action: function () {
                chooseUnknownSeason(
                    movie,
                    unknown
                );
            }
        });
    }

    if (!items.length) {
        note(
            'Не вдалося визначити сезони'
        );

        return;
    }

    openDialog(
        'Сезони',
        items
    );
}

function chooseUnknownSeason(
    movie,
    releases
) {
    var max = Math.max(
        1,
        Math.min(
            30,
            Number(
                movie.number_of_seasons ||
                10
            )
        )
    );

    var items = [];

    for (
        var i = 1;
        i <= max;
        i++
    ) {
        (function (n) {
            items.push({
                title:
                    'Сезон ' + n,

                subtitle:
                    'Перевірити серії у файлах',

                action: function () {
                    openSeason(
                        movie,
                        n,
                        releases
                    );
                }
            });
        })(i);
    }

    openDialog(
        'Вкажи сезон',
        items
    );
}

function openSeason(
    movie,
    season,
    releases
) {
    execute(function (id) {
        return loadEpisodes(
            movie,
            season,
            releases,
            id
        );
    });
}

/* ========================================
   ORIGINAL EPISODE LOADING
======================================== */

async function loadEpisodes(
    movie,
    season,
    releases,
    id
) {
    closeDialog();

    note(
        'Шукаю серії сезону ' +
        season +
        '…'
    );

    var episodes = {};

    var limit = Math.min(
        8,
        releases.length
    );

    var successful = 0;

    for (
        var i = 0;
        i < limit;
        i++
    ) {
        check(id);

        var r = releases[i];

        try {
            var added = await addTorrent(
                r,
                movie,
                id
            );

            var files = videos(
                await getFiles(
                    added.hash,
                    added.link,
                    id
                )
            );

            successful++;

            files.forEach(function (entry) {
                if (
                    entry.size <
                    250 * MB
                ) {
                    return;
                }

                var ep = episodeFromPath(
                    entry.path,
                    season
                );

                if (!ep) return;

                if (
                    !episodes[ep] ||
                    score(r) >
                    episodes[ep].rank ||
                    (
                        score(r) ===
                        episodes[ep].rank &&
                        entry.size >
                        episodes[ep].entry.size
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

            log(
                'Episode scan:',
                err(e)
            );
        }

        if (
            Object.keys(episodes)
                .length >= 24
        ) {
            break;
        }
    }

    check(id);

    var nums = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!nums.length) {
        if (!successful) {
            throw Error(
                'TorrServer не зміг прочитати файли серіалу'
            );
        }

        note(
            'Серії сезону ' +
            season +
            ' не розпізнано'
        );

        return;
    }

    openDialog(
        'Сезон ' +
        season +
        ' · Серії',

        nums.map(function (n) {
            var ep = episodes[n];

            return {
                title:
                    'Серія ' + n,

                stats: [
                    {
                        label: 'РОЗМІР',
                        value: size(
                            ep.entry.size
                        )
                    }
                ],

                subtitle:
                    ep.entry.path
                        .split(/[\\/]/)
                        .pop(),

                action: function () {
                    play(
                        streamUrl(
                            ep.hash,
                            ep.entry
                        ),

                        titleOf(movie) +
                        ' S' +
                        season +
                        'E' +
                        ('0' + n).slice(-2)
                    );
                }
            };
        }),

        function () {
            showSeasons(
                movie,
                releases
            );
        }
    );
}

/* ========================================
   ORIGINAL SERIES FLOW
======================================== */

function seriesFlow(movie, releases) {
    var ua = releases.filter(
        function (r) {
            return uaConfirmed(
                r.title
            );
        }
    );

    if (ua.length) {
        showSeasons(
            movie,
            ua
        );

        return;
    }

    if (
        get('uaPolicy', 'strict') ===
        'strict'
    ) {
        note(
            'Немає серіалів із підтвердженою українською озвучкою'
        );

        return;
    }

    var fallback = get(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        note(
            'Українську озвучку не знайдено'
        );
    } else if (fallback === 'auto') {
        showSeasons(
            movie,
            releases
        );
    } else {
        openDialog(
            'Українську озвучку не підтверджено',
            [
                {
                    title:
                        'Показати інші сезони',

                    subtitle:
                        'Переглянути доступні сезони',

                    action: function () {
                        showSeasons(
                            movie,
                            releases
                        );
                    }
                },
                {
                    title: 'Скасувати',

                    action: function () {}
                }
            ]
        );
    }
}

/* ========================================
   ORIGINAL EXECUTION
======================================== */

async function execute(task) {
    if (busy) {
        note(
            'Дочекайся завершення попередньої операції'
        );

        return;
    }

    busy = true;

    var id = ++operationId;

    activeController =
        new AbortController();

    try {
        await task(id);
    } catch (e) {
        if (id === operationId) {
            log(
                'Operation:',
                e
            );

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
        var movie =
            data &&
            data.movie;

        if (!movie) {
            throw Error(
                'Не вдалося отримати дані фільму'
            );
        }

        note(
            'Шукаю: ' +
            titleOf(movie)
        );

        var releases = await findReleases(
            movie,
            id
        );

        if (!releases.length) {
            throw Error(
                'Релізів не знайдено. Перевір Jackett, назву, сідерів і розмір.'
            );
        }

        if (isSeries(movie)) {
            seriesFlow(
                movie,
                releases
            );
        } else {
            await movieFlow(
                movie,
                releases,
                id
            );
        }
    });
}

/* ========================================
   ORIGINAL SETTINGS
======================================== */

function addSetting(item) {
    try {
        Lampa.SettingsApi.addParam({
            component: 'uadv62',

            param: {
                name: P + item.name,
                type: 'select',
                values: item.values,
                default: String(
                    item.def
                )
            },

            field: {
                name: item.title,
                description:
                    item.description || ''
            },

            onChange: function (v) {
                set(item.name, v);
                resetCache();
            }
        });
    } catch (e) {
        log(
            'Setting:',
            item.name,
            err(e)
        );
    }
}

function registerSettings() {
    if (
        settingsDone ||
        !Lampa.SettingsApi
    ) {
        return;
    }

    settingsDone = true;

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',

            name: '4K Pro',

            icon:
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<rect x="2" y="5" width="20" height="14" rx="3"/>' +
                '<path d="M8 9v6M12 9v6M16 9v6"/>' +
                '</svg>'
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
                'Суворий режим вимагає явної мовної позначки в назві релізу',
            def: 'strict',
            values: {
                strict:
                    'Тільки підтверджена за назвою',
                prefer:
                    'Пріоритет української + резерв'
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
                dv:
                    'Dolby Vision → HDR10+ → HDR',
                hdr:
                    'HDR10+ → HDR → DV',
                sdr: 'SDR'
            }
        },
        {
            name: 'source',
            title: 'Джерело',
            def: 'auto',
            values: {
                auto:
                    'REMUX → Blu-ray → WEB-DL',
                bluray:
                    'Blu-ray → REMUX → WEB-DL',
                webdl:
                    'WEB-DL → REMUX → Blu-ray'
            }
        },
        {
            name: 'audio',
            title: 'Звукова доріжка',
            def: 'auto',
            values: {
                auto: 'Автоматично',
                atmos:
                    'Dolby Atmos / TrueHD',
                dts: 'DTS-HD / DTS:X',
                eac3:
                    'Dolby Digital Plus'
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
            title:
                'Максимальний розмір фільму',
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
            title:
                'За відсутності української (резервний режим)',
            def: 'ask',
            values: {
                ask: 'Запитати',
                none: 'Не запускати',
                auto:
                    'Інший реліз автоматично'
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

/* ========================================
   ORIGINAL LAMPA BUTTON
======================================== */

function button() {
    var b = document.createElement(
        'div'
    );

    b.className =
        'full-start__button selector uadv630-button';

    b.setAttribute(
        'data-uadv630',
        '1'
    );

    b.tabIndex = 0;

    b.innerHTML =
        '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<rect x="2" y="4" width="20" height="16" rx="4"/>' +
        '<path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none"/>' +
        '</svg>' +
        '<span>4K Pro</span>';

    return $(b);
}

function attach(root, ev) {
    var bar = root.find(
        '.full-start-new__buttons,' +
        '.full-start__buttons,' +
        '.full-actions'
    ).eq(0);

    if (!bar.length) {
        return false;
    }

    if (
        bar.find(
            '[data-uadv630="1"]'
        ).length
    ) {
        return true;
    }

    bar.find(
        '[data-uadv-button="1"]'
    ).remove();

    var b = button();

    var click = function () {
        run(ev.data);
    };

    b.on(
        'hover:enter click',
        click
    );

    b.on(
        'keydown',
        function (e) {
            if (
                e.key === 'Enter' ||
                e.keyCode === 13
            ) {
                e.preventDefault();
                click();
            }
        }
    );

    bar.prepend(b);

    try {
        Lampa.Controller.collectionSet(
            bar
        );
    } catch (e) {}

    return true;
}

function mountButton() {
    if (mounted) return;

    mounted = true;

    Lampa.Listener.follow(
        'full',
        function (ev) {
            if (
                !ev ||
                ev.type !== 'complite' ||
                !ev.object ||
                !ev.data ||
                !ev.data.movie
            ) {
                return;
            }

            var root;

            try {
                root =
                    ev.object.activity.render();
            } catch (e) {
                return;
            }

            if (
                !root ||
                !root.length ||
                attach(root, ev)
            ) {
                return;
            }

            var observer =
                new MutationObserver(
                    function () {
                        if (
                            attach(root, ev)
                        ) {
                            observer.disconnect();
                        }
                    }
                );

            observer.observe(
                root[0],
                {
                    childList: true,
                    subtree: true
                }
            );

            setTimeout(function () {
                observer.disconnect();
            }, 7000);
        }
    );
}

/* ========================================
   PREMIUM DARK STYLES
======================================== */

function styles() {
    if (
        document.getElementById(
            'uadv630-css'
        )
    ) {
        return;
    }

    var css = `

/* 4K PRO BUTTON */

.uadv630-button {
    display: inline-flex !important;
    align-items: center;
    gap: 9px;
    background: #202b3a !important;
    color: #f1f6ff !important;
    border: 1px solid #536783 !important;
    border-radius: 11px !important;
    order: -9999 !important;
    box-shadow: 0 5px 18px #0005 !important;
}

.uadv630-button.focus,
.uadv630-button:hover {
    background: #405977 !important;
    border-color: #d1e2fb !important;
}

.uadv630-button svg {
    flex-shrink: 0;
}

/* TOAST */

.uadv630-toast {
    position: fixed;
    left: 50%;
    bottom: 7%;
    transform: translate(-50%,12px);
    z-index: 1000002;
    max-width: 88vw;
    padding: 14px 22px;
    background: #1c2837;
    color: #f3f6fa;
    border: 1px solid #536b85;
    border-radius: 12px;
    box-shadow: 0 12px 35px #0009;
    font-size: 17px;
    text-align: center;
    opacity: 0;
    visibility: hidden;
    transition:
        opacity .2s,
        transform .2s;
    pointer-events: none;
}

.uadv630-toast.visible {
    opacity: 1;
    visibility: visible;
    transform: translate(-50%,0);
}

/* MODAL OVERLAY */

.uadv630-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2vh 2vw;
    box-sizing: border-box;
    background: rgba(3,7,14,.91);
    opacity: 0;
    transition: opacity .18s ease;
}

.uadv630-overlay.uadv630-visible {
    opacity: 1;
}

/* PREMIUM PANEL */

.uadv630-panel {
    display: flex;
    flex-direction: column;
    width: min(1100px,96vw);
    max-height: 91vh;
    overflow: hidden;
    color: #f3f7fd;
    background:
        linear-gradient(
            145deg,
            #233247 0%,
            #141f2e 48%,
            #0d1520 100%
        );
    border: 1px solid #4b617a;
    border-radius: 22px;
    box-shadow:
        0 25px 85px #000d,
        inset 0 1px 0 #ffffff13;
    transform: translateY(12px) scale(.985);
    transition: transform .2s ease;
}

.uadv630-visible .uadv630-panel {
    transform: translateY(0) scale(1);
}

/* HEADER */

.uadv630-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 26px 30px;
    background:
        linear-gradient(
            90deg,
            #32486288,
            #17233255
        );
    border-bottom: 1px solid #43556b;
}

.uadv630-header-left {
    flex: 1;
    min-width: 0;
}

.uadv630-eyebrow {
    color: #9ec4ee;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1.8px;
    margin-bottom: 10px;
}

.uadv630-heading {
    color: #fff;
    font-size: 29px;
    font-weight: 800;
    line-height: 1.22;
}

.uadv630-header-sub {
    color: #a7bbd1;
    font-size: 14px;
    margin-top: 9px;
}

.uadv630-close {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 12px;
    border: 1px solid #637991;
    background: #31455c;
    color: #fff;
    font-size: 22px;
    cursor: pointer;
}

.uadv630-close:hover {
    background: #526e8c;
}

/* LIST */

.uadv630-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px;
    scrollbar-width: thin;
    scrollbar-color: #6883a0 transparent;
}

/* PREMIUM RELEASE CARD */

.uadv630-row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;
    padding: 19px 22px;
    background:
        linear-gradient(
            125deg,
            #26384e,
            #1a293a
        );
    border: 1px solid #3d526b;
    border-radius: 16px;
    outline: none;
    cursor: pointer;
    box-shadow: 0 5px 17px #0003;
    transition:
        background .12s ease,
        border-color .12s ease,
        box-shadow .12s ease;
}

.uadv630-row.focus,
.uadv630-row:hover {
    background:
        linear-gradient(
            125deg,
            #405a79,
            #2d425b
        );
    border-color: #d2e5ff;
    box-shadow:
        inset 0 0 0 1px #d2e5ff,
        0 8px 24px #0005;
}

.uadv630-row-body {
    flex: 1;
    min-width: 0;
}

.uadv630-row-title {
    color: #fff;
    font-size: 20px;
    font-weight: 750;
    line-height: 1.4;
    overflow-wrap: anywhere;
}

.uadv630-row-sub {
    color: #a9bfd6;
    font-size: 13px;
    line-height: 1.4;
    margin-top: 12px;
    overflow-wrap: anywhere;
}

.uadv630-row-arrow {
    flex-shrink: 0;
    color: #a0bcd9;
    font-size: 38px;
    font-weight: 300;
}

.uadv630-row.focus .uadv630-row-arrow {
    color: #fff;
}

/* RECOMMENDED */

.uadv630-featured {
    border-color: #6c8aab;
}

.uadv630-recommended {
    display: inline-flex;
    align-items: center;
    padding: 6px 11px;
    margin-bottom: 12px;
    color: #d3f9e5;
    background: #245540;
    border: 1px solid #4c9671;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .7px;
}

/* BADGES */

.uadv630-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 13px;
}

.uadv630-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    color: #e5edf8;
    background: #34465d;
    border: 1px solid #526982;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: .3px;
}

.uadv630-badge-blue {
    color: #e7f3ff;
    background: #315a83;
    border-color: #6a9bcb;
}

.uadv630-badge-purple {
    color: #f2e6ff;
    background: #573d7b;
    border-color: #9973c6;
}

.uadv630-badge-gold {
    color: #fff0d0;
    background: #70552d;
    border-color: #b18a4f;
}

.uadv630-badge-green {
    color: #d9ffe9;
    background: #245b44;
    border-color: #4da078;
}

/* RELEASE STATS */

.uadv630-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #ffffff1c;
}

.uadv630-stat {
    flex: 1;
    min-width: 100px;
}

.uadv630-stat-label {
    color: #9aafc7;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
}

.uadv630-stat-value {
    color: #f4f8ff;
    font-size: 17px;
    font-weight: 750;
    margin-top: 5px;
}

/* FOOTER */

.uadv630-footer {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 26px;
    padding: 16px 20px;
    background: #111c2a;
    border-top: 1px solid #394d64;
    color: #9bb1c9;
    font-size: 13px;
}

/* COMPACT TV */

.uadv630-compact {
    width: min(930px,94vw);
    border-radius: 14px;
}

.uadv630-compact .uadv630-header {
    padding: 17px 22px;
}

.uadv630-compact .uadv630-heading {
    font-size: 23px;
}

.uadv630-compact .uadv630-row {
    padding: 12px 16px;
    margin-bottom: 7px;
    border-radius: 10px;
}

.uadv630-compact .uadv630-row-title {
    font-size: 17px;
}

.uadv630-compact .uadv630-stats {
    margin-top: 10px;
    padding-top: 9px;
}

.uadv630-compact .uadv630-stat-value {
    font-size: 14px;
}

/* MOBILE */

@media (max-width:600px) {

    .uadv630-overlay {
        padding: 2vh 1vw;
    }

    .uadv630-panel {
        width: 98vw;
        max-height: 94vh;
        border-radius: 14px;
    }

    .uadv630-header {
        padding: 17px;
    }

    .uadv630-eyebrow {
        font-size: 10px;
        letter-spacing: 1px;
    }

    .uadv630-heading {
        font-size: 20px;
    }

    .uadv630-header-sub {
        font-size: 12px;
    }

    .uadv630-close {
        width: 36px;
        height: 36px;
        font-size: 18px;
    }

    .uadv630-list {
        padding: 9px;
    }

    .uadv630-row {
        padding: 13px;
        gap: 8px;
        border-radius: 11px;
    }

    .uadv630-row-title {
        font-size: 15px;
    }

    .uadv630-row-sub {
        font-size: 11px;
    }

    .uadv630-badge {
        padding: 5px 7px;
        font-size: 9px;
    }

    .uadv630-stat {
        min-width: 75px;
    }

    .uadv630-stat-label {
        font-size: 9px;
    }

    .uadv630-stat-value {
        font-size: 13px;
    }

    .uadv630-row-arrow {
        font-size: 27px;
    }

    .uadv630-footer {
        gap: 12px;
        padding: 11px;
        font-size: 10px;
    }

    .uadv630-toast {
        font-size: 14px;
        padding: 11px 15px;
    }
}

@media (prefers-reduced-motion:reduce) {

    .uadv630-toast,
    .uadv630-overlay,
    .uadv630-panel,
    .uadv630-row {
        transition: none !important;
    }
}
`;

    var s = document.createElement(
        'style'
    );

    s.id = 'uadv630-css';
    s.textContent = css;

    document.head.appendChild(s);
}

/* ========================================
   INITIALIZATION
======================================== */

function init() {
    if (
        !window.Lampa ||
        !Lampa.Listener ||
        !Lampa.Storage ||
        !$
    ) {
        setTimeout(
            init,
            600
        );

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

    Object.keys(defaults).forEach(
        function (k) {
            if (
                get(k, null) == null
            ) {
                set(
                    k,
                    defaults[k]
                );
            }
        }
    );

    styles();
    registerSettings();
    mountButton();

    log(
        'Initialized; original 63.0.0 search preserved'
    );
}

init();

})();
