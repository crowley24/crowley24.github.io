
(function () {
    'use strict';

    /*
     * CROWLEY PLUGIN MANAGER 3.6.0 PREMIUM
     * Lampa / Android TV / Mobile
     *
     * Premium UI
     * Compact status indicators
     * SVG category icons
     * Back navigation
     * Restart after changes
     */

    var VERSION = '3.6.0';
    var READY = 'crowley_plugin_manager_v360';
    var ROOT = 'plugin_manager_page';
    var STORAGE = 'plugins';
    var STYLE_ID = 'crowley-pm360-style';

    if (window[READY]) return;
    window[READY] = true;

    var initialized = false;
    var attempts = 0;
    var pending = false;

    var selected = {};
    var rows = {};

    var menuDepth = 0;
    var navigationLock = false;
    var navigationTimer = null;

    /* =====================================
       ICONS
       ===================================== */

    function svgIcon(type, size) {
        size = size || 24;

        var paths = {
            play:
                '<circle cx="12" cy="12" r="9"/>' +
                '<path d="m10 8 6 4-6 4z"/>',

            layout:
                '<rect x="3" y="3" width="18" height="18" rx="3"/>' +
                '<path d="M3 9h18M9 9v12"/>',

            movies:
                '<rect x="3" y="7" width="18" height="14" rx="2"/>' +
                '<path d="M3 7 6 3h15l-3 4M8 3l-3 4M15 3l-3 4"/>' +
                '<path d="m10 11 5 3-5 3z"/>',

            tools:
                '<path d="M4 7h16M4 17h16"/>' +
                '<circle cx="9" cy="7" r="2"/>' +
                '<circle cx="15" cy="17" r="2"/>',

            grid:
                '<rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
                '<rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
                '<rect x="3" y="14" width="7" height="7" rx="1.5"/>' +
                '<rect x="14" y="14" width="7" height="7" rx="1.5"/>',

            refresh:
                '<path d="M20 7v5h-5"/>' +
                '<path d="M4 17v-5h5"/>' +
                '<path d="M5.5 9A7 7 0 0 1 18 6l2 1"/>' +
                '<path d="M18.5 15A7 7 0 0 1 6 18l-2-1"/>'
        };

        return (
            '<svg xmlns="http://www.w3.org/2000/svg" ' +
            'width="' + size + '" ' +
            'height="' + size + '" ' +
            'viewBox="0 0 24 24" ' +
            'fill="none" ' +
            'stroke="currentColor" ' +
            'stroke-width="1.8" ' +
            'stroke-linecap="round" ' +
            'stroke-linejoin="round">' +
            (paths[type] || paths.grid) +
            '</svg>'
        );
    }

    /* =====================================
       PLUGIN CATALOG
       ===================================== */

    var CATEGORIES = [
        {
            id: 'online',
            name: 'Онлайн-перегляд',
            icon: 'play',
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
            icon: 'layout',
            plugins: [
                {
                    id: 'interface+',
                    name: 'Interface+',
                    description:
                        'Кастомізація головної сторінки в стилі Netflix',
                    url:
                        'https://crowley24.github.io/main/Interface+.js'
                },
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
                        'Мобільний інтерфейс картки фільму',
                    url:
                        'https://crowley24.github.io/main/Mob_Interface.js'
                },
                {
                    id: 'NewMenu_Mob',
                    name: 'Mobile Menu',
                    description:
                        'Оновлене мобільне меню',
                    url:
                        'https://crowley24.github.io/main/NewMenu_Mob.js'
                },
                {
                    id: 'custom_buttons',
                    name: 'Custom Buttons',
                    description:
                        'Налаштування кнопок картки фільму',
                    url:
                        'https://crowley24.github.io/main/ButtonsManager+.js'
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
                        'Приховування елементів інтерфейсу',
                    url:
                        'https://crowley24.github.io/interface_hide.js'
                }
            ]
        },
        {
            id: 'movies',
            name: 'Фільми та персоналізація',
            icon: 'movies',
            plugins: [
                {
                    id: 'Watching',
                    name: 'Continue Watching',
                    description:
                        'Продовження перегляду',
                    url:
                        'https://crowley24.github.io/main/Watching.js'
                },
                {
                    id: 'Channels_sort',
                    name: 'Channels sort',
                    description:
                        'Персоналізація каналів на головній сторінці через меню "Канали"',
                    url:
                        'https://crowley24.github.io/main/Channels_sort.js'
                },
                {
                    id: 'Bookmarks',
                    name: 'Personal Bookmarks',
                    description:
                        'Персональні папки в меню "Вибране"',
                    url:
                        'https://crowley24.github.io/main/Bookmarks.js'
                },
                {
                    id: 'UA-Finder',
                    name: 'Finder UA',
                    description:
                        'Бейдж українського дубляжу',
                    url:
                        'https://crowley24.github.io/main/UA-Finder+Mod.js'
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
            icon: 'tools',
            plugins: [
                {
                    id: 'Clock',
                    name: 'Clock',
                    description:
                        'Годинник для Lampa',
                    url:
                        'https://crowley24.github.io/main/Clock.js'
                },
                {
                    id: 'Ukr',
                    name: 'Ukrainisation',
                    description:
                        'Українізація інтерфейсу',
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
        var data = Lampa.Storage.get(STORAGE);

        return Array.isArray(data) ? data : [];
    }

    function savePlugins(data) {
        Lampa.Storage.set(STORAGE, data);
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

    function isEnabled(item) {
        if (!item) return false;

        return !(
            item.status === 0 ||
            item.status === false ||
            item.status === '0' ||
            item.status === 'false'
        );
    }

    function getState(plugin) {
        var item = findPlugin(plugin.url);

        if (!item) return 'absent';

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
       URL MIGRATION
       ===================================== */

    function migrateCustomButtons() {
        var oldUrl =
            'http://crowley24.github.io/main/ButtonsManager+.js';

        var newUrl =
            'https://crowley24.github.io/main/ButtonsManager+.js';

        var list = getPlugins();
        var hasNew = false;
        var changed = false;

        list.forEach(function (item) {
            if (item && item.url === newUrl) {
                hasNew = true;
            }
        });

        if (hasNew) {
            var filtered = list.filter(function (item) {
                return item && item.url !== oldUrl;
            });

            if (filtered.length !== list.length) {
                savePlugins(filtered);
            }

            return;
        }

        list.forEach(function (item) {
            if (item && item.url === oldUrl) {
                item.url = newUrl;
                changed = true;
            }
        });

        if (changed) {
            savePlugins(list);
        }
    }

    /* =====================================
       PLUGIN ACTIONS
       ===================================== */

    function markPending() {
        pending = true;
        updateRestartRow();
    }

    function restartLampa() {
        if (!pending) return;

        notify('Застосування змін...');

        window.location.reload();
    }

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

        notify(plugin.name + ': встановлено');
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

        notify(plugin.name + ': увімкнено');
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

        notify(plugin.name + ': вимкнено');
    }

    function removePlugin(plugin) {
        var list = getPlugins();

        var filtered = list.filter(function (item) {
            return item && item.url !== plugin.url;
        });

        if (filtered.length === list.length) {
            return;
        }

        savePlugins(filtered);
        markPending();

        notify(plugin.name + ': видалено');
    }

    /* =====================================
       PREMIUM STYLES
       ===================================== */

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
            /*
             * CROWLEY PREMIUM UI
             */

            .crowley-pm-hidden {
                display: none !important;
            }

            .crowley-pm-folder {
                transition:
                    background-color .18s ease,
                    transform .18s ease;
            }

            .crowley-pm-folder .settings-param__name {
                font-weight: 500;
                letter-spacing: .1px;
            }

            .crowley-pm-folder .settings-param__descr {
                opacity: .68;
                font-size: .9em;
            }

            .crowley-pm-folder .crowley-pm-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                vertical-align: middle;
                margin-right: 12px;
                opacity: .85;
            }

            .crowley-pm-icon svg {
                display: block;
                width: 22px;
                height: 22px;
            }

            .crowley-pm-restart
            .settings-param__name {
                color: #e8b86b;
            }

            /*
             * Select rows are marked only while
             * a Crowley menu is open.
             */

            .crowley-pm-select-row {
                position: relative;
                transition:
                    background-color .16s ease,
                    opacity .16s ease;
            }

            .crowley-pm-select-row.focus,
            .crowley-pm-select-row.focused {
                border-radius: 10px;
            }

            /*
             * Compact status indicator.
             * A small colored dot is drawn with
             * CSS instead of a large emoji.
             */

            .crowley-pm-status-enabled,
            .crowley-pm-status-disabled,
            .crowley-pm-status-absent {
                position: relative;
            }

            .crowley-pm-status-enabled:before,
            .crowley-pm-status-disabled:before,
            .crowley-pm-status-absent:before {
                content: '';
                position: absolute;
                left: 13px;
                top: 50%;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                transform: translateY(-50%);
                pointer-events: none;
            }

            .crowley-pm-status-enabled:before {
                background: #36c58b;
                box-shadow:
                    0 0 0 3px rgba(54,197,139,.12);
            }

            .crowley-pm-status-disabled:before {
                background: #e5a54b;
                box-shadow:
                    0 0 0 3px rgba(229,165,75,.12);
            }

            .crowley-pm-status-absent:before {
                background: #9096a1;
                box-shadow:
                    0 0 0 3px rgba(144,150,161,.12);
            }

            .crowley-pm-status-enabled,
            .crowley-pm-status-disabled,
            .crowley-pm-status-absent {
                padding-left: 19px;
            }

            .crowley-pm-action-danger {
                color: #e58b8b;
            }

            @media (max-width: 600px) {
                .crowley-pm-folder
                .crowley-pm-icon {
                    margin-right: 9px;
                }

                .crowley-pm-icon svg {
                    width: 19px;
                    height: 19px;
                }

                .crowley-pm-status-enabled:before,
                .crowley-pm-status-disabled:before,
                .crowley-pm-status-absent:before {
                    width: 6px;
                    height: 6px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .crowley-pm-folder,
                .crowley-pm-select-row {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       SELECT DECORATION
       ===================================== */

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function decorateSelect(items) {
        /*
         * The original Select item titles remain
         * plain text for compatibility.
         *
         * The DOM is decorated after rendering.
         */

        var retries = 0;

        function apply() {
            if (menuDepth <= 0) return;

            var root = document.querySelector(
                '.selectbox, .select, .select-modal'
            );

            if (!root) {
                retries++;

                if (retries < 8) {
                    setTimeout(apply, 45);
                }

                return;
            }

            var candidates = root.querySelectorAll(
                '.selectbox-item, .select__item, .selector-item'
            );

            if (!candidates.length) {
                retries++;

                if (retries < 8) {
                    setTimeout(apply, 45);
                }

                return;
            }

            for (
                var i = 0;
                i < candidates.length && i < items.length;
                i++
            ) {
                var element = candidates[i];
                var item = items[i];

                element.classList.add(
                    'crowley-pm-select-row'
                );

                element.classList.remove(
                    'crowley-pm-status-enabled',
                    'crowley-pm-status-disabled',
                    'crowley-pm-status-absent',
                    'crowley-pm-action-danger'
                );

                if (item.pmState) {
                    element.classList.add(
                        'crowley-pm-status-' +
                        item.pmState
                    );
                }

                if (item.action === 'remove') {
                    element.classList.add(
                        'crowley-pm-action-danger'
                    );
                }
            }
        }

        setTimeout(apply, 30);
    }

    /* =====================================
       NAVIGATION
       ===================================== */

    function restoreSettingsController() {
        menuDepth = 0;

        updateFolderRows();
        updateRestartRow();

        if (
            Lampa.Controller &&
            typeof Lampa.Controller.toggle === 'function'
        ) {
            Lampa.Controller.toggle(
                'settings_component'
            );
        }
    }

    function showSelect(options) {
        if (!Lampa.Select || !Lampa.Select.show) {
            return;
        }

        menuDepth = 1;

        var originalBack = options.onBack;
        var originalSelect = options.onSelect;

        options.onBack = function () {
            if (navigationLock) return;

            navigationLock = true;

            try {
                if (typeof originalBack === 'function') {
                    originalBack();
                } else {
                    restoreSettingsController();
                }
            } finally {
                clearTimeout(navigationTimer);

                navigationTimer = setTimeout(function () {
                    navigationLock = false;
                }, 120);
            }
        };

        options.onSelect = function (item) {
            if (typeof originalSelect === 'function') {
                originalSelect(item);
            }
        };

        Lampa.Select.show(options);

        decorateSelect(options.items || []);
    }

    /* =====================================
       CATEGORY MENU
       ===================================== */

    function buildCategoryItems(category) {
        return category.plugins.map(function (plugin) {
            var state = getState(plugin);

            var statusText =
                state === 'enabled'
                    ? 'Активний'
                    : state === 'disabled'
                        ? 'Вимкнений'
                        : 'Не встановлено';

            return {
                title: plugin.name,

                subtitle:
                    plugin.description +
                    '  ·  ' +
                    statusText,

                plugin: plugin,

                pmState: state,

                selected:
                    selected[category.id] === plugin.id
            };
        });
    }

    function openCategory(category) {
        if (!category) return;

        var items = buildCategoryItems(category);

        showSelect({
            title: category.name,

            items: items,

            onSelect: function (item) {
                if (!item || !item.plugin) {
                    return;
                }

                selected[category.id] =
                    item.plugin.id;

                openPlugin(item.plugin, category);
            },

            onBack: function () {
                restoreSettingsController();
            }
        });
    }

    /* =====================================
       PLUGIN ACTION MENU
       ===================================== */

    function openPlugin(plugin, category) {
        var state = getState(plugin);
        var items = [];

        if (state === 'absent') {
            items.push({
                title: 'Встановити',
                subtitle: 'Додати плагін до Lampa',
                action: 'install'
            });
        } else {
            if (state === 'enabled') {
                items.push({
                    title: 'Вимкнути',
                    subtitle:
                        'Зупинити запуск після перезапуску',
                    action: 'disable'
                });
            } else {
                items.push({
                    title: 'Увімкнути',
                    subtitle:
                        'Активувати після перезапуску',
                    action: 'enable'
                });
            }

            items.push({
                title: 'Видалити',
                subtitle:
                    'Прибрати плагін зі списку',
                action: 'remove'
            });
        }

        showSelect({
            title: plugin.name,

            items: items,

            onSelect: function (item) {
                if (!item) {
                    openCategory(category);
                    return;
                }

                if (item.action === 'remove') {
                    confirmRemove(plugin, category);
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

                selected[category.id] = plugin.id;

                openCategory(category);
            },

            onBack: function () {
                selected[category.id] = plugin.id;

                openCategory(category);
            }
        });
    }

    /* =====================================
       REMOVE CONFIRMATION
       ===================================== */

    function confirmRemove(plugin, category) {
        showSelect({
            title: 'Видалити ' + plugin.name + '?',

            items: [
                {
                    title: 'Скасувати',
                    subtitle: 'Залишити плагін',
                    action: 'cancel'
                },
                {
                    title: 'Видалити',
                    subtitle:
                        'Підтвердити видалення',
                    action: 'remove'
                }
            ],

            onSelect: function (item) {
                if (
                    item &&
                    item.action === 'remove'
                ) {
                    removePlugin(plugin);
                }

                selected[category.id] = plugin.id;

                openCategory(category);
            },

            onBack: function () {
                openPlugin(plugin, category);
            }
        });
    }

    /* =====================================
       CATEGORY ROWS
       ===================================== */

    function updateFolderRow(category) {
        var row = rows[
            'folder_' + category.id
        ];

        if (!row || !row.length) return;

        var description = row.find(
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

    function decorateFolderRow(row, category) {
        if (!row || !row.length) return;

        row.addClass('crowley-pm-folder');

        var name = row.find(
            '.settings-param__name'
        ).first();

        if (!name.length) return;

        if (
            name.find('.crowley-pm-icon').length
        ) {
            return;
        }

        var original = name.text();

        name.empty();

        var icon = document.createElement('span');
        icon.className = 'crowley-pm-icon';
        icon.innerHTML = svgIcon(category.icon, 22);

        var label = document.createElement('span');
        label.className = 'crowley-pm-label';
        label.textContent = original;

        name.append(icon);
        name.append(label);
    }

    /* =====================================
       RESTART ROW
       ===================================== */

    function updateRestartRow() {
        var row = rows.restart;

        if (!row || !row.length) return;

        row.toggleClass(
            'crowley-pm-hidden',
            !pending
        );
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
                'viewBox="0 0 24 24" ' +
                'fill="none" ' +
                'stroke="white" ' +
                'stroke-width="1.7" ' +
                'stroke-linecap="round" ' +
                'stroke-linejoin="round">' +
                '<rect x="3" y="3" width="7" height="7" rx="1.5"/>' +
                '<rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
                '<rect x="3" y="14" width="7" height="7" rx="1.5"/>' +
                '<rect x="14" y="14" width="7" height="7" rx="1.5"/>' +
                '</svg>'
        });
    }

    function registerFolders() {
        CATEGORIES.forEach(function (category) {
            Lampa.SettingsApi.addParam({
                component: ROOT,

                param: {
                    name:
                        'crowley_pm360_folder_' +
                        category.id,

                    type: 'button'
                },

                field: {
                    name: category.name,

                    description:
                        getCount(category) +
                        ' із ' +
                        category.plugins.length +
                        ' встановлено'
                },

                onRender: function (item) {
                    rows[
                        'folder_' + category.id
                    ] = item;

                    decorateFolderRow(
                        item,
                        category
                    );

                    updateFolderRow(category);
                },

                onChange: function () {
                    openCategory(category);
                }
            });
        });
    }

    function registerRestart() {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name: 'crowley_pm360_restart',
                type: 'button'
            },

            field: {
                name: 'Застосувати зміни',
                description: 'Перезапустити Lampa'
            },

            onRender: function (item) {
                rows.restart = item;

                item.addClass(
                    'crowley-pm-restart'
                );

                updateRestartRow();
            },

            onChange: function () {
                restartLampa();
            }
        });
    }

    /* =====================================
       INITIALIZATION
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
            !Lampa.Select.show ||
            !Lampa.Controller ||
            !Lampa.Controller.toggle
        ) {
            return false;
        }

        initialized = true;

        migrateCustomButtons();

        injectStyles();

        registerComponent();
        registerFolders();
        registerRestart();

        return true;
    }

    function waitForLampa() {
        if (init()) return;

        attempts++;

        if (attempts < 100) {
            setTimeout(waitForLampa, 200);
        } else {
            window[READY] = false;
        }
    }

    waitForLampa();

})();
