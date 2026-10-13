
(function () {
'use strict';

if (window.uadv621_ready) return;
window.uadv621_ready = true;

var VERSION = '62.1.0';
var PREFIX = 'uadv62_';
var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';
var GB = 1073741824;
var MB = 1048576;
var VIDEO = /\.(mkv|mp4|avi|ts|m2ts|mov|mpg|mpeg)$/i;

var $;
var busy = false;
var activeDialog = null;
var searchCache = {};
var currentSearch = 0;

function get(k, def) {
    try {
        var v = Lampa.Storage.get(PREFIX + k);
        return v === undefined || v === null ? def : v;
    } catch (e) {
        return def;
    }
}

function set(k, v) {
    Lampa.Storage.set(PREFIX + k, v);
}

function field(k) {
    try {
        return Lampa.Storage.field(k) || '';
    } catch (e) {
        return '';
    }
}

function bool(k, def) {
    var v = get(k, def);
    return v === true || v === 'true';
}

function notice(s) {
    try {
        Lampa.Noty.show('UaDV: ' + s);
    } catch (e) {
        console.log('[UaDV]', s);
    }
}

function log() {
    try {
        console.log.apply(console, ['[UaDV]'].concat(
            Array.prototype.slice.call(arguments)
        ));
    } catch (e) {}
}

function clean(s) {
    return String(s || '')
        .replace(/[:\/\\|?*<>"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function norm(s) {
    return clean(s).toLowerCase()
        .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
        .trim();
}

function base(s) {
    s = String(s || '').trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(s) ? s : 'http://' + s;
}

function formatSize(n) {
    return (Number(n || 0) / GB).toFixed(1) + ' GB';
}

function isSeries(m) {
    return !!(
        m && (
            m.media_type === 'tv' ||
            m.number_of_seasons ||
            m.first_air_date
        ) && !m.release_date
    );
}

function timeoutFetch(url, options, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
        controller.abort();
    }, ms || 15000);

    return fetch(url, Object.assign({}, options || {}, {
        signal: controller.signal
    })).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw Error('HTTP ' + r.status);
        return r;
    }, function (e) {
        clearTimeout(timer);
        throw e;
    });
}

/* ========================================
   JACKETT
   ======================================== */

function jackettConfig() {
    var url = field('jackett_url');
    var key = field('jackett_key');

    if (!url) throw Error('Не налаштовано Jackett');

    url = base(url);

    // Зберігаємо /jackett для reverse proxy,
    // але прибираємо шлях API, якщо його вставили.
    url = url.replace(
        /\/api\/v2\.0\/.*$/i, ''
    );

    return {
        url: url,
        key: key
    };
}

function xmlAttrs(item) {
    var out = {};

    Array.prototype.forEach.call(
        item.getElementsByTagName('*'),
        function (node) {
            if (node.localName !== 'attr') return;

            var name = node.getAttribute('name');
            if (name) {
                out[name.toLowerCase()] =
                    node.getAttribute('value') || '';
            }
        }
    );

    return out;
}

function parseXML(source) {
    var doc = new DOMParser().parseFromString(
        source, 'application/xml'
    );

    if (doc.getElementsByTagName('parsererror').length) {
        throw Error('Некоректна XML-відповідь Jackett');
    }

    var items = doc.getElementsByTagName('item');

    return Array.prototype.map.call(items, function (item) {
        var a = xmlAttrs(item);

        function value(tag) {
            var node = item.getElementsByTagName(tag)[0];
            return node ? node.textContent.trim() : '';
        }

        var enclosure =
            item.getElementsByTagName('enclosure')[0];

        var enclosureUrl = enclosure ?
            enclosure.getAttribute('url') || '' : '';

        var link = a.magneturl ||
            value('link') ||
            enclosureUrl;

        return {
            title: value('title'),
            link: link,
            download: enclosureUrl || link,
            size: Number(
                value('size') || a.size ||
                (enclosure && enclosure.getAttribute('length')) ||
                0
            ),
            seed: Number(a.seeders || a.peers || 0),
            tracker: String(
                a.jackettindexer ||
                a.indexer ||
                a.jackettindexerid || ''
            ).toLowerCase()
        };
    });
}

function parseJSON(data) {
    var arr = Array.isArray(data) ?
        data : (
            data.Results ||
            data.results ||
            data.items || []
        );

    if (!Array.isArray(arr)) return [];

    return arr.map(function (x) {
        var link = x.MagnetUri ||
            x.MagnetUrl ||
            x.Link ||
            x.link || '';

        return {
            title: x.Title || x.title || '',
            link: link,
            download: x.Link || x.link || link,
            size: Number(x.Size || x.size || 0),
            seed: Number(x.Seeders || x.seeders || 0),
            tracker: String(
                x.Tracker || x.tracker ||
                x.TrackerId || ''
            ).toLowerCase()
        };
    });
}

async function searchJackett(query, categories, mode) {
    var config = jackettConfig();
    var params = new URLSearchParams();
    var url;

    if (config.key) {
        params.set('apikey', config.key);
    }

    if (mode === 'xml') {
        params.set('t', 'search');
        params.set('q', query);

        // Torznab: один параметр cat.
        params.set('cat', categories);

        url = config.url +
            '/api/v2.0/indexers/all/results/torznab/?' +
            params.toString();
    } else {
        params.set('Query', query);

        categories.split(',').forEach(function (c) {
            params.append('Category[]', c);
        });

        url = config.url +
            '/api/v2.0/indexers/all/results?' +
            params.toString();
    }

    var response = await timeoutFetch(
        url, { credentials: 'omit' }, 15000
    );

    return mode === 'xml' ?
        parseXML(await response.text()) :
        parseJSON(await response.json());
}

/* ========================================
   LANGUAGE + QUALITY
   ======================================== */

function ukrainian(title) {
    return /(?:^|[^a-zа-яіїєґ])(?:ukr|ukrainian|укр|україн|українська|українською|ua[\s._-]*(?:dub|audio|voice)|дубляж[\s._-]*укр)(?:$|[^a-zа-яіїєґ])/i
        .test(title || '');
}

function resolution(title) {
    if (/2160p|4k|uhd/i.test(title)) return 2160;
    if (/1080p|full.?hd/i.test(title)) return 1080;
    if (/720p/i.test(title)) return 720;
    return 0;
}

function scoreRelease(x) {
    var t = x.title || '';
    var score = 0;

    var quality = String(get('quality', '4k'));
    var hdr = String(get('hdr', 'dv'));
    var source = String(get('source', 'auto'));
    var audio = String(get('audio', 'auto'));

    var res = resolution(t);

    if (quality === '1080') {
        score += res === 1080 ? 110 :
            res === 2160 ? 65 : 10;
    } else {
        score += res === 2160 ? 110 :
            res === 1080 ? 65 : 10;
    }

    var dv = /dolby.?vision|dovi|(?:^|[\s._-])dv(?:$|[\s._-])/i.test(t);
    var hdr10plus = /hdr10\+/i.test(t);
    var hdr10 = /\bhdr10?\b/i.test(t);

    if (hdr === 'sdr') {
        score += !dv && !hdr10plus && !hdr10 ? 45 : 0;
    } else if (hdr === 'hdr') {
        score += hdr10plus ? 45 :
            hdr10 ? 35 : dv ? 20 : 0;
    } else {
        score += dv ? 45 :
            hdr10plus ? 35 : hdr10 ? 25 : 0;
    }

    var remux = /remux/i.test(t);
    var bluray = /blu.?ray|bdrip/i.test(t);
    var webdl = /web.?dl/i.test(t);

    if (source === 'webdl') {
        score += webdl ? 38 :
            remux ? 20 : bluray ? 15 : 0;
    } else if (source === 'bluray') {
        score += bluray && !remux ? 38 :
            remux ? 28 : webdl ? 15 : 0;
    } else {
        score += remux ? 38 :
            bluray ? 28 : webdl ? 20 : 0;
    }

    if (audio === 'atmos' &&
        /atmos|truehd/i.test(t)) score += 20;

    if (audio === 'dts' &&
        /dts.?hd|dts.?x/i.test(t)) score += 20;

    if (audio === 'eac3' &&
        /e.?ac.?3|ddp/i.test(t)) score += 20;

    score += Math.min(
        20,
        Math.log2(1 + Number(x.seed || 0)) * 3
    );

    score += Math.min(
        15,
        Number(x.size || 0) / GB / 5
    );

    return score;
}

/* ========================================
   IMPROVED SEARCH
   ======================================== */

function searchNames(m) {
    var names = [];
    var original = clean(
        m.original_title || m.original_name
    );
    var local = clean(m.title || m.name);
    var year = String(
        m.release_date || m.first_air_date || ''
    ).slice(0, 4);

    function add(s) {
        if (s && names.indexOf(s) < 0) {
            names.push(s);
        }
    }

    [original, local].forEach(function (name) {
        if (!name) return;

        if (!isSeries(m) && year) {
            add(name + ' ' + year);
        }

        add(name);
    });

    return names;
}

function looseMatch(release, movie) {
    var title = norm(release.title);
    var names = [
        norm(movie.original_title || movie.original_name),
        norm(movie.title || movie.name)
    ].filter(Boolean);

    return names.some(function (name) {
        if (title.indexOf(name) >= 0) return true;

        var words = name.split(' ').filter(function (w) {
            return w.length >= 3;
        });

        if (!words.length) return false;

        var hits = words.filter(function (w) {
            return title.indexOf(w) >= 0;
        }).length;

        return hits / words.length >= 0.75;
    });
}

async function findReleases(m, show) {
    var cats = show ? SERIES_CATS : MOVIE_CATS;
    var queries = searchNames(m);

    if (!queries.length) {
        throw Error('Немає назви для пошуку');
    }

    var config = jackettConfig();

    var cacheKey = [
        config.url,
        config.key,
        cats,
        queries.join('|'),
        get('minSeeds', 5),
        get('maxSize', 70)
    ].join('~');

    var cached = searchCache[cacheKey];

    if (cached &&
        Date.now() - cached.time < 300000) {
        return cached.data.slice();
    }

    var all = [];
    var successes = 0;
    var errors = [];

    for (var i = 0; i < queries.length; i++) {
        var query = queries[i];

        log('Пошук:', query);

        var batch = await Promise.allSettled([
            searchJackett(query, cats, 'xml'),
            searchJackett(query, cats, 'json')
        ]);

        batch.forEach(function (r) {
            if (r.status === 'fulfilled') {
                successes++;
                all = all.concat(r.value || []);
            } else {
                errors.push(String(r.reason));
                log('Помилка Jackett:', r.reason);
            }
        });
    }

    log('Отримано до фільтрації:', all.length);

    if (!successes) {
        throw Error(
            'Jackett не відповідає: ' +
            (errors[0] || 'невідома помилка')
        );
    }

    var minSeeds = Number(get('minSeeds', 5));
    var maxSize = Number(get('maxSize', 70)) * GB;

    var seen = {};

    all = all.filter(function (x) {
        if (!x.title || !x.link) return false;

        if (Number(x.seed) < minSeeds) return false;

        if (Number(x.size) <= 0) return false;

        if (!show && Number(x.size) > maxSize) {
            return false;
        }

        var id = String(x.link).toLowerCase();

        if (seen[id]) return false;
        seen[id] = true;

        return true;
    });

    // Спочатку релізи, які відповідають назві.
    // Але не видаляємо решту на етапі пошуку.
    all.forEach(function (x) {
        x.match = looseMatch(x, m);
    });

    var matched = all.filter(function (x) {
        return x.match;
    });

    if (matched.length) {
        all = matched;
    }

    var preferToloka = bool('toloka', false);

    all.sort(function (a, b) {
        if (preferToloka) {
            var at = /toloka/i.test(a.tracker);
            var bt = /toloka/i.test(b.tracker);

            if (at !== bt) return at ? -1 : 1;
        }

        return scoreRelease(b) - scoreRelease(a);
    });

    log('Релізів після фільтрації:', all.length);

    searchCache[cacheKey] = {
        time: Date.now(),
        data: all.slice()
    };

    return all;
}

/* ========================================
   TORRSERVER
   ======================================== */

function torrBase() {
    var url = field('torrserver_url');

    if (!url) throw Error('Не налаштовано TorrServer');

    return base(url);
}

function torrHeaders() {
    var headers = {
        'Content-Type': 'application/json'
    };

    var token = field('torrserver_token');
    var user = field('torrserver_user');
    var pass = field('torrserver_pass');

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    } else if (user || pass) {
        try {
            headers.Authorization = 'Basic ' +
                btoa(unescape(encodeURIComponent(
                    user + ':' + pass
                )));
        } catch (e) {}
    }

    return headers;
}

async function torrRequest(body) {
    var response = await timeoutFetch(
        torrBase() + '/torrents',
        {
            method: 'POST',
            headers: torrHeaders(),
            body: JSON.stringify(body)
        },
        20000
    );

    return response.json();
}

function extractFiles(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    var files = data.file_stats ||
        data.FileStats ||
        data.files ||
        data.Files;

    if (Array.isArray(files)) return files;

    if (data.data) return extractFiles(data.data);
    if (data.stats) return extractFiles(data.stats);

    return [];
}

async function torrentFiles(release) {
    var link = release.download || release.link;

    var added = await torrRequest({
        action: 'add',
        link: link,
        title: release.title,
        save_to_db: false
    });

    var hash = added.hash ||
        added.Hash ||
        (added.data && added.data.hash) ||
        link;

    var result = await torrRequest({
        action: 'get',
        link: link
    });

    var files = extractFiles(result);

    if (!files.length && hash !== link) {
        result = await torrRequest({
            action: 'get',
            hash: hash
        });

        files = extractFiles(result);
    }

    return {
        hash: hash,
        link: link,
        files: files
    };
}

function filePath(f) {
    return String(
        f.path || f.Path ||
        f.name || f.Name ||
        f.filename || ''
    );
}

function fileSize(f) {
    return Number(
        f.length || f.Length ||
        f.size || f.Size || 0
    );
}

function videoFiles(files) {
    return files.map(function (f, i) {
        var id = f.id !== undefined ? f.id :
            f.Id !== undefined ? f.Id :
            f.index !== undefined ? f.index : i;

        return {
            file: f,
            path: filePath(f),
            size: fileSize(f),
            index: Number(id) + 1
        };
    }).filter(function (x) {
        return VIDEO.test(x.path) &&
            x.size >= 500 * MB &&
            !/sample|trailer|featurette/i.test(x.path);
    });
}

function streamUrl(hash, video) {
    var filename = video.path.split(/[\\/]/).pop();

    var url = torrBase() +
        '/stream/' +
        encodeURIComponent(filename || 'video.mkv') +
        '?link=' + encodeURIComponent(hash) +
        '&index=' + video.index +
        '&play=1';

    var token = field('torrserver_token');

    if (token) {
        url += '&authorization=' +
            encodeURIComponent('Bearer ' + token);
    }

    return url;
}

function playVideo(hash, video, title) {
    closeDialog();

    Lampa.Player.play({
        url: streamUrl(hash, video),
        title: title,
        timeline: 0
    });
}

/* ========================================
   MODAL
   ======================================== */

function closeDialog() {
    if (!activeDialog) return;

    var d = activeDialog;
    activeDialog = null;
    d.close();
}

function dialog(title, choices) {
    closeDialog();

    var overlay = document.createElement('div');
    overlay.className = 'uadv-overlay';

    var panel = document.createElement('div');
    panel.className = 'uadv-panel';

    var heading = document.createElement('div');
    heading.className = 'uadv-heading';
    heading.textContent = title;

    var list = document.createElement('div');
    list.className = 'uadv-list';

    panel.appendChild(heading);
    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var index = 0;
    var closed = false;

    function rows() {
        return list.querySelectorAll('.uadv-choice');
    }

    function focus(i) {
        var items = rows();
        if (!items.length) return;

        index = Math.max(
            0, Math.min(items.length - 1, i)
        );

        Array.prototype.forEach.call(
            items,
            function (el, n) {
                el.classList.toggle('focus', n === index);
            }
        );

        items[index].focus();
        items[index].scrollIntoView({
            block: 'nearest'
        });
    }

    function close() {
        if (closed) return;

        closed = true;
        document.removeEventListener(
            'keydown', keyboard, true
        );

        overlay.remove();

        if (activeDialog &&
            activeDialog.close === close) {
            activeDialog = null;
        }
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
            close();
            return;
        }

        if (k === 'ArrowDown' || k === 40) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focus(index + 1);
        }

        if (k === 'ArrowUp' || k === 38) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focus(index - 1);
        }

        if (k === 'Enter' || k === 13) {
            e.preventDefault();
            e.stopImmediatePropagation();

            var selected = rows()[index];
            if (selected) selected.click();
        }
    }

    document.addEventListener(
        'keydown', keyboard, true
    );

    (choices || []).forEach(function (x) {
        var row = document.createElement('div');
        row.className = 'uadv-choice selector';
        row.tabIndex = 0;

        var name = document.createElement('div');
        name.className = 'uadv-choice-title';
        name.textContent = x.label;

        row.appendChild(name);

        if (x.sub) {
            var sub = document.createElement('div');
            sub.className = 'uadv-choice-sub';
            sub.textContent = x.sub;
            row.appendChild(sub);
        }

        row.addEventListener('click', function () {
            if (x.action) x.action();
        });

        list.appendChild(row);
    });

    activeDialog = {
        close: close
    };

    focus(0);
}

/* ========================================
   MOVIES
   ======================================== */

async function playBest(movie, releases) {
    var lastError = '';

    for (var i = 0; i < Math.min(5, releases.length); i++) {
        var rel = releases[i];

        try {
            notice(
                'Перевіряю реліз ' +
                (i + 1) + '/' +
                Math.min(5, releases.length)
            );

            var torrent = await torrentFiles(rel);
            var videos = videoFiles(torrent.files);

            if (!videos.length) {
                throw Error('Відеофайли відсутні');
            }

            videos.sort(function (a, b) {
                return b.size - a.size;
            });

            var video = videos[0];

            notice('Запускаю ' + formatSize(video.size));

            playVideo(
                torrent.hash,
                video,
                movie.title || movie.name || rel.title
            );

            return true;
        } catch (e) {
            lastError = e.message || String(e);
            log('Помилка релізу:', rel.title, e);
        }
    }

    notice('Не вдалося запустити: ' + lastError);
    return false;
}

function releaseDialog(movie, releases) {
    var choices = releases.slice(0, 40).map(
        function (r) {
            return {
                label: r.title,
                sub: formatSize(r.size) +
                    ' · Сідери: ' + r.seed,
                action: function () {
                    closeDialog();

                    if (busy) return;

                    busy = true;

                    playBest(movie, [r]).finally(
                        function () {
                            busy = false;
                        }
                    );
                }
            };
        }
    );

    choices.push({
        label: 'Скасувати',
        action: closeDialog
    });

    dialog('UaDV — Вибір релізу', choices);
}

function otherLanguageDialog(movie, releases) {
    dialog(
        'Українську озвучку не знайдено',
        [
            {
                label: 'Показати інші релізи',
                sub: 'Вибрати озвучку вручну',
                action: function () {
                    releaseDialog(movie, releases);
                }
            },
            {
                label: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

async function startMovie(movie, releases) {
    var ua = releases.filter(function (x) {
        return ukrainian(x.title);
    });

    if (ua.length) {
        if (get('playMode', 'auto') === 'manual') {
            releaseDialog(movie, ua);
        } else {
            await playBest(movie, ua);
        }
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        notice('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        await playBest(movie, releases);
        return;
    }

    otherLanguageDialog(movie, releases);
}

/* ========================================
   SERIES
   ======================================== */

function seasonsInTitle(title) {
    var result = {};
    var s = String(title || '');

    var range = s.match(
        /(?:season|сезон|s)\s*(\d{1,2})\s*[-–]\s*s?(\d{1,2})/i
    );

    if (range) {
        var from = Number(range[1]);
        var to = Number(range[2]);

        if (to >= from && to - from <= 30) {
            for (var i = from; i <= to; i++) {
                result[i] = true;
            }
        }
    }

    var re = /(?:\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*(\d{1,2}))/gi;
    var match;

    while ((match = re.exec(s))) {
        result[Number(match[1] || match[2])] = true;
    }

    return Object.keys(result)
        .map(Number)
        .filter(function (n) {
            return n > 0;
        });
}

function episodeNumber(path, season) {
    var s = String(path || '');

    var m = s.match(/S(\d{1,2})E(\d{1,3})/i) ||
        s.match(/(\d{1,2})x(\d{1,3})/i);

    if (m) {
        return Number(m[1]) === season ?
            Number(m[2]) : 0;
    }

    m = s.match(
        /(?:episode|ep|серія|серия)\s*0*(\d{1,3})/i
    );

    return m ? Number(m[1]) : 0;
}

function showSeasons(movie, releases) {
    var groups = {};

    releases.forEach(function (r) {
        var numbers = seasonsInTitle(r.title);

        if (!numbers.length) {
            numbers = [1];
        }

        numbers.forEach(function (n) {
            if (!groups[n]) groups[n] = [];
            groups[n].push(r);
        });
    });

    var seasons = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!seasons.length) {
        notice('Сезонів не знайдено');
        return;
    }

    dialog(
        'UaDV — Вибір сезону',
        seasons.map(function (n) {
            return {
                label: 'Сезон ' + n,
                sub: 'Релізів: ' + groups[n].length,
                action: function () {
                    openSeason(movie, n, groups[n]);
                }
            };
        })
    );
}

async function loadEpisodes(movie, season, releases) {
    closeDialog();
    notice('Завантажую серії сезону ' + season);

    var episodes = {};
    var sorted = releases.slice().sort(function (a, b) {
        return scoreRelease(b) - scoreRelease(a);
    });

    for (var i = 0; i < Math.min(10, sorted.length); i++) {
        var rel = sorted[i];

        try {
            var torrent = await torrentFiles(rel);

            videoFiles(torrent.files).forEach(function (v) {
                var ep = episodeNumber(v.path, season);

                if (!ep) return;

                var candidate = {
                    torrent: torrent,
                    video: v,
                    release: rel,
                    score: scoreRelease(rel)
                };

                if (!episodes[ep] ||
                    candidate.score > episodes[ep].score) {
                    episodes[ep] = candidate;
                }
            });
        } catch (e) {
            log('Помилка серіалу:', e);
        }
    }

    var numbers = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!numbers.length) {
        notice('Відеосерій не знайдено');
        return;
    }

    dialog(
        'Сезон ' + season + ' — серії',
        numbers.map(function (n) {
            var ep = episodes[n];

            return {
                label: 'Серія ' + n,
                sub: formatSize(ep.video.size) +
                    ' · ' + ep.release.title,
                action: function () {
                    playVideo(
                        ep.torrent.hash,
                        ep.video,
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
    var ua = releases.filter(function (x) {
        return ukrainian(x.title);
    });

    if (ua.length) {
        loadEpisodes(movie, season, ua);
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        notice('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        loadEpisodes(movie, season, releases);
        return;
    }

    dialog(
        'Українську озвучку не знайдено',
        [
            {
                label: 'Показати інші серії',
                action: function () {
                    loadEpisodes(
                        movie, season, releases
                    );
                }
            },
            {
                label: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

function startSeries(movie, releases) {
    var ua = releases.filter(function (x) {
        return ukrainian(x.title);
    });

    if (ua.length) {
        showSeasons(movie, ua);
        return;
    }

    var fallback = get('fallback', 'ask');

    if (fallback === 'none') {
        notice('Українську озвучку не знайдено');
        return;
    }

    if (fallback === 'auto') {
        showSeasons(movie, releases);
        return;
    }

    dialog(
        'Українську озвучку не знайдено',
        [
            {
                label: 'Показати інші сезони',
                action: function () {
                    showSeasons(movie, releases);
                }
            },
            {
                label: 'Скасувати',
                action: closeDialog
            }
        ]
    );
}

/* ========================================
   MAIN
   ======================================== */

async function run(movie) {
    if (busy) {
        notice('Пошук уже виконується');
        return;
    }

    if (!movie) {
        notice('Фільм не визначено');
        return;
    }

    busy = true;
    var searchId = ++currentSearch;

    try {
        jackettConfig();
        torrBase();

        notice('Шукаю релізи...');

        var series = isSeries(movie);
        var releases = await findReleases(movie, series);

        if (searchId !== currentSearch) return;

        if (!releases.length) {
            notice(
                'Релізів не знайдено. ' +
                'Спробуй зменшити мінімум сідерів.'
            );
            return;
        }

        log('Знайдені релізи:', releases);

        if (series) {
            startSeries(movie, releases);
        } else {
            await startMovie(movie, releases);
        }
    } catch (e) {
        log('Помилка:', e);
        notice(e.message || String(e));
    } finally {
        busy = false;
    }
}

/* ========================================
   SETTINGS
   ======================================== */

function registerSettings() {
    if (!Lampa.SettingsApi) return;

    var api = Lampa.SettingsApi;

    api.addComponent({
        component: 'uadv62',
        name: 'UaDV AutoPlay',
        icon: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
    });

    function select(name, label, values, def) {
        api.addParam({
            component: 'uadv62',
            param: {
                name: PREFIX + name,
                type: 'select',
                values: values,
                default: def
            },
            field: {
                name: label
            },
            onChange: function (value) {
                set(name, value);
                searchCache = {};
            }
        });
    }

    select(
        'quality',
        'Пріоритет якості',
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
            'hdr': 'HDR10+ → HDR10 → DV',
            'sdr': 'SDR у пріоритеті'
        },
        'dv'
    );

    select(
        'source',
        'Джерело відео',
        {
            'auto': 'REMUX → Blu-ray → WEB-DL',
            'bluray': 'Blu-ray у пріоритеті',
            'webdl': 'WEB-DL у пріоритеті'
        },
        'auto'
    );

    select(
        'audio',
        'Пріоритет аудіокодека',
        {
            'auto': 'Автоматично',
            'atmos': 'Dolby Atmos / TrueHD',
            'dts': 'DTS-HD / DTS:X',
            'eac3': 'E-AC3 / Dolby Digital Plus'
        },
        'auto'
    );

    select(
        'playMode',
        'Запуск українських релізів',
        {
            'auto': 'Автоматично',
            'manual': 'Вибирати вручну'
        },
        'auto'
    );

    select(
        'fallback',
        'Якщо немає української озвучки',
        {
            'ask': 'Запитати перед вибором',
            'none': 'Не відтворювати',
            'auto': 'Автоматичний запуск'
        },
        'ask'
    );

    select(
        'maxSize',
        'Максимальний розмір фільму',
        {
            '20': '20 GB',
            '40': '40 GB',
            '70': '70 GB',
            '100': '100 GB',
            '120': '120 GB'
        },
        '70'
    );

    select(
        'minSeeds',
        'Мінімум сідерів',
        {
            '0': 'Без обмеження',
            '1': '1',
            '3': '3',
            '5': '5',
            '10': '10',
            '20': '20'
        },
        '5'
    );

    select(
        'toloka',
        'Пріоритет Toloka',
        {
            'false': 'Усі трекери',
            'true': 'Toloka у пріоритеті'
        },
        'false'
    );
}

/* ========================================
   STYLES
   ======================================== */

function addStyles() {
    if (document.getElementById('uadv621-css')) return;

    var style = document.createElement('style');
    style.id = 'uadv621-css';

    style.textContent = `
.uadv-button {
    order: -9999 !important;
    display: flex !important;
    align-items: center;
    gap: 8px;
}
.uadv-button svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
}
.uadv-overlay {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(0,0,0,.84);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
}
.uadv-panel {
    width: min(1000px,94vw);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: #171717;
    color: white;
    border-radius: 14px;
    overflow: hidden;
}
.uadv-heading {
    font-size: 25px;
    font-weight: 700;
    padding: 20px 24px;
    border-bottom: 1px solid #444;
}
.uadv-list {
    overflow-y: auto;
    padding: 12px;
}
.uadv-choice {
    padding: 15px 18px;
    border-radius: 10px;
    margin: 4px 0;
    cursor: pointer;
}
.uadv-choice.focus,
.uadv-choice:hover {
    background: #404040;
    outline: 2px solid white;
}
.uadv-choice-title {
    font-size: 20px;
    overflow-wrap: anywhere;
}
.uadv-choice-sub {
    font-size: 15px;
    opacity: .75;
    margin-top: 5px;
}
@media(max-width:600px) {
    .uadv-heading {font-size:20px;padding:15px}
    .uadv-choice-title {font-size:17px}
    .uadv-choice {padding:12px}
}`;

    document.head.appendChild(style);
}

/* ========================================
   BUTTON
   ======================================== */

function attachButton(event) {
    if (
        !event ||
        event.type !== 'complite' ||
        !event.object ||
        !event.data ||
        !event.data.movie
    ) return;

    var movie = event.data.movie;
    var root;

    try {
        root = event.object.activity.render();
    } catch (e) {
        return;
    }

    if (!root || !root.find) return;

    function attach() {
        var bar = root.find(
            '.full-start-new__buttons,' +
            '.full-start__buttons,' +
            '.full-actions'
        ).first();

        if (!bar.length) return false;

        if (root.find('.uadv-button').length) {
            return true;
        }

        var button = $(`
<div class="full-start__button selector uadv-button"
     tabindex="0">
    <svg viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
    </svg>
    <span>UaDV</span>
</div>`);

        var lastClick = 0;

        function activate() {
            var now = Date.now();

            if (now - lastClick < 400) return;
            lastClick = now;

            run(movie);
        }

        button.on('hover:enter click', activate);

        button.on('keydown', function (e) {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                activate();
            }
        });

        bar.prepend(button);

        return true;
    }

    if (attach()) return;

    var node = root[0];

    if (!node) return;

    var observer = new MutationObserver(function () {
        if (attach()) observer.disconnect();
    });

    observer.observe(node, {
        childList: true,
        subtree: true
    });

    setTimeout(function () {
        observer.disconnect();
    }, 7000);
}

/* ========================================
   INITIALIZATION
   ======================================== */

var initAttempts = 0;

function init() {
    if (
        !window.Lampa ||
        !Lampa.Listener ||
        !Lampa.Storage ||
        !window.$
    ) {
        if (++initAttempts < 60) {
            setTimeout(init, 500);
        } else {
            console.error('[UaDV] Lampa not ready');
        }
        return;
    }

    $ = window.jQuery || window.$;

    addStyles();

    try {
        registerSettings();
    } catch (e) {
        log('Налаштування:', e);
    }

    Lampa.Listener.follow('full', attachButton);

    log('UaDV v' + VERSION + ' initialized');
}

init();

})();
