// ==Lampa==
// name: IPTV PRO (Fixed CORS & EPG)
// version: 13.0
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

        var storage_key = 'iptv_pro_v13';
        var UID = Lampa.Storage.get('uid', Lampa.Utils.uid(12).toUpperCase());
        Lampa.Storage.set('uid', UID);

        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

        // Спрощений підпис, який найчастіше використовується в подібних плагінах
        function generateSig(str) {
            var t = Math.floor(Date.now() / 1000);
            var h = (Lampa.Utils.hash((str || '') + t + UID) * 1).toString(36);
            return t.toString(36) + ':' + h;
        }

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
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0; min-height:3em;}' +
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin-top:10px;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(pl.url) + '&uid=' + UID + '&sig=' + generateSig(pl.url);
            
            var network = new Lampa.Reguest();
            network.silent(url, function (str) { 
                _this.parse(str); 
            }, function () {
                // Якщо основний проксі впав, пробуємо через вбудований проксі Lampa
                var backupUrl = Lampa.Utils.protocol() + 'proxy.cub.watch/proxy/' + pl.url;
                network.silent(backupUrl, function(str){ _this.parse(str); }, function(){
                    Lampa.Noty.show('Помилка завантаження плейлиста');
                }, false, {dataType:'text'});
            }, false, { dataType: 'text' });
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
                    // Фікс Mixed Content: замінюємо http на https для логотипів
                    if (logo) logo = logo.replace('http://', 'https://');
                    
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

        this.showDetails = function (channel) {
            colE.empty();
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" onerror="this.src=\'https://via.placeholder.com/200x120?text=TV\'" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:5px; border-radius:5px;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now">ЗАРАЗ В ЕФІРІ:</div>' +
                '<div class="epg-prog-name" id="epg-title">Завантаження програми...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div style="margin-top:2rem; font-size:1.1rem; color:#555;">ID: ' + (channel.tvg_id || '---') + '</div>' +
                '</div>');
            colE.append(content);

            if (channel.tvg_id) {
                var cacheKey = 'epg_cache_' + channel.tvg_id;
                var cached = sessionStorage.getItem(cacheKey);

                if (cached) {
                    renderEPGData(JSON.parse(cached));
                } else {
                    // Використовуємо JSON-шлюз для стабільності
                    var epgUrl = 'https://epg.it999.ru/json/' + channel.tvg_id;
                    var network = new Lampa.Reguest();
                    network.silent(epgUrl, function (data) {
                        if (data && data.list) {
                            sessionStorage.setItem(cacheKey, JSON.stringify(data));
                            renderEPGData(data);
                        } else {
                            $('#epg-title').text('Програма відсутня');
                        }
                    }, function () {
                        $('#epg-title').text('Сервіс EPG недоступний');
                    });
                }
            } else {
                $('#epg-title').text('EPG ID не вказано');
            }

            function renderEPGData(data) {
                var now = Math.floor(Date.now() / 1000);
                var current = (data.list || []).find(function (p) {
                    return now >= p.start && now <= p.stop;
                });

                if (current) {
                    var prg = Math.min(100, Math.max(0, ((now - current.start) / (current.stop - current.start)) * 100));
                    $('#epg-title').text(current.title);
                    $('#epg-progress').css('width', prg + '%');
                } else {
                    $('#epg-title').text('Немає даних на цей час');
                }
            }
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
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item">' +
                    '<div class="channel-row">' +
                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +
                    '<div class="channel-title">' + c.name + '</div>' +
                    '</div>' +
                    '</div>');
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });
                row.on('hover:focus', function () { 
                    index_c = idx; 
                    _this.showDetails(c); 
                    _this.updateFocus();
                });
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
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length && item[0].scrollIntoView) {
                item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () { 
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1); 
                    else index_c = Math.max(0, index_c - 1); 
                    _this.updateFocus(); 
                },
                down: function () { 
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1); 
                    else index_c = Math.min(current_list.length - 1, index_c + 1); 
                    _this.updateFocus(); 
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
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
