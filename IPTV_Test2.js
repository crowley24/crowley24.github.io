// ==Lampa==
// name: IPTV PRO Final Edition
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

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epg_url: 'https://iptvx.one/epg/epg.xml.gz', // Ваше посилання
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

            if (!$('#iptv-style-final').length) {
                $('head').append('<style id="iptv-style-final">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; min-width:180px; flex-shrink:0;}' +
                    '.col-channels{width:40%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:40%; min-width:300px; flex-shrink:0; background:#080a0d; padding:2rem;}' +
                    '.iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);cursor:pointer; transition: 0.2s;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff; transform: scale(1.02); z-index: 10;}' +
                    '.channel-row{display:flex;align-items:center;gap:1.5rem;}' +
                    '.channel-logo{width:54px;height:54px;object-fit:contain;background:#000;border-radius:.5rem; border: 1px solid rgba(255,255,255,0.1);}' +
                    '.channel-title{font-size:1.6rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:2.4rem; color:#fff; font-weight:700; margin-bottom:1.5rem; line-height: 1.2;}' +
                    '.epg-now-label{color:#2962ff; font-size:1.2rem; font-weight:bold; margin-top:2rem; text-transform: uppercase; letter-spacing: 1px;}' +
                    '.epg-prog-name{font-size:1.8rem; color:#eee; margin:1rem 0; font-weight: 500; min-height: 2.2rem;}' +
                    '.epg-bar{height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-top: 1rem;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s;}' +
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
                error: function () { Lampa.Noty.show('Помилка плейлиста'); }
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
                    var url = (lines[i + 1] || '').trim();
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
                item.on('click', function () { index_g = i; active_col = 'groups'; _this.renderC(groups_data[g]); });
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
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:200px; object-fit:contain; margin-bottom:2rem; background:#000; padding:15px; border-radius:10px; border: 1px solid rgba(255,255,255,0.05);">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now-label">Зараз в ефірі:</div>' +
                '<div class="epg-prog-name" id="epg-title">Перевірка програми...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div style="margin-top:2rem; font-size:1.3rem; color:#444;">ID: ' + (channel.tvg_id || 'немає') + '</div>' +
            '</div>');
            colE.append(content);

            // Виклик EPG з пріоритетом tvg-id
            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                    if (data && data.program && data.program[0]) {
                        var p = data.program[0];
                        $('#epg-title').text(p.title);
                        if (p.start && p.stop) {
                            var now = Date.now() / 1000;
                            var perc = ((now - p.start) / (p.stop - p.start)) * 100;
                            $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');
                        }
                    } else {
                        $('#epg-title').text('Програма недоступна');
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
            // Примусово встановлюємо джерело EPG в налаштування Lampa
            Lampa.Storage.set('iptv_xmltv_url', config.epg_url); 
            
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
                  
