// ==Lampa==
// name: IPTV PRO Final Fix
// version: 12.1
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [
                {
                    name: 'TEST',
                    url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
                }
            ],
            favorites: [],
            current_pl_index: 0
        });

        /* ================= FAVORITES ================= */

        this.toggleFavorite = function (channel) {
            var index = config.favorites.findIndex(function (f) {
                return f.url === channel.url;
            });

            if (index > -1) {
                config.favorites.splice(index, 1);
                Lampa.Noty.show('Удалено из избранного');
            } else {
                config.favorites.push(channel);
                Lampa.Noty.show('Добавлено в избранное');
            }

            Lampa.Storage.set(storage_key, config);
            this.parseStorage();
        };

        this.parseStorage = function () {
            groups_data['⭐ Избранное'] = config.favorites;
            if (active_col === 'groups') this.renderG();
            else this.renderC(current_list);
        };

        /* ================= CREATE ================= */

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append(`
<style id="iptv-style-v12">
.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem}
.iptv-wrapper{display:flex;width:100%;height:100%}
.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,.1)}
.col-groups{width:20rem;background:rgba(0,0,0,.25)}
.col-channels{flex:1;background:rgba(0,0,0,.15)}
.col-details{width:25rem;background:#080a0d;padding:2rem}
.iptv-item{padding:1rem;margin:.4rem;border-radius:.5rem;background:rgba(255,255,255,.04);color:#fff;cursor:pointer}
.iptv-item.active{background:#2962ff}
.iptv-item.is-fav:before{content:'⭐ ';color:#ffd700}
.btn-pl,.btn-search{padding:1rem;margin:.5rem 1rem;border-radius:.5rem;text-align:center;font-weight:700;cursor:pointer}
.btn-pl{background:#2962ff}
.btn-search{background:#444}

/* ===== LOGOS ===== */
.channel-row{display:flex;align-items:center;gap:1rem}
.channel-logo{width:48px;height:48px;object-fit:contain;background:#111;border-radius:.4rem;flex-shrink:0}
.channel-logo.empty{display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#777}
</style>`);
            }

            this.loadPlaylist();
            return root;
        };

        /* ================= LOAD ================= */

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl) return;

            $.ajax({
                url: pl.url,
                success: function (str) {
                    _this.parse(str);
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                }
            });
        };

        /* ================= PARSE ================= */

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Избранное': config.favorites };
            all_channels = [];

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();

                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || [,''])[1];
                    var group = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.indexOf('http') === 0) {
                        var item = {
                            name: name,
                            url: url,
                            group: group,
                            logo: logo
                        };

                        all_channels.push(item);
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                    }
                }
            }

            this.renderG();
        };

        /* ================= GROUPS ================= */

        this.renderG = function () {
            colG.empty();

            var btnPl = $('<div class="btn-pl">📂 Плейлисты</div>').on('click', function () {
                _this.playlistMenu();
            });

            var btnSearch = $('<div class="btn-search">🔍 Поиск</div>').on('click', function () {
                _this.searchChannels();
            });

            colG.append(btnPl, btnSearch);

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

        /* ================= CHANNELS ================= */

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];

            current_list.forEach(function (c) {
                var is_fav = config.favorites.some(f => f.url === c.url);

                var logo_html = c.logo
                    ? '<img class="channel-logo" loading="lazy" src="' + c.logo + '">'
                    : '<div class="channel-logo empty">📺</div>';

                var row = $(`
                    <div class="iptv-item ${is_fav ? 'is-fav' : ''}">
                        <div class="channel-row">
                            ${logo_html}
                            <div class="channel-title">${c.name}</div>
                        </div>
                    </div>
                `);

                row.on('click', function () {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                colC.append(row);
            });

            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
        };

        /* ================= SEARCH ================= */

        this.searchChannels = function () {
            Lampa.Input.edit({ title: 'Поиск', value: '', free: true }, function (q) {
                if (!q) return;
                var res = all_channels.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
                _this.renderC(res);
            });
        };

        /* ================= PLAYLIST MENU ================= */

        this.playlistMenu = function () {
            colC.empty();
            active_col = 'channels';
            index_c = 0;

            config.playlists.forEach(function (pl, i) {
                var row = $('<div class="iptv-item">' + pl.name + '</div>');
                row.on('click', function () {
                    config.current_pl_index = i;
                    Lampa.Storage.set(storage_key, config);
                    _this.loadPlaylist();
                });
                colC.append(row);
            });

            this.updateFocus();
        };

        /* ================= FOCUS ================= */

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');

            if (active_col === 'groups') {
                colG.find('.iptv-item').eq(index_g).addClass('active');
            } else {
                colC.find('.iptv-item').eq(index_c).addClass('active');
            }
        };

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },

                down: function () {
                    if (active_col === 'groups') {
                        index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    } else {
                        index_c = Math.min(current_list.length - 1, index_c + 1);
                    }
                    _this.updateFocus();
                },

                right: function () {
                    if (active_col === 'groups') {
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    }
                },

                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    }
                },

                enter: function () {
                    if (active_col === 'groups') {
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    } else if (current_list[index_c]) {
                        Lampa.Player.play({
                            url: current_list[index_c].url,
                            title: current_list[index_c].name
                        });
                    }
                },

                long: function () {
                    if (active_col === 'channels' && current_list[index_c]) {
                        _this.toggleFavorite(current_list[index_c]);
                    }
                },

                back: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);

        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_pro'
            });
        });

        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
