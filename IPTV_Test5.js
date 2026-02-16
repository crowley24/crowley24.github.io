// ==Lampa==
// name: IPTV PRO (EPG Fixed & Protected)
// version: 13.2
// ==/Lampa==

(function ($, Lampa) {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        
        var EPG_CACHE = {};
        var CH_IDS = { id2epg: {} };
        var EPG_PATH = '';

        var config = {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            // Спробуємо отримати загальний конфіг через проксі
            epgApiUrl: 'https://cors.lampa.app/http://epg.rootu.top/api/channels.json'
        };

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v13').length) {
                $('head').append('<style id="iptv-style-v13">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; min-width:180px; flex-shrink:0;}' +
                    '.col-channels{width:45%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:35%; min-width:300px; flex-shrink:0; background:#080a0d; padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:1.6rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +
                    '.epg-now{color:#2962ff; font-size:1.1rem; font-weight:bold; margin-top:1.5rem;}' +
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0; height: 3.5rem; overflow: hidden;}' +
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin-top:10px;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s ease;}' +
                    '</style>');
            }

            this.initEPGMap();
            this.loadPlaylist();
            return root;
        };

        this.initEPGMap = function() {
            $.ajax({
                url: config.epgApiUrl,
                method: 'GET',
                dataType: 'json',
                success: function(d) {
                    if(d) {
                        CH_IDS = d;
                        if (d.epgPath) EPG_PATH = '/' + d.epgPath;
                    }
                },
                error: function() { console.log('IPTV PRO: Map fail'); }
            });
        };

        var chShortName = function(chName){
            return (chName || "").toLowerCase()
                .replace(/\s+\(архив\)$/, '')
                .replace(/^телеканал\s+/, '')
                .replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim();
        };

        this.showDetails = function (channel) {
            colE.empty();
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:5px; border-radius:5px;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now">В ЕФІРІ:</div>' +
                '<div class="epg-prog-name" id="epg-title">Шукаю програму...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
            '</div>');
            colE.append(content);

            var shortN = chShortName(channel.name);
            // Пріоритет: tvg_id -> словник id2epg -> назва
            var epgId = (CH_IDS.id2epg && CH_IDS.id2epg[channel.tvg_id]) || (CH_IDS.id2epg && CH_IDS.id2epg[shortN]) || channel.tvg_id || shortN;

            var timeNow = Math.floor(Date.now() / 1000);
            var hourStart = Math.floor(timeNow / 3600) * 3600;

            if (EPG_CACHE[epgId] && EPG_CACHE[epgId].hour === hourStart) {
                renderEPG(EPG_CACHE[epgId].list);
            } else {
                var url = 'https://cors.lampa.app/http://epg.rootu.top/api' + EPG_PATH + '/epg/' + encodeURIComponent(epgId) + '/hour/' + hourStart;
                $.ajax({
                    url: url,
                    method: 'GET',
                    success: function (r) {
                        if (r && r.list && r.list.length) {
                            EPG_CACHE[epgId] = { hour: hourStart, list: r.list };
                            renderEPG(r.list);
                        } else {
                            $('#epg-title').text('Програма недоступна');
                        }
                    },
                    error: function () { $('#epg-title').text('Сервер EPG не відповідає'); }
                });
            }

            function renderEPG(list) {
                var nowMin = Date.now() / 1000 / 60;
                var current = list.find(function(p) { return nowMin >= p[0] && nowMin < (p[0] + p[1]); });
                if (current) {
                    $('#epg-title').text(current[2]);
                    var perc = ((nowMin - current[0]) / current[1]) * 100;
                    $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');
                } else {
                    $('#epg-title').text('Кінець програми');
                }
            }
        };

        this.loadPlaylist = function () {
            $.ajax({
                url: config.playlists[0].url,
                method: 'GET',
                success: function (str) { _this.parse(str); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { 'УСІ КАНАЛИ': [] };
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'УСІ КАНАЛИ'])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url && url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];
                        var item = { name: name, url: url, logo: logo, tvg_id: tvg_id };
                        groups_data[group].push(item);
                        groups_data['УСІ КАНАЛИ'].push(item);
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
            colC.empty(); current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item"><div class="channel-row">' +
                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +
                    '<div class="channel-title">' + c.name + '</div></div></div>');
                row.on('click', function () { 
                    if(Lampa.Player) Lampa.Player.play({ url: c.url, title: c.name }); 
                });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels'; index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length && item[0].scrollIntoView) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus(); if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus(); if (active_col === 'channels') _this.showDetails(current_list[index_c]);
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
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); if(root) root.remove(); };
    }

    function init() {
        if (!window.Lampa) return;
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})(window.jQuery, window.Lampa);
