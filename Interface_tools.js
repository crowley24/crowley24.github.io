(function () {
    'use strict';

    var default_settings = {
        foxstudio_interface_enabled: true,
        necardify_enabled: false,
        logo_enabled: false
    };

    function loadScript(url) {
        var s = document.createElement('script');
        s.src = url;
        s.onerror = () => console.error('Ошибка загрузки:', url);
        document.head.appendChild(s);
    }

    function init() {

        // === Переводы ===
        Lampa.Lang.add({
            foxstudio_title: { ru: 'FoxStudio', en: 'FoxStudio', uk: 'FoxStudio' },
            foxstudio_interface_title: {
                ru: 'Новый интерфейс',
                en: 'New interface',
                uk: 'Новий інтерфейс'
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

        // === Додаємо кнопку вкладки у основне меню ===
        Lampa.SettingsApi.addComponent({
            name: 'foxstudio',
            title: 'foxstudio_title',
            icon: 'magic'
        });

        // === Відмалювання контенту вкладки ===
        Lampa.SettingsApi.addRenderer('foxstudio', function (body) {

            body.empty();

            function addToggle(name, title_key, script_url) {
                let value = Lampa.Storage.get(name, default_settings[name]);

                let item = $(`
                    <div class="settings-param selector" data-name="${name}">
                        <div class="settings-param__name">${Lampa.Lang.translate(title_key)}</div>
                        <div class="settings-param__value">${value ? 'Вкл' : 'Выкл'}</div>
                    </div>
                `);

                item.on('hover:enter', function () {
                    value = !value;
                    Lampa.Storage.set(name, value);
                    item.find('.settings-param__value').text(value ? 'Вкл' : 'Выкл');

                    if (value && script_url) loadScript(script_url);
                });

                body.append(item);
            }

            // === Елементи у вкладці ===
            addToggle('foxstudio_interface_enabled', 'foxstudio_interface_title', null);
            addToggle('necardify_enabled', 'foxstudio_necardify_title', 'https://foxstudio24.github.io/lampa/necardify.js');
            addToggle('logo_enabled', 'foxstudio_logo_title', 'https://foxstudio24.github.io/lampa/logo.js');
        });

        console.log('FoxStudio вкладка загружена');
    }

    if (window.Lampa) init();
    else document.addEventListener('DOMContentLoaded', init);

})();
