(function () {
    'use strict';

    if (window.foxstudio_plugin_loaded) return;
    window.foxstudio_plugin_loaded = true;

    function waitForSettingsApi(callback) {
        let timer = setInterval(() => {
            if (window.Lampa &&
                Lampa.SettingsApi &&
                typeof Lampa.SettingsApi.addCategory === 'function') {

                clearInterval(timer);
                callback();
            }
        }, 300);
    }

    function loadScript(url) {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => console.log('FoxStudio loaded:', url);
        script.onerror = () => console.error('FoxStudio error loading:', url);
        document.body.appendChild(script);
    }

    function initFoxStudio() {

        Lampa.Lang.add({
            foxstudio_title: { uk: 'FoxStudio', ru: 'FoxStudio', en: 'FoxStudio' },
            foxstudio_interface_title: { uk: 'Новий інтерфейс', ru: 'Новый интерфейс', en: 'New interface' },
            foxstudio_necardify_title: { uk: 'Necardify плагін', ru: 'Necardify плагин', en: 'Necardify plugin' },
            foxstudio_logo_title: { uk: 'Logo плагін', ru: 'Logo плагин', en: 'Logo plugin' }
        });

        Lampa.SettingsApi.addCategory({
            component: 'foxstudio',
            name: 'foxstudio_title',
            icon: '<svg width="26" height="26" viewBox="0 0 490 490"><path d="M153.125 317.435h183.75v30.625h-183.75z" fill="white"></path><circle cx="339.672" cy="175.293" r="42.642" fill="white"></circle><path d="M420.914 0H69.086C30.99 0 0 30.99 0 69.086v351.828C0 459 30.99 490 69.086 490h351.828C459 490 490 459 490 420.914V69.086C490 30.99 459 0 420.914 0z" fill="white"></path></svg>',

            onRender: function () {

                Lampa.SettingsApi.addParam({
                    component: 'foxstudio',
                    param: { name: 'foxstudio_interface_enabled', type: 'toggle', default: true },
                    field: { name: 'foxstudio_interface_title' }
                });

                Lampa.SettingsApi.addParam({
                    component: 'foxstudio',
                    param: { name: 'necardify_enabled', type: 'toggle', default: false },
                    field: { name: 'foxstudio_necardify_title' },
                    onChange: v => v && loadScript('https://foxstudio24.github.io/lampa/necardify.js')
                });

                Lampa.SettingsApi.addParam({
                    component: 'foxstudio',
                    param: { name: 'logo_enabled', type: 'toggle', default: false },
                    field: { name: 'foxstudio_logo_title' },
                    onChange: v => v && loadScript('https://foxstudio24.github.io/lampa/logo.js')
                });

            }
        });

        console.log('FoxStudio: category added!');
    }

    // чекаємо поки SettingsApi буде доступний
    waitForSettingsApi(initFoxStudio);

})();
