(function() {  
    'use strict';  
      
    // Чекаємо на повне завантаження Lampa  
    function waitForLampa() {  
        if (typeof window.Lampa !== 'undefined' && window.Lampa.Settings) {  
            initPlugin();  
        } else {  
            setTimeout(waitForLampa, 100);  
        }  
    }  
      
    function initPlugin() {  
        try {  
            // Додаємо переклади  
            if (window.Lampa.Lang) {  
                Lampa.Lang.add({  
                    interface_tools_title: {  
                        ru: 'Interface tools',  
                        uk: 'Interface tools',  
                        en: 'Interface tools'  
                    },  
                    foxstudio_interface_title: {  
                        ru: 'Новый интерфейс',  
                        uk: 'Новий інтерфейс',  
                        en: 'New interface'  
                    }  
                });  
            }  
              
            // Створюємо пункт меню  
            Lampa.Settings.listener.follow('open', function(e) {  
                if (e.name === 'main') {  
                    var item = $('<div class="settings-param selector">');  
                    item.append('<div class="settings-param__name">Interface tools</div>');  
                    item.append('<div class="settings-param__value">➤</div>');  
                      
                    item.on('hover:enter', function() {  
                        Lampa.Settings.openSubmenu({  
                            title: 'Interface tools',  
                            component: 'interface_tools',  
                            onBack: function() {  
                                Lampa.Settings.open();  
                            }  
                        });  
                    });  
                      
                    e.body.append(item);  
                }  
                  
                if (e.name === 'interface_tools') {  
                    // Налаштування  
                    var settings = [  
                        {  
                            key: 'foxstudio_interface_enabled',  
                            title: 'Новий інтерфейс',  
                            default: true  
                        },  
                        {  
                            key: 'necardify_enabled',   
                            title: 'Necardify',  
                            default: false,  
                            script: 'https://foxstudio24.github.io/lampa/necardify.js'  
                        },  
                        {  
                            key: 'logo_enabled',  
                            title: 'Logo',  
                            default: false,  
                            script: 'https://foxstudio24.github.io/lampa/logo.js'  
                        }  
                    ];  
                      
                    settings.forEach(function(setting) {  
                        var elem = $('<div class="settings-param selector" data-type="toggle">');  
                        elem.append('<div class="settings-param__name">' + setting.title + '</div>');  
                        elem.append('<div class="settings-param__value"></div>');  
                          
                        var currentValue = Lampa.Storage.get(setting.key, setting.default);  
                        elem.find('.settings-param__value').text(currentValue ? 'Вкл' : 'Выкл');  
                          
                        elem.on('hover:enter', function() {  
                            var newValue = !Lampa.Storage.get(setting.key, setting.default);  
                            Lampa.Storage.set(setting.key, newValue);  
                            elem.find('.settings-param__value').text(newValue ? 'Вкл' : 'Выкл');  
                              
                            if (newValue && setting.script) {  
                                var script = document.createElement('script');  
                                script.src = setting.script;  
                                document.head.appendChild(script);  
                            }  
                        });  
                          
                        e.body.append(elem);  
                    });  
                }  
            });  
              
            console.log('FoxStudio Interface Plugin завантажено');  
        } catch (error) {  
            console.error('Помилка плагіна:', error);  
        }  
    }  
      
    // Запускаємо  
    if (document.readyState === 'loading') {  
        document.addEventListener('DOMContentLoaded', waitForLampa);  
    } else {  
        waitForLampa();  
    }  
})();
