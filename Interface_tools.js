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
            },  
            interface_tools_title: {  
                ru: 'Interface tools',  
                en: 'Interface tools',  
                uk: 'Interface tools'  
            }  
        });  
  
        // Додаємо пункт меню для нашої вкладки  
        Lampa.Settings.listener.follow('open', function(e) {  
            // Додаємо наш пункт в головне меню налаштувань  
            if (e.name === 'main') {  
                var interface_tools_item = $('<div class="settings-param selector" data-name="interface_tools">');  
                interface_tools_item.append('<div class="settings-param__name">' + Lampa.Lang.translate('interface_tools_title') + '</div>');  
                interface_tools_item.append('<div class="settings-param__value">➤</div>');  
                e.body.append(interface_tools_item);  
                  
                interface_tools_item.on('hover:enter', function() {  
                    Lampa.Settings.open('interface_tools');  
                });  
            }  
              
            // Відображаємо налаштування у нашій вкладці  
            if (e.name === 'interface_tools') {  
                // Основне налаштування інтерфейсу  
                var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');  
                foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');  
                foxstudio_interface.append('<div class="settings-param__value"></div>');  
                    
                // Налаштування Necardify  
                var necardify_setting = $('<div class="settings-param selector" data-type="toggle" data-name="necardify_enabled">');  
                necardify_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_necardify_title') + '</div>');  
                necardify_setting.append('<div class="settings-param__value"></div>');  
  
                // Налаштування Logo  
                var logo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="logo_enabled">');  
                logo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_logo_title') + '</div>');  
                logo_setting.append('<div class="settings-param__value"></div>');  
  
                // Додаємо елементи у вкладку Interface tools  
                e.body.append(foxstudio_interface);  
                e.body.append(necardify_setting);  
                e.body.append(logo_setting);  
  
                // Обробники зміни налаштувань  
                foxstudio_interface.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('foxstudio_interface_enabled', true);  
                    Lampa.Storage.set('foxstudio_interface_enabled', !current);  
                    updateSettingsDisplay();  
                });  
  
                necardify_setting.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('necardify_enabled', false);  
                    var new_value = !current;  
                    Lampa.Storage.set('necardify_enabled', new_value);  
                      
                    if (new_value) {  
                        loadScript('https://foxstudio24.github.io/lampa/necardify.js');  
                    }  
                    updateSettingsDisplay();  
                });  
  
                logo_setting.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('logo_enabled', false);  
                    var new_value = !current;  
                    Lampa.Storage.set('logo_enabled', new_value);  
                      
                    if (new_value) {  
                        loadScript('https://foxstudio24.github.io/lampa/logo.js');  
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
            $('[data-name="necardify_enabled"] .settings-param__value').text(  
                Lampa.Storage.get('necardify_enabled', false) ? 'Вкл' : 'Выкл'  
            );  
            $('[data-name="logo_enabled"] .settings-param__value').text(  
                Lampa.Storage.get('logo_enabled', false) ? 'Вкл' : 'Выкл'  
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
