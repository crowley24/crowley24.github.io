// ==Lampa==
// name: IPTV PRO (Native Auth)
// version: 16.0
// ==/Lampa==

(function () {
    'use strict';

    var plugin = {
        name: 'IPTV PRO',
        component: 'iptv_pro'
    };

    var UID = Lampa.Storage.get('uid', '');
    if (!UID) {
        UID = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-').substring(0, 12);
        Lampa.Storage.set('uid', UID);
    }

    function unixtime() { return Math.floor(Date.now() / 1000); }

    // Використовуємо структуру utils з вашого коду
    var utils = {
        uid: function() { return UID; },
        timestamp: unixtime,
        hash: Lampa.Utils.hash,
        hash36: function(s) { 
            return (Lampa.Utils.hash(s) * 1).toString(36); 
        }
    };

    function generateSigForString(string) {
        var sigTime = unixtime();
        return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());
    }

    // Оригінальна функція кешування запитів
    function networkSilentSessCache(url, success, fail) {
        var key = 'cache_' + utils.hash36(url);
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
            }, false, {dataType: 'text'});
        }
    }

    function IPTVComponent() {
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
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(playlist_url) + 
                      '&uid=' + UID + '&sig=' + generateSigForString(playlist_url);

            networkSilentSessCache(url, function(str) {
                if (str.indexOf('#EXTM3U') >= 0) _this.parse(str);
                else Lampa.Noty.show('Помилка даних');
            }, function() {
                Lampa.Noty.show('Помилка мережі (Auth Failed)');
            });
        };

        this.parse = function(str) {
            var lines = str.split('\n');
            groups_data = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', 'No Name'])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var url = (lines[i+1] || '').trim();
                    if (url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({
                            name: name, url: url, 
                            logo: (lines[i].match(/tvg-logo="([^"]+)"/i) || ['', ''])[1],
                            tvg_id: (lines[i].match(/tvg-id="([^"]+)"/i) || ['', ''])[1]
                        });
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
                    index_g = i; active_col = 'groups'; 
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
                row.on('hover:enter', function () { Lampa.Player.play(c); });
                row.on('hover:focus', function () { index_c = idx; _this.showEPG(c); });
                colC.append(row);
            });
            active_col = 'channels';
            this.updateFocus();
        };

        this.showEPG = function(c) {
            colE.html('<div style="padding:1rem;"><h3>' + c.name + '</h3><p id="epg-text">Завантаження програми...</p></div>');
            var epgId = c.tvg_id || c.name;
            var t = Math.floor(unixtime() / 3600) * 3600;
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' + encodeURIComponent(epgId) + '/hour/' + t;
            var finalUrl = url + '?uid=' + UID + '&sig=' + generateSigForString(url);

            var network = new Lampa.Reguest();
            network.silent(finalUrl, function(r) {
                if (r && r.list && r.list.length) {
                    var now = unixtime() / 60;
                    var cur = r.list.find(function(p){ return now >= p[0] && now < (p[0]+p[1]); });
                    $('#epg-text').text(cur ? cur[2] : 'Програма відсутня');
                }
            }, function(){}, false, {dataType: 'json'});
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            var el = target.find('.iptv-item').eq(idx);
            el.addClass('active');
            if (el[0] && el[0].scrollIntoView) el[0].scrollIntoView({block:'center'});
        };

        this.injectStyles = function() {
            if ($('#iptv-style').length) return;
            $('head').append('<style id="iptv-style">' +
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                '.iptv-flex-wrapper{display:flex;height:100%;}' +
                '.iptv-col{overflow-y:auto;border-right:1px solid #222;height:100%}' +
                '.col-groups{width:220px;}.col-channels{flex-grow:1;}.col-details{width:300px;}' +
                '.iptv-item{padding:0.8rem;margin:2px;background:rgba(255,255,255,0.05);cursor:pointer;}' +
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

    function init() {
        Lampa.Component.add(plugin.component, IPTVComponent);
        var setup = function() {
            var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
            item.on('hover:enter', function() { Lampa.Activity.push({title:'IPTV PRO', component:plugin.component}); });
            $('.menu .menu__list').append(item);
        };
        if (window.appready) setup();
        else Lampa.Listener.follow('app', function(e){ if(e.type==='ready') setup(); });
    }

    init();
})();
              
