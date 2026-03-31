(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var epg_cache = {};
        var epg_interval; 

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
            }],
           // epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            epg_url: 'http://1lot.tv/epg/epg.xml',
            favorites: [],
            current_pl_index: 0
        });

        var chShortName = function(chName){
            return chName.toLowerCase()
                .replace(/\s+\(архив\)$/, '')
                .replace(/\s+\((\+\d+)\)/g, ' $1')
                .replace(/^телеканал\s+/, '')
                .replace(/hd|fhd|uhd|4k|sd|50fps|orig|original/g, '')
                .replace(/([!\s.,()–-]+)/g, '').trim();
        };

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-style-v12').length) {
                $('head').append('<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; min-width:180px; flex-shrink:0;}' +
                    '.col-channels{width:35%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:45%; min-width:350px; flex-shrink:0; background:#080a0d; padding:2rem; position: relative;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;box-shadow: 0 4px 15px rgba(41, 98, 255, 0.3);}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:45px;height:45px;object-fit:contain;background:#000;border-radius:.4rem;}' +
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-full-box{display: flex; flex-direction: column; height: 100%;}' +
                    '.epg-big-logo{width: 100px; height: 100px; object-fit: contain; margin-bottom: 1.5rem; background: #000; border-radius: 10px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);}' +
                    '.epg-title-big{font-size:2.2rem; color:#fff; font-weight:700; margin-bottom:0.5rem; line-height: 1.1;}' +
                    '.epg-now-label{color:#2962ff; font-size:1rem; font-weight:bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 1.5rem;}' +
                    '.epg-prog-name{font-size:1.7rem; color:#fff; margin:0.5rem 0 1rem 0; font-weight: 500;}' +
                    '.epg-timeline{display: flex; justify-content: space-between; font-size: 1.2rem; color: #888; margin-bottom: 0.5rem; font-family: monospace;}' +
                    '.epg-bar{height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom: 2rem;}' +
                    '.epg-bar-inner{height:100%; background: linear-gradient(90deg, #2962ff 0%, #00d2ff 100%); width:0%; transition: width 0.5s ease-out;}' +
                    '.epg-description{font-size:1.25rem; color:#aaa; line-height:1.6; overflow-y: auto; flex-grow: 1; padding-right: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl || !pl.url) return;
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка завантаження'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Обране': config.favorites };
            var current_group = 'ЗАГАЛЬНІ';
                
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', current_group])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                        
                    if (url && url.indexOf('http') === 0) {
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
                var item = $('<div class="iptv-item">' + g + ' (' + groups_data[g].length + ')</div>');
                item.on('click', function () { 
                    index_g = i; active_col = 'groups'; 
                    _this.renderC(groups_data[g]); 
                    _this.updateFocus();
                });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item"><div class="channel-row">' +
                                '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/45?text=TV\'">' +
                                '<div class="channel-title">' + c.name + '</div>' +
                            '</div></div>');
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        // --- ВИПРАВЛЕНИЙ loadEPG (з перевіркою наявності Lampa.Tvg) ---
        this.loadEPG = function(channel, callback) {
            var id = channel.tvg_id || '';
            var name = channel.name;
            var cache_key = id + '_' + chShortName(name);

            if (epg_cache[cache_key]) return callback(epg_cache[cache_key]);

            // Перевіряємо чи є взагалі об'єкт Tvg, якщо ні - використовуємо заглушку
            var TvgApi = Lampa.Tvg || (Lampa.Iptv ? Lampa.Iptv.tvg() : null);

            if (TvgApi && typeof TvgApi.get === 'function') {
                TvgApi.get({ id: id, name: name }, function(data) {
                    if (!data || !data.program || !data.program.length) {
                        TvgApi.get({ id: '', name: chShortName(name) }, function(data_alt) {
                            epg_cache[cache_key] = data_alt;
                            callback(data_alt);
                        });
                    } else {
                        epg_cache[cache_key] = data;
                        callback(data);
                    }
                });
            } else {
                console.log('EPG System not ready yet');
                callback(null);
            }
        };

        this.showDetails = function (channel) {
            if (epg_interval) clearInterval(epg_interval);
            colE.empty();

            var box = $(
                '<div class="epg-full-box">' +
                    '<img class="epg-big-logo" src="' + channel.logo + '" onerror="this.src=\'https://via.placeholder.com/100?text=TV\'">' +
                    '<div class="epg-title-big">' + channel.name + '</div>' +
                    '<div id="epg-dynamic-part">' +
                        '<div class="epg-now-label">Зараз в ефірі</div>' +
                        '<div class="epg-prog-name" id="epg-prog-title">Пошук...</div>' +
                        '<div class="epg-timeline">' +
                            '<span id="epg-start">--:--</span>' +
                            '<span id="epg-stop">--:--</span>' +
                        '</div>' +
                        '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress-inner"></div></div>' +
                        '<div class="epg-description" id="epg-prog-desc">Звіряємо базу каналів...</div>' +
                    '</div>' +
                '</div>'
            );
            colE.append(box);

            this.loadEPG(channel, function(data) {
                if (data && data.program && data.program.length) {
                    var now = Date.now() / 1000;
                    var p = data.program.find(function(prog) { return now >= prog.start && now <= prog.stop; });

                    if (!p) p = data.program[0];

                    $('#epg-prog-title').text(p.title);
                    $('#epg-prog-desc').text(p.description || 'Опис відсутній.');
                    
                    var format = function(ts) {
                        var d = new Date(ts * 1000);
                        return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                    };

                    $('#epg-start').text(format(p.start));
                    $('#epg-stop').text(format(p.stop));

                    var update = function() {
                        var curr = Date.now() / 1000;
                        var total = p.stop - p.start;
                        var elapsed = curr - p.start;
                        var perc = Math.min(100, Math.max(0, (elapsed / total) * 100));
                        $('#epg-progress-inner').css('width', perc + '%');
                    };

                    update();
                    epg_interval = setInterval(update, 10000);
                } else {
                    $('#epg-prog-title').text('Програма відсутня');
                    $('#epg-prog-desc').text('Дані телепрограми не знайдено для цього каналу.');
                }
            });
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
                    if (active_col === 'groups' && current_list.length) {
                        active_col = 'channels';
                        _this.updateFocus();
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else Lampa.Controller.toggle('menu');
                },
                enter: function () {
                    if (active_col === 'groups') {
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    } else if (current_list[index_c]) {
                        Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });
                    }
                },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () { 
            if (epg_interval) clearInterval(epg_interval);
            Lampa.Controller.remove('iptv_pro'); 
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/><path d="M7 8H17M7 12H17M7 16H13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
