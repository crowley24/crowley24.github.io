
(function () {
    'use strict';

    /*
     * CROWLEY PLUGIN MANAGER 3.5.0
     * Lampa / Android TV / Mobile
     *
     * CHANGES:
     * 1. Smart restart button
     * 2. Remember selected plugin
     * 3. Navigation without fixed 80ms timers
     * 4. HTTPS for Custom Buttons
     *
     * UNCHANGED:
     * - Exact URL comparison
     * - Four categories
     * - Twelve plugins
     * - One settings component
     * - No immediate plugin execution
     */

    var GLOBAL_KEY = 'crowley_plugin_manager_v35';

    if (window[GLOBAL_KEY]) return;
    window[GLOBAL_KEY] = true;

    var VERSION = '3.5.0';

    var ROOT = 'plugin_manager_page';
    var STORAGE_KEY = 'plugins';

    var initialized = false;
    var attempts = 0;
    var maxAttempts = 100;

    var pending = false;

    var rootRows = {};
    var selectedPlugins = {};

    var currentCategory = null;
    var currentPlugin = null;

    /* =====================================
       CATALOG
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
                        'https://crowley24.github.io/main/ButtonsManager+.js',

                    /*
                     * Existing HTTP installation
                     * is migrated separately below.
                     */
                    oldUrl:
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
            if (
                list[i] &&
                list[i].url === url
            ) {
                return list[i];
            }
        }

        return null;
    }

    function isEnabled(item) {
        if (!item) return false;

        return !(
            item.status === 0 ||
            item.status === false ||
            item.status === '0' ||
            item.status === 'false'
        );
    }

    function getState(url) {
        var item = findPlugin(url);

        if (!item) {
            return 'absent';
        }

        return isEnabled(item)
            ? 'enabled'
            : 'disabled';
    }

    function getCount(category) {
        var count = 0;

        category.plugins.forEach(function (plugin) {
            if (findPlugin(plugin.url)) {
                count++;
            }
        });

        return count;
    }

    /* =====================================
       HTTPS MIGRATION
       ===================================== */

    /*
     * This is a one-time migration for
     * the exact old Custom Buttons URL.
     *
     * No general URL normalization
     * or duplicate detection is added.
     */

    function migrateCustomButtons() {
        var oldUrl =
            'http://crowley24.github.io/main/ButtonsManager+.js';

        var newUrl =
            'https://crowley24.github.io/main/ButtonsManager+.js';

        var list = getPlugins();

        var oldItem = null;
        var newItem = null;

        for (var i = 0; i < list.length; i++) {
            if (!list[i]) continue;

            if (list[i].url === oldUrl) {
                oldItem = list[i];
            }

            if (list[i].url === newUrl) {
                newItem = list[i];
            }
        }

        if (!oldItem) return;

        if (newItem) {
            /*
             * Both exact addresses exist.
             * Keep the HTTPS record and
             * remove only the legacy one.
             */

            list = list.filter(function (item) {
                return item && item.url !== oldUrl;
            });
        } else {
            oldItem.url = newUrl;
        }

        savePlugins(list);
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
       RESTART STATE
       ===================================== */

    function markPending() {
        pending = true;

        /*
         * Only root restart row is updated.
         * No rebuilding of plugin menus.
         */

        updateRestartRow();
    }

    function restartLampa() {
        if (!pending) return;

        notify('♻️ Застосування змін...');

        window.location.reload();
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

        notify(
            '🟢 ' + plugin.name + ': встановлено'
        );
    }

    function enablePlugin(plugin) {
        var list = getPlugins();
        var changed = false;

        list.forEach(function (item) {
            if (
                item &&
                item.url === plugin.url &&
                !isEnabled(item)
            ) {
                item.status = 1;
                changed = true;
            }
        });

        if (!changed) return;

        savePlugins(list);
        markPending();

        notify(
            '🟢 ' + plugin.name + ': увімкнено'
        );
    }

    function disablePlugin(plugin) {
        var list = getPlugins();
        var changed = false;

        list.forEach(function (item) {
            if (
                item &&
                item.url === plugin.url &&
                isEnabled(item)
            ) {
                item.status = 0;
                changed = true;
            }
        });

        if (!changed) return;

        savePlugins(list);
        markPending();

        notify(
            '🟠 ' + plugin.name + ': вимкнено'
        );
    }

    function removePlugin(plugin) {
        var list = getPlugins();

        var filtered = list.filter(
            function (item) {
                return item && item.url !== plugin.url;
            }
        );

        if (filtered.length === list.length) {
            return;
        }

        savePlugins(filtered);
        markPending();

        notify(
            '🔴 ' + plugin.name + ': видалено'
        );
    }

    /* =====================================
       SELECT NAVIGATION
       ===================================== */

    /*
     * Lampa.Select normally closes the
     * current selection before invoking
     * its onSelect callback.
     *
     * Therefore the next menu can be
     * opened directly without 80ms timers.
     *
     * onBack restores the parent menu.
     */

    function showSelect(
        title,
        items,
        onSelect,
        onBack
    ) {
        Lampa.Select.show({
            title: title,
            items: items,

            onSelect: function (item) {
                if (
                    typeof onSelect === 'function'
                ) {
                    onSelect(item);
                }
            },

            onBack: function () {
                if (
                    typeof onBack === 'function'
                ) {
                    onBack();
                }
            }
        });
    }

    /* =====================================
       CATEGORY ITEMS
       ===================================== */

    function categoryItems(category) {
        var selectedId =
            selectedPlugins[category.id];

        return category.plugins.map(
            function (plugin) {
                var state = getState(plugin.url);

                var marker =
                    state === 'enabled'
                        ? '🟢'
                        : state === 'disabled'
                            ? '🟠'
                            : '🔴';

                return {
                    title:
                        marker + ' ' + plugin.name,

                    subtitle:
                        plugin.description,

                    plugin: plugin,

                    selected:
                        selectedId === plugin.id
                };
            }
        );
    }

    /* =====================================
       CATEGORY MENU
       ===================================== */

    function openCategory(category) {
        if (!category) return;

        currentCategory = category;

        showSelect(
            category.icon + ' ' + category.name,

            categoryItems(category),

            function (item) {
                if (
                    !item ||
                    !item.plugin
                ) return;

                selectedPlugins[category.id] =
                    item.plugin.id;

                currentPlugin = item.plugin;

                openPlugin(
                    item.plugin,
                    category
                );
            },

            function () {
                currentCategory = null;
                currentPlugin = null;

                /*
                 * Return to the native
                 * Settings component.
                 *
                 * No extra Select opened.
                 */
            }
        );
    }

    /* =====================================
       PLUGIN ACTION MENU
       ===================================== */

    function openPlugin(plugin, category) {
        currentPlugin = plugin;

        var state = getState(plugin.url);
        var items = [];

        if (state === 'absent') {
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

        showSelect(
            plugin.name,
            items,

            function (item) {
                if (!item) {
                    openCategory(category);
                    return;
                }

                if (item.action === 'remove') {
                    confirmRemove(
                        plugin,
                        category
                    );

                    return;
                }

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
                }

                /*
                 * Reopen the same category
                 * with the same plugin selected.
                 */

                selectedPlugins[category.id] =
                    plugin.id;

                openCategory(category);
            },

            function () {
                selectedPlugins[category.id] =
                    plugin.id;

                openCategory(category);
            }
        );
    }

    /* =====================================
       REMOVE CONFIRMATION
       ===================================== */

    function confirmRemove(plugin, category) {
        showSelect(
            'Видалити ' + plugin.name + '?',

            [
                {
                    title: 'Скасувати',
                    action: 'cancel'
                },
                {
                    title: '🔴 Видалити',
                    action: 'remove'
                }
            ],

            function (item) {
                if (
                    item &&
                    item.action === 'remove'
                ) {
                    removePlugin(plugin);
                }

                selectedPlugins[category.id] =
                    plugin.id;

                openCategory(category);
            },

            function () {
                selectedPlugins[category.id] =
                    plugin.id;

                openCategory(category);
            }
        );
    }

    /* =====================================
       ROOT UI
       ===================================== */

    function updateFolderRow(category) {
        var item = rootRows[
            'folder_' + category.id
        ];

        if (!item || !item.length) return;

        var description = item.find(
            '.settings-param__descr'
        ).first();

        if (description.length) {
            description.text(
                getCount(category) +
                ' із ' +
                category.plugins.length +
                ' встановлено'
            );
        }
    }

    function updateFolderRows() {
        CATEGORIES.forEach(function (category) {
            updateFolderRow(category);
        });
    }

    /* =====================================
       SMART RESTART BUTTON
       ===================================== */

    function injectStyles() {
        if (
            document.getElementById(
                'crowley-pm35-style'
            )
        ) return;

        var style = document.createElement('style');

        style.id = 'crowley-pm35-style';

        style.textContent = `
            .crowley-pm35-hidden {
                display: none !important;
            }

            .crowley-pm35-restart
            .settings-param__name {
                color: #ffad24;
            }
        `;

        document.head.appendChild(style);
    }

    function updateRestartRow() {
        var item = rootRows.restart;

        if (!item || !item.length) return;

        /*
         * This row exists only on
         * the manager's root page.
         *
         * It is hidden until at least
         * one plugin state changes.
         */

        item.toggleClass(
            'crowley-pm35-hidden',
            !pending
        );

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (title.length) {
            title.text(
                '♻️ Застосувати зміни'
            );
        }
    }

    /* =====================================
       SETTINGS COMPONENT
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
       CATEGORY BUTTONS
       ===================================== */

    function registerFolders() {
        CATEGORIES.forEach(function (category) {
            Lampa.SettingsApi.addParam({
                component: ROOT,

                param: {
                    name:
                        'crowley_pm35_folder_' +
                        category.id,

                    type: 'button'
                },

                field: {
                    name:
                        category.icon + '  ' +
                        category.name,

                    description:
                        getCount(category) +
                        ' із ' +
                        category.plugins.length +
                        ' встановлено'
                },

                onRender: function (item) {
                    rootRows[
                        'folder_' + category.id
                    ] = item;

                    updateFolderRow(category);
                },

                onChange: function () {
                    updateFolderRows();

                    openCategory(category);
                }
            });
        });
    }

    /* =====================================
       RESTART BUTTON
       ===================================== */

    function registerRestart() {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name: 'crowley_pm35_restart',
                type: 'button'
            },

            field: {
                name: '♻️ Застосувати зміни',

                description:
                    'Перезапустити Lampa для застосування змін'
            },

            onRender: function (item) {
                rootRows.restart = item;

                item.addClass(
                    'crowley-pm35-restart'
                );

                updateRestartRow();
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
            !Lampa.Select ||
            !Lampa.Select.show
        ) {
            return false;
        }

        initialized = true;

        /*
         * Preserve installed plugins.
         * Only migrate the one known
         * HTTP URL to HTTPS.
         */

        migrateCustomButtons();

        injectStyles();

        registerComponent();
        registerFolders();
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
            setTimeout(
                waitForLampa,
                200
            );
        } else {
            window[GLOBAL_KEY] = false;
        }
    }

    waitForLampa();

})();
