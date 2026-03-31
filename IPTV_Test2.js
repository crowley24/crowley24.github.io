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
        var epg_interval; // Інтервал для оновлення прогрес-бару

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
            }],
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

        // --- ДОДАНО: Логіка нормалізації назви для кращого пошуку EPG ---
        var helperNormalize = function(name) {
            return name.toLowerCase()
                .replace(/hd|fhd|uhd|4k|sd/g, '') // видаляємо якість
                .replace(/\s+/g, '')             // видаляємо пробіли
                .replace(/[^\wа-яієїґ0-9]/gi, ''); // видаляємо спецсимволи
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
                    '.col-channels{width:40%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:40%; min-width:300px; flex-shrink:0; background:#080a0d; padding:2rem; border-left:1px solid #2962ff44;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;transition: all 0.2s;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;transform: scale(1.02);}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:45px;height:45px;object-fit:contain;background:#000;border-radius:.3rem; border:1px solid rgba(255,255,255,0.1);}' +
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:1.8rem; color:#fff; font-weight:700; margin-bottom:0.5rem; line-height:1.2;}' +
                    '.epg-now{color:#2962ff; font-size:1rem; font-weight:bold; margin-top:2rem; letter-spacing:1px;}' +
                    '.epg-prog-name{font-size:1.5rem; color:#eee; margin:.5rem 0; font-weight:500;}' +
                    '.epg-bar{height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin: 1rem 0;}' +
                    '.epg-bar-inner{height:100%; background: linear-gradient(90deg, #2962ff, #00d2ff); width:0%; transition: width 0.5s;}' +
                    '.epg-time{font-size:1.1rem; color:#888; display:flex; justify-content: space-between;}' +
                    '.epg-description{margin-top:1.5rem; font-size:1.1rem; color:#aaa; line-height:1.6; height: 250px; overflow-y: auto; padding-right: 10px;}' +
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
                success: function (str) { _this.parse(str); }
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
                item.on('click', function () { index_g = i; active_col = 'groups'; _this.renderC(groups_data[g]); });
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
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        // --- МОДЕРНІЗОВАНО: Завантаження EPG через API Lampa з кешем ---
        this.loadEPG = function(channel, callback) {
            var cache_id = channel.tvg_id || helperNormalize(channel.name);
            if (epg_cache[cache_id]) return callback(epg_cache[cache_id]);

            // Використовуємо Lampa.Tvg для отримання програми, якщо доступно
            if (window.Lampa.Tvg) {
                Lampa.Tvg.get({
                    id: channel.tvg_id,
                    name: channel.name
                }, function(data) {
                    epg_cache[cache_id] = data;
                    callback(data);
                });
            } else {
                callback(null);
            }
        };

        // --- МОДЕРНІЗОВАНО: Потужний рендер деталей з прогрес-баром ---
        this.showDetails = function (channel) {
            colE.empty();
            if (epg_interval) clearInterval(epg_interval);

            var detailHtml = $(
                '<div class="details-box">' +
                    '<div class="epg-title-big">' + channel.name + '</div>' +
                    '<div class="epg-now">ЗАРАЗ В ЕФІРІ</div>' +
                    '<div class="epg-prog-name" id="epg-title">...</div>' +
                    '<div class="epg-time">' +
                        '<span id="epg-start">00:00</span>' +
                        '<span id="epg-stop">00:00</span>' +
                    '</div>' +
                    '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                    '<div class="epg-description" id="epg-desc">Завантаження опису програми...</div>' +
                '</div>'
            );
            colE.append(detailHtml);

            this.loadEPG(channel, function(data) {
                if (data && data.program && data.program.length) {
                    var p = data.program.find(function(prog) {
                        var now = Date.now() / 1000;
                        return now >= prog.start && now <= prog.stop;
                    }) || data.program[0];

                    $('#epg-title').text(p.title);
                    $('#epg-desc').text(p.description || 'Опис відсутній для цієї програми.');
                    
                    var formatTime = function(ts) {
                        var d = new Date(ts * 1000);
                        return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                    };

                    $('#epg-start').text(formatTime(p.start));
                    $('#epg-stop').text(formatTime(p.stop));

                    // Функція оновлення прогресу
                    var updateProgress = function() {
                        var now = Date.now() / 1000;
                        var perc = ((now - p.start) / (p.stop - p.start)) * 100;
                        $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');
                    };

                    updateProgress();
                    epg_interval = setInterval(updateProgress, 30000); // Оновлюємо кожні 30 сек
                } else {
                    $('#epg-title').text('Програма відсутня');
                    $('#epg-desc').text('На жаль, для даного каналу немає даних телепрограми (EPG).');
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
        this.destroy = function () { 
            if (epg_interval) clearInterval(epg_interval);
            Lampa.Controller.remove('iptv_pro'); 
            root.remove(); 
        };
    }

    // Решта функцій ініціалізації (init, addPluginSettings і т.д.) залишаються без змін
    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 3L3 7V17L12 21L21 17V7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
