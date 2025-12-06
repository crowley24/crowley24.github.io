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
        /**  
         * Покращене визначення якості з розширеними патернами  
         */  
        detectQuality: function(torrentTitle) {  
            if (!torrentTitle) return null;  
              
            var title = torrentTitle.toLowerCase();  
              
            // Комбіновані формати з пріоритетом  
            if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';  
            if (/\b(4k.*hdr10\+|2160p.*hdr10\+|uhd.*hdr10\+|3840x2160.*hdr10\+)\b/i.test(title)) return '4K HDR10+';  
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
            var priority = ['4K DV', '4K HDR10+', '4K HDR', '4K', '2K', 'FHD', 'HDR10+', 'HDR', 'HD', 'SD'];  
              
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
        Wiki

Share

yumata/lampa
(function () { 'use strict'; // ======================================================= // I. КОНФІГУРАЦІЯ // ======================================================= v...
Show full text
Fast
Looking at your code, you're implementing a quality badge system for Lampa movie cards. The addQualityBadge function is incomplete, and you want to add 3D text effects to the badges. uk.js:119-122

Summary
Your code already has a foundation for 3D effects with text-shadow in the initStyles function. To enhance the 3D text effect, you can modify the existing CSS rules in the .card__quality div selector.

Implementation
The 3D text effect can be achieved by enhancing the existing text-shadow property in your initStyles function. Here's where the current text styling is defined:

.card__quality div {  
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;  
    // ... other properties  
}
To create a more pronounced 3D effect, you can stack multiple text shadows:

.card__quality div {  
    text-shadow:   
        0 1px 0 #ccc,  
        0 2px 0 #c9c9c9,  
        0 3px 0 #bbb,  
        0 4px 0 #b9b9b9,  
        0 5px 0 #aaa,  
        0 6px 1px rgba(0,0,0,.1),  
        0 0 5px rgba(0,0,0,.1),  
        0 1px 3px rgba(0,0,0,.3),  
        0 3px 5px rgba(0,0,0,.2),  
        0 5px 10px rgba(0,0,0,.25),  
        0 10px 10px rgba(0,0,0,.2),  
        0 20px 20px rgba(0,0,0,.15) !important;  
}
Complete addQualityBadge Function
Your addQualityBadge function appears to be cut off. Here's how it should be completed:

addQualityBadge: function(card, quality) {  
    if (!document.body.contains(card)) return;  
      
    card.setAttribute('data-quality-added', 'true');  
    var cardView = card.querySelector('.card__view');  
    if (!cardView) return;  
  
    // Remove existing quality elements  
    var existingQualityElements = cardView.getElementsByClassName('card__quality');  
    while(existingQualityElements.length > 0) {  
        existingQualityElements[0].parentNode.removeChild(existingQualityElements[0]);  
    }  
  
    if (quality && quality !== null) {  
        var qualityElement = document.createElement('div');  
        qualityElement.className = 'card__quality';  
        qualityElement.setAttribute('data-quality', quality);  
          
        var qualityBadge = document.createElement('div');  
        qualityBadge.textContent = quality;  
          
        qualityElement.appendChild(qualityBadge);  
        cardView.appendChild(qualityElement);  
    }  
}
Notes
The 3D text effect uses layered text shadows to create depth
You may need to adjust the shadow colors based on your badge background colors for better contrast
The existing text-shadow in your code provides a subtle effect, while the enhanced version creates a more dramatic 3D appearance
Consider performance implications - multiple text shadows can impact rendering performance on lower-end devices
Wiki pages you might want to explore:

Internationalization (yumata/lampa)



yumata/lampa
lang/uk.js


    settings_rest_tmdb_example: 'Наприклад:',
    settings_rest_tmdb_api_descr: 'Для отримання даних',
    settings_rest_tmdb_image_descr: 'Для отримання зображень',
    settings_rest_card_quality: 'Відмітки якості',
    settings_rest_card_quality_descr: 'Відображати позначки якості на картках',
    settings_rest_card_episodes: 'Відмітки епізодів',
    settings_rest_card_episodes_descr: 'Показувати позначки епізодів на картках',
    settings_parser_use: 'Використовувати парсер',
    settings_parser_use_descr: 'Тим самим ви погоджуєтесь взяти на себе всю відповідальність за використання публічних посилань для перегляду торрент та онлайн контенту.',
    settings_parser_type: 'Тип парсера для торентів',

yumata/lampa
На українській 
Fast
Відповідь українською
Ви реалізуєте систему бейджів якості для карток фільмів Lampa. Функція addQualityBadge незавершена, і ви хочете додати 3D ефекти тексту до бейджів. uk.js:119-122

Підсумок
Ваш код вже має основу для 3D ефектів з text-shadow у функції initStyles. Для покращення 3D ефекту тексту можна змінити існуючі правила CSS у селекторі .card__quality div.

Реалізація
3D ефект тексту можна досягти, посиливши існуючу властивість text-shadow у вашій функції initStyles. Ось де визначено поточне стилізування тексту:

.card__quality div {  
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;  
    // ... інші властивості  
}
Для створення більш вираженого 3D ефекту можна стекувати кілька тіней тексту:

.card__quality div {  
    text-shadow:   
        0 1px 0 #ccc,  
        0 2px 0 #c9c9c9,  
        0 3px 0 #bbb,  
        0 4px 0 #b9b9b9,  
        0 5px 0 #aaa,  
        0 6px 1px rgba(0,0,0,.1),  
        0 0 5px rgba(0,0,0,.1),  
        0 1px 3px rgba(0,0,0,.3),  
        0 3px 5px rgba(0,0,0,.2),  
        0 5px 10px rgba(0,0,0,.25),  
        0 10px 10px rgba(0,0,0,.2),  
        0 20px 20px rgba(0,0,0,.15) !important;  
}
Повна функція addQualityBadge
Ваша функція addQualityBadge здається обрізаною. Ось як вона має бути завершена:

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
  
    if (quality && quality !== null) {  
        var qualityElement = document.createElement('div');  
        qualityElement.className = 'card__quality';  
        qualityElement.setAttribute('data-quality', quality);  
          
        var qualityBadge = document.createElement('div');  
        qualityBadge.textContent = quality;  
          
        qualityElement.appendChild(qualityBadge);  
        cardView.appendChild(qualityElement);  
    }  
}
Примітки
3D ефект тексту використовує шаруваті тіні тексту для створення глибини
Можливо, потрібно буде налаштувати кольори тіней залежно від кольорів фону ваших бейджів для кращого контрасту
Існуючий text-shadow у вашому коді забезпечує тонкий ефект, тоді як покращена версія створює більш драматичний 3D вигляд
Варто враховувати продуктивність - множинні тіні тексту можуть впливати на рендеринг на пристроях нижчого класу
Сторінки вікі, які можуть бути корисними:

Інтернаціоналізація (yumata/lampa)
Wiki pages you might want to explore:

Settings System (yumata/lampa)
Platform Support (yumata/lampa)



yumata/lampa
lang/uk.js


    settings_rest_tmdb_example: 'Наприклад:',
    settings_rest_tmdb_api_descr: 'Для отримання даних',
    settings_rest_tmdb_image_descr: 'Для отримання зображень',
    settings_rest_card_quality: 'Відмітки якості',
    settings_rest_card_quality_descr: 'Відображати позначки якості на картках',
    settings_rest_card_episodes: 'Відмітки епізодів',
    settings_rest_card_episodes_descr: 'Показувати позначки епізодів на картках',
    settings_parser_use: 'Використовувати парсер',
    settings_parser_use_descr: 'Тим самим ви погоджуєтесь взяти на себе всю відповідальність за використання публічних посилань для перегляду торрент та онлайн контенту.',
    settings_parser_type: 'Тип парсера для торентів',

yumata/lampa
.card__quality { position: absolute !important; bottom: 0.3em !important; left: -0.8em !important; background-color: tra...
Show full text
Fast
View as codemap
Оновлені стилі для бейджа якості
Ось ваші оновлені стилі CSS з більшим розміром та 3D ефектом тексту, з збереженням анімації пульсації:

.card__quality {          
    position: absolute !important;          
    bottom: 0.3em !important;          
    left: -0.8em !important;          
    background-color: transparent !important;          
    z-index: 10;          
    width: fit-content !important;          
    min-width: 3.5em !important;  /* Збільшено з 3em */  
    max-width: calc(100% - 1em) !important;          
}          
.card__quality div {          
    text-transform: none !important;          
    border: 2px solid #FFFFFF !important;          
    color: #FFFFFF !important;          
    font-weight: bold !important;          
    font-style: normal !important;          
    font-size: 1.5em !important;  /* Збільшено з 1.3em */  
    border-radius: 3px !important;          
    padding: 0.3em 0.6em !important;  /* Збільшено з 0.25em 0.5em */  
    transition: all 0.3s ease !important;          
    box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;          
    /* 3D ефект тексту з кількома шарами тіней */  
    text-shadow:   
        0 1px 0 #ccc,  
        0 2px 0 #c9c9c9,  
        0 3px 0 #bbb,  
        0 4px 0 #b9b9b9,  
        0 5px 0 #aaa,  
        0 6px 1px rgba(0,0,0,.1),  
        0 0 5px rgba(0,0,0,.1),  
        0 1px 3px rgba(0,0,0,.3),  
        0 3px 5px rgba(0,0,0,.2),  
        0 5px 10px rgba(0,0,0,.25),  
        0 10px 10px rgba(0,0,0,.2),  
        0 20px 20px rgba(0,0,0,.15) !important;          
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
  
@keyframes fadeIn {          
    from { opacity: 0; transform: scale(0.8); }          
    to { opacity: 1; transform: scale(1); }          
}          
.card__quality {          
    animation: fadeIn 0.3s ease-out;          
}    
  
/* Градієнтні схеми залишаються без змін */          
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
/* Усі інші - градієнтний чорний */          
.card__quality div:not([data-quality*="4K"]):not([data-quality*="FHD"]):not([data-quality*="2K"]):not([data-quality*="HD"]):not([data-quality*="SD"]) {          
    border-color: #FFFFFF !important;          
    background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.5) 100%) !important;          
}       
  
/* Адаптивність для різних розмірів екрану */      
@media (max-width: 768px) {      
    .card__quality div {      
        font-size: 1.2em !important;  /* Збільшено з 1em */  
        padding: 0.2em 0.4em !important;  /* Збільшено з 0.15em 0.3em */  
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
  
            if (quality && quality
