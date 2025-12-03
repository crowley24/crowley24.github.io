(function() {  
    'use strict';  

    var plugin_info = {  
        name: 'FoxStudio Interface',  
        version: '1.0.0',  
        author: 'FoxStudio24'  
    };  

    var default_settings = {  
        foxstudio_interface_enabled: true,  
        necardify_enabled: false,  
        logo_enabled: false  
    };  

    function loadScript(url, callback) {  
        var script = document.createElement('script');  
        script.type = 'text/javascript';  
        script.src = url;  
        script.onload = callback;  
        script.onerror = function() {  
            console.error('Помилка завантаження скрипта:', url);  
        };  
        document.head.appendChild(script);  
    }  

    // ------------------------------
    // ❗ ВИПРАВЛЕНА ФУНКЦІЯ ДОДАВАННЯ ПУНКТУ
    // ------------------------------
    function addFoxStudioSection() {

        let settingsRender = Lampa.Settings.render(); // ✔ працює у всіх версіях
        if (!settingsRender.length) return;

        if (!settingsRender.find('[data-component="foxstudio"]').length) {

            var field = `
            <div class="settings-folder selector" data-component="foxstudio" data-static="true">
                <div class="settings-folder__icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 490 490">
                        <path d="M153.125 317.435h183.75v30.625h-183.75z" fill="white"></path>
                        <circle cx="339.672" cy="175.293" r="42.642" fill="white"></circle>
                        <path d="M420.914 0H69.086C30.999 0 0 30.999 0 69.086v351.829C0 459.001 30.999 490 69.086 490h351.829C459.001 490 490 459.001 490 420.914V69.086C490 30.999 459.001 0 420.914 0z" fill="white"></path>
                    </svg>
                </div>
                <div class="settings-folder__name">` + Lampa.Lang.translate('foxstudio_title') + `</div>
            </div>`;

            let moreElement = settingsRender.find('[data-component="more"]');

            if (moreElement.length) settingsRender.find('.settings__content').append(field);
            else settingsRender.find('.settings__content').append(field);

            Lampa.Settings.update();
        }
    }

    // ------------------------------

    function showFoxStudioSettings() {
        var settingsContent = $('<div class="settings__body"></div>');

        var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');
        foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');
        foxstudio_interface.append('<div class="settings-param__value">' + (Lampa.Storage.get('foxstudio_interface_enabled', true) ? 'Вкл' : 'Выкл') + '</div>');

        var necardify_setting = $('<div class="settings-param selector" data-type="toggle" data-name="necardify_enabled">');
        necardify_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_necardify_title') + '</div>');
        necardify_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('necardify_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');

        var logo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="logo_enabled">');
        logo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_logo_title') + '</div>');
        logo_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('logo_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');

        settingsContent.append(foxstudio_interface);
        settingsContent.append(necardify_setting);
        settingsContent.append(logo_setting);

        foxstudio_interface.on('hover:enter', function() {
            var current = Lampa.Storage.get('foxstudio_interface_enabled', true);
            var new_value = !current;
            Lampa.Storage.set('foxstudio_interface_enabled', new_value);
            $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');
        });

        necardify_setting.on('hover:enter', function() {
            var current = Lampa.Storage.get('necardify_enabled', false);
            var new_value = !current;
            Lampa.Storage.set('necardify_enabled', new_value);
            $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');
            if (new_value) loadScript('https://foxstudio24.github.io/lampa/necardify.js');
        });

        logo_setting.on('hover:enter', function() {
            var current = Lampa.Storage.get('logo_enabled', false);
            var new_value = !current;
            Lampa.Storage.set('logo_enabled', new_value);
            $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');
            if (new_value) loadScript('https://foxstudio24.github.io/lampa/logo.js');
        });

        Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('foxstudio_title'),
            component: 'settings',
            page: 1,
            nocache: true,
            template: 'settings',
            content: settingsContent
        });
    }

    function init() {

        Lampa.Lang.add({
            foxstudio_title: { ru: 'FoxStudio', en: 'FoxStudio', uk: 'FoxStudio' },
            foxstudio_interface_title: { ru: 'Новый интерфейс для тв и пк', en: 'New interface for TV and PC', uk: 'Новий інтерфейс для тв та пк' },
            foxstudio_necardify_title: { ru: 'Necardify плагин', en: 'Necardify plugin', uk: 'Necardify плагін' },
            foxstudio_logo_title: { ru: 'Logo плагин', en: 'Logo plugin', uk: 'Logo плагін' }
        });

        Lampa.Settings.listener.follow('open', function(e) {
            if (e.name === 'main') {
                e.body.find('[data-component="foxstudio"]').on('hover:enter', showFoxStudioSettings);
            }
        });

        Object.keys(default_settings).forEach(function(key) {
            if (Lampa.Storage.get(key) === null) Lampa.Storage.set(key, default_settings[key]);
        });

        if (window.appready) addFoxStudioSection();
        else Lampa.Listener.follow('app', e => e.type === 'ready' && addFoxStudioSection());

        console.log('FoxStudio Interface Plugin завантажено');
    }

    if (window.Lampa) init();
    else document.addEventListener('DOMContentLoaded', init);

})();
