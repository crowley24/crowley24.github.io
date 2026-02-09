// ==Lampa==
// name: IPTV PRO (Stable Edition)
// version: 16.0
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
        var epg_cache = {}; 

        var config = {
            playlist_url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u',
            epg_url: 'https://iptvx.one/EPG_LITE'
        };

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v16').length) {
                $('head').append('<style id="iptv-style-v16">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; min-width:180px;}' +
                    '.col-channels{width:40%; flex-grow:1;}' +
                    '.col-details{width:40%; background:#080a0d; padding:2rem;}' +
                    '.iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.channel-row{display:flex;align-items:center;gap:1.5rem;}' +
                    '.channel-logo{width:50px;height:50px;object-fit:contain;background:#000;border-radius:.5rem;}' +
                    '.epg-title{font-size:1.8rem; color:#eee; margin:1rem 0; font-weight: 500; min-height: 4rem;}' +
                    '</style>');
            }

            this.loadPlaylist();
            this.tryLoadEPG(); 
            return root;
        };

        this.loadPlaylist = function () {
            Lampa.Network.silent(config.playlist_url, function (str) {
                _this.parse(str);
            }, function() {
                Lampa.Noty.show('Помилка завантаження плейлиста');
            });
        };

        this.tryLoadEPG = function() {
            // Завантаження EPG не повинно блокувати UI
            Lampa.Network.silent(config.epg_url, function(xmlString) {
                try {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlString, "text/xml");
                    var programs = xmlDoc.getElementsByTagName("programme");
                    var now = Date.now() / 1000;

                    for (var i = 0; i < programs.length; i++) {
                        var p = programs[i];
                        var id = p.getAttribute("channel");
                        var start = _this.parseTime(p.getAttribute("start"));
                        var stop = _this.parseTime(p.getAttribute("stop"));
                        
                        if (now >= start && now <= stop) {
                            epg_cache[id] = p.getElementsByTagName("title")[0].textContent;
                        }
                    }
                    if (current_list.length) _this.showDetails(current_list[index_c]);
                } catch(e) { console.log('EPG Parse Error'); }
            });
        };

        this.parseTime = function(s) {
            return new Date(s.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).getTime() / 1000;
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            var last_group = 'ЗАГАЛЬНІ';

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', last_group])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = (lines[i+1] || '').trim();

                    if (url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({ name: name, url: url, logo: logo, tvg_id: tvg_id });
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            var keys = Object.keys(groups_data);
            keys.forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function () { 
                    index_g = i; 
                    active_col = 'groups'; 
                    _this.renderC(groups_data[g]); 
                });
                colG.append(item);
            });
            if (keys.length > 0 && active_col === 'groups') _this.renderC(groups_data[keys[0]]);
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
            index_c = 0;
            if (current_list.length) _this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            var prog = epg_cache[channel.tvg_id] || 'Програма відсутня або завантажується...';
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:180px; object-fit:contain; margin-bottom:2rem; background:#000; border-radius:10px;">' +
                '<div style="font-size:2.2rem; color:#fff; font-weight:700;">' + channel.name + '</div>' +
                '<div style="color:#2962ff; font-size:1.2rem; font-weight:bold; margin-top:2rem;">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-title">' + prog + '</div>' +
                '<div style="margin-top:2rem; color:#222; font-size:1rem;">ID: ' + channel.tvg_id + '</div>' +
            '</div>');
            colE.append(content);
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
                    if (active_col === 'groups') { active_col = 'channels'; _this.updateFocus(); }
                },
                left: function () { 
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                },
                enter: function () {
                    if (active_col === 'groups') { active_col = 'channels'; _this.updateFocus(); }
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
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
