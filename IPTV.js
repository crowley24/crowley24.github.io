// ==Lampa==
// name: IPTV PRO with EPG Fixed
// version: 11.6
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
                    .iptv-item.active { background: #2962ff !important; border-color: #fff; }
                    .epg-title { font-size: 1.4rem; font-weight: bold; margin-bottom: 1rem; color: #2962ff; }
                    .epg-prog { font-size: 1.2rem; margin-bottom: 0.5rem; color: #fff; }
                    .epg-desc { font-size: 1rem; color: #aaa; line-height: 1.4; }
                    .btn-pl, .btn-search { padding: 1rem; margin: 0.5rem 1rem; text-align: center; border-radius: 0.5rem; cursor: pointer; color: #fff; font-weight: bold; background: rgba(255,255,255,0.1); }
                    .btn-pl.active { background: #2962ff; }
                    .btn-search.active { background: #2962ff; }
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
                    Lampa.Noty.show('Помилка завантаження плейлиста');
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
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url && url.indexOf('http') === 0) {
                        var item = { name: name.trim(), url: url, group: group, id: tvg_id };
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
            // Кнопки як окремі елементи для фокусу
            colG.append('<div class="btn-pl selector">🔗 Плейлисти</div>');
            colG.append('<div class="btn-search selector">🔍 Пошук</div>');

            Object.keys(groups_data).forEach(function (g) {
                colG.append('<div class="iptv-item selector">' + g + '</div>');
            });
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c) {
                colC.append('<div class="iptv-item selector">' + c.name + '</div>');
            });
            this.updateFocus();
        };

        this.updateEPG = function() {
            colE.empty();
            var channel = current_list[index_c];
            if (!channel || active_col !== 'channels') return;

            colE.append('<div class="epg-title">' + channel.name + '</div>');

            Lampa.Tvg.get({ name: channel.name, id: channel.id }, function(data) {
                if (data && data.program) {
                    var now = Math.floor(Date.now() / 1000);
                    var prog = data.program.find(p => p.start <= now && p.stop >= now) || data.program[0];
                    if (prog) {
                        colE.append('<div class="epg-prog">🔴 ' + prog.title + '</div>');
                        if (prog.description) colE.append('<div class="epg-desc">' + prog.description + '</div>');
                    }
                } else {
                    colE.append('<div class="epg-desc">Програма відсутня</div>');
                }
            });
        };

        this.updateFocus = function () {
            root.find('.selector').removeClass('active');
            if (active_col === 'groups') {
                colG.find('.selector').eq(index_g).addClass('active');
            } else {
                colC.find('.selector').eq(index_c).addClass('active');
                this.updateEPG();
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
                    if (active_col === 'groups') index_g = Math.min(colG.find('.selector').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups' && index_g > 1) { // Пропускаємо кнопки плейлистів/пошуку
                        active_col = 'channels';
                        index_c = 0;
                        var groupName = Object.keys(groups_data)[index_g - 2];
                        _this.renderC(groups_data[groupName]);
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else {
                        // Замість Lampa.Activity.back() використовуємо прямий вихід через селектор
                        Lampa.Controller.toggle('menu'); 
                    }
                },
                enter: function () {
                    if (active_col === 'groups') {
                        if (index_g === 0) Lampa.Noty.show('Налаштування плейлистів');
                        else if (index_g === 1) Lampa.Noty.show('Пошук...');
                        else {
                            active_col = 'channels';
                            index_c = 0;
                            _this.renderC(groups_data[Object.keys(groups_data)[index_g - 2]]);
                        }
                    } else if (current_list[index_c]) {
                        Lampa.Player.play({
                            url: current_list[index_c].url,
                            title: current_list[index_c].name,
                            type: 'tv'
                        });
                    }
                },
                back: function () {
                    // Радикальне рішення для усунення зациклення:
                    Lampa.Activity.backward(); 
                }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
            root = null;
        };
    }

    function init() {
        if (!window.iptv_pro_plugin_installed) {
            window.iptv_pro_plugin_installed = true;
            Lampa.Component.add('iptv_pro', IPTVComponent);
            var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
            item.on('hover:enter', function () {
                Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' });
            });
            $('.menu .menu__list').append(item);
        }
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') init();
    });
})();
