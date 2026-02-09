// ==Lampa==
// name: IPTV PRO (EPG Native Fix)
// version: 13.6
// ==/Lampa==

(function () {
    'use strict';

    // Глобальні змінні з твого коду
    var EPG = {};
    var epgPath = '';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v13';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            favorites: [],
            current_pl_index: 0
        });

        // Твоя логіка обробки назв каналів
        var chShortName = function (chName) {
            return chName.toLowerCase()
                .replace(/\s+\(архив\)$/, '')
                .replace(/\s+\((\+\d+)\)/g, ' $1')
                .replace(/^телеканал\s+/, '')
                .replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ')
                .trim()
                .replace(/\s(канал|тв)(\s.+|\s*)$/, '$2')
                .replace(/\s(\d+)/g, '$1');
        };

        // Твій метод завантаження EPG (Дослівно)
        this.epgUpdateData = function(epgId) {
            if (!epgId) return;
            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;

            // Якщо вже є в кеші — показуємо
            if (EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) {
                _this.epgRenderUI(epgId);
                return;
            }

            var url = 'https://epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t;

            // Використовуємо внутрішній метод network.silent як у твоєму прикладі
            Lampa.Network.silent(url, function (r) {
                if (r && r.list) {
                    var epg = r.list;
                    var lt = Date.now() / 1000 / 60;

                    for (var i = 0; i < epg.length; i++) {
                        if (lt < (epg[i][0] + epg[i][1])) {
                            EPG[epgId] = [t, t + 3600, epg.slice(i)];
                            break;
                        }
                    }
                    _this.epgRenderUI(epgId);
                } else {
                    $('#epg-title').text('Програма відсутня');
                }
            });
        };

        this.epgRenderUI = function(epgId) {
            if (!EPG[epgId] || !EPG[epgId][2] || !EPG[epgId][2][0]) return;
            
            var current = EPG[epgId][2][0];
            var title = current[2];
            var start = current[0]; 
            var duration = current[1];
            
            $('#epg-title').text(title);
            
            var lt = Date.now() / 1000 / 60;
            var percent = ((lt - start) / duration) * 100;
            
            $('#epg-progress').css('width', Math.min(100, Math.max(0, percent)) + '%');
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
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%;}' +
                    '.col-channels{width:45%; flex-grow:1;}' +
                    '.col-details{width:35%; background:#080a0d; padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;}' +
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0; min-height:3rem;}' +
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); margin-top:10px;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.3s;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            Lampa.Network.silent(pl.url, function (str) { _this.parse(str); });
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
                    if (url && url.indexOf('http') === 0) {
                        var item = { 
                            name: name, 
                            url: url, 
                            group: group, 
                            logo: logo, 
                            tvg_id: tvg_id || chShortName(name) 
                        };
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
                                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40\'">' +
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
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem;">' +
                '<div style="font-size:1.6rem; color:#fff; font-weight:700;">' + channel.name + '</div>' +
                '<div style="color:#2962ff; font-weight:bold; margin-top:1.5rem;">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-prog-name" id="epg-title">...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div style="margin-top:1rem; opacity:0.3; font-size: 0.8rem;">ID: ' + channel.tvg_id + '</div>' +
            '</div>');
            colE.append(content);

            _this.epgUpdateData(channel.tvg_id);
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

    // Головна зміна: чекаємо повної готовності Lampa
    function init() {
        if (window.iptv_pro_inited) return;
        window.iptv_pro_inited = true;
        
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
