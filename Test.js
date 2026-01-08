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
            // Отримуємо збережений стан. За замовчуванням - УВІМКНЕНО (true)  
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
     * Створює інтерфейс налаштувань.  
     */  
    function createSettings() {  
        const html = $('<div>');  
          
        // Заголовок  
        html.append($('<div class="settings__title">' + PLUGIN_TITLE + '</div>'));  
          
        // Опис  
        html.append($('<div class="settings__descr">Увімкніть або вимкніть плагіни Crowley24</div>'));  
  
        // Створюємо перемикачі для кожного плагіна  
        PLUGINS.forEach(plugin => {  
            const isEnabled = Lampa.Storage.get(plugin.key, true);  
              
            const item = $('<div class="settings-param selector">' +  
                '<div class="settings-param__name">' + plugin.title + '</div>' +  
                '<div class="settings-param__value">' + (isEnabled ? 'Увімкнено' : 'Вимкнено') + '</div>' +  
                '</div>');  
  
            item.on('hover:enter', function () {  
                const newState = !Lampa.Storage.get(plugin.key, true);  
                Lampa.Storage.set(plugin.key, newState);  
                  
                // Оновлюємо відображення  
                item.find('.settings-param__value').text(newState ? 'Увімкнено' : 'Вимкнено');  
                  
                // Показуємо повідомлення про необхідність перезавантаження  
                Lampa.Noty.show('Для застосування змін перезавантажте додаток');  
            });  
  
            html.append(item);  
        });  
  
        // Кнопка перезавантаження  
        const reloadButton = $('<div class="settings-param selector">' +  
            '<div class="settings-param__name">Перезавантажити додаток</div>' +  
            '<div class="settings-param__value">Перезавантажити</div>' +  
            '</div>');  
  
        reloadButton.on('hover:enter', function () {  
            Lampa.Noty.show('Перезавантаження додатка...');  
            setTimeout(() => {  
                window.location.reload();  
            }, 1000);  
        });  
  
        html.append(reloadButton);  
  
        return {  
            render: function (container) {  
                container.empty().append(html);  
            },  
            destroy: function () {  
                html.remove();  
            }  
        };  
    }  
  
    // --- Реєстрація та Запуск ---  
  
    // 1. Правильний спосіб додавання пункту в меню налаштувань  
    if (Lampa.SettingsApi && typeof Lampa.SettingsApi.addParam === 'function') {  
        Lampa.SettingsApi.addParam({  
            component: PLUGIN_NAME,  
            name: PLUGIN_TITLE,  
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'  
        });  
    }  
  
    // 2. Реєструємо обробник для відкриття налаштувань  
    Lampa.Listener.follow('settings', function(e){  
        if(e.type === 'open' && e.name === PLUGIN_NAME){  
            createSettings().render(Lampa.Utils.html('.settings-body'));  
        }  
    });  
  
    // 3. Запускаємо основний функціонал  
    loadPlugins();  
  
})();
