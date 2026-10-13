
(function () {
'use strict';

/*
 * 4K PRO v63.0.2
 * Lampa / Jackett / TorrServer
 *
 * Improved search
 * Premium release cards
 * Remote control navigation
 * Ukrainian audio priority
 * Dolby Vision priority
 * Video file verification
 */

if (window.uadv632_ready) return;
window.uadv632_ready = true;

var VERSION = '63.0.2';
var P = 'uadv62_';

var GB = 1073741824;
var MB = 1048576;

var MOVIE_CATS = '2000,2010,2020,2030,2040';
var SERIES_CATS = '5000,5030,5040,5050,5060,5070';

var VIDEO_EXT = /\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv|webm)$/i;

var $ = window.jQuery || window.$;

var cache = {};
var cacheOrder = [];

var busy = false;
var operationId = 0;
var activeController = null;

var initialized = false;
var settingsDone = false;
var mounted = false;

var currentDialog = null;
var dialogCounter = 0;
var lastActivation = 0;
var toastTimer = null;

var STYLE_ID = 'uadv632-css';
var DIALOG_CONTROLLER = 'uadv632_dialog';

/* ========================================
   UTILITIES
======================================== */

function log() {
    try {
        console.log.apply(
            console,
            ['[4K Pro ' + VERSION + ']'].concat(
                Array.prototype.slice.call(arguments)
            )
        );
    } catch (e) {}
}

function storageGet(key, fallback) {
    try {
        var value = Lampa.Storage.get(P + key);
        return value == null ? fallback : value;
    } catch (e) {
        return fallback;
    }
}

function storageSet(key, value) {
    try {
        Lampa.Storage.set(P + key, value);
    } catch (e) {}
}

function storageField(key) {
    try {
        return Lampa.Storage.field(key) ||
            Lampa.Storage.get(key) ||
            '';
    } catch (e) {
        return '';
    }
}

function enabled(key) {
    return String(
        storageGet(key, 'false')
    ) === 'true';
}

function cleanText(value) {
    return String(value || '')
        .replace(/[:\/\\|?*<>"']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/[^a-z0-9а-яіїєґё]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function sizeText(bytes) {
    var n = Number(bytes || 0);

    if (n >= GB) {
        return (n / GB).toFixed(1) + ' GB';
    }

    return (n / MB).toFixed(0) + ' MB';
}

function normalizeUrl(url) {
    url = String(url || '').trim();

    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
    }

    return url.replace(/\/+$/, '');
}

function errorText(error) {
    return error && error.message
        ? error.message
        : String(error);
}

function delay(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

function create(tag, className, text) {
    var el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    if (text !== undefined && text !== null) {
        el.textContent = String(text);
    }

    return el;
}

function isSeries(movie) {
    return !!(
        movie &&
        (
            movie.media_type === 'tv' ||
            movie.first_air_date ||
            movie.number_of_seasons
        ) &&
        !movie.release_date
    );
}

function movieTitle(movie) {
    return movie.title ||
        movie.name ||
        movie.original_title ||
        movie.original_name ||
        'Відео';
}

function movieYear(movie) {
    return String(
        movie.release_date ||
        movie.first_air_date ||
        ''
    ).slice(0, 4);
}

function moviePoster(movie) {
    var path = movie.poster_path || movie.img || '';

    if (path.charAt(0) === '/') {
        return 'https://image.tmdb.org/t/p/w500' + path;
    }

    return path;
}

function clearCache() {
    cache = {};
    cacheOrder = [];
}

function checkOperation(id) {
    if (id !== operationId) {
        throw Error('Операцію скасовано');
    }
}

/* ========================================
   NOTIFICATIONS
======================================== */

function notify(message) {
    var old = document.getElementById(
        'uadv632-toast'
    );

    if (old && old.parentNode) {
        old.parentNode.removeChild(old);
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    var el = create(
        'div',
        'uadv632-toast',
        message
    );

    el.id = 'uadv632-toast';

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
        }, 250);
    }, 3000);
}

/* ========================================
   NETWORK
======================================== */

async function httpRequest(url, options, timeout) {
    var controller = new AbortController();

    var timer = setTimeout(function () {
        controller.abort();
    }, timeout || 12000);

    var external = options && options.signal;

    function abort() {
        controller.abort();
    }

    if (external) {
        if (external.aborted) {
            controller.abort();
        } else {
            external.addEventListener('abort', abort);
        }
    }

    try {
        var opt = Object.assign(
            {},
            options || {},
            {
                signal: controller.signal
            }
        );

        var response = await fetch(url, opt);

        if (!response.ok) {
            throw Error(
                'HTTP ' + response.status
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
   JACKETT CONFIGURATION
======================================== */

function jackettConfig() {
    var url = storageField('jackett_url');

    if (!url) {
        throw Error(
            'Не налаштовано адресу Jackett'
        );
    }

    url = normalizeUrl(url);

    /*
     * Preserve installations using /jackett
     * as a reverse-proxy prefix.
     */
    url = url.replace(
        /\/api\/v2\.0.*$/i,
        ''
    );

    return {
        base: url,
        key: storageField('jackett_key')
    };
}

/* ========================================
   XML PARSER
======================================== */

function parseXML(text) {
    var doc = new DOMParser().parseFromString(
        text,
        'application/xml'
    );

    if (
        doc.getElementsByTagName(
            'parsererror'
        ).length
    ) {
        throw Error(
            'Помилка XML Jackett'
        );
    }

    return Array.prototype.map.call(
        doc.getElementsByTagName('item'),
        function (item) {
            var attrs = {};

            Array.prototype.forEach.call(
                item.getElementsByTagName('*'),
                function (el) {
                    if (
                        el.localName === 'attr' &&
                        el.getAttribute('name')
                    ) {
                        attrs[
                            el.getAttribute('name').toLowerCase()
                        ] = el.getAttribute('value') || '';
                    }
                }
            );

            function value(tag) {
                var nodes = item.getElementsByTagName(tag);

                return nodes.length
                    ? String(
                        nodes[0].textContent || ''
                    ).trim()
                    : '';
            }

            var enclosure =
                item.getElementsByTagName(
                    'enclosure'
                )[0];

            var download = enclosure
                ? enclosure.getAttribute('url') || ''
                : '';

            var magnet = attrs.magneturl || '';

            return {
                title: value('title'),
                link: magnet ||
                    download ||
                    value('link'),
                magnet: magnet,
                dl: download,
                size: Number(
                    value('size') ||
                    attrs.size ||
                    (
                        enclosure &&
                        enclosure.getAttribute('length')
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
                    ''
                )
            };
        }
    );
}

/* ========================================
   JSON PARSER
======================================== */

function parseJSON(json) {
    var items = Array.isArray(json)
        ? json
        : (
            json.Results ||
            json.results ||
            json.items ||
            []
        );

    if (!Array.isArray(items)) {
        return [];
    }

    return items.map(function (item) {
        var magnet =
            item.MagnetUri ||
            item.MagnetUrl ||
            item.magnet ||
            '';

        return {
            title: item.Title ||
                item.title ||
                '',
            link: magnet ||
                item.DownloadUrl ||
                item.downloadUrl ||
                item.Link ||
                item.link ||
                '',
            magnet: magnet,
            dl: item.DownloadUrl ||
                item.downloadUrl ||
                '',
            size: Number(
                item.Size ||
                item.size ||
                0
            ),
            seed: Number(
                item.Seeders ||
                item.seeders ||
                item.Peers ||
                item.peers ||
                0
            ),
            tracker: String(
                item.Tracker ||
                item.tracker ||
                item.TrackerId ||
                ''
            )
        };
    });
}

/* ========================================
   JACKETT SEARCH
======================================== */

async function searchJackett(
    query,
    categories,
    mode,
    signal
) {
    var cfg = jackettConfig();

    var params = new URLSearchParams();

    if (cfg.key) {
        params.set(
            'apikey',
            cfg.key
        );
    }

    var endpoint;

    if (mode === 'xml') {
        params.set('t', 'search');
        params.set('q', query);

        categories.split(',').forEach(
            function (cat) {
                params.append(
                    'cat',
                    cat
                );
            }
        );

        endpoint =
            '/api/v2.0/indexers/all/results/torznab/';
    } else {
        params.set('Query', query);

        categories.split(',').forEach(
            function (cat) {
                params.append(
                    'Category[]',
                    cat
                );
            }
        );

        endpoint =
            '/api/v2.0/indexers/all/results';
    }

    var url = cfg.base +
        endpoint +
        '?' +
        params.toString();

    var response = await httpRequest(
        url,
        {
            method: 'GET',
            signal: signal
        },
        14000
    );

    if (mode === 'xml') {
        return parseXML(
            await response.text()
        );
    }

    return parseJSON(
        await response.json()
    );
}

/* ========================================
   SEARCH QUERIES
======================================== */

function searchQueries(movie) {
    var original = cleanText(
        movie.original_title ||
        movie.original_name ||
        movieTitle(movie)
    );

    var local = cleanText(
        movie.title ||
        movie.name ||
        original
    );

    var year = movieYear(movie);
    var series = isSeries(movie);

    var queries = [];

    function add(value) {
        value = cleanText(value);

        if (
            value &&
            queries.indexOf(value) === -1
        ) {
            queries.push(value);
        }
    }

    /*
     * Broad search:
     * do not restrict to four variants.
     */
    if (year && !series) {
        add(original + ' ' + year);
        add(local + ' ' + year);
    }

    add(original);
    add(local);

    if (
        normalize(original) !==
        normalize(local)
    ) {
        add(original + ' ' + local);
        add(local + ' ' + original);
    }

    /*
     * Alternative punctuation-free variants.
     */
    add(
        normalize(original)
    );

    add(
        normalize(local)
    );

    /*
     * Series-specific queries.
     */
    if (series) {
        add(original + ' S01');
        add(local + ' S01');
    }

    return queries;
}

/* ========================================
   UKRAINIAN AUDIO DETECTION
======================================== */

function hasUkrainianAudio(title) {
    var t = String(title || '');

    return /(?:^|[^a-zа-яіїєґ0-9])(?:ukr|ukrainian|українська|українською|укр(?:аїнська)?[. _-]*(?:озвучка|дубляж|дубл|звук|аудіо)|ua[. _-]*(?:dub|audio|voice|озвучка|дубляж)|(?:озвучка|дубляж|аудіо|мова)[. _:-]*(?:укр|українська)|ukr[. _-]*(?:dub|audio|voice))(?:$|[^a-zа-яіїєґ0-9])/i.test(t);
}

/* ========================================
   RELEASE QUALITY
======================================== */

function releaseInfo(release) {
    var title = String(
        release.title || ''
    );

    return {
        fourK: /2160p|\b4k\b|\buhd\b/i.test(title),
        fullHD: /1080p/i.test(title),

        dv: /dolby[ ._-]*vision|\bdovi\b|(?:^|[ ._-])dv(?:$|[ ._-])/i.test(title),

        hdrPlus: /hdr[ ._-]*10\+/i.test(title),

        hdr: /\bhdr(?:10)?\b/i.test(title),

        remux: /remux/i.test(title),

        bluray: /blu[ ._-]?ray|bdrip|bdmv/i.test(title),

        webdl: /web[ ._-]?dl/i.test(title),

        atmos: /atmos|truehd/i.test(title),

        dts: /dts[ ._-]?(?:hd|x)/i.test(title),

        eac3: /e[ ._-]?ac[ ._-]?3|ddp/i.test(title),

        ua: hasUkrainianAudio(title)
    };
}

function titleSimilarity(release, movie) {
    var releaseName = normalize(
        release.title
    );

    var names = [
        normalize(
            movie.original_title ||
            movie.original_name ||
            ''
        ),
        normalize(
            movie.title ||
            movie.name ||
            ''
        )
    ];

    var best = 0;

    names.forEach(function (name) {
        if (!name) return;

        if (
            releaseName.indexOf(name) !== -1
        ) {
            best = Math.max(best, 100);
            return;
        }

        var words = name.split(' ').filter(
            function (word) {
                return word.length > 1;
            }
        );

        if (!words.length) return;

        var found = words.filter(
            function (word) {
                return releaseName
                    .split(' ')
                    .indexOf(word) !== -1;
            }
        ).length;

        best = Math.max(
            best,
            Math.round(
                found / words.length * 100
            )
        );
    });

    return best;
}

function releaseScore(release, movie) {
    var f = releaseInfo(release);
    var score = 0;

    var quality = String(
        storageGet('quality', '4k')
    );

    if (quality === '1080') {
        score += f.fullHD ? 240 :
            f.fourK ? 110 : 0;
    } else {
        score += f.fourK ? 240 :
            f.fullHD ? 110 : 0;
    }

    var hdr = String(
        storageGet('hdr', 'dv')
    );

    if (hdr === 'sdr') {
        score += (
            !f.dv &&
            !f.hdrPlus &&
            !f.hdr
        ) ? 90 : 0;
    } else if (hdr === 'hdr') {
        score += f.hdrPlus ? 90 :
            f.hdr ? 80 :
            f.dv ? 65 : 0;
    } else {
        score += f.dv ? 100 :
            f.hdrPlus ? 80 :
            f.hdr ? 65 : 0;
    }

    var source = String(
        storageGet('source', 'auto')
    );

    if (source === 'webdl') {
        score += f.webdl ? 65 :
            f.remux ? 50 :
            f.bluray ? 40 : 0;
    } else if (source === 'bluray') {
        score += f.bluray && !f.remux ? 65 :
            f.remux ? 58 :
            f.webdl ? 40 : 0;
    } else {
        score += f.remux ? 65 :
            f.bluray ? 55 :
            f.webdl ? 40 : 0;
    }

    var audio = String(
        storageGet('audio', 'auto')
    );

    if (
        (audio === 'atmos' && f.atmos) ||
        (audio === 'dts' && f.dts) ||
        (audio === 'eac3' && f.eac3)
    ) {
        score += 25;
    }

    if (f.ua) {
        score += 150;
    }

    score += Math.min(
        30,
        Math.log2(
            Math.max(0, release.seed) + 1
        ) * 4
    );

    score += Math.min(
        12,
        release.size / GB / 6
    );

    /*
     * Soft relevance ranking instead of
     * strict filtering.
     */
    score += titleSimilarity(
        release,
        movie
    ) * 0.5;

    var year = movieYear(movie);

    if (
        year &&
        String(release.title)
            .indexOf(year) !== -1
    ) {
        score += 15;
    }

    return score;
}

/* ========================================
   RELEASE DEDUPLICATION
======================================== */

function releaseKey(release) {
    var link = release.magnet ||
        release.link ||
        '';

    var hash = link.match(
        /[?&]xt=urn:btih:([^&]+)/i
    );

    if (hash) {
        return hash[1].toLowerCase();
    }

    return normalize(
        release.title
    ) + ':' + release.size;
}

/* ========================================
   FIND RELEASES
======================================== */

async function findReleases(movie, id) {
    var series = isSeries(movie);

    var categories = series
        ? SERIES_CATS
        : MOVIE_CATS;

    var queries = searchQueries(movie);

    var cfg = jackettConfig();

    var cacheKey = [
        cfg.base,
        cfg.key,
        categories,
        queries.join('|'),
        storageGet('minSeeds', '5'),
        storageGet('maxSize', '70'),
        storageGet('quality', '4k'),
        storageGet('hdr', 'dv'),
        storageGet('source', 'auto'),
        storageGet('audio', 'auto')
    ].join('~');

    if (
        cache[cacheKey] &&
        Date.now() -
        cache[cacheKey].time < 300000
    ) {
        return cache[cacheKey].items.slice();
    }

    var results = [];
    var errors = [];
    var succeeded = false;

    /*
     * Search every query.
     * Do not stop after first UA release.
     */
    for (var i = 0; i < queries.length; i++) {
        checkOperation(id);

        var settled = await Promise.allSettled([
            searchJackett(
                queries[i],
                categories,
                'xml',
                activeController.signal
            ),
            searchJackett(
                queries[i],
                categories,
                'json',
                activeController.signal
            )
        ]);

        settled.forEach(function (item) {
            if (item.status === 'fulfilled') {
                succeeded = true;

                results = results.concat(
                    item.value
                );
            } else {
                errors.push(
                    errorText(item.reason)
                );
            }
        });
    }

    checkOperation(id);

    if (!succeeded) {
        throw Error(
            'Jackett недоступний: ' +
            (errors[0] || 'Помилка пошуку')
        );
    }

    var minSeeds = Number(
        storageGet('minSeeds', '5')
    );

    var maxSize = Number(
        storageGet('maxSize', '70')
    ) * GB;

    var seen = {};

    results = results.filter(function (r) {
        if (
            !r.title ||
            !r.link
        ) {
            return false;
        }

        /*
         * Missing size or seed count should
         * not automatically hide a release.
         */
        if (
            r.seed > 0 &&
            r.seed < minSeeds
        ) {
            return false;
        }

        if (
            !series &&
            r.size > 0 &&
            r.size > maxSize
        ) {
            return false;
        }

        /*
         * Exclude only clearly unrelated
         * titles. Partial matches remain.
         */
        var similarity = titleSimilarity(
            r,
            movie
        );

        if (similarity < 35) {
            return false;
        }

        var key = releaseKey(r);

        if (seen[key]) {
            return false;
        }

        seen[key] = true;

        return true;
    });

    var toloka = enabled('toloka');

    results.sort(function (a, b) {
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

        return releaseScore(b, movie) -
            releaseScore(a, movie);
    });

    if (cacheOrder.length >= 20) {
        delete cache[
            cacheOrder.shift()
        ];
    }

    cacheOrder.push(cacheKey);

    cache[cacheKey] = {
        time: Date.now(),
        items: results.slice()
    };

    log(
        'Search:',
        queries.length,
        'queries,',
        results.length,
        'releases'
    );

    return results;
}

/* ========================================
   TORRSERVER
======================================== */

function torrServerBase() {
    var url = storageField(
        'torrserver_url'
    );

    if (!url) {
        throw Error(
            'Не налаштовано TorrServer'
        );
    }

    return normalizeUrl(url);
}

function torrServerHeaders() {
    var headers = {
        'Content-Type': 'application/json'
    };

    var token = storageField(
        'torrserver_token'
    );

    var user =
        storageField('torrserver_user') ||
        storageField('torrserver_login');

    var pass =
        storageField('torrserver_pass') ||
        storageField('torrserver_password');

    if (token) {
        headers.Authorization =
            'Bearer ' + token;
    } else if (user || pass) {
        try {
            headers.Authorization =
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

    return headers;
}

async function torrServerPost(data, timeout) {
    var response = await httpRequest(
        torrServerBase() + '/torrents',
        {
            method: 'POST',
            headers: torrServerHeaders(),
            body: JSON.stringify(data),
            signal: activeController
                ? activeController.signal
                : undefined
        },
        timeout || 12000
    );

    return response.json();
}

function torrentHash(result, fallback) {
    if (
        !result ||
        typeof result !== 'object'
    ) {
        return fallback;
    }

    return result.hash ||
        result.Hash ||
        result.id ||
        result.Id ||
        fallback;
}

function torrentFiles(result) {
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

async function addTorrent(release, movie, id) {
    var link =
        release.magnet ||
        release.dl ||
        release.link;

    if (!link) {
        throw Error(
            'Відсутнє посилання на торрент'
        );
    }

    var response = await torrServerPost(
        {
            action: 'add',
            link: link,
            title: '[LAMPA] ' + movieTitle(movie),
            poster: moviePoster(movie),
            save_to_db: false
        },
        18000
    );

    checkOperation(id);

    return {
        hash: torrentHash(
            response,
            link
        ),
        link: link
    };
}

async function getTorrentFiles(hash, link, id) {
    for (var i = 0; i < 10; i++) {
        checkOperation(id);

        try {
            var data = await torrServerPost(
                {
                    action: 'get',
                    hash: hash
                },
                11000
            );

            var files = torrentFiles(data);

            if (
                Array.isArray(files) &&
                files.length
            ) {
                return files;
            }
        } catch (e) {
            log(
                'TorrServer files:',
                errorText(e)
            );
        }

        if (i < 9) {
            await delay(1200);
        }
    }

    throw Error(
        'TorrServer не повернув список файлів'
    );
}

function filePath(file) {
    return String(
        file.path ||
        file.Path ||
        file.name ||
        file.Name ||
        ''
    );
}

function fileSize(file) {
    return Number(
        file.length ||
        file.Length ||
        file.size ||
        file.Size ||
        0
    );
}

function fileIndex(file, fallback) {
    /*
     * TorrServer file_stats.id is commonly
     * zero-based, while stream index is
     * one-based. Preserve explicit stream
     * indexes when available.
     */
    if (file.stream_index != null) {
        return Number(file.stream_index);
    }

    if (file.StreamIndex != null) {
        return Number(file.StreamIndex);
    }

    var raw = file.id != null
        ? file.id
        : file.Id != null
            ? file.Id
            : file.index != null
                ? file.index
                : file.Index;

    if (raw == null) {
        return fallback + 1;
    }

    var number = Number(raw);

    if (!isFinite(number)) {
        return fallback + 1;
    }

    return number + 1;
}

function videoFiles(files) {
    return files.map(function (file, index) {
        return {
            path: filePath(file),
            size: fileSize(file),
            index: fileIndex(
                file,
                index
            )
        };
    }).filter(function (entry) {
        return VIDEO_EXT.test(entry.path) &&
            entry.size > 100 * MB &&
            !/\b(sample|trailer|featurette|extra)\b/i.test(
                entry.path
            );
    });
}

function streamBase() {
    var base = torrServerBase();

    var user =
        storageField('torrserver_user') ||
        storageField('torrserver_login');

    var pass =
        storageField('torrserver_pass') ||
        storageField('torrserver_password');

    if (user || pass) {
        try {
            var url = new URL(base);

            url.username = user;
            url.password = pass;

            return url.toString()
                .replace(/\/+$/, '');
        } catch (e) {}
    }

    return base;
}

function streamUrl(hash, file) {
    var filename = file.path
        .split(/[\\/]/)
        .pop() || 'video.mkv';

    return streamBase() +
        '/stream/' +
        encodeURIComponent(filename) +
        '?link=' +
        encodeURIComponent(hash) +
        '&index=' +
        file.index +
        '&play=1';
}

/* ========================================
   PLAYER
======================================== */

function startPlayer(url, title) {
    closeDialog();

    if (
        Lampa.Player &&
        typeof Lampa.Player.play === 'function'
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
    notify('Перевіряю файли торента…');

    var added = await addTorrent(
        release,
        movie,
        id
    );

    var files = videoFiles(
        await getTorrentFiles(
            added.hash,
            added.link,
            id
        )
    );

    checkOperation(id);

    if (!files.length) {
        throw Error(
            'У торренті немає відеофайлів'
        );
    }

    files.sort(function (a, b) {
        return b.size - a.size;
    });

    var largest = files[0];

    var total = files.reduce(
        function (sum, file) {
            return sum + file.size;
        },
        0
    );

    if (
        files.length > 1 &&
        largest.size < total * 0.55
    ) {
        showFilePicker(
            movie,
            added.hash,
            files
        );

        return;
    }

    startPlayer(
        streamUrl(
            added.hash,
            largest
        ),
        movieTitle(movie)
    );
}

/* ========================================
   PREMIUM DIALOG SYSTEM
======================================== */

function closeDialog() {
    if (!currentDialog) return;

    var dialog = currentDialog;
    currentDialog = null;

    dialog.destroy();
}

function dialogBadges(release) {
    var info = releaseInfo(release);
    var badges = [];

    if (info.fourK) {
        badges.push({
            text: '4K ULTRA HD',
            type: 'quality'
        });
    } else if (info.fullHD) {
        badges.push({
            text: '1080P',
            type: 'normal'
        });
    }

    if (info.dv) {
        badges.push({
            text: 'DOLBY VISION',
            type: 'dv'
        });
    } else if (info.hdrPlus) {
        badges.push({
            text: 'HDR10+',
            type: 'hdr'
        });
    } else if (info.hdr) {
        badges.push({
            text: 'HDR',
            type: 'hdr'
        });
    }

    if (info.remux) {
        badges.push({
            text: 'REMUX',
            type: 'normal'
        });
    } else if (info.bluray) {
        badges.push({
            text: 'BLU-RAY',
            type: 'normal'
        });
    } else if (info.webdl) {
        badges.push({
            text: 'WEB-DL',
            type: 'normal'
        });
    }

    if (info.atmos) {
        badges.push({
            text: 'ATMOS',
            type: 'normal'
        });
    } else if (info.dts) {
        badges.push({
            text: 'DTS-HD',
            type: 'normal'
        });
    }

    if (info.ua) {
        badges.push({
            text: 'УКРАЇНСЬКА',
            type: 'ua'
        });
    }

    return badges;
}

function openDialog(config) {
    closeDialog();

    var id = ++dialogCounter;

    var items = config.items || [];
    var selected = 0;
    var closed = false;
    var openingTime = Date.now();

    var previousFocus = document.activeElement;
    var previousController = '';

    try {
        if (
            Lampa.Controller &&
            typeof Lampa.Controller.enabled === 'function'
        ) {
            previousController =
                Lampa.Controller.enabled() || '';
        }
    } catch (e) {}

    var overlay = create(
        'div',
        'uadv632-overlay'
    );

    var panel = create(
        'div',
        'uadv632-panel'
    );

    if (
        storageGet('design', 'premium') ===
        'compact'
    ) {
        panel.classList.add(
            'uadv632-compact'
        );
    }

    var header = create(
        'div',
        'uadv632-header'
    );

    var headerText = create(
        'div',
        'uadv632-header-text'
    );

    var eyebrow = create(
        'div',
        'uadv632-eyebrow',
        '4K PRO  /  RELEASE MANAGER'
    );

    var title = create(
        'div',
        'uadv632-title',
        config.title || '4K Pro'
    );

    var subtitle = create(
        'div',
        'uadv632-subtitle',
        config.subtitle || ''
    );

    headerText.appendChild(eyebrow);
    headerText.appendChild(title);

    if (config.subtitle) {
        headerText.appendChild(subtitle);
    }

    var closeButton = create(
        'button',
        'uadv632-close',
        '✕'
    );

    closeButton.type = 'button';

    header.appendChild(headerText);
    header.appendChild(closeButton);

    var list = create(
        'div',
        'uadv632-list'
    );

    var footer = create(
        'div',
        'uadv632-footer'
    );

    footer.appendChild(
        create(
            'span',
            '',
            '↑ ↓  Навігація'
        )
    );

    footer.appendChild(
        create(
            'span',
            '',
            'OK  Вибрати'
        )
    );

    footer.appendChild(
        create(
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

    function focus(index) {
        if (closed || !rows.length) return;

        selected = Math.max(
            0,
            Math.min(
                rows.length - 1,
                index
            )
        );

        rows.forEach(function (row, i) {
            row.classList.toggle(
                'uadv632-focused',
                i === selected
            );
        });

        try {
            rows[selected].focus({
                preventScroll: true
            });
        } catch (e) {
            rows[selected].focus();
        }

        try {
            rows[selected].scrollIntoView({
                block: 'nearest'
            });
        } catch (e) {}
    }

    function restoreController() {
        try {
            if (
                previousController &&
                previousController !==
                    DIALOG_CONTROLLER &&
                Lampa.Controller &&
                typeof Lampa.Controller.toggle ===
                    'function'
            ) {
                Lampa.Controller.toggle(
                    previousController
                );
            }
        } catch (e) {}
    }

    function destroy() {
        if (closed) return;

        closed = true;

        document.removeEventListener(
            'keydown',
            keydown,
            true
        );

        document.removeEventListener(
            'keyup',
            keyup,
            true
        );

        document.removeEventListener(
            'pointerdown',
            pointerCapture,
            true
        );

        if (overlay.parentNode) {
            overlay.parentNode.removeChild(
                overlay
            );
        }

        if (
            currentDialog &&
            currentDialog.id === id
        ) {
            currentDialog = null;
        }

        restoreController();

        if (
            previousFocus &&
            document.contains(previousFocus)
        ) {
            try {
                previousFocus.focus();
            } catch (e) {}
        }
    }

    function back() {
        if (closed) return;

        destroy();

        if (
            typeof config.onBack ===
            'function'
        ) {
            setTimeout(function () {
                config.onBack();
            }, 80);
        }
    }

    function activate(index) {
        if (
            closed ||
            !items[index]
        ) {
            return;
        }

        var now = Date.now();

        if (
            now - openingTime < 180 ||
            now - lastActivation < 220
        ) {
            return;
        }

        lastActivation = now;

        var action = items[index].action;

        /*
         * Destroy first, execute next.
         * Prevents repeated Enter from
         * activating the new dialog.
         */
        destroy();

        if (typeof action === 'function') {
            setTimeout(function () {
                try {
                    action();
                } catch (e) {
                    log(
                        'Dialog action:',
                        e
                    );

                    notify(
                        errorText(e)
                    );
                }
            }, 100);
        }
    }

    function keydown(e) {
        if (closed) return;

        var code = e.keyCode || e.which;
        var key = e.key || '';

        var isBack =
            key === 'Escape' ||
            key === 'Backspace' ||
            key === 'BrowserBack' ||
            code === 27 ||
            code === 8 ||
            code === 461 ||
            code === 10009;

        var isUp =
            key === 'ArrowUp' ||
            code === 38;

        var isDown =
            key === 'ArrowDown' ||
            code === 40;

        var isEnter =
            key === 'Enter' ||
            key === 'NumpadEnter' ||
            code === 13;

        if (
            !isBack &&
            !isUp &&
            !isDown &&
            !isEnter
        ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (e.stopImmediatePropagation) {
            e.stopImmediatePropagation();
        }

        if (isBack) {
            if (!e.repeat) back();
            return;
        }

        if (isUp) {
            focus(selected - 1);
            return;
        }

        if (isDown) {
            focus(selected + 1);
            return;
        }

        if (isEnter && !e.repeat) {
            activate(selected);
        }
    }

    function keyup(e) {
        if (closed) return;

        var code = e.keyCode || e.which;

        if (
            code === 13 ||
            code === 8 ||
            code === 27 ||
            code === 461 ||
            code === 10009
        ) {
            e.preventDefault();
            e.stopPropagation();

            if (e.stopImmediatePropagation) {
                e.stopImmediatePropagation();
            }
        }
    }

    function pointerCapture(e) {
        if (closed) return;

        if (overlay.contains(e.target)) {
            e.stopPropagation();
        }
    }

    items.forEach(function (item, index) {
        var card = create(
            'div',
            'uadv632-card selector'
        );

        card.tabIndex = 0;

        if (item.featured) {
            card.classList.add(
                'uadv632-featured'
            );
        }

        var body = create(
            'div',
            'uadv632-card-body'
        );

        if (item.featured) {
            var recommended = create(
                'div',
                'uadv632-recommended',
                '★  РЕКОМЕНДОВАНО'
            );

            body.appendChild(
                recommended
            );
        }

        var name = create(
            'div',
            'uadv632-card-title',
            item.title || ''
        );

        body.appendChild(name);

        if (
            item.badges &&
            item.badges.length
        ) {
            var badges = create(
                'div',
                'uadv632-badges'
            );

            item.badges.forEach(function (badge) {
                var badgeEl = create(
                    'span',
                    'uadv632-badge ' +
                        'uadv632-badge-' +
                        (badge.type || 'normal'),
                    badge.text
                );

                badges.appendChild(
                    badgeEl
                );
            });

            body.appendChild(badges);
        }

        if (item.stats) {
            var stats = create(
                'div',
                'uadv632-stats'
            );

            item.stats.forEach(function (stat) {
                var cell = create(
                    'div',
                    'uadv632-stat'
                );

                cell.appendChild(
                    create(
                        'div',
                        'uadv632-stat-label',
                        stat.label
                    )
                );

                cell.appendChild(
                    create(
                        'div',
                        'uadv632-stat-value',
                        stat.value
                    )
                );

                stats.appendChild(cell);
            });

            body.appendChild(stats);
        }

        if (item.subtitle) {
            body.appendChild(
                create(
                    'div',
                    'uadv632-card-subtitle',
                    item.subtitle
                )
            );
        }

        card.appendChild(body);

        card.appendChild(
            create(
                'div',
                'uadv632-card-arrow',
                '›'
            )
        );

        card.addEventListener(
            'focus',
            function () {
                selected = index;

                rows.forEach(function (row, i) {
                    row.classList.toggle(
                        'uadv632-focused',
                        i === selected
                    );
                });
            }
        );

        card.addEventListener(
            'click',
            function (e) {
                if (e.detail === 0) return;

                e.preventDefault();
                e.stopPropagation();

                activate(index);
            }
        );

        list.appendChild(card);
        rows.push(card);
    });

    closeButton.addEventListener(
        'click',
        function (e) {
            e.preventDefault();
            e.stopPropagation();
            back();
        }
    );

    overlay.addEventListener(
        'click',
        function (e) {
            if (e.target === overlay) {
                back();
            }
        }
    );

    document.addEventListener(
        'keydown',
        keydown,
        true
    );

    document.addEventListener(
        'keyup',
        keyup,
        true
    );

    document.addEventListener(
        'pointerdown',
        pointerCapture,
        true
    );

    /*
     * Lampa Controller integration.
     * Back action is registered explicitly.
     */
    try {
        if (
            Lampa.Controller &&
            typeof Lampa.Controller.add ===
                'function'
        ) {
            Lampa.Controller.add(
                DIALOG_CONTROLLER,
                {
                    toggle: function () {
                        focus(selected);
                    },
                    up: function () {
                        focus(selected - 1);
                    },
                    down: function () {
                        focus(selected + 1);
                    },
                    left: function () {},
                    right: function () {},
                    enter: function () {
                        activate(selected);
                    },
                    back: function () {
                        back();
                    }
                }
            );

            if (
                typeof Lampa.Controller.toggle ===
                'function'
            ) {
                Lampa.Controller.toggle(
                    DIALOG_CONTROLLER
                );
            }
        }
    } catch (e) {
        log(
            'Controller fallback:',
            errorText(e)
        );
    }

    currentDialog = {
        id: id,
        destroy: destroy,
        back: back
    };

    requestAnimationFrame(function () {
        if (closed) return;

        overlay.classList.add(
            'uadv632-visible'
        );

        focus(0);
    });
}

/* ========================================
   RELEASE PICKER
======================================== */

function showReleasePicker(movie, releases) {
    var items = releases.slice(0, 80).map(
        function (release, index) {
            return {
                title: release.title,
                featured: index === 0,
                badges: dialogBadges(release),
                stats: [
                    {
                        label: 'РОЗМІР',
                        value: sizeText(
                            release.size
                        )
                    },
                    {
                        label: 'СІДЕРИ',
                        value: String(
                            release.seed
                        )
                    },
                    {
                        label: 'ОЗВУЧКА',
                        value: hasUkrainianAudio(
                            release.title
                        )
                            ? 'UA'
                            : 'Не визначено'
                    }
                ],
                subtitle:
                    release.tracker || '',
                action: function () {
                    execute(function (id) {
                        return startMovie(
                            movie,
                            release,
                            id
                        );
                    });
                }
            };
        }
    );

    openDialog({
        title: 'Доступні релізи',
        subtitle:
            'Знайдено ' +
            releases.length +
            ' варіантів · Вибери якість',
        items: items
    });
}

/* ========================================
   NO UKRAINIAN AUDIO DIALOG
======================================== */

function showFallbackPicker(movie, releases) {
    openDialog({
        title: 'Українську озвучку не підтверджено',
        subtitle:
            'Можна переглянути інші доступні релізи',
        items: [
            {
                title: 'Показати інші релізи',
                subtitle:
                    'Доступно: ' +
                    releases.length +
                    ' · Ручний вибір',
                badges: [
                    {
                        text: 'ПЕРЕГЛЯНУТИ',
                        type: 'quality'
                    }
                ],
                action: function () {
                    showReleasePicker(
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
    });
}

/* ========================================
   FILE PICKER
======================================== */

function showFilePicker(movie, hash, files) {
    openDialog({
        title: 'Відеофайли',
        subtitle:
            'Вибери файл для відтворення',
        items: files.map(function (file) {
            return {
                title: file.path
                    .split(/[\\/]/)
                    .pop(),
                stats: [
                    {
                        label: 'РОЗМІР',
                        value: sizeText(
                            file.size
                        )
                    }
                ],
                action: function () {
                    startPlayer(
                        streamUrl(hash, file),
                        movieTitle(movie)
                    );
                }
            };
        })
    });
}

/* ========================================
   MOVIE FLOW
======================================== */

async function movieFlow(movie, releases, id) {
    var ukrainian = releases.filter(
        function (release) {
            return hasUkrainianAudio(
                release.title
            );
        }
    );

    if (ukrainian.length) {
        if (
            storageGet(
                'playMode',
                'auto'
            ) === 'manual'
        ) {
            showReleasePicker(
                movie,
                ukrainian
            );
        } else {
            await startMovie(
                movie,
                ukrainian[0],
                id
            );
        }

        return;
    }

    var policy = storageGet(
        'uaPolicy',
        'prefer'
    );

    if (policy === 'strict') {
        notify(
            'Українську озвучку не знайдено'
        );
        return;
    }

    var fallback = storageGet(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        notify(
            'Немає підтвердженої української озвучки'
        );
    } else if (fallback === 'auto') {
        await startMovie(
            movie,
            releases[0],
            id
        );
    } else {
        showFallbackPicker(
            movie,
            releases
        );
    }
}

/* ========================================
   SERIES
======================================== */

function seasonsFromTitle(title) {
    var text = String(title || '');
    var seasons = {};

    var range = /(?:season|сезон|\bS)\s*0*(\d{1,2})\s*[-–]\s*0*(\d{1,2})/i.exec(text);

    if (range) {
        var from = Number(range[1]);
        var to = Number(range[2]);

        if (
            from > 0 &&
            to >= from &&
            to - from <= 30
        ) {
            for (
                var n = from;
                n <= to;
                n++
            ) {
                seasons[n] = true;
            }
        }
    }

    var re = /\bS(\d{1,2})(?:E\d+|\b)|(?:season|сезон)\s*0*(\d{1,2})/gi;

    var match;

    while (
        (match = re.exec(text))
    ) {
        var number = Number(
            match[1] || match[2]
        );

        if (number > 0) {
            seasons[number] = true;
        }
    }

    return Object.keys(seasons)
        .map(Number);
}

function episodeFromPath(path, season) {
    var name = String(path || '')
        .split(/[\\/]/)
        .pop();

    var match =
        /S(\d{1,2})E(\d{1,3})/i.exec(name) ||
        /(\d{1,2})x(\d{1,3})/i.exec(name);

    if (match) {
        return Number(match[1]) === season
            ? Number(match[2])
            : 0;
    }

    match = /(?:episode|ep|серія|серия)[ ._-]*0*(\d{1,3})/i.exec(name);

    return match
        ? Number(match[1])
        : 0;
}

function showSeasons(movie, releases) {
    var groups = {};
    var unknown = [];

    releases.forEach(function (release) {
        var seasons = seasonsFromTitle(
            release.title
        );

        if (!seasons.length) {
            unknown.push(release);
            return;
        }

        seasons.forEach(function (number) {
            if (!groups[number]) {
                groups[number] = [];
            }

            groups[number].push(
                release
            );
        });
    });

    var numbers = Object.keys(groups)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    var items = numbers.map(
        function (number) {
            return {
                title:
                    'Сезон ' + number,
                subtitle:
                    'Релізів: ' +
                    groups[number].length,
                action: function () {
                    openSeason(
                        movie,
                        number,
                        groups[number]
                    );
                }
            };
        }
    );

    if (unknown.length) {
        items.push({
            title: 'Сезон не визначено',
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
        notify(
            'Не вдалося визначити сезони'
        );
        return;
    }

    openDialog({
        title: 'Сезони',
        subtitle:
            'Вибери сезон серіалу',
        items: items
    });
}

function chooseUnknownSeason(movie, releases) {
    var max = Math.max(
        1,
        Math.min(
            30,
            Number(
                movie.number_of_seasons || 10
            )
        )
    );

    var items = [];

    for (var i = 1; i <= max; i++) {
        (function (number) {
            items.push({
                title:
                    'Сезон ' + number,
                action: function () {
                    openSeason(
                        movie,
                        number,
                        releases
                    );
                }
            });
        })(i);
    }

    openDialog({
        title: 'Вибери сезон',
        items: items
    });
}

function openSeason(movie, season, releases) {
    execute(function (id) {
        return loadEpisodes(
            movie,
            season,
            releases,
            id
        );
    });
}

async function loadEpisodes(
    movie,
    season,
    releases,
    id
) {
    closeDialog();

    notify(
        'Шукаю серії сезону ' +
        season
    );

    var episodes = {};
    var limit = Math.min(
        8,
        releases.length
    );

    var successful = 0;

    for (var i = 0; i < limit; i++) {
        checkOperation(id);

        var release = releases[i];

        try {
            var added = await addTorrent(
                release,
                movie,
                id
            );

            var files = videoFiles(
                await getTorrentFiles(
                    added.hash,
                    added.link,
                    id
                )
            );

            successful++;

            files.forEach(function (file) {
                if (
                    file.size < 250 * MB
                ) {
                    return;
                }

                var episode = episodeFromPath(
                    file.path,
                    season
                );

                if (!episode) return;

                var rank = releaseScore(
                    release,
                    movie
                );

                if (
                    !episodes[episode] ||
                    rank >
                    episodes[episode].rank
                ) {
                    episodes[episode] = {
                        file: file,
                        hash: added.hash,
                        rank: rank
                    };
                }
            });
        } catch (e) {
            checkOperation(id);

            log(
                'Episode scan:',
                errorText(e)
            );
        }

        if (
            Object.keys(episodes)
                .length >= 24
        ) {
            break;
        }
    }

    checkOperation(id);

    var numbers = Object.keys(episodes)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        });

    if (!numbers.length) {
        throw Error(
            successful
                ? 'Не вдалося розпізнати серії'
                : 'TorrServer не прочитав файли'
        );
    }

    openDialog({
        title:
            'Сезон ' +
            season +
            ' · Серії',
        subtitle:
            'Знайдено ' +
            numbers.length +
            ' серій',
        onBack: function () {
            showSeasons(
                movie,
                releases
            );
        },
        items: numbers.map(
            function (number) {
                var episode =
                    episodes[number];

                return {
                    title:
                        'Серія ' + number,
                    subtitle:
                        episode.file.path,
                    stats: [
                        {
                            label: 'РОЗМІР',
                            value: sizeText(
                                episode.file.size
                            )
                        }
                    ],
                    action: function () {
                        startPlayer(
                            streamUrl(
                                episode.hash,
                                episode.file
                            ),
                            movieTitle(movie) +
                            ' S' + season +
                            'E' +
                            ('0' + number)
                                .slice(-2)
                        );
                    }
                };
            }
        )
    });
}

function seriesFlow(movie, releases) {
    var ukrainian = releases.filter(
        function (release) {
            return hasUkrainianAudio(
                release.title
            );
        }
    );

    if (ukrainian.length) {
        showSeasons(
            movie,
            ukrainian
        );
        return;
    }

    if (
        storageGet(
            'uaPolicy',
            'prefer'
        ) === 'strict'
    ) {
        notify(
            'Українську озвучку не знайдено'
        );
        return;
    }

    var fallback = storageGet(
        'fallback',
        'ask'
    );

    if (fallback === 'none') {
        notify(
            'Українську озвучку не знайдено'
        );
    } else if (fallback === 'auto') {
        showSeasons(
            movie,
            releases
        );
    } else {
        openDialog({
            title:
                'Українську озвучку не підтверджено',
            subtitle:
                'Доступні інші релізи серіалу',
            items: [
                {
                    title:
                        'Показати інші сезони',
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
        });
    }
}

/* ========================================
   OPERATIONS
======================================== */

async function execute(task) {
    if (busy) {
        notify(
            'Попередня операція ще виконується'
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
                'Operation error:',
                e
            );

            notify(
                errorText(e)
            );
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
                'Немає даних фільму'
            );
        }

        notify(
            'Шукаю: ' +
            movieTitle(movie)
        );

        var releases = await findReleases(
            movie,
            id
        );

        if (!releases.length) {
            throw Error(
                'Релізів не знайдено. Перевір Jackett або параметри пошуку.'
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
   SETTINGS
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
                    item.defaultValue
                )
            },
            field: {
                name: item.title,
                description:
                    item.description || ''
            },
            onChange: function (value) {
                storageSet(
                    item.name,
                    value
                );

                clearCache();
            }
        });
    } catch (e) {
        log(
            'Settings:',
            item.name,
            errorText(e)
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
            defaultValue: 'auto',
            values: {
                auto: 'Автоматично',
                manual: 'Вибір вручну'
            }
        },
        {
            name: 'uaPolicy',
            title: 'Українська озвучка',
            defaultValue: 'prefer',
            values: {
                strict: 'Тільки українська',
                prefer: 'Пріоритет української'
            }
        },
        {
            name: 'quality',
            title: 'Роздільність',
            defaultValue: '4k',
            values: {
                '4k': '4K / 2160p',
                '1080': 'Full HD / 1080p'
            }
        },
        {
            name: 'hdr',
            title: 'Пріоритет HDR',
            defaultValue: 'dv',
            values: {
                dv: 'Dolby Vision → HDR10+ → HDR',
                hdr: 'HDR10+ → HDR → DV',
                sdr: 'SDR'
            }
        },
        {
            name: 'source',
            title: 'Джерело',
            defaultValue: 'auto',
            values: {
                auto: 'REMUX → Blu-ray → WEB-DL',
                bluray: 'Blu-ray → REMUX → WEB-DL',
                webdl: 'WEB-DL → REMUX → Blu-ray'
            }
        },
        {
            name: 'audio',
            title: 'Звукова доріжка',
            defaultValue: 'auto',
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
            defaultValue: '5',
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
            title: 'Максимальний розмір',
            defaultValue: '70',
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
            defaultValue: 'false',
            values: {
                'false': 'Вимкнено',
                'true': 'Увімкнено'
            }
        },
        {
            name: 'fallback',
            title: 'Якщо немає української',
            defaultValue: 'ask',
            values: {
                ask: 'Запитати',
                none: 'Не запускати',
                auto: 'Запустити інший реліз'
            }
        },
        {
            name: 'design',
            title: 'Стиль інтерфейсу',
            defaultValue: 'premium',
            values: {
                premium: 'Premium Dark',
                compact: 'Compact TV'
            }
        }
    ].forEach(addSetting);
}

/* ========================================
   LAMPA BUTTON
======================================== */

function makeButton() {
    var element = create(
        'div',
        'full-start__button selector uadv632-button'
    );

    element.tabIndex = 0;

    element.setAttribute(
        'data-uadv632',
        '1'
    );

    element.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' +
        '<rect x="2" y="4" width="20" height="16" rx="4"/>' +
        '<path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none"/>' +
        '</svg>' +
        '<span>4K Pro</span>';

    return $(element);
}

function attachButton(root, event) {
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
            '[data-uadv632="1"]'
        ).length
    ) {
        return true;
    }

    bar.find(
        '[data-uadv630="1"],' +
        '[data-uadv6301="1"],' +
        '[data-uadv-button="1"]'
    ).remove();

    var button = makeButton();

    var lastClick = 0;

    function activate() {
        var now = Date.now();

        if (
            now - lastClick < 450
        ) {
            return;
        }

        lastClick = now;

        run(event.data);
    }

    button.on(
        'hover:enter click',
        activate
    );

    button.on(
        'keydown',
        function (e) {
            if (
                e.key === 'Enter' ||
                e.keyCode === 13
            ) {
                e.preventDefault();
                activate();
            }
        }
    );

    bar.prepend(button);

    return true;
}

function mountButton() {
    if (mounted) return;

    mounted = true;

    Lampa.Listener.follow(
        'full',
        function (event) {
            if (
                !event ||
                event.type !== 'complite' ||
                !event.object ||
                !event.data ||
                !event.data.movie
            ) {
                return;
            }

            var root;

            try {
                root = event.object.activity.render();
            } catch (e) {
                return;
            }

            if (
                !root ||
                !root.length
            ) {
                return;
            }

            if (
                attachButton(
                    root,
                    event
                )
            ) {
                return;
            }

            var observer =
                new MutationObserver(
                    function () {
                        if (
                            attachButton(
                                root,
                                event
                            )
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
   PREMIUM CSS
======================================== */

function injectStyles() {
    if (
        document.getElementById(
            STYLE_ID
        )
    ) {
        return;
    }

    var css = `

/* BUTTON */

.uadv632-button {
    display: inline-flex !important;
    align-items: center;
    gap: 9px;
    background: #263446 !important;
    border: 1px solid #526985 !important;
    border-radius: 11px !important;
    color: #fff !important;
    box-shadow: 0 6px 20px #0005;
}

.uadv632-button.focus,
.uadv632-button:hover {
    background: #456181 !important;
    border-color: #d3e4ff !important;
}

/* TOAST */

.uadv632-toast {
    position: fixed;
    z-index: 1000005;
    left: 50%;
    bottom: 7%;
    transform: translate(-50%,12px);
    max-width: 88vw;
    padding: 14px 22px;
    color: #f4f7fc;
    background: #1b2634;
    border: 1px solid #52647a;
    border-radius: 12px;
    box-shadow: 0 15px 45px #0009;
    text-align: center;
    font-size: 17px;
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s,transform .2s;
}

.uadv632-toast.visible {
    opacity: 1;
    transform: translate(-50%,0);
}

/* OVERLAY */

.uadv632-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000004;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2vh 2vw;
    box-sizing: border-box;
    background: rgba(4,8,15,.91);
    opacity: 0;
    transition: opacity .18s ease;
}

.uadv632-overlay.uadv632-visible {
    opacity: 1;
}

/* PANEL */

.uadv632-panel {
    display: flex;
    flex-direction: column;
    width: min(1100px,96vw);
    max-height: 91vh;
    overflow: hidden;
    color: #f3f6fc;
    background:
        linear-gradient(
            150deg,
            #202d3d 0%,
            #121b27 55%,
            #0d141e 100%
        );
    border: 1px solid #43556b;
    border-radius: 22px;
    box-shadow:
        0 28px 90px #000c,
        inset 0 1px 0 #ffffff12;
    transform: translateY(14px) scale(.985);
    transition: transform .2s ease;
}

.uadv632-visible .uadv632-panel {
    transform: translateY(0) scale(1);
}

/* HEADER */

.uadv632-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 25px 30px;
    border-bottom: 1px solid #3a4a5d;
    background:
        linear-gradient(
            90deg,
            #31455f88,
            #17233155
        );
}

.uadv632-header-text {
    min-width: 0;
}

.uadv632-eyebrow {
    color: #9ebfe3;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 9px;
}

.uadv632-title {
    color: #fff;
    font-size: 29px;
    font-weight: 800;
    line-height: 1.2;
}

.uadv632-subtitle {
    color: #a9b9cc;
    font-size: 15px;
    margin-top: 9px;
}

.uadv632-close {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 12px;
    border: 1px solid #586c82;
    background: #304154;
    color: #fff;
    font-size: 22px;
    cursor: pointer;
}

.uadv632-close:hover,
.uadv632-close:focus {
    background: #58728f;
}

/* LIST */

.uadv632-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 17px;
    scrollbar-width: thin;
    scrollbar-color: #607993 transparent;
}

/* PREMIUM CARDS */

.uadv632-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 12px;
    padding: 19px 22px;
    background:
        linear-gradient(
            125deg,
            #26364a,
            #1b2838
        );
    border: 1px solid #3b4d63;
    border-radius: 16px;
    outline: none;
    cursor: pointer;
    box-shadow: 0 5px 15px #0003;
    transition:
        background .12s ease,
        border-color .12s ease,
        box-shadow .12s ease;
}

.uadv632-card:hover,
.uadv632-card.uadv632-focused {
    background:
        linear-gradient(
            125deg,
            #3d5471,
            #2b3d53
        );
    border-color: #c5dcff;
    box-shadow:
        inset 0 0 0 1px #c5dcff,
        0 8px 24px #0005;
}

.uadv632-card-body {
    flex: 1;
    min-width: 0;
}

.uadv632-card-title {
    color: #fff;
    font-size: 20px;
    font-weight: 750;
    line-height: 1.4;
    overflow-wrap: anywhere;
}

.uadv632-card-subtitle {
    margin-top: 12px;
    color: #a9bad0;
    font-size: 13px;
    overflow-wrap: anywhere;
}

.uadv632-card-arrow {
    flex-shrink: 0;
    color: #9ab5d2;
    font-size: 38px;
    font-weight: 300;
}

.uadv632-focused .uadv632-card-arrow {
    color: #fff;
}

/* RECOMMENDED */

.uadv632-featured {
    border-color: #647fa0;
}

.uadv632-recommended {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    margin-bottom: 12px;
    color: #c4f2da;
    background: #23513d;
    border: 1px solid #3c8463;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .6px;
}

/* BADGES */

.uadv632-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 12px;
}

.uadv632-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    color: #e3ebf7;
    background: #34455b;
    border: 1px solid #50637b;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: .35px;
}

.uadv632-badge-quality {
    color: #e8f3ff;
    background: #34577d;
    border-color: #6694c4;
}

.uadv632-badge-dv {
    color: #f1e3ff;
    background: #563b75;
    border-color: #9369bd;
}

.uadv632-badge-hdr {
    color: #ffe9c6;
    background: #67502c;
    border-color: #a58249;
}

.uadv632-badge-ua {
    color: #d3f9e5;
    background: #255d46;
    border-color: #4b9974;
}

/* STATS */

.uadv632-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #ffffff18;
}

.uadv632-stat {
    min-width: 105px;
    flex: 1;
}

.uadv632-stat-label {
    color: #94a8be;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
}

.uadv632-stat-value {
    color: #f4f8ff;
    font-size: 17px;
    font-weight: 700;
    margin-top: 5px;
}

/* FOOTER */

.uadv632-footer {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 26px;
    padding: 15px 20px;
    background: #121c28;
    border-top: 1px solid #34485e;
    color: #91a8c0;
    font-size: 13px;
}

/* COMPACT MODE */

.uadv632-compact {
    width: min(930px,94vw);
    border-radius: 14px;
}

.uadv632-compact .uadv632-header {
    padding: 16px 22px;
}

.uadv632-compact .uadv632-title {
    font-size: 23px;
}

.uadv632-compact .uadv632-card {
    padding: 12px 16px;
    margin-bottom: 7px;
    border-radius: 10px;
}

.uadv632-compact .uadv632-card-title {
    font-size: 17px;
}

.uadv632-compact .uadv632-stats {
    margin-top: 10px;
    padding-top: 9px;
}

.uadv632-compact .uadv632-stat-value {
    font-size: 14px;
}

/* MOBILE */

@media(max-width:600px) {

    .uadv632-overlay {
        padding: 2vh 1vw;
    }

    .uadv632-panel {
        width: 98vw;
        max-height: 94vh;
        border-radius: 14px;
    }

    .uadv632-header {
        padding: 17px;
    }

    .uadv632-eyebrow {
        font-size: 10px;
        letter-spacing: 1px;
    }

    .uadv632-title {
        font-size: 20px;
    }

    .uadv632-subtitle {
        font-size: 12px;
    }

    .uadv632-close {
        width: 36px;
        height: 36px;
        font-size: 18px;
    }

    .uadv632-list {
        padding: 9px;
    }

    .uadv632-card {
        padding: 13px;
        gap: 8px;
        border-radius: 11px;
    }

    .uadv632-card-title {
        font-size: 15px;
    }

    .uadv632-card-subtitle {
        font-size: 11px;
    }

    .uadv632-badge {
        padding: 5px 7px;
        font-size: 9px;
    }

    .uadv632-stat {
        min-width: 75px;
    }

    .uadv632-stat-label {
        font-size: 9px;
    }

    .uadv632-stat-value {
        font-size: 13px;
    }

    .uadv632-card-arrow {
        font-size: 27px;
    }

    .uadv632-footer {
        gap: 12px;
        padding: 11px;
        font-size: 10px;
    }

    .uadv632-toast {
        font-size: 14px;
        padding: 11px 15px;
    }
}

@media(prefers-reduced-motion:reduce) {
    .uadv632-overlay,
    .uadv632-panel,
    .uadv632-card,
    .uadv632-toast {
        transition: none !important;
    }
}
`;

    var style = create(
        'style',
        ''
    );

    style.id = STYLE_ID;
    style.textContent = css;

    document.head.appendChild(style);
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

    if (initialized) return;

    initialized = true;

    var defaults = {
        playMode: 'auto',
        uaPolicy: 'prefer',
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
        function (key) {
            if (
                storageGet(
                    key,
                    null
                ) == null
            ) {
                storageSet(
                    key,
                    defaults[key]
                );
            }
        }
    );

    injectStyles();
    registerSettings();
    mountButton();

    log(
        'Initialized successfully'
    );
}

init();

})();
