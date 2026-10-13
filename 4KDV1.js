
(function () {
'use strict';

if (window.uadv622_ready) return;
window.uadv622_ready = true;

var VERSION = '62.2.0';
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

        var dl = enc &&
            enc.getAttribute('url') || '';

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
                size: Number(
                    x.Size || x.size || 0
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

        // Формат пошуку з PlayUa v61.3
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
    return /ukr|укр|украї|гр\.|ukrainian|ukrainisch/i
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

    if (
        audio === 'atmos' &&
        /atmos|truehd/i.test(t)
    ) {
        s += 20;
    }

    if (
        audio === 'dts' &&
        /dts.?hd|dts.?x/i.test(t)
    ) {
        s += 20;
    }

    if (
        audio === 'eac3' &&
        /e.?ac.?3|ddp/i.test(t)
    ) {
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
    var orig = clean(
        m.original_title ||
        m.original_name ||
        m.title ||
        m.name
    );

    var local = clean(m.title || m.name);

    var year = String(
        m.release_date || ''
    ).slice(0, 4);

    var pref = field('parse_lang') ||
        (serial(m) ? 'df' : 'df_year');

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

    var arr = [];

    function add(x) {
        x = clean(x);

        if (x && arr.indexOf(x) < 0) {
            arr.push(x);
        }
    }

    add(combos[pref] || orig);
    add(orig);

    if (local !== orig) {
        add(local);
    }

    if (!serial(m) && year) {
        add(orig + ' ' + year);
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
            title: m.title || m.name,
            orig: m.original_title || m.original_name,
            year: String(
                m.release_date || ''
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

        if (
            i === 0 &&
            all.some(function (x) {
                return ukrainian(x.title);
            })
        ) {
            break;
        }
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

    var tol = String(
        get('toloka', 'false')
    ) === 'true';

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

    log(
        'Знайдено',
        all.length,
        'релізів',
        qs
    );

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

    if (Array.isArray(j.file_stats)) {
        return j.file_stats;
    }

    if (Array.isArray(j.FileStats)) {
        return j.FileStats;
    }

    if (Array.isArray(j.files)) {
        return j.files;
    }

    if (Array.isArray(j.Files)) {
        return j.Files;
    }

    if (
        j.stats &&
        Array.isArray(j.stats.file_stats)
    ) {
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

            if (files.length) {
                return files;
            }
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
            file && file.path ||
            title ||
            'video'
        ).split(/[\\/]/).pop()
    );

    var idx = 1;

    if (
        file &&
        file.id !== undefined
    ) {
        var n = Number(file.id);

        if (!isNaN(n)) {
            idx = n + 1;
        }
    }

    return tsStreamBase() +
        '/stream/' +
        encodeURIComponent(name + '.mkv') +
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
            r.classList.toggle(
                'focus',
                i === selected
            );
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

            if (rows[selected]) {
                rows[selected].click();
            }
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
            if (item.action) {
                item.action();
            }
        });

        list.appendChild(row);
        rows.push(row);
    });

    document.addEventListener(
        'keydown',
        keyboard,
        true
    );

    dialog = {
        close: close
    };

    focus(0);
}

/* ==========================================
   MOVIE AUTO PLAY
   ========================================== */

function torrentLink(r) {
    // Саме цей порядок використовував PlayUa.
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

        if (added.hash) {
            hash = added.hash;
        }
    } catch (e) {
        // Як у v61.3: резервний запуск
        // за початковим посиланням.
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

    playStream(
        url,
        movie.title || movie.name
    );
}

function releasePicker(movie, releases) {
    openDialog(
        'UaDV — Обери реліз',
        releases.slice(0, 50).map(function (r) {
            return {
                title: r.title,
                subtitle:
                    human(r.size) +
                    ' · Сідери: ' + r.seed,
                action: function () {
                    closeDialog();

                    startMovieRelease(
                        movie,
                        r
                    ).catch(function (e) {
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
        if (
            get('playMode', 'auto') === 'manual'
        ) {
            releasePicker(movie, ua);
        } else {
            await startMovieRelease(
                movie,
                ua[0]
            );
        }

        return;
    }

    var fallback = get(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        await startMovieRelease(
            movie,
            releases[0]
        );
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

    var keys = Object.keys(result)
        .map(Number);

    return keys.length ? keys : [1];
}

function episodeFromPath(path, season) {
    var name = String(path || '')
        .split(/[\\/]/)
        .pop();

    var m = name.match(
        /S(\d{1,2})E(\d{1,3})/i
    );

    if (!m) {
        m = name.match(
            /(\d{1,2})x(\d{1,3})/i
        );
    }

    if (m) {
        return Number(m[1]) === season
            ? Number(m[2])
            : 0;
    }

    m = name.match(
        /(?:episode|ep|серія|серия)\s*0*(\d{1,3})/i
    );

    return m ? Number(m[1]) : 0;
}

function showSeasons(movie, releases) {
    var groups = {};

    releases.forEach(function (r) {
        seasonsFromTitle(r.title).forEach(
            function (n) {
                if (!groups[n]) groups[n] = [];
                groups[n].push(r);
            }
        );
    });

    var numbers = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    openDialog(
        'UaDV — Обери сезон',
        numbers.map(function (n) {
            return {
                title: 'Сезон ' + n,
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
        })
    );
}

async function loadEpisodes(movie, season, releases) {
    closeDialog();

    note(
        'Завантажую серії сезону ' +
        season
    );

    var episodes = {};
    var base = tsBase();

    for (
        var i = 0;
        i < Math.min(10, releases.length);
        i++
    ) {
        var r = releases[i];
        var link = torrentLink(r);
        var hash = link;

        try {
            var added = await tsAdd(
                base,
                link,
                (movie.name || movie.title) +
                ' S' + season,
                '',
                movie
            );

            if (added.hash) {
                hash = added.hash;
            }
        } catch (e) {
            log('Series add:', e);
        }

        var files = await tsFiles(
            base,
            hash
        );

        files.forEach(function (f) {
            var path = String(
                f.path || f.Path || ''
            );

            var size = Number(
                f.length || f.Length || 0
            );

            if (
                !VIDEO.test(path) ||
                size < 500 * MB
            ) {
                return;
            }

            var ep = episodeFromPath(
                path,
                season
            );

            if (!ep) return;

            if (
                !episodes[ep] ||
                size > episodes[ep].size
            ) {
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
        note(
            'Не знайдено відеосерій ≥500 MB'
        );
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
                        'E' +
                        String(n).padStart(2, '0')
                    );
                }
            };
        })
    );
}

function openSeason(movie, season, releases) {
    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (ua.length) {
        loadEpisodes(
            movie,
            season,
            ua
        );
        return;
    }

    var fallback = get(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        loadEpisodes(
            movie,
            season,
            releases
        );
        return;
    }

    openDialog(
        'Українську озвучку не знайдено',
        [
            {
                title: 'Показати інші серії',
                action: function () {
                    loadEpisodes(
                        movie,
                        season,
                        releases
                    );
                }
            },
            {
                title: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

function seriesFlow(movie, releases) {
    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (ua.length) {
        showSeasons(movie, ua);
        return;
    }

    var fallback = get(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        showSeasons(movie, releases);
        return;
    }

    openDialog(
        'Українську озвучку не знайдено',
        [
            {
                title: 'Показати інші сезони',
                action: function () {
                    showSeasons(
                        movie,
                        releases
                    );
                }
            },
            {
                title: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

/* ==========================================
   UADV v62.2 — SETTINGS
   ========================================== */

function addSetting(component, item) {
    try {
        Lampa.SettingsApi.addParam({
            component: component,
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
            onChange: function (value) {
                set(item.name, value);

                if (
                    item.name === 'minSeeds' ||
                    item.name === 'maxSize'
                ) {
                    cache = {};
                }
            }
        });
    } catch (e) {
        log('Setting error:', item.name, e);
    }
}

function registerSettings() {
    if (
        !window.Lampa ||
        !Lampa.SettingsApi
    ) {
        return;
    }

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',
            name: 'UaDV AutoPlay',
            icon:
                '<svg width="24" height="24" ' +
                'viewBox="0 0 24 24" ' +
                'fill="none" ' +
                'stroke="currentColor" ' +
                'stroke-width="2">' +
                '<rect x="2" y="5" width="20" ' +
                'height="14" rx="3"/>' +
                '<path d="M8 9v6M12 9v6M16 9v6"/>' +
                '</svg>'
        });
    } catch (e) {
        log('Settings component:', e);
    }

    var settings = [
        {
            name: 'playMode',
            title: 'Режим запуску фільмів',
            description:
                'Автоматично запускати найкращий український реліз або обирати вручну',
            def: 'auto',
            values: {
                auto: 'Автоматично',
                manual: 'Ручний вибір'
            }
        },
        {
            name: 'quality',
            title: 'Пріоритет роздільності',
            description:
                'Бажана роздільність відео',
            def: '4k',
            values: {
                '4k': '4K / 2160p',
                '1080': 'Full HD / 1080p'
            }
        },
        {
            name: 'hdr',
            title: 'Пріоритет HDR',
            description:
                'Вибір технології зображення',
            def: 'dv',
            values: {
                dv: 'Dolby Vision → HDR10+ → HDR',
                hdr: 'HDR10+ → HDR → Dolby Vision',
                sdr: 'SDR'
            }
        },
        {
            name: 'source',
            title: 'Пріоритет джерела',
            description:
                'Тип відеорелізу',
            def: 'auto',
            values: {
                auto: 'REMUX → Blu-ray → WEB-DL',
                bluray: 'Blu-ray → REMUX → WEB-DL',
                webdl: 'WEB-DL → REMUX → Blu-ray'
            }
        },
        {
            name: 'audio',
            title: 'Пріоритет аудіоформату',
            description:
                'Додатковий пріоритет звукової доріжки',
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
            description:
                'Мінімальна кількість роздаючих',
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
            description:
                'Обмеження розміру торента',
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
            description:
                'Віддавати перевагу релізам із Toloka',
            def: 'false',
            values: {
                'false': 'Вимкнено',
                'true': 'Увімкнено'
            }
        },
        {
            name: 'fallback',
            title: 'Якщо немає української озвучки',
            description:
                'Дія, коли українські релізи відсутні',
            def: 'ask',
            values: {
                ask: 'Запитати перед вибором',
                none: 'Не запускати',
                auto: 'Запустити інший реліз'
            }
        }
    ];

    settings.forEach(function (item) {
        addSetting('uadv62', item);
    });
}

/* ==========================================
   MAIN LAUNCHER
   ========================================== */

async function runUaDV(data) {
    if (busy) {
        note('Пошук уже виконується');
        return;
    }

    busy = true;

    try {
        var movie = data && data.movie;

        if (!movie) {
            throw Error(
                'Не вдалося отримати інформацію про фільм'
            );
        }

        note(
            'Шукаю релізи: ' +
            (movie.title || movie.name || '')
        );

        var releases = await findReleases(movie);

        if (!releases.length) {
            throw Error(
                'Релізів не знайдено. ' +
                'Перевір налаштування Jackett, ' +
                'сідерів та максимальний розмір.'
            );
        }

        if (serial(movie)) {
            await seriesFlow(
                movie,
                releases
            );
        } else {
            await movieFlow(
                movie,
                releases
            );
        }

    } catch (e) {
        log('Run error:', e);

        note(
            e && e.message
                ? e.message
                : String(e)
        );
    } finally {
        busy = false;
    }
}

/* ==========================================
   BUTTON
   ========================================== */

function findButtonsBar(root) {
    var bar = root
        .find('.full-start-new__buttons')
        .eq(0);

    if (bar.length) return bar;

    bar = root
        .find('.full-start__buttons')
        .eq(0);

    if (bar.length) return bar;

    bar = root
        .find('.full-actions')
        .eq(0);

    if (bar.length) return bar;

    return root
        .find(
            '.full-start__right, .full-start'
        )
        .eq(0);
}

function makeUaButton() {
    var btn = document.createElement('div');

    btn.className =
        'full-start__button selector uadv-button';

    btn.setAttribute(
        'data-uadv-button',
        '1'
    );

    btn.tabIndex = 0;

    btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" ' +
        'width="20" height="20" ' +
        'viewBox="0 0 16 16" ' +
        'fill="currentColor">' +
        '<path d="M3.577 8.9v.03h1.828V5.898h-.062' +
        'a47 47 0 0 0-1.766 3.001z"/>' +
        '<path d="M2 2a2 2 0 0 0-2 2v8' +
        'a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4' +
        'a2 2 0 0 0-2-2zm2.372 3.715.435-.714' +
        'h1.71v3.93h.733v.957h-.733V11H5.405' +
        'V9.888H2.5v-.971c.574-1.077 1.225-2.142' +
        '1.872-3.202m7.73-.714h1.306l-2.14' +
        '2.584L13.5 11h-1.428l-1.679-2.624-.615.7' +
        'V11H8.59V5.001h1.187v2.686h.057L12.102' +
        '5z"/>' +
        '</svg>' +
        '<span>UaDV</span>';

    return $(btn);
}

function attachButton(root, ev) {
    if (
        !ev ||
        !ev.data ||
        !ev.data.movie
    ) {
        return true;
    }

    var bar = findButtonsBar(root);

    if (!bar || !bar.length) {
        return false;
    }

    // Не створювати другу кнопку UaDV.
    if (
        bar.find(
            '[data-uadv-button="1"]'
        ).length
    ) {
        return true;
    }

    var btn = makeUaButton();

    var click = function () {
        runUaDV(ev.data);
    };

    btn.on(
        'hover:enter',
        click
    );

    btn.on(
        'click',
        click
    );

    btn.on(
        'keydown',
        function (e) {
            if (
                e.key === 'Enter' ||
                e.keyCode === 13
            ) {
                click();
            }
        }
    );

    bar.prepend(btn);

    try {
        Lampa.Controller.collectionSet(bar);
    } catch (e) {}

    return true;
}

/* ==========================================
   STYLES
   ========================================== */

function injectStyles() {
    if (
        document.getElementById(
            'uadv622-style'
        )
    ) {
        return;
    }

    var css = [
        '.full-start__button.uadv-button{',
        'background:#333!important;',
        'color:#fff!important;',
        'border:0!important;',
        'order:-9999!important;',
        'box-shadow:0 2px 8px rgba(0,0,0,.28)!important;',
        '}',

        '.full-start__button.uadv-button.focus,',
        '.full-start__button.uadv-button:hover{',
        'filter:brightness(1.12);',
        '}',

        '.uadv-dialog{',
        'position:fixed;',
        'inset:0;',
        'z-index:999999;',
        'background:rgba(0,0,0,.78);',
        'display:flex;',
        'align-items:center;',
        'justify-content:center;',
        '}',

        '.uadv-panel{',
        'width:min(1100px,94vw);',
        'max-height:88vh;',
        'background:#141414;',
        'color:#fff;',
        'border-radius:16px;',
        'overflow:hidden;',
        'border:1px solid rgba(255,255,255,.12);',
        'box-shadow:0 15px 60px rgba(0,0,0,.55);',
        '}',

        '.uadv-head{',
        'padding:22px 28px;',
        'font-size:27px;',
        'font-weight:800;',
        'background:rgba(255,255,255,.06);',
        '}',

        '.uadv-list{',
        'padding:12px;',
        'overflow-y:auto;',
        'max-height:calc(88vh - 90px);',
        '}',

        '.uadv-row{',
        'padding:16px 20px;',
        'margin-bottom:7px;',
        'border-radius:10px;',
        'cursor:pointer;',
        'outline:none;',
        '}',

        '.uadv-row.focus,',
        '.uadv-row:hover{',
        'background:rgba(255,255,255,.12);',
        'box-shadow:inset 0 0 0 2px #fff;',
        '}',

        '.uadv-row-title{',
        'font-size:22px;',
        'font-weight:700;',
        'line-height:1.35;',
        'overflow-wrap:anywhere;',
        '}',

        '.uadv-row-sub{',
        'font-size:16px;',
        'opacity:.72;',
        'margin-top:6px;',
        '}',

        '@media(max-width:600px){',
        '.uadv-panel{width:96vw;}',
        '.uadv-head{font-size:20px;padding:16px;}',
        '.uadv-row{padding:12px;}',
        '.uadv-row-title{font-size:17px;}',
        '.uadv-row-sub{font-size:13px;}',
        '}'
    ].join('');

    var style = document.createElement('style');

    style.id = 'uadv622-style';
    style.textContent = css;

    document.head.appendChild(style);
}

/* ==========================================
   MOUNT
   ========================================== */

function mountButton() {
    if (
        !window.Lampa ||
        !Lampa.Listener
    ) {
        return;
    }

    Lampa.Listener.follow(
        'full',
        function (ev) {
            if (
                !ev ||
                ev.type !== 'complite' ||
                !ev.object
            ) {
                return;
            }

            var root;

            try {
                root = ev.object.activity.render();
            } catch (e) {
                return;
            }

            if (!root || !root.length) {
                return;
            }

            if (attachButton(root, ev)) {
                return;
            }

            try {
                var target = root[0];

                var observer = new MutationObserver(
                    function () {
                        if (
                            attachButton(
                                root,
                                ev
                            )
                        ) {
                            observer.disconnect();
                        }
                    }
                );

                observer.observe(
                    target,
                    {
                        childList: true,
                        subtree: true
                    }
                );

                setTimeout(
                    function () {
                        observer.disconnect();
                    },
                    8000
                );

            } catch (e) {
                log('Button observer:', e);
            }
        }
    );
}

/* ==========================================
   INITIALIZATION
   ========================================== */

function init() {
    if (
        !window.Lampa ||
        !Lampa.Listener ||
        !Lampa.Storage
    ) {
        setTimeout(init, 500);
        return;
    }

    // Початкові значення зберігаються
    // тільки за відсутності налаштувань.
    var defaults = {
        playMode: 'auto',
        quality: '4k',
        hdr: 'dv',
        source: 'auto',
        audio: 'auto',
        minSeeds: '5',
        maxSize: '70',
        toloka: 'false',
        fallback: 'ask'
    };

    Object.keys(defaults).forEach(
        function (k) {
            try {
                if (
                    Lampa.Storage.get(P + k) == null
                ) {
                    set(k, defaults[k]);
                }
            } catch (e) {}
        }
    );

    injectStyles();
    registerSettings();
    mountButton();

    log(
        'UaDV v' +
        VERSION +
        ' initialized'
    );
}

init();

})();
