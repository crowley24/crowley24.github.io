(function () {
    'use strict';

    if (window.foxstudio_plugin_loaded) return;
    window.foxstudio_plugin_loaded = true;

    // --- Додати переклади ---
    Lampa.Lang.add({
        foxstudio_title: {
            ru: 'FoxStudio',
            en: 'FoxStudio',
            uk: 'FoxStudio'
        },
        foxstudio_interface_title: {
            ru: 'Новый интерфейс для ТВ и ПК',
            en: 'New interface for TV & PC',
            uk: 'Новий інтерфейс для ТВ та ПК'
        },
        foxstudio_necardify_title: {
            ru: 'Плагин Necardify',
            en: 'Necardify plugin',
            uk: 'Necardify плагін'
        },
        foxstudio_logo_title: {
            ru: 'Плагин Logo',
            en: 'Logo plugin',
            uk: 'Logo плагін'
        }
    });

    // --- Створюємо категорію ---
    Lampa.SettingsApi.addCategory({
        component: 'foxstudio',
        name: 'foxstudio_title',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 490 490"><path d="M153.125 317.435h183.75v30.625h-183.75z" fill="white"></path><circle cx="339.672" cy="175.293" r="42.642" fill="white"></circle><path d="M420.914 0H69.086C30.999 0 0 30.999 0 69.086v351.829C0 459.001 30.999 490 69.086 490h351.829C459.001 490 490 459.001 490 420.914V69.086C490 30.999 459.001 0 420.914 0z" fill="white"></path></svg>',
        onRender: function (body) {

            // --- toggle 1 ---
            Lampa.SettingsApi.addParam({
                component: 'foxstudio',
                param: {
                    name: 'foxstudio_interface_enabled',
                    type: 'toggle',
                    default: true
                },
                field: {
                    name: 'foxstudio_interface_title'
                }
            });

            // --- toggle 2 ---
            Lampa.SettingsApi.addParam({
                component: 'foxstudio',
                param: {
                    name: 'necardify_enabled',
                    type: 'toggle',
                    default: false
                },
                field: {
                    name: 'foxstudio_necardify_title'
                },
                onChange: function (val) {
                    if (val) {
                        loadScript('https://foxstudio24.github.io/lampa/necardify.js');
                    }
                }
            });

            // --- toggle 3 ---
            Lampa.SettingsApi.addParam({
                component: 'foxstudio',
                param: {
                    name: 'logo_enabled',
                    type: 'toggle',
                    default: false
                },
                field: {
                    name: 'foxstudio_logo_title'
                },
                onChange: function (val) {
                    if (val) {
                        loadScript('https://foxstudio24.github.io/lampa/logo.js');
                    }
                }
            });
        }
    });

    // --- Завантаження скриптів ---
    function loadScript(url) {
        const scr = document.createElement('script');
        scr.src = url;
        scr.onload = () => console.log('FoxStudio loaded:', url);
        scr.onerror = () => console.error('FoxStudio error loading', url);
        document.body.appendChild(scr);
    }

    console.log('FoxStudio Interface Plugin loaded');
})();
