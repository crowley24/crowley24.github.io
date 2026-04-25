// ==Lampa==
// name: MyTV IPTV
// version: 1.0
// author: ChatGPT
// ==/Lampa==

(function () {
    'use strict';

    function MyTV() {
        var network = new Lampa.Reguest();
        var playlist = [];
        var groups = {};
        var currentGroup = null;

        function parseM3U(text) {
            playlist = [];
            groups = {};

            var lines = text.split('\n');
            var current = {};

            lines.forEach(function (line) {
                line = line.trim();

                if (line.startsWith('#EXTINF')) {
                    var name = line.split(',').pop().trim();
                    var groupMatch = line.match(/group-title="([^"]+)"/);
                    var logoMatch = line.match(/tvg-logo="([^"]+)"/);

                    current = {
                        name: name,
                        group: groupMatch ? groupMatch[1] : 'Other',
                        logo: logoMatch ? logoMatch[1] : '',
                        url: ''
                    };
                } else if (line && !line.startsWith('#')) {
                    current.url = line;
                    playlist.push(current);

                    if (!groups[current.group]) groups[current.group] = [];
                    groups[current.group].push(current);
                }
            });
        }

        function render() {
            var html = `
            <div class="mytv">
                <div class="mytv__groups"></div>
                <div class="mytv__channels"></div>
                <div class="mytv__info">Оберіть канал</div>
            </div>
            `;

            var body = $(html);

            renderGroups(body);
            renderChannels(body, Object.keys(groups)[0]);

            return body;
        }

        function renderGroups(body) {
            var container = body.find('.mytv__groups');
            container.empty();

            Object.keys(groups).forEach(function (group) {
                var el = $('<div class="mytv__group selector">' + group + '</div>');

                el.on('hover:enter', function () {
                    currentGroup = group;
                    renderChannels(body, group);
                });

                container.append(el);
            });
        }

        function renderChannels(body, group) {
            var container = body.find('.mytv__channels');
            container.empty();

            if (!group) return;

            groups[group].forEach(function (ch) {
                var el = $(`
                    <div class="mytv__channel selector">
                        <img src="${ch.logo}" />
                        <span>${ch.name}</span>
                    </div>
                `);

                el.on('hover:enter', function () {
                    renderInfo(body, ch);
                });

                el.on('hover:click', function () {
                    Lampa.Player.play({
                        url: ch.url,
                        title: ch.name
                    });
                });

                container.append(el);
            });
        }

        function renderInfo(body, ch) {
            var container = body.find('.mytv__info');

            container.html(`
                <div class="mytv__info-inner">
                    <img src="${ch.logo}" />
                    <h2>${ch.name}</h2>
                    <p>Група: ${ch.group}</p>
                </div>
            `);
        }

        function openPlaylistInput(callback) {
            Lampa.Modal.open({
                title: 'Введіть M3U URL',
                html: '<input type="text" class="iptv-url" placeholder="https://..." style="width:100%">',
                onBack: function () {
                    Lampa.Modal.close();
                },
                onSelect: function () {
                    var url = $('.iptv-url').val();

                    if (!url) return;

                    Lampa.Modal.close();
                    loadPlaylist(url, callback);
                }
            });
        }

        function loadPlaylist(url, callback) {
            network.silent(url, function (data) {
                parseM3U(data);
                callback();
            }, function () {
                Lampa.Noty.show('Помилка завантаження');
            });
        }

        function start() {
            openPlaylistInput(function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'MyTV',
                    component: render
                });
            });
        }

        return {
            start: start
        };
    }

    function addStyles() {
        if ($('#mytv-style').length) return;

        $('head').append(`
        <style id="mytv-style">
            .mytv {
                display: flex;
                height: 100%;
            }
            .mytv__groups {
                width: 20%;
                overflow: auto;
                border-right: 1px solid #444;
            }
            .mytv__channels {
                width: 40%;
                overflow: auto;
                border-right: 1px solid #444;
            }
            .mytv__info {
                width: 40%;
                padding: 20px;
            }
            .mytv__group,
            .mytv__channel {
                padding: 10px;
                cursor: pointer;
            }
            .mytv__channel {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .mytv__channel img {
                width: 40px;
                height: 40px;
                object-fit: contain;
            }
        </style>
        `);
    }

    function addMenu() {
        Lampa.Menu.add({
            title: 'MyTV',
            icon: '<svg width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>',
            onSelect: function () {
                var app = new MyTV();
                app.start();
            }
        });
    }

    function init() {
        addStyles();
        addMenu();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });

})();
