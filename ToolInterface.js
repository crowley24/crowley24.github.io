(function() {  
    'use strict';  
      
    // Налаштування за замовчуванням  
    var default_settings = {  
        newlogo_enabled: false,  
        quality_enabled: false  
    };  
      
    // Функція завантаження зовнішнього скрипту  
    function loadScript(url) {  
        var script = document.createElement('script');  
        script.src = url;  
        document.head.appendChild(script);  
    }  
      
    // Функція ініціалізації плагіна  
    function init() {  
        // Додаємо переклади  
        Lampa.Lang.add({  
            foxstudio_title: {  
                ru: 'FoxStudio',  
                en: 'FoxStudio',  
                uk: 'FoxStudio'  
            },  
            newlogo_title: {  
                ru: 'NewLogo - логотипы фильмов',  
                en: 'NewLogo - movie logos',  
                uk: 'NewLogo - логотипи фільмів'  
            },  
            quality_title: {  
                ru: 'Quality - качество на постерах',  
                en: 'Quality - quality on posters',  
                uk: 'Quality - якість на постерах'  
            }  
        });  
          
        // Додаємо пункт меню та обробники  
        Lampa.Settings.listener.follow('open', function(e) {  
            if (e.name === 'main') {  
                // Створюємо пункт меню FoxStudio  
                var foxstudio_item = $('<div class="settings-param selector" data-name="foxstudio">');  
                foxstudio_item.append('<div class="settings-param__name">FoxStudio</div>');  
                foxstudio_item.append('<div class="settings-param__value">➤</div>');  
                  
                // Вставляємо після пункту "Інтерфейс"  
                var interface_item = e.body.find('[data-name="interface"]');  
                if (interface_item.length > 0) {  
                    interface_item.after(foxstudio_item);  
                } else {  
                    e.body.append(foxstudio_item);  
                }  
                  
                // Обробник кліку  
                foxstudio_item.on('hover:enter', function() {  
                    Lampa.Settings.open('foxstudio');  
                });  
            }  
              
            // Відображення налаштувань FoxStudio  
            if (e.name === 'foxstudio') {  
                // Налаштування NewLogo  
                var newlogo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="newlogo_enabled">');  
                newlogo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('newlogo_title') + '</div>');  
                newlogo_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('newlogo_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');  
                  
                // Налаштування Quality  
                var quality_setting = $('<div class="settings-param selector" data-type="toggle" data-name="quality_enabled">');  
                quality_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('quality_title') + '</div>');  
                quality_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('quality_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');  
                  
                e.body.append(newlogo_setting);  
                e.body.append(quality_setting);  
                  
                // Обробники зміни налаштувань  
                newlogo_setting.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('newlogo_enabled', false);  
                    var new_value = !current;  
                    Lampa.Storage.set('newlogo_enabled', new_value);  
                    $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');  
                      
                    if (new_value) {  
                        loadScript('https://crowley24.github.io/NewLogo.js');  
                    }  
                });  
                  
                quality_setting.on('hover:enter', function() {  
                    var current = Lampa.Storage.get('quality_enabled', false);  
                    var new_value = !current;  
                    Lampa.Storage.set('quality_enabled', new_value);  
                    $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');  
                      
                    if (new_value) {  
                        loadScript('https://tvigl.info/plugins/quality.js');  
                    }  
                });  
            }  
        });  
          
        // Ініціалізація налаштувань за замовчуванням  
        Object.keys(default_settings).forEach(function(key) {  
            if (Lampa.Storage.get(key) === null) {  
                Lampa.Storage.set(key, default_settings[key]);  
            }  
        });  
          
        // Автозавантаження увімкнених плагінів  
        if (Lampa.Storage.get('newlogo_enabled', false)) {  
            loadScript('https://crowley24.github.io/NewLogo.js');  
        }  
        if (Lampa.Storage.get('quality_enabled', false)) {  
            loadScript('https://tvigl.info/plugins/quality.js');  
        }  
          
        console.log('FoxStudio Plugin завантажено');  
    }  
      
    // Запуск плагіна  
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', init);  
    }  
})();
