(function() {  
    'use strict';  
      
    // Перевірка версії Lampa  
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
            isMenuOpen: false,  
            isEnabled: false,  
            lastToggleAt: 0  
        },  
          
        icons: {  
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="currentColor"><path d="m0,12.402,35.687-4.8602,0.0156,34.423-35.67,0.20313zm35.67,33.529,0.0277,34.453-35.67-4.9041-0.002-29.78zm4.3261-39.025,47.318-6.906,0,41.527-47.318,0.37565zm47.329,39.349-0.0111,41.34-47.318-6.6784-0.0663-34.672z"/></svg>',  
            reload: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',  
            console: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',  
            exit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'  
        },  
          
        actions: {  
            reload: function() {  
                location.reload();  
            },  
              
            console: function() {  
                if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
                    Lampa.Controller.toggle('console');  
                }  
            },  
              
            exit: function() {  
                if (Lampa.Activity && typeof Lampa.Activity.out === 'function') {  
                    Lampa.Activity.out();  
                }  
                  
                // Платформо-специфічні методи виходу  
                try {  
                    if (typeof tizen !== 'undefined' && tizen.application) {  
                        tizen.application.getCurrentApplication().exit();  
                    } else if (typeof webOS !== 'undefined' && webOS.platformBack) {  
                        webOS.platformBack();  
                    } else if (typeof Android !== 'undefined' && Android.exit) {  
                        Android.exit();  
                    } else if (typeof window.orsay !== 'undefined') {  
                        window.orsay.exit();  
                    }  
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
                    cursor: pointer;  
                    display: flex;  
                    align-items: center;  
                    justify-content: center;  
                    width: 2.5em;  
                    height: 2.5em;  
                    transition: all 0.3s ease;  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                    fill: currentColor;  
                }  
                  
                .utilities-button:hover,  
                .utilities-button.focus {  
                    background: rgba(255, 255, 255, 0.2) !important;  
                    transform: scale(1.1);  
                }  
                  
                .utilities-button.focus {  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: 2px;  
                }  
                  
                .utilities-menu {  
                    position: absolute;  
                    top: 100%;  
                    right: 0;  
                    margin-top: 0.5em;  
                    background: rgba(0, 0, 0, 0.95);  
                    border: 1px solid rgba(255, 255, 255, 0.2);  
                    border-radius: 0.5em;  
                    padding: 0.5em 0;  
                    min-width: 12em;  
                    z-index: 10000;  
                    opacity: 0;  
                    transform: translateY(-10px);  
                    transition: all 0.3s ease;  
                    pointer-events: none;  
                }  
                  
                .utilities-menu.active {  
                    opacity: 1;  
                    transform: translateY(0);  
                    pointer-events: all;  
                }  
                  
                .utilities-menu__item {  
                    display: flex;  
                    align-items: center;  
                    padding: 0.8em 1.2em;  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                    color: rgba(255, 255, 255, 0.9);  
                }  
                  
                .utilities-menu__item:hover,  
                .utilities-menu__item.focus {  
                    background: rgba(255, 255, 255, 0.2);  
                }  
                  
                .utilities-menu__item.focus {  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: -2px;  
                }  
                  
                .utilities-menu__item svg {  
                    width: 1.2em;  
                    height: 1.2em;  
                    margin-right: 0.8em;  
                    stroke: currentColor;  
                }  
                  
                .utilities-menu__item span {  
                    font-size: 0.9em;  
                }  
            `;  
            document.head.appendChild(style);  
        },  
          
        createButton: function() {  
            var self = this;  
              
            this.elements.button = document.createElement('div');  
            this.elements.button.className = 'head__action utilities-button selector';  
            this.elements.button.innerHTML = this.icons.utilities;  
            this.elements.button.setAttribute('tabindex', '0');  
              
            // Додаємо до панелі  
            var headActions = document.querySelector('.head__actions');  
            if (headActions) {  
                headActions.appendChild(this.elements.button);  
            }  
              
            // Реєструємо в Lampa.Controller для навігації пультом  
            if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                Lampa.Controller.add('utilities_button', {  
                    toggle: function() {  
                        self.toggleMenu();  
                    },  
                    back: function() {  
                        if (self.state.isMenuOpen) {  
                            self.closeMenu();  
                            return true;  
                        }  
                        return false;  
                    }  
                });  
            }  
        },  
          
        createMenu: function() {  
            var self = this;  
              
            this.elements.menu = document.createElement('div');  
            this.elements.menu.className = 'utilities-menu';  
              
            var items = [  
                { action: 'reload', icon: this.icons.reload, text: 'Перезагрузка' },  
                { action: 'console', icon: this.icons.console, text: 'Консоль' },  
                { action: 'exit', icon: this.icons.exit, text: 'Вихід' }  
            ];  
              
            items.forEach(function(item) {  
                var menuItem = document.createElement('div');  
                menuItem.className = 'utilities-menu__item selector';  
                menuItem.setAttribute('data-action', item.action);  
                menuItem.setAttribute('tabindex', '0');  
                menuItem.innerHTML = item.icon + '<span>' + item.text + '</span>';  
                self.elements.menu.appendChild(menuItem);  
            });  
              
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
              
            // Фокусуємо перший пункт меню  
            var firstItem = this.elements.menu.querySelector('.utilities-menu__item');  
            if (firstItem) {  
                firstItem.classList.add('focus');  
                if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                    Lampa.Controller.add('utilities_menu', {  
                        toggle: function() {  
                            var focusedItem = document.querySelector('.utilities-menu__item.focus');  
                            if (focusedItem) {  
                                var action = focusedItem.getAttribute('data-action');  
                                if (action && UtilitiesButton.actions[action]) {  
                                    UtilitiesButton.closeMenu();  
                                    setTimeout(function() {  
                                        UtilitiesButton.actions[action]();  
                                    }, 100);  
                                }  
                            }  
                        },  
                        down: function() {  
                            var items = Array.from(document.querySelectorAll('.utilities-menu__item'));  
                            var focusedIndex = items.findIndex(function(item) {  
                                return item.classList.contains('focus');  
                            });  
                            if (focusedIndex < items.length - 1) {  
                                items[focusedIndex].classList.remove('focus');  
                                items[focusedIndex + 1].classList.add('focus');  
                            }  
                        },  
                        up: function() {  
                            var items = Array.from(document.querySelectorAll('.utilities-menu__item'));  
                            var focusedIndex = items.findIndex(function(item) {  
                                return item.classList.contains('focus');  
                            });  
                            if (focusedIndex > 0) {  
                                items[focusedIndex].classList.remove('focus');  
                                items[focusedIndex - 1].classList.add('focus');  
                            }  
                        },  
                        back: function() {  
                            UtilitiesButton.closeMenu();  
                            return true;  
                        }  
                    });  
                }  
            }  
        },  
          
        closeMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.classList.remove('active');  
            this.state.isMenuOpen = false;  
              
            // Видаляємо фокус з пунктів меню  
            var items = this.elements.menu.querySelectorAll('.utilities-menu__item');  
            items.forEach(function(item) {  
                item.classList.remove('focus');  
            });  
              
            // Видаляємо контролер меню  
            if (Lampa.Controller && typeof Lampa.Controller.remove === 'function') {  
                Lampa.Controller.remove('utilities_menu');  
            }  
        },  
          
        bindEvents: function() {  
            var self = this;  
              
            // Клік на кнопку  
            if (this.elements.button) {  
                this.elements.button.addEventListener('click', function(e) {  
                    e.stopPropagation();  
                    self.toggleMenu();  
                });  
            }  
              
            // Клік на пункти меню  
            if (this.elements.menu) {  
                var items = this.elements.menu.querySelectorAll('.utilities-menu__item');  
                items.forEach(function(item) {  
                    item.addEventListener('click', function(e) {  
                        e.stopPropagation();  
                        var action = this.getAttribute('data-action');  
                        self.closeMenu();  
                        if (action && self.actions[action]) {  
                            setTimeout(function() {   
                                self.actions[action]();   
                            }, 100);  
                        }  
                    });  
                });  
            }  
              
            // Закриття меню при кліку поза ним  
            document.addEventListener('click', function(e) {  
                if (self.state.isMenuOpen &&   
                    !self.elements.button.contains(e.target) &&   
                    !self.elements.menu.contains(e.target)) {  
                    self.closeMenu();  
                }  
            });  
              
            // Обробка кнопки "Назад"  
            if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
                Lampa.Listener.follow('back', function() {  
                    if (self.state.isMenuOpen) {  
                        self.closeMenu();  
                        return false;  
                    }  
                });  
            }  
        },  
          
        init: function() {  
            this.addStyles();  
            this.createButton();  
            this.createMenu();  
            this.bindEvents();  
            this.state.isEnabled = true;  
            console.log('[UTILITIES] Плагін успішно ініціалізовано');  
        },  
          
        destroy: function() {  
            if (this.elements.button && this.elements.button.parentNode) {  
                this.elements.button.parentNode.removeChild(this.elements.button);  
            }  
            if (this.elements.menu && this.elements.menu.parentNode) {  
                this.elements.menu.parentNode.removeChild(this.elements.menu);  
            }  
              
            var style = document.getElementById('utilities-button-styles');  
            if (style) style.remove();  
              
            if (Lampa.Controller && typeof Lampa.Controller.remove === 'function') {  
                Lampa.Controller.remove('utilities_button');  
                Lampa.Controller.remove('utilities_menu');  
            }  
              
            this.state.isEnabled = false;  
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
