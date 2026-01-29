(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    var Config = {
        Q_LOGGING: true,
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',

        // JacRed API
        JACRED_PROTOCOL: 'http://',
        JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',

        // Шлях до іконок (FoxStudio)
        ICONS_PATH: 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/Quality_ico/',
        
        // Мапінг якості до файлів SVG
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
    // III. МОДУЛЬ API (Черга запитів)
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
            } catch (e) { Utils.logWithContext('error', 'Cache error', e); }
            return null;
        },
        set: function(key, data, type) {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                cache[key] = { quality: data.quality, timestamp: Date.now(), type: type || 'quality' };
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (e) {}
        },
        cleanup: function() {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var now = Date.now();
                for (var k in cache) {
                    var ttl = Config.TTL[cache[k].type] || Config.TTL.quality;
                    if (now - cache[k].timestamp > ttl) delete cache[k];
                }
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (e) {}
        }
    };

    // =======================================================
    // V. МОДУЛЬ UI (З ІКОНКАМИ FOXSTUDIO)
    // =======================================================
    var UI = {
        initStyles: function() {
            var style = document.createElement('style');
            style.id = 'maxsm_ratings_quality';
            style.textContent = `
                .card__view { position: relative !important; }
                .card__quality_fox {
                    position: absolute !important;
                    bottom: 0.3em !important;
                    left: 0.3em !important;
                    z-index: 10;
                    display: flex;
                    pointer-events: none;
                }
                .card__quality_fox img {
                    height: 1.7em !important;
                    width: auto !important;
                    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.95)) !important;
                }
                .quality-fallback {
                    background: rgba(0,0,0,0.7);
                    color: white;
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-size: 1em;
                    font-weight: bold;
                    border: 1px solid white;
                }
            `;
            document.head.appendChild(style);
        },

        addQualityBadge: function(card, quality) {
            if (!document.body.contains(card)) return;
            card.setAttribute('data-quality-added', 'true');
            var cardView = card.querySelector('.card__view');
            if (!cardView) return;

            // Очищуємо старі бейджи
            var old = cardView.querySelector('.card__quality_fox');
            if (old) old.remove();

            if (quality && quality !== 'NO') {
                var container = document.createElement('div');
                container.className = 'card__quality_fox';

                var iconFile = Config.ICONS_MAP[quality];
                if (iconFile) {
                    var img = document.createElement('img');
                    img.src = Config.ICONS_PATH + iconFile;
                    // Якщо іконка не завантажилась, показуємо текст
                    img.onerror = function() {
                        this.style.display = 'none';
                        container.innerHTML = '<div class="quality-fallback">' + quality + '</div>';
                    };
                    container.appendChild(img);
                } else {
                    container.innerHTML = '<div class="quality-fallback">' + quality + '</div>';
                }
                cardView.appendChild(container);
            }
        }
    };

    // =======================================================
    // VI. ОСНОВНІ ФУНКЦІЇ (JacRed)
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

                // Сортування за якістю (спрощено для швидкості)
                torrents.sort(function(a, b) { return (b.quality || 0) - (a.quality || 0); });
                var best = torrents[0];
                var lowTitle = best.title.toLowerCase();

                // Визначення тега якості
                var qTag = 'SD';
                if (best.quality >= 2160) {
                    qTag = '4K';
                    if (/\b(dv|dolby\s*vision)\b/.test(lowTitle)) qTag = '4K DV';
                    else if (/\b(hdr|hdr10)\b/.test(lowTitle)) qTag = '4K HDR';
                } else if (best.quality >= 1080) qTag = 'FHD';
                else if (best.quality >= 720) qTag = 'HD';

                callback({ quality: qTag });
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
    // VII. OBSERVER ТА ЗАПУСК
    // =======================================================
    var debouncedUpdateCards = Utils.debounce(function(cards) {
        updateCards(cards);
    }, 300);

    var observer = new MutationObserver(function (mutations) {
        var newCards = [];
        for (var m = 0; m < mutations.length; m++) {
            if (mutations[m].addedNodes) {
                for (var j = 0; j < mutations[m].addedNodes.length; j++) {
                    var node = mutations[m].addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    if (node.classList.contains('card')) newCards.push(node);
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
        console.log("MAXSM-RATINGS", "Started with SVG Icons");
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        startPlugin();
    }
})();
