// ==Lampa==
// name: IPTV PRO (Archives & EPG Cache)
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
        
        // Об’єкт для кешування EPG
        var epg_cache = {
            data: {},
            last_clear: Date.now()
        };

        var storage_key = 'iptv_pro_v13';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',
            favorites: [],
            current_pl_index: 0
        });

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
                    '.col-channels{width:40%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:40%; min-width:300px; flex-shrink:0; background:#080a0d; padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +
                    '.channel-title{font-size:1.2rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                    '.epg-title-big{font-size:1.5rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +
                    '.epg-now{color:#2962ff; font-size:1rem; font-weight:bold; margin-top:1.5rem; text-transform: uppercase;}' +
                    '.epg-prog-name{font-size:1.3rem; color:#ccc; margin:.5rem 0; line-height: 1.4;}' +
                    '.epg-bar{height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; margin: 10px 0;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.3s;}' +
                    '.archive-tag{display:inline-block; margin-left:10px; padding:2px 5px; background:#ff9800; color:#000; font-size:0.7rem; border-radius:3px; vertical-align:middle;}' +
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
                error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }
            });
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
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    
                    // Покращений пошук параметрів архіву
                    var catchup = (l.match(/catchup="([^"]+)"/i) || ['', ''])[1];
                    var catchup_days = (l.match(/catchup-days="([^"]+)"/i) || ['', ''])[1];
                    var catchup_src = (l.match(/catchup-source="([^"]+)"/i) || ['', ''])[1];

                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        var item = { 
                            name: name, url: url, group: group, logo: logo, 
                            tvg_id: tvg_id, catchup: catchup, 
                            catchup_days: catchup_days, catchup_src: catchup_src 
                        };
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
                var arch_icon = (c.catchup || c.catchup_days) ? '<span class="archive-tag">REC</span>' : '';
                var row = $('<div class="iptv-item">' +
                                '<div class="channel-row">' +
                                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +
                                    '<div class="channel-title">' + c.name + arch_icon + '</div>' +
                                '</div>' +
                            '</div>');
                row.on('click', function () { _this.play(c); });
                row.on('hover:focus', function () { 
                    index_c = idx; 
                    _this.showDetails(c); 
                });
                colC.append(row);
            });
            active_col = 'channels';
            index_c = 0;
            if (current_list.length) this.showDetails(current_list[0]);
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            // Очищення кешу раз на годину
            if (Date.now() - epg_cache.last_clear > 3600000) {
                epg_cache.data = {};
                epg_cache.last_clear = Date.now();
            }

            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:10px; border-radius:10px;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div class="epg-now">Зараз в ефірі:</div>' +
                '<div class="epg-prog-name" id="epg-title">...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
                '<div id="epg-time" style="font-size:1.1rem; color:#888; margin-bottom:15px;">00:00 — 00:00</div>' +
                '<div id="epg-desc" style="font-size:1rem; color:#666; line-height:1.5; height:150px; overflow:hidden;">Отримання програми...</div>' +
            '</div>');
            colE.append(content);

            // Перевірка кешу
            var cache_id = channel.tvg_id || channel.name;
            if (epg_cache.data[cache_id]) {
                _this.applyEPG(epg_cache.data[cache_id]);
            } else {
                if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                    Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                        if (data && data.program) {
                            epg_cache.data[cache_id] = data; // Зберігаємо в кеш
                            _this.applyEPG(data);
                        } else {
                            $('#epg-title').text('Програма відсутня');
                            $('#epg-desc').text('');
                        }
                    });
                }
            }
        };

        this.applyEPG = function (data) {
            if (data && data.program && data.program[0]) {
                var p = data.program[0];
                var now = Date.now() / 1000;
                
                $('#epg-title').text(p.title);
                if (p.description) $('#epg-desc').text(p.description);
                
                if (p.start && p.stop) {
                    var start_t = new Date(p.start * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    var stop_t = new Date(p.stop * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    $('#epg-time').text(start_t + ' — ' + stop_t);

                    var perc = ((now - p.start) / (p.stop - p.start)) * 100;
                    $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');
                }
            }
        };

        this.play = function (c) {
            var video_url = c.url;
            // Логіка для архівів (приклад для shift/append типів)
            // Якщо плеєр підтримує catchup, Lampa автоматично підставить параметри за умови правильного плейлиста
            Lampa.Player.play({
                url: video_url,
                title: c.name,
                callback: function() {
                    // Якщо потрібна специфічна обробка архіву через URL
                }
            });
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length) {
                var el = item[0];
                var parent = el.parentNode;
                var offset = el.offsetTop - parent.offsetTop - (parent.clientHeight / 2) + (el.clientHeight / 2);
                parent.scrollTo({ top: offset, behavior: 'smooth' });
            }
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
                    else if (current_list[index_c]) _this.play(current_list[index_c]);
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
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
