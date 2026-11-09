
(function () {
    'use strict';

    /*
     * CHaturbate LIVE 1.0.0
     * Author: Crowley24
     * Platform: Lampa / Android TV / Mobile
     *
     * FEATURES:
     * - Chaturbate public website catalog
     * - Open room by username
     * - Embedded iframe player
     * - Recent rooms history
     * - TV remote friendly interface
     * - Persistent history
     */

    if (window.chaturbate_live_100_ready) return;

    window.chaturbate_live_100_ready = true;

    var PLUGIN = 'chaturbate_live_100';
    var HISTORY_KEY = 'chaturbate_live_history_100';
    var BASE = 'https://chaturbate.com/';
    var STYLE_ID = 'chaturbate-live-style-100';

    var ICON =
        '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm6 3v8l7-4z"/>' +
        '</svg>';

    var activeComponent = null;

    function getHistory() {
        try {
            var history = Lampa.Storage.get(HISTORY_KEY, []);
            return Array.isArray(history) ? history : [];
        } catch (e) {
            return [];
        }
    }

    function saveHistory(name) {
        name = String(name || '').toLowerCase();

        var history = getHistory();

        history = history.filter(function (item) {
            return item !== name;
        });

        history.unshift(name);
        history = history.slice(0, 15);

        Lampa.Storage.set(HISTORY_KEY, history);
    }

    function validName(name) {
        name = String(name || '').trim();

        if (!/^[a-zA-Z0-9_]{1,50}$/.test(name)) {
            return '';
        }

        return name;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        var css = `
            .cbl {
                width: 100%;
                min-height: 100%;
                padding: 2em;
                box-sizing: border-box;
                color: #fff;
            }

            .cbl__header {
                display: flex;
                align-items: center;
                gap: 1em;
                margin-bottom: 1.5em;
            }

            .cbl__logo {
                font-size: 2em;
                font-weight: 800;
                letter-spacing: .04em;
            }

            .cbl__logo span {
                color: #e84c75;
            }

            .cbl__subtitle {
                opacity: .55;
                font-size: .9em;
                margin-top: .3em;
            }

            .cbl__tabs {
                display: flex;
                gap: .7em;
                flex-wrap: wrap;
                margin-bottom: 1.5em;
            }

            .cbl__button {
                background: rgba(255,255,255,.09);
                border: 2px solid transparent;
                border-radius: .6em;
                padding: .85em 1.3em;
                color: #fff;
                font-size: 1em;
                cursor: pointer;
                transition: .2s;
            }

            .cbl__button:focus,
            .cbl__button.focus {
                border-color: #e84c75;
                background: rgba(232,76,117,.2);
                outline: none;
            }

            .cbl__button--active {
                background: #e84c75;
            }

            .cbl__search {
                display: flex;
                gap: .7em;
                margin-bottom: 1.5em;
                max-width: 750px;
            }

            .cbl__input {
                flex: 1;
                min-width: 0;
                background: rgba(255,255,255,.1);
                border: 2px solid rgba(255,255,255,.15);
                border-radius: .6em;
                padding: .9em 1em;
                color: #fff;
                font-size: 1em;
                outline: none;
            }

            .cbl__input:focus {
                border-color: #e84c75;
            }

            .cbl__history {
                display: flex;
                gap: .6em;
                flex-wrap: wrap;
                margin-bottom: 1.5em;
            }

            .cbl__history-title {
                opacity: .6;
                margin-bottom: .7em;
                font-size: .9em;
            }

            .cbl__player {
                width: 100%;
                height: 68vh;
                min-height: 350px;
                background: #000;
                border-radius: .8em;
                overflow: hidden;
                position: relative;
            }

            .cbl__frame {
                width: 100%;
                height: 100%;
                border: 0;
                background: #000;
            }

            .cbl__empty {
                padding: 3em 1em;
                text-align: center;
                opacity: .55;
            }

            .cbl__status {
                margin: .8em 0;
                opacity: .65;
                font-size: .85em;
            }

            .cbl__footer {
                display: flex;
                justify-content: space-between;
                gap: 1em;
                margin-top: 1em;
                flex-wrap: wrap;
                opacity: .65;
                font-size: .8em;
            }

            @media(max-width: 700px) {
                .cbl {
                    padding: 1em;
                }

                .cbl__player {
                    height: 60vh;
                    min-height: 250px;
                }

                .cbl__search {
                    flex-direction: column;
                }

                .cbl__logo {
                    font-size: 1.5em;
                }
            }
        `;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function Component(object) {
        var self = this;
        var html;
        var root;
        var currentMode = 'catalog';
        var currentRoom = '';

        this.create = function () {
            injectStyle();

            html = $('<div class="cbl">' +
                '<div class="cbl__header">' +
                    '<div>' +
                        '<div class="cbl__logo">CHaturbate <span>LIVE</span></div>' +
                        '<div class="cbl__subtitle">Live streaming browser</div>' +
                    '</div>' +
                '</div>' +

                '<div class="cbl__tabs">' +
                    '<button class="cbl__button cbl__button--active cbl__catalog">Каталог</button>' +
                    '<button class="cbl__button cbl__direct">За ніком</button>' +
                    '<button class="cbl__button cbl__back">Назад</button>' +
                '</div>' +

                '<div class="cbl__search">' +
                    '<input class="cbl__input" type="text" ' +
                    'placeholder="Введіть нік кімнати..." ' +
                    'autocomplete="off" autocapitalize="off">' +
                    '<button class="cbl__button cbl__open">Відкрити</button>' +
                '</div>' +

                '<div class="cbl__history-title">Нещодавні кімнати</div>' +
                '<div class="cbl__history"></div>' +

                '<div class="cbl__status">Оберіть каталог або введіть нік кімнати.</div>' +

                '<div class="cbl__player">' +
                    '<div class="cbl__empty">' +
                        'CHaturbate LIVE<br><br>' +
                        'Тут відображатиметься трансляція' +
                    '</div>' +
                '</div>' +

                '<div class="cbl__footer">' +
                    '<span>CHaturbate LIVE 1.0.0</span>' +
                    '<span>Embedded browser</span>' +
                '</div>' +
            '</div>');

            root = html;
            return root;
        };

        function status(text) {
            root.find('.cbl__status').text(text);
        }

        function showFrame(url) {
            var player = root.find('.cbl__player');

            player.empty();

            var frame = $('<iframe>', {
                'class': 'cbl__frame',
                allow: 'autoplay; fullscreen; picture-in-picture; camera; microphone',
                allowfullscreen: 'allowfullscreen',
                referrerpolicy: 'strict-origin-when-cross-origin'
            });

            frame.on('load', function () {
                status('Сторінка завантажена. Якщо відео не з’явилося, сайт може блокувати iframe.');
            });

            frame.on('error', function () {
                status('Помилка завантаження сторінки.');
            });

            frame.attr('src', url);

            player.append(frame);
        }

        function openCatalog() {
            currentMode = 'catalog';
            currentRoom = '';

            root.find('.cbl__catalog').addClass('cbl__button--active');
            root.find('.cbl__direct').removeClass('cbl__button--active');

            root.find('.cbl__input').val('');

            status('Завантаження публічного каталогу Chaturbate...');

            showFrame(BASE);
        }

        function openRoom(name) {
            name = validName(name);

            if (!name) {
                Lampa.Noty.show('Введіть правильний нік кімнати');
                return;
            }

            currentMode = 'room';
            currentRoom = name;

            saveHistory(name);
            renderHistory();

            root.find('.cbl__catalog').removeClass('cbl__button--active');
            root.find('.cbl__direct').addClass('cbl__button--active');

            status('Відкриваємо кімнату: ' + name);

            showFrame(BASE + encodeURIComponent(name) + '/');
        }

        function renderHistory() {
            var history = getHistory();
            var container = root.find('.cbl__history');

            container.empty();

            if (!history.length) {
                container.append(
                    $('<span class="cbl__status">Історія порожня</span>')
                );
                return;
            }

            history.forEach(function (name) {
                var button = $('<button class="cbl__button"></button>');
                button.text(name);

                button.on('click', function () {
                    openRoom(name);
                });

                container.append(button);
            });
        }

        function openFromInput() {
            var name = root.find('.cbl__input').val();
            openRoom(name);
        }

        this.start = function () {
            activeComponent = self;

            renderHistory();

            root.find('.cbl__catalog').on('click', openCatalog);

            root.find('.cbl__direct').on('click', function () {
                root.find('.cbl__input').trigger('focus');
                status('Введіть нік кімнати без символу @.');
            });

            root.find('.cbl__open').on('click', openFromInput);

            root.find('.cbl__input').on('keydown', function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    openFromInput();
                }
            });

            root.find('.cbl__back').on('click', function () {
                openCatalog();
            });

            openCatalog();

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(
                        root.find('.cbl__tabs'),
                        root
                    );

                    Lampa.Controller.collectionFocus(
                        false,
                        root
                    );
                },

                back: function () {
                    if (currentMode === 'room') {
                        openCatalog();
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            try {
                var frame = root.find('.cbl__frame');
                if (frame.length) frame.attr('src', 'about:blank');

                Lampa.Controller.remove('content');
            } catch (e) {}

            activeComponent = null;
        };
    }

    function openPlugin() {
        Lampa.Component.add(PLUGIN, Component);

        Lampa.Activity.push({
            url: '',
            title: 'CHaturbate LIVE',
            component: PLUGIN,
            page: 1
        });
    }

    function init() {
        if (!window.Lampa) return;

        if (Lampa.Menu && Lampa.Menu.addButton) {
            Lampa.Menu.addButton(
                ICON,
                'CHaturbate LIVE',
                openPlugin
            );
        }

        console.log('[CHaturbate LIVE] Plugin initialized');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }

})();
