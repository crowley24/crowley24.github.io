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
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +
                    '.iptv-col{height:100%;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.05);}' +
                    '.col-groups{width:20%;min-width:180px;background:rgba(0,0,0,0.2);}' +
                    '.col-channels{width:45%;background:rgba(255,255,255,0.01);}' +
                    '.col-details{width:35%;background:#080a0d;padding:2rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;color:rgba(255,255,255,0.6);}' +
                    '.iptv-item.focused{background:rgba(255,255,255,0.1);color:#fff;}' +
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +
                    '</style>');
            }
        };

        this.loadPlaylist = function () {
            var config = Lampa.Storage.get(storage_key, { playlists: [{ url: '' }] });
            var url = config.playlists[0].url;

            if (!url) {
                this.showEmptyState('Введіть URL у налаштуваннях');
                return;
            }

            Lampa.Loading.show();
            // Використовуємо проксі Lampa для уникнення CORS помилок
            $.ajax({
                url: url,
                method: 'GET',
                success: function (str) {
                    Lampa.Loading.hide();
                    if (str.includes('#EXTINF')) _this.parse(str);
                    else Lampa.Noty.show('Невірний формат плейлиста');
                },
                error: function () {
                    Lampa.Loading.hide();
                    _this.showEmptyState('Помилка завантаження');
                }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = {};
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', 'No name'])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'Загальні'])[1];
                    var logo = (lines[i].match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url.startsWith('http')) {
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push({name: name, url: url, logo: logo});
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function (g) {
                colG.append('<div class="iptv-item selector">' + g + '</div>');
            });
            this.toggleController();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list;
            list.forEach(function (ch) {
                colC.append('<div class="iptv-item selector">' + ch.name + '</div>');
            });
        };

        this.showDetails = function(ch) {
            colE.empty().append('<h3>' + ch.name + '</h3>' + (ch.logo ? '<img src="'+ch.logo+'" style="max-width:100%">' : ''));
        };

        this.updateFocus = function() {
            $('.iptv-item').removeClass('focused active');
            var g_items = colG.find('.iptv-item');
            var c_items = colC.find('.iptv-item');

            g_items.eq(index_g).addClass(active_col === 'groups' ? 'focused' : 'active');
            if(active_col === 'channels') {
                c_items.eq(index_c).addClass('focused');
                this.showDetails(current_list[index_c]);
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
                    if (active_col === 'groups') {
                        var keys = Object.keys(groups_data);
                        _this.renderC(groups_data[keys[index_g]]);
                        active_col = 'channels';
                        index_c = 0;
                        _this.updateFocus();
                    }
                },
                left: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else Lampa.Activity.backward();
                },
                enter: function () {
                    if (active_col === 'groups') this.right();
                    else Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });
                }
            });
            Lampa.Controller.toggle('iptv_pro');
            this.updateFocus();
        };

        this.showEmptyState = function(msg) { colC.html('<div class="iptv-empty">'+msg+'</div>'); };
        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); root.remove(); };
    }

    // Решта логіки (init, settings) залишається схожою, але з фіксом збереження
    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        $('.menu .menu__list').append($('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>').on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });
        }));

        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({ component: "iptv_pro", name: "IPTV PRO" });
            Lampa.SettingsApi.addParam({
                component: "iptv_pro",
                param: { name: "playlist_url", type: "button" },
                field: { name: "Плейлист URL", description: "Введіть посилання" },
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
