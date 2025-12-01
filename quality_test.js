(function () {
    'use strict';

    /* === CSS для бейджа === */
    const css = `
    .lampa-quality-badge {
        position: absolute;
        left: 6px;
        bottom: 6px;
        display: flex;
        align-items: center;
        border-radius: 10px;
        padding: 3px 6px;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        font-size: 10px;
        font-weight: 700;
        z-index: 50;
        pointer-events: none;
    }
    .lampa-quality-badge span {
        margin-right: 4px;
        color: #fff;
        font-weight: 700;
    }
    .lampa-quality-badge.dv {
        background: linear-gradient(135deg, rgba(0,255,120,0.85), rgba(0,200,90,0.85));
        color: #000;
    }
    .lampa-quality-badge.hdr {
        background: linear-gradient(135deg, rgba(255,220,0,0.85), rgba(255,180,0,0.85));
        color: #000;
    }
    `;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    /* === РЕАЛЬНИЙ ПОШУК ПОСТЕРА === */
    function findPosterElement(card) {
        return (
            card.querySelector('.card__view') ||
            card.querySelector('.card-view') ||
            card.querySelector('.card-image') ||
            card.querySelector('.card-img') ||
            card.querySelector('.card-poster') ||
            card.querySelector('.poster') ||
            card.querySelector('.picture') ||
            card
        );
    }

    /* === Створення бейджа === */
    function insertBadge(card, quality, hdr) {
        if (!card) return;

        const poster = findPosterElement(card);
        if (!poster) return;

        const exist = poster.querySelector('.lampa-quality-badge');
        if (exist) exist.remove();

        if (getComputedStyle(poster).position === 'static') {
            poster.style.position = 'relative';
        }

        const badge = document.createElement('div');
        badge.className = 'lampa-quality-badge ' + (hdr === 'DV' ? 'dv' : 'hdr');
        badge.innerHTML = `<span>${quality}</span>${hdr === 'DV' ? 'Dolby Vision' : 'HDR'}`;

        poster.appendChild(badge);
    }

    /* === Виявлення якості в назві === */
    function detect(title) {
        if (!title) return null;
        const t = title.toLowerCase();

        if (!t.includes('4k') && !t.includes('2160')) return null;

        if (t.includes('dolby vision') || t.includes('dovi') || t.includes('dv'))
            return { q: '4K', h: 'DV' };
        if (t.includes('hdr'))
            return { q: '4K', h: 'HDR' };

        return null;
    }

    /* === Обробка картки === */
    function process(card) {
        if (!card) return;

        const title =
            card.getAttribute('data-title') ||
            card.querySelector('.card__title')?.textContent ||
            card.card_data?.title ||
            '';

        const found = detect(title);
        if (!found) return;

        insertBadge(card, found.q, found.h);
    }

    /* === Сканування DOM === */
    function scan() {
        const cards = document.querySelectorAll(
            `.card,
             .card-item,
             .card-w,
             .card-mini,
             .card--poster,
             .card-film,
             .selector-card,
             .card-media`
        );

        cards.forEach(process);
    }

    /* === Mutation Observer === */
    const obs = new MutationObserver(() => {
        setTimeout(scan, 50);
    });
    obs.observe(document.body, { childList: true, subtree: true });

    scan();
})();
