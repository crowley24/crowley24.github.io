(function () {
    'use strict';

    const CACHE_KEY = 'quality_cache_glass_v1';
    const CACHE_TIME = 24 * 60 * 60 * 1000;

    /* === GLASS + GRADIENT BADGE CSS === */
    const style = document.createElement('style');
    style.textContent = `
    .premium-quality-badge {
        position: absolute;
        left: 6px;
        bottom: 6px;
        display: inline-flex;
        align-items: center;
        border-radius: 12px;
        overflow: hidden;
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.3px;
        z-index: 50;

        /* Glassmorphism */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.18);
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }

    .premium-quality-badge .left {
        padding: 3px 8px;
        color: #fff;
        font-weight: 700;
        background: linear-gradient(135deg, #0A0A0A, #2A2A2A);
    }

    .premium-quality-badge .right {
        padding: 3px 10px;
        color: #000;
        font-weight: 700;
    }

    /* Gradient HDR */
    .premium-quality-badge .right.hdr {
        background: linear-gradient(135deg, #FFD900, #FFB800);
    }

    /* Gradient Dolby Vision */
    .premium-quality-badge .right.dv {
        background: linear-gradient(135deg, #00e66b, #00c655);
    }
    `;
    document.head.appendChild(style);

    /* === Detect quality === */
    function detectQuality(t) {
        if (!t) return null;

        const text = t.toLowerCase();

        const is4k = /4k|2160p|uhd/.test(text);
        const isDV = /dolby\s*vision|dolbyvision|dv|dovi/.test(text);
        const isHDR = /hdr|hdr10|hdr10\+/.test(text);

        if (!is4k) return null;

        if (isDV) return { q: "4K", h: "Dolby Vision" };
        if (isHDR) return { q: "4K", h: "HDR" };

        return null;
    }

    /* === API === */
    function fetchTorrents(info, cb) {
        const url = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz') +
            '/api/v1.0/torrents?search=' +
            encodeURIComponent(info.title) +
            '&year=' + info.year +
            '&exact=true';

        fetch(url)
            .then(r => r.json())
            .then(j => cb(j || []))
            .catch(() => cb([]));
    }

    /* === Add badge to card === */
    function addBadge(card, q) {
        const old = card.querySelector('.premium-quality-badge');
        if (old) old.remove();

        const box = document.createElement('div');
        box.className = 'premium-quality-badge';

        box.innerHTML = `
            <div class="left">${q.q}</div>
            <div class="right ${q.h === "HDR" ? "hdr" : "dv"}">${q.h}</div>
        `;

        card.appendChild(box);
    }

    /* === Extract card info === */
    function getInfo(card) {
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
    function saveCache(c) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    }

    /* === Process card === */
    function processCard(card) {
        if (card.hasAttribute('glass-badge-ready')) return;
        card.setAttribute('glass-badge-ready', '1');

        const info = getInfo(card);
        if (!info || !info.id) return;

        const cache = loadCache();
        const record = cache[info.id];

        if (record && Date.now() - record.time < CACHE_TIME) {
            if (record.data) addBadge(card, record.data);
            return;
        }

        fetchTorrents(info, list => {
            let best = null;

            for (const t of list) {
                const q = detectQuality(t.title || '');
                if (q) {
                    best = q;
                    break;
                }
            }

            cache[info.id] = { time: Date.now(), data: best };
            saveCache(cache);

            if (best) addBadge(card, best);
        });
    }

    /* === Scan all cards === */
    function scan() {
        document.querySelectorAll('.card:not([glass-badge-ready])')
            .forEach(processCard);
    }

    /* === Watch for new cards === */
    new MutationObserver(() => setTimeout(scan, 300))
        .observe(document.body, { childList: true, subtree: true });

    scan();
})();
