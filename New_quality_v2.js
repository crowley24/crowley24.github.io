(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ ТА РЕСУРСИ
    // =======================================================
    var Config = {
        // Загальні
        Q_LOGGING: true,
        QUALITY_CACHE: 'maxsm_ratings_quality_cache',
        
        // FoxStudio's Resources
        PLUGIN_PATH: 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/',
        
        // JacRed API (Maxsm's Source)
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
        
        // Кешування TTL (в мс)
        TTL: {
            quality: 24 * 60 * 60 * 1000,
            error: 5 * 60 * 1000,
            no_quality: 60 * 60 * 1000
        }
    };
    
    // Іконки для бейджів (з FoxStudio's)
    var svgIcons = {
        '4K': Config.PLUGIN_PATH + 'Quality_ico/4K.svg',
        '2K': Config.PLUGIN_PATH + 'Quality_ico/2K.svg',
        'FULL HD': Config.PLUGIN_PATH + 'Quality_ico/FULL HD.svg',
        'HD': Config.PLUGIN_PATH + 'Quality_ico/HD.svg',
        'HDR': Config.PLUGIN_PATH + 'Quality_ico/HDR.svg',
        'Dolby Vision': Config.PLUGIN_PATH + 'Quality_ico/Dolby Vision.svg',
        '7.1': Config.PLUGIN_PATH + 'Quality_ico/7.1.svg',
        '5.1': Config.PLUGIN_PATH + 'Quality_ico/5.1.svg',
        '4.0': Config.PLUGIN_PATH + 'Quality_ico/4.0.svg',
        '2.0': Config.PLUGIN_PATH + 'Quality_ico/2.0.svg',
        'DUB': Config.PLUGIN_PATH + 'Quality_ico/DUB.svg'
    };

    // =======================================================
    // II. МОДУЛЬ УТИЛІТ
    // (Без змін)
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
            if (!Config.Q_LOGGING) return;
            var logEntry = {
                timestamp: new Date().toISOString(),
                level: level,
                message: message,
                context: context || {}
            };
            console[level]('[MAXSM-RATINGS] ' + message, logEntry);
        },
        performance: {
            timers: {},
            start: function(name) { this.timers[name] = performance.now(); },
            end: function(name) {
                if (this.timers[name]) {
                    var duration = performance.now() - this.timers[name];
                    Utils.logWithContext('log', 'Performance: ' + name, { duration: duration.toFixed(2) + 'ms' });
                    delete this.timers[name];
                    return duration;
                }
            }
        },
        stats: {
            requests: 0, cacheHits: 0, errors: 0,
            increment: function(type) { this[type] = (this[type] || 0) + 1; },
            getStats: function() {
                return {
                    requests: this.requests, cacheHits: this.cacheHits, errors: this.errors,
                    cacheHitRate: this.requests > 0 ? (this.cacheHits / this.requests * 100).toFixed(2) + '%' : '0%'
                };
            }
        }
    };

    // =======================================================
    // III. МОДУЛЬ API
    // (Залишено як було, використовується для JacRed)
    // =======================================================
    var API = {
        activeRequests: 0,
        requestQueue: [],
        processQueue: function() {
            if (this.activeRequests >= Config.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) return;
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
            retries = retries || Config.RETRY_ATTEMPTS;
            this.fetchWithProxy(url, cardId, function(error, responseText) {
                if (error && retries > 0) {
                    var delay = Config.RETRY_DELAY * Math.pow(2, attempt - 1);
                    Utils.logWithContext('log', 'Retrying request... attempt ' + attempt + '/' + Config.RETRY_ATTEMPTS, { url: url, cardId: cardId, delay: delay });
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
                if (currentProxyIndex >= Config.PROXY_LIST.length) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        callback(new Error('All proxies failed for ' + url));
                    }
                    return;
                }
                var proxyUrl = Config.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
                if (Config.Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", Fetch with proxy: " + proxyUrl);
                var timeoutId = setTimeout(function() {
                    if (!callbackCalled) {
                        Utils.logWithContext('warn', 'Proxy timeout reached', { proxy: Config.PROXY_LIST[currentProxyIndex], url: url, timeout: Config.PROXY_TIMEOUT });
                        currentProxyIndex++;
                        tryNextProxy();
                    }
                }, Config.PROXY_TIMEOUT);

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
                        Utils.logWithContext('error', "Proxy fetch error", { cardId: cardId, proxyUrl: proxyUrl, error: error });
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
    // (Залишено як було)
    // =======================================================
    var Cache = {
        get: function(key) {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var item = cache[key];
                if (!item) return null;
                var now = Date.now();
                var ttl = Config.TTL[item.type] || Config.TTL.quality;
                if (now - item.timestamp < ttl) {
                    Utils.stats.increment('cacheHits');
                    return item;
                } else {
                    delete cache[key];
                    Lampa.Storage.set(Config.QUALITY_CACHE, cache);
                }
            } catch (error) {
                Utils.logWithContext('error', 'Cache read error, storage may be full.', { key: key, error: error });
            }
            return null;
        },
        set: function(key, data, type) {
            type = type || 'quality';
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                cache[key] = {
                    badges: data.badges || null, // Змінено на badges
                    timestamp: Date.now(),
                    type: type
                };
                Lampa.Storage.set(Config.QUALITY_CACHE, cache);
            } catch (error) {
                Utils.logWithContext('error', 'Cache write error, storage may be full.', { key: key, error: error });
            }
        },
        cleanup: function() {
            try {
                var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};
                var now = Date.now();
                var cleanedCache = {};
                var cleaned = 0;
                for (var key in cache) {
                    if (cache.hasOwnProperty(key)) {
                        var item = cache[key];
                        var ttl = Config.TTL[item.type] || Config.TTL.quality;
                        if (now - item.timestamp < ttl) {
                            cleanedCache[key] = item;
                        } else {
                            cleaned++;
                        }
                    }
                }
                if (cleaned > 0 && Config.Q_LOGGING) {
                    Utils.logWithContext('log', 'Cleaned expired cache entries', { count: cleaned });
                }
                Lampa.Storage.set(Config.QUALITY_CACHE, cleanedCache);
                return cleanedCache;
            } catch (error) {
                Utils.logWithContext('error', 'Cache cleanup error', { error: error });
                return {};
            }
        }
    };

    // =======================================================
    // V. МОДУЛЬ ВИЗНАЧЕННЯ ЯКОСТІ (FoxStudio's Logics)
    // =======================================================
    
    // Порядок пріоритету
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];

    /**
     * Логіка визначення найкращої деталізованої якості
     * (З FoxStudio's - адаптовано для уніфікації)
     */
    function getBestDetailedQuality(releases) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };
        
        // Обмеження до 20 релізів (як у FoxStudio's)
        var limit = Math.min(releases.length, 20);
        for (var i = 0; i < limit; i++) {
            var item = releases[i];
            var title = (item.Title || item.title || '').toLowerCase(); // Підтримка JacRed (title) та Lampa.Parser (Title)

            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
            else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';

            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {
                best.resolution = foundRes;
            }

            // Обробка детальних потоків (ffprobe - є лише у Lampa.Parser)
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
            
            // Визначення за заголовком (працює для обох джерел)
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        }
        
        if (best.dolbyVision) best.hdr = true;

        return best;
    }
    
    /**
     * Нова функція для обробки результату JacRed та перетворення на структуру бейджів
     * @param {object} torrents - список торрентів з JacRed
     */
    function processJacredResult(torrents) {
        // JacRed надає список об'єктів {title: string, quality: number, size: number, ...}
        // Використовуємо ту саму логіку визначення якості, що й для Lampa.Parser
        return getBestDetailedQuality(torrents);
    }
    
    // =======================================================
    // VI. МОДУЛЬ UI (FoxStudio's UI)
    // =======================================================
    var UI = {
        /**
         * Створення HTML для бейджа-іконки
         */
        createBadgeImg: function(type, isCard, index) {
            var iconPath = svgIcons[type];
            if (!iconPath) return '';
            var className = isCard ? 'card-quality-badge' : 'quality-badge';
            var delay = (index * 0.08) + 's';
            // Додаємо alt-текст для доступності
            return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false" oncontextmenu="return false;" alt="' + Utils.escapeHtml(type) + '"></div>';
        },

        /**
         * Додавання групи бейджів на картку
         * @param {jQuery} card - DOM-елемент картки
         * @param {object} best - структура {resolution, hdr, dolbyVision, audio, dub}
         */
        addCardBadges: function(card, best) {
            // Перевіряємо, чи вже додані бейджі
            if (card.find('.card-quality-badges').length) return;
            
            var badges = [];
            if (best.dolbyVision) badges.push(UI.createBadgeImg('Dolby Vision', true, badges.length));
            else if (best.hdr) badges.push(UI.createBadgeImg('HDR', true, badges.length));
            
            if (best.resolution) badges.push(UI.createBadgeImg(best.resolution, true, badges.length));
            if (best.audio) badges.push(UI.createBadgeImg(best.audio, true, badges.length));
            if (best.dub) badges.push(UI.createBadgeImg('DUB', true, badges.length));

            if (badges.length) {
                 // Перевіряємо, чи є елемент .card__view (DOM-залежність)
                var cardView = card.find('.card__view');
                if (cardView.length) {
                    cardView.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
                }
            }
        },

        /**
         * Додавання групи бейджів на сторінку деталізації
         */
        addFullPageBadges: function(movie, containerSelector, callback) {
            var details = $(containerSelector);
            if (!details.length) return;

            // Використовуємо JacRed (як основне джерело), якщо Lampa.Parser недоступний
            // Тут потрібно викликати або JacRed, або Lampa.Parser
            
            // Якщо JacRed URL налаштовано, використовуємо його (як у Maxsm's)
            if (Config.JACRED_URL) {
                // ... логіка JacRed, яка повертає структуру `best`
            } else {
                 // Використовуємо Lampa.Parser (як у FoxStudio's)
                Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
                    if (response && response.Results) {
                        var best = getBestDetailedQuality(response.Results);
                        UI.renderBadgesToContainer(best, details.next('.quality-badges-container'));
                    }
                    if (callback) callback();
                });
            }
        },

        /**
         * Рендеринг бейджів у DOM-контейнер
         */
        renderBadgesToContainer: function(best, container) {
            if (!container || !container.length) return;

            var badges = [];
            if (best.dolbyVision) badges.push(UI.createBadgeImg('Dolby Vision', false, badges.length));
            else if (best.hdr) badges.push(UI.createBadgeImg('HDR', false, badges.length));
            
            if (best.resolution) badges.push(UI.createBadgeImg(best.resolution, false, badges.length));
            if (best.audio) badges.push(UI.createBadgeImg(best.audio, false, badges.length));
            if (best.dub) badges.push(UI.createBadgeImg('DUB', false, badges.length));
            
            container.html(badges.join(''));
        },

        /**
         * Ініціалізація стилів (об'єднано Maxsm's та FoxStudio's)
         */
        initStyles: function() {
            var styleElement = document.createElement('style');
            styleElement.id = 'maxsm_quality_badges_style';
            // Об'єднані стилі: Flexbox для контейнерів, анімація, позиціонування
            styleElement.textContent = `
                .quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }
                .quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }
                .card-quality-badges { 
                    position: absolute; top: 0.3em; right: 0.3em; 
                    display: flex; flex-direction: row; gap: 0.2em; 
                    pointer-events: none; z-index: 5; 
                }
                .card-quality-badge { 
                    height: 0.9em; opacity: 0; transform: translateY(5px); 
                    animation: qb_in 0.3s ease forwards; 
                    transition: transform 0.1s ease; /* Додано для плавності */
                }
                @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }
                .quality-badge img, .card-quality-badge img { 
                    height: 100%; width: auto; display: block; 
                }
                .card-quality-badge img { 
                    filter: drop-shadow(0 1px 2px #000); 
                }
                
                /* Адаптивність */
                @media (max-width: 768px) {
                    .quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }
                    .quality-badge { height: 1em; }
                    .card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }
                    .card-quality-badge { height: 0.75em; }
                }
            `;
            document.head.appendChild(styleElement);
        }
    };

    // =======================================================
    // VII. ОСНОВНІ ФУНКЦІЇ
    // =======================================================

    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return card.name || card.original_name ? 'tv' : 'movie';
    }
    
    /**
     * Запит JacRed для карток у списках
     */
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        if (!Config.JACRED_URL) {
            Utils.logWithContext('log', 'JacRed: JACRED_URL is not set', { cardId: cardId });
            callback(null);
            return;
        }

        if (Config.Q_LOGGING) Utils.logWithContext('log', 'JacRed: Search initiated', { cardId: cardId });
          
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
            var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +
                encodeURIComponent(searchTitle) +
                '&year=' + searchYear +
                (exactMatch ? '&exact=true' : '') +
                '&uid=' + userId;

            Utils.performance.start('jacred_api_' + cardId);
              
            API.queueRequest(apiUrl, cardId, function(error, responseText) { // Використовуємо queueRequest
                Utils.performance.end('jacred_api_' + cardId);
                Utils.stats.increment('requests');
                  
                if (error || !responseText) {
                    Utils.stats.increment('errors');
                    Utils.logWithContext('error', 'JacRed: ' + strategyName + ' request failed or empty', { error: error ? error.message : 'Empty Response', cardId: cardId });
                    apiCallback(null);
                    return;
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
                    
                    // Обробка деталізованої якості
                    var bestBadges = processJacredResult(torrents);

                    if (bestBadges.resolution) {
                        apiCallback({ badges: bestBadges }); // Повертаємо об'єкт з деталями бейджів
                    } else {
                        apiCallback(null);
                    }
                } catch (e) {
                    Utils.stats.increment('errors');
                    Utils.logWithContext('error', 'Error parsing response', { error: e.message, cardId: cardId });
                    apiCallback(null);
                }
            });
        }

        var searchStrategies = [];
        // [Стратегії пошуку...] (залишено як було)
        if (normalizedCard.original_title && /[a-zа-яё0-9]/i.test(normalizedCard.original_title)) {
            searchStrategies.push({ title: normalizedCard.original_title.trim(), year: year, exact: true, name: "OriginalTitle Exact Year" });
        }
        if (normalizedCard.title && /[a-zа-яё0-9]/i.test(normalizedCard.title)) {
            searchStrategies.push({ title: normalizedCard.title.trim(), year: year, exact: true, name: "Title Exact Year" });
        }

        function executeNextStrategy(index) {
            if (index >= searchStrategies.length) {
                if (Config.Q_LOGGING) Utils.logWithContext('log', 'All search strategies failed', { cardId: cardId });
                callback(null);
                return;
            }
            var strategy = searchStrategies[index];
            if (Config.Q_LOGGING) Utils.logWithContext('log', 'Trying strategy', { strategy: strategy.name, cardId: cardId });
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {
                if (result !== null && result.badges.resolution !== null) {
                    if (Config.Q_LOGGING) Utils.logWithContext('log', 'Successfully found badges', { badges: result.badges, cardId: cardId });
                    callback(result);
                } else {
                    executeNextStrategy(index + 1);
                }
            });
        }

        if (searchStrategies.length > 0) {
            executeNextStrategy(0);
        } else {
            if (Config.Q_LOGGING) Utils.logWithContext('log', 'No valid search titles', { cardId: cardId });
            callback(null);
        }
    }

    /**
     * Основна функція оновлення карток
     */
    function updateCards(cards) {
        Utils.performance.start('update_cards_batch');
        Cache.cleanup();
          
        for (var i = 0; i < cards.length; i += Config.BATCH_SIZE) {
            var batch = cards.slice(i, i + Config.BATCH_SIZE);
              
            batch.forEach(function(card) {
                // Використовуємо клас .qb-processed для уникнення повторної обробки (FoxStudio's)
                if (card.classList.contains('qb-processed') || card.hasAttribute('data-quality-added')) return;
                card.classList.add('qb-processed'); // Позначаємо як оброблену
                card.setAttribute('data-quality-added', 'true'); // Позначаємо як оброблену (як Maxsm's)
                        
                var cardView = card.querySelector('.card__view');
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false' && cardView) {
                    var typeElements = cardView.getElementsByClassName('card__type');
                    if (typeElements.length > 0) return;
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
                            
                    if (cacheQualityData) {
                        var badges = cacheQualityData.badges;
                        if (Config.Q_LOGGING) Utils.logWithContext('log', 'Using cached badges', { cardId: localCurrentCard, badges: badges });
                        if (badges) UI.addCardBadges($(currentCard), badges);
                    }
                    else {
                        getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult) {
                            var badges = (jrResult && jrResult.badges) || null;
                              
                            if (badges) {
                                Cache.set(qCacheKey, { badges: badges }, 'quality');
                                UI.addCardBadges($(currentCard), badges);
                            } else {
                                Cache.set(qCacheKey, { badges: null }, 'no_quality');
                            }
                        });
                    }
                })(card);
            });
        }
          
        Utils.performance.end('update_cards_batch');
        if (Config.Q_LOGGING) {
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
     * Обробка сторінки деталізації (З FoxStudio's)
     */
    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;
        var details = $('.full-start-new__details');
        
        if (details.length) {
            if (!$('.quality-badges-container').length) details.after('<div class="quality-badges-container"></div>');
            
            // Використовуємо об'єднану функцію JacRed/Lampa.Parser
            // Якщо JACRED_URL встановлено, це буде JacRed
            // Інакше використовується Lampa.Parser (у UI.addFullPageBadges)
            
            var normalizedCard = {
                id: e.data.movie.id || '',
                title: e.data.movie.title || e.data.movie.name || '',
                original_title: e.data.movie.original_title || e.data.movie.original_name || '',
                release_date: e.data.movie.release_date || e.data.movie.first_air_date || '',
                type: getCardType(e.data.movie)
            };
            var qCacheKey = normalizedCard.type + '_' + normalizedCard.id;
            var cacheQualityData = Cache.get(qCacheKey);
            var container = details.next('.quality-badges-container');

            if (cacheQualityData && cacheQualityData.badges) {
                UI.renderBadgesToContainer(cacheQualityData.badges, container);
            } else {
                 getBestReleaseFromJacred(normalizedCard, normalizedCard.id, function (jrResult) {
                    var badges = (jrResult && jrResult.badges) || null;
                      
                    if (badges) {
                        Cache.set(qCacheKey, { badges: badges }, 'quality');
                        UI.renderBadgesToContainer(badges, container);
                    } else {
                         Cache.set(qCacheKey, { badges: null }, 'no_quality');
                         // Якщо JacRed не спрацював, спробувати Lampa.Parser, якщо JacRed URL не встановлено
                         if (!Config.JACRED_URL) {
                             Lampa.Parser.get({ search: normalizedCard.title, movie: e.data.movie, page: 1 }, function(response) {
                                if (response && response.Results) {
                                    var best = getBestDetailedQuality(response.Results);
                                    Cache.set(qCacheKey, { badges: best }, 'quality');
                                    UI.renderBadgesToContainer(best, container);
                                }
                            });
                         }
                    }
                });
            }
        }
    });
  
    /**
     * Ініціалізація плагіна
     */
    function startPlugin() {
        console.log("MAXSM-RATINGS-QUALITY", "Plugin started with merged features (JacRed + Detailed Badges)!");
          
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
  
        // Запуск observer
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('MAXSM-RATINGS: observer started with debounce');
                    
            var existingCards = document.querySelectorAll('.card');
            if (existingCards.length) {
                if (Config.Q_LOGGING) Utils.logWithContext('log', 'Processing existing cards', { count: existingCards.length });
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
