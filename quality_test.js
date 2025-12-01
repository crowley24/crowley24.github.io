(function () {  
    'use strict';  
  
    var DEBUG = true;  
    var QUALITY_CACHE = 'dv_quality_cache';  
    var CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  
  
    // Стилі бейджів у стилі 4K HDR картинки
    var style = document.createElement('style');  
    style.id = 'dv_quality_style';  
    style.textContent = `  
        .card__quality-badge {  
            position: absolute !important;  
            top: 10px !important;  
            right: 10px !important;

            background: linear-gradient(180deg, #FFD84D, #FFB800) !important;
            color: #000 !important;
            font-size: 0.72em !important;
            font-weight: 900 !important;
            padding: 5px 12px !important;
            border-radius: 6px !important;

            box-shadow: 0 3px 6px rgba(0,0,0,0.35) !important;
            border: 2px solid #000 !important;

            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;

            z-index: 9999 !important;
        }
    `;  
    document.head.appendChild(style);  
  
    // Визначення якості
    function detectQuality(torrentTitle) {  
        if (!torrentTitle) return null;  
          
        var title = torrentTitle.toLowerCase();  
          
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title))  
            return 'DV';  
          
        if (/\b(hdr|hdr10|hdr10\+)\b/i.test(title))  
            return 'HDR';  
          
        if (/\b(4k|2160p|uhd)\b/i.test(title))  
            return '4K';  
          
        return null;  
    }  
  
    // Дані картки
    function getCardData(card) {  
        var data = card.card_data;  
        if (!data) return null;  
  
        return {  
            id: data.id || '',  
            title: data.title || data.name || '',  
            year: data.release_date ? data.release_date.substring(0, 4) : ''  
        };  
    }  
  
    // API пошук
    function getTorrents(movieData, callback) {  
        if (!movieData || !movieData.title) {  
            callback([]);  
            return;  
        }  
  
        var apiUrl =  
            'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +  
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
                if (DEBUG) console.log('DV Plugin: API error:', error);  
                callback([]);  
            });  
    }  
  
    // Додавання бейджа
    function addQualityBadge(card, quality) {  
        if (!card || !quality) return;  
  
        var existingBadge = card.querySelector('.card__quality-badge');  
        if (existingBadge) existingBadge.remove();  
  
        var badge = document.createElement('div');  
        badge.className = 'card__quality-badge';  
  
        if (quality === 'DV') badge.textContent = '4K Dolby Vision';  
        else if (quality === 'HDR') badge.textContent = '4K HDR';  
        else badge.textContent = '4K';  
  
        card.appendChild(badge);  
  
        if (DEBUG) console.log('DV Plugin: Added', badge.textContent);  
    }  
  
    // Обробка однієї картки
    function processCard(card) {  
        if (card.hasAttribute('data-dv-processed')) return;  
  
        var movieData = getCardData(card);  
        if (!movieData || !movieData.id) return;  
  
        card.setAttribute('data-dv-processed', 'true');  
  
        var cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
        var cached = cache[movieData.id];  
  
        if (cached && (Date.now() - cached.timestamp < CACHE_TIME)) {  
            if (cached.quality) addQualityBadge(card, cached.quality);  
            return;  
        }  
  
        getTorrents(movieData, function(torrents) {  
            var bestQuality = null;  
  
            for (var i = 0; i < torrents.length; i++) {  
                var q = detectQuality(torrents[i].title);  
                if (!q) continue;  
  
                if (!bestQuality ||  
                    (q === 'DV') ||  
                    (q === 'HDR' && bestQuality !== 'DV') ||  
                    (q === '4K' && !['DV', 'HDR'].includes(bestQuality))) {  
                    bestQuality = q;  
                }  
            }  
  
            cache[movieData.id] = {  
                quality: bestQuality,  
                timestamp: Date.now()  
            };  
            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));  
  
            if (bestQuality) addQualityBadge(card, bestQuality);  
        });  
    }  
  
    // Обробка всіх карток
    function processAllCards() {  
        var cards = document.querySelectorAll('.card:not([data-dv-processed])');  
        if (DEBUG) console.log('DV Plugin: Processing', cards.length, 'cards');  
  
        for (var i = 0; i < cards.length; i++) processCard(cards[i]);  
    }  
  
    // Спостерігач DOM
    var observer = new MutationObserver(function() {  
        setTimeout(processAllCards, 400);  
    });  
  
    // Старт
    function init() {  
        if (DEBUG) console.log('DV Plugin: Started');  
  
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
  
        processAllCards();  
    }  
  
    if (typeof Lampa !== 'undefined') init();  
    else {  
        var interval = setInterval(function() {  
            if (typeof Lampa !== 'undefined') {  
                clearInterval(interval);  
                init();  
            }  
        }, 500);  
    }  
})();
