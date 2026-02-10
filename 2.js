// ==Lampa==
// name: IPTV PRO (Authenticated)
// version: 15.0
// ==/Lampa==

(function () {
    'use strict';

    var plugin = {
        name: 'IPTV PRO',
        component: 'iptv_pro'
    };

    var UID = '';
    
    // Ініціалізація UID як у вашому робочому плагіні
    UID = Lampa.Storage.get('iptv_uid', '');
    if (!UID) {
        UID = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-').substring(0, 12);
        Lampa.Storage.set('iptv_uid', UID);
    }

    // --- Ваші оригінальні утиліти для підпису ---
    
    function unixtime() {
        return Math.floor(Date.now() / 1000);
    }

    var utils = {
        uid: function() { return UID; },
        hash: Lampa.Utils.hash,
        hash36: function(s) { 
            var h = this.hash(s);
            return (h * 1).toString(36); 
        }
    };

    function generateSigForString(string) {
        var sigTime = unixtime();
        return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());
    }

    // --- Основний компонент ---

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
            this.loadPlaylist();
            
            return root;
        };

        this.loadPlaylist = function() {
            var _this = this;
            // Формуємо URL з підписом
            var sig = generateSigForString(playlist_url);
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(playlist_url) + 
                      '&uid=' + UID + '&sig=' + sig;

            var network = new Lampa.Reguest();
            network.silent(url, function(str) {
                if (str && str.indexOf('#EXTM3U') >= 0) {
                    _this.parse(str);
                } else {
                    Lampa.Noty.show('Помилка: сервер повернув пустий список');
                }
            }, function() {
                Lampa.Noty.show('Помилка мережі (Sign Error)');
            }, false, {dataType: 'text'});
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

        this.showDetails = function (channel) {
            colE.empty();
            var epgId = channel.tvg_id || channel.name;
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; background:#000;">' +
                '<div style="font-size:1.6rem; margin:1rem 0;">' + channel.name + '</div>' +
                '<div id="epg-title" style="color:#2962ff;">Завантаження...</div>' +
                '<div id="epg-time" style="opacity:0.5; font-size:0.9rem;"></div>' +
            '</div>');
            colE.append(content);

            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            var epgUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' + encodeURIComponent(epgId) + '/hour/' + t;
            
            // Для API EPG також додаємо підпис
            var sig = generateSigForString(epgUrl);
            var finalUrl = epgUrl + (epgUrl.indexOf('?') >= 0 ? '&' : '?') + 'uid=' + UID + '&sig=' + sig;

            var network = new Lampa.Reguest();
            network.silent(finalUrl, function(r) {
                if (r && r.list && r.list.length) {
                    var now = Math.floor(Date.now() / 1000 / 60);
                    var current = r.list.find(function(p) { return (now >= p[0] && now < (p[0] + p[1])); });
                    if (current) {
                        $('#epg-title').text(current[2]);
                        $('#epg-time').text('Початок: ' + new Date(current[0] * 60000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
                    }
                } else {
                    $('#epg-title').text('Програма відсутня');
                }
            }, function(){}, false, {dataType: 'json'});
        };

        // --- Рендеринг та контролер (спрощено для тесту) ---

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).sort().forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('hover:enter', function () { active_col = 'groups'; _this.renderC(groups_data[g]); });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('hover:enter', function () { Lampa.Player.play(c); });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            target.find('.iptv-item').eq(idx).addClass('active');
        };

        this.injectStyles = function() {
            if ($('#iptv-style').length) return;
            $('head').append('<style id="iptv-style">' +
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                '.iptv-flex-wrapper{display:flex;width:100%;height:100%;}' +
                '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid #222;}' +
                '.col-groups{width:200px;}' +
                '.col-channels{flex-grow:1;}' +
                '.col-details{width:300px; padding:1rem;}' +
                '.iptv-item{padding:0.8rem; margin:2px; background:rgba(255,255,255,0.05); cursor:pointer;}' +
                '.iptv-item.active{background:#2962ff;}' +
                '</style>');
        };

        this.start = function () {
            Lampa.Controller.add(plugin.component, {
                toggle: function() { _this.updateFocus(); },
                up: function() { if(active_col==='groups') index_g=Math.max(0,index_g-1); else index_c=Math.max(0,index_c-1); _this.updateFocus(); },
                down: function() { if(active_col==='groups') index_g++; else index_c++; _this.updateFocus(); },
                right: function() { if(active_col==='groups') active_col='channels'; _this.updateFocus(); },
                left: function() { if(active_col==='channels') active_col='groups'; _this.updateFocus(); },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle(plugin.component);
        };

        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove(plugin.component); root.remove(); };
    }

    function pluginStart() {
        Lampa.Component.add(plugin.component, IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') pluginStart(); });

})();
