// Об'єднаний плагін якості з вертикальними постерами  
(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
    if (Lampa.Manifest.app_digital < 300) return;  
  
    // Флаг, щоб уникнути повторної ініціалізації  
    if (window.unified_quality_plugin_ready) return;  
    window.unified_quality_plugin_ready = true;  
  
    // ========== КОНФІГУРАЦІЯ ==========  
    var Config = {  
        Q_LOGGING: true,  
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',  
        JACRED_PROTOCOL: 'http://',  
        JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',  
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
  
    // ========== SVG ІКОНКИ ==========  
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
  
    // ========== УТИЛІТИ ==========  
    var Utils = {  
        debounce: function(func, wait) {  
            var timeout;  
            return function executedFunction() {  
                var context = this;  
                var args = arguments;  
                var later = function() {  
                    timeout = null;  
                    func.apply(context, args);  
                };  
                clearTimeout(timeout);  
                timeout = setTimeout(later, wait);  
            };  
        },  
  
        logWithContext: function(level, message, context) {  
            if (Config.Q_LOGGING) {  
                console[level]('[UnifiedQuality]', message, context || '');  
            }  
        },  
  
        getCacheKey: function(title, year) {  
            return 'quality_' + (title || '').toLowerCase().replace(/\s+/g, '_') + '_' + (year || '');  
        },  
  
        isExpired: function(timestamp, ttl) {  
            return Date.now() - timestamp > ttl;  
        }  
    };  
  
    // ========== API КЛІЄНТ ==========  
    var API = {  
        requestQueue: [],  
        activeRequests: 0,  
  
        makeRequest: function(url) {  
            return new Promise(function(resolve, reject) {  
                var attempt = 0;  
                var tryRequest = function() {  
                    attempt++;  
                    var proxyUrl = Config.PROXY_LIST[0] + encodeURIComponent(url);  
                      
                    var xhr = new XMLHttpRequest();  
                    xhr.timeout = Config.PROXY_TIMEOUT;  
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
                            setTimeout(tryRequest, Config.RETRY_DELAY * attempt);  
                        } else {  
                            reject(new Error('Network error'));  
                        }  
                    };  
                    xhr.ontimeout = function() {  
                        reject(new Error('Timeout'));  
                    };  
                    xhr.open('GET', proxyUrl, true);  
                    xhr.send();  
                };  
                tryRequest();  
            });  
        },  
  
        getQuality: function(title, year) {  
            var cacheKey = Utils.getCacheKey(title, year);  
            var cached = localStorage.getItem(cacheKey);  
              
            if (cached) {  
                try {  
                    var parsed = JSON.parse(cached);  
                    if (!Utils.isExpired(parsed.timestamp, Config.TTL.quality)) {  
                        return Promise.resolve(parsed.data);  
                    }  
                } catch (e) {  
                    localStorage.removeItem(cacheKey);  
                }  
            }  
  
            var url = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v2/search?query=' + encodeURIComponent(title);  
            if (year) url += '&year=' + year;  
  
            return API.makeRequest(url).then(function(data) {  
                var result = { quality: 'NO INFO', timestamp: Date.now() };  
                if (data && data.length > 0) {  
                    result.quality = data[0].quality || 'NO INFO';  
                }  
                localStorage.setItem(cacheKey, JSON.stringify(result));  
                return result;  
            }).catch(function(error) {  
                Utils.logWithContext('error', 'API request failed', error);  
                return { quality: 'ERROR', timestamp: Date.now() };  
            });  
        }  
    };  
  
    // ========== ВИЗНАЧЕННЯ ЯКОСТІ ==========  
    var QualityDetector = {  
        getBest: function(results) {  
            var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };  
            var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
            var audioOrder = ['2.0', '4.0', '5.1', '7.1'];  
              
            var limit = Math.min(results.length, 20);  
            for (var i = 0; i < limit; i++) {  
                var item = results[i];  
                var title = (item.Title || '').toLowerCase();  
                  
                // Визначення роздільної здатності  
                for (var j = 0; j < resOrder.length; j++) {  
                    if (title.indexOf(resOrder[j].toLowerCase()) >= 0) {  
                        var currentIndex = resOrder.indexOf(best.resolution);  
                        var newIndex = resOrder.indexOf(resOrder[j]);  
                        if (currentIndex === -1 || newIndex > currentIndex) {  
                            best.resolution = resOrder[j];  
                        }  
                    }  
                }  
                  
                // HDR та Dolby Vision  
                if (title.indexOf('hdr') >= 0) best.hdr = true;  
                if (title.indexOf('dolby vision') >= 0) best.dolbyVision = true;  
                  
                // Аудіо  
                for (var k = 0; k < audioOrder.length; k++) {  
                    if (title.indexOf(audioOrder[k]) >= 0) {  
                        var currentAudioIndex = audioOrder.indexOf(best.audio);  
                        var newAudioIndex = audioOrder.indexOf(audioOrder[k]);  
                        if (currentAudioIndex === -1 || newAudioIndex > currentAudioIndex) {  
                            best.audio = audioOrder[k];  
                        }  
                    }  
                }  
                  
                // Дубляж  
                if (title.indexOf('dub') >= 0) best.dub = true;  
            }  
              
            return best;  
        },  
  
        fetchQuality: function(title, year) {  
            return API.getQuality(title, year).then(function(result) {  
                return {  
                    resolution: result.quality === 'NO INFO' ? null : result.quality,  
                    hdr: false,  
                    dolbyVision: false,  
                    audio: null,  
                    dub: false,  
                    no_quality: result.quality === 'NO INFO',  
                    error: result.quality === 'ERROR'  
                };  
            });  
        }  
    };  
  
    // ========== ІНТЕРФЕЙС ==========  
    var UI = {  
        addBadgesToCard: function(card, quality) {  
            if (!card || !quality) return;  
              
            var badges = [];  
              
            if (quality.resolution) {  
                badges.push('<img class="card-quality-badge" src="' + svgIcons[quality.resolution] + '" onerror="this.style.display=\'none\'">');  
            }  
            if (quality.hdr) {  
                badges.push('<img class="card-quality-badge" src="' + svgIcons['HDR'] + '" onerror="this.style.display=\'none\'">');  
            }  
            if (quality.dolbyVision) {  
                badges.push('<img class="card-quality-badge" src="' + svgIcons['Dolby Vision'] + '" onerror="this.style.display=\'none\'">');  
            }  
            if (quality.audio) {  
                badges.push('<img class="card-quality-badge" src="' + svgIcons[quality.audio] + '" onerror="this.style.display=\'none\'">');  
            }  
            if (quality.dub) {  
                badges.push('<img class="card-quality-badge" src="' + svgIcons['DUB'] + '" onerror="this.style.display=\'none\'">');  
            }  
              
            if (badges.length === 0) {  
                if (quality.no_quality) {  
                    badges.push('<div class="card-quality-badge" style="background: #4a90e2; color: white; padding: 2px 4px; font-size: 8px; line-height: 1;">NO INFO</div>');  
                } else if (quality.error) {  
                    badges.push('<div class="card-quality-badge" style="background: #e74c3c; color: white; padding: 2px 4px; font-size: 8px; line-height: 1;">ERROR</div>');  
                }  
            }  
              
            if (badges.length > 0) {  
                var container = card.find('.card__view');  
                if (container.length && !container.find('.card-quality-badges').length) {  
                    container.append('<div class="card-quality-badges">' + badges.join('') + '</div>');  
                }  
            }  
        },  
  
        addBadgesToFullCard: function(quality) {  
            var container = $('.full-start-new__quality');  
            if (container.length) {  
                var badges = [];  
                  
                if (quality.resolution) {  
                    badges.push('<img class="quality-badge" src="' + svgIcons[quality.resolution] + '" onerror="this.style.display=\'none\'">');  
                }  
                if (quality.hdr) {  
                    badges.push('<img class="quality-badge" src="' + svgIcons['HDR'] + '" onerror="this.style.display=\'none\'">');  
                }  
                if (quality.dolbyVision) {  
                    badges.push('<img class="quality-badge" src="' + svgIcons['Dolby Vision'] + '" onerror="this.style.display=\'none\'">');  
                }  
                if (quality.audio) {  
                    badges.push('<img class="quality-badge" src="' + svgIcons[quality.audio] + '" onerror="this.style.display=\'none\'">');  
                }  
                if (quality.dub) {  
                    badges.push('<img class="quality-badge" src="' + svgIcons['DUB'] + '" onerror="this.style.display=\'none\'">');  
                }  
                  
                if (badges.length > 0) {  
                    container.html('<div class="quality-badges-container">' + badges.join('') + '</div>');  
                }  
            }  
        },  
  
        initStyles: function() {  
            var styleId = 'unified_quality_styles';  
            if (document.getElementById(styleId)) return;  
              
            var style = document.createElement('style');  
            style.id = styleId;  
            style.textContent = `  
                /* Вертикальні постери */  
                .card:not(.card--wide):not(.card--small):not(.card--more) .card__view {  
                    padding-bottom: 150% !important;  
                }  
                  
                /* Бейджі якості */  
                .quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }  
                .quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }  
                .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }  
                .card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }  
                @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }  
                .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }  
                .card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }  
                @media (max-width: 768px) {  
                    .quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }  
                    .quality-badge { height: 1em; }  
                    .card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }  
                    .card-quality-badge { height: 0.75em; }  
                }  
            `;  
            document.head.appendChild(style);  
        }  
    };  
  
    // ========== ОБРОБКА КАРТОК ==========  
    function processCard(card) {  
        if (!card || card.hasClass('quality-processed')) return;  
          
        var cardData = card.data() || {};  
        var title = cardData.title || cardData.name || '';  
        var year = cardData.year || cardData.release_year;  
          
        if (title) {  
            card.addClass('quality-processed');  
            QualityDetector.fetchQuality(title, year)  
                .then(function(quality) {  
                    UI.addBadgesToCard(card, quality);  
                })  
                .catch(function(error) {  
                    Utils.logWithContext('error', 'Failed to process card', error);  
                });  
        }  
    }  
  
    function processCards() {  
        $('.card:not(.quality-processed)').each(function() {  
            processCard($(this));  
        });  
    }  
  
    function processFullCard() {  
        var movie = Lampa.Activity.get().movie;  
        if (movie) {  
            QualityDetector.fetchQuality(movie.title || movie.name, movie.year || movie.release_year)  
                .then(function(quality) {  
                    UI.addBadgesToFullCard(quality);  
                });  
        }  
    }  
  
    // ========== ІНІЦІАЛІЗАЦІЯ ==========  
    function startPlugin() {  
        Utils.logWithContext('log', 'Starting unified quality plugin with vertical posters');  
          
        UI.initStyles();  
          
        // Обробка існуючих карток  
        setTimeout(processCards, 2000);  
          
        // Observer для нових карток  
        var debouncedProcess = Utils.debounce(processCards, 300);  
        var observer = new MutationObserver(function(mutations) {  
            debouncedProcess();  
        });  
          
        observer.observe(document.body, { childList: true, subtree: true });  
          
        // Обробка повної картки  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type === 'complite') {  
                setTimeout(processFullCard, 1000);  
            }  
        });  
          
        Utils.logWithContext('log', 'Unified quality plugin initialized');  
    }  
  
    // Запуск плагіна  
    startPlugin();  
})();
