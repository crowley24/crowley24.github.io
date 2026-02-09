// ==Lampa==
// name: IPTV PRO (EPG Built-in)
// version: 12.8
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        /* =========================
           EPG CORE
        ========================= */
        var EPG = {};
        var epgInterval = null;

        function getEpgId(channel) {
            return channel.tvg_id || channel.name;
        }

        function epgLoad(epgId, cb) {
            if (EPG[epgId]) {
                cb(EPG[epgId]);
                return;
            }

            var url =
                'https://epg.rootu.top/api/epg/' +
                encodeURIComponent(epgId) +
                '/now';

            $.ajax({
                url: url,
                timeout: 5000,
                success: function (r) {
                    if (r && r.list && r.list[0]) {
                        EPG[epgId] = r.list[0];
                        cb(EPG[epgId]);
                    } else cb(null);
                },
                error: function () {
                    cb(null);
                }
            });
        }

        function epgRender(channel) {
            var epgId = getEpgId(channel);

            epgLoad(epgId, function (p) {
                if (!p) {
                    $('#epg-title').text('Програма недоступна');
                    $('#epg-progress').css('width', '0%');
                    return;
                }

                $('#epg-title').text(p[2]);

                var now = Date.now() / 1000;
                var start = p[0] * 60;
                var stop = start + p[1] * 60;
                var perc = ((now - start) / (stop - start)) * 100;

                $('#epg-progress').css(
                    'width',
                    Math.max(0, Math.min(100, perc)) + '%'
                );
            });
        }

        if (epgInterval) clearInterval(epgInterval);
        epgInterval = setInterval(function () {
            if (current_list[index_c]) {
                epgRender(current_list[index_c]);
            }
        }, 30000);

        /* ========================= */

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            favorites: [],
            current_pl_index: 0
        });

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append(`<style id="iptv-style-v12">
                    .iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}
                    .iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}
                    .iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05);}
                    .col-groups{width:20%;min-width:180px;}
                    .col-channels{width:45%;}
                    .col-details{width:35%;background:#080a0d;padding:1.5rem;}
                    .iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);}
                    .iptv-item.active{background:#2962ff;color:#fff;}
                    .channel-row{display:flex;gap:1rem;align-items:center;}
                    .channel-logo{width:40px;height:40px;object-fit:contain;background:#000;}
                    .epg-title-big{font-size:1.6rem;font-weight:700;}
                    .epg-now{margin-top:1rem;color:#2962ff;font-weight:bold;}
                    .epg-prog-name{margin:.5rem 0;font-size:1.3rem;}
                    .epg-bar{height:4px;background:#222;border-radius:2px;overflow:hidden;}
                    .epg-bar-inner{height:100%;background:#2962ff;width:0%;}
                </style>`);
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', ''])[1];
                    var group = (lines[i].match(/group-title="([^"]+)"/) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (lines[i].match(/tvg-logo="([^"]+)"/) || ['', ''])[1];
                    var tvg = (lines[i].match(/tvg-id="([^"]+)"/) || ['', ''])[1];
                    var url = lines[i + 1];

                    if (!groups_data[group]) groups_data[group] = [];
                    groups_data[group].push({ name, logo, tvg_id: tvg, url });
                }
            }

            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function (g, i) {
                var el = $('<div class="iptv-item">' + g + '</div>');
                el.on('click', function () {
                    index_g = i;
                    _this.renderC(groups_data[g]);
                });
                colG.append(el);
            });
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list;

            list.forEach(function (c, i) {
                var el = $(`<div class="iptv-item">
                    <div class="channel-row">
                        <img class="channel-logo" src="${c.logo}">
                        <div>${c.name}</div>
                    </div>
                </div>`);

                el.on('hover:focus', function () {
                    index_c = i;
                    _this.showDetails(c);
                });

                el.on('click', function () {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                colC.append(el);
            });

            if (list[0]) this.showDetails(list[0]);
        };

        this.showDetails = function (channel) {
            colE.html(`
                <img src="${channel.logo}" style="width:100%;max-height:140px;object-fit:contain">
                <div class="epg-title-big">${channel.name}</div>
                <div class="epg-now">ЗАРАЗ:</div>
                <div class="epg-prog-name" id="epg-title">Завантаження...</div>
                <div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>
            `);

            epgRender(channel);
        };

        this.render = function () { return root; };
        this.destroy = function () {
            if (epgInterval) clearInterval(epgInterval);
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });

})();
