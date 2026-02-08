// ==Lampa==
// name: IPTV PRO Logos
// version: 12.1
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC;
        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{ name: 'TEST', url: '' }],
            favorites: [],
            current_pl_index: 0
        });

        /* ================= CREATE ================= */

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            root.append($('<div class="iptv-wrapper"></div>').append(colG, colC));

            if (!$('#iptv-style-logos').length) {
                $('head').append(`
<style id="iptv-style-logos">
.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem}
.iptv-wrapper{display:flex;height:100%}
.iptv-col{overflow-y:auto}
.col-groups{width:20rem;border-right:1px solid rgba(255,255,255,.1)}
.col-channels{flex:1}
.iptv-item{display:flex;align-items:center;gap:1rem;padding:.8rem 1rem;margin:.4rem;border-radius:.5rem;background:rgba(255,255,255,.04);color:#fff}
.iptv-item.active{background:#2962ff}
.channel-logo{width:48px;height:48px;object-fit:contain;background:#111;border-radius:.4rem;flex-shrink:0}
.channel-logo.empty{display:flex;align-items:center;justify-content:center;font-size:1.5rem}
</style>`);
            }

            this.loadPlaylist();
            return root;
        };

        /* ================= LOAD ================= */

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl || !pl.url) return;

            $.get(pl.url)
                .done(str => _this.parse(str))
                .fail(() => Lampa.Noty.show('Ошибка загрузки M3U'));
        };

        /* ================= PARSE ================= */

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            all_channels = [];

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.startsWith('#EXTINF')) {
                    var name = (l.match(/,(.*)$/) || [,''])[1];
                    var group = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (!url.startsWith('http')) continue;

                    var item = { name, url, group, logo };

                    all_channels.push(item);
                    if (!groups_data[group]) groups_data[group] = [];
                    groups_data[group].push(item);
                }
            }

            this.renderG();
        };

        /* ================= GROUPS ================= */

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach((g, i) => {
                var row = $('<div class="iptv-item">' + g + '</div>');
                row.on('click', () => {
                    index_g = i;
                    _this.renderC(groups_data[g]);
                });
                colG.append(row);
            });
            this.updateFocus();
        };

        /* ================= CHANNELS ================= */

        this.renderC = function (list) {
            colC.empty();
            current_list = list;
            active_col = 'channels';
            index_c = 0;

            list.forEach(c => {
                var logo = c.logo
                    ? `<img class="channel-logo" loading="lazy" src="${c.logo}">`
                    : `<div class="channel-logo empty">📺</div>`;

                var row = $(`
                    <div class="iptv-item">
                        ${logo}
                        <div>${c.name}</div>
                    </div>
                `);

                row.on('click', () => {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                colC.append(row);
            });

            this.updateFocus();
        };

        /* ================= FOCUS ================= */

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            if (active_col === 'groups')
                colG.find('.iptv-item').eq(index_g).addClass('active');
            else
                colC.find('.iptv-item').eq(index_c).addClass('active');
        };

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: () => { index_c = Math.max(0, index_c - 1); this.updateFocus(); },
                down: () => { index_c = Math.min(current_list.length - 1, index_c + 1); this.updateFocus(); },
                left: () => { active_col = 'groups'; this.updateFocus(); },
                enter: () => current_list[index_c] && Lampa.Player.play(current_list[index_c]),
                back: () => active_col === 'channels' ? (active_col = 'groups', this.updateFocus()) : Lampa.Activity.backward()
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = () => root;
        this.destroy = () => { Lampa.Controller.remove('iptv_pro'); root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        $('.menu .menu__list').append(
            $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>')
                .on('hover:enter', () => Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }))
        );
    }

    window.app_ready ? init() : Lampa.Listener.follow('app', e => e.type === 'ready' && init());
})();
