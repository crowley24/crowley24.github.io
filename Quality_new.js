(function () {  
    'use strict';  
      
    var DEBUG = true;  
    var QUALITY_CACHE = 'dv_quality_cache';  
    var CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  
      
    // Стилі для бейджа якості  
    var style = "<style id=\"dv_quality_style\">" +  
        ".card__quality-badge { " +  
        "   position: absolute !important; " +  
        "   top: 0.5em !important; " +  
        "   right: 0.5em !important; " +  
        "   background: linear-gradient(45deg, #0066CC, #004499) !important; " +  
        "   color: #FFFFFF !important; " +  
        "   font-size: 0.7em !important; " +  
        "   font-weight: bold !important; " +  
        "   padding: 0.3em 0.5em !important; " +  
        "   border-radius: 0.5em !important; " +  
        "   z-index: 15 !important; " +  
        "   text-transform: uppercase !important; " +  
        "   box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important; " +  
        "}" +  
        "</style>";  
      
    // Додаємо стилі  
    if (!document.getElementById('dv_quality_style')) {  
        var styleElement = document.createElement('style');  
        styleElement.id = 'dv_quality_style';  
        styleElement.textContent = style.replace(/<style[^>]*>|<\/style>/g, '');  
        document.head.appendChild(styleElement);  
    }  
      
    // Функція виявлення якості з назви торренту  
    function detectQuality(torrentTitle) {  
        if (!torrentTitle) return null;  
          
        var title = torrentTitle.toLowerCase();  
          
        // Перевіряємо Dolby Vision  
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) {  
            return 'DV';  
        }  
          
        // Перевіряємо HDR  
        if (/\b(hdr|hdr10|hdr10\+)\b/i.test(title)) {  
            return 'HDR';  
        }  
          
        // Перевіряємо 4K  
        if (/\b(4k|2160p|uhd)\b/i.test(title)) {  
            return '4K';  
        }  
          
        return null;  
    }  
      
    // Функція отримання даних картки  
    function getCardData(card) {  
        var data = card.card_data;  
        if (!data) return null;  
          
        return {  
            id: data.id || '',  
            title: data.title || data.name || '',  
            year: data.release_date ? data.release_date.substring(0, 4) : ''  
        };  
    }  
      
    // Функція запиту до API за торрентами  
    function getTorrents(movieData, callback) {  
        if (!movieData || !movieData.title) {  
            callback([]);  
            return;  
        }  
          
        // Використовуємо існуючий API JacRed для отримання торрентів  
        var apiUrl = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +   
                    '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +   
                    '&year=' + movieData.year + '&exact=true';  
          
        fetch(apiUrl)  
            .then(function(response) {  
                if (!response.ok) throw new Error('API error');  
                return response.json();  
            })  
            .then(function(torrents) {  
                callback(torrents || []);  
            })  
            .catch(function(error) {  
                if (DEBUG) console.log('DV Plugin: API error:', error);  
                callback([]);  
            });  
    }  
      
    // Функція додавання бейджа до картки  
    function addQualityBadge(card, quality) {  
        if (!card || !quality) return;  
          
        var cardView = card.querySelector('.card__view');  
        if (!cardView) return;  
          
        // Видаляємо існуючий бейдж  
        var existingBadge = cardView.querySelector('.card__quality-badge');  
        if (existingBadge) {  
            existingBadge.remove();  
        }  
          
        // Створюємо новий бейдж  
        var badge = document.createElement('div');  
        badge.className = 'card__quality-badge';  
        badge.textContent = quality;  
          
        cardView.appendChild(badge);  
          
        if (DEBUG) {  
            var movieData = getCardData(card);  
            console.log('DV Plugin: Added', quality, 'badge to', movieData.title);  
        }  
    }  
      
    // Функція обробки картки  
    function processCard(card) {  
        if (card.hasAttribute('data-dv-processed')) return;  
          
        var movieData = getCardData(card);  
        if (!movieData || !movieData.id) return;  
          
        card.setAttribute('data-dv-processed', 'true');  
          
        // Перевіряємо кеш  
        var cache = Lampa.Storage.get(QUALITY_CACHE) || {};  
        var cached = cache[movieData.id];  
          
        if (cached && (Date.now() - cached.timestamp < CACHE_TIME)) {  
            if (cached.quality) {  
                addQualityBadge(card, cached.quality);  
            }  
            return;  
        }  
          
        // Запитуємо дані з API  
        getTorrents(movieData, function(torrents) {  
            var bestQuality = null;  
              
            for (var i = 0; i < torrents.length; i++) {  
                var quality = detectQuality(torrents[i].title);  
                if (quality) {  
                    // Пріоритет: DV > HDR > 4K  
                    if (!bestQuality ||   
                        (quality === 'DV') ||  
                        (quality === 'HDR' && bestQuality !== 'DV') ||  
                        (quality === '4K' && bestQuality !== 'DV' && bestQuality !== 'HDR')) {  
                        bestQuality = quality;  
                    }  
                }  
            }  
              
            // Зберігаємо в кеш  
            cache[movieData.id] = {  
                quality: bestQuality,  
                timestamp: Date.now()  
            };  
            Lampa.Storage.set(QUALITY_CACHE, cache);  
              
            // Додаємо бейдж  
            if (bestQuality) {  
                addQualityBadge(card, bestQuality);  
            }  
        });  
    }  
      
    // Обробка всіх карток  
    function processAllCards() {  
        var cards = document.querySelectorAll('.card:not([data-dv-processed])');  
        if (DEBUG) console.log('DV Plugin: Processing', cards.length, 'cards');  
          
        for (var i = 0; i < cards.length; i++) {  
            processCard(cards[i]);  
        }  
    }  
      
    // Спостерігач за новими картками  
    var observer = new MutationObserver(function(mutations) {  
        setTimeout(processAllCards, 500);  
    });  
      
    // Ініціалізація  
    function init() {  
        if (DEBUG) console.log('DV Plugin: Starting automatic quality detection');  
          
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
          
        processAllCards();  
    }  
      
    // Запуск  
    if (typeof Lampa !== 'undefined') {  
        init();  
    } else {  
        var checkInterval = setInterval(function() {  
            if (typeof Lampa !== 'undefined') {  
                clearInterval(checkInterval);  
                init();  
            }  
        }, 500);  
    }  
})();
