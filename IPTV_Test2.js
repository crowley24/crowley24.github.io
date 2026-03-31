(function () {
    'use strict';

    var currentComponent = null;

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var index_c = 0;

        var storage_key = 'iptv_pro_v12';

        this.getConfig = function () {
            return Lampa.Storage.get(storage_key, {
                playlists: [{ url: '' }]
            });
        };

        // 🔍 визначення формату
        this.detectFormat = function (str) {
            if (!str) return 'unknown';

            if (str.includes('#EXTINF')) return 'm3u';
            if (str.includes('#EXT-X-STREAM-INF') || str.includes('#EXT-X-VERSION')) return 'hls';

            return 'unknown';
        };

        // ▶ HLS як один канал
        this.playHLS = function (url) {
            groups_data = {
                '▶ HLS Потік': [{
                    name: 'Live Stream',
                    url: url,
                    logo: ''
                }]
            };

            this.renderG();
            this.renderC(groups_data['▶ HLS Потік']);
        };

        this.create = function () {
            currentComponent = this;

            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex"></div>');

            colG = $('<div class="col groups"></div>');
            colC = $('<div class="col channels"></div>');
            colE = $('<div class="col details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style').length) {
                $('head').append('<style id="iptv-style">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex{display:flex;height:100%;}' +
                    '.col{overflow:auto;}' +
                    '.groups{width:20%;}' +
                    '.channels{width:45%;}' +
                    '.details{width:35%;padding:1rem;background:#080a0d;}' +
                    '.item{padding:1rem;margin:.3rem;background:#1a1d22;border-radius:.5rem;cursor:pointer;}' +
                    '.item:hover{background:#2962ff;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        // 🚀 головна логіка
        this.loadPlaylist = function () {
            var config = this.getConfig();
            var url = config.playlists[0].url;

            if (!url) {
                this.showEmpty();
                return;
            }

            // 🔥 якщо m3u8 → одразу HLS
            if (url.includes('.m3u8')) {
                this.playHLS(url);
                return;
            }

            $.ajax({
                url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
                success: function (str) {

                    var format = _this.detectFormat(str);

                    if (format === 'm3u') {
                        _this.parse(str);
                    } else if (format === 'hls') {
                        _this.playHLS(url);
                    } else {
                        _this.showEmpty();
                    }
                },
                error: function () {
                    _this.showEmpty();
                }
            });
        };

        this.showEmpty = function () {
            colG.html('<div style="padding:2rem;color:#999">Немає даних</div>');
            colC.empty();
            colE.empty();
        };

        // 📺 M3U парсер
        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();

                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'Інше'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.startsWith('http')) {
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

            Object.keys(groups_data).forEach(function (g) {
                var el = $('<div class="item">' + g + '</div>');

                el.on('click', function () {
                    _this.renderC(groups_data[g]);
                });

                colG.append(el);
            });
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list;

            list.forEach(function (ch, i) {
                var el = $('<div class="item">' + ch.name + '</div>');

                el.on('click', function () {
                    index_c = i;

                    Lampa.Player.play({
                        url: ch.url,
                        title: ch.name
                    });
                });

                colC.append(el);
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
