
(function () {
'use strict';

if (window.uadv624_ready || window.uadv623_ready) return;
window.uadv624_ready = true;

var VERSION = '62.4.0 Premium Graphite';
var P = 'uadv62_';
var GB = 1073741824;
var MB = 1048576;

var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';
var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv)$/i;

var cache = {};
var cacheKeys = [];
var busy = false;
var dialog = null;
var toastTimer = null;
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

/* ==========================================
   PREMIUM NOTIFICATIONS
   ========================================== */

function note(s) {
    var old = document.getElementById('uadv-toast');

    if (old) old.remove();
    if (toastTimer) clearTimeout(toastTimer);

    var toast = document.createElement('div');
    toast.id = 'uadv-toast';
    toast.className = 'uadv-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = String(s || '');

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
        toast.classList.add('uadv-toast-visible');
    });

    toastTimer = setTimeout(function () {
        toast.classList.remove('uadv-toast-visible');

        setTimeout(function () {
            if (toast.parentNode) toast.remove();
        }, 280);
    }, 2800);
}

function log() {
    console.log.apply(console, ['[4K Premium]'].concat([].slice.call(arguments)));
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
        Object.assign({}, opt || {}, { signal: c.signal })
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

    if (!u) throw Error('Вкажи jackett_url');

    return {
        base: trim(scheme(u)).replace(/\/jackett(?:\/.*)?$/i, ''),
        key: field('jackett_key')
    };
}

/* ==========================================
   TORRSERVER CONFIGURATION
   ========================================== */

function tsBase() {
    var u = field('torrserver_url');

    if (!u) throw Error('Вкажи torrserver_url');

    return trim(scheme(u));
}

function tsHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var token = field('torrserver_token');
    var u = field('torrserver_user');
    var p = field('torrserver_pass');

    if (token) {
        h.Authorization = 'Bearer ' + token;
    } else if (u || p) {
        try {
            h.Authorization = 'Basic ' +
                btoa(unescape(encodeURIComponent(u + ':' + p)));
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
    return t ? '&authorization=' + encodeURIComponent('Bearer ' + t) : '';
}

/* ==========================================
   PARSE TORZNAB XML
   ========================================== */

function xmlResults(s) {
    var doc = new DOMParser().parseFromString(s, 'application/xml');

    if (doc.querySelector('parsererror')) return [];

    return [].slice.call(doc.querySelectorAll('item')).map(function (it) {
        var attrs = {};

        [].slice.call(it.getElementsByTagName('*')).forEach(function (el) {
            if (el.localName === 'attr' && el.getAttribute('name')) {
                attrs[el.getAttribute('name').toLowerCase()] =
                    el.getAttribute('value') || '';
            }
        });

        function val(t) {
            var el = it.querySelector(t);
            return el ? el.textContent.trim() : '';
        }

        var enc = it.querySelector('enclosure');
        var dl = enc && enc.getAttribute('url') || '';
        var mag = attrs.magneturl || '';
        var link = /^magnet:/i.test(mag) ? mag : (val('link') || dl);

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
            seed: Number(attrs.seeders || attrs.peers || 0),
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
    var a = Array.isArray(j) ? j : (j.Results || j.results || j.items || []);

    return (Array.isArray(a) ? a : []).map(function (x) {
        var mag = x.MagnetUri || x.MagnetUrl || x.magnet || '';
        var link = /^magnet:/i.test(mag) ? mag : (x.Link || x.link || '');

        return {
            title: x.Title || x.title || '',
            link: link,
            magnet: mag,
            dl: '',
            size: Number(x.Size || x.size || 0),
            seed: Number(x.Seeders || x.seeders || x.Peers || x.peers || 0),
            tracker: String(x.Tracker || x.tracker || x.TrackerId || '').toLowerCase()
        };
    });
}

/* ==========================================
   JACKETT SEARCH
   ========================================== */

async function searchJackett(q, cats, mode, meta) {
    var jb = jackett();
    var p = new URLSearchParams();
    var url;

    if (jb.key) p.set('apikey', jb.key);

    if (mode === 'xml') {
        p.set('t', 'search');
        p.set('q', clean(q));

        cats.split(',').forEach(function (c) {
            p.append('cat', c);
        });

        url = jb.base + '/api/v2.0/indexers/all/results/torznab/?' + p.toString();
    } else {
        p.set('Query', clean(q));

        if (meta) {
            p.set('title', meta.title || '');
            p.set('title_original', meta.orig || '');

            if (meta.year) p.set('year', meta.year);

            p.set('is_serial', meta.series ? '1' : '0');
        }

        cats.split(',').forEach(function (c) {
            p.append('Category[]', c);
        });

        url = jb.base + '/api/v2.0/indexers/all/results?' + p.toString();
    }

    var r = await timeout(url, {
        method: 'GET',
        credentials: 'omit',
        mode: 'cors'
    }, 10000);

    if (!r.ok) throw Error('Jackett HTTP ' + r.status);

    return mode === 'xml' ? xmlResults(await r.text()) : jsonResults(await r.json());
}

/* ==========================================
   UKRAINIAN AUDIO DETECTION
   ========================================== */

function ukrainian(t) {
    var str = String(t || '').toLowerCase();

    var langPattern =
        /ukr|укр|украї|ukrainian|ukrainisch|гр\.|ua[-_\s]?dub|ua[-_\s]?audio/i;

    var studiosPattern = new RegExp([
        'незупиняйся', 'незупиняйсь', 'nezupyniays',
        'однiею колією', 'однією колією', '1колія',
        'цікава ідея', 'tsikava ideya',
        'склянка соку', 'sklyanka soku',
        'дворіччя', 'dvorichchya',
        'озвучка ua', 'озвучка укр',
        'urt', 'євгена малухи',
        'євген малуха', 'postmodern', 'так треба',
        'дивобудок', 'starlight',
        'качан', 'фанвакс', 'fanvox',
        'bamberg', 'бамберг', 'dniprofilm',
        'дніпрофільм', 'кінокульт', 'kinokult',
        'cinema hd', 'cinema_hd', 'аматорське',
        'загін кіноманів', 'озвучено'
    ].join('|'), 'i');

    return langPattern.test(str) || studiosPattern.test(str);
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

    var dv = /dolby.?vision|dovi|(?:^|[.\s_-])dv(?:$|[.\s_-])/i.test(t);
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
        s += blur && !rem ? 35 : rem ? 27 : web ? 15 : 0;
    } else {
        s += rem ? 35 : blur ? 27 : web ? 20 : 0;
    }

    if (audio === 'atmos' && /atmos|truehd/i.test(t)) s += 20;
    if (audio === 'dts' && /dts.?hd|dts.?x/i.test(t)) s += 20;
    if (audio === 'eac3' && /e.?ac.?3|ddp/i.test(t)) s += 20;

    s += Math.min(20, Math.log2(1 + Number(x.seed || 0)) * 3);
    s += Math.min(12, Number(x.size || 0) / GB / 5);

    return s;
}

/* ==========================================
   SEARCH TITLE VARIANTS
   ========================================== */

function queries(m) {
    var orig = clean(m.original_title || m.original_name || m.title || m.name);
    var local = clean(m.title || m.name);
    var year = String(m.release_date || '').slice(0, 4);
    var pref = field('parse_lang') || (serial(m) ? 'df' : 'df_year');

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
        if (x && arr.indexOf(x) < 0) arr.push(x);
    }

    add(combos[pref] || orig);
    add(orig);

    if (local !== orig) add(local);
    if (!serial(m) && year) add(orig + ' ' + year);

    return arr;
}

/* ==========================================
   FIND AND RANK RELEASES
   ========================================== */

async function findReleases(m) {
    var show = serial(m);
    var cats = show ? SERIES_CATS : MOVIE_CATS;
    var qs = queries(m);

    var key = [
        jackett().base,
        field('jackett_key'),
        cats,
        qs.join('|'),
        get('minSeeds', '5'),
        get('maxSize', '70')
    ].join('~');

    if (cache[key] && Date.now() - cache[key].at < 300000) {
        return cache[key].items.slice();
    }

    var all = [];
    var errors = [];
    var successful = 0;

    for (var i = 0; i < qs.length; i++) {
        var meta = {
            title: m.title || m.name,
            orig: m.original_title || m.original_name,
            year: String(m.release_date || '').slice(0, 4),
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

        if (i === 0 && all.some(function (x) {
            return ukrainian(x.title);
        })) break;
    }

    if (!successful) {
        throw Error('Jackett: ' + (errors[0] || 'помилка з’єднання'));
    }

    var seen = {};
    var min = Number(get('minSeeds', '5'));
    var max = Number(get('maxSize', '70')) * GB;

    all = all.filter(function (x) {
        if (!x.link || !x.title || x.size <= 0 || x.seed < min ||
            (!show && x.size > max)) return false;

        var id = (x.magnet || x.link || x.title).toLowerCase();
        if (seen[id]) return false;

        seen[id] = true;
        return true;
    });

    var tol = String(get('toloka', 'false')) === 'true';

    all.sort(function (a, b) {
        if (tol) {
            var at = /toloka/i.test(a.tracker);
            var bt = /toloka/i.test(b.tracker);
            if (at !== bt) return at ? -1 : 1;
        }
        return score(b) - score(a);
    });

    log('Знайдено', all.length, 'релізів', qs);

    if (cacheKeys.length >= 20) {
        var oldKey = cacheKeys.shift();
        delete cache[oldKey];
    }

    cacheKeys.push(key);
    cache[key] = { at: Date.now(), items: all.slice() };

    return all;
}

/* ==========================================
   TORRSERVER INTEGRATION
   ========================================== */

async function tsAdd(base, link, title, poster, movie) {
    var body = {
        action: 'add',
        link: link,
        title: '[LAMPA] ' + (title || ''),
        poster: poster || '',
        data: JSON.stringify({ lampa: true, movie: movie || {} }),
        save_to_db: false
    };

    var r = await timeout(base + '/torrents', {
        method: 'POST',
        headers: tsHeaders(),
        body: JSON.stringify(body)
    }, 10000);

    var j = {};
    try {
        j = await r.json();
    } catch (e) {}

    if (!r.ok) throw Error('TorrServer HTTP ' + r.status);

    var hash = j.hash || j.id || j.link || j.data || j.result || '';

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
    if (j.stats && Array.isArray(j.stats.file_stats)) return j.stats.file_stats;
    return [];
}

async function tsFiles(base, linkOrHash) {
    var body = { action: 'get' };

    if (/^(magnet:|https?:)/i.test(linkOrHash)) {
        body.link = linkOrHash;
    } else {
        body.hash = linkOrHash;
    }

    try {
        var r = await timeout(base + '/torrents', {
            method: 'POST',
            headers: tsHeaders(),
            body: JSON.stringify(body)
        }, 8000);

        if (r.ok) {
            var j = await r.json();
            var files = fileStats(j);
            if (files.length) return files;
        }
    } catch (e) {
        log('TorrServer get:', e);
    }

    try {
        var url = base + '/stream/files?link=' + encodeURIComponent(linkOrHash);
        var r2 = await timeout(url, {
            method: 'GET',
            headers: tsHeaders()
        }, 8000);

        if (r2.ok) return fileStats(await r2.json());
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
        String(file && file.path || title || 'video').split(/[\\/]/).pop()
    );

    var idx = 1;

    if (file && file.id !== undefined) {
        var n = Number(file.id);
        if (!isNaN(n)) idx = n + 1;
    }

    return tsStreamBase() +
        '/stream/' + encodeURIComponent(name + '.mkv') +
        '?link=' + encodeURIComponent(hash) +
        '&index=' + idx +
        '&play=1' + streamAuth();
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

    if (window.Lampa && Lampa.Player &&
        typeof Lampa.Player.play === 'function') {
        Lampa.Player.play({ url: url, title: title, timeline: 0 });
    } else {
        location.href = url;
    }
}

function tsPlayById(hash, file, title) {
    playStream(streamLink(hash, file, title), title);
}

/* ==========================================
   PREMIUM DIALOG UI
   ========================================== */

function openDialog(title, items) {
    closeDialog();

    var overlay = document.createElement('div');
    overlay.className = 'uadv-dialog';

    var panel = document.createElement('div');
    panel.className = 'uadv-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    var accent = document.createElement('div');
    accent.className = 'uadv-panel-accent';

    var head = document.createElement('div');
    head.className = 'uadv-head';

    var mark = document.createElement('div');
    mark.className = 'uadv-head-mark';
    mark.textContent = '4K';

    var headText = document.createElement('div');
    headText.className = 'uadv-head-text';

    var heading = document.createElement('div');
    heading.className = 'uadv-head-title';
    heading.textContent = title || '4K Premium';

    var subtitle = document.createElement('div');
    subtitle.className = 'uadv-head-subtitle';
    subtitle.textContent = 'PREMIUM MEDIA SELECTOR';

    headText.appendChild(heading);
    headText.appendChild(subtitle);
    head.appendChild(mark);
    head.appendChild(headText);

    var list = document.createElement('div');
    list.className = 'uadv-list';

    panel.appendChild(accent);
    panel.appendChild(head);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var selected = 0;
    var closed = false;
    var rows = [];
    var previousFocus = document.activeElement;

    function focus(n) {
        if (!rows.length) return;

        selected = Math.max(0, Math.min(rows.length - 1, n));

        rows.forEach(function (r, i) {
            r.classList.toggle('focus', i === selected);
            r.setAttribute('aria-selected', i === selected ? 'true' : 'false');
        });

        try {
            rows[selected].focus({ preventScroll: true });
            rows[selected].scrollIntoView({ block: 'nearest', behavior: 'auto' });
        } catch (e) {
            try {
                rows[selected].focus();
                rows[selected].scrollIntoView(false);
            } catch (e2) {}
        }
    }

    function close() {
        if (closed) return;
        closed = true;

        document.removeEventListener('keydown', keyboard, true);

        overlay.classList.remove('uadv-dialog-visible');

        setTimeout(function () {
            if (overlay.parentNode) overlay.remove();
        }, 180);

        if (dialog && dialog.close === close) dialog = null;

        try {
            if (previousFocus && previousFocus.focus) previousFocus.focus();
        } catch (e) {}
    }

    function keyboard(e) {
        var k = e.key || e.keyCode;

        if (
            k === 'Escape' || k === 'Backspace' || k === 'BrowserBack' ||
            k === 27 || k === 8 || k === 461 || k === 10009
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

    (items || []).forEach(function (item, index) {
        var row = document.createElement('div');
        row.className = 'uadv-row selector';
        row.tabIndex = 0;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');

        var number = document.createElement('div');
        number.className = 'uadv-row-number';
        number.textContent = String(index + 1).padStart(2, '0');

        var content = document.createElement('div');
        content.className = 'uadv-row-content';

        var name = document.createElement('div');
        name.className = 'uadv-row-title';
        name.textContent = item.title || '';

        content.appendChild(name);

        if (item.subtitle) {
            var sub = document.createElement('div');
            sub.className = 'uadv-row-sub';
            sub.textContent = item.subtitle;
            content.appendChild(sub);
        }

        var arrow = document.createElement('div');
        arrow.className = 'uadv-row-arrow';
        arrow.textContent = '›';

        row.appendChild(number);
        row.appendChild(content);
        row.appendChild(arrow);

        row.addEventListener('click', function () {
            if (item.action) item.action();
        });

        row.addEventListener('mouseenter', function () {
            focus(index);
        });

        list.appendChild(row);
        rows.push(row);
    });

    document.addEventListener('keydown', keyboard, true);
    dialog = { close: close };

    requestAnimationFrame(function () {
        overlay.classList.add('uadv-dialog-visible');
        focus(0);
    });
}

/* ==========================================
   MOVIE FLOW
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

    var name = safeFileName(movie.title || movie.name || 'video') + '.mkv';

    var url = tsStreamBase() +
        '/stream/' + encodeURIComponent(name) +
        '?link=' + encodeURIComponent(hash) +
        '&index=1&play=1' + streamAuth();

    note('Запускаю відтворення…');
    playStream(url, movie.title || movie.name);
}

function releasePicker(movie, releases) {
    openDialog('Обери реліз', releases.slice(0, 50).map(function (r) {
        return {
            title: r.title,
            subtitle: human(r.size) + '   ·   Сідери: ' + r.seed,
            action: function () {
                closeDialog();
                startMovieRelease(movie, r).catch(function (e) {
                    note(e.message || String(e));
                });
            }
        };
    }));
}

function fallbackPicker(movie, releases) {
    openDialog('Українську озвучку не знайдено', [
        {
            title: 'Показати інші релізи',
            subtitle: 'Вибрати відео вручну',
            action: function () {
                releasePicker(movie, releases);
            }
        },
        {
            title: 'Скасувати',
            action: closeDialog
        }
    ]);
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
   SERIES FLOW
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
            for (var n = a; n <= b; n++) result[n] = true;
        }
    }

    var re = /(?:\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*(\d{1,2}))/gi;
    var m;

    while ((m = re.exec(s))) {
        var sn = Number(m[1] || m[2]);
        if (sn) result[sn] = true;
    }

    var keys = Object.keys(result).map(Number);
    return keys.length ? keys : [1];
}

function episodeFromPath(path, season) {
    var name = String(path || '').split(/[\\/]/).pop();
    var m = name.match(/S(\d{1,2})E(\d{1,3})/i) ||
        name.match(/(\d{1,2})x(\d{1,3})/i);

    if (m) return Number(m[1]) === season ? Number(m[2]) : 0;

    m = name.match(/(?:episode|ep|серія|серия)\s*0*(\d{1,3})/i);
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

    var numbers = Object.keys(groups).map(Number).sort(function (a, b) {
        return a - b;
    });

    openDialog('Обери сезон', numbers.map(function (n) {
        return {
            title: 'Сезон ' + n,
            subtitle: 'Доступно релізів: ' + groups[n].length,
            action: function () {
                openSeason(movie, n, groups[n]);
            }
        };
    }));
}

async function loadEpisodes(movie, season, releases) {
    closeDialog();
    note('Завантажую серії сезону ' + season);

    var episodes = {};
    var base = tsBase();

    for (var i = 0; i < Math.min(10, releases.length); i++) {
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
            var size = Number(f.length || f.Length || 0);

            if (!VIDEO.test(path) || size < 500 * MB) return;

            var ep = episodeFromPath(path, season);
            if (!ep) return;

            if (!episodes[ep] || size > episodes[ep].size) {
                episodes[ep] = { file: f, hash: hash, size: size };
            }
        });
    }

    var numbers = Object.keys(episodes).map(Number).sort(function (a, b) {
        return a - b;
    });

    if (!numbers.length) {
        note('Не знайдено відеосерій ≥500 MB');
        return;
    }

    openDialog('Сезон ' + season + ' — серії', numbers.map(function (n) {
        var ep = episodes[n];

        return {
            title: 'Серія ' + n,
            subtitle: human(ep.size),
            action: function () {
                tsPlayById(
                    ep.hash,
                    ep.file,
                    (movie.name || movie.title) +
                    ' S' + season + 'E' + String(n).padStart(2, '0')
                );
            }
        };
    }));
}

function openSeason(movie, season, releases) {
    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (ua.length) {
        loadEpisodes(movie, season, ua);
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        loadEpisodes(movie, season, releases);
        return;
    }

    openDialog('Українську озвучку не знайдено', [
        {
            title: 'Показати інші серії',
            action: function () {
                loadEpisodes(movie, season, releases);
            }
        },
        {
            title: 'Скасувати',
            action: closeDialog
        }
    ]);
}

function seriesFlow(movie, releases) {
    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (ua.length) {
        showSeasons(movie, ua);
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        note('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        showSeasons(movie, releases);
        return;
    }

    openDialog('Українську озвучку не знайдено', [
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
    ]);
}

/* ==========================================
   SETTINGS
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

                if (item.name === 'minSeeds' || item.name === 'maxSize') {
                    cache = {};
                    cacheKeys = [];
                }
            }
        });
    } catch (e) {
        log('Setting error:', item.name, e);
    }
}

function registerSettings() {
    if (!window.Lampa || !Lampa.SettingsApi) return;

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',
            name: '4K Premium',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M8 9v6M12 9v6M16 9v6"/></svg>'
        });
    } catch (e) {}

    var settings = [
        {
            name: 'playMode',
            title: 'Режим запуску фільмів',
            description: 'Автоматично запускати найкращий український реліз або обирати вручну',
            def: 'auto',
            values: {
                auto: 'Автоматично',
                manual: 'Ручний вибір'
            }
        },
        {
            name: 'quality',
            title: 'Пріоритет роздільності',
            description: 'Бажана роздільність відео',
            def: '4k',
            values: {
                '4k': '4K / 2160p',
                '1080': 'Full HD / 1080p'
            }
        },
        {
            name: 'hdr',
            title: 'Пріоритет HDR',
            description: 'Вибір технології зображення',
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
            description: 'Тип відеорелізу',
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
            description: 'Додатковий пріоритет звукової доріжки',
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
            description: 'Мінімальна кількість роздаючих',
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
            description: 'Обмеження розміру торента',
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
            description: 'Віддавати перевагу релізам із Toloka',
            def: 'false',
            values: {
                'false': 'Вимкнено',
                'true': 'Увімкнено'
            }
        },
        {
            name: 'fallback',
            title: 'Якщо немає української озвучки',
            description: 'Дія, коли українські релізи відсутні',
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
        note('Пошук уже активний');
        return;
    }

    busy = true;

    try {
        var movie = data && data.movie;

        if (!movie) {
            throw Error('Не вдалося отримати інформацію про фільм');
        }

        note('Шукаю релізи: ' + (movie.title || movie.name || ''));

        var releases = await findReleases(movie);

        if (!releases.length) {
            throw Error(
                'Релізів не знайдено. Перевір налаштування Jackett, сідерів та максимальний розмір.'
            );
        }

        if (serial(movie)) {
            await seriesFlow(movie, releases);
        } else {
            await movieFlow(movie, releases);
        }
    } catch (e) {
        log('Run error:', e);
        note(e && e.message ? e.message : String(e));
    } finally {
        busy = false;
    }
}

/* ==========================================
   PREMIUM BUTTON
   ========================================== */

function findButtonsBar(root) {
    var bar = root.find('.full-start-new__buttons').eq(0);
    if (bar.length) return bar;

    bar = root.find('.full-start__buttons').eq(0);
    if (bar.length) return bar;

    bar = root.find('.full-actions').eq(0);
    if (bar.length) return bar;

    return root.find('.full-start__right, .full-start').eq(0);
}

function makeUaButton() {
    var btn = document.createElement('div');

    btn.className = 'full-start__button selector uadv-button';
    btn.setAttribute('data-uadv-button', '1');
    btn.tabIndex = 0;

    btn.innerHTML =
        '<span class="uadv-button-icon">' +
        '<svg xmlns="http://www.w3.org/2000/svg" ' +
        'width="21" height="21" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" ' +
        'stroke-linejoin="round">' +
        '<rect x="3" y="4" width="18" height="16" rx="3"/>' +
        '<path d="M10 8.5 16 12l-6 3.5z" ' +
        'fill="currentColor" stroke="none"/>' +
        '</svg>' +
        '</span>' +
        '<span class="uadv-button-label">4K</span>' +
        '<span class="uadv-button-caption">PREMIUM</span>';

    return $(btn);
}

function attachButton(root, ev) {
    if (!ev || !ev.data || !ev.data.movie) return true;

    var bar = findButtonsBar(root);
    if (!bar || !bar.length) return false;

    if (bar.find('[data-uadv-button="1"]').length) return true;

    var btn = makeUaButton();

    var click = function () {
        runUaDV(ev.data);
    };

    btn.on('hover:enter', click);

    btn.on('click', function (e) {
        e.preventDefault();
        click();
    });

    btn.on('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            click();
        }
    });

    bar.prepend(btn);

    try {
        Lampa.Controller.collectionSet(bar);
    } catch (e) {}

    return true;
}

/* ==========================================
   PREMIUM GRAPHITE STYLES
   ========================================== */

function injectStyles() {
    if (document.getElementById('uadv624-style')) return;

    var css = [

        /* BUTTON */

        '.full-start__button.uadv-button{' +
            'position:relative!important;' +
            'display:inline-flex!important;' +
            'align-items:center!important;' +
            'justify-content:center!important;' +
            'gap:9px!important;' +
            'min-height:46px;' +
            'padding:0 19px!important;' +
            'margin-right:8px;' +
            'overflow:hidden;' +
            'border:1px solid rgba(210,220,235,.20)!important;' +
            'border-radius:10px!important;' +
            'background:linear-gradient(145deg,#30343b,#1b1e23)!important;' +
            'color:#f3f5f8!important;' +
            'box-shadow:0 4px 14px rgba(0,0,0,.24),' +
                'inset 0 1px 0 rgba(255,255,255,.055)!important;' +
            'transition:background .18s ease,border-color .18s ease,' +
                'box-shadow .18s ease!important;' +
            'order:-9999!important;' +
        '}',

        '.full-start__button.uadv-button:before{' +
            'content:"";position:absolute;left:0;top:18%;bottom:18%;' +
            'width:2px;border-radius:2px;' +
            'background:#aab9d0;opacity:.85;' +
        '}',

        '.uadv-button-icon{' +
            'display:flex;align-items:center;justify-content:center;' +
            'flex-shrink:0;opacity:.95;' +
        '}',

        '.uadv-button-label{' +
            'font-size:16px;font-weight:800;letter-spacing:1.1px;' +
            'line-height:1;' +
        '}',

        '.uadv-button-caption{' +
            'font-size:9px;font-weight:700;letter-spacing:1.3px;' +
            'opacity:.55;align-self:center;' +
        '}',

        '.full-start__button.uadv-button.focus,' +
        '.full-start__button.uadv-button:hover{' +
            'background:linear-gradient(145deg,#454b55,#272c33)!important;' +
            'border-color:rgba(220,230,245,.55)!important;' +
            'box-shadow:0 5px 20px rgba(0,0,0,.32),' +
                'inset 0 1px 0 rgba(255,255,255,.09)!important;' +
            'filter:none!important;' +
        '}',

        '.uadv-button svg{flex-shrink:0;}',

        /* NOTIFICATIONS */

        '.uadv-toast{' +
            'position:fixed;left:50%;bottom:6%;' +
            'transform:translate(-50%,12px);' +
            'z-index:1000000;display:flex;align-items:center;' +
            'justify-content:center;gap:10px;' +
            'width:max-content;max-width:88vw;box-sizing:border-box;' +
            'padding:15px 23px;' +
            'background:linear-gradient(145deg,rgba(36,39,45,.98),' +
                'rgba(19,21,25,.98));' +
            'color:#f1f3f7;' +
            'border:1px solid rgba(220,230,245,.17);' +
            'border-radius:12px;' +
            'box-shadow:0 12px 36px rgba(0,0,0,.42),' +
                'inset 0 1px 0 rgba(255,255,255,.035);' +
            'font-size:16px;font-weight:500;line-height:1.4;' +
            'text-align:center;overflow-wrap:anywhere;' +
            'opacity:0;visibility:hidden;pointer-events:none;' +
            'transition:opacity .2s ease,transform .2s ease,' +
                'visibility .2s;' +
        '}',

        '.uadv-toast:before{' +
            'content:"";width:5px;height:5px;flex-shrink:0;' +
            'border-radius:50%;background:#b7c5d9;' +
            'box-shadow:0 0 9px rgba(183,197,217,.28);' +
        '}',

        '.uadv-toast.uadv-toast-visible{' +
            'opacity:1;visibility:visible;transform:translate(-50%,0);' +
        '}',

        /* DIALOG OVERLAY */

        '.uadv-dialog{' +
            'position:fixed;inset:0;z-index:999999;' +
            'display:flex;align-items:center;justify-content:center;' +
            'padding:3vh 3vw;box-sizing:border-box;' +
            'background:rgba(4,5,7,.80);' +
            'backdrop-filter:blur(7px);' +
            '-webkit-backdrop-filter:blur(7px);' +
            'opacity:0;visibility:hidden;' +
            'transition:opacity .18s ease,visibility .18s;' +
        '}',

        '.uadv-dialog.uadv-dialog-visible{' +
            'opacity:1;visibility:visible;' +
        '}',

        /* MAIN PANEL */

        '.uadv-panel{' +
            'position:relative;' +
            'display:flex;flex-direction:column;' +
            'width:min(1080px,94vw);' +
            'max-height:88vh;max-height:88dvh;' +
            'overflow:hidden;' +
            'background:linear-gradient(145deg,#202329 0%,#15171b 70%);' +
            'color:#f3f4f7;' +
            'border:1px solid rgba(220,230,245,.15);' +
            'border-radius:17px;' +
            'box-shadow:0 24px 80px rgba(0,0,0,.56),' +
                'inset 0 1px 0 rgba(255,255,255,.045);' +
            'transform:translateY(8px) scale(.99);' +
            'transition:transform .18s ease;' +
        '}',

        '.uadv-dialog-visible .uadv-panel{' +
            'transform:translateY(0) scale(1);' +
        '}',

        '.uadv-panel-accent{' +
            'position:absolute;left:0;right:0;top:0;height:2px;' +
            'background:linear-gradient(90deg,transparent,' +
                'rgba(202,216,237,.78),transparent);' +
            'pointer-events:none;z-index:2;' +
        '}',

        /* HEADER */

        '.uadv-head{' +
            'display:flex;align-items:center;gap:16px;' +
            'flex-shrink:0;box-sizing:border-box;' +
            'padding:23px 27px 21px;' +
            'background:linear-gradient(110deg,' +
                'rgba(255,255,255,.045),rgba(255,255,255,.008));' +
            'border-bottom:1px solid rgba(255,255,255,.075);' +
        '}',

        '.uadv-head-mark{' +
            'display:flex;align-items:center;justify-content:center;' +
            'width:49px;height:42px;flex-shrink:0;' +
            'border-radius:9px;' +
            'border:1px solid rgba(210,222,240,.24);' +
            'background:linear-gradient(145deg,#343a44,#22262d);' +
            'color:#f3f5f9;font-size:15px;font-weight:900;' +
            'letter-spacing:1.2px;' +
            'box-shadow:inset 0 1px 0 rgba(255,255,255,.06);' +
        '}',

        '.uadv-head-text{' +
            'min-width:0;display:flex;flex-direction:column;gap:5px;' +
        '}',

        '.uadv-head-title{' +
            'font-size:25px;font-weight:750;line-height:1.25;' +
            'letter-spacing:-.35px;overflow-wrap:anywhere;' +
            'color:#f3f4f7;' +
        '}',

        '.uadv-head-subtitle{' +
            'font-size:9px;font-weight:700;letter-spacing:2.1px;' +
            'color:#9ba5b4;opacity:.82;' +
        '}',

        /* SCROLLABLE LIST */

        '.uadv-list{' +
            'padding:12px 14px 15px;' +
            'overflow-y:auto;overscroll-behavior:contain;' +
            'max-height:calc(88vh - 105px);' +
            'max-height:calc(88dvh - 105px);' +
            'scrollbar-width:thin;' +
            'scrollbar-color:rgba(190,202,220,.32) transparent;' +
        '}',

        '.uadv-list::-webkit-scrollbar{width:5px;}',

        '.uadv-list::-webkit-scrollbar-track{background:transparent;}',

        '.uadv-list::-webkit-scrollbar-thumb{' +
            'background:rgba(190,202,220,.28);border-radius:8px;' +
        '}',

        /* ROWS */

        '.uadv-row{' +
            'position:relative;display:flex;align-items:center;' +
            'gap:15px;box-sizing:border-box;' +
            'min-height:65px;width:100%;' +
            'padding:13px 17px;margin:0 0 7px;' +
            'border:1px solid transparent;border-radius:10px;' +
            'background:rgba(255,255,255,.018);' +
            'color:#f1f3f6;cursor:pointer;outline:none;' +
            'transition:background .14s ease,border-color .14s ease;' +
        '}',

        '.uadv-row:last-child{margin-bottom:0;}',

        '.uadv-row-number{' +
            'display:flex;align-items:center;justify-content:center;' +
            'width:32px;min-width:32px;height:32px;' +
            'border-radius:7px;' +
            'background:rgba(255,255,255,.045);' +
            'border:1px solid rgba(255,255,255,.055);' +
            'color:#9da7b6;font-size:11px;font-weight:800;' +
            'letter-spacing:.5px;' +
        '}',

        '.uadv-row-content{' +
            'flex:1;min-width:0;overflow:hidden;' +
        '}',

        '.uadv-row-title{' +
            'font-size:18px;font-weight:650;line-height:1.4;' +
            'letter-spacing:-.1px;overflow-wrap:anywhere;' +
            'color:#f0f2f6;' +
        '}',

        '.uadv-row-sub{' +
            'font-size:13px;font-weight:450;line-height:1.45;' +
            'color:#a6afbd;margin-top:5px;' +
            'overflow-wrap:anywhere;' +
        '}',

        '.uadv-row-arrow{' +
            'width:24px;min-width:24px;text-align:center;' +
            'font-size:28px;line-height:1;color:#858f9f;' +
            'opacity:.58;transition:opacity .14s ease,transform .14s ease;' +
        '}',

        '.uadv-row.focus,.uadv-row:hover{' +
            'background:linear-gradient(100deg,' +
                'rgba(185,202,226,.115),rgba(185,202,226,.045));' +
            'border-color:rgba(202,216,237,.27);' +
        '}',

        '.uadv-row.focus .uadv-row-number,' +
        '.uadv-row:hover .uadv-row-number{' +
            'background:rgba(190,207,232,.12);' +
            'border-color:rgba(202,216,237,.22);' +
            'color:#f0f4fb;' +
        '}',

        '.uadv-row.focus .uadv-row-arrow,' +
        '.uadv-row:hover .uadv-row-arrow{' +
            'opacity:1;transform:translateX(2px);color:#e0e8f4;' +
        '}',

        /* SMALL SCREENS */

        '@media(max-width:600px){' +
            '.uadv-dialog{padding:2vh 2vw;}' +
            '.uadv-panel{width:96vw;max-height:90vh;max-height:90dvh;' +
                'border-radius:13px;}' +
            '.uadv-head{padding:16px 15px;gap:12px;}' +
            '.uadv-head-mark{width:41px;height:37px;font-size:13px;}' +
            '.uadv-head-title{font-size:19px;}' +
            '.uadv-head-subtitle{font-size:8px;letter-spacing:1.3px;}' +
            '.uadv-list{padding:9px;max-height:calc(90vh - 80px);' +
                'max-height:calc(90dvh - 80px);}' +
            '.uadv-row{gap:10px;min-height:56px;padding:11px 10px;' +
                'margin-bottom:5px;border-radius:8px;}' +
            '.uadv-row-number{width:27px;min-width:27px;height:27px;' +
                'font-size:10px;}' +
            '.uadv-row-title{font-size:15px;}' +
            '.uadv-row-sub{font-size:12px;margin-top:4px;}' +
            '.uadv-row-arrow{width:18px;min-width:18px;font-size:23px;}' +
            '.uadv-toast{bottom:5%;max-width:92vw;padding:12px 16px;' +
                'font-size:14px;border-radius:10px;}' +
            '.full-start__button.uadv-button{gap:7px;padding:0 13px!important;}' +
            '.uadv-button-caption{font-size:8px;letter-spacing:.8px;}' +
        '}',

        /* REDUCED MOTION */

        '@media(prefers-reduced-motion:reduce){' +
            '.uadv-dialog,.uadv-panel,.uadv-toast,.uadv-row,' +
            '.uadv-row-arrow,.full-start__button.uadv-button{' +
                'transition:none!important;' +
            '}' +
        '}'

    ].join('');

    var style = document.createElement('style');
    style.id = 'uadv624-style';
    style.textContent = css;
    document.head.appendChild(style);
}

/* ==========================================
   MOUNT BUTTON
   ========================================== */

function mountButton() {
    if (!window.Lampa || !Lampa.Listener) return;

    Lampa.Listener.follow('full', function (ev) {
        if (!ev || ev.type !== 'complite' || !ev.object) return;

        var root;

        try {
            root = ev.object.activity.render();
        } catch (e) {
            return;
        }

        if (!root || !root.length) return;
        if (attachButton(root, ev)) return;

        try {
            var target = root[0];

            var observer = new MutationObserver(function () {
                if (attachButton(root, ev)) {
                    observer.disconnect();
                }
            });

            observer.observe(target, {
                childList: true,
                subtree: true
            });

            setTimeout(function () {
                observer.disconnect();
            }, 8000);
        } catch (e) {
            log('Button observer:', e);
        }
    });
}

/* ==========================================
   INITIALIZATION
   ========================================== */

function init() {
    if (!window.Lampa || !Lampa.Listener || !Lampa.Storage) {
        setTimeout(init, 500);
        return;
    }

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

    Object.keys(defaults).forEach(function (k) {
        try {
            if (Lampa.Storage.get(P + k) == null) {
                set(k, defaults[k]);
            }
        } catch (e) {}
    });

    injectStyles();
    registerSettings();
    mountButton();

    log('v' + VERSION + ' initialized');
}

init();

})();
