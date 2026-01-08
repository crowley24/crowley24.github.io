(function () {  
    'use strict';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined' || !Lampa.Utils) {  
        setTimeout(arguments.callee, 100);  
        return;  
    }  
  
    const PLUGIN_NAME = 'toggle_loader';  
    const PLUGIN_TITLE = 'Керування Плагінами Crowley24';  
  
    // --- Налаштування Плагінів для Завантаження ---  
    const PLUGINS = [  
        {  
            name: 'NewLogo',  
            url: 'https://crowley24.github.io/NewLogo.js',  
            key: 'new_logo_enabled',  
            title: 'NewLogo'  
        },  
        {  
            name: 'MobStyle',  
            url: 'https://crowley24.github.io/mob_style.js',  
            key: 'mob_style_enabled',  
            title: 'Мобільний стиль (mob_style)'  
        }  
    ];  
  
    /**  
     * Завантажує увімкнені плагіни.  
     */  
    function loadPlugins() {  
        const pluginsToLoad = [];  
          
        PLUGINS.forEach(plugin => {  
            const isEnabled = Lampa.Storage.get(plugin.key, true);  
            if (isEnabled) {  
                pluginsToLoad.push(plugin.url);  
            }  
        });  
  
        if (pluginsToLoad.length > 0) {  
            Lampa.Utils.putScriptAsync(pluginsToLoad, function () {  
                console.log(`[${PLUGIN_TITLE}] Плагіни завантажені:`, pluginsToLoad.map(url => url.substring(url.lastIndexOf('/') + 1)));  
            });  
        } else {  
             console.log(`[${PLUGIN_TITLE}] Жоден плагін не був завантажений.`);  
        }  
    }  
      
    /**  
     * Створює сторінку налаштувань плагіна.  
     */  
    function createSettings() {  
        const component = Lampa.Component.build({  
            title: PLUGIN_TITLE,  
            component: 'settings',  
            name: PLUGIN_NAME + '_settings',  
            menu: true,  
            onStart: (status, params) => {  
                Lampa.Settings.update();  
                Lampa.Controller.add('settings_component', {  
                    toggle: () => {  
                        Lampa.Controller.collection.forEach(c => c.toggle());  
                    },  
                    right: () => Lampa.Controller.handle().right(),  
                    left: () => Lampa.Controller.handle().left(),  
                    back: () => Lampa.Api.exit()  
                });  
                Lampa.Controller.toggle('settings_component');  
            }  
        });  
  
        // Додаємо перемикачі для кожного плагіна  
        PLUGINS.forEach(plugin => {  
            component.append(plugin.title, Lampa.Utils.html(`<div class="settings-param selector" data-name="${plugin.key}">  
                <div class="settings-param__name">${plugin.title}</div>  
                <div class="settings-param__value"></div>  
            </div>`));  
        });  
  
        // Ініціалізуємо перемикачі  
        component.find('.selector').each(function () {  
            const pluginKey = $(this).data('name');  
            const isEnabled = Lampa.Storage.get(pluginKey, true);  
            const value = $(this).find('.settings-param__value');  
  
            value.text(isEnabled ? 'Увімкнено' : 'Вимкнено');  
              
            this.addEventListener('click', () => {  
                const newState = !Lampa.Storage.get(pluginKey, true);  
                Lampa.Storage.set(pluginKey, newState);  
                value.text(newState ? 'Увімкнено' : 'Вимкнено');  
                  
                Lampa.Noty.show('Рекомендується перезавантажити застосунок');  
            });  
  
            Lampa.Controller.collection.push({  
                element: this,  
                name: pluginKey,  
                onFocus: (target) => {  
                    Lampa.Settings.param(target);  
                },  
                onDown: () => Lampa.Controller.handle(this, 'down'),  
                onUp: () => Lampa.Controller.handle(this, 'up'),  
                onRight: () => Lampa.Controller.handle(this, 'right'),  
                onLeft: () => Lampa.Controller.handle(this, 'left'),  
            });  
        });  
          
        return component;  
    }  
  
    // --- Реєстрація та Запуск ---  
  
    // 1. Правильний спосіб додавання пункту в меню налаштувань  
    Lampa.Settings.main.push({  
        component: PLUGIN_NAME,  
        name: PLUGIN_TITLE,  
        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'  
    });  
  
    // 2. Реєструємо обробник для відкриття налаштувань  
    Lampa.Listener.follow('settings', function(e){  
        if(e.type === 'open' && e.name === PLUGIN_NAME){  
            createSettings().render(Lampa.Utils.html('.settings-body'));  
        }  
    });  
  
    // 3. Запускаємо основний функціонал  
    loadPlugins();  
  
})();
