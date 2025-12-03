(function() {  
    'use strict';  
      
    const STORAGE_KEY = 'plugins_switcher_settings';  
      
    const defaultSettings = {  
        enable_newlogo: true,  
        enable_mobstyle: true  
    };  
      
    function loadSettings() {  
        const saved = Lampa.Storage.get(STORAGE_KEY);  
        return Object.assign({}, defaultSettings, saved || {});  
    }  
      
    function saveSettings(settings) {  
        Lampa.Storage.set(STORAGE_KEY, settings);  
    }  
      
    function loadScript(url) {  
        const script = document.createElement('script');  
        script.src = url;  
        script.onerror = function() {  
            console.error('Помилка завантаження скрипта:', url);  
        };  
        document.head.appendChild(script);  
    }  
      
    function applyPlugins(settings) {  
        if (settings.enable_newlogo) {  
            loadScript('https://crowley24.github.io/NewLogo.js');  
        }  
        if (settings.enable_mobstyle) {  
            loadScript('https://crowley24.github.io/mob_style.js');  
        }  
    }  
      
    // Функція показу налаштувань плагіна  
    function showPluginsManagerSettings() {  
        const settings = loadSettings();  
          
        // Створюємо контент для налаштувань  
        const settingsContent = $('<div class="settings__body"></div>');  
          
        const newlogo_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="enable_newlogo">');  
        newlogo_toggle.append('<div class="settings-param__name">Логотипи (NewLogo)</div>');  
        newlogo_toggle.append('<div class="settings-param__value">' + (settings.enable_newlogo ? 'Вкл' : 'Викл') + '</div>');  
          
        const mobstyle_toggle = $('<div class="settings-param selector" data-type="toggle" data-name="enable_mobstyle">');  
        mobstyle_toggle.append('<div class="settings-param__name">Mobile Style</div>');  
        mobstyle_toggle.append('<div class="settings-param__value">' + (settings.enable_mobstyle ? 'Вкл' : 'Викл') + '</div>');  
          
        settingsContent.append(newlogo_toggle);  
        settingsContent.append(mobstyle_toggle);  
          
        // Обробники зміни налаштувань  
        newlogo_toggle.on('hover:enter', function() {  
            settings.enable_newlogo = !settings.enable_newlogo;  
            saveSettings(settings);  
            $(this).find('.settings-param__value').text(settings.enable_newlogo ? 'Вкл' : 'Викл');  
              
            if (settings.enable_newlogo) {  
                loadScript('https://crowley24.github.io/NewLogo.js');  
            }  
        });  
          
        mobstyle_toggle.on('hover:enter', function() {  
            settings.enable_mobstyle = !settings.enable_mobstyle;  
            saveSettings(settings);  
            $(this).find('.settings-param__value').text(settings.enable_mobstyle ? 'Вкл' : 'Викл');  
              
            if (settings.enable_mobstyle) {  
                loadScript('https://crowley24.github.io/mob_style.js');  
            }  
        });  
          
        // Створюємо екран налаштувань  
        Lampa.Activity.push({  
            url: '',  
            title: 'Plugins Manager',  
            component: 'settings',  
            page: 1,  
            nocache: true,  
            template: 'settings',  
            content: settingsContent  
        });  
    }  
      
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            const plugin_item = $('<div class="settings-param selector" data-name="plugins_switcher">');  
            plugin_item.append('<div class="settings-param__name">Plugins Manager</div>');  
            plugin_item.append('<div class="settings-param__value">➤</div>');  
              
            e.body.append(plugin_item);  
              
            plugin_item.on('hover:enter', function() {  
                showPluginsManagerSettings();  
            });  
        }  
    });  
      
    applyPlugins(loadSettings());  
})();
