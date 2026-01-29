(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    var Config = {
        // Загальні
        Q_LOGGING: true,
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',

        // JacRed API
        JACRED_PROTOCOL: 'http://',
        JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',

        // Шлях до іконок
        ICONS_PATH: 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/Quality_ico/',
        ICONS_MAP: {
            '4K DV': 'Dolby Vision.svg',
            '4K HDR': 'HDR.svg',
            '4K': '4K.svg',
            'FHD': 'FULL HD.svg',
            'HD': 'HD.svg',
            'SD': 'HD.svg'
        },

        // Мережа та Проксі
        PROXY_TIMEOUT: 5000,
        PROXY_LIST: [
            'http://api.allorigins.win/raw?url=',
            'http://cors.bwa.workers.dev/'
        ],
        MAX_CONCURRENT_REQUESTS: 3,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        BATCH_SIZE: 5,

        // Кешування TTL (в мс)
        TTL: {
            quality: 24 * 60 * 60 * 1000, // 24 години
            error: 5 * 60 * 1000,        // 5 хвилин для помилок
            no_quality: 60 * 60 * 1000   // 1 година для відсутності якості
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
            console[level]('[MAXSM-RATINGS] ' + message, logEntry);
        },

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
            requests: 0, cacheHits: 0, errors: 0,
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
    // III. МОДУЛЬ API
    // =======================================================
    var API = {
        activeRequests: 0,
        requestQueue: [],

        processQueue: function() {
            if (this.activeRequests >= Config.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) return;
            this.activeRequests++;
            var request = this.requestQueue.shift();
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
            retries = retries || Config.RETRY_ATTEMPTS;
            this.fetchWithProxy(url, cardId, function(error, responseText) {
                if (error && retries > 0) {
                    var delay = Config.RETRY_DELAY * Math.pow(2, attempt - 1);
                    setTimeout(function() {
                        API.fetchWithProxyRetry(url, cardId, callback, retries - 1, attempt + 1);
                    }, delay);
                } else callback(error, responseText);
            });
        },

        fetchWithProxy: function(url, cardId, callback) {
            var currentProxyIndex = 0;
            var callbackCalled = false;
            function tryNextProxy() {
                if (currentProxyIndex >= Config.PROXY_LIST.length) {
                    if (!callbackCalled) { callbackCalled = true; callback(new Error('All proxies failed')); }
                    return;
                }
                var proxyUrl = Config.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
                var timeoutId = setTimeout(function() {
                    if (!callbackCalled) { currentProxyIndex++; tryNextProxy(); }
                }, Config.PROXY_TIMEOUT);
                fetch(proxyUrl)
                    .then(function(res) { if (!res.ok) throw new Error(); return res.text(); })
                    .then(function(data) {
                        if (!callbackCalled) { callbackCalled = true; clearTimeout(timeoutId); callback(null, data); }
                    })
                    .catch(function() {
                        clearTimeout(timeoutId);
                        if (!callbackCalled) { currentProxyIndex++; tryNextProxy(); }
                    });
            }
            tryNextProxy();
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
                var ttl = Config.TTL[item.type] || Config.TTL.quality;
                if (Date.now() - item.timestamp < ttl) {
                    Utils.stats.increment('cacheHits');
                    return item;
                }
                delete cache[key];
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (error) { Utils.logWithContext('error', 'Cache read error', error); }
            return null;
        },
        set: function(key, data, type) {
            type = type || 'quality';
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                cache[key] = { quality: data.quality || null, timestamp: Date.now(), type: type };
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (error) { Utils.logWithContext('error', 'Cache write error', error); }
        },
        cleanup: function() {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var now = Date.now();
                var cleanedCache = {};
                for (var key in cache) {
                    if (cache.hasOwnProperty(key)) {
                        var item = cache[key];
                        var ttl = Config.TTL[item.type] || Config.TTL.quality;
                        if (now - item.timestamp < ttl) cleanedCache[key] = item;
                    }
                }
                Lampa.Storage.set(Config.QUALITY_CACHE, cleanedCache);
            } catch (error) { Utils.logWithContext('error', 'Cache cleanup error', error); }
        }
    };

    // =======================================================
    // V. МОДУЛЬ ВИЗНАЧЕННЯ ЯКОСТІ
    // =======================================================
    var QualityDetector = {
        detectQuality: function(torrentTitle) {
            if (!torrentTitle) return null;
            var title = torrentTitle.toLowerCase();
            if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';
            if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr|3840x2160.*hdr)\b/i.test(title)) return '4K HDR';
            if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160|4k\s*uhd|uhd\s*4k)\b/i.test(title)) return '4K';
            if (/\b(web-dl|webdl|webrip|web-rip|bluray|bdrip|brrip)\b/i.test(title)) return 'FHD';
            if (/\b(hd|720p|1280x720|hdtv|hdrip|hd-rip)\b/i.test(title)) return 'HD';
            return 'SD';
        }
    };

    // =======================================================
    // VI. МОДУЛЬ UI (З ІКОНКАМИ)
    // =======================================================
    var UI = {
        initStyles: function() {
            var styleElement = document.createElement('style');
            styleElement.id = 'maxsm_ratings_quality';
            styleElement.textContent = `
                .card__view { position: relative !important; }
                .card__quality {
                    position: absolute !important;
                    bottom: 0.2em !important;
                    left: 0.2em !important;
                    z-index: 10;
                    display: flex !important;
                }
                .card__quality img {
                    height: 1.8em !important;
                    width: auto !important;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important;
                }
            `;
            document.head.appendChild(styleElement);
        },

        addQualityBadge: function(card, quality) {
            if (!document.body.contains(card)) return;
            card.setAttribute('data-quality-added', 'true');
            var cardView = card.querySelector('.card__view');
            if (!cardView) return;

            var existing = cardView.getElementsByClassName('card__quality');
            while(existing.length > 0) { existing[0].parentNode.removeChild(existing[0]); }

            if (quality && quality !== 'NO') {
                var qualityDiv = document.createElement('div');
                qualityDiv.className = 'card__quality';
                
                var iconFile = Config.ICONS_MAP[quality];
                if (iconFile) {
                    var img = document.createElement('img');
                    img.src = Config.ICONS_PATH + iconFile;
                    qualityDiv.appendChild(img);
                } else {
                    // Якщо немає іконки — старий текст для безпеки
                    var qualityInner = document.createElement('div');
                    qualityInner.textContent = Utils.escapeHtml(quality);
                    qualityInner.style = "background: rgba(0,0,0,0.5); color: #fff; padding: 2px 5px; border-radius: 3px; font-size: 1.1em; font-weight: bold;";
                    qualityDiv.appendChild(qualityInner);
                }
                cardView.appendChild(qualityDiv);
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
        if (!Config.JACRED_URL) return callback(null);
        var year = (normalizedCard.release_date || '').substring(0, 4);
        if (!year || isNaN(year)) return callback(null);

        var userId = Lampa.Storage.get('lampac_unic_id', '');
        var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +
            encodeURIComponent(normalizedCard.original_title || normalizedCard.title) +
            '&year=' + year + '&uid=' + userId;

        API.queueRequest(apiUrl, cardId, function(error, responseText) {
            Utils.stats.increment('requests');
            if (error || !responseText) return callback(null);
            try {
                var torrents = JSON.parse(responseText);
                if (!Array.isArray(torrents) || torrents.length === 0) return callback(null);
                
                torrents.sort(function(a, b) { return (b.quality || 0) - (a.quality || 0); });
                var best = torrents[0];
                var lowTitle = best.title.toLowerCase();

                var q = 'SD';
                if (best.quality >= 2160) {
                    q = '4K';
                    if (/\b(dv|dolby\s*vision)\b/.test(lowTitle)) q = '4K DV';
                    else if (/\b(hdr|hdr10)\b/.test(lowTitle)) q = '4K HDR';
                } else if (best.quality >= 1080) q = 'FHD';
                else if (best.quality >= 720) q = 'HD';

                callback({ quality: q });
            } catch (e) { callback(null); }
        });
    }

    function updateCards(cards) {
        Cache.cleanup();
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.hasAttribute('data-quality-added')) continue;
            
            (function(c) {
                var data = c.card_data;
                if (!data) return;
                var norm = {
                    id: data.id,
                    title: data.title || data.name,
                    original_title: data.original_title || data.original_name,
                    release_date: data.release_date || data.first_air_date,
                    type: getCardType(data)
                };
                var cacheKey = norm.type + '_' + norm.id;
                var cached = Cache.get(cacheKey);
                if (cached) {
                    UI.addQualityBadge(c, cached.quality);
                } else {
                    getBestReleaseFromJacred(norm, norm.id, function(res) {
                        var q = res ? res.quality : null;
                        Cache.set(cacheKey, { quality: q }, q ? 'quality' : 'no_quality');
                        UI.addQualityBadge(c, q);
                    });
                }
            })(card);
        }
    }

    // =======================================================
    // VIII. OBSERVER ТА ІНІЦІАЛІЗАЦІЯ
    // =======================================================
    var debouncedUpdateCards = Utils.debounce(function(cards) { updateCards(cards); }, 300);

    var observer = new MutationObserver(function (mutations) {
        var newCards = [];
        for (var m = 0; m < mutations.length; m++) {
            if (mutations[m].addedNodes) {
                for (var j = 0; j < mutations[m].addedNodes.length; j++) {
                    var node = mutations[m].addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    if (node.classList && node.classList.contains('card')) newCards.push(node);
                    var nested = node.querySelectorAll('.card');
                    for (var k = 0; k < nested.length; k++) newCards.push(nested[k]);
                }
            }
        }
        if (newCards.length) debouncedUpdateCards(newCards);
    });

    function startPlugin() {
        UI.initStyles();
        if (Lampa.Storage.get('maxsm_ratings_quality_inlist', 'true') === 'true') {
            observer.observe(document.body, { childList: true, subtree: true });
            var existing = document.querySelectorAll('.card');
            if (existing.length) updateCards(Array.prototype.slice.call(existing));
        }
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        startPlugin();
    }
})();
