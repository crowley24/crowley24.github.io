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

        // Шлях до іконок
        ICONS_PATH: 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/Quality_ico/',
        
        // Мапінг якості до файлів SVG
        ICONS_MAP: {
            '4K DV': 'Dolby Vision.svg',
            '4K HDR': 'HDR.svg',
            '4K': '4K.svg',
            'FHD': 'FULL HD.svg',
            'HD': 'HD.svg',
            'SD': 'HD.svg' // Можна замінити на SD.svg, якщо він з'явиться
        },

        // Мережа
        PROXY_TIMEOUT: 5000,
        PROXY_LIST: [
            'http://api.allorigins.win/raw?url=',
            'http://cors.bwa.workers.dev/'
        ],
        MAX_CONCURRENT_REQUESTS: 3,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        BATCH_SIZE: 5,

        // Кешування TTL
        TTL: {
            quality: 24 * 60 * 60 * 1000, 
            error: 5 * 60 * 1000,        
            no_quality: 60 * 60 * 1000   
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
            console[level]('[MAXSM-RATINGS] ' + message, context || '');
        },

        performance: {
            timers: {},
            start: function(name) { this.timers[name] = performance.now(); },
            end: function(name) {
                if (this.timers[name]) {
                    var duration = performance.now() - this.timers[name];
                    delete this.timers[name];
                    return duration;
                }
            }
        },

        stats: {
            requests: 0, cacheHits: 0, errors: 0,
            increment: function(type) { this[type]++; },
            getStats: function() {
                return {
                    requests: this.requests,
                    cacheHits: this.cacheHits,
                    errors: this.errors,
                    hitRate: (this.requests > 0 ? (this.cacheHits / this.requests * 100).toFixed(1) : 0) + '%'
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
                    if (!callbackCalled) { callbackCalled = true; callback(new Error('Proxy fail')); }
                    return;
                }
                var proxyUrl = Config.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
                var timeoutId = setTimeout(function() {
                    if (!callbackCalled) { currentProxyIndex++; tryNextProxy(); }
                }, Config.PROXY_TIMEOUT);

                fetch(proxyUrl)
                    .then(res => res.ok ? res.text() : Promise.reject())
                    .then(data => {
                        if (!callbackCalled) { callbackCalled = true; clearTimeout(timeoutId); callback(null, data); }
                    })
                    .catch(() => {
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
                if (Date.now() - item.timestamp < (Config.TTL[item.type] || Config.TTL.quality)) {
                    Utils.stats.increment('cacheHits');
                    return item;
                }
                delete cache[key];
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (e) { Utils.logWithContext('error', 'Cache get error', e); }
            return null;
        },
        set: function(key, data, type) {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                cache[key] = { quality: data.quality, timestamp: Date.now(), type: type || 'quality' };
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (e) { Utils.logWithContext('error', 'Cache set error', e); }
        },
        cleanup: function() {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var now = Date.now();
                for (var k in cache) {
                    if (now - cache[k].timestamp > (Config.TTL[cache[k].type] || Config.TTL.quality)) delete cache[k];
                }
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (e) {}
        }
    };

    // =======================================================
    // V. МОДУЛЬ UI (ОНОВЛЕНО ПІД SVG)
    // =======================================================
    var UI = {
        initStyles: function() {
            if (document.getElementById('maxsm_ratings_quality')) return;
            var style = document.createElement('style');
            style.id = 'maxsm_ratings_quality';
            style.textContent = `
                .card__view { position: relative !important; }
                .card__quality_box {
                    position: absolute !important;
                    bottom: 0.4em !important;
                    left: 0.4em !important;
                    z-index: 10;
                    display: flex;
                    gap: 3px;
                    pointer-events: none;
                }
                .card__quality_box img {
                    height: 1.6em !important;
                    width: auto !important;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9));
                    transition: transform 0.2s ease;
                }
                /* Фолбек стиль, якщо немає іконки */
                .quality-text-badge {
                    background: rgba(0,0,0,0.6);
                    border: 1px solid #fff;
                    color: #fff;
                    font-size: 0.8em;
                    padding: 1px 4px;
                    border-radius: 3px;
                    font-weight: bold;
                }
            `;
            document.head.appendChild(style);
        },

        addQualityBadge: function(card, quality) {
            if (!document.body.contains(card)) return;
            card.setAttribute('data-quality-added', 'true');
            
            var cardView = card.querySelector('.card__view');
            if (!cardView) return;

            // Видаляємо старі
            var old = cardView.querySelector('.card__quality_box');
            if (old) old.remove();

            if (quality && quality !== 'NO') {
                var container = document.createElement('div');
                container.className = 'card__quality_box';

                var iconFile = Config.ICONS_MAP[quality];
                if (iconFile) {
                    var img = document.createElement('img');
                    img.src = Config.ICONS_PATH + iconFile;
                    img.onerror = function() { // Якщо файл не завантажився
                        this.style.display = 'none';
                        container.innerHTML = '<div class="quality-text-badge">' + quality + '</div>';
                    };
                    container.appendChild(img);
                } else {
                    var txt = document.createElement('div');
                    txt.className = 'quality-text-badge';
                    txt.textContent = quality;
                    container.appendChild(txt);
                }
                cardView.appendChild(container);
            }
        }
    };

    // =======================================================
    // VI. ЛОГІКА ТА ПОШУК
    // =======================================================
    function getCardType(card) {
        return (card.media_type === 'tv' || card.first_air_date) ? 'tv' : 'movie';
    }

    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        if (!Config.JACRED_URL) return callback(null);

        var dateStr = normalizedCard.release_date || '';
        var year = dateStr.substring(0, 4);
        if (!year || isNaN(year)) return callback(null);

        function translateQuality(q, dv, hdr) {
            if (q >= 2160) return dv ? '4K DV' : (hdr ? '4K HDR' : '4K');
            if (q >= 1080) return 'FHD';
            if (q >= 720) return 'HD';
            return 'SD';
        }

        var url = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +
            encodeURIComponent(normalizedCard.original_title || normalizedCard.title) +
            '&year=' + year + '&uid=' + Lampa.Storage.get('lampac_unic_id', '');

        API.queueRequest(url, cardId, function(err, res) {
            Utils.stats.increment('requests');
            if (err || !res) return callback(null);
            try {
                var json = JSON.parse(res);
                if (!Array.isArray(json) || !json.length) return callback(null);

                // Знаходимо найкращий за якістю
                json.sort((a, b) => (b.quality || 0) - (a.quality || 0));
                var best = json[0];
                var title = best.title.toLowerCase();
                
                callback({
                    quality: translateQuality(
                        best.quality, 
                        /\b(dv|dolby\s*vision)\b/.test(title), 
                        /\b(hdr|hdr10)\b/.test(title)
                    )
                });
            } catch (e) { callback(null); }
        });
    }

    function updateCards(cards) {
        Cache.cleanup();
        cards.forEach(function(card) {
            if (card.hasAttribute('data-quality-added')) return;
            
            var data = card.card_data;
            if (!data) return;

            var normalized = {
                id: data.id,
                title: data.title || data.name,
                original_title: data.original_title || data.original_name,
                release_date: data.release_date || data.first_air_date,
                type: getCardType(data)
            };

            var cacheKey = normalized.type + '_' + normalized.id;
            var cached = Cache.get(cacheKey);

            if (cached) {
                UI.addQualityBadge(card, cached.quality);
            } else {
                getBestReleaseFromJacred(normalized, normalized.id, function(res) {
                    var q = res ? res.quality : null;
                    Cache.set(cacheKey, { quality: q }, q ? 'quality' : 'no_quality');
                    UI.addQualityBadge(card, q);
                });
            }
        });
    }

    // =======================================================
    // VII. ІНІЦІАЛІЗАЦІЯ
    // =======================================================
    var debouncedUpdate = Utils.debounce(updateCards, 300);

    var observer = new MutationObserver(function(mutations) {
        var added = [];
        mutations.forEach(m => {
            if (m.addedNodes) m.addedNodes.forEach(n => {
                if (n.nodeType === 1) {
                    if (n.classList.contains('card')) added.push(n);
                    n.querySelectorAll('.card').forEach(c => added.push(c));
                }
            });
        });
        if (added.length) debouncedUpdate(added);
    });

    function start() {
        UI.initStyles();
        if (Lampa.Storage.get('maxsm_ratings_quality_inlist', 'true') === 'true') {
            observer.observe(document.body, { childList: true, subtree: true });
            var initial = document.querySelectorAll('.card');
            if (initial.length) updateCards(Array.from(initial));
        }
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        start();
    }
})();

