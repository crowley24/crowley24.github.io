(function () {  
    'use strict';  
  
    var currentComponent = null;  
  
    function IPTVComponent() {  
        var _this = this;  
        var root, colG, colC, colE;  
        var groups_data = {};  
        var current_list = [];  
        var active_col = 'groups';  
        var index_g = 0, index_c = 0;  
        var epg_cache = {};  
  
        var storage_key = 'iptv_pro_v12';  
  
        this.getConfig = function() {  
            return Lampa.Storage.get(storage_key, {  
                playlists: [{ url: '' }],  
                epg_url: '',  
                favorites: [],  
                current_pl_index: 0  
            });  
        };  
  
        this.create = function () {  
            currentComponent = this;  
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
            var config = this.getConfig();  
            var pl = config.playlists[config.current_pl_index];  
              
            if (!pl || !pl.url || pl.url.trim() === '') {  
                Lampa.Noty.show('Спочатку налаштуйте URL плейлиста в налаштуваннях');  
                this.showEmptyState();  
                return;  
            }  
              
            Lampa.Noty.show('Завантаження плейлиста...');  
            console.log('Loading playlist from:', pl.url);  
              
            $.ajax({  
                url: pl.url,  
                success: function (str) {   
                    console.log('Playlist loaded, length:', str.length);  
                    _this.parse(str);   
                },  
                error: function () {   
                    Lampa.Noty.show('Помилка завантаження плейлиста');   
                    console.error('Failed to load playlist');  
                }  
            });  
        };  
  
        this.parse = function (str) {  
            var lines = str.split('\n');  
            groups_data = { '⭐ Обрано': this.getConfig().favorites };  
            var current_group = 'ЗАГАЛЬНІ';  
              
            console.log('Parsing playlist, lines count:', lines.length);  
              
            for (var i = 0; i < lines.length; i++) {  
                var l = lines[i].trim();  
                  
                if (l.indexOf('#EXTINF') === 0) {  
                    var name = (l.match(/,(.*)$/) || ['', 'Без назви'])[1].trim();  
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', current_group])[1];  
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];  
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];  
                      
                    // Шукаємо URL - підтримуємо як M3U так і M3U8  
                    var url = '';  
                    for (var j = i + 1; j < lines.length; j++) {  
                        var nextLine = lines[j].trim();  
                        if (!nextLine || nextLine[0] === '#') continue;  
                        if (nextLine.indexOf('http') === 0 || nextLine.indexOf('/') === 0) {  
                            url = nextLine;  
                            break;  
                        }  
                    }  
                      
                    // Перевіряємо чи це валідний URL для IPTV  
                    if (url && (url.indexOf('http') === 0 || url.indexOf('rtmp') === 0 || url.indexOf('rtsp') === 0)) {  
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id };  
                        if (!groups_data[group]) groups_data[group] = [];  
                        groups_data[group].push(item);  
                        console.log('Added channel:', name, 'URL:', url);  
                    }  
                }  
            }  
              
            console.log('Parsed groups:', Object.keys(groups_data));  
            this.renderG();  
        };  
  
        this.renderG = function () {  
            colG.empty();  
            Object.keys(groups_data).forEach(function (g, i) {  
                var count = groups_data[g].length;  
                var item = $('<div class="iptv-item">' + g + ' (' + count + ')</div>');  
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
            current_list = list || [];  
            colC.empty();  
            current_list.forEach(function (channel, i) {  
                var row = $('<div class="channel-row iptv-item">' +  
                    '<img class="channel-logo" src="' + (channel.logo || '') + '" onerror="this.src=\'\'">' +  
                    '<div class="channel-title">' + channel.name + '</div>' +  
                    '</div>');  
                row.on('click', function () {   
                    index_c = i;   
                    active_col = 'channels';   
                    _this.updateFocus();  
                    _this.showDetails(channel);  
                });  
                colC.append(row);  
            });  
            this.updateFocus();  
        };  
  
        this.showDetails = function (channel) {  
            colE.empty();  
            colE.append('<div class="epg-title-big">' + channel.name + '</div>');  
            if (channel.logo) {  
                colE.append('<img src="' + channel.logo + '" style="width:100%;max-width:200px;margin:1rem 0;border-radius:.5rem;">');  
            }  
            colE.append('<div style="color:#888;margin:1rem 0;">Група: ' + channel.group + '</div>');  
              
            // EPG  
            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {  
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {  
                    if (data && data.program && data.program[0]) {  
                        var p = data.program[0];  
                        colE.append('<div class="epg-now">Зараз</div>');  
                        colE.append('<div class="epg-prog-name">' + p.title + '</div>');  
                        if (p.start && p.stop) {  
                            var now = Date.now() / 1000;  
                            var perc = ((now - p.start) / (p.stop - p.start)) * 100;  
                            colE.append('<div class="epg-bar"><div class="epg-bar-inner" style="width:' + Math.min(100, Math.max(0, perc)) + '%"></div></div>');  
                        }  
                    } else {  
                        colE.append('<div class="epg-now">Програма недоступна</div>');  
                    }  
                });  
            }  
        };  
  
        this.showEmptyState = function () {  
            colG.empty();  
            colC.empty();  
            colE.empty();  
            colG.append('<div style="padding:2rem;color:#888;">Налаштуйте плейлист</div>');  
            colC.append('<div style="padding:2rem;color:#888;">Введіть URL плейлиста в налаштуваннях</div>');  
            colE.append('<div style="padding:2rem;color:#888;">Потім перезавантажте плагін</div>');  
        };  
  
        this.updateFocus = function () {  
            $('.iptv-item').removeClass('active');  
            var target = active_col === 'groups' ? colG : colC;  
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);  
            item.addClass('active');  
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });  
        };  
  
        this.registerEPG = function () {  
            if (window.Lampa && Lampa.Storage) {  
                var iptv_config = Lampa.Storage.get('iptv_config', {});  
                iptv_config.xmltv_url = this.getConfig().epg_url;   
                Lampa.Storage.set('iptv_config', iptv_config);  
            }  
        };  
  
        this.start = function () {  
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
                    if (active_col === 'groups') {  
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);  
                    } else if (active_col === 'channels' && current_list[index_c]) {  
                        var channel = current_list[index_c];  
                        console.log('Playing channel:', channel.name, 'URL:', channel.url);  
                        Lampa.Player.play({   
                            url: channel.url,   
                            title: channel.name  
                        });  
                    }  
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
            Lampa.Controller.remove('iptv_pro');   
            root.remove();   
            if (currentComponent === this) currentComponent = null;  
        };  
    }  
  
    function showPlaylistSettings() {  
        var config = Lampa.Storage.get('iptv_pro_v12', {  
            playlists: [{ url: '' }],  
            epg_url: ''  
        });  
        var currentUrl = config.playlists[0].url || '';  
          
        Lampa.Input.edit({  
            value: currentUrl,  
            title: 'URL плейлиста',  
            placeholder: 'https://example.com/playlist.m3u'  
        }, function(new_value) {  
            config.playlists[0].url = new_value;  
            Lampa.Storage.set('iptv_pro_v12', config);  
            Lampa.Noty.show('Плейлист оновлено');  
              
            if (currentComponent) {  
                currentComponent.loadPlaylist();  
            }  
        });  
    }  
  
    function showEpgSettings() {  
        var config = Lampa.Storage.get('iptv_pro_v12', {  
            playlists: [{ url: '' }],  
            epg_url: ''  
        });  
        var currentUrl = config.epg_url || '';  
          
        Lampa.Input.edit({  
            value: currentUrl,  
            title: 'URL EPG',  
            placeholder: 'https://example.com/epg.xml.gz'  
        }, function(new_value) {  
            config.epg_url = new_value;  
            Lampa.Storage.set('iptv_pro_v12', config);  
            Lampa.Noty.show('EPG оновлено');  
              
            if (currentComponent) {  
                currentComponent.registerEPG();  
            }  
        });  
    }  
  
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
          
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');  
        item.on('hover:enter', function () {  
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });  
        });  
        $('.menu .menu__list').append(item);  
          
        addPluginSettings();  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) { if (e.type  
  })();
