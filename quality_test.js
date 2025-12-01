(function () {
    'use strict';

    // === CSS бейджа ===
    const css = `
    .lampa-quality-badge {
        position: absolute;
        left: 6px;
        bottom: 6px;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        color: #fff;
        z-index: 50;
        pointer-events: none;
    }
    .lampa-quality-badge.dv {
        background: linear-gradient(135deg, #00FF88AA, #00CC66AA);
        color: #000;
    }
    .lampa-quality-badge.hdr {
        background: linear-gradient(135deg, #FFD700AA, #FFB300AA);
        color: #000;
    }
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    // === Визначення якості ===
    function detectQuality(title) {
        if (!title) return null;

        const t = title.toLowerCase();

        if (!t.includes('4k') && !t.includes('2160')) return null;

        if (t.includes('dolby vision') || t.includes('dovi') || t.includes('dv')) {
            return { q: '4K', h: 'DV' };
        }

        if (t.includes('hdr')) {
            return { q: '4K', h: 'HDR' };
        }

        return null;
    }

    // === Додаємо бейдж у сам постер ===
    function addBadge(card, data) {
        if (!card || !data) return;

        // шукаємо сам постер
        const poster = card.querySelector('.card__view');
        if (!poster) return;

        // видаляємо старий
        const old = poster.querySelector('.lampa-quality-badge');
        if (old) old.remove();

        if (getComputedStyle(poster).position === 'static') {
            poster.style.position = 'relative';
        }

        const badge = document.createElement('div');
        badge.className = 'lampa-quality-badge ' + (data.h === 'DV' ? 'dv' : 'hdr');
        badge.textContent = `${data.q} ${data.h === 'DV' ? 'Dolby Vision' : 'HDR'}`;

        poster.appendChild(badge);
    }

    // === Обробка картки ===
    function handleCard(card) {
        const title =
            card.card_data?.title ||
            card.querySelector('.card__title')?.textContent ||
            card.getAttribute('data-title') ||
            "";

        const q = detectQuality(title);
        if (q) addBadge(card, q);
    }

    // === Сканування DOM ===
    function scan() {
        document.querySelectorAll('.card').forEach(handleCard);
    }

    // === Mutation Observer ===
    const observer = new MutationObserver(() => {
        setTimeout(scan, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    scan();
})();
