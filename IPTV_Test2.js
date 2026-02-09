// ==Lampa==
// name: IPTV PRO (Ultimate EPG Engine)
// version: 15.0
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
        var epg_data = {}; // Локальна база EPG

        var storage_key = 'iptv_pro_v15';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epg_url: 'https://iptvx.one/EPG_LITE',
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

            if (!$('#iptv-style-v15').length) {
                $('head').append('<style id="iptv-style-v15">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; min-width:180px;}' +
                    '.col-channels{width:40%; flex-grow:1;}' +
                    '.col-details{width:40%; background:#080a0d; padding:2rem;}' +
                    '.iptv-item{padding:1.2rem;margin:.4rem;border-radius:.6rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff; transform: scale(1.02);}' +
                    '.epg-status{font-size:1.1rem; color:#ffc107; margin-bottom:1rem; text-align:right;}' +
                    '.epg-prog-name{font-size:1.8rem; color:#eee; margin:1rem 0; font-weight: 500; min-height: 5rem; line-height:1.3;}' +
                    '.epg-time{font-size:1.4rem; color:#2962ff; font-weight:bold;}' +
                    '.epg-bar{height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin-top:1.5rem;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s;}' +
                    '</style>');
            }

            this.loadPlaylist();
            this.loadDirectEPG(); // Запуск автономного двигуна
            return root;
        };

        // АВТОНОМНИЙ ПАРСЕР EPG
        this.loadDirectEPG = function() {
            console.log('IPTV PRO: Loading EPG Lite...');
            Lampa.Network.silent(config.epg_url, function(xmlString) {
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlString, "text/xml");
                var programmes = xmlDoc.getElementsByTagName("programme");
                
                epg_data = {};
                for (var i = 0; i < programmes.length; i++) {
                    var p = programmes[i];
                    var id = p.getAttribute("channel");
                    if (!epg_data[id]) epg_data[id] = [];
                    
                    var start = _this.parseXmlTime(p.getAttribute("start"));
                    var stop = _this.parseXmlTime(p.getAttribute("stop"));
                    var title = p.getElementsByTagName("title")[0].textContent;
                    
                    epg_data[id].push({start: start, stop: stop, title: title});
                }
                Lampa.Noty.show('Програму оновлено');
                if (current_list.length) _this.showDetails(current_list[index_c]);
            });
        };

        this.parseXmlTime = function(str) {
            // Формат: 20240520120000 +0300
            var y = str.substr(0,4), m = str.substr(4,2)-1, d = str.substr(6,2);
            var h = str.substr(8,2), min = str.substr(10,2), s = str.substr(12,2);
            return new Date(Date.UTC(y, m, d, h, min, s)).getTime() / 1000;
        };

        this.loadPlaylist = function () {
            Lampa.Network.silent(config.playlists[config.current_pl_index].url, function (str) {
                _this.parse(str);
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
                    var url = (lines[i+1] || '').trim();
                    if (url.indexOf('http') === 0) {
                        groups_data[group] = groups_data[group] || [];
                        groups_data[group].push({ name: name, url: url, logo: logo, tvg_id: tvg_id });
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
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            var status = epg_data[channel.tvg_id] ? '● Online' : '○ Loading';
            var content = $('<div class="details-box">' +
                '<div class="epg-status">' + status + '</div>' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:180px; object-fit:contain; margin-bottom:2rem; background:#000; padding:10px; border-radius:10px;">' +
                '<div style="font-size:2.4rem; color:#fff; font-weight:700; line-height:1.1;">' + channel.name + '</div>' +
                '<div style="color:#2962ff; font-size:1.2rem; font-weight:bold; margin-top:2rem;">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-time" id="e-time">--:--</div>' +
                '<div class="epg-prog-name" id="e-title">Програма завантажується...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="e-bar"></div></div>' +
            '</div>');
            colE.append(content);

            // ПОШУК У ВЛАСНІЙ БАЗІ
            if (epg_data[channel.tvg_id]) {
                var now = Date.now() / 1000;
                var list = epg_data[channel.tvg_id];
                var current = list.find(function(p) { return now >= p.start && now <= p.stop; });
                
                if (current) {
                    $('#e-title').text(current.title);
                    var st = new Date(current.start * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                    var en = new Date(current.stop * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                    $('#e-time').text(st + ' - ' + en);
                    var perc = ((now - current.start) / (current.stop - current.start)) * 100;
                    $('#e-bar').css('width', Math.min(100, perc) + '%');
                } else {
                    $('#e-title').text('Немає даних на цей час');
                }
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
                right: function () { if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]); },
                left: function () { if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); } },
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
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
