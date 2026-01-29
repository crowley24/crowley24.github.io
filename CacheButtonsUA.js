(function() {
    setTimeout(function() {
        const clearBtnId = 'CLEARCACHE';
        const UKRAINE_FLAG_SVG = '<span class="flag-container"><svg class="flag-svg" viewBox="0 0 20 15"><rect width="20" height="7.5" y="0" fill="#0057B7"/><rect width="20" height="7.5" y="7.5" fill="#FFD700"/></svg></span>';

        // 1. Додавання CSS (Включаючи кольори для всіх кнопок)
        if (!document.getElementById('lampa-custom-style')) {
            const css = `
                .head__action.selector.open--feed svg path { fill: #2196F3 !important; }
                #${clearBtnId} svg path { fill: lime !important; transition: fill 0.2s ease; }
                #${clearBtnId}.selector:hover svg path { fill: black !important; }
                
                .full-start__button { transition: transform 0.2s ease !important; position: relative; }
                .full-start__button:active { transform: scale(0.98) !important; }
                
                /* Кольори для кнопок */
                .full-start__button.view--online svg path { fill: #2196f3 !important; }
                .full-start__button.view--torrent svg path { fill: lime !important; }
                .full-start__button.view--trailer svg path { fill: #f44336 !important; }

                .full-start__button.loading::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
                    background: rgba(255,255,255,0.5); animation: loading 1s linear infinite;
                }
                @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                
                .flag-container { display: inline-flex; align-items: center; vertical-align: middle; height: 1.27em; margin-left: 3px; pointer-events: none; }
                .flag-svg { display: inline-block; vertical-align: middle; border-radius: 2px; width: 22px; height: 15px; }
                .ua-flag-processed { display: inline-flex; align-items: center; }
            `;
            const style = document.createElement('style');
            style.id = 'lampa-custom-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // 2. Логіка заміни тексту
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
            try {
                if (!node || node.nodeType !== 1 || node.classList.contains('ua-flag-processed')) return;
                if (['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA'].includes(node.tagName)) return;

                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                let textNode;
                while (textNode = walker.nextNode()) {
                    let text = textNode.nodeValue;
                    let changed = false;
                    REPLACEMENTS.forEach(([pattern, replacement]) => {
                        if (pattern.test(text)) {
                            text = text.replace(pattern, replacement);
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
            } catch (e) {}
        }

        // 3. Оновлення іконок (Виправлено зникнення кнопок)
        function updateIcons() {
            // Онлайн
            $('.full-start__button.view--online:not(.updated)').addClass('updated').find('svg').replaceWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40"><path d="M20.331 14.644l-13.794-13.831 17.55 10.075zM2.938 0c-0.813 0.425-1.356 1.2-1.356 2.206v27.581c0 1.006 0.544 1.781 1.356 2.206l16.038-16zM29.512 14.1l-3.681-2.131-4.106 4.031 4.106 4.031 3.756-2.131c1.125-0.893 1.125-2.906-0.075-3.8zM6.538 31.188l17.55-10.075-3.756-3.756z"/></svg>');
            
            // Торрент
            $('.full-start__button.view--torrent:not(.updated)').addClass('updated').find('svg').replaceWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="40" height="40"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2zM40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722C42.541,30.867,41.756,30.963,40.5,30.963z"/></svg>');
            
            // Трейлер
            $('.full-start__button.view--trailer:not(.updated)').addClass('updated').find('svg').replaceWith('<svg viewBox="0 0 80 70" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg>');
        }

        // 4. Додавання кнопки кешу
        function injectClearButton() {
            if ($('#' + clearBtnId).length) return;
            $('.head__actions').append(`
                <div id="${clearBtnId}" class="head__action selector">
                    <svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 3.1l1.4 2.2-1.6 1.1 1.3 0.3 2.8 0.6 0.6-2.7 0.4-1.4-1.8 1.1-2-3.3h-2.2l-2.6 4.3 1.7 1z"/>
                        <path d="M16 12l-2.7-4.3-1.7 1 2 3.3h-2.6v-2l-3 3 3 3v-2h3.7z"/>
                        <path d="M2.4 12v0l1.4-2.3 1.7 1.1-0.9-4.2-2.8 0.7-1.3 0.3 1.6 1-2.1 3.4 1.3 2h5.7v-2z"/>
                    </svg>
                </div>
            `);
            $('#' + clearBtnId).on('click', function() {
                if (window.Lampa && Lampa.Cache) Lampa.Cache.clear();
                localStorage.clear();
                alert('🗑 Кеш очищено');
                location.reload();
            });
        }

        // 5. Спостерігач
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    translateNode(node);
                    if (node.querySelector('.full-start__button') || node.classList.contains('full-start__button')) {
                        updateIcons();
                    }
                }
            }));
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Старт
        injectClearButton();
        updateIcons();
        translateNode(document.body);

        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('full', () => setTimeout(updateIcons, 100));
        }
    }, 1200);
})();
