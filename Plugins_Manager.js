(function () {  
    'use strict';  
  
    const STORAGE_KEY = 'external_plugins_manager_settings';  
  
    // ------------------------------  
    // ⚙️ Налаштування  
    // ------------------------------  
    const defaultSettings = {  
        plugin1_enabled: true,  
        plugin2_enabled: true,  
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',  
        plugin2_url: 'https://tvigl.info/plugins/quality.js'  
    };  
  
    // ------------------------------  
    // 📌 Load / Save  
    // ------------------------------  
    function loadSettings() {  
        const saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign({}, defaultSettings, saved || {});  
    }  
  
    function saveSettings(newSet) {  
        Lampa.Storage.set(STORAGE_KEY, newSet);  
    }  
  
    // ------------------------------  
    // 📌 Додавання сторонніх плагінів  
    // ------------------------------  
    function injectScript(url) {  
        try {  
            const tag = document.createElement('script');  
            tag.src = url;  
            tag.async = true;  
            document.body.appendChild(tag);  
        } catch (e) {  
            console.error("Plugin loading error:", e);  
        }  
    }  
  
    // ------------------------------  
    // 📌 Ініціалізація  
    // ------------------------------  
    function initPlugins() {  
        const s = loadSettings();  
        if (s.plugin1_enabled) injectScript(s.plugin1_url);  
        if (s.plugin2_enabled) injectScript(s.plugin2_url);  
    }  
  
    // ------------------------------  
    // ⚙️ Додавання в меню налаштувань  
    // ------------------------------  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const plugin_manager_item = $('<div class="settings-param selector" data-name="external_plugins_manager">');  
            plugin_manager_item.append('<div class="settings-param__name">External Plugins Manager</div>');  
            plugin_manager_item.append('<div class="settings-param__value">➤</div>');  
              
            e.body.append(plugin_manager_item);  
              
            // Обробник кліку  
            plugin_manager_item.on('hover:enter', function() {  
                Lampa.Settings.open('external_plugins_manager');  
            });  
        }  
          
        // Відображаємо налаштування плагінів  
        if (e.name === 'external_plugins_manager') {  
            let settings = loadSettings();  
              
            // Плагін 1: Лого  
            const plugin1_setting = $('<div class="settings-param selector" data-type="toggle" data-name="plugin1_enabled">');  
            plugin1_setting.append('<div class="settings-param__name">Plugin Logo</div>');  
            plugin1_setting.append('<div class="settings-param__value"></div>');  
              
            plugin1_setting.on('hover:enter', function() {  
                const newValue = !settings.plugin1_enabled;  
                settings.plugin1_enabled = newValue;  
                saveSettings(settings);  
                  
                if (newValue) {  
                    injectScript(settings.plugin1_url);  
                }  
                  
                plugin1_setting.find('.settings-param__value').text(newValue ? 'Вкл' : 'Выкл');  
            });  
              
            // Плагін 2: Якість  
            const plugin2_setting = $('<div class="settings-param selector" data-type="toggle" data-name="plugin2_enabled">');  
            plugin2_setting.append('<div class="settings-param__name">Plugin Quality Badges</div>');  
            plugin2_setting.append('<div class="settings-param__value"></div>');  
              
            plugin2_setting.on('hover:enter', function() {  
                const newValue = !settings.plugin2_enabled;  
                settings.plugin2_enabled = newValue;  
                saveSettings(settings);  
                  
                if (newValue) {  
                    injectScript(settings.plugin2_url);  
                }  
                  
                plugin2_setting.find('.settings-param__value').text(newValue ? 'Вкл' : 'Выкл');  
            });  
              
            // Встановлюємо початкові значення  
            plugin1_setting.find('.settings-param__value').text(settings.plugin1_enabled ? 'Вкл' : 'Выкл');  
            plugin2_setting.find('.settings-param__value').text(settings.plugin2_enabled ? 'Вкл' : 'Выкл');  
              
            e.body.append(plugin1_setting);  
            e.body.append(plugin2_setting);  
        }  
    });  
  
    // ------------------------------  
    // ▶️ Запуск  
    // ------------------------------  
    initPlugins();  
  
})();
