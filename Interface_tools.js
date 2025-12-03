(function () {  
    'use strict';  
  
    const STORAGE_KEY = 'external_plugins_manager_settings';  
  
    // Налаштування за замовчуванням  
    const defaultSettings = {  
        plugin1_enabled: true,  
        plugin2_enabled: true,  
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',  
        plugin2_url: 'https://tvigl.info/plugins/quality.js'  
    };  
  
    // Функції роботи з налаштуваннями  
    function loadSettings() {  
        const saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign({}, defaultSettings, saved || {});  
    }  
  
    function saveSettings(newSet) {  
        Lampa.Storage.set(STORAGE_KEY, newSet);  
    }  
  
    // Завантаження скриптів  
    function loadScript(url) {  
        try {  
            const script = document.createElement('script');  
            script.src = url;  
            script.async = true;  
            document.body.appendChild(script);  
        } catch (e) {  
            console.error('Помилка завантаження скрипту:', e);  
        }  
    }  
  
    // Створення меню налаштувань  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const plugin_manager_item = $('<div class="settings-param selector" data-name="external_plugins_manager">');  
            plugin_manager_item.append('<div class="settings-param__name">External Plugins Manager</div>');  
            plugin_manager_item.append('<div class="settings-param__value">➤</div>');  
              
            // Знаходимо пункт "Інтерфейс" і вставляємо наш пункт після нього  
            const interface_item = e.body.find('[data-name="interface"]');  
            if (interface_item.length > 0) {  
                interface_item.after(plugin_manager_item);  
            } else {  
                // Якщо не знайдено, додаємо в кінець  
                e.body.append(plugin_manager_item);  
            }  
              
            // Обробник кліку  
            plugin_manager_item.on('hover:enter', function() {  
                Lampa.Settings.open('external_plugins_manager');  
            });  
        }  
          
        // Відображення налаштувань  
        if (e.name === 'external_plugins_manager') {  
            let settings = loadSettings();  
              
            // Плагін 1  
            const plugin1_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="plugin1_enabled">');  
            plugin1_toggle.append('<div class="settings-param__name">Plugin Logo</div>');  
            plugin1_toggle.append('<div class="settings-param__value"></div>');  
              
            const plugin1_url = $('<div class="settings-param selector"><div class="settings-param__name">URL плагіна логотипів</div></div>');  
            const input1 = $('<input type="text" style="width:100%;padding:6px;margin:6px 0;">');  
            input1.val(settings.plugin1_url);  
            plugin1_url.append(input1);  
              
            // Плагін 2  
            const plugin2_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="plugin2_enabled">');  
            plugin2_toggle.append('<div class="settings-param__name">Plugin Quality Badges</div>');  
            plugin2_toggle.append('<div class="settings-param__value"></div>');  
              
            const plugin2_url = $('<div class="settings-param selector"><div class="settings-param__name">URL плагіна якості</div></div>');  
            const input2 = $('<input type="text" style="width:100%;padding:6px;margin:6px 0;">');  
            input2.val(settings.plugin2_url);  
            plugin2_url.append(input2);  
              
            // Кнопка перезавантаження  
            const reload_btn = $('<div class="settings-param selector"><div class="settings-param__name">Перезавантажити плагіни</div></div>');  
              
            // Додаємо елементи  
            e.body.append(plugin1_toggle, plugin1_url, plugin2_toggle, plugin2_url, reload_btn);  
              
            // Встановлюємо початкові значення  
            plugin1_toggle.find('.settings-param__value').text(settings.plugin1_enabled ? 'Вкл' : 'Викл');  
            plugin2_toggle.find('.settings-param__value').text(settings.plugin2_enabled ? 'Вкл' : 'Викл');  
              
            // Обробники  
            plugin1_toggle.on('hover:enter', function() {  
                settings.plugin1_enabled = !settings.plugin1_enabled;  
                saveSettings(settings);  
                plugin1_toggle.find('.settings-param__value').text(settings.plugin1_enabled ? 'Вкл' : 'Викл');  
                  
                if (settings.plugin1_enabled) {  
                    loadScript(settings.plugin1_url);  
                }  
            });  
              
            plugin2_toggle.on('hover:enter', function() {  
                settings.plugin2_enabled = !settings.plugin2_enabled;  
                saveSettings(settings);  
                plugin2_toggle.find('.settings-param__value').text(settings.plugin2_enabled ? 'Вкл' : 'Викл');  
                  
                if (settings.plugin2_enabled) {  
                    loadScript(settings.plugin2_url);  
                }  
            });  
              
            reload_btn.on('hover:enter', function() {  
                settings.plugin1_url = input1.val().trim();  
                settings.plugin2_url = input2.val().trim();  
                saveSettings(settings);  
                  
                if (settings.plugin1_enabled) loadScript(settings.plugin1_url);  
                if (settings.plugin2_enabled) loadScript(settings.plugin2_url);  
                  
                Lampa.Noty.show('Плагіни перезавантажені');  
            });  
        }  
    });  
  
    // Ініціалізація плагінів при старті  
    const initSettings = loadSettings();  
    if (initSettings.plugin1_enabled) loadScript(initSettings.plugin1_url);  
    if (initSettings.plugin2_enabled) loadScript(initSettings.plugin2_url);  
  
    console.log('External Plugins Manager loaded');  
})();
