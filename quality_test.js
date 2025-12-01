(function () {
    'use strict';

    const DEBUG = false;
    const QUALITY_CACHE = 'quality_cache_v2';
    const CACHE_TIME = 24 * 60 * 60 * 1000;

    // Добавляем CSS стиля премиум-бейджа
    Lampa.Utils.injectStyle(`
        .premium-quality-badge {
            display: inline-flex;
            align-items: center;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 14px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.4px;
            border: 1px solid rgba(255,255,255,0.12);
        }

        .premium-quality-badge .left {
            background: #000;
            color: #fff;
            padding: 6px 12px;
        }

        .premium-quality-badge .right {
            padding: 6px 12px;
            color: #000;
        }

        .premium-quality-badge .right.hdr {
            background: #ffd900;
        }

        .premium-quality-badge .right.dv {
            background: #00e66b;
        }

        .card__quality-badge {
            position: absolute;
            bottom: 10px;
            left: 10px;
            transform: scale(0.9);
        }
    `);

    // Качество по названию торрент-файла
    function detectQuality(title) {
        if (!title) return {};

        title = title.toLowerCase();

        const result = {
            fourk: false,
            hdr: false,
            dv: false
        };

        if (/4k|2160p|uhd/.test(title)) result.fourk = true;
        if (/hdr10\+|hdr10|hdr/.test(title)) result.hdr = true;
        if (/dolby.?vision|dovi|dv/.test(title)) result.dv = true;

        return result;
    }

    // Загружаем торренты
    function loadTorrents(query, year) {
        const url = `http://${Lampa.Storage.get('jacred.xyz') || 'jacred.xyz'}/api/v1.0/torrents?search=${encodeURIComponent(query)}&year=${year}&exact=true`;

        return fetch(url)
            .then(r => r.json())
            .catch(() => []);
    }

    // Создаем премиум-бейдж
    function createBadge(is4k, hdr, dv) {
        if (!is4k) return null;

        const badge = document.createElement('div');
        badge.className = 'premium-quality-badge';

        const left = document.createElement('div');
        left.className = 'left';
        left.textContent = '4K';

        const right = document.createElement('div');
        right.className = 'right ' + (dv ? 'dv' : 'hdr');
        right.textContent = dv ? 'Dolby Vision' : 'HDR';

        badge.appendChild(left);
        badge.appendChild(right);

        return badge;
    }

    // Вставка бейджа в карточку и fullscreen
    function addBadgeToCard(card, is4k, hdr, dv) {
        const badge = createBadge(is4k, hdr, dv);
        if (!badge) return;

        card.appendChild(badge.cloneNode(true));
    }

    function addBadgeToFull(info, is4k, hdr, dv) {
        const badge = createBadge(is4k, hdr, dv);
        if (!badge) return;

        const block = document.querySelector('.fullscreen-info');
        if (!block) return;

        const old = block.querySelector('.premium-quality-badge');
        if (old) old.remove();

        block.appendChild(badge);
    }

    // Основная обработка карточки
    function processCard(card) {
        if (card.dataset.qualityLoaded) return;
        card.dataset.qualityLoaded = "1";

        const data = card.card_data;
        if (!data) return;

        const cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || "{}");
        const cached = cache[data.id];

        if (cached && Date.now() - cached.time < CACHE_TIME) {
            addBadgeToCard(card, cached.fourk, cached.hdr, cached.dv);
            return;
        }

        loadTorrents(data.title, data.release_date?.slice(0, 4)).then(list => {
            let best = { fourk: false, hdr: false, dv: false };

            list.forEach(t => {
                const q = detectQuality(t.title);

                if (q.fourk) {
                    best.fourk = true;
                    if (q.dv) best.dv = true;
                    if (q.hdr && !best.dv) best.hdr = true;
                }
            });

            cache[data.id] = {
                fourk: best.fourk,
                hdr: best.hdr,
                dv: best.dv,
                time: Date.now()
            };

            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));

            addBadgeToCard(card, best.fourk, best.hdr, best.dv);
        });
    }

    // Обрабатываем fullscreen
    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;

        const data = e.data;
        if (!data || !data.id) return;

        const cache = JSON.parse(localStorage.getItem(QUALITY_CACHE) || "{}");
        const cached = cache[data.id];

        if (cached) {
            addBadgeToFull(data, cached.fourk, cached.hdr, cached.dv);
            return;
        }

        loadTorrents(data.title, data.release_date?.slice(0, 4)).then(list => {
            let best = { fourk: false, hdr: false, dv: false };

            list.forEach(t => {
                const q = detectQuality(t.title);

                if (q.fourk) {
                    best.fourk = true;
                    if (q.dv) best.dv = true;
                    if (q.hdr && !best.dv) best.hdr = true;
                }
            });

            cache[data.id] = {
                fourk: best.fourk,
                hdr: best.hdr,
                dv: best.dv,
                time: Date.now()
            };

            localStorage.setItem(QUALITY_CACHE, JSON.stringify(cache));

            addBadgeToFull(data, best.fourk, best.hdr, best.dv);
        });
    });

    // Наблюдаем за карточками (DOM)
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.card').forEach(processCard);
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
