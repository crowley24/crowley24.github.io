// ==Lampa==
// name: IPTV PRO (Grid Layout Fix)
// version: 12.6
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
            // Використовуємо GRID для чіткого розподілу 250px | Гнучка | 350px
            var container = $('<div class="iptv-grid-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append('<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:5rem;}' +
                    '.iptv-grid-wrapper{display:grid;grid-template-columns:25rem 1fr 35rem;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;position:relative;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-details{background:#080a0d;border-right:none;padding:2rem;display:block !important;}' +
                    '.iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;box-shadow:0 5px 15px rgba(0,0,0,0.4);}' +
                    '.channel-row{display:flex;align-items:center;gap:1.2rem;}' +
                    '.channel-logo{width:50px;height:50px;object-fit:contain;background:#000;border-radius:.4rem;}' +
                    '.channel-title{font-size:1.5rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-now-title{font-size:1.8rem;color:#fff;margin:1rem 0;font-weight:700;line-height:1.3;}' +
                    '.epg-progress{height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;margin-bottom:2rem;}' +
                    '.epg-progress-line{height:100%;background:#2962ff;}' +
                    '@media screen and (max-width:960px){' +
                        '.iptv-grid-wrapper{grid-template-columns:22rem 1fr;}' +
                        '.col-details{display:none !important;}' +
                    '}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка завантаження'); }
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
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id };
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
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
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item">' +
                                '<div class="channel-row">' +
                                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/50?text=TV\'">' +
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
                '<img src="' + channel.logo + '" style="width:100%; border-radius:10px; background:#000; padding:10px; margin-bottom:2rem;">' +
                '<div class="details-title" style="font-size:2.2rem; font-weight:700;">' + channel.name + '</div>' +
                '<div style="color:#2962ff; font-weight:bold; margin-top:2rem;">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-now-title">Завантаження програми...</div>' +
                '<div class="epg-progress"><div class="epg-progress-line" style="width:0%"></div></div>' +
                '<div style="color:#666; font-size:1.2rem;">ID: ' + (channel.tvg_id || 'немає') + '</div>' +
            '</div>');
            colE.append(content);

            // Виклик EPG
            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                    if (data && data.program && data.program[0]) {
                        var p = data.program[0];
                        colE.find('.epg-now-title').text(p.title);
                        if (p.start && p.stop) {
                            var perc = ((Date.now() / 1000 - p.start) / (p.stop - p.start)) * 100;
                            colE.find('.epg-progress-line').css('width', Math.min(100, Math.max(0, perc)) + '%');
                        }
                    } else {
                        colE.find('.epg-now-title').text('Програма на сьогодні відсутня');
                    }
                });
            }
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
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
