(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var storage_key = 'lampa_iptv_plugin';

        this.create = function () {
            var config = Lampa.Storage.get(storage_key, { playlist_url: '', epg_url: '' });

            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            this.injectStyles();

            if (config.playlist_url) {
                this.loadPlaylist(config.playlist_url);
            } else {
                colC.html('<div class="iptv-empty">Будь ласка, вкажіть посилання на плейлист у налаштуваннях Lampa (Розділ IPTV PRO)</div>');
            }

            return root;
        };

        this.injectStyles = function() {
            if (!$('#iptv-style-pro').length) {
                $('head').append('<style id="iptv-style-pro">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:100;padding-top:4rem; font-family: "Roboto", sans-serif;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05); transition: background 0.2s;}' +
                    '.col-groups{width:20%; background:rgba(0,0,0,0.3); min-width:200px;}' +
                    '.col-channels{width:45%; background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:35%; padding:2.5rem; background:#080a0d;}' +
                    '.iptv-item{padding:1.2rem; margin:0.4rem; border-radius:0.6rem; cursor:pointer; color:rgba(255,255,255,0.5); font-size:1.3rem;}' +
                    '.iptv-item.focused{background:rgba(255,255,255,0.12); color:#fff; transform: scale(1.02);}' +
                    '.iptv-item.active{background:#2962ff; color:#fff; font-weight:700;}' +
                    '.channel-row{display:flex;align-items:center;gap:1.5rem;}' +
                    '.channel-logo{width:45px; height:45px; object-fit:contain; border-radius:6px; background:#000; box-shadow: 0 2px 5px rgba(0,0,0,0.5);}' +
                    '.channel-title{white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}' +
                    '.epg-title-big{font-size:1.8rem; color:#fff; margin-bottom:1rem; line-height:1.2;}' +
                    '.iptv-empty{text-align:center; padding:5rem; font-size:1.5rem; color:#666; line-height:1.5;}' +
                    '.epg-label{color:#2962ff; font-weight:bold; font-size:1rem; margin-bottom:0.5rem; text-transform:uppercase;}' +
                    '</style>');
            }
        };

        this.loadPlaylist = function (url) {
            Lampa.Loading.show();
            $.ajax({
                url: url,
                method: 'GET',
                success: function (str) { 
                    Lampa.Loading.hide();
                    _this.parse(str); 
                },
                error: function () { 
                    Lampa.Loading.hide();
                    Lampa.Noty.show('Помилка завантаження плейлиста. Перевірте URL.'); 
                }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            var last_group = 'Загальні';

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', 'Без назви'])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', last_group])[1];
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = (lines[i + 1] && lines[i + 1].trim().indexOf('http') === 0) ? lines[i + 1].trim() : '';
                    
                    if (url) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({ name: name, url: url, logo: logo, tvg_id: tvg_id });
                    }
                }
            }
            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();
            var keys = Object.keys(groups_data);
            if (keys.length === 0) {
                colG.html('<div class="iptv-empty">Плейлист порожній</div>');
                return;
            }
            keys.forEach(function (g) {
                var item = $('<div class="iptv-item selector">' + g + '</div>');
                colG.append(item);
            });
            this.renderChannels(groups_data[keys[0]]);
            this.toggleController();
        };

        this.renderChannels = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c) {
                var row = $('<div class="iptv-item selector">' +
                                '<div class="channel-row">' +
                                    '<img class="channel-logo" src="' + (c.logo || 'https://via.placeholder.com/50?text=TV') + '" onerror="this.src=\'https://via.placeholder.com/50?text=TV\'">' +
                                    '<div class="channel-title">' + c.name + '</div>' +
                                '</div>' +
                            '</div>');
                colC.append(row);
            });
        };

        this.showDetails = function (channel) {
            colE.empty();
            if (!channel) return;
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" onerror="this.style.display=\'none\'" style="width:100%; max-height:180px; object-fit:contain; margin-bottom:2rem; background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;">' +
                '<div class="epg-label">Зараз в ефірі</div>' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div id="epg-info" style="font-size:1.4rem; color:#aaa; line-height:1.4;">Завантаження програми...</div>' +
            '</div>');
            colE.append(content);

            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                    if (data && data.program && data.program[0]) {
                        $('#epg-info').html(data.program[0].title + (data.program[0].description ? '<br><small style="font-size:1.1rem; color:#666; margin-top:10px; display:block;">' + data.program[0].description + '</small>' : ''));
                    } else {
                        $('#epg-info').text('Програма телепередач відсутня');
                    }
                });
            }
        };

        this.toggleController = function () {
            Lampa.Controller.add('iptv_pro', {
                invisible: true,
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
                    if (active_col === 'groups' && current_list.length > 0) {
                        active_col = 'channels';
                        index_c = 0;
                        _this.updateFocus();
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        _this.updateFocus();
                    } else {
                        Lampa.Activity.backward();
                    }
                },
                enter: function () {
                    if (active_col === 'groups') {
                        var keys = Object.keys(groups_data);
                        _this.renderChannels(groups_data[keys[index_g]]);
                        active_col = 'channels';
                        index_c = 0;
                        _this.updateFocus();
                    } else {
                        var video = current_list[index_c];
                        Lampa.Player.play({ url: video.url, title: video.name });
                    }
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('focused active');
            var group_items = colG.find('.iptv-item');
            var channel_items = colC.find('.iptv-item');

            group_items.eq(index_g).addClass(active_col === 'groups' ? 'focused' : 'active');
            
            if (active_col === 'channels') {
                var active_chan = channel_items.eq(index_c);
                active_chan.addClass('focused');
                _this.showDetails(current_list[index_c]);
                if (active_chan.length) active_chan[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
            if (active_col === 'groups' && group_items.eq(index_g).length) {
                group_items.eq(index_g)[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    // --- СЕКЦІЯ НАЛАШТУВАНЬ ---
    function addSettings() {
        // Слухаємо відкриття будь-яких налаштувань
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'iptv_settings') {
                var body = e.body;
                var config = Lampa.Storage.get('lampa_iptv_plugin', { playlist_url: '', epg_url: '' });

                var pl_item = $('<div class="settings-param selector" data-type="input">' +
                    '<div class="settings-param__name">Посилання на плейлист (.m3u)</div>' +
                    '<div class="settings-param__value">' + (config.playlist_url || 'Натисніть для введення') + '</div>' +
                '</div>');

                pl_item.on('hover:enter', function () {
                    Lampa.Input.edit({ value: config.playlist_url, free: true, title: 'URL плейлиста' }, function (new_val) {
                        if (new_val) {
                            config.playlist_url = new_val;
                            Lampa.Storage.set('lampa_iptv_plugin', config);
                            pl_item.find('.settings-param__value').text(new_val);
                            Lampa.Noty.show('Плейлист оновлено');
                        }
                    });
                });

                var epg_item = $('<div class="settings-param selector" data-type="input">' +
                    '<div class="settings-param__name">Посилання на EPG (.xml)</div>' +
                    '<div class="settings-param__value">' + (config.epg_url || 'Натисніть для введення') + '</div>' +
                '</div>');

                epg_item.on('hover:enter', function () {
                    Lampa.Input.edit({ value: config.epg_url, free: true, title: 'URL EPG' }, function (new_val) {
                        if (new_val) {
                            config.epg_url = new_val;
                            Lampa.Storage.set('lampa_iptv_plugin', config);
                            epg_item.find('.settings-param__value').text(new_val);
                            
                            var sys_iptv = Lampa.Storage.get('iptv_config', {});
                            sys_iptv.xmltv_url = new_val;
                            Lampa.Storage.set('iptv_config', sys_iptv);
                            Lampa.Noty.show('EPG збережено');
                        }
                    });
                });

                body.append(pl_item, epg_item);
                Lampa.Controller.append({ container: body, invisible: true });
            }
        });

        // Додавання пункту в головне меню налаштувань
        var injectMainSettings = function() {
            if ($('.settings-main').length && !$('.settings-folder[data-component="iptv_settings"]').length) {
                var item = $('<div class="settings-folder selector" data-component="iptv_settings">' +
                    '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg" fill="white"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg></div>' +
                    '<div class="settings-folder__name">IPTV PRO</div>' +
                '</div>');
                
                item.on('hover:enter', function () {
                    Lampa.Settings.create('iptv_settings', { title: 'IPTV PRO' });
                });
                
                $('.settings-main').append(item);
            }
        };

        Lampa.Listener.follow('settings', function(e) {
            if (e.type === 'open') setTimeout(injectMainSettings, 100);
        });
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        addSettings();

        var menu_item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
