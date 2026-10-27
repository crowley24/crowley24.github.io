// ==Lampa==
// name: IPTV PRO (XMLTV Edition)
// version: 13.7

(function () {
    'use strict';

    if (!window.Lampa || !window.$) return;
    if (window.__iptv_pro_137_initialized) return;

    var KEY = 'iptv_pro_v12';
    var EPG_CACHE_KEY = 'iptv_pro_epg_cache_v132';
    var EPG_CACHE_HOURS = 36;
    var EPG_CACHE_MAX_BYTES = 1500000;
    var EPG_URL = 'https://iptv-epg-proxy.unclezhenya24.workers.dev/epg.xml';
    var CACHE_TTL = 3 * 60 * 60 * 1000;
    var BATCH_SIZE = 40;

    var defaults = {
        playlists: [{
            name: 'TEST',
            url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
        }],
        epg_url: EPG_URL,
        favorites: [],
        current_pl_index: 0
    };

    var cfg = Lampa.Storage.get(KEY, defaults) || {};

    if (!Array.isArray(cfg.playlists) || !cfg.playlists.length) {
        cfg.playlists = defaults.playlists.slice();
    }

    if (!Array.isArray(cfg.favorites)) cfg.favorites = [];

    if (
        typeof cfg.current_pl_index !== 'number' ||
        cfg.current_pl_index < 0 ||
        cfg.current_pl_index >= cfg.playlists.length
    ) {
        cfg.current_pl_index = 0;
    }

    cfg.epg_url = EPG_URL;
    Lampa.Storage.set(KEY, cfg);

    var EPG = {
        status: 'Очікування плейлиста',
        channels: {},
        aliases: {},
        loaded: 0,
        request: null,
        error: '',
        httpStatus: 0,
        channelCount: 0,
        programmeCount: 0,
        matchedChannels: 0,
        unmatchedChannels: 0,
        lastAttempt: 0,
        lastSuccess: 0,
        lastDuration: 0,
        lastResult: 'Ще не завантажувалось',
        loading: false,
        refreshQueued: false,
        callbacks: [],
        cacheSource: 'Немає',
        cacheSavedAt: 0,
        playlistSignature: '',
        playlistIds: [],
        requestMode: 'Не виконувався',
        fallbackUsed: false,
        requestedChannelCount: 0
    };

    var activeIPTVInstance = null;

    function now() {
        return Date.now();
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Немає даних';

        var d = new Date(timestamp);

        return (
            ('0' + d.getDate()).slice(-2) + '.' +
            ('0' + (d.getMonth() + 1)).slice(-2) + '.' +
            d.getFullYear() + ' ' +
            ('0' + d.getHours()).slice(-2) + ':' +
            ('0' + d.getMinutes()).slice(-2) + ':' +
            ('0' + d.getSeconds()).slice(-2)
        );
    }

    function durationText(ms) {
        if (!isFinite(ms) || ms < 0) return 'Невідомо';
        if (ms < 1000) return ms + ' мс';
        return (ms / 1000).toFixed(1) + ' с';
    }

    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/&amp;/g, '&')
            .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function stamp(s) {
        var m = String(s || '').match(
            /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-])(\d\d)(\d\d)/
        );

        if (!m) return NaN;

        var t = Date.UTC(
            +m[1],
            +m[2] - 1,
            +m[3],
            +m[4],
            +m[5],
            +(m[6] || 0)
        );

        var off = (+m[8] * 60 + +m[9]) * 60000;

        return t + (m[7] === '+' ? -off : off);
    }

    function txt(node, tag) {
        var el = node.getElementsByTagName(tag)[0];
        return el ? (el.textContent || '').trim() : '';
    }

    function notify(message) {
        if (Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show(message);
        }
    }

    function finishCallbacks() {
        var list = EPG.callbacks.slice();
        EPG.callbacks = [];

        list.forEach(function (fn) {
            if (typeof fn !== 'function') return;

            try {
                fn();
            } catch (e) {
                console.error('[IPTV PRO 13.7] Callback:', e);
            }
        });
    }

    /*
     * TVG-ID
     */

    function uniqueIds(ids) {
        var seen = Object.create(null);
        var result = [];

        (ids || []).forEach(function (value) {
            var id = String(value || '').trim();

            if (!id || seen[id]) return;

            seen[id] = true;
            result.push(id);
        });

        return result;
    }

    function makePlaylistSignature(ids, playlistUrl) {
        var source = ids && ids.length
            ? ids.slice().sort().join('\n')
            : 'NO_TVG_IDS\n' + String(playlistUrl || '');

        var hash = 2166136261;

        for (var i = 0; i < source.length; i++) {
            hash ^= source.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return 'iptv137_' + (hash >>> 0).toString(16) + '_' + source.length;
    }

    /*
     * КЕШ EPG
     */

    function clearLoadedEPG() {
        EPG.channels = {};
        EPG.aliases = {};
        EPG.loaded = 0;
        EPG.channelCount = 0;
        EPG.programmeCount = 0;
        EPG.cacheSource = 'Немає';
        EPG.cacheSavedAt = 0;
    }

    function restoreEPGCache(expectedSignature) {
        var cache;

        try {
            cache = Lampa.Storage.get(EPG_CACHE_KEY, null);
        } catch (e) {
            console.warn('[IPTV PRO 13.7] Читання кешу:', e);
            return false;
        }

        if (
            !cache ||
            cache.version !== 2 ||
            !cache.channels ||
            typeof cache.channels !== 'object' ||
            !cache.savedAt ||
            cache.playlistSignature !== expectedSignature
        ) {
            return false;
        }

        var restoredChannels = {};
        var totalPrograms = 0;
        var cutoffStart = now() - 2 * 60 * 60 * 1000;
        var cutoffStop = now() + EPG_CACHE_HOURS * 60 * 60 * 1000;

        Object.keys(cache.channels).forEach(function (id) {
            var programs = cache.channels[id];

            if (!Array.isArray(programs)) return;

            var valid = programs.filter(function (p) {
                return p &&
                    isFinite(p.start) &&
                    isFinite(p.stop) &&
                    p.stop > p.start &&
                    p.stop > cutoffStart &&
                    p.start < cutoffStop;
            });

            if (valid.length) {
                restoredChannels[id] = valid;
                totalPrograms += valid.length;
            }
        });

        if (!totalPrograms) return false;

        var restoredAliases = {};

        if (cache.aliases && typeof cache.aliases === 'object') {
            Object.keys(cache.aliases).forEach(function (alias) {
                var target = cache.aliases[alias];

                if (restoredChannels[target]) {
                    restoredAliases[alias] = target;
                }
            });
        }

        EPG.channels = restoredChannels;
        EPG.aliases = restoredAliases;
        EPG.loaded = cache.savedAt;
        EPG.lastSuccess = cache.savedAt;
        EPG.cacheSavedAt = cache.savedAt;
        EPG.cacheSource = 'Локальний кеш';
        EPG.channelCount = Object.keys(restoredChannels).length;
        EPG.programmeCount = totalPrograms;
        EPG.status = 'Відновлено з локального кешу';
        EPG.lastResult = 'Локальний кеш';

        console.log(
            '[IPTV PRO 13.7] Кеш відновлено:',
            EPG.channelCount,
            'каналів;',
            totalPrograms,
            'передач'
        );

        return true;
    }

    function saveEPGCache() {
        var cutoffStart = now() - 2 * 60 * 60 * 1000;
        var cutoffStop = now() + EPG_CACHE_HOURS * 60 * 60 * 1000;
        var compactChannels = {};
        var totalPrograms = 0;

        Object.keys(EPG.channels).forEach(function (id) {
            var source = EPG.channels[id] || [];

            var programs = source.filter(function (p) {
                return p &&
                    isFinite(p.start) &&
                    isFinite(p.stop) &&
                    p.stop > p.start &&
                    p.stop > cutoffStart &&
                    p.start < cutoffStop;
            });

            if (!programs.length) return;

            programs = programs.slice(0, 80).map(function (p) {
                return {
                    start: p.start,
                    stop: p.stop,
                    title: String(p.title || '').slice(0, 300),
                    desc: String(p.desc || '').slice(0, 500)
                };
            });

            compactChannels[id] = programs;
            totalPrograms += programs.length;
        });

        if (!totalPrograms) {
            console.warn('[IPTV PRO 13.7] Кеш не збережено: немає передач');
            return false;
        }

        var compactAliases = {};

        Object.keys(EPG.aliases).forEach(function (alias) {
            var id = EPG.aliases[alias];

            if (compactChannels[id]) compactAliases[alias] = id;
        });

        var cache = {
            version: 2,
            savedAt: EPG.loaded || now(),
            playlistSignature: EPG.playlistSignature,
            channelCount: Object.keys(compactChannels).length,
            channels: compactChannels,
            aliases: compactAliases
        };

        try {
            var json = JSON.stringify(cache);

            if (json.length > EPG_CACHE_MAX_BYTES) {
                Object.keys(cache.channels).forEach(function (id) {
                    cache.channels[id].forEach(function (p) {
                        p.desc = '';
                    });
                });

                json = JSON.stringify(cache);
            }

            if (json.length > EPG_CACHE_MAX_BYTES) {
                Object.keys(cache.channels).forEach(function (id) {
                    cache.channels[id] = cache.channels[id].slice(0, 40);
                });

                json = JSON.stringify(cache);
            }

            if (json.length > EPG_CACHE_MAX_BYTES) {
                Object.keys(cache.channels).forEach(function (id) {
                    cache.channels[id] = cache.channels[id].slice(0, 20);
                });

                json = JSON.stringify(cache);
            }

            if (json.length > EPG_CACHE_MAX_BYTES) {
                EPG.cacheSource = 'Кеш завеликий для збереження';
                return false;
            }

            Lampa.Storage.set(EPG_CACHE_KEY, cache);
            EPG.cacheSavedAt = cache.savedAt;
            EPG.cacheSource = 'Мережа + локальний кеш';

            console.log(
                '[IPTV PRO 13.7] Кеш збережено:',
                Object.keys(cache.channels).length,
                'каналів;',
                json.length,
                'символів'
            );

            return true;
        } catch (e) {
            console.warn('[IPTV PRO 13.7] Помилка збереження кешу:', e);
            EPG.cacheSource = 'Помилка збереження кешу';
            return false;
        }
    }

    /*
     * XMLTV PARSER
     */

    function parseEPG(body) {
        if (!body || !String(body).trim()) {
            throw new Error('Отримано порожню відповідь');
        }

        var xml = $.parseXML(body);

        if (!xml) throw new Error('Не вдалося розібрати XML');

        var parserErrors = xml.getElementsByTagName('parsererror');

        if (parserErrors.length) {
            throw new Error(
                'Некоректний XML: ' +
                (parserErrors[0].textContent || '').slice(0, 250)
            );
        }

        var ch = xml.getElementsByTagName('channel');
        var pr = xml.getElementsByTagName('programme');

        if (!ch.length && !pr.length) {
            throw new Error('XML не містить channel або programme');
        }

        var map = {};
        var aliases = {};
        var validProgrammes = 0;

        for (var i = 0; i < ch.length; i++) {
            var id = ch[i].getAttribute('id');

            if (!id) continue;

            map[id] = map[id] || [];
            aliases[norm(id)] = id;

            var names = ch[i].getElementsByTagName('display-name');

            for (var j = 0; j < names.length; j++) {
                var displayName = (names[j].textContent || '').trim();

                if (displayName) aliases[norm(displayName)] = id;
            }
        }

        for (var k = 0; k < pr.length; k++) {
            var p = pr[k];
            var cid = p.getAttribute('channel');

            if (!cid) continue;

            var start = stamp(p.getAttribute('start'));
            var stop = stamp(p.getAttribute('stop'));

            if (!isFinite(start) || !isFinite(stop) || stop <= start) {
                continue;
            }

            if (!map[cid]) map[cid] = [];

            map[cid].push({
                start: start,
                stop: stop,
                title: txt(p, 'title'),
                desc: txt(p, 'desc')
            });

            validProgrammes++;
        }

        Object.keys(map).forEach(function (id) {
            map[id].sort(function (a, b) {
                return a.start - b.start;
            });
        });

        if (!Object.keys(map).length) {
            throw new Error('Не знайдено каналів у XMLTV');
        }

        if (!validProgrammes) {
            throw new Error(
                'XML не містить валідних передач. Перевірте start/stop.'
            );
        }

        return {
            channels: map,
            aliases: aliases,
            channelCount: ch.length,
            programmeCount: validProgrammes
        };
    }

    /*
     * ЗАВАНТАЖЕННЯ EPG
     * POST-пакети максимум по 40 tvg-id.
     * GET-fallback не використовується.
     */

    function epgLoad(done, force) {
        if (done) EPG.callbacks.push(done);

        if (EPG.loading || EPG.request) {
            if (force) EPG.refreshQueued = true;
            return;
        }

        if (
            !force &&
            EPG.loaded &&
            now() - EPG.loaded < CACHE_TTL
        ) {
            finishCallbacks();
            return;
        }

        var ids = uniqueIds(EPG.playlistIds || []);

        if (!ids.length) {
            EPG.status = 'Немає tvg-id для запиту EPG';
            EPG.error = 'У плейлисті не знайдено tvg-id.';
            EPG.lastResult = 'Немає ідентифікаторів каналів';
            EPG.requestMode = 'POST — немає tvg-id';
            EPG.requestedChannelCount = 0;
            EPG.loading = false;
            finishCallbacks();
            return;
        }

        var batches = [];

        for (var i = 0; i < ids.length; i += BATCH_SIZE) {
            batches.push(ids.slice(i, i + BATCH_SIZE));
        }

        EPG.loading = true;
        EPG.status = 'Завантаження EPG пакетами...';
        EPG.error = '';
        EPG.lastAttempt = now();
        EPG.lastDuration = 0;
        EPG.httpStatus = 0;
        EPG.requestMode = 'POST — пакети по ' + BATCH_SIZE + ' каналів';
        EPG.fallbackUsed = false;
        EPG.requestedChannelCount = ids.length;

        var startedAt = now();
        var batchIndex = 0;
        var completed = false;
        var failedBatches = 0;
        var successfulBatches = 0;
        var errors = [];
        var allChannels = {};
        var allAliases = {};
        var totalProgrammes = 0;

        function finishAll() {
            if (completed) return;

            completed = true;
            EPG.lastDuration = now() - startedAt;
            EPG.loading = false;
            EPG.request = null;

            if (EPG.refreshQueued) {
                EPG.refreshQueued = false;
                epgLoad(null, true);
                return;
            }

            finishCallbacks();
        }

        function processNextBatch() {
            if (completed) return;

            if (batchIndex >= batches.length) {
                if (totalProgrammes > 0) {
                    Object.keys(allChannels).forEach(function (id) {
                        allChannels[id].sort(function (a, b) {
                            return a.start - b.start;
                        });
                    });

                    EPG.channels = allChannels;
                    EPG.aliases = allAliases;
                    EPG.channelCount = Object.keys(allChannels).length;
                    EPG.programmeCount = totalProgrammes;
                    EPG.loaded = now();
                    EPG.lastSuccess = EPG.loaded;
                    EPG.cacheSource = 'Мережа';
                    EPG.error = '';

                    if (failedBatches > 0) {
                        EPG.status = 'EPG завантажено частково';
                        EPG.lastResult =
                            'Успішних пакетів: ' + successfulBatches +
                            '/' + batches.length +
                            '; помилок: ' + failedBatches;

                        EPG.error =
                            'Не вдалося завантажити ' +
                            failedBatches + ' із ' + batches.length +
                            ' пакетів. ' + errors.slice(0, 3).join(' | ');
                    } else {
                        EPG.status = 'EPG успішно оновлено';
                        EPG.lastResult = 'Успішно';
                    }

                    saveEPGCache();

                    console.log(
                        '[IPTV PRO 13.7] EPG завершено:',
                        successfulBatches,
                        'успішних пакетів;',
                        failedBatches,
                        'помилок;',
                        EPG.channelCount,
                        'каналів;',
                        totalProgrammes,
                        'передач'
                    );
                } else {
                    EPG.status = 'Не вдалося отримати EPG';
                    EPG.lastResult = 'Немає валідних передач';
                    EPG.error = errors.length
                        ? errors.slice(0, 5).join(' | ')
                        : 'У відповідях Worker немає валідних передач.';

                    console.error('[IPTV PRO 13.7] EPG:', EPG.error);
                }

                finishAll();
                return;
            }

            var currentBatch = batches[batchIndex];
            var currentNumber = batchIndex + 1;

            batchIndex++;

            EPG.status =
                'Завантаження пакета ' +
                currentNumber + '/' + batches.length;

            EPG.request = $.ajax({
                url: EPG_URL,
                method: 'POST',
                dataType: 'text',
                timeout: 60000,
                cache: false,
                contentType: 'application/json; charset=utf-8',
                processData: false,
                data: JSON.stringify({ ids: currentBatch }),

                success: function (body, textStatus, responseXHR) {
                    EPG.httpStatus = responseXHR
                        ? responseXHR.status
                        : 200;

                    try {
                        var result = parseEPG(body);

                        Object.keys(result.channels).forEach(function (id) {
                            if (!allChannels[id]) allChannels[id] = [];

                            var existing = Object.create(null);

                            allChannels[id].forEach(function (p) {
                                existing[
                                    p.start + ':' + p.stop + ':' + p.title
                                ] = true;
                            });

                            (result.channels[id] || []).forEach(function (p) {
                                var key =
                                    p.start + ':' + p.stop + ':' + p.title;

                                if (!existing[key]) {
                                    allChannels[id].push(p);
                                    existing[key] = true;
                                    totalProgrammes++;
                                }
                            });
                        });

                        Object.keys(result.aliases).forEach(function (alias) {
                            allAliases[alias] = result.aliases[alias];
                        });

                        successfulBatches++;
                    } catch (e) {
                        failedBatches++;

                        errors.push(
                            'Пакет ' + currentNumber + ': ' +
                            String(e.message || e)
                        );

                        console.warn(
                            '[IPTV PRO 13.7] Помилка пакета:',
                            currentNumber,
                            e
                        );
                    }
                },

                error: function (xhr, status, err) {
                    EPG.httpStatus = xhr ? xhr.status || 0 : 0;
                    failedBatches++;

                    errors.push(
                        'Пакет ' + currentNumber + ': ' +
                        status + (err ? ' / ' + err : '') +
                        ' (HTTP ' + EPG.httpStatus + ')'
                    );

                    console.warn(
                        '[IPTV PRO 13.7] HTTP-помилка:',
                        errors[errors.length - 1]
                    );
                },

                complete: function () {
                    if (completed) return;

                    EPG.request = null;
                    processNextBatch();
                }
            });
        }

        processNextBatch();
    }

    /*
     * ЗІСТАВЛЕННЯ ПРОГРАМ
     */

    function findPrograms(c) {
        var originalId = String(c.tvg_id || '').trim();

        var id = EPG.channels[originalId]
            ? originalId
            : (
                EPG.aliases[norm(originalId)] ||
                EPG.aliases[norm(c.name)]
            );

        var arr = EPG.channels[id] || [];
        var currentTime = now();
        var current = null;
        var next = null;

        for (var i = 0; i < arr.length; i++) {
            if (
                arr[i].start <= currentTime &&
                arr[i].stop > currentTime
            ) {
                current = arr[i];
            } else if (arr[i].start > currentTime) {
                next = arr[i];
                break;
            }
        }

        return {
            current: current,
            next: next,
            id: id
        };
    }

    function clock(t) {
        var d = new Date(t);

        return (
            ('0' + d.getHours()).slice(-2) + ':' +
            ('0' + d.getMinutes()).slice(-2)
        );
    }

    /*
     * ОСНОВНИЙ КОМПОНЕНТ IPTV
     */

    function IPTVComponent() {
        var root;
        var toolbar;
        var colG;
        var colC;
        var colE;

        var groups = {};
        var names = [];
        var list = [];

        var active = 'groups';
        var gi = 0;
        var ci = 0;
        var ti = 0;

        var chosen = null;
        var timer = null;
        var plRequest = null;
        var alive = true;
        var panelMode = '';
        var loadError = '';

        var toolbarActions = [
            { id: 'refresh', title: 'Оновити EPG' },
            { id: 'settings', title: 'Налаштування' },
            { id: 'diagnostics', title: 'Діагностика' }
        ];

        function item(text, cls) {
            return $('<div></div>')
                .addClass(cls || 'iptv-item')
                .text(text);
        }

        function button(text, action, cls) {
            var el = $('<div></div>')
                .addClass('iptv-action selector')
                .addClass(cls || '')
                .text(text);

            el.on('click hover:enter', function () {
                if (alive) action();
            });

            el.on('hover:focus mouseenter', function () {
                if (toolbar) {
                    toolbar.find('.iptv-action').removeClass('active');
                }

                if (el.closest('.iptv-toolbar').length) {
                    el.addClass('active');
                }
            });

            return el;
        }

        function focus() {
            if (!root) return;

            root.find('.iptv-item, .iptv-action').removeClass('active');

            var target;

            if (panelMode) {
                target = colE ? colE.find('.iptv-action').eq(ci) : $();
            } else if (active === 'toolbar') {
                target = toolbar.find('.iptv-action').eq(ti);
            } else if (active === 'groups') {
                target = colG.find('.iptv-item').eq(gi);
            } else {
                target = colC.find('.iptv-channel').eq(ci);
            }

            target.addClass('active');

            if (target.length && target[0].scrollIntoView) {
                target[0].scrollIntoView({ block: 'nearest' });
            }
        }

        function updateMatchCounts() {
            var matched = 0;
            var unmatched = 0;

            Object.keys(groups).forEach(function (g) {
                if (g === '⭐ Обране') return;

                groups[g].forEach(function (c) {
                    var originalId = String(c.tvg_id || '').trim();

                    var id = EPG.channels[originalId]
                        ? originalId
                        : (
                            EPG.aliases[norm(originalId)] ||
                            EPG.aliases[norm(c.name)]
                        );

                    if (id) matched++;
                    else unmatched++;
                });
            });

            EPG.matchedChannels = matched;
            EPG.unmatchedChannels = unmatched;
        }

        function refreshDetails() {
            if (!alive || panelMode) return;
            if (chosen) details(chosen);
        }

        function refreshEPG() {
            if (EPG.loading) {
                EPG.refreshQueued = true;
                notify('Оновлення поставлено в чергу.');
                return;
            }

            EPG.status = 'Запуск ручного оновлення...';
            EPG.error = '';

            if (panelMode) renderPanel();

            epgLoad(function () {
                if (!alive) return;

                updateMatchCounts();

                if (EPG.error) {
                    notify('EPG: ' + EPG.error);
                } else {
                    notify(
                        'EPG оновлено: ' +
                        EPG.programmeCount + ' передач'
                    );
                }

                if (panelMode) renderPanel();
                else refreshDetails();
            }, true);
        }

        function showPanel(mode) {
            panelMode = mode;
            active = 'toolbar';
            ci = 0;

            renderPanel();
            focus();
        }

        function closePanel() {
            panelMode = '';
            active = 'channels';

            renderChannels(list);
            focus();
        }

        function renderPanel() {
            if (!colE) return;

            colE.empty();
            ci = 0;

            var box = $('<div class="iptv-panel"></div>');

            if (panelMode === 'settings') {
                box.append(item('НАЛАШТУВАННЯ', 'iptv-panel-title'));
                box.append(item('IPTV PRO 13.7', 'iptv-panel-subtitle'));
                box.append(item('Джерело телепрограми', 'iptv-label'));
                box.append(item(EPG_URL, 'iptv-url'));

                var pl = cfg.playlists[cfg.current_pl_index] ||
                    cfg.playlists[0];

                box.append(item('Поточний плейлист', 'iptv-label'));
                box.append(item(
                    pl && pl.name ? pl.name : 'Без назви',
                    'iptv-value'
                ));
                box.append(item(
                    pl && pl.url ? pl.url : 'URL не задано',
                    'iptv-url'
                ));

                box.append(item(
                    'EPG оновлюється не частіше ніж раз на 3 години',
                    'iptv-muted'
                ));
                box.append(item(
                    'Локальний кеш: до ' + EPG_CACHE_HOURS + ' годин розкладу',
                    'iptv-muted'
                ));
                box.append(item(
                    'Останнє успішне оновлення: ' +
                    formatDate(EPG.lastSuccess),
                    'iptv-muted'
                ));

                box.append(button(
                    EPG.loading
                        ? 'Оновлення виконується...'
                        : '↻ Оновити телепрограму',
                    refreshEPG,
                    'iptv-action-primary'
                ));

                box.append(button('Відкрити діагностику', function () {
                    showPanel('diagnostics');
                }));

                box.append(button('Назад до каналів', closePanel));
            } else if (panelMode === 'diagnostics') {
                updateMatchCounts();

                box.append(item('ДІАГНОСТИКА', 'iptv-panel-title'));
                box.append(item(
                    'Стан системи та останній результат',
                    'iptv-panel-subtitle'
                ));
                box.append(item('EPG: ' + EPG.status, 'iptv-status'));
                box.append(item(
                    'Режим запиту: ' + EPG.requestMode,
                    'iptv-value'
                ));
                box.append(item(
                    'Каналів у M3U з tvg-id: ' +
                    EPG.requestedChannelCount,
                    'iptv-value'
                ));
                box.append(item('GET-fallback: вимкнено', 'iptv-value'));
                box.append(item(
                    'HTTP-статус: ' +
                    (EPG.httpStatus || 'Немає відповіді'),
                    'iptv-value'
                ));
                box.append(item(
                    'Остання спроба: ' + formatDate(EPG.lastAttempt),
                    'iptv-value'
                ));
                box.append(item(
                    'Останній успіх: ' + formatDate(EPG.lastSuccess),
                    'iptv-value'
                ));
                box.append(item(
                    'Тривалість: ' + durationText(EPG.lastDuration),
                    'iptv-value'
                ));
                box.append(item(
                    'Результат: ' + EPG.lastResult,
                    'iptv-value'
                ));
                box.append(item(
                    'Каналів XMLTV: ' + EPG.channelCount,
                    'iptv-value'
                ));
                box.append(item(
                    'Передач у розкладі: ' + EPG.programmeCount,
                    'iptv-value'
                ));
                box.append(item(
                    'Каналів зіставлено: ' + EPG.matchedChannels,
                    'iptv-value'
                ));
                box.append(item(
                    'Каналів без збігу: ' + EPG.unmatchedChannels,
                    'iptv-value'
                ));
                box.append(item(
                    'Джерело даних: ' + EPG.cacheSource,
                    'iptv-value'
                ));
                box.append(item(
                    'Кеш збережено: ' + formatDate(EPG.cacheSavedAt),
                    'iptv-value'
                ));
                box.append(item(
                    'Вік кешу: ' +
                    (EPG.loaded
                        ? durationText(now() - EPG.loaded) + ' тому'
                        : 'Відсутній'),
                    'iptv-value'
                ));

                if (EPG.error) {
                    box.append(item(
                        'ПОДРОБИЦІ ПОМИЛКИ',
                        'iptv-error-title'
                    ));
                    box.append(item(EPG.error, 'iptv-error'));
                }

                if (loadError) {
                    box.append(item(
                        'ПОМИЛКА ПЛЕЙЛИСТА',
                        'iptv-error-title'
                    ));
                    box.append(item(loadError, 'iptv-error'));
                }

                box.append(button(
                    EPG.loading
                        ? 'Оновлення виконується...'
                        : '↻ Повторити перевірку EPG',
                    refreshEPG,
                    'iptv-action-primary'
                ));

                box.append(button('Оновити дані панелі', renderPanel));
                box.append(button('Назад до каналів', closePanel));
            }

            colE.append(box);
        }

        function details(c) {
            if (!c || !colE || panelMode) return;

            chosen = c;
            colE.empty();

            var box = $('<div class="iptv-details"></div>');

            if (c.logo) {
                box.append(
                    $('<img class="iptv-large-logo">').attr('src', c.logo)
                );
            }

            box.append(item(c.name, 'iptv-heading'));

            var data = findPrograms(c);
            var p = data.current;
            var n = data.next;

            if (EPG.loading && !EPG.loaded) {
                box.append(item(
                    'Завантаження телепрограми...',
                    'iptv-muted'
                ));
            } else if (!EPG.loaded) {
                box.append(item(
                    EPG.status + (EPG.error ? ' — ' + EPG.error : ''),
                    'iptv-muted'
                ));
            } else if (!p && !n) {
                box.append(item(
                    'Програму не знайдено' +
                    (data.id ? '' : ' — канал не зіставлений з EPG'),
                    'iptv-muted'
                ));
            }

            if (p) {
                box.append(item('ЗАРАЗ В ЕФІРІ', 'iptv-blue'));
                box.append(item(p.title || 'Без назви', 'iptv-program'));
                box.append(item(
                    clock(p.start) + ' – ' + clock(p.stop),
                    'iptv-muted'
                ));

                var progress = $(
                    '<div class="iptv-progress"><div></div></div>'
                );

                progress.children().css(
                    'width',
                    Math.min(
                        100,
                        Math.max(
                            0,
                            (now() - p.start) / (p.stop - p.start) * 100
                        )
                    ) + '%'
                );

                box.append(progress);

                if (p.desc) {
                    box.append(item(p.desc, 'iptv-description'));
                }
            }

            if (n) {
                box.append(item('ДАЛІ В ЕФІРІ', 'iptv-blue'));
                box.append(item(n.title || 'Без назви', 'iptv-program'));
                box.append(item(
                    clock(n.start) + ' – ' + clock(n.stop),
                    'iptv-muted'
                ));
            }

            box.append(item(
                'TVG-ID: ' + (c.tvg_id || 'не задано'),
                'iptv-id'
            ));
            box.append(button('↻ Оновити EPG', refreshEPG));

            colE.append(box);
        }

        function renderGroups() {
            colG.empty();
            names = Object.keys(groups);

            names.forEach(function (name, i) {
                var el = item(name);

                el.on('click hover:enter', function () {
                    gi = i;
                    renderChannels(groups[name]);
                });

                el.on('hover:focus mouseenter', function () {
                    gi = i;
                    if (active === 'groups') focus();
                });

                colG.append(el);
            });

            focus();
        }

        function renderChannels(channels) {
            list = channels || [];
            ci = 0;
            active = 'channels';
            panelMode = '';
            colC.empty();

            list.forEach(function (c, i) {
                var el = $('<div class="iptv-item iptv-channel"></div>');

                if (c.logo) {
                    el.append(
                        $('<img class="iptv-logo">').attr('src', c.logo)
                    );
                }

                el.append(item(c.name, 'iptv-channel-name'));

                el.on('hover:focus mouseenter', function () {
                    ci = i;
                    details(c);
                    focus();
                });

                el.on('click hover:enter', function () {
                    ci = i;
                    details(c);
                    play(c);
                });

                colC.append(el);
            });

            if (list.length) {
                details(list[0]);
            } else {
                colE.empty().append(
                    item('У цій групі немає каналів', 'iptv-muted')
                );
            }

            focus();
        }

        function play(c) {
            if (c && c.url) {
                Lampa.Player.play({
                    url: c.url,
                    title: c.name
                });
            }
        }

        /*
         * ПАРСЕР M3U
         */

        function parse(body) {
            groups = { '⭐ Обране': [] };

            var lines = String(body || '').split(/\r?\n/);
            var pending = null;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var comma = line.indexOf(',');

                    pending = {
                        name: comma >= 0
                            ? line.slice(comma + 1).trim()
                            : 'Без назви',
                        group: (
                            line.match(/group-title="([^"]*)"/i) || []
                        )[1] || 'ЗАГАЛЬНІ',
                        logo: (
                            line.match(/tvg-logo="([^"]*)"/i) || []
                        )[1] || '',
                        tvg_id: (
                            line.match(/tvg-id="([^"]*)"/i) || []
                        )[1] || ''
                    };
                } else if (pending && /^https?:\/\//i.test(line)) {
                    pending.url = line;

                    if (!groups[pending.group]) {
                        groups[pending.group] = [];
                    }

                    groups[pending.group].push(pending);
                    pending = null;
                }
            }

            var fav = {};

            cfg.favorites.forEach(function (f) {
                if (f && f.url) fav[f.url] = true;
            });

            Object.keys(groups).forEach(function (g) {
                if (g === '⭐ Обране') return;

                groups[g].forEach(function (c) {
                    if (fav[c.url]) groups['⭐ Обране'].push(c);
                });
            });

            var ids = [];

            Object.keys(groups).forEach(function (g) {
                if (g === '⭐ Обране') return;

                groups[g].forEach(function (c) {
                    if (c.tvg_id) ids.push(c.tvg_id);
                });
            });

            EPG.playlistIds = uniqueIds(ids);

            var pl = cfg.playlists[cfg.current_pl_index] ||
                cfg.playlists[0];

            EPG.playlistSignature = makePlaylistSignature(
                EPG.playlistIds,
                pl && pl.url
            );

            clearLoadedEPG();
            restoreEPGCache(EPG.playlistSignature);

            updateMatchCounts();
            renderGroups();

            if (names.length) {
                gi = names.length > 1 ? 1 : 0;
                renderChannels(groups[names[gi]]);
            }

            epgLoad(function () {
                if (!alive) return;

                updateMatchCounts();

                if (panelMode) renderPanel();
                else if (chosen) details(chosen);

                if (EPG.error) {
                    console.warn(
                        '[IPTV PRO 13.7] EPG:',
                        EPG.status,
                        EPG.error
                    );
                }
            });
        }

        /*
         * ЗАВАНТАЖЕННЯ ПЛЕЙЛИСТА
         */

        function load() {
            var pl = cfg.playlists[cfg.current_pl_index] ||
                cfg.playlists[0];

            if (!pl || !pl.url) {
                loadError = 'URL плейлиста не задано';
                colG.empty().append(item(loadError, 'iptv-error'));
                return;
            }

            colG.empty().append(
                item('Завантаження плейлиста...', 'iptv-muted')
            );

            plRequest = $.ajax({
                url: pl.url,
                dataType: 'text',
                timeout: 30000,

                success: function (data) {
                    if (!alive) return;

                    loadError = '';
                    parse(data);
                },

                error: function (xhr, status, err) {
                    if (!alive || status === 'abort') return;

                    loadError =
                        'Запит: ' + status +
                        (err ? ' / ' + err : '') +
                        ' (HTTP ' + (xhr.status || 0) + ')';

                    colG.empty().append(
                        item('Помилка завантаження плейлиста', 'iptv-error')
                    );

                    notify('Не вдалося завантажити IPTV плейлист');

                    console.error(
                        '[IPTV PRO 13.7] Playlist error:',
                        loadError
                    );
                }
            });
        }

        /*
         * СТИЛІ ОСНОВНОГО IPTV
         */

        function buildStyles() {
            if ($('#iptv-pro-137-css').length) return;

            $('head').append(
                '<style id="iptv-pro-137-css">' +
                '.iptv-root{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;background:#0a0d13;color:#edf2fa;padding-top:4rem;box-sizing:border-box;font-family:inherit}' +
                '.iptv-toolbar{display:flex;align-items:center;gap:.65rem;padding:.85rem 1.15rem;background:linear-gradient(110deg,#141c2b,#10141d);border-bottom:1px solid #293345;flex-shrink:0}' +
                '.iptv-brand{font-size:1.25rem;font-weight:800;letter-spacing:.05em;margin-right:auto;white-space:nowrap}' +
                '.iptv-brand small{display:block;font-size:.62rem;color:#8fa7d7;letter-spacing:.15em;margin-top:.15rem}' +
                '.iptv-action{padding:.72rem .9rem;margin:.15rem;border:1px solid #303b50;border-radius:.65rem;background:#171f2d;color:#dbe5f6;font-size:.88rem;cursor:pointer;overflow-wrap:anywhere}' +
                '.iptv-action.active{background:#244a89;border-color:#72a3ff;color:#fff}' +
                '.iptv-action-primary{background:#2857a5;border-color:#3f73c8;color:#fff;font-weight:700}' +
                '.iptv-flex{display:flex;flex:1;min-height:0;width:100%;overflow:hidden}' +
                '.iptv-col{height:100%;box-sizing:border-box;overflow-y:auto;min-width:0;overscroll-behavior:contain}' +
                '.iptv-groups{width:22%;border-right:1px solid #242d3a;background:#0d1118}' +
                '.iptv-channels{width:43%;border-right:1px solid #242d3a;background:#10151e}' +
                '.iptv-info{width:35%;padding:1.25rem;background:linear-gradient(160deg,#111824,#0b0f16)}' +
                '.iptv-item{padding:.9rem .95rem;margin:.32rem .4rem;border:1px solid transparent;border-radius:.65rem;background:rgba(255,255,255,.035);color:#dce4f0;cursor:pointer;overflow-wrap:anywhere;transition:background .12s}' +
                '.iptv-item.active{background:linear-gradient(100deg,#234b86,#1a355d);border-color:#527fc3;color:#fff}' +
                '.iptv-channel{display:flex;align-items:center;gap:.8rem;min-height:3.5rem}' +
                '.iptv-logo{width:40px;height:40px;object-fit:contain;flex-shrink:0}' +
                '.iptv-channel-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1.04rem;padding:0;margin:0;background:none;border:0;min-width:0}' +
                '.iptv-large-logo{max-width:100%;width:100%;height:105px;object-fit:contain;margin-bottom:.7rem}' +
                '.iptv-heading{font-size:1.45rem;font-weight:800;margin:.65rem 0 1rem;color:#fff;background:none;border:0;padding:.25rem 0}' +
                '.iptv-blue{color:#8bb4ff;font-weight:800;font-size:.82rem;letter-spacing:.09em;margin:1.2rem 0 .5rem;background:none;border:0;padding:.2rem 0}' +
                '.iptv-program{font-size:1.18rem;font-weight:650;margin:.3rem 0;color:#f1f5fb;background:none;border:0;padding:.2rem 0}' +
                '.iptv-muted{color:#9aa9bd;font-size:.9rem;overflow-wrap:anywhere;background:none;border:0;padding:.25rem 0}' +
                '.iptv-description{color:#aebbd0;font-size:.9rem;line-height:1.5;margin-top:.9rem;background:none;border:0;padding:.25rem 0}' +
                '.iptv-id{font-size:.76rem;color:#78879b;margin-top:1.5rem;word-break:break-word;background:none;border:0;padding:.25rem 0}' +
                '.iptv-progress{height:5px;background:#283344;border-radius:10px;margin-top:.7rem;overflow:hidden}' +
                '.iptv-progress>div{height:100%;background:linear-gradient(90deg,#3975d7,#83b6ff);border-radius:10px}' +
                '.iptv-panel{display:flex;flex-direction:column;gap:.25rem;padding-bottom:1rem}' +
                '.iptv-panel-title{font-size:1.45rem;font-weight:850;letter-spacing:.04em;color:#fff;background:none;border:0;padding:.25rem 0;margin:.2rem 0}' +
                '.iptv-panel-subtitle{color:#9caec7;font-size:.9rem;background:none;border:0;padding:.2rem 0;margin-bottom:.75rem}' +
                '.iptv-label{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#8da8d2;background:none;border:0;padding:.35rem 0 .15rem}' +
                '.iptv-value{font-size:.94rem;color:#e1e9f6;background:#151d29;border:1px solid #222e40;border-radius:.5rem;padding:.65rem .75rem;margin:.2rem 0;overflow-wrap:anywhere}' +
                '.iptv-url{font-size:.8rem;color:#a8b8d0;background:#0c1119;border:1px solid #222c3b;border-radius:.5rem;padding:.65rem .75rem;margin:.2rem 0 .55rem;overflow-wrap:anywhere;word-break:break-all}' +
                '.iptv-status{color:#9bc1ff;background:#172842;border:1px solid #294a77;border-radius:.55rem;padding:.75rem;margin:.35rem 0}' +
                '.iptv-error-title{color:#ffb0a9;font-size:.8rem;font-weight:800;letter-spacing:.06em;margin-top:.7rem;background:none;border:0;padding:.25rem 0}' +
                '.iptv-error{color:#ffd0cb;background:#341e23;border:1px solid #643039;border-radius:.5rem;padding:.7rem;margin:.25rem 0;overflow-wrap:anywhere}' +
                '.iptv-standalone-page{position:fixed;inset:0;z-index:1200;box-sizing:border-box;overflow-y:auto;padding:5rem 2rem 2rem;background:#0a0d13;color:#edf2fa;font-family:inherit}' +
                '.iptv-standalone-inner{max-width:1050px;margin:0 auto}' +
                '.iptv-standalone-title{font-size:1.7rem;font-weight:850;color:#fff;margin:0 0 .5rem}' +
                '.iptv-standalone-subtitle{color:#9caec7;font-size:1rem;margin:0 0 1.3rem}' +
                '.iptv-standalone-section{padding:.9rem 1rem;margin:.45rem 0;border:1px solid #222e40;border-radius:.65rem;background:#111824;overflow-wrap:anywhere;word-break:break-word}' +
                '.iptv-standalone-section strong{display:block;color:#8fb6ff;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem}' +
                '.iptv-standalone-button{display:block;width:100%;text-align:left;padding:.95rem 1rem;margin:.55rem 0;border:1px solid #303b50;border-radius:.65rem;background:#171f2d;color:#edf2fa;font-size:1rem;box-sizing:border-box}' +
                '.iptv-standalone-button.active{background:#244a89;border-color:#72a3ff;color:#fff;box-shadow:0 0 0 2px rgba(114,163,255,.18)}' +
                '.iptv-standalone-button-primary{background:#2857a5;border-color:#3f73c8;font-weight:750}' +
                '.iptv-standalone-error{color:#ffd0cb;background:#341e23;border-color:#643039}' +
                '@media(max-width:900px){.iptv-toolbar{flex-wrap:wrap;padding:.6rem}.iptv-brand{width:100%}.iptv-action{font-size:.8rem;padding:.55rem}.iptv-groups{width:27%}.iptv-channels{width:43%}.iptv-info{width:30%;padding:.7rem}.iptv-item{padding:.65rem;margin:.25rem;font-size:.85rem}.iptv-logo{width:30px;height:30px}.iptv-standalone-page{padding:4.5rem 1rem 1rem}}' +
                '</style>'
            );
        }

        /*
         * ПАНЕЛЬ КЕРУВАННЯ
         */

        function buildToolbar() {
            toolbar = $('<div class="iptv-toolbar"></div>');

            toolbar.append(
                '<div class="iptv-brand">IPTV PRO<small>PREMIUM · XMLTV</small></div>'
            );

            toolbarActions.forEach(function (action, i) {
                var el = $('<div></div>')
                    .addClass('iptv-action selector')
                    .attr('data-action', action.id)
                    .text(action.title);

                el.on('hover:focus mouseenter', function () {
                    ti = i;

                    if (active === 'toolbar' && !panelMode) focus();
                });

                el.on('click hover:enter', function () {
                    ti = i;
                    runToolbarAction(action.id);
                });

                toolbar.append(el);
            });
        }

        function runToolbarAction(id) {
            if (id === 'refresh') refreshEPG();
            else if (id === 'settings') showPanel('settings');
            else if (id === 'diagnostics') showPanel('diagnostics');
        }

        /*
         * ЖИТТЄВИЙ ЦИКЛ
         */

        this.create = function () {
            alive = true;
            panelMode = '';

            activeIPTVInstance = {
                refresh: refreshEPG
            };

            root = $('<div class="iptv-root"></div>');

            buildStyles();
            buildToolbar();

            var flex = $('<div class="iptv-flex"></div>');

            colG = $('<div class="iptv-col iptv-groups"></div>');
            colC = $('<div class="iptv-col iptv-channels"></div>');
            colE = $('<div class="iptv-col iptv-info"></div>');

            flex.append(colG, colC, colE);
            root.append(toolbar, flex);

            load();

            timer = setInterval(function () {
                if (!alive || panelMode) return;
                if (chosen) details(chosen);
            }, 60000);

            return root;
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (panelMode) {
                        var buttons = colE.find('.iptv-action');

                        ci = Math.max(0, ci - 1);

                        if (ci >= buttons.length) {
                            ci = buttons.length - 1;
                        }

                        focus();
                        return;
                    }

                    if (active === 'toolbar') {
                        focus();
                        return;
                    }

                    if (active === 'groups') {
                        if (gi <= 0) {
                            active = 'toolbar';
                            ti = 0;
                        } else {
                            gi--;
                        }
                    } else {
                        if (ci <= 0) {
                            active = 'toolbar';
                            ti = 0;
                        } else {
                            ci--;
                        }
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                down: function () {
                    if (panelMode) {
                        ci = Math.min(
                            colE.find('.iptv-action').length - 1,
                            ci + 1
                        );

                        ci = Math.max(0, ci);
                        focus();
                        return;
                    }

                    if (active === 'toolbar') {
                        active = 'groups';
                        focus();
                        return;
                    }

                    if (active === 'groups') {
                        gi = Math.min(
                            Math.max(0, names.length - 1),
                            gi + 1
                        );
                    } else {
                        ci = Math.min(
                            Math.max(0, list.length - 1),
                            ci + 1
                        );
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                right: function () {
                    if (panelMode) return;

                    if (active === 'toolbar') {
                        ti = Math.min(
                            toolbarActions.length - 1,
                            ti + 1
                        );

                        focus();
                        return;
                    }

                    if (active === 'groups' && names[gi]) {
                        renderChannels(groups[names[gi]]);
                    }
                },

                left: function () {
                    if (panelMode) return;

                    if (active === 'toolbar') {
                        ti = Math.max(0, ti - 1);
                        focus();
                        return;
                    }

                    if (active === 'channels') {
                        active = 'groups';
                        focus();
                    }
                },

                enter: function () {
                    if (panelMode) {
                        var buttons = colE.find('.iptv-action');
                        var selected = buttons.eq(ci);

                        if (selected.length) {
                            selected.trigger('hover:enter');
                        }

                        return;
                    }

                    if (active === 'toolbar') {
                        var action = toolbarActions[ti];

                        if (action) runToolbarAction(action.id);

                        return;
                    }

                    if (active === 'groups' && names[gi]) {
                        renderChannels(groups[names[gi]]);
                    } else if (list[ci]) {
                        play(list[ci]);
                    }
                },

                back: function () {
                    if (panelMode) {
                        closePanel();
                    } else if (
                        active === 'channels' ||
                        active === 'toolbar'
                    ) {
                        active = 'groups';
                        focus();
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('iptv_pro');
            focus();
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            alive = false;

            if (activeIPTVInstance) {
                activeIPTVInstance = null;
            }

            if (timer) {
                clearInterval(timer);
                timer = null;
            }

            if (plRequest && plRequest.readyState !== 4) {
                plRequest.abort();
            }

            if (EPG.request && EPG.request.readyState !== 4) {
                EPG.request.abort();
                EPG.request = null;
                EPG.loading = false;
            }

            Lampa.Controller.remove('iptv_pro');

            if (root) {
                root.remove();
                root = null;
            }

            colG = null;
            colC = null;
            colE = null;
            toolbar = null;
        };
    }

    /*
     * ОКРЕМІ СТОРІНКИ СИСТЕМНИХ НАЛАШТУВАНЬ
     *
     * Важливо:
     * - сторінки не відкривають IPTVComponent;
     * - вони мають власний компонент та власну навігацію;
     * - кнопка «Назад» повертає до попереднього екрана Lampa;
     * - оновлення EPG доступне без переходу до списку каналів.
     */

    function standalonePageFactory(pageType, componentName) {
        return function IPTVStandalonePage() {
            var root;
            var inner;
            var alive = true;
            var selectedIndex = 0;
            var pageButtons = [];

            function section(label, value, extraClass) {
                var el = $('<div></div>')
                    .addClass('iptv-standalone-section')
                    .addClass(extraClass || '');

                $('<strong></strong>').text(label).appendTo(el);
                $('<div></div>').text(value).appendTo(el);

                return el;
            }

            function addButton(title, action, primary) {
                var index = pageButtons.length;

                var el = $('<div></div>')
                    .addClass('iptv-standalone-button selector')
                    .addClass(primary ? 'iptv-standalone-button-primary' : '')
                    .attr('tabindex', '0')
                    .text(title);

                el.on('hover:focus mouseenter', function () {
                    selectedIndex = index;
                    setFocus();
                });

                el.on('click hover:enter', function () {
                    if (alive) action();
                });

                pageButtons.push({
                    element: el,
                    action: action
                });

                inner.append(el);
            }

            function setFocus() {
                if (!root) return;

                root.find('.iptv-standalone-button').removeClass('active');

                if (!pageButtons.length) return;

                selectedIndex = Math.max(
                    0,
                    Math.min(selectedIndex, pageButtons.length - 1)
                );

                var target = pageButtons[selectedIndex].element;

                target.addClass('active');

                if (target[0] && target[0].scrollIntoView) {
                    target[0].scrollIntoView({ block: 'nearest' });
                }
            }

            function refreshPage() {
                renderPage();
                setFocus();
            }

            function refreshEPGFromPage() {
                if (!EPG.playlistIds || !EPG.playlistIds.length) {
                    notify(
                        'Спочатку відкрий IPTV PRO, щоб завантажити плейлист і tvg-id каналів.'
                    );
                    return;
                }

                if (EPG.loading) {
                    EPG.refreshQueued = true;
                    notify('Оновлення EPG вже виконується. Повторний запит поставлено в чергу.');
                    refreshPage();
                    return;
                }

                EPG.status = 'Запуск ручного оновлення...';
                EPG.error = '';
                refreshPage();

                epgLoad(function () {
                    if (!alive) return;

                    refreshPage();

                    if (EPG.error) {
                        notify('EPG: ' + EPG.error);
                    } else {
                        notify(
                            'EPG оновлено: ' +
                            EPG.programmeCount + ' передач'
                        );
                    }
                }, true);
            }

            function openIPTV() {
                Lampa.Activity.push({
                    title: 'IPTV PRO',
                    component: 'iptv_pro'
                });
            }

            function renderSettings() {
                var pl = cfg.playlists[cfg.current_pl_index] ||
                    cfg.playlists[0];

                inner.append(
                    section('Версія', 'IPTV PRO 13.7 · XMLTV Edition')
                );

                inner.append(
                    section('Джерело EPG', EPG_URL)
                );

                inner.append(
                    section(
                        'Поточний плейлист',
                        pl && pl.name ? pl.name : 'Без назви'
                    )
                );

                inner.append(
                    section(
                        'URL плейлиста',
                        pl && pl.url ? pl.url : 'URL не задано'
                    )
                );

                inner.append(
                    section(
                        'Стан EPG',
                        EPG.status
                    )
                );

                inner.append(
                    section(
                        'Останнє успішне оновлення',
                        formatDate(EPG.lastSuccess)
                    )
                );

                inner.append(
                    section(
                        'Період кешування',
                        'До ' + EPG_CACHE_HOURS + ' годин розкладу'
                    )
                );

                inner.append(
                    section(
                        'Автоматичне оновлення',
                        'Повторне завантаження — не частіше ніж раз на 3 години'
                    )
                );

                addButton(
                    EPG.loading
                        ? 'Оновлення EPG виконується...'
                        : '↻ Оновити телепрограму EPG',
                    refreshEPGFromPage,
                    true
                );

                addButton(
                    'Відкрити діагностику EPG',
                    function () {
                        Lampa.Activity.push({
                            title: 'Діагностика EPG',
                            component: 'iptv_pro_epg_diagnostics'
                        });
                    }
                );

                addButton(
                    'Відкрити IPTV PRO',
                    openIPTV,
                    false
                );

                addButton(
                    'Оновити інформацію на сторінці',
                    refreshPage,
                    false
                );

                addButton(
                    'Назад',
                    function () {
                        Lampa.Activity.backward();
                    },
                    false
                );
            }

            function renderDiagnostics() {
                inner.append(
                    section('Стан EPG', EPG.status)
                );

                inner.append(
                    section('Результат останньої спроби', EPG.lastResult)
                );

                inner.append(
                    section('Режим запиту', EPG.requestMode)
                );

                inner.append(
                    section(
                        'Каналів у M3U з tvg-id',
                        String(EPG.requestedChannelCount)
                    )
                );

                inner.append(
                    section('Розмір пакета', BATCH_SIZE + ' tvg-id')
                );

                inner.append(
                    section('GET-fallback', 'Вимкнено; використовується POST')
                );

                inner.append(
                    section(
                        'HTTP-статус останнього запиту',
                        String(EPG.httpStatus || 'Немає відповіді')
                    )
                );

                inner.append(
                    section(
                        'Остання спроба',
                        formatDate(EPG.lastAttempt)
                    )
                );

                inner.append(
                    section(
                        'Останній успіх',
                        formatDate(EPG.lastSuccess)
                    )
                );

                inner.append(
                    section(
                        'Тривалість останнього завантаження',
                        durationText(EPG.lastDuration)
                    )
                );

                inner.append(
                    section(
                        'Каналів XMLTV',
                        String(EPG.channelCount)
                    )
                );

                inner.append(
                    section(
                        'Передач у розкладі',
                        String(EPG.programmeCount)
                    )
                );

                inner.append(
                    section(
                        'Каналів зіставлено',
                        String(EPG.matchedChannels)
                    )
                );

                inner.append(
                    section(
                        'Каналів без збігу',
                        String(EPG.unmatchedChannels)
                    )
                );

                inner.append(
                    section(
                        'Джерело даних',
                        EPG.cacheSource
                    )
                );

                inner.append(
                    section(
                        'Кеш збережено',
                        formatDate(EPG.cacheSavedAt)
                    )
                );

                inner.append(
                    section(
                        'Вік даних EPG',
                        EPG.loaded
                            ? durationText(now() - EPG.loaded) + ' тому'
                            : 'Дані відсутні'
                    )
                );

                if (EPG.error) {
                    inner.append(
                        section('Подробиці помилки EPG', EPG.error, 'iptv-standalone-error')
                    );
                }

                addButton(
                    EPG.loading
                        ? 'Оновлення EPG виконується...'
                        : '↻ Повторити перевірку EPG',
                    refreshEPGFromPage,
                    true
                );

                addButton(
                    'Оновити діагностичні дані',
                    refreshPage,
                    false
                );

                addButton(
                    'Відкрити налаштування EPG',
                    function () {
                        Lampa.Activity.push({
                            title: 'Налаштування EPG',
                            component: 'iptv_pro_settings_page'
                        });
                    },
                    false
                );

                addButton(
                    'Відкрити IPTV PRO',
                    openIPTV,
                    false
                );

                addButton(
                    'Назад',
                    function () {
                        Lampa.Activity.backward();
                    },
                    false
                );
            }

            function renderPage() {
                if (!inner) return;

                inner.empty();
                pageButtons = [];
                selectedIndex = 0;

                if (pageType === 'settings') {
                    $('<div class="iptv-standalone-title"></div>')
                        .text('Налаштування EPG')
                        .appendTo(inner);

                    $('<div class="iptv-standalone-subtitle"></div>')
                        .text('IPTV PRO · XMLTV Edition')
                        .appendTo(inner);

                    renderSettings();
                } else {
                    $('<div class="iptv-standalone-title"></div>')
                        .text('Діагностика EPG')
                        .appendTo(inner);

                    $('<div class="iptv-standalone-subtitle"></div>')
                        .text('Стан завантаження, кешу та зіставлення каналів')
                        .appendTo(inner);

                    renderDiagnostics();
                }
            }

            this.create = function () {
                alive = true;

                buildStandaloneStyles();

                root = $('<div class="iptv-standalone-page"></div>');
                inner = $('<div class="iptv-standalone-inner"></div>');

                root.append(inner);
                renderPage();

                return root;
            };

            this.start = function () {
                Lampa.Controller.add(componentName, {
                    up: function () {
                        selectedIndex = Math.max(0, selectedIndex - 1);
                        setFocus();
                    },

                    down: function () {
                        selectedIndex = Math.min(
                            Math.max(0, pageButtons.length - 1),
                            selectedIndex + 1
                        );
                        setFocus();
                    },

                    left: function () {
                        selectedIndex = Math.max(0, selectedIndex - 1);
                        setFocus();
                    },

                    right: function () {
                        selectedIndex = Math.min(
                            Math.max(0, pageButtons.length - 1),
                            selectedIndex + 1
                        );
                        setFocus();
                    },

                    enter: function () {
                        if (
                            pageButtons[selectedIndex] &&
                            pageButtons[selectedIndex].action
                        ) {
                            pageButtons[selectedIndex].action();
                        }
                    },

                    back: function () {
                        Lampa.Activity.backward();
                    }
                });

                Lampa.Controller.toggle(componentName);
                setFocus();
            };

            this.render = function () {
                return root;
            };

            this.destroy = function () {
                alive = false;

                Lampa.Controller.remove(componentName);

                if (root) {
                    root.remove();
                    root = null;
                }

                inner = null;
                pageButtons = [];
            };
        };
    }

    function buildStandaloneStyles() {
        if ($('#iptv-pro-137-css').length) return;

        $('head').append(
            '<style id="iptv-pro-137-css">' +
            '.iptv-standalone-page{position:fixed;inset:0;z-index:1200;box-sizing:border-box;overflow-y:auto;padding:5rem 2rem 2rem;background:#0a0d13;color:#edf2fa;font-family:inherit}' +
            '.iptv-standalone-inner{max-width:1050px;margin:0 auto}' +
            '.iptv-standalone-title{font-size:1.7rem;font-weight:850;color:#fff;margin:0 0 .5rem}' +
            '.iptv-standalone-subtitle{color:#9caec7;font-size:1rem;margin:0 0 1.3rem}' +
            '.iptv-standalone-section{padding:.9rem 1rem;margin:.45rem 0;border:1px solid #222e40;border-radius:.65rem;background:#111824;overflow-wrap:anywhere;word-break:break-word}' +
            '.iptv-standalone-section strong{display:block;color:#8fb6ff;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.35rem}' +
            '.iptv-standalone-button{display:block;width:100%;text-align:left;padding:.95rem 1rem;margin:.55rem 0;border:1px solid #303b50;border-radius:.65rem;background:#171f2d;color:#edf2fa;font-size:1rem;box-sizing:border-box}' +
            '.iptv-standalone-button.active{background:#244a89;border-color:#72a3ff;color:#fff;box-shadow:0 0 0 2px rgba(114,163,255,.18)}' +
            '.iptv-standalone-button-primary{background:#2857a5;border-color:#3f73c8;font-weight:750}' +
            '.iptv-standalone-error{color:#ffd0cb;background:#341e23;border-color:#643039}' +
            '@media(max-width:900px){.iptv-standalone-page{padding:4.5rem 1rem 1rem}}' +
            '</style>'
        );
    }

    /*
     * СИСТЕМНІ НАЛАШТУВАННЯ IPTV PRO
     *
     * Кожна команда відкриває потрібну сторінку окремо.
     * «Налаштування EPG» та «Діагностика EPG» не відкривають
     * список IPTV-каналів.
     */

    function openIPTVSettingsPanel(mode) {
        if (mode === 'open') {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_pro'
            });
            return;
        }

        if (mode === 'refresh') {
            if (activeIPTVInstance && activeIPTVInstance.refresh) {
                activeIPTVInstance.refresh();
                return;
            }

            if (!EPG.playlistIds || !EPG.playlistIds.length) {
                notify(
                    'Спочатку відкрий IPTV PRO, щоб завантажити плейлист і tvg-id каналів.'
                );
                return;
            }

            if (EPG.loading) {
                EPG.refreshQueued = true;
                notify('Оновлення EPG вже виконується. Повторний запит поставлено в чергу.');
                return;
            }

            epgLoad(function () {
                if (EPG.error) notify('EPG: ' + EPG.error);
                else notify('EPG оновлено: ' + EPG.programmeCount + ' передач');
            }, true);

            return;
        }

        if (mode === 'diagnostics') {
            Lampa.Activity.push({
                title: 'Діагностика EPG',
                component: 'iptv_pro_epg_diagnostics'
            });
            return;
        }

        if (mode === 'settings') {
            Lampa.Activity.push({
                title: 'Налаштування EPG',
                component: 'iptv_pro_settings_page'
            });
        }
    }

    function addIPTVSettingButton(id, title, callback) {
        Lampa.SettingsApi.addParam({
            component: 'iptv_pro_settings',
            param: {
                name: id,
                type: 'button'
            },
            field: {
                name: title
            },
            onChange: callback
        });
    }

    function registerIPTVSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) {
            console.warn('[IPTV PRO 13.7] SettingsApi недоступний');
            return;
        }

        Lampa.SettingsApi.addComponent({
            component: 'iptv_pro_settings',
            name: 'IPTV PRO',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v12H4zM2 4v16h20V4zm8 4 6 4-6 4z"/></svg>'
        });

        if (!Lampa.SettingsApi.addParam) {
            console.warn('[IPTV PRO 13.7] SettingsApi.addParam недоступний');
            return;
        }

        addIPTVSettingButton(
            'iptv_pro_open',
            'Відкрити IPTV PRO',
            function () {
                openIPTVSettingsPanel('open');
            }
        );

        addIPTVSettingButton(
            'iptv_pro_epg_refresh',
            'Оновити телепрограму EPG',
            function () {
                openIPTVSettingsPanel('refresh');
            }
        );

        addIPTVSettingButton(
            'iptv_pro_epg_diagnostics',
            'Діагностика EPG',
            function () {
                openIPTVSettingsPanel('diagnostics');
            }
        );

        addIPTVSettingButton(
            'iptv_pro_epg_settings',
            'Налаштування EPG',
            function () {
                openIPTVSettingsPanel('settings');
            }
        );

        addIPTVSettingButton(
            'iptv_pro_epg_status',
            'Поточний стан EPG',
            function () {
                notify(
                    'Стан: ' + EPG.status +
                    '. Каналів XMLTV: ' + EPG.channelCount +
                    '. Передач: ' + EPG.programmeCount +
                    '. Останній успіх: ' + formatDate(EPG.lastSuccess)
                );
            }
        );

        addIPTVSettingButton(
            'iptv_pro_playlist_info',
            'Інформація про плейлист',
            function () {
                var pl = cfg.playlists[cfg.current_pl_index] ||
                    cfg.playlists[0];

                notify(
                    'Плейлист: ' +
                    (pl && pl.name ? pl.name : 'Без назви') +
                    '. Каналів із tvg-id: ' +
                    EPG.playlistIds.length
                );
            }
        );

        console.log('[IPTV PRO 13.7] Системні параметри зареєстровано');
    }

    /*
     * ІНІЦІАЛІЗАЦІЯ
     */

    function init() {
        if (window.__iptv_pro_137_initialized) return;

        var menu = $('.menu .menu__list');

        if (!menu.length) {
            console.warn('[IPTV PRO 13.7] Меню Lampa ще не готове');
            return;
        }

        window.__iptv_pro_137_initialized = true;

        Lampa.Component.add('iptv_pro', IPTVComponent);

        Lampa.Component.add(
            'iptv_pro_settings_page',
            standalonePageFactory('settings', 'iptv_pro_settings_page')
        );

        Lampa.Component.add(
            'iptv_pro_epg_diagnostics',
            standalonePageFactory('diagnostics', 'iptv_pro_epg_diagnostics')
        );

        registerIPTVSettings();

        menu.find('.iptv-pro-menu').remove();

        var entry = $(
            '<li class="menu__item selector iptv-pro-menu">' +
                '<div class="menu__text">IPTV PRO</div>' +
            '</li>'
        );

        entry.on('hover:enter click', function () {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_pro'
            });
        });

        menu.append(entry);

        console.log('[IPTV PRO 13.7] Ініціалізовано');
    }

    function waitForInit() {
        if (window.app_ready) {
            init();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') init();
            });
        }
    }

    waitForInit();

})();
