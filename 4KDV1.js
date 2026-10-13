
(function () {
'use strict';

if (window.uadv622_ready) return;
window.uadv622_ready = true;

var VERSION = '62.3.0';
var P = 'uadv62_';
var GB = 1073741824;
var MB = 1048576;

var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';

var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv)$/i;

var cache = {};
var busy = false;
var dialog = null;
var $ = window.jQuery || window.$;

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
        return Lampa.Storage.field(k) || '';
    } catch (e) {
        return '';
    }
}

function note(s) {
    try {
        Lampa.Noty.show('UaDV: ' + s);
    } catch (e) {
        console.log('[UaDV]', s);
    }
}

function log() {
    console.log.apply(
        console,
        ['[UaDV]'].concat([].slice.call(arguments))
    );
}

function scheme(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : 'http://' + u;
}

function trim(u) {
    return String(u || '').replace(/\/+$/, '');
}

function clean(s) {
    return String(s || '')
        .replace(/[:\/\\|?*<>"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function human(n) {
    return (Number(n || 0) / GB).toFixed(1) + ' GB';
}

function serial(m) {
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

function timeout(url, opt, ms) {
    var c = new AbortController();

    var t = setTimeout(function () {
        c.abort();
    }, ms || 10000);

    return fetch(
        url,
        Object.assign({}, opt || {}, {
            signal: c.signal
        })
    ).then(
        function (r) {
            clearTimeout(t);
            return r;
        },
        function (e) {
            clearTimeout(t);
            throw e;
        }
    );
}

/* ==========================================
   JACKETT CONFIGURATION
   ========================================== */

function jackett() {
    var u = field('jackett_url');

    if (!u) {
        throw Error('Вкажи jackett_url');
    }

    return {
        base: trim(scheme(u))
            .replace(/\/jackett(?:\/.*)?$/i, ''),
        key: field('jackett_key')
    };
}

/* ==========================================
   TORRSERVER CONFIGURATION
   ========================================== */

function tsBase() {
    var u = field('torrserver_url');

    if (!u) {
        throw Error('Вкажи torrserver_url');
    }

    return trim(scheme(u));
}

function tsHeaders() {
    var h = {
        'Content-Type': 'application/json'
    };

    var token = field('torrserver_token');
    var u = field('torrserver_user');
    var p = field('torrserver_pass');

    if (token) {
        h.Authorization = 'Bearer ' + token;
    } else if (u || p) {
        try {
            h.Authorization = 'Basic ' +
                btoa(
                    unescape(
                        encodeURIComponent(u + ':' + p)
                    )
                );
        } catch (e) {}
    }

    return h;
}

function tsStreamBase() {
    var b = tsBase();
    var u = field('torrserver_user');
    var p = field('torrserver_pass');

    try {
        if (u || p) {
            var x = new URL(b);
            x.username = u;
            x.password = p;
            b = trim(x.toString());
        }
    } catch (e) {}

    return b;
}

function streamAuth() {
    var t = field('torrserver_token');

    return t
        ? '&authorization=' +
          encodeURIComponent('Bearer ' + t)
        : '';
}

/* ==========================================
   PARSE TORZNAB XML
   ========================================== */

function xmlResults(s) {
    var doc = new DOMParser().parseFromString(
        s,
        'application/xml'
    );

    if (doc.querySelector('parsererror')) {
        return [];
    }

    return [].slice.call(
        doc.querySelectorAll('item')
    ).map(function (it) {
        var attrs = {};

        [].slice.call(
            it.getElementsByTagName('*')
        ).forEach(function (el) {
            if (
                el.localName === 'attr' &&
                el.getAttribute('name')
            ) {
                attrs[
                    el.getAttribute('name').toLowerCase()
                ] = el.getAttribute('value') || '';
            }
        });

        function val(t) {
            var el = it.querySelector(t);

            return el
                ? el.textContent.trim()
                : '';
        }

        var enc = it.querySelector('enclosure');
        var dl = enc && enc.getAttribute('url') || '';
        var mag = attrs.magneturl || '';

        var link = /^magnet:/i.test(mag)
            ? mag
            : (val('link') || dl);

        return {
            title: val('title'),
            link: link,
            magnet: mag,
            dl: dl,
            size: Number(
                val('size') ||
                attrs.size ||
                (enc && enc.getAttribute('length')) ||
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
    });
}

/* ==========================================
   PARSE JACKETT JSON
   ========================================== */

function jsonResults(j) {
    var a = Array.isArray(j)
        ? j
        : (j.Results || j.results || j.items || []);

    return (Array.isArray(a) ? a : []).map(
        function (x) {
            var mag =
                x.MagnetUri ||
                x.MagnetUrl ||
                x.magnet ||
                '';

            var link = /^magnet:/i.test(mag)
                ? mag
                : (x.Link || x.link || '');

            return {
                title: x.Title || x.title || '',
                link: link,
                magnet: mag,
                dl: '',
                size: Number(x.Size || x.size || 0),
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
                    ''
                ).toLowerCase()
            };
        }
    );
}

/* ==========================================
   JACKETT SEARCH
   ========================================== */

async function searchJackett(q, cats, mode, meta) {
    var jb = jackett();
    var p = new URLSearchParams();
    var url;

    if (jb.key) {
        p.set('apikey', jb.key);
    }

    if (mode === 'xml') {
        p.set('t', 'search');
        p.set('q', clean(q));

        cats.split(',').forEach(function (c) {
            p.append('cat', c);
        });

        url = jb.base +
            '/api/v2.0/indexers/all/results/torznab/?' +
            p.toString();

    } else {
        p.set('Query', clean(q));

        if (meta) {
            p.set('title', meta.title || '');
            p.set('title_original', meta.orig || '');

            if (meta.year) {
                p.set('year', meta.year);
            }

            p.set(
                'is_serial',
                meta.series ? '1' : '0'
            );
        }

        cats.split(',').forEach(function (c) {
            p.append('Category[]', c);
        });

        url = jb.base +
            '/api/v2.0/indexers/all/results?' +
            p.toString();
    }

    var r = await timeout(
        url,
        {
            method: 'GET',
            credentials: 'omit',
            mode: 'cors'
        },
        10000
    );

    if (!r.ok) {
        throw Error('Jackett HTTP ' + r.status);
    }

    return mode === 'xml'
        ? xmlResults(await r.text())
        : jsonResults(await r.json());
}

/* ==========================================
   LANGUAGE DETECTION
   ========================================== */

function ukrainian(t) {
    return /ukr|укр|украї|украин|ukrainian|ukrainisch/i
        .test(t || '');
}

/* ==========================================
   RELEASE QUALITY SCORING
   ========================================== */

function score(x) {
    var t = x.title || '';
    var s = 0;

    var q = String(get('quality', '4k'));
    var hdr = String(get('hdr', 'dv'));
    var source = String(get('source', 'auto'));
    var audio = String(get('audio', 'auto'));

    var k4 = /2160p|\b4k\b|\buhd\b/i.test(t);
    var fhd = /1080p/i.test(t);

    if (q === '1080') {
        s += fhd ? 110 : k4 ? 50 : 0;
    } else {
        s += k4 ? 110 : fhd ? 60 : 0;
    }

    var dv = /dolby.?vision|dovi|(?:^|[.\s_-])dv(?:$|[.\s_-])/i
        .test(t);

    var hp = /hdr10\+/i.test(t);
    var h = /\bhdr10?\b/i.test(t);

    if (hdr === 'sdr') {
        s += !dv && !hp && !h ? 40 : 0;
    } else if (hdr === 'hdr') {
        s += hp ? 40 : h ? 35 : dv ? 15 : 0;
    } else {
        s += dv ? 40 : hp ? 32 : h ? 24 : 0;
    }

    var rem = /remux/i.test(t);
    var blur = /blu.?ray|bdrip/i.test(t);
    var web = /web.?dl/i.test(t);

    if (source === 'webdl') {
        s += web ? 35 : rem ? 20 : blur ? 15 : 0;
    } else if (source === 'bluray') {
        s += blur && !rem
            ? 35
            : rem ? 27 : web ? 15 : 0;
    } else {
        s += rem ? 35 : blur ? 27 : web ? 20 : 0;
    }

    if (audio === 'atmos' && /atmos|truehd/i.test(t)) {
        s += 20;
    }

    if (audio === 'dts' && /dts.?hd|dts.?x/i.test(t)) {
        s += 20;
    }

    if (audio === 'eac3' && /e.?ac.?3|ddp/i.test(t)) {
        s += 20;
    }

    s += Math.min(
        20,
        Math.log2(1 + Number(x.seed || 0)) * 3
    );

    s += Math.min(
        12,
        Number(x.size || 0) / GB / 5
    );

    return s;
}

/* ==========================================
   SEARCH TITLE VARIANTS
   ========================================== */

function queries(m) {
    var isShow = serial(m);

    var orig = clean(
        m.original_name ||
        m.original_title ||
        m.name ||
        m.title
    );

    var local = clean(m.name || m.title);

    var date = isShow
        ? (m.first_air_date || '')
        : (m.release_date || '');

    var year = String(date).slice(0, 4);

    var arr = [];

    function add(x) {
        x = clean(x);

        if (x && arr.indexOf(x) < 0) {
            arr.push(x);
        }
    }

    var pref = field('parse_lang') ||
        (isShow ? 'df' : 'df_year');

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
    add(local);

    if (year) {
        add(orig + ' ' + year);
        add(local + ' ' + year);
    }

    if (isShow) {
        add(orig + ' complete series');
        add(orig + ' season');
        add(local + ' сезон');
        add(local + ' серії');
    }

    return arr;
}

/* ==========================================
   FIND AND RANK RELEASES
   ========================================== */

async function findReleases(m) {
    var show = serial(m);

    var cats = show
        ? SERIES_CATS
        : MOVIE_CATS;

    var qs = queries(m);

    var key = [
        jackett().base,
        field('jackett_key'),
        cats,
        qs.join('|'),
        get('minSeeds', '5'),
        get('maxSize', '70')
    ].join('~');

    if (
        cache[key] &&
        Date.now() - cache[key].at < 300000
    ) {
        return cache[key].items.slice();
    }

    var all = [];
    var errors = [];
    var successful = 0;

    for (var i = 0; i < qs.length; i++) {
        var meta = {
            title: m.name || m.title,
            orig: m.original_name || m.original_title,
            year: String(
                (show ? m.first_air_date : m.release_date) || ''
            ).slice(0, 4),
            series: show
        };

        var results = await Promise.allSettled([
            searchJackett(qs[i], cats, 'xml', meta),
            searchJackett(qs[i], cats, 'json', meta)
        ]);

        results.forEach(function (r) {
            if (r.status === 'fulfilled') {
                successful++;
                all = all.concat(r.value);
            } else {
                errors.push(String(r.reason));
            }
        });

        // Важливо: не припиняємо пошук після першого
        // релізу з позначкою української мови.
    }

    if (!successful) {
        throw Error(
            'Jackett: ' +
            (errors[0] || 'помилка з’єднання')
        );
    }

    var seen = {};
    var min = Number(get('minSeeds', '5'));
    var max = Number(get('maxSize', '70')) * GB;

    all = all.filter(function (x) {
        if (
            !x.link ||
            !x.title ||
            x.size <= 0 ||
            x.seed < min ||
            (!show && x.size > max)
        ) {
            return false;
        }

        var id = (
            x.magnet ||
            x.link ||
            x.title
        ).toLowerCase();

        if (seen[id]) return false;

        seen[id] = true;
        return true;
    });

    var tol = String(get('toloka', 'false')) === 'true';

    all.sort(function (a, b) {
        if (tol) {
            var at = /toloka/i.test(a.tracker);
            var bt = /toloka/i.test(b.tracker);

            if (at !== bt) {
                return at ? -1 : 1;
            }
        }

        return score(b) - score(a);
    });

    log('Знайдено', all.length, 'релізів', qs);

    cache[key] = {
        at: Date.now(),
        items: all.slice()
    };

    return all;
}

/* ==========================================
   TORRSERVER — PLAYUA v61.3 COMPATIBILITY
   ========================================== */

async function tsAdd(base, link, title, poster, movie) {
    var body = {
        action: 'add',
        link: link,
        title: '[LAMPA] ' + (title || ''),
        poster: poster || '',
        data: JSON.stringify({
            lampa: true,
            movie: movie || {}
        }),
        save_to_db: false
    };

    var r = await timeout(
        base + '/torrents',
        {
            method: 'POST',
            headers: tsHeaders(),
            body: JSON.stringify(body)
        },
        10000
    );

    var j = {};

    try {
        j = await r.json();
    } catch (e) {}

    if (!r.ok) {
        throw Error('TorrServer HTTP ' + r.status);
    }

    var hash =
        j.hash ||
        j.id ||
        j.link ||
        j.data ||
        j.result ||
        '';

    return {
        hash: typeof hash === 'string' ? hash : '',
        raw: j
    };
}

function fileStats(j) {
    if (!j) return [];

    if (Array.isArray(j)) return j;

    if (Array.isArray(j.file_stats)) return j.file_stats;
    if (Array.isArray(j.FileStats)) return j.FileStats;
    if (Array.isArray(j.files)) return j.files;
    if (Array.isArray(j.Files)) return j.Files;

    if (j.stats && Array.isArray(j.stats.file_stats)) {
        return j.stats.file_stats;
    }

    return [];
}

async function tsFiles(base, linkOrHash) {
    var body = {
        action: 'get'
    };

    if (/^(magnet:|https?:)/i.test(linkOrHash)) {
        body.link = linkOrHash;
    } else {
        body.hash = linkOrHash;
    }

    try {
        var r = await timeout(
            base + '/torrents',
            {
                method: 'POST',
                headers: tsHeaders(),
                body: JSON.stringify(body)
            },
            8000
        );

        if (r.ok) {
            var j = await r.json();
            var files = fileStats(j);

            if (files.length) return files;
        }
    } catch (e) {
        log('TorrServer get:', e);
    }

    try {
        var url = base +
            '/stream/files?link=' +
            encodeURIComponent(linkOrHash);

        var r2 = await timeout(
            url,
            {
                method: 'GET',
                headers: tsHeaders()
            },
            8000
        );

        if (r2.ok) {
            var j2 = await r2.json();
            return fileStats(j2);
        }
    } catch (e) {
        log('TorrServer files:', e);
    }

    return [];
}

function safeFileName(s) {
    return String(s || 'video')
        .replace(/[^\w\d.-]+/g, '.')
        .replace(/^\.+|\.+$/g, '') || 'video';
}

function streamLink(hash, file, title) {
    var name = safeFileName(
        String(
            file && (file.path || file.Path) ||
            title ||
            'video'
        ).split(/[\\/]/).pop()
    );

    var idx = 1;

    if (file && file.id !== undefined) {
        var n = Number(file.id);

        if (!isNaN(n)) idx = n + 1;
    } else if (file && file.ID !== undefined) {
        var n2 = Number(file.ID);

        if (!isNaN(n2)) idx = n2 + 1;
    }

    return tsStreamBase() +
        '/stream/' +
        encodeURIComponent(name) +
        '?link=' +
        encodeURIComponent(hash) +
        '&index=' + idx +
        '&play=1' +
        streamAuth();
}

function closeDialog() {
    if (!dialog) return;

    var d = dialog;
    dialog = null;

    try {
        d.close();
    } catch (e) {}
}

function playStream(url, title) {
    closeDialog();

    if (
        window.Lampa &&
        Lampa.Player &&
        typeof Lampa.Player.play === 'function'
    ) {
        Lampa.Player.play({
            url: url,
            title: title,
            timeline: 0
        });
    } else {
        location.href = url;
    }
}

function tsPlayById(hash, file, title) {
    playStream(
        streamLink(hash, file, title),
        title
    );
}

/* ==========================================
   SIMPLE UNIFIED DIALOG
   ========================================== */

function openDialog(title, items) {
    closeDialog();

    var overlay = document.createElement('div');
    overlay.className = 'uadv-dialog';

    var panel = document.createElement('div');
    panel.className = 'uadv-panel';

    var head = document.createElement('div');
    head.className = 'uadv-head';
    head.textContent = title;

    var list = document.createElement('div');
    list.className = 'uadv-list';

    panel.appendChild(head);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var selected = 0;
    var closed = false;
    var rows = [];

    function focus(n) {
        if (!rows.length) return;

        selected = Math.max(
            0,
            Math.min(rows.length - 1, n)
        );

        rows.forEach(function (r, i) {
            r.classList.toggle('focus', i === selected);
        });

        try {
            rows[selected].focus();
            rows[selected].scrollIntoView({
                block: 'nearest'
            });
        } catch (e) {}
    }

    function close() {
        if (closed) return;

        closed = true;

        document.removeEventListener(
            'keydown',
            keyboard,
            true
        );

        overlay.remove();

        if (dialog && dialog.close === close) {
            dialog = null;
        }
    }

    function keyboard(e) {
        var k = e.key || e.keyCode;

        if (
            k === 'Escape' ||
            k === 'Backspace' ||
            k === 'BrowserBack' ||
            k === 27 ||
            k === 8 ||
            k === 461 ||
            k === 10009
        ) {
            e.preventDefault();
            e.stopImmediatePropagation();
            close();
            return;
        }

        if (k === 'ArrowDown' || k === 40) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focus(selected + 1);
            return;
        }

        if (k === 'ArrowUp' || k === 38) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focus(selected - 1);
            return;
        }

        if (k === 'Enter' || k === 13) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (rows[selected]) rows[selected].click();
        }
    }

    (items || []).forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'uadv-row selector';
        row.tabIndex = 0;

        var name = document.createElement('div');
        name.className = 'uadv-row-title';
        name.textContent = item.title || '';

        row.appendChild(name);

        if (item.subtitle) {
            var sub = document.createElement('div');
            sub.className = 'uadv-row-sub';
            sub.textContent = item.subtitle;
            row.appendChild(sub);
        }

        row.addEventListener('click', function () {
            if (item.action) item.action();
        });

        list.appendChild(row);
        rows.push(row);
    });

    document.addEventListener('keydown', keyboard, true);

    dialog = {
        close: close
    };

    focus(0);
}

/* ==========================================
   MOVIE AUTO PLAY — НЕ ЗМІНЕНО
   ========================================== */

function torrentLink(r) {
    return r.dl || r.magnet || r.link;
}

async function startMovieRelease(movie, release) {
    var base = tsBase();
    var link = torrentLink(release);
    var hash = link;

    try {
        var added = await tsAdd(
            base,
            link,
            movie.title || movie.name,
            movie.poster_path || '',
            movie
        );

        if (added.hash) hash = added.hash;
    } catch (e) {
        log('TorrServer add failed:', e);
        hash = link;
    }

    var name = safeFileName(
        movie.title || movie.name || 'video'
    ) + '.mkv';

    var url = tsStreamBase() +
        '/stream/' +
        encodeURIComponent(name) +
        '?link=' +
        encodeURIComponent(hash) +
        '&index=1&play=1' +
        streamAuth();

    note('Запускаю відтворення…');

    playStream(url, movie.title || movie.name);
}

function releasePicker(movie, releases) {
    openDialog(
        'UaDV — Обери реліз',
        releases.slice(0, 50).map(function (r) {
            return {
                title: r.title,
                subtitle: human(r.size) + ' · Сідери: ' + r.seed,
                action: function () {
                    closeDialog();

                    startMovieRelease(movie, r).catch(function (e) {
                        note(e.message || String(e));
                    });
                }
            };
        })
    );
}

function fallbackPicker(movie, releases) {
    openDialog(
        'Українську озвучку не знайдено',
        [
            {
                title: 'Показати інші релізи',
                subtitle: 'Вибір вручну',
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

async function movieFlow(movie, releases) {
    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (ua.length) {
        if (get('playMode', 'auto') === 'manual') {
            releasePicker(movie, ua);
        } else {
            await startMovieRelease(movie, ua[0]);
        }

        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        await startMovieRelease(movie, releases[0]);
        return;
    }

    fallbackPicker(movie, releases);
}

/* ==========================================
   SERIES — SEASONS AND EPISODES
   ========================================== */

function seasonsFromTitle(s) {
    var result = {};
    s = String(s || '');

    var range = s.match(
        /(?:season|сезон|s)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i
    );

    if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);

        if (b >= a && b - a <= 30) {
            for (var n = a; n <= b; n++) {
                result[n] = true;
            }
        }
    }

    var re =
        /(?:\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*(\d{1,2}))/gi;

    var m;

    while ((m = re.exec(s))) {
        var sn = Number(m[1] || m[2]);

        if (sn) result[sn] = true;
    }

    var keys = Object.keys(result).map(Number);

    return keys.length ? keys : [1];
}

/* Покращене розпізнавання номерів серій */
function episodeFromPath(path, season) {
    var name = String(path || '')
        .split(/[\\/]/)
        .pop();

    var m = name.match(
        /S(\d{1,2})[\s._-]*E(\d{1,3})/i
    );

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m = name.match(
        /(?:^|[\s._-])(\d{1,2})x(\d{1,3})(?=$|[\s._-])/i
    );

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m = name.match(
        /(\d{1,2})[\s._-]*сезон[\s._-]*(\d{1,3})[\s._-]*(?:серія|серия|епізод|эпизод)/i
    );

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m = name.match(
        /(?:season|сезон)\s*0*(\d{1,2})[\s._-]*(?:episode|ep|серія|серия|епізод|эпизод)\s*0*(\d{1,3})/i
    );

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m = name.match(
        /(?:episode|ep|серія|серия|епізод|эпизод)\s*0*(\d{1,3})/i
    );

    return m ? Number(m[1]) : 0;
}

function showSeasons(movie, releases) {
    var groups = {};

    releases.forEach(function (r) {
        seasonsFromTitle(r.title).forEach(function (n) {
            if (!groups[n]) groups[n] = [];
            groups[n].push(r);
        });
    });

    var numbers = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!numbers.length) {
        note('Не вдалося визначити сезони');
        return;
    }

    openDialog(
        'UaDV — Обери сезон',
        numbers.map(function (n) {
            return {
                title: 'Сезон ' + n,
                subtitle: 'Релізів: ' + groups[n].length,
                action: function () {
                    openSeason(movie, n, groups[n]);
                }
            };
        })
    );
}

async function loadEpisodes(movie, season, releases) {
    closeDialog();

    note('Завантажую серії сезону ' + season);

    var episodes = {};
    var base = tsBase();

    for (var i = 0; i < Math.min(20, releases.length); i++) {
        var r = releases[i];
        var link = torrentLink(r);
        var hash = link;

        try {
            var added = await tsAdd(
                base,
                link,
                (movie.name || movie.title) + ' S' + season,
                '',
                movie
            );

            if (added.hash) hash = added.hash;
        } catch (e) {
            log('Series add:', e);
        }

        var files = await tsFiles(base, hash);

        files.forEach(function (f) {
            var path = String(f.path || f.Path || '');

            var size = Number(
                f.length ||
                f.Length ||
                f.size ||
                f.Size ||
                0
            );

            if (!VIDEO.test(path) || size < 150 * MB) {
                return;
            }

            var ep = episodeFromPath(path, season);

            if (!ep) return;

            if (!episodes[ep] || size > episodes[ep].size) {
                episodes[ep] = {
                    file: f,
                    hash: hash,
                    size: size
                };
            }
        });
    }

    var numbers = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!numbers.length) {
        note('Серії не знайдено. Перевір назви файлів у релізах.');
        return;
    }

    openDialog(
        'Сезон ' + season + ' — серії',
        numbers.map(function (n) {
            var ep = episodes[n];

            return {
                title: 'Серія ' + n,
                subtitle: human(ep.size),
                action: function () {
                    tsPlayById(
                        ep.hash,
                        ep.file,
                        (movie.name || movie.title) +
                        ' S' + season +
                        'E' + String(n).padStart(2, '0')
                    );
                }
            };
        })
    );
}

function openSeason(movie, season, releases) {
    var sorted = releases.slice().sort(function (a, b) {
        var ua = ukrainian(a.title) ? 1 : 0;
        var ub = ukrainian(b.title) ? 1 : 0;

        return ub - ua || score(b) - score(a);
    });

    loadEpisodes(movie, season, sorted);
}

function seriesFlow(movie, releases) {
    var sorted = releases.slice().sort(function (a, b) {
        var ua = ukrainian(a.title) ? 1 : 0;
        var ub = ukrainian(b.title) ? 1 : 0;

        return ub - ua || score(b) - score(a);
    });

    if (!sorted.length) {
        note('Релізів серіалу не знайдено');
        return;
    }

    showSeasons(movie, sorted);
}

/* ==========================================
   НАЛАШТУВАННЯ ПЛАГІНА
   ========================================== */

var SETTINGS = [
    {
        id: 'playMode',
        name: 'Режим відтворення',
        type: 'select',
        values: {
            torrserver: 'TorrServer',
            internal: 'Вбудований плеєр'
        },
        default: 'torrserver'
    },
    {
        id: 'quality',
        name: 'Якість відео',
        type: 'select',
        values: {
            any: 'Будь-яка',
            '2160': '4K / 2160p',
            '1080': '1080p',
            '720': '720p'
        },
        default: 'any'
    },
    {
        id: 'hdr',
        name: 'Перевага HDR',
        type: 'select',
        values: {
            any: 'Будь-яка',
            hdr: 'HDR',
            sdr: 'SDR'
        },
        default: 'any'
    },
    {
        id: 'source',
        name: 'Джерело релізів',
        type: 'select',
        values: {
            all: 'Усі джерела',
            toloka: 'Toloka'
        },
        default: 'all'
    },
    {
        id: 'audio',
        name: 'Аудіодоріжка',
        type: 'select',
        values: {
            uk: 'Українська',
            any: 'Будь-яка'
        },
        default: 'uk'
    },
    {
        id: 'minSeeds',
        name: 'Мінімум сідів',
        type: 'select',
        values: {
            '0': 'Не обмежувати',
            '1': '1',
            '3': '3',
            '5': '5',
            '10': '10'
        },
        default: '0'
    },
    {
        id: 'maxSize',
        name: 'Максимальний розмір',
        type: 'select',
        values: {
            '0': 'Не обмежувати',
            '10': '10 ГБ',
            '20': '20 ГБ',
            '40': '40 ГБ',
            '80': '80 ГБ'
        },
        default: '0'
    },
    {
        id: 'toloka',
        name: 'Використовувати Toloka',
        type: 'trigger',
        default: true
    },
    {
        id: 'fallback',
        name: 'Дозволити релізи без позначки UA',
        type: 'trigger',
        default: true
    }
];

function addSetting(item) {
    if (!window.Lampa || !Lampa.SettingsApi) return;

    try {
        Lampa.SettingsApi.addParam({
            component: 'uadv62',
            param: {
                name: item.name,
                type: item.type,
                values: item.values || {},
                default: item.default
            },
            field: {
                name: item.name
            },
            onChange: function (value) {
                cache['setting_' + item.id] = value;
            }
        });
    } catch (e) {
        console.warn('[UaDV] Setting error:', item.id, e);
    }
}

function registerSettings() {
    if (!window.Lampa || !Lampa.SettingsApi) return;

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',
            name: 'UaDV — Українська доріжка',
            icon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v14H3z"/></svg>'
        });

        SETTINGS.forEach(addSetting);
    } catch (e) {
        console.warn('[UaDV] Settings registration error:', e);
    }
}

/* ==========================================
   ЗАПУСК ПОШУКУ
   ========================================== */

async function runUaDV(data) {
    if (busy) {
        note('Пошук уже виконується');
        return;
    }

    if (!data || !data.movie) {
        note('Не вдалося визначити фільм або серіал');
        return;
    }

    busy = true;

    try {
        var movie = data.movie;

        note('Шукаю українську озвучку…');

        var releases = await findReleases(movie);

        if (!releases || !releases.length) {
            note('Релізів не знайдено');
            return;
        }

        if (isSerial(movie)) {
            seriesFlow(movie, releases);
        } else {
            movieFlow(movie, releases);
        }
    } catch (e) {
        console.error('[UaDV] Search error:', e);
        note('Помилка пошуку релізів');
    } finally {
        busy = false;
    }
}

/* ==========================================
   КНОПКА UA НА КАРТЦІ
   ========================================== */

function findButtonsBar() {
    if (!$) return null;

    var selectors = [
        '.full-start__buttons',
        '.card__buttons',
        '.full-start-new__buttons',
        '.full-start__button'
    ];

    for (var i = 0; i < selectors.length; i++) {
        var el = $(selectors[i]).first();

        if (el.length) return el;
    }

    return null;
}

function makeUaButton() {
    if (!$) return null;

    var button = $('<div class="uadv62-button selector">' +
        '<span class="uadv62-button__icon">UA</span>' +
        '<span class="uadv62-button__text">Українська доріжка</span>' +
        '</div>');

    button.on('hover:enter', function () {
        var movie = null;

        try {
            if (Lampa.Activity && Lampa.Activity.active) {
                var activity = Lampa.Activity.active();

                if (activity && activity.card) {
                    movie = activity.card;
                }
            }
        } catch (e) {}

        if (!movie) {
            try {
                movie = Lampa.Storage.get('activity_card');
            } catch (e) {}
        }

        if (!movie) {
            note('Не вдалося отримати дані картки');
            return;
        }

        runUaDV({ movie: movie });
    });

    button.on('click', function () {
        button.trigger('hover:enter');
    });

    return button;
}

function attachButton() {
    if (!$) return;

    var bar = findButtonsBar();

    if (!bar || !bar.length) return;

    if (bar.find('.uadv62-button').length) return;

    var button = makeUaButton();

    if (!button) return;

    bar.append(button);
}

function mountButton() {
    if (!$ || !window.Lampa) return;

    try {
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                setTimeout(attachButton, 300);
                setTimeout(attachButton, 1000);
            }
        });
    } catch (e) {
        console.warn('[UaDV] Listener error:', e);
    }

    try {
        Lampa.Listener.follow('activity', function (event) {
            if (event.type === 'start') {
                setTimeout(attachButton, 500);
            }
        });
    } catch (e) {}
}

/* ==========================================
   СТИЛІ
   ========================================== */

function injectStyles() {
    if (!$ || $('#uadv62-styles').length) return;

    var css = [
        '.uadv62-button{',
        'display:inline-flex;',
        'align-items:center;',
        'justify-content:center;',
        'gap:.55em;',
        'padding:.65em 1em;',
        'margin:.25em;',
        'border-radius:.35em;',
        'background:rgba(40,160,100,.18);',
        'border:1px solid rgba(40,200,130,.55);',
        'color:inherit;',
        'font-size:1em;',
        'cursor:pointer;',
        'white-space:nowrap;',
        '}',
        '.uadv62-button.focus,',
        '.uadv62-button.hover,',
        '.uadv62-button:focus{',
        'background:rgba(40,180,110,.4);',
        'border-color:rgba(80,230,150,.9);',
        'outline:none;',
        '}',
        '.uadv62-button__icon{',
        'display:inline-flex;',
        'align-items:center;',
        'justify-content:center;',
        'font-weight:800;',
        'font-size:.85em;',
        'padding:.2em .35em;',
        'border-radius:.2em;',
        'background:#16884f;',
        'color:#fff;',
        '}',
        '.uadv62-dialog{',
        'max-height:80vh;',
        'overflow-y:auto;',
        '}',
        '.uadv62-release{',
        'padding:.8em;',
        'margin:.4em 0;',
        'border-radius:.35em;',
        'background:rgba(255,255,255,.06);',
        '}',
        '.uadv62-release.focus,',
        '.uadv62-release.hover{',
        'background:rgba(255,255,255,.15);',
        '}'
    ].join('');

    $('<style id="uadv62-styles"></style>')
        .text(css)
        .appendTo('head');
}

/* ==========================================
   ІНІЦІАЛІЗАЦІЯ
   ========================================== */

function init() {
    if (!window.Lampa || !$) {
        setTimeout(init, 1000);
        return;
    }

    injectStyles();
    registerSettings();
    mountButton();

    console.log('[UaDV] Plugin initialized, version ' + VERSION);
}

init();

})();
