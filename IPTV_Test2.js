(function () {
    'use strict';

    var currentComponent = null;

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var storage_key = 'iptv_pro_v12';

        this.create = function () {
            currentComponent = this;
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-flex-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);
            
            this.injectStyles();
            this.loadPlaylist();
            
            return root;
        };

        this.injectStyles = function() {
            if (!$('#iptv-style-v12').length) {
                $('head').append('<style id="iptv-style-v12">' +
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:100;padding-top:4.5rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%;min-width:200px;background:rgba(0,0,0,0.4);}' +
                    '.col-channels{width:45%;background:rgba(255,255,255,0.02);}' +
                    '.col-details{width:35%;background:#080a0d;padding:2rem;}' +
                    '.iptv-item{padding:1.2rem;margin:0.4rem;border-radius:0.5rem;background:rgba(255,255,255,0.03);cursor:pointer;color:rgba(255,255,255,0.5);font-size:1.2rem;}' +
                    '.iptv-item.focused{background:rgba(255,255,255,0.15);color:#fff;outline: 2px solid #2962ff;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '.iptv-empty{padding:4rem;text-align:center;color:#666;font-size:1.5rem;}' +
                    '</style>');
            }
        };

        this.loadPlaylist = function () {
            var config = Lampa.Storage.get(storage_key, { playlists: [{ url: '' }] });
            var url = config.playlists[0].url;

            if (!url) {
                colC.html('<div class="iptv-empty">Вкажіть URL у налаштуваннях</div>');
                return;
            }

            // Замість Lampa.Loading використовуємо Noty, щоб не було помилок
            Lampa.Noty.show('Завантаження...');
            
            var proxy_url = Lampa.Utils ? Lampa.Utils.proxy(url) : url;

            $.ajax({
                url: proxy_url,
                method: 'GET',
                success: function (str) {
                    if (str && str.indexOf('#EXTINF') !== -1) {
                        _this.parse(str);
                    } else {
                        Lampa.Noty.show('Формат плейлиста не знайдено');
                        colC.html('<div class="iptv-empty">Помилка формату .m3u</div>');
                    }
                },
                error: function () {
                    Lampa.Noty.show('Помилка завантаження');
                    colC.html('<div class="iptv-empty">Перевірте URL або мережу</div>');
                }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            var current_group = 'Загальні';

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', 'Без назви'])[1].trim();
                    var group = (line.match(/group-title="([^"]+)"/i) || ['', current_group])[1];
                    var logo = (line.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var pl_url = (lines[i + 1] && lines[i + 1].trim().indexOf('http') === 0) ? lines[i + 1].trim() : '';

                    if (pl_url) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({name: name, url: pl_url, logo: logo});
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            var keys = Object.keys(groups_data);
            keys.forEach(function (g) {
                colG.append('<div class="iptv-item selector">' + g + '</div>');
            });
            if(keys.length > 0) {
                index_g = 0;
                this.renderC(groups_data[keys[0]]);
            }
            this.toggleController();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (ch) {
                colC.append('<div class="iptv-item selector">' + ch.name + '</div>');
            });
        };

        this.updateFocus = function() {
            $('.iptv-item').removeClass('focused active');
            var g_items = colG.find('.iptv-item');
            var c_items = colC.find('.iptv-item');

            g_items.eq(index_g).addClass(active_col === 'groups' ? 'focused' : 'active');
            
            if(active_col === 'channels') {
                var active_ch = c_items.eq(index_c);
                active_ch.addClass('focused');
                colE.html('<div style="text-align:center"><img src="'+current_list[index_c].logo+'" onerror="this.style.display=\'none\'" style="max-width:100%;max-height:200px;margin-bottom:1rem"><h2>'+current_list[index_c].name+'</h2></div>');
                if(active_ch.length) active_ch[0].scrollIntoView({block:'center'});
            }
        };

        this.toggleController = function () {
            Lampa.Controller.add('iptv_pro_ctrl', {
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
                        _this.renderC(groups_data[keys[index_g]]);
                        active_col = 'channels';
                        index_c = 0;
                        _this.updateFocus();
                    } else {
                        Lampa.Player.play({
                            url: current_list[index_c].url,
                            title: current_list[index_c].name
                        });
                    }
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('iptv_pro_ctrl');
            this.updateFocus();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { 
            Lampa.Controller.remove('iptv_pro_ctrl'); 
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);

        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(item);

        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({ component: "iptv_pro", name: "IPTV PRO" });
            Lampa.SettingsApi.addParam({
                component: "iptv_pro",
                param: { name: "playlist_url", type: "button" },
                field: { name: "Плейлист URL", description: "Введіть посилання .m3u" },
                onChange: function() {
                    var config = Lampa.Storage.get('iptv_pro_v12', { playlists: [{ url: '' }] });
                    Lampa.Input.edit({ value: config.playlists[0].url, title: 'URL' }, function (val) {
                        if(val) {
                            config.playlists[0].url = val;
                            Lampa.Storage.set('iptv_pro_v12', config);
                            if (currentComponent) currentComponent.loadPlaylist();
                        }
                    });
                }
            });
        }
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
