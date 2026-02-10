// ==Lampa==
// name: IPTV PRO (Ultimate EPG)
// version: 13.0
// ==/Lampa==

(function () {
    'use strict';

    var EPG_CACHE = {};
    var CHANNELS_DB = { id2epg: {}, epgPath: '' };
    var DB_LOADED = false;

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

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
                    '.channel-logo{width:44px;height:44px;object-fit:contain;background:#000;border-radius:.3rem;flex-shrink:0;}' +
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:1.6rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +
                    '.epg-now-label{color:#2962ff; font-size:1rem; font-weight:bold; margin-top:1.5rem; text-transform:uppercase;}' +
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0; line-height:1.4;}' +
                    '.epg-bar{height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin:10px 0;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s;}' +
                    '.epg-time-range{font-size:1.1rem; color:#888;}' +
                    '</style>');
            }

            this.initDatabase();
            return root;
        };

        // --- Логіка Бази Даних та ID ---

        this.initDatabase = function() {
            if(DB_LOADED) return this.loadPlaylist();
            // Спроба завантажити загальну базу (як у вашому коді через channelsUri)
            // Використовуємо універсальний шлях, якщо конкретний не задано
            var url = 'https://epg.rootu.top/api/channels.json'; 
            
            $.ajax({
                url: url,
                method: 'GET',
                success: function(data) {
                    CHANNELS_DB = data;
                    CHANNELS_DB.epgPath = data.epgPath ? '/' + data.epgPath : '';
                    DB_LOADED = true;
                    _this.loadPlaylist();
                },
                error: function() {
                    DB_LOADED = true; // продовжуємо навіть без бази
                    _this.loadPlaylist();
                }
            });
        };

        this.getEpgId = function(c) {
            if (c.tvg_id && CHANNELS_DB.id2epg && CHANNELS_DB.id2epg[c.tvg_id]) return CHANNELS_DB.id2epg[c.tvg_id];
            
            // Спрощена логіка пошуку за назвою (аналог epgIdByName)
            var name = c.name.toLowerCase().replace(/hd|fhd|4k|телеканал/gi, '').trim();
            // Тут можна було б додати повний перебір як у п.2, але для швидкості:
            return c.tvg_id || c.name;
        };

        // --- Отримання та Рендер EPG ---

        this.getEPG = function(epgId, callback) {
            var t = Math.floor(Date.now() / 1000 / 3600) * 3600; // Поточна година
            
            if (EPG_CACHE[epgId] && EPG_CACHE[epgId].t === t) {
                return callback(EPG_CACHE[epgId].data);
            }

            var url = 'https://epg.rootu.top/api' + CHANNELS_DB.epgPath + '/epg/' + encodeURIComponent(epgId) + '/hour/' + t;

            $.ajax({
                url: url,
                method: 'GET',
                success: function(r) {
                    if (r && r.list) {
                        EPG_CACHE[epgId] = { t: t, data: r.list };
                        callback(r.list);
                    } else callback(null);
                },
                error: function() { callback(null); }
            });
        };

        this.showDetails = function (channel) {
            colE.empty();
            var epgId = this.getEpgId(channel);
            
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" class="details-logo" style="width:100%; max-height:180px; object-fit:contain; background:#000; border-radius:8px; padding:10px; margin-bottom:15px;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now-label">Зараз:</div>' +
                '<div class="epg-prog-name" id="epg-title">...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div class="epg-time-range" id="epg-time">Пошук програми...</div>' +
            '</div>');
            colE.append(content);

            this.getEPG(epgId, function(list) {
                if (list && list.length) {
                    var now = Math.floor(Date.now() / 1000 / 60); // Час у хвилинах (як в API)
                    var current = list.find(function(p) { return (now >= p[0] && now < (p[0] + p[1])); });

                    if (current) {
                        var start = new Date(current[0] * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        var end = new Date((current[0] + current[1]) * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        var progress = Math.round((now - current[0]) * 100 / current[1]);

                        $('#epg-title').text(current[2]);
                        $('#epg-time').text(start + ' — ' + end);
                        $('#epg-progress').css('width', Math.min(100, progress) + '%');
                    } else {
                        $('#epg-title').text('Перерва у мовленні');
                    }
                } else {
                    $('#epg-time').text('Програма на поточну годину відсутня');
                }
            });
        };

        // --- Базові функції плейлиста ---

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.ajax({
                url: pl.url,
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
                                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/44?text=TV\'">' +
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

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            var item = target.find('.iptv-item').eq(idx);
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
