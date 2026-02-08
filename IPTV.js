// ==Lampa==
// name: IPTV PRO with EPG
// version: 11.5
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var active_col = 'groups'; 
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v11';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [
                { name: 'MEGA', url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u' }
            ],
            favorites: [],
            current_pl_index: 0
        });

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v11-style').length) {
                $('head').append(`
                <style id="iptv-v11-style">
                    .iptv-root { position: fixed; inset: 0; background: #0b0d10; z-index: 1000; padding-top: 5rem; }
                    .iptv-wrapper { display: flex; width: 100%; height: 100%; }
                    .iptv-col { height: 100%; overflow-y: auto; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.1); }
                    .col-groups { width: 20rem; }
                    .col-channels { flex: 1; }
                    .col-details { width: 30rem; background: #080a0d; padding: 2rem; }
                    .iptv-item { padding: 1rem; margin: 0.4rem; border-radius: 0.5rem; background: rgba(255,255,255,0.03); color: #fff; cursor: pointer; }
                    .iptv-item.active { background: #2962ff !important; }
                    .epg-title { font-size: 1.4rem; font-weight: bold; margin-bottom: 1rem; color: #2962ff; }
                    .epg-prog { font-size: 1.2rem; margin-bottom: 0.5rem; }
                    .epg-desc { font-size: 1rem; color: #aaa; line-height: 1.4; }
                    .btn-pl, .btn-search { padding: 1rem; margin: 0.5rem 1rem; text-align: center; border-radius: 0.5rem; cursor: pointer; color: #fff; font-weight: bold; }
                    .btn-pl { background: #2962ff; }
                    .btn-search { background: #444; }
                </style>`);
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var current = config.playlists[config.current_pl_index];
            if (!current) return;

            $.ajax({
                url: current.url,
                success: function (str) { _this.parse(str); },
                error: function () {
                    Lampa.Noty.show('Помилка завантаження');
                    _this.parse('');
                }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Избранное': config.favorites };
            all_channels = [];

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || [,''])[1];
                    var group = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group, id: tvg_id, logo: logo };
                        all_channels.push(item);
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            var btnAdd = $('<div class="btn-pl">🔗 Плейлисти</div>').on('click', _this.playlistMenu);
            var btnSearch = $('<div class="btn-search">🔍 Пошук</div>').on('click', _this.searchChannels);
            colG.append(btnAdd, btnSearch);

            Object.keys(groups_data).forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function () {
                    index_g = i;
                    active_col = 'groups';
                    _this.renderC(groups_data[g]);
                });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, i) {
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click', function () {
                    Lampa.Player.play({ url: c.url, title: c.name, type: 'tv' });
                });
                colC.append(row);
            });
            this.updateFocus();
        };

        // Функція для відображення EPG
        this.updateEPG = function() {
            colE.empty();
            var channel = current_list[index_c];
            if (!channel || active_col !== 'channels') return;

            colE.append('<div class="epg-title">' + channel.name + '</div>');

            // Використовуємо вбудований сервіс Lampa для пошуку програми
            Lampa.Tvg.get({
                name: channel.name,
                id: channel.id
            }, function(data) {
                if (data && data.program) {
                    var prog = data.program.find(p => p.stop > Date.now() / 1000);
                    if (prog) {
                        colE.append('<div class="epg-prog">🔴 Зараз: ' + prog.title + '</div>');
                        if (prog.description) {
                            colE.append('<div class="epg-desc">' + prog.description + '</div>');
                        }
                    } else {
                        colE.append('<div class="epg-desc">Програма відсутня</div>');
                    }
                } else {
                    colE.append('<div class="epg-desc">EPG не знайдено. Перевірте джерело в налаштуваннях Lampa.</div>');
                }
            });
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            if (active_col === 'groups') {
                colG.find('.iptv-item').eq(index_g).addClass('active');
            } else {
                colC.find('.iptv-item').eq(index_c).addClass('active');
                this.updateEPG(); // Оновлюємо EPG при зміні фокусу
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        var groupName = Object.keys(groups_data)[index_g];
                        _this.renderC(groups_data[groupName]);
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else Lampa.Activity.back();
                },
                enter: function () {
                    if (active_col === 'channels' && current_list[index_c]) {
                        Lampa.Player.play({
                            url: current_list[index_c].url,
                            title: current_list[index_c].name,
                            type: 'tv'
                        });
                    }
                },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') init();
    });
})();
