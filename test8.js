(function () {
    'use strict';

    var CACHE_TTL = 2 * 60 * 60 * 1000;
    var EMPTY_TTL = 10 * 60 * 1000;
    var ERROR_TTL = 60 * 1000;
    var MAX_CACHE = 150;
    var DISK_CACHE_KEY = 'release_badges_disk_v1';
    var DISK_MAX = 300;
    var DISK_TTL = 7 * 24 * 60 * 60 * 1000;
    var DISK_EMPTY_TTL = 24 * 60 * 60 * 1000;
    var DISK_SAVE_DELAY = 2000;
    var MAX_ACTIVE = 1;
    var MAX_QUEUE = 6;
    var REQUEST_TIMEOUT = 20000;
    var ANALYSE_LIMIT = 50;
    var SCAN_PER_FRAME = 6;
    var LOAD_IDLE_MS = 450;
    var cache = {};
    var diskCache = null;
    var diskDirty = false;
    var diskSaveTimer = null;
    var pending = {};
    var queue = [];
    var active = 0;
    var sourceVersion = 0;
    var settingsRefreshTimer = null;
    var cardObserver = null;
    var visibilityObserver = null;
    var scanPending = false;
    var scanRoots = [];
    var loadWaiting = [];
    var loadIdleTimer = null;
    var lastActivity = 0;
    var MESSAGES = {
        uk: {
            settings_menu: 'Мітки релізів: якість та аудіо',
            settings_source: 'Джерело міток: парсер Lampa (розділ «Парсер»)',
            settings_enabled: 'Показувати мітки релізів',
            settings_quality: 'Показувати якість',
            settings_hdr: 'Показувати HDR / Dolby Vision',
            settings_ua: 'Показувати аудіо UA',
            settings_ru: 'Показувати аудіо RU',
            settings_en: 'Показувати аудіо EN',
            settings_rating: 'Показувати рейтинг TMDB',
            badge_audio: 'Знайдено реліз з аудіо {language}',
            badge_audio_quality: 'Знайдено реліз з аудіо {language} та якістю {quality}',
            badge_quality: 'Знайдено реліз у якості {quality}',
            badge_dv: 'Знайдено реліз з Dolby Vision',
            badge_hdr: 'Знайдено реліз з HDR',
            badge_rating: 'Рейтинг TMDB'
        },
        ru: {
            settings_menu: 'Метки релизов',
            settings_source: 'Источник меток: парсер Lampa (раздел «Парсер»)',
            settings_enabled: 'Показывать метки релизов',
            settings_quality: 'Показывать качество',
            settings_hdr: 'Показывать HDR / Dolby Vision',
            settings_ua: 'Показывать аудио UA',
            settings_ru: 'Показывать аудио RU',
            settings_en: 'Показывать аудио EN',
            settings_rating: 'Показывать рейтинг TMDB',
            badge_audio: 'Найден релиз с аудио {language}',
            badge_audio_quality: 'Найден релиз с аудио {language} и качеством {quality}',
            badge_quality: 'Найден релиз в качестве {quality}',
            badge_dv: 'Найден релиз с Dolby Vision',
            badge_hdr: 'Найден релиз с HDR',
            badge_rating: 'Рейтинг TMDB'
        },
        en: {
            settings_menu: 'Release badges',
            settings_source: 'Badge source: Lampa parser (Parser settings)',
            settings_enabled: 'Show release badges',
            settings_quality: 'Show quality',
            settings_hdr: 'Show HDR / Dolby Vision',
            settings_ua: 'Show UA audio',
            settings_ru: 'Show RU audio',
            settings_en: 'Show EN audio',
            settings_rating: 'Show TMDB rating',
            badge_audio: 'Found a release with {language} audio',
            badge_audio_quality: 'Found a {quality} release with {language} audio',
            badge_quality: 'Found a {quality} release',
            badge_dv: 'Found a release with Dolby Vision',
            badge_hdr: 'Found a release with HDR',
            badge_rating: 'TMDB rating'
        }
    };

    function localizedText(key, language, values) {
        var code = String(language || '').toLowerCase();
        var phrase = (MESSAGES[code] || MESSAGES.en)[key] || MESSAGES.en[key] || key;
        return phrase.replace(/\{(\w+)\}/g, function (match, name) {
            return values && values[name] != null ? String(values[name]) : match;
        });
    }

    function normal(text) {
        return String(text || '').toLowerCase()
            .replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }

    function movieIdentity(movie) {
        var series = Boolean(movie.original_name || movie.first_air_date || movie.number_of_seasons);
        var title = movie.original_title || movie.original_name || movie.title || movie.name || '';
        var translated = movie.title || movie.name || '';
        var year = String(movie.release_date || movie.first_air_date || '').slice(0, 4);
        return {
            id: String(movie.id || ''),
            series: series,
            title: String(title).trim(),
            translated: String(translated).trim(),
            year: /^\d{4}$/.test(year) ? year : ''
        };
    }

    function matchesTitle(releaseTitle, movie) {
        var release = ' ' + normal(releaseTitle) + ' ';
        var names = [movie.title, movie.translated];
        var matched = false;
        for (var i = 0; i < names.length; i++) {
            var name = normal(names[i]);
            if (name.length >= 3 && release.indexOf(' ' + name + ' ') !== -1) matched = true;
        }
        if (!movie.series && movie.year) {
            var years = release.match(/\b(?:19|20)\d{2}\b/g) || [];
            if (years.length && years.indexOf(movie.year) === -1) return false;
        }
        return matched;
    }

    function qualityFrom(item) {
        var fields = [item.quality, item.resolution, item.Resolution,
            item.info && item.info.quality, item.Title || item.title];
        var best = 0;
        for (var i = 0; i < fields.length; i++) {
            var value = String(fields[i] == null ? '' : fields[i]);
            var quality = 0;
            if (/(?:^|[^0-9])(?:2160|4k|uhd)(?:p|[^0-9a-z]|$)/i.test(value)) quality = 2160;
            else if (/(?:^|[^0-9])(?:1080|full[ ._-]?hd|fhd)(?:p|i|[^0-9a-z]|$)/i.test(value)) quality = 1080;
            else if (/(?:^|[^0-9])(?:720|hd)(?:p|[^0-9a-z]|$)/i.test(value)) quality = 720;
            if (quality > best) best = quality;
        }
        return best;
    }

    function markLanguage(text, found) {
        var value = ' ' + String(text || '').toLowerCase() + ' ';
        var boundary = '[^a-zа-яіїєґ]';
        if (new RegExp(boundary + '(?:ua|uk|ukr|ukrainian|українськ[а-яіїєґ]*|украинск[а-яіїєґ]*|укр)' + boundary, 'i').test(value)) found.ua = true;
        if (new RegExp(boundary + '(?:ru|rus|russian|русск[а-яіїєґ]*|російськ[а-яіїєґ]*|рус)' + boundary, 'i').test(value)) found.ru = true;
        if (new RegExp(boundary + '(?:en|eng|english|английск[а-яіїєґ]*|англійськ[а-яіїєґ]*|англ)' + boundary, 'i').test(value)) found.en = true;
    }

    function readAudio(value, found, depth) {
        if (depth > 3 || value == null) return;
        if (typeof value === 'string' || typeof value === 'number') {
            markLanguage(value, found);
        } else if (Array.isArray(value)) {
            for (var i = 0; i < Math.min(value.length, 12); i++) readAudio(value[i], found, depth + 1);
        } else if (typeof value === 'object') {
            var keys = Object.keys(value).slice(0, 12);
            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                if (key === 'subtitles' || key === 'subtitle') continue;
                if (key === 'language' || key === 'lang' || key === 'name' || key === 'title' || key === 'code') {
                    readAudio(value[key], found, depth + 1);
                } else if (/^(?:ua|uk|ukr|ru|rus|en|eng)$/i.test(key) && value[key]) {
                    markLanguage(key, found);
                }
            }
        }
    }

    function languagesFrom(item) {
        var found = { ua: false, ru: false, en: false };
        readAudio(item.audio_languages, found, 0);
        readAudio(item.audioLanguages, found, 0);
        readAudio(item.audio, found, 0);
        readAudio(item.languages, found, 0);
        if (item.info) readAudio(item.info.audio_languages, found, 0);

        if (Array.isArray(item.ffprobe)) {
            var streams = item.ffprobe;
            var maxS = Math.min(streams.length, 15);
            for (var s = 0; s < maxS; s++) {
                var stream = streams[s];
                if (stream && (stream.codec_type === 'audio' || stream.type === 'audio')) {
                    readAudio(stream.tags && stream.tags.language, found, 0);
                    readAudio(stream.language, found, 0);
                }
            }
        }

        var title = String(item.Title || item.title || '');
        title = title.replace(/\[[^\]]*(?:subtitles?|subs?|субтитр)[^\]]*\]/ig, ' ')
            .replace(/\([^)]*(?:subtitles?|subs?|субтитр)[^)]*\)/ig, ' ')
            .replace(/(?:subtitles?|subs?|субтитр[а-я]*)\s*[:=-]?\s*(?:(?:UA|UKR|RU|RUS|EN|ENG)\b[\s,/+]*)+/ig, ' ');
        var tags = title.match(/[[(][^\])]{1,60}[\])]/g) || [];
        for (var t = 0; t < tags.length; t++) markLanguage(tags[t], found);

        var codes = title.match(/(?:^|[\s._-])(?:UA|UKR|RU|RUS|EN|ENG)(?=$|[\s._-])/g) || [];
        for (var c = 0; c < codes.length; c++) markLanguage(codes[c], found);

        var audioLabel = /(?:audio|dubbed|dub|voice|озвучка|озвучення|дубляж|звук|мова|язык)\s*[:=-]?\s*([^\[\]()]{1,50})/ig;
        var match;
        while ((match = audioLabel.exec(title))) markLanguage(match[1], found);
        return found;
    }

    function videoTypeFrom(item) {
        var title = String(item.Title || item.title || '');
        var type = String(item.videotype || item.videoType ||
            (item.info && item.info.videotype) || '');
        var dolby = item.dolbyVision === true || /dolby[ ._-]?vision|\bdovi\b/i.test(title + ' ' + type) ||
            /(?:^|[\s.[(])DV(?:$|[\s.\])])/i.test(title);
        if (dolby) return 'DV';
        return item.hdr === true || /\bhdr(?:10\+?|ip)?\b/i.test(title + ' ' + type) ? 'HDR' : '';
    }

    function analyse(results, movie) {
        var summary = { quality: 0, ua: null, ru: null, en: null,
            hdr: false, dv: false, matches: 0 };
        if (!Array.isArray(results)) return summary;
        var list = results;
        var len = Math.min(list.length, ANALYSE_LIMIT);
        for (var i = 0; i < len; i++) {
            var item = list[i];
            if (!item || !matchesTitle(item.Title || item.title, movie)) continue;
            var quality = qualityFrom(item);
            var langs = languagesFrom(item);
            var videoType = videoTypeFrom(item);
            summary.matches++;
            if (quality > summary.quality) summary.quality = quality;
            if (videoType === 'DV') summary.dv = true;
            if (videoType) summary.hdr = true;
            if (langs.ua && (summary.ua === null || quality > summary.ua)) summary.ua = quality;
            if (langs.ru && (summary.ru === null || quality > summary.ru)) summary.ru = quality;
            if (langs.en && (summary.en === null || quality > summary.en)) summary.en = quality;
        }
        return summary;
    }

    function qualityLabel(quality) {
        return quality >= 2160 ? '4K' : quality >= 1080 ? '1080p' : quality >= 720 ? '720p' : '';
    }

    function tmdbRating(movie) {
        var rating = Number(movie && movie.vote_average);
        return isFinite(rating) && rating > 0 && rating <= 10 ? rating : 0;
    }

    function summarySignature(summary, movie) {
        if (!summary) {
            var r = tmdbRating(movie);
            return 'null|' + (r ? r.toFixed(1) : '0') + '|' +
                setting('release_badges_enabled', true) + '|' +
                setting('release_badges_rating', true);
        }
        return [
            summary.quality || 0,
            summary.ua === null ? 'n' : summary.ua,
            summary.ru === null ? 'n' : summary.ru,
            summary.en === null ? 'n' : summary.en,
            summary.hdr ? 1 : 0,
            summary.dv ? 1 : 0,
            tmdbRating(movie) ? tmdbRating(movie).toFixed(1) : '0',
            setting('release_badges_enabled', true),
            setting('release_badges_quality', true),
            setting('release_badges_hdr', true),
            setting('release_badges_ua', true),
            setting('release_badges_ru', true),
            setting('release_badges_en', true),
            setting('release_badges_rating', true)
        ].join('|');
    }

    if (typeof window === 'undefined') return;

    function setting(name, fallback) {
        try {
            var value = window.Lampa.Storage.get(name, fallback);
            return value === true || value === 'true' || value === 1 || value === '1';
        } catch (e) { return fallback; }
    }

    function field(name) {
        try {
            var storage = window.Lampa.Storage;
            return storage.field ? storage.field(name) : storage.get(name, '');
        } catch (e) { return ''; }
    }

    function currentLanguage() {
        try { return window.Lampa.Storage.get('language', 'ru'); }
        catch (e) { return 'ru'; }
    }

    function label(key, values) {
        return localizedText(key, currentLanguage(), values);
    }

    function sourceReady() {
        if (!window.Lampa || !Lampa.Parser || typeof Lampa.Parser.get !== 'function') return false;
        if (!setting('parser_use', false)) return false;
        var type = field('parser_torrent_type');
        if (type === 'jackett' || type === 'prowlarr') {
            var primary = field(type + '_url');
            var secondary = field(type + '_url_two');
            var use = field('parser_use_link') || 'one';
            return Boolean(use === 'two' ? secondary : use === 'both' ? primary || secondary : primary);
        }
        if (type === 'torrserver') {
            return Boolean(field(field('torrserver_use_link') === 'two' ?
                'torrserver_url_two' : 'torrserver_url'));
        }
        return false;
    }

    function copyForParser(movie) {
        var result = {};
        Object.keys(movie).forEach(function (key) { result[key] = movie[key]; });
        result.title = movie.title || movie.name || '';
        result.original_title = movie.original_title || movie.original_name || result.title;
        result.genres = Array.isArray(movie.genres) ? movie.genres : [];
        return result;
    }

    function searchCandidates(info) {
        var original = info.title || info.translated;
        var local = info.translated || original;
        var year = info.series ? '' : info.year;
        var requested = [original, local];
        var seen = {};
        return requested.filter(function (part) {
            if (!part || seen[normal(part)]) return false;
            seen[normal(part)] = true;
            return true;
        }).map(function (part) { return part + (year ? ' ' + year : ''); });
    }

    function cacheKey(movie) {
        var info = movieIdentity(movie);
        return sourceVersion + ':' + (info.series ? 'tv:' : 'movie:') + (movie.source || 'tmdb') + ':' +
            info.id + ':' + normal(info.title) + ':' + info.year;
    }

    function diskKey(movie) {
        var info = movieIdentity(movie);
        return (info.series ? 'tv:' : 'movie:') + (movie.source || 'tmdb') + ':' +
            info.id + ':' + normal(info.title) + ':' + info.year;
    }

    function ensureDiskCache() {
        if (diskCache) return diskCache;
        diskCache = { entries: {}, order: [] };
        try {
            var raw = Lampa.Storage.get(DISK_CACHE_KEY, null);
            if (raw && typeof raw === 'object' && raw.entries && Array.isArray(raw.order)) {
                diskCache.entries = raw.entries || {};
                diskCache.order = raw.order || [];
            }
        } catch (e) {}
        pruneDiskCache();
        return diskCache;
    }

    function pruneDiskCache() {
        if (!diskCache) return;
        var now = Date.now();
        var order = diskCache.order;
        var entries = diskCache.entries;
        var next = [];
        for (var i = 0; i < order.length; i++) {
            var k = order[i];
            var item = entries[k];
            if (!item || !item.expires || item.expires <= now) {
                delete entries[k];
            } else {
                next.push(k);
            }
        }
        while (next.length > DISK_MAX) {
            var old = next.shift();
            delete entries[old];
        }
        diskCache.order = next;
    }

    function scheduleDiskSave() {
        diskDirty = true;
        if (diskSaveTimer) return;
        diskSaveTimer = setTimeout(function () {
            diskSaveTimer = null;
            if (!diskDirty || !diskCache) return;
            diskDirty = false;
            pruneDiskCache();
            try {
                Lampa.Storage.set(DISK_CACHE_KEY, {
                    entries: diskCache.entries,
                    order: diskCache.order
                });
            } catch (e) {}
        }, DISK_SAVE_DELAY);
    }

    function readDiskSummary(movie) {
        var key = diskKey(movie);
        var store = ensureDiskCache();
        var item = store.entries[key];
        if (!item || !item.expires || item.expires <= Date.now()) {
            if (item) {
                delete store.entries[key];
                var idx = store.order.indexOf(key);
                if (idx !== -1) store.order.splice(idx, 1);
                scheduleDiskSave();
            }
            return null;
        }
        var order = store.order;
        var pos = order.indexOf(key);
        if (pos !== -1) {
            order.splice(pos, 1);
            order.push(key);
        }
        return item.summary;
    }

    function writeDiskSummary(movie, summary, ttl) {
        if (summary === undefined) return;
        var key = diskKey(movie);
        var store = ensureDiskCache();
        var order = store.order;
        var pos = order.indexOf(key);
        if (pos !== -1) order.splice(pos, 1);
        order.push(key);
        store.entries[key] = {
            summary: summary,
            expires: Date.now() + ttl
        };
        while (order.length > DISK_MAX) {
            var old = order.shift();
            delete store.entries[old];
        }
        scheduleDiskSave();
    }

    function clearDiskCache() {
        diskCache = { entries: {}, order: [] };
        diskDirty = false;
        if (diskSaveTimer) {
            clearTimeout(diskSaveTimer);
            diskSaveTimer = null;
        }
        try { Lampa.Storage.set(DISK_CACHE_KEY, diskCache); } catch (e) {}
    }

    function markActivity() {
        lastActivity = Date.now();
    }

    function fetchSummary(movie, callback) {
        var key = cacheKey(movie);
        var hit = cache[key];
        if (hit && hit.expires > Date.now()) return callback(hit.summary);

        var diskHit = readDiskSummary(movie);
        if (diskHit !== null) {
            cache[key] = { summary: diskHit, expires: Date.now() + CACHE_TTL };
            return callback(diskHit);
        }

        if (!sourceReady()) return callback(null);
        if (pending[key]) {
            pending[key].push(callback);
            return;
        }
        pending[key] = [callback];
        if (queue.length >= MAX_QUEUE) {
            var dropped = queue.shift();
            if (dropped) {
                var dropCbs = pending[dropped.key] || [];
                delete pending[dropped.key];
                dropCbs.forEach(function (cb) { try { cb(null); } catch (e) {} });
            }
        }
        queue.push({ key: key, movie: movie });
        pump();
    }

    function pump() {
        while (active < MAX_ACTIVE && queue.length) {
            request(queue.shift());
        }
    }

    function request(task) {
        active++;
        var completed = false;
        var parserTimeout = Number(field('parse_timeout'));
        var timeout = isFinite(parserTimeout) && parserTimeout > 0 ?
            Math.min(parserTimeout * 2000 + 5000, 65000) : REQUEST_TIMEOUT * 2;
        var timer = setTimeout(function () { finish(null, ERROR_TTL); }, timeout);

        function finish(summary, ttl) {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            cache[task.key] = { summary: summary, expires: Date.now() + ttl };
            var keys = Object.keys(cache);
            if (keys.length > MAX_CACHE) delete cache[keys[0]];
            if (summary !== null && summary !== undefined) {
                var diskTtl = summary && summary.matches ? DISK_TTL : DISK_EMPTY_TTL;
                writeDiskSummary(task.movie, summary, diskTtl);
            }
            var callbacks = pending[task.key] || [];
            delete pending[task.key];
            callbacks.forEach(function (callback) {
                try { callback(summary); } catch (e) {}
            });
            active--;
            setTimeout(pump, 30);
        }

        try {
            var info = movieIdentity(task.movie);
            var parserMovie = copyForParser(task.movie);
            var searches = searchCandidates(info);

            function trySearch(index) {
                if (completed) return;
                if (index >= searches.length) return finish(null, ERROR_TTL);
                Lampa.Parser.get({
                    search: searches[index],
                    search_one: info.translated,
                    search_two: info.title,
                    movie: parserMovie,
                    page: 1
                }, function (data) {
                    if (completed) return;
                    var results = data && data.Results;
                    if (!Array.isArray(results)) return trySearch(index + 1);
                    var summary = analyse(results, info);
                    if (!summary.matches && index + 1 < searches.length) return trySearch(index + 1);
                    finish(summary, summary.matches ? CACHE_TTL : EMPTY_TTL);
                }, function () { trySearch(index + 1); });
            }

            trySearch(0);
        } catch (e) { finish(null, ERROR_TTL); }
    }

    function empty(element) {
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function badge(text, className, title) {
        var node = document.createElement('span');
        node.className = 'release-badges__badge release-badges__badge--' + className;
        if (text) node.textContent = text;
        node.title = title;
        return node;
    }

    function render(container, summary, movie) {
        var sig = summarySignature(summary, movie);
        if (container.__releaseBadgesSig === sig) return;
        container.__releaseBadgesSig = sig;

        empty(container);
        var card = container.closest && container.closest('.card');
        if (!setting('release_badges_enabled', true)) {
            if (card) card.classList.remove('release-badges-has-rating', 'release-badges-has-quality');
            return;
        }
        var showQuality = Boolean(summary && summary.quality && setting('release_badges_quality', true));
        if (summary) {
            if (summary.ua !== null && setting('release_badges_ua', true)) {
                var qUa = qualityLabel(summary.ua);
                container.appendChild(badge('', 'ua',
                    label(qUa ? 'badge_audio_quality' : 'badge_audio', { language: 'UA', quality: qUa })));
            }
            if (summary.ru !== null && setting('release_badges_ru', true)) {
                var qRu = qualityLabel(summary.ru);
                container.appendChild(badge('RU', 'ru',
                    label(qRu ? 'badge_audio_quality' : 'badge_audio', { language: 'RU', quality: qRu })));
            }
            if (summary.en !== null && setting('release_badges_en', true)) {
                var qEn = qualityLabel(summary.en);
                container.appendChild(badge('EN', 'en',
                    label(qEn ? 'badge_audio_quality' : 'badge_audio', { language: 'EN', quality: qEn })));
            }
            if (showQuality) {
                var qualityClass = summary.quality >= 2160 ? '4k' : summary.quality >= 1080 ? 'fhd' : 'hd';
                container.appendChild(badge('', qualityClass,
                    label('badge_quality', { quality: qualityLabel(summary.quality) })));
            }
            if (summary.hdr && setting('release_badges_hdr', true)) {
                container.appendChild(badge('', summary.dv ? 'dv' : 'hdr',
                    label(summary.dv ? 'badge_dv' : 'badge_hdr')));
            }
        }
        var rating = tmdbRating(movie);
        var showRating = Boolean(rating && setting('release_badges_rating', true));
        if (showRating) {
            container.appendChild(badge('★ ' + rating.toFixed(1), 'rating', label('badge_rating')));
        }
        if (card) {
            card.classList.toggle('release-badges-has-rating', showRating);
            card.classList.toggle('release-badges-has-quality', showQuality);
        }
    }

    function getMovie(card) {
        try {
            return card.heroMovieData || card.card_data || card.item ||
                (window.$ && $(card).data && $(card).data('item')) || null;
        } catch (e) { return null; }
    }

    function hostForCard(card) {
        return card.querySelector('.card__view') || card;
    }

    function ensureContainer(host) {
        var container = host.querySelector('.release-badges');
        if (!container) {
            container = document.createElement('div');
            container.className = 'release-badges';
            if (window.getComputedStyle && window.getComputedStyle(host).position === 'static') {
                host.style.position = 'relative';
            }
            host.appendChild(container);
        }
        return container;
    }

    function loadCardNow(card) {
        if (!setting('release_badges_enabled', true)) return;
        if (!card || !document.documentElement.contains(card)) return;
        var movie = getMovie(card);
        if (!movie || !movie.id) return;
        var key = cacheKey(movie);
        var host = hostForCard(card);
        var container = ensureContainer(host);
        card.__releaseBadgesKey = key;
        render(container, null, movie);
        fetchSummary(movie, function (summary) {
            if (card.__releaseBadgesKey !== key || !document.documentElement.contains(card)) return;
            render(container, summary, movie);
        });
    }

    function scheduleLoad(card) {
        if (!card || card.__releaseBadgesQueued) return;
        card.__releaseBadgesQueued = true;
        loadWaiting.push(card);
        markActivity();
        clearTimeout(loadIdleTimer);
        loadIdleTimer = setTimeout(flushLoads, LOAD_IDLE_MS);
    }

    function flushLoads() {
        if (Date.now() - lastActivity < LOAD_IDLE_MS - 50) {
            loadIdleTimer = setTimeout(flushLoads, LOAD_IDLE_MS);
            return;
        }
        var list = loadWaiting.splice(0);
        var i = 0;
        function step() {
            var count = 0;
            while (i < list.length && count < 2) {
                var card = list[i++];
                if (card) {
                    card.__releaseBadgesQueued = false;
                    if (document.documentElement.contains(card)) loadCardNow(card);
                }
                count++;
            }
            if (i < list.length) {
                setTimeout(step, 40);
            }
        }
        step();
    }

    function processCard(card) {
        if (!card || !card.classList || !card.classList.contains('card')) return;
        var movie = getMovie(card);
        if (!movie || !movie.id) return;
        var key = cacheKey(movie);
        if (card.__releaseBadgesKey === key && card.querySelector('.release-badges')) return;
        if (visibilityObserver) visibilityObserver.observe(card);
        else scheduleLoad(card);
    }

    function scan(root) {
        if (!setting('release_badges_enabled', true)) return;
        if (!root) return;
        if (root.classList && root.classList.contains('card')) processCard(root);
        if (root.querySelectorAll) {
            var cards = root.querySelectorAll('.card');
            var max = Math.min(cards.length, 40);
            for (var i = 0; i < max; i++) processCard(cards[i]);
            var parent = root.closest && root.closest('.card');
            if (parent) processCard(parent);
        }
    }

    function scheduleScan(root) {
        if (root) scanRoots.push(root);
        markActivity();
        if (scanPending) return;
        scanPending = true;
        var runner = window.requestAnimationFrame || function (cb) { setTimeout(cb, 16); };
        runner(function () {
            scanPending = false;
            var roots = scanRoots.splice(0);
            if (!roots.length) return;
            var seen = [];
            var processed = 0;
            for (var i = 0; i < roots.length && processed < SCAN_PER_FRAME; i++) {
                var r = roots[i];
                if (r && seen.indexOf(r) === -1) {
                    seen.push(r);
                    scan(r);
                    processed++;
                }
            }
            if (roots.length > seen.length) {
                for (var j = seen.length; j < roots.length; j++) scanRoots.push(roots[j]);
                scheduleScan(null);
            }
        });
    }

    function showFull(movie, renderElement) {
        if (!setting('release_badges_enabled', true) || !movie || !movie.id || !renderElement) return;
        var root = (window.$ ? $(renderElement)[0] : renderElement) || renderElement;
        if (!root) return;
        var host = root.querySelector('.full-start__poster, .full-start-new__poster') || root;
        var container = ensureContainer(host);
        container.classList.add('release-badges--full');
        var key = cacheKey(movie);
        container.setAttribute('data-release-key', key);
        container.__releaseBadgesSig = null;
        render(container, null, movie);
        fetchSummary(movie, function (summary) {
            if (!document.documentElement.contains(container) ||
                container.getAttribute('data-release-key') !== key) return;
            render(container, summary, movie);
        });
    }

    function refresh() {
        clearTimeout(loadIdleTimer);
        loadWaiting = [];
        var containers = document.querySelectorAll('.release-badges');
        for (var i = 0; i < containers.length; i++) {
            containers[i].__releaseBadgesSig = null;
            if (containers[i].parentNode) containers[i].parentNode.removeChild(containers[i]);
        }
        var cards = document.querySelectorAll('.card');
        for (var j = 0; j < cards.length; j++) {
            cards[j].__releaseBadgesKey = null;
            cards[j].__releaseBadgesQueued = false;
            cards[j].classList.remove('release-badges-has-rating', 'release-badges-has-quality');
        }
        if (!setting('release_badges_enabled', true)) return;
        scheduleScan(document.body);
        try {
            var activity = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
            if (activity && activity.component === 'full') {
                showFull(activity.card || activity.movie, activity.activity &&
                    activity.activity.render && activity.activity.render());
            }
        } catch (e) {}
    }

    function addSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam ||
            !Lampa.Settings || !Lampa.Settings.create ||
            !Lampa.Template || !Lampa.Template.add) return;
        var component = 'release_badges';
        var menuItem = null;
        Lampa.Template.add('settings_' + component, '<div></div>');
        Lampa.SettingsApi.addParam({ component: 'interface',
            param: { name: 'release_badges_open', type: 'button' },
            field: { name: label('settings_menu') },
            onRender: function (item) {
                menuItem = item;
                item.find('.settings-param__name').text(label('settings_menu'));
            },
            onChange: function () {
                var index = menuItem ? menuItem.parent().find('.selector').index(menuItem) : 0;
                Lampa.Settings.create(component, {
                    onBack: function () {
                        Lampa.Settings.create('interface', { last_index: Math.max(0, index) });
                    }
                });
            }
        });
        [
            ['release_badges_enabled', 'settings_enabled'],
            ['release_badges_quality', 'settings_quality'],
            ['release_badges_hdr', 'settings_hdr'],
            ['release_badges_ua', 'settings_ua'],
            ['release_badges_ru', 'settings_ru'],
            ['release_badges_en', 'settings_en'],
            ['release_badges_rating', 'settings_rating']
        ].forEach(function (entry) {
            Lampa.SettingsApi.addParam({ component: component,
                param: { name: entry[0], type: 'trigger', default: true },
                field: { name: label(entry[1]),
                    description: entry[0] === 'release_badges_enabled' ? label('settings_source') : '' },
                onRender: function (item) {
                    item.find('.settings-param__name').text(label(entry[1]));
                    if (entry[0] === 'release_badges_enabled') {
                        item.find('.settings-param__descr').text(label('settings_source'));
                    }
                },
                onChange: refresh });
        });
    }

    function addStyle() {
        if (document.getElementById('release-badges-style')) return;
        var style = document.createElement('style');
        style.id = 'release-badges-style';
        style.textContent = [
            '.release-badges{position:absolute;left:-.2em;top:1.4em;z-index:25;display:flex;flex-direction:column;align-items:flex-start;gap:.2em;pointer-events:none}',
            '.hero-banner .release-badges{left:1.2em;top:1.5em;gap:.3em}',
            'body:not(.ifx-type-badges) .card.card--tv .card__view > .release-badges{top:3.2em}',
            '.release-badges--full{left:.5em;top:.8em;gap:.3em}',
            '.release-badges__badge{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;min-width:2.2em;height:1.4em;padding:0 .35em;background-size:contain;background-repeat:no-repeat;background-position:center;color:#fff;font-size:.78em;font-weight:800;line-height:1;white-space:nowrap}',
            /* Ваші власні іконки з GitHub */
            '.release-badges__badge--ua{background-image:url("https://raw.githubusercontent.com/crowley24/crowley24.github.io/refs/heads/main/Badges/UKR.svg");width:2.4em;height:1.3em}',
            '.release-badges__badge--ru{background:linear-gradient(135deg,#8e244d,#d75a74);border:1px solid rgba(215,90,116,.4);border-radius:.32em;padding:.32em .48em}',
            '.release-badges__badge--en{background:linear-gradient(135deg,#37474f,#78909c);border:1px solid rgba(120,144,156,.4);border-radius:.32em;padding:.32em .48em}',
            '.release-badges__badge--4k{background-image:url("https://raw.githubusercontent.com/crowley24/crowley24.github.io/refs/heads/main/Badges/4K.svg");width:2.6em;height:1.3em}',
            '.release-badges__badge--fhd{background-image:url("https://raw.githubusercontent.com/crowley24/crowley24.github.io/refs/heads/main/Badges/1080.svg");width:2.8em;height:1.3em}',
            '.release-badges__badge--hd{background:linear-gradient(135deg,#1b5e20,#66bb6a);border:1px solid rgba(102,187,106,.4);border-radius:.32em;padding:.32em .48em}',
            '.release-badges__badge--hdr{background-image:url("https://raw.githubusercontent.com/crowley24/crowley24.github.io/refs/heads/main/Badges/HDR.svg");width:2.8em;height:1.3em}',
            '.release-badges__badge--dv{background-image:url("https://raw.githubusercontent.com/crowley24/crowley24.github.io/refs/heads/main/Icons/Dolby%20Vision.svg");width:3.2em;height:1.3em}',
            '.release-badges__badge--rating{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#ffd700;border:1px solid rgba(255,215,0,.35);border-radius:.32em;padding:.32em .48em}',
            '.card.release-badges-has-rating .card__vote{display:none!important}',
            '.card.release-badges-has-quality .card__quality{display:none!important}'
        ].join('');
        document.head.appendChild(style);
    }

    function bindActivityHints() {
        var handler = function () { markActivity(); };
        try {
            document.addEventListener('keydown', handler, { passive: true, capture: true });
            document.addEventListener('wheel', handler, { passive: true, capture: true });
            document.addEventListener('touchmove', handler, { passive: true, capture: true });
            document.addEventListener('pointermove', handler, { passive: true, capture: true });
        } catch (e) {
            document.addEventListener('keydown', handler, true);
        }
        if (Lampa.Listener && Lampa.Listener.follow) {
            try {
                Lampa.Listener.follow('activity', function () { markActivity(); });
            } catch (e2) {}
        }
    }

    function init() {
        if (window.__lampaReleaseBadgesV2) return;
        if (!document.body || !window.Lampa || !Lampa.Storage || !Lampa.Parser) return;
        window.__lampaReleaseBadgesV2 = true;
        window.__lampaReleaseBadgesV1 = true;
        addStyle();
        addSettings();
        bindActivityHints();
        if (window.IntersectionObserver) {
            visibilityObserver = new IntersectionObserver(function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (entry.isIntersecting) {
                        visibilityObserver.unobserve(entry.target);
                        scheduleLoad(entry.target);
                    }
                }
            }, { rootMargin: '40px', threshold: 0.01 });
        }
        cardObserver = new MutationObserver(function (mutations) {
            markActivity();
            for (var m = 0; m < mutations.length; m++) {
                var mutation = mutations[m];
                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    if (mutation.addedNodes[i].nodeType === 1) {
                        scheduleScan(mutation.addedNodes[i]);
                    }
                }
            }
        });
        cardObserver.observe(document.getElementById('app') || document.body,
            { childList: true, subtree: true });
        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', function (event) {
                if (event.type !== 'complite') return;
                var movie = event.data && event.data.movie;
                var activity = event.object && event.object.activity;
                showFull(movie, activity && activity.render && activity.render());
            });
        }
        if (Lampa.Storage.listener && Lampa.Storage.listener.follow) {
            Lampa.Storage.listener.follow('change', function (event) {
                if (event && event.name === 'language') {
                    clearTimeout(settingsRefreshTimer);
                    settingsRefreshTimer = setTimeout(refresh, 400);
                    return;
                }
                if (!event || !/^(?:parser_use|parser_torrent_type|parser_use_link|parse_timeout|torrserver_use_link|jackett_(?:url|key)(?:_two)?|prowlarr_(?:url|key)(?:_two)?|torrserver_url(?:_two)?)$/.test(event.name)) return;
                sourceVersion++;
                cache = {};
                queue = [];
                pending = {};
                active = 0;
                clearDiskCache();
                clearTimeout(settingsRefreshTimer);
                settingsRefreshTimer = setTimeout(refresh, 400);
            });
        }
        window.LAMPA_RELEASE_BADGES_REFRESH = refresh;
        scheduleScan(document.body);
    }

    function waitForLampa(attempt) {
        if (window.__lampaReleaseBadgesV2) return;
        if (window.Lampa && Lampa.Storage && Lampa.Parser && document.body) {
            init();
        } else if (attempt < 60) {
            setTimeout(function () { waitForLampa(attempt + 1); }, 500);
        }
    }
    waitForLampa(0);
})();
