//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
    'use strict';  
  
    // =======================================================  
    // КОНФІГУРАЦІЯ  
    // =======================================================  
    var Config = {  
        Q_LOGGING: true,  
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',  
          
        // JacRed API  
        JACRED_PROTOCOL: 'http://',  
        JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',  
          
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
          
        // TTL кешування  
        TTL: {  
            quality: 24 * 60 * 60 * 1000,  
            error: 5 * 60 * 1000,  
            no_quality: 60 * 60 * 1000  
        }  
    };  
  
    // SVG іконки з першого плагіна  
    var pluginPath = 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/';  
    var svgIcons = {  
        '4K': pluginPath + 'Quality_ico/4K.svg',  
        '2K': pluginPath + 'Quality_ico/2K.svg',  
        'FULL HD': pluginPath + 'Quality_ico/FULL HD.svg',  
        'HD': pluginPath + 'Quality_ico/HD.svg',  
        'HDR': pluginPath + 'Quality_ico/HDR.svg',  
        'Dolby Vision': pluginPath + 'Quality_ico/Dolby Vision.svg',  
        '7.1': pluginPath + 'Quality_ico/7.1.svg',  
        '5.1': pluginPath + 'Quality_ico/5.1.svg',  
        '4.0': pluginPath + 'Quality_ico/4.0.svg',  
        '2.0': pluginPath + 'Quality_ico/2.0.svg',  
        'DUB': pluginPath + 'Quality_ico/DUB.svg'  
    };  
  
    // =======================================================  
    // МОДУЛЬ УТИЛІТ  
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
  
        logWithContext: function(level, message, context) {  
            if (Config.Q_LOGGING) {  
                console[level]('MAXSM-RATINGS:', message, context || '');  
            }  
        },  
  
        getCacheKey: function(title, year) {  
            return 'quality_' + (title || '').toLowerCase().replace(/\s+/g, '_') + '_' + (year || '');  
        }  
    };  
  
    // =======================================================  
    // МОДУЛЬ API  
    // =======================================================  
    var API = {  
        requestQueue: [],  
        activeRequests: 0,  
  
        apiRequest: function(url, timeout, attempt) {  
            attempt = attempt || 1;  
            timeout = timeout || Config.PROXY_TIMEOUT;  
  
            return new Promise(function(resolve, reject) {  
                var proxyUrl = Config.PROXY_LIST[0] + encodeURIComponent(url);  
                  
                var xhr = new XMLHttpRequest();  
                xhr.open('GET', proxyUrl, true);  
                xhr.timeout = timeout;  
                xhr.onload = function() {  
                    if (xhr.status === 200) {  
                        try {  
                            var data = JSON.parse(xhr.responseText);  
                            resolve(data);  
                        } catch (e) {  
                            reject(e);  
                        }  
                    } else {  
                        reject(new Error('HTTP ' + xhr.status));  
                    }  
                };  
                xhr.onerror = function() {  
                    if (attempt < Config.RETRY_ATTEMPTS) {  
                        var delay = Config.RETRY_DELAY * Math.pow(2, attempt - 1);  
                        setTimeout(function() {  
                            API.apiRequest(url, timeout, attempt + 1).then(resolve).catch(reject);  
                        }, delay);  
                    } else {  
                        reject(new Error('Network error'));  
                    }  
                };  
                xhr.ontimeout = function() {  
                    if (attempt < Config.RETRY_ATTEMPTS) {  
                        API.apiRequest(url, timeout * 1.5, attempt + 1).then(resolve).catch(reject);  
                    } else {  
                        reject(new Error('Timeout'));  
                    }  
                };  
                xhr.send();  
            });  
        },  
  
        addToQueue: function(request) {  
            return new Promise(function(resolve, reject) {  
                API.requestQueue.push({  
                    request: request,  
                    resolve: resolve,  
                    reject: reject  
                });  
                API.processQueue();  
            });  
        },  
  
        processQueue: function() {  
            while (API.activeRequests < Config.MAX_CONCURRENT_REQUESTS && API.requestQueue.length > 0) {  
                var item = API.requestQueue.shift();  
                API.activeRequests++;  
                  
                item.request()  
                    .then(function(result) {  
                        item.resolve(result);  
                        API.activeRequests--;  
                        API.processQueue();  
                    })  
                    .catch(function(error) {  
                        item.reject(error);  
                        API.activeRequests--;  
                        API.processQueue();  
                    });  
            }  
        }  
    };  
  
    // =======================================================  
    // МОДУЛЬ КАШУВАННЯ  
    // =======================================================  
    var Cache = {  
        get: function(key) {  
            try {  
                var item = localStorage.getItem(key);  
                if (item) {  
                    var parsed = JSON.parse(item);  
                    if (Date.now() - parsed.timestamp < parsed.ttl) {  
                        return parsed.data;  
                    }  
                    localStorage.removeItem(key);  
                }  
            } catch (e) {  
                Utils.logWithContext('error', 'Cache get error', e);  
            }  
            return null;  
        },  
  
        set: function(key, data, ttl) {  
            try {  
                localStorage.setItem(key, JSON.stringify({  
                    data: data,  
                    timestamp: Date.now(),  
                    ttl: ttl || Config.TTL.quality  
                }));  
            } catch (e) {  
                Utils.logWithContext('error', 'Cache set error', e);  
            }  
        }  
    };  
  
    // =======================================================  
    // ВИЗНАЧЕННЯ ЯКОСТІ  
    // =======================================================  
    var QualityDetector = {  
        getBest: function(results) {  
            var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };  
            var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
            var audioOrder = ['2.0', '4.0', '5.1', '7.1'];  
              
            var limit = Math.min(results.length, 20);  
            for (var i = 0; i < limit; i++) {  
                var item = results[i];  
                var title = (item.Title || '').toLowerCase();  
  
                var foundRes = null;  
                if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';  
                else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';  
                else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';  
                else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';  
  
                if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {  
                    best.resolution = foundRes;  
                }  
  
                if (item.ffprobe && Array.isArray(item.ffprobe)) {  
                    item.ffprobe.forEach(function(stream) {  
                        if (stream.codec_type === 'video') {  
                            var h = parseInt(stream.height || 0);  
                            var w = parseInt(stream.width || 0);  
                            var res = null;  
                            if (h >= 2160 || w >= 3840) res = '4K';  
                            else if (h >= 1440 || w >= 2560) res = '2K';  
                            else if (h >= 1080 || w >= 1920) res = 'FULL HD';  
                            else if (h >= 720 || w >= 1280) res = 'HD';  
                              
                            if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) {  
                                best.resolution = res;  
                            }  
                        }  
                          
                        if (stream.codec_type === 'audio') {  
                            var channels = parseInt(stream.channels || 0);  
                            var audio = null;  
                            if (channels >= 8) audio = '7.1';  
                            else if (channels >= 6) audio = '5.1';  
                            else if (channels >= 4) audio = '4.0';  
                            else if (channels >= 2) audio = '2.0';  
                              
                            if (audio && (!best.audio || audioOrder.indexOf(audio) > audioOrder.indexOf(best.audio))) {  
                                best.audio = audio;  
                            }  
                        }  
                    });  
                }  
  
                if (title.indexOf('hdr') >= 0) best.hdr = true;  
                if (title.indexOf('dolby vision') >= 0) best.dolbyVision = true;  
                if (title.indexOf('dub') >= 0 || title.indexOf('дубляж') >= 0) best.dub = true;  
            }  
              
            return best;  
        },  
  
        fetchQuality: function(title, year) {  
            var cacheKey = Utils.getCacheKey(title, year);  
            var cached = Cache.get(cacheKey);  
              
            if (cached) {  
                return Promise.resolve(cached);  
            }  
  
            var searchTitle = title;  
            if (year) {  
                searchTitle += ' ' + year;  
            }  
  
            var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +  
                encodeURIComponent(searchTitle) +  
                '&year=' + (year || '') + '&uid=' + (Lampa.Storage.get('device_id') || 'unknown');  
  
            return API.addToQueue(function() {  
                return API.apiRequest(apiUrl);  
            }).then(function(data) {  
                var quality = null;  
                if (data && data.results && data.results.length > 0) {  
                    quality = QualityDetector.getBest(data.results);  
                }  
                  
                if (quality) {  
                    Cache.set(cacheKey, quality, Config.TTL.quality);  
                } else {  
                    Cache.set(cacheKey, { no_quality: true }, Config.TTL.no_quality);  
                }  
                  
                return quality;  
            }).catch(function(error) {  
                Utils.logWithContext('error', 'API request failed', error);  
                Cache.set(cacheKey, { error: true }, Config.TTL.error);  
                return null;  
            });  
        }  
    };  
  
    // =======================================================  
    // МОДУЛЬ ІНТЕРФЕЙСУ  
    // =======================================================  
    var UI = {  
        createBadgeImg: function(type, isFull, index) {  
            var className = isFull ? 'quality-badge' : 'card-quality-badge';  
            var style = isFull ? '' : 'animation-delay: ' + (index * 0.1) + 's';  
            return '<img class="' + className + '" src="' + svgIcons[type] + '" alt="' + type + '" style="' + style + '" />';  
        },  
  
        addBadgesToCard: function(card, quality) {  
            if (!quality) return;  
  
            var badges = [];  
            if (quality.resolution) badges.push(UI.createBadgeImg(quality.resolution, false, badges.length));  
            if (quality.hdr) badges.push(UI.createBadgeImg('HDR', false, badges.length));  
            if (quality.dolbyVision) badges.push(UI.createBadgeImg('Dolby Vision', false, badges.length));  
            if (quality.audio) badges.push(UI.createBadgeImg(quality.audio, false, badges.length));  
            if (quality.dub) badges.push(UI.createBadgeImg('DUB', false, badges.length));  
  
            if (badges.length > 0) {  
                var container = card.find('.card__view');  
                if (container.length === 0) {  
                    container = card.find('.card__poster');  
                }  
                if (container.length === 0) {  
                    container = card;  
                }  
  
                var badgesHtml = '<div class="card-quality-badges">' + badges.join('') + '</div>';  
                container.append(badgesHtml);  
            }  
        },  
  
        addBadgesToFull: function(quality) {  
            if (!quality) return;  
  
            var badges = [];  
            if (quality.resolution) badges.push(UI.createBadgeImg(quality.resolution, true, badges.length));  
            if (quality.hdr) badges.push(UI.createBadgeImg('HDR', true, badges.length));  
            if (quality.dolbyVision) badges.push(UI.createBadgeImg('Dolby Vision', true, badges.length));  
            if (quality.audio) badges.push(UI.createBadgeImg(quality.audio, true, badges.length));  
            if (quality.dub) badges.push(UI.createBadgeImg('DUB', true, badges.length));  
  
            if (badges.length > 0) {  
                var container = $('.full-start-new__details .quality-badges-container');  
                if (container.length === 0) {  
                    container = $('<div class="quality-badges-container"></div>');  
                    $('.full-start-new__details').prepend(container);  
                }  
                container.html(badges.join(''));  
            }  
        },  
  
        initStyles: function() {  
            var style = '<style>' +  
                '.quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }' +  
                '.quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }' +  
                '.card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }' +  
                '.card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +  
                '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +  
                '.quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }' +  
                '.card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }' +  
                '@media (max-width: 768px) {' +  
                    '.quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }' +  
                    '.quality-badge { height: 1em; }' +  
                    '.card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }' +  
                    '.card-quality-badge { height: 0.75em; }' +  
                '}' +  
            '</style>';  
            $('body').append(style);  
        }  
    };  
  
    // =======================================================  
    // ОБРОБКА КАРТОК  
    // =======================================================  
    function updateCard(card) {  
        var $card = $(card);  
        if ($card.hasClass('quality-processed')) return;  
  
        var cardData = $card.data('card_data') || {};  
        var title = cardData.title || cardData.name || '';  
        var year = cardData.year || cardData.release_date || '';  
  
        if (!title) return;  
  
        $card.addClass('quality-processed');  
  
        QualityDetector.fetchQuality(title, year)  
            .then(function(quality) {  
                if (quality && !quality.no_quality && !quality.error) {  
                    UI.addBadgesToCard($card, quality);  
                }  
            })  
            .catch(function(error) {  
                Utils.logWithContext('error', 'Failed to update card', error);  
            });  
    }  
  
    function updateCards(cards) {  
        var batch = [];  
        for (var i = 0; i < Math.min(cards.length, Config.BATCH_SIZE); i++) {  
            batch.push(cards[i]);  
        }  
  
        var promises = batch.map(function(card) {  
            return new Promise(function(resolve) {  
                updateCard(card);  
                resolve();  
            });  
        });  
  
        Promise.all(promises).then(function() {  
            if (cards.length > Config.BATCH_SIZE) {  
                setTimeout(function() {  
                    updateCards(Array.prototype.slice.call(cards, Config.BATCH_SIZE));  
                }, 100);  
            }  
        });  
    }  
  
    // =======================================================  
    // СЛУХАЧІ ПОДІЙ  
    // =======================================================  
  
 // Обробка повної картки фільму  
    Lampa.Listener.follow('full', function(e) {  
        if (e.type === 'complite') {  
            var movie = e.data.movie;  
            if (movie) {  
                QualityDetector.fetchQuality(movie.title || movie.name, movie.year || movie.release_year)  
                    .then(function(quality) {  
                        if (quality && !quality.no_quality && !quality.error) {  
                            UI.addBadgesToFullCard(quality);  
                        }  
                    });  
            }  
        }  
    });  
  
    // Observer для динамічних карток  
    var debouncedUpdateCards = Utils.debounce(function(cards) {  
        updateCards(cards);  
    }, 300);  
  
    var observer = new MutationObserver(function(mutations) {  
        var newCards = [];  
        for (var i = 0; i < mutations.length; i++) {  
            var mutation = mutations[i];  
            if (mutation.addedNodes.length) {  
                for (var j = 0; j < mutation.addedNodes.length; j++) {  
                    var node = mutation.addedNodes[j];  
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
  
    // =======================================================  
    // ІНІЦІАЛІЗАЦІЯ  
    // =======================================================  
    function startPlugin() {  
        console.log('[UnifiedQuality] Plugin started with JacRed API and SVG icons');  
  
        // Ініціалізація стилів  
        UI.initStyles();  
  
        // Запуск observer  
        observer.observe(document.body, { childList: true, subtree: true });  
  
        // Обробка вже існуючих карток  
        var existingCards = document.querySelectorAll('.card');  
        if (existingCards.length) {  
            updateCards(existingCards);  
        }  
    }  
  
    // Запуск плагіна  
    if (!window.unifiedQualityPlugin) {  
        window.unifiedQualityPlugin = true;  
        startPlugin();  
    }  
})();
