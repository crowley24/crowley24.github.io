(function() {
    'use strict';

    var plugin_info = {
        name: 'FoxStudio Interface',
        version: '2.0.0',
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
        script.onerror = function () {
            console.error('FoxStudio: ошибка загрузки скрипта:', url);
        };
        document.head.appendChild(script);
    }

    function init() {

        // Переводы
        Lampa.Lang.add({
            foxstudio_menu_title: {
                ru: 'FoxStudio',
                en: 'FoxStudio',
                uk: 'FoxStudio'
            },
            foxstudio_interface_title: {
                ru: 'Новый интерфейс для ТВ и ПК',
                en: 'New interface for TV and PC',
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

        // Регистрируем новую вкладку
        Lampa.SettingsApi.addComponent({
            name: 'foxstudio_settings',
            icon: 'magic',
            title: 'foxstudio_menu_title'
        });

        // Формируем содержимое вкладки
        Lampa.SettingsApi.addParam({
            component: 'foxstudio_settings',
            param: {
                name: 'foxstudio_interface_enabled',
                type: 'toggle',
                default: default_settings.foxstudio_interface_enabled,
                title: 'foxstudio_interface_title'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'foxstudio_settings',
            param: {
                name: 'necardify_enabled',
                type: 'toggle',
                default: default_settings.necardify_enabled,
                title: 'foxstudio_necardify_title',
                onChange: function(value) {
                    if (value) {
                        loadScript('https://foxstudio24.github.io/lampa/necardify.js');
                    }
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'foxstudio_settings',
            param: {
                name: 'logo_enabled',
                type: 'toggle',
                default: default_settings.logo_enabled,
                title: 'foxstudio_logo_title',
                onChange: function(value) {
                    if (value) {
                        loadScript('https://foxstudio24.github.io/lampa/logo.js');
                    }
                }
            }
        });

        console.log('FoxStudio Settings: вкладка успешно добавлена');
    }

    if (window.Lampa) init();
    else document.addEventListener('DOMContentLoaded', init);

})();
