(function () {  
    'use strict';  
      
    // =======================================================  
    // I. КОНФІГУРАЦІЯ  
    // =======================================================  
    const DEBUG = true;  
    const QUALITY_CACHE = 'dv_quality_cache_v3';  
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  
      
    // Налаштування користувача  
    const SETTINGS = {  
        enabled: localStorage.getItem('dv_quality_enabled') !== 'false',  
        showHDR: localStorage.getItem('dv_quality_show_hdr') !== 'false',  
        showDV: localStorage.getItem('dv_quality_show_dv') !== 'false',  
        cacheTime: parseInt(localStorage.getItem('dv_quality_cache_time')) || CACHE_TIME  
    };  
      
    // Виправлений пріоритет якості - комбіновані формати мають вищий пріоритет  
    const QUALITY_PRIORITY = [  
        '4K DV', '4K HDR10+', '4K HDR', '4K',  
        '2K DV', '2K HDR10+', '2K HDR', '2K',  
        'FHD', 'HD', 'SD'  
    ];  
      
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
        .quality-tag.dv { background: #8A2BE2 !important; border-color: #A968FF !important; }  
        .quality-tag.hdr10-plus { background: #FFA500 !important; border-color: #FFC064 !important; }  
        .quality-tag.hdr { background: #FFD700 !important; color: #333 !important; border-color: #FFE890 !important; }  
        .quality-tag["4k-dv"] { background: linear-gradient(45deg, #333333 50%, #8A2BE2 50%) !important; border-color: #A968FF !important; }  
        .quality-tag["4k-hdr10-plus"] { background: linear-gradient(45deg, #333333 50%, #FFA500 50%) !important; border-color: #FFC064 !important; }  
        .quality-tag["4k-hdr"] { background: linear-gradient(45deg, #333333 50%, #FFD700 50%) !important; border-color: #FFE890 !important; }  
        .quality-tag["2k-dv"] { background: linear-gradient(45deg, #4169E1 50%, #8A2BE2 50%) !important; border-color: #A968FF !important; }  
        .quality-tag["2k-hdr10-plus"] { background: linear-gradient(45deg, #4169E1 50%, #FFA500 50%) !important; border-color: #FFC064 !important; }  
        .quality-tag["2k-hdr"] { background: linear-gradient(45deg, #4169E1 50%, #FFD700 50%) !important; border-color: #FFE890 !important; }  
        .quality-tag["4k"] { background: #333333 !important; border-color: #555555 !important; }  
        .quality-tag["2k"] { background: #4169E1 !important; border-color: #6495ED !important; }  
        .quality-tag.fhd { background: #32CD32 !important; color: #333 !important; border-color: #90EE90 !important; }  
        .quality-tag.hd { background: #808080 !important; border-color: #A9A9A9 !important; }  
    `;  
    document.head.appendChild(style);  
      
    // =======================================================  
    // III. ФУНКЦІОНАЛЬНІСТЬ  
    // =======================================================  
      
    /**  
     * Покращена функція визначення якості з підтримкою комбінованих форматів  
     */  
    function detectQuality(torrentTitle) {  
        if (!torrentTitle) return null;  
          
        const title = torrentTitle.toLowerCase();  
        let quality = '';  
          
        // Визначення роздільної здатності  
        if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160)\b/i.test(title)) quality = '4K';  
        else if (/\b(2k|1440p|qhd|quad\s*hd|2560x1440)\b/i.test(title)) quality = '2K';  
        else if (/\b(fhd|1080p|full\s*hd|1920x1080|bluray|bd|bdrip)\b/i.test(title)) quality = 'FHD';  
        else if (/\b(hd|720p|1280x720|hdtv|web-dl|webrip)\b/i.test(title)) quality = 'HD';  
        else if (/\b(sd|480p|854x480|dvd|dvdrip|dvdscr)\b/i.test(title)) quality = 'SD';  
          
        // Додавання HDR/DV до роздільної здатності з урахуванням налаштувань  
        if (quality) {  
            if (SETTINGS.showDV && /\b(dolby\s*vision|dolbyvision|dv|dovi|dolby\s*vision\s*hdr)\b/i.test(title)) {  
                quality += ' DV';  
            } else if (SETTINGS.showHDR && /\b(hdr10\+|hdr\s*10\+|hdr10plus)\b/i.test(title)) {  
                quality += ' HDR10+';  
            } else if (SETTINGS.showHDR && /\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(title)) {  
                quality += ' HDR';  
            }  
        }  
          
        return quality || null;  
    }  
      
    /**  
     * Витягує необхідні дані з картки Lampa  
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
     * Покращена функція запиту до API з retry логікою та таймаутом  
     */  
    async function getTorrents(movieData, retries = 2) {  
        if (!movieData || !movieData.title) {  
            if (DEBUG) console.log('DV Quality: No title for search', movieData);  
            return [];  
        }  
          
        const apiHost = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';  
        const apiUrl = 'http://' + apiHost +   
                       '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +   
                       '&year=' + movieData.year;  
          
        if (DEBUG) console.log('DV Quality: API URL:', apiUrl);  
          
        try {  
            const controller = new AbortController();  
            const timeoutId = setTimeout(() => controller.abort(), 8000);  
              
            const response = await fetch(apiUrl, {   
                signal: controller.signal,  
                headers: { 'Accept': 'application/json' }  
            });  
              
            clearTimeout(timeoutId);  
              
            if (!response.ok) {  
                if (DEBUG) console.error('DV Quality: API error', response.status, response.statusText);  
                if (retries > 0) return getTorrents(movieData, retries - 1);  
                return [];  
            }  
              
            const torrents = await response.json();  
            if (DEBUG) console.log('DV Quality: API response for', movieData.title, ':', torrents);  
            return Array.isArray(torrents) ? torrents : [];  
        } catch (error) {  
            if (DEBUG) console.error('DV Quality: Fetch failed for', movieData.title, ':', error);  
            if (retries > 0 && error.name !== 'AbortError') return getTorrents(movieData, retries - 1);  
            return [];  
        }  
    }  
      
    /**  
     * Виправлена функція додавання бейджа якості  
     */  
    function addQualityBadge(card, bestQuality) {  
        if (!card || !bestQuality) return;  
          
        let existing = card.querySelector('.card__quality-badge');  
        if (existing) existing.remove();  
          
        const box = document.createElement('div');  
        box.className = 'card__quality-badge';  
          
        // Створюємо один комбінований тег для всіх форматів  
        const tag = document.createElement('div');  
        const tagClass = bestQuality.toLowerCase().replace(/\s+/g, '-').replace('+', '-plus');  
        tag.className = 'quality-tag ' + tagClass;  
        tag.textContent = bestQuality;  
        box.appendChild(tag);  
          
        card.appendChild(box);  
    }  
      
    /**  
     * Очищає застарілі записи в кеші  
     */  
    function cleanupCache(cache) {  
        const now = Date.now();  
        const cleanedCache = {};  
        let cleaned = 0;  
          
        for (const id in cache) {  
            if (cache.hasOwnProperty(id)) {  
                if (now - cache[id].timestamp < SETTINGS.cacheTime) {  
                    cleanedCache[id] = cache[id];  
                } else {  
                    cleaned++;  
                }  
            }  
        }  
        if (DEBUG && cleaned > 0) console.log(`DV Quality: Cleaned ${cleaned} expired cache entries.`);  
        return cleanedCache;  
    }  
      
    // Debouncing для оптимізації продуктивності  
    let processTimeout = null;  
      
    /**  
     * Обробляє одну картку з покращеним логуванням та кешуванням  
     */  
    async function processCard(card) {  
        if (!SETTINGS.enabled || card.hasAttribute('data-dv-processed')) return;  
          
        const movieData = getCardData(card);  
        if (!movieData || !movieData.id) {  
            if (DEBUG) console.log('DV Quality: No movie data for card', card);  
            return;  
        }  
          
        card.setAttribute('data-dv-processed', 'true');  
          
        if (DEBUG) console.log('DV Quality: Processing card:', movieData);  
          
        // Покращений ключ кешу з урахуванням року  
        const qCacheKey = `${movieData.id}_${movieData.year}`;  
        let cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
        const cached = cache[qCacheKey];  
          
        if (cached && (Date.now() - cached.timestamp < SETTINGS.cacheTime)) {  
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
              
            // Використовуємо виправлений пріоритет  
            if (!bestQuality ||   
                (q && QUALITY_PRIORITY.indexOf(q) > QUALITY_PRIORITY.indexOf(bestQuality))) {  
                bestQuality = q;  
            }  
        });  
          
        if (DEBUG) {  
            console.log('DV Quality: All detected qualities for', movieData.title, ':', detectedQualities);  
            console.log('DV Quality: Best quality selected:', bestQuality);  
        }  
          
        // Оновлення кешу  
        cache = cleanupCache(cache);  
        cache[qCacheKey] = {  
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
     * Обробляє всі необроблені картки в DOM з debouncing  
     */  
    function debouncedProcessAllCards() {  
        clearTimeout(processTimeout);  
        processTimeout = setTimeout(() => {  
            const cards = document.querySelectorAll('.card:not([data-dv-processed])');  
            if (DEBUG) console.log('DV Quality: Found', cards.length, 'unprocessed cards');  
            cards.forEach(card => processCard(card));  
        }, 300);  
    }  
      
    // =======================================================  
    // IV. ІНІЦІАЛІЗАЦІЯ  
    // =======================================================  
      
    const observer = new MutationObserver(() => {  
        debouncedProcessAllCards();  
    });  
      
    function init() {  
        if (DEBUG) console.log('DV Quality: Initialized and observing body changes.');  
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
        debouncedProcessAllCards();  
    }  
      
    // Запуск з перевіркою наявності Lampa  
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
      
    // Додаємо функції для керування налаштуваннями  
    window.DVQualitySettings = {  
        toggle: () => {  
            SETTINGS.enabled = !SETTINGS.enabled;  
            localStorage.setItem('dv_quality_enabled', SETTINGS.enabled);  
            if (SETTINGS.enabled) {  
                document.querySelectorAll('.card[data-dv-processed]').forEach(card => {  
                    card.removeAttribute('data-dv-processed');  
                });  
                debouncedProcessAllCards();  
            } else {  
                document.querySelectorAll('.card__quality-badge').forEach(badge => badge.remove());  
            }  
        },  
        toggleHDR: () => {  
            SETTINGS.showHDR = !SETTINGS.showHDR;  
            localStorage.setItem('dv_quality_show_hdr', SETTINGS.showHDR);  
        },  
        toggleDV: () => {  
            SETTINGS.showDV = !SETTINGS.showDV;  
            localStorage.setItem('dv_quality_show_dv', SETTINGS.showDV);  
        },  
        clearCache: () => {  
            localStorage.removeItem(QUALITY_CACHE);  
            console.log('DV Quality: Cache cleared');  
        }  
    };  
})();
