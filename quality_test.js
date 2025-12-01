(function () {
    'use strict';
    
    var Q_LOGGING = true; // Логування якості
    var Q_CACHE_TIME = 24 * 60 * 60 * 1000; // Час кешування якості
    var QUALITY_CACHE = 'maxsm_ratings_quality_cache';
    var JACRED_PROTOCOL = 'http://'; // Протокол JacRed
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz'; // Адреса JacRed
    var JACRED_API_KEY = Lampa.Storage.get(''); // api ключ JacRed
    var PROXY_TIMEOUT = 5000; // Таймаут проксі
    var PROXY_LIST = [
        'http://api.allorigins.win/raw?url=',
        'http://cors.bwa.workers.dev/'
    ];

    // Стилі для відображення якості - ЧОРНА підкладка, БІЛИЙ текст
    var style = "<style id=\"maxsm_ratings_quality\">" +
        ".card__view {position: relative !important;}" +
        ".card__quality { " +
        "   position: absolute !important; " +
        "   bottom: 0.5em !important; " +
        "   left: -0.8em !important; " +
        "   background-color: transparent !important; " +
        "   z-index: 10; " +
        "   width: fit-content !important; " +
        "   max-width: calc(100% - 1em) !important; " +
        "   display: flex; /* Додано: для відображення кількох тегів */" +
        "   gap: 4px; /* Додано: проміжок між тегами */" +
        "}" +
        ".card__quality div { " +
        "   text-transform: none !important; " +
        "   border: 1px solid #FFFFFF !important; " +
        "   background-color: rgba(0, 0, 0, 0.7) !important; " + // Чорна напівпрозора підкладка
        "   color: #FFFFFF !important; " + // Білий текст
        "   font-weight: bold !important; " + // Жирний шрифт
        "   font-style: normal !important; " + // Не курсив
        "   font-size: 1.2em !important; " +
        "   border-radius: 3px !important; " +
        "   padding: 0.2em 0.4em !important; " +
        "   white-space: nowrap; /* Не дозволяти перенос */" +
        "}" +
        /* ДОДАТКОВІ СТИЛІ ДЛЯ DV/HDR */
        ".card__quality .dv-tag { background-color: #8A2BE2 !important; border-color: #A968FF !important; }" + /* Dolby Vision (Фіолетовий) */
        ".card__quality .hdr-tag { background-color: #FFA500 !important; border-color: #FFC064 !important; }" + /* HDR (Помаранчевий) */
        "</style>";

    Lampa.Template.add('maxsm_ratings_quality_css', style);
    $('body').append(Lampa.Template.get('maxsm_ratings_quality_css', {}, true));

    // Функція для отримання типу картки
    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return card.name || card.original_name ? 'tv' : 'movie';
    }

    // Функція для роботи з проксі (без змін)
    function fetchWithProxy(url, cardId, callback) {
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

    /**
     * Комбінує числову якість та маркери DV/HDR.
     * @param {number | null} numericQuality Числова якість (2160, 1080 і т.д.).
     * @param {string} torrentTitle Назва торрента.
     * @returns {{quality: string, hdr: string}} Об'єкт з основним тегом якості та тегом HDR/DV.
     */
    function getDisplayQuality(numericQuality, torrentTitle) {
        var result = { quality: null, hdr: null };
        var title = (torrentTitle || '').toLowerCase();

        // 1. Визначення HDR/DV
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) {
            result.hdr = 'DV';
        } else if (/\b(hdr10\+|hdr)\b/i.test(title)) {
            result.hdr = 'HDR';
        }

        // 2. Визначення роздільної здатності
        if (typeof numericQuality === 'number' && numericQuality > 0) {
            if (numericQuality >= 2160) {
                result.quality = '4K';
            } else if (numericQuality >= 1080) {
                result.quality = 'FHD';
            } else if (numericQuality >= 720) {
                result.quality = 'HD';
            } else {
                result.quality = 'SD';
            }
        } else {
            // Якщо немає числової якості, але є 4K/FHD/HD у назві
            if (/\b(4k|2160p|uhd)\b/i.test(title)) result.quality = '4K';
            else if (/\b(fullhd|1080p)\b/i.test(title)) result.quality = 'FHD';
            else if (/\b(hd|720p)\b/i.test(title)) result.quality = 'HD';
        }

        // Логіка: Якщо знайдено DV/HDR, і роздільна здатність невідома, 
        // припускаємо 4K, оскільки це найпоширеніший формат для DV/HDR.
        if (result.hdr && !result.quality) {
            result.quality = '4K';
        }
        
        // Якщо є DV/HDR, але роздільна здатність низька (720p), DV/HDR ігнорується,
        // оскільки JacRed шукає найкращий торрент за роздільною здатністю.
        if (result.hdr && result.quality === 'HD') {
             result.hdr = null;
        }

        return result;
    }

    // Функція отримання якості з JacRed
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        if (!JACRED_URL) {
            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: JACRED_URL is not set.");
            callback(null);
            return;
        }

        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: Search initiated.");
        var year = '';
        var dateStr = normalizedCard.release_date || '';
        if (dateStr.length >= 4) {
            year = dateStr.substring(0, 4);
        }
        if (!year || isNaN(year)) {
            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: Missing/invalid year.");
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

            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " URL: " + apiUrl);

            var timeoutId = setTimeout(function() {
                if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " request timed out.");
                apiCallback(null);
            }, PROXY_TIMEOUT * PROXY_LIST.length + 1000);

            fetchWithProxy(apiUrl, cardId, function(error, responseText) {
                clearTimeout(timeoutId);
                if (error || !responseText) {
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " request failed:", error || "Empty response");
                    apiCallback(null);
                    return;
                }
                
                try {
                    var torrents = JSON.parse(responseText);
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " received no torrents.");
                        apiCallback(null);
                        return;
                    }

                    var bestNumericQuality = -1;
                    var bestFoundTorrent = null;
                    var bestHdrType = null; // Зберігаємо найкращий HDR/DV тип
                    
                    for (var i = 0; i < torrents.length; i++) {
                        var currentTorrent = torrents[i];
                        var currentNumericQuality = currentTorrent.quality;
                        var lowerTitle = (currentTorrent.title || '').toLowerCase();
                        
                        // Фільтрування низької якості (як у вихідному коді)
                        if (/\b(ts|telesync|camrip|cam)\b/i.test(lowerTitle) && currentNumericQuality < 720) {
                           continue;
                        }
                        if (typeof currentNumericQuality !== 'number' || currentNumericQuality === 0) {
                           // Якщо немає числової якості, але є HDR/DV, ставимо високий пріоритет
                           if (/\b(dolby\s*vision|dv|hdr)\b/i.test(lowerTitle)) {
                               currentNumericQuality = 2160; // Штучно підвищуємо для пріоритету
                           } else {
                               continue;
                           }
                        }

                        // Логіка вибору найкращого торрента (за роздільною здатністю)
                        if (currentNumericQuality > bestNumericQuality) {
                            bestNumericQuality = currentNumericQuality;
                            bestFoundTorrent = currentTorrent;
                        }
                    }

                    if (bestFoundTorrent) {
                        var display = getDisplayQuality(bestFoundTorrent.quality || bestNumericQuality, bestFoundTorrent.title);
                        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: Found best torrent: \"" + bestFoundTorrent.title + "\" | Quality: " + display.quality + (display.hdr ? ' + ' + display.hdr : ''));
                        
                        apiCallback({
                            quality: display.quality,
                            hdr: display.hdr,
                            title: bestFoundTorrent.title
                        });
                    } else {
                        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: No suitable torrents found.");
                        apiCallback(null);
                    }
                } catch (e) {
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " error parsing response:", e);
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
                if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: All strategies failed.");
                callback(null);
                return;
            }
            var strategy = searchStrategies[index];
            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: Trying strategy: " + strategy.name);
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {
                if (result !== null) {
                    if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: Successfully found quality: " + (result.quality || 'N/A') + (result.hdr ? ' + ' + result.hdr : ''));
                    callback(result);
                } else {
                    executeNextStrategy(index + 1);
                }
            });
        }

        if (searchStrategies.length > 0) {
            executeNextStrategy(0);
        } else {
            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: No valid search titles.");
            callback(null);
        }
    }

    // Функції для роботи з кешем якості (змінено, щоб зберігати HDR/DV)
    function getQualityCache(key) {
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        var item = cache[key];
        return item && (Date.now() - item.timestamp < Q_CACHE_TIME) ? item : null;
    }

    function saveQualityCache(key, data, localCurrentCard) {
        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", quality: Save quality cache");
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        cache[key] = {
            quality: data.quality || null,
            hdr: data.hdr || null, // Зберігаємо HDR/DV
            timestamp: Date.now()
        };
        Lampa.Storage.set(QUALITY_CACHE, cache);
    }

    // Функція застосування якості до картки (змінено для відображення кількох тегів)
    function applyQualityToCard(card, quality, hdr, source, qCacheKey) {
        if (!document.body.contains(card)) return;
        
        card.setAttribute('data-quality-added', 'true');
        var cardView = card.querySelector('.card__view');
        if (!cardView) return;

        var existingQualityElements = cardView.getElementsByClassName('card__quality');
        while(existingQualityElements.length > 0){
            existingQualityElements[0].parentNode.removeChild(existingQualityElements[0]);
        }

        // Зберігаємо в кеш, якщо дані від JacRed
        if (source === 'JacRed' && (quality || hdr) && (quality !== 'NO' && hdr !== 'NO')) {
            var cardId = card.card_data ? card.card_data.id : 'unknown';
            saveQualityCache(qCacheKey, { quality: quality, hdr: hdr }, cardId);
        }

        if (quality || hdr) {
            var qualityDiv = document.createElement('div');
            qualityDiv.className = 'card__quality';
            
            // 1. Додаємо бейдж HDR/DV (пріоритет)
            if (hdr && hdr !== 'NO') {
                var hdrInner = document.createElement('div');
                hdrInner.textContent = hdr;
                hdrInner.className = hdr.toLowerCase() + '-tag'; // dv-tag, hdr-tag
                qualityDiv.appendChild(hdrInner);
            }

            // 2. Додаємо бейдж роздільної здатності
            if (quality && quality !== 'NO') {
                var qualityInner = document.createElement('div');
                qualityInner.textContent = quality;
                qualityDiv.appendChild(qualityInner);
            }

            // Якщо ми відобразили хоча б один бейдж, додаємо контейнер
            if (qualityDiv.children.length > 0) {
                cardView.appendChild(qualityDiv);
            }
        }
    }

    // Основна функція оновлення карток
    function updateCards(cards) {
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.hasAttribute('data-quality-added')) continue;
            
            var cardView = card.querySelector('.card__view');
            // ... (поточна логіка пропуску, якщо вимкнено для TV) ...
            if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false') {
                if (cardView) {
                    var typeElements = cardView.getElementsByClassName('card__type');
                    // Це не надійний спосіб перевірки типу. Краще перевіряти card.card_data.media_type
                    if (data && data.media_type === 'tv') continue;
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
                
                // Додаткова перевірка типу, якщо верхня логіка пропуску використовується
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false' && normalizedCard.type === 'tv') return;

                var localCurrentCard = normalizedCard.id;
                var qCacheKey = normalizedCard.type + '_' + normalizedCard.id;
                var cacheQualityData = getQualityCache(qCacheKey);
                
                // Якщо є кеш - одразу застосовуємо
                if (cacheQualityData) {
                    if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + localCurrentCard + ", quality: Get Quality data from cache");
                    applyQualityToCard(currentCard, cacheQualityData.quality, cacheQualityData.hdr, 'Cache', qCacheKey);
                }
                // Якщо немає кешу - запитуємо у JacRed
                else {
                    getBestReleaseFromJacred(normalizedCard, localCurrentCard, function (jrResult) {
                        var quality = (jrResult && jrResult.quality) || null;
                        var hdr = (jrResult && jrResult.hdr) || null;
                        applyQualityToCard(currentCard, quality, hdr, 'JacRed', qCacheKey);
                    });
                }
            })(card);
        }
    }

    // (Observer, startPlugin, ініціалізація без змін)

    // Observer для відстежування нових карток
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
        if (newCards.length) updateCards(newCards);
    });

     // Ініціалізація плагіна
    function startPlugin() {
        console.log("MAXSM-RATINGS-QUALITY", "Plugin started!");
        
        // Настройки по умовчанню
        if (!localStorage.getItem('maxsm_ratings_quality')) {
            localStorage.setItem('maxsm_ratings_quality', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_inlist')) {
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_tv')) {
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');
        }

        // Запуск observer, якщо включено відображення якості в списках
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('MAXSM-RATINGS: observer Start');
            
            // Обробка вже існуючих карток
            var existingCards = document.querySelectorAll('.card');
            if (existingCards.length) updateCards(existingCards);
        }
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        startPlugin();
    }
})();
