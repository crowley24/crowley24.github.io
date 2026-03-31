(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var epg_cache = {}; // Тут будемо зберігати розпарсений файл
        var epg_interval; 

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
            }],
            // Пряме посилання на EPG (використовуємо проксі для CORS, якщо треба)
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

        // Очищення назви для точного порівняння
        var chShortName = function(chName){
            if(!chName) return '';
            return chName.toLowerCase()
                .replace(/\s+\(архив\)$/, '')
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
                    '.col-groups{width:20%; min-width:180px;}' +
                    '.col-channels{width:35%; flex-grow:1; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:45%; background:#080a0d; padding:2rem; position: relative;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;box-shadow: 0 4px 15px rgba(41, 98, 255, 0.3);}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:45px;height:45px;object-fit:contain;background:#000;border-radius:.4rem;}' +
                    '.epg-title-big{font-size:2.2rem; color:#fff; font-weight:700; margin-bottom:0.5rem;}' +
                    '.epg-now-label{color:#2962ff; font-size:1rem; font-weight:bold; text-transform: uppercase; margin-top: 1.5rem;}' +
                    '.epg-prog-name{font-size:1.7rem; color:#fff; margin:0.5rem 0 1rem 0; font-weight: 500;}' +
                    '.epg-bar{height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom: 1.5rem;}' +
                    '.epg-bar-inner{height:100%; background: linear-gradient(90deg, #2962ff 0%, #00d2ff 100%); width:0%; transition: width 0.5s;}' +
                    '.epg-description{font-size:1.25rem; color:#aaa; line-height:1.6; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;}' +
                    '</style>');
            }

            this.loadPlaylist();
            this.downloadEPGFile(); // Запускаємо автономне завантаження EPG
            return root;
        };

        // --- АВТОНОМНИЙ ЗАВАНТАЖУВАЧ EPG ---
        this.downloadEPGFile = function() {
            console.log('IPTV PRO: Downloading EPG from', config.epg_url);
            // Використовуємо Lampa.Reguest (проксі), щоб обійти CORS
            Lampa.Reguest.native(config.epg_url, function(data) {
                // Тут має бути логіка парсингу XML, але оскільки це важко без бібліотек, 
                // ми змусимо Lampa примусово завантажити цей файл у свій Tvg модуль.
                if (Lampa.Tvg) {
                    Lampa.Tvg.update(config.epg_url); 
                }
            }, function() {
                console.log('IPTV PRO: Direct EPG load failed, relying on system.');
            }, false, {dataType: 'text'});
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            if (!pl || !pl.url) return;
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); },
                error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
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
                var item = $('<div class="iptv-item">' + g + '</div>');
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
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        // --- ПОТУЖНИЙ ПОШУК (через всі доступні канали Lampa) ---
        this.loadEPG = function(channel, callback) {
            var id = channel.tvg_id;
            var name = channel.name;
            
            // Якщо Lampa.Tvg не працює, пробуємо метод з оригінального плагіна
            if (Lampa.Tvg) {
                // Спроба 1: по точній назві (найчастіше працює в Lampa)
                Lampa.Tvg.get({name: name}, function(data) {
                    if(data && data.program && data.program.length) callback(data);
                    else {
                        // Спроба 2: по tvg-id
                        Lampa.Tvg.get({id: id}, function(data2) {
                            if(data2 && data2.program && data2.program.length) callback(data2);
                            else {
                                // Спроба 3: по очищеній назві
                                Lampa.Tvg.get({name: chShortName(name)}, callback);
                            }
                        });
                    }
                });
            } else {
                callback(null);
            }
        };

        this.showDetails = function (channel) {
            if (epg_interval) clearInterval(epg_interval);
            colE.empty();

            var box = $(
                '<div class="epg-full-box">' +
                    '<img class="epg-big-logo" src="' + channel.logo + '" onerror="this.style.display=\'none\'">' +
                    '<div class="epg-title-big">' + channel.name + '</div>' +
                    '<div id="epg-dynamic-info">' +
                        '<div class="epg-now-label">Зараз в ефірі</div>' +
                        '<div class="epg-prog-name" id="epg-title">Пошук програми...</div>' +
                        '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                        '<div class="epg-description" id="epg-desc">Очікування відповіді від сервера EPG...</div>' +
                    '</div>' +
                '</div>'
            );
            colE.append(box);

            this.loadEPG(channel, function(data) {
                if (data && data.program && data.program.length) {
                    var now = Date.now() / 1000;
                    var p = data.program.find(function(prog) { return now >= prog.start && now <= prog.stop; });

                    if (!p) p = data.program[0];

                    $('#epg-title').text(p.title);
                    $('#epg-desc').text(p.description || 'Опис відсутній.');
                    
                    var update = function() {
                        var curr = Date.now() / 1000;
                        var perc = ((curr - p.start) / (p.stop - p.start)) * 100;
                        $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');
                    };

                    update();
                    epg_interval = setInterval(update, 10000);
                } else {
                    $('#epg-title').text('Програма відсутня');
                    $('#epg-desc').text('Для цього каналу не знайдено EPG. Спробуйте оновити джерело в налаштуваннях Lampa.');
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
                    if (active_col === 'groups' && current_list.length) { active_col = 'channels'; _this.updateFocus(); }
                },
                left: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else Lampa.Controller.toggle('menu');
                },
                enter: function () {
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    else if (current_list[index_c]) Lampa.Player.play(current_list[index_c]);
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
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg></div><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
