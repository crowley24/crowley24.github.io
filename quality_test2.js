(function () {  
    'use strict';  

    var DEBUG = true;  
    var QUALITY_CACHE = 'dv_quality_cache';  
    var CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  

    // Стиль мінімалістичних бейджів (варіант C)
    var style = document.createElement('style');  
    style.id = 'dv_quality_style';  
    style.textContent = `
        .card__quality-badge {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            display: flex !important;
            gap: 4px !important;
            z-index: 9999 !important;
        }
        
        .quality-tag {
            background: #000 !important;
            color: #fff !important;
            font-size: 0.55em !important;
            font-weight: 600 !important;
            padding: 3px 6px !important;
            border-radius: 3px !important;
            letter-spacing: 0.5px !important;
            text-transform: uppercase !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
        }
    `;
    document.head.appendChild(style);

    // Визначення якості
    function detectQuality(torrentTitle) {  
        if (!torrentTitle) return null;  
        
        var title = torrentTitle.toLowerCase();  

        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) return 'DV';
        if (/\b(hdr|hdr10|hdr10\+)\b/i.test(title)) return 'HDR';
        if (/\b(4k|2160p|uhd)\b/i.test(title)) return '4K';
        
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

    // API запит  
    function getTorrents(movieData, callback) {  
        if (!movieData || !movieData.title) {  
            callback([]);  
            return;  
        }  
        
        var apiUrl = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +   
                    '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +   
                    '&year=' + movieData.year + '&exact=true';  

        fetch(apiUrl)
            .then(r => r.ok ? r.json() : [])
            .then(torrents => callback(torrents || []))
            .catch(() => callback([]));
    }

    // Додаємо бейдж  
    function addQualityBadge(card, bestQuality) {  
        if (!card || !bestQuality) return;

        var existing = card.querySelector('.card__quality-badge');
        if (existing) existing.remove();

        var box = document.createElement('div');
        box.className = 'card__quality-badge';

        // завжди показуємо 4K коли DV або HDR
        if (bestQuality === 'DV' || bestQuality === 'HDR') {
            var tag4k = document.createElement('div');
            tag4k.className = 'quality-tag';
            tag4k.textContent = '4K';
            box.appendChild(tag4k);
        }

        var tag = document.createElement('div');
        tag.className = 'quality-tag';
        tag.textContent = bestQuality;
        box.appendChild(tag);

        card.appendChild(box);
    }

    // Обробка картки  
    function processCard(card) {  
        if (card.hasAttribute('data-dv-processed')) return;  
        
        var movieData = getCardData(card);  
        if (!movieData || !movieData.id) return;  
        
        card.setAttribute('data-dv-processed', 'true');  

        // Кеш
        var cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
        var cached = cache[movieData.id];  

        if (cached && (Date.now() - cached.timestamp < CACHE_TIME)) {  
            if (cached.quality) addQualityBadge(card, cached.quality);
            return;  
        }

        // API
        getTorrents(movieData, function(torrents) {  
            var bestQuality = null;

            torrents.forEach(t => {
                var q = detectQuality(t.title);
                if (!q) return;

                if (!bestQuality ||
                    (q === 'DV') ||
                    (q === 'HDR' && bestQuality !== 'DV') ||
                    (q === '4K' && bestQuality !== 'DV' && bestQuality !== 'HDR')) {
                    bestQuality = q;
                }
            });

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
        cards.forEach(card => processCard(card));  
    }

    // MutationObserver  
    var observer = new MutationObserver(() => {
        setTimeout(processAllCards, 500);
    });

    // Старт  
    function init() {  
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        processAllCards();
    }

    if (typeof Lampa !== 'undefined') {
        init();
    } else {
        var wait = setInterval(() => {
            if (typeof Lampa !== 'undefined') {
                clearInterval(wait);
                init();
            }
        }, 500);
    }
})();
