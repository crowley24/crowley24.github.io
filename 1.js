// ==Lampa==
// name: IPTV PRO EPG
// version: 12.2
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
        var current_epg_req = null;

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [],
            favorites: [],
            current_pl_index: 0
        });

        /* ================= FAVORITES ================= */

        this.toggleFavorite = function (channel) {
            var index = config.favorites.findIndex(f => f.url === channel.url);
            if (index > -1) config.favorites.splice(index, 1);
            else config.favorites.push(channel);

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
            colE = $('<div class="iptv-col col-details"><div class="epg-empty">EPG</div></div>');

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
.col-details{width:26rem;background:#080a0d;padding:1.5rem;color:#fff}
.iptv-item{padding:1rem;margin:.4rem;border-radius:.5rem;background:rgba(255,255,255,.04);cursor:pointer}
.iptv-item.active{background:#2962ff}
.iptv-item.is-fav:before{content:'⭐ ';color:#ffd700}

.channel-row{display:flex;align-items:center;gap:1rem}
.channel-logo{width:48px;height:48px;object-fit:contain;background:#111;border-radius:.4rem;flex-shrink:0}
.channel-logo.empty{display:flex;align-items:center;justify-content:center;color:#777}

.epg-title{font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
.epg-time{font-size:.9rem;color:#aaa;margin-bottom:1rem}
.epg-desc{font-size:.95rem;line-height:1.4}
.epg-empty{color:#777}
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
                success: str => _this.parse(str),
                error: () => Lampa.Noty.show('Ошибка загрузки плейлиста')
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
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.indexOf('http') === 0) {
                        var item = {
                            name,
                            url,
                            group,
                            logo,
                            tvg_id
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
            Object.keys(groups_data).forEach((g, i) => {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', () => {
                    index_g = i;
                    _this.renderC(groups_data[g]);
                });
                colG.append(item);
            });
            active_col = 'groups';
            this.updateFocus();
        };

        /* ================= CHANNELS ================= */

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];

            current_list.forEach((c, i) => {
                var logo = c.logo
                    ? `<img class="channel-logo" src="${c.logo}">`
                    : `<div class="channel-logo empty">📺</div>`;

                var row = $(`
                    <div class="iptv-item">
                        <div class="channel-row">
                            ${logo}
                            <div>${c.name}</div>
                        </div>
                    </div>
                `);

                row.on('hover', () => {
                    index_c = i;
                    _this.updateFocus();
                    _this.loadEPG(c);
                });

                row.on('click', () => {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                colC.append(row);
            });

            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
            if (current_list[0]) this.loadEPG(current_list[0]);
        };

        /* ================= EPG ================= */

        this.loadEPG = function (channel) {
            colE.html('<div class="epg-empty">Загрузка EPG…</div>');

            var id = channel.tvg_id || channel.name;

            Lampa.Tvg.get({ id: id, name: channel.name }, function (epg) {
                if (!epg || !epg.list || !epg.list.length) {
                    colE.html('<div class="epg-empty">EPG недоступно</div>');
                    return;
                }

                var now = Date.now();
                var current = epg.list.find(p => p.start <= now && p.end >= now) || epg.list[0];

                colE.html(`
                    <div class="epg-title">${current.title || channel.name}</div>
                    <div class="epg-time">
                        ${Lampa.Utils.time(current.start)} – ${Lampa.Utils.time(current.end)}
                    </div>
                    <div class="epg-desc">${current.desc || ''}</div>
                `);
            });
        };

        /* ================= FOCUS ================= */

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            if (active_col === 'groups') colG.find('.iptv-item').eq(index_g).addClass('active');
            else colC.find('.iptv-item').eq(index_c).addClass('active');
        };

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: () => { if (active_col === 'channels') index_c = Math.max(0, index_c - 1); _this.updateFocus(); },
                down: () => { if (active_col === 'channels') index_c = Math.min(current_list.length - 1, index_c + 1); _this.updateFocus(); },
                back: () => active_col === 'channels' ? (_this.renderG()) : Lampa.Activity.backward()
            });

            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = () => root;
        this.destroy = () => root.remove();
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', e => e.type === 'ready' && init());

})();
