// Версія плагіну: 4.4 - Фінальна версія з іконкою для онлайн кнопки в Lampa 3.0.0+  
// Поєднує розділення кнопок та оптимізовані SVG/стилі  
  
(function() {  
    'use strict';  
      
    const PLUGIN_NAME = 'EnhancedButtonSeparator';  
    let observer = null;  
      
    function initPlugin() {  
        // Перевірка версії Lampa 3.0.0+  
        if (typeof Lampa === 'undefined') {  
            setTimeout(initPlugin, 100);  
            return;  
        }  
          
        // Перевірка версії для сумісності  
        if (Lampa.Manifest && Lampa.Manifest.app_digital < 300) {  
            console.warn(`${PLUGIN_NAME}: Рекомендується Lampa 3.0.0 або вище`);  
        }  
          
        // Ініціалізація CSS стилів  
        initStyles();  
          
        // Підписка на події  
        Lampa.Listener.follow('full', function(event) {  
            if (event.type === 'complite') {  
                setTimeout(() => {  
                    processButtons(event);  
                    updateButtonSVGs();  
                    startObserver(event);  
                }, 300);  
            }  
              
            if (event.type === 'destroy') {  
                stopObserver();  
            }  
        });  
    }  
      
    function initStyles() {  
        if (!document.getElementById('enhanced-buttons-style')) {  
            const style = document.createElement('style');  
            style.id = 'enhanced-buttons-style';  
            style.textContent = `  
                .full-start__button {  
                    position: relative;  
                    transition: transform 0.2s ease !important;  
                }  
                .full-start__button:active {  
                    transform: scale(0.98) !important;  
                }  
                  
                .full-start__button.view--online svg path { fill: #2196f3 !important; }  
                .full-start__button.view--torrent svg path { fill: lime !important; }  
                .full-start__button.view--trailer svg path { fill: #f44336 !important; }  
                  
                .full-start__button svg {  
                    width: 1.5em !important;  
                    height: 1.5em !important;  
                }  
                  
                .full-start__button.loading::before {  
                    content: '';  
                    position: absolute;  
                    top: 0; left: 0; right: 0;  
                    height: 2px;  
                    background: rgba(255,255,255,0.5);  
                    animation: loading 1s linear infinite;  
                }  
                  
                @keyframes loading {  
                    from { transform: translateX(-100%); }  
                    to   { transform: translateX(100%); }  
                }  
                  
                @media (max-width: 767px) {  
                    .full-start__button {  
                        min-height: 44px !important;  
                        padding: 10px !important;  
                    }  
                }  
            `;  
            document.head.appendChild(style);  
        }  
    }  
      
    const svgs = {  
        torrent: `  
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">  
                <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2zM40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>  
            </svg>`,  
          
        online: `  
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">  
                <path d="M20.331 14.644l-13.794-13.831 17.55 10.075zM2.938 0c-0.813 0.425-1.356 1.2-1.356 2.206v27.581c0 1.006 0.544 1.781 1.356 2.206l16.038-16zM29.512 14.1l-3.681-2.131-4.106 4.031 4.106 4.031 3.756-2.131c1.125-0.893 1.125-2.906-0.075-3.8zM6.538 31.188l17.55-10.075-3.756-3.756z" fill="currentColor"/>  
            </svg>`,  
          
        trailer: `  
            <svg viewBox="0 0 80 70" xmlns="http://www.w3.org/2000/svg">  
                <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/>  
            </svg>`  
    };  
      
    function updateButtonSVGs() {  
        const map = {  
            'view--torrent': svgs.torrent,  
            'view--online': svgs.online,  
            'view--trailer': svgs.trailer  
        };  
          
        // Додаємо обробку для кнопки .button--play якщо це онлайн кнопка (Lampa 3.0.0+)  
        $('.full-start__button.button--play').each(function() {  
            const button = $(this);  
            const text = button.text().toLowerCase().trim();  
            const classes = button.attr('class') || '';  
              
            // Перевіряємо чи це онлайн кнопка  
            const isOnlineButton = text.includes('онлайн') ||   
                                  text.includes('online') ||  
                                  button.attr('data-subtitle')?.includes('v') ||  
                                  button.find('span').text().toLowerCase().includes('онлайн') ||  
                                  button.find('span').text().toLowerCase().includes('online');  
              
            if (isOnlineButton) {  
                const oldSvg = button.find('svg');  
                if (oldSvg.length > 0) {  
                    const newSvg = $(svgs.online);  
                    const width = oldSvg.attr('width') || '1.5em';  
                    const height = oldSvg.attr('height') || '1.5em';  
                      
                    if (oldSvg.attr('class')) {  
                        newSvg.attr('class', oldSvg.attr('class'));  
                    }  
                      
                    oldSvg.html(newSvg.html());  
                      
                    if (newSvg.attr('viewBox')) {  
                        oldSvg.attr('viewBox', newSvg.attr('viewBox'));  
                    }  
                    if (newSvg.attr('xmlns')) {  
                        oldSvg.attr('xmlns', newSvg.attr('xmlns'));  
                    }  
                      
                    oldSvg.css({  
                        'width': width,  
                        'height': height  
                    });  
                }  
            }  
        });  
          
        // Оригінальний код для інших кнопок  
        for (const cls in map) {  
            $(`.full-start__button.${cls}`).each(function() {  
                const button = $(this);  
                const oldSvg = button.find('svg');  
                  
                if (oldSvg.length === 0) return;  
                  
                const newSvg = $(map[cls]);  
                const width = oldSvg.attr('width') || '1.5em';  
                const height = oldSvg.attr('height') || '1.5em';  
                  
                if (oldSvg.attr('class')) {  
                    newSvg.attr('class', oldSvg.attr('class'));  
                }  
                  
                oldSvg.html(newSvg.html());  
                  
                if (newSvg.attr('viewBox')) {  
                    oldSvg.attr('viewBox', newSvg.attr('viewBox'));  
                }  
                if (newSvg.attr('xmlns')) {  
                    oldSvg.attr('xmlns', newSvg.attr('xmlns'));  
                }  
                  
                oldSvg.css({  
                    'width': width,  
                    'height': height  
                });  
            });  
        }  
    }  
      
    function processButtons(event) {  
        try {  
            const render = event.object.activity.render();  
            const mainContainer = render.find('.full-start-new__buttons');  
            const hiddenContainer = render.find('.buttons--container');  
              
            if (!mainContainer.length) return;  
              
            const torrentBtn = hiddenContainer.find('.view--torrent');  
            const trailerBtn = hiddenContainer.find('.view--trailer');  
              
            if (torrentBtn.length > 0) {  
                torrentBtn.removeClass('hide').addClass('selector');  
                mainContainer.append(torrentBtn);  
            }  
              
            if (trailerBtn.length > 0) {  
                trailerBtn.removeClass('hide').addClass('selector');  
                mainContainer.append(trailerBtn);  
            }  
              
            setTimeout(() => {  
                removeSourcesButton(mainContainer);  
            }, 150);  
              
            reorderButtons(mainContainer);  
              
            if (Lampa.Controller) {  
                setTimeout(() => {  
                    Lampa.Controller.collectionSet(mainContainer.parent());  
                }, 200);  
            }  
              
        } catch (error) {  
            console.error(`${PLUGIN_NAME}: Помилка`, error);  
        }  
    }  
      
    function removeSourcesButton(mainContainer) {  
        const allButtons = mainContainer.find('.full-start__button');  
          
        // Перевіряємо версію Lampa  
        const isLampa3Plus = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
          
        allButtons.each(function() {  
            const button = $(this);  
            const text = button.text().toLowerCase().trim();  
            const classes = button.attr('class') || '';  
              
            // Універсальна перевірка для онлайн кнопки  
            const isOnlineButton = classes.includes('view--online') ||   
                                  text.includes('онлайн') ||   
                                  text.includes('online') ||  
                                  button.attr('data-subtitle')?.includes('v') ||  
                                  button.find('span').text().toLowerCase().includes('онлайн') ||  
                                  button.find('span').text().toLowerCase().includes('online');  
              
            // ЗАВЖДИ залишаємо онлайн кнопку  
            if (isOnlineButton) {  
                console.log('Знайдено онлайн кнопку, залишаємо:', classes);  
                return;  
            }  
              
            // Інші важливі кнопки  
            const isImportantButton = classes.includes('view--torrent') ||   
                                     classes.includes('view--trailer') ||   
                                     classes.includes('button--book') ||   
                                     classes.includes('button--reaction') ||   
                                     classes.includes('button--subscribe') ||   
                                     classes.includes('button--subs');  
              
            const isPlayButton = classes.includes('button--play');  
            const isSourcesButton = text.includes('джерела') ||   
                                   text.includes('джерело') ||   
                                   text.includes('sources') ||   
                                   text.includes('source') ||   
                                   text.includes('источники') ||   
                                   text.includes('источник');  
              
            const isOptionsButton = classes.includes('button--options');  
            const isEmpty = text === '' || text.length <= 2;  
              
            // У Lampa 3.0.0+ НЕ видаляємо кнопку "Дивитись"  
            if (isLampa3Plus && isPlayButton) {  
                console.log('Lampa 3.0.0+: залишаємо кнопку Дивитись', classes);  
                return;  
            }  
              
            // Видаляємо тільки неважливі кнопки  
            if (!isImportantButton && (isPlayButton || isSourcesButton || (isOptionsButton && isEmpty))) {  
                console.log('Видаляємо кнопку:', classes, text);  
                button.remove();  
            }  
        });  
    }  
      
    function reorderButtons(container) {  
        container.css('display', 'flex');  
          
        container.find('.full-start__button').each(function() {  
            const button = $(this);  
            const classes = button.attr('class') || '';  
            const text = button.text().toLowerCase();  
              
            let order = 999;  
              
            // Онлайн кнопка - завжди перша (включаючи .button--play)  
            if (classes.includes('view--online') ||   
                text.includes('онлайн') ||   
                text.includes('online') ||  
                (classes.includes('button--play') && (  
                    button.attr('data-subtitle')?.includes('v') ||  
                    button.find('span').text().toLowerCase().includes('онлайн') ||  
                    button.find('span').text().toLowerCase().includes('online')  
                ))) {  
                order = 0; // Найперший  
            } else if (classes.includes('view--torrent') || text.includes('торрент')) {  
                order = 1;  
            } else if (classes.includes('view--trailer') || text.includes('трейлер')) {  
                order = 2;  
            }  
              
            button.css('order', order);  
        });  
    }
    function startObserver(event) {  
        const render = event.object.activity.render();  
        const mainContainer = render.find('.full-start-new__buttons')[0];  
          
        if (!mainContainer) return;  
          
        // Перевіряємо версію Lampa  
        const isLampa3Plus = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
          
        observer = new MutationObserver((mutations) => {  
            mutations.forEach((mutation) => {  
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {  
                    mutation.addedNodes.forEach((node) => {  
                        if (node.nodeType === 1 && node.classList && node.classList.contains('full-start__button')) {  
                            const text = node.textContent.toLowerCase().trim();  
                            const classes = node.className || '';  
                            const $node = $(node);  
                              
                            // Універсальна перевірка для онлайн кнопки  
                            const isOnlineButton = classes.includes('view--online') ||   
                                                  text.includes('онлайн') ||   
                                                  text.includes('online') ||  
                                                  $node.attr('data-subtitle')?.includes('v') ||  
                                                  $node.find('span').text().toLowerCase().includes('онлайн') ||  
                                                  $node.find('span').text().toLowerCase().includes('online');  
                              
                            // ЗАВЖДИ залишаємо онлайн кнопку  
                            if (isOnlineButton) {  
                                console.log('Observer: знайдено онлайн кнопку, залишаємо:', classes);  
                                return;  
                            }  
                              
                            // Інші важливі кнопки  
                            const isImportantButton = classes.includes('view--torrent') ||   
                                                     classes.includes('view--trailer') ||   
                                                     classes.includes('button--book') ||   
                                                     classes.includes('button--reaction') ||   
                                                     classes.includes('button--subscribe') ||   
                                                     classes.includes('button--subs');  
                              
                            const isPlayButton = classes.includes('button--play');  
                            const isSourcesButton = text.includes('джерела') ||   
                                                   text.includes('джерело') ||   
                                                   text.includes('sources') ||   
                                                   text.includes('source') ||   
                                                   text.includes('источники') ||   
                                                   text.includes('источник');  
                              
                            const isOptionsButton = classes.includes('button--options');  
                            const isEmpty = text === '' || text.length <= 2;  
                              
                            // У Lampa 3.0.0+ НЕ видаляємо кнопку "Дивитись"  
                            if (isLampa3Plus && isPlayButton) {  
                                console.log('Observer: Lampa 3.0.0+: залишаємо кнопку Дивитись', classes);  
                                return;  
                            }  
                              
                            // Видаляємо тільки неважливі кнопки  
                            if (!isImportantButton && (isPlayButton || isSourcesButton || (isOptionsButton && isEmpty))) {  
                                console.log('Observer: видаляємо кнопку:', classes, text);  
                                $node.remove();  
                            }  
                        }  
                    });  
                      
                    // Оновлюємо SVG після змін  
                    setTimeout(updateButtonSVGs, 50);  
                }  
            });  
        });  
          
        observer.observe(mainContainer, {  
            childList: true,  
            subtree: false  
        });  
    }  
      
    function stopObserver() {  
        if (observer) {  
            observer.disconnect();  
            observer = null;  
        }  
    }  
      
    // Реєстрація плагіна  
    if (typeof Lampa !== 'undefined') {  
        const manifest = {  
            type: 'component',  
            name: 'Enhanced Button Separator',  
            version: '4.4.0',  
            author: 'Merged Plugin',  
            description: 'Об\'єднаний плагін: розділення кнопок + оптимізовані SVG/стилі з іконкою для онлайн кнопки в Lampa 3.0.0+'  
        };  
          
        if (window.plugin) {  
            window.plugin('enhanced_button_separator', manifest);  
        }  
          
        // Додаткова реєстрація для сумісності  
        Lampa.Manifest.plugins = manifest;  
    }  
      
    if (document.readyState === 'loading') {  
        document.addEventListener('DOMContentLoaded', initPlugin);  
    } else {  
        initPlugin();  
    }  
})();
