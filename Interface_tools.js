(function() {  
    'use strict';  
  
    // Информация о плагине  
    var plugin_info = {  
        name: 'FoxStudio Interface',  
        version: '1.0.0',  
        author: 'FoxStudio24'  
    };  
  
    // Настройки по умолчанию  
    var default_settings = {  
        foxstudio_interface_enabled: true,  
        necardify_enabled: false,  
        logo_enabled: false  
    };  
  
    // Функция загрузки внешнего скрипта  
    function loadScript(url, callback) {  
        var script = document.createElement('script');  
        script.type = 'text/javascript';  
        script.src = url;  
        script.onload = callback;  
        script.onerror = function() {  
            console.error('Ошибка загрузки скрипта:', url);  
        };  
        document.head.appendChild(script);  
    }  
  
    // Функция инициализации плагина  
    function init() {  
        // Добавляем переводы  
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
  
        // Добавляем настройки в интерфейс  
        Lampa.Settings.listener.follow('open', function(e) {  
            // Проверяем, открываем ли нашу вкладку Interface tools  
            if (e.name === 'interface_tools') {  
                // Основная настройка интерфейса  
                var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');  
                foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');  
                foxstudio_interface.append('<div class="settings-param__value"></div>');  
                    
                // Настройка Necardify  
                var necardify_setting = $('<div class="settings-param selector" data-type="toggle" data-name="necardify_enabled">');  
                necardify_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_necardify_title') + '</div>');  
                necardify_setting.append('<div class="settings-param__value"></div>');  
  
                // Настройка Logo  
                var logo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="logo_enabled">');  
                logo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_logo_title') + '</div>');  
                logo_setting.append('<div class="settings-param__value"></div>');  
  
                // Добавляем элементы в вкладку Interface tools  
                e.body.append(foxstudio_interface);  
                e.body.append(necardify_setting);  
                e.body.append(logo_setting);  
  
                // Обработчики изменения настроек  
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
  
        // Функция обновления отображения настроек  
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
  
        // Инициализация настроек по умолчанию  
        Object.keys(default_settings).forEach(function(key) {  
            if (Lampa.Storage.get(key) === null) {  
                Lampa.Storage.set(key, default_settings[key]);  
            }  
        });  
  
        console.log('FoxStudio Interface Plugin загружен');  
    }  
  
    // Запуск плагина  
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', init);  
    }  
  
})();
