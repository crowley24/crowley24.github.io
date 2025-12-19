(function() {
    'use strict';

    // Глобальний об'єкт для плагіна
    var InterFaceMod = {};

    // Налаштування за замовчуванням
    InterFaceMod.settings = Lampa.Storage.get('interface_mod_settings', {
        show_buttons: true // Включити/вимкнути модифікацію кнопок
    });

    /**
     * @function applyStyles
     * Додає CSS стилі для контейнерів кнопок.
     */
    function applyStyles() {
        var styleId = 'interface_mod_buttons_style';
        if (document.getElementById(styleId)) return;

        var buttonStyle = document.createElement('style');
        buttonStyle.id = styleId;
        buttonStyle.innerHTML = `
            /* Забезпечуємо гнучке відображення та перенесення кнопок */
            .full-start-new__buttons, .full-start__buttons, .buttons-container {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 10px !important;
                align-items: flex-start !important;
            }
            /* Забезпечуємо, щоб самі кнопки не займали всю ширину */
            .full-start__button {
                flex-grow: 0 !important;
            }
        `;
        document.head.appendChild(buttonStyle);
        console.log('InterfaceMod: CSS стилі застосовані.');
    }

    /**
     * @function organizeButtons
     * Основна функція для пошуку, сортування та реорганізації кнопок.
     * @param {object} activity - Об'єкт активності Lampa (наприклад, FullCard activity).
     */
    function organizeButtons(activity) {
        if (!activity || !InterFaceMod.settings.show_buttons) return;

        var element = activity.render();
        if (!element) return;

        // --- 1. Пошук контейнера ---
        var targetContainer = element.find('.full-start-new__buttons');
        if (!targetContainer.length) {
            targetContainer = element.find('.full-start__buttons');
        }
        if (!targetContainer.length) {
            targetContainer = element.find('.buttons-container');
        }
        if (!targetContainer.length) {
            return;
        }

        // --- 2. Пошук всіх кнопок ---
        var allButtons = [];
        // Включаємо селектори, які можуть знаходитися поза цільовим контейнером, але належать картці
        var buttonSelectors = [
            '.buttons--container .full-start__button',
            '.full-start-new__buttons .full-start__button',
            '.full-start__buttons .full-start__button',
            '.buttons-container .button',
            '.full-start-new__buttons .button',
            '.full-start__buttons .button',
            // Додатковий пошук кнопок у межах картки, які можуть бути у старих структурах
            '.full-start .full-start__button',
            '.full-start-new .full-start__button'
        ];
        
        // Збираємо унікальні кнопки
        var collectedButtons = new Set(); 

        buttonSelectors.forEach(function(selector) {
            element.find(selector).each(function() {
                // Додаємо лише кнопки, які ще не були додані
                if (!collectedButtons.has(this)) {
                     allButtons.push(this);
                     collectedButtons.add(this);
                }
            });
        });

        if (allButtons.length === 0) {
            return;
        }

        // --- 3. Сортування кнопок ---
        var categories = {
            online: [],
            torrent: [],
            trailer: [],
            other: []
        };
        var addedButtonTexts = {}; // Для відстеження дублікатів

        $(allButtons).each(function() {
            var button = this;
            var buttonText = $(button).text().trim();
            var className = button.className || '';

            // Пропускаємо дублікати та кнопки без тексту
            if (!buttonText || addedButtonTexts[buttonText]) return;
            addedButtonTexts[buttonText] = true;

            // Визначаємо категорію
            if (className.includes('online')) {
                categories.online.push(button);
            } else if (className.includes('torrent')) {
                categories.torrent.push(button);
            } else if (className.includes('trailer')) {
                categories.trailer.push(button);
            } else {
                categories.other.push(button);
            }
        });

        var buttonSortOrder = ['online', 'torrent', 'trailer', 'other'];

        // --- 4. Реорганізація ---
        var needToggle = Lampa.Controller.enabled() && Lampa.Controller.enabled().name === 'full_start';
        if (needToggle) Lampa.Controller.toggle('settings_component');

        // Видаляємо всі поточні дочірні елементи контейнера
        targetContainer.empty();

        // Додаємо кнопки у відсортованому порядку
        buttonSortOrder.forEach(function(category) {
            categories[category].forEach(function(button) {
                targetContainer.append(button);
            });
        });

        // Вмикаємо контролер назад
        if (needToggle) {
            setTimeout(function() {
                Lampa.Controller.toggle('full_start');
            }, 100);
        }
        console.log('InterfaceMod: Кнопки реорганізовано. Знайдено:', allButtons.length);
    }

    /**
     * @function FullCard_hook
     * Перехоплює та модифікує функцію Lampa.FullCard.build.
     */
    function FullCard_hook() {
        if (!Lampa.FullCard) return;

        var originFullCardBuild = Lampa.FullCard.build;

        Lampa.FullCard.build = function(data) {
            var card = originFullCardBuild(data);

            // Додаємо функцію організації до об'єкту карточки
            card.organizeButtons = function() {
                organizeButtons(card.activity);
            };

            // Викликаємо організацію кнопок при готовності карточки
            card.onCreate = function() {
                if (InterFaceMod.settings.show_buttons) {
                    setTimeout(function() {
                        card.organizeButtons();
                    }, 300);
                }
            };

            return card;
        };
    }

    /**
     * @function Listener_hook
     * Використовує Lampa.Listener для сумісності з іншими версіями/компонентами.
     */
    function Listener_hook() {
        Lampa.Listener.follow('full', function(e) {
            // Запускаємо реорганізацію після повного завантаження картки
            if (e.type === 'complite' && e.object && e.object.activity) {
                if (InterFaceMod.settings.show_buttons && !Lampa.FullCard) {
                    setTimeout(function() {
                        organizeButtons(e.object.activity);
                    }, 300);
                }
            }
        });
    }

    /**
     * @function MutationObserver_setup
     * Налаштовує MutationObserver для відстеження динамічно доданих кнопок.
     */
    function MutationObserver_setup() {
        var buttonObserver = new MutationObserver(function(mutations) {
            if (!InterFaceMod.settings.show_buttons) return;

            let needReorganize = false;

            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    // Перевіряємо, чи зміни відбулися в контейнерах кнопок
                    if (mutation.target.classList &&
                        (mutation.target.classList.contains('full-start-new__buttons') ||
                         mutation.target.classList.contains('full-start__buttons') ||
                         mutation.target.classList.contains('buttons-container'))) {
                        needReorganize = true;
                    }
                    // Перевіряємо, чи була додана сама кнопка в будь-який батьківський елемент
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && (
                            node.classList && (node.classList.contains('full-start__button') || node.classList.contains('button'))
                        )) {
                            // Переконаємося, що це відбувається в контексті FullCard
                            if (Lampa.Activity.active() && Lampa.Activity.active().name === 'full') {
                                needReorganize = true;
                            }
                        }
                    });
                }
            });

            if (needReorganize) {
                setTimeout(function() {
                    if (Lampa.Activity.active() && Lampa.Activity.active().name === 'full') {
                        var cardActivity = Lampa.Activity.active().activity;

                        if (cardActivity.card && typeof cardActivity.card.organizeButtons === 'function') {
                            cardActivity.card.organizeButtons();
                        } else {
                            // Резервний варіант
                            organizeButtons(cardActivity);
                        }
                    }
                }, 100);
            }
        });

        buttonObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('InterfaceMod: MutationObserver активовано.');
    }

    /**
     * @function addSettings
     * Додає меню налаштувань плагіна.
     */
    function addSettings() {
        if (!Lampa.Settings || Lampa.Settings.get().some(s => s.id === 'interface_mod')) {
            // Налаштування вже додані
            return;
        }

        var sett = Lampa.Settings.get();

        // Створюємо нову секцію "Інтерфейс+"
        var new_settings = [{
            title: 'Інтерфейс+',
            id: 'interface_mod',
            component: 'button',
            on: function() {
                Lampa.Base.scheme(function(scheme) {
                    scheme.navigation = {
                        title: 'Інтерфейс+',
                        menu: [
                            {
                                title: 'Показувати всі кнопки в картці',
                                subtitle: 'Організовує кнопки (онлайн, торент, трейлер) в один гнучкий рядок.',
                                type: 'toggle',
                                value: InterFaceMod.settings.show_buttons,
                                onChange: function(value) {
                                    InterFaceMod.settings.show_buttons = value;
                                    Lampa.Storage.set('interface_mod_settings', InterFaceMod.settings);
                                    Lampa.Settings.update();
                                    
                                    // Одразу застосовуємо або видаляємо стилі
                                    if (value) {
                                        applyStyles();
                                    } else {
                                        var styleEl = document.getElementById('interface_mod_buttons_style');
                                        if (styleEl) styleEl.remove();
                                    }
                                    Lampa.Noty.show('Зміни налаштувань застосуються після перезапуску картки.');
                                }
                            }
                        ]
                    };
                    Lampa.Base.update(scheme);
                });
            },
            // Іконка шестерні для налаштувань
            icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M12 6A6 6 0 0 0 6 12A6 6 0 0 0 12 18A6 6 0 0 0 18 12A6 6 0 0 0 12 6M12 8A4 4 0 0 1 16 12A4 4 0 0 1 12 16A4 4 0 0 1 8 12A4 4 0 0 1 12 8Z" /></svg>'
        }];

        // Додаємо нову секцію перед секцією "Інше" або в кінець
        var otherIndex = sett.findIndex(s => s.id === 'other');
        if (otherIndex !== -1) {
            sett.splice(otherIndex, 0, new_settings[0]);
        } else {
            sett.push(new_settings[0]);
        }

        Lampa.Settings.set(sett);
        console.log('InterfaceMod: Меню налаштувань "Інтерфейс+" додано.');
    }

    /**
     * @function init
     * Ініціалізація плагіна
     */
    function init() {
        console.log('InterfaceMod: Плагін ініціалізується.');

        // --- ВАЖЛИВЕ ВИПРАВЛЕННЯ: Спроба додати налаштування одразу
        if (window.Lampa && Lampa.Settings) {
             addSettings();
        }

        // Запуск логіки модифікації
        if (InterFaceMod.settings.show_buttons) {
            applyStyles();
            FullCard_hook();
            Listener_hook();
            MutationObserver_setup();
        }

        // Додаємо налаштування через слухач як резервний варіант (якщо Lampa.Settings не був доступний одразу)
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                addSettings();
            }
        });
    }

    // Запускаємо ініціалізацію після завантаження Lampa
    if (window.Lampa) {
        init();
    } else {
        document.addEventListener('lampa', init);
    }

})();

