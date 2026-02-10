// ==Lampa==
// name: IPTV PRO (EPG Details Only)
// version: 12.8.2
// ==/Lampa==

(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    var $ = Lampa.$;

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        /* =======================
           EPG STATE (DETAILS ONLY)
        ======================= */
        var activeEPG = null;
        var epgTimer = null;

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

            this.loadPlaylist();
            return root;
        };

        /* =======================
           LOAD PLAYLIST
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
                            logo: logo,
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
           GROUPS / CHANNELS
        ======================= */
        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function () {
                    index_g = i;
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
                var row = $('<div class="iptv-item">' + c.name + '</div>');
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

            if (epgTimer) clearInterval(epgTimer);
            activeEPG = channel.epgId;

            var title = $('<div class="epg-title-big">' + channel.name + '</div>');
            var now = $('<div class="epg-prog-name">Завантаження…</div>');
            var bar = $('<div class="epg-bar"><div class="epg-bar-inner"></div></div>');

            colE.append(title, now, bar);

            function updateEPG() {
                if (!activeEPG) return;

                var t = Math.floor(Date.now() / 1000 / 3600) * 3600;

                Lampa.Network.silent(
                    Lampa.Utils.protocol() +
                    'epg.rootu.top/api/epg/' +
                    encodeURIComponent(activeEPG) +
                    '/hour/' + t,
                    function (r) {
                        if (!r || !r.list || !r.list.length) {
                            now.text('EPG недоступний');
                            return;
                        }

                        var p = r.list[0];
                        var start = p[0] * 60;
                        var dur = p[1] * 60;
                        var cur = Date.now() / 1000;
                        var percent = Math.max(0, Math.min(100, ((cur - start) / dur) * 100));

                        now.text(p[2] || 'Без назви');
                        bar.find('.epg-bar-inner').css('width', percent + '%');
                    }
                );
            }

            updateEPG();
            epgTimer = setInterval(updateEPG, 10000);
        };

        /* =======================
           NAVIGATION
        ======================= */
        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            target.find('.iptv-item').eq(idx).addClass('active');
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () { index_c = Math.max(0, index_c - 1); _this.updateFocus(); },
                down: function () { index_c++; _this.updateFocus(); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () {
            if (epgTimer) clearInterval(epgTimer);
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
