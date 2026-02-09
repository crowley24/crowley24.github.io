// ==Lampa==
// name: IPTV PRO (Stable Fix)
// version: 12.5
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
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
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
                $('head').append('<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem;font-family:Roboto,sans-serif}' +
                    '.iptv-wrapper{display:flex;width:100%;height:100%;overflow:hidden}' +
                    '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,.05)}' +
                    '.col-groups{width:22rem;background:rgba(0,0,0,.35);flex-shrink:0}' +
                    '.col-channels{flex:1;background:rgba(255,255,255,.02);min-width:0}' +
                    '.col-details{width:32rem;background:#080a0d;padding:2rem;flex-shrink:0}' +
                    '.iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);cursor:pointer;transition:all .2s}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;transform:scale(1.02);box-shadow:0 10px 20px rgba(0,0,0,.4)}' +
                    '.channel-row{display:flex;align-items:center;gap:1.2rem}' +
                    '.channel-logo{width:44px;height:44px;object-fit:contain;background:#000;border-radius:.4rem;border:1px solid rgba(255,255,255,.1)}' +
                    '.channel-title{font-size:1.4rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
                    '.epg-now-label{color:#2962ff;font-size:1.1rem;font-weight:700;text-transform:uppercase}' +
                    '.epg-now-title{font-size:1.6rem;color:#fff;margin:.5rem 0 1rem 0;font-weight:700}' +
                    '.epg-progress{height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;margin-bottom:1.5rem}' +
                    '.epg-progress-line{height:100%;background:#2962ff}' +
                    '@media screen and (max-width:960px){.col-details{display:none}}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (Lampa.Loading && Lampa.Loading.show) Lampa.Loading.show();
            
            $.ajax({
                url: pl.url,
                success: function (str) {
                    if (Lampa.Loading && Lampa.Loading.hide) Lampa.Loading.hide();
                    _this.parse(str);
                },
                error: function () {
                    if (Lampa.Loading && Lampa.Loading.hide) Lampa.Loading.hide();
                    Lampa.Noty.show('Помилка завантаження плейлиста');
                }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Обране': config.favorites };
            all_channels = [];
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id };
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
            colG.append('<div class="btn-pl" style="padding:1.2rem;margin:.5rem;background:#2962ff;border-radius:.6rem;text-align:center;font-weight:700;cursor:pointer">📂 Плейлисти</div>');
            
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
                var is_fav = config.favorites.some(function(f) { return f.url === c.url; });
                var row = $('<div class="iptv-item ' + (is_fav ? 'is-fav' : '') + '">' +
                                '<div class="channel-row">' +
                                    '<img class="channel-logo" src="' + (c.logo || '') + '" onerror="this.src=\'https://via.placeholder.com/44?text=TV\'">' +
                                    '<div class="channel-title">' + c.name + '</div>' +
                                '</div>' +
                            '</div>');
                
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });
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

        this.showDetails = function (channel) {
            colE.empty();
            var content = $('<div class="details-content">' +
                '<img src="' + channel.logo + '" style="width:100%;height:auto;max-height:180px;border-radius:10px;margin-bottom:20px;background:#000;padding:10px;">' +
                '<div class="details-title" style="font-size:2rem;font-weight:700;">' + channel.name + '</div>' +
                '<div style="color:#666;font-size:1.2rem;margin-top:0.5rem;">ID: ' + (channel.tvg_id || '---') + '</div>' +
                '<div class="epg-info-box" style="margin-top:2rem;">' +
                    '<div class="epg-now-label">Зараз в ефірі</div>' +
                    '<div class="epg-now-title">Завантаження програми...</div>' +
                    '<div class="epg-progress"><div class="epg-progress-line" style="width:0%"></div></div>' +
                '</div>' +
            '</div>');
            colE.append(content);

            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                    if (data && data.program && data.program.length > 0) {
                        var now = data.program[0];
                        colE.find('.epg-now-title').text(now.title);
                        if (now.start && now.stop) {
                            var start = new Date(now.start * 1000).getTime();
                            var end = new Date(now.stop * 1000).getTime();
                            var current = new Date().getTime();
                            var perc = ((current - start) / (end - start)) * 100;
                            colE.find('.epg-progress-line').css('width', Math.min(100, Math.max(0, perc)) + '%');
                        }
                    } else {
                        colE.find('.epg-now-title').text('Програма відсутня');
                    }
                });
            }
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length && item[0].scrollIntoView) {
                item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
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
                back: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else Lampa.Activity.backward();
                }
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
