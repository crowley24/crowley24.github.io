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
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',  
            reload: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',  
            console: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',  
            exit: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>'  
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
                    // Tizen (Samsung TV)  
                    if (typeof tizen !== 'undefined' && tizen.application) {  
                        tizen.application.getCurrentApplication().exit();  
                        return;  
                    }  
                      
                    // WebOS (LG TV)  
                    if (typeof webOS !== 'undefined' && webOS.platformBack) {  
                        webOS.platformBack();  
                        return;  
                    }  
                      
                    // Android TV  
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
                    display: flex;  
                    align-items: center;  
                    justify-content: center;  
                    width: 3em;  
                    height: 3em;  
                    cursor: pointer;  
                    transition: all 0.3s ease;  
                    background: rgba(255, 255, 255, 0.1);  
                    border-radius: 0.3em;  
                    margin-left: 0.5em;  
                }  
                  
                .utilities-button:hover,  
                .utilities-button.focus,  
                .utilities-button.selector.focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: 2px;  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                    fill: none;  
                    stroke: currentColor;  
                }  
                  
                .utilities-menu {  
                    position: fixed;  
                    top: 4em;  
                    right: 1em;  
                    background: rgba(0, 0, 0, 0.95);  
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
                  
                .utilities-menu__item:hover,  
                .utilities-menu__item.focus,  
                .utilities-menu__item.selector.focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: -2px;  
                }  
                  
                .utilities-menu__item svg {  
                    margin-right: 0.8em;  
                    flex-shrink: 0;  
                }  
                  
                .utilities-menu__item span {  
                    flex: 1;  
                }  
            `;  
            document.head.appendChild(style);  
        },  
          
        createButton: function() {  
            var self = this;  
              
            this.elements.button = document.createElement('div');  
            this.elements.button.className = 'utilities-button selector';  
            this.elements.button.innerHTML = this.icons.utilities;  
            this.elements.button.setAttribute('tabindex', '0');  
              
            // Обробник кліку мишею  
            this.elements.button.addEventListener('click', function(e) {  
                e.preventDefault();  
                e.stopPropagation();  
                self.toggleMenu();  
            });  
              
            // Обробник клавіатури для Enter  
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
              
            // Реєстрація в Lampa.Controller для навігації пультом  
            if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                Lampa.Controller.add('utilities_button', {  
                    toggle: function() {  
                        if (self.elements.button) {  
                            Lampa.Controller.collectionSet(self.elements.button);  
                            Lampa.Controller.collectionFocus(false, self.elements.button);  
                        }  
                    },  
                    enter: function() {  
                        // Викликаємо toggleMenu при натисканні OK на пульті  
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
              
            items.forEach(function(item, index) {  
                var menuItem = document.createElement('div');  
                menuItem.className = 'utilities-menu__item selector';  
                menuItem.setAttribute('data-action', item.action);  
                menuItem.setAttribute('tabindex', '0');  
                menuItem.innerHTML = item.icon + '<span>' + item.text + '</span>';  
                  
                // Обробник кліку мишею  
                menuItem.addEventListener('click', function(e) {  
                    e.preventDefault();  
                    e.stopPropagation();  
                    self.closeMenu();  
                    setTimeout(function() {  
                        self.actions[item.action]();  
                    }, 100);  
                });  
                  
                // Обробник клавіатури для Enter  
                menuItem.addEventListener('keydown', function(e) {  
                    if (e.keyCode === 13 || e.key === 'Enter') {  
                        e.preventDefault();  
                        e.stopPropagation();  
                        self.closeMenu();  
                        setTimeout(function() {  
                            self.actions[item.action]();  
                        }, 100);  
                    }  
                });  
                  
                self.elements.menu.appendChild(menuItem);  
            });  
              
            document.body.appendChild(this.elements.menu);  
              
            // Реєстрація меню в Lampa.Controller  
            if (Lampa.Controller && typeof Lampa.Controller.add === 'function') {  
                Lampa.Controller.add('utilities_menu', {  
                    toggle: function() {  
                        var items = self.elements.menu.querySelectorAll('.utilities-menu__item');  
                        if (items.length > 0) {  
                            Lampa.Controller.collectionSet(self.elements.menu);  
                            Lampa.Controller.collectionFocus(false, items[0]);  
                        }  
                    },  
                    up: function() {  
                        Lampa.Controller.move('up');  
                    },  
                    down: function() {  
                        Lampa.Controller.move('down');  
                    },  
                    back: function() {  
                        self.closeMenu();  
                        return false;  
                    }  
                });  
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
              
            // Активуємо контролер меню  
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
                setTimeout(function() {  
                    Lampa.Controller.toggle('utilities_menu');  
                }, 50);  
            }  
        },  
          
        closeMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.classList.remove('active');  
            this.state.isMenuOpen = false;  
              
            // Повертаємо фокус на кнопку  
            if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
                Lampa.Controller.toggle('utilities_button');  
            }  
        },  
          
        init: function() {  
            if (this.state.isEnabled) return;  
              
            this.addStyles();  
            this.createButton();  
            this.createMenu();  
              
            // Обробка кнопки "Назад" через Lampa.Listener  
            var self = this;  
            if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
                Lampa.Listener.follow('back', function() {  
                    if (self.state.isMenuOpen) {  
                        self.closeMenu();  
                        return false;  
                    }  
                });  
            }  
              
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
