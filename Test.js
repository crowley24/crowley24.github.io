(function () {  
    'use strict';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined' || !Lampa.Utils) {  
        setTimeout(arguments.callee, 100);  
        return;  
    }  
  
    console.log('[Crowley Manager] Starting plugin...');  
  
    // Список плагінів для керування  
    const PLUGINS = [  
        {  
            name: 'NewLogo',  
            url: 'https://crowley24.github.io/NewLogo.js',  
            key: 'newlogo_enabled',  
            title: 'NewLogo - Логотипи замість назв'  
        },  
        {  
            name: 'MobStyle',  
            url: 'https://crowley24.github.io/mob_style.js',  
            key: 'mobstyle_enabled',  
            title: 'MobStyle - Мобільний стиль'  
        }  
    ];  
  
    // Функція завантаження увімкнених плагінів  
    function loadEnabledPlugins() {  
        console.log('[Crowley Manager] Loading enabled plugins...');  
        PLUGINS.forEach(plugin => {  
            const isEnabled = Lampa.Storage.get(plugin.key, true);  
            console.log(`[Crowley Manager] ${plugin.name}: ${isEnabled ? 'enabled' : 'disabled'}`);  
            if (isEnabled) {  
                Lampa.Utils.putScriptAsync([plugin.url], function() {  
                    console.log(`[Crowley Manager] ${plugin.name} loaded`);  
                });  
            }  
        });  
    }  
  
    // Створення інтерфейсу налаштувань  
    function createSettings() {  
        console.log('[Crowley Manager] Creating settings interface...');  
        let html = $('<div></div>');  
          
        // Заголовок  
        html.append('<div class="settings__title">Плагіни Crowley24</div>');  
          
        // Перемикачі для кожного плагіна  
        PLUGINS.forEach(plugin => {  
            const isEnabled = Lampa.Storage.get(plugin.key, true);  
              
            const setting = $('<div class="settings-param selector">' +  
                '<div class="settings-param__name">' + plugin.title + '</div>' +  
                '<div class="settings-param__value">' + (isEnabled ? 'Увімкнено' : 'Вимкнено') + '</div>' +  
                '</div>');  
              
            setting.on('hover:enter', function() {  
                const newState = !Lampa.Storage.get(plugin.key, true);  
                Lampa.Storage.set(plugin.key, newState);  
                setting.find('.settings-param__value').text(newState ? 'Увімкнено' : 'Вимкнено');  
                console.log(`[Crowley Manager] ${plugin.name} ${newState ? 'enabled' : 'disabled'}`);  
            });  
              
            html.append(setting);  
        });  
          
        // Кнопка перезавантаження  
        const reloadBtn = $('<div class="settings-param selector">' +  
            '<div class="settings-param__name">Перезавантажити додаток</div>' +  
            '<div class="settings-param__value">Застосувати зміни</div>' +  
            '</div>');  
          
        reloadBtn.on('hover:enter', function() {  
            window.location.reload();  
        });  
          
        html.append(reloadBtn);  
          
        return {  
            render: function(container) {  
                container.empty().append(html);  
            },  
            destroy: function() {  
                html.remove();  
            }  
        };  
    }  
  
    // Реєстрація в налаштуваннях  
    function initSettings() {  
        console.log('[Crowley Manager] Initializing settings...');  
          
        // Додаємо пункт в головне меню налаштувань  
        if (Lampa.SettingsApi && typeof Lampa.SettingsApi.addParam === 'function') {  
            Lampa.SettingsApi.addParam({  
                component: 'crowley_plugins',  
                param: {  
                    name: 'crowley_plugins_main',  
                    type: 'trigger',  
                    default: true  
                },  
                field: {  
                    name: 'Плагіни Crowley24',  
                    description: 'Керування плагінами NewLogo та MobStyle'  
                }  
            });  
              
            console.log('[Crowley Manager] Settings param added');  
        }  
  
        // Обробник відкриття налаштувань  
        Lampa.Listener.follow('settings', function(e){  
            if(e.type === 'open' && e.name === 'crowley_plugins'){  
                console.log('[Crowley Manager] Opening settings...');  
                createSettings().render(Lampa.Utils.html('.settings-body'));  
            }  
        });  
  
        console.log('[Crowley Manager] Settings initialized');  
    }  
  
    // Запуск  
    initSettings();  
    loadEnabledPlugins();  
  
})();
