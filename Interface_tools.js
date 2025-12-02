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
        visual_enhancements_enabled: false  
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
      
    // Функція ініціалізації плагіну  
    function init() {  
        // Додаємо переклади  
        Lampa.Lang.add({  
            foxstudio_interface_title: {  
                ru: 'Новый интерфейс для тв и пк',  
                en: 'New interface for TV and PC',  
                uk: 'Новий інтерфейс для тв та пк'  
            },  
            visual_enhancements_title: {  
                ru: 'Визуальные улучшения',  
                en: 'Visual enhancements',  
                uk: 'Візуальні покращення'  
            }  
        });  
          
        // Додаємо налаштування в інтерфейс  
        Lampa.Settings.listener.follow('open', function(e) {  
            if (e.name === 'interface') {  
                // Основне налаштування інтерфейсу  
                var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');  
                foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');  
                foxstudio_interface.append('<div class="settings-param__value"></div>');  
                  
                // Об'єднане налаштування візуальних покращень  
                var visual_enhancements = $('<div class="settings-param selector" data-type="toggle" data-name="visual_enhancements_enabled">');  
                visual_enhancements.append('<div class="settings-param__name">🎨 ' + Lampa.Lang.translate('visual_enhancements_title') + '</div>');  
                visual_enhancements.append('<div class="settings-param__value"></div>');  
                  
                // Додаємо елементи  
                e.body.append(foxstudio_interface);  
                e.body.append(visual_enhancements);  
                  
                // Обробник основного налаштування  
                foxstudio_interface.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('foxstudio_interface_enabled', true);  
                    Lampa.Storage.set('foxstudio_interface_enabled', !current);  
                    updateSettingsDisplay();  
                });  
                  
                // Обробник візуальних покращень  
                visual_enhancements.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('visual_enhancements_enabled', false);  
                    var newValue = !current;  
                    Lampa.Storage.set('visual_enhancements_enabled', newValue);  
                      
                    // Синхронно вмикаємо/вимикаємо всі візуальні налаштування  
                    Lampa.Storage.set('logo_enabled', newValue);  
                    Lampa.Storage.set('necardify_enabled', newValue);  
                      
                    if (newValue) {  
                        // Завантажуємо обидва скрипти  
                        loadScript('https://foxstudio24.github.io/lampa/logo.js');  
                        loadScript('https://foxstudio24.github.io/lampa/necardify.js');  
                    }  
                      
                    updateSettingsDisplay();  
                });  
                  
                updateSettingsDisplay();  
            }  
        });  
          
        // Функція оновлення відображення налаштувань  
        function updateSettingsDisplay() {  
            $('[data-name="foxstudio_interface_enabled"] .settings-param__value').text(  
                Lampa.Storage.get('foxstudio_interface_enabled', true) ? 'Вкл' : 'Выкл'  
            );  
            $('[data-name="visual_enhancements_enabled"] .settings-param__value').text(  
                Lampa.Storage.get('visual_enhancements_enabled', false) ? 'Вкл' : 'Выкл'  
            );  
        }  
          
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
