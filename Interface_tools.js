(function() {  
    'use strict';  
      
    var plugin_info = {  
        name: 'FoxStudio Interface',  
        version: '1.1.0',  
        author: 'FoxStudio24'  
    };  
      
    var default_settings = {  
        foxstudio_interface_enabled: true,  
        necardify_enabled: false,  
        logo_enabled: false  
    };  
      
    var loadedScripts = {};  
      
    function loadScript(url, callback) {  
        if (loadedScripts[url]) {  
            if (callback) callback();  
            return;  
        }  
          
        try {  
            var script = document.createElement('script');  
            script.type = 'text/javascript';  
            script.src = url;  
            script.onload = function() {  
                loadedScripts[url] = true;  
                if (callback) callback();  
            };  
            script.onerror = function() {  
                console.error('Помилка завантаження скрипту:', url);  
            };  
            document.head.appendChild(script);  
        } catch (e) {  
            console.error('Помилка створення скрипту:', e);  
        }  
    }  
      
    function createSetting(key, titleKey, defaultValue, scriptUrl) {  
        var setting = $('<div class="settings-param selector" data-type="toggle" data-name="' + key + '">');  
        setting.append('<div class="settings-param__name">' + Lampa.Lang.translate(titleKey) + '</div>');  
        setting.append('<div class="settings-param__value"></div>');  
          
        setting.on('hover:enter', function() {  
            var current = Lampa.Storage.get(key, defaultValue);  
            var newValue = !current;  
            Lampa.Storage.set(key, newValue);  
              
            if (newValue && scriptUrl) {  
                loadScript(scriptUrl);  
            }  
            updateSettingsDisplay();  
        });  
          
        return setting;  
    }  
      
    function updateSettingsDisplay() {  
        var settings = [  
            { key: 'foxstudio_interface_enabled', defaultValue: true },  
            { key: 'necardify_enabled', defaultValue: false },  
            { key: 'logo_enabled', defaultValue: false }  
        ];  
          
        settings.forEach(function(setting) {  
            var value = Lampa.Storage.get(setting.key, setting.defaultValue);  
            var element = $('[data-name="' + setting.key + '"] .settings-param__value');  
            if (element.length) {  
                element.text(value ? 'Вкл' : 'Выкл');  
            }  
        });  
    }  
      
    function init() {  
        try {  
            if (!window.Lampa || !Lampa.Settings || !Lampa.Lang || !Lampa.Storage) {  
                console.error('Lampa API не доступний');  
                return;  
            }  
              
            if (window.Lampa.Version) {  
                console.log('FoxStudio Interface Plugin запущено на Lampa версії:', window.Lampa.Version);  
            }  
              
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
              
            Lampa.Settings.listener.follow('open', function(e) {  
                if (e.name === 'interface') {  
                    var settings = [  
                        createSetting('foxstudio_interface_enabled', 'foxstudio_interface_title', true),  
                        createSetting('necardify_enabled', 'foxstudio_necardify_title', false, 'https://foxstudio24.github.io/lampa/necardify.js'),  
                        createSetting('logo_enabled', 'foxstudio_logo_title', false, 'https://foxstudio24.github.io/lampa/logo.js')  
                    ];  
                      
                    settings.forEach(function(setting) {  
                        e.body.append(setting);  
                    });  
                      
                    updateSettingsDisplay();  
                }  
            });  
              
            Object.keys(default_settings).forEach(function(key) {  
                if (Lampa.Storage.get(key) === null) {  
                    Lampa.Storage.set(key, default_settings[key]);  
                }  
            });  
              
            console.log('FoxStudio Interface Plugin v' + plugin_info.version + ' завантажено');  
        } catch (error) {  
            console.error('Помилка ініціалізації плагіна:', error);  
        }  
    }  
      
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', init);  
    }  
      
})();
