
(function () {
'use strict';

if (window.plugin_playua_ready) return;
window.plugin_playua_ready = true;

var VERSION = '62.0.0';
var PREFIX = 'uadv62_';

var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';
var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv)$/i;

var MB = 1024 * 1024;
var GB = 1024 * MB;
var busy = false;
var cache = {};
var activeDialog = null;
var $ = window.jQuery || window.$;

function setting(k, d) {
    try {
        var v = Lampa.Storage.get(PREFIX + k);
        return v === undefined || v === null ? d : v;
    } catch (e) {
        return d;
    }
}

function save(k, v) {
    try {
        Lampa.Storage.set(PREFIX + k, v);
    } catch (e) {}
}

function field(k) {
    try {
        return Lampa.Storage.field(k) || '';
    } catch (e) {
        return '';
    }
}

function notify(s) {
    try {
        Lampa.Noty.show('UaDV: ' + s);
    } catch (e) {}
}

function base(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(u) ? u : 'http://' + u;
}

function text(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

function clean(s) {
    return text(s).replace(/[:\/\\|?*<>"']/g, ' ');
}

function size(n) {
    return (Number(n || 0) / GB).toFixed(1) + ' GB';
}

function serial(m) {
    return !!(m &&
        (m.first_air_date || m.number_of_seasons || m.media_type === 'tv') &&
        !m.release_date);
}

function fetchTimed(url, opt, ms) {
    var c = new AbortController();
    var t = setTimeout(function () {
        c.abort();
    }, ms || 12000);

    return fetch(url, Object.assign({}, opt || {}, {
        signal: c.signal
    })).then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw Error('HTTP ' + r.status);
        return r;
    }, function (e) {
        clearTimeout(t);
        throw e;
    });
}

function jackett() {
    var url = field('jackett_url');
    var key = field('jackett_key');

    if (!url) throw Error('Вкажи jackett_url');

    return {
        url: base(url).replace(/\/jackett(?:\/.*)?$/i, ''),
        key: key
    };
}

function torr() {
    var url = field('torrserver_url');
    if (!url) throw Error('Вкажи torrserver_url');
    return base(url);
}

function auth() {
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
                btoa(unescape(encodeURIComponent(u + ':' + p)));
        } catch (e) {}
    }

    return h;
}

function streamBase() {
    var b = torr();
    var u = field('torrserver_user');
    var p = field('torrserver_pass');

    if (u || p) {
        try {
            var x = new URL(b);
            x.username = u;
            x.password = p;
            return x.toString().replace(/\/$/, '');
        } catch (e) {}
    }

    return b;
}

function attributes(item) {
    var out = {};

    Array.prototype.forEach.call(
        item.getElementsByTagName('*'),
        function (n) {
            if (n.localName === 'attr' && n.getAttribute('name')) {
                out[n.getAttribute('name').toLowerCase()] =
                    n.getAttribute('value') || '';
            }
        }
    );

    return out;
}

function parseXML(src) {
    var xml = new DOMParser().parseFromString(
        src, 'application/xml'
    );

    if (xml.getElementsByTagName('parsererror').length) return [];

    return Array.prototype.map.call(
        xml.getElementsByTagName('item'),
        function (n) {
            var a = attributes(n);

            var get = function (tag) {
                var e = n.getElementsByTagName(tag)[0];
                return e ? text(e.textContent) : '';
            };

            var enc = n.getElementsByTagName('enclosure')[0];
            var mag = a.magneturl || '';

            var link = mag || get('link') ||
                (enc && enc.getAttribute('url')) || '';

            return {
                title: get('title'),
                link: link,
                download: (enc && enc.getAttribute('url')) || '',
                size: Number(get('size') || a.size || 0),
                seed: Number(a.seeders || 0),
                tracker: text(
                    a.jackettindexer ||
                    a.indexer ||
                    a.jackettindexerid
                ).toLowerCase()
            };
        }
    );
}

function parseJSON(j) {
    var arr = Array.isArray(j) ?
        j : (j.Results || j.results || j.items || []);

    return arr.map(function (x) {
        return {
            title: x.Title || x.title || '',
            link: x.MagnetUri || x.MagnetUrl ||
                x.magnet || x.Link || x.link || '',
            download: x.Link || x.link || '',
            size: Number(x.Size || x.size || 0),
            seed: Number(x.Seeders || x.seeders || 0),
            tracker: text(
                x.Tracker || x.tracker || x.TrackerId || ''
            ).toLowerCase()
        };
    });
}

async function searchOne(query, cats, mode) {
    var j = jackett();
    var p = new URLSearchParams();

    if (j.key) p.set('apikey', j.key);

    var url;

    if (mode === 'xml') {
        p.set('t', 'search');
        p.set('q', query);

        cats.split(',').forEach(function (c) {
            p.append('cat', c);
        });

        url = j.url +
            '/api/v2.0/indexers/all/results/torznab/?' + p;
    } else {
        p.set('Query', query);

        cats.split(',').forEach(function (c) {
            p.append('Category[]', c);
        });

        url = j.url +
            '/api/v2.0/indexers/all/results?' + p;
    }

    var r = await fetchTimed(
        url, { credentials: 'omit' }, 12000
    );

    return mode === 'xml' ?
        parseXML(await r.text()) :
        parseJSON(await r.json());
}

function ukrainian(t) {
    return /(?:^|[^a-zа-яіїєґ])(ukr|ukrainian|українськ(?:а|ий|е|ою|і)|україн|укр\.?|ua\s*(?:dub|audio|voice)|укр\s*(?:озв|дуб|звук)|дубляж\s*укр)(?:$|[^a-zа-яіїєґ])/i.test(t);
}

function otherLang(t) {
    return /(?:^|[.\s\[(])(rus|russian|eng|english|multi|рус|російська|англ)(?:[.\s\])]|$)/i.test(t);
}

function titleMatch(t, m) {
    var year = String(
        m.release_date || m.first_air_date || ''
    ).slice(0, 4);

    var orig = clean(
        m.original_title || m.original_name || ''
    );

    var local = clean(m.title || m.name || '');

    function norm(s) {
        return s.toLowerCase()
            .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
            .trim();
    }

    var n = norm(t);
    var o = norm(orig);
    var l = norm(local);

    var ok =
        (o.length > 2 && n.indexOf(o) >= 0) ||
        (l.length > 2 && n.indexOf(l) >= 0);

    if (!ok) return false;

    var ys = t.match(/(?:19|20)\d{2}/g) || [];

    if (year && ys.length &&
        !ys.some(function (y) {
            return Math.abs(Number(y) - Number(year)) <= 1;
        })) {
        return false;
    }

    return true;
}

function rank(x) {
    var t = x.title || '';
    var score = 0;

    var q = setting('quality', '4k');
    var hdr = setting('hdr', 'dv');
    var source = setting('source', 'auto');

    var four = /\b(2160p|4k|uhd)\b/i.test(t);
    var full = /\b1080p\b/i.test(t);

    score += q === '1080' ?
        (full ? 90 : four ? 65 : 0) :
        (four ? 90 : full ? 50 : 0);

    var dv = /dolby.?vision|dovi|(?:^|[.\s])dv(?:[.\s]|$)/i.test(t);
    var h10p = /hdr10\+/i.test(t);
    var h10 = /\bhdr10?\b/i.test(t);

    score += hdr === 'sdr' ?
        (!dv && !h10p && !h10 ? 36 : 0) :
        hdr === 'hdr' ?
        (h10p ? 36 : h10 ? 30 : dv ? 20 : 0) :
        (dv ? 36 : h10p ? 30 : h10 ? 22 : 0);

    var remux = /remux/i.test(t);
    var bluray = /blu.?ray|bdrip/i.test(t);
    var webdl = /web.?dl/i.test(t);

    score += source === 'webdl' ?
        (webdl ? 32 : remux ? 18 : bluray ? 15 : 0) :
        remux ? 32 : bluray ? 24 : webdl ? 20 : 0;

    score += Math.min(18, Math.log2(1 + x.seed) * 3);
    score += Math.min(14, x.size / GB / 5);

    return score;
}

async function findReleases(m, isShow) {
    var cats = isShow ? SERIES_CATS : MOVIE_CATS;
    var y = String(m.release_date || '').slice(0, 4);

    var names = [
        clean(m.original_title || m.original_name || ''),
        clean(m.title || m.name || '')
    ].filter(Boolean);

    var qs = [];

    names.forEach(function (n) {
        if (!isShow && y) qs.push(n + ' ' + y);
        qs.push(n);
    });

    qs = qs.filter(function (x, i) {
        return qs.indexOf(x) === i;
    });

    var key = [
        jackett().url,
        jackett().key,
        cats,
        qs.join('|'),
        setting('minSeeds', 5),
        setting('maxSize', 70)
    ].join('~');

    if (cache[key] &&
        Date.now() - cache[key].at < 5 * 60 * 1000) {
        return cache[key].data;
    }

    var all = [];

    for (var i = 0; i < qs.length; i++) {
        var batch = await Promise.allSettled([
            searchOne(qs[i], cats, 'xml'),
            searchOne(qs[i], cats, 'json')
        ]);

        batch.forEach(function (r) {
            if (r.status === 'fulfilled') {
                all = all.concat(r.value);
            }
        });

        if (all.some(function (x) {
            return ukrainian(x.title) && titleMatch(x.title, m);
        })) break;
    }

    var seen = {};

    all = all.filter(function (x) {
        if (!x.link ||
            x.seed < Number(setting('minSeeds', 5)) ||
            x.size <= 0 ||
            x.size > Number(setting('maxSize', 70)) * GB ||
            !titleMatch(x.title, m)) {
            return false;
        }

        var id = x.link || x.title;

        if (seen[id]) return false;
        seen[id] = 1;

        return true;
    });

    var tol = all.filter(function (x) {
        return /toloka/i.test(x.tracker);
    });

    if (tol.length && setting('toloka', false)) {
        all = tol;
    }

    all.sort(function (a, b) {
        return rank(b) - rank(a);
    });

    cache[key] = {
        at: Date.now(),
        data: all
    };

    return all;
}

/* ==========================================
   UaDV v62.0 — PART 2/3
   TorrServer + Playback + Dialogs + Series
   ========================================== */

var dialogToken = 0;
var playbackToken = 0;
var playbackStarting = false;

function videoPath(f) {
    return String(
        f.path || f.Path ||
        f.name || f.Name || ''
    );
}

function videoLength(f) {
    return Number(
        f.length || f.Length ||
        f.size || f.Size || 0
    );
}

function fileIndex(f, fallback) {
    var n = f.id;

    if (n === undefined) n = f.Id;
    if (n === undefined) n = f.index;
    if (n === undefined) n = f.Index;

    n = Number(n);

    return Number.isFinite(n) && n >= 0 ?
        n + 1 : fallback + 1;
}

function isVideoFile(f) {
    return VIDEO.test(videoPath(f)) &&
        videoLength(f) >= 500 * MB;
}

function tsHash(j) {
    if (!j || typeof j !== 'object') return '';

    var h = j.hash || j.Hash ||
        j.id || j.ID || '';

    if (!h && j.data && typeof j.data === 'object') {
        h = j.data.hash || j.data.Hash || '';
    }

    return String(h || '');
}

async function tsRequest(body, timeout) {
    var r = await fetchTimed(
        torr() + '/torrents',
        {
            method: 'POST',
            headers: auth(),
            body: JSON.stringify(body)
        },
        timeout || 12000
    );

    return await r.json();
}

async function tsAddRelease(rel, meta) {
    var link = rel.download || rel.link;

    if (!link) throw Error('Немає посилання на торрент');

    var poster = meta.poster_path ?
        'https://image.tmdb.org/t/p/w342' +
        meta.poster_path : '';

    var body = {
        action: 'add',
        link: link,
        title: '[UaDV] ' +
            (meta.title || meta.name || ''),
        poster: poster,
        save_to_db: false,
        data: JSON.stringify({
            lampa: true,
            movie: meta
        })
    };

    var j = await tsRequest(body, 15000);

    return {
        link: link,
        hash: tsHash(j),
        raw: j
    };
}

function extractFiles(j) {
    if (!j) return [];

    if (Array.isArray(j)) return j;
    if (Array.isArray(j.file_stats)) return j.file_stats;
    if (Array.isArray(j.FileStats)) return j.FileStats;
    if (Array.isArray(j.files)) return j.files;
    if (Array.isArray(j.Files)) return j.Files;

    if (j.data && typeof j.data === 'object') {
        return extractFiles(j.data);
    }

    if (j.stats && typeof j.stats === 'object') {
        return extractFiles(j.stats);
    }

    return [];
}

async function tsGetFiles(added) {
    var identifiers = [];

    if (added.hash) {
        identifiers.push({
            action: 'get',
            hash: added.hash
        });
    }

    identifiers.push({
        action: 'get',
        link: added.link
    });

    for (var i = 0; i < identifiers.length; i++) {
        try {
            var j = await tsRequest(
                identifiers[i], 10000
            );

            var files = extractFiles(j);

            if (files.length) {
                return {
                    files: files,
                    raw: j,
                    identifier: added.hash || added.link
                };
            }
        } catch (e) {}
    }

    try {
        var r = await fetchTimed(
            torr() + '/stream/files?link=' +
            encodeURIComponent(added.link),
            {
                method: 'GET',
                headers: auth()
            },
            10000
        );

        var json = await r.json();

        return {
            files: extractFiles(json),
            raw: json,
            identifier: added.hash || added.link
        };
    } catch (e) {}

    return {
        files: [],
        raw: null,
        identifier: added.hash || added.link
    };
}

function bestMovieFile(files) {
    var candidates = [];

    files.forEach(function (f, i) {
        if (!isVideoFile(f)) return;

        var path = videoPath(f);

        var penalty =
            /sample|trailer|bonus|extra|featurette/i
                .test(path) ? 1 : 0;

        candidates.push({
            file: f,
            index: fileIndex(f, i),
            size: videoLength(f),
            penalty: penalty
        });
    });

    candidates.sort(function (a, b) {
        if (a.penalty !== b.penalty) {
            return a.penalty - b.penalty;
        }

        return b.size - a.size;
    });

    return candidates.length ?
        candidates[0] : null;
}

function safeFilename(s) {
    var name = String(s || 'video')
        .split(/[\\/]/).pop()
        .replace(/\.[^.]+$/, '')
        .replace(/[^\wа-яіїєґ0-9-]+/gi, '.')
        .replace(/^\.+|\.+$/g, '');

    return (name || 'video') + '.mkv';
}

function streamUrl(identifier, file, index) {
    var url = streamBase() +
        '/stream/' +
        encodeURIComponent(
            safeFilename(videoPath(file))
        ) +
        '?link=' +
        encodeURIComponent(identifier) +
        '&index=' + index +
        '&play=1';

    var token = field('torrserver_token');

    if (token) {
        url += '&authorization=' +
            encodeURIComponent('Bearer ' + token);
    }

    return url;
}

function closeDialog() {
    dialogToken++;

    if (!activeDialog) return;

    var d = activeDialog;
    activeDialog = null;

    try {
        if (d.close) d.close();
    } catch (e) {}

    try {
        if (d.element && d.element.parentNode) {
            d.element.parentNode.removeChild(d.element);
        }
    } catch (e) {}
}

function playVideo(url, title) {
    closeDialog();

    if (!url) throw Error('Порожнє посилання відео');

    if (window.Lampa &&
        Lampa.Player &&
        typeof Lampa.Player.play === 'function') {

        Lampa.Player.play({
            url: url,
            title: title || 'UaDV',
            timeline: 0
        });

    } else {
        window.location.href = url;
    }
}

async function prepareRelease(rel, meta) {
    var added = await tsAddRelease(rel, meta);
    var result = await tsGetFiles(added);

    if (!result.files.length) {
        throw Error('TorrServer не повернув файли');
    }

    var best = bestMovieFile(result.files);

    if (!best) {
        throw Error('Відеофайл не знайдено');
    }

    return {
        url: streamUrl(
            result.identifier,
            best.file,
            best.index
        ),
        file: best.file,
        size: best.size,
        release: rel
    };
}

async function autoPlayMovie(releases, meta) {
    if (playbackStarting) return;

    playbackStarting = true;
    var token = ++playbackToken;

    try {
        var maxAttempts = Math.min(
            releases.length, 5
        );

        for (var i = 0; i < maxAttempts; i++) {
            if (token !== playbackToken) return;

            var rel = releases[i];

            try {
                notify(
                    'Перевірка релізу ' +
                    (i + 1) + '/' + maxAttempts
                );

                var ready = await prepareRelease(
                    rel, meta
                );

                if (token !== playbackToken) return;

                notify(
                    'Запуск: ' +
                    size(ready.size)
                );

                playVideo(
                    ready.url,
                    meta.title || meta.name
                );

                return;
            } catch (e) {
                console.warn(
                    '[UaDV] Release failed:',
                    rel.title, e
                );
            }
        }

        notify(
            'Не вдалося підготувати відео. ' +
            'Перевір TorrServer.'
        );
    } finally {
        playbackStarting = false;
    }
}

/* ==========================================
   Dialog interface
   ========================================== */

function dialogStyles() {
    if (document.getElementById('uadv62-dialog-css')) {
        return;
    }

    var css = ''
    + '.uadv62-overlay{position:fixed;inset:0;'
    + 'z-index:999999;background:rgba(0,0,0,.82);'
    + 'display:flex;align-items:center;'
    + 'justify-content:center;padding:20px;}'

    + '.uadv62-panel{width:min(900px,94vw);'
    + 'max-height:86vh;overflow:hidden;'
    + 'background:#171717;color:#fff;'
    + 'border-radius:16px;display:flex;'
    + 'flex-direction:column;'
    + 'box-shadow:0 12px 45px #0009;}'

    + '.uadv62-head{padding:20px 24px;'
    + 'font-size:26px;font-weight:800;'
    + 'border-bottom:1px solid #ffffff20;}'

    + '.uadv62-content{overflow-y:auto;'
    + 'padding:18px 22px;overscroll-behavior:contain;}'

    + '.uadv62-text{font-size:21px;'
    + 'line-height:1.5;margin-bottom:18px;}'

    + '.uadv62-item{padding:15px 18px;'
    + 'margin-bottom:9px;background:#292929;'
    + 'border-radius:10px;cursor:pointer;'
    + 'border:2px solid transparent;}'

    + '.uadv62-item.focus,'
    + '.uadv62-item:focus,'
    + '.uadv62-item:hover{background:#383838;'
    + 'border-color:#fff;outline:none;}'

    + '.uadv62-item-title{font-size:21px;'
    + 'font-weight:700;overflow-wrap:anywhere;}'

    + '.uadv62-item-sub{font-size:16px;'
    + 'opacity:.72;margin-top:5px;}'

    + '.uadv62-actions{display:flex;'
    + 'gap:12px;flex-wrap:wrap;}'

    + '.uadv62-action{flex:1;min-width:140px;'
    + 'text-align:center;}'

    + '@media(max-width:600px){'
    + '.uadv62-head{font-size:21px;padding:15px;}'
    + '.uadv62-content{padding:12px;}'
    + '.uadv62-item-title{font-size:17px;}'
    + '.uadv62-text{font-size:17px;}'
    + '}';

    var s = document.createElement('style');
    s.id = 'uadv62-dialog-css';
    s.textContent = css;
    document.head.appendChild(s);
}

function createDialog(title) {
    closeDialog();
    dialogStyles();

    var overlay = document.createElement('div');
    overlay.className = 'uadv62-overlay';

    var panel = document.createElement('div');
    panel.className = 'uadv62-panel';

    var head = document.createElement('div');
    head.className = 'uadv62-head';
    head.textContent = title || 'UaDV';

    var content = document.createElement('div');
    content.className = 'uadv62-content';

    panel.appendChild(head);
    panel.appendChild(content);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var closed = false;

    function focus(el) {
        var items = content.querySelectorAll(
            '.uadv62-item'
        );

        Array.prototype.forEach.call(
            items,
            function (n) {
                n.classList.remove('focus');
            }
        );

        if (el) {
            el.classList.add('focus');
            el.focus();

            el.scrollIntoView({
                block: 'nearest'
            });
        }
    }

    function move(step) {
        var items = Array.prototype.slice.call(
            content.querySelectorAll('.uadv62-item')
        );

        if (!items.length) return;

        var index = items.findIndex(function (x) {
            return x.classList.contains('focus');
        });

        if (index < 0) index = 0;

        index = Math.max(
            0,
            Math.min(items.length - 1, index + step)
        );

        focus(items[index]);
    }

    function keyHandler(e) {
        if (closed) return;

        var k = e.key || e.keyCode;

        if (
            k === 'Escape' ||
            k === 'Backspace' ||
            k === 'BrowserBack' ||
            k === 'GoBack' ||
            k === 8 ||
            k === 27 ||
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
            move(1);
        }

        if (k === 'ArrowUp' || k === 38) {
            e.preventDefault();
            e.stopImmediatePropagation();
            move(-1);
        }

        if (k === 'Enter' || k === 13) {
            e.preventDefault();
            e.stopImmediatePropagation();

            var selected = content.querySelector(
                '.uadv62-item.focus'
            );

            if (selected) selected.click();
        }
    }

    document.addEventListener(
        'keydown', keyHandler, true
    );

    function close() {
        if (closed) return;

        closed = true;

        document.removeEventListener(
            'keydown', keyHandler, true
        );

        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }

        if (activeDialog &&
            activeDialog.element === overlay) {
            activeDialog = null;
        }
    }

    function clear() {
        content.innerHTML = '';
    }

    function message(t) {
        var el = document.createElement('div');
        el.className = 'uadv62-text';
        el.textContent = t;
        content.appendChild(el);
    }

    function item(title, subtitle, callback) {
        var el = document.createElement('div');
        el.className = 'uadv62-item';
        el.tabIndex = 0;

        var t = document.createElement('div');
        t.className = 'uadv62-item-title';
        t.textContent = title;

        var sub = document.createElement('div');
        sub.className = 'uadv62-item-sub';
        sub.textContent = subtitle || '';

        el.appendChild(t);
        el.appendChild(sub);

        el.addEventListener('click', function () {
            if (callback) callback();
        });

        content.appendChild(el);

        return el;
    }

    function focusFirst() {
        var first = content.querySelector(
            '.uadv62-item'
        );

        if (first) focus(first);
    }

    activeDialog = {
        element: overlay,
        close: close
    };

    return {
        clear: clear,
        message: message,
        item: item,
        focusFirst: focusFirst,
        close: close,
        content: content
    };
}

/* ==========================================
   Other language fallback
   ========================================== */

function showOtherLanguagePrompt(releases, meta) {
    var d = createDialog('UaDV — Озвучення');

    d.message(
        'Українську озвучку не знайдено. ' +
        'Бажаєш переглянути доступні релізи ' +
        'з іншою озвучкою?'
    );

    d.item(
        'Показати релізи',
        'Вибрати фільм вручну',
        function () {
            showReleaseList(releases, meta);
        }
    );

    d.item(
        'Скасувати',
        'Повернутися до картки фільму',
        function () {
            d.close();
        }
    );

    d.focusFirst();
}

function showReleaseList(releases, meta) {
    var d = createDialog('UaDV — Доступні релізи');

    if (!releases.length) {
        d.message('Релізів не знайдено');
        d.item('Закрити', '', function () {
            d.close();
        });
        d.focusFirst();
        return;
    }

    releases.forEach(function (rel) {
        d.item(
            rel.title,
            size(rel.size) +
            ' · Сідери: ' + rel.seed,
            function () {
                d.close();

                autoPlayMovie(
                    [rel],
                    meta
                );
            }
        );
    });

    d.item(
        'Назад',
        'Повернутися до картки фільму',
        function () {
            d.close();
        }
    );

    d.focusFirst();
}

/* ==========================================
   Movie flow
   ========================================== */

async function startMovie(meta) {
    var releases = await findReleases(
        meta, false
    );

    if (!releases.length) {
        notify('Релізів не знайдено');
        return;
    }

    var ua = releases.filter(function (x) {
        return ukrainian(x.title);
    });

    var others = releases.filter(function (x) {
        return !ukrainian(x.title);
    });

    if (ua.length) {
        var mode = setting('playMode', 'auto');

        if (mode === 'manual') {
            showReleaseList(ua, meta);
        } else {
            await autoPlayMovie(ua, meta);
        }

        return;
    }

    var fallback = setting(
        'fallback', 'ask'
    );

    if (fallback === 'none') {
        notify('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        await autoPlayMovie(
            others, meta
        );
        return;
    }

    showOtherLanguagePrompt(
        others, meta
    );
}

/* ==========================================
   Series — seasons and episodes
   ========================================== */

function seasonNumbers(title) {
    var s = String(title || '');
    var found = {};

    var range = s.match(
        /(?:season|сезон|s)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i
    );

    if (range) {
        var a = Number(range[1]);
        var b = Number(range[2]);

        if (b >= a && b - a <= 30) {
            for (var i = a; i <= b; i++) {
                found[i] = true;
            }
        }
    }

    var re = /(?:\bS(\d{1,2})\b|(?:season|сезон)\s*(\d{1,2}))/gi;
    var m;

    while ((m = re.exec(s))) {
        found[Number(m[1] || m[2])] = true;
    }

    var nums = Object.keys(found).map(Number);

    return nums.length ? nums : [1];
}

function episodeInfo(path, hint) {
    var p = String(path || '');

    var m = p.match(
        /s(\d{1,2})e(\d{1,3})/i
    );

    if (m) {
        return {
            season: Number(m[1]),
            episode: Number(m[2])
        };
    }

    m = p.match(/(\d{1,2})x(\d{1,3})/i);

    if (m) {
        return {
            season: Number(m[1]),
            episode: Number(m[2])
        };
    }

    m = p.match(
        /(?:episode|ep|серія|серия)\s*(\d{1,3})/i
    );

    if (m) {
        return {
            season: hint,
            episode: Number(m[1])
        };
    }

    return {
        season: hint,
        episode: 0
    };
}

function groupSeasons(releases) {
    var groups = {};

    releases.forEach(function (r) {
        seasonNumbers(r.title).forEach(function (n) {
            if (!groups[n]) groups[n] = [];
            groups[n].push(r);
        });
    });

    return groups;
}

async function showEpisodes(meta, season, releases) {
    var d = createDialog(
        'UaDV — Сезон ' + season
    );

    d.message('Завантаження серій...');

    var episodes = {};
    var maxReleases = Math.min(
        releases.length, 8
    );

    for (var i = 0; i < maxReleases; i++) {
        var rel = releases[i];

        try {
            var added = await tsAddRelease(
                rel, meta
            );

            var response = await tsGetFiles(added);

            response.files.forEach(function (f, index) {
                if (!isVideoFile(f)) return;

                var info = episodeInfo(
                    videoPath(f), season
                );

                if (
                    info.season !== season ||
                    !info.episode
                ) return;

                var ep = info.episode;
                var candidate = {
                    file: f,
                    index: fileIndex(f, index),
                    identifier: response.identifier,
                    release: rel,
                    score: rank(rel)
                };

                if (
                    !episodes[ep] ||
                    candidate.score >
                    episodes[ep].score
                ) {
                    episodes[ep] = candidate;
                }
            });

        } catch (e) {
            console.warn(
                '[UaDV] Series release error',
                e
            );
        }
    }

    if (!activeDialog ||
        activeDialog.element !== d.content.parentNode.parentNode) {
        return;
    }

    d.clear();

    var numbers = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!numbers.length) {
        d.message(
            'Серії цього сезону не знайдено'
        );

        d.item('Закрити', '', function () {
            d.close();
        });

        d.focusFirst();
        return;
    }

    numbers.forEach(function (ep) {
        var e = episodes[ep];

        d.item(
            'Серія ' + ep,
            size(videoLength(e.file)) +
            ' · ' + e.release.title,
            function () {
                var url = streamUrl(
                    e.identifier,
                    e.file,
                    e.index
                );

                playVideo(
                    url,
                    (meta.name || meta.title) +
                    ' S' + season +
                    'E' + String(ep).padStart(2, '0')
                );
            }
        );
    });

    d.focusFirst();
}

async function startSeries(meta) {
    var releases = await findReleases(
        meta, true
    );

    if (!releases.length) {
        notify('Релізів серіалу не знайдено');
        return;
    }

    var ua = releases.filter(function (r) {
        return ukrainian(r.title);
    });

    if (!ua.length) {
        var fallback = setting(
            'fallback', 'ask'
        );

        if (fallback === 'none') {
            notify(
                'Українську озвучку не знайдено'
            );
            return;
        }

        if (fallback === 'ask') {
            var d = createDialog(
                'UaDV — Озвучення серіалу'
            );

            d.message(
                'Українську озвучку не знайдено. ' +
                'Показати сезони з іншою озвучкою?'
            );

            d.item(
                'Показати сезони',
                '',
                function () {
                    showSeasonList(
                        meta, releases
                    );
                }
            );

            d.item(
                'Скасувати',
                '',
                function () {
                    d.close();
                }
            );

            d.focusFirst();
            return;
        }

        ua = releases;
    }

    showSeasonList(meta, ua);
}

function showSeasonList(meta, releases) {
    var groups = groupSeasons(releases);
    var seasons = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    var d = createDialog(
        'UaDV — Вибір сезону'
    );

    seasons.forEach(function (sn) {
        d.item(
            'Сезон ' + sn,
            'Релізів: ' + groups[sn].length,
            function () {
                showEpisodes(
                    meta,
                    sn,
                    groups[sn]
                );
            }
        );
    });

    d.focusFirst();
}

/* ==========================================
   UaDV v62.0 — PART 3/3
   Settings + Button + Initialization
   ========================================== */

/* ---------- Settings ---------- */

function addSetting(params) {
    try {
        Lampa.SettingsApi.addParam(params);
    } catch (e) {
        console.warn('[UaDV] Settings error', e);
    }
}

function registerSettings() {
    if (!window.Lampa || !Lampa.SettingsApi) return;

    try {
        Lampa.SettingsApi.addComponent({
            component: 'uadv62',
            name: 'UaDV AutoPlay',
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 4v6h2V9H6zm4 0v6h2V9h-2zm4 0v6h4V9h-4z"/></svg>'
        });
    } catch (e) {}

    function select(name, title, values, def) {
        var key = PREFIX + name;

        if (setting(name, null) === null) {
            save(name, def);
        }

        addSetting({
            component: 'uadv62',
            param: {
                name: key,
                type: 'select',
                values: values,
                default: def
            },
            field: {
                name: title
            },
            onChange: function (value) {
                save(name, value);
            }
        });
    }

    function slider(name, title, min, max, step, def) {
        var key = PREFIX + name;

        if (setting(name, null) === null) {
            save(name, def);
        }

        addSetting({
            component: 'uadv62',
            param: {
                name: key,
                type: 'select',
                values: (function () {
                    var obj = {};

                    for (var i = min; i <= max; i += step) {
                        obj[String(i)] = String(i);
                    }

                    return obj;
                })(),
                default: String(def)
            },
            field: {
                name: title
            },
            onChange: function (value) {
                save(name, Number(value));
            }
        });
    }

    select(
        'quality',
        'Пріоритет роздільної здатності',
        {
            '4k': '4K / 2160p',
            '1080': '1080p'
        },
        '4k'
    );

    select(
        'hdr',
        'Пріоритет HDR',
        {
            'dv': 'Dolby Vision → HDR10+ → HDR10',
            'hdr': 'HDR10+ → HDR10 → Dolby Vision',
            'sdr': 'SDR у пріоритеті'
        },
        'dv'
    );

    select(
        'source',
        'Пріоритет джерела',
        {
            'auto': 'Автоматично',
            'remux': 'Blu-ray REMUX',
            'bluray': 'Blu-ray',
            'webdl': 'WEB-DL'
        },
        'auto'
    );

    select(
        'playMode',
        'Режим відтворення',
        {
            'auto': 'Автоматичний запуск',
            'manual': 'Вибір релізу вручну'
        },
        'auto'
    );

    select(
        'fallback',
        'Якщо українську озвучку не знайдено',
        {
            'ask': 'Запропонувати інші релізи',
            'none': 'Не відтворювати',
            'auto': 'Автоматично вибрати інший'
        },
        'ask'
    );

    slider(
        'maxSize',
        'Максимальний розмір фільму (GB)',
        10, 120, 5, 70
    );

    slider(
        'minSeeds',
        'Мінімум сідерів',
        1, 30, 1, 5
    );

    select(
        'toloka',
        'Пріоритет Toloka',
        {
            'false': 'Усі трекери',
            'true': 'Лише Toloka, якщо доступна'
        },
        'false'
    );

    addSetting({
        component: 'uadv62',
        param: {
            name: PREFIX + 'info',
            type: 'static'
        },
        field: {
            name: 'UaDV AutoPlay',
            description: 'Версія ' + VERSION +
                ' · Українська озвучка у пріоритеті'
        }
    });
}

/* ---------- Button styles ---------- */

function injectButtonStyles() {
    if (document.getElementById('uadv62-button-css')) {
        return;
    }

    var css = ''
    + '.full-start__button.uadv62-btn{'
    + 'background:#333!important;'
    + 'color:#fff!important;'
    + 'border:0!important;'
    + 'box-shadow:0 2px 8px #0005!important;'
    + 'order:-9999!important;'
    + '}'

    + '.full-start__button.uadv62-btn.focus,'
    + '.full-start__button.uadv62-btn:hover{'
    + 'background:#484848!important;'
    + 'color:#fff!important;'
    + 'transform:translateY(-1px);'
    + '}'

    + '.uadv62-btn svg{'
    + 'width:18px;'
    + 'height:18px;'
    + 'fill:currentColor;'
    + '}';

    var style = document.createElement('style');
    style.id = 'uadv62-button-css';
    style.textContent = css;
    document.head.appendChild(style);
}

/* ---------- Media button ---------- */

function createButton() {
    var btn = document.createElement('div');

    btn.className =
        'full-start__button selector uadv62-btn';

    btn.setAttribute('data-uadv62', '1');
    btn.setAttribute('tabindex', '0');

    btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" ' +
        'viewBox="0 0 16 16">' +
        '<path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm2.372 3.715.435-.714h1.71v3.93h.733v.957h-.733V11H5.405V9.888H2.5v-.971c.574-1.077 1.225-2.142 1.872-3.202m7.73-.714h1.306l-2.14 2.584L13.5 11h-1.428l-1.679-2.624-.615.7V11H8.59V5.001h1.187v2.686h.057L12.102 5z"/>' +
        '</svg>' +
        '<span>UaDV</span>';

    return btn;
}

function findButtonBar(root) {
    var selectors = [
        '.full-start-new__buttons',
        '.full-start__buttons',
        '.full-actions'
    ];

    for (var i = 0; i < selectors.length; i++) {
        var bar = root.querySelector(selectors[i]);

        if (bar) return bar;
    }

    return null;
}

/* ---------- Main launch ---------- */

async function launchUaDV(movie) {
    if (busy || playbackStarting) {
        notify('Пошук уже виконується');
        return;
    }

    if (!movie) {
        notify('Не вдалося визначити фільм');
        return;
    }

    busy = true;

    try {
        jackett();
        torr();

        notify('Шукаю найкращий реліз...');

        if (serial(movie)) {
            await startSeries(movie);
        } else {
            await startMovie(movie);
        }

    } catch (e) {
        console.error('[UaDV] Error:', e);

        notify(
            e && e.message ?
            e.message :
            'Помилка запуску'
        );
    } finally {
        busy = false;
    }
}

/* ---------- Attach button ---------- */

function attachButton(root, movie) {
    if (!root || !movie) return false;

    var bar = findButtonBar(root);

    if (!bar) return false;

    if (bar.querySelector('[data-uadv62="1"]')) {
        return true;
    }

    var btn = createButton();
    var lastActivation = 0;

    function activate() {
        var now = Date.now();

        if (now - lastActivation < 450) return;

        lastActivation = now;
        launchUaDV(movie);
    }

    btn.addEventListener('click', activate);

    btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            activate();
        }
    });

    if ($) {
        $(btn).on('hover:enter', activate);
    }

    bar.insertBefore(btn, bar.firstChild);

    try {
        if (Lampa.Controller &&
            typeof Lampa.Controller.collectionSet === 'function') {
            Lampa.Controller.collectionSet($(bar));
        }
    } catch (e) {}

    return true;
}

/* ---------- Full card listener ---------- */

function registerFullListener() {
    if (!window.Lampa ||
        !Lampa.Listener ||
        typeof Lampa.Listener.follow !== 'function') {
        return;
    }

    Lampa.Listener.follow('full', function (ev) {
        if (!ev || ev.type !== 'complite') return;

        var movie = ev.data && ev.data.movie;

        if (!movie || !ev.object ||
            !ev.object.activity) return;

        var render;

        try {
            render = ev.object.activity.render();
        } catch (e) {
            return;
        }

        var root = render && render[0] ?
            render[0] : render;

        if (!root) return;

        if (attachButton(root, movie)) return;

        try {
            var observer = new MutationObserver(
                function () {
                    if (attachButton(root, movie)) {
                        observer.disconnect();
                    }
                }
            );

            observer.observe(root, {
                childList: true,
                subtree: true
            });

            setTimeout(function () {
                observer.disconnect();
            }, 8000);

        } catch (e) {}
    });
}

/* ---------- Initialization ---------- */

function initializeUaDV() {
    if (!window.Lampa) return false;

    try {
        injectButtonStyles();
        dialogStyles();
        registerSettings();
        registerFullListener();

        console.log(
            '[UaDV] AutoPlay v' +
            VERSION + ' initialized'
        );

        return true;
    } catch (e) {
        console.error('[UaDV] Initialization:', e);
        return false;
    }
}

var initAttempts = 0;

function waitForLampa() {
    if (
        window.Lampa &&
        Lampa.Listener &&
        Lampa.Storage &&
        Lampa.SettingsApi
    ) {
        initializeUaDV();
        return;
    }

    if (++initAttempts < 40) {
        setTimeout(waitForLampa, 500);
    } else {
        console.warn(
            '[UaDV] Lampa initialization timeout'
        );
    }
}

waitForLampa();

})();
