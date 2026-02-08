// ==Lampa==
// name: IPTV PRO Final Fix
// version: 12.6
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

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u'
            }],
            favorites: [],
            current_pl_index: 0
        });

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"><div class="epg-empty">Очікування...</div></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append(`
<style id="iptv-style-v12">
.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem}
.iptv-wrapper{display:flex;width:100%;height:100%}
.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,.1);scroll-behavior:smooth}
.col-groups{width:20rem;background:rgba(0,0,0,.25)}
.col-channels{flex:1;background:rgba(0,0,0,.15)}
.col-details{width:25rem;background:#080a0d;padding:2rem;color:#fff}
.iptv-item{padding:1rem;margin:.4rem;border-radius:.5rem;background:rgba(255,255,255,.04);cursor:pointer}
.iptv-item.active{background:#2962ff;outline: 2px solid #fff}
.iptv-item.is-fav:before{content:'⭐ ';color:#ffd700}
.channel-row{display:flex;align-items:center;gap:1rem}
.channel-logo{width:48px;height:48px;object-fit:contain;background:#111;border-radius:.4rem}
.epg-title{font-weight:700;font-size:1.2rem;margin-bottom:.5rem;color:#2962ff}
.epg-time{font-size:1rem;color:#aaa;margin-bottom:.7rem}
.epg-desc{font-size:.9rem;line-height:1.4;color:#ddd}
.epg-empty{color:#777;text-align:center;margin-top:2rem}
</style>`);
            }
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl) return;
            // Використовуємо Lampa.Reguest для обходу деяких обмежень
            $.ajax({
                url: pl.url,
                method: 'GET',
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
                    var name = (l.match(/,(.*)$/) || [,''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || [,'ЗАГАЛЬНІ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url && url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id };
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                    }
                }
            }
            this.renderG();
        };

        /* ================= EPG FIX ================= */
        this.loadEPG = function (channel) {
            colE.html('<div class="epg-empty">Шукаю програму...</div>');
            
            // Перевіряємо наявність Tvg через невелику паузу
            var tryLoad = function(attempts) {
                if (typeof Lampa !== 'undefined' && Lampa.Tvg && Lampa.Tvg.get) {
                    Lampa.Tvg.get({
                        id: channel.tvg_id,
                        name: channel.name
                    }, function (epg) {
                        if (epg && epg.list && epg.list.length > 0) {
                            var now = Date.now();
                            var cur = epg.list.find(function (p) {
                                return p.start <= now && p.end >= now;
                            }) || epg.list[0];

                            colE.html(`
                                <div class="epg-title">${cur.title}</div>
                                <div class="epg-time">${Lampa.Utils.time(cur.start)} – ${Lampa.Utils.time(cur.end)}</div>
                                <div class="epg-desc">${cur.desc || 'Опис відсутній'}</div>
                            `);
                        } else {
                            colE.html('<div class="epg-empty">Програма не знайдена в базі</div>');
                        }
                    });
                } else if (attempts > 0) {
                    setTimeout(function() { tryLoad(attempts - 1); }, 500);
                } else {
                    colE.html('<div class="epg-empty">Помилка: Модуль EPG не активний</div>');
                }
            };

            tryLoad(5); // 5 спроб завантаження модуля
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, i) {
                var row = $(`<div class="iptv-item"><div class="channel-row"><div class="channel-title">${c.name}</div></div></div>`);
                row.on('mouseenter', function () {
                    index_c = i;
                    _this.updateFocus();
                    _this.loadEPG(c);
                });
                row.on('click', function () { 
                    Lampa.Player.play({ url: c.url, title: c.name }); 
                });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
            if (current_list.length > 0) this.loadEPG(current_list[0]);
        };

        this.renderG = function () {
            colG.empty();
            var keys = Object.keys(groups_data);
            keys.forEach(function (g, i) {
                var row = $('<div class="iptv-item">' + g + '</div>');
                row.on('click', function () { index_g = i; _this.renderC(groups_data[g]); });
                colG.append(row);
            });
            active_col = 'groups';
            index_g = 0;
            _this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var active_item = (active_col === 'groups') ? colG.find('.iptv-item').eq(index_g) : colC.find('.iptv-item').eq(index_c);
            if (active_item.length) {
                active_item.addClass('active');
                var container = active_col === 'groups' ? colG : colC;
                container.stop().animate({ scrollTop: active_item.position().top + container.scrollTop() - (container.height() / 2) }, 200);
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.loadEPG(current_list[index_c]);
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.loadEPG(current_list[index_c]);
                },
                enter: function () {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else if (current_list[index_c]) Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });
                },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); root.remove(); };
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
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
