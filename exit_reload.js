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
            isMenuOpen: false,  
            isEnabled: false  
        },  
          
        icons: {  
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-4.24 4.24l-4.24 4.24m15.66-8.66l-6 0m-6 0l-6 0m15.66 8.66l-4.24-4.24m-4.24-4.24l-4.24-4.24"/></svg>',  
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
                console.log('[UTILITIES] Вихід з застосунку...');  
                  
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
                    if (typeof Android !== 'undefined' && Android.finish) {  
                        Android.finish();  
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
                  
                .utilities-button.selector {  
                    outline: none;  
                }  
                  
                .utilities-button.focus,  
                .utilities-button:focus {  
                    background: rgba(255, 255, 255, 0.1);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: 2px;  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                    color: #fff;  
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
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);  
                }  
                  
                .utilities-menu__item {  
                    display: flex;  
                    align-items: center;  
                    padding: 0.8em 1.2em;  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                    color: #fff;  
                }  
                  
                .utilities-menu__item.selector {  
                    outline: none;  
                }  
                  
                .utilities-menu__item.focus,  
                .utilities-menu__item:focus {  
                    background: rgba(255, 255, 255, 0.2);  
                    outline: 2px solid rgba(255, 255, 255, 0.8);  
                    outline-offset: -2px;  
                }  
                  
                .utilities-menu__item svg {  
                    width: 1.2em;  
                    height: 1.2em;  
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
            this.elements.button.addEventListener('click', function() {  
                self.toggleMenu();  
            });  
              
            // Обробник Enter для пульта  
            this.elements.button.addEventListener('keydown', function(e) {  
                if (e.keyCode === 13) { // Enter  
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
            this.elements.menu.style.display = 'none';  
              
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
                  
                // Обробник кліку мишею  
                menuItem.addEventListener('click', function() {  
                    self.closeMenu();  
                    setTimeout(function() {  
                        self.actions[item.action]();  
                    }, 100);  
                });  
                  
                // Обробник Enter для пульта  
                menuItem.addEventListener('keydown', function(e) {  
                    if (e.keyCode === 13) { // Enter  
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
              
            this.elements.menu.style.display = 'block';  
            this.state.isMenuOpen = true;  
              
            // Автоматичний фокус на першому пункті  
            var firstItem = this.elements.menu.querySelector('.utilities-menu__item');  
            if (firstItem) {  
                setTimeout(function() {  
                    firstItem.classList.add('focus');  
                    firstItem.focus();  
                }, 50);  
            }  
        },  
          
        closeMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.style.display = 'none';  
            this.state.isMenuOpen = false;  
              
            // Видалити фокус з пунктів меню  
            var items = this.elements.menu.querySelectorAll('.utilities-menu__item');  
            items.forEach(function(item) {  
                item.classList.remove('focus');  
            });  
              
            // Повернути фокус на кнопку  
            if (this.elements.button) {  
                this.elements.button.focus();  
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
              
            this.state.isEnabled = true;  
            console.log('[UTILITIES] Плагін успішно ініціалізовано');  
        },  
          
        destroy: function() {  
            if (this.elements.button && this.elements.button.parentNode) {  
                this.elements.button.parentNode.removeChild(this.elements.button);  
            }  
              
            var style = document.getElementById('utilities-button-styles');  
            if (style) style.remove();  
              
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
