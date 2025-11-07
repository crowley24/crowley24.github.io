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
            utilities: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="currentColor"><path d="m0,12.402,35.687-4.8602,0.0156,34.423-35.67,0.20313zm35.67,33.529,0.0277,34.453-35.67-4.9041-0.002-29.78zm4.3261-39.025,47.318-6.906,0,41.527-47.318,0.37565zm47.329,39.349-0.0111,41.34-47.318-6.6784-0.0663-34.739z"/></svg>',  
            reload: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',  
            console: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>',  
            exit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'  
        },  
          
        templates: {  
            button: function() {  
                return '<div class="head__action utilities-button" title="Утиліти">' +   
                       UtilitiesButton.icons.utilities +   
                       '</div>';  
            },  
              
            menu: function() {  
                return '<div class="utilities-menu" style="display: none;">' +  
                       '<div class="utilities-menu__item" data-action="reload">' +  
                       UtilitiesButton.icons.reload +  
                       '<span>Перезагрузка</span>' +  
                       '</div>' +  
                       '<div class="utilities-menu__item" data-action="console">' +  
                       UtilitiesButton.icons.console +  
                       '<span>Консоль</span>' +  
                       '</div>' +  
                       '<div class="utilities-menu__item" data-action="exit">' +  
                       UtilitiesButton.icons.exit +  
                       '<span>Вихід</span>' +  
                       '</div>' +  
                       '</div>';  
            }  
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
                  
                // Спочатку викликаємо Lampa.Activity.out()  
                if (Lampa.Activity && typeof Lampa.Activity.out === 'function') {  
                    Lampa.Activity.out();  
                }  
                  
                // Платформо-специфічні методи виходу  
                try {  
                    // Tizen (Samsung)  
                    if (typeof tizen !== 'undefined' && tizen.application) {  
                        tizen.application.getCurrentApplication().exit();  
                    }  
                    // WebOS (LG)  
                    else if (typeof webOS !== 'undefined' && webOS.platformBack) {  
                        webOS.platformBack();  
                    }  
                    // Android  
                    else if (typeof Android !== 'undefined' && Android.exit) {  
                        Android.exit();  
                    }  
                    // Orsay (старі Samsung)  
                    else if (typeof window.NetCastBack !== 'undefined') {  
                        window.NetCastBack();  
                    }  
                } catch (e) {  
                    console.error('[UTILITIES] Помилка виходу:', e);  
                }  
            }  
        },  
          
        init: function() {  
            if (this.state.isEnabled) {  
                console.warn('[UTILITIES] Вже ініціалізовано');  
                return;  
            }  
              
            this.addStyles();  
            this.createButton();  
            this.createMenu();  
            this.bindEvents();  
              
            this.state.isEnabled = true;  
            console.log('[UTILITIES] Плагін успішно ініціалізовано');  
        },  
          
        addStyles: function() {  
            var style = document.createElement('style');  
            style.id = 'utilities-button-styles';  
            style.textContent = `  
                .utilities-button {  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                }  
                  
                .utilities-button:hover,  
                .utilities-button.focus {  
                    background: rgba(255, 255, 255, 0.1) !important;  
                }  
                  
                .utilities-button svg {  
                    width: 1.5em;  
                    height: 1.5em;  
                }  
                  
                .utilities-menu {  
                    position: absolute;  
                    top: 100%;  
                    right: 0;  
                    margin-top: 0.5em;  
                    background: rgba(20, 20, 20, 0.95);  
                    border: 1px solid rgba(255, 255, 255, 0.1);  
                    border-radius: 0.5em;  
                    padding: 0.5em 0;  
                    min-width: 200px;  
                    z-index: 10000;  
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);  
                }  
                  
                .utilities-menu__item {  
                    display: flex;  
                    align-items: center;  
                    gap: 0.8em;  
                    padding: 0.8em 1.2em;  
                    cursor: pointer;  
                    transition: all 0.2s ease;  
                    color: rgba(255, 255, 255, 0.8);  
                }  
                  
                .utilities-menu__item:hover,  
                .utilities-menu__item.focus {  
                    background: rgba(255, 255, 255, 0.1);  
                    color: rgba(255, 255, 255, 1);  
                }  
                  
                .utilities-menu__item svg {  
                    width: 1.2em;  
                    height: 1.2em;  
                    flex-shrink: 0;  
                }  
                  
                .utilities-menu__item span {  
                    flex: 1;  
                }  
            `;  
            document.head.appendChild(style);  
        },  
          
        createButton: function() {  
            var headActions = document.querySelector('.head__actions');  
            if (!headActions) {  
                console.error('[UTILITIES] .head__actions не знайдено');  
                return;  
            }  
              
            this.elements.button = $(this.templates.button())[0];  
            headActions.appendChild(this.elements.button);  
        },  
          
        createMenu: function() {  
            this.elements.menu = $(this.templates.menu())[0];  
            document.body.appendChild(this.elements.menu);  
        },  
          
        toggleMenu: function() {  
            var now = Date.now();  
            if (now - this.state.lastToggleAt < 200) return;  
            this.state.lastToggleAt = now;  
              
            if (this.state.isMenuOpen) {  
                this.closeMenu();  
            } else {  
                this.openMenu();  
            }  
        },  
          
        openMenu: function() {  
            if (!this.elements.menu || !this.elements.button) return;  
              
            var buttonRect = this.elements.button.getBoundingClientRect();  
            this.elements.menu.style.top = (buttonRect.bottom + 8) + 'px';  
            this.elements.menu.style.right = (window.innerWidth - buttonRect.right) + 'px';  
            this.elements.menu.style.display = 'block';  
              
            this.state.isMenuOpen = true;  
        },  
          
        closeMenu: function() {  
            if (!this.elements.menu) return;  
              
            this.elements.menu.style.display = 'none';  
            this.state.isMenuOpen = false;  
        },  
          
        bindEvents: function() {  
            var self = this;  
              
            // Клік на кнопку  
            if (this.elements.button) {  
                $(this.elements.button).on('click', function(e) {  
                    e.preventDefault();  
                    e.stopPropagation();  
                    self.toggleMenu();  
                    return false;  
                });  
            }  
              
            // Клік на пункти меню  
            if (this.elements.menu) {  
                $(this.elements.menu).find('.utilities-menu__item').on('click', function(e) {  
                    e.preventDefault();  
                    e.stopPropagation();  
                      
                    var action = $(this).data('action');  
                    self.closeMenu();  
                      
                    if (action && self.actions[action]) {  
                        setTimeout(function() {   
                            self.actions[action]();   
                        }, 100);  
                    }  
                    return false;  
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
          
        destroy: function() {  
            if (this.elements.button && this.elements.button.parentNode) {  
                this.elements.button.parentNode.removeChild(this.elements.button);  
            }  
            if (this.elements.menu && this.elements.menu.parentNode) {  
                this.elements.menu.parentNode.removeChild(this.elements.menu);  
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
