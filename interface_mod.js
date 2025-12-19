(function () {
    'use strict';

    // Для совместимости используем Lampa.JQ вместо $
    const $ = Lampa.JQ; 

    // Основной объект плагина
    var InterFaceMod = {
        name: 'interface_mod_lite',
        version: '2.2.2',
        debug: false,
        settings: {
            enabled: true,
            show_buttons: true,
            theme: 'default'
        }
    };
	
    /**
     * @fileoverview Функционал организации и отображения всех кнопок действий.
     */
    function showAllButtons() {
        // Добавляем стили для кнопок с помощью CSS
        var buttonStyle = document.createElement('style');
        buttonStyle.id = 'interface_mod_buttons_style';
        buttonStyle.innerHTML = `
            .full-start-new__buttons, .full-start__buttons {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 10px !important;
            }
        `;
        document.head.appendChild(buttonStyle);
        
        // Вспомогательная функция для организации кнопок
        function organizeButtons(element) {
            if (!element) return;
            
            // Находим контейнеры для кнопок (поддержка различных версий Lampa)
            var targetContainer = $(element).find('.full-start-new__buttons, .full-start__buttons, .buttons-container').first();
            
            if (!targetContainer.length) return;
            
            if (InterFaceMod.debug) {
                console.log('InterfaceMod: Найден контейнер для кнопок', targetContainer);
            }
            
            // Находим все кнопки из разных контейнеров
            var allButtons = [];
            
            var buttonSelectors = [
                '.buttons--container .full-start__button',
                '.full-start-new__buttons .full-start__button', 
                '.full-start__buttons .full-start__button',
                '.buttons-container .button',
                '.full-start-new__buttons .button',
                '.full-start__buttons .button'
            ];
            
            buttonSelectors.forEach(function(selector) {
                $(element).find(selector).each(function() {
                    // Проверяем, что кнопка находится внутри FullCard
                    if ($(this).closest('.full-start-new, .full-start').length) {
                         allButtons.push(this);
                    }
                });
            });
            
            if (allButtons.length === 0) {
                if (InterFaceMod.debug) {
                    console.log('InterfaceMod: Не найдены кнопки для организации');
                }
                return;
            }
            
            // Категории кнопок
            var categories = {
                online: [],
                torrent: [],
                trailer: [],
                other: []
            };
            
            // Отслеживаем добавленные кнопки по тексту, чтобы избежать дубликатов
            var addedButtonTexts = {};
            
            // Сортируем кнопки по категориям
            $(allButtons).each(function() {
                var button = this;
                var buttonText = $(button).text().trim();
                var className = button.className || '';
                
                // Пропускаем дубликаты
                if (!buttonText || addedButtonTexts[buttonText]) return;
                addedButtonTexts[buttonText] = true;
                
                // Определяем категорию кнопки
                if (className.includes('online') || buttonText.toLowerCase().includes('смотреть') || buttonText.toLowerCase().includes('онлайн')) {
                    categories.online.push(button);
                } else if (className.includes('torrent') || buttonText.toLowerCase().includes('торрент')) {
                    categories.torrent.push(button);
                } else if (className.includes('trailer') || buttonText.toLowerCase().includes('трейлер')) {
                    categories.trailer.push(button);
                } else {
                    categories.other.push(button);
                }
            });
            
            // Порядок кнопок
            var buttonSortOrder = ['online', 'torrent', 'trailer', 'other'];
            
            // Проверяем, активен ли сейчас контроллер FullCard
            var activeControllerName = Lampa.Controller.enabled().name;
            var needToggle = (activeControllerName === 'full_start' || activeControllerName === 'full_card');
            
            // Если нужно, временно отключаем контроллер
            if (needToggle) Lampa.Controller.toggle('settings_component');
            
            // Удаляем все кнопки из контейнеров, сохраняя их
            var buttonsToKeep = [];
            targetContainer.children().each(function() {
                if (allButtons.includes(this)) {
                    $(this).detach();
                } else {
                    // Оставляем кнопки, которые не были найдены в allButtons
                    buttonsToKeep.push(this);
                }
            });
            
            // Очищаем контейнер
            targetContainer.empty();
            
            // Добавляем кнопки в порядке категорий
            buttonSortOrder.forEach(function(category) {
                categories[category].forEach(function(button) {
                    targetContainer.append(button);
                });
            });
            
            // Добавляем обратно любые кнопки, которые были вне категории allButtons
            buttonsToKeep.forEach(function(button) {
                targetContainer.append(button);
            });
            
            // Включаем обратно контроллер
            if (needToggle) {
                Lampa.Controller.toggle(activeControllerName);
            }
        }
        
        // 1. Модификация Lampa.FullCard.build (для новых версий Lampa)
        if (Lampa.FullCard && Lampa.FullCard.build) {
            var originFullCard = Lampa.FullCard.build;
            
            Lampa.FullCard.build = function(data) {
                var card = originFullCard(data);
                
                card.organizeButtons = function() {
                    if (InterFaceMod.settings.show_buttons) {
                         // Увеличили задержку для избежания конфликтов
                        setTimeout(function() {
                             organizeButtons(card.activity.render());
                        }, 250); // Увеличено до 250ms
                    }
                };
                
                // Используем onRender, чтобы гарантировать наличие всех элементов
                card.onRender = card.organizeButtons;
                
                return card;
            };
        }
        
        // 2. Listener для совместимости (для старых версий Lampa)
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' && e.object && e.object.activity && InterFaceMod.settings.show_buttons) {
                // Увеличили задержку для избежания конфликтов
                setTimeout(function() {
                    organizeButtons(e.object.activity.render());
                }, 300); // Увеличено до 300ms
            }
        });
        
        // 3. MutationObserver для отслеживания динамически добавляемых кнопок (универсальный)
        var buttonObserver = new MutationObserver(function(mutations) {
            if (!InterFaceMod.settings.show_buttons) return;
            
            let needReorganize = false;
            
            mutations.forEach(function(mutation) {
                // Проверяем, чи були додані елементи в один із контейнерів кнопок
                if (mutation.type === 'childList' && 
                    (mutation.target.classList.contains('full-start-new__buttons') || 
                     mutation.target.classList.contains('full-start__buttons') ||
                     mutation.target.classList.contains('buttons-container'))) {
                    needReorganize = true;
                }
            });
            
            if (needReorganize) {
                // Маленька затримка для завершення операцій додавання іншими плагінами
                setTimeout(function() {
                    if (Lampa.Activity.active() && Lampa.Activity.active().activity) {
                        organizeButtons(Lampa.Activity.active().activity.render());
                    }
                }, 100); 
            }
        });
        
        // Спостерігаємо за тілом документа
        buttonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * @fileoverview Функционал применения тем оформления.
     */
    function applyTheme(theme) {
        // Удаляем предыдущие стили темы
        $('#interface_mod_theme').remove();

        // Если выбрано "Нет" или плагин отключен, выходим
        if (theme === 'default') {
            return;
        }

        // ... [Стили тем остаются без изменений, они были корректными] ...
        // Создаем новый стиль
        const style = $('<style id="interface_mod_theme"></style>');

        const themes = {
            neon: `
                body { background: linear-gradient(135deg, #0d0221 0%, #150734 50%, #1f0c47 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #ff00ff, #00ffff);
                    color: #fff; box-shadow: 0 0 20px rgba(255, 0, 255, 0.4); text-shadow: 0 0 10px rgba(255, 255, 255, 0.5); border: none;
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #ff00ff; box-shadow: 0 0 20px #00ffff;
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #ff00ff, #00ffff); box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
                }
                .full-start__background { opacity: 0.7; filter: brightness(1.2) saturate(1.3); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(15, 2, 33, 0.95); border: 1px solid rgba(255, 0, 255, 0.1);
                }
            `,
            dark_night: `
                body { background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #8a2387, #e94057, #f27121);
                    color: #fff; box-shadow: 0 0 30px rgba(233, 64, 87, 0.3); animation: night-pulse 2s infinite;
                }
                @keyframes night-pulse {
                    0% { box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(242, 113, 33, 0.3); }
                    100% { box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); }
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #e94057; box-shadow: 0 0 30px rgba(242, 113, 33, 0.5);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #8a2387, #f27121); animation: night-pulse 2s infinite;
                }
                .full-start__background { opacity: 0.8; filter: saturate(1.3) contrast(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(10, 10, 10, 0.95); border: 1px solid rgba(233, 64, 87, 0.1); box-shadow: 0 0 30px rgba(242, 113, 33, 0.1);
                }
            `,
            blue_cosmos: `
                body { background: linear-gradient(135deg, #0b365c 0%, #144d80 50%, #0c2a4d 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #12c2e9, #c471ed, #f64f59);
                    color: #fff; box-shadow: 0 0 30px rgba(18, 194, 233, 0.3); animation: cosmos-pulse 2s infinite;
                }
                @keyframes cosmos-pulse {
                    0% { box-shadow: 0 0 20px rgba(18, 194, 233, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(196, 113, 237, 0.3); }
                    100% { box-shadow: 0 0 20px rgba(246, 79, 89, 0.3); }
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #12c2e9; box-shadow: 0 0 30px rgba(196, 113, 237, 0.5);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #12c2e9, #f64f59); animation: cosmos-pulse 2s infinite;
                }
                .full-start__background { opacity: 0.8; filter: saturate(1.3) contrast(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(11, 54, 92, 0.95); border: 1px solid rgba(18, 194, 233, 0.1); box-shadow: 0 0 30px rgba(196, 113, 237, 0.1);
                }
            `,
            sunset: `
                body { background: linear-gradient(135deg, #2d1f3d 0%, #614385 50%, #516395 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #ff6e7f, #bfe9ff);
                    color: #2d1f3d; box-shadow: 0 0 15px rgba(255, 110, 127, 0.3); font-weight: bold;
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #ff6e7f; box-shadow: 0 0 15px rgba(255, 110, 127, 0.5);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #ff6e7f, #bfe9ff); color: #2d1f3d;
                }
                .full-start__background { opacity: 0.8; filter: saturate(1.2) contrast(1.1); }
            `,
            emerald: `
                body { background: linear-gradient(135deg, #1a2a3a 0%, #2C5364 50%, #203A43 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #43cea2, #185a9d);
                    color: #fff; box-shadow: 0 4px 15px rgba(67, 206, 162, 0.3); border-radius: 5px;
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 3px solid #43cea2; box-shadow: 0 0 20px rgba(67, 206, 162, 0.4);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #43cea2, #185a9d);
                }
                .full-start__background { opacity: 0.85; filter: brightness(1.1) saturate(1.2); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(26, 42, 58, 0.98); border: 1px solid rgba(67, 206, 162, 0.1);
                }
            `,
            aurora: `
                body { background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #aa4b6b, #6b6b83, #3b8d99);
                    color: #fff; box-shadow: 0 0 20px rgba(170, 75, 107, 0.3); transform: scale(1.02); transition: all 0.3s ease;
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #aa4b6b; box-shadow: 0 0 25px rgba(170, 75, 107, 0.5);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #aa4b6b, #3b8d99); transform: scale(1.05);
                }
                .full-start__background { opacity: 0.75; filter: contrast(1.1) brightness(1.1); }
            `,
            bywolf_mod: `
                body { background: linear-gradient(135deg, #090227 0%, #170b34 50%, #261447 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #fc00ff, #00dbde);
                    color: #fff; box-shadow: 0 0 30px rgba(252, 0, 255, 0.3); animation: cosmic-pulse 2s infinite;
                }
                @keyframes cosmic-pulse {
                    0% { box-shadow: 0 0 20px rgba(252, 0, 255, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(0, 219, 222, 0.3); }
                    100% { box-shadow: 0 0 20px rgba(252, 0, 255, 0.3); }
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #fc00ff; box-shadow: 0 0 30px rgba(0, 219, 222, 0.5);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #fc00ff, #00dbde); animation: cosmic-pulse 2s infinite;
                }
                .full-start__background { opacity: 0.8; filter: saturate(1.3) contrast(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(9, 2, 39, 0.95); border: 1px solid rgba(252, 0, 255, 0.1); box-shadow: 0 0 30px rgba(0, 219, 222, 0.1);
                }
            `
        };

        // Устанавливаем стили для выбранной темы
        style.html(themes[theme] || '');
        
        // Добавляем стиль в head
        $('head').append(style);
    }
    
    /**
     * @fileoverview Главная функция запуска плагина
     */
    function startPlugin() {
        // Загрузка настроек
        InterFaceMod.settings.show_buttons = Lampa.Storage.get('show_buttons', true);
        InterFaceMod.settings.theme = Lampa.Storage.get('theme_select', 'default');
        
        // **!!! КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: ПРИМЕНЯЕМ ТЕМУ ПЕРВЫМ !!!**
        // Это гарантирует, что стили темы будут применены до того, как пользователь увидит интерфейс
        applyTheme(InterFaceMod.settings.theme); 
        
         // 1. Регистрация компонента настроек
        Lampa.SettingsApi.addComponent({
            component: 'interface_mod_lite',
            name: 'Интерфейс мод LITE',
            icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7C20 7.55228 19.5523 8 19 8H5C4.44772 8 4 7.55228 4 7V5Z" fill="currentColor"/><path d="M4 11C4 10.4477 4.44772 10 5 10H19C19.5523 10 20 10.4477 20 11V13C20 13.5523 19.5523 14 19 14H5C4.44772 14 4 13.5523 4 13V11Z" fill="currentColor"/><path d="M4 17C4 16.4477 4.44772 16 5 16H19C19.5523 16 20 16.4477 20 17V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V17Z" fill="currentColor"/></svg>'
        });
        
        // 2. Параметр: Показывать все кнопки
        Lampa.SettingsApi.addParam({
            component: 'interface_mod_lite',
            param: {
                name: 'show_buttons',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Показывать все кнопки',
                description: 'Отображать все кнопки действий в карточке, сортируя их по типу: Онлайн, Торрент, Трейлер'
            },
            onChange: function (value) {
                InterFaceMod.settings.show_buttons = value;
                Lampa.Settings.update();
                // Повторная организация кнопок при изменении настройки
                if (Lampa.Activity.active() && Lampa.Activity.active().name === 'full') {
                     setTimeout(function() {
                        if (Lampa.Activity.active().activity && Lampa.Activity.active().activity.render) {
                            organizeButtons(Lampa.Activity.active().activity.render());
                        }
                     }, 350); // Увеличили задержку
                }
            }
        });
        
        // 3. Параметр: Тема интерфейса
        Lampa.SettingsApi.addParam({
            component: 'interface_mod_lite',
            param: {
                name: 'theme_select',
                type: 'select',
                values: {
                    default: 'Нет',
                    bywolf_mod: 'Bywolf_mod (Неоновая)',
                    dark_night: 'Dark Night bywolf (Градієнт)',
                    blue_cosmos: 'Blue Cosmos (Космічний)',
                    neon: 'Neon (Классический)',
                    sunset: 'Dark MOD (М\'який)',
                    emerald: 'Emerald V1 (Смарагдовый)',
                    aurora: 'Aurora (Північне сяйво)'
                },
                default: 'default'
            },
            field: {
                name: 'Тема интерфейса',
                description: 'Выберите тему оформления интерфейса'
            },
            onChange: function(value) {
                InterFaceMod.settings.theme = value;
                Lampa.Settings.update();
                applyTheme(value);
            }
        });
        
        // Запускаем функцию отображения и сортировки кнопок
        showAllButtons();
        
        // Перемещаем наш компонент в настройках
        Lampa.Settings.listener.follow('open', function (e) {
            setTimeout(function() {
                var interfaceMod = $('.settings-folder[data-component="interface_mod_lite"]');
                var interfaceStandard = $('.settings-folder[data-component="interface"]');
                
                if (interfaceMod.length && interfaceStandard.length) {
                    interfaceMod.insertAfter(interfaceStandard);
                }
            }, 100);
        });
    }

    // Усиленный запуск плагина
    function bootPlugin() {
        if (typeof Lampa === 'undefined' || typeof Lampa.Manifest === 'undefined') {
            // Если Lampa не готова, ждем 50мс и пробуем еще раз
            setTimeout(bootPlugin, 50);
            return;
        }

        if (window.appready) {
            startPlugin();
        } else {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') {
                    startPlugin();
                }
            });
        }
    }
    
    bootPlugin(); // Запускаем усиленную загрузку

    // Регистрация плагина в манифесте
    Lampa.Manifest.plugins.interface_mod_lite = {
        name: 'Интерфейс мод LITE',
        version: '2.2.2',
        description: 'Улучшенный интерфейс для приложения Lampa (только темы и кнопки)'
    };
    
    // Экспортируем объект плагина
    window.interface_mod_lite = InterFaceMod;
})();
