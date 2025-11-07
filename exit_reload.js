(function() {  
    'use strict';  
      
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined') {  
        console.error('[UTILITIES] Lampa не знайдено');  
        return;  
    }  
      
    // Перевірка на повторний запуск  
    if (window.plugin_utilities_ready) {  
        console.warn('[UTILITIES] Плагін вже запущено');  
        return;  
    }  
    window.plugin_utilities_ready = true;  
      
    var UtilitiesButton = {  
        elements: {  
            button: null,  
            menu: null  
        },  
          
        state: {  
            isMenuOpen: false  
        },  
          
        icons: {  
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>',  
            reload: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',  
            console: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',  
            exit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'  
        },  
          
        actions: {  
            reload: function() {  
                console.log('[UTILITIES] Перезагрузка...');  
                location.reload();  
            },  
              
            console: function() {  
                console.log('[UTILITIES] Відкриття консолі...');  
                if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
                    Lampa.Controller.toggle('console');  
                }  
            },  
              
            exit: function() {  
                console.log('[UTILITIES] Вихід...');  
                  
                // Спроба закрити через Lampa.Activity  
                if (Lampa.Activity && typeof Lampa.Activity.out === 'function') {  
                    Lampa.Activity.out();  
                }  
                  
                // Платформо-специфічні методи виходу  
                try {  
                    // Tizen (Samsung Smart TV)  
                    if (typeof tizen !== 'undefined' && tizen.application) {  
                        tizen.application.getCurrentApplication().exit();  
                        return;  
                    }  
                      
                    // WebOS (LG Smart TV)  
                    if (typeof webOS !== 'undefined' && webOS.platformBack) {  
                        webOS.platformBack();  
                        return;  
                    }  
                      
                    // Android WebView  
                    if (typeof Android !== 'undefined' && Android.exit) {  
                        Android.exit();  
                        return;  
                    }  
                      
                    // Orsay (старі Samsung TV)  
                    if (typeof window.NetCastBack !== 'undefined') {  
                        window.NetCastBack();  
                        return;  
                    }  
                      
                    // Fallback - закриття вікна  
                    window.close();  
                } catch (e) {  
                    console.error('[UTILITIES] Помилка виходу:', e);  
                }  
            }  
        },  
          
        addStyles: function() {  
            var style = document.createElement('style');  
            style.id = 'utilities-button-styles';  
            style.textContent = `  
                .utilities-button {  
                    position: relative;  
                    display: flex;  
                    align-items: center;  
                    justify-content: center;  
                    width: 3em;  
                    height: 3em;  
                    cursor: pointer;  
                    transition: all 0.3s ease;  
                    border-radius: 0.3em;  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                    fill: none;  
                    stroke: currentColor;  
                }  
                  
                .utilities-button:hover,  
                .utilities-button.focus,  
                .utilities-button:focus {  
                    background: rgba(255, 255, 255, 0.1);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: 2px;  
                }  
                  
                .utilities-menu {  
                    position: absolute;  
                    top: calc(100% + 0.5em);  
                    right: 0;  
                    background: rgba(0, 0, 0, 0.95);  
                    border: 1px solid rgba(255, 255, 255, 0.2);  
                    border-radius: 0.5em;  
                    padding: 0.5em;  
                    min-width: 12em;  
                    z-index: 10000;  
                    display: none;  
                }  
                  
                .utilities-menu.active {  
                    display: block;  
                }  
                  
                .utilities-menu__item {  
                    display: flex;  
                    align-items: center;  
                    padding: 0.8em 1em;  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                    border-radius: 0.3em;  
                    margin: 0.2em 0;  
                }  
                  
                .utilities-menu__item svg {  
                    width: 1.2em;  
                    height: 1.2em;  
                    margin-right: 0.8em;  
                    fill: none;  
                    stroke: currentColor;  
                }  
                  
                .utilities-menu__item:hover,  
                .utilities-menu__item.focus,  
                .utilities-menu__item:focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: -2px;  
                }  
            `;  
            document.head.appendChild(style);  
        },  
          
        createButton: function() {  
            var self = this;  
              
            // Створюємо кнопку  
            this.elements.button = document.createElement('div');  
            this.elements.button.className = 'head__action utilities-button selector';  
            this.elements.button.innerHTML = this.icons.utilities;  
            this.elements.button.setAttribute('tabindex', '0'); // КРИТИЧНО для фокусу  
              
            // Обробник кліку мишкою  
            this.elements.button.addEventListener('click', function(e) {  
                e.preventDefault();  
                e.stopPropagation();  
                self.toggleMenu();  
            });  
              
            // Обробник клавіатури для Enter/OK  
            this.elements.button.addEventListener('keydown', function(e) {  
                if (e.keyCode === 13) { // Enter  
                    e.preventDefault();  
                    e.stopPropagation();  
                    self.toggleMenu();  
                }  
            });  
              
            // Додаємо до верхньої панелі  
            var headActions = document.querySelector('.head__actions');  
            if (headActions) {  
                headActions.appendChild(this.elements.button);  
            }  
        },  
          
        createMenu: function() {  
            var self = this;  
              
            // Створюємо меню  
            this.elements.menu = document.createElement('div');  
            this.elements.menu.className = 'utilities-menu';  
              
            var menuItems = [  
                { action: 'reload', icon: this.icons.reload, text: 'Перезагрузка' },  
                { action: 'console', icon: this.icons.console, text: 'Консоль' },  
                { action: 'exit', icon: this.icons.exit, text: 'Вихід' }  
            ];  
              
            menuItems.forEach(function(item, index) {  
                var menuItem = document.createElement('div');  
                menuItem.className = 'utilities-menu__item selector';  
                menuItem.innerHTML = item.icon + '<span>' + item.text + '</span>';  
                menuItem.setAttribute('data-action', item.action);  
                menuItem.setAttribute('tabindex', '0'); // КРИТИЧНО для фокусу  
                  
                // Обробник кліку мишкою  
                menuItem.addEventListener('click', function(e) {  
                    e.preventDefault();  
                    e.stopPropagation();  
                    self.executeAction(item.action);  
                });  
                  
                // Обробник клавіатури для Enter/OK  
                menuItem.addEventListener('keydown', function(e) {  
                    if (e.keyCode === 13) { // Enter  
                        e.preventDefault();  
                        e.stopPropagation();  
                        self.executeAction(item.action);  
                    } else if (e.keyCode === 38) { // Up  
                        e.preventDefault();  
                        var prev = this.previousElementSibling;  
                        if (prev && prev.classList.contains('utilities-menu__item')) {  
                            prev.focus();  
                        }  
                    } else if (e.keyCode === 40) { // Down  
                        e.preventDefault();  
                        var next = this.nextElementSibling;  
                        if (next && next.classList.contains('utilities-menu__item')) {  
                            next.focus();  
                        }  
                    }  
                });  
                  
                self.elements.menu.appendChild(menuItem);  
            });  
              
            // Додаємо меню до кнопки  
            this.elements.button.appendChild(this.elements.menu);  
        },  
          
        toggleMenu: function() {  
            if (this.state.isMenuOpen) {  
                this.closeMenu();  
            } else {  
                this.openMenu();  
            }  
        },  
          
        openMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.classList.add('active');  
            this.state.isMenuOpen = true;  
              
            // Фокус на першому пункті меню  
            var firstItem = this.elements.menu.querySelector('.utilities-menu__item');  
            if (firstItem) {  
                setTimeout(function() {  
                    firstItem.focus();  
                }, 100);  
            }  
        },  
          
        closeMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.classList.remove('active');  
            this.state.isMenuOpen = false;  
              
            // Повертаємо фокус на кнопку  
            if (this.elements.button) {  
                this.elements.button.focus();  
            }  
        },  
          
        executeAction: function(action) {  
            this.closeMenu();  
              
            if (this.actions[action]) {  
                setTimeout(function() {  
                    this.actions[action]();  
                }.bind(this), 100);  
            }  
        },  
          
        bindEvents: function() {  
            var self = this;  
              
            // Обробка кнопки "Назад"  
            if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
                Lampa.Listener.follow('back', function() {  
                    if (self.state.isMenuOpen) {  
                        self.closeMenu();  
                        return false;  
                    }  
                });  
            }  
              
            // Закриття меню при кліку поза ним  
            document.addEventListener('click', function(e) {  
                if (self.state.isMenuOpen &&   
                    !self.elements.menu.contains(e.target) &&   
                    !self.elements.button.contains(e.target)) {  
                    self.closeMenu();  
                }  
            });  
        },  
          
        init: function() {  
            this.addStyles();  
            this.createButton();  
            this.createMenu();  
            this.bindEvents();  
              
            console.log('[UTILITIES] Плагін успішно ініціалізовано');  
        },  
          
        destroy: function() {  
            if (this.elements.button && this.elements.button.parentNode) {  
                this.elements.button.parentNode.removeChild(this.elements.button);  
            }  
              
            var style = document.getElementById('utilities-button-styles');  
            if (style) style.remove();  
        }  
    };  
      
    // Ініціалізація плагіна  
    function init() {  
        UtilitiesButton.init();  
    }  
      
    // Запуск плагіна  
    if (window.appready) {  
        init();  
    } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
        Lampa.Listener.follow('app', function(e) {  
            if (e.type === 'ready') {  
                init();  
            }  
        });  
    } else {  
        setTimeout(init, 1000);  
    }  
      
})();
