// ==Lampa==
// name: IPTV PRO (XMLTV Edition)
// version: 14.0.1

(function () {
    'use strict';

    if (!window.Lampa || !window.$) return;

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

    if (!cfg.epg_url) cfg.epg_url = EPG_URL;

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
        requestedChannelCount: 0,
        generation: 0,
        run: null
    };

    var activeIPTVInstance = null;

    function now() {
        return Date.now();
    }

    function logPrefix() {
        return '[IPTV PRO 14.0.1]';
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
            +m[1], +m[2] - 1, +m[3],
            +m[4], +m[5], +(m[6] || 0)
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
            Lampa.Noty.show(String(message || ''));
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
                console.error(logPrefix(), 'Callback:', e);
            }
        });
    }

    /*
     * TVG-ID І ПІДПИС ПЛЕЙЛИСТА
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

    function hashString(source) {
        var hash = 2166136261;

        for (var i = 0; i < source.length; i++) {
            hash ^= source.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return (hash >>> 0).toString(16);
    }

    function makePlaylistSignature(ids, playlistUrl) {
        var sortedIds = (ids || []).slice().sort();

        var source = [
            'URL=' + String(playlistUrl || '').trim(),
            'IDS=' + sortedIds.join('\n')
        ].join('\n');

        return 'iptv140_' + hashString(source) + '_' + source.length;
    }

    function makeLegacySignature(ids, playlistUrl) {
        var source = ids && ids.length
            ? ids.slice().sort().join('\n')
            : 'NO_TVG_IDS\n' + String(playlistUrl || '');

        return 'iptv139_' + hashString(source) + '_' + source.length;
    }

    /*
     * КЕРУВАННЯ ЗАВАНТАЖЕННЯМ EPG
     */

    function cancelEPGLoad(reason) {
        EPG.generation++;

        var request = EPG.request;

        EPG.request = null;
        EPG.loading = false;
        EPG.refreshQueued = false;
        EPG.run = null;
        EPG.callbacks = [];

        if (request && request.readyState !== 4) {
            try {
                request.abort();
            } catch (e) {
                console.warn(logPrefix(), 'Не вдалося скасувати EPG-запит:', e);
            }
        }

        if (reason) {
            console.log(logPrefix(), 'Завантаження EPG скасовано:', reason);
        }
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

    function restoreEPGCache(expectedSignature, legacySignature) {
        var cache;

        try {
            cache = Lampa.Storage.get(EPG_CACHE_KEY, null);
        } catch (e) {
            console.warn(logPrefix(), 'Читання кешу:', e);
            return false;
        }

        if (
            !cache ||
            cache.version !== 2 ||
            !cache.channels ||
            typeof cache.channels !== 'object' ||
            !cache.savedAt
        ) {
            return false;
        }

        var isCurrentSignature =
            cache.playlistSignature === expectedSignature;

        var isLegacySignature =
            legacySignature &&
            cache.playlistSignature === legacySignature;

        if (!isCurrentSignature && !isLegacySignature) {
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
                    typeof p.title === 'string' &&
                    isFinite(p.start) &&
                    isFinite(p.stop) &&
                    p.stop > p.start &&
                    p.stop > cutoffStart &&
                    p.start < cutoffStop;
            }).map(function (p) {
                return {
                    start: Number(p.start),
                    stop: Number(p.stop),
                    title: String(p.title || ''),
                    desc: String(p.desc || '')
                };
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
        EPG.cacheSource = isLegacySignature
            ? 'Старий локальний кеш'
            : 'Локальний кеш';
        EPG.channelCount = Object.keys(restoredChannels).length;
        EPG.programmeCount = totalPrograms;
        EPG.status = 'Відновлено з локального кешу';
        EPG.lastResult = 'Локальний кеш';

        console.log(
            logPrefix(),
            'Кеш відновлено:',
            EPG.channelCount,
            'каналів;',
            totalPrograms,
            'передач'
        );

        return true;
    }

    function saveEPGCache(signature) {
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
            console.warn(logPrefix(), 'Кеш не збережено: немає передач');
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
            playlistSignature: signature || EPG.playlistSignature,
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
                logPrefix(),
                'Кеш збережено:',
                Object.keys(cache.channels).length,
                'каналів;',
                json.length,
                'символів'
            );

            return true;
        } catch (e) {
            console.warn(logPrefix(), 'Помилка збереження кешу:', e);
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

        var xml;

        try {
            xml = $.parseXML(body);
        } catch (e) {
            throw new Error('Не вдалося розібрати XML: ' + String(e.message || e));
        }

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
     */

    function epgLoad(done, force) {
        if (done) EPG.callbacks.push(done);

        if (EPG.loading || EPG.request) {
            if (force) EPG.refreshQueued = true;
            return;
        }

        if (!force && EPG.loaded && now() - EPG.loaded < CACHE_TTL) {
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

        var generation = EPG.generation;
        var signature = EPG.playlistSignature;

        var previousChannels = EPG.channels;
        var previousAliases = EPG.aliases;
        var previousLoaded = EPG.loaded;
        var previousChannelCount = EPG.channelCount;
        var previousProgrammeCount = EPG.programmeCount;
        var previousCacheSource = EPG.cacheSource;

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

        var run = {
            generation: generation,
            signature: signature,
            startedAt: startedAt
        };

        EPG.run = run;

        function isCurrentRun() {
            return !completed && generation === EPG.generation;
        }

        function finishAll() {
            if (completed || generation !== EPG.generation) return;

            completed = true;
            EPG.lastDuration = now() - startedAt;
            EPG.loading = false;
            EPG.request = null;
            EPG.run = null;

            if (EPG.refreshQueued) {
                EPG.refreshQueued = false;
                epgLoad(null, true);
                return;
            }

            finishCallbacks();
        }

        function mergePreviousData() {
            Object.keys(previousChannels || {}).forEach(function (id) {
                var oldPrograms = previousChannels[id] || [];

                if (!allChannels[id]) allChannels[id] = [];

                var existing = Object.create(null);

                allChannels[id].forEach(function (p) {
                    existing[p.start + ':' + p.stop + ':' + p.title] = true;
                });

                oldPrograms.forEach(function (p) {
                    var key = p.start + ':' + p.stop + ':' + p.title;

                    if (!existing[key]) {
                        allChannels[id].push(p);
                        existing[key] = true;
                    }
                });
            });

            Object.keys(previousAliases || {}).forEach(function (alias) {
                if (!allAliases[alias]) {
                    allAliases[alias] = previousAliases[alias];
                }
            });

            Object.keys(allChannels).forEach(function (id) {
                allChannels[id].sort(function (a, b) {
                    return a.start - b.start;
                });
            });
        }

        function processNextBatch() {
            if (!isCurrentRun()) return;

            if (batchIndex >= batches.length) {
                if (totalProgrammes > 0) {
                    if (failedBatches > 0) mergePreviousData();

                    Object.keys(allChannels).forEach(function (id) {
                        allChannels[id].sort(function (a, b) {
                            return a.start - b.start;
                        });
                    });

                    EPG.channels = allChannels;
                    EPG.aliases = allAliases;
                    EPG.channelCount = Object.keys(allChannels).length;

                    var programmeCount = 0;

                    Object.keys(allChannels).forEach(function (id) {
                        programmeCount += allChannels[id].length;
                    });

                    EPG.programmeCount = programmeCount;
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

                    if (generation === EPG.generation) {
                        saveEPGCache(signature);
                    }

                    console.log(
                        logPrefix(),
                        'EPG завершено:',
                        successfulBatches,
                        'успішних пакетів;',
                        failedBatches,
                        'помилок;',
                        EPG.channelCount,
                        'каналів;',
                        EPG.programmeCount,
                        'передач'
                    );
                } else {
                    EPG.channels = previousChannels;
                    EPG.aliases = previousAliases;
                    EPG.loaded = previousLoaded;
                    EPG.channelCount = previousChannelCount;
                    EPG.programmeCount = previousProgrammeCount;
                    EPG.cacheSource = previousCacheSource;

                    EPG.status = previousLoaded
                        ? 'Оновлення не вдалося — використано попередні дані'
                        : 'Не вдалося отримати EPG';

                    EPG.lastResult = 'Немає нових валідних передач';

                    EPG.error = errors.length
                        ? errors.slice(0, 5).join(' | ')
                        : 'У відповідях Worker немає валідних передач.';

                    console.error(logPrefix(), 'EPG:', EPG.error);
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

            var request;

            try {
                request = $.ajax({
                    url: EPG_URL,
                    method: 'POST',
                    dataType: 'text',
                    timeout: 60000,
                    cache: false,
                    contentType: 'application/json; charset=utf-8',
                    processData: false,
                    data: JSON.stringify({ ids: currentBatch }),

                    success: function (body, textStatus, responseXHR) {
                        if (!isCurrentRun()) return;

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
                                logPrefix(),
                                'Помилка пакета:',
                                currentNumber,
                                e
                            );
                        }
                    },

                    error: function (xhr, status, err) {
                        if (!isCurrentRun() || status === 'abort') return;

                        EPG.httpStatus = xhr ? xhr.status || 0 : 0;
                        failedBatches++;

                        errors.push(
                            'Пакет ' + currentNumber + ': ' +
                            status + (err ? ' / ' + err : '') +
                            ' (HTTP ' + EPG.httpStatus + ')'
                        );

                        console.warn(
                            logPrefix(),
                            'HTTP-помилка:',
                            errors[errors.length - 1]
                        );
                    },

                    complete: function () {
                        if (!isCurrentRun()) return;

                        EPG.request = null;
                        processNextBatch();
                    }
                });
            } catch (e) {
                if (!isCurrentRun()) return;

                failedBatches++;
                errors.push(
                    'Пакет ' + currentNumber + ': ' +
                    String(e.message || e)
                );

                processNextBatch();
                return;
            }

            if (isCurrentRun()) EPG.request = request;
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
            if (arr[i].start <= currentTime && arr[i].stop > currentTime) {
                current = arr[i];
            } else if (arr[i].start > currentTime) {
                next = arr[i];
                break;
            }
        }

        return { current: current, next: next, id: id };
    }

    function clock(t) {
        var d = new Date(t);

        return (
            ('0' + d.getHours()).slice(-2) + ':' +
            ('0' + d.getMinutes()).slice(-2)
        );
    }

    /*
     * НАЛАШТУВАННЯ ПЛЕЙЛИСТА
     */

    function getPlaylist() {
        return cfg.playlists[cfg.current_pl_index] ||
            cfg.playlists[0] ||
            {};
    }

    function saveConfig() {
        try {
            Lampa.Storage.set(KEY, cfg);
            return true;
        } catch (e) {
            console.error(logPrefix(), 'Помилка збереження налаштувань:', e);
            notify('Не вдалося зберегти налаштування.');
            return false;
        }
    }

    function editPlaylistUrl() {
        var pl = getPlaylist();

        if (!pl) {
            notify('Плейлист не знайдено.');
            return;
        }

        function saveUrl(value) {
            var url = String(value || '').trim();

            if (!url) {
                notify('Адреса M3U не може бути порожньою.');
                return;
            }

            if (!/^https?:\/\/\S+$/i.test(url)) {
                notify('Введи коректну HTTP або HTTPS адресу.');
                return;
            }

            pl.url = url;

            if (!saveConfig()) return;

            notify('Адресу M3U збережено.');

            if (
                activeIPTVInstance &&
                typeof activeIPTVInstance.reloadPlaylist === 'function'
            ) {
                activeIPTVInstance.reloadPlaylist();
            }
        }

        if (Lampa.Input && typeof Lampa.Input.edit === 'function') {
            Lampa.Input.edit({
                title: 'Ввести адресу M3U-плейлиста',
                value: pl.url || '',
                free: true,
                nosave: true
            }, function (value) {
                saveUrl(value);
            });
        } else {
            notify('У цій збірці Lampa недоступне введення тексту.');
        }
    }

    function getSettingsInfo() {
        var pl = getPlaylist();

        return [
            'IPTV PRO 14.0.1 · XMLTV Edition',
            '',
            'Джерело EPG: ' + EPG_URL,
            'Плейлист: ' + (pl.name || 'Без назви'),
            'URL плейлиста: ' + (pl.url || 'Не задано'),
            '',
            'Стан EPG: ' + EPG.status,
            'Останній успіх: ' + formatDate(EPG.lastSuccess),
            'Період кешування: до ' + EPG_CACHE_HOURS + ' годин',
            'Інтервал автоматичного оновлення: 3 години'
        ].join('\n');
    }

    function updateMatchCounts() {
        var matched = 0;
        var unmatched = 0;

        if (!activeIPTVInstance || !activeIPTVInstance.getGroups) {
            EPG.matchedChannels = 0;
            EPG.unmatchedChannels = 0;
            return;
        }

        var groups = activeIPTVInstance.getGroups();

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

    function getDiagnosticsInfo() {
        updateMatchCounts();

        return [
            'IPTV PRO 14.0.1 — ДІАГНОСТИКА EPG',
            '',
            'Стан: ' + EPG.status,
            'Результат: ' + EPG.lastResult,
            'Режим запиту: ' + EPG.requestMode,
            'Каналів у M3U з tvg-id: ' + EPG.requestedChannelCount,
            'Розмір пакета: ' + BATCH_SIZE,
            'GET-fallback: вимкнено',
            'HTTP-статус: ' + (EPG.httpStatus || 'Немає відповіді'),
            'Остання спроба: ' + formatDate(EPG.lastAttempt),
            'Останній успіх: ' + formatDate(EPG.lastSuccess),
            'Тривалість: ' + durationText(EPG.lastDuration),
            'Каналів XMLTV: ' + EPG.channelCount,
            'Передач у розкладі: ' + EPG.programmeCount,
            'Каналів зіставлено: ' + EPG.matchedChannels,
            'Каналів без збігу: ' + EPG.unmatchedChannels,
            'Джерело даних: ' + EPG.cacheSource,
            'Кеш збережено: ' + formatDate(EPG.cacheSavedAt),
            'Вік даних: ' + (
                EPG.loaded
                    ? durationText(now() - EPG.loaded) + ' тому'
                    : 'Дані відсутні'
            ),
            '',
            'Помилка EPG:',
            EPG.error || 'Немає',
            '',
            'Примітка: повний текст може бути обмежений можливостями Noty.'
        ].join('\n');
    }

    function refreshFromSettings() {
        if (activeIPTVInstance && activeIPTVInstance.refresh) {
            activeIPTVInstance.refresh();
            return;
        }

        if (!EPG.playlistIds || !EPG.playlistIds.length) {
            notify(
                'Спочатку відкрий ТБ, щоб завантажити плейлист і tvg-id каналів.'
            );
            return;
        }

        if (EPG.loading) {
            EPG.refreshQueued = true;
            notify('Оновлення EPG вже виконується. Повторний запит поставлено в чергу.');
            return;
        }

        EPG.status = 'Запуск ручного оновлення...';
        EPG.error = '';

        notify('Запущено оновлення EPG.');

        epgLoad(function () {
            if (EPG.error) {
                notify('EPG: ' + EPG.error);
            } else {
                notify('EPG оновлено: ' + EPG.programmeCount + ' передач.');
            }
        }, true);
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
        var playlistGeneration = 0;

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
                if (toolbar) toolbar.find('.iptv-action').removeClass('active');

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
                    notify('EPG оновлено: ' + EPG.programmeCount + ' передач');
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
                box.append(item('IPTV PRO 14.0.1', 'iptv-panel-subtitle'));
                box.append(item('Джерело телепрограми', 'iptv-label'));
                box.append(item(EPG_URL, 'iptv-url'));

                var pl = getPlaylist();

                box.append(item('Поточний плейлист', 'iptv-label'));
                box.append(item(pl && pl.name ? pl.name : 'Без назви', 'iptv-value'));
                box.append(item(pl && pl.url ? pl.url : 'URL не задано', 'iptv-url'));

                box.append(button(
                    '✎ Змінити URL плейлиста M3U',
                    editPlaylistUrl,
                    'iptv-action-primary'
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
                    'Останнє успішне оновлення: ' + formatDate(EPG.lastSuccess),
                    'iptv-muted'
                ));

                box.append(button(
                    EPG.loading ? 'Оновлення виконується...' : '↻ Оновити телепрограму',
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
                    'Стан завантаження, кешу та зіставлення каналів',
                    'iptv-panel-subtitle'
                ));

                box.append(item('EPG: ' + EPG.status, 'iptv-status'));
                box.append(item('Режим запиту: ' + EPG.requestMode, 'iptv-value'));

                box.append(item(
                    'Каналів у M3U з tvg-id: ' + EPG.requestedChannelCount,
                    'iptv-value'
                ));

                box.append(item('GET-fallback: вимкнено', 'iptv-value'));

                box.append(item(
                    'HTTP-статус: ' + (EPG.httpStatus || 'Немає відповіді'),
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

                box.append(item('Результат: ' + EPG.lastResult, 'iptv-value'));
                box.append(item('Каналів XMLTV: ' + EPG.channelCount, 'iptv-value'));
                box.append(item('Передач у розкладі: ' + EPG.programmeCount, 'iptv-value'));
                box.append(item('Каналів зіставлено: ' + EPG.matchedChannels, 'iptv-value'));
                box.append(item('Каналів без збігу: ' + EPG.unmatchedChannels, 'iptv-value'));
                box.append(item('Джерело даних: ' + EPG.cacheSource, 'iptv-value'));
                box.append(item('Кеш збережено: ' + formatDate(EPG.cacheSavedAt), 'iptv-value'));

                box.append(item(
                    'Вік даних: ' + (
                        EPG.loaded
                            ? durationText(now() - EPG.loaded) + ' тому'
                            : 'Відсутні'
                    ),
                    'iptv-value'
                ));

                if (EPG.error) {
                    box.append(item('ПОДРОБИЦІ ПОМИЛКИ', 'iptv-error-title'));
                    box.append(item(EPG.error, 'iptv-error'));
                }

                if (loadError) {
                    box.append(item('ПОМИЛКА ПЛЕЙЛИСТА', 'iptv-error-title'));
                    box.append(item(loadError, 'iptv-error'));
                }

                box.append(button(
                    EPG.loading ? 'Оновлення виконується...' : '↻ Повторити перевірку EPG',
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
                box.append($('<img class="iptv-large-logo">').attr('src', c.logo));
            }

            box.append(item(c.name, 'iptv-heading'));

            var data = findPrograms(c);
            var p = data.current;
            var n = data.next;

            if (EPG.loading && !EPG.loaded) {
                box.append(item('Завантаження телепрограми...', 'iptv-muted'));
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
                box.append(item(clock(p.start) + ' – ' + clock(p.stop), 'iptv-muted'));

                var progress = $('<div class="iptv-progress"><div></div></div>');

                progress.children().css(
                    'width',
                    Math.min(100, Math.max(0,
                        (now() - p.start) / (p.stop - p.start) * 100
                    )) + '%'
                );

                box.append(progress);

                if (p.desc) {
                    box.append(item(p.desc, 'iptv-description'));
                }
            }

            if (n) {
                box.append(item('ДАЛІ В ЕФІРІ', 'iptv-blue'));
                box.append(item(n.title || 'Без назви', 'iptv-program'));
                box.append(item(clock(n.start) + ' – ' + clock(n.stop), 'iptv-muted'));
            }

            box.append(item('TVG-ID: ' + (c.tvg_id || 'не задано'), 'iptv-id'));
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
                    el.append($('<img class="iptv-logo">').attr('src', c.logo));
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
                colE.empty().append(item('У цій групі немає каналів', 'iptv-muted'));
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
            var source = String(body || '').replace(/^\uFEFF/, '').trim();

            if (
                !source ||
                (
                    !/^#EXTM3U\b/i.test(source) &&
                    !/^#EXTINF:/im.test(source)
                )
            ) {
                throw new Error(
                    'Сервер не повернув M3U. Перевір URL плейлиста та відповідь сервера.'
                );
            }

            var nextGroups = { '⭐ Обране': [] };
            var lines = source.split(/\r?\n/);
            var pending = null;
            var parsedCount = 0;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var comma = line.indexOf(',');

                    pending = {
                        name: comma >= 0
                            ? line.slice(comma + 1).trim()
                            : 'Без назви',
                        group: (line.match(/group-title="([^"]*)"/i) || [])[1] || 'ЗАГАЛЬНІ',
                        logo: (line.match(/tvg-logo="([^"]*)"/i) || [])[1] || '',
                        tvg_id: (line.match(/tvg-id="([^"]*)"/i) || [])[1] || ''
                    };
                } else if (pending && /^https?:\/\//i.test(line)) {
                    pending.url = line;

                    if (!nextGroups[pending.group]) {
                        nextGroups[pending.group] = [];
                    }

                    nextGroups[pending.group].push(pending);
                    parsedCount++;
                    pending = null;
                }
            }

            if (!parsedCount) {
                throw new Error(
                    'M3U отримано, але жодного каналу не знайдено. Перевір формат плейлиста.'
                );
            }

            var fav = {};

            cfg.favorites.forEach(function (f) {
                if (f && f.url) fav[f.url] = true;
            });

            Object.keys(nextGroups).forEach(function (g) {
                if (g === '⭐ Обране') return;

                nextGroups[g].forEach(function (c) {
                    if (fav[c.url]) nextGroups['⭐ Обране'].push(c);
                });
            });

            var ids = [];

            Object.keys(nextGroups).forEach(function (g) {
                if (g === '⭐ Обране') return;

                nextGroups[g].forEach(function (c) {
                    if (c.tvg_id) ids.push(c.tvg_id);
                });
            });

            var newIds = uniqueIds(ids);
            var pl = getPlaylist();
            var newSignature = makePlaylistSignature(newIds, pl && pl.url);
            var oldSignature = EPG.playlistSignature;
            var changedPlaylist = newSignature !== oldSignature;

            if (changedPlaylist || EPG.loading || EPG.request) {
                cancelEPGLoad('зміна або повторне завантаження плейлиста');
            }

            groups = nextGroups;
            EPG.playlistIds = newIds;
            EPG.playlistSignature = newSignature;

            clearLoadedEPG();

            restoreEPGCache(
                newSignature,
                makeLegacySignature(newIds, pl && pl.url)
            );

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
                    console.warn(logPrefix(), 'EPG:', EPG.status, EPG.error);
                }
            });
        }

        /*
         * ЗАВАНТАЖЕННЯ ПЛЕЙЛИСТА
         */

        function load() {
            var pl = getPlaylist();
            var requestGeneration = ++playlistGeneration;

            loadError = '';

            if (!pl || !pl.url) {
                loadError = 'URL плейлиста не задано';

                colG.empty().append(item(loadError, 'iptv-error'));
                return;
            }

            colG.empty().append(item('Завантаження плейлиста...', 'iptv-muted'));

            plRequest = $.ajax({
                url: pl.url,
                dataType: 'text',
                timeout: 30000,
                cache: false,

                success: function (data) {
                    if (!alive || requestGeneration !== playlistGeneration) return;

                    loadError = '';

                    try {
                        parse(data);

                        if (panelMode) renderPanel();
                    } catch (e) {
                        loadError = String(e.message || e);

                        groups = {};
                        names = [];
                        list = [];
                        chosen = null;

                        colG.empty().append(
                            item('Помилка формату плейлиста', 'iptv-error')
                        );

                        colC.empty();
                        colE.empty().append(item(loadError, 'iptv-error'));

                        notify('Не вдалося прочитати M3U-плейлист.');
                        console.error(logPrefix(), 'M3U parse error:', e);

                        if (panelMode) renderPanel();
                    }
                },

                error: function (xhr, status, err) {
                    if (
                        !alive ||
                        requestGeneration !== playlistGeneration ||
                        status === 'abort'
                    ) {
                        return;
                    }

                    loadError =
                        'Запит: ' + status +
                        (err ? ' / ' + err : '') +
                        ' (HTTP ' + (xhr.status || 0) + ')';

                    colG.empty().append(
                        item('Помилка завантаження плейлиста', 'iptv-error')
                    );

                    colC.empty();
                    colE.empty().append(item(loadError, 'iptv-error'));

                    notify('Не вдалося завантажити IPTV плейлист');

                    console.error(logPrefix(), 'Playlist error:', loadError);

                    if (panelMode) renderPanel();
                },

                complete: function () {
                    if (requestGeneration === playlistGeneration) {
                        plRequest = null;
                    }
                }
            });
        }

        function reloadPlaylist() {
            if (!alive) return;

            playlistGeneration++;

            if (plRequest && plRequest.readyState !== 4) {
                try {
                    plRequest.abort();
                } catch (e) {}
            }

            plRequest = null;

            cancelEPGLoad('перезавантаження плейлиста');

            if (colG) colG.empty();
            if (colC) colC.empty();
            if (colE) colE.empty();

            chosen = null;
            groups = {};
            names = [];
            list = [];
            loadError = '';

            load();
        }

        /*
         * СТИЛІ ОСНОВНОГО IPTV
         */

        function buildStyles() {
            if ($('#iptv-pro-140-css').length) return;

            $('head').append(
                '<style id="iptv-pro-140-css">' +
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
                '.iptv-error{color:#ffd0cb;background:#341e23;border:1px solid #643039;border-radius:.5rem;padding:.7rem;margin:.25rem 0;overflow-wrap:anywhere;word-break:break-word}' +
                '@media(max-width:900px){.iptv-toolbar{flex-wrap:wrap;padding:.6rem}.iptv-brand{width:100%}.iptv-action{font-size:.8rem;padding:.55rem}.iptv-groups{width:27%}.iptv-channels{width:43%}.iptv-info{width:30%;padding:.7rem}.iptv-item{padding:.65rem;margin:.25rem;font-size:.85rem}.iptv-logo{width:30px;height:30px}}' +
                '</style>'
            );
        }

        /*
         * ПАНЕЛЬ КЕРУВАННЯ
         */

        function buildToolbar() {
            toolbar = $('<div class="iptv-toolbar"></div>');

            toolbar.append(
                '<div class="iptv-brand">ТБ<small>ТЕЛЕПРОГРАМА · XMLTV</small></div>'
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
                refresh: refreshEPG,
                reloadPlaylist: reloadPlaylist,
                getGroups: function () {
                    return groups;
                }
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

                        if (ci >= buttons.length) ci = buttons.length - 1;

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
                        ti = Math.min(toolbarActions.length - 1, ti + 1);
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
                    } else if (active === 'channels' || active === 'toolbar') {
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
            playlistGeneration++;

            if (activeIPTVInstance) {
                activeIPTVInstance = null;
            }

            if (timer) {
                clearInterval(timer);
                timer = null;
            }

            if (plRequest && plRequest.readyState !== 4) {
                try {
                    plRequest.abort();
                } catch (e) {}
            }

            plRequest = null;

            cancelEPGLoad('компонент знищено');

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
     * СИСТЕМНІ НАЛАШТУВАННЯ IPTV
     */

    function openIPTVSettingsPanel(mode) {
        if (mode === 'open') {
            Lampa.Activity.push({
                title: 'ТБ',
                component: 'iptv_pro'
            });

            return;
        }

        if (mode === 'refresh') {
            refreshFromSettings();
            return;
        }

        if (mode === 'diagnostics') {
            notify(getDiagnosticsInfo());
            return;
        }

        if (mode === 'settings') {
            notify(getSettingsInfo());
            return;
        }

        if (mode === 'edit_playlist') {
            editPlaylistUrl();
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
            console.warn(logPrefix(), 'SettingsApi недоступний');
            return;
        }

        Lampa.SettingsApi.addComponent({
            component: 'iptv_pro_settings',
            name: 'IPTV PRO',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 6h16v12H4zM2 4v16h20V4zm8 4 6 4-6 4z"/></svg>'
        });

        if (!Lampa.SettingsApi.addParam) {
            console.warn(logPrefix(), 'SettingsApi.addParam недоступний');
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
            'iptv_pro_playlist_edit',
            'Змінити URL плейлиста M3U',
            function () {
                openIPTVSettingsPanel('edit_playlist');
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
                var pl = getPlaylist();

                notify(
                    'Плейлист: ' +
                    (pl && pl.name ? pl.name : 'Без назви') +
                    '. Каналів із tvg-id: ' + EPG.playlistIds.length
                );
            }
        );

        console.log(logPrefix(), 'Системні параметри зареєстровано');
    }

    /*
     * ІНІЦІАЛІЗАЦІЯ
     */

    function init() {
        // Захист від повторного запуску — перевіряємо і ставимо прапорець на самому початку
        if (window.__iptv_pro_140_initialized) return;
        window.__iptv_pro_140_initialized = true;

        var menu = $('.menu .menu__list');

        if (!menu.length) {
            console.warn(logPrefix(), 'Меню Lampa ще не готове');
            return;
        }

        // Перевіряємо, чи пункт меню вже існує в DOM, щоб уникнути будь-яких дублікатів
        if (menu.find('.iptv-pro-menu').length > 0) return;

        Lampa.Component.add('iptv_pro', IPTVComponent);

        // Відновлюємо системні налаштування IPTV PRO.
        registerIPTVSettings();

        // Створюємо єдиний пункт «ТБ» з унікальним класом iptv-pro-menu
        var entry = $(
            '<li class="menu__item selector iptv-pro-menu">' +
                '<div class="menu__ico">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
                        'width="24" height="24" fill="none" stroke="currentColor" ' +
                        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
                        '<rect x="3" y="7" width="18" height="13" rx="2"/>' +
                        '<path d="M8 3l4 4 4-4"/>' +
                        '<path d="M10 11l5 3-5 3z" fill="currentColor" stroke="none"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">ТБ</div>' +
            '</li>'
        );

        entry.on('hover:enter click', function () {
            Lampa.Activity.push({
                title: 'ТБ',
                component: 'iptv_pro'
            });
        });

        menu.append(entry);

        console.log(logPrefix(), 'Ініціалізовано');
    }

    function waitForInit() {
        if (window.app_ready || window.appready) {
            init();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') init();
            });
        }
    }

    waitForInit();

})();
