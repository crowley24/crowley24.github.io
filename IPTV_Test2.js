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
                    '.col-channels{width:45%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +    
                    '.col-details{width:35%; min-width:300px; flex-shrink:0; background:#080a0d; padding:1.5rem;}' +    
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +    
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +    
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +    
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +    
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +    
                    '.epg-title-big{font-size:1.6rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +    
                    '.epg-now{color:#2962ff; font-size:1.1rem; font-weight:bold; margin-top:1.5rem;}' +    
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0;}' +    
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;}' +    
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%;}' +    
                    '</style>');    
            }    
    
            this.loadPlaylist();    
            return root;    
        };    
    
        this.loadPlaylist = function () {    
            var pl = config.playlists[config.current_pl_index];    
            if (!pl || !pl.url) {    
                Lampa.Noty.show('Налаштуйте посилання на плейлист в налаштуваннях');    
                return;    
            }    
            $.ajax({    
                url: pl.url,    
                success: function (str) { _this.parse(str); },    
                error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }    
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
                var count = groups_data[g].length;    
                var item = $('<div class="iptv-item">' + g + ' (' + count + ')</div>');    
                item.on('click', function () { index_g = i; active_col = 'groups'; _this.renderC(groups_data[g]); });    
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
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });    
                colC.append(row);    
            });    
            active_col = 'channels';    
            index_c = 0;    
            if (current_list.length) this.showDetails(current_list[0]);    
            this.updateFocus();    
        };    
    
        this.loadEPG = function(channel, callback) {    
            if (epg_cache[channel.tvg_id]) {    
                callback(epg_cache[channel.tvg_id]);    
                return;    
            }    
                
            // Спробуємо стандартний метод Lampa    
            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {    
                console.log('Спроба завантажити EPG через Lampa.SettingsApi для:', channel.tvg_id);    
                Lampa.SettingsApi.getEPG({     
                    id: channel.tvg_id,     
                    name: channel.name     
                }, function (data) {    
                    if (data) {    
                        console.log('EPG дані отримані через SettingsApi:', data);    
                        epg_cache[channel.tvg_id] = data;    
                        callback(data);    
                    } else {    
                        console.log('SettingsApi не повернув дані, спробуємо пряме завантаження');    
                        _this.loadEPGDirect(channel, callback);    
                    }    
                });    
            } else {    
                console.log('SettingsApi недоступний, використовуємо пряме завантаження');    
                _this.loadEPGDirect(channel, callback);    
            }    
        };    
    
        // Новий метод для прямого завантаження EPG    
        this.loadEPGDirect = function(channel, callback) {    
            if (!config.epg_url) {    
                callback(null);    
                return;    
            }    
              
            console.log('Пряме завантаження EPG з:', config.epg_url);    
            $.ajax({    
                url: config.epg_url,    
                dataType: 'xml',    
                success: function(xml) {    
                    try {    
                        var programs = [];    
                        $(xml).find('programme').each(function() {    
                            var $prog = $(this);    
                            var channelId = $prog.attr('channel');    
                            if (channelId === channel.tvg_id) {    
                                programs.push({    
                                    start: $prog.attr('start'),    
                                    stop: $prog.attr('stop'),    
                                    title: $prog.find('title').text(),    
                                    descr: $prog.find('desc').text()    
                                });    
                            }    
                        });    
                          
                        if (programs.length > 0) {    
                            var epgData = { program: programs };    
                            epg_cache[channel.tvg_id] = epgData;    
                            console.log('EPG дані завантажені напряму:', epgData);    
                            callback(epgData);    
                        } else {    
                            console.log('Програми для каналу', channel.tvg_id, 'не знайдено');    
                            callback(null);    
                        }    
                    } catch (e) {    
                        console.error('Помилка парсингу EPG:', e);    
                        callback(null);    
                    }    
                },    
                error: function(xhr, status, error) {    
                    console.error('Помилка завантаження EPG:', error);    
                    callback(null);    
                }    
            });    
        };    
    
        this.showDetails = function (channel) {    
            colE.empty();    
            var content = $('<div class="details-box">' +    
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:5px; border-radius:5px;">' +    
                '<div class="epg-title-big">' + channel.name + '</div>' +    
                '<div class="epg-now">ЗАРАЗ В ЕФІРІ:</div>' +    
                '<div class="epg-prog-name" id="epg-title">Пошук програми...</div>' +    
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +    
                '<div style="margin-top:1rem; font-size:1.1rem; color:#555;">ID: ' + (channel.tvg_id || '---') + '</div>' +    
                '<div style="margin-top:0.5rem; font-size:0.9rem; color:#666;">EPG URL: ' + (config.epg_url || 'не вказано') + '</div>' +    
            '</div>');    
            colE.append(content);    
    
            this.loadEPG(channel, function(data) {    
                if (data && data.program && data.program.length > 0) {    
                    var now = Date.now() / 1000;    
                    var currentProgram = null;    
                      
                    // Знайдемо поточну програму    
                    for (var i = 0; i < data.program.length; i++) {    
                        var p = data.program[i];    
                        var startTime = _this.parseEPGTime(p.start);    
                        var stopTime = _this.parseEPGTime(p.stop);    
                          
                        if (startTime <= now && stopTime > now) {    
                            currentProgram = p;    
                            break;    
                        }    
                    }    
                      
                    if (currentProgram) {    
                        $('#epg-title').text(currentProgram.title);    
                        if (currentProgram.start && currentProgram.stop) {    
                            var startTime = _this.parseEPGTime(currentProgram.start);    
                            var stopTime = _this.parseEPGTime(currentProgram.stop);    
                            var perc = ((now - startTime) / (stopTime - startTime)) * 100;    
                            $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');    
                        }    
                    } else {    
                        $('#epg-title').text('Поточна програма не знайдена');    
                    }    
                } else {    
                    $('#epg-title').text('Програма недоступна');    
                }    
            });    
        };    
    
        // Функція для парсингу часу EPG    
        this.parseEPGTime = function(timeStr) {    
            // Формат: 20231231180000 +0000    
            var match = timeStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);    
            if (match) {    
                return new Date(Date.UTC(    
                    parseInt(match[1]), // рік    
                    parseInt(match[2]) - 1, // місяць    
                    parseInt(match[3]), // день    
                    parseInt(match[4]), // години    
                    parseInt(match[5]), // хвилини    
                    parseInt(match[6]) // секунди    
                )).getTime() / 1000;    
            }    
            return 0;    
        };    
    
        this.updateFocus = function () {    
            $('.iptv-item').removeClass('active');    
            var target = active_col === 'groups' ? colG : colC;    
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);    
            item.addClass('active');    
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });    
        };    
    
        this.registerEPG = function() {    
            if (window.Lampa && Lampa.Storage) {    
                var iptv_config = Lampa.Storage.get('iptv_config', {});    
                iptv_config.xmltv_url = config.epg_url;     
                Lampa.Storage.set('iptv_config', iptv_config);    
            }    
        };    
    
        // Функція для перевірки налаштувань EPG    
        this.checkEPGConfig = function() {    
            console.log('EPG Configuration:');    
            console.log('EPG URL:', config.epg_url);    
            console.log('Storage key:', storage_key);    
            console.log('Lampa.SettingsApi доступний:', !!(Lampa.SettingsApi));    
            console.log('Lampa.SettingsApi.getEPG доступний:', !!(Lampa.SettingsApi && Lampa.SettingsApi.getEPG));    
              
            // Перевіримо, чи правильно зареєстровано EPG URL    
            var iptv_config = Lampa.Storage.get('iptv_config', {});    
            console.log('Збережений iptv_config:', iptv_config);    
        };    
    
        this.start = function () {    
            this.checkEPGConfig(); // Додано для діагностики    
            this.registerEPG();    
    
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
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); root.remove(); };    
    }    
    
    // Спрощена функція налаштувань    
    function showPlaylistSettings() {    
        var config = Lampa.Storage.get('iptv_pro_v12', {    
            playlists: [{ url: '' }],    
            epg_url: ''    
        });    
            
        Lampa.Input.edit({    
            value: config.playlists[0].url || '',    
            title: 'URL плейлиста',    
            placeholder: 'https://example.com/playlist.m3u'    
        }, function(new_value) {    
            config.playlists[0].url = new_value;    
            Lampa.Storage.set('iptv_pro_v12', config);    
            Lampa.Noty.show('Плейлист оновлено');    
        });    
    }    
    
    function showEpgSettings() {    
        var config = Lampa.Storage.get('iptv_pro_v12', {    
            playlists: [{ url: '' }],    
            epg_url: ''    
        });    
            
        Lampa.Input.edit({    
            value: config.epg_url || '',    
            title: 'URL EPG',    
            placeholder: 'https://example.com/epg.xml.gz'    
        }, function(new_value) {    
            config.epg_url = new_value;    
            Lampa.Storage.set('iptv_pro_v12', config);    
            Lampa.Noty.show('EPG оновлено');    
        });    
    }    
    
    // Функція для додавання налаштувань    
    function addPluginSettings() {    
        try {    
            if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;    
                
            Lampa.SettingsApi.addComponent({ component: "iptv_pro", name: "IPTV PRO" });    
                
            Lampa.SettingsApi.addParam({    
                component: "iptv_pro",    
                param: { name: "Плейлист URL", type: "button" },    
                field: { name: "Плейлист URL", description: "Ввести URL плейлиста" },    
                onChange: showPlaylistSettings    
            });    
                
            Lampa.SettingsApi.addParam({    
                component: "iptv_pro",     
                param: { name: "EPG URL", type: "button" },    
                field: { name: "EPG URL", description: "Ввести URL EPG" },    
                onChange: showEpgSettings    
            });    
        } catch (e) { console.log("settings error", e); }    
    }    
    
    function init() {    
        Lampa.Component.add('iptv_pro', IPTVComponent);    
            
        // Додання пункту меню    
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');    
        item.on('hover:enter', function () {    
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });    
        });    
        $('.menu .menu__list').append(item);    
            
        // Додання налаштувань    
        addPluginSettings();    
    }    
    
    if (window.app_ready) init();    
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });    
})();
