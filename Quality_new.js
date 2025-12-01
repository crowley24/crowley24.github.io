(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    const DEBUG = false;
    const QUALITY_CACHE = 'dv_quality_cache_v2'; // Оновлений ключ кешу
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години
    
    // Пріоритети для визначення найкращої якості (чим вище індекс, тим вищий пріоритет)
    const QUALITY_PRIORITY = ['4K', 'HDR', 'HDR10+', 'DV'];

    // =======================================================
    // II. СТИЛІ ТА CSS КОД
    // =======================================================
    const style = document.createElement('style');
    style.id = 'dv_quality_style';
    style.textContent = `
        /* Контейнер бейджів */
        .card__quality-badge {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            display: flex !important;
            gap: 4px !important;
            z-index: 9999 !important;
        }
        
        /* Базовий стиль тега */
        .quality-tag {
            font-size: 0.55em !important;
            font-weight: 700 !important;
            padding: 3px 6px !important;
            border-radius: 4px !important;
            letter-spacing: 0.5px !important;
            text-transform: uppercase !important;
            line-height: 1;
            /* Стилі за замовчуванням */
            background: rgba(0,0,0,0.8) !important;
            color: #fff !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
        }

        /* КОЛЬОРОВЕ КОДУВАННЯ (для кращої ідентифікації) */
        
        /* Dolby Vision (найвищий пріоритет) */
        .quality-tag.dv {
            background: #8A2BE2 !important; /* Blue Violet */
            border-color: #A968FF !important;
        }

        /* HDR10+ */
        .quality-tag.hdr10-plus {
            background: #FFA500 !important; /* Orange */
            border-color: #FFC064 !important;
        }
        
        /* HDR */
        .quality-tag.hdr {
            background: #FFD700 !important; /* Gold */
            color: #333 !important;
            border-color: #FFE890 !important;
        }

        /* 4K */
        .quality-tag.4k {
            background: #333333 !important; /* Dark Grey */
            border-color: #555555 !important;
        }
    `;
    document.head.appendChild(style);

    // =======================================================
    // III. ФУНКЦІОНАЛЬНІСТЬ
    // =======================================================

    /**
     * Визначає найкращу якість за назвою торрента.
     * @param {string} torrentTitle Назва торрента.
     * @returns {string | null} Рядок якості ('DV', 'HDR10+', 'HDR', '4K') або null.
     */
    function detectQuality(torrentTitle) {
        if (!torrentTitle) return null;
        
        const title = torrentTitle.toLowerCase();

        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) return 'DV';
        if (/\b(hdr10\+)\b/i.test(title)) return 'HDR10+';
        if (/\b(hdr|hdr10)\b/i.test(title)) return 'HDR';
        if (/\b(4k|2160p|uhd)\b/i.test(title)) return '4K';
        
        return null;
    }

    /**
     * Витягує необхідні дані з картки Lampa.
     * @param {HTMLElement} card Елемент картки.
     * @returns {{id: string, title: string, year: string} | null} Дані фільму/серіалу.
     */
    function getCardData(card) {
        const data = card.card_data;
        if (!data) return null;
        
        return {
            id: String(data.id || ''), // Усі ID мають бути рядками
            title: data.title || data.name || '',
            year: data.release_date ? data.release_date.substring(0, 4) : ''
        };
    }

    /**
     * Запит до API для отримання торрентів.
     * @param {{title: string, year: string}} movieData Дані для пошуку.
     * @returns {Promise<Array<{title: string}>>} Масив торрентів.
     */
    async function getTorrents(movieData) {
        if (!movieData || !movieData.title) {
            return [];
        }
        
        const apiHost = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';
        const apiUrl = 'http://' + apiHost + 
                       '/api/v1.0/torrents?search=' + encodeURIComponent(movieData.title) + 
                       '&year=' + movieData.year + '&exact=true';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                if (DEBUG) console.error('DV Quality: API error', response.status);
                return [];
            }
            const torrents = await response.json();
            return Array.isArray(torrents) ? torrents : [];
        } catch (error) {
            if (DEBUG) console.error('DV Quality: Fetch failed', error);
            return [];
        }
    }

    /**
     * Додає значок якості до картки.
     * @param {HTMLElement} card Елемент картки.
     * @param {string} bestQuality Визначена найкраща якість ('DV', 'HDR', '4K' і т.д.).
     */
    function addQualityBadge(card, bestQuality) {
        if (!card || !bestQuality) return;

        let existing = card.querySelector('.card__quality-badge');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.className = 'card__quality-badge';

        // 1. Спочатку додаємо 4K, якщо це не 4K-реліз (але DV/HDR)
        if (bestQuality !== '4K' && (bestQuality.includes('DV') || bestQuality.includes('HDR'))) {
            const tag4k = document.createElement('div');
            tag4k.className = 'quality-tag 4k';
            tag4k.textContent = '4K';
            box.appendChild(tag4k);
        } else if (bestQuality === '4K') {
            // Якщо знайдено тільки 4K, додаємо його першим
            const tag = document.createElement('div');
            tag.className = 'quality-tag 4k';
            tag.textContent = '4K';
            box.appendChild(tag);
            return; // Завершуємо, бо немає сенсу додавати 4K двічі
        }

        // 2. Додаємо основний тег якості
        const tag = document.createElement('div');
        // Перетворюємо 'HDR10+' на 'hdr10-plus' для CSS-класу
        const tagClass = bestQuality.toLowerCase().replace('+', '-plus'); 
        
        tag.className = 'quality-tag ' + tagClass;
        tag.textContent = bestQuality;
        box.appendChild(tag);

        card.appendChild(box);
    }
    
    /**
     * Очищає застарілі записи в кеші.
     * @param {Object} cache Поточний об'єкт кешу.
     * @returns {Object} Очищений об'єкт кешу.
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
     * Обробляє одну картку: перевіряє кеш або робить API-запит.
     * @param {HTMLElement} card Елемент картки.
     */
    async function processCard(card) {
        if (card.hasAttribute('data-dv-processed')) return;
        
        const movieData = getCardData(card);
        if (!movieData || !movieData.id) return;
        
        card.setAttribute('data-dv-processed', 'true');

        // Кеш
        let cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');
        const cached = cache[movieData.id];

        if (cached && (Date.now() - cached.timestamp < CACHE_TIME)) {
            if (cached.quality) addQualityBadge(card, cached.quality);
            return;
        }

        // API
        const torrents = await getTorrents(movieData);
        let bestQuality = null;

        torrents.forEach(t => {
            const q = detectQuality(t.title);
            if (!q) return;

            // Логіка пріоритетів: вибираємо якість з вищим індексом у масиві QUALITY_PRIORITY
            if (!bestQuality || 
                QUALITY_PRIORITY.indexOf(q) > QUALITY_PRIORITY.indexOf(bestQuality)) {
                bestQuality = q;
            }
        });

        // Оновлення кешу (включаючи очищення)
        cache = cleanupCache(cache);
        cache[movieData.id] = {
            quality: bestQuality,
            timestamp: Date.now()
        };
        localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));

        if (bestQuality) addQualityBadge(card, bestQuality);
    }

    /**
     * Обробляє всі необроблені картки в DOM.
     */
    function processAllCards() {
        // Вибираємо картки, які є видимими в поточному ряду, щоб уникнути затримок
        const cards = document.querySelectorAll('.card:not([data-dv-processed])');
        cards.forEach(card => processCard(card));
    }

    // =======================================================
    // IV. ІНІЦІАЛІЗАЦІЯ
    // =======================================================
    
    // Використовуємо MutationObserver для відстеження нових елементів
    const observer = new MutationObserver(() => {
        // Невелика затримка, щоб DOM мав час стабілізуватися
        setTimeout(processAllCards, 500);
    });

    function init() {
        if (DEBUG) console.log('DV Quality: Initialized and observing body changes.');
        // Починаємо спостереження за додаванням нових карток
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        // Початкова обробка
        processAllCards();
    }

    // Запуск: чекаємо, поки Lampa буде готова
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
