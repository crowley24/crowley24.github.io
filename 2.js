// ==Lampa==
// name: IPTV PRO (EPG Integrated)
// version: 13.5
// ==/Lampa==

(function () {
    'use strict';

    // Створюємо імітацію об'єкта plugin, якщо він не переданий системою
    var plugin = {
        name: 'IPTV PRO',
        component: 'iptv_pro'
    };

    var EPG = {};
    var CHANNELS_DB = { id2epg: {} };
    var listCfg = {
        epgApiChUrl: ''
    };

    // --- Допоміжні функції з вашого коду ---

    function networkSilentSessCache(url, success, fail) {
        var key = 'cache_' + url.replace(/\W/g, '');
        var cached = sessionStorage.getItem(key);
        if (cached) {
            var data = JSON.parse(cached);
            if (data[0]) success(data[1]); else fail(data[1]);
        } else {
            var network = new Lampa.Reguest();
            network.silent(url, function (data) {
                sessionStorage.setItem(key, JSON.stringify([true, data]));
                success(data);
            }, function (data) {
                sessionStorage.setItem(key, JSON.stringify([false, data]));
                fail(data);
            });
        }
    }

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var playlist_url = 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u';

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            this.injectStyles();
            this.initEPGDB();
            
            return root;
        };

        this.injectStyles = function() {
            if ($('#' + plugin.component + '-style').length) return;
            var style = '<style id="' + plugin.component + '-style">' +
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                '.col-groups{width:20%; min-width:180px;}' +
                '.col-channels{width:45%; flex-grow:1;}' +
                '.col-details{width:35%; padding:1.5rem; background:#080a0d;}' +
                '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                '.iptv-item.active{background:#2962ff;color:#fff;}' +
                '.channel-logo{width:44px;height:44px;object-fit:contain;margin-right:10px;}' +
                '.epg-bar{height:4px; background:rgba(255,255,255,0.1); margin-top:10px;}' +
                '.epg-bar-inner{height:100%; background:#2962ff; width:0%}' +
                '</style>';
            $('head').append(style);
        };

        this.initEPGDB = function() {
            // Використовуємо вашу логіку формування URL для бази
            listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/channels.json';
            networkSilentSessCache(listCfg.epgApiChUrl, function(data) {
                CHANNELS_DB = data;
                _this.loadPlaylist();
            }, function() {
                _this.loadPlaylist();
            });
        };

        this.getEpgId = function(c) {
            if (c.tvg_id && CHANNELS_DB.id2epg && CHANNELS_DB.id2epg[c.tvg_id]) return CHANNELS_DB.id2epg[c.tvg_id];
            return c.tvg_id || c.name;
        };

        this.showDetails = function (channel) {
            colE.empty();
            var epgId = this.getEpgId(channel);
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain;">' +
                '<div style="font-size:1.8rem; margin:1rem 0;">' + channel.name + '</div>' +
                '<div id="epg-title" style="font-size:1.4rem; color:#2962ff;">Завантаження...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div id="epg-time" style="margin-top:10px; opacity:0.6;"></div>' +
            '</div>');
            colE.append(content);

            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            var epgUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' + encodeURIComponent(epgId) + '/hour/' + t;

            networkSilentSessCache(epgUrl, function(r) {
                if (r && r.list) {
                    var now = Math.floor(Date.now() / 1000 / 60);
                    var current = r.list.find(function(p) { return (now >= p[0] && now < (p[0] + p[1])); });
                    if (current) {
                        $('#epg-title').text(current[2]);
                        var perc = Math.round((now - current[0]) * 100 / current[1]);
                        $('#epg-progress').css('width', perc + '%');
                        var st = new Date(current[0] * 60000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        $('#epg-time').text(st + ' (тривалість ' + current[1] + ' хв)');
                    } else $('#epg-title').text('Програма відсутня');
                }
            }, function() {
                $('#epg-title').text('EPG недоступне');
            });
        };

        // --- Завантаження плейлиста ---
        this.loadPlaylist = function() {
            var network = new Lampa.Reguest();
            network.silent(playlist_url, function(str) {
                _this.parse(str);
            }, function() {
                Lampa.Noty.show('Помилка завантаження');
            });
        };

        this.parse = function(str) {
            var lines = str.split('\n');
            groups_data = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (lines[i].match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (lines[i].match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i+1] ? lines[i+1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({name:name, url:url, logo:logo, tvg_id:tvg_id});
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
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
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
            Lampa.Controller.add(plugin.component, {
                toggle: function() { _this.updateFocus(); },
                up: function() { 
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                down: function() {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length-1, index_g + 1);
                    else index_c = Math.min(current_list.length-1, index_c + 1);
                    _this.updateFocus();
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);
                },
                enter: function() {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else Lampa.Player.play(current_list[index_c]);
                },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle(plugin.component);
        };

        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove(plugin.component); root.remove(); };
    }

    function pluginStart() {
        Lampa.Component.add(plugin.component, IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">' + plugin.name + '</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: plugin.name, component: plugin.component });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') pluginStart(); });

})();
