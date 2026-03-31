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
            // ДОДАЄМО ПРЯМЕ ПОСИЛАННЯ НА EPG ТУТ
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

        var chShortName = function(chName){
            if(!chName) return '';
            return chName.toLowerCase()
                .replace(/\s+\(архив\)$/, '')
                .replace(/hd|fhd|uhd|4k|sd|50fps|orig|original/g, '')
                .replace(/([!\s.,()–-]+)/g, '').trim();
        };

        // Функція примусової реєстрації EPG в системі Lampa
        this.initEPG = function() {
            if (Lampa.Tvg && config.epg_url) {
                // Ми "підсовуємо" посилання системі, щоб вона почала його обробляти
                Lampa.Tvg.update(config.epg_url);
                console.log('IPTV PRO: EPG source injected:', config.epg_url);
            }
        };

        this.create = function () {
            this.initEPG(); // Запускаємо при старті
            
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
                    '.col-groups{width:220px; flex-shrink:0;}' +
                    '.col-channels{width:350px; flex-shrink:0; background:rgba(255,255,255,0.01);}' +
                    '.col-details{flex-grow:1; background:#080a0d; padding:2.5rem; position: relative; border-left: 1px solid rgba(255,255,255,0.05);}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer; font-size: 1.1rem;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;box-shadow: 0 4px 15px rgba(41, 98, 255, 0.4); transform: scale(1.02);}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.4rem;}' +
                    '.epg-title-big{font-size:2.5rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +
                    '.epg-prog-name{font-size:1.8rem; color:#fff; margin:1rem 0; font-weight: 500; min-height: 2.2rem;}' +
                    '.epg-bar{height:10px; background:rgba(255,255,255,0.1); border-radius:5px; overflow:hidden; margin: 1.5rem 0;}' +
                    '.epg-bar-inner{height:100%; background: linear-gradient(90deg, #2962ff 0%, #00d2ff 100%); width:0%; transition: width 0.5s;}' +
                    '.epg-description{font-size:1.3rem; color:#888; line-height:1.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem; height: 300px; overflow-y: auto;}' +
                    '</style>');
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка плейлиста'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            var current_group = 'Загальні';
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', current_group])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i+1] ? lines[i+1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({ name: name, url: url, logo: logo, tvg_id: tvg_id });
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function (g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function () { index_g = i; active_col = 'groups'; _this.renderC(groups_data[g]); _this.updateFocus(); });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c, idx) {
                var row = $('<div class="iptv-item"><div class="channel-row">' +
                    '<img class="channel-logo" src="'+c.logo+'" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +
                    '<span>'+c.name+'</span></div></div>');
                row.on('click', function () { Lampa.Player.play({url: c.url, title: c.name}); });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.loadEPG = function(channel, callback) {
            if (!Lampa.Tvg) return callback(null);
            // Пріоритет: 1. tvg-id, 2. Повна назва, 3. Очищена назва
            Lampa.Tvg.get({id: channel.tvg_id, name: channel.name}, function(data) {
                if (data && data.program && data.program.length) callback(data);
                else Lampa.Tvg.get({name: chShortName(channel.name)}, callback);
            });
        };

        this.showDetails = function (channel) {
            if (epg_interval) clearInterval(epg_interval);
            colE.empty();
            var box = $('<div class="epg-full-box">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now-label">Зараз в ефірі:</div>' +
                '<div class="epg-prog-name" id="epg-t">Пошук...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-p"></div></div>' +
                '<div class="epg-description" id="epg-d">Завантаження опису...</div>' +
            '</div>');
            colE.append(box);

            this.loadEPG(channel, function(data) {
                if (data && data.program && data.program.length) {
                    var now = Date.now() / 1000;
                    var p = data.program.find(function(i){ return now >= i.start && now <= i.stop; }) || data.program[0];
                    $('#epg-t').text(p.title);
                    $('#epg-d').text(p.description || 'Опис відсутній.');
                    var up = function() {
                        var perc = ((Date.now()/1000 - p.start) / (p.stop - p.start)) * 100;
                        $('#epg-p').css('width', Math.min(100, Math.max(0, perc)) + '%');
                    };
                    up(); epg_interval = setInterval(up, 10000);
                } else {
                    $('#epg-t').text('Програма відсутня');
                    $('#epg-d').text('Не вдалося знайти EPG для цього каналу.');
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
                right: function () { if (active_col === 'groups' && current_list.length) { active_col = 'channels'; _this.updateFocus(); } },
                left: function () { if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); } else Lampa.Controller.toggle('menu'); },
                enter: function () {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else if (current_list[index_c]) Lampa.Player.play(current_list[index_c]);
                },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () { if (epg_interval) clearInterval(epg_interval); Lampa.Controller.remove('iptv_pro'); root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg></div><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
