(function () {
    'use strict';

    /* ======================================================
       I. CONFIG
    ====================================================== */
    var LOG = true;

    /* ======================================================
       II. STYLES (твій дизайн)
    ====================================================== */
    function initStyles() {
        if (document.getElementById('qb-style')) return;

        var s = document.createElement('style');
        s.id = 'qb-style';
        s.textContent = `
        .card__view{position:relative!important}

        .qb-badges{
            position:absolute;
            top:6px;
            left:6px;
            display:flex;
            flex-wrap:wrap;
            gap:4px;
            z-index:20;
        }

        .qb-badge{
            font-size:11px;
            font-weight:700;
            padding:2px 6px;
            border-radius:4px;
            background:#000;
            color:#fff;
            box-shadow:0 1px 4px rgba(0,0,0,.6);
            line-height:1.2;
            white-space:nowrap;
        }

        .qb-4k{background:#8b0000}
        .qb-hdr{background:#006400}
        .qb-dv{background:#4b0082}
        .qb-fhd{background:#1e90ff}
        .qb-hd{background:#4169e1}
        .qb-sd{background:#8b4513}
        .qb-audio{background:#2f4f4f}
        .qb-dub{background:#483d8b}
        `;
        document.head.appendChild(s);
    }

    /* ======================================================
       III. BADGE FACTORY
    ====================================================== */
    function createBadge(text, cls) {
        var b = document.createElement('div');
        b.className = 'qb-badge ' + cls;
        b.textContent = text;
        return b;
    }

    /* ======================================================
       IV. QUALITY PARSER (твій)
    ====================================================== */
    function parseQuality(title) {
        if (!title) return null;
        var t = title.toLowerCase();

        var res = [];
        if (/dolby\s*vision|dv\b/.test(t)) res.push({t:'DV',c:'qb-dv'});
        if (/hdr/.test(t)) res.push({t:'HDR',c:'qb-hdr'});
        if (/2160p|4k|uhd/.test(t)) res.push({t:'4K',c:'qb-4k'});
        else if (/1080p|fhd/.test(t)) res.push({t:'FHD',c:'qb-fhd'});
        else if (/720p|hd\b/.test(t)) res.push({t:'HD',c:'qb-hd'});
        else if (/480p|sd\b/.test(t)) res.push({t:'SD',c:'qb-sd'});

        if (/dts|truehd|atmos/.test(t)) res.push({t:'AUDIO',c:'qb-audio'});
        if (/dub|дубляж|ukr/.test(t)) res.push({t:'DUB',c:'qb-dub'});

        return res;
    }

    /* ======================================================
       V. UI APPLY (як MAXSM)
    ====================================================== */
    function applyBadges(card, badges) {
        if (!badges || !badges.length) return;
        if (card.hasAttribute('data-qb')) return;

        var view = card.querySelector('.card__view');
        if (!view) return;

        var wrap = document.createElement('div');
        wrap.className = 'qb-badges';

        badges.forEach(function (b) {
            wrap.appendChild(createBadge(b.t, b.c));
        });

        view.appendChild(wrap);
        card.setAttribute('data-qb', '1');
    }

    /* ======================================================
       VI. CARD PROCESSOR
    ====================================================== */
    function processCard(card) {
        var data = card.card_data;
        if (!data) return;

        var title =
            data.release_title ||
            data.title ||
            data.name ||
            data.original_title ||
            data.original_name;

        var badges = parseQuality(title);
        applyBadges(card, badges);
    }

    /* ======================================================
       VII. OBSERVER (MAXSM-style)
    ====================================================== */
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (n) {
                if (n.nodeType !== 1) return;

                if (n.classList && n.classList.contains('card')) {
                    processCard(n);
                }

                var cards = n.querySelectorAll
                    ? n.querySelectorAll('.card')
                    : [];
                cards.forEach(processCard);
            });
        });
    });

    /* ======================================================
       VIII. START
    ====================================================== */
    function start() {
        if (LOG) console.log('[QB] start');
        initStyles();

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        document.querySelectorAll('.card').forEach(processCard);
    }

    if (!window.__qualityBadgesV2) {
        window.__qualityBadgesV2 = true;
        start();
    }
})();
