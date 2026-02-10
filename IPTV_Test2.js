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

        /* =======================
           EPG ENGINE
        ======================= */
        var EPG = {};
        var epgInterval = false;

        if (epgInterval) clearInterval(epgInterval);
        epgInterval = setInterval(function () {
            for (var epgId in EPG) {
                epgRender(epgId);
            }
        }, 10000);

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

        /* =======================
           CREATE UI
        ======================= */
        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append(
                    '<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%;min-width:180px;flex-shrink:0;}' +
                    '.col-channels{width:45%;flex-grow:1;min-width:250px;background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:35%;min-width:300px;flex-shrink:0;background:#080a0d;padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:1.6rem;color:#fff;font-weight:700;margin-bottom:1rem;}' +
                    '.epg-now{color:#2962ff;font-size:1.1rem;font-weight:bold;margin-top:1.5rem;}' +
                    '.epg-prog-name{font-size:1.4rem;color:#ccc;margin:.5rem 0;}' +
                    '.epg-bar{height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;}' +
                    '.epg-bar-inner{height:100%;background:#2962ff;width:0%;}' +
                    '</style>'
                );
            }

            this.loadPlaylist();
            return root;
        };

        /* =======================
           LOAD & PARSE PLAYLIST
        ======================= */
        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Обране': config.favorites };

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.indexOf('http') === 0) {
                        var item = {
                            name: name,
                            url: url,
                            group: group,
                            logo: logo,
                            tvg_id: tvg_id,
                            epgId: tvg_id || name
                        };
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                    }
                }
            }
            this.renderG();
        };

        /* =======================
           RENDER GROUPS / CHANNELS
        ======================= */
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
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];

            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item">' +
                    '<div class="channel-row">' +
                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +
                    '<div class="channel-title">' + c.name + '</div>' +
                    '</div></div>');

                row.on('click', function () {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                row.on('hover:focus', function () {
                    index_c = idx;
                    _this.showDetails(c);
                });

                colC.append(row);
            });

            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        /* =======================
           DETAILS + EPG
        ======================= */
        this.showDetails = function (channel) {
            colE.empty();

            var content = $(
                '<div>' +
                '<img src="' + channel.logo + '" style="width:100%;max-height:150px;object-fit:contain;margin-bottom:1rem;background:#000;padding:5px;border-radius:5px;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-prog-name" id="epg-title">Завантаження...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '</div>'
            );

            colE.append(content);

            epgUpdateData(channel.epgId);
            epgRender(channel.epgId);
        };

        /* =======================
           EPG FUNCTIONS
        ======================= */
        function epgUpdateData(epgId) {
            if (!epgId) return;

            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;

            if (EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) return;
            if (!EPG[epgId]) EPG[epgId] = [t, t, []];

            network.silent(
                Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' + encodeURIComponent(epgId) + '/hour/' + t,
                function (r) {
                    if (!r || !r.list) return;

                    var nowMin = Date.now() / 1000 / 60;
                    for (var i = 0; i < r.list.length; i++) {
                        if (nowMin < (r.list[i][0] + r.list[i][1])) {
                            EPG[epgId][2] = r.list.slice(i);
                            break;
                        }
                    }

                    EPG[epgId][0] = Math.min(EPG[epgId][0], t);
                    EPG[epgId][1] = Math.max(EPG[epgId][1], t + 3600);
                }
            );
        }

        function epgRender(epgId) {
            if (!EPG[epgId] || !EPG[epgId][2].length) return;

            var epg = EPG[epgId][2][0];
            if (!epg) return;

            var start = epg[0] * 60;
            var duration = epg[1] * 60;
            var now = Date.now() / 1000;
            var percent = Math.max(0, Math.min(100, ((now - start) / duration) * 100));

            $('#epg-title').text(epg[2] || 'Без назви');
            $('#epg-progress').css('width', percent + '%');
        }

        /* =======================
           NAVIGATION
        ======================= */
        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        this.start = function () {
            if (window.Lampa && Lampa.Storage) {
                var iptv_config = Lampa.Storage.get('iptv_config', {});
                iptv_config.xmltv_url = config.epg_url;
                Lampa.Storage.set('iptv_config', iptv_config);
            }

            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                down: function () {
                    if (active_col === 'groups') index_g++;
                    else index_c++;
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                right: function () {
                    if (active_col === 'groups')
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    }
                },
                enter: function () {
                    if (active_col === 'groups')
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else if (current_list[index_c])
                        Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });
                },
                back: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else Lampa.Activity.backward();
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
