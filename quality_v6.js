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
  
    // =======================================================  
    // II. МОДУЛЬ УТИЛІТ  
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
              
            increment: function(type) {  
                this[type] = (this[type] || 0) + 1;  
            },  
              
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
  
        /**  
         * Обробка черги запитів  
         */  
        processQueue: function() {  
            if (this.activeRequests >= MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {  
                return;  
            }  
              
            this.activeRequests++;  
            var request = this.requestQueue.shift();  
              
            this.fetchWithProxyRetry(request.url, request.cardId, function(error, responseText) {  
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
    // IV. МОДУЛЬ КАШУВАННЯ  
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
    // V. МОДУЛЬ ВИЗНАЧЕННЯ ЯКОСТІ  
    // =======================================================  
    var QualityDetector = {      
    detectQuality: function(torrentTitle) {      
        if (!torrentTitle) return null;      
              
        var title = torrentTitle.toLowerCase();      
              
        // Комбіновані формати з пріоритетом      
        if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';      
        if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr|3840x2160.*hdr)\b/i.test(title)) return '4K HDR';      
              
        // Формати релізу та якість      
        if (/\b(web-dl|webdl|webrip|web-rip|bluray|bdrip|brrip)\b/i.test(title)) return 'FHD';      
        if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160|4k\s*uhd|uhd\s*4k)\b/i.test(title)) return '4K';      
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
                  
            return currentIndex > bestIndex ? current : best;      
        }, null);      
    }      
};
  
    // =======================================================  
    // VI. МОДУЛЬ UI  
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
            bottom: 0.1em !important;          
            left: -0.8em !important;          
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
            font-size: 1.5em !important;          
            border-radius: 3px !important;          
            padding: 0.35em 0.65em !important;          
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
            50% { transform: scale(1.15); }    
        }
            
        @keyframes fadeIn {          
            from { opacity: 0; transform: scale(0.8); }          
            to { opacity: 1; transform: scale(1); }          
        }          
        .card__quality {          
            animation: fadeIn 0.3s ease-out;          
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
  
               /**  
         * Додавання бейджа якості з санітизацією  
         */  
        addQualityBadge: function(card, quality) {  
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
                var qualityInner = document.createElement('div');  
                qualityInner.textContent = Utils.escapeHtml(quality);  
                qualityInner.setAttribute('data-quality', quality); // Для CSS стилізації  
                qualityDiv.appendChild(qualityInner);  
                cardView.appendChild(qualityDiv);  
            }  
        }  
    };  
  
    // =======================================================  
    // VII. ОСНОВНІ ФУНКЦІЇ  
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
              
            API.fetchWithProxyRetry(apiUrl, cardId, function(error, responseText) {  
                Utils.performance.end('jacred_api_' + cardId);  
                Utils.stats.increment('requests');  
                  
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
                        // Спробуємо менш строгий пошук  
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
                          
                        // Бали за якість  
                        if (typeof torrent.quality === 'number') {  
                            score += torrent.quality / 1000;  
                        }  
                          
                        // Бали за Dolby Vision  
                        if (/\b(dv|dolby\s*vision)\b/i.test(lowerTitle)) {  
                            score += 500;  
                        }  
                          
                        // Бали за HDR  
                        if (/\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(lowerTitle)) {  
                            score += 300;  
                        }  
                          
                        // Бали за розмір файлу  
                        if (torrent.size) {  
                            score += Math.min(torrent.size / (1024 * 1024 * 1024), 5);  
                        }  
                          
                        // Мінус бали за низьку якість  
                        if (/\b(ts|telesync|camrip|cam)\b/i.test(lowerTitle)) {  
                           score -= 200;  
                        }  
                          
                        return {  
                            torrent: torrent,  
                            score: score  
                        };  
                    });  
                      
                    // Сортуємо за балами  
                    scoredTorrents.sort(function(a, b) {  
                        return b.score - a.score;  
                    });  
                      
                    var bestTorrent = scoredTorrents[0] ? scoredTorrents[0].torrent : null;  
                      
                    if (bestTorrent) {  
                        var hasDolbyVision = /\b(dv|dolby\s*vision)\b/i.test(bestTorrent.title.toLowerCase());  
                        var hasHDR = /\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(bestTorrent.title.toLowerCase());  
                          
                        apiCallback({  
                            quality: translateQuality(bestTorrent.quality, hasDolbyVision, hasHDR),  
                            title: bestTorrent.title,  
                            hasDolbyVision: hasDolbyVision,  
                            hasHDR: hasHDR,  
                            score: scoredTorrents[0].score  
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
     * Основна функція оновлення карток з пакетною обробкою та покращеннями  
     */  
    function updateCards(cards) {  
        Utils.performance.start('update_cards_batch');  
          
        // Очищення кешу при старті  
        Cache.cleanup();  
          
        // Пакетна обробка карток  
        for (var i = 0; i < cards.length; i += BATCH_SIZE) {  
            var batch = cards.slice(i, i + BATCH_SIZE);  
              
            batch.forEach(function(card) {  
                if (card.hasAttribute('data-quality-added')) return;  
                        
                var cardView = card.querySelector('.card__view');  
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false') {  
                    if (cardView) {  
                        var typeElements = cardView.getElementsByClassName('card__type');  
                        if (typeElements.length > 0) return;  
                    }  
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
                            
                    // Якщо є кеш - одразу застосовуємо  
                    if (cacheQualityData) {  
                        if (Q_LOGGING) Utils.logWithContext('log', 'Using cached quality', { cardId: localCurrentCard, quality: cacheQualityData.quality });  
                        Utils.stats.increment('cacheHits');  
                        UI.addQualityBadge(currentCard, cacheQualityData.quality);  
                    }  
                    // Якщо немає кешу - запитуємо у JacRed  
                    else {  
                        getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult) {  
                            var quality = (jrResult && jrResult.quality) || null;  
                              
                            // Зберігаємо в кеш з відповідним типом  
                            if (quality) {  
                                Cache.set(qCacheKey, { quality: quality }, 'quality');  
                            } else {  
                                Cache.set(qCacheKey, { quality: null }, 'no_quality');  
                            }  
                              
                            UI.addQualityBadge(currentCard, quality);  
                        });  
                    }  
                })(card);  
            });  
        }  
          
        Utils.performance.end('update_cards_batch');  
          
        // Виводимо статистику кожні 10 хвилин  
        if (Math.random() < 0.01) {  
            console.log('MAXSM-RATINGS Stats:', Utils.stats.getStats());  
        }  
    }  
  
    // =======================================================  
    // VIII. OBSERVER ТА ІНІЦІАЛІЗАЦІЯ  
    // =======================================================  
      
    // Observer з дебаунсінгом для відстеження нових карток  
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
     * Ініціалізація плагіна  
     */  
    function startPlugin() {  
        console.log("MAXSM-RATINGS-QUALITY", "Plugin started with improvements!");  
          
        // Налаштування за замовчуванням  
        if (!localStorage.getItem('maxsm_ratings_quality')) {  
            localStorage.setItem('maxsm_ratings_quality', 'true');  
        }  
        if (!localStorage.getItem('maxsm_ratings_quality_inlist')) {  
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');  
        }  
        if (!localStorage.getItem('maxsm_ratings_quality_tv')) {  
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');  
        }  
  
        // Ініціалізація стилів  
        UI.initStyles();  
  
        // Запуск observer якщо увімкнено відображення якості в списках  
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {  
            observer.observe(document.body, { childList: true, subtree: true });  
            console.log('MAXSM-RATINGS: observer started with debounce');  
                    
            // Обробка вже існуючих карток  
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
