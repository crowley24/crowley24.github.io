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
    if (typeof performance === 'undefined' || !performance.now) {  
        window.performance = {  
            now: function () {  
                return Date.now();  
            }  
        };  
    }  
  
    // Конфігурація плагіна  
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
  
    // Стилі для відображення якості  
    var style = document.createElement('style');  
    style.textContent = `  
        .maxsm-quality {  
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
        .maxsm-quality.dolby-vision {  
            background: linear-gradient(45deg, #0099ff, #66ccff);  
            color: white;  
        }  
        .maxsm-quality.hdr {  
            background: linear-gradient(45deg, #ff6600, #ffcc00);  
            color: black;  
        }  
    `;  
    document.head.appendChild(style);  
  
    // Функція логування  
    function log(message) {  
        if (Q_LOGGING && console && console.log) {  
            console.log('[MAXSM-Quality]', message);  
        }  
    }  
  
    // Функція вимірювання часу виконання  
    function logExecution(functionName, startTime, message) {  
        if (Q_LOGGING && console && console.log) {  
            var endTime = performance.now();  
            var duration = (endTime - startTime).toFixed(2);  
            console.log('[MAXSM-Quality]', functionName + ' виконано за ' + duration + 'ms - ' + message);  
        }  
    }  
  
    // Функція перекладу якості з підтримкою Dolby Vision та HDR  
    function translateQuality(quality, isCamrip, title) {  
        if (isCamrip) {  
            return 'Екранка';  
        }  
          
        var lowerTitle = (title || '').toLowerCase();  
          
        // Перевірка на Dolby Vision для 4K  
        if (typeof quality === 'number' && quality >= 2160) {  
            if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
                return '4K DV';  
            } else if (/\bhdr\b/i.test(lowerTitle)) {  
                return '4K HDR';  
            } else {  
                return '4K';  
            }  
        }  
          
        // Перевірка на HDR для інших якостей  
        if (typeof quality === 'number' && quality >= 1080) {  
            if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
                return 'FHD DV';  
            } else if (/\bhdr\b/i.test(lowerTitle)) {  
                return 'FHD HDR';  
            } else {  
                return 'FHD';  
            }  
        }  
          
        if (typeof quality === 'number' && quality >= 720) {  
            return 'HD';  
        }  
          
        if (typeof quality === 'number' && quality >= 480) {  
            return 'SD';  
        }  
          
        return '';  
    }  
  
    // Функція отримання CSS класу для якості  
    function getQualityClass(quality) {  
        if (quality.includes('DV')) {  
            return 'dolby-vision';  
        } else if (quality.includes('HDR')) {  
            return 'hdr';  
        }  
        return '';  
    }  
  
    // Функція аналізу торрентів  
    function analyzeTorrents(movieData) {  
        var startTime = performance.now();  
        log('Початок аналізу торрентів для: ' + (movieData.title || movieData.original_title));  
          
        return new Promise(function(resolve, reject) {  
            var cacheKey = QUALITY_CACHE + ':' + (movieData.title || movieData.original_title) + ':' + movieData.year;  
              
            // Перевірка кешу  
            var cached = localStorage.getItem(cacheKey);  
            if (cached) {  
                try {  
                    var cachedData = JSON.parse(cached);  
                    if (Date.now() - cachedData.timestamp < Q_CACHE_TIME) {  
                        log('Використано кешовані дані');  
                        logExecution('analyzeTorrents', startTime, 'з кешу');  
                        resolve(cachedData.quality);  
                        return;  
                    }  
                } catch (e) {  
                    log('Помилка розбору кешу: ' + e.message);  
                }  
            }  
              
            // Запит до JacRed API  
            var apiUrl = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' +   
                encodeURIComponent(movieData.title || movieData.original_title) +   
                '&year=' + movieData.year +   
                '&apikey=' + JACRED_API_KEY;  
              
            fetch(apiUrl)  
                .then(function(response) {  
                    if (!response.ok) {  
                        throw new Error('HTTP ' + response.status);  
                    }  
                    return response.json();  
                })  
                .then(function(data) {  
                    if (!data || !Array.isArray(data) || data.length === 0) {  
                        log('Торренти не знайдено');  
                        resolve(null);  
                        return;  
                    }  
                      
                    // Пошук найкращої якості  
                    var bestQuality = null;  
                    var bestTorrent = null;  
                      
                    for (var i = 0; i < data.length; i++) {  
                        var torrent = data[i];  
                        var currentQuality = translateQuality(torrent.quality, false, torrent.title || torrent.name);  
                          
                        if (!bestQuality || torrent.quality > bestTorrent.quality) {  
                            bestQuality = currentQuality;  
                            bestTorrent = torrent;  
                        }  
                    }  
                      
                    // Збереження в кеш  
                    var cacheData = {  
                        quality: bestQuality,  
                        timestamp: Date.now()  
                    };  
                    localStorage.setItem(cacheKey, JSON.stringify(cacheData));  
                      
                    log('Найкраща якість: ' + bestQuality);  
                    logExecution('analyzeTorrents', startTime, 'з API');  
                    resolve(bestQuality);  
                })  
                .catch(function(error) {  
                    log('Помилка запиту: ' + error.message);  
                    reject(error);  
                });  
        });  
    }  
  
    // Функція оновлення карток  
    function updateCards(cards) {  
        var startTime = performance.now();  
        log('Оновлення ' + cards.length + ' карток');  
          
        var promises = [];  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            var movieData = extractMovieData(card);  
              
            if (movieData) {  
                promises.push(  
                    analyzeTorrents(movieData)  
                        .then(function(quality) {  
                            if (quality) {  
                                updateCardQuality(this.card, quality);  
                            }  
                        }.bind({ card: card }))  
                        .catch(function(error) {  
                            log('Помилка аналізу картки: ' + error.message);  
                        })  
                );  
            }  
        }  
          
        Promise.all(promises).then(function() {  
            logExecution('updateCards', startTime, 'всі картки оновлено');  
        });  
    }  
  
    // Функція отримання даних про фільм з картки  
    function extractMovieData(card) {  
        try {  
            var titleElement = card.querySelector('.card__title') ||   
                              card.querySelector('[data-title]') ||   
                              card.querySelector('.title');  
              
            var yearElement = card.querySelector('.card__year') ||   
                             card.querySelector('[data-year]') ||   
                             card.querySelector('.year');  
              
            if (!titleElement) {  
                return null;  
            }  
              
            return {  
                title: titleElement.textContent || titleElement.getAttribute('data-title'),  
                year: parseInt(yearElement.textContent || yearElement.getAttribute('data-year')) || 0,  
                original_title: titleElement.getAttribute('data-original-title')  
            };  
        } catch (e) {  
            log('Помилка отримання даних з картки: ' + e.message);  
            return null;  
        }  
    }  
  
    // Функція оновлення якості на картці  
    function updateCardQuality(card, quality) {  
        try {  
            var existingQuality = card.querySelector('.maxsm-quality');  
            if (existingQuality) {  
                existingQuality.remove();  
            }  
              
            var qualityElement = document.createElement('div');  
            qualityElement.className = 'maxsm-quality ' + getQualityClass(quality);  
            qualityElement.textContent = quality;  
              
            card.style.position = 'relative';  
            card.appendChild(qualityElement);  
              
            log('Якість оновлено: ' + quality);  
        } catch (e) {  
            log('Помилка оновлення якості: ' + e.message);  
        }  
    }  
  
    // Основна функція плагіна  
    function startPlugin() {  
        var startTime = performance.now();  
        log('Запуск плагіна якості!');  
        window.sursQualityPlugin = true;  
  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'complite') {  
                var render = e.object.activity.render();  
                fetchQualityForCard(e.data.movie, render);  
            }  
        });  
        logExecution('startPlugin', startTime, 'Плагін запущено');  
    }  
  
    // Функція для повного екрану  
    function fetchQualityForCard(movieData, renderElement) {  
        if (!movieData) return;  
          
        analyzeTorrents(movieData)  
            .then(function(quality) {  
                if (quality && renderElement) {  
                    updateCardQuality(renderElement, quality);  
                }  
            })  
            .catch(function(error) {  
                log('Помилка отримання якості: ' + error.message);  
            });  
    }  
  
    // Запуск плагіна  
    if (!window.sursQualityPlugin) {  
        startPlugin();  
    }  
})();
