(function () {  
    'use strict';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined' || !Lampa.Utils) {  
        setTimeout(arguments.callee, 100);  
        return;  
    }  
  
    const PLUGIN_NAME = 'crowley_plugins';  
    const PLUGIN_TITLE = 'Плагіни Crowley24';  
  
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
        const pluginsToLoad = [];  
          
        PLUGINS.forEach(plugin => {  
            const isEnabled = Lampa.Storage.get(plugin.key, true);  
            if (isEnabled) {  
                pluginsToLoad.push(plugin.url);  
            }  
        });  
  
        if (pluginsToLoad.length > 0) {  
            Lampa.Utils.putScriptAsync(pluginsToLoad, function () {  
                console.log('[Crowley24 плагіни завантажені:]', pluginsToLoad);  
            });  
        }  
    }  
  
    // Створення інтерфейсу налаштувань  
    function createSettings() {  
        let html = $('<div></div>');  
          
        // Додати заголовок  
        html.append('<div class="settings__title">' + PLUGIN_TITLE + '</div>');  
          
        // Додати налаштування для кожного плагіна  
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
            });  
              
            html.append(setting);  
        });  
          
        // Додати кнопку перезавантаження  
        const reloadBtn = $('<div class="settings-param selector">' +  
            '<div class="settings-param__name">Перезавантажити додаток</div>' +  
            '<div class="settings-param__value">Для застосування змін</div>' +  
            '</div>');  
          
        reloadBtn.on('hover:enter', function() {  
            Lampa.Select.show({  
                title: 'Перезавантажити?',  
                items: [{ title: 'Так', confirm: true }, { title: 'Ні' }],  
                onSelect: function (e) {  
                    if (e.confirm) {  
                        window.location.reload();  
                    }  
                }  
            });  
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
        // Додати пункт в головне меню налаштувань  
        if (Lampa.SettingsApi && typeof Lampa.SettingsApi.addParam === 'function') {  
            Lampa.SettingsApi.addParam({  
                component: PLUGIN_NAME,  
                param: {  
                    name: 'crowley_plugins_manager',  
                    type: 'trigger',  
                    default: true  
                },  
                field: {  
                    name: PLUGIN_TITLE,  
                    description: 'Керування плагінами Crowley24'  
                }  
            });  
        }  
  
        // Обробник відкриття налаштувань  
        Lampa.Listener.follow('settings', function(e){  
            if(e.type === 'open' && e.name === PLUGIN_NAME){  
                createSettings().render(Lampa.Utils.html('.settings-body'));  
            }  
        });  
    }  
  
    // Запуск  
    initSettings();  
    loadEnabledPlugins();  
  
})();
