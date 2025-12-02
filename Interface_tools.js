(function () {
    'use strict';

    const DEF = {
        foxstudio_interface_enabled: true,
        necardify_enabled: false,
        logo_enabled: false
    };

    function loadScript(url) {
        const s = document.createElement('script');
        s.src = url;
        s.onerror = () => console.error('FoxStudio: ошибка загрузки', url);
        document.head.appendChild(s);
    }

    function init() {
        // === Переводы ===
        Lampa.Lang.add({
            foxstudio_tab: { ru: 'FoxStudio', en: 'FoxStudio', uk: 'FoxStudio' },
            foxstudio_interface: {
                ru: 'Новый интерфейс',
                en: 'New interface',
                uk: 'Новий інтерфейс'
            },
            foxstudio_necardify: {
                ru: 'Плагин Necardify',
                en: 'Necardify plugin',
                uk: 'Necardify плагін'
            },
            foxstudio_logo: {
                ru: 'Плагин Logo',
                en: 'Logo plugin',
                uk: 'Logo плагін'
            }
        });

        //
        // === РЕЄСТРАЦІЯ ВКЛАДКИ ===
        //
        Lampa.SettingsApi.addComponent({
            name: 'foxstudio',
            icon: 'magic',
            title: 'foxstudio_tab'
        });

        //
        // === ВІДМАЛЮВАННЯ ВКЛАДКИ ===
        //
        Lampa.SettingsApi.addRenderer('foxstudio', function (body) {
            body.empty(); // очищаємо

            function addSwitch(key, title, url) {
                let val = Lampa.Storage.get(key);

                if (val === null || val === undefined) {
                    val = DEF[key];
                    Lampa.Storage.set(key, val);
                }

                const item = $(`
                    <div class="settings-param selector" data-switch="${key}">
                        <div class="settings-param__name">${Lampa.Lang.translate(title)}</div>
                        <div class="settings-param__value">${val ? 'Вкл' : 'Выкл'}</div>
                    </div>
                `);

                item.on('hover:enter', function () {
                    val = !val;
                    Lampa.Storage.set(key, val);
                    item.find('.settings-param__value').text(val ? 'Вкл' : 'Выкл');

                    if (val && url) loadScript(url);
                });

                body.append(item);
            }

            // === Три перемикачі ===
            addSwitch('foxstudio_interface_enabled', 'foxstudio_interface', null);
            addSwitch('necardify_enabled', 'foxstudio_necardify', 'https://foxstudio24.github.io/lampa/necardify.js');
            addSwitch('logo_enabled', 'foxstudio_logo', 'https://foxstudio24.github.io/lampa/logo.js');
        });

        console.log('FoxStudio: вкладка успешно создана');
    }

    if (window.Lampa) init();
    else document.addEventListener('DOMContentLoaded', init);

})();
