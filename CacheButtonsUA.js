(function () {
    'use strict';

    const clearBtnId = 'CLEARCACHE';
    const STYLE_ID = 'lampa-ua-style';
    const UKRAINE_FLAG_SVG =
        '<span class="flag-container">' +
        '<svg class="flag-svg" viewBox="0 0 20 15">' +
        '<rect width="20" height="7.5" y="0" fill="#0057B7"/>' +
        '<rect width="20" height="7.5" y="7.5" fill="#FFD700"/>' +
        '</svg></span>';

    /* ================= CSS ================= */
    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .head__action.selector.open--feed svg path { fill:#2196F3 !important; }

            #${clearBtnId} svg path { fill:lime !important; transition:fill .2s; }
            #${clearBtnId}:hover { background:#fff !important; }
            #${clearBtnId}:hover svg path { fill:#000 !important; }

            .full-start__button { transition:transform .15s; position:relative; }
            .full-start__button:active { transform:scale(.97); }
            .full-start__button.view--online svg path { fill:#2196f3 !important; }
            .full-start__button.view--torrent svg path { fill:lime !important; }
            .full-start__button.view--trailer svg path { fill:#f44336 !important; }

            .flag-container{display:inline-flex;align-items:center;height:1.2em;margin-left:3px}
            .flag-svg{width:22px;height:15px;border-radius:2px}
            .ua-flag-processed{white-space:inherit}

            @media(max-width:767px){
                .full-start__button{min-height:44px;padding:10px}
                .flag-svg{width:16px;height:12px}
            }
        `;
        document.head.appendChild(style);
    }

    /* ================= УКРАЇНІЗАЦІЯ ================= */
    const REPLACEMENTS = [
        [/Uaflix/g, 'UAFlix'],
        [/Zetvideo/g, 'UaFlix'],
        [/Нет истории просмотра/g, 'Історія перегляду відсутня'],
        [/Дублированный|Дубляж/g, 'Дубльований'],
        [/Многоголосый|многоголосый/g, 'багатоголосий'],
        [/двухголосый/g, 'двоголосий'],
        [/(Украинский|Український|Украинская|Українська)/g, UKRAINE_FLAG_SVG + ' Українською'],
        [/1\+1/g, UKRAINE_FLAG_SVG + ' 1+1'],
        [/\bUkr\b/gi, UKRAINE_FLAG_SVG + ' Українською'],
        [/\bUa\b/gi, UKRAINE_FLAG_SVG + ' UA']
    ];

    function translateNode(node) {
        if (!node || node.nodeType !== 1) return;

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);

        let textNode;
        while ((textNode = walker.nextNode())) {
            let text = textNode.nodeValue;
            let changed = false;

            REPLACEMENTS.forEach(([re, val]) => {
                if (re.test(text)) {
                    text = text.replace(re, val);
                    changed = true;
                }
            });

            if (changed) {
                const span = document.createElement('span');
                span.className = 'ua-flag-processed';
                span.innerHTML = text;
                textNode.parentNode.replaceChild(span, textNode);
            }
        }
    }

    /* ================= ІКОНКИ ================= */
    function updateIcons() {
        document.querySelectorAll('.full-start__button.view--torrent svg').forEach(el => {
            el.outerHTML = '<svg viewBox="0 0 50 50" width="40" height="40"><path d="M25 2C12.3 2 2 12.3 2 25s10.3 23 23 23 23-10.3 23-23S37.7 2 25 2z"/></svg>';
        });

        document.querySelectorAll('.full-start__button.view--online svg').forEach(el => {
            el.outerHTML = '<svg viewBox="0 0 32 32" width="40" height="40"><path d="M2 2l28 14L2 30z"/></svg>';
        });

        document.querySelectorAll('.full-start__button.view--trailer svg').forEach(el => {
            el.outerHTML = '<svg viewBox="0 0 80 70" width="40" height="40"><path d="M0 0h80v70H0z"/></svg>';
        });
    }

    /* ================= КНОПКА КЕШУ ================= */
    function injectClearButton() {
        if (document.getElementById(clearBtnId)) return;
        const container = document.querySelector('.head__actions');
        if (!container) return;

        const div = document.createElement('div');
        div.id = clearBtnId;
        div.className = 'head__action selector';
        div.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 16 16">
                <path d="M8 3.1l1.4 2.2-1.6 1.1 2.8.6 1-4.1-1.8 1.1-2-3.3H4.6l-2.6 4.3 1.7 1z"/>
                <path d="M16 12l-2.7-4.3-1.7 1 2 3.3h-2.6v-2l-3 3 3 3v-2h3.7z"/>
                <path d="M2.4 12l1.4-2.3 1.7 1.1-.9-4.2-2.8.7 1.6 1-2.1 3.4 1.3 2h5.7v-2z"/>
            </svg>
        `;

        div.addEventListener('click', clearCache);
        div.addEventListener('keydown', e => e.key === 'Enter' && clearCache());

        container.appendChild(div);
    }

    function clearCache() {
        if (window.Lampa?.Cache?.clear) {
            Lampa.Cache.clear();
        } else {
            Object.keys(localStorage)
                .filter(k => /card_|full_card_|lite_card_|viewed_|parser_|cub_|start_time_|cache_/.test(k))
                .forEach(k => localStorage.removeItem(k));
        }

        window.Lampa?.Noty?.show('🗑 Кеш та історію очищено');
        setTimeout(() => location.reload(), 600);
    }

    /* ================= СТАРТ ================= */
    function initFull(card) {
        translateNode(card);
        updateIcons();
    }

    function init() {
        injectStyle();
        injectClearButton();

        if (window.Lampa?.Listener) {
            Lampa.Listener.follow('full', initFull);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    if (typeof window.plugin === 'function') {
        window.plugin('clear_cache_ua_pro', {
            type: 'component',
            name: 'UA Оптимізація + Кеш',
            version: '2.6.0',
            author: 'Oleksandr',
            description: 'Українізація, прапорці, іконки та очищення кешу без зависань'
        });
    }
})();
