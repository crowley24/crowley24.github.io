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
         * HTTP клієнт з retry механізмом  
         */  
        fetchWithProxyRetry: function(url, cardId, callback, retries) {  
            retries = retries || RETRY_ATTEMPTS;  
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
                if (Q_LOGGING) Utils.logWithContext('log', "Fetching with proxy", { url: proxyUrl, cardId: cardId });  
                  
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
                            callback(null, data);  
                        }  
                    })  
                    .catch(function(error) {  
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
        /**  
         * Отримання даних з кешу  
         */  
        get: function(key) {  
            try {  
                var cache = Lampa.Storage.get(QUALITY_CACHE) || {};  
                var item = cache[key];  
                return item && (Date.now() - item.timestamp < Q_CACHE_TIME) ? item : null;  
            } catch (e) {  
                Utils.logWithContext('error', 'Cache get error', { error: e, key: key });  
                return null;  
            }  
        },  
  
        /**  
         * Збереження даних в кеш  
         */  
        set: function(key, data) {  
            try {  
                var cache = Lampa.Storage.get(QUALITY_CACHE) || {};  
                cache[key] = {  
                    quality: data.quality || null,  
                    timestamp: Date.now()  
                };  
                Lampa.Storage.set(QUALITY_CACHE, cache);  
            } catch (e) {  
                Utils.logWithContext('error', 'Cache set error', { error: e, key: key });  
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
                        if (now - cache[key].timestamp < Q_CACHE_TIME) {  
                            cleanedCache[key] = cache[key];  
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
            } catch (e) {  
                Utils.logWithContext('error', 'Cache cleanup error', { error: e });  
                return {};  
            }  
        }  
    };  
  
    // =======================================================  
    // V. МОДУЛЬ UI  
    // =======================================================  
    var UI = {  
        /**  
         * Ініціалізація стилів  
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
                    border: 1px solid #FFFFFF !important;  
                    background-color: rgba(0, 0, 0, 0.7) !important;  
                    color: #FFFFFF !important;  
                    font-weight: bold !important;  
                    font-style: normal !important;  
                    font-size: 1.2em !important;  
                    border-radius: 3px !important;  
                    padding: 0.2em 0.4em !important;  
                }  
                /* 4K DV - фіолетовий */  
                .quality-4k-dv {  
                    background: #8A2BE2 !important;  
                    border-color: #A968FF !important;  
                }  
                /* 4K HDR - золотий */  
                .quality-4k-hdr {  
                    background: #FFD700 !important;  
                    color: #333 !important;  
                    border-color: #FFE890 !important;  
                }  
                /* Звичайні якості */  
                .quality-4k {  
                    background: #333333 !important;  
                    border-color: #555555 !important;  
                }  
                .quality-fhd {  
                    background: #32CD32 !important;  
                    color: #333 !important;  
                    border-color: #90EE90 !important;  
                }  
                .quality-hd {  
                    background: #808080 !important;  
                    border-color: #A9A9A9 !important;  
                }  
                .quality-sd {  
                    background: #696969 !important;  
                    border-color: #808080 !important;  
                }  
            `;  
              
            document.head.appendChild(styleElement);  
        },  
  
        /**  
         * Додавання бейджа якості до картки  
         */  
        addQualityBadge: function(card, quality, source, qCacheKey) {  
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
                  
                // Додаємо спеціальні класи для 4K DV та 4K HDR  
                if (quality.includes('4K DV')) {  
                    qualityInner.className = 'quality-4k-dv';  
                } else if (quality.includes('4K HDR')) {  
                    qualityInner.className = 'quality-4k-hdr';  
                } else if (quality === '4K') {  
                    qualityInner.className = 'quality-4k';  
                } else if (quality === 'FHD') {  
                    qualityInner.className = 'quality-fhd';  
                } else if (quality === 'HD') {  
                    qualityInner.className = 'quality-hd';  
                } else if (quality === 'SD') {  
                    qualityInner.className = 'quality-sd';  
                }  
                  
                qualityInner.textContent = Utils.escapeHtml(quality);  
                qualityDiv.appendChild(qualityInner);  
                cardView.appendChild(qualityDiv);  
            }  
        }  
    };  
  
    // =======================================================  
    // VI. ОСНОВНІ ФУНКЦІЇ  
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
     * Функція отримання якості з JacRed  
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
  
            var timeoutId = setTimeout(function() {  
                if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: ' + strategyName + ' request timed out', { cardId: cardId });  
                apiCallback(null);  
            }, PROXY_TIMEOUT * PROXY_LIST.length + 1000);  
  
            API.fetchWithProxyRetry(apiUrl, cardId, function(error, responseText) {  
                clearTimeout(timeoutId);  
                if (error) {  
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
                        if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: ' + strategyName + ' received no torrents', { cardId: cardId });  
                        apiCallback(null);  
                        return;  
                    }  
                      
                    var bestNumericQuality = -1;  
                    var bestFoundTorrent = null;  
                    var bestFoundDolbyVision = false;  
                    var bestFoundHDR = false;  
  
                    for (var i = 0; i < torrents.length; i++) {  
                        var currentTorrent = torrents[i];  
                        var currentNumericQuality = currentTorrent.quality;  
                            
                        var lowerTitle = (currentTorrent.title || '').toLowerCase();  
                            
                        // Визначення Dolby Vision та HDR для поточного торрента  
                        var hasDolbyVision = /\b(dv|dolby\s*vision)\b/i.test(lowerTitle);  
                        var hasHDR = /\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(lowerTitle);  
                            
                        if (/\b(ts|telesync|camrip|cam)\b/i.test(lowerTitle)) {  
                           if (currentNumericQuality < 720) continue;  
                        }  
  
                        if (typeof currentNumericQuality !== 'number' || currentNumericQuality === 0) {  
                           continue;  
                        }  
  
                        if (Q_LOGGING) {  
                            Utils.logWithContext('log', 'Torrent quality detected', {  
                                title: currentTorrent.title,  
                                quality: currentNumericQuality + 'p',  
                                hasDV: hasDolbyVision,  
                                hasHDR: hasHDR  
                            });  
                        }  
                            
                        // Зберігаємо інформацію про якість, DV та HDR  
                        if (currentNumericQuality > bestNumericQuality) {  
                            bestNumericQuality = currentNumericQuality;  
                            bestFoundTorrent = currentTorrent;  
                            bestFoundDolbyVision = hasDolbyVision;  
                            bestFoundHDR = hasHDR;  
                        }  
                    }  
                      
                    if (bestFoundTorrent) {  
                        if (Q_LOGGING) Utils.logWithContext('log', 'Found best torrent', {  
                            title: bestFoundTorrent.title,  
                            quality: bestNumericQuality + 'p',  
                            hasDV: bestFoundDolbyVision,  
                            hasHDR: bestFoundHDR  
                        });  
                          
                        apiCallback({  
                            quality: translateQuality(bestFoundTorrent.quality || bestNumericQuality, bestFoundDolbyVision, bestFoundHDR),  
                            title: bestFoundTorrent.title,  
                            hasDolbyVision: bestFoundDolbyVision,  
                            hasHDR: bestFoundHDR  
                        });  
                    } else {  
                        if (Q_LOGGING) Utils.logWithContext('log', 'No suitable torrents found', { cardId: cardId });  
                        apiCallback(null);  
                    }  
                } catch (e) {  
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
                name: 'Original title exact'  
            });  
            searchStrategies.push({  
                title: normalizedCard.original_title.trim(),  
                year: year,  
                exact: false,  
                name: 'Original title fuzzy'  
            });  
        }  
        if (normalizedCard.title && /[a-zа-яё0-9]/i.test(normalizedCard.title)) {  
            searchStrategies.push({  
                title: normalizedCard.title.trim(),  
                year: year,  
                exact: true,  
                name: 'Localized title exact'  
            });  
            searchStrategies.push({  
                title: normalizedCard.title.trim(),  
                year: year,  
                exact: false,  
                name: 'Localized title fuzzy'  
            });  
        }  
  
        function executeNextStrategy(index) {  
            if (index >= searchStrategies.length) {  
                if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: All strategies exhausted', { cardId: cardId });  
                callback(null);  
                return;  
            }  
              
            var strategy = searchStrategies[index];  
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {  
                if (result && result.quality) {  
                    if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: Successfully found quality: ' + result.quality);  
                    callback(result);  
                } else {  
                    executeNextStrategy(index + 1);  
                }  
            });  
        }  
  
        if (searchStrategies.length > 0) {  
            executeNextStrategy(0);  
        } else {  
            if (Q_LOGGING) Utils.logWithContext('log', 'JacRed: No valid search titles.', { cardId: cardId });  
            callback(null);  
        }  
    }  
  
    // Функції для роботи з кешем якості  
    function getQualityCache(key) {  
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};  
        var item = cache[key];  
        return item && (Date.now() - item.timestamp < Q_CACHE_TIME) ? item : null;  
    }  
  
    function saveQualityCache(key, data, localCurrentCard) {  
        if (Q_LOGGING) Utils.logWithContext('log', 'Save quality cache', { cardId: localCurrentCard });  
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};  
        cache[key] = {  
            quality: data.quality || null,  
            timestamp: Date.now()  
        };  
        Lampa.Storage.set(QUALITY_CACHE, cache);  
    }  
  
    // Основна функція оновлення карток  
    function updateCards(cards) {  
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            if (card.hasAttribute('data-quality-added')) continue;  
                
            var cardView = card.querySelector('.card__view');  
            if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false') {  
                if (cardView) {  
                    var typeElements = cardView.getElementsByClassName('card__type');  
                    if (typeElements.length > 0) continue;  
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
                var cacheQualityData = getQualityCache(qCacheKey);  
                    
                // Якщо є кеш - одразу застосовуємо  
                if (cacheQualityData) {  
                    if (Q_LOGGING) Utils.logWithContext('log', 'Get Quality data from cache', { cardId: localCurrentCard });  
                    UI.addQualityBadge(currentCard, cacheQualityData.quality, 'Cache', qCacheKey);  
                }  
                // Якщо немає кешу - запитуємо у JacRed  
                else {  
                    getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult) {  
                        var quality = (jrResult && jrResult.quality) || null;  
                        UI.addQualityBadge(currentCard, quality, 'JacRed', qCacheKey);  
                    });  
                }  
            })(card);  
        }  
    }  
  
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
          
        // Очищення кешу при старті  
        Cache.cleanup();  
          
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
