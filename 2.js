// ==Lampa==
// name: IPTV PRO (Final Fix)
// version: 14.0
// ==/Lampa==

(function () {
    'use strict';

    var plugin = {
        name: 'IPTV PRO',
        component: 'iptv_pro'
    };

    var UID = '';
    var EPG_CACHE = {};
    var CHANNELS_DB = { id2epg: {} };

    // --- Допоміжні функції ---

    function getUID() {
        var uid = Lampa.Storage.get('iptv_uid', '');
        if (!uid) {
            uid = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-').substring(0, 12);
            Lampa.Storage.set('iptv_uid', uid);
        }
        return uid;
    }

    function networkRequest(url, success, fail) {
        var network = new Lampa.Reguest();
        // Додаємо UID до запиту, як у робочому плагіні
        var separator = url.indexOf('?') >= 0 ? '&' : '?';
        var finalUrl = url + separator + 'uid=' + UID;
        
        network.silent(finalUrl, success, fail, false, {dataType: 'text'});
    }

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        
        // Ваше посилання
        var playlist_url = 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u';

        this.create = function () {
            UID = getUID();
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            this.injectStyles();
            this.loadPlaylist(); // Завантажуємо безпосередньо
            
            return root;
        };

        this.injectStyles = function() {
            if ($('#' + plugin.component + '-style').length) return;
            $('head').append('<style id="' + plugin.component + '-style">' +
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                '.col-groups{width:220px; flex-shrink:0;}' +
                '.col-channels{flex-grow:1;}' +
                '.col-details{width:350px; padding:1.5rem; background:#080a0d;}' +
                '.iptv-item{padding:0.8rem 1rem; margin:0.2rem 0.5rem; border-radius:0.4rem; cursor:pointer; font-size:1.1rem;}' +
                '.iptv-item.active{background:#2962ff; color:#fff;}' +
                '.epg-bar{height:4px; background:rgba(255,255,255,0.1); margin-top:10px; border-radius:2px; overflow:hidden;}' +
                '.epg-bar-inner{height:100%; background:#2962ff; width:0%}' +
                '</style>');
        };

        this.loadPlaylist = function() {
            // Використовуємо проксі cors.php, як у вашому прикладі
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(playlist_url);
            
            networkRequest(url, function(str) {
                if (str && str.indexOf('#EXTM3U') >= 0) {
                    _this.parse(str);
                } else {
                    Lampa.Noty.show('Формат плейлиста не підтримується');
                }
            }, function() {
                Lampa.Noty.show('Помилка мережі');
            });
        };

        this.parse = function(str) {
            var lines = str.split('\n');
            groups_data = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', 'Без назви'])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (lines[i].match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (lines[i].match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = (lines[i+1] && lines[i+1].indexOf('http') === 0) ? lines[i+1].trim() : '';
                    
                    if (url) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({name:name, url:url, logo:logo, tvg_id:tvg_id});
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).sort().forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('hover:enter', function () { 
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
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('hover:enter', function () { 
                    Lampa.Player.play({ url: c.url, title: c.name }); 
                });
                row.on('hover:focus', function () { 
                    index_c = idx; 
                    _this.showDetails(c); 
                });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            var epgId = channel.tvg_id || channel.name;
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; border-radius:5px; background:#000;">' +
                '<div style="font-size:1.6rem; margin:1rem 0; font-weight:bold;">' + channel.name + '</div>' +
                '<div id="epg-title" style="font-size:1.2rem; color:#2962ff;">Завантаження програми...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div id="epg-time" style="margin-top:8px; opacity:0.5; font-size:0.9rem;"></div>' +
            '</div>');
            colE.append(content);

            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            var epgUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' + encodeURIComponent(epgId) + '/hour/' + t;

            var network = new Lampa.Reguest();
            network.silent(epgUrl + '?uid=' + UID, function(r) {
                if (r && r.list) {
                    var now = Math.floor(Date.now() / 1000 / 60);
                    var current = r.list.find(function(p) { return (now >= p[0] && now < (p[0] + p[1])); });
                    if (current) {
                        $('#epg-title').text(current[2]);
                        var perc = Math.round((now - current[0]) * 100 / current[1]);
                        $('#epg-progress').css('width', Math.min(100, perc) + '%');
                        var st = new Date(current[0] * 60000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                        $('#epg-time').text('Початок: ' + st);
                    } else $('#epg-title').text('Програма відсутня');
                }
            }, function(){}, false, {dataType: 'json'});
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            var item = target.find('.iptv-item').eq(idx);
            item.addClass('active');
            if (item.length && item[0].scrollIntoView) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        this.start = function () {
            Lampa.Controller.add(plugin.component, {
                toggle: function() { _this.updateFocus(); },
                up: function() { 
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function() {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length-1, index_g + 1);
                    else index_c = Math.min(current_list.length-1, index_c + 1);
                    _this.updateFocus();
                },
                right: function() {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data).sort()[index_g]]);
                },
                left: function() {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
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
