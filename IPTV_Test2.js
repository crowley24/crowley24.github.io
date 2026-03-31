(function () {
    'use strict';

    var currentComponent = null;

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v12';

        this.getConfig = function () {
            return Lampa.Storage.get(storage_key, {
                playlists: [{ url: '' }],
                epg_url: '',
                favorites: [],
                current_pl_index: 0
            });
        };

        this.create = function () {
            currentComponent = this;

            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append('<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%;min-width:180px;}' +
                    '.col-channels{width:45%;}' +
                    '.col-details{width:35%;background:#080a0d;padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        // 🔥 HLS підтримка
        this.playHLS = function (url) {
            groups_data = {
                '▶ HLS Потік': [{
                    name: 'Live Stream',
                    url: url,
                    group: 'HLS',
                    logo: ''
                }]
            };

            this.renderG();
            this.renderC(groups_data['▶ HLS Потік']);
        };

        // 🚀 ГОЛОВНА ЛОГІКА
        this.loadPlaylist = function () {
            var config = this.getConfig();
            var pl = config.playlists[config.current_pl_index];

            if (!pl || !pl.url || pl.url.trim() === '') {
                Lampa.Noty.show('Введіть URL плейлиста');
                this.showEmptyState();
                return;
            }

            var url = pl.url;

            // 👉 якщо m3u8 — одразу HLS
            if (url.includes('.m3u8')) {
                this.playHLS(url);
                return;
            }

            Lampa.Noty.show('Завантаження плейлиста...');

            $.ajax({
                url: url, // ❗ без proxy
                success: function (str) {

                    if (!str || str.length < 50) {
                        Lampa.Noty.show('Плейлист пустий або заблокований');
                        return;
                    }

                    if (str.includes('#EXTINF')) {
                        _this.parse(str);
                        Lampa.Noty.show('Плейлист завантажено');
                    } 
                    else if (str.includes('#EXT-X-STREAM-INF')) {
                        _this.playHLS(url);
                    } 
                    else {
                        Lampa.Noty.show('Невідомий формат');
                    }
                },
                error: function () {
                    Lampa.Noty.show('Помилка завантаження');
                    _this.showEmptyState();
                }
            });
        };

        this.showEmptyState = function () {
            groups_data = {};
            this.renderG();
            colC.empty().append('<div style="padding:2rem;color:#999;text-align:center;">Немає даних</div>');
            colE.empty();
        };

        // 📺 ПАРСЕР M3U (твій, не чіпаємо)
        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            var current_group = 'Інше';

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();

                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', current_group])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url && url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];

                        groups_data[group].push({
                            name: name,
                            url: url,
                            logo: logo
                        });
                    }
                }
            }

            this.renderG();
        };

        this.renderG = function () {
            colG.empty();

            Object.keys(groups_data).forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');

                item.on('click', function () {
                    index_g = i;
                    active_col = 'groups';
                    _this.renderC(groups_data[g]);
                });

                colG.append(item);
            });
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list;

            list.forEach(function (ch, i) {
                var row = $('<div class="iptv-item">' + ch.name + '</div>');

                row.on('click', function () {
                    index_c = i;

                    Lampa.Player.play({
                        url: ch.url,
                        title: ch.name
                    });
                });

                colC.append(row);
            });
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                enter: function () {
                    if (current_list[index_c]) {
                        Lampa.Player.play({
                            url: current_list[index_c].url,
                            title: current_list[index_c].name
                        });
                    }
                }
            });

            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    function showPlaylistSettings() {
        var config = Lampa.Storage.get('iptv_pro_v12', {
            playlists: [{ url: '' }]
        });

        Lampa.Input.edit({
            value: config.playlists[0].url,
            title: 'URL плейлиста'
        }, function (val) {
            config.playlists[0].url = val;
            Lampa.Storage.set('iptv_pro_v12', config);

            if (currentComponent) currentComponent.loadPlaylist();
        });
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

        if (Lampa.SettingsApi && Lampa.SettingsApi.addParam) {
            Lampa.SettingsApi.addComponent({
                component: "iptv_pro",
                name: "IPTV PRO"
            });

            Lampa.SettingsApi.addParam({
                component: "iptv_pro",
                param: {
                    name: "playlist_url",
                    type: "button"
                },
                field: {
                    name: "Плейлист URL",
                    description: "Введіть URL"
                },
                onChange: showPlaylistSettings
            });
        }
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });

})();
