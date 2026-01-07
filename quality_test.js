// ==LampaPlugin==
// @name         MAXSM Quality Ratings
// @version      2.0.0
// @description  Відображає найкращу доступну якість (4K DV, 4K HDR, FHD) на картках фільмів та серіалів, використовуючи JacRed API.
// @author       MAXSM / Gemini
// ==/LampaPlugin==

(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    var Config = {
        // Загальні
        Q_LOGGING: true,
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',
        CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // Раз на 24 години

        // JacRed API
        JACRED_PROTOCOL: 'http://',
        JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',

        // Мережа та Проксі
        PROXY_TIMEOUT: 7000, // Збільшено таймаут для стабільності
        // Залишаємо один найнадійніший проксі (або використовуємо прямий доступ, якщо Lampa підтримує)
        PROXY_LIST: [
            'http://cors.bwa.workers.dev/' 
        ],
        MAX_CONCURRENT_REQUESTS: 3,
        RETRY_ATTEMPTS: 2, // Зменшено кількість спроб, оскільки з'єднання часто відмовляє
        RETRY_DELAY: 2000, // Збільшено затримку для експоненційного backoff
        BATCH_SIZE: 5,

        // Кешування TTL (в мс)
        TTL: {
            quality: 24 * 60 * 60 * 1000, // 24 години для знайденої якості
            error: 10 * 60 * 1000,        // 10 хвилин для помилок (щоб не бомбардувати API)
            no_quality: 3 * 60 * 60 * 1000   // 3 години для відсутності якості (щоб спробувати пізніше)
        }
    };

    // =======================================================
    // II. МОДУЛЬ УТИЛІТ
    // =======================================================
    var Utils = {
        debounce: function(func, wait) {
            var timeout;
            return function executedFunction() {
                var context = this;
                var args = arguments;
                var later = function() {
                    clearTimeout(timeout);
                    func.apply(context, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        escapeHtml: function(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        logWithContext: function(level, message, context) {
            if (!Config.Q_LOGGING) return;

            var logEntry = {
                timestamp: new Date().toISOString(),
                level: level,
                message: message,
                context: context || {}
            };

            // Використовуємо console[level] для коректного відображення в консолі
            (console[level] || console.log)('[MAXSM-RATINGS] ' + message, logEntry);
        },

        // ... (performance та stats залишилися) ...
        performance: {
            timers: {},
            start: function(name) { this.timers[name] = performance.now(); },
            end: function(name) {
                if (this.timers[name]) {
                    var duration = performance.now() - this.timers[name];
                    Utils.logWithContext('log', 'Performance: ' + name, { duration: duration.toFixed(2) + 'ms' });
                    delete this.timers[name];
                    return duration;
                }
            }
        },

        stats: {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            increment: function(type) { this[type] = (this[type] || 0) + 1; },
            getStats: function() {
                return {
                    requests: this.requests,
                    cacheHits: this.cacheHits,
                    errors: this.errors,
                    cacheHitRate: this.requests > 0 ? (this.cacheHits / this.requests * 100).toFixed(2) + '%' : '0%'
                };
            }
        }
    };

    // =======================================================
    // III. МОДУЛЬ API (Оптимізований механізм Retry/Proxy)
    // =======================================================
    var API = {
        activeRequests: 0,
        requestQueue: [],

        processQueue: function() {
            if (this.activeRequests >= Config.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {
                return;
            }

            this.activeRequests++;
            var request = this.requestQueue.shift();

            // Використовуємо fetchWithProxyRetry, який містить експоненційний backoff
            this.fetchWithProxyRetry(request.url, request.cardId, function(error, responseText) {
                API.activeRequests--;
                request.callback(error, responseText);
                API.processQueue();
            });
        },

        queueRequest: function(url, cardId, callback) {
            this.requestQueue.push({ url: url, cardId: cardId, callback: callback });
            this.processQueue();
        },

        fetchWithProxyRetry: function(url, cardId, callback, retries, attempt) {
            attempt = attempt || 1;
            retries = retries === undefined ? Config.RETRY_ATTEMPTS : retries;

            this.fetchWithProxy(url, cardId, function(error, responseText) {
                if (error && retries > 0) {
                    var delay = Config.RETRY_DELAY * Math.pow(2, attempt - 1); // Експоненційний backoff
                    Utils.logWithContext('log', 'Retrying request... attempt ' + attempt + '/' + Config.RETRY_ATTEMPTS, {
                        url: url,
                        cardId: cardId,
                        delay: delay
                    });

                    setTimeout(function() {
                        API.fetchWithProxyRetry(url, cardId, callback, retries - 1, attempt + 1);
                    }, delay);
                } else {
                    callback(error, responseText);
                }
            });
        },

        fetchWithProxy: function(url, cardId, callback) {
            // Використовуємо тільки перший проксі, вся логіка retry та failover на рівні fetchWithProxyRetry
            if (Config.PROXY_LIST.length === 0) {
                callback(new Error('No proxies configured.'));
                return;
            }

            var proxyUrl = Config.PROXY_LIST[0] + encodeURIComponent(url);
            if (Config.Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", Fetch with primary proxy: " + proxyUrl);

            var callbackCalled = false;

            var timeoutId = setTimeout(function() {
                if (!callbackCalled) {
                    callbackCalled = true;
                    Utils.logWithContext('warn', 'Proxy timeout reached', { proxy: Config.PROXY_LIST[0], url: url, timeout: Config.PROXY_TIMEOUT });
                    callback(new Error('Proxy timeout reached'));
                }
            }, Config.PROXY_TIMEOUT);

            fetch(proxyUrl)
                .then(function(response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error('Proxy error: ' + response.status);
                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        callback(null, data);
                    }
                })
                .catch(function(error) {
                    Utils.logWithContext('error', "Proxy fetch error", { cardId: cardId, proxyUrl: proxyUrl, error: error });
                    clearTimeout(timeoutId);
                    if (!callbackCalled) {
                        callbackCalled = true;
                        callback(error); // Повертаємо помилку для механізму retry
                    }
                });
        }
    };

    // =======================================================
    // IV. МОДУЛЬ КАШУВАННЯ
    // =======================================================
    var Cache = {
        get: function(key) {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var item = cache[key];
                if (!item) return null;

                var now = Date.now();
                var ttl = Config.TTL[item.type] || Config.TTL.quality;

                if (now - item.timestamp < ttl) {
                    Utils.stats.increment('cacheHits');
                    return item;
                } else {
                    delete cache[key];
                    Lampa.Storage.set(Config.QUALITY_CACHE, cache);
                }
            } catch (error) {
                Utils.logWithContext('error', 'Cache read error, storage may be full.', { key: key, error: error });
            }
            return null;
        },

        set: function(key, data, type) {
            type = type || 'quality';
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                
                // Якщо помилка, використовуємо спеціальний тип для короткого TTL
                var cacheType = data.error ? 'error' : (data.quality ? type : 'no_quality');

                cache[key] = {
                    quality: data.quality || null,
                    error: data.error || null,
                    timestamp: Date.now(),
                    type: cacheType
                };
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (error) {
                Utils.logWithContext('error', 'Cache write error, storage may be full.', { key: key, error: error });
            }
        },

        cleanup: function() {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var now = Date.now();
                var cleanedCache = {};
                var cleaned = 0;

                for (var key in cache) {
                    if (cache.hasOwnProperty(key)) {
                        var item = cache[key];
                        var ttl = Config.TTL[item.type] || Config.TTL.quality;

                        if (now - item.timestamp < ttl) {
                            cleanedCache[key] = item;
                        } else {
                            cleaned++;
                        }
                    }
                    if (Object.keys(cleanedCache).length > 2000) break; // Обмеження для запобігання переповнення
                }

                if (cleaned > 0 && Config.Q_LOGGING) {
                    Utils.logWithContext('log', 'Cleaned expired cache entries', { count: cleaned });
                }

                Lampa.Storage.set(Config.QUALITY_CACHE, cleanedCache);
                return cleanedCache;
            } catch (error) {
                Utils.logWithContext('error', 'Cache cleanup error', { error: error });
                return {};
            }
        }
    };

    // =======================================================
    // V. МОДУЛЬ ВИЗНАЧЕННЯ ЯКОСТІ (Залишаємо логіку)
    // =======================================================
    var QualityDetector = {
        detectQuality: function(torrentTitle) {
            if (!torrentTitle) return null;

            var title = torrentTitle.toLowerCase();

            if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';
            if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr|3840x2160.*hdr)\b/i.test(title)) return '4K HDR';

            if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160|4k\s*uhd|uhd\s*4k)\b/i.test(title)) return '4K';
            if (/\b(web-dl|webdl|webrip|web-rip|bluray|bdrip|brrip|1080p)\b/i.test(title)) return 'FHD';
            if (/\b(hdr|hdr10|high\s*dynamic\s*range|hdr\s*10|dolby\s*hdr)\b/i.test(title)) return 'HDR';
            if (/\b(hd|720p|1280x720|hdtv|hdrip|hd-rip)\b/i.test(title)) return 'HD';
            if (/\b(sd|480p|854x480|dvd|dvdrip|dvdscr|ts|telesync|cam|camrip)\b/i.test(title)) return 'SD';

            return null;
        },

        getBestQuality: function(qualities) {
            var priority = ['4K DV', '4K HDR', '4K', 'FHD', 'HDR', 'HD', 'SD'];

            return qualities.reduce(function(best, current) {
                if (!current) return best;
                if (!best) return current;

                var bestIndex = priority.indexOf(best);
                var currentIndex = priority.indexOf(current);

                return currentIndex < bestIndex && currentIndex !== -1 ? current : best;
            }, null);
        }
    };

    // =======================================================
    // VI. МОДУЛЬ UI (Залишаємо логіку)
    // =======================================================
    var UI = {
        initStyles: function() {
            var styleElement = document.createElement('style');
            styleElement.id = 'maxsm_ratings_quality';
            styleElement.textContent = `
        .card__view {position: relative !important;}
        .card__quality {
            position: absolute !important;
            bottom: 0.1em !important;
            left: -0.5em !important;
            background-color: transparent !important;
            z-index: 10;
            width: fit-content !important;
            min-width: 3.5em !important;
            max-width: calc(100% - 1em) !important;
        }
        .card__quality div {
            text-transform: none !important;
            border: 2px solid #FFFFFF !important;
            color: #FFFFFF !important;
            font-weight: bold !important;
            font-style: normal !important;
            font-size: 1.2em !important;
            border-radius: 3px !important;
            padding: 0.2em 0.4em !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .card__quality div:hover {
            transform: scale(1.1) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.7) !important;
        }

        /* Градієнтні схеми для потрібних якостей */
        .card__quality div[data-quality*="4K"][data-quality*="DV"] {
            border-color: #8A2BE2 !important;
            background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 50%, #6A0DAD 100%) !important;
        }
        .card__quality div[data-quality*="4K"][data-quality*="HDR"] {
            border-color: #FF8C00 !important;
            background: linear-gradient(135deg, #FFA500 0%, #FF8C00 50%, #FF6347 100%) !important;
        }
        .card__quality div[data-quality*="4K"] {
            border-color: #8B0000 !important;
            background: linear-gradient(135deg, #8B0000 0%, #660000 50%, #4D0000 100%) !important;
        }
        .card__quality div[data-quality*="HDR"] {
            border-color: #006400 !important;
            background: linear-gradient(135deg, #006400 0%, #228B22 50%, #2E7D32 100%) !important;
        }
        .card__quality div[data-quality*="FHD"] {
             border-color: #4169E1 !important;
             background: linear-gradient(135deg, #4169E1 0%, #1E90FF 50%, #000080 100%) !important;
        }
        .card__quality div[data-quality*="HD"] {
            border-color: #4169E1 !important;
            background: linear-gradient(135deg, #4169E1 0%, #1E90FF 50%, #000080 100%) !important;
        }
        .card__quality div[data-quality*="SD"] {
            border-color: #8B4513 !important;
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #654321 100%) !important;
        }

        /* Адаптивність для різних розмірів екрану */
        @media (max-width: 768px) {
            .card__quality div {
                font-size: 1.2em !important;
                padding: 0.25em 0.45em !important;
            }
        }
        `;
            document.head.appendChild(styleElement);
        },

        addQualityBadge: function(card, quality) {
            if (!document.body.contains(card)) return;

            card.setAttribute('data-quality-added', 'true');
            var cardView = card.querySelector('.card__view');
            if (!cardView) return;

            var existingQualityElements = cardView.getElementsByClassName('card__quality');
            while(existingQualityElements.length > 0) {
                existingQualityElements[0].parentNode.removeChild(existingQualityElements[0]);
            }

            if (quality && quality !== 'NO') {
                var qualityDiv = document.createElement('div');
                qualityDiv.className = 'card__quality';
                var qualityInner = document.createElement('div');
                qualityInner.textContent = Utils.escapeHtml(quality);
                qualityInner.setAttribute('data-quality', quality); 
                cardView.appendChild(qualityDiv).appendChild(qualityInner);
            }
        }
    };

    // =======================================================
    // VII. ОСНОВНІ ФУНКЦІЇ
    // =======================================================

    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return card.name || card.original_name ? 'tv' : 'movie';
    }

    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        if (!Config.JACRED_URL) {
            Utils.logWithContext('log', 'JacRed: JACRED_URL is not set', { cardId: cardId });
            callback(null);
            return;
        }

        function translateQuality(quality, hasDolbyVision, hasHDR) {
            if (typeof quality !== 'number') return null;

            var qualityLabel = '';
            if (quality >= 2160) {
                qualityLabel = '4K';
                if (hasDolbyVision) {
                    qualityLabel += ' DV';
                } else if (hasHDR) {
                    qualityLabel += ' HDR';
                }
            }
            else if (quality >= 1080) return 'FHD';
            else if (quality >= 720) return 'HD';
            else if (quality > 0) return 'SD';
            else return null;

            return qualityLabel;
        }

        var year = '';
        var dateStr = normalizedCard.release_date || '';
        if (dateStr.length >= 4) {
            year = dateStr.substring(0, 4);
        }

        function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {
            var userId = Lampa.Storage.get('lampac_unic_id', '');
            var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +
                encodeURIComponent(searchTitle) +
                (searchYear ? '&year=' + searchYear : '') + // Не передаємо рік, якщо він пустий
                (exactMatch ? '&exact=true' : '') +
                '&uid=' + userId;

            Utils.performance.start('jacred_api_' + cardId + '_' + strategyName);

            API.queueRequest(apiUrl, cardId, function(error, responseText) {
                Utils.performance.end('jacred_api_' + cardId + '_' + strategyName);
                Utils.stats.increment('requests');

                if (error) {
                    Utils.stats.increment('errors');
                    Utils.logWithContext('error', 'JacRed: ' + strategyName + ' request failed', { error: error.message, cardId: cardId });
                    apiCallback(null, true); // true = помилка
                    return;
                }
                if (!responseText) {
                    apiCallback(null);
                    return;
                }

                try {
                    var torrents = JSON.parse(responseText);
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        apiCallback(null);
                        return;
                    }

                    // Логіка оцінки (score)
                    var scoredTorrents = torrents.map(function(torrent) {
                        var score = 0;
                        var lowerTitle = (torrent.title || '').toLowerCase();

                        if (typeof torrent.quality === 'number') {
                            score += torrent.quality / 1000;
                        }

                        if (/\b(dv|dolby\s*vision)\b/i.test(lowerTitle)) { score += 500; }
                        if (/\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(lowerTitle)) { score += 300; }
                        if (torrent.size) { score += Math.min(torrent.size / (1024 * 1024 * 1024), 5); }
                        if (/\b(ts|telesync|camrip|cam)\b/i.test(lowerTitle)) { score -= 200; }

                        return { torrent: torrent, score: score };
                    });

                    scoredTorrents.sort(function(a, b) { return b.score - a.score; });

                    var bestTorrent = scoredTorrents[0] ? scoredTorrents[0].torrent : null;

                    if (bestTorrent) {
                        var hasDolbyVision = /\b(dv|dolby\s*vision)\b/i.test(bestTorrent.title.toLowerCase());
                        var hasHDR = /\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(bestTorrent.title.toLowerCase());

                        apiCallback({
                            quality: translateQuality(bestTorrent.quality, hasDolbyVision, hasHDR),
                            score: scoredTorrents[0].score
                        });
                    } else {
                        apiCallback(null);
                    }
                } catch (e) {
                    Utils.stats.increment('errors');
                    Utils.logWithContext('error', 'Error parsing response', { error: e.message, cardId: cardId });
                    apiCallback(null, true); // true = помилка
                }
            });
        }

        // --- Стратегії пошуку (з покращеним фолбеком) ---
        var searchStrategies = [];

        // 1. Оригінальна назва + Рік (Точно)
        if (normalizedCard.original_title && year) {
            searchStrategies.push({ title: normalizedCard.original_title.trim(), year: year, exact: true, name: "OriginalTitle Exact Year" });
        }
        // 2. Локалізована назва + Рік (Точно)
        if (normalizedCard.title && year) {
            searchStrategies.push({ title: normalizedCard.title.trim(), year: year, exact: true, name: "Title Exact Year" });
        }
        // 3. Оригінальна назва (Без року, не точно)
        if (normalizedCard.original_title) {
            searchStrategies.push({ title: normalizedCard.original_title.trim(), year: '', exact: false, name: "OriginalTitle Loose No Year" });
        }
        // 4. Локалізована назва (Без року, не точно)
        if (normalizedCard.title) {
            searchStrategies.push({ title: normalizedCard.title.trim(), year: '', exact: false, name: "Title Loose No Year" });
        }
        
        // Виконання стратегій
        function executeNextStrategy(index) {
            if (index >= searchStrategies.length) {
                Utils.logWithContext('log', 'All search strategies failed', { cardId: cardId });
                callback(null);
                return;
            }
            var strategy = searchStrategies[index];
            Utils.logWithContext('log', 'Trying strategy', { strategy: strategy.name, cardId: cardId });

            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result, isError) {
                if (isError) {
                    callback(null, true); // Помилка, вихід
                    return;
                }
                
                if (result !== null && result.quality !== null) { 
                    Utils.logWithContext('log', 'Successfully found quality', { quality: result.quality, cardId: cardId });
                    callback(result);
                } else {
                    executeNextStrategy(index + 1); // Спроба наступної стратегії
                }
            });
        }

        if (searchStrategies.length > 0) {
            executeNextStrategy(0);
        } else {
            callback(null);
        }
    }

    function updateCards(cards) {
        Utils.performance.start('update_cards_batch');

        for (var i = 0; i < cards.length; i += Config.BATCH_SIZE) {
            var batch = cards.slice(i, i + Config.BATCH_SIZE);

            batch.forEach(function(card) {
                if (card.hasAttribute('data-quality-added')) return;
                
                // Перевірка налаштувань відображення
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false') {
                    if (card.querySelector('.card__view .card__type')) return;
                }

                (function (currentCard) {
                    var data = currentCard.card_data;
                    if (!data) return;

                    var normalizedCard = {
                        id: data.id || '',
                        title: data.title || data.name || '',
                        original_title: data.original_title || data.original_name || '',
                        release_date: data.release_date || data.first_air_date || '',
                        type: getCardType(data)
                    };

                    var localCurrentCard = normalizedCard.id;
                    var qCacheKey = normalizedCard.type + '_' + normalizedCard.id;
                    var cacheQualityData = Cache.get(qCacheKey);
                    
                    if (cacheQualityData) {
                        UI.addQualityBadge(currentCard, cacheQualityData.quality);
                        return;
                    }
                    
                    // Якщо кешу немає або він застарів, додаємо тимчасовий індикатор
                    UI.addQualityBadge(currentCard, '...'); 
                    
                    getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult, isError) {
                        var quality = (jrResult && jrResult.quality) || null;
                        
                        // Зберігаємо в кеш
                        if (isError) {
                            Cache.set(qCacheKey, { quality: null, error: true });
                        } else if (quality) {
                            Cache.set(qCacheKey, { quality: quality });
                        } else {
                            Cache.set(qCacheKey, { quality: null });
                        }

                        UI.addQualityBadge(currentCard, quality);
                    });
                })(card);
            });
        }

        Utils.performance.end('update_cards_batch');
        if (Config.Q_LOGGING) {
            console.log('MAXSM-RATINGS Stats:', Utils.stats.getStats());
        }
    }

    // =======================================================
    // VIII. OBSERVER ТА ІНІЦІАЛІЗАЦІЯ
    // =======================================================
    var debouncedUpdateCards = Utils.debounce(updateCards, 300);

    var observer = new MutationObserver(function (mutations) {
        var newCards = [];
        for (var m = 0; m < mutations.length; m++) {
            var mutation = mutations[m];
            if (mutation.addedNodes) {
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    
                    if (node.classList && node.classList.contains('card')) {
                        newCards.push(node);
                    }

                    var nestedCards = node.querySelectorAll('.card');
                    for (var k = 0; k < nestedCards.length; k++) {
                        newCards.push(nestedCards[k]);
                    }
                }
            }
        }
        if (newCards.length) debouncedUpdateCards(newCards);
    });
    
    // Планувальник очищення кешу
    var cleanupIntervalId = null;

    function startPlugin() {
        console.log("MAXSM-RATINGS-QUALITY", "Plugin v2.0.0 Initialized.");

        // Ініціалізація стилів
        UI.initStyles();

        // Ініціалізація налаштувань за замовчуванням
        if (localStorage.getItem('maxsm_ratings_quality') === null) {
            localStorage.setItem('maxsm_ratings_quality', 'true');
        }
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === null) {
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');
        }
        if (localStorage.getItem('maxsm_ratings_quality_tv') === null) {
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');
        }

        // Запуск observer якщо увімкнено відображення якості в списках
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
            observer.observe(document.body, { childList: true, subtree: true });

            var existingCards = document.querySelectorAll('.card');
            if (existingCards.length) {
                Utils.logWithContext('log', 'Processing existing cards', { count: existingCards.length });
                updateCards(existingCards);
            }
        }
        
        // Асинхронне очищення кешу
        Cache.cleanup();
        cleanupIntervalId = setInterval(Cache.cleanup, Config.CLEANUP_INTERVAL);
    }
    
    function stopPlugin() {
        if (cleanupIntervalId) clearInterval(cleanupIntervalId);
        observer.disconnect();
        var style = document.getElementById('maxsm_ratings_quality');
        if (style) style.remove();
        console.log("MAXSM-RATINGS-QUALITY", "Plugin stopped.");
    }

    // Реєстрація в Лампі
    if (window.Lampa && Lampa.Plugin && Lampa.Plugin.create) {
        Lampa.Plugin.create({
            title: 'MAXSM Quality Ratings',
            description: 'Відображає найкращу доступну якість (4K DV, 4K HDR, FHD) на картках фільмів та серіалів.',
            version: '2.0.0',
            author: 'MAXSM / Gemini',
            onLoad: startPlugin,
            onDestroy: stopPlugin
        });
    } else {
        // Фолбек для старіших версій Lampa
        var t = setInterval(function(){
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                clearInterval(t);
                startPlugin();
            }
        }, 200);
        setTimeout(function(){ clearInterval(t); }, 15000);
    }
})();
