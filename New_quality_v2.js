(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    
    // *** КОНФІГУРАЦІЯ ДЛЯ MAXSM-RATINGS (ТЕКСТОВИЙ БЕЙДЖ) ***
    var MaxsmConfig = {
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
    
    // *** КОНФІГУРАЦІЯ ТА РЕСУРСИ ДЛЯ FOXSTUDIO'S BADGES (ІКОНКИ) ***
    var FoxstudioConfig = {
        PLUGIN_PATH: 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/',
        // FoxStudio's плагін використовує Lampa.Parser, тому API-конфігурація не потрібна
    };

    var FoxstudioIcons = {
        '4K': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/4K.svg',
        '2K': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/2K.svg',
        'FULL HD': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/FULL HD.svg',
        'HD': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/HD.svg',
        'HDR': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/HDR.svg',
        'Dolby Vision': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/Dolby Vision.svg',
        '7.1': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/7.1.svg',
        '5.1': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/5.1.svg',
        '4.0': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/4.0.svg',
        '2.0': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/2.0.svg',
        'DUB': FoxstudioConfig.PLUGIN_PATH + 'Quality_ico/DUB.svg'
    };


    // =======================================================
    // II. УТИЛІТИ (Спільні)
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
            if (!MaxsmConfig.Q_LOGGING) return;
            var logEntry = {
                timestamp: new Date().toISOString(),
                level: level,
                message: message,
                context: context || {}
            };
            console[level]('[MAXSM-LOG] ' + message, logEntry);
        },
        getCardType: function(card) {
            var type = card.media_type || card.type;
            if (type === 'movie' || type === 'tv') return type;
            return card.name || card.original_name ? 'tv' : 'movie';
        }
    };


    // =======================================================
    // МОДУЛЬ 1: MAXSM-RATINGS (ОДИН ВЕЛИКИЙ ТЕКСТОВИЙ БЕЙДЖ)
    // =======================================================
    var MaxsmModule = (function() {

        // III. API (Оригінальний Maxsm)
        var API = {
            activeRequests: 0,
            requestQueue: [],
            processQueue: function() {
                if (this.activeRequests >= MaxsmConfig.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) return;
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
                retries = retries || MaxsmConfig.RETRY_ATTEMPTS;
                this.fetchWithProxy(url, cardId, function(error, responseText) {
                    if (error && retries > 0) {
                        var delay = MaxsmConfig.RETRY_DELAY * Math.pow(2, attempt - 1);
                        setTimeout(function() { API.fetchWithProxyRetry(url, cardId, callback, retries - 1, attempt + 1); }, delay);
                    } else {
                        callback(error, responseText);
                    }
                });
            },
            fetchWithProxy: function(url, cardId, callback) {
                var currentProxyIndex = 0;
                var callbackCalled = false;
                function tryNextProxy() {
                    if (currentProxyIndex >= MaxsmConfig.PROXY_LIST.length) {
                        if (!callbackCalled) {
                            callbackCalled = true;
                            callback(new Error('All proxies failed for ' + url));
                        }
                        return;
                    }
                    var proxyUrl = MaxsmConfig.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
                    var timeoutId = setTimeout(function() {
                        if (!callbackCalled) {
                            currentProxyIndex++;
                            tryNextProxy();
                        }
                    }, MaxsmConfig.PROXY_TIMEOUT);

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

        // IV. КАШУВАННЯ (Оригінальний Maxsm)
        var Cache = {
            get: function(key) {
                try {
                    var cache = Lampa.Storage.get(MaxsmConfig.QUALITY_CACHE) || {};
                    var item = cache[key];
                    if (!item) return null;
                    var now = Date.now();
                    var ttl = MaxsmConfig.TTL[item.type] || MaxsmConfig.TTL.quality;
                    if (now - item.timestamp < ttl) {
                        return item;
                    } else {
                        delete cache[key];
                        Lampa.Storage.set(MaxsmConfig.QUALITY_CACHE, cache);
                    }
                } catch (error) { /* ignore */ }
                return null;
            },
            set: function(key, data, type) {
                type = type || 'quality';
                try {
                    var cache = Lampa.Storage.get(MaxsmConfig.QUALITY_CACHE) || {};
                    cache[key] = {
                        quality: data.quality || null,
                        timestamp: Date.now(),
                        type: type
                    };
                    Lampa.Storage.set(MaxsmConfig.QUALITY_CACHE, cache);
                } catch (error) { /* ignore */ }
            },
            cleanup: function() {
                try {
                    var cache = Lampa.Storage.get(MaxsmConfig.QUALITY_CACHE) || {};
                    var now = Date.now();
                    var cleanedCache = {};
                    for (var key in cache) {
                        if (cache.hasOwnProperty(key)) {
                            var item = cache[key];
                            var ttl = MaxsmConfig.TTL[item.type] || MaxsmConfig.TTL.quality;
                            if (now - item.timestamp < ttl) {
                                cleanedCache[key] = item;
                            }
                        }
                    }
                    Lampa.Storage.set(MaxsmConfig.QUALITY_CACHE, cleanedCache);
                } catch (error) { /* ignore */ }
            }
        };

        // V. ВИЗНАЧЕННЯ ЯКОСТІ (Оригінальний Maxsm - спрощено)
        var QualityDetector = {
            detectQuality: function(torrentTitle) {
                if (!torrentTitle) return null;
                var title = torrentTitle.toLowerCase();
                if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision|3840x2160.*dv)\b/i.test(title)) return '4K DV';
                if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr|3840x2160.*hdr)\b/i.test(title)) return '4K HDR';
                if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160|4k\s*uhd|uhd\s*4k)\b/i.test(title)) return '4K';
                if (/\b(web-dl|webdl|webrip|web-rip|bluray|bdrip|brrip|1080p|fhd)\b/i.test(title)) return 'FHD';
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
                     return currentIndex < bestIndex && currentIndex !== -1 ? current : best;
                 }, null);
             }
        };

        // VI. UI (Оригінальний Maxsm)
        var UI = {
            initStyles: function() {
                if (document.getElementById('maxsm_ratings_quality')) return;
                var styleElement = document.createElement('style');
                styleElement.id = 'maxsm_ratings_quality';
                // Оригінальні стилі Maxsm-Ratings для текстового бейджа
                styleElement.textContent = `
                    .card__view {position: relative !important;}
                    .card__quality_maxsm {
                        position: absolute !important;
                        bottom: 0.1em !important;
                        left: -0.5em !important;
                        background-color: transparent !important;
                        z-index: 10;
                        width: fit-content !important;
                        min-width: 3.5em !important;
                        max-width: calc(100% - 1em) !important;
                    }
                    .card__quality_maxsm div {
                        text-transform: none !important;
                        border: 2px solid #FFFFFF !important;
                        color: #FFFFFF !important;
                        font-weight: bold !important;
                        font-style: normal !important;
                        font-size: 1.2em !important;
                        border-radius: 3px !important;
                        padding: 0.2em 0.4em !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
                        text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                    }
                    /* ... (частина стилів MaxsmConfig) */
                    .card__quality_maxsm div[data-quality*="4K"][data-quality*="DV"] { border-color: #8A2BE2 !important; background: linear-gradient(135deg, #8A2BE2 0%, #4B0082 50%, #6A0DAD 100%) !important; }
                    .card__quality_maxsm div[data-quality*="4K"][data-quality*="HDR"] { border-color: #FF8C00 !important; background: linear-gradient(135deg, #FFA500 0%, #FF8C00 50%, #FF6347 100%) !important; }
                    .card__quality_maxsm div[data-quality*="4K"] { border-color: #8B0000 !important; background: linear-gradient(135deg, #8B0000 0%, #660000 50%, #4D0000 100%) !important; }
                    .card__quality_maxsm div[data-quality*="HDR"] { border-color: #006400 !important; background: linear-gradient(135deg, #006400 0%, #228B22 50%, #2E7D32 100%) !important; }
                    .card__quality_maxsm div[data-quality*="HD"] { border-color: #4169E1 !important; background: linear-gradient(135deg, #4169E1 0%, #1E90FF 50%, #000080 100%) !important; }
                    .card__quality_maxsm div[data-quality*="SD"] { border-color: #8B4513 !important; background: linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #654321 100%) !important; }
                `;
                document.head.appendChild(styleElement);
            },
            addQualityBadge: function(card, quality) {
                if (!document.body.contains(card)) return;
                
                var cardView = card.querySelector('.card__view');
                if (!cardView) return;

                // Видаляємо лише бейджі Maxsm, щоб не конфліктувати з бейджами FoxStudio
                var existing = cardView.getElementsByClassName('card__quality_maxsm');
                while(existing.length > 0) {
                    existing[0].parentNode.removeChild(existing[0]);
                }

                if (quality && quality !== 'NO') {
                    var qualityDiv = document.createElement('div');
                    qualityDiv.className = 'card__quality_maxsm'; // Унікальний клас
                    var qualityInner = document.createElement('div');
                    qualityInner.textContent = Utils.escapeHtml(quality);
                    qualityInner.setAttribute('data-quality', quality);
                    cardView.appendChild(qualityDiv).appendChild(qualityInner);
                }
            }
        };
        
        // VII. ОСНОВНІ ФУНКЦІЇ (Оригінальний Maxsm)
        function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
            // ... (оригінальна логіка JacRed з Maxsm)
            if (!MaxsmConfig.JACRED_URL) {
                callback(null); return;
            }

            var year = '';
            var dateStr = normalizedCard.release_date || '';
            if (dateStr.length >= 4) {
                year = dateStr.substring(0, 4);
            }
            if (!year || isNaN(year)) {
                callback(null); return;
            }

            function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {
                var userId = Lampa.Storage.get('lampac_unic_id', '');
                var apiUrl = MaxsmConfig.JACRED_PROTOCOL + MaxsmConfig.JACRED_URL + '/api/v1.0/torrents?search=' +
                    encodeURIComponent(searchTitle) +
                    '&year=' + searchYear +
                    (exactMatch ? '&exact=true' : '') +
                    '&uid=' + userId;
                
                API.queueRequest(apiUrl, cardId, function(error, responseText) {
                    if (error || !responseText) {
                        apiCallback(null); return;
                    }
                    try {
                        var torrents = JSON.parse(responseText);
                        if (!Array.isArray(torrents) || torrents.length === 0) {
                            if (exactMatch) {
                                searchJacredApi(searchTitle, searchYear, false, strategyName + ' (Loose)', apiCallback);
                                return;
                            }
                            apiCallback(null);
                            return;
                        }

                        // Логіка оцінки та вибір найкращого
                        var qualities = torrents.map(t => QualityDetector.detectQuality(t.title));
                        var bestQuality = QualityDetector.getBestQuality(qualities);
                        
                        apiCallback({ quality: bestQuality });
                    } catch (e) {
                        apiCallback(null);
                    }
                });
            }

            var searchStrategies = [];
            if (normalizedCard.original_title && /[a-zа-яё0-9]/i.test(normalizedCard.original_title)) {
                searchStrategies.push({ title: normalizedCard.original_title.trim(), year: year, exact: true, name: "OriginalTitle Exact Year" });
            }
            if (normalizedCard.title && /[a-zа-яё0-9]/i.test(normalizedCard.title)) {
                searchStrategies.push({ title: normalizedCard.title.trim(), year: year, exact: true, name: "Title Exact Year" });
            }

            function executeNextStrategy(index) {
                if (index >= searchStrategies.length) {
                    callback(null); return;
                }
                var strategy = searchStrategies[index];
                searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {
                    if (result !== null && result.quality !== null) {
                        callback(result);
                    } else {
                        executeNextStrategy(index + 1);
                    }
                });
            }

            if (searchStrategies.length > 0) {
                executeNextStrategy(0);
            } else {
                callback(null);
            }
        }
        
        function updateCards(cards) {
            Cache.cleanup();
            
            for (var i = 0; i < cards.length; i += MaxsmConfig.BATCH_SIZE) {
                var batch = cards.slice(i, i + MaxsmConfig.BATCH_SIZE);
                  
                batch.forEach(function(card) {
                    // Використовуємо окремий атрибут, щоб не конфліктувати з FoxStudio
                    if (card.hasAttribute('data-maxsm-processed')) return;
                    card.setAttribute('data-maxsm-processed', 'true');

                    var data = card.card_data;
                    if (!data) return;

                    var normalizedCard = {
                        id: data.id || '',
                        title: data.title || data.name || '',
                        original_title: data.original_title || data.original_name || '',
                        release_date: data.release_date || data.first_air_date || '',
                        type: Utils.getCardType(data)
                    };

                    var qCacheKey = normalizedCard.type + '_' + normalizedCard.id;
                    var cacheQualityData = Cache.get(qCacheKey);
                            
                    if (cacheQualityData) {
                        UI.addQualityBadge(card, cacheQualityData.quality);
                    } else {
                        getBestReleaseFromJacred(normalizedCard, normalizedCard.id, function (jrResult) {
                            var quality = (jrResult && jrResult.quality) || null;
                            if (quality) {
                                Cache.set(qCacheKey, { quality: quality }, 'quality');
                            } else {
                                Cache.set(qCacheKey, { quality: null }, 'no_quality');
                            }
                            UI.addQualityBadge(card, quality);
                        });
                    }
                });
            }
        }

        // VIII. OBSERVER (Оригінальний Maxsm)
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

        // Ініціалізація модуля
        return {
            start: function() {
                if (localStorage.getItem('maxsm_ratings_quality') !== 'true') return;
                
                UI.initStyles();

                if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
                    observer.observe(document.body, { childList: true, subtree: true });
                    var existingCards = document.querySelectorAll('.card');
                    if (existingCards.length) {
                        updateCards(existingCards);
                    }
                }
            }
        };
    })();

    // =======================================================
    // МОДУЛЬ 2: FOXSTUDIO'S BADGES (ГРУПА ІКОНОК)
    // =======================================================
    var FoxstudioModule = (function() {

        // Логіка визначення найкращої деталізованої якості (Оригінальний FoxStudio)
        function getBest(results) {
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
                            if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
                            if (stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67') best.hdr = true;
                        }
                        if (stream.codec_type === 'audio' && stream.channels) {
                            var ch = parseInt(stream.channels);
                            var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
                            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
                        }
                    });
                }
                
                if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
                if (title.indexOf('hdr') >= 0) best.hdr = true;
                if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
            }
            if (best.dolbyVision) best.hdr = true;
            return best;
        }

        // Функції UI (Оригінальний FoxStudio)
        function createBadgeImg(type, isCard, index) {
            var iconPath = FoxstudioIcons[type];
            if (!iconPath) return '';
            var className = isCard ? 'card-quality-badge-fs' : 'quality-badge-fs'; // Унікальні класи
            var delay = (index * 0.08) + 's';
            return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false" oncontextmenu="return false;"></div>';
        }

        function addCardBadges(card, best) {
            // Використовуємо унікальний клас для пошуку
            if (card.find('.card-quality-badges-fs').length) return; 

            var badges = [];
            if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', true, badges.length));
            else if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));
            
            if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));
            if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));
            if (best.dub) badges.push(createBadgeImg('DUB', true, badges.length));

            if (badges.length) card.find('.card__view').append('<div class="card-quality-badges-fs">' + badges.join('') + '</div>');
        }

        function processCards() {
            // Використовуємо унікальний клас qb-processed-fs для уникнення конфліктів
            $('.card:not(.qb-processed-fs)').addClass('qb-processed-fs').each(function() {
                var card = $(this);
                var movie = card.data('item');
                // Використовуємо оригінальний тригер FoxStudio Lampa.Parser
                if (movie && Lampa.Storage.field('parser_use')) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
                        if (response && response.Results) addCardBadges(card, getBest(response.Results));
                    });
                }
            });
        }
        
        // Стилі FoxStudio's
        function initStyles() {
            if (document.getElementById('foxstudio_quality_badges_style')) return;
            var styleElement = document.createElement('style');
            styleElement.id = 'foxstudio_quality_badges_style';
            // Оригінальні стилі FoxStudio, класи змінено на унікальні
            styleElement.textContent = `
                .quality-badges-container-fs { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }
                .quality-badge-fs { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }
                .card-quality-badges-fs { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }
                .card-quality-badge-fs { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }
                @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }
                .quality-badge-fs img, .card-quality-badge-fs img { height: 100%; width: auto; display: block; }
                .card-quality-badge-fs img { filter: drop-shadow(0 1px 2px #000); }
                @media (max-width: 768px) {
                    .quality-badges-container-fs { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }
                    .quality-badge-fs { height: 1em; }
                    .card-quality-badges-fs { top: 0.25em; right: 0.25em; gap: 0.18em; }
                    .card-quality-badge-fs { height: 0.75em; }
                }
            `;
            document.head.appendChild(styleElement);
        }

        // Ініціалізація модуля
        return {
            start: function() {
                initStyles();
                console.log('[FoxStudio Badges] Запущен');

                // Обробка сторінки деталізації
                Lampa.Listener.follow('full', function(e) {
                    if (e.type !== 'complite') return;
                    var details = $('.full-start-new__details');
                    if (details.length) {
                        // Унікальний контейнер
                        if (!$('.quality-badges-container-fs').length) details.after('<div class="quality-badges-container-fs"></div>');
                        
                        Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(response) {
                            if (response && response.Results) {
                                var best = getBest(response.Results);
                                var badges = [];
                                if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', false, badges.length));
                                else if (best.hdr) badges.push(createBadgeImg('HDR', false, badges.length));
                                
                                if (best.resolution) badges.push(createBadgeImg(best.resolution, false, badges.length));
                                if (best.audio) badges.push(createBadgeImg(best.audio, false, badges.length));
                                if (best.dub) badges.push(createBadgeImg('DUB', false, badges.length));
                                
                                $('.quality-badges-container-fs').html(badges.join(''));
                            }
                        });
                    }
                });

                // Обробка карток у списках (використовуємо інтервал, як в оригіналі)
                setInterval(processCards, 3000);
            }
        };
    })();

    // =======================================================
    // IX. ГЛОБАЛЬНА ІНІЦІАЛІЗАЦІЯ
    // =======================================================
    
    // Встановлення налаштувань за замовчуванням (спільні)
    function setDefaults() {
        if (!localStorage.getItem('maxsm_ratings_quality')) {
            localStorage.setItem('maxsm_ratings_quality', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_inlist')) {
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_tv')) {
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');
        }
    }

    // Запуск обох модулів
    if (!window.maxsmFoxstudioMergedPlugin) {
        window.maxsmFoxstudioMergedPlugin = true;
        
        setDefaults();
        
        MaxsmModule.start();
        FoxstudioModule.start();
        
        console.log("MERGED PLUGIN: Maxsm-Ratings (Text) and FoxStudio-Badges (Icons) are running independently.");
    }
})();
