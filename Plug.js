
(function () {
    'use strict';

    /*
     * CROWLEY PLUGIN MANAGER 3.2
     * Lampa / Android TV / Mobile
     *
     * Один компонент у налаштуваннях.
     * Внутрішні папки без addComponent.
     */

    var GLOBAL_KEY = 'crowley_plugin_manager_v32';

    if (window[GLOBAL_KEY]) return;
    window[GLOBAL_KEY] = true;

    var VERSION = '3.2.0';
    var ROOT = 'plugin_manager_page';
    var STORAGE_KEY = 'plugins';

    var initialized = false;
    var attempts = 0;
    var maxAttempts = 100;

    var currentCategory = null;
    var pending = false;
    var loading = {};
    var rendered = {};
    var lastNotice = '';
    var lastNoticeTime = 0;

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
        var now = Date.now();

        if (
            lastNotice === message &&
            now - lastNoticeTime < 1200
        ) {
            return;
        }

        lastNotice = message;
        lastNoticeTime = now;

        if (Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show(message);
        }
    }

    /* =====================================
       SCRIPT LOADER
       ===================================== */

    function normalizeUrl(url) {
        return String(url || '')
            .split('#')[0]
            .split('?')[0];
    }

    function scriptExists(url) {
        var target = normalizeUrl(url);
        var scripts = document.querySelectorAll(
            'script[src]'
        );

        for (var i = 0; i < scripts.length; i++) {
            if (
                normalizeUrl(scripts[i].src) === target
            ) {
                return true;
            }
        }

        return false;
    }

    function loadPlugin(url) {
        if (loading[url] || scriptExists(url)) {
            return;
        }

        loading[url] = true;

        var script = document.createElement('script');

        script.src = url;
        script.async = true;

        script.setAttribute(
            'data-crowley-plugin',
            url
        );

        script.onload = function () {
            delete loading[url];
            notify('⚡ Плагін завантажено');
        };

        script.onerror = function () {
            delete loading[url];

            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }

            notify('❌ Помилка завантаження плагіна');
        };

        document.body.appendChild(script);
    }

    /* =====================================
       RESTART
       ===================================== */

    function setPending(value) {
        pending = !!value;
        refreshUI();
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

        refreshUI();

        notify('🟢 Плагін встановлено');

        loadPlugin(plugin.url);
    }

    function enablePlugin(plugin) {
        var list = getPlugins();

        list.forEach(function (item) {
            if (item && item.url === plugin.url) {
                item.status = 1;
            }
        });

        savePlugins(list);

        setPending(true);

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

        setPending(true);

        notify('🟠 Плагін вимкнено');
    }

    function removePlugin(plugin) {
        var list = getPlugins().filter(
            function (item) {
                return item && item.url !== plugin.url;
            }
        );

        savePlugins(list);

        setPending(true);

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
                if (item && item.action === 'confirm') {
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
                'crowley-pm32-styles'
            )
        ) return;

        var style = document.createElement('style');
        style.id = 'crowley-pm32-styles';

        style.textContent = `
            .crowley-pm32-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                min-width: 10px;
                margin-left: 10px;
                border-radius: 50%;
                vertical-align: middle;
            }

            .crowley-pm32-indicator.enabled {
                background: #11e400;
                box-shadow:
                    0 0 6px rgba(17,228,0,.35);
            }

            .crowley-pm32-indicator.disabled {
                background: #ffad24;
                box-shadow:
                    0 0 6px rgba(255,173,36,.35);
            }

            .crowley-pm32-indicator.not_installed {
                background: #ff3030;
                box-shadow:
                    0 0 6px rgba(255,48,48,.3);
            }

            .crowley-pm32-count {
                margin-left: 10px;
                font-size: .75em;
                opacity: .65;
            }

            .crowley-pm32-hidden {
                display: none !important;
            }

            .crowley-pm32-restart {
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
            'crowley-pm32-hidden',
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
            '.crowley-pm32-indicator'
        );

        if (!indicator.length) {
            indicator = $(
                '<span class="crowley-pm32-indicator"></span>'
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

    function applyFolderCount(item, category) {
        if (!item || !item.length) return;

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (!title.length) return;

        var count = title.find(
            '.crowley-pm32-count'
        );

        if (!count.length) {
            count = $(
                '<span class="crowley-pm32-count"></span>'
            );

            title.append(count);
        }

        count.text(
            getCategoryCount(category) +
            ' / ' +
            category.plugins.length
        );
    }

    /* =====================================
       INTERNAL FOLDER NAVIGATION
       ===================================== */

    function openCategory(categoryId) {
        currentCategory = categoryId;
        refreshUI();
    }

    function closeCategory() {
        currentCategory = null;
        refreshUI();
    }

    function refreshUI() {
        CATEGORIES.forEach(function (category) {
            var folder = rendered[
                'folder_' + category.id
            ];

            if (folder) {
                setVisible(
                    folder,
                    currentCategory === null
                );

                applyFolderCount(
                    folder,
                    category
                );
            }

            category.plugins.forEach(function (plugin) {
                var item = rendered[
                    'plugin_' + plugin.id
                ];

                if (item) {
                    setVisible(
                        item,
                        currentCategory === category.id
                    );

                    applyIndicator(
                        item,
                        plugin
                    );
                }
            });
        });

        setVisible(
            rendered.back,
            currentCategory !== null
        );

        setVisible(
            rendered.restart,
            pending
        );
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
                name: 'crowley_pm32_back',
                type: 'button'
            },

            field: {
                name: '← Назад до категорій',
                description:
                    'Повернутися до списку папок'
            },

            onRender: function (item) {
                rendered.back = item;
                refreshUI();
            },

            onChange: function () {
                closeCategory();
            }
        });
    }

    /* =====================================
       FOLDER BUTTONS
       ===================================== */

    function registerFolder(category) {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name:
                    'crowley_pm32_folder_' +
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

                refreshUI();
            },

            onChange: function () {
                openCategory(category.id);
            }
        });
    }

    /* =====================================
       PLUGIN BUTTONS
       ===================================== */

    function registerPlugin(category, plugin) {
        Lampa.SettingsApi.addParam({
            component: ROOT,

            param: {
                name:
                    'crowley_pm32_plugin_' +
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

                refreshUI();
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
                name: 'crowley_pm32_restart',
                type: 'button'
            },

            field: {
                name: '♻️ Застосувати зміни',
                description:
                    'Перезапустити Lampa'
            },

            onRender: function (item) {
                rendered.restart = item;

                item.addClass(
                    'crowley-pm32-restart'
                );

                refreshUI();
            },

            onChange: function () {
                if (pending) {
                    restartLampa();
                }
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
