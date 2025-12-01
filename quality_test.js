(function () {
    'use strict';

    const CACHE_KEY = 'quality_cache_glass_v2';
    const CACHE_TIME = 24 * 60 * 60 * 1000;

    /* === CSS === */
    const style = document.createElement('style');
    style.textContent = `
    /* Базовий контейнер картки має залишитись як є; бейдж позиціонується відносно .card */
    .premium-quality-badge {
        position: absolute;
        left: 8px;
        bottom: 8px;
        display: inline-flex;
        align-items: center;
        border-radius: 10px;
        overflow: hidden;
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.25px;
        z-index: 1000;

        /* Glass effect */
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        pointer-events: none; /* не перекриває кліки */
    }

    /* лівий чорний маленький блок 4K */
    .premium-quality-badge .left {
        padding: 4px 8px;
        color: #fff;
        font-weight: 700;
        background: linear-gradient(135deg, #0a0a0a, #252525);
        font-size: 10px;
    }

    /* правий блок з градієнтом */
    .premium-quality-badge .right {
        padding: 4px 9px;
        color: #000;
        font-weight: 700;
        font-size: 10px;
    }

    .premium-quality-badge .right.hdr {
        background: linear-gradient(135deg, #FFD900, #FFB800);
    }

    .premium-quality-badge .right.dv {
        background: linear-gradient(135deg, #00e66b, #00c655);
    }

    /* адаптація для маленьких карток (щоб не вилазив за межі) */
    .card { /* тільки якщо .card не має position, не чіпаємо інші стилі */
        /* no-op: class used to ensure relative set from JS when needed */
    }
    `;
    document.head.appendChild(style);

    /* === Детектор якості === */
    function detectQualityInTitle(t) {
        if (!t) return null;
        const s = t.toLowerCase();
        const is4k = /\b(4k|2160p|uhd)\b/i.test(s);
        const isDV = /\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(s);
        const isHDR = /\b(hdr|hdr10|hdr10\+)\b/i.test(s);

        if (!is4k) return null;
        if (isDV) return { q: '4K', h: 'Dolby Vision' };
        if (isHDR) return { q: '4K', h: 'HDR' };
        return null;
    }

    /* === API fetch === */
    function fetchTorrents(info, cb) {
        const base = 'http://' + (Lampa.Storage.get('jacred.xyz') || 'jacred.xyz');
        const url = base + '/api/v1.0/torrents?search=' + encodeURIComponent(info.title || '') +
            '&year=' + (info.year || '') + '&exact=true';

        fetch(url)
            .then(r => r.ok ? r.json() : [])
            .then(j => cb(j || []))
            .catch(() => cb([]));
    }

    /* === Кешування === */
    function loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
        catch (e) { return {}; }
    }
    function saveCache(c) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
    }

    /* === Отримати інфо з картки === */
    function getCardInfo(card) {
        // на більшості карток Lampa є card.card_data з id, title, release_date
        const d = card.card_data;
        if (!d) return null;
        return {
            id: d.id,
            title: d.title || d.name || '',
            year: d.release_date ? (d.release_date + '').slice(0, 4) : ''
        };
    }

    /* === Додаємо бейдж всередину картки (нижній лівий кут) === */
    function addBadgeToCard(card, qualityData) {
        if (!card || !qualityData) return;

        // Переконаємось, що картка позиціонована відносно для абсолютного бейджа
        const cs = window.getComputedStyle(card);
        if (cs.position === 'static' || !cs.position) {
            // зберігаємо попередній стиль, щоб не змінювати назавжди (але в простих випадках це ок)
            card.style.position = 'relative';
        }

        // Видаляємо старий бейдж, якщо є
        const old = card.querySelector('.premium-quality-badge');
        if (old) old.remove();

        const badge = document.createElement('div');
        badge.className = 'premium-quality-badge';
        badge.innerHTML = `<div class="left">${qualityData.q}</div>
                           <div class="right ${qualityData.h === 'HDR' ? 'hdr' : 'dv'}">${qualityData.h}</div>`;

        card.appendChild(badge);
    }

    /* === Обробка однієї картки === */
    function processCard(card) {
        if (!card || card.hasAttribute('glass-badge-ready')) return;
        card.setAttribute('glass-badge-ready', '1');

        const info = getCardInfo(card);
        if (!info || !info.id) return;

        const cache = loadCache();
        const cached = cache[info.id];

        if (cached && (Date.now() - cached.time < CACHE_TIME)) {
            if (cached.data) addBadgeToCard(card, cached.data);
            return;
        }

        fetchTorrents(info, list => {
            let best = null;
            for (const t of list) {
                const found = detectQualityInTitle(t.title || '');
                if (found) {
                    best = found;
                    break;
                }
            }

            cache[info.id] = { time: Date.now(), data: best };
            saveCache(cache);

            if (best) addBadgeToCard(card, best);
        });
    }

    /* === Просканувати усі картки на сторінці === */
    function scanCards() {
        // Підбираємо селектор, який зазвичай використовують для карток в Lampa
        const nodeList = document.querySelectorAll('.card:not([glass-badge-ready])');
        nodeList.forEach(c => processCard(c));
    }

    /* === MutationObserver для динамічних списків === */
    const observer = new MutationObserver(() => {
        // невелика пауза щоб DOM устаканився
        setTimeout(scanCards, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    /* === Ініціалізація === */
    scanCards();

    /* === Також обробляємо fullscreen (щоб комбінований бейдж теж був у fullscreen, якщо треба) === */
    if (typeof Lampa !== 'undefined' && Lampa.Listener) {
        Lampa.Listener.follow('full', function (event) {
            if (event && event.type === 'complite') {
                // event.data може містити quality/hdr інформацію — пробуємо з неї спочатку
                const d = event.data || {};
                const qFound = (d.quality && /4k/i.test(d.quality)) && (d.hdr && (/dolby|dv/i.test(d.hdr) ? 'Dolby Vision' : (/hdr/i.test(d.hdr) ? 'HDR' : null)));
                // якщо є прямо в даних — додаємо у fullscreen-info
                if (qFound) {
                    const el = document.querySelector('.fullscreen-info');
                    if (el) {
                        addBadgeToCard(el, { q: '4K', h: /dolby|dv/i.test(d.hdr) ? 'Dolby Vision' : 'HDR' });
                    }
                } else {
                    // інакше — залишимо автоматичне сканування карток виконати свою роботу
                    setTimeout(scanCards, 100);
                }
            }
        });
    }

})();
