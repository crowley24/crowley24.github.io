(function() {  
    'use strict';  
  
    // Унікальні ключі для збереження стану  
    const STORAGE_KEY_LOGO = 'plugin_manager_logo_enabled';  
    const STORAGE_KEY_QUALITY = 'plugin_manager_quality_enabled';  
  
    // URL плагінів  
    const PLUGIN_URLS = {  
        logo: 'https://crowley24.github.io/NewLogo.js',  
        quality: 'https://tvigl.info/plugins/quality.js'  
    };  
  
    // Функції для керування станом  
    function getState(key) {  
        return Lampa.Storage.get(key, true);  
    }  
  
    function setState(key, state) {  
        Lampa.Storage.set(key, state);  
    }  
  
    // Динамічне завантаження скриптів  
    function loadScript(url) {  
        if (!url) return;  
          
        if (document.querySelector(`script[src="${url}"]`)) {  
            console.log(`[Plugin Manager] Script already loaded: ${url}`);  
            return;  
        }  
  
        const script = document.createElement('script');  
        script.src = url;  
        script.onload = () => console.log(`[Plugin Manager] Loaded successfully: ${url}`);  
        script.onerror = () => console.error(`[Plugin Manager] Failed to load: ${url}`);  
        document.head.appendChild(script);  
    }  
  
    // Завантаження плагінів при старті  
    if (getState(STORAGE_KEY_LOGO)) {  
        loadScript(PLUGIN_URLS.logo);  
    }  
  
    if (getState(STORAGE_KEY_QUALITY)) {  
        loadScript(PLUGIN_URLS.quality);  
    }  
  
    // Створення меню налаштувань  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const plugin_manager_item = $('<div class="settings-param selector" data-name="plugin_manager">');  
            plugin_manager_item.append('<div class="settings-param__name">🔌 Менеджер Плагінів</div>');  
            plugin_manager_item.append('<div class="settings-param__value">➤</div>');  
              
            // Знаходимо пункт "Інтерфейс" і вставляємо наш пункт після нього  
            const interface_item = e.body.find('[data-name="interface"]');  
            if (interface_item.length > 0) {  
                interface_item.after(plugin_manager_item);  
            } else {  
                e.body.append(plugin_manager_item);  
            }  
              
            // Обробник кліку  
            plugin_manager_item.on('hover:enter', function() {  
                Lampa.Settings.open('plugin_manager');  
            });  
        }  
          
        // Відображення налаштувань  
        if (e.name === 'plugin_manager') {  
            // Заголовок  
            const header = $('<div class="settings-param selector" style="pointer-events: none; opacity: 0.7;">');  
            header.append('<div class="settings-param__name">Менеджер Плагінів - Увімкнення/вимкнення NewLogo та Quality</div>');  
            e.body.append(header);  
              
            // Налаштування NewLogo.js  
            const logo_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="plugin_manager_logo_enabled">');  
            logo_toggle.append('<div class="settings-param__name">NewLogo.js</div>');  
            logo_toggle.append('<div class="settings-param__value"></div>');  
              
            // Налаштування Quality.js  
            const quality_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="plugin_manager_quality_enabled">');  
            quality_toggle.append('<div class="settings-param__name">Quality.js</div>');  
            quality_toggle.append('<div class="settings-param__value"></div>');  
              
            // Інструкція  
            const instruction = $('<div class="settings-param selector" style="pointer-events: none; opacity: 0.7;">');  
            instruction.append('<div class="settings-param__name">⚠️ Для застосування змін необхідно перезавантажити Lampa</div>');  
              
            e.body.append(logo_toggle);  
            e.body.append(quality_toggle);  
            e.body.append(instruction);  
              
            // Встановлюємо початкові значення  
            logo_toggle.find('.settings-param__value').text(getState(STORAGE_KEY_LOGO) ? 'Вкл' : 'Викл');  
            quality_toggle.find('.settings-param__value').text(getState(STORAGE_KEY_QUALITY) ? 'Вкл' : 'Викл');  
              
            // Обробники  
            logo_toggle.on('hover:enter', function() {  
                const newState = !getState(STORAGE_KEY_LOGO);  
                setState(STORAGE_KEY_LOGO, newState);  
                logo_toggle.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
                Lampa.Noty.show('Зміни NewLogo набудуть чинності після перезавантаження Lampa.');  
            });  
              
            quality_toggle.on('hover:enter', function() {  
                const newState = !getState(STORAGE_KEY_QUALITY);  
                setState(STORAGE_KEY_QUALITY, newState);  
                quality_toggle.find('.settings-param__value').text(newState ? 'Вкл' : 'Викл');  
                Lampa.Noty.show('Зміни Quality набудуть чинності після перезавантаження Lampa.');  
            });  
        }  
    });  
  
    console.log('Plugin Manager loaded');  
})();
