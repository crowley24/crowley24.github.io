(function () {
'use strict';

if (window.uadv624_ready) return;
window.uadv624_ready = true;

var VERSION = '62.4.1';
var P = 'uadv62_';
var GB = 1073741824;
var MB = 1048576;
var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';
var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv)$/i;

var cache = {}, cacheKeys = [], busy = false, dialog = null, toastTimer = null;
var $ = window.jQuery || window.$;

function get(k, d) {
    try { var v = Lampa.Storage.get(P + k); return v == null ? d : v; } catch (e) { return d; }
}
function set(k, v) { try { Lampa.Storage.set(P + k, v); } catch (e) {} }
function field(k) { try { return Lampa.Storage.field(k) || ''; } catch (e) { return ''; } }

function note(s) {
    try {
        var old = document.getElementById('uadv624-toast');
        if (old) old.remove();
        if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

        var toast = document.createElement('div');
        toast.id = 'uadv624-toast';
        toast.className = 'uadv624-toast';
        toast.innerHTML = '<span class="uadv624-toast-mark">4K</span><span class="uadv624-toast-text">' + String(s || '') + '</span>';
        document.body.appendChild(toast);

        requestAnimationFrame(function () { toast.classList.add('uadv624-toast-visible'); });
        toastTimer = setTimeout(function () {
            toast.classList.remove('uadv624-toast-visible');
            setTimeout(function () { if (toast.parentNode) toast.remove(); }, 220);
        }, 2800);
    } catch (e) { console.log('[4K]', s); }
}

function log() { console.log.apply(console, ['[4K]'].concat([].slice.call(arguments))); }

function scheme(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : 'http://' + u; }
function trim(u) { return String(u || '').replace(/\/+$/, ''); }
function clean(s) { return String(s || '').replace(/[:\/\\|?*<>"']/g, ' ').replace(/\s+/g, ' ').trim(); }
function human(n) { return (Number(n || 0) / GB).toFixed(1) + ' GB'; }
function serial(m) { return !!(m && (m.media_type === 'tv' || m.first_air_date || m.number_of_seasons) && !m.release_date); }

function timeout(url, opt, ms) {
    var c = new AbortController();
    var t = setTimeout(function () { c.abort(); }, ms || 10000);
    return fetch(url, Object.assign({}, opt || {}, { signal: c.signal })).then(
        function (r) { clearTimeout(t); return r; },
        function (e) { clearTimeout(t); throw e; }
    );
}

function jackett() {
    var u = field('jackett_url');
    if (!u) throw Error('Вкажи jackett_url');
    return { base: trim(scheme(u)).replace(/\/jackett(?:\/.*)?$/i, ''), key: field('jackett_key') };
}

function tsBase() {
    var u = field('torrserver_url');
    if (!u) throw Error('Вкажи torrserver_url');
    return trim(scheme(u));
}

function tsHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var token = field('torrserver_token'), u = field('torrserver_user'), p = field('torrserver_pass');
    if (token) {
        h.Authorization = 'Bearer ' + token;
    } else if (u || p) {
        try { h.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(u + ':' + p))); } catch (e) {}
    }
    return h;
}

function tsStreamBase() {
    var b = tsBase(), u = field('torrserver_user'), p = field('torrserver_pass');
    try {
        if (u || p) {
            var x = new URL(b);
            x.username = u; x.password = p;
            b = trim(x.toString());
        }
    } catch (e) {}
    return b;
}

function streamAuth() {
    var t = field('torrserver_token');
    return t ? '&authorization=' + encodeURIComponent('Bearer ' + t) : '';
}

function xmlResults(s) {
    var doc = new DOMParser().parseFromString(s, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    return [].slice.call(doc.querySelectorAll('item')).map(function (it) {
        var attrs = {};
        [].slice.call(it.getElementsByTagName('*')).forEach(function (el) {
            if (el.localName === 'attr' && el.getAttribute('name')) {
                attrs[el.getAttribute('name').toLowerCase()] = el.getAttribute('value') || '';
            }
        });
        function val(t) { var el = it.querySelector(t); return el ? el.textContent.trim() : ''; }
        var enc = it.querySelector('enclosure');
        var dl = enc && enc.getAttribute('url') || '';
        var mag = attrs.magneturl || '';
        return {
            title: val('title'),
            link: /^magnet:/i.test(mag) ? mag : (val('link') || dl),
            magnet: mag,
            dl: dl,
            size: Number(val('size') || attrs.size || (enc && enc.getAttribute('length')) || 0),
            seed: Number(attrs.seeders || attrs.peers || 0),
            tracker: String(attrs.jackettindexer || attrs.indexer || attrs.jackettindexerid || '').toLowerCase()
        };
    });
}

function jsonResults(j) {
    var a = Array.isArray(j) ? j : (j.Results || j.results || j.items || []);
    return (Array.isArray(a) ? a : []).map(function (x) {
        var mag = x.MagnetUri || x.MagnetUrl || x.magnet || '';
        return {
            title: x.Title || x.title || '',
            link: /^magnet:/i.test(mag) ? mag : (x.Link || x.link || ''),
            magnet: mag,
            dl: '',
            size: Number(x.Size || x.size || 0),
            seed: Number(x.Seeders || x.seeders || x.Peers || x.peers || 0),
            tracker: String(x.Tracker || x.tracker || x.TrackerId || '').toLowerCase()
        };
    });
}

async function searchJackett(q, cats, mode, meta) {
    var jb = jackett(), p = new URLSearchParams(), url;
    if (jb.key) p.set('apikey', jb.key);

    if (mode === 'xml') {
        p.set('t', 'search');
        p.set('q', clean(q));
        cats.split(',').forEach(function (c) { p.append('cat', c); });
        url = jb.base + '/api/v2.0/indexers/all/results/torznab/?' + p.toString();
    } else {
        p.set('Query', clean(q));
        if (meta) {
            p.set('title', meta.title || '');
            p.set('title_original', meta.orig || '');
            if (meta.year) p.set('year', meta.year);
            p.set('is_serial', meta.series ? '1' : '0');
        }
        cats.split(',').forEach(function (c) { p.append('Category[]', c); });
        url = jb.base + '/api/v2.0/indexers/all/results?' + p.toString();
    }

    var r = await timeout(url, { method: 'GET', credentials: 'omit', mode: 'cors' }, 10000);
    if (!r.ok) throw Error('Jackett HTTP ' + r.status);
    return mode === 'xml' ? xmlResults(await r.text()) : jsonResults(await r.json());
}

function ukrainian(t) {
    var str = String(t || '').toLowerCase();
    var langPattern = /ukr|укр|украї|ukrainian|ukrainisch|гр\.|ua[-_\s]?dub|ua[-_\s]?audio/i;
    var studiosPattern = new RegExp([
        'незупиняйся', 'незупиняйсь', 'nezupyniays', 'однiею колією', 'однією колією', '1колія',
        'цікава ідея', 'tsikava ideya', 'склянка соку', 'sklyanka soku', 'дворіччя', 'dvorichchya',
        'озвучка ua', 'озвучка укр', 'urt', 'євгена малухи', 'євген малуха', 'postmodern', 'так треба',
        'дивобудок', 'starlight', 'качан', 'фанвакс', 'fanvox', 'bamberg', 'бамберг',
        'dniprofilm', 'дніпрофільм', 'кінокульт', 'kinokult', 'cinema hd', 'cinema_hd',
        'аматорське', 'загін кіноманів', 'озвучено'
    ].join('|'), 'i');
    return langPattern.test(str) || studiosPattern.test(str);
}

function score(x) {
    var t = x.title || '', s = 0;
    var q = String(get('quality', '4k'));
    var hdr = String(get('hdr', 'dv'));
    var source = String(get('source', 'auto'));
    var audio = String(get('audio', 'auto'));

    var k4 = /2160p|\b4k\b|\buhd\b/i.test(t);
    var fhd = /1080p/i.test(t);

    s += (q === '1080') ? (fhd ? 110 : k4 ? 50 : 0) : (k4 ? 110 : fhd ? 60 : 0);

    var dv = /dolby.?vision|dovi|(?:^|[.\s_-])dv(?:$|[.\s_-])/i.test(t);
    var hp = /hdr10\+/i.test(t);
    var h = /\bhdr10?\b/i.test(t);

    if (hdr === 'sdr') s += (!dv && !hp && !h) ? 40 : 0;
    else if (hdr === 'hdr') s += hp ? 40 : (h ? 35 : (dv ? 15 : 0));
    else s += dv ? 40 : (hp ? 32 : (h ? 24 : 0));

    var rem = /remux/i.test(t), blur = /blu.?ray|bdrip/i.test(t), web = /web.?dl/i.test(t);
    if (source === 'webdl') s += web ? 35 : (rem ? 20 : (blur ? 15 : 0));
    else if (source === 'bluray') s += (blur && !rem) ? 35 : (rem ? 27 : (web ? 15 : 0));
    else s += rem ? 35 : (blur ? 27 : (web ? 20 : 0));

    if (audio === 'atmos' && /atmos|truehd/i.test(t)) s += 20;
    if (audio === 'dts' && /dts.?hd|dts.?x/i.test(t)) s += 20;
    if (audio === 'eac3' && /e.?ac.?3|ddp/i.test(t)) s += 20;

    s += Math.min(20, Math.log2(1 + Number(x.seed || 0)) * 3);
    s += Math.min(12, Number(x.size || 0) / GB / 5);
    return s;
}

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
    function add(x) { x = clean(x); if (x && arr.indexOf(x) < 0) arr.push(x); }

    add(combos[pref] || orig);
    add(orig);
    if (local !== orig) add(local);
    if (!serial(m) && year) add(orig + ' ' + year);
    return arr;
}

function makeCacheKey(m, cats, qs) {
    return [jackett().base, field('jackett_key'), cats, qs.join('|'), get('minSeeds', '5'), get('maxSize', '70'), get('quality', '4k'), get('hdr', 'dv'), get('source', 'auto'), get('audio', 'auto'), get('toloka', 'false'), field('parse_lang')].join('~');
}

async function findReleases(m) {
    var show = serial(m), cats = show ? SERIES_CATS : MOVIE_CATS, qs = queries(m);
    var key = makeCacheKey(m, cats, qs);

    if (cache[key] && Date.now() - cache[key].at < 300000) {
        log('Cache hit');
        return cache[key].items.slice();
    }

    var all = [], errors = [], successful = 0;
    for (var i = 0; i < qs.length; i++) {
        var meta = { title: m.title || m.name, orig: m.original_title || m.original_name, year: String(m.release_date || '').slice(0, 4), series: show };
        var results = await Promise.allSettled([searchJackett(qs[i], cats, 'xml', meta), searchJackett(qs[i], cats, 'json', meta)]);
        results.forEach(function (r) {
            if (r.status === 'fulfilled') { successful++; all = all.concat(r.value); }
            else { errors.push(String(r.reason)); }
        });
    }

    if (!successful) throw Error('Jackett: ' + (errors[0] || 'помилка з’єднання'));

    var seen = {}, min = Number(get('minSeeds', '5')), max = Number(get('maxSize', '70')) * GB;
    all = all.filter(function (x) {
        if (!x.link || !x.title || x.size <= 0 || x.seed < min || (!show && x.size > max)) return false;
        var id = (x.magnet || x.link || x.title).toLowerCase();
        if (seen[id]) return false;
        seen[id] = true;
        return true;
    });

    var tol = String(get('toloka', 'false')) === 'true';
    all.sort(function (a, b) {
        if (tol) {
            var at = /toloka/i.test(a.tracker), bt = /toloka/i.test(b.tracker);
            if (at !== bt) return at ? -1 : 1;
        }
        var uaA = ukrainian(a.title) ? 12 : 0, uaB = ukrainian(b.title) ? 12 : 0;
        return (score(b) + uaB) - (score(a) + uaA);
    });

    log('Знайдено', all.length, 'релізів', qs);
    if (cacheKeys.length >= 20) delete cache[cacheKeys.shift()];
    cacheKeys.push(key);
    cache[key] = { at: Date.now(), items: all.slice() };
    return all;
}

async function tsAdd(base, link, title, poster, movie) {
    var body = {
        action: 'add',
        link: link,
        title: '[LAMPA] ' + (title || ''),
        poster: poster || '',
        data: JSON.stringify({ lampa: true, movie: movie || {} }),
        save_to_db: false
    };
    var r = await timeout(base + '/torrents', { method: 'POST', headers: tsHeaders(), body: JSON.stringify(body) }, 10000);
    var j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw Error('TorrServer HTTP ' + r.status);
    var hash = j.hash || j.id || j.link || j.data || j.result || '';
    return { hash: typeof hash === 'string' ? hash : '', raw: j, status: r.status };
}

function fileStats(j) {
    if (!j) return [];
    if (Array.isArray(j)) return j;
    return j.file_stats || j.FileStats || j.files || j.Files || (j.stats && j.stats.file_stats) || [];
}

async function tsFiles(base, linkOrHash) {
    var body = { action: 'get' };
    if (/^(magnet:|https?:)/i.test(linkOrHash)) body.link = linkOrHash;
    else body.hash = linkOrHash;

    try {
        var r = await timeout(base + '/torrents', { method: 'POST', headers: tsHeaders(), body: JSON.stringify(body) }, 8000);
        if (r.ok) {
            var files = fileStats(await r.json());
            if (files.length) return files;
        }
    } catch (e) {}

    try {
        var r2 = await timeout(base + '/stream/files?link=' + encodeURIComponent(linkOrHash), { method: 'GET', headers: tsHeaders() }, 8000);
        if (r2.ok) return fileStats(await r2.json());
    } catch (e) {}
    return [];
}

async function tsFilesReady(base, linkOrHash, attempts) {
    var max = Math.max(1, Number(attempts || 5)), last = [];
    for (var i = 0; i < max; i++) {
        last = await tsFiles(base, linkOrHash);
        if (last && last.length) return last;
        if (i < max - 1) await new Promise(function (res) { setTimeout(res, 1100); });
    }
    return last;
}

function videoFile(f) {
    var path = String(f.path || f.Path || f.name || f.Name || '');
    var size = Number(f.length || f.Length || f.size || f.Size || 0);
    return VIDEO.test(path) && size >= 500 * MB && !/sample|trailer|featurette/i.test(path);
}

function safeFileName(s) {
    return String(s || 'video').replace(/[^\w\d.-]+/g, '.').replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '') || 'video';
}

function streamLink(hash, file, title) {
    var rawName = String(file && (file.path || file.Path || file.name || file.Name) || title || 'video').split(/[\\/]/).pop();
    var name = safeFileName(rawName);
    if (!/\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv)$/i.test(name)) name += '.mkv';
    var idx = 1;
    if (file && file.id !== undefined) {
        var n = Number(file.id);
        if (!isNaN(n)) idx = n + 1;
    }
    return tsStreamBase() + '/stream/' + encodeURIComponent(name) + '?link=' + encodeURIComponent(hash) + '&index=' + idx + '&play=1' + streamAuth();
}

function closeDialog() {
    if (!dialog) return;
    var d = dialog; dialog = null;
    try { d.close(); } catch (e) {}
}

function playStream(url, title) {
    closeDialog();
    if (window.Lampa && Lampa.Player && typeof Lampa.Player.play === 'function') {
        Lampa.Player.play({ url: url, title: title, timeline: 0 });
    } else {
        location.href = url;
    }
}

function openDialog(title, items) {
    closeDialog();
    var overlay = document.createElement('div');
    overlay.className = 'uadv624-overlay';
    var panel = document.createElement('div');
    panel.className = 'uadv624-panel';
    panel.innerHTML = '<div class="uadv624-head">' + title + '</div><div class="uadv624-list"></div>';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var list = panel.querySelector('.uadv624-list');
    var selected = 0, closed = false, rows = [];

    function focus(n) {
        if (!rows.length) return;
        selected = Math.max(0, Math.min(rows.length - 1, n));
        rows.forEach(function (r, i) { r.classList.toggle('focus', i === selected); });
        try { rows[selected].focus(); rows[selected].scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    function close() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', keyboard, true);
        if (overlay.parentNode) overlay.remove();
        if (dialog && dialog.close === close) dialog = null;
    }

    function keyboard(e) {
        var k = e.key || e.keyCode;
        if (k === 'Escape' || k === 'Backspace' || k === 27 || k === 8 || k === 461 || k === 10009) {
            e.preventDefault(); e.stopImmediatePropagation(); close(); return;
        }
        if (k === 'ArrowDown' || k === 40) { e.preventDefault(); e.stopImmediatePropagation(); focus(selected + 1); return; }
        if (k === 'ArrowUp' || k === 38) { e.preventDefault(); e.stopImmediatePropagation(); focus(selected - 1); return; }
        if (k === 'Enter' || k === 13) { e.preventDefault(); e.stopImmediatePropagation(); if (rows[selected]) rows[selected].click(); }
    }

    (items || []).forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'uadv624-row selector';
        row.tabIndex = 0;
        row.innerHTML = '<div class="uadv624-row-title">' + (item.title || '') + '</div>' + (item.subtitle ? '<div class="uadv624-row-sub">' + item.subtitle + '</div>' : '');
        row.addEventListener('click', function () { if (item.action) item.action(); });
        list.appendChild(row);
        rows.push(row);
    });

    document.addEventListener('keydown', keyboard, true);
    dialog = { close: close };
    focus(0);
    return dialog;
}

async function startMovieRelease(movie, release) {
    var base = tsBase(), link = release.dl || release.magnet || release.link;
    if (!link) throw Error('У релізу немає посилання');
    var hash = link, addedOk = false;

    try {
        var added = await tsAdd(base, link, movie.title || movie.name, movie.poster_path || '', movie);
        if (added.hash) { hash = added.hash; addedOk = true; }
    } catch (e) {}

    if (addedOk) {
        note('Підготовка потоку…');
        try { await tsFilesReady(base, hash, 3); } catch (e) {}
    }

    playStream(streamLink(hash, null, movie.title || movie.name), movie.title || movie.name);
}

function releasePicker(movie, releases) {
    openDialog('4K · Вибір релізу', releases.slice(0, 50).map(function (r) {
        return {
            title: r.title,
            subtitle: human(r.size) + ' · Сідери: ' + r.seed,
            action: function () {
                closeDialog();
                startMovieRelease(movie, r).catch(function (e) { note(e.message || String(e)); });
            }
        };
    }).concat([{ title: 'Скасувати', action: closeDialog }]));
}

async function movieFlow(movie, releases) {
    var ua = releases.filter(function (r) { return ukrainian(r.title); });
    if (ua.length) {
        if (String(get('playMode', 'auto')) === 'manual') releasePicker(movie, ua);
        else await startMovieRelease(movie, ua[0]);
        return;
    }
    var fallback = String(get('fallback', 'ask'));
    if (fallback === 'none') { note('Українську озвучку не знайдено'); return; }
    if (fallback === 'auto') { await startMovieRelease(movie, releases[0]); return; }
    openDialog('Українську озвучку не знайдено', [
        { title: 'Показати інші релізи', subtitle: 'Вибір вручну', action: function () { releasePicker(movie, releases); } },
        { title: 'Скасувати', action: closeDialog }
    ]);
}

function seasonsFromTitle(s) {
    var result = {}, range = String(s || '').match(/(?:season|сезон|s)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/i);
    if (range) {
        var a = Number(range[1]), b = Number(range[2]);
        if (b >= a && b - a <= 30) for (var n = a; n <= b; n++) result[n] = true;
    }
    var re = /(?:\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*(\d{1,2})|(\d{1,2})\s*сез)/gi, m;
    while ((m = re.exec(s))) {
        var sn = Number(m[1] || m[2] || m[3]);
        if (sn) result[sn] = true;
    }
    var keys = Object.keys(result).map(Number);
    return keys.length ? keys : [1];
}

function episodeFromPath(path, season) {
    var name = String(path || '').replace(/\\/g, '/').split('/').pop();
    var m = name.match(/S(\d{1,2})[ ._-]*E(\d{1,3})/i);
    if (m) return Number(m[1]) === Number(season) ? Number(m[2]) : 0;
    m = name.match(/(\d{1,2})x(\d{1,3})/i);
    if (m) return Number(m[1]) === Number(season) ? Number(m[2]) : 0;
    m = name.match(/(?:season|сезон|сез\.)\s*(\d{1,2}).{0,25}?(?:episode|ep|серія|серия|сер\.)\s*0*(\d{1,3})/i);
    if (m) return Number(m[1]) === Number(season) ? Number(m[2]) : 0;
    m = name.match(/(?:episode|ep|серія|серия|сер\.)\s*0*(\d{1,3})/i);
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
    var numbers = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
    if (!numbers.length) { note('Сезонів не знайдено'); return; }

    openDialog('4K · Вибір сезону', numbers.map(function (n) {
        return {
            title: 'Сезон ' + n,
            subtitle: 'Релізів: ' + groups[n].length,
            action: function () { openSeason(movie, n, groups[n]); }
        };
    }));
}

async function loadEpisodes(movie, season, releases) {
    closeDialog();
    note('Завантажую серії сезону ' + season);
    var episodes = {}, base = tsBase();
    var sorted = releases.slice().sort(function (a, b) {
        return (ukrainian(b.title) ? 1 : 0) - (ukrainian(a.title) ? 1 : 0) || (score(b) - score(a));
    });

    for (var i = 0; i < Math.min(10, sorted.length); i++) {
        var r = sorted[i], link = r.dl || r.magnet || r.link, hash = link;
        try {
            var added = await tsAdd(base, link, (movie.name || movie.title) + ' S' + season, '', movie);
            if (added.hash) hash = added.hash;
        } catch (e) {}

        var files = await tsFilesReady(base, hash, 3);
        files.forEach(function (f) {
            if (!videoFile(f)) return;
            var path = String(f.path || f.Path || f.name || f.Name || '');
            var ep = episodeFromPath(path, season);
            if (!ep) return;
            var candidate = { file: f, hash: hash, size: Number(f.length || f.Length || f.size || f.Size || 0), release: r, score: score(r) };
            if (!episodes[ep] || candidate.score > episodes[ep].score) episodes[ep] = candidate;
        });
    }

    var numbers = Object.keys(episodes).map(Number).sort(function (a, b) { return a - b; });
    if (!numbers.length) { note('Не знайдено відеосерій ≥500 MB'); return; }

    openDialog('Сезон ' + season + ' · Серії', numbers.map(function (n) {
        var ep = episodes[n];
        return {
            title: 'Серія ' + n,
            subtitle: human(ep.size) + ' · ' + (ep.release && ep.release.title || ''),
            action: function () {
                playStream(streamLink(ep.hash, ep.file, (movie.name || movie.title) + ' S' + season + 'E' + String(n).padStart(2, '0')), (movie.name || movie.title) + ' S' + season + 'E' + String(n).padStart(2, '0'));
            }
        };
    }));
}

function openSeason(movie, season, releases) {
    var ua = releases.filter(function (r) { return ukrainian(r.title); });
    if (ua.length) { loadEpisodes(movie, season, ua); return; }
    var fallback = String(get('fallback', 'ask'));
    if (fallback === 'none') { note('Українську озвучку не знайдено'); return; }
    if (fallback === 'auto') { loadEpisodes(movie, season, releases); return; }
    openDialog('Українську озвучку не знайдено', [
        { title: 'Показати інші релізи', subtitle: 'Спробувати доступні серії', action: function () { loadEpisodes(movie, season, releases); } },
        { title: 'Скасувати', action: closeDialog }
    ]);
}

function seriesFlow(movie, releases) {
    var ua = releases.filter(function (r) { return ukrainian(r.title); });
    if (ua.length) { showSeasons(movie, ua); return; }
    var fallback = String(get('fallback', 'ask'));
    if (fallback === 'none') { note('Українську озвучку не знайдено'); return; }
    if (fallback === 'auto') { showSeasons(movie, releases); return; }
    openDialog('Українську озвучку не знайдено', [
        { title: 'Показати інші сезони', subtitle: 'Вибір доступних релізів', action: function () { showSeasons(movie, releases); } },
        { title: 'Скасувати', action: closeDialog }
    ]);
}

function registerSettings() {
    if (!window.Lampa || !Lampa.SettingsApi) return;
    try {
        Lampa.SettingsApi.addComponent({ component: 'uadv62', name: '4K', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M8 9v6M12 9v6M16 9v6"/></svg>' });
    } catch (e) {}

    var settings = [
        { name: 'playMode', title: 'Режим запуску фільмів', description: 'Автоматично запускати найкращий український реліз або обирати вручну', def: 'auto', values: { auto: 'Автоматично', manual: 'Ручний вибір' } },
        { name: 'quality', title: 'Пріоритет роздільності', description: 'Бажана роздільність відео', def: '4k', values: { '4k': '4K / 2160p', '1080': 'Full HD / 1080p' } },
        { name: 'hdr', title: 'Пріоритет HDR', description: 'Вибір технології зображення', def: 'dv', values: { dv: 'Dolby Vision → HDR10+ → HDR', hdr: 'HDR10+ → HDR → Dolby Vision', sdr: 'SDR' } },
        { name: 'source', title: 'Пріоритет джерела', description: 'Тип відеорелізу', def: 'auto', values: { auto: 'REMUX → Blu-ray → WEB-DL', bluray: 'Blu-ray → REMUX → WEB-DL', webdl: 'WEB-DL → REMUX → Blu-ray' } },
        { name: 'audio', title: 'Пріоритет аудіоформату', description: 'Додатковий пріоритет звукової доріжки', def: 'auto', values: { auto: 'Автоматично', atmos: 'Dolby Atmos / TrueHD', dts: 'DTS-HD / DTS:X', eac3: 'Dolby Digital Plus' } },
        { name: 'minSeeds', title: 'Мінімум сідерів', description: 'Мінімальна кількість роздаючих', def: '5', values: { '0': 'Без обмеження', '1': '1', '3': '3', '5': '5', '10': '10', '20': '20' } },
        { name: 'maxSize', title: 'Максимальний розмір фільму', description: 'Обмеження розміру торента', def: '70', values: { '30': '30 GB', '50': '50 GB', '70': '70 GB', '90': '90 GB', '120': '120 GB', '200': '200 GB' } },
        { name: 'toloka', title: 'Пріоритет Toloka', description: 'Віддавати перевагу релізам із Toloka', def: 'false', values: { 'false': 'Вимкнено', 'true': 'Увімкнено' } },
        { name: 'fallback', title: 'Якщо немає української озвучки', description: 'Дія, коли українські релізи відсутні', def: 'ask', values: { ask: 'Запитати перед вибором', none: 'Не запускати', auto: 'Запустити інший реліз' } }
    ];

    settings.forEach(function (item) {
        try {
            Lampa.SettingsApi.addParam({
                component: 'uadv62',
                param: { name: P + item.name, type: 'select', values: item.values, default: String(item.def) },
                field: { name: item.title, description: item.description || '' },
                onChange: function (value) { set(item.name, value); cache = {}; cacheKeys = []; }
            });
        } catch (e) {}
    });
}

async function runUaDV(data) {
    if (busy) { note('Пошук уже активний'); return; }
    busy = true;
    try {
        var movie = data && data.movie;
        if (!movie) throw Error('Не вдалося отримати інформацію про фільм');
        note('Шукаю релізи: ' + (movie.title || movie.name || ''));
        var releases = await findReleases(movie);
        if (!releases.length) throw Error('Релізів не знайдено.');
        if (serial(movie)) await seriesFlow(movie, releases);
        else await movieFlow(movie, releases);
    } catch (e) {
        log('Run error:', e);
        note(e && e.message ? e.message : String(e));
    } finally {
        busy = false;
    }
}

function attachButton(root, ev) {
    if (!ev || !ev.data || !ev.data.movie) return true;
    var bar = root.find('.full-start-new__buttons, .full-start__buttons, .full-actions').eq(0);
    if (!bar.length) bar = root.find('.full-start__right, .full-start').eq(0);
    if (!bar.length || bar.find('[data-uadv-button="1"]').length) return !!bar.length;

    var btn = $(document.createElement('div'));
    btn.addClass('full-start__button selector uadv624-button');
    btn.attr('data-uadv-button', '1');
    btn.prop('tabIndex', 0);
    btn.html('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 8.5 16 12l-6 3.5z" fill="currentColor" stroke="none"/></svg><span>4K</span>');

    var lastClick = 0, click = function () {
        var now = Date.now();
        if (now - lastClick < 500) return;
        lastClick = now;
        runUaDV(ev.data);
    };

    btn.on('hover:enter click', click);
    btn.on('keydown', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); click(); } });

    bar.prepend(btn);
    try { Lampa.Controller.collectionSet(bar); } catch (e) {}
    return true;
}

function injectStyles() {
    if (document.getElementById('uadv624-style')) return;
    var style = document.createElement('style');
    style.id = 'uadv624-style';
    style.textContent = [
        '.full-start__button.uadv624-button{background:linear-gradient(135deg,#30353d,#22262c)!important;color:#f4f5f7!important;border:1px solid rgba(255,255,255,.13)!important;order:-9999!important;box-shadow:0 3px 12px rgba(0,0,0,.28)!important;transition:background .15s ease,border-color .15s ease,transform .15s ease;}',
        '.full-start__button.uadv624-button.focus,.full-start__button.uadv624-button:hover{background:linear-gradient(135deg,#414750,#2c3138)!important;border-color:rgba(255,255,255,.32)!important;filter:brightness(1.06);}',
        '.full-start__button.uadv624-button svg{flex-shrink:0;}',
        '.uadv624-toast{position:fixed;left:50%;bottom:7vh;transform:translate(-50%,12px);z-index:1000000;display:flex;align-items:center;gap:11px;max-width:min(88vw,560px);padding:12px 17px;background:rgba(18,21,26,.97);color:#f5f7fa;border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 12px 38px rgba(0,0,0,.48);font:500 15px/1.35 Arial,sans-serif;opacity:0;visibility:hidden;transition:opacity .18s ease,transform .18s ease,visibility .18s;pointer-events:none;}',
        '.uadv624-toast.uadv624-toast-visible{opacity:1;visibility:visible;transform:translate(-50%,0);}',
        '.uadv624-toast-mark{font-size:12px;font-weight:800;letter-spacing:.4px;color:#fff;background:#394351;padding:5px 7px;border-radius:6px;flex-shrink:0;}',
        '.uadv624-toast-text{overflow-wrap:anywhere;}',
        '.uadv624-overlay{position:fixed;inset:0;z-index:999999;background:rgba(3,5,9,.80);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:16px;}',
        '.uadv624-panel{width:min(1100px,94vw);max-height:88vh;display:flex;flex-direction:column;background:linear-gradient(145deg,#171a20,#101216);color:#f4f6fa;border:1px solid rgba(255,255,255,.10);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.58);overflow:hidden;}',
        '.uadv624-head{padding:20px 23px;font-size:25px;font-weight:700;letter-spacing:.1px;border-bottom:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.025);flex-shrink:0;}',
        '.uadv624-list{overflow-y:auto;padding:12px;max-height:calc(88vh - 90px);overscroll-behavior:contain;}',
        '.uadv624-row{padding:15px 17px;border:1px solid transparent;border-radius:11px;cursor:pointer;margin-bottom:7px;background:rgba(255,255,255,.045);outline:none;transition:background .12s ease,border-color .12s ease;}',
        '.uadv624-row.focus,.uadv624-row:hover{background:rgba(255,255,255,.105);border-color:rgba(255,255,255,.30);}',
        '.uadv624-row-title{font-size:20px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;}',
        '.uadv624-row-sub{font-size:14px;line-height:1.4;color:#aeb6c4;margin-top:5px;overflow-wrap:anywhere;}'
    ].join('');
    document.head.appendChild(style);
}

function init() {
    if (!window.Lampa || !Lampa.Listener || !Lampa.Storage) { setTimeout(init, 500); return; }
    
    var defaults = { playMode: 'auto', quality: '4k', hdr: 'dv', source: 'auto', audio: 'auto', minSeeds: '5', maxSize: '70', toloka: 'false', fallback: 'ask' };
    Object.keys(defaults).forEach(function (k) {
        try { if (Lampa.Storage.get(P + k) == null) set(k, defaults[k]); } catch (e) {}
    });

    injectStyles();
    registerSettings();

    Lampa.Listener.follow('full', function (ev) {
        if (!ev || ev.type !== 'complite' || !ev.object) return;
        var root;
        try { root = ev.object.activity.render(); } catch (e) { return; }
        if (!root || !root.length) return;
        if (attachButton(root, ev)) return;

        try {
            var target = root[0], observer = new MutationObserver(function () {
                if (attachButton(root, ev)) observer.disconnect();
            });
            observer.observe(target, { childList: true, subtree: true });
            setTimeout(function () { observer.disconnect(); }, 8000);
        } catch (e) {}
    });

    log('4K v' + VERSION + ' initialized');
}

init();

})();
