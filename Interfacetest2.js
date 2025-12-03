(function () {
    'use strict';

    if (window.foxstudio_plugin_loaded) return;
    window.foxstudio_plugin_loaded = true;

    // -------------------------------
    // 🔧 ДОДАЄМО ПЕРЕКЛАДИ
    // -------------------------------
    function addLang() {
        Lampa.Lang.add({
            foxstudio_title: { ru: 'FoxStudio', en: 'FoxStudio', uk: 'FoxStudio' },
            foxstudio_interface_title: { ru: 'Новый интерфейс', en: 'New interface', uk: 'Новий інтерфейс' },
            foxstudio_necardify_title: { ru: 'Плагин Necardify', en: 'Necardify plugin', uk: 'Necardify плагін' },
            foxstudio_logo_title: { ru: 'Плагин Logo', en: 'Logo plugin', uk: 'Logo плагін' }
        });
    }

    // -------------------------------
    // 🔧 ФУНКЦІЯ ДЛЯ ЗАВАНТАЖЕННЯ СКРИПТА
    // -------------------------------
    function loadScript(url) {
        const s = document.createElement('script');
        s.src = url;
        s.onload = () => console.log('FoxStudio: loaded', url);
        s.onerror = () => console.error('FoxStudio: failed', url);
        document.body.appendChild(s);
    }

    // -------------------------------
    // 🔧 ІНІЦІАЛІЗАЦІЯ ВКЛАДКИ
    // -------------------------------
    function initFoxStudio() {
        try {
            addLang();

            // додаємо вкладку
            Lampa.SettingsApi.addCategory({
                component: 'foxstudio',
                name: 'foxstudio_title',
                icon: '<svg width="26" height="26" viewBox="0 0 490 490"><path d="M153.125 317.435h183.75v30.625h-183.75z" fill="white"></path><circle cx="339.672" cy="175.293" r="42.642" fill="white"></circle><path d="M420.914 0H69.086C30.99 0 0 30.99 0 69.086v351.828C0 459 30.99 490 69.086 490h351.828C459 490 490 459 490 420.914V69.086C490 30.99 459 0 420.914 0z" fill="white"></path></svg>',

                onRender: function () {
                    // toggle 1
                    Lampa.SettingsApi.addParam({
                        component: 'foxstudio',
                        param: { name: 'foxstudio_interface_enabled', type: 'toggle', default: true },
                        field: { name: 'foxstudio_interface_title' }
                    });

                    // toggle 2
                    Lampa.SettingsApi.addParam({
                        component: 'foxstudio',
                        param: { name: 'necardify_enabled', type: 'toggle', default: false },
                        field: { name: 'foxstudio_necardify_title' },
                        onChange: function (value) {
                            if (value) loadScript('https://foxstudio24.github.io/lampa/necardify.js');
                        }
                    });

                    // toggle 3
                    Lampa.SettingsApi.addParam({
                        component: 'foxstudio',
                        param: { name: 'logo_enabled', type: 'toggle', default: false },
                        field: { name: 'foxstudio_logo_title' },
                        onChange: function (value) {
                            if (value) loadScript('https://foxstudio24.github.io/lampa/logo.js');
                        }
                    });
                }
            });

            console.log('FoxStudio: UI created');
        } catch (e) {
            console.error('FoxStudio init error:', e);
        }
    }

    // -------------------------------
    // 🔧 ЧЕКАЄМО ПОВНОЇ ГОТОВНОСТІ LAMPA
    // -------------------------------
    if (window.appready) {
        initFoxStudio();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initFoxStudio();
        });
    }

})();
