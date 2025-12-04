(function () {    
    'use strict';    
    
    // =======================================================    
    // I. КОНФІГУРАЦІЯ    
    // =======================================================    
    const DEBUG = true; // Увімкнено для діагностики    
    const QUALITY_CACHE = 'dv_quality_cache_v2';    
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години    
        
    // Пріоритети для визначення найкращої якості    
    const QUALITY_PRIORITY = ['4K', '2K', 'FHD', 'HDR', 'HDR10+', 'DV'];    
    
    // =======================================================    
    // II. СТИЛІ ТА CSS КОД    
    // =======================================================    
    const style = document.createElement('style');    
    style.id = 'dv_quality_style';    
    style.textContent = `    
        /* Контейнер бейджів */    
        .card__quality-badge {    
            position: absolute !important;    
            top: 7px !important;    
            left: 7px !important;    
            display: flex !important;    
            gap: 4px !important;    
            z-index: 9999 !important;    
        }    
            
        /* Базовий стиль тега */    
        .quality-tag {    
            font-size: 0.9em !important;    
            font-weight: 700 !important;    
            padding: 3px 6px !important;    
            border-radius: 4px !important;    
            letter-spacing: 0.5px !important;    
            text-transform: uppercase !important;    
            line-height: 1;    
            background: rgba(0,0,0,0.8) !important;    
            color: #fff !important;    
            border: 1px solid rgba(255,255,255,0.2) !important;    
        }    
    
        /* КОЛЬОРОВЕ КОДУВАННЯ */    
        .quality-tag.dv {    
            background: #8A2BE2 !important;    
            border-color: #A968FF !important;    
        }    
    
        .quality-tag.hdr10-plus {    
            background: #FFA500 !important;    
            border-color: #FFC064 !important;    
        }    
            
        .quality-tag.hdr {    
            background: #FFD700 !important;    
            color: #333 !important;    
            border-color: #FFE890 !important;    
        }    
    
        .quality-tag.4k {    
            background: #333333 !important;    
            border-color: #555555 !important;    
        }    
    
        .quality-tag.qhd {    
            background: #4169E1 !important;    
            border-color: #6495ED !important;    
        }    
    
        .quality-tag.fhd {    
            background: #32CD32 !important;    
            color: #333 !important;    
            border-color: #90EE90 !important;    
        }    
    
        .quality-tag.hd {    
            background: #808080 !important;    
            border-color: #A9A9A9 !important;    
        }    
    `;    
    document.head.appendChild(style);    
    
    // =======================================================    
    // III. ФУНКЦІОНАЛЬНІСТЬ    
    // =======================================================    
    
    /**    
     * Визначає найкращу якість за назвою торрента з розширеними патернами.    
     */    
    function detectQuality(torrentTitle) {    
        if (!torrentTitle) return null;    
            
        const title = torrentTitle.toLowerCase();    
    
        // Dolby Vision - розширені патерни    
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi|dolby\s*vision\s*hdr)\b/i.test(title)) return 'DV';    
            
        // HDR10+ - розширені патерни    
        if (/\b(hdr10\+|hdr\s*10\+|hdr10plus)\b/i.test(title)) return 'HDR10+';    
            
        // HDR - розширені патерни    
        if (/\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(title)) return 'HDR';    
            
        // 4K/UHD - розширені патерни    
        if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160)\b/i.test(title)) return '4K';    
            
        // 2K/QHD - розширені патерни    
        if (/\b(2k|1440p|qhd|quad\s*hd|2560x1440)\b/i.test(title)) return '2K';    
            
        // FHD/1080p - розширені патерни    
        if (/\b(fhd|1080p|full\s*hd|1920x1080|bluray|bd|bdrip)\b/i.test(title)) return 'FHD';    
            
        // HD/720p - розширені патерни    
        if (/\b(hd|720p|1280x720|hdtv|web-dl|webrip)\b/i.test(title)) return 'HD';    
            
        // SD/480p - додано для повноти    
        if (/\b(sd|480p|854x480|dvd|dvdrip|dvdscr)\b/i.test(title)) return 'SD';    
            
        return null;    
    }    
    
    /**    
     * Витягує необхідні дані з картки Lampa.    
     */    
    function getCardData(card) {    
        const data = card.card_data;    
        if (!data) return null;    
            
        return {    
            id: String(data.id || ''),    
            title: data.title || data.name || '',    
            year: data.release_date ? data.release_date.substring(0, 4) : ''    
        };    
    }    
    
    /**    
     * Запит до API для отримання торрентів (без exact=true).    
     */    
    async function getTorrents(movieData) {    
        if (!movieData || !movieData.title) {    
            if (DEBUG) console.log('DV Quality: No title for search', movieData);    
            return [];    
        }    
            
        const apiHost = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';    
        // Видалено exact=true для менш строгого пошуку    
        const apiUrl = 'http://' + apiHost +     
                       '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +     
                       '&year=' + movieData.year;    
    
        if (DEBUG) console.log('DV Quality: API URL:', apiUrl);    
    
        try {    
            const response = await fetch(apiUrl);    
            if (!response.ok) {    
                if (DEBUG) console.error('DV Quality: API error', response.status, response.statusText);    
                return [];    
            }    
            const torrents = await response.json();    
            if (DEBUG) console.log('DV Quality: API response for', movieData.title, ':', torrents);    
            return Array.isArray(torrents) ? torrents : [];    
        } catch (error) {    
            if (DEBUG) console.error('DV Quality: Fetch failed for', movieData.title, ':', error);    
            return [];    
        }    
    }    
    
    /**    
     * Додає значок якості до картки.    
     */    
    function addQualityBadge(card, bestQuality) {    
        if (!card || !bestQuality) return;    
    
        let existing = card.querySelector('.card__quality-badge');    
        if (existing) existing.remove();    
    
        const box = document.createElement('div');    
        box.className = 'card__quality-badge';    
    
        // Логіка для відображення 4K разом з DV/HDR    
        if (bestQuality !== '4K' && (bestQuality.includes('DV') || bestQuality.includes('HDR'))) {    
            const tag4k = document.createElement('div');    
            tag4k.className = 'quality-tag 4k';    
            tag4k.textContent = '4K';    
            box.appendChild(tag4k);    
        }    
    
        // Основний тег якості (обробляє всі якості включно з 4K, FHD, HD)    
        const tag = document.createElement('div');    
        const tagClass = bestQuality.toLowerCase().replace('+', '-plus');     
            
        tag.className = 'quality-tag ' + tagClass;    
        tag.textContent = bestQuality;    
        box.appendChild(tag);    
    
        card.appendChild(box);    
    }    
        
    /**    
     * Очищає застарілі записи в кеші.    
     */    
    function cleanupCache(cache) {    
        const now = Date.now();    
        const cleanedCache = {};    
        let cleaned = 0;    
            
        for (const id in cache) {    
            if (cache.hasOwnProperty(id)) {    
                if (now - cache[id].timestamp < CACHE_TIME) {    
                    cleanedCache[id] = cache[id];    
                } else {    
                    cleaned++;    
                }    
            }    
        }    
        if (DEBUG && cleaned > 0) console.log(`DV Quality: Cleaned ${cleaned} expired cache entries.`);    
        return cleanedCache;    
    }    
    
    /**    
     * Обробляє одну картку з розширеним логуванням.    
     */    
    async function processCard(card) {    
        if (card.hasAttribute('data-dv-processed')) return;    
            
        const movieData = getCardData(card);    
        if (!movieData || !movieData.id) {    
            if (DEBUG) console.log('DV Quality: No movie data for card', card);    
            return;    
        }    
            
        card.setAttribute('data-dv-processed', 'true');    
    
        if (DEBUG) console.log('DV Quality: Processing card:', movieData);    
    
        // Кеш    
        let cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');    
        const cached = cache[movieData.id];    
    
        if (cached && (Date.now() - cached.timestamp < CACHE_TIME)) {    
            if (DEBUG) console.log('DV Quality: Using cached quality for', movieData.title, ':', cached.quality);    
            if (cached.quality) addQualityBadge(card, cached.quality);    
            return;    
        }    
    
        // API запит    
        if (DEBUG) console.log('DV Quality: Fetching torrents for', movieData);    
        const torrents = await getTorrents(movieData);    
            
        if (DEBUG) console.log('DV Quality: Found', torrents.length, 'torrents for', movieData.title);    
            
        let bestQuality = null;    
        const detectedQualities = [];    
    
        torrents.forEach(t => {    
            const q = detectQuality(t.title);    
            if (q) {    
                detectedQualities.push({ quality: q, title: t.title });    
                if (DEBUG) console.log('DV Quality: Detected quality', q, 'in:', t.title);    
            }    
    
            if (!bestQuality ||     
                QUALITY_PRIORITY.indexOf(q) > QUALITY_PRIORITY.indexOf(bestQuality)) {    
                bestQuality = q;    
            }    
        });    
    
        if (DEBUG) {    
            console.log('DV Quality: All detected qualities for', movieData.title, ':', detectedQualities);    
            console.log('DV Quality: Best quality selected:', bestQuality);    
        }    
    
        // Оновлення кешу    
        cache = cleanupCache(cache);    
        cache[movieData.id] = {    
            quality: bestQuality,    
            timestamp: Date.now()    
        };    
        localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));    
    
        if (bestQuality) {    
            addQualityBadge(card, bestQuality);    
        } else {    
            if (DEBUG) console.log('DV Quality: No quality detected for', movieData.title);    
        }    
    }    
    
    /**    
     * Обробляє всі необроблені картки в DOM.    
     */    
    function processAllCards() {    
        const cards = document.querySelectorAll('.card:not([data-dv-processed])');    
        if (DEBUG) console.log('DV Quality: Found', cards.length, 'unprocessed cards');    
        cards.forEach(card => processCard(card));    
    }    
    
    // =======================================================    
    // IV. ІНІЦІАЛІЗАЦІЯ    
    // =======================================================    
        
    const observer = new MutationObserver(() => {    
        setTimeout(processAllCards, 500);    
    });    
    
    function init() {    
        if (DEBUG) console.log('DV Quality: Initialized and observing body changes.');    
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
        const wait = setInterval(() => {    
            if (typeof Lampa !== 'undefined') {    
                clearInterval(wait);    
                init();    
            }    
        }, 500);    
    }    
})();
