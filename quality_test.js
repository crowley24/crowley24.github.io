(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    const DEBUG = false;
    const QUALITY_CACHE = 'dv_quality_cache_v3'; // Оновлений ключ кешу
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години
    
    // Пріоритети для визначення найкращої якості (чим вище індекс, тим вищий пріоритет)
    // Додано Full HD, HD, SD та TS
    const QUALITY_PRIORITY = ['TS', 'SD', 'HD', 'FHD', '4K', 'HDR', 'HDR10+', 'DV'];

    // =======================================================
    // II. СТИЛІ ТА CSS КОД
    // =======================================================
    const style = document.createElement('style');
    style.id = 'dv_quality_style';
    style.textContent = `
        /* Контейнер бейджів перенесено у ЛІВИЙ НИЖНІЙ КУТ */
        .card__quality-badge {
            position: absolute !important;
            bottom: 10px !important; /* Відступ від низу */
            left: 10px !important;   /* Відступ від лівого краю */
            right: auto !important; /* Скидаємо 'right' */
            top: auto !important;   /* Скидаємо 'top' */
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

        /* КОЛЬОРОВЕ КОДУВАННЯ (за рівнем якості) */
        
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
            background: #1E90FF !important; /* Dodger Blue */
            border-color: #5BAFFF !important;
        }

        /* Full HD (1080p) */
        .quality-tag.fhd {
            background: #008000 !important; /* Green */
            border-color: #00A000 !important;
        }

        /* HD (720p) */
        .quality-tag.hd {
            background: #3CB371 !important; /* Medium Sea Green */
            border-color: #6BE39F !important;
        }

        /* SD (Стандартна якість) */
        .quality-tag.sd {
            background: #A9A9A9 !important; /* Dark Gray */
        }
        
        /* TS (Низька якість - Телесинк) */
        .quality-tag.ts {
            background: #B22222 !important; /* Firebrick (попередження) */
            border-color: #D24242 !important;
        }
    `;
    document.head.appendChild(style);

    // =======================================================
    // III. ФУНКЦІОНАЛЬНІСТЬ
    // =======================================================

    /**
     * Визначає найкращу якість за назвою торрента, включаючи нові типи.
     * @param {string} torrentTitle Назва торрента.
     * @returns {string | null} Рядок якості ('DV', 'HDR10+', 'HDR', '4K', 'FHD', 'HD', 'SD', 'TS') або null.
     */
    function detectQuality(torrentTitle) {
        if (!torrentTitle) return null;
        
        const title = torrentTitle.toLowerCase();

        // 1. Найвища якість
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) return 'DV';
        if (/\b(hdr10\+)\b/i.test(title)) return 'HDR10+';
        if (/\b(hdr|hdr10)\b/i.test(title)) return 'HDR';

        // 2. Роздільна здатність
        if (/\b(4k|2160p|uhd)\b/i.test(title)) return '4K';
        if (/\b(fullhd|1080p)\b/i.test(title)) return 'FHD';
        if (/\b(hd|720p)\b/i.test(title)) return 'HD';
        
        // 3. Низька якість та тип ріпа
        if (/\b(sd|480p|360p)\b/i.test(title)) return 'SD';
        if (/\b(ts|telesync|cam)\b/i.test(title)) return 'TS';
        
        return null;
    }

    // (getCardData, getTorrents, cleanupCache залишаються без змін)

    function getCardData(card) {
        const data = card.card_data;
        if (!data) return null;
        
        return {
            id: String(data.id || ''),
            title: data.title || data.name || '',
            year: data.release_date ? data.release_date.substring(0, 4) : ''
        };
    }

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
     * Додає значок якості до картки.
     * Логіка відображення змінена: завжди відображаємо лише один, найкращий знайдений бейдж.
     * @param {HTMLElement} card Елемент картки.
     * @param {string} bestQuality Визначена найкраща якість.
     */
    function addQualityBadge(card, bestQuality) {
        if (!card || !bestQuality) return;

        let existing = card.querySelector('.card__quality-badge');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.className = 'card__quality-badge';

        // Додаємо лише один, найкращий знайдений тег
        const tag = document.createElement('div');
        
        // Перетворюємо якість на коректний CSS-клас: 
        // 'HDR10+' -> 'hdr10-plus', 'FHD' -> 'fhd', '4K' -> '4k' і т.д.
        const tagClass = bestQuality.toLowerCase().replace('+', '-plus'); 
        
        tag.className = 'quality-tag ' + tagClass;
        tag.textContent = bestQuality;
        box.appendChild(tag);

        card.appendChild(box);
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

    // (processAllCards, observer, init залишаються без змін)

    function processAllCards() {
        const cards = document.querySelectorAll('.card:not([data-dv-processed])');
        cards.forEach(card => processCard(card));
    }

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
