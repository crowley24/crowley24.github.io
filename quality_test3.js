(function () {  
    'use strict';  
  
    // Polyfill for AbortController and AbortSignal  
    if (typeof AbortController === 'undefined') {  
        window.AbortController = function () {  
            this.signal = {  
                aborted: false,  
                addEventListener: function (event, callback) {  
                    if (event === 'abort') {  
                        this._onabort = callback;  
                    }  
                }  
            };  
            this.abort = function () {  
                this.signal.aborted = true;  
                if (typeof this.signal._onabort === 'function') {  
                    this.signal._onabort();  
                }  
            };  
        };  
    }  
  
    // Polyfill for performance.now  
    if (!window.performance || !window.performance.now) {  
        window.performance = {  
            now: function () {  
                return Date.now();  
            }  
        };  
    }  
  
    // Конфігурація  
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
  
    // CSS стилі для відображення якості  
    var style = document.createElement('style');  
    style.textContent = `  
        .quality-badge {  
            position: absolute;  
            top: 5px;  
            right: 5px;  
            background: rgba(0, 0, 0, 0.8);  
            color: white;  
            padding: 2px 6px;  
            border-radius: 3px;  
            font-size: 11px;  
            font-weight: bold;  
            z-index: 10;  
            text-transform: uppercase;  
        }  
        .quality-badge.dolby-vision {  
            background: linear-gradient(45deg, #0066cc, #00ccff);  
            box-shadow: 0 0 10px rgba(0, 204, 255, 0.5);  
        }  
        .quality-badge.hdr {  
            background: linear-gradient(45deg, #ff6600, #ffcc00);  
            box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);  
        }  
        .quality-badge.uhd {  
            background: linear-gradient(45deg, #9b59b6, #e74c3c);  
            box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);  
        }  
    `;  
    document.head.appendChild(style);  
  
    // Функція логування  
    function log(message) {  
        if (Q_LOGGING) {  
            console.log('[QUALITY]', message);  
        }  
    }  
  
    // Функція визначення якості з назви торрента  
    function translateQuality(title) {  
        if (!title) return '';  
          
        var lowerTitle = title.toLowerCase();  
          
        // Перевірка на Dolby Vision  
        if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
            if (/\b(4k|uhd|2160p)\b/i.test(lowerTitle)) {  
                return '4K DV';  
            } else if (/\b(1080p|fhd)\b/i.test(lowerTitle)) {  
                return 'FHD DV';  
            }  
        }  
          
        // Перевірка на HDR  
        if (/\b(hdr10|hdr)\b/i.test(lowerTitle)) {  
            if (/\b(4k|uhd|2160p)\b/i.test(lowerTitle)) {  
                return '4K HDR';  
            } else if (/\b(1080p|fhd)\b/i.test(lowerTitle)) {  
                return 'FHD HDR';  
            }  
        }  
          
        // Стандартна якість  
        if (/\b(4k|uhd|2160p)\b/i.test(lowerTitle)) {  
            return '4K';  
        } else if (/\b(1080p|fhd)\b/i.test(lowerTitle)) {  
            return 'FHD';  
        } else if (/\b(720p|hd)\b/i.test(lowerTitle)) {  
            return 'HD';  
        } else if (/\b(480p|sd)\b/i.test(lowerTitle)) {  
            return 'SD';  
        }  
          
        return '';  
    }  
  
    // Функція отримання CSS класу для якості  
    function getQualityClass(quality) {  
        if (!quality) return '';  
          
        if (quality.includes('DV')) {  
            return 'dolby-vision';  
        } else if (quality.includes('HDR')) {  
            return 'hdr';  
        } else if (quality.includes('4K')) {  
            return 'uhd';  
        }  
          
        return '';  
    }  
  
    // Функція запиту до JacRed API  
    function fetchQualityFromJacRed(title, year) {  
        return new Promise(function(resolve, reject) {  
            var apiUrl = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' +   
                         encodeURIComponent(title) + '&year=' + year + '&apikey=' + JACRED_API_KEY;  
              
            // Спроба прямого запиту  
            fetch(apiUrl)  
                .then(function(response) {  
                    if (response.ok) {  
                        return response.json();  
                    }  
                    throw new Error('Direct request failed');  
                })  
                .then(function(data) {  
                    if (data && data.results && data.results.length > 0) {  
                        var bestQuality = findBestQuality(data.results);  
                        resolve(bestQuality);  
                    } else {  
                        resolve('');  
                    }  
                })  
                .catch(function() {  
                    // Спроба через проксі  
                    tryProxyRequest(apiUrl)  
                        .then(resolve)  
                        .catch(reject);  
                });  
        });  
    }  
  
    // Функція запиту через проксі  
    function tryProxyRequest(url) {  
        return new Promise(function(resolve, reject) {  
            var proxyIndex = 0;  
              
            function tryNextProxy() {  
                if (proxyIndex >= PROXY_LIST.length) {  
                    reject(new Error('All proxies failed'));  
                    return;  
                }  
                  
                var proxyUrl = PROXY_LIST[proxyIndex] + encodeURIComponent(url);  
                  
                fetch(proxyUrl)  
                    .then(function(response) {  
                        if (response.ok) {  
                            return response.json();  
                        }  
                        throw new Error('Proxy request failed');  
                    })  
                    .then(function(data) {  
                        if (data && data.results && data.results.length > 0) {  
                            var bestQuality = findBestQuality(data.results);  
                            resolve(bestQuality);  
                        } else {  
                            resolve('');  
                        }  
                    })  
                    .catch(function() {  
                        proxyIndex++;  
                        tryNextProxy();  
                    });  
            }  
              
            tryNextProxy();  
        });  
    }  
  
    // Функція пошуку найкращої якості  
    function findBestQuality(torrents) {  
        var bestQuality = '';  
        var bestScore = -1;  
          
        torrents.forEach(function(torrent) {  
            var quality = translateQuality(torrent.title || torrent.name);  
            var score = getQualityScore(quality);  
              
            if (score > bestScore) {  
                bestScore = score;  
                bestQuality = quality;  
            }  
        });  
          
        return bestQuality;  
    }  
  
    // Функція оцінки якості  
    function getQualityScore(quality) {  
        if (!quality) return 0;  
          
        if (quality.includes('DV')) return 100;  
        if (quality.includes('HDR')) return 90;  
        if (quality.includes('4K')) return 80;  
        if (quality.includes('FHD')) return 70;  
        if (quality.includes('HD')) return 60;  
        if (quality.includes('SD')) return 50;  
          
        return 0;  
    }  
  
    // Функція отримання якості з кешу  
    function getQualityFromCache(title, year) {  
        try {  
            var cacheKey = title + '_' + year;  
            var cached = localStorage.getItem(QUALITY_CACHE);  
              
            if (cached) {  
                var cache = JSON.parse(cached);  
                var item = cache[cacheKey];  
                  
                if (item && (Date.now() - item.timestamp) < Q_CACHE_TIME) {  
                    return item.quality;  
                }  
            }  
        } catch (e) {  
            log('Cache read error: ' + e.message);  
        }  
          
        return null;  
    }  
  
    // Функція збереження якості в кеш  
    function saveQualityToCache(title, year, quality) {  
        try {  
            var cacheKey = title + '_' + year;  
            var cached = localStorage.getItem(QUALITY_CACHE);  
            var cache = cached ? JSON.parse(cached) : {};  
              
            cache[cacheKey] = {  
                quality: quality,  
                timestamp: Date.now()  
            };  
              
            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));  
        } catch (e) {  
            log('Cache write error: ' + e.message);  
        }  
    }  
  
    // Функція отримання інформації про фільм з картки  
    function getMovieInfoFromCard(card) {  
        var titleElement = card.querySelector('.card__title') ||   
                          card.querySelector('[data-title]') ||  
                          card.querySelector('h3') ||  
                          card.querySelector('.title');  
          
        var yearElement = card.querySelector('.card__year') ||   
                         card.querySelector('[data-year]') ||  
                         card.querySelector('.year');  
          
        var title = titleElement ? titleElement.textContent.trim() : '';  
        var year = yearElement ? parseInt(yearElement.textContent.trim()) : new Date().getFullYear();  
          
        return { title: title, year: year };  
    }  
  
    // Функція створення бейджа якості  
    function createQualityBadge(quality) {  
        if (!quality) return null;  
          
        var badge = document.createElement('div');  
        badge.className = 'quality-badge ' + getQualityClass(quality);  
        badge.textContent = quality;  
          
        return badge;  
    }  
  
    // Функція оновлення картки  
    function updateCard(card) {  
        var movieInfo = getMovieInfoFromCard(card);  
          
        if (!movieInfo.title) {  
            log('No title found for card');  
            return;  
        }  
          
        // Перевірка кешу  
        var cachedQuality = getQualityFromCache(movieInfo.title, movieInfo.year);  
        if (cachedQuality) {  
            addQualityToCard(card, cachedQuality);  
            return;  
        }  
          
        // Запит до API  
        fetchQualityFromJacRed(movieInfo.title, movieInfo.year)  
            .then(function(quality) {  
                if (quality) {  
                    saveQualityToCache(movieInfo.title, movieInfo.year, quality);  
                    addQualityToCard(card, quality);  
                }  
            })  
            .catch(function(error) {  
                log('Error fetching quality: ' + error.message);  
            });  
    }  
  
    // Функція додавання якості до картки  
    function addQualityToCard(card, quality) {  
        // Перевірка чи вже є бейдж  
        var existingBadge = card.querySelector('.quality-badge');  
        if (existingBadge) {  
            existingBadge.remove();  
        }  
          
        var badge = createQualityBadge(quality);  
        if (badge) {  
            // Пошук контейнера для постера  
            var posterContainer = card.querySelector('.card__img') ||  
                               card.querySelector('.card__poster') ||  
                               card.querySelector('img') ||  
                               card;  
              
            posterContainer.style.position = 'relative';  
            posterContainer.appendChild(badge);  
              
            log('Added quality badge: ' + quality);  
        }  
    }  
  
    // Функція оновлення всіх карток  
    function updateAllCards() {  
        var cards = document.querySelectorAll('.card, .movie-card, [data-movie-id]');  
        log('Found ' + cards.length + ' cards');  
          
        cards.forEach(function(card) {  
            updateCard(card);  
        });  
    }  
  
    // Функція спостереження за змінами DOM  
    function setupMutationObserver() {  
        var observer = new MutationObserver(function(mutations) {  
            var shouldUpdate = false;  
              
            mutations.forEach(function(mutation) {  
                if (mutation.type === 'childList') {  
                    mutation.addedNodes.forEach(function(node) {  
                        if (node.nodeType === Node.ELEMENT_NODE) {  
                            if (node.classList &&   
                                (node.classList.contains('card') ||   
                                 node.classList.contains('movie-card') ||  
                                 node.hasAttribute('data-movie-id'))) {  
                                shouldUpdate = true;  
                            } else if (node.querySelector) {  
                                var cards = node.querySelectorAll('.card, .movie-card, [data-movie-id]');  
                                if (cards.length > 0) {  
                                    shouldUpdate = true;  
                                }  
                            }  
                        }  
                    });  
                }  
            });  
              
            if (shouldUpdate) {  
                setTimeout(updateAllCards, 1000);  
            }  
        });  
          
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
          
        return observer;  
    }  
  
    // Основна функція запуску плагіна  
    function startPlugin() {  
        log('Starting quality plugin');  
          
        // Перевірка наявності необхідних елементів  
        if (!document.body) {  
            log('Document body not ready');  
            setTimeout(startPlugin, 1000);  
            return;  
        }  
          
        // Налаштування спостерігача  
        var observer = setupMutationObserver();  
          
        // Початкове оновлення карток  
        setTimeout(updateAllCards, 2000);  
          
        // Періодичне оновлення  
        setInterval(updateAllCards, 30000);  
          
        log('Quality plugin started successfully');  
    }  
  
    // Запуск плагіна  
    if (!window.qualityPluginLoaded) {  
        window.qualityPluginLoaded = true;  
          
        if (document.readyState === 'loading') {  
            document.addEventListener('DOMContentLoaded', startPlugin);  
        } else {  
            startPlugin();  
        }  
    }  
})();
