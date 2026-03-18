(function () {
    'use strict';

    const PLUGIN_NAME = 'PluginManager';
    const PLUGIN_ID = 'plugin_manager';

    const AVAILABLE_PLUGINS = [
        {
            name: 'Mobile Interface',
            description: 'Мобільний інтерфейс картки фільму',
            url: 'https://crowley24.github.io/main/Mob_Interface.js',
            id: 'mob_interface'
        },
        {
            name: 'Custom Buttons',
            description: 'Кастомізація кнопок в картці фільму',
            url: 'http://lampaua.mooo.com/buttons.js',
            id: 'custom_buttons'
        }
    ];

    function isPluginInstalled(pluginId) {
        const plugins = Lampa.Storage.get('plugins') || [];
        return plugins.some(plugin => plugin.id === pluginId);
    }

    function installPlugin(plugin) {
        if (isPluginInstalled(plugin.id)) {
            Lampa.Noty.show('Плагін вже встановлено');
            return;
        }
        const plugins = Lampa.Storage.get('plugins') || [];
        plugins.push({
            id: plugin.id,
            name: plugin.name,
            url: plugin.url
        });
        Lampa.Storage.set('plugins', plugins);
        Lampa.Noty.show('Встановлено. Перезавантажте додаток');
    }

    function removePlugin(pluginId) {
        const plugins = Lampa.Storage.get('plugins') || [];
        const updatedPlugins = plugins.filter(plugin => plugin.id !== pluginId);
        Lampa.Storage.set('plugins', updatedPlugins);
        Lampa.Noty.show('Плагін видалено');
    }

    function showPluginsList() {
        const items = AVAILABLE_PLUGINS.map(plugin => {
            const installed = isPluginInstalled(plugin.id);
            return {
                title: plugin.name,
                description: plugin.description,
                status: installed ? 'Встановлено' : 'Не встановлено',
                onSelect: function () {
                    Lampa.Select.close(); // Закриваємо список перед питанням
                    Lampa.Modal.open({
                        title: installed ? 'Видалити?' : 'Встановити?',
                        html: `<div style="padding: 10px;">${plugin.name}</div>`,
                        onBack: () => Lampa.Modal.close(),
                        buttons: [
                            {
                                name: 'Так',
                                onSelect: () => {
                                    if (installed) removePlugin(plugin.id);
                                    else installPlugin(plugin);
                                    Lampa.Modal.close();
                                }
                            },
                            {
                                name: 'Відміна',
                                onSelect: () => Lampa.Modal.close()
                            }
                        ]
                    });
                }
            };
        });

        Lampa.Select.show({
            title: 'Менеджер плагінів',
            items: items,
            onSelect: (item) => item.onSelect(),
            onBack: () => Lampa.Settings.main()
        });
    }

    function addSettingsButton() {
        // Слухаємо відкриття розділів налаштувань
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'interface') {
                // Створюємо елемент кнопки
                const item = $(`
                    <div class="settings-param selector" data-name="plugin_manager_btn">
                        <div class="settings-param__name">Менеджер плагінів</div>
                        <div class="settings-param__value">Відкрити список</div>
                    </div>
                `);

                // Додаємо подію натискання
                item.on('hover:enter', function () {
                    showPluginsList();
                });

                // Вставляємо в кінець списку параметрів інтерфейсу
                e.body.append(item);
                
                // Оновлюємо навігацію контролера, щоб кнопку можна було вибрати пультом/курсором
                Lampa.Controller.updateSelect(e.body);
            }
        });
    }

    function startPlugin() {
        addSettingsButton();
        console.log('Plugin Manager: Ready');
    }

    // Запуск
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });

})();
