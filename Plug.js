
(function () {
    'use strict';

    /*
     * CROWLEY PLUGIN MANAGER 3.0
     * Lampa / Android TV / Mobile
     *
     * Функції:
     * - Категорії плагінів
     * - Три стани індикаторів
     * - Встановлення / увімкнення
     * - Вимкнення / видалення
     * - Підтвердження видалення
     * - Розумний перезапуск
     * - Захист від повторного завантаження
     * - Сумісність зі старим Storage
     */

    var GLOBAL_KEY = 'crowley_plugin_manager_v3';

    if (window[GLOBAL_KEY]) return;

    window[GLOBAL_KEY] = true;

    var VERSION = '3.0.0';
    var COMPONENT = 'plugin_manager_page';

    var STORAGE_KEY = 'plugins';
    var PENDING_KEY = 'crowley_pm3_pending';

    var initialized = false;
    var attempts = 0;
    var maxAttempts = 100;

    var renderedItems = {};
    var loadingScripts = {};

    var CATEGORIES = [
        {
            id: 'online',
            name: 'Онлайн-перегляд',
            icon: '▶',
            plugins: [
                {
                    name: 'UaKino',
                    description:
                        'Автоматичне програвання фільмів та серіалів з uakino.ax',
                    url:
                        'https://crowley24.github.io/main/Uakino.js',
                    id: 'Uakino'
                }
            ]
        },

        {
            id: 'interface',
            name: 'Інтерфейс',
            icon: '▣',
            plugins: [
                {
                    name: 'NewCard',
                    description:
                        'Сучасний ТВ-інтерфейс картки фільму з гнучкими налаштуваннями',
                    url:
                        'https://crowley24.github.io/main/NewCard.js',
                    id: 'NewCard'
                },
                {
                    name: 'Mobile Interface',
                    description:
                        'Адаптивний мобільний інтерфейс картки фільму',
                    url:
                        'https://crowley24.github.io/main/Mob_Interface.js',
                    id: 'mob_interface'
                },
                {
                    name: 'Mobile Menu',
                    description:
                        'Оновлене нижнє меню для мобільних пристроїв',
                    url:
                        'https://crowley24.github.io/NewMenu_Mob.js',
                    id: 'NewMenu_Mob'
                },
                {
                    name: 'Custom Buttons',
                    description:
                        'Розширена кастомізація кнопок картки фільму',
                    url:
                        'http://crowley24.github.io/main/ButtonsManager+.js',
                    id: 'custom_buttons'
                },
                {
                    name: 'Interface Size',
                    description:
                        'Зміна розміру інтерфейсу Lampa',
                    url:
                        'https://crowley24.github.io/main/InterfaceSize.js',
                    id: 'InterfaceSize'
                },
                {
                    name: 'Interface Hide',
                    description:
                        'Приховування елементів меню',
                    url:
                        'https://crowley24.github.io/interface_hide.js',
                    id: 'InterfaceHize'
                }
            ]
        },

        {
            id: 'movies',
            name: 'Фільми та персоналізація',
            icon: '★',
            plugins: [
                {
                    name: 'Finder UA',
                    description:
                        'Бейдж на картці фільму за наявності українського дубляжу',
                    url:
                        'https://crowley24.github.io/main/UA-Finder+Mod.js',
                    id: 'UA-Finder'
                },
                {
                    name: 'Continue Watching',
                    description:
                        'Інформаційна панель історії перегляду на головній сторінці',
                    url:
                        'https://crowley24.github.io/Watching.js',
                    id: 'Watching'
                },
                {
                    name: 'Random',
                    description:
                        'Випадкова добірка фільмів',
                    url:
                        'https://crowley24.github.io/main/Random.js',
                    id: 'Random'
                }
            ]
        },

        {
            id: 'tools',
            name: 'Додаткові інструменти',
            icon: '⚙',
            plugins: [
                {
                    name: 'Clock',
                    description:
                        'Стильний годинник для Lampa',
                    url:
                        'https://crowley24.github.io/main/Clock.js',
                    id: 'Clock'
                },
                {
                    name: 'Ukrainisation',
                    description:
                        'Лагідна Українізація',
                    url:
                        'https://crowley24.github.io/main/Ukr.js',
                    id: 'Ukr'
                }
            ]
        }
    ];

    /* =====================================
       STORAGE
       ===================================== */

    function getPlugins() {
        var data = Lampa.Storage.get(STORAGE_KEY);

        return Array.isArray(data) ? data : [];
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

        if (!plugin) {
            return 'not_installed';
        }

        return isEnabled(plugin)
            ? 'enabled'
            : 'disabled';
    }

    /* =====================================
       PENDING CHANGES
       ===================================== */

    function getPending() {
        return Lampa.Storage.get(PENDING_KEY) === true;
    }

    function setPending(value) {
        Lampa.Storage.set(
            PENDING_KEY,
            !!value
        );

        updateRestartButton();
    }

    /*
     * Якщо сторінка завантажилася заново,
     * попередні зміни вже застосовуються
     * завантажувачем Lampa.
     */

    function clearPendingOnStartup() {
        Lampa.Storage.set(
            PENDING_KEY,
            false
        );
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
       SAFE SCRIPT LOADER
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
            var source = scripts[i].src;

            if (
                normalizeUrl(source) === target
            ) {
                return true;
            }
        }

        return false;
    }

    function loadPlugin(url) {
        if (
            loadingScripts[url] ||
            scriptExists(url)
        ) {
            return;
        }

        loadingScripts[url] = true;

        var script = document.createElement('script');

        script.src = url;
        script.async = true;

        script.setAttribute(
            'data-crowley-plugin',
            url
        );

        script.onload = function () {
            loadingScripts[url] = false;

            notify('⚡ Плагін завантажено');
        };

        script.onerror = function () {
            loadingScripts[url] = false;

            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }

            notify('❌ Не вдалося завантажити плагін');
        };

        document.body.appendChild(script);
    }

    /* =====================================
       RESTART
       ===================================== */

    function restartLampa() {
        notify('♻️ Перезапуск Lampa...');

        setTimeout(function () {
            window.location.reload();
        }, 500);
    }

    /* =====================================
       INSTALL
       ===================================== */

    function installPlugin(plugin) {
        if (findPlugin(plugin.url)) {
            return;
        }

        var list = getPlugins();

        list.push({
            id: plugin.id,
            name: plugin.name,
            url: plugin.url,
            status: 1
        });

        savePlugins(list);

        updateIndicators();

        notify('🟢 Плагін встановлено');

        /*
         * Під час встановлення пробуємо
         * завантажити скрипт одразу.
         */

        loadPlugin(plugin.url);
    }

    /* =====================================
       ENABLE
       ===================================== */

    function enablePlugin(plugin) {
        var list = getPlugins();
        var changed = false;

        list.forEach(function (item) {
            if (
                item &&
                item.url === plugin.url
            ) {
                item.status = 1;
                changed = true;
            }
        });

        if (!changed) {
            installPlugin(plugin);
            return;
        }

        savePlugins(list);

        setPending(true);
        updateIndicators();

        notify('🟢 Плагін увімкнено');
    }

    /* =====================================
       DISABLE
       ===================================== */

    function disablePlugin(plugin) {
        var list = getPlugins();

        list.forEach(function (item) {
            if (
                item &&
                item.url === plugin.url
            ) {
                item.status = 0;
            }
        });

        savePlugins(list);

        setPending(true);
        updateIndicators();

        notify('🟠 Плагін вимкнено');
    }

    /* =====================================
       REMOVE
       ===================================== */

    function removePlugin(plugin) {
        var list = getPlugins().filter(
            function (item) {
                return (
                    item &&
                    item.url !== plugin.url
                );
            }
        );

        savePlugins(list);

        setPending(true);
        updateIndicators();

        notify('🔴 Плагін видалено');
    }

    /* =====================================
       CONFIRM DELETE
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
       INDICATOR STYLES
       ===================================== */

    function injectStyles() {
        if (
            document.getElementById(
                'crowley-pm3-styles'
            )
        ) {
            return;
        }

        var style = document.createElement('style');

        style.id = 'crowley-pm3-styles';

        style.textContent = `
            .crowley-pm3-indicator {
                display: inline-block;
                width: 10px;
                height: 10px;
                min-width: 10px;
                margin-left: 10px;
                border-radius: 50%;
                vertical-align: middle;
                box-sizing: border-box;
                transition:
                    background-color .2s ease,
                    box-shadow .2s ease;
            }

            .crowley-pm3-indicator.enabled {
                background: #11e400;
                box-shadow:
                    0 0 6px rgba(17,228,0,.35);
            }

            .crowley-pm3-indicator.disabled {
                background: #ffad24;
                box-shadow:
                    0 0 6px rgba(255,173,36,.35);
            }

            .crowley-pm3-indicator.not_installed {
                background: #ff3030;
                box-shadow:
                    0 0 6px rgba(255,48,48,.3);
            }

            .crowley-pm3-category {
                font-weight: 700;
                opacity: .9;
            }

            .crowley-pm3-restart {
                color: #ffad24;
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       INDICATORS
       ===================================== */

    function applyIndicator(item, plugin) {
        if (!item || !item.length) return;

        var title = item.find(
            '.settings-param__name'
        ).first();

        if (!title.length) return;

        var state = getState(plugin.url);

        var indicator = title.find(
            '.crowley-pm3-indicator'
        );

        if (!indicator.length) {
            indicator = $(
                '<span class="crowley-pm3-indicator"></span>'
            );

            title.append(indicator);
        }

        indicator.removeClass(
            'enabled disabled not_installed'
        );

        indicator.addClass(state);
    }

    function updateIndicators() {
        CATEGORIES.forEach(function (category) {
            category.plugins.forEach(function (plugin) {
                var item = renderedItems[plugin.id];

                if (item && item.length) {
                    applyIndicator(item, plugin);
                }
            });
        });
    }

    /* =====================================
       RESTART BUTTON
       ===================================== */

    var restartItem = null;

    function updateRestartButton() {
        if (
            !restartItem ||
            !restartItem.length
        ) {
            return;
        }

        var pending = getPending();

        /*
         * Кнопка залишається в DOM,
         * але приховується, коли
         * немає незастосованих змін.
         */

        restartItem.toggle(pending);
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
       CATEGORY HEADERS
       ===================================== */

    function registerCategory(category) {
        Lampa.SettingsApi.addParam({
            component: COMPONENT,

            param: {
                name:
                    'crowley_pm3_category_' +
                    category.id,
                type: 'button'
            },

            field: {
                name:
                    category.icon + '  ' +
                    category.name,
                description: ''
            },

            onRender: function (item) {
                item.addClass(
                    'crowley-pm3-category'
                );
            },

            onChange: function () {
                /*
                 * Заголовок категорії.
                 * Дій не виконує.
                 */
            }
        });
    }

    /* =====================================
       REGISTER PLUGINS
       ===================================== */

    function registerPlugin(plugin) {
        Lampa.SettingsApi.addParam({
            component: COMPONENT,

            param: {
                name: plugin.id,
                type: 'button'
            },

            field: {
                name: plugin.name,
                description: plugin.description
            },

            onRender: function (item) {
                renderedItems[plugin.id] = item;

                applyIndicator(
                    item,
                    plugin
                );
            },

            onChange: function () {
                showPluginMenu(plugin);
            }
        });
    }

    /* =====================================
       REGISTER RESTART
       ===================================== */

    function registerRestart() {
        Lampa.SettingsApi.addParam({
            component: COMPONENT,

            param: {
                name: 'crowley_pm3_apply',
                type: 'button'
            },

            field: {
                name: '♻️ Застосувати зміни',
                description:
                    'Перезапустити Lampa для застосування змін'
            },

            onRender: function (item) {
                restartItem = item;

                item.addClass(
                    'crowley-pm3-restart'
                );

                updateRestartButton();
            },

            onChange: function () {
                if (getPending()) {
                    restartLampa();
                }
            }
        });
    }

    /* =====================================
       COMPONENT
       ===================================== */

    function registerComponent() {
        Lampa.SettingsApi.addComponent({
            component: COMPONENT,

            name: 'Менеджер Плагінів',

            icon:
                '<svg width="40" height="40" ' +
                'viewBox="0 0 24 24" fill="none">' +
                '<path d="M12 6V18M6 12H18" ' +
                'stroke="white" stroke-width="2" ' +
                'stroke-linecap="round"/>' +
                '</svg>'
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
            !Lampa.Select
        ) {
            return false;
        }

        initialized = true;

        injectStyles();

        clearPendingOnStartup();

        registerComponent();

        /*
         * Кнопка перезапуску
         * реєструється перед категоріями.
         */

        registerRestart();

        CATEGORIES.forEach(function (category) {
            registerCategory(category);

            category.plugins.forEach(
                function (plugin) {
                    registerPlugin(plugin);
                }
            );
        });

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
