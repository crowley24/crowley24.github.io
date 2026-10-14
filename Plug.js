
(function () {
    'use strict';

    /*
     * CROWLEY PLUGIN MANAGER 3.3.0
     * Lampa / Android TV / Mobile
     *
     * FIX:
     * - No UI rebuild after plugin actions
     * - No hot loading
     * - Stable plugin action menus
     * - Safe restart
     * - Folder navigation
     * - Storage compatibility
     */

    var GLOBAL_KEY = 'crowley_plugin_manager_v33';

    if (window[GLOBAL_KEY]) return;
    window[GLOBAL_KEY] = true;

    var VERSION = '3.3.0';

    var ROOT = 'plugin_manager_page';
    var STORAGE_KEY = 'plugins';

    var initialized = false;
    var attempts = 0;
    var maxAttempts = 100;

    var currentCategory = null;
    var pending = false;
    var rendered = {};

    /* =====================================
       PLUGIN CATALOG
       ===================================== */

    var CATEGORIES = [
        {
            id: 'online',
            name: 'Онлайн-перегляд',
            icon: '▶',
            plugins: [
                {
                    id: 'Uakino',
                    name: 'UaKino',
                    description:
                        'Автоматичне програвання фільмів та серіалів з uakino.ax',
                    url:
                        'https://crowley24.github.io/main/Uakino.js'
                }
            ]
        },
        {
            id: 'interface',
            name: 'Інтерфейс',
            icon: '▣',
            plugins: [
                {
                    id: 'NewCard',
                    name: 'NewCard',
                    description:
                        'Сучасний ТВ-інтерфейс картки фільму',
                    url:
                        'https://crowley24.github.io/main/NewCard.js'
                },
                {
                    id: 'mob_interface',
                    name: 'Mobile Interface',
                    description:
                        'Адаптивний мобільний інтерфейс картки фільму',
                    url:
                        'https://crowley24.github.io/main/Mob_Interface.js'
                },
                {
                    id: 'NewMenu_Mob',
                    name: 'Mobile Menu',
                    description:
                        'Оновлене нижнє меню для мобільних пристроїв',
                    url:
                        'https://crowley24.github.io/NewMenu_Mob.js'
                },
                {
                    id: 'custom_buttons',
                    name: 'Custom Buttons',
                    description:
                        'Розширена кастомізація кнопок картки фільму',
                    url:
                        'http://crowley24.github.io/main/ButtonsManager+.js'
                },
                {
                    id: 'InterfaceSize',
                    name: 'Interface Size',
                    description:
                        'Зміна розміру інтерфейсу',
                    url:
                        'https://crowley24.github.io/main/InterfaceSize.js'
                },
                {
                    id: 'InterfaceHize',
                    name: 'Interface Hide',
                    description:
                        'Приховування елементів меню',
                    url:
                        'https://crowley24.github.io/interface_hide.js'
                }
            ]
        },
        {
            id: 'movies',
            name: 'Фільми та персоналізація',
            icon: '★',
            plugins: [
                {
                    id: 'UA-Finder',
                    name: 'Finder UA',
                    description:
                        'Бейдж українського дубляжу',
                    url:
                        'https://crowley24.github.io/main/UA-Finder+Mod.js'
                },
                {
                    id: 'Watching',
                    name: 'Continue Watching',
                    description:
                        'Історія перегляду на головній сторінці',
                    url:
                        'https://crowley24.github.io/Watching.js'
                },
                {
                    id: 'Random',
                    name: 'Random',
                    description:
                        'Випадкова добірка фільмів',
                    url:
                        'https://crowley24.github.io/main/Random.js'
                }
            ]
        },
        {
            id: 'tools',
            name: 'Додаткові інструменти',
            icon: '⚙',
            plugins: [
                {
                    id: 'Clock',
                    name: 'Clock',
                    description:
                        'Стильний годинник',
                    url:
                        'https://crowley24.github.io/main/Clock.js'
                },
                {
                    id: 'Ukr',
                    name: 'Ukrainisation',
                    description:
                        'Лагідна Українізація',
                    url:
                        'https://crowley24.github.io/main/Ukr.js'
                }
            ]
        }
    ];

    /* =====================================
       STORAGE
       ===================================== */

    function getPlugins() {
        var list = Lampa.Storage.get(STORAGE_KEY);
        return Array.isArray(list) ? list : [];
    }

    function savePlugins(list) {
        Lampa.Storage.set(STORAGE_KEY, list);
    }

    function findPlugin(url) {
        var list = getPlugins();

        for (var i = 0; i < list.length; i++) {
            if (list[i] && list[i].url === url) {
                return list[i];
            }
        }

        return null;
    }

    function isEnabled(plugin) {
        if (!plugin) return false;

        return !(
            plugin.status === 0 ||
            plugin.status === false ||
            plugin.status === '0' ||
            plugin.status === 'false'
        );
    }

    function getState(url) {
        var plugin = findPlugin(url);

        if (!plugin) return 'not_installed';

        return isEnabled(plugin)
            ? 'enabled'
            : 'disabled';
    }

    function getCategoryCount(category) {
        var count = 0;

        category.plugins.forEach(function (plugin) {
            if (findPlugin(plugin.url)) count++;
        });

        return count;
    }

    /* =====================================
       NOTIFICATIONS
       ===================================== */

    function notify(message) {
        if (
            Lampa.Noty &&
            typeof Lampa.Noty.show === 'function'
        ) {
            Lampa.Noty.show(message);
        }
    }

    /* =====================================
       RESTART
       ===================================== */

    function markPending() {
        pending = true;

        /*
         * Не викликаємо refreshUI().
         * Це важливо для стабільності
         * навігації Lampa.
         */

        updateRestartLabel();
    }

    function restartLampa() {
        notify('♻️ Перезапуск Lampa...');

        setTimeout(function () {
            window.location.reload();
        }, 500);
    }

    /* =====================================
       PLUGIN ACTIONS
       ===================================== */

    function installPlugin(plugin) {
        if (findPlugin(plugin.url)) return;

        var list = getPlugins();

        list.push({
            id: plugin.id,
            name: plugin.name,
            url: plugin.url,
            status: 1
        });

        savePlugins(list);

        markPending();
        updatePluginIndicator(plugin);
        updateFolderCounts();

        notify('🟢 Плагін встановлено');
    }

    function enablePlugin(plugin) {
        var list = getPlugins();

        list.forEach(function (item) {
            if (item && item.url === plugin.url) {
                item.status = 1;
            }
        });

        savePlugins(list);

        markPending();
        updatePluginIndicator(plugin);

        notify('🟢 Плагін увімкнено');
    }

    function disablePlugin(plugin) {
        var list = getPlugins();

        list.forEach(function (item) {
            if (item && item.url === plugin.url) {
                item.status = 0;
            }
        });

        savePlugins(list);

        markPending();
        updatePluginIndicator(plugin);

        notify('🟠 Плагін вимкнено');
    }

    function removePlugin(plugin) {
        var list = getPlugins().filter(
            function (item) {
                return item && item.url !== plugin.url;
            }
        );

        savePlugins(list);

        markPending();
        updatePluginIndicator(plugin);
        updateFolderCounts();

        notify('🔴 Плагін видалено');
    }

    /* =====================================
       CONFIRM REMOVE
       ===================================== */

    function confirmRemove(plugin) {
        Lampa.Select.show({
            title: 'Видалити ' + plugin.name + '?',

            items: [
                {
                    title: 'Скасувати',
                    action: 'cancel'
                },
                {
                    title: '🔴 Видалити плагін',
                    action: 'confirm'
                }
            ],

            onSelect: function (item) {
                if (
                    item &&
                    item.action === 'confirm'
                ) {
                    removePlugin(plugin);
                }
            },

            onBack: function () {}
        });
    }

    /* =====================================
       PLUGIN ACTION MENU
       ===================================== */

    function showPluginMenu(plugin) {
        var state = getState(plugin.url);
        var items = [];

        if (state === 'not_installed') {
            items.push({
                title: '🟢 Встановити',
                action: 'install'
            });
        } else {
            if (state === 'enabled') {
                items.push({
                    title: '🟠 Вимкнути',
                    action: 'disable'
                });
            } else {
                items.push({
                    title: '🟢 Увімкнути',
                    action: 'enable'
                });
            }

            items.push({
                title: '🔴 Видалити',
                action: 'remove'
            });
        }

        Lampa.Select.show({
            title: plugin.name,
            items: items,

            onSelect: function (item) {
                if (!item) return;

                switch (item.action) {
                    case 'install':
                        installPlugin(plugin);
                        break;

                    case 'enable':
                        enablePlugin(plugin);
                        break;

                    case 'disable':
                        disablePlugin(plugin);
                        break;

                    case 'remove':
                        confirmRemove(plugin);
                        break;
                }
            },

            onBack: function () {}
        });
    }

    /* =====================================
       STYLES
       ===================================== */

    function injectStyles() {
        if (
            document.getElementById(
                'crowley-pm33-styles'
            )
        ) return;

        var style = document.createElement('style');
        style.id = 'crowley-pm33-styles';

        style.textContent = `
            .crowley-pm33-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                min-width: 10px;
                margin-left: 10px;
                border-radius: 50%;
                vertical-align: middle;
            }

            .crowley-pm33-indicator.enabled {
                background: #11e400;
                box-shadow:
                    0 0 6px rgba(17,228,0,.35);
            }

            .crowley-pm33-indicator.disabled {
                background: #ffad24;
                box-shadow:
                    0 0 6px rgba(255,173,36,.35);
            }

            .crowley-pm33-indicator.not_installed {
                background: #ff3030;
                box-shadow:
                    0 0 6px rgba(255,48,48,.3);
            }

            .crowley-pm33-count {
                margin-left: 10px;
                font-size: .75em;
                opacity: .65;
            }

            .crowley-pm33-hidden {
                display: none !important;
            }

            .crowley-pm33-restart {
                color: #ffad24;
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       UI HELPERS
       ===================================== */

    function setVisible(item, visible) {
        if (!item || !item.length) return;

        item.toggleClass(
            'crowley-pm33-hidden',
            !visible
        );
    }

    function applyIndicator(item, plugin) {
        if (!item || !item.length) return;

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (!title.length) return;

        var indicator = title.find(
            '.crowley-pm33-indicator'
        );

        if (!indicator.length) {
            indicator = $(
                '<span class="crowley-pm33-indicator"></span>'
            );

            title.append(indicator);
        }

        indicator.removeClass(
            'enabled disabled not_installed'
        );

        indicator.addClass(
            getState(plugin.url)
        );
    }

    function updatePluginIndicator(plugin) {
        var item = rendered[
            'plugin_' + plugin.id
        ];

        if (item) {
            applyIndicator(item, plugin);
        }
    }

    function applyFolderCount(item, category) {
        if (!item || !item.length) return;

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (!title.length) return;

        var count = title.find(
            '.crowley-pm33-count'
        );

        if (!count.length) {
            count = $(
                '<span class="crowley-pm33-count"></span>'
            );

            title.append(count);
        }

        count.text(
            getCategoryCount(category) +
            ' / ' +
            category.plugins.length
        );
    }

    function updateFolderCounts() {
        CATEGORIES.forEach(function (category) {
            var item = rendered[
                'folder_' + category.id
            ];

            if (item) {
                applyFolderCount(
                    item,
                    category
                );
            }
        });
    }

    function updateRestartLabel() {
        var item = rendered.restart;

        if (!item || !item.length) return;

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (!title.length) return;

        title.text(
            pending
                ? '♻️ Застосувати зміни'
                : '♻️ Перезапуск Lampa'
        );
    }

    /* =====================================
       FOLDER NAVIGATION
       ===================================== */

    function openCategory(id) {
        currentCategory = id;
        updateFolderView();
    }

    function closeCategory() {
        currentCategory = null;
        updateFolderView();
    }

    /*
     * Ця функція викликається
     * ТІЛЬКИ під час переходу
     * між папками.
     *
     * Після зміни стану плагіна
     * вона НЕ викликається.
     */

    function updateFolderView() {
        CATEGORIES.forEach(function (category) {
            var folder = rendered[
                'folder_' + category.id
            ];

            setVisible(
                folder,
                currentCategory === null
            );

            category.plugins.forEach(function (plugin) {
                var item = rendered[
                    'plugin_' + plugin.id
                ];

                setVisible(
                    item,
                    currentCategory === category.id
                );
            });
        });

        setVisible(
            rendered.back,
            currentCategory !== null
        );

        updateFolderCounts();
        updateRestartLabel();
    }

    /* =====================================
       ROOT COMPONENT
       ===================================== */

    function registerComponent() {
        Lampa.SettingsApi.addComponent({
            component: ROOT,
            name: 'Менеджер Плагінів',

            icon:
                '<svg width="40" height="40" ' +
                'viewBox="0 0 24 24" fill="none">' +
                '<path d="M12 6V18M6 12H18" ' +
                'stroke="white" stroke-width="2"/>' +
                '</svg>'
        });
    }

    /* =====================================
       BACK BUTTON
       ===================================== */

    function registerBack() {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name: 'crowley_pm33_back',
                type: 'button'
            },

            field: {
                name: '← Назад до категорій',
                description:
                    'Повернутися до списку папок'
            },

            onRender: function (item) {
                rendered.back = item;
                updateFolderView();
            },

            onChange: function () {
                closeCategory();
            }
        });
    }

    /* =====================================
       FOLDERS
       ===================================== */

    function registerFolder(category) {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name:
                    'crowley_pm33_folder_' +
                    category.id,
                type: 'button'
            },

            field: {
                name:
                    category.icon + '  ' +
                    category.name,
                description:
                    'Відкрити список плагінів'
            },

            onRender: function (item) {
                rendered[
                    'folder_' + category.id
                ] = item;

                updateFolderView();
            },

            onChange: function () {
                openCategory(category.id);
            }
        });
    }

    /* =====================================
       PLUGIN ITEMS
       ===================================== */

    function registerPlugin(category, plugin) {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name:
                    'crowley_pm33_plugin_' +
                    plugin.id,
                type: 'button'
            },

            field: {
                name: plugin.name,
                description: plugin.description
            },

            onRender: function (item) {
                rendered[
                    'plugin_' + plugin.id
                ] = item;

                applyIndicator(
                    item,
                    plugin
                );

                updateFolderView();
            },

            onChange: function () {
                showPluginMenu(plugin);
            }
        });
    }

    /* =====================================
       RESTART BUTTON
       ===================================== */

    function registerRestart() {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name: 'crowley_pm33_restart',
                type: 'button'
            },

            field: {
                name: '♻️ Перезапуск Lampa',
                description:
                    'Застосувати зміни та перезапустити'
            },

            onRender: function (item) {
                rendered.restart = item;

                item.addClass(
                    'crowley-pm33-restart'
                );

                updateRestartLabel();
            },

            onChange: function () {
                restartLampa();
            }
        });
    }

    /* =====================================
       INIT
       ===================================== */

    function init() {
        if (initialized) return true;

        if (
            !window.Lampa ||
            !Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam ||
            !Lampa.Storage ||
            !Lampa.Select
        ) {
            return false;
        }

        initialized = true;

        injectStyles();

        registerComponent();

        registerBack();

        CATEGORIES.forEach(function (category) {
            registerFolder(category);
        });

        CATEGORIES.forEach(function (category) {
            category.plugins.forEach(
                function (plugin) {
                    registerPlugin(
                        category,
                        plugin
                    );
                }
            );
        });

        registerRestart();

        return true;
    }

    /* =====================================
       WAIT FOR LAMPA
       ===================================== */

    function waitForLampa() {
        if (init()) return;

        attempts++;

        if (attempts < maxAttempts) {
            setTimeout(waitForLampa, 200);
        } else {
            window[GLOBAL_KEY] = false;
        }
    }

    waitForLampa();

})();
