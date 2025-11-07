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
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="currentColor"><path d="M0,12.402,35.687,7.23,72.75,0,58.6,12.032,46.537,22.75,44.2,24.07,1.591,23.119,0,12.402ZM.525,27.1,43.792,28.1,16.812,50.525,7.907,42.025.525,27.1ZM52.93,6.945l-4.15,3.88L77.512,65.488l9.012,1.065L52.93,6.945ZM89.806,72.032,80.65,71.03,66.556,83.588,62.268,78.05l-2.74,2.56L73.787,95.2,89.806,72.032Z"/></svg>',  
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
                    } else if (typeof window.PalmSystem !== 'undefined') {  
                        window.PalmSystem.platformBack();  
                    } else if (typeof Common !== 'undefined' && Common.API && Common.API.Widget) {  
                        Common.API.Widget.sendExitEvent();  
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
                    display: flex;  
                    align-items: center;  
                    justify-content: center;  
                    width: 2.5em;  
                    height: 2.5em;  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                    border-radius: 0.3em;  
                    background: rgba(255, 255, 255, 0.1);  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                    fill: currentColor;  
                }  
                  
                .utilities-button:hover,  
                .utilities-button.focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: 2px;  
                }  
                  
                .utilities-menu {  
                    position: absolute;  
                    top: 100%;  
                    right: 0;  
                    margin-top: 0.5em;  
                    background: rgba(20, 20, 20, 0.95);  
                    border: 1px solid rgba(255, 255, 255, 0.2);  
                    border-radius: 0.5em;  
                    padding: 0.5em;  
                    min-width: 200px;  
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
                    stroke: currentColor;  
                }  
                  
                .utilities-menu__item:hover,  
                .utilities-menu__item.focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: -2px;  
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
              
            // Обробник кліку для миші  
            this.elements.button.addEventListener('click', function() {  
                self.toggleMenu();  
            });  
              
            // Обробник keydown для Enter (OK на пульті)  
            this.elements.button.addEventListener('keydown', function(e) {  
                if (e.keyCode === 13 || e.key === 'Enter') {  
                    e.preventDefault();  
                    e.stopPropagation();  
                    self.toggleMenu();  
                }  
            });  
              
            var headActions = document.querySelector('.head__actions');  
            if (headActions) {  
                headActions.appendChild(this.elements.button);  
            }  
        },  
          
        createMenu: function() {  
            var self = this;  
              
            this.elements.menu = document.createElement('div');  
            this.elements.menu.className = 'utilities-menu';  
              
            var menuItems = [  
                { action: 'reload', icon: this.icons.reload, text: 'Перезагрузка' },  
                { action: 'console', icon: this.icons.console, text: 'Консоль' },  
                { action: 'exit', icon: this.icons.exit, text: 'Вихід' }  
            ];  
              
            menuItems.forEach(function(item) {  
                var menuItem = document.createElement('div');  
                menuItem.className = 'utilities-menu__item selector';  
                menuItem.setAttribute('data-action', item.action);  
                menuItem.setAttribute('tabindex', '0');  
                menuItem.innerHTML = item.icon + '<span>' + item.text + '</span>';  
                  
                // Обробник кліку для миші  
                menuItem.addEventListener('click', function(e) {  
                    e.stopPropagation();  
                    self.closeMenu();  
                    if (self.actions[item.action]) {  
                        setTimeout(function() {   
                            self.actions[item.action]();   
                        }, 100);  
                    }  
                });  
                  
                // Обробник keydown для Enter (OK на пульті)  
                menuItem.addEventListener('keydown', function(e) {  
                    if (e.keyCode === 13 || e.key === 'Enter') {  
                        e.preventDefault();  
                        e.stopPropagation();  
                        self.closeMenu();  
                        if (self.actions[item.action]) {  
                            setTimeout(function() {   
                                self.actions[item.action]();   
                            }, 100);  
                        }  
                    }  
                });  
                  
                self.elements.menu.appendChild(menuItem);  
            });  
              
            if (this.elements.button && this.elements.button.parentNode) {  
                this.elements.button.parentNode.style.position = 'relative';  
                this.elements.button.parentNode.appendChild(this.elements.menu);  
            }  
        },  
          
        toggleMenu: function() {  
            var now = Date.now();  
            if (now - this.state.lastToggleAt < 300) return;  
            this.state.lastToggleAt = now;  
              
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
                }, 50);  
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
          
        bindEvents: function() {  
            var self = this;  
              
            // Закриття меню при кліку поза ним  
            document.addEventListener('click', function(e) {  
                if (self.state.isMenuOpen &&   
                    !self.elements.menu.contains(e.target) &&   
                    !self.elements.button.contains(e.target)) {  
                    self.closeMenu();  
                }  
            });  
              
            // Інтеграція з Lampa.Controller для кнопки  
            if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                Lampa.Controller.add('utilities_button', {  
                    toggle: function() {  
                        if (self.elements.button) {  
                            $(self.elements.button).toggleClass('focus');  
                        }  
                    },  
                    enter: function() {  
                        // Цей метод викликається при натисканні OK на пульті  
                        self.toggleMenu();  
                    },  
                    back: function() {  
                        if (self.state.isMenuOpen) {  
                            self.closeMenu();  
                            return false;  
                        }  
                    }  
                });  
            }  
              
            // Інтеграція з Lampa.Controller для меню  
            if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                Lampa.Controller.add('utilities_menu', {  
                    toggle: function() {  
                        var items = self.elements.menu.querySelectorAll('.utilities-menu__item');  
                        items.forEach(function(item) {  
                            $(item).removeClass('focus');  
                        });  
                          
                        var focused = document.activeElement;  
                        if (focused && focused.classList.contains('utilities-menu__item')) {  
                            $(focused).addClass('focus');  
                        }  
                    },  
                    enter: function() {  
                        var focused = document.activeElement;  
                        if (focused && focused.classList.contains('utilities-menu__item')) {  
                            var action = focused.getAttribute('data-action');  
                            self.closeMenu();  
                            if (action && self.actions[action]) {  
                                setTimeout(function() {   
                                    self.actions[action]();   
                                }, 100);  
                            }  
                        }  
                    },  
                    back: function() {  
                        if (self.state.isMenuOpen) {  
                            self.closeMenu();  
                            return false;  
                        }  
                    }  
                });  
            }  
              
            // Обробка кнопки "Назад"  
            if (window.Lampa && window.Lampa.Listener) {  
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
