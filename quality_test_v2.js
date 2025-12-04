(function () {  
    'use strict';  
      
    // =======================================================  
    // I. КОНФІГУРАЦІЯ  
    // =======================================================  
    const DEBUG = true;  
    const QUALITY_CACHE = 'dv_quality_cache_v2';  
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години  
      
    // Виправлені пріоритети - HDR10+ вище за HDR  
    const QUALITY_PRIORITY = ['4K DV', '4K HDR10+', '4K HDR', '4K', '2K', 'FHD', 'HDR10+', 'HDR', 'HD', 'SD'];  
      
    // Обмеження кількості одночасних запитів  
    const MAX_CONCURRENT_REQUESTS = 3;  
    const BATCH_SIZE = 5;  
    const RETRY_ATTEMPTS = 3;  
    const RETRY_DELAY = 1000;  
      
    // =======================================================  
    // II. МОДУЛІ  
    // =======================================================  
      
    /**  
     * Модуль утиліт  
     */  
    const Utils = {  
        /**  
         * Дебаунсінг функції  
         */  
        debounce(func, wait) {  
            let timeout;  
            return function executedFunction(...args) {  
                const later = () => {  
                    clearTimeout(timeout);  
                    func(...args);  
                };  
                clearTimeout(timeout);  
                timeout = setTimeout(later, wait);  
            };  
        },  
      
        /**  
         * Санітизація HTML  
         */  
        escapeHtml(text) {  
            const div = document.createElement('div');  
            div.textContent = text;  
            return div.innerHTML;  
        },  
      
        /**  
         * Затримка з експоненційним backoff  
         */  
        delay(ms) {  
            return new Promise(resolve => setTimeout(resolve, ms));  
        },  
      
        /**  
         * Покращене логування помилок  
         */  
        logError(message, error, context = {}) {  
            if (DEBUG) {  
                console.error(`[DV Quality] ${message}`, {  
                    error: error.message || error,  
                    stack: error.stack,  
                    context,  
                    timestamp: new Date().toISOString()  
                });  
            }  
        }  
    };  
      
    /**  
     * Модуль API  
     */  
    const API = {  
        /**  
         * HTTP клієнт з retry механізмом  
         */  
        async fetchWithRetry(url, retries = RETRY_ATTEMPTS) {  
            for (let i = 0; i < retries; i++) {  
                try {  
                    const response = await fetch(url);  
                    if (!response.ok) {  
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);  
                    }  
                    return await response.json();  
                } catch (error) {  
                    Utils.logError(`API request failed (attempt ${i + 1}/${retries})`, error, { url });  
                      
                    if (i === retries - 1) {  
                        // Fallback для недоступних API  
                        return this.getFallbackData();  
                    }  
                      
                    // Експоненційний backoff  
                    await Utils.delay(RETRY_DELAY * Math.pow(2, i));  
                }  
            }  
        },  
      
        /**  
         * Fallback дані коли API недоступне  
         */  
        getFallbackData() {  
            return [];  
        },  
      
        /**  
         * Обробка пакетних запитів  
         */  
        async processBatch(requests) {  
            const results = [];  
            for (let i = 0; i < requests.length; i += MAX_CONCURRENT_REQUESTS) {  
                const batch = requests.slice(i, i + MAX_CONCURRENT_REQUESTS);  
                const batchResults = await Promise.allSettled(  
                    batch.map(req => this.fetchWithRetry(req.url))  
                );  
                results.push(...batchResults);  
            }  
            return results;  
        }  
    };  
      
    /**  
     * Модуль визначення якості  
     */  
    const QualityDetector = {  
        /**  
         * Покращене визначення якості з комбінованими форматами  
         */  
        detectQuality(torrentTitle) {  
            if (!torrentTitle) return null;  
              
            const title = torrentTitle.toLowerCase();  
      
            // Комбіновані формати  
            if (/\b(4k.*dolby\s*vision|2160p.*dv|uhd.*dolby\s*vision)\b/i.test(title)) return '4K DV';  
            if (/\b(4k.*hdr10\+|2160p.*hdr10\+|uhd.*hdr10\+)\b/i.test(title)) return '4K HDR10+';  
            if (/\b(4k.*hdr|2160p.*hdr|uhd.*hdr)\b/i.test(title)) return '4K HDR';  
      
            // Dolby Vision  
            if (/\b(dolby\s*vision|dolbyvision|dv|dovi|dolby\s*vision\s*hdr)\b/i.test(title)) return 'DV';  
              
            // HDR10+  
            if (/\b(hdr10\+|hdr\s*10\+|hdr10plus)\b/i.test(title)) return 'HDR10+';  
              
            // HDR  
            if (/\b(hdr|hdr10|high\s*dynamic\s*range)\b/i.test(title)) return 'HDR';  
              
            // 4K/UHD  
            if (/\b(4k|2160p|uhd|ultra\s*hd|3840x2160)\b/i.test(title)) return '4K';  
              
            // 2K/QHD  
            if (/\b(2k|1440p|qhd|quad\s*hd|2560x1440)\b/i.test(title)) return '2K';  
              
            // FHD/1080p  
            if (/\b(fhd|1080p|full\s*hd|1920x1080|bluray|bd|bdrip)\b/i.test(title)) return 'FHD';  
              
            // HD/720p  
            if (/\b(hd|720p|1280x720|hdtv|web-dl|webrip)\b/i.test(title)) return 'HD';  
              
            // SD/480p  
            if (/\b(sd|480p|854x480|dvd|dvdrip|dvdscr)\b/i.test(title)) return 'SD';  
              
            return null;  
        },  
      
        /**  
         * Визначення найкращої якості на основі пріоритетів  
         */  
        getBestQuality(qualities) {  
            if (!qualities || qualities.length === 0) return null;  
              
            let best = null;  
            let bestIndex = -1;  
              
            for (const quality of qualities) {  
                const index = QUALITY_PRIORITY.indexOf(quality);  
                if (index > bestIndex) {  
                    best = quality;  
                    bestIndex = index;  
                }  
            }  
              
            return best;  
        }  
    };  
      
    /**  
     * Модуль кешування  
     */  
    const Cache = {  
        get(key) {  
            try {  
                const cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
                const item = cache[key];  
                return item && (Date.now() - item.timestamp < CACHE_TIME) ? item : null;  
            } catch (error) {  
                Utils.logError('Cache read error', error);  
                return null;  
            }  
        },  
      
        set(key, data) {  
            try {  
                const cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
                cache[key] = {  
                    ...data,  
                    timestamp: Date.now()  
                };  
                localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));  
            } catch (error) {  
                Utils.logError('Cache write error', error);  
            }  
        },  
      
        clear() {  
            try {  
                localStorage.removeItem(QUALITY_CACHE);  
            } catch (error) {  
                Utils.logError('Cache clear error', error);  
            }  
        },  
      
        cleanup() {  
            try {  
                const cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');  
                const cleanedCache = {};  
                const now = Date.now();  
                let cleaned = 0;  
                  
                for (const key in cache) {  
                    if (cache.hasOwnProperty(key)) {  
                        if (now - cache[key].timestamp < CACHE_TIME) {  
                            cleanedCache[key] = cache[key];  
                        } else {  
                            cleaned++;  
                        }  
                    }  
                }  
                  
                localStorage.setItem(QUALITY_CACHE, JSON.stringify(cleanedCache));  
                if (DEBUG && cleaned > 0) console.log(`DV Quality: Cleaned ${cleaned} expired cache entries.`);  
            } catch (error) {  
                Utils.logError('Cache cleanup error', error);  
            }  
        }  
    };  
      
    /**  
     * Модуль UI з оновленими кольорами  
     */  
    const UI = {  
        /**  
         * Ініціалізація стилів з новими кольорами DV та HDR  
         */  
        initStyles() {  
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
      
                /* Оновлені кольори для DV та HDR */  
                .quality-tag.dv {  
                    background: linear-gradient(135deg, #FF6B6B, #C92A2A) !important;  
                    border-color: #FF6B6B !important;  
                    color: #FFFFFF !important;  
                    box-shadow: 0 0 8px rgba(255, 107, 107, 0.5) !important;  
                }  
      
                .quality-tag.hdr10-plus {  
                    background: linear-gradient(135deg, #4ECDC4, #0B7285) !important;  
                    border-color: #4ECDC4 !important;  
                    color: #FFFFFF !important;  
                    box-shadow: 0 0 8px rgba(78, 205, 196, 0.5) !important;  
                }  
                  
                .quality-tag.hdr {  
                    background: linear-gradient(135deg, #FFD43B, #FAB005) !important;  
                    border-color: #FFD43B !important;  
                    color: #212529 !important;  
                    box-shadow: 0 0 8px rgba(255, 212, 59, 0.5) !important;  
                }  
      
                .quality-tag["4k-dv"] {  
                    background: linear-gradient(135deg, #FF6B6B, #C92A2A) !important;  
                    border-color: #FF6B6B !important;  
                    color: #FFFFFF !important;  
                    box-shadow: 0 0 8px rgba(255, 107, 107, 0.5) !important;  
                }  
      
                .quality-tag["4k-hdr10-plus"] {  
                    background: linear-gradient(135deg, #4ECDC4, #0B7285) !important;  
                    border-color: #4ECDC4 !important;  
                    color: #FFFFFF !important;  
                    box-shadow: 0 0 8px rgba(78, 205, 196, 0.5) !important;  
                }  
      
                .quality-tag["4k-hdr"] {  
                    background: linear-gradient(135deg, #FFD43B, #FAB005) !important;  
                    border-color: #FFD43B !important;  
                    color: #212529 !important;  
                    box-shadow: 0 0 8px rgba(255, 212, 59, 0.5) !important;  
                }  
      
                .quality-tag["4k"] {  
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
      
                .quality-tag.sd {  
                    background: #666666 !important;  
                    border-color: #888888 !important;  
                }  
      
                /* Анімації */  
                @keyframes fadeIn {  
                    from { opacity: 0; transform: scale(0.8); }  
                    to { opacity: 1; transform: scale(1); }  
                }  
      
                .card__quality-badge {  
                    animation: fadeIn 0.3s ease-out;  
                }  
            `;  
              
            // CSP сумісність - використовуємо textContent замість innerHTML  
            document.head.appendChild(style);  
        },  
      
        /**  
         * Додавання бейджа якості до картки  
         */  
        addQualityBadge(card, bestQuality) {  
            if (!card || !bestQuality) return;  
              
            // Видалення існуючих бейджів  
            const existingBadge = card.querySelector('.card__quality-badge');  
            if (existingBadge) existingBadge.remove();  
              
            const box = document.createElement('div');  
            box.className = 'card__quality-badge';  
              
            // Логіка для відображення 4K разом з DV/HDR  
            if (bestQuality.includes('4K') && (bestQuality.includes('DV') || bestQuality.includes('HDR'))) {  
                const tag = document.createElement('div');  
                const tagClass = bestQuality.toLowerCase().replace('+', '-plus');  
                tag.className = 'quality-tag ' + tagClass;  
                tag.textContent = Utils.escapeHtml(bestQuality);  
                box.appendChild(tag);  
            } else {  
                // Основний тег якості (обробляє всі якості включно з 4K, FHD, HD)  
                const tag = document.createElement('div');  
                const tagClass = bestQuality.toLowerCase().replace('+', '-plus');  
                tag.className = 'quality-tag ' + tagClass;  
                tag.textContent = Utils.escapeHtml(bestQuality);  
                box.appendChild(tag);  
            }  
      
            card.appendChild(box);  
        }  
    };  
      
    // =======================================================  
    // III. ОСНОВНА ФУНКЦІОНАЛЬНІСТЬ  
    // =======================================================  
      
    /**  
     * Витягує дані з картки Lampa  
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
     * Запит до API з пакетною обробкою  
     */  
    async function getTorrents(movieData) {  
        if (!movieData || !movieData.title) {  
            Utils.logError('No title for search', null, movieData);  
            return [];  
        }  
          
        const apiHost = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';  
        const apiUrl = 'http://' + apiHost +   
                       '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) +   
                       '&year=' + movieData.year;  
      
        if (DEBUG) console.log('DV Quality: API URL:', apiUrl);  
      
        try {  
            return await API.fetchWithRetry(apiUrl);  
        } catch (error) {  
            Utils.logError('Fetch failed', error, movieData);  
            return [];  
        }  
    }  
      
    /**  
     * Обробка однієї картки  
     */  
    async function processCard(card) {  
        if (card.hasAttribute('data-dv-processed')) return;  
          
        const movieData = getCardData(card);  
        if (!movieData || !movieData.id) {  
            Utils.logError('No movie data for card', null, { card });  
            return;  
        }  
          
        card.setAttribute('data-dv-processed', 'true');  
      
        if (DEBUG) console.log('DV Quality: Processing card:', movieData);  
      
        // Перевірка кешу  
        const cached = Cache.get(movieData.id);  
        if (cached) {  
            if (DEBUG) console.log('DV Quality: Using cached quality for', movieData.title, ':', cached.quality);  
            if (cached.quality) UI.addQualityBadge(card, cached.quality);  
            return;  
        }  
      
        // API запит  
        if (DEBUG) console.log('DV Quality: Fetching torrents for', movieData);  
        const torrents = await getTorrents(movieData);  
            
        if (DEBUG) console.log('DV Quality: Found', torrents.length, 'torrents for', movieData.title);  
            
        // Визначення якостей  
        const detectedQualities = torrents    
            .map(t => QualityDetector.detectQuality(t.title))    
            .filter(q => q !== null);    
    
        const bestQuality = QualityDetector.getBestQuality(detectedQualities);    
    
        if (DEBUG) {    
            console.log('DV Quality: All detected qualities for', movieData.title, ':', detectedQualities);    
            console.log('DV Quality: Best quality selected:', bestQuality);    
        }    
    
        // Оновлення кешу    
        Cache.set(movieData.id, { quality: bestQuality });    
    
        if (bestQuality) {    
            UI.addQualityBadge(card, bestQuality);    
        } else {    
            if (DEBUG) console.log('DV Quality: No quality detected for', movieData.title);    
        }    
    }    
    
    /**    
     * Пакетна обробка карток    
     */    
    async function processCardsBatch(cards) {    
        for (let i = 0; i < cards.length; i += BATCH_SIZE) {    
            const batch = cards.slice(i, i + BATCH_SIZE);    
            await Promise.all(batch.map(card => processCard(card)));    
        }    
    }    
    
    /**    
     * Обробка всіх карток з дебаунсінгом    
     */    
    const debouncedProcessAll = Utils.debounce(() => {    
        const cards = document.querySelectorAll('.card:not([data-dv-processed])');    
        if (DEBUG) console.log('DV Quality: Found', cards.length, 'unprocessed cards');    
        processCardsBatch(Array.from(cards));    
    }, 300);    
    
    // =======================================================    
    // IV. ІНІЦІАЛІЗАЦІЯ    
    // =======================================================    
        
    const observer = new MutationObserver(() => {    
        setTimeout(debouncedProcessAll, 500);    
    });    
    
    function init() {    
        if (DEBUG) console.log('DV Quality: Initialized and observing body changes.');    
            
        UI.initStyles();    
            
        observer.observe(document.body, {    
            childList: true,    
            subtree: true    
        });    
            
        debouncedProcessAll();    
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
