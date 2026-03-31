(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        // Ключ для сховища
        var storage_key = 'lampa_iptv_plugin';

        this.create = function () {
            // Отримуємо актуальні налаштування
            var config = Lampa.Storage.get(storage_key, {
                playlist_url: '',
                epg_url: ''
            });

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
                colC.html('<div class="iptv-empty">Будь ласка, вкажіть посилання на плейлист у налаштуваннях Lampa</div>');
            }

            return root;
        };

        this.injectStyles = function() {
            if (!$('#iptv-style-pro').length) {
                $('head').append('<style id="iptv-style-pro">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:100;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%; background:rgba(0,0,0,0.2);}' +
                    '.col-channels{width:45%; background:rgba(255,255,255,0.02);}' +
                    '.col-details{width:35%; padding:2rem; background:#080a0d;}' +
                    '.iptv-item{padding:1.2rem; margin:0.4rem; border-radius:0.5rem; cursor:pointer; color:rgba(255,255,255,0.6); transition: all 0.2s;}' +
                    '.iptv-item.focused{background:rgba(255,255,255,0.1); color:#fff;}' +
                    '.iptv-item.active{background:#2962ff; color:#fff; font-weight:bold;}' +
                    '.channel-row{display:flex;align-items:center;gap:1.5rem;}' +
                    '.channel-logo{width:50px; height:50px; object-fit:contain; border-radius:5px; background:#000;}' +
                    '.epg-title-big{font-size:1.8rem; color:#fff; margin-bottom:1rem;}' +
                    '.iptv-empty{text-align:center; padding:5rem; font-size:1.5rem; color:#ccc;}' +
                    '</style>');
            }
        };

        this.loadPlaylist = function (url) {
            Lampa.Loading.show();
            $.ajax({
                url: url,
                success: function (str) { 
                    Lampa.Loading.hide();
                    _this.parse(str); 
                },
                error: function () { 
                    Lampa.Loading.hide();
                    Lampa.Noty.show('Помилка завантаження плейлиста'); 
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
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    
                    if (url && url.indexOf('http') === 0) {
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
            keys.forEach(function (g, i) {
                var item = $('<div class="iptv-item selector">' + g + '</div>');
                colG.append(item);
            });
            this.renderChannels(groups_data[keys[0]]);
            this.toggleFocus();
        };

        this.renderChannels = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c) {
                var row = $('<div class="iptv-item selector">' +
                                '<div class="channel-row">' +
                                    '<img class="channel-logo" src="' + (c.logo || 'https://via.placeholder.com/50?text=TV') + '">' +
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
                '<img src="' + channel.logo + '" style="width:100%; max-height:200px; object-fit:contain; margin-bottom:2rem;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div id="epg-info" style="font-size:1.4rem; color:#aaa;">Завантаження програми...</div>' +
            '</div>');
            colE.append(content);

            // Виклик EPG через систему Lampa
            if (Lampa.SettingsApi && Lampa.SettingsApi.getEPG) {
                Lampa.SettingsApi.getEPG({ id: channel.tvg_id, name: channel.name }, function (data) {
                    if (data && data.program && data.program[0]) {
                        $('#epg-info').html('<b>Зараз:</b> ' + data.program[0].title);
                    } else {
                        $('#epg-info').text('Програма відсутня');
                    }
                });
            }
        };

        this.toggleFocus = function () {
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
                    if (active_col === 'groups') {
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
                if (active_chan.length) active_chan[0].scrollIntoView({ block: 'center' });
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
        // Додаємо пункт у головні налаштування Lampa
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var item = $('<div class="settings-folder selector" data-component="iptv_settings">' +
                    '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2zM21 19v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM5 21a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z" fill="white"/></svg></div>' +
                    '<div class="settings-folder__name">IPTV PRO Налаштування</div>' +
                '</div>');
                
                item.on('hover:enter', function () {
                    Lampa.Settings.create('iptv_settings', {
                        title: 'IPTV PRO'
                    });
                });
                
                $('.settings-main').append(item);
            }
            
            if (e.name === 'iptv_settings') {
                var body = e.body;
                var config = Lampa.Storage.get('lampa_iptv_plugin', { playlist_url: '', epg_url: '' });

                // Поле для Плейлиста
                var pl_item = $('<div class="settings-param selector" data-type="input">' +
                    '<div class="settings-param__name">Посилання на плейлист (.m3u)</div>' +
                    '<div class="settings-param__value">' + (config.playlist_url || 'Натисніть, щоб вписати') + '</div>' +
                '</div>');

                pl_item.on('hover:enter', function () {
                    Lampa.Input.edit({
                        value: config.playlist_url,
                        free: true,
                        title: 'Введіть URL плейлиста'
                    }, function (new_val) {
                        if (new_val) {
                            config.playlist_url = new_val;
                            Lampa.Storage.set('lampa_iptv_plugin', config);
                            pl_item.find('.settings-param__value').text(new_val);
                        }
                    });
                });

                // Поле для EPG
                var epg_item = $('<div class="settings-param selector" data-type="input">' +
                    '<div class="settings-param__name">Посилання на EPG (.xml)</div>' +
                    '<div class="settings-param__value">' + (config.epg_url || 'Натисніть, щоб вписати') + '</div>' +
                '</div>');

                epg_item.on('hover:enter', function () {
                    Lampa.Input.edit({
                        value: config.epg_url,
                        free: true,
                        title: 'Введіть URL EPG'
                    }, function (new_val) {
                        if (new_val) {
                            config.epg_url = new_val;
                            Lampa.Storage.set('lampa_iptv_plugin', config);
                            epg_item.find('.settings-param__value').text(new_val);
                            
                            // Автоматично реєструємо EPG в системі Lampa
                            var sys_iptv = Lampa.Storage.get('iptv_config', {});
                            sys_iptv.xmltv_url = new_val;
                            Lampa.Storage.set('iptv_config', sys_iptv);
                        }
                    });
                });

                body.append(pl_item, epg_item);
            }
        });
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        addSettings();

        // Додаємо кнопку в бічне меню
        var menu_item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
                
