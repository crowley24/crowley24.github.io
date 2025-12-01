(function () {
    'use strict';

    var DEBUG = true;
    var QUALITY_CACHE = 'dv_quality_cache';
    var CACHE_TIME = 24 * 60 * 60 * 1000;

    // Стилі
    var style = document.createElement('style');
    style.id = 'dv_quality_style';
    style.textContent = `
        .quality-badge-box {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            display: flex !important;
            gap: 4px !important;
            flex-direction: row !important;
            z-index: 9999 !important;
        }

        .quality-tag {
            padding: 4px 8px !important;
            border-radius: 4px !important;
            font-size: 0.7em !important;
            font-weight: 700 !important;
            color: #000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
            text-transform: uppercase !important;
        }

        .tag-4k {
            background: #FFD400 !important;
            border: 1px solid #000 !important;
        }

        .tag-hdr {
            background: #5AB4FF !important;
            border: 1px solid #003366 !important;
        }

        .tag-dv {
            background: #7CFF7C !important;
            border: 1px solid #004400 !important;
        }
    `;
    document.head.appendChild(style);

    // Виявлення якості
    function detectQuality(title) {
        if (!title) return null;

        let t = title.toLowerCase();

        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(t)) return 'DV';
        if (/\b(hdr|hdr10|hdr10\+)\b/i.test(t)) return 'HDR';
        if (/\b(4k|2160p|uhd)\b/i.test(t)) return '4K';

        return null;
    }

    // Дані картки
    function getCardData(card) {
        let data = card.card_data;
        if (!data) return null;

        return {
            id: data.id || '',
            title: data.title || data.name || '',
            year: data.release_date ? data.release_date.substring(0, 4) : ''
        };
    }

    // Пошук торрентів
    function getTorrents(movie, callback) {
        if (!movie || !movie.title) return callback([]);

        let apiUrl =
            'http://' +
            (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +
            '/api/v1.0/torrents?search=' +
            encodeURIComponent(movie.title) +
            '&year=' +
            movie.year +
            '&exact=true';

        fetch(apiUrl)
            .then(r => r.json())
            .then(list => callback(list || []))
            .catch(() => callback([]));
    }

    // Генерація бейджа
    function addQualityBadge(card, types) {
        if (!types || types.length === 0) return;

        let old = card.querySelector('.quality-badge-box');
        if (old) old.remove();

        let box = document.createElement('div');
        box.className = 'quality-badge-box';

        if (types.includes('4K')) {
            let el = document.createElement('div');
            el.className = 'quality-tag tag-4k';
            el.textContent = '4K';
            box.appendChild(el);
        }

        if (types.includes('HDR')) {
            let el = document.createElement('div');
            el.className = 'quality-tag tag-hdr';
            el.textContent = 'HDR';
            box.appendChild(el);
        }

        if (types.includes('DV')) {
            let el = document.createElement('div');
            el.className = 'quality-tag tag-dv';
            el.textContent = 'Dolby Vision';
            box.appendChild(el);
        }

        card.appendChild(box);
    }

    // Обробка картки
    function processCard(card) {
        if (card.hasAttribute('data-dv-processed')) return;
        card.setAttribute('data-dv-processed', 'true');

        let movie = getCardData(card);
        if (!movie || !movie.id) return;

        let cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || '{}');

        if (cache[movie.id] && Date.now() - cache[movie.id].ts < CACHE_TIME) {
            addQualityBadge(card, cache[movie.id].q);
            return;
        }

        getTorrents(movie, torrents => {
            let found = [];

            torrents.forEach(t => {
                let q = detectQuality(t.title);
                if (!q) return;

                if (!found.includes('4K') && (q === '4K' || q === 'HDR' || q === 'DV'))
                    found.push('4K');

                if (q === 'HDR' && !found.includes('HDR')) found.push('HDR');
                if (q === 'DV' && !found.includes('DV')) found.push('DV');
            });

            cache[movie.id] = { q: found, ts: Date.now() };
            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));

            addQualityBadge(card, found);
        });
    }

    // Обробка всіх карток
    function processAll() {
        document.querySelectorAll('.card:not([data-dv-processed])')
            .forEach(processCard);
    }

    // Спостерігач
    let observer = new MutationObserver(() => setTimeout(processAll, 400));

    function init() {
        observer.observe(document.body, { childList: true, subtree: true });
        processAll();
    }

    if (typeof Lampa !== 'undefined') init();
    else {
        let int = setInterval(() => {
            if (typeof Lampa !== 'undefined') {
                clearInterval(int);
                init();
            }
        }, 400);
    }
})();
