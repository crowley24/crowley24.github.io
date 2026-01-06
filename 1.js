//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
    'use strict';  
  
    // Перевірка залежностей  
    if (typeof window.Lampa === 'undefined' || typeof window.$ === 'undefined') {  
        console.error('[QualityBadges] Required dependencies not available');  
        return;  
    }  
  
    // =======================================================  
    // КОНФІГУРАЦІЯ  
    // =======================================================  
    var Config = {  
        Q_LOGGING: true,  
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',  
        JACRED_PROTOCOL: 'http://',  
        JACRED_URL: window.Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',  
        PROXY_TIMEOUT: 5000,  
        PROXY_LIST: [  
            'http://api.allorigins.win/raw?url=',  
            'http://cors.bwa.workers.dev/'  
        ],  
        MAX_CONCURRENT_REQUESTS: 3,  
        RETRY_ATTEMPTS: 3,  
        RETRY_DELAY: 1000,  
        BATCH_SIZE: 5,  
        TTL: {  
            quality: 24 * 60 * 60 * 1000,  
            error: 5 * 60 * 1000,  
            no_quality: 60 * 60 * 1000  
        }  
    };  
  
    // SVG іконки  
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
                console[level]('[QualityBadges]', message, context || '');  
            }  
        }  
    };  
  
    // =======================================================  
    // МОДУЛЬ API  
    // =======================================================  
    var API = {  
        requestQueue: [],  
        activeRequests: 0,  
  
        makeRequest: function(url) {  
            return new Promise(function(resolve, reject) {  
                var attempt = 0;  
                var tryRequest = function() {  
                    attempt++;  
                    var timeout = setTimeout(function() {  
                        reject(new Error('Request timeout'));  
                    }, Config.PROXY_TIMEOUT);  
  
                    var xhr = new XMLHttpRequest();  
                    xhr.onreadystatechange = function() {  
                        if (xhr.readyState === 4) {  
                            clearTimeout(timeout);  
                            if (xhr.status === 200) {  
                                try {  
                                    var data = JSON.parse(xhr.responseText);  
                                    resolve(data);  
                                } catch (e) {  
                                    reject(e);  
                                }  
                            } else {  
                                if (attempt < Config.RETRY_ATTEMPTS) {  
                                    setTimeout(tryRequest, Config.RETRY_DELAY * attempt);  
                                } else {  
                                    reject(new Error('Request failed'));  
                                }  
                            }  
                        }  
                    };  
  
                    xhr.open('GET', url, true);  
                    xhr.send();  
                };  
                tryRequest();  
            });  
        },  
  
        fetchWithProxy: function(url) {  
            var self = this;  
            return new Promise(function(resolve, reject) {  
                if (self.activeRequests >= Config.MAX_CONCURRENT_REQUESTS) {  
                    self.requestQueue.push({ url: url, resolve: resolve, reject: reject });  
                    return;  
                }  
  
                self.activeRequests++;  
                var tryProxy = function(proxyIndex) {  
                    if (proxyIndex >= Config.PROXY_LIST.length) {  
                        self.activeRequests--;  
                        self.processQueue();  
                        reject(new Error('All proxies failed'));  
                        return;  
                    }  
  
                    var proxyUrl = Config.PROXY_LIST[proxyIndex] + encodeURIComponent(url);  
                    self.makeRequest(proxyUrl)  
                        .then(function(data) {  
                            self.activeRequests--;  
                            self.processQueue();  
                            resolve(data);  
                        })  
                        .catch(function() {  
                            tryProxy(proxyIndex + 1);  
                        });  
                };  
                tryProxy(0);  
            });  
        },  
  
        processQueue: function() {  
            if (this.requestQueue.length > 0 && this.activeRequests < Config.MAX_CONCURRENT_REQUESTS) {  
                var next = this.requestQueue.shift();  
                this.activeRequests++;  
                this.fetchWithProxy(next.url)  
                    .then(next.resolve)  
                    .catch(next.reject);  
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
                            if (stream.profile && stream.profile.toLowerCase().indexOf('hdr') >= 0) {  
                                best.hdr = true;  
                            }  
                            if (stream.tags && stream.tags.DURATION && stream.tags.DURATION.toLowerCase().indexOf('dovi') >= 0) {  
                                best.dolbyVision = true;  
                            }  
                        }  
                        if (stream.codec_type === 'audio') {  
                            var foundAudio = null;  
                            if (stream.channels === 8) foundAudio = '7.1';  
                            else if (stream.channels === 6) foundAudio = '5.1';  
                            else if (stream.channels === 4) foundAudio = '4.0';  
                            else if (stream.channels === 2) foundAudio = '2.0';  
  
                            if (foundAudio && (!best.audio || audioOrder.indexOf(foundAudio) > audioOrder.indexOf(best.audio))) {  
                                best.audio = foundAudio;  
                            }  
                        }  
                    });  
                }  
  
                if (title.indexOf('dub') >= 0 || title.indexOf('дуб') >= 0) {  
                    best.dub = true;  
                }  
            }  
            return best;  
        },  
  
        fetchQuality: function(title, year) {  
            var self = this;  
            return new Promise(function(resolve) {  
                if (!title) {  
                    resolve({ no_quality: true });  
                    return;  
                }  
  
                var cacheKey = Config.QUALITY_CACHE + '_' + title + '_' + (year || '');  
                var cached = Cache.get(cacheKey);  
                if (cached) {  
                    resolve(cached);  
                    return;  
                }  
  
                var searchTitle = title.replace(/\s*\(\d{4}\)$/, '').replace(/\s*:\s*.*$/, '');  
                var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +  
                    encodeURIComponent(searchTitle) +  
                    '&year=' + (year || '') + '&uid=' + (window.Lampa.Storage.get('jacred_uid') || '');  
  
                API.fetchWithProxy(apiUrl)  
                    .then(function(data) {  
                        if (data && data.length > 0) {  
                            var quality = self.getBest(data);  
                            if (quality.resolution || quality.hdr || quality.audio || quality.dub) {  
                                Cache.set(cacheKey, quality);  
                                resolve(quality);  
                            } else {  
                                Cache.set(cacheKey, { no_quality: true }, Config.TTL.no_quality);  
                                resolve({ no_quality: true });  
                            }  
                        } else {  
                            Cache.set(cacheKey, { no_quality: true }, Config.TTL.no_quality);  
                            resolve({ no_quality: true });  
                        }  
                    })  
                    .catch(function() {  
                        Cache.set(cacheKey, { error: true }, Config.TTL.error);  
                        resolve({ error: true });  
                    });  
            });  
        }  
    };  
  
    // =======================================================  
    // ІНТЕРФЕЙС  
    // =======================================================  
    var UI = {  
        initStyles: function() {  
            var style = '<style>' +  
                '.card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }' +  
                '.card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +  
                '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +  
                '.card-quality-badge img { height: 100%; width: auto; display: block; filter: drop-shadow(0 1px 2px #000); }' +  
                '@media (max-width: 768px) {' +  
                    '.card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }' +  
                    '.card-quality-badge { height: 0.75em; }' +  
                '}' +  
            '</style>';  
            window.$('body').append(style);  
        },  
  
        createBadgeImg: function(type, isFull, index) {  
            var delay = isFull ? index * 100 : index * 50;  
            return '<img class="card-quality-badge" src="' + svgIcons[type] + '" alt="' + type + '" style="animation-delay: ' + delay + 'ms">';  
        },  
  
        addBadgesToCard: function(card, quality) {  
            var badges = [];  
            if (quality.resolution) badges.push(this.createBadgeImg(quality.resolution, false, badges.length));  
            if (quality.hdr) badges.push(this.createBadgeImg('HDR', false, badges.length));  
            if (quality.dolbyVision) badges.push(this.createBadgeImg('Dolby Vision', false, badges.length));  
            if (quality.audio) badges.push(this.createBadgeImg(quality.audio, false, badges.length));  
            if (quality.dub) badges.push(this.createBadgeImg('DUB', false, badges.length));  
  
            if (badges.length > 0) {  
                var container = window.$('<div class="card-quality-badges"></div>').html(badges.join(''));  
                card.find('.card__view').append(container);  
            }  
        },  
  
        addBadgesToFullCard: function(quality) {  
            var badges = [];  
            if (quality.resolution) badges.push(this.createBadgeImg(quality.resolution, true, badges.length));  
            if (quality.hdr) badges.push(this.createBadgeImg('HDR', true, badges.length));  
            if (quality.dolbyVision) badges.push(this.createBadgeImg('Dolby Vision', true, badges.length));  
            if (quality.audio) badges.push(this.createBadgeImg(quality.audio, true, badges.length));  
            if (quality.dub) badges.push(this.createBadgeImg('DUB', true, badges.length));  
  
            if (badges.length > 0) {  
                var container = window.$('<div class="quality-badges-container"></div>').html(badges.join(''));  
                window.$('.quality-badges-container').html(container);  
            }  
        }  
    };  
  
    // =======================================================  
    // ОБРОБКА КАРТОК  
    // =======================================================  
    function updateCard(card) {  
        var $card = window.$(card);  
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
    window.Lampa.Listener.follow('full', function(e) {  
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
