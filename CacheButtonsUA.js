(function() {
    setTimeout(function() {
        const clearBtnId = 'CLEARCACHE';
        const UKRAINE_FLAG_SVG = '<span class="flag-container"><svg class="flag-svg" viewBox="0 0 20 15"><rect width="20" height="7.5" y="0" fill="#0057B7"/><rect width="20" height="7.5" y="7.5" fill="#FFD700"/></svg></span>';

        // 1. Додавання CSS (Захищено від дублювання)
        if (!document.getElementById('lampa-custom-style')) {
            const css = `
                .head__action.selector.open--feed svg path { fill: #2196F3 !important; }
                #${clearBtnId} svg path { fill: lime !important; transition: fill 0.2s ease; }
                #${clearBtnId}.selector:hover, #${clearBtnId}.selector:focus { background: white !important; }
                #${clearBtnId}.selector:hover svg path { fill: black !important; }
                .full-start__button { transition: transform 0.2s ease !important; position: relative; }
                .full-start__button:active { transform: scale(0.98) !important; }
                .full-start__button.view--online svg path { fill: #2196f3 !important; }
                .full-start__button.view--torrent svg path { fill: lime !important; }
                .full-start__button.view--trailer svg path { fill: #f44336 !important; }
                .full-start__button.loading::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
                    background: rgba(255,255,255,0.5); animation: loading 1s linear infinite;
                }
                @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
                .flag-container { display: inline-flex; align-items: center; vertical-align: middle; height: 1.27em; margin-left: 3px; pointer-events: none; }
                .flag-svg { display: inline-block; vertical-align: middle; margin-right: 2px; border-radius: 2px; width: 22px; height: 15px; }
                .ua-flag-processed { display: inline-flex; align-items: center; }
                @media (max-width: 767px) {
                    .full-start__button { min-height: 44px !important; padding: 10px !important; }
                    .flag-svg { width: 16px; height: 12px; }
                }
            `;
            const style = document.createElement('style');
            style.id = 'lampa-custom-style';
            style.textContent = css;
            document.head.appendChild(style);
        }

        // 2. Безпечна логіка заміни тексту
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
                if (!node || node.nodeType !== 1) return;
                
                // Пропускаємо вже оброблені або системні елементи
                if (node.classList.contains('ua-flag-processed') || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;

                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                let textNode;
                const tasks = [];

                while (textNode = walker.nextNode()) {
                    let text = textNode.nodeValue;
                    let changed = false;
                    
                    for (const [pattern, replacement] of REPLACEMENTS) {
                        if (pattern.test(text)) {
                            text = text.replace(pattern, replacement);
                            changed = true;
                        }
                    }

                    if (changed) {
                        tasks.push({ oldNode: textNode, newHTML: text });
                    }
                }

                tasks.forEach(task => {
                    const span = document.createElement('span');
                    span.className = 'ua-flag-processed';
                    span.innerHTML = task.newHTML;
                    if (task.oldNode.parentNode) {
                        task.oldNode.parentNode.replaceChild(span, task.oldNode);
                    }
                });
            } catch (e) {
                // Тихе ігнорування помилок DOM
            }
        }

        // 3. Додавання кнопки кешу (Перевірка на наявність контейнера)
        function injectClearButton() {
            if ($('#' + clearBtnId).length) return;
            const container = $('.head__actions');
            if (container.length) {
                container.append(`
                    <div id="${clearBtnId}" class="head__action selector m-clear-cache">
                        <svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 3.1l1.4 2.2-1.6 1.1 1.3 0.3 2.8 0.6 0.6-2.7 0.4-1.4-1.8 1.1-2-3.3h-2.2l-2.6 4.3 1.7 1z"/>
                            <path d="M16 12l-2.7-4.3-1.7 1 2 3.3h-2.6v-2l-3 3 3 3v-2h3.7z"/>
                            <path d="M2.4 12v0l1.4-2.3 1.7 1.1-0.9-4.2-2.8 0.7-1.3 0.3 1.6 1-2.1 3.4 1.3 2h5.7v-2z"/>
                        </svg>
                    </div>
                `);

                $('#' + clearBtnId).on('click', function() {
                    $(this).addClass('loading');
                    setTimeout(() => {
                        if (window.Lampa && Lampa.Cache) Lampa.Cache.clear();
                        localStorage.clear(); // Більш агресивне очищення для стабільності
                        alert('🗑 Кеш очищено. Перезавантаження...');
                        location.reload();
                    }, 500);
                });
            }
        }

        // 4. Оновлення іконок (Тільки якщо вони існують)
        function updateIcons() {
            const torrents = $('.full-start__button.view--torrent:not(.icon-updated)');
            const online = $('.full-start__button.view--online:not(.icon-updated)');
            
            if (torrents.length) {
                torrents.addClass('icon-updated').find('svg').replaceWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="40" height="40"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2zM40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722C42.541,30.867,41.756,30.963,40.5,30.963z"/></svg>');
            }
            if (online.length) {
                online.addClass('icon-updated').find('svg').replaceWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40"><path d="M20.331 14.644l-13.794-13.831 17.55 10.075zM2.938 0c-0.813 0.425-1.356 1.2-1.356 2.206v27.581c0 1.006 0.544 1.781 1.356 2.206l16.038-16zM29.512 14.1l-3.681-2.131-4.106 4.031 4.106 4.031 3.756-2.131c1.125-0.893 1.125-2.906-0.075-3.8zM6.538 31.188l17.55-10.075-3.756-3.756z"/></svg>');
            }
        }

        // 5. Спостерігач (Оптимізований)
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        translateNode(node);
                        if (node.querySelector('.full-start__button')) updateIcons();
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Ініціалізація
        injectClearButton();
        translateNode(document.body);
        updateIcons();

        if (window.Lampa && Lampa.Listener) {
            Lampa.Listener.follow('full', () => {
                setTimeout(updateIcons, 100);
            });
        }

        // Реєстрація
        window.plugin_clear_cache_v2 = true;
    }, 1000);
})();

