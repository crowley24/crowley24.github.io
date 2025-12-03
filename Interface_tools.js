(function () {  
    'use strict';  
  
    const STORAGE_KEY = 'interface_manager_settings';  
  
    // Налаштування за замовчуванням  
    const defaultSettings = {  
        setting1_enabled: false,  
        setting2_enabled: false  
    };  
  
    // Функції роботи з налаштуваннями  
    function loadSettings() {  
        const saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign({}, defaultSettings, saved || {});  
    }  
  
    function saveSettings(data) {  
        Lampa.Storage.set(STORAGE_KEY, data);  
    }  
  
    // Створення меню налаштувань  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const interface_manager_item = $('<div class="settings-param selector" data-name="interface_manager">');  
            interface_manager_item.append('<div class="settings-param__name">🛠️ Менеджер інтерфейсу</div>');  
            interface_manager_item.append('<div class="settings-param__value">➤</div>');  
              
            // Знаходимо пункт "Інтерфейс" і вставляємо наш пункт після нього  
            const interface_item = e.body.find('[data-name="interface"]');  
            if (interface_item.length > 0) {  
                interface_item.after(interface_manager_item);  
            } else {  
                e.body.append(interface_manager_item);  
            }  
              
            // Обробник кліку  
            interface_manager_item.on('hover:enter', function() {  
                Lampa.Settings.open('interface_manager');  
            });  
        }  
          
        // Відображення налаштувань  
        if (e.name === 'interface_manager') {  
            let settings = loadSettings();  
              
            // Заголовок  
            const header = $('<div class="settings-param selector" style="pointer-events: none; opacity: 0.7;">');  
            header.append('<div class="settings-param__name">Менеджер інтерфейсу Lampa</div>');  
              
            // Налаштування 1  
            const setting1_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="setting1_enabled">');  
            setting1_toggle.append('<div class="settings-param__name">Налаштування 1</div>');  
            setting1_toggle.append('<div class="settings-param__value"></div>');  
              
            // Налаштування 2  
            const setting2_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="setting2_enabled">');  
            setting2_toggle.append('<div class="settings-param__name">Налаштування 2</div>');  
            setting2_toggle.append('<div class="settings-param__value"></div>');  
              
            e.body.append(header);  
            e.body.append(setting1_toggle);  
            e.body.append(setting2_toggle);  
              
            // Встановлюємо початкові значення  
            setting1_toggle.find('.settings-param__value').text(settings.setting1_enabled ? 'Вкл' : 'Викл');  
            setting2_toggle.find('.settings-param__value').text(settings.setting2_enabled ? 'Вкл' : 'Викл');  
              
            // Обробники  
            setting1_toggle.on('hover:enter', function() {  
                const newState = !settings.setting1_enabled;  
                settings.setting1_enabled = newState;  
                saveSettings(settings);  
                setting1_toggle.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
            });  
              
            setting2_toggle.on('hover:enter', function() {  
                const newState = !settings.setting2_enabled;  
                settings.setting2_enabled = newState;  
                saveSettings(settings);  
                setting2_toggle.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
            });  
        }  
    });  
  
    console.log('🛠️ Менеджер інтерфейсу успішно завантажено');  
})();
