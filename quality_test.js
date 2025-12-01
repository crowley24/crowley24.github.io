(function () {
    'use strict';

    const BADGE_ID = 'premium_quality_badge';

    /* === CSS для скляного преміум бейджа === */
    const style = document.createElement('style');
    style.textContent = `
    .quality-badge {
        position: absolute;
        left: 6px;
        bottom: 6px;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 4px;
        color: #fff;
        backdrop-filter: blur(8px);
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        z-index: 50;
        pointer-events: none;
    }
    .quality-badge.dv {
        background: linear-gradient(135deg, rgba(0,255,120,0.35), rgba(0,200,90,0.35));
    }
    .quality-badge.hdr {
        background: linear-gradient(135deg, rgba(255,220,0,0.35), rgba(255,180,0,0.35));
    }
    `;
    document.head.appendChild(style);

    /* === знаходимо постер всередині картки === */
    function getPoster(card) {
        return (
            card.querySelector('.card__img') ||
            card.querySelector('.card__image') ||
            card.querySelector('.card__view') ||
            card.querySelector('.card-image') ||
            card.querySelector('.card-poster') ||
            card.querySelector('.poster') ||
            card.querySelector('.picture') ||
            card
        );
    }

    /* === Вставка бейджа === */
    function applyBadge(card, quality, hdrType) {
        let poster = getPoster(card);
        if (!poster) return;

        if (poster.querySelector('.quality-badge')) return;

        if (getComputedStyle(poster).position === 'static') {
            poster.style.position = 'relative';
        }

        let badge = document.createElement('div');
        badge.className = `quality-badge ${hdrType}`;
        badge.innerHTML = `<span>${quality}</span> ${hdrType === 'dv' ? 'Dolby Vision' : 'HDR'}`;

        poster.appendChild(badge);
    }

    /* === Детектуємо якість з назви торренту === */
    function detectQuality(name) {
        if (!name) return null;

        name = name.toLowerCase();

        if (name.includes('dv') || name.includes('dolby vision') || name.includes('dovi'))
            return { q: '4K', h: 'dv' };

        if (name.includes('hdr'))
            return { q: '4K', h: 'hdr' };

        return null;
    }

    /* === Запит торрентів по API === */
    async function fetchTorrents(title, year) {
        try {
            let api = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz');
            let url = `${api}/api/v1.0/torrents?search=${encodeURIComponent(title)}&year=${year}&exact=true`;

            const req = await fetch(url);
            if (!req.ok) return [];

            return await req.json();
        } catch (e) {
            return [];
        }
    }

    /* === Повна обробка картки === */
    async function processCard(card) {
        if (card.dataset.premiumProcessed) return;
        card.dataset.premiumProcessed = '1';

        let data = card.card_data;
        if (!data) return;

        let title = data.title;
        let year = data.release_date ? data.release_date.slice(0, 4) : '';

        let torrents = await fetchTorrents(title, year);
        if (!torrents.length) return;

        let best = null;

        for (let t of torrents) {
            let q = detectQuality(t.title);
            if (!q) continue;

            if (!best) best = q;

            if (q.h === 'dv') {
                best = q;
                break;
            }
        }

        if (!best) return;

        applyBadge(card, best.q, best.h);
    }

    /* === Сканування всіх карток === */
    function scan() {
        const cards = document.querySelectorAll(`
            .card,
            .card-item,
            .card-w,
            .card-mini,
            .card--poster,
            .selector-card,
            .card-media,
            .card-film
        `);

        cards.forEach(processCard);
    }

    /* === Mutation Observer — ловимо появу карток === */
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList: true, subtree: true });

    /* === Початковий запуск === */
    setTimeout(scan, 800);

})();
