// ==Lampa==
// name: IPTV PRO (EPG Fixed)
// version: 18.0
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

    function generateSigForString(string) {
        var sigTime = unixtime();
        var hash = (Lampa.Utils.hash((string || '') + sigTime + UID) * 1).toString(36);
        return sigTime.toString(36) + ':' + hash;
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

        this.injectStyles = function() {
            if ($('#iptv-style').length) return;
            $('head').append('<style id="iptv-style">' +
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:3.5rem;}' +
                '.iptv-flex-wrapper{display:flex;height:100%;width:100%;overflow:hidden;}' +
                '.iptv-col{overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05);height:100%;-webkit-overflow-scrolling:touch;}' +
                '.col-groups{width:180px;flex-shrink:0;background:rgba(255,255,255,0.02);}' +
                '.col-channels{flex-grow:1;background:rgba(255,255,255,0.01);}' +
                '.col-details{width:300px;flex-shrink:0;padding:1rem;background:#080a0d;border-left:1px solid #222;}' +
                '.iptv-item{padding:0.8rem 1rem;margin:0.2rem 0.5rem;background:rgba(255,255,255,0.05);border-radius:0.4rem;cursor:pointer;font-size:1rem;}' +
                '.iptv-item.active{background:#2962ff;color:#fff;}' +
                '.iptv-item.focus{background:rgba(255,255,255,0.12); border:1px solid #2962ff;}' +
                '.epg-image{width:100%;max-height:120px;object-fit:contain;background:#000;border-radius:6px;margin-bottom:10px;}' +
                '.epg-title{font-size:1.1rem;font-weight:bold;margin-bottom:8px;}' +
                '.epg-text{font-size:0.9rem;color:#2962ff;line-height:1.3;}' +
                // На маленьких екранах в портретному режимі ховаємо EPG, але в ландшафтному (як на скрині) залишаємо
                '@media screen and (max-height: 400px) { .col-details { width: 220px; font-size: 0.8rem; } }' +
                '</style>');
        };

        this.loadPlaylist = function() {
            var sig = generateSigForString(playlist_url);
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(playlist_url) + '&uid=' + UID + '&sig=' + sig;
            var network = new Lampa.Reguest();
            network.silent(url, function(str) {
                if (str.indexOf('#EXTM3U') >= 0) _this.parse(str);
                else Lampa.Noty.show('Помилка даних плейлиста');
            }, function() {
                Lampa.Noty.show('Помилка мережі');
            }, false, {dataType: 'text'});
        };

        this.parse = function(str) {
            var lines = str.split('\n');
            groups_data = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', 'Channel'])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var logo = (lines[i].match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (lines[i].match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = (lines[i+1] || '').trim();
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
            Object.keys(groups_data).sort().forEach(function (g, i) {
                var item = $('<div class="iptv-item selector">' + g + '</div>');
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
                var row = $('<div class="iptv-item selector">' + c.name + '</div>');
                // При натисканні спочатку фокусуємо (щоб підтягнути EPG), а при другому натисканні або через Player.play
                row.on('hover:enter', function () { 
                    Lampa.Player.play({ url: c.url, title: c.name }); 
                });
                row.on('hover:focus', function () { 
                    index_c = idx; 
                    _this.showEPG(c); 
                    _this.updateFocus();
                });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
        };

        this.showEPG = function(c) {
    colE.html(
        '<div class="epg-box">' +
        '<img src="' + c.logo + '" class="epg-image" onerror="this.src=\'https://via.placeholder.com/200x120?text=No+Logo\'">' +
        '<div class="epg-title">' + c.name + '</div>' +
        '<div id="epg-content" class="epg-text">Завантаження...</div>' +
        '</div>'
    );

    var epgId =
        c.tvg_id ||
        c.name.replace(/\s+/g, '') ||
        c.name;

    var t = Math.floor(unixtime() / 3600) * 3600 - 3600;
    var url = Lampa.Utils.protocol() + 'epg.rootu.top/api/epg/' +
        encodeURIComponent(epgId) + '/hour/' + t;

    var finalUrl = url + '?uid=' + UID + '&sig=' + generateSigForString(url);

    var network = new Lampa.Reguest();
    network.silent(finalUrl, function(r) {

        if (r && r.list && r.list.length) {
            var now = unixtime(); // ✅ СЕКУНДИ

            var cur = r.list.find(function(p) {
                return now >= p[0] && now < (p[0] + p[1]);
            });

            if (cur) {
                $('#epg-content').html(
                    '<b>Зараз у ефірі:</b><br>' + cur[2]
                );
            } else {
                $('#epg-content').text('Програма на цей час відсутня');
            }
        } else {
            $('#epg-content').text('Дані EPG не знайдено');
        }

    }, function(){
        $('#epg-content').text('Не вдалося завантажити EPG');
    }, false, { dataType: 'json' });
};

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active focus');
            var target = active_col === 'groups' ? colG : colC;
            var idx = active_col === 'groups' ? index_g : index_c;
            var el = target.find('.iptv-item').eq(idx);
            el.addClass('active focus');
            if (el[0] && el[0].scrollIntoView) el[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        this.start = function () {
            Lampa.Controller.add(plugin.component, {
                toggle: function() { _this.updateFocus(); },
                up: function() { 
                    if(active_col==='groups') index_g=Math.max(0,index_g-1); 
                    else index_c=Math.max(0,index_c-1); 
                    _this.updateFocus(); 
                    if(active_col==='channels') _this.showEPG(current_list[index_c]);
                },
                down: function() { 
                    if(active_col==='groups') index_g++; 
                    else index_c++; 
                    _this.updateFocus(); 
                    if(active_col==='channels') _this.showEPG(current_list[index_c]);
                },
                right: function() { 
                    if(active_col==='groups') {
                        active_col='channels';
                        _this.renderC(groups_data[Object.keys(groups_data).sort()[index_g]]);
                    }
                },
                left: function() { 
                    if(active_col==='channels') { active_col='groups'; _this.updateFocus(); }
                },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle(plugin.component);
        };

        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove(plugin.component); root.remove(); };
    }

    function init() {
        Lampa.Component.add(plugin.component, IPTVComponent);
        var setupMenu = function() {
            if ($('.menu .menu__list').find('.iptv-menu-item').length) return;
            var item = $('<li class="menu__item selector iptv-menu-item"><div class="menu__text">IPTV PRO</div></li>');
            item.on('hover:enter', function() { 
                Lampa.Activity.push({title:'IPTV PRO', component:plugin.component}); 
            });
            $('.menu .menu__list').append(item);
        };
        if (window.appready) setupMenu();
        else Lampa.Listener.follow('app', function(e){ if(e.type==='ready') setupMenu(); });
    }

    init();
})();
    
