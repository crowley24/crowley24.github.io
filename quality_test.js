(function () {
    'use strict';
    
    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    var Q_LOGGING = false; // Вимкнено для продуктивності
    var Q_CACHE_TIME = 24 * 60 * 60 * 1000; // Час кешування якості
    var QUALITY_CACHE = 'maxsm_ratings_quality_cache';
    var JACRED_PROTOCOL = 'http://'; 
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';
    var NO_RESULT_MARKER = 'NOT_FOUND'; // Новий маркер для кешування невдалих пошуків
    
    // =======================================================
    // II. СТИЛІ ТА CSS КОД
    // =======================================================
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
        "   display: flex; " +
        "   gap: 4px; " +
        "}" +
        ".card__quality div { " +
        "   text-transform: none !important; " +
        "   border: 1px solid #FFFFFF !important; " +
        "   background-color: rgba(0, 0, 0, 0.7) !important; " + 
        "   color: #FFFFFF !important; " + 
        "   font-weight: bold !important; " + 
        "   font-style: normal !important; " + 
        "   font-size: 1.2em !important; " +
        "   border-radius: 3px !important; " +
        "   padding: 0.2em 0.4em !important; " +
        "   white-space: nowrap; " +
        "}" +
        ".card__quality .dv-tag { background-color: #8A2BE2 !important; border-color: #A968FF !important; }" + 
        ".card__quality .hdr-tag { background-color: #FFA500 !important; border-color: #FFC064 !important; }" + 
        "</style>";

    Lampa.Template.add('maxsm_ratings_quality_css', style);
    $('body').append(Lampa.Template.get('maxsm_ratings_quality_css', {}, true));

    // =======================================================
    // III. ФУНКЦІОНАЛЬНІСТЬ
    // =======================================================

    function getCardType(card) {
        var type = card.media_type || card.type;
        if (type === 'movie' || type === 'tv') return type;
        return card.name || card.original_name ? 'tv' : 'movie';
    }

    /**
     * Комбінує числову якість та маркери DV/HDR. (Без змін)
     */
    function getDisplayQuality(numericQuality, torrentTitle) {
        var result = { quality: null, hdr: null };
        var title = (torrentTitle || '').toLowerCase();

        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) {
            result.hdr = 'DV';
        } else if (/\b(hdr10\+|hdr)\b/i.test(title)) {
            result.hdr = 'HDR';
        }

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
            if (/\b(4k|2160p|uhd)\b/i.test(title)) result.quality = '4K';
            else if (/\b(fullhd|1080p)\b/i.test(title)) result.quality = 'FHD';
            else if (/\b(hd|720p)\b/i.test(title)) result.quality = 'HD';
        }

        if (result.hdr && !result.quality) {
            result.quality = '4K';
        }
        
        if (result.hdr && result.quality === 'HD') {
             result.hdr = null;
        }

        return result;
    }

    /**
     * Запит до JacRed без використання проксі.
     */
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        if (!JACRED_URL) {
            callback(null);
            return;
        }

        var year = '';
        var dateStr = normalizedCard.release_date || '';
        if (dateStr.length >= 4) {
            year = dateStr.substring(0, 4);
        }
        if (!year || isNaN(year)) {
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

            // ЗМІНЕНО: Прямий fetch без проксі та спрощена обробка помилок
            fetch(apiUrl)
                .then(function(response) {
                    if (!response.ok) throw new Error('JacRed API error: ' + response.status);
                    return response.json();
                })
                .then(function(torrents) {
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        apiCallback(null);
                        return;
                    }

                    var bestNumericQuality = -1;
                    var bestFoundTorrent = null;

                    for (var i = 0; i < torrents.length; i++) {
                        var currentTorrent = torrents[i];
                        var currentNumericQuality = currentTorrent.quality;
                        var lowerTitle = (currentTorrent.title || '').toLowerCase();
                        
                        // Пріоритет HDR/DV, якщо немає числової якості
                        if (typeof currentNumericQuality !== 'number' || currentNumericQuality === 0) {
                           if (/\b(dolby\s*vision|dv|hdr)\b/i.test(lowerTitle)) {
                               currentNumericQuality = 2160; 
                           } else {
                               continue;
                           }
                        }

                        if (currentNumericQuality > bestNumericQuality) {
                            bestNumericQuality = currentNumericQuality;
                            bestFoundTorrent = currentTorrent;
                        }
                    }

                    if (bestFoundTorrent) {
                        var display = getDisplayQuality(bestFoundTorrent.quality || bestNumericQuality, bestFoundTorrent.title);
                        apiCallback({
                            quality: display.quality,
                            hdr: display.hdr,
                            title: bestFoundTorrent.title
                        });
                    } else {
                        apiCallback(null);
                    }
                })
                .catch(function(error) {
                    if (Q_LOGGING) console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed request failed:", error);
                    apiCallback(null);
                });
        }

        var searchStrategies = [];
        // ... (Логіка стратегій пошуку без змін) ...
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
                callback(null);
                return;
            }
            var strategy = searchStrategies[index];
            searchJacredApi(strategy.title, strategy.year, strategy.exact, strategy.name, function(result) {
                if (result !== null) {
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

    // Функції для роботи з кешем якості (ЗМІНЕНО: Кешування "НЕ ЗНАЙДЕНО")
    function getQualityCache(key) {
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        var item = cache[key];
        return item && (Date.now() - item.timestamp < Q_CACHE_TIME) ? item : null;
    }

    function saveQualityCache(key, data, localCurrentCard) {
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};
        cache[key] = {
            quality: data.quality || NO_RESULT_MARKER, // Кешуємо маркер, якщо не знайдено
            hdr: data.hdr || null, 
            timestamp: Date.now()
        };
        Lampa.Storage.set(QUALITY_CACHE, cache);
    }

    // Функція застосування якості до картки (ЗМІНЕНО: ігноруємо маркер NO_RESULT)
    function applyQualityToCard(card, quality, hdr, source, qCacheKey) {
        if (!document.body.contains(card)) return;
        
        // Якщо якість є маркером "НЕ ЗНАЙДЕНО", просто кешуємо і виходимо
        if (quality === NO_RESULT_MARKER) {
             if (source === 'JacRed') {
                 saveQualityCache(qCacheKey, { quality: NO_RESULT_MARKER, hdr: null }, card.card_data ? card.card_data.id : 'unknown');
             }
             return;
        }

        card.setAttribute('data-quality-added', 'true');
        var cardView = card.querySelector('.card__view');
        if (!cardView) return;

        var existingQualityElements = cardView.getElementsByClassName('card__quality');
        while(existingQualityElements.length > 0){
            existingQualityElements[0].parentNode.removeChild(existingQualityElements[0]);
        }

        // Зберігаємо в кеш, якщо дані від JacRed і вони позитивні
        if (source === 'JacRed' && (quality || hdr)) {
            var cardId = card.card_data ? card.card_data.id : 'unknown';
            saveQualityCache(qCacheKey, { quality: quality, hdr: hdr }, cardId);
        }

        if (quality || hdr) {
            var qualityDiv = document.createElement('div');
            qualityDiv.className = 'card__quality';
            
            // 1. Додаємо бейдж HDR/DV
            if (hdr) {
                var hdrInner = document.createElement('div');
                hdrInner.textContent = hdr;
                hdrInner.className = hdr.toLowerCase() + '-tag';
                qualityDiv.appendChild(hdrInner);
            }

            // 2. Додаємо бейдж роздільної здатності
            if (quality) {
                var qualityInner = document.createElement('div');
                qualityInner.textContent = quality;
                qualityDiv.appendChild(qualityInner);
            }

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
            
            var data = card.card_data;
            if (!data) continue;
            
            // ... (Логіка пропуску TV, якщо вимкнено) ...

            (function (currentCard) {
                var normalizedCard = {
                    id: data.id || '',
                    title: data.title || data.name || '',
                    original_title: data.original_title || data.original_name || '',
                    release_date: data.release_date || data.first_air_date || '',
                    type: getCardType(data)
                };

                // Додаткова перевірка типу, якщо верхня логіка пропуску використовується
                if (localStorage.getItem('maxsm_ratings_quality_tv') === 'false' && normalizedCard.type === 'tv') return;

                var qCacheKey = normalizedCard.type + '_' + normalizedCard.id;
                var cacheQualityData = getQualityCache(qCacheKey);
                
                // Якщо є кеш - одразу застосовуємо
                if (cacheQualityData) {
                    applyQualityToCard(currentCard, cacheQualityData.quality, cacheQualityData.hdr, 'Cache', qCacheKey);
                }
                // Якщо немає кешу - запитуємо у JacRed
                else {
                    getBestReleaseFromJacred(normalizedCard, normalizedCard.id, function (jrResult) {
                        var quality = (jrResult && jrResult.quality) || null;
                        var hdr = (jrResult && jrResult.hdr) || null;
                        
                        // Якщо нічого не знайдено, використовуємо маркер "НЕ ЗНАЙДЕНО"
                        if (!quality && !hdr) {
                            quality = NO_RESULT_MARKER;
                        }

                        applyQualityToCard(currentCard, quality, hdr, 'JacRed', qCacheKey);
                    });
                }
            })(card);
        }
    }

    // ... (Observer та startPlugin без змін) ...
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

    function startPlugin() {
        if (!localStorage.getItem('maxsm_ratings_quality')) {
            localStorage.setItem('maxsm_ratings_quality', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_inlist')) {
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');
        }
        if (!localStorage.getItem('maxsm_ratings_quality_tv')) {
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');
        }

        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
            try {
                observer.observe(document.body, { childList: true, subtree: true });
            } catch (e) {
                console.error('MAXSM-RATINGS: Failed to start MutationObserver', e);
            }
            
            var existingCards = document.querySelectorAll('.card');
            if (existingCards.length) updateCards(existingCards);
        }
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        startPlugin();
    }
})();
