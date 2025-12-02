(function() {  
    'use strict';  
      
    // Інформація про плагін  
    var plugin_info = {  
        name: 'FoxStudio Interface',  
        version: '1.0.0',  
        author: 'FoxStudio24'  
    };  
      
    // Налаштування за замовчуванням  
    var default_settings = {  
        foxstudio_interface_enabled: true,  
        necardify_enabled: false,  
        logo_enabled: false  
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
      
    // Функція створення швидкого налаштування  
    function createQuickSetting(key, titleKey, defaultValue, scriptUrl) {  
        var setting = $('<div class="settings-param selector" data-type="toggle" data-name="' + key + '">');  
        setting.append('<div class="settings-param__name">' + Lampa.Lang.translate(titleKey) + '</div>');  
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
        // Додаємо переклади  
        Lampa.Lang.add({  
            foxstudio_interface_title: {  
                ru: 'Новый интерфейс для тв и пк',  
                en: 'New interface for TV and PC',  
                uk: 'Новий інтерфейс для тв та пк'  
            },  
            foxstudio_necardify_title: {  
                ru: 'Necardify плагин',  
                en: 'Necardify plugin',  
                uk: 'Necardify плагін'  
            },  
            foxstudio_logo_title: {  
                ru: 'Logo плагин',  
                en: 'Logo plugin',  
                uk: 'Logo плагін'  
            }  
        });  
          
        // Додаємо візуальні налаштування в головне меню  
        Lampa.Settings.listener.follow('open', function(e) {  
            if (e.name === 'main') {  
                // Створюємо окрему групу для візуальних налаштувань  
                var visual_group = $('<div class="settings-param selector" style="pointer-events: none; opacity: 0.7;">');  
                visual_group.append('<div class="settings-param__name">🎨 Візуальні налаштування</div>');  
                e.body.append(visual_group);  
                  
                // Додаємо налаштування лого  
                var logo_setting = createQuickSetting('logo_enabled', 'foxstudio_logo_title', false, 'https://foxstudio24.github.io/lampa/logo.js');  
                e.body.append(logo_setting);  
                  
                // Додаємо налаштування necardify  
                var necardify_setting = createQuickSetting('necardify_enabled', 'foxstudio_necardify_title', false, 'https://foxstudio24.github.io/lampa/necardify.js');  
                e.body.append(necardify_setting);  
            }  
              
            // Залишаємо основне налаштування інтерфейсу у вкладці interface  
            if (e.name === 'interface') {  
                // Основне налаштування інтерфейсу  
                var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');  
                foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');  
                foxstudio_interface.append('<div class="settings-param__value"></div>');  
                  
                e.body.append(foxstudio_interface);  
                  
                // Обробник зміни налаштування  
                foxstudio_interface.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('foxstudio_interface_enabled', true);  
                    Lampa.Storage.set('foxstudio_interface_enabled', !current);  
                      
                    // Оновлюємо відображення  
                    foxstudio_interface.find('.settings-param__value').text(  
                        Lampa.Storage.get('foxstudio_interface_enabled', true) ? 'Вкл' : 'Выкл'  
                    );  
                });  
                  
                // Встановлюємо початкове значення  
                foxstudio_interface.find('.settings-param__value').text(  
                    Lampa.Storage.get('foxstudio_interface_enabled', true) ? 'Вкл' : 'Выкл'  
                );  
            }  
        });  
          
        // Ініціалізація налаштувань за замовчуванням  
        Object.keys(default_settings).forEach(function(key) {  
            if (Lampa.Storage.get(key) === null) {  
                Lampa.Storage.set(key, default_settings[key]);  
            }  
        });  
          
        console.log('FoxStudio Interface Plugin завантажено');  
    }  
      
    // Запуск плагіну  
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', init);  
    }  
      
})();
