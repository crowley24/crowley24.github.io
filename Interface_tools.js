(function() {  
    'use strict';  
      
    // Інформація про плагін  
    var plugin_info = {  
        name: 'Plugin Manager',  
        version: '1.0.0',  
        author: 'Your Name'  
    };  
      
    // Налаштування за замовчуванням  
    var default_settings = {  
        logo_plugin_enabled: false,  
        quality_plugin_enabled: false  
    };  
      
    // Ваші посилання на плагіни  
    var plugin_urls = {  
        logo: 'https://your-url.com/logo-plugin.js',    // замініть на ваше посилання  
        quality: 'https://your-url.com/quality-plugin.js' // замініть на ваше посилання  
    };  
      
    // Функція завантаження зовнішнього скрипту  
    function loadScript(url, callback) {  
        var script = document.createElement('script');  
        script.type = 'text/javascript';  
        script.src = url;  
        script.onload = callback;  
        script.onerror = function() {  
            console.error('Помилка завантаження скрипту:', url);  
        };  
        document.head.appendChild(script);  
    }  
      
    // Функція створення елемента налаштування  
    function createPluginSetting(key, title, defaultValue, scriptUrl) {  
        var setting = $('<div class="settings-param selector" data-type="toggle" data-name="' + key + '">');  
        setting.append('<div class="settings-param__name">' + title + '</div>');  
        setting.append('<div class="settings-param__value"></div>');  
          
        setting.on('hover:enter', function() {  
            var newValue = !Lampa.Storage.get(key, defaultValue);  
            Lampa.Storage.set(key, newValue);  
              
            if (newValue && scriptUrl) {  
                loadScript(scriptUrl);  
            }  
              
            setting.find('.settings-param__value').text(newValue ? 'Вкл' : 'Выкл');  
        });  
          
        // Встановлюємо початкове значення  
        var currentValue = Lampa.Storage.get(key, defaultValue);  
        setting.find('.settings-param__value').text(currentValue ? 'Вкл' : 'Выкл');  
          
        return setting;  
    }  
      
    // Функція ініціалізації плагіну  
    function init() {  
        try {  
            // Перевірка доступності Lampa  
            if (!window.Lampa || !Lampa.Settings || !Lampa.Lang || !Lampa.Storage) {  
                console.error('Lampa API не доступний');  
                return;  
            }  
              
            // Додаємо переклади  
            Lampa.Lang.add({  
                plugin_manager_title: {  
                    ru: 'Менеджер плагинов',  
                    uk: 'Менеджер плагінів',  
                    en: 'Plugin Manager'  
                },  
                logo_plugin_title: {  
                    ru: 'Логотипы фильмов',  
                    uk: 'Логотипи фільмів',  
                    en: 'Movie Logos'  
                },  
                quality_plugin_title: {  
                    ru: 'Качество на постерах',  
                    uk: 'Якість на постерах',  
                    en: 'Quality on Posters'  
                }  
            });  
              
            // Додаємо пункт меню в головні налаштування  
            Lampa.Settings.listener.follow('open', function(e) {  
                if (e.name === 'main') {  
                    // Створюємо пункт меню для нашого менеджера плагінів  
                    var plugin_manager_item = $('<div class="settings-param selector" data-name="plugin_manager">');  
                    plugin_manager_item.append('<div class="settings-param__name">' + Lampa.Lang.translate('plugin_manager_title') + '</div>');  
                    plugin_manager_item.append('<div class="settings-param__value">➤</div>');  
                      
                    // Вставляємо пункт в меню  
                    e.body.append(plugin_manager_item);  
                      
                    // Обробник кліку для відкриття нашого підменю  
                    plugin_manager_item.on('hover:enter', function() {  
                        Lampa.Settings.open('plugin_manager');  
                    });  
                }  
                  
                // Відображаємо налаштування у вкладці менеджера плагінів  
                if (e.name === 'plugin_manager') {  
                    // Додаємо налаштування плагіна логотипів  
                    var logo_setting = createPluginSetting(  
                        'logo_plugin_enabled',   
                        Lampa.Lang.translate('logo_plugin_title'),   
                        false,   
                        plugin_urls.logo  
                    );  
                    e.body.append(logo_setting);  
                      
                    // Додаємо налаштування плагіна якості  
                    var quality_setting = createPluginSetting(  
                        'quality_plugin_enabled',   
                        Lampa.Lang.translate('quality_plugin_title'),   
                        false,   
                        plugin_urls.quality  
                    );  
                    e.body.append(quality_setting);  
                }  
            });  
              
            // Ініціалізація налаштувань за замовчуванням  
            Object.keys(default_settings).forEach(function(key) {  
                if (Lampa.Storage.get(key) === null) {  
                    Lampa.Storage.set(key, default_settings[key]);  
                }  
            });  
              
            console.log('Plugin Manager завантажено');  
        } catch (error) {  
            console.error('Помилка ініціалізації плагіна:', error);  
        }  
    }  
      
    // Запуск плагіну  
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', init);  
    }  
      
})();
