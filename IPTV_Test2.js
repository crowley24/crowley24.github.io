(function () {
    'use strict';

    if (window.lampa_iptv_plus_ready) {
        if (typeof window.lampa_iptv_plus_restore_menu === 'function') window.lampa_iptv_plus_restore_menu();
        return;
    }
    window.lampa_iptv_plus_ready = true;

    var PLUGIN = 'iptv_plus', VERSION = '1.2.0';
    var AUTO_EPG_URL = 'https://cdn.epg.one/edem.xml.gz';
    var AUTO_EPG_RU_URL = 'https://cdn.epg.one/ru.xml.gz';
    var AUTO_EPG_LITE_URL = 'https://cdn.epg.one/epg.xml';
    var FFLATE_URL = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';
    var CHANNEL_PAGE_SIZE = 80;
    var network = new Lampa.Reguest();
    var state = {
        channels: [], visible: [], groups: [], groupCounts: {}, epg: {}, epgNames: {},
        playlistEpg: '', archiveHint: false, autoEpg: false, guideMode: 'none',
        guideLoading: false, guidePromise: null, guideTicket: 0, archiveLoading: {},
        archiveReady: {}, archiveFailed: {}, selectedChannel: '', selectedDay: '', loadedAt: 0, component: null
    };

    var ICON = '<svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="34" height="23" rx="4" stroke="currentColor" stroke-width="3"/><path d="M14 2l4 5 6-5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M10 34h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

    function text(v) { return v == null ? '' : String(v); }
    function escapeHtml(v) {
        return text(v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
        });
    }
    function normalizeExact(v) { return text(v).toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9]+/gi, ' ').trim(); }
    function normalize(v) { return normalizeExact(v).replace(/\b(hd|fhd|uhd|4k|sd)\b/gi, '').replace(/\s+/g, ' ').trim(); }

    function rememberGuideName(target, name, id) {
        var exact = normalizeExact(name), relaxed = normalize(name);
        if (exact && !target['exact:' + exact]) target['exact:' + exact] = id;
        if (relaxed && !target['relaxed:' + relaxed]) target['relaxed:' + relaxed] = id;
    }

    function storage(name, fallback) { return Lampa.Storage.get(PLUGIN + '_' + name, fallback); }
    function field(name) { return Lampa.Storage.field(PLUGIN + '_' + name); }
    function notify(msg) { Lampa.Noty.show(msg); }

    function channelKey(c) { return c.id ? 'id:' + c.id : 'name:' + normalizeExact(c.name) + ':' + normalizeExact(c.group); }
    function legacyChannelKey(c) { return c.url ? 'url:' + c.url : ''; }
    function favoriteIds() { var s = storage('favorites', []); return Array.isArray(s) ? s : []; }

    function favoriteInLookup(c, lookup) {
        var legacy = legacyChannelKey(c);
        return Boolean(lookup[channelKey(c)] || (legacy && lookup[legacy]));
    }
    function isFavorite(c) {
        var favs = favoriteIds(), key = channelKey(c), legacy = legacyChannelKey(c);
        return favs.indexOf(key) >= 0 || (legacy && favs.indexOf(legacy) >= 0);
    }
    function setFavorite(c, enabled) {
        var key = channelKey(c), legacy = legacyChannelKey(c);
        var favs = favoriteIds().filter(function (i) { return i !== key && i !== legacy; });
        if (enabled) favs.unshift(key);
        Lampa.Storage.set(PLUGIN + '_favorites', favs);
        if (state.component && state.component.onFavoritesChanged) state.component.onFavoritesChanged();
        return enabled;
    }

    function historyIds() { var s = storage('history', []); return Array.isArray(s) ? s : []; }
    function addToHistory(c) {
        var key = channelKey(c);
        var history = historyIds().filter(function (i) { return i !== key; });
        history.unshift(key);
        Lampa.Storage.set(PLUGIN + '_history', history.slice(0, 40));
        Lampa.Storage.set(PLUGIN + '_last_channel', key);
        if (state.component) state.component.historyDirty = true;
    }
    function historyChannels() {
        var order = historyIds(), channels = {};
        state.channels.forEach(function (c) { channels[channelKey(c)] = c; });
        return order.map(function (key) { return channels[key]; }).filter(Boolean);
    }

    function requestText(url) {
        return new Promise(function (resolve, reject) {
            if (!url) return reject(new Error('URL не указан'));
            network.timeout(30000);
            network.native(url, function (data) {
                resolve(typeof data === 'string' ? data : data && typeof data.responseText === 'string' ? data.responseText : '');
            }, function (error) {
                reject(error instanceof Error ? error : new Error('Не удалось загрузить ' + url));
            }, false, { dataType: 'text' });
        });
    }

    function attr(source, name) {
        var match = new RegExp('(?:^|\\s)' + name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '=(?:"([^"]*)"|\'([^\']*)\'|([^\\s]+))', 'i').exec(source);
        return match ? (match[1] || match[2] || match[3] || '') : '';
    }

    function archiveDays(daysValue, recValue, timeshiftValue, secondsValue) {
        var d = parseFloat(daysValue);
        if (isFinite(d) && d > 0) return Math.ceil(d);
        var rec = parseFloat(recValue);
        if (isFinite(rec) && rec > 1) return Math.ceil(rec);
        if (rec === 1) return Math.max(1, parseInt(field('archive_days') || 3, 10) || 3);
        var ts = parseFloat(timeshiftValue);
        if (isFinite(ts) && ts > 0) return Math.ceil(ts);
        var sec = parseFloat(secondsValue);
        if (isFinite(sec) && sec > 0) return Math.max(1, Math.ceil(sec / 86400));
        return 0;
    }

    function epgShiftMilliseconds(value) {
        var shift = parseFloat(value);
        return !isFinite(shift) || !shift ? 0 : Math.abs(shift) <= 12 ? shift * 3600000 : shift * 1000;
    }

    function splitUrlHeaders(source) {
        var parts = text(source).split('|'), headers = {};
        if (parts.length > 1) {
            parts.slice(1).join('|').split('&').forEach(function (pair) {
                var idx = pair.indexOf('=');
                if (idx > 0) headers[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
            });
        }
        return { url: parts[0].trim(), headers: headers };
    }

    function parseM3U(source) {
        source = text(source).replace(/^\uFEFF/, '');
        if (!/^#EXTM3U/i.test(source.trim())) throw new Error('Файл не похож на M3U-плейлист');
        var lines = source.split(/\r?\n/), header = lines[0] || '';
        var hCatchup = {
            type: attr(header, 'catchup'), source: attr(header, 'catchup-source'),
            days: attr(header, 'catchup-days'), rec: attr(header, 'tvg-rec'),
            timeshift: attr(header, 'timeshift'), seconds: attr(header, 'catchup-time'),
            epgShift: attr(header, 'tvg-shift')
        };
        var epgUrl = attr(header, 'url-tvg') || attr(header, 'x-tvg-url'), channels = [], pending = null;

        lines.slice(1).forEach(function (rawLine) {
            var line = rawLine.trim();
            if (!line) return;
            if (line.indexOf('#EXTINF:') === 0) {
                var comma = line.lastIndexOf(',');
                var name = comma >= 0 ? line.slice(comma + 1).trim() : 'Без названия';
                var recDays = attr(line, 'tvg-rec') || hCatchup.rec;
                var days = archiveDays(attr(line, 'catchup-days') || hCatchup.days, recDays, attr(line, 'timeshift') || hCatchup.timeshift, attr(line, 'catchup-time') || hCatchup.seconds);
                var type = attr(line, 'catchup') || hCatchup.type;
                var src = attr(line, 'catchup-source') || hCatchup.source;

                if (!type && src) type = /^https?:\/\//i.test(src) ? 'default' : 'append';
                if (!type && !src && recDays) type = 'shift';

                pending = {
                    id: attr(line, 'tvg-id'), tvgName: attr(line, 'tvg-name'), name: name,
                    logo: attr(line, 'tvg-logo'), group: attr(line, 'group-title') || 'Без группы',
                    url: '', headers: {}, epgShift: epgShiftMilliseconds(attr(line, 'tvg-shift') || hCatchup.epgShift),
                    catchup: { type: type, source: src, days: days }
                };
                return;
            }
            if (!pending) return;
            if (line.indexOf('#EXTGRP:') === 0) pending.group = line.slice(8).trim() || pending.group;
            else if (line.indexOf('#EXTVLCOPT:') === 0) {
                var opt = line.slice(11), idx = opt.indexOf('=');
                if (idx > 0) pending.headers[opt.slice(0, idx).trim()] = opt.slice(idx + 1).trim();
            } else if (line.charAt(0) !== '#') {
                var parsedUrl = splitUrlHeaders(line);
                pending.url = parsedUrl.url;
                Object.assign(pending.headers, parsedUrl.headers);
                if (pending.url) {
                    pending.index = channels.length;
                    channels.push(pending);
                }
                pending = null;
            }
        });
        return {
            channels: channels, epgUrl: epgUrl,
            archiveHint: channels.some(function (c) { return c.catchup.days > 0 || Boolean(c.catchup.type || c.catchup.source); })
        };
    }

    function parseXmltvDate(value) {
        var m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\s*([+-])(\d{2})(\d{2}))?/.exec(text(value));
        if (!m) return 0;
        if (!m[7]) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
        var utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
        var offset = ((+m[8] * 60) + (+m[9])) * 60000;
        return utc - (m[7] === '+' ? offset : -offset);
    }

    function guidePastDays(selectedChannels) {
        var configured = Math.max(1, parseInt(field('archive_days') || 3, 10) || 3);
        (selectedChannels && selectedChannels.length ? selectedChannels : state.channels).forEach(function (c) {
            configured = Math.max(configured, parseInt(c && c.catchup && c.catchup.days || 0, 10) || 0);
        });
        return configured;
    }

    function childText(node, tag) {
        var child = node.getElementsByTagName(tag)[0];
        return child ? text(child.textContent).trim() : '';
    }

    function parseXmltv(source) {
        var doc = new DOMParser().parseFromString(text(source), 'text/xml');
        if (doc.getElementsByTagName('parsererror').length) throw new Error('Ошибка разбора XMLTV');
        var epg = {}, names = {}, channels = doc.getElementsByTagName('channel'), programs = doc.getElementsByTagName('programme');
        var keepAfter = Date.now() - ((guidePastDays() + 1) * 86400000), keepBefore = Date.now() + (2 * 86400000);

        for (var i = 0; i < channels.length; i++) {
            var id = channels[i].getAttribute('id') || '', displays = channels[i].getElementsByTagName('display-name');
            for (var d = 0; id && d < displays.length; d++) rememberGuideName(names, text(displays[d].textContent).trim(), id);
        }
        for (var j = 0; j < programs.length; j++) {
            var node = programs[j], channelId = node.getAttribute('channel') || '';
            var start = parseXmltvDate(node.getAttribute('start')), stop = parseXmltvDate(node.getAttribute('stop'));
            if (!channelId || !start || !stop || stop < keepAfter || start > keepBefore) continue;
            if (!epg[channelId]) epg[channelId] = [];
            epg[channelId].push({ start: start, stop: stop, title: childText(node, 'title') || 'Без названия', desc: childText(node, 'desc'), category: childText(node, 'category') });
        }
        Object.keys(epg).forEach(function (id) { epg[id].sort(function (a, b) { return a.start - b.start; }); });
        return { epg: epg, names: names };
    }

    function decodeXml(value) {
        return text(value).replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function (full, entity) {
            var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
            return named[entity] ? named[entity] : entity.indexOf('#x') === 0 ? String.fromCharCode(parseInt(entity.slice(2), 16)) : entity.charAt(0) === '#' ? String.fromCharCode(parseInt(entity.slice(1), 10)) : full;
        }).trim();
    }

    function xmlAttribute(source, name) {
        var m = new RegExp('(?:^|\\s)' + name + '=(?:"([^"]*)"|\'([^\']*)\')', 'i').exec(source);
        return m ? decodeXml(m[1] || m[2] || '') : '';
    }

    function xmlValues(source, tag) {
        var values = [], rx = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '\\s*>', 'gi'), m;
        while ((m = rx.exec(source))) values.push(decodeXml(m[1]));
        return values;
    }

    var fflatePromise = null;
    function loadFflate() {
        if (window.fflate && window.fflate.Gunzip) return Promise.resolve(window.fflate);
        if (fflatePromise) return fflatePromise;
        fflatePromise = new Promise(function (resolve, reject) {
            var script = window.document.createElement('script');
            var timer = setTimeout(function () {
                script.onload = script.onerror = null;
                reject(new Error('Не удалось загрузить модуль распаковки архива'));
            }, 15000);
            script.async = true; script.src = FFLATE_URL;
            script.onload = function () { clearTimeout(timer); window.fflate && window.fflate.Gunzip ? resolve(window.fflate) : reject(new Error('Модуль не запустился')); };
            script.onerror = function () { clearTimeout(timer); reject(new Error('Не удалось загрузить модуль')); };
            (window.document.head || window.document.body).appendChild(script);
        }).catch(function (e) { fflatePromise = null; throw e; });
        return fflatePromise;
    }

    function parseXmltvStream(url, gzip, selectedChannels, timeout) {
        if (!window.fetch || !window.TextDecoder) return Promise.reject(new Error('Потоковая загрузка не поддерживается'));
        var result = { epg: {}, names: {} }, wantedExact = {}, wantedNames = {}, wantedIds = {};
        var keepAfter = Date.now() - ((guidePastDays(selectedChannels) + 1) * 86400000), keepBefore = Date.now() + (2 * 86400000);

        (selectedChannels || state.channels).forEach(function (c) {
            wantedExact[normalizeExact(c.name)] = true;
            wantedNames[normalize(c.name)] = true;
            if (c.tvgName) { wantedExact[normalizeExact(c.tvgName)] = true; wantedNames[normalize(c.tvgName)] = true; }
            if (c.id) wantedIds[c.id] = true;
        });

        function accept(kind, attrStr, body) {
            if (kind === 'channel') {
                var id = xmlAttribute(attrStr, 'id'), names = xmlValues(body, 'display-name');
                if (id && names.some(function (n) { return wantedExact[normalizeExact(n)] || wantedNames[normalize(n)]; })) {
                    wantedIds[id] = true;
                    names.forEach(function (n) { rememberGuideName(result.names, n, id); });
                }
                return;
            }
            var channelId = xmlAttribute(attrStr, 'channel');
            if (!wantedIds[channelId]) return;
            var start = parseXmltvDate(xmlAttribute(attrStr, 'start')), stop = parseXmltvDate(xmlAttribute(attrStr, 'stop'));
            if (!start || !stop || stop < keepAfter || start > keepBefore) return;
            if (!result.epg[channelId]) result.epg[channelId] = [];
            result.epg[channelId].push({ start: start, stop: stop, title: xmlValues(body, 'title')[0] || 'Без названия', desc: xmlValues(body, 'desc')[0] || '', category: xmlValues(body, 'category')[0] || '' });
        }

        var controller = window.AbortController ? new window.AbortController() : null;
        var timer, timeoutPromise = new Promise(function (_, reject) {
            timer = setTimeout(function () {
                if (controller) controller.abort();
                reject(new Error('Превышено время загрузки телепрограммы'));
            }, timeout || 45000);
        });

        var loading = window.fetch(url, controller ? { signal: controller.signal } : {}).then(function (res) {
            if (!res.ok || !res.body) throw new Error('Не удалось загрузить EPG');
            var decoder = new window.TextDecoder('utf-8'), buffer = '';

            function consume(final) {
                var rx = /<(channel|programme)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi, m, consumed = 0;
                while ((m = rx.exec(buffer))) { accept(m[1].toLowerCase(), m[2], m[3]); consumed = rx.lastIndex; }
                if (consumed) buffer = buffer.slice(consumed);
                if (!final && buffer.length > 1048576) {
                    var safe = Math.max(buffer.lastIndexOf('<channel'), buffer.lastIndexOf('<programme'));
                    if (safe > 0) buffer = buffer.slice(safe);
                }
            }
            function finish(resolve) {
                Object.keys(result.epg).forEach(function (id) { result.epg[id].sort(function (a, b) { return a.start - b.start; }); });
                clearTimeout(timer); resolve(result);
            }
            function readNative(stream) {
                var reader = stream.getReader();
                return new Promise(function (resolve, reject) {
                    function read() {
                        reader.read().then(function (chunk) {
                            if (chunk.done) { buffer += decoder.decode(); consume(true); finish(resolve); return; }
                            buffer += decoder.decode(chunk.value, { stream: true }); consume(false); read();
                        }).catch(reject);
                    }
                    read();
                });
            }
            if (!gzip) return readNative(res.body);
            if (window.DecompressionStream) return readNative(res.body.pipeThrough(new window.DecompressionStream('gzip')));
            return loadFflate().then(function (fflate) {
                var reader = res.body.getReader(), completed = false;
                return new Promise(function (resolve, reject) {
                    var gunzip = new fflate.Gunzip(function (chunk, final) {
                        try {
                            buffer += decoder.decode(chunk, { stream: !final }); consume(Boolean(final));
                            if (final && !completed) { completed = true; finish(resolve); }
                        } catch (e) { completed = true; reject(e); }
                    });
                    function read() {
                        reader.read().then(function (part) {
                            if (completed) return;
                            gunzip.push(part.value || new Uint8Array(0), Boolean(part.done));
                            if (!part.done) read();
                        }).catch(reject);
                    }
                    read();
                });
            });
        });

        return Promise.race([loading, timeoutPromise]).then(function (g) { clearTimeout(timer); return g; }).catch(function (e) { clearTimeout(timer); throw e; });
    }

    function loadGuide(url, selectedChannels, timeout) {
        var gzip = /\.gz(?:$|[?#])/i.test(url);
        return (window.fetch && window.TextDecoder) ? parseXmltvStream(url, gzip, selectedChannels, timeout) : gzip ? Promise.reject(new Error('Не поддерживается GZ')) : requestText(url).then(parseXmltv);
    }

    function mergeGuide(guide, replace) {
        if (replace) {
            state.epg = guide.epg || {};
            state.epgNames = guide.names || {};
        } else {
            Object.assign(state.epg, guide.epg || {});
            Object.assign(state.epgNames, guide.names || {});
        }
    }

    function refreshGuideUi() {
        if (!state.component) return;
        if (state.component.refreshOpenChannel && state.component.refreshOpenChannel()) return;
        if (state.component.build) state.component.build(true);
    }

    function startGuideLoad(url, automatic) {
        var ticket = ++state.guideTicket;
        state.guideLoading = true;
        state.guideMode = automatic ? 'today' : 'full';
        return state.guidePromise = loadGuide(url, null, 45000).then(function (guide) {
            if (ticket !== state.guideTicket) return state;
            mergeGuide(guide, true);
            state.guideLoading = false; state.guidePromise = null;
            refreshGuideUi(); return state;
        }).catch(function (err) {
            if (ticket !== state.guideTicket) return state;
            state.guideLoading = false; state.guidePromise = null;
            refreshGuideUi();
            notify(automatic ? 'Каналы загружены, но EPG недоступен' : 'Каналы загружены, но XMLTV недоступен');
            return state;
        });
    }

    function guideCacheKey(c) { return normalizeExact(c.name) + '|' + normalizeExact(c.group); }

    function restoreArchiveGuide(c) {
        var key = guideCacheKey(c);
        if (state.archiveReady[key]) return true;
        var cache = storage('archive_cache', []);
        if (!Array.isArray(cache)) return false;
        var found = cache.filter(function (e) { return e && e.key === key && e.time > Date.now() - 21600000; })[0];
        if (!found || !found.guide) return false;
        mergeGuide(found.guide, false);
        state.archiveReady[key] = true;
        return true;
    }

    function saveArchiveGuide(c, guide) {
        var key = guideCacheKey(c), cache = storage('archive_cache', []);
        if (!Array.isArray(cache)) cache = [];
        cache = cache.filter(function (e) { return e && e.key !== key; });
        cache.unshift({ key: key, time: Date.now(), guide: guide });
        try { Lampa.Storage.set(PLUGIN + '_archive_cache', cache.slice(0, 10)); } catch (e) {}
    }

    function guideProgramsForChannel(c, guide) {
        var names = guide.names || {}, epg = guide.epg || {};
        var id = c.id && epg[c.id] ? c.id :
                 c.tvgName && names['exact:' + normalizeExact(c.tvgName)] ? names['exact:' + normalizeExact(c.tvgName)] :
                 names['exact:' + normalizeExact(c.name)] ? names['exact:' + normalizeExact(c.name)] :
                 c.tvgName && names['relaxed:' + normalize(c.tvgName)] ? names['relaxed:' + normalize(c.tvgName)] :
                 names['relaxed:' + normalize(c.name)];
        return id && epg[id] ? epg[id] : [];
    }

    function loadArchiveGuide(c) {
        var key = guideCacheKey(c);
        if (state.guideMode === 'full' || restoreArchiveGuide(c)) return Promise.resolve(state);
        if (state.archiveLoading[key]) return state.archiveLoading[key];

        var src = /[а-яё]/i.test(c.name) ? AUTO_EPG_RU_URL : AUTO_EPG_URL;
        var fallback = src === AUTO_EPG_RU_URL ? AUTO_EPG_URL : AUTO_EPG_RU_URL;

        function loadMatch(url) {
            return loadGuide(url, [c], 60000).then(function (guide) {
                var oldest = Date.now() - ((c.catchup.days || 1) * 86400000);
                if (!guideProgramsForChannel(c, guide).some(function (p) { return p.start >= oldest && p.stop < Date.now(); })) {
                    throw new Error('Архив не найден');
                }
                return guide;
            });
        }

        return state.archiveLoading[key] = loadMatch(src).catch(function () {
            return loadMatch(fallback);
        }).then(function (guide) {
            mergeGuide(guide, false);
            state.archiveReady[key] = true;
            delete state.archiveFailed[key];
            saveArchiveGuide(c, guide);
            delete state.archiveLoading[key];
            refreshGuideUi();
            return state;
        }).catch(function (err) {
            delete state.archiveLoading[key];
            state.archiveFailed[key] = err && err.message ? err.message : 'Не удалось загрузить архив';
            refreshGuideUi();
            throw err;
        });
    }

    function epgId(c) {
        var names = state.epgNames, epg = state.epg;
        return c.id && epg[c.id] ? c.id :
               c.tvgName && names['exact:' + normalizeExact(c.tvgName)] ? names['exact:' + normalizeExact(c.tvgName)] :
               names['exact:' + normalizeExact(c.name)] ? names['exact:' + normalizeExact(c.name)] :
               c.tvgName && names['relaxed:' + normalize(c.tvgName)] ? names['relaxed:' + normalize(c.tvgName)] :
               names['relaxed:' + normalize(c.name)] || c.id || '';
    }

    function programs(c) {
        var list = state.epg[epgId(c)] || [], shift = c && c.epgShift || 0;
        if (!shift) return list;
        return list.map(function (p) { return Object.assign({}, p, { start: p.start + shift, stop: p.stop + shift }); });
    }

    function currentProgramIndex(c, at, prep) {
        at = at || Date.now();
        var list = prep || programs(c), low = 0, high = list.length - 1;
        while (low <= high) {
            var mid = (low + high) >> 1, p = list[mid];
            if (p.start > at) high = mid - 1;
            else if (p.stop <= at) low = mid + 1;
            else return mid;
        }
        return -1;
    }

    function programProgress(p, at) {
        if (!p || !p.start || !p.stop || p.stop <= p.start) return 0;
        at = at || Date.now();
        return Math.max(0, Math.min(100, Math.round(((at - p.start) / (p.stop - p.start)) * 100)));
    }

    function pad(v) { return ('0' + v).slice(-2); }

    function formatDate(ts, pattern, utc) {
        var d = new Date(ts * 1000), get = function (l, u) { return d[utc ? u : l](); };
        var vals = { yyyy: get('getFullYear', 'getUTCFullYear'), MM: pad(get('getMonth', 'getUTCMonth') + 1), dd: pad(get('getDate', 'getUTCDate')), HH: pad(get('getHours', 'getUTCHours')), mm: pad(get('getMinutes', 'getUTCMinutes')), ss: pad(get('getSeconds', 'getUTCSeconds')) };
        return text(pattern || 'yyyy-MM-dd:HH-mm').replace(/yyyy|MM|dd|HH|mm|ss/g, function (k) { return vals[k]; });
    }

    function normalizeCatchupVariables(tpl) {
        var aliases = { utc: 'start', lutc: 'timestamp', current_utc: 'timestamp', utcend: 'end', start_iso: 'start_iso', end_iso: 'end_iso', now_iso: 'now_iso' };
        return text(tpl).replace(/(^|[^$])\{([a-z_][a-z0-9_-]*)\}/gi, function (_, prefix, name) {
            return prefix + '${' + (aliases[name.toLowerCase()] || name) + '}';
        });
    }

    function setCatchupQuery(tpl, name, val) {
        var hIdx = tpl.indexOf('#'), hash = hIdx >= 0 ? tpl.slice(hIdx) : '', base = hIdx >= 0 ? tpl.slice(0, hIdx) : tpl;
        var rx = new RegExp('([?&])' + name + '=[^&#]*', 'i');
        if (rx.test(base)) base = base.replace(rx, function (_, sep) { return sep + name + '=' + val; });
        else base += (base.indexOf('?') >= 0 ? '&' : '?') + name + '=' + val;
        return base + hash;
    }

    function shiftTemplate(url) {
        return setCatchupQuery(setCatchupQuery(normalizeCatchupVariables(url), 'utc', '${start}'), 'lutc', '${timestamp}');
    }

    function hasCatchupTimeVariables(tpl) {
        return /\$\{(?:start|utc|end|utcend|timestamp|lutc|current_utc|now|offset|duration|durationfs|durmin|start_iso|end_iso|now_iso|start-|end-|\([ben])/i.test(tpl);
    }

    function catchupTemplate(c) {
        var type = text(c.catchup.type).toLowerCase(), src = normalizeCatchupVariables(c.catchup.source || ''), url = normalizeCatchupVariables(c.url);
        if (!type) {
            type = src ? (/^https?:\/\//i.test(src) ? 'default' : 'append') : url.indexOf('${') >= 0 ? 'default' : c.catchup.days > 0 ? 'shift' : '';
        }
        if (!type || type === 'disabled' || type === 'none') return false;
        if (type === 'default' || type === 'append') {
            var full = type === 'append' ? (src && /^https?:\/\//i.test(src) ? '' : url) + src : (src || url);
            return hasCatchupTimeVariables(full) ? full : shiftTemplate(full);
        }
        if (type === 'shift') return shiftTemplate(src || url);
        if (type === 'timeshift') return setCatchupQuery(setCatchupQuery(src || url, 'timeshift', '${start}'), 'timenow', '${timestamp}');
        if (type === 'archive') return setCatchupQuery(setCatchupQuery(src || url, 'archive', '${start}'), 'archive_end', '${end}');
        if (/flussonic|fs/.test(type)) {
            return url.replace(/\/(video\d*|mono\d*)\.(m3u8|ts)(\?|$)/, '/$1-${start}-${durationfs}.$2$3')
                      .replace(/\/(index|playlist)\.(m3u8|ts)(\?|$)/, '/archive-${start}-${durationfs}.$2$3')
                      .replace(/\/mpegts(\?|$)/, '/timeshift_abs-${start}.ts$1')
                      .replace(/\/live(\?|$)/, '/${start}.ts$1');
        }
        if (type === 'xc' || type === 'xtream') {
            return url.replace(/^(https?:\/\/[^/]+)(\/live)?(\/[^/]+\/[^/]+\/)([^/.]+)\.m3u8?$/, '$1/timeshift$3${(d)M}/${(b)yyyy-MM-dd:HH-mm}/$4.m3u8')
                      .replace(/^(https?:\/\/[^/]+)(\/live)?(\/[^/]+\/[^/]+\/)([^/.]+)(\.ts|)$/, '$1/timeshift$3${(d)M}/${(b)yyyy-MM-dd:HH-mm}/$4.ts');
        }
        return false;
    }

    function buildArchiveUrl(c, p) {
        var tpl = catchupTemplate(c);
        if (!tpl || !p) return false;
        var start = Math.floor(p.start / 1000), end = Math.floor(p.stop / 1000), now = Math.floor(Date.now() / 1000);
        var duration = Math.max(1, end - start);
        var vals = {
            start: start, utc: start, end: end, utcend: end, timestamp: now, lutc: now, now: now,
            offset: Math.max(0, now - start), duration: duration, durationfs: end > now ? 'now' : duration,
            durmin: Math.max(1, Math.floor(duration / 60)),
            start_iso: new Date(start * 1000).toISOString(), end_iso: new Date(end * 1000).toISOString(), now_iso: new Date(now * 1000).toISOString()
        };
        ['year', 'mon', 'day', 'hour', 'min', 'sec'].forEach(function (part, i) {
            var pat = ['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss'][i];
            vals['start-' + part] = formatDate(start, pat, false);
            vals['end-' + part] = formatDate(end, pat, false);
        });

        return normalizeCatchupVariables(tpl).replace(/\$\{([^}]+)\}/g, function (full, expr) {
            var m = /^\(([ben])(u)?\)(.+)$/.exec(expr);
            if (m) return encodeURIComponent(formatDate(m[1] === 'b' ? start : m[1] === 'e' ? end : now, m[3], Boolean(m[2])));
            if (expr === '(d)M') return Math.max(1, Math.ceil(duration / 60));
            return Object.prototype.hasOwnProperty.call(vals, expr) ? encodeURIComponent(vals[expr]) : full;
        });
    }

    function prepareLiveUrl(url) {
        var now = Math.floor(Date.now() / 1000);
        return normalizeCatchupVariables(url).replace(/\$\{(start|utc|timestamp|lutc|current_utc|now)\}/gi, function () { return String(now); });
    }

    function canArchive(c, p) {
        return Boolean(p && c.catchup.days && catchupTemplate(c) && p.start >= Date.now() - (c.catchup.days * 86400000) && p.start <= Date.now());
    }

    function formatTime(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    
    function dayLabel(key) {
        var parts = text(key).split('-'), d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        var today = dayKey(Date.now()), yesterday = dayKey(Date.now() - 86400000), tomorrow = dayKey(Date.now() + 86400000);
        return key === today ? 'Сегодня' : key === yesterday ? 'Вчера' : key === tomorrow ? 'Завтра' : ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()] + ', ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
    }

    function qualityLabel(c) {
        var m = /(?:^|[^a-zа-я0-9])(4k|uhd|fhd|hd)(?:$|[^a-zа-я0-9])/i.exec(c.name);
        return m ? m[1].toUpperCase() : '';
    }

    function playArchive(c, p, archiveList) {
        var url = buildArchiveUrl(c, p);
        if (!url) return notify('Для этого канала не описан адрес архива');
        addToHistory(c);
        function convert(item) {
            return {
                title: formatTime(item.start) + ' — ' + item.title,
                url: buildArchiveUrl(c, item),
                error: function () { notify('Архив не открылся'); }
            };
        }
        Lampa.Player.runas(Lampa.Storage.field('player_iptv'));
        Lampa.Player.play(convert(p));
        setTimeout(function () {
            Lampa.Player.playlist((archiveList || []).filter(function (item) { return canArchive(c, item); }).map(convert));
        }, 0);
    }

    function recentPrograms(c) {
        var now = Date.now(), limit = (c.catchup.days || 1) * 86400000;
        return programs(c).filter(function (p) { return p.start <= now + 21600000 && p.stop >= now - limit; });
    }

    function showPrograms(c, returnCtrl) {
        var list = recentPrograms(c).reverse();
        if (!list.length) return notify('Для канала нет телепрограммы');
        var enabled = returnCtrl || Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: c.name + ' — архив',
            items: list.map(function (p) {
                var avail = canArchive(c, p);
                return { title: formatTime(p.start) + '–' + formatTime(p.stop) + '  ' + p.title, subtitle: p.desc || (avail ? 'Доступно в архиве' : 'Только программа'), program: p, available: avail };
            }),
            onSelect: function (item) {
                if (!item.available) return notify('Эта передача недоступна в архиве');
                Lampa.Select.hide();
                playArchive(c, item.program, list.slice().reverse());
            },
            onBack: function () { Lampa.Controller.toggle(enabled); }
        });
    }

    function showChannelSelect(c, index) {
        restoreArchiveGuide(c);
        var enabled = Lampa.Controller.enabled().name, now = Date.now(), guide = recentPrograms(c);
        var cur = currentProgramIndex(c), archiveKey = guideCacheKey(c), err = state.archiveFailed[archiveKey];
        var needsHist = state.autoEpg && c.catchup.days > 0 && state.guideMode !== 'full' && !state.archiveReady[archiveKey] && !err;
        
        var items = [
            { title: '▶ Прямой эфир', subtitle: cur >= 0 && programs(c)[cur] ? programs(c)[cur].title : 'Смотреть канал сейчас', thumbnail: c.logo, action: 'live' },
            { title: '♥ Favorites', subtitle: isFavorite(c) ? 'Канал добавлен в избранное' : 'Добавить канал в избранное', checkbox: true, checked: isFavorite(c), action: 'favorite' }
        ];

        if (guide.length) {
            items.push({ title: 'Программа передач и архив', separator: true });
            guide.filter(function (p) { return p.start <= now && p.stop > now; })
                 .concat(guide.filter(function (p) { return p.stop <= now; }).reverse())
                 .concat(guide.filter(function (p) { return p.start > now; }))
                 .forEach(function (p) {
                     var avail = canArchive(c, p), isNow = p.start <= now && p.stop > now;
                     items.push({
                         title: (avail ? '↶ ' : isNow ? '● ' : '') + formatTime(p.start) + '–' + formatTime(p.stop) + '  ' + p.title,
                         subtitle: isNow ? (avail ? 'Сейчас · можно смотреть с начала' : 'Сейчас в эфире') : avail ? 'Доступно в архиве' : p.start > now ? 'Далее' : 'Архив недоступен',
                         program: p, available: avail, noenter: !avail, action: 'program'
                     });
                 });
        } else {
            items.push({ title: state.guideLoading ? 'Телепрограмма загружается…' : 'Телепрограмма не найдена', subtitle: state.guideLoading ? 'Прямой эфир уже можно запускать' : 'Проверьте адрес XMLTV', noenter: true });
        }

        if (needsHist) items.push({ title: state.archiveLoading[archiveKey] ? 'Архив прошлых дней загружается…' : 'Подготовка архива прошлых дней…', subtitle: 'Меню обновится автоматически', noenter: true });
        if (err) items.push({ title: '↻ Повторить загрузку архива', subtitle: err, action: 'retry-archive' });

        state.selectedChannel = archiveKey;
        Lampa.Select.show({
            title: c.name, items: items, nohide: true,
            onCheck: function (item) {
                if (item.action === 'favorite') {
                    setFavorite(c, item.checked);
                    item.subtitle = item.checked ? 'Канал добавлен в избранное' : 'Добавить канал в избранное';
                    notify(item.checked ? 'Канал добавлен в Favorites' : 'Канал удалён из Favorites');
                }
            },
            onSelect: function (item) {
                if (item.action === 'live') { state.selectedChannel = ''; Lampa.Select.hide(); playLive(index); }
                else if (item.action === 'program' && item.available) { state.selectedChannel = ''; Lampa.Select.hide(); playArchive(c, item.program, guide); }
                else if (item.action === 'retry-archive') { delete state.archiveFailed[archiveKey]; Lampa.Select.hide(); showChannel(c, index); }
            },
            onBack: function () { state.selectedChannel = ''; Lampa.Controller.toggle(enabled); }
        });

        if (needsHist && !state.archiveLoading[archiveKey]) {
            loadArchiveGuide(c).then(function () {
                if (state.selectedChannel === archiveKey) { Lampa.Select.hide(); showChannel(c, index); notify('Архив канала загружен'); }
            }).catch(function () {});
        }
    }

    function showChannel(c, index) {
        if (state.component && state.component.openChannel) state.component.openChannel(c, index);
        else showChannelSelect(c, index);
    }

    function playerIcons(c) {
        var cur = programs(c)[currentProgramIndex(c)], icons = [isFavorite(c) ? '♥' : '♡'];
        if (canArchive(c, cur)) icons.push('↶');
        return icons;
    }

    function refreshPlayerIcons(c) {
        var name = $('.player-panel-iptv-item.active .player-panel-iptv-item__name');
        name.find('.player-panel-iptv-item__icons-item').remove();
        playerIcons(c).forEach(function (icon) { name.append('<div class="player-panel-iptv-item__icons-item">' + icon + '</div>'); });
    }

    function showPlayerMenu(obj) {
        var c = obj.original, enabled = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: c.name, nohide: true,
            items: [
                { title: '♥ Favorites', subtitle: isFavorite(c) ? 'Канал добавлен в избранное' : 'Добавить канал в избранное', checkbox: true, checked: isFavorite(c), action: 'favorite' },
                { title: 'Программа передач и архив', action: 'program' }
            ],
            onCheck: function (item) {
                if (item.action === 'favorite') {
                    setFavorite(c, item.checked); obj.icons = playerIcons(c); refreshPlayerIcons(c);
                    notify(item.checked ? 'Канал добавлен в Favorites' : 'Канал удалён из Favorites');
                }
            },
            onSelect: function (item) { if (item.action === 'program') { Lampa.Select.hide(); showPrograms(c, enabled); } },
            onBack: function () { Lampa.Controller.toggle(enabled); }
        });
    }

    function playerChannel(c) {
        return { name: c.name, group: c.group, logo: c.logo, url: prepareLiveUrl(c.url), original: c, icons: playerIcons(c) };
    }

    function playLive(index) {
        var channels = state.visible;
        if (!channels.length || index < 0 || index >= channels.length) return notify('Канал больше не находится в категории');
        addToHistory(channels[index]);

        Lampa.Player.runas(Lampa.Storage.field('player_iptv'));
        Lampa.Player.iptv({
            title: channels[index].name, url: prepareLiveUrl(channels[index].url), position: index, total: channels.length,
            onGetChannel: function (pos) {
                var org = channels[pos] || channels[index], ch = playerChannel(org);
                var list = programs(org), cur = currentProgramIndex(org, Date.now(), list);
                setTimeout(function () { Lampa.Player.programReady({ channel: ch, position: Math.max(0, cur), total: list.length }); }, 20);
                return ch;
            },
            onGetProgram: function (ch, pos, container) {
                var org = ch.original, list = programs(org), cur = currentProgramIndex(org, Date.now(), list);
                var start = Math.max(0, Math.min(pos, list.length - 1)), html = '';
                list.slice(start, start + 2).forEach(function (p, o) {
                    html += '<div class="player-panel-iptv-item__prog-item' + (start + o === cur ? ' watch' : '') + '"><span>' + escapeHtml(formatTime(p.start) + '–' + formatTime(p.stop) + '  ' + p.title) + '</span></div>';
                });
                $(container[0] || container).html(html || '<div class="player-panel-iptv-item__prog-load">Нет программы</div>');
            },
            onPlaylistProgram: function (ch) { showPrograms(ch.original); },
            onMenu: function (ch) { showPlayerMenu(ch); }
        });
    }

    function loadData(force) {
        if (!force && state.channels.length && Date.now() - state.loadedAt < 600000) return Promise.resolve(state);
        var playlistUrl = field('playlist');
        if (!playlistUrl) return Promise.reject(new Error('Укажите URL M3U'));

        return requestText(playlistUrl).then(function (m3u) {
            var parsed = parseM3U(m3u);
            state.channels = parsed.channels; state.visible = parsed.channels.slice();
            state.groups = []; state.groupCounts = {};
            parsed.channels.forEach(function (c) {
                if (!Object.prototype.hasOwnProperty.call(state.groupCounts, c.group)) {
                    state.groups.push(c.group); state.groupCounts[c.group] = 0;
                }
                state.groupCounts[c.group]++;
            });
            state.playlistEpg = parsed.epgUrl; state.archiveHint = parsed.archiveHint; state.loadedAt = Date.now();
            state.epg = {}; state.epgNames = {}; state.guideMode = 'none'; state.guideLoading = false;
            state.guidePromise = null; state.archiveLoading = {}; state.archiveReady = {}; state.archiveFailed = {};
            state.guideTicket++;

            var guideUrl = field('epg') || parsed.epgUrl, auto = !guideUrl && parsed.archiveHint;
            state.autoEpg = auto;
            if (auto) guideUrl = AUTO_EPG_LITE_URL;
            if (guideUrl) {
                var t = state.guideTicket;
                setTimeout(function () { if (t === state.guideTicket) startGuideLoad(guideUrl, auto); }, 50);
            }
            return state;
        });
    }

    function editAddress(component, type) {
        var isPlaylist = type === 'playlist';
        Lampa.Input.edit({
            title: isPlaylist ? 'URL M3U-плейлиста' : 'URL телепрограммы XMLTV',
            value: field(type) || '', free: true, nosave: true, nomic: true
        }, function (val) {
            Lampa.Controller.toggle('content');
            val = text(val).trim();
            if (!val && isPlaylist) return;
            Lampa.Storage.set(PLUGIN + '_' + type, val);
            Object.assign(state, {
                channels: [], visible: [], epg: {}, epgNames: {}, archiveHint: false, autoEpg: false,
                guideMode: 'none', guideLoading: false, guidePromise: null, archiveLoading: {}, archiveReady: {}, archiveFailed: {}
            });
            state.guideTicket++; state.loadedAt = 0;
            component.activity.loader(true);

            loadData(true).then(function () {
                component.renderLimit = CHANNEL_PAGE_SIZE; component.build();
                component.activity.loader(false); component.start();
                notify(isPlaylist ? 'Плейлист сохранён' : 'Телепрограмма сохранена');
            }).catch(function (err) {
                component.activity.loader(false); component.renderError(err); component.start();
                notify(err.message || 'Ошибка загрузки');
            });
        });
    }

    function Component(object) {
        var self = this;
        this.object = object || {};
        this.category = 'all';
        this.searchQuery = '';
        this.detailChannel = null;
        this.detailIndex = -1;
        this.detailDay = '';
        this.detailLast = null;
        this.detailPendingFocus = '';
        this.historyDirty = false;
        this.channelFocus = {};
        this.html = $('<div class="iptv-plus-screen"><div class="iptv-plus-head"><div class="iptv-plus-title">IPTV+<span></span></div><div class="iptv-plus-clock"></div></div><div class="iptv-plus-toolbar"></div><div class="iptv-plus-layout"><div class="iptv-plus-sidebar"></div><div class="iptv-plus-list"></div></div><div class="iptv-plus-detail"></div></div>');
        this.last = null;
        this.clockTimer = 0;
        this.archiveTimer = 0;
        this.renderLimit = CHANNEL_PAGE_SIZE;

        this.updateClock = function () {
            var now = new Date(), days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            self.html.find('.iptv-plus-clock').text(days[now.getDay()] + ', ' + pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '  ' + pad(now.getHours()) + ':' + pad(now.getMinutes()));
        };

        this.focused = function (el) {
            self.last = el;
            if (el && $(el).hasClass('iptv-plus-channel')) self.channelFocus[self.category] = $(el).data('channel-key');
            if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        };

        this.focusElement = function (el, container) {
            if (!el) return false;
            Lampa.Controller.collectionFocus(el, container || self.html);
            return true;
        };

        this.focusedElement = function (container) {
            return (container || self.html).find('.selector.focus')[0] || null;
        };

        this.create = function () {
            state.component = self;
            self.updateClock();
            clearInterval(self.clockTimer);
            self.clockTimer = setInterval(self.updateClock, 30000);
            self.activity.loader(true);
            loadData(false).then(function () {
                self.build(); self.activity.loader(false); self.activity.toggle();
            }).catch(function (err) {
                self.activity.loader(false); self.renderError(err); self.activity.toggle();
            });
            return self.render();
        };

        this.buildToolbar = function () {
            var toolbar = self.html.find('.iptv-plus-toolbar').empty();
            var pb = $('<div class="iptv-plus-button selector"><b>＋</b> Плейлист</div>');
            var eb = $('<div class="iptv-plus-button selector">' + (state.guideLoading ? 'EPG: загрузка…' : state.autoEpg ? 'EPG: AUTO' : 'EPG вручную') + '</div>');
            var sb = $('<div class="iptv-plus-button selector">⌕ Поиск' + (self.searchQuery ? ': ' + escapeHtml(self.searchQuery) : '') + '</div>');
            var rb = $('<div class="iptv-plus-button selector">↻ Обновить</div>');

            pb.on('hover:enter', function () { editAddress(self, 'playlist'); });
            eb.on('hover:enter', function () { editAddress(self, 'epg'); });
            sb.on('hover:enter', function () {
                Lampa.Input.edit({ title: 'Поиск телеканала', value: self.searchQuery, free: true, nosave: true, nomic: true }, function (val) {
                    Lampa.Controller.toggle('content');
                    self.searchQuery = text(val).trim();
                    self.category = self.searchQuery ? 'search' : 'all';
                    self.renderLimit = CHANNEL_PAGE_SIZE; self.build(); self.start();
                });
            });
            rb.on('hover:enter', function () {
                self.activity.loader(true);
                loadData(true).then(function () {
                    self.renderLimit = CHANNEL_PAGE_SIZE; self.build();
                    self.activity.loader(false); self.start(); notify('IPTV+ обновлён');
                }).catch(function (err) {
                    self.activity.loader(false); self.renderError(err); notify(err.message || 'Ошибка обновления');
                });
            });
            toolbar.append(pb, sb, eb, rb);
            toolbar.find('.selector').on('hover:focus', function () { self.focused(this); });
        };

        this.buildCategories = function (favorites) {
            var sidebar = self.html.find('.iptv-plus-sidebar').empty();
            var favCount = state.channels.filter(function (c) { return favoriteInLookup(c, favorites); }).length;
            var cats = [
                { id: 'favorites', title: 'Favorites', icon: '♥', count: favCount },
                { id: 'all', title: 'All', icon: '▦', count: state.channels.length },
                { id: 'recent', title: 'Недавние', icon: '◷', count: historyChannels().length }
            ];

            if (self.searchQuery) {
                var q = normalizeExact(self.searchQuery);
                cats.push({ id: 'search', title: 'Поиск', icon: '⌕', count: state.channels.filter(function (c) { return normalizeExact(c.name + ' ' + c.group).indexOf(q) >= 0; }).length });
            }

            cats = cats.concat(state.groups.map(function (g) {
                return { id: 'group:' + g, title: g, icon: text(g).slice(0, 1).toUpperCase(), count: state.groupCounts[g] || 0 };
            }));

            cats.forEach(function (item) {
                var btn = $('<div class="iptv-plus-category selector' + (item.id === self.category ? ' active' : '') + '"><div class="iptv-plus-category-icon">' + escapeHtml(item.icon) + '</div><div class="iptv-plus-category-name">' + escapeHtml(item.title) + '</div><div class="iptv-plus-category-count">' + item.count + '</div></div>');
                btn.on('hover:focus', function () { self.focused(this); });
                btn.on('hover:enter', function () {
                    self.category = item.id;
                    if (item.id !== 'search') self.searchQuery = '';
                    self.renderLimit = CHANNEL_PAGE_SIZE; self.build();
                    self.last = self.html.find('.iptv-plus-category.active')[0]; self.start();
                });
                sidebar.append(btn);
            });
        };

        this.renderError = function (err) {
            self.buildToolbar();
            self.html.find('.iptv-plus-title span').text(' / настройка');
            self.html.find('.iptv-plus-sidebar').empty();
            var list = self.html.find('.iptv-plus-list').empty();
            var empty = $('<div class="iptv-plus-empty"><div class="iptv-plus-empty-icon">TV</div><div class="iptv-plus-empty-copy"><div class="iptv-plus-empty-title">Добавьте IPTV-плейлист</div><div class="iptv-plus-empty-text">' + escapeHtml(err && (err.message || err) || 'Укажите прямую ссылку на M3U/M3U8') + '</div><div class="iptv-plus-empty-hint">После загрузки здесь появятся каналы, программа передач и архив.</div></div><div class="iptv-plus-empty-action selector">＋ Добавить M3U</div></div>');
            empty.find('.iptv-plus-empty-action').on('hover:focus', function () { self.focused(this); });
            empty.find('.iptv-plus-empty-action').on('hover:enter', function () { editAddress(self, 'playlist'); });
            list.append(empty);
        };

        this.build = function (preserveCategoryFocus) {
            self.last = null;
            var favorites = favoriteLookup();
            self.buildToolbar(); self.buildCategories(favorites);
            var listContainer = self.html.find('.iptv-plus-list').empty();

            if (self.category === 'favorites') state.visible = state.channels.filter(function (c) { return favoriteInLookup(c, favorites); });
            else if (self.category === 'recent') state.visible = historyChannels();
            else if (self.category === 'search') {
                var q = normalizeExact(self.searchQuery);
                state.visible = state.channels.filter(function (c) { return normalizeExact(c.name + ' ' + c.group).indexOf(q) >= 0; });
            } else if (self.category.indexOf('group:') === 0) {
                var group = self.category.slice(6);
                state.visible = state.channels.filter(function (c) { return c.group === group; });
            } else state.visible = state.channels.slice();

            var catTitle = self.category === 'favorites' ? 'Favorites' : self.category === 'recent' ? 'Недавние' : self.category === 'search' ? 'Поиск: ' + self.searchQuery : self.category === 'all' ? 'All' : self.category.slice(6);
            self.html.find('.iptv-plus-title span').text(' / ' + catTitle + ' · ' + state.visible.length);

            var displayed = state.visible.slice(0, self.renderLimit);
            displayed.forEach(function (c, index) {
                var chPrograms = programs(c), curPos = currentProgramIndex(c, Date.now(), chPrograms);
                var cur = curPos >= 0 ? chPrograms[curPos] : null, prog = programProgress(cur);
                var time = cur ? formatTime(cur.start) + '–' + formatTime(cur.stop) : 'Программа не найдена', quality = qualityLabel(c);
                var row = $('<div class="iptv-plus-channel selector"><div class="iptv-plus-number">' + pad((c.index || 0) + 1) + '</div><div class="iptv-plus-logo"></div><div class="iptv-plus-channel-body"><div class="iptv-plus-name">' + escapeHtml(c.name) + (quality ? ' <span class="iptv-plus-quality">' + quality + '</span>' : '') + '</div><div class="iptv-plus-now">' + escapeHtml(cur ? cur.title : c.group) + '</div><div class="iptv-plus-time">' + escapeHtml(time) + '</div><div class="iptv-plus-progress"><i style="width:' + prog + '%"></i></div></div><div class="iptv-plus-channel-flags">' + (favoriteInLookup(c, favorites) ? '<div class="iptv-plus-heart">♥</div>' : '') + (canArchive(c, cur) ? '<div class="iptv-plus-archive">↶ Архив</div>' : '') + '<div class="iptv-plus-chevron">›</div></div></div>');
                row.data('channel-key', channelKey(c));
                var logo = row.find('.iptv-plus-logo');
                if (c.logo) logo.append('<img loading="lazy" src="' + escapeHtml(c.logo) + '">');
                else logo.text(c.name.slice(0, 2).toUpperCase());

                row.on('hover:focus', function () { self.focused(this); });
                row.on('hover:enter', function () { showChannel(c, index); });
                listContainer.append(row);
            });

            if (displayed.length < state.visible.length) {
                var rem = state.visible.length - displayed.length;
                var more = $('<div class="iptv-plus-more selector"><b>Показать ещё</b><span>' + rem + ' каналов</span></div>');
                more.on('hover:focus', function () { self.focused(this); });
                more.on('hover:enter', function () {
                    var firstNew = displayed.length;
                    self.renderLimit += CHANNEL_PAGE_SIZE; self.build();
                    self.last = self.html.find('.iptv-plus-channel').eq(firstNew)[0]; self.start();
                });
                listContainer.append(more);
            }

            if (!state.visible.length) {
                var emptyTitle = self.category === 'favorites' ? 'Favorites пока пуст' : self.category === 'recent' ? 'История пуста' : self.category === 'search' ? 'Каналы не найдены' : 'В категории нет каналов';
                var emptyText = self.category === 'favorites' ? 'Откройте канал и нажмите ♥ Favorites.' : self.category === 'recent' ? 'Запущенные каналы появятся здесь.' : self.category === 'search' ? 'Измените запрос.' : 'Выберите другую категорию.';
                listContainer.html('<div class="iptv-plus-error"><b>' + emptyTitle + '</b><span>' + emptyText + '</span></div>');
            }

            if (!self.last) {
                var remembered = self.channelFocus[self.category], lastKey = storage('last_channel', '');
                self.html.find('.iptv-plus-channel').each(function () {
                    var k = $(this).data('channel-key');
                    if (!self.last && remembered && k === remembered) self.last = this;
                    if (!self.last && !remembered && k === lastKey) self.last = this;
                });
            }
            if (preserveCategoryFocus) self.last = self.html.find('.iptv-plus-category.active')[0];
            if (!self.last) self.last = self.html.find('.iptv-plus-category.active')[0] || self.html.find('.iptv-plus-category')[0];
        };

        this.onFavoritesChanged = function () { if (self.detailChannel) self.renderChannel(true); else self.build(true); };
        this.refreshOpenChannel = function () { if (!self.detailChannel) return false; self.renderChannel(true); return true; };

        this.closeChannel = function (forPlayback) {
            clearTimeout(self.archiveTimer);
            self.detailChannel = null; self.detailIndex = -1; self.detailDay = ''; self.detailLast = null;
            state.selectedChannel = ''; state.selectedDay = '';
            self.html.find('.iptv-plus-detail').removeClass('open').empty();
            if (!forPlayback) { self.build(); self.start(); } else self.start();
        };

        this.detailFocusToken = function (el) {
            if (!el) return '';
            var item = $(el);
            if (item.attr('data-detail-action')) return 'action:' + item.attr('data-detail-action');
            if (item.attr('data-day')) return 'day:' + item.attr('data-day');
            if (item.attr('data-program-start')) return 'program:' + item.attr('data-program-start');
            return '';
        };

        this.startDetail = function () {
            var panel = self.html.find('.iptv-plus-detail');
            Lampa.Controller.add('content', {
                link: self,
                toggle: function () { Lampa.Controller.collectionSet(panel); Lampa.Controller.collectionFocus(self.detailLast || false, panel); },
                left: function () {
                    var focused = self.focusedElement(panel);
                    if (focused && $(focused).hasClass('iptv-plus-program')) self.focusElement(panel.find('.iptv-plus-day.active')[0] || panel.find('.iptv-plus-day')[0], panel);
                    else if (Navigator.canmove('left')) Navigator.move('left');
                },
                right: function () {
                    var focused = self.focusedElement(panel);
                    if (focused && $(focused).hasClass('iptv-plus-day')) self.focusElement(panel.find('.iptv-plus-program.now.selector')[0] || panel.find('.iptv-plus-program.selector')[0], panel);
                    else if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { self.closeChannel(false); }
            });
            Lampa.Controller.toggle('content');
        };

        this.renderChannel = function (preserveFocus) {
            var c = self.detailChannel;
            if (!c) return;
            var panel = self.html.find('.iptv-plus-detail'), focusToken = preserveFocus ? self.detailFocusToken(self.detailLast) : '';
            panel.empty().addClass('open');
            var now = Date.now(), archiveKey = guideCacheKey(c), err = state.archiveFailed[archiveKey];
            var allProgs = programs(c).filter(function (p) { return p.stop >= now - ((c.catchup.days || 1) * 86400000) && p.start <= now + (2 * 86400000); });
            var cur = allProgs.filter(function (p) { return p.start <= now && p.stop > now; })[0], days = [];
            
            allProgs.forEach(function (p) { var k = dayKey(p.start); if (days.indexOf(k) < 0) days.push(k); });
            var today = dayKey(now);
            days = days.filter(function (k) { return k <= today; }).sort().reverse().concat(days.filter(function (k) { return k > today; }).sort());
            if (!self.detailDay || days.indexOf(self.detailDay) < 0) self.detailDay = days.indexOf(today) >= 0 ? today : (days[days.length - 1] || today);
            state.selectedDay = self.detailDay;

            var header = $('<div class="iptv-plus-detail-head"><div class="iptv-plus-detail-logo"></div><div class="iptv-plus-detail-copy"><div class="iptv-plus-detail-name">' + escapeHtml(c.name) + '</div><div class="iptv-plus-detail-meta"><span>' + escapeHtml(c.group) + '</span>' + (qualityLabel(c) ? '<b>' + qualityLabel(c) + '</b>' : '') + (c.catchup.days ? '<b class="archive">↶ ' + c.catchup.days + ' дн.</b>' : '') + '</div><div class="iptv-plus-detail-now">' + escapeHtml(cur ? 'Сейчас: ' + cur.title : 'Прямой эфир доступен') + '</div></div><div class="iptv-plus-detail-clock">' + escapeHtml(dayLabel(today)) + '<b>' + formatTime(now) + '</b></div></div>');
            var logo = header.find('.iptv-plus-detail-logo');
            if (c.logo) logo.append('<img src="' + escapeHtml(c.logo) + '">');
            else logo.text(c.name.slice(0, 2).toUpperCase());

            var actions = $('<div class="iptv-plus-detail-actions"></div>');
            var backBtn = $('<div class="iptv-plus-action selector" data-detail-action="back">← Каналы</div>');
            var liveBtn = $('<div class="iptv-plus-action primary selector" data-detail-action="live">▶ Прямой эфир</div>');
            var favBtn = $('<div class="iptv-plus-action selector" data-detail-action="favorite">' + (isFavorite(c) ? '♥ В Favorites' : '♡ В Favorites') + '</div>');
            actions.append(backBtn, liveBtn, favBtn);
            if (canArchive(c, cur)) actions.append('<div class="iptv-plus-action selector" data-detail-action="restart">↶ С начала</div>');
            if (err) actions.append('<div class="iptv-plus-action selector" data-detail-action="retry-archive">↻ Архив</div>');

            var body = $('<div class="iptv-plus-detail-body"><div class="iptv-plus-days"></div><div class="iptv-plus-schedule"></div></div>');
            var dayBar = body.find('.iptv-plus-days'), schedule = body.find('.iptv-plus-schedule');

            days.forEach(function (k) {
                var d = $('<div class="iptv-plus-day selector' + (k === self.detailDay ? ' active' : '') + '" data-day="' + escapeHtml(k) + '"><b>' + escapeHtml(dayLabel(k)) + '</b><span>' + allProgs.filter(function (p) { return dayKey(p.start) === k; }).length + ' передач</span></div>');
                dayBar.append(d);
            });

            var selProgs = allProgs.filter(function (p) { return dayKey(p.start) === self.detailDay; });
            selProgs.forEach(function (p) {
                var avail = canArchive(c, p), isNow = p.start <= now && p.stop > now, isFut = p.start > now;
                var status = avail ? (isNow ? 'Смотреть с начала' : 'Доступно в архиве') : isNow ? 'Сейчас в эфире' : isFut ? 'Далее' : 'Архив недоступен';
                var selectable = avail || isNow, prog = isNow ? programProgress(p, now) : 0;
                var item = $('<div class="iptv-plus-program' + (selectable ? ' selector' : ' disabled') + (isNow ? ' now' : '') + (avail ? ' archived' : '') + '" data-program-start="' + p.start + '"><div class="iptv-plus-program-time">' + formatTime(p.start) + '<span>' + formatTime(p.stop) + '</span></div><div class="iptv-plus-program-copy"><div class="iptv-plus-program-title">' + escapeHtml(p.title) + '</div><div class="iptv-plus-program-desc">' + escapeHtml(p.desc || status) + '</div>' + (isNow ? '<div class="iptv-plus-program-progress"><i style="width:' + prog + '%"></i></div>' : '') + '</div><div class="iptv-plus-program-status">' + (avail ? '↶ ' : isNow ? '● ' : '') + escapeHtml(status) + '</div></div>');
                if (selectable) {
                    item.on('hover:enter', function () {
                        var idx = self.detailIndex >= 0 ? self.detailIndex : state.visible.indexOf(c);
                        self.closeChannel(true);
                        if (avail) playArchive(c, p, allProgs); else playLive(idx);
                    });
                }
                schedule.append(item);
            });

            var needsHist = state.autoEpg && c.catchup.days > 0 && state.guideMode !== 'full' && !state.archiveReady[archiveKey] && !err;
            if (!selProgs.length) schedule.append('<div class="iptv-plus-schedule-empty"><b>' + (state.guideLoading || state.archiveLoading[archiveKey] ? 'Программа загружается…' : 'Нет программы на день') + '</b><span>Прямой эфир можно запустить сразу.</span></div>');
            if (needsHist) schedule.prepend('<div class="iptv-plus-schedule-loading"><i></i><span>' + (state.archiveLoading[archiveKey] ? 'Загружаю архив прошлых дней…' : 'Подготавливаю архив…') + '</span></div>');
            if (err) schedule.prepend('<div class="iptv-plus-schedule-empty"><b>Архивная программа не загрузилась</b><span>' + escapeHtml(err) + '</span></div>');

            panel.append(header, actions, body);
            panel.find('.selector').on('hover:focus', function () {
                self.detailLast = this;
                if (this.scrollIntoView) this.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            });
            backBtn.on('hover:enter', function () { self.closeChannel(false); });
            liveBtn.on('hover:enter', function () { var idx = self.detailIndex; self.closeChannel(true); playLive(idx); });
            favBtn.on('hover:enter', function () { setFavorite(c, !isFavorite(c)); });
            actions.find('[data-detail-action="restart"]').on('hover:enter', function () { self.closeChannel(true); playArchive(c, cur, allProgs); });
            actions.find('[data-detail-action="retry-archive"]').on('hover:enter', function () {
                delete state.archiveFailed[archiveKey]; self.detailLast = null; self.renderChannel(false); self.startDetail();
            });
            dayBar.find('.iptv-plus-day').on('hover:enter', function () {
                self.detailDay = $(this).attr('data-day'); self.detailLast = null; self.detailPendingFocus = 'schedule';
                self.renderChannel(false); self.startDetail();
            });

            var restored = null;
            if (focusToken.indexOf('action:') === 0) restored = panel.find('[data-detail-action="' + focusToken.slice(7) + '"]')[0];
            else if (focusToken.indexOf('day:') === 0) restored = panel.find('[data-day="' + focusToken.slice(4) + '"]')[0];
            else if (focusToken.indexOf('program:') === 0) restored = panel.find('[data-program-start="' + focusToken.slice(8) + '"]')[0];
            if (self.detailPendingFocus === 'schedule') {
                restored = schedule.find('.iptv-plus-program.now.selector')[0] || schedule.find('.iptv-plus-program.selector')[0] || dayBar.find('.iptv-plus-day.active')[0];
                self.detailPendingFocus = '';
            }
            self.detailLast = restored || liveBtn[0];

            if (needsHist && !state.archiveLoading[archiveKey]) {
                clearTimeout(self.archiveTimer);
                self.archiveTimer = setTimeout(function () {
                    if (self.detailChannel !== c) return;
                    loadArchiveGuide(c).then(function () { if (self.detailChannel === c) self.renderChannel(true); }).catch(function () {});
                }, 900);
            }
        };

        this.openChannel = function (c, index) {
            self.detailChannel = c; self.detailIndex = index; self.detailDay = dayKey(Date.now()); self.detailLast = null;
            state.selectedChannel = guideCacheKey(c); restoreArchiveGuide(c);
            self.renderChannel(false); self.startDetail();
        };

        this.start = function () {
            if (self.detailChannel) { self.startDetail(); return; }
            if (self.historyDirty) { self.historyDirty = false; self.build(); }
            Lampa.Controller.add('content', {
                link: self,
                toggle: function () {
                    if (self.historyDirty) { self.historyDirty = false; self.build(); }
                    Lampa.Controller.collectionSet(self.html);
                    Lampa.Controller.collectionFocus(self.last || false, self.html);
                },
                left: function () {
                    var focused = self.focusedElement(self.html);
                    if (focused && ($(focused).hasClass('iptv-plus-channel') || $(focused).hasClass('iptv-plus-more'))) {
                        self.focusElement(self.html.find('.iptv-plus-category.active')[0] || self.html.find('.iptv-plus-category')[0]);
                    } else if (focused && $(focused).hasClass('iptv-plus-category')) {
                        Lampa.Controller.toggle('menu');
                    } else if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function () {
                    var focused = self.focusedElement(self.html);
                    if (focused && $(focused).hasClass('iptv-plus-category')) {
                        var remembered = self.channelFocus[self.category], target = null;
                        self.html.find('.iptv-plus-channel').each(function () { if (!target && remembered && $(this).data('channel-key') === remembered) target = this; });
                        self.focusElement(target || self.html.find('.iptv-plus-channel')[0] || self.html.find('.iptv-plus-more')[0]);
                    } else if (Navigator.canmove('right')) Navigator.move('right');
                },
                up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function () { if (Navigator.canmove('down')) Navigator.move('down'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return self.html; };
        this.destroy = function () {
            clearInterval(self.clockTimer); clearTimeout(self.archiveTimer);
            self.detailChannel = null;
            if (state.component === self) state.component = null;
            self.html.remove();
        };
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: PLUGIN, icon: ICON, name: 'IPTV+' });
        Lampa.SettingsApi.addParam({ component: PLUGIN, param: { name: PLUGIN + '_playlist', type: 'input', default: '' }, field: { name: 'URL M3U-плейлиста', description: 'Прямая ссылка на M3U/M3U8' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN, param: { name: PLUGIN + '_epg', type: 'input', default: '' }, field: { name: 'URL XMLTV', description: 'Необязательно' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN, param: { name: PLUGIN + '_archive_days', type: 'select', values: { 1: '1 день', 3: '3 дня', 7: '7 дней', 14: '14 дней' }, default: '3' }, field: { name: 'Архив по умолчанию' } });
        Lampa.SettingsApi.addParam({
            component: PLUGIN, param: { type: 'button' }, field: { name: 'Очистить кеш IPTV+' },
            onChange: function () {
                Object.assign(state, {
                    channels: [], visible: [], epg: {}, epgNames: {}, archiveHint: false, autoEpg: false,
                    guideMode: 'none', guideLoading: false, guidePromise: null, archiveLoading: {}, archiveReady: {}, archiveFailed: {}, selectedChannel: ''
                });
                state.guideTicket++; state.loadedAt = 0;
                Lampa.Storage.set(PLUGIN + '_archive_cache', []);
                notify('Кеш очищен');
            }
        });
    }

    function addMenu() {
        if ($('.menu .menu__list .' + PLUGIN + '-menu').length) return;
        var list = $('.menu .menu__list').eq(0);
        if (!list.length) return;
        var btn = $('<li class="menu__item selector ' + PLUGIN + '-menu"><div class="menu__ico">' + ICON + '</div><div class="menu__text">IPTV+</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ url: '', title: 'IPTV+', component: PLUGIN, page: 1 }); });
        list.append(btn);
    }

    function installMenu() {
        window.lampa_iptv_plus_restore_menu = addMenu;
        addMenu();
        setTimeout(addMenu, 500);
        setTimeout(addMenu, 2000);
        Lampa.Listener.follow('menu', function (e) { if (e.type === 'end') addMenu(); });
    }

    function addStyles() {
        if ($('#iptv-plus-style').length) return;
        $('body').append('<style id="iptv-plus-style">' +
            '.iptv-plus-screen{position:relative;height:100%;min-height:100%;padding:1.15em 2.2em 1.5em;box-sizing:border-box;overflow:hidden;color:#fff}' +
            '.iptv-plus-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.7em}' +
            '.iptv-plus-title{font-size:1.55em;font-weight:600;letter-spacing:.01em}.iptv-plus-title span{font-size:.72em;font-weight:400;opacity:.58}' +
            '.iptv-plus-clock{font-size:1em;opacity:.72}' +
            '.iptv-plus-toolbar{display:flex;gap:.6em;margin-bottom:.75em}' +
            '.iptv-plus-button{padding:.58em .9em;background:rgba(18,25,39,.72);border:1px solid rgba(255,255,255,.13);border-radius:.55em;font-size:.96em}' +
            '.iptv-plus-button.focus,.iptv-plus-empty-action.focus{background:#fff;color:#111;border-color:#fff;box-shadow:0 0 0 .18em rgba(255,255,255,.2)}' +
            '.iptv-plus-layout{display:grid;grid-template-columns:15.5em minmax(0,1fr);gap:.85em;height:calc(100% - 7.3em);min-height:24em}' +
            '.iptv-plus-sidebar,.iptv-plus-list{min-height:0;overflow-y:auto;scrollbar-width:none}.iptv-plus-sidebar::-webkit-scrollbar,.iptv-plus-list::-webkit-scrollbar{display:none}' +
            '.iptv-plus-sidebar{padding:.32em;border-radius:.75em;background:rgba(8,13,23,.66);border:1px solid rgba(255,255,255,.08)}' +
            '.iptv-plus-category{display:grid;grid-template-columns:2.25em minmax(0,1fr) auto;align-items:center;gap:.55em;min-height:3.25em;padding:.42em .65em;margin-bottom:.28em;border-radius:.56em;box-sizing:border-box;color:rgba(255,255,255,.72)}' +
            '.iptv-plus-category-icon{width:2em;height:2em;display:flex;align-items:center;justify-content:center;border-radius:.5em;background:rgba(255,255,255,.08);font-size:.92em;font-weight:700}.iptv-plus-category-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:570}.iptv-plus-category-count{font-size:.72em;opacity:.5}' +
            '.iptv-plus-category.active{color:#74e2a8;background:rgba(60,196,127,.1)}.iptv-plus-category.active .iptv-plus-category-icon{background:rgba(60,196,127,.18)}' +
            '.iptv-plus-category.focus{background:#fff;color:#10141d;box-shadow:0 .45em 1.5em rgba(0,0,0,.3)}.iptv-plus-category.focus .iptv-plus-category-icon{background:rgba(10,20,35,.08)}' +
            '.iptv-plus-list{padding:.05em .28em .8em}' +
            '.iptv-plus-channel{display:grid;grid-template-columns:2.7em 5.2em minmax(0,1fr) auto;align-items:center;gap:.85em;min-height:6.25em;padding:.55em .8em;margin-bottom:.52em;border-radius:.7em;background:linear-gradient(100deg,rgba(28,38,56,.92),rgba(12,18,30,.82));border:1px solid rgba(255,255,255,.09);box-sizing:border-box;transition:background .14s ease,transform .14s ease}' +
            '.iptv-plus-channel.focus{background:linear-gradient(100deg,#f7f8fb,#dfe4ec);color:#10141d;border-color:#fff;transform:scale(1.008);box-shadow:0 .5em 1.7em rgba(0,0,0,.34);z-index:2}' +
            '.iptv-plus-number{font-size:.82em;font-weight:700;letter-spacing:.08em;opacity:.46;text-align:center}' +
            '.iptv-plus-logo{width:5.2em;height:4.7em;border-radius:.58em;background:rgba(255,255,255,.075);display:flex;align-items:center;justify-content:center;font-size:1.25em;font-weight:750;overflow:hidden}' +
            '.iptv-plus-channel.focus .iptv-plus-logo{background:rgba(16,25,40,.07)}.iptv-plus-logo img{width:86%;height:86%;object-fit:contain}' +
            '.iptv-plus-channel-body{min-width:0}.iptv-plus-name{font-size:1.08em;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '.iptv-plus-quality{display:inline-flex;vertical-align:.12em;padding:.13em .34em;margin-left:.28em;border-radius:.3em;background:#388dff;color:#fff;font-size:.56em;line-height:1.2;letter-spacing:.04em}' +
            '.iptv-plus-now{font-size:.84em;opacity:.72;margin-top:.28em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.iptv-plus-time{font-size:.7em;opacity:.48;margin-top:.22em}' +
            '.iptv-plus-progress{height:.18em;margin-top:.42em;background:rgba(255,255,255,.16);border-radius:1em;overflow:hidden}.iptv-plus-channel.focus .iptv-plus-progress{background:rgba(10,20,35,.14)}.iptv-plus-progress i{display:block;height:100%;background:#51c98a;border-radius:1em}' +
            '.iptv-plus-channel-flags{display:flex;align-items:center;gap:.5em}.iptv-plus-heart{font-size:1.25em;color:#ef6c83}.iptv-plus-archive{padding:.28em .5em;border-radius:.4em;background:rgba(70,199,133,.16);color:#78e6aa;font-size:.72em;font-weight:650;white-space:nowrap}.iptv-plus-channel.focus .iptv-plus-archive{background:rgba(24,122,74,.12);color:#167448}.iptv-plus-chevron{font-size:1.8em;opacity:.35}' +
            '.iptv-plus-more{display:flex;align-items:center;justify-content:space-between;padding:1em 1.2em;margin:.7em 0;border-radius:.65em;background:rgba(28,38,56,.88);border:1px solid rgba(255,255,255,.1)}.iptv-plus-more span{font-size:.78em;opacity:.55}.iptv-plus-more.focus{background:#fff;color:#10141d}' +
            '.iptv-plus-empty{min-height:21em;display:flex;align-items:center;gap:1.3em;padding:2.2em;border-radius:.8em;background:linear-gradient(135deg,rgba(31,42,62,.9),rgba(12,18,30,.82));border:1px solid rgba(255,255,255,.1)}' +
            '.iptv-plus-empty-icon{width:3.1em;height:2.4em;display:flex;align-items:center;justify-content:center;border:.12em solid rgba(255,255,255,.7);border-radius:.42em;font-size:1.4em;font-weight:800}' +
            '.iptv-plus-empty-copy{flex:1}.iptv-plus-empty-title{font-size:1.42em;font-weight:650}.iptv-plus-empty-text{font-size:.98em;margin-top:.45em;opacity:.75}.iptv-plus-empty-hint{font-size:.8em;margin-top:.4em;opacity:.42}' +
            '.iptv-plus-empty-action{padding:.72em 1em;border-radius:.55em;background:#4cc986;color:#0d2218;font-weight:700}' +
            '.iptv-plus-error{display:flex;flex-direction:column;gap:.35em;font-size:1.05em;line-height:1.5;padding:2em;opacity:.75}.iptv-plus-error span{font-size:.82em;opacity:.65}' +
            '.iptv-plus-detail{display:none;position:absolute;inset:0;z-index:20;padding:1.25em 2.2em 1.6em;box-sizing:border-box;background:linear-gradient(120deg,rgba(7,12,21,.985),rgba(16,25,40,.985));overflow:hidden}.iptv-plus-detail.open{display:flex;flex-direction:column}' +
            '.iptv-plus-detail-head{display:grid;grid-template-columns:7.2em minmax(0,1fr) auto;align-items:center;gap:1.2em;min-height:7em}.iptv-plus-detail-logo{width:7.2em;height:6.2em;border-radius:.8em;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:1.5em;font-weight:800;overflow:hidden}.iptv-plus-detail-logo img{width:86%;height:86%;object-fit:contain}' +
            '.iptv-plus-detail-copy{min-width:0}.iptv-plus-detail-name{font-size:1.7em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.iptv-plus-detail-meta{display:flex;gap:.55em;align-items:center;margin-top:.45em;color:rgba(255,255,255,.6)}.iptv-plus-detail-meta b{padding:.2em .45em;border-radius:.35em;background:rgba(56,141,255,.22);color:#85b9ff;font-size:.75em}.iptv-plus-detail-meta b.archive{background:rgba(70,199,133,.17);color:#78e6aa}.iptv-plus-detail-now{margin-top:.55em;font-size:.92em;color:rgba(255,255,255,.72)}' +
            '.iptv-plus-detail-clock{text-align:right;font-size:.78em;opacity:.62}.iptv-plus-detail-clock b{display:block;font-size:1.7em;margin-top:.15em;color:#fff}' +
            '.iptv-plus-detail-actions{display:flex;gap:.65em;margin:.75em 0 1em}.iptv-plus-action{padding:.68em 1em;border-radius:.55em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);font-weight:650}.iptv-plus-action.primary{background:#49ca87;color:#092116;border-color:#49ca87}.iptv-plus-action.focus{background:#fff;color:#111;border-color:#fff;box-shadow:0 0 0 .18em rgba(255,255,255,.18)}' +
            '.iptv-plus-detail-body{display:grid;grid-template-columns:13.8em minmax(0,1fr);gap:.9em;min-height:0;flex:1}.iptv-plus-days,.iptv-plus-schedule{min-height:0;overflow-y:auto;scrollbar-width:none}.iptv-plus-days::-webkit-scrollbar,.iptv-plus-schedule::-webkit-scrollbar{display:none}.iptv-plus-days{padding:.3em;border-radius:.72em;background:rgba(3,8,15,.48);border:1px solid rgba(255,255,255,.07)}' +
            '.iptv-plus-day{padding:.7em .75em;margin-bottom:.28em;border-radius:.52em;color:rgba(255,255,255,.67)}.iptv-plus-day b,.iptv-plus-day span{display:block}.iptv-plus-day span{margin-top:.18em;font-size:.68em;opacity:.55}.iptv-plus-day.active{background:rgba(70,199,133,.12);color:#7ce5ad}.iptv-plus-day.focus{background:#fff;color:#111}' +
            '.iptv-plus-schedule{padding:.05em .25em .8em}.iptv-plus-program{display:grid;grid-template-columns:4.5em minmax(0,1fr) auto;align-items:center;gap:.85em;min-height:4.7em;padding:.55em .8em;margin-bottom:.42em;border-radius:.65em;background:rgba(28,38,56,.78);border:1px solid rgba(255,255,255,.075)}.iptv-plus-program.now{border-left:.22em solid #4dce8b}.iptv-plus-program.disabled{opacity:.52}.iptv-plus-program.focus{background:#fff;color:#111;transform:scale(1.004)}' +
            '.iptv-plus-program-time{font-size:1em;font-weight:700}.iptv-plus-program-time span{display:block;margin-top:.18em;font-size:.72em;font-weight:400;opacity:.55}.iptv-plus-program-copy{min-width:0}.iptv-plus-program-title{font-size:1.02em;font-weight:620;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.iptv-plus-program-desc{font-size:.72em;margin-top:.26em;opacity:.56;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.iptv-plus-program-status{font-size:.7em;color:#76dfa5;white-space:nowrap}.iptv-plus-program.focus .iptv-plus-program-status{color:#167448}' +
            '.iptv-plus-program-progress{height:.18em;margin-top:.42em;background:rgba(255,255,255,.15);border-radius:1em;overflow:hidden}.iptv-plus-program-progress i{display:block;height:100%;background:#4dce8b}.iptv-plus-program.focus .iptv-plus-program-progress{background:rgba(0,0,0,.13)}' +
            '.iptv-plus-schedule-loading,.iptv-plus-schedule-empty{display:flex;align-items:center;gap:.65em;padding:.85em 1em;margin-bottom:.5em;border-radius:.6em;background:rgba(70,199,133,.1);color:#83e7af}.iptv-plus-schedule-loading i{width:.65em;height:.65em;border:.12em solid currentColor;border-top-color:transparent;border-radius:50%;animation:iptv-plus-spin .8s linear infinite}.iptv-plus-schedule-empty{align-items:flex-start;flex-direction:column;color:rgba(255,255,255,.7)}.iptv-plus-schedule-empty span{font-size:.76em;opacity:.6}@keyframes iptv-plus-spin{to{transform:rotate(360deg)}}' +
            '@media(max-width:1050px){.iptv-plus-layout{grid-template-columns:12.5em minmax(0,1fr)}.iptv-plus-channel{grid-template-columns:2.2em 4.5em minmax(0,1fr) auto}.iptv-plus-logo{width:4.5em;height:4.1em}.iptv-plus-archive{display:none}}' +
            '@media(max-width:760px){.iptv-plus-screen{padding:1em}.iptv-plus-layout{grid-template-columns:9.3em minmax(0,1fr);height:calc(100% - 6.8em)}.iptv-plus-clock{display:none}.iptv-plus-category{grid-template-columns:2em minmax(0,1fr)}.iptv-plus-category-count,.iptv-plus-number{display:none}.iptv-plus-channel{grid-template-columns:3.8em minmax(0,1fr) auto;gap:.55em}.iptv-plus-logo{width:3.8em;height:3.5em}.iptv-plus-empty{align-items:flex-start;flex-direction:column}.iptv-plus-detail{padding:1em}.iptv-plus-detail-head{grid-template-columns:5em minmax(0,1fr)}.iptv-plus-detail-logo{width:5em;height:4.5em}.iptv-plus-detail-clock{display:none}.iptv-plus-detail-body{grid-template-columns:9em minmax(0,1fr)}.iptv-plus-program{grid-template-columns:3.5em minmax(0,1fr)}.iptv-plus-program-status{display:none}}' +
            '</style>');
    }

    function startPlugin() {
        Lampa.Component.add(PLUGIN, Component);
        addSettings(); addStyles(); installMenu();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
