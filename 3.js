// ==Lampa==
// name: IPTV PRO Final Fix
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
    .iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem;font-family: 'Roboto', sans-serif;}
    .iptv-wrapper{display:flex;width:100%;height:100%;overflow:hidden;position:relative;}
    
    .iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,.05);transition: all 0.3s;}
    
    /* Ліва колонка */
    .col-groups{width:22rem;background:rgba(0,0,0,.3);flex-shrink:0;}
    
    /* Середня колонка */
    .col-channels{flex:1;background:rgba(0,0,0,.1);min-width:0;}
    
    /* Права колонка */
    .col-details{width:30rem;background:#080a0d;padding:2rem;flex-shrink:0;border-right:none;}
    
    .iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);color:rgba(255,255,255,.8);cursor:pointer;transition:background 0.2s, transform 0.1s;}
    .iptv-item.active{background:#2962ff;color:#fff;transform: scale(1.02);box-shadow: 0 4px 15px rgba(0,0,0,0.3);}
    .iptv-item.is-fav:before{content:'⭐ ';color:#ffd700}
    
    .btn-pl, .btn-search{padding:1.2rem;margin:.5rem;border-radius:.6rem;text-align:center;font-weight:700;cursor:pointer;font-size:1.3rem;}
    .btn-pl{background:#2962ff;color:#fff;}
    .btn-search{background:rgba(255,255,255,0.1);color:#fff;}

    .channel-row{display:flex;align-items:center;gap:1.2rem;}
    .channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.4rem;flex-shrink:0;}
    .channel-logo.empty{display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#555;}
    .channel-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:1.4rem;}

    /* Деталі каналу */
    .details-content{display:flex;flex-direction:column;gap:1.5rem;animation: fadeIn 0.3s;}
    .details-logo{width:100%;max-height:180px;object-fit:contain;background:#000;border-radius:1rem;padding:1rem;}
    .details-title{font-size:2rem;font-weight:700;color:#fff;}
    .details-desc{font-size:1.4rem;color:#aaa;line-height:1.5;}

    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    /* Адаптація для телефонів */
    @media screen and (max-width: 960px) {
        .col-details { display: none; } /* Ховаємо інфо на малих екранах */
        .col-groups { width: 18rem; }
    }
</style>`);
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl) return;
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка завантаження'); }
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
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group, logo: logo };
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
            var btnPl = $('<div class="btn-pl">📂 Плейлисти</div>').on('click', function () { _this.playlistMenu(); });
            var btnSearch = $('<div class="btn-search">🔍 Пошук</div>').on('click', function () { _this.searchChannels(); });
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

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var is_fav = config.favorites.some(f => f.url === c.url);
                var logo_html = c.logo ? '<img class="channel-logo" src="' + c.logo + '">' : '<div class="channel-logo empty">📺</div>';
                var row = $(`
                    <div class="iptv-item ${is_fav ? 'is-fav' : ''}">
                        <div class="channel-row">
                            ${logo_html}
                            <div class="channel-title">${c.name}</div>
                        </div>
                    </div>
                `);

                // При натисканні - граємо
                row.on('click', function () {
                    Lampa.Player.play({ url: c.url, title: c.name });
                });

                // При фокусі - показуємо інфо в правій колонці
                row.on('hover:focus', function() {
                    index_c = idx;
                    _this.showDetails(c);
                });

                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length > 0) _this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.showDetails = function(channel) {
            colE.empty();
            var content = $(`
                <div class="details-content">
                    ${channel.logo ? `<img src="${channel.logo}" class="details-logo">` : '<div class="details-logo" style="text-align:center; font-size:5rem;">📺</div>'}
                    <div class="details-title">${channel.name}</div>
                    <div class="details-desc">Група: ${channel.group}<br><br>Натисніть OK для перегляду. Натисніть довго для додавання в Обране.</div>
                </div>
            `);
            colE.append(content);
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var targetCol = active_col === 'groups' ? colG : colC;
            var item = targetCol.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            
            if (item.length) {
                item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };

        /* ================= CONTROLLER & NAV ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                    if(active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                    if(active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                right: function () {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                },
                left: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                },
                enter: function () {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else if (current_list[index_c]) Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });
                },
                long: function () {
                    if (active_col === 'channels' && current_list[index_c]) _this.toggleFavorite(current_list[index_c]);
                },
                back: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.toggleFavorite = function (channel) {
            var index = config.favorites.findIndex(f => f.url === channel.url);
            if (index > -1) {
                config.favorites.splice(index, 1);
                Lampa.Noty.show('Вилучено з обраного');
            } else {
                config.favorites.push(channel);
                Lampa.Noty.show('Додано в обране');
            }
            Lampa.Storage.set(storage_key, config);
            this.renderC(current_list);
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
                                                                       
