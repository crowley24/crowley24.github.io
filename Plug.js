(function() {
    'use strict';

    const AVAILABLE_PLUGINS = [
        {
            name: 'Mobile Interface',
            description: 'Мобільний інтерфейс картки фільму',
            url: 'https://crowley24.github.io/main/Mob_Interface.js',
            id: 'mob_interface'
        },
        {
            name: 'Mobile menu',
            description: 'Модефіковане нижнє меню для мобільних пристроїв',
            url: 'https://crowley24.github.io/NewMenu_Mob.js',
            id: 'NewMenu_Mob'
        },
        {
            name: 'Custom Buttons',
            description: 'Кастомізація кнопок в картці фільму',
            url: 'http://lampaua.mooo.com/buttons.js',
            id: 'custom_buttons'
        }
    ];

    // =========================
    // STORAGE
    // =========================
    function getPlugins() {
        return Lampa.Storage.get('plugins') || [];
    }

    function savePlugins(list) {
        Lampa.Storage.set('plugins', list);
    }

    function isInstalled(url) {
        return getPlugins().some(p => p.url === url);
    }

    // =========================
    // HOT LOAD
    // =========================
    function loadPlugin(url) {
        if (document.querySelector('script[data-plugin="' + url + '"]')) {
            return;
        }

        var script = document.createElement('script');
        script.src = url + '?v=' + Date.now();
        script.async = true;
        script.setAttribute('data-plugin', url);

        script.onload = function () {
            Lampa.Noty.show('⚡ Плагін підключено');
        };

        script.onerror = function () {
            Lampa.Noty.show('❌ Помилка завантаження');
        };

        document.body.appendChild(script);
    }

    // =========================
    // SMART RELOAD
    // =========================
    function softReload() {
        Lampa.Noty.show('♻️ Оновлення інтерфейсу...');
        setTimeout(() => location.reload(), 800);
    }

    // =========================
    // TOGGLE
    // =========================
    function togglePlugin(plugin) {
        let plugins = getPlugins();
        let installed = isInstalled(plugin.url);

        if (installed) {
            plugins = plugins.filter(p => p.url !== plugin.url);
            savePlugins(plugins);

            Lampa.Noty.show('🔴 Видалено');

            // ⚠️ не всі плагіни можна "вигрузити"
            setTimeout(() => {
                Lampa.Noty.show('⚠️ Для повного вимкнення може знадобитися оновлення');
            }, 500);

        } else {
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1
            });

            savePlugins(plugins);

            loadPlugin(plugin.url);
        }

        Lampa.Settings.update();
    }

    // =========================
    // UI INDICATOR
    // =========================
    function applyIndicator(item, installed) {
        let title = item.find('.settings-param__name');
        let indicator = title.find('.plugin-indicator');

        if (!indicator.length) {
            indicator = $('<span class="plugin-indicator"></span>');
            title.append(indicator);
        }

        indicator.css({
            display: 'inline-block',
            width: '10px',
            height: '10px',
            'margin-left': '10px',
            'border-radius': '50%',
            'vertical-align': 'middle',
            'background': installed ? '#11e400' : '#ff0000'
        });
    }

    // =========================
    // COMPONENT
    // =========================
    Lampa.SettingsApi.addComponent({
        component: 'plugin_manager_page',
        name: 'Менеджер Плагінів',
        icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2"/></svg>'
    });

    // =========================
    // GLOBAL BUTTON (RELOAD)
    // =========================
    Lampa.SettingsApi.addParam({
        component: 'plugin_manager_page',
        param: {
            name: 'reload_all',
            type: 'button'
        },
        field: {
            name: '♻️ Оновити застосунок',
            description: 'Швидкий рестарт без виходу'
        },
        onChange: function () {
            softReload();
        }
    });

    // =========================
    // PLUGINS LIST
    // =========================
    AVAILABLE_PLUGINS.forEach(plugin => {
        Lampa.SettingsApi.addParam({
            component: 'plugin_manager_page',
            param: {
                name: plugin.id,
                type: 'button'
            },
            field: {
                name: plugin.name,
                description: plugin.description
            },

            onRender: function (item) {
                let installed = isInstalled(plugin.url);
                applyIndicator(item, installed);
            },

            onChange: function () {
                togglePlugin(plugin);
            }
        });
    });

})();
