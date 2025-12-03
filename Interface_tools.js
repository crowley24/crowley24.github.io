(function () {  
    'use strict';  
  
    const STORAGE_KEY = 'external_plugins_manager_settings';  
  
    const defaultSettings = {  
        plugin1_enabled: true,  
        plugin2_enabled: true,  
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',  
        plugin2_url: 'https://tvigl.info/plugins/quality.js'  
    };  
  
    function loadSettings() {  
        const saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign({}, defaultSettings, saved || {});  
    }  
  
    function saveSettings(data) {  
        Lampa.Storage.set(STORAGE_KEY, data);  
    }  
  
    function loadScript(url) {  
        if (!url) return;  
        try {  
            const script = document.createElement('script');  
            script.src = url;  
            script.async = true;  
            document.body.appendChild(script);  
        } catch (e) {  
            console.error('Помилка завантаження скрипту:', e);  
        }  
    }  
  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню для головного списку  
            const plugin_manager_item = $('<div class="settings-param selector" data-name="external_plugins_manager">');  
            plugin_manager_item.append('<div class="settings-param__name">🔌 Менеджер плагінів</div>');  
            plugin_manager_item.append('<div class="settings-param__value">➤</div>');  
              
            // Знаходимо пункт "Інтерфейс" і додаємо після нього в основний список  
            const interface_item = e.body.find('[data-name="interface"]');  
            if (interface_item.length > 0) {  
                interface_item.after(plugin_manager_item);  
            } else {  
                e.body.append(plugin_manager_item);  
            }  
              
            plugin_manager_item.on('hover:enter', function() {  
                Lampa.Settings.open('external_plugins_manager');  
            });  
        }  
          
        if (e.name === 'external_plugins_manager') {  
            let settings = loadSettings();  
              
            // Заголовок  
            const header = $('<div class="settings-param selector" style="pointer-events: none; opacity: 0.7;">');  
            header.append('<div class="settings-param__name">🔌 Керування зовнішніми плагінами</div>');  
              
            // Налаштування плагіна 1  
            const plugin1_setting = $('<div class="settings-param selector" data-type="toggle" data-name="plugin1_enabled">');  
            plugin1_setting.append('<div class="settings-param__name">Plugin Logo</div>');  
            plugin1_setting.append('<div class="settings-param__value"></div>');  
              
            // Налаштування плагіна 2  
            const plugin2_setting = $('<div class="settings-param selector" data-type="toggle" data-name="plugin2_enabled">');  
            plugin2_setting.append('<div class="settings-param__name">Plugin Quality</div>');  
            plugin2_setting.append('<div class="settings-param__value"></div>');  
              
            e.body.append(header);  
            e.body.append(plugin1_setting);  
            e.body.append(plugin2_setting);  
              
            // Встановлюємо початкові значення  
            plugin1_setting.find('.settings-param__value').text(settings.plugin1_enabled ? 'Вкл' : 'Викл');  
            plugin2_setting.find('.settings-param__value').text(settings.plugin2_enabled ? 'Вкл' : 'Викл');  
              
            // Обробники  
            plugin1_setting.on('hover:enter', function() {  
                const newState = !settings.plugin1_enabled;  
                settings.plugin1_enabled = newState;  
                saveSettings(settings);  
                plugin1_setting.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
                  
                if (newState) {  
                    loadScript(settings.plugin1_url);  
                }  
            });  
              
            plugin2_setting.on('hover:enter', function() {  
                const newState = !settings.plugin2_enabled;  
                settings.plugin2_enabled = newState;  
                saveSettings(settings);  
                plugin2_setting.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
                  
                if (newState) {  
                    loadScript(settings.plugin2_url);  
                }  
            });  
        }  
    });  
  
    // Автозавантаження при старті  
    const init = loadSettings();  
    if (init.plugin1_enabled) loadScript(init.plugin1_url);  
    if (init.plugin2_enabled) loadScript(init.plugin2_url);  
  
    console.log('External Plugins Manager loaded');  
})();
