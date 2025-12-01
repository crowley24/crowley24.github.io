function () {  
    'use strict';  
      
    var DEBUG = true;  
    var QUALITY_CACHE = 'dv_quality_cache';  
    var CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  
      
    // Стилі для бейджів якості з різними кольорами  
    var style = document.createElement('style');  
    style.id = 'dv_quality_style';  
    style.textContent = `  
        .card__quality-badge {  
            position: absolute !important;  
            top: 10px !important;  
            right: 10px !important;  
            font-size: 0.7em !important;  
            font-weight: bold !important;  
            padding: 5px 10px !important;  
            border-radius: 5px !important;  
            z-index: 9999 !important;  
            text-transform: uppercase !important;  
            box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;  
        }  
          
        /* Dolby Vision - фіолетовий */  
        .card__quality-badge.dv {  
            background: linear-gradient(45deg, #6B46C1, #553C9A) !important;  
            color: #FFFFFF !important;  
        }  
          
        /* HDR - золотий */  
        .card__quality-badge.hdr {  
            background: linear-gradient(45deg, #FFD700, #FFA500) !important;  
            color: #000000 !important;  
        }  
          
        /* HDR10+ - помаранчевий */  
        .card__quality-badge.hdr10plus {  
            background: linear-gradient(45deg, #FF8C00, #FF6347) !important;  
            color: #FFFFFF !important;  
        }  
          
        /* 4K - синій */  
        .card__quality-badge.uhd {  
            background: linear-gradient(45deg, #0066CC, #004499) !important;  
            color: #FFFFFF !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Функція виявлення якості з назви торренту  
    function detectQuality(torrentTitle) {  
        if (!torrentTitle) return null;  
          
        var title = torrentTitle.toLowerCase();  
          
        // Перевіряємо Dolby Vision  
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) {  
            return { type: 'dv', text: 'DV' };  
        }  
          
        // Перевіряємо HDR10+  
        if (/\b(hdr10\+|hdr10plus)\b/i.test(title)) {  
            return { type: 'hdr10plus', text: 'HDR10+' };  
        }  
          
        // Перевіряємо HDR  
        if (/\b(hdr|hdr10)\b/i.test(title)) {  
            return { type: 'hdr', text: 'HDR' };  
        }  
          
        // Перевіряємо 4K  
        if (/\b(4k|2160p|uhd)\b/i.test(title)) {  
            return { type: 'uhd', text: '4K' };  
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
          
        var apiUrl = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +   
                    '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +   
                    '&year=' + movieData.year + '&exact=true';  
          
        if (DEBUG) console.log('DV Plugin: API URL:', apiUrl);  
          
        fetch(apiUrl)  
            .then(function(response) {  
                if (!response.ok) throw new Error('API error');  
                return response.json();  
            })  
            .then(function(torrents) {  
                if (DEBUG) console.log('DV Plugin: Got torrents:', torrents.length);  
                callback(torrents || []);  
            })  
            .catch(function(error) {  
                console.error('DV Plugin: API error:', error);  
                callback([]);  
            });  
    }  
      
    // Функція додавання бейджа якості до картки  
    function addQualityBadge(card, quality) {  
        if (!card || !quality) return;  
          
        var cardView = card.querySelector('.card__view');  
        if (!cardView) return;  
          
        // Перевіряємо чи вже є бейдж  
        var existingBadge = cardView.querySelector('.card__quality-badge');  
        if (existingBadge) {  
            existingBadge.className = 'card__quality-badge ' + quality.type;  
            existingBadge.textContent = quality.text;  
        } else {  
            var badge = document.createElement('div');  
            badge.className = 'card__quality-badge ' + quality.type;  
            badge.textContent = quality.text;  
            cardView.appendChild(badge);  
        }  
          
        if (DEBUG) console.log('DV Plugin: Added', quality.text, 'badge to card');  
    }  
      
    // Основна функція обробки картки  
    function processCard(card) {  
        if (card.hasAttribute('data-dv-processed')) return;  
          
        var movieData = getCardData(card);  
        if (!movieData || !movieData.id) return;  
          
        card.setAttribute('data-dv-processed', 'true');  
          
        // Перевіряємо кеш  
        var cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
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
                    // Пріоритет: DV > HDR10+ > HDR > 4K  
                    if (!bestQuality ||   
                        (quality.type === 'dv') ||  
                        (quality.type === 'hdr10plus' && bestQuality.type !== 'dv') ||  
                        (quality.type === 'hdr' && bestQuality.type !== 'dv' && bestQuality.type !== 'hdr10plus') ||  
                        (quality.type === 'uhd' && bestQuality.type !== 'dv' && bestQuality.type !== 'hdr10plus' && bestQuality.type !== 'hdr')) {  
                        bestQuality = quality;  
                    }  
                }  
            }  
              
            // Зберігаємо в кеш  
            cache[movieData.id] = {  
                quality: bestQuality,  
                timestamp: Date.now()  
            };  
            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));  
              
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
