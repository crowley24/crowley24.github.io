(function() {  
    'use strict';  
      
    function waitForLampa(callback) {  
        if (window.Lampa && Lampa.Storage && Lampa.Lang && Lampa.Activity) {  
            callback();  
        } else {  
            setTimeout(function() { waitForLampa(callback); }, 100);  
        }  
    }  
      
    waitForLampa(function() {  
        if (window.action_menu_plugin) return;  
        window.action_menu_plugin = true;  
          
        // Локалізація  
        Lampa.Lang.add({  
            action_menu: {  
                en: 'Actions',  
                uk: 'Дії',  
                ru: 'Действия'  
            },  
            reload_button: {  
                en: 'Reload',  
                uk: 'Перезавантаження',
                ru: 'Перезагрузка'  
            },  
            console_button: {  
                en: 'Console',  
                uk: 'Консоль',  
                ru: 'Консоль'  
            },  
            exit_button: {  
                en: 'Exit',  
                uk: 'Вихід',  
                ru: 'Выход'  
            },  
            exit_confirm_title: {  
                en: 'Exit Application',  
                uk: 'Вихід з застосунку',  
                ru: 'Выход из приложения'  
            },  
            exit_confirm_message: {  
                en: 'Are you sure you want to exit?',  
                uk: 'Ви впевнені, що хочете вийти?',  
                ru: 'Вы уверены, что хотите выйти?'  
            },  
            exit_confirm_yes: {  
                en: 'Yes',  
                uk: 'Так',  
                ru: 'Да'  
            },  
            exit_confirm_no: {  
                en: 'No',  
                uk: 'Ні',  
                ru: 'Нет'  
            },  
            exit_manual_instruction: {  
                en: 'Please close the app manually via Smart TV menu',  
                uk: 'Закрийте застосунок вручну через меню Smart TV',  
                ru: 'Закройте приложение вручную через меню Smart TV'  
            }  
        });  
          
        // Функція перезавантаження  
        function doReload() {  
            window.location.reload();  
        }  
          
        // Функція відкриття консолі  
        function doConsole() {  
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
                Lampa.Controller.toggle('console');  
            }  
        }  
          
        // Функція виходу з підтвердженням  
        function doExit() {  
            if (Lampa.Select) {  
                Lampa.Select.show({  
                    title: Lampa.Lang.translate('exit_confirm_title'),  
                    items: [  
                        {  
                            title: Lampa.Lang.translate('exit_confirm_yes'),  
                            value: 'yes'  
                        },  
                        {  
                            title: Lampa.Lang.translate('exit_confirm_no'),  
                            value: 'no'  
                        }  
                    ],  
                    onSelect: function(item) {  
                        if (item.value === 'yes') {  
                            performExit();  
                        }  
                    },  
                    onBack: function() {}  
                });  
            } else {  
                performExit();  
            }  
        }  
          
        function performExit() {  
            try {  
                if (Lampa.Activity && typeof Lampa.Activity.out === 'function') {  
                    Lampa.Activity.out();  
                }  
            } catch(e) {}  
              
            setTimeout(function() {  
                var platform = Lampa.Platform ? Lampa.Platform.get() : null;  
                  
                if (window.tizen) {  
                    try {  
                        tizen.application.getCurrentApplication().exit();  
                        return;  
                    } catch(e) {}  
                }  
                  
                if (window.webOS) {  
                    try {  
                        webOS.platformBack();  
                        return;  
                    } catch(e) {}  
                }  
                  
                if (window.Android) {  
                    try {  
                        Android.exit();  
                        return;  
                    } catch(e) {}  
                }  
                  
                if (typeof NetCastBack === 'function') {  
                    try {  
                        NetCastBack();  
                        return;  
                    } catch(e) {}  
                }  
                  
                try {  
                    window.close();  
                } catch(e) {}  
                  
                if (Lampa.Noty) {  
                    Lampa.Noty.show(Lampa.Lang.translate('exit_manual_instruction') || 'Закрийте застосунок вручну через меню Smart TV');  
                }  
            }, 100);  
        }  
          
        // ====== ЗМІНЕНА ФУНКЦІЯ: Створення меню (ВСТАВЛЯЄТЬСЯ У КНОПКУ) ======
        function createMenu() {  
            var menu = document.createElement('div');  
            menu.className = 'action-menu';  
            // Змінено позиціонування: тепер відносне до батьківської кнопки
            menu.style.cssText = 'display: none; position: absolute; top: 100%; right: 0; background: rgba(0, 0, 0, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.3em; padding: 0.5em 0; min-width: 200px; z-index: 10000; margin-top: 0.5em;';  
              
            var items = [  
                { text: Lampa.Lang.translate('reload_button'), action: doReload },  
                { text: Lampa.Lang.translate('console_button'), action: doConsole },  
                { text: Lampa.Lang.translate('exit_button'), action: doExit }  
            ];  
              
            items.forEach(function(item) {  
                var menuItem = document.createElement('div');  
                menuItem.className = 'action-menu__item selector';  
                menuItem.setAttribute('tabindex', '0');  
                menuItem.textContent = item.text;  
                menuItem.style.cssText = 'padding: 0.8em 1.2em; cursor: pointer; transition: background 0.2s; white-space: nowrap;';  
                  
                menuItem.addEventListener('mouseenter', function() {  
                    this.style.background = 'rgba(255, 255, 255, 0.1)';  
                });  
                  
                menuItem.addEventListener('mouseleave', function() {  
                    this.style.background = 'transparent';  
                });  
                  
                menuItem.addEventListener('click', function() {  
                    closeMenu(menu);  
                    setTimeout(item.action, 100);  
                });  
                  
                menuItem.addEventListener('keydown', function(e) {  
                    if (e.keyCode === 13) {  
                        e.preventDefault();  
                        e.stopPropagation();  
                        closeMenu(menu);  
                        setTimeout(item.action, 100);  
                    } else if (e.keyCode === 40) { // Arrow Down
                        e.preventDefault();
                        var next = this.nextElementSibling;
                        if (next) next.focus();
                    } else if (e.keyCode === 38) { // Arrow Up
                        e.preventDefault();
                        var prev = this.previousElementSibling;
                        if (prev) prev.focus();
                    }
                });  
                  
                menu.appendChild(menuItem);  
            });  
            
            // Меню більше не додається до document.body
            return menu;
        }  
          
        // ====== ЗМІНЕНА ФУНКЦІЯ: Створення кнопки меню ======
        function createActionButton() {  
            var button = document.createElement('div');  
            button.className = 'head__action selector action-menu-button';
            // Додаємо position:relative, щоб меню всередині позиціонувалося коректно
            button.style.position = 'relative'; 
            button.setAttribute('tabindex', '0');  
            // Змінено іконку: використовуємо іконку, більш схожу на "Меню дій" (більш універсальна)
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';  
              
            var menu = createMenu();  
            button.appendChild(menu); // <<<<< ВСТАВКА МЕНЮ В СЕРЕДИНУ КНОПКИ
              
            button.addEventListener('click', function(e) {  
                e.stopPropagation();
                toggleMenu(menu);  
            });  
              
            // Обробка натискання Enter/Select на пульті
            button.addEventListener('keydown', function(e) {  
                if (e.keyCode === 13) {  
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu(menu);  
                }
            });  
              
            if (Lampa.Listener) {  
                Lampa.Listener.follow('back', function() {  
                    if (menu && menu.style.display === 'block') {  
                        closeMenu(menu);  
                        return false; // Запобігаємо стандартній дії "Назад"
                    }
                });  
            }  
              
            return button;  
        }  
          
        // Відкриття/закриття меню  
        function toggleMenu(menu) {  
            if (menu.style.display === 'block') {  
                closeMenu(menu);  
            } else {  
                openMenu(menu);  
            }  
        }  
          
        function openMenu(menu) {  
            menu.style.display = 'block';  
            var firstItem = menu.querySelector('.action-menu__item');  
            if (firstItem) {  
                // НАЙВАЖЛИВІШЕ: одразу переводимо фокус на перший елемент меню
                setTimeout(function() {  
                    firstItem.focus();  
                }, 50);  
            }  
        }  
          
        function closeMenu(menu) {  
            menu.style.display = 'none';  
            // Повертаємо фокус на кнопку після закриття
            var button = menu.closest('.action-menu-button'); 
            if(button) button.focus();
        }  
          
        // Вставка кнопки в header (Логіка, яка працює)
        function insertButton() {  
            var header = document.querySelector('.head');  
            if (!header) {  
                setTimeout(insertButton, 100);  
                return;  
            }  
              
            // Знаходимо контейнер дій, який працює в Lampa
            var actions = header.querySelector('.head__actions');
            if (actions) {  
                // Перевіряємо, чи кнопка вже існує, щоб не дублювати
                if(actions.querySelector('.action-menu-button')) return;
                
                var button = createActionButton();  
                // Вставляємо на початок, щоб вона була серед перших кнопок
                actions.prepend(button); 
                // Після вставки може знадобитися фокус
                button.focus(); 
            }
        }  
          
        // Ініціалізація  
        if (Lampa.Listener) {  
            Lampa.Listener.follow('app', function(e) {  
                if (e.type === 'ready') {  
                    insertButton();  
                }  
            });
            // Додаємо прослуховування для оновлення DOM, якщо щось було пропущено
             Lampa.Listener.follow('full', function(e) {  
                if (e.type === 'render') {  
                    setTimeout(insertButton, 200);
                }  
            });
        } else {  
            setTimeout(insertButton, 1000);  
        }  
    });  
})();

