(function () {
    setTimeout(function () {
        const clearBtnId = 'CLEARCACHE';
        const UKRAINE_FLAG_SVG = '<span class="flag-container"><svg class="flag-svg" viewBox="0 0 20 15"><rect width="20" height="7.5" y="0" fill="#0057B7"/><rect width="20" height="7.5" y="7.5" fill="#FFD700"/></svg></span>';

        /* ================= CSS ================= */
        if (!document.getElementById('lampa-custom-style')) {
            const style = document.createElement('style');
            style.id = 'lampa-custom-style';
            style.textContent = `
                .head__action.selector.open--feed svg path { fill:#2196F3 !important; }
                #${clearBtnId} svg path { fill:lime !important; transition:fill .2s; }
                #${clearBtnId}:hover { background:#fff !important; }
                #${clearBtnId}:hover svg path { fill:#000 !important; }

                .full-start__button { transition:transform .2s; position:relative; }
                .full-start__button:active { transform:scale(.98); }
                .full-start__button.view--online svg path { fill:#2196f3 !important; }
                .full-start__button.view--torrent svg path { fill:lime !important; }
                .full-start__button.view--trailer svg path { fill:#f44336 !important; }

                .full-start__button.loading:before{
                    content:''; position:absolute; left:0; right:0; top:0; height:2px;
                    background:rgba(255,255,255,.5); animation:loading 1s linear infinite;
                }
                @keyframes loading { from{transform:translateX(-100%)} to{transform:translateX(100%)} }

                .flag-container{display:inline-flex;align-items:center;height:1.2em;margin-left:3px}
                .flag-svg{width:22px;height:15px;border-radius:2px}
                .ua-flag-processed{position:relative}

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
            if (node.nodeType === 3) {
                let t = node.nodeValue, changed = false;
                REPLACEMENTS.forEach(r => {
                    if (r[0].test(t)) {
                        t = t.replace(r[0], r[1]);
                        changed = true;
                    }
                });
                if (changed) {
                    const span = document.createElement('span');
                    span.className = 'ua-flag-processed';
                    span.innerHTML = t;
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && !node.classList.contains('ua-flag-processed')) {
                node.childNodes.forEach(translateNode);
            }
        }

        /* ================= КНОПКА КЕШУ ================= */
        $('#' + clearBtnId).remove();
        $('.head__actions').append(`
            <div id="${clearBtnId}" class="head__action selector">
                <svg width="24" height="24" viewBox="0 0 16 16">
                    <path d="M8 3.1l1.4 2.2-1.6 1.1 2.8.6 1-4.1-1.8 1.1-2-3.3H4.6l-2.6 4.3 1.7 1z"/>
                    <path d="M16 12l-2.7-4.3-1.7 1 2 3.3h-2.6v-2l-3 3 3 3v-2h3.7z"/>
                    <path d="M2.4 12l1.4-2.3 1.7 1.1-.9-4.2-2.8.7 1.6 1-2.1 3.4 1.3 2h5.7v-2z"/>
                </svg>
            </div>
        `);

        function clearCache() {
            $('#' + clearBtnId).addClass('loading');

            if (window.Lampa?.Cache?.clear) {
                Lampa.Cache.clear();
            } else {
                Object.keys(localStorage)
                    .filter(k => /card_|full_card_|lite_card_|viewed_|parser_|cub_|start_time_|cache_/.test(k))
                    .forEach(k => localStorage.removeItem(k));
            }

            if (window.Lampa?.Noty) {
                Lampa.Noty.show('🗑 Кеш та історію очищено');
            }

            setTimeout(() => location.reload(), 600);
        }

        $('#' + clearBtnId).on('click keydown', function (e) {
            if (e.type === 'click' || e.keyCode === 13) clearCache();
        });

        /* ================= ІКОНКИ ================= */
        function updateIcons() {
            $('.full-start__button.view--torrent svg').replaceWith('<svg viewBox="0 0 50 50" width="40" height="40"><path d="M25 2C12.3 2 2 12.3 2 25s10.3 23 23 23 23-10.3 23-23S37.7 2 25 2z"/></svg>');
            $('.full-start__button.view--online svg').replaceWith('<svg viewBox="0 0 32 32" width="40" height="40"><path d="M2 2l28 14L2 30z"/></svg>');
            $('.full-start__button.view--trailer svg').replaceWith('<svg viewBox="0 0 80 70" width="40" height="40"><path d="M0 0h80v70H0z"/></svg>');
        }

        const observer = new MutationObserver(m =>
            m.forEach(x => x.addedNodes.forEach(n => {
                translateNode(n);
                if (n.nodeType === 1) updateIcons();
            }))
        );

        observer.observe(document.body, { childList: true, subtree: true });
        translateNode(document.body);
        updateIcons();

        if (window.Lampa?.Listener) {
            Lampa.Listener.follow('full', updateIcons);
        }

        if (typeof window.plugin === 'function') {
            window.plugin('clear_cache_ua_pro', {
                type: 'component',
                name: 'UA Оптимізація + Кеш',
                version: '2.5.1',
                author: 'Oleksandr',
                description: 'Авто-українізація, прапорці, синя Стрічка та очищення кешу'
            });
        }

    }, 1000);
})();
