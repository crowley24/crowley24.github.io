(function () {
    'use strict';

    const DEBUG = false;
    const CACHE_KEY = 'quality_cache_v2';
    const CACHE_TIME = 24 * 60 * 60 * 1000;

    /* === CSS Premium Badge === */
    const style = document.createElement('style');
    style.textContent = `
    .premium-quality-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        display: inline-flex;
        align-items: center;
        border-radius: 10px;
        overflow: hidden;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.3px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.12);
        z-index: 50;
    }
    .premium-quality-badge .left {
        background: #000;
        color: #fff;
        padding: 4px 10px;
    }
    .premium-quality-badge .right {
        padding: 4px 10px;
        color: #000;
    }
    .premium-quality-badge .right.hdr {
        background: #ffd900;
    }
    .premium-quality-badge .right.dv {
        background: #00e66b;
    }
    `;
    document.head.appendChild(style);

    /* === Detect quality in torrent names === */
    function detectQuality(t) {
        if (!t) return null;

        const q = {
            is4K: /\b(4k|2160p|uhd)\b/i.test(t),
            isHDR: /\b(hdr|hdr10|hdr10\+)\b/i.test(t),
            isDV: /\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(t),
        };

        if (!q.is4K) return null;

        if (q.isDV) return { q: "4K", h: "Dolby Vision" };
        if (q.isHDR) return { q: "4K", h: "HDR" };

        return null;
    }

    /* === API Request === */
    function fetchTorrents(info, cb) {
        const api = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +
            '/api/v1.0/torrents?search=' +
            encodeURIComponent(info.title) +
            '&year=' + info.year + '&exact=true';

        if (DEBUG) console.log('API →', api);

        fetch(api)
            .then(r => r.json())
            .then(j => cb(j || []))
            .catch(() => cb([]));
    }

    /* === Add badge to card === */
    function addBadge(card, data) {
        if (!data) return;

        const old = card.querySelector('.premium-quality-badge');
        if (old) old.remove();

        const badge = document.createElement('div');
        badge.className = 'premium-quality-badge';

        badge.innerHTML = `
            <div class="left">${data.q}</div>
            <div class="right ${data.h === "HDR" ? "hdr" : "dv"}">${data.h}</div>
        `;

        card.appendChild(badge);
    }

    /* === Extract card info === */
    function getCardInfo(card) {
        const d = card.card_data;
        if (!d) return null;

        return {
            id: d.id,
            title: d.title || d.name || '',
            year: d.release_date ? d.release_date.slice(0, 4) : '',
        };
    }

    /* === Cache read/write === */
    function loadCache() {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    }

    function saveCache(cache) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }

    /* === Process card === */
    function processCard(card) {
        if (card.hasAttribute('premium-badge-ready')) return;
        card.setAttribute('premium-badge-ready', '1');

        const info = getCardInfo(card);
        if (!info || !info.id) return;

        const cache = loadCache();
        const item = cache[info.id];

        if (item && Date.now() - item.time < CACHE_TIME) {
            if (item.data) addBadge(card, item.data);
            return;
        }

        fetchTorrents(info, torrents => {
            let best = null;

            for (const t of torrents) {
                const detected = detectQuality(t.title || '');
                if (detected) {
                    best = detected;
                    break;
                }
            }

            cache[info.id] = { time: Date.now(), data: best };
            saveCache(cache);

            if (best) addBadge(card, best);
        });
    }

    /* === Process all cards === */
    function scanCards() {
        document.querySelectorAll('.card:not([premium-badge-ready])')
            .forEach(processCard);
    }

    /* === Mutation observer === */
    const observer = new MutationObserver(() => {
        setTimeout(scanCards, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    /* === Init === */
    scanCards();
})();
