(function () {
    'use strict';

    // =======================================================
    // I. КОНФІГУРАЦІЯ
    // =======================================================
    const DEBUG = false;
    const QUALITY_CACHE = 'dv_quality_cache_v4'; // Оновлений ключ кешу
    const CACHE_TIME = 24 * 60 * 60 * 1000; // 24 години
    
    // Пріоритети для визначення найкращої якості 
    const QUALITY_PRIORITY = ['TS', 'SD', 'HD', 'FHD', '4K', 'HDR', 'HDR10+', 'DV'];

    // =======================================================
    // II. СТИЛІ ТА CSS КОД
    // =======================================================
    const style = document.createElement('style');
    style.id = 'dv_quality_style';
    style.textContent = `
        /* Контейнер бейджів перенесено у ВЕРХНІЙ ЛІВИЙ КУТ */
        .card__quality-badge {
            position: absolute !important;
            top: 10px !important;    /* Відступ від верху */
            left: 10px !important;   /* Відступ від лівого краю */
            right: auto !important; 
            bottom: auto !important; 
            display: flex !important;
            gap: 4px !important;
            z-index: 9999 !important;
            /* ВАЖЛИВО: Реверсивний порядок для відображення ЗЛІВА ВІД РЕЙТИНГУ */
            flex-direction: row-reverse !important; 
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
            background: rgba(0,0,0,0.8) !important;
            color: #fff !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
        }

        /* КОЛЬОРОВЕ КОДУВАННЯ (за рівнем якості) */
        
        .quality-tag.dv { background: #8A2BE2 !important; border-color: #A968FF !important; }
        .quality-tag.hdr10-plus { background: #FFA500 !important; border-color: #FFC064 !important; }
        .quality-tag.hdr { background: #FFD700 !important; color: #333 !important; border-color: #FFE890 !important; }
        .quality-tag.4k { background: #1E90FF !important; border-color: #5BAFFF !important; }
        .quality-tag.fhd { background: #008000 !important; border-color: #00A000 !important; }
        .quality-tag.hd { background: #3CB371 !important; border-color: #6BE39F !important; }
        .quality-tag.sd { background: #A9A9A9 !important; }
        .quality-tag.ts { background: #B22222 !important; border-color: #D24242 !important; }
    `;
    document.head.appendChild(style);

    // =======================================================
    // III. ФУНКЦІОНАЛЬНІСТЬ
    // =======================================================

    /**
     * Визначає найкращу якість за назвою торрента.
     */
    function detectQuality(torrentTitle) {
        if (!torrentTitle) return null;
        
        const title = torrentTitle.toLowerCase();

        // 1. Найвища якість (кодування)
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(title)) return 'DV';
        if (/\b(hdr10\+)\b/i.test(title)) return 'HDR10+';
        if (/\b(hdr|hdr10)\b/i.test(title)) return 'HDR';

        // 2. Роздільна здатність
        if (/\b(4k|2160p|uhd)\b/i.test(title)) return '4K';
        if (/\b(fullhd|1080p)\b/i.test(title)) return 'FHD';
        if (/\b(hd|720p)\b/i.test(title)) return 'HD';
        
        // 3. Низька якість та тип ріпа
        // Додаємо більше поширених позначень для охоплення більшої кількості релізів
        if (/\b(sd|480p|360p|webrip|web-dl|dvdrip)\b/i.test(title)) return 'SD';
        if (/\b(ts|telesync|cam|hdcam|hdts)\b/i.test(title)) return 'TS';
        
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
     * Запит до API для отримання торрентів.
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
     * Додає значок якості до картки.
     */
    function addQualityBadge(card, bestQuality) {
        if (!card || !bestQuality) return;

        let existing = card.querySelector('.card__quality-badge');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.className = 'card__quality-badge';

        // Додаємо лише один, найкращий знайдений тег
        const tag = document.createElement('div');
        
        // Перетворюємо якість на коректний CSS-клас
        const tagClass = bestQuality.toLowerCase().replace('+', '-plus'); 
        
        tag.className = 'quality-tag ' + tagClass;
        tag.textContent = bestQuality;
        box.appendChild(tag);

        card.appendChild(box);
        
        // ПІСЛЯ додавання бейджа, зміщуємо рейтинг, щоб уникнути накладання.
        // Це єдина зміна, яка гарантує, що бейдж буде ЗЛІВА ВІД РЕЙТИНГУ.
        const rating = card.querySelector('.card__vote');
        if (rating) {
            // Визначаємо ширину доданого бейджа (і контейнера)
            const badgeWidth = box.offsetWidth + 4; // 4px - це gap між елементами
            // Зміщуємо рейтинг на ширину нашого бейджа.
            // Рейтинг має position: absolute; left: 10px;
            rating.style.left = `${10 + badgeWidth}px`;
        }
    }
    
    /**
     * Обробляє одну картку: перевіряє кеш або робить API-запит.
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

            // Логіка пріоритетів: вибираємо якість з вищим індексом
            if (!bestQuality || 
                QUALITY_PRIORITY.indexOf(q) > QUALITY_PRIORITY.indexOf(bestQuality)) {
                bestQuality = q;
            }
        });

        // Оновлення кешу 
        cache = cleanupCache(cache);
        cache[movieData.id] = {
            quality: bestQuality,
            timestamp: Date.now()
        };
        localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));

        if (bestQuality) addQualityBadge(card, bestQuality);
    }

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
