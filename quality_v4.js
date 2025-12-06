(function () {    
    'use strict';    
    
    // =======================================================    
    // I. КОНФІГУРАЦІЯ    
    // =======================================================    
    var Q_LOGGING = true;    
    var Q_CACHE_TIME = 24 * 60 * 60 * 1000;    
    var QUALITY_CACHE = 'maxsm_ratings_quality_cache';    
    var JACRED_PROTOCOL = 'http://';    
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';    
    var JACRED_API_KEY = Lampa.Storage.get('');    
    var PROXY_TIMEOUT = 5000;    
    var PROXY_LIST = [    
        'http://api.allorigins.win/raw?url=',    
        'http://cors.bwa.workers.dev/'    
    ];    
    
    // Нові налаштування для покращень    
    var MAX_CONCURRENT_REQUESTS = 3;    
    var RETRY_ATTEMPTS = 3;    
    var RETRY_DELAY = 1000;    
    var BATCH_SIZE = 5;    
    var UPDATE_INTERVAL = 100; // ms між картками    
    var MAX_VISIBLE_CARDS = 50;    
    
    // =======================================================    
    // II. МОДУЛЬ КОНФІГУРАЦІЇ    
    // =======================================================    
    var Config = {    
        defaults: {    
            maxConcurrentRequests: 3,    
            retryAttempts: 3,    
            cacheTime: 24 * 60 * 60 * 1000,    
            enableAnimations: true,    
            showTooltips: true,    
            showOnHover: false,    
            animatedBadges: true    
        },    
            
        get: function(key) {    
            return localStorage.getItem('maxsm_' + key) || this.defaults[key];    
        },    
            
        set: function(key, value) {    
            localStorage.setItem('maxsm_' + key, value);    
        }    
    };    
    
    // =======================================================    
    // III. МОДУЛЬ ПОДІЙ    
    // =======================================================    
    var EventBus = {    
        listeners: {},    
            
        on: function(event, callback) {    
            if (!this.listeners[event]) {    
                this.listeners[event] = [];    
            }    
            this.listeners[event].push(callback);    
        },    
            
        emit: function(event, data) {    
            if (this.listeners[event]) {    
                this.listeners[event].forEach(function(callback) {    
                    callback(data);    
                });    
            }    
        }    
    };    
    
    // =======================================================    
    // IV. МОДУЛЬ УТИЛІТ    
    // =======================================================    
    var Utils = {    
        /**    
         * Дебаунсінг функції    
         */    
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
    
        /**    
         * Санітизація HTML    
         */    
        escapeHtml: function(text) {    
            var div = document.createElement('div');    
            div.textContent = text;    
            return div.innerHTML;    
        },    
    
        /**    
         * Затримка    
         */    
        delay: function(ms) {    
            return new Promise(function(resolve) {    
                setTimeout(resolve, ms);    
            });    
        },    
    
        /**    
         * Перевірка чи елемент у viewport    
         */    
        isElementInViewport: function(element) {    
            var rect = element.getBoundingClientRect();    
            return (    
                rect.top >= 0 &&    
                rect.left >= 0 &&    
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&    
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)    
            );    
        },    
    
        /**    
         * Перевірка чи елемент поруч з viewport    
         */    
        isElementNearViewport: function(element, threshold) {    
            threshold = threshold || 200;    
            var rect = element.getBoundingClientRect();    
            return (    
                rect.top >= -threshold &&    
                rect.left >= -threshold &&    
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&    
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold    
            );    
        },    
    
        /**    
         * Покращене логування    
         */    
        logWithContext: function(level, message, context) {    
            if (!Q_LOGGING) return;    
                
            var logEntry = {    
                timestamp: new Date().toISOString(),    
                level: level,    
                message: message,    
                context: context || {}    
            };    
                
            console[level]('[MAXSM-RATINGS] ' + message, logEntry);    
        },    
    
        /**    
         * Моніторинг продуктивності    
         */    
        performance: {    
            timers: {},    
                
            start: function(name) {    
                this.timers[name] = performance.now();    
            },    
                
            end: function(name) {    
                if (this.timers[name]) {    
                    var duration = performance.now() - this.timers[name];    
                    Utils.logWithContext('log', 'Performance: ' + name, { duration: duration + 'ms' });    
                    delete this.timers[name];    
                    return duration;    
                }    
            }    
        },    
    
        /**    
         * Статистика виконання    
         */    
        stats: {    
            requests: 0,    
            cacheHits: 0,    
            errors: 0,    
            qualityDistribution: {},    
            averageResponseTime: 0,    
            errorTypes: {},    
                
            increment: function(type) {    
                this[type] = (this[type] || 0) + 1;    
            },    
                
            recordQuality: function(quality) {    
                this.qualityDistribution[quality] = (this.qualityDistribution[quality] || 0) + 1;    
            },    
                
            recordResponseTime: function(time) {    
                this.averageResponseTime = (this.averageResponseTime + time) / 2;    
            },    
                
            getStats: function() {    
                return {    
                    requests: this.requests,    
                    cacheHits: this.cacheHits,    
                    errors: this.errors,    
                    cacheHitRate: this.requests > 0 ? (this.cacheHits / this.requests * 100).toFixed(2) + '%' : '0%',    
                    qualities: this.qualityDistribution,    
                    avgTime: this.averageResponseTime,    
                    errorTypes: this.errorTypes    
                };    
            }    
        }    
    };    
    
    // =======================================================    
    // V. МОДУЛЬ API    
    // =======================================================    
    var API = {    
        activeRequests: 0,    
        requestQueue: [],    
        circuitOpen: false,    
        lastFailureTime: 0,    
    
        /**    
         * Обробка черги запитів    
         */    
        processQueue: function() {    
            if (this.activeRequests >= MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {    
                return;    
            }    
                
            this.activeRequests++;    
            var request = this.requestQueue.shift();    
                
            this.fetchWithCircuitBreaker(request.url, request.cardId, function(error, responseText) {    
                API.activeRequests--;    
                request.callback(error, responseText);    
                API.processQueue();    
            });    
        },    
    
        /**    
         * Додавання запиту в чергу    
         */    
        queueRequest: function(url, cardId, callback) {    
            this.requestQueue.push({ url: url, cardId: cardId, callback: callback });    
            this.processQueue();    
        },    
    
        /**    
         * HTTP клієнт з circuit breaker    
         */    
        fetchWithCircuitBreaker: function(url, cardId, callback) {    
            var failureCount = 0;    
            var maxFailures = 5;    
            var resetTimeout = 60000; // 1 хвилина    
                
            if (this.circuitOpen && Date.now() - this.lastFailureTime < resetTimeout) {    
                callback(new Error('Circuit breaker is open'), null);    
                return;    
            }    
                
            this.fetchWithProxyRetry(url, cardId, function(error, response) {    
                if (error) {    
                    failureCount++;    
                    Utils.stats.errorTypes[error.message] = (Utils.stats.errorTypes[error.message] || 0) + 1;    
                    if (failureCount >= maxFailures) {    
                        API.circuitOpen = true;    
                        API.lastFailureTime = Date.now();    
                    }    
                } else {    
                    failureCount = 0;    
                    API.circuitOpen = false;    
                }    
                callback(error, response);    
            });    
        },    
    
        /**    
         * HTTP клієнт з retry механізмом та експоненційним backoff    
         */    
        fetchWithProxyRetry: function(url, cardId, callback, retries, attempt) {    
            attempt = attempt || 1;    
            retries = retries || RETRY_ATTEMPTS;    
                
            this.fetchWithProxy(url, cardId, function(error, responseText) {    
                if (error && retries > 0) {    
                    var delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Експоненційний backoff    
                    Utils.logWithContext('log', 'Retrying request... attempt ' + attempt + '/' + RETRY_ATTEMPTS, {     
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
    
        /**    
         * Оригінальна функція fetchWithProxy    
         */    
        fetchWithProxy: function(url, cardId, callback) {    
            var currentProxyIndex = 0;    
            var callbackCalled = false;    
    
            function tryNextProxy() {    
                if (currentProxyIndex >= PROXY_LIST.length) {    
                    if (!callbackCalled) {    
                        callbackCalled = true;    
                        callback(new Error('All proxies failed for ' + url));    
                    }    
                    return;    
                }    
                    
                var proxyUrl = PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);    
                if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", Fetch with proxy: " + proxyUrl);    
                    
                var timeoutId = setTimeout(function() {    
                    if (!callbackCalled) {    
                        currentProxyIndex++;    
                        tryNextProxy();    
                    }    
                }, PROXY_TIMEOUT);    
                    
                fetch(proxyUrl)    
                    .then(function(response) {    
                        clearTimeout(timeoutId);    
                        if (!response.ok) throw new Error('Proxy error: ' + response.status);    
                        return response.text();    
                    })    
                    .then(function(data) {    
                        if (!callbackCalled) {    
                            callbackCalled = true;    
                            clearTimeout(timeoutId);    
                            callback(null, data);    
                        }    
                    })    
                    .catch(function(error) {    
                        console.error("MAXSM-RATINGS", "card: " + cardId + ", Proxy fetch error for " + proxyUrl + ":", error);    
                        clearTimeout(timeoutId);    
                        if (!callbackCalled) {    
                            currentProxyIndex++;    
                            tryNextProxy();    
                        }    
                    });    
            }    
                
            tryNextProxy();    
        }    
    };    
    
    // =======================================================    
    // VI. МОДУЛЬ КАШУВАННЯ    
    // =======================================================    
    var Cache = {    
        // Налаштування TTL для різних типів даних    
        TTL_CONFIG: {    
            quality: 24 * 60 * 60 * 1000, // 24 години для якості    
            error: 5 * 60 * 1000,        // 5 хвилин для помилок    
            no_quality: 60 * 60 * 1000   // 1 година для відсутності якості    
        },    
    
        /**    
         * Отримання даних з кешу    
         */    
        get: function(key) {    
            try {    
                var cache = Lampa.Storage.get(QUALITY_CACHE) || {};    
                var item = cache[key];    
                if (!item) return null;    
                    
                var now = Date.now();    
                var ttl = this.TTL_CONFIG[item.type] || this.TTL_CONFIG.quality;    
                    
                if (now - item.timestamp < ttl) {    
                    Utils.stats.increment('cacheHits');    
                    return item;    
                } else {    
                    // Очищення застарілого запису    
                    delete cache[key];    
                    Lampa.Storage.set(QUALITY_CACHE, cache);    
                }    
            } catch (error) {    
                Utils.logWithContext('error', 'Cache read error', { key: key, error: error });    
            }    
            return null;    
        },    
    
        /**    
         * Збереження даних в кеш    
         */    
        set: function(key, data, type) {    
            type = type || 'quality';    
            try {    
                var cache = Lampa.Storage.get(QUALITY_CACHE) || {};    
                cache[key] = {    
                    quality: data.quality || null,    
                    timestamp: Date.now(),    
                    type: type    
                };    
                Lampa.Storage.set(QUALITY_CACHE, cache);    
            } catch (error) {    
                Utils.logWithContext('error', 'Cache write error', { key: key, error: error });    
            }    
        },    
    
        /**    
         * Очищення застарілих записів    
         */    
        cleanup: function() {    
            try {    
                var cache = Lampa.Storage.get(QUALITY_CACHE) || {};    
                var now = Date.now();    
                var cleanedCache = {};    
                var cleaned = 0;    
                    
                for (var key in cache) {    
                    if (cache.hasOwnProperty(key)) {    
                        var item = cache[key];    
                        var ttl = this.TTL_CONFIG[item.type] || this.TTL_CONFIG.quality;    
                            
                        if (now - item.timestamp < ttl) {    
                            cleanedCache[key] = item;    
                        } else {    
                            cleaned++;    
                        }    
                    }    
                }    
                    
                if (cleaned > 0 && Q_LOGGING) {    
                    Utils.logWithContext('log', 'Cleaned expired cache entries', { count: cleaned });    
                }    
                    
                Lampa.Storage.set(QUALITY_CACHE, cleanedCache);    
                return cleanedCache;    
            } catch (error) {    
                Utils.logWithContext('error', 'Cache cleanup error', { error: error });    
                return {};    
            }    
        }    
    };    
    
    // =======================================================    
    // VII. МОДУЛЬ ВИЗНАЧЕННЯ ЯКОСТІ    
    // =======================================================    
    var QualityDetector = {    
        /**    
         * Покращене визначення якості з розширеними патернами    
         */    
        detectQuality: function(torrentTitle) {    
            if (!torrentTitle) return null;    
                
            var title = torrentTitle.toLowerCase();    
                
            // Нові формати якості    
            if (/\b(8k|4320p|uhd\s*8k|7680x4320)\b/i.test(title)) return '8K';    
            if (/\b(dolby\s*atmos|atmos|dtsx)\b/i.test(title)) return 'ATMOS';    
            if (/\b(imax|imax\s*enhanced)\b/i.test(title)) return 'IMAX';    
                
            // Комбіновані формати з пріоритетом    
            if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';    
            // ВИДАЛЕНО: 4K HDR10+    
            if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr|3840x2160.*hdr)\b/i.test(title)) return '4K HDR';    
                
            // Dolby Vision - розширені патерни    
            if (/\b(dolby\s*vision|dolbyvision|dv|dovi|dolby\s*vision\s*hdr|vision\s*hdr)\b/i.test(title)) return 'DV';  
          // HDR10+ - розширені патерни    
            if (/\b(hdr10\+|hdr\s*10\+|hdr10plus|hdr10\+|hdr\+10)\b/i.test(title)) return 'HDR10+';    
                
            // HDR - розширені патерни    
            if (/\b(hdr|hdr10|high\s*dynamic\s*range|hdr\s*10|dolby\s*hdr)\b/i.test(title)) return 'HDR';    
                
            // Роздільна здатність - розширені патерни    
            if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160|4k\s*uhd|uhd\s*4k)\b/i.test(title)) return '4K';    
            if (/\b(2k|1440p|qhd|quad\s*hd|2560x1440|wqhd)\b/i.test(title)) return '2K';    
            if (/\b(fhd|1080p|full\s*hd|1920x1080|bluray|bd|bdrip|web-dl|webrip|fullhd)\b/i.test(title)) return 'FHD';    
            if (/\b(hd|720p|1280x720|hdtv|hdrip|hd-rip)\b/i.test(title)) return 'HD';    
            if (/\b(sd|480p|854x480|dvd|dvdrip|dvdscr|dvdscr|ts|telesync|cam|camrip)\b/i.test(title)) return 'SD';    
                
            return null;    
        },    
    
        /**    
         * Визначення найкращої якості    
         */    
        getBestQuality: function(qualities) {    
            var priority = ['8K', '4K DV', '4K HDR', '4K', '2K', 'FHD', 'HDR10+', 'HDR', 'HD', 'SD', 'ATMOS', 'IMAX'];    
                
            return qualities.reduce(function(best, current) {    
                if (!current) return best;    
                if (!best) return current;    
                    
                var bestIndex = priority.indexOf(best);    
                var currentIndex = priority.indexOf(current);    
                    
                return currentIndex > bestIndex ? current : best;    
            }, null);    
        }    
    };    
    
    // =======================================================    
    // VIII. МОДУЛЬ UI    
    // =======================================================    
    var UI = {    
        /**    
         * Ініціалізація стилів з CSP сумісністю та анімаціями    
         */    
        initStyles: function() {        
            var styleElement = document.createElement('style');        
            styleElement.id = 'maxsm_ratings_quality';        
            styleElement.textContent = `        
                .card__view {position: relative !important;}        
                .card__quality {        
                    position: absolute !important;        
                    bottom: 0.5em !important;        
                    left: -0.8em !important;        
                    background-color: transparent !important;        
                    z-index: 10;        
                    width: fit-content !important;        
                    min-width: 3em !important;        
                    max-width: calc(100% - 1em) !important;        
                }        
                .card__quality div {        
                    text-transform: none !important;        
                    border: 2px solid #FFFFFF !important;        
                    color: #FFFFFF !important;        
                    font-weight: bold !important;        
                    font-style: normal !important;        
                    font-size: 1.3em !important;        
                    border-radius: 3px !important;        
                    padding: 0.25em 0.5em !important;        
                    transition: all 0.3s ease !important;        
                    box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;        
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;        
                    animation: qualityPulse 2s ease-in-out infinite;        
                }        
                .card__quality div:hover {        
                    transform: scale(1.1) !important;        
                    box-shadow: 0 4px 12px rgba(0,0,0,0.7) !important;        
                }        
                @keyframes qualityPulse {        
                    0%, 100% { transform: scale(1); }        
                    50% { transform: scale(1.05); }        
                }        
                .card__quality.premium div {        
                    animation: premiumGlow 3s ease-in-out infinite;        
                }        
                @keyframes premiumGlow {        
                    0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.5); }        
                    50% { box-shadow: 0 4px 16px rgba(255,215,0,0.8); }        
                }        
                /* Градієнтні схеми */        
                .card__quality div[data-quality*="8K"] {        
                    border-color: #FFD700 !important;        
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%) !important;        
                }        
                .card__quality div[data-quality*="4K"][data-quality*="DV"] {        
                    border-color: #8A2BE2 !important;        
                    background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 50%, #6A0DAD 100%) !important;        
                }        
                .card__quality div[data-quality*="4K"][data-quality*="HDR"] {          
                    border-color: #FF8C00 !important;          
                    background: linear-gradient(135deg, #FFA500 0%, #FF8C00 50%, #FF6347 100%) !important;          
                }          
                .card__quality div[data-quality*="4K"] {   
                    border-color: #FF0000 !important;   
                    background: linear-gradient(135deg, #FF0000 0%, #CC0000 50%, #990000 100%) !important;                
                }        
                .card__quality div[data-quality*="FHD"] {            
                    border-color: #006400 !important;            
                    background: linear-gradient(135deg, #006400 0%, #228B22 50%, #2E7D32 100%) !important;            
                }                   
                .card__quality div[data-quality*="2K"] {        
                    border-color: #4169E1 !important;        
                    background: linear-gradient(135deg, #4169E1 0%, #1E90FF 50%, #000080 100%) !important;        
                }        
                .card__quality div[data-quality*="HD"] {        
                    border-color: #808080 !important;        
                    background: linear-gradient(135deg, #808080 0%, #696969 50%, #2F4F4F 100%) !important;        
                }        
                .card__quality div[data-quality*="SD"] {        
                    border-color: #8B4513 !important;        
                    background: linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #654321 100%) !important;        
                }        
                .card__quality div[data-quality*="ATMOS"] {        
                    border-color: #FF69B4 !important;        
                    background: linear-gradient(135deg, #FF69B4 0%, #FF1493 50%, #C71585 100%) !important;        
                }        
                .card__quality div[data-quality*="IMAX"] {        
                    border-color: #00CED1 !important;        
                    background: linear-gradient(135deg, #00CED1 0%, #48D1CC 50%, #20B2AA 100%) !important;        
                }        
                /* Усі інші - градієнтний чорний */        
                .card__quality div:not([data-quality*="8K"]):not([data-quality*="4K"]):not([data-quality*="FHD"]):not([data-quality*="2K"]):not([data-quality*="HD"]):not([data-quality*="SD"]):not([data-quality*="ATMOS"]):not([data-quality*="IMAX"]) {        
                    border-color: #FFFFFF !important;        
                    background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.5) 100%) !important;        
                }     
                @keyframes fadeIn {        
                    from { opacity: 0; transform: scale(0.8); }        
                    to { opacity: 1; transform: scale(1); }        
                }        
                .card__quality {        
                    animation: fadeIn 0.3s ease-out;        
                }  
                /* Tooltip стилі */  
                .quality-tooltip {  
                    position: absolute;  
                    bottom: 100%;  
                    left: 50%;  
                    transform: translateX(-50%);  
                    background: rgba(0, 0, 0, 0.9);  
                    color: white;  
                    padding: 0.5em;  
                    border-radius: 0.3em;  
                    font-size: 0.8em;  
                    white-space: nowrap;  
                    z-index: 1000;  
                    pointer-events: none;  
                    opacity: 0;  
                    transition: opacity 0.3s ease;  
                }  
                .card__quality:hover .quality-tooltip {  
                    opacity: 1;  
                }  
                /* Адаптивність для різних розмірів екрану */    
                @media (max-width: 768px) {    
                    .card__quality div {    
                        font-size: 1em !important;    
                        padding: 0.15em 0.3em !important;    
                    }    
                }    
            `;    
                
            document.head.appendChild(styleElement);    
        },    
    
        /**    
         * Додавання бейджа якості з санітизацією    
         */    
        addQualityBadge: function(card, quality, qualityData) {    
            if (!document.body.contains(card)) return;    
                        
            card.setAttribute('data-quality-added', 'true');    
            var cardView = card.querySelector('.card__view');    
            if (!cardView) return;    
    
            // Видаляємо існуючі елементи якості    
            var existingQualityElements = cardView.getElementsByClassName('card__quality');    
            while(existingQualityElements.length > 0) {    
                existingQualityElements[0].parentNode.removeChild(existingQualityElements[0]);    
            }    
    
            if (quality && quality !== 'NO') {    
                var qualityDiv = document.createElement('div');    
                qualityDiv.className = 'card__quality';    
                if (qualityData && qualityData.premium) {    
                    qualityDiv.classList.add('premium');    
                }    
                var qualityInner = document.createElement('div');    
                qualityInner.textContent = Utils.escapeHtml(quality);    
                qualityInner.setAttribute('data-quality', quality); // Для CSS стилізації    
                qualityDiv.appendChild(qualityInner);    
    
                // Додаємо tooltip якщо увімкнено    
                if (Config.get('showTooltips') && qualityData) {    
                    this.addQualityTooltip(qualityDiv, qualityData);    
                }    
    
                cardView.appendChild(qualityDiv);    
                    
                // Запускаємо подію    
                EventBus.emit('quality:added', {    
                    card: card,    
                    quality: quality,    
                    qualityData: qualityData    
                });    
            }    
        },    
    
        /**    
         * Додавання tooltip з детальною інформацією    
         */    
        addQualityTooltip: function(qualityDiv, qualityData) {    
            var tooltip = document.createElement('div');    
            tooltip.className = 'quality-tooltip';    
            tooltip.innerHTML = `    
                <div>Якість: ${qualityData.quality || 'N/A'}</div>    
                <div>Джерело: ${qualityData.source || 'JacRed'}</div>    
                ${qualityData.size ? '<div>Розмір: ' + this.formatSize(qualityData.size) + '</div>' : ''}    
                <div>Оновлено: ${new Date().toLocaleTimeString()}</div>    
            `;    
            qualityDiv.appendChild(tooltip);    
        },    
    
        /**    
         * Форматування розміру файлу    
         */    
        formatSize: function(bytes) {    
            if (bytes === 0) return '0 B';    
            var k = 1024;    
            var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];    
            var i = Math.floor(Math.log(bytes) / Math.log(k));    
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];    
        },    
    
        /**    
         * Показати налаштування    
         */    
        showSettings: function() {    
            var settings = {    
                showOnHover: Config.get('showOnHover'),    
                animatedBadges: Config.get('animatedBadges'),    
                showTooltips: Config.get('showTooltips'),    
                enableAnimations: Config.get('enableAnimations')    
            };    
                
            // Створення модального вікна налаштувань    
            this.createSettingsModal(settings);    
        },    
    
        /**    
         * Створення модального вікна налаштувань    
         */    
        createSettingsModal: function(settings) {    
            // Реалізація модального вікна    
            var modal = document.createElement('div');    
            modal.style.cssText = `    
                position: fixed;    
                top: 50%;    
                left: 50%;    
                transform: translate(-50%, -50%);    
                background: rgba(0, 0, 0, 0.9);    
                color: white;    
                padding: 2em;    
                border-radius: 1em;    
                z-index: 10000;    
            `;    
                
            modal.innerHTML = `    
                <h3>Налаштування якості</h3>    
                <label>    
                    <input type="checkbox" ${settings.showOnHover ? 'checked' : ''} id="showOnHover">    
                    Показувати при наведенні    
                </label>    
                <label>    
                    <input type="checkbox" ${settings.animatedBadges ? 'checked' : ''} id="animatedBadges">    
                    Анімовані бейджі    
                </label>    
                <label>    
                    <input type="checkbox" ${settings.showTooltips ? 'checked' : ''} id="showTooltips">    
                    Показувати підказки    
                </label>    
                <button onclick="this.parentElement.remove()">Закрити</button>    
            `;    
                
            document.body.appendChild(modal);    
        }    
    };    
    
    // =======================================================    
    // IX. ОСНОВНІ ФУНКЦІЇ    
    // =======================================================    
    
    /**    
     * Функція для отримання типу картки    
     */    
    function getCardType(card) {    
        var type = card.media_type || card.type;    
        if (type === 'movie' || type === 'tv') return type;    
        return card.name || card.original_name ? 'tv' : 'movie';    
    }    
    
    /**    
     * Функція отримання якості з JacRed з покращеною обробкою    
     */    
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {    
        if (!JACRED_URL) {    
            Utils.logWithContext('log', 'JacRed: JACRED_URL is not set', { cardId: cardId });    
            callback(null);    
            return;    
        }    
    
        function translateQuality(quality, hasDolbyVision, hasHDR) {    
            if (typeof quality !== 'number') return quality;    
                        
            var qualityLabel = '';    
            if (quality >= 4320) {    
                qualityLabel = '8K';    
            }    
            else if (quality >= 2160) {    
                qualityLabel = '4K';    
                if (hasDolbyVision) {    
                    qualityLabel += ' DV';    
                } else if (hasHDR) {    
                    qualityLabel += ' HDR';    
                }    
            }    
            else if (quality >= 1440) return '2K';    
            else if (quality >= 1080) return 'FHD';    
            else if (quality >= 720) return 'HD';    
            else if (quality > 0) return 'SD';    
            else return null;    
                        
            return qualityLabel;    
        }    
    
        if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: Search initiated', { cardId: cardId });    
            
        var year = '';    
        var dateStr = normalizedCard.release_date || '';    
        if (dateStr.length >= 4) {    
            year = dateStr.substring(0, 4);    
        }    
        if (!year || isNaN(year)) {    
            Utils.logWithContext('log', 'JacRed: Missing/invalid year', { cardId: cardId });    
            callback(null);    
            return;    
        }    
    
        function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {    
            var userId = Lampa.Storage.get('lampac_unic_id', '');    
            var apiUrl = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' +    
                encodeURIComponent(searchTitle) +    
                '&year=' + searchYear +    
                (exactMatch ? '&exact=true' : '') +    
                '&uid=' + userId;    
    
            if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: ' + strategyName + ' URL', { url: apiUrl, cardId: cardId });    
    
            Utils.performance.start('jacred_api_' + cardId);    
                
            API.fetchWithCircuitBreaker(apiUrl, cardId, function(error, responseText) {    
                Utils.performance.end('jacred_api_' + cardId);    
                Utils.stats.increment('requests');    
                Utils.stats.recordResponseTime(Utils.performance.timers['jacred_api_' + cardId] || 0);    
                    
                if (error) {    
                    Utils.stats.increment('errors');    
                    Utils.logWithContext('error', 'JacRed: ' + strategyName + ' request failed', { error: error, cardId: cardId });    
                    apiCallback(null);    
                    return;    
                }    
                if (!responseText) {    
                    if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: ' + strategyName + ' failed or empty response', { cardId: cardId });    
                    apiCallback(null);    
                    return;    
                }    
                        
                try {    
                    var torrents = JSON.parse(responseText);    
                    if (!Array.isArray(torrents) || torrents.length === 0) {    
                        if (exactMatch) {    
                            Utils.logWithContext('log', 'Trying less strict search', { cardId: cardId });    
                            searchJacredApi(searchTitle, searchYear, false, strategyName + ' (Loose)', apiCallback);    
                            return;    
                        }    
                        apiCallback(null);    
                        return;    
                    }    
                        
                    var scoredTorrents = torrents.map(function(torrent) {    
                        var score = 0;    
                        var lowerTitle = (torrent.title || '').toLowerCase();    
                            
                        if (typeof torrent.quality === 'number') {    
                            score += torrent.quality / 1000;    
                        }    
                            
                        if (/\b(dv|dolby\s*vision)\b/i.test(lowerTitle)) {    
                            score += 500;    
                        }    
                            
                        if (/\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(lowerTitle)) {    
                            score += 300;    
                        }    
                            
                        if (/\b(8k|4320p)\b/i.test(lowerTitle)) {    
                            score += 1000;    
                        }    
                            
                        if (/\b(imax|atmos|dtsx)\b/i.test(lowerTitle)) {    
                            score += 200;    
                        }    
                            
                        if (torrent.size) {    
                            score += Math.min(torrent.size / (1024 * 1024 * 1024), 5);    
                        }    
                            
                        if (/\b(ts|telesync|camrip|cam)\b/i.test(lowerTitle)) {    
                           score -= 200;    
                        }    
                            
                        return {    
                            torrent: torrent,    
                            score: score    
                        };    
                    });    
                        
                    scoredTorrents.sort(function(a, b) {    
                        return b.score - a.score;    
                    });    
                        
                    var bestTorrent = scoredTorrents[0] ? scoredTorrents[0].torrent : null;    
                        
                    if (bestTorrent) {    
                        var hasDolbyVision = /\b(dv|dolby\s*vision)\b/i.test(bestTorrent.title.toLowerCase());    
                        var hasHDR = /\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(bestTorrent.title.toLowerCase());    
                        var hasIMAX = /\b(imax|imax\s*enhanced)\b/i.test(bestTorrent.title.toLowerCase());    
                        var hasATMOS = /\b(dolby\s*atmos|atmos|dtsx)\b/i.test(bestTorrent.title.toLowerCase());    
                            
                        var quality = translateQuality(bestTorrent.quality, hasDolbyVision, hasHDR);    
                        if (hasIMAX && quality) quality += ' IMAX';    
                        if (hasATMOS && quality) quality += ' ATMOS';    
                            
                        Utils.stats.recordQuality(quality);    
                            
                        apiCallback({    
                            quality: quality,    
                            title: bestTorrent.title,    
                            size: bestTorrent.size,    
                            source: 'JacRed',    
                            hasDolbyVision: hasDolbyVision,    
                            hasHDR: hasHDR,    
                            score: scoredTorrents[0].score,    
                            premium: hasDolbyVision || hasIMAX    
                        });    
                    } else {    
                        apiCallback(null);    
                    }    
                } catch (e) {    
                    Utils.stats.increment('errors');    
                    Utils.logWithContext('error', 'Error parsing response', { error: e, cardId: cardId });    
                    apiCallback(null);    
                }    
            });    
        }    
    
        var searchStrategies = [];    
        if (normalizedCard.original_title && /[a-zа-яё0-9]/i.test(normalizedCard.original_title)) {    
            searchStrategies.push({    
                title: normalizedCard.original_title.trim(),    
                year: year,    
                exact: true,    
                name: "OriginalTitle Exact Year"    
            });    
        }    
        if (normalizedCard.title && /[a-zа-яё0-9]/i.test(normalizedCard.title)) {    
            searchStrategies.push({    
                title: normalizedCard.title.trim(),    
                year: year,    
                exact: true,    
                name: "Title Exact Year"    
            });    
        }    
    
        function executeNextStrategy(index) {    
            if (index >= searchStrategies.length) {    
                if (Q_LOGGING) Utils.logWithContext('log', 'All search strategies failed', { cardId: cardId });    
                callback(null);    
                return;    
            }    
            var strategy = searchStrategies[index];    
            if (Q_LOGGING) Utils.logWithContext('log', 'Trying strategy', { strategy: strategy.name, cardId: cardId });    
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {    
                if (result !== null) {    
                    if (Q_LOGGING) Utils.logWithContext('log', 'Successfully found quality', { quality: result.quality, cardId: cardId });    
                    EventBus.emit('quality:detected', result);    
                    callback(result);    
                } else {    
                    executeNextStrategy(index + 1);    
                }    
            });    
        }    
    
        if (searchStrategies.length > 0) {    
            executeNextStrategy(0);    
        } else {    
            if (Q_LOGGING) Utils.logWithContext('log', 'No valid search titles', { cardId: cardId });    
            callback(null);    
        }    
    }    
    
    /**    
     * Покращена функція оновлення карток з інтервальною обробкою    
     */    
    function updateCards(cards) {    
        Utils.performance.start('update_cards_batch');    
            
        Cache.cleanup();    
            
        // Фільтруємо тільки видимі картки для оптимізації    
        var visibleCards = cards.filter(function(card) {    
            return Utils.isElementInViewport(card) || Utils.isElementNearViewport(card, 200);    
        });    
            
        if (visibleCards.length > MAX_VISIBLE_CARDS) {    
            visibleCards = visibleCards.slice(0, MAX_VISIBLE_CARDS);    
        }    
            
        var cardIndex = 0;    
            
        function processNextCard() {    
            if (cardIndex < visibleCards.length) {    
                var card = visibleCards[cardIndex];    
                    
                if (card.hasAttribute('data-quality-added')) {    
                    cardIndex++;    
                    setTimeout(processNextCard, UPDATE_INTERVAL);    
                    return;    
                }    
                            
                var cardView = card.querySelector('.card__view');    
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false') {    
                    if (cardView) {    
                        var typeElements = cardView.getElementsByClassName('card__type');    
                        if (typeElements.length > 0) {    
                            cardIndex++;    
                            setTimeout(processNextCard, UPDATE_INTERVAL);    
                            return;    
                        }    
                    }    
                }    
    
                (function (currentCard) {    
                    var data = currentCard.card_data;    
                    if (!data) {    
                        cardIndex++;    
                        setTimeout(processNextCard, UPDATE_INTERVAL);    
                        return;    
                    }    
                              
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
                        if (Q_LOGGING) Utils.logWithContext('log', 'Using cached quality', { cardId: localCurrentCard, quality: cacheQualityData.quality });    
                        Utils.stats.increment('cacheHits');    
                        UI.addQualityBadge(currentCard, cacheQualityData.quality, cacheQualityData);    
                        cardIndex++;    
                        setTimeout(processNextCard, UPDATE_INTERVAL);    
                    } else {    
                        getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult) {    
                            var quality = (jrResult && jrResult.quality) || null;    
                                
                            if (quality) {    
                                Cache.set(qCacheKey, { quality: quality, source: jrResult.source, size: jrResult.size }, 'quality');    
                            } else {    
                                Cache.set(qCacheKey, { quality: null }, 'no_quality');    
                            }    
                                
                            UI.addQualityBadge(currentCard, quality, jrResult);    
                            cardIndex++;    
                            setTimeout(processNextCard, UPDATE_INTERVAL);    
                        });    
                    }    
                })(card);    
            } else {    
                Utils.performance.end('update_cards_batch');    
                    
                if (Math.random() < 0.01) {    
                    console.log('MAXSM-RATINGS Stats:', Utils.stats.getStats());    
                }    
            }    
        }    
            
        processNextCard();    
    }    
    
    // =======================================================    
    // X. OBSERVER ТА ІНІЦІАЛІЗАЦІЯ    
    // =======================================================    
        
    var debouncedUpdateCards = Utils.debounce(function(cards) {    
        updateCards(cards);    
    }, 300);    
    
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
    
    /**    
     * Ініціалізація плагіна з усіма покращеннями    
     */    
    function startPlugin() {    
        console.log("MAXSM-RATINGS-QUALITY", "Plugin started with all improvements!");    
            
        // Ініціалізація конфігурації    
        Object.keys(Config.defaults).forEach(function(key) {    
            if (localStorage.getItem('maxsm_' + key) === null) {    
                Config.set(key, Config.defaults[key]);    
            }    
        });    
    
        // Ініціалізація стилів    
        UI.initStyles();    
    
        // Підписка на події    
        EventBus.on('quality:detected', function(data) {    
            console.log('Quality detected:', data);    
        });    
    
        // Додавання кнопки налаштувань    
        if (Config.get('enableAnimations')) {    
            setTimeout(function() {    
                var settingsBtn = document.createElement('button');    
                settingsBtn.innerHTML = '⚙️';    
                settingsBtn.style.cssText = `    
                    position: fixed;    
                    bottom: 20px;    
                    right: 20px;    
                    z-index: 10000;    
                    background: rgba(0,0,0,0.8);    
                    border: none;    
                    color: white;    
                    padding: 10px;    
                    border-radius: 50%;    
                    cursor: pointer;    
                    font-size: 20px;    
                `;    
                settingsBtn.onclick = function() {    
                    UI.showSettings();    
                };    
                document.body.appendChild(settingsBtn);    
            }, 2000);    
        }    
    
        // Запуск observer    
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {    
            observer.observe(document.body, { childList: true, subtree: true });    
            console.log('MAXSM-RATINGS: observer started with debounce and optimizations');    
                      
            var existingCards = document.querySelectorAll('.card');    
            if (existingCards.length) {    
                if (Q_LOGGING) Utils.logWithContext('log', 'Processing existing cards', { count: existingCards.length });    
                updateCards(existingCards);    
            }    
        }    
    }    
    
    // Запуск плагіна    
    if (!window.maxsmRatingsQualityPlugin) {    
        window.maxsmRatingsQualityPlugin = true;    
        startPlugin();    
    }    
})(); 
