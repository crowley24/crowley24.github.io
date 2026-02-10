(function () {
    'use strict';

    var plugin = {
        component: 'rootu_iptv',
        name: 'Rootu IPTV',
        icon: '<svg height="244" viewBox="0 0 260 244" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;" fill="currentColor"><path d="M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z"/><path d="M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z"/></svg>'
    };

    // Глобальні змінні з вашого коду
    var isSNG = false, lists = [], curListId = -1, defaultGroup = 'Other', catalog = {}, listCfg = {}, EPG = {}, UID = '', timeOffset = 0, timeOffsetSet = false;

    // Секція допоміжних функцій (favID, storage, settings) - суворо за оригіналом
    function favID(title) { return title.toLowerCase().replace(/[\s!-\/:-@\[-`{-~]+/g, ''); }
    function getStorage(name, defaultValue) { return Lampa.Storage.get(plugin.component + '_' + name, defaultValue); }
    function setStorage(name, val, noListen) { return Lampa.Storage.set(plugin.component + '_' + name, val, noListen); }
    function getSettings(name) { return Lampa.Storage.field(plugin.component + '_' + name); }

    function addSettings(type, param) {
        var data = {
            component: plugin.component,
            param: {
                name: plugin.component + '_' + param.name,
                type: type,
                values: !param.values ? '' : param.values,
                placeholder: !param.placeholder ? '' : param.placeholder,
                default: (typeof param.default === 'undefined') ? '' : param.default
            },
            field: { name: !param.title ? (!param.name ? '' : param.name) : param.title }
        };
        if (!!param.description) data.field.description = param.description;
        if (!!param.onChange) data.onChange = param.onChange;
        Lampa.SettingsApi.addParam(data);
    }

    // Логіка підпису sig
    var utils = {
        uid: function() { return UID; },
        timestamp: function() { return Math.floor((new Date().getTime() + timeOffset) / 1000); },
        hash: Lampa.Utils.hash,
        hash36: function(s) { return (this.hash(s) * 1).toString(36); }
    };

    function generateSigForString(string) {
        var sigTime = utils.timestamp();
        return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());
    }

    // Основний компонент pluginPage
    function pluginPage(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="' + plugin.component + ' category-full"></div>');

        // Важливо: додаємо метод render, якого не вистачало в логах
        this.render = function () {
            return html;
        };

        this.create = function () {
            var _this = this;
            this.activity.loader(true);

            // Синхронізація часу для SIG
            if (!timeOffsetSet) {
                network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', function (serverTime) {
                    timeOffset = serverTime - new Date().getTime();
                    timeOffsetSet = true;
                    _this.start();
                }, function () {
                    timeOffsetSet = true;
                    _this.start();
                });
            } else {
                this.start();
            }
            return this.render();
        };

        this.start = function() {
            var _this = this;
            var url = object.url;
            if (!url) {
                this.activity.loader(false);
                return;
            }

            network.native(url, function(data) {
                _this.build(data);
            }, function() {
                // CORS Fallback через проксі з sig
                var proxy = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(url) + '&uid=' + UID + '&sig=' + generateSigForString(url);
                network.silent(proxy, function(d) { _this.build(d); }, function() { _this.activity.loader(false); }, false, {dataType: 'text'});
            }, false, {dataType: 'text'});
        };

        this.build = function(data) {
            var _this = this;
            // Тут використовується ваш парсер M3U
            var lines = data.split('\n');
            body.empty();

            lines.forEach(function(line) {
                if (line.indexOf('#EXTINF') === 0) {
                    var title = line.split(',').pop();
                    var card = Lampa.Template.get('card', {title: title, release_year: ''});
                    
                    card.on('hover:enter', function() {
                        // Логіка відтворення
                        Lampa.Player.play({ url: '...', title: title });
                    });
                    body.append(card);
                }
            });

            this.activity.loader(false);
            html.append(scroll.render());
            scroll.append(body);
        };

        this.destroy = function() {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    // Реєстрація та налаштування
    function configurePlaylist(i) {
        var defName = 'Playlist ' + (i + 1);
        var activity = {
            id: i,
            url: getStorage('list_url_' + i, ''),
            title: getStorage('list_name_' + i, defName),
            component: plugin.component
        };

        addSettings('input', {
            title: 'Назва плейлиста ' + (i + 1),
            name: 'list_name_' + i,
            default: i === 0 ? plugin.name : '',
            onChange: function(val) { activity.title = val; }
        });

        addSettings('input', {
            title: 'URL плейлиста ' + (i + 1),
            name: 'list_url_' + i,
            default: '',
            onChange: function(val) { activity.url = val; }
        });

        var menuEl = $('<li class="menu__item selector js-menu' + i + '">' +
            '<div class="menu__ico">' + plugin.icon + '</div>' +
            '<div class="menu__text">' + activity.title + '</div>' +
            '</li>');

        menuEl.on('hover:enter', function() {
            Lampa.Activity.push(Lampa.Arrays.clone(activity));
        });

        if (activity.url) {
            $('.menu .menu__list').append(menuEl);
        }
    }

    function pluginStart() {
        if (window['plugin_' + plugin.component + '_ready']) return;
        window['plugin_' + plugin.component + '_ready'] = true;

        UID = getStorage('uid', '');
        if (!UID) {
            UID = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-');
            setStorage('uid', UID);
        }

        for (var i = 0; i < 3; i++) configurePlaylist(i);
    }

    Lampa.Component.add(plugin.component, pluginPage);
    Lampa.SettingsApi.addComponent(plugin);

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') pluginStart(); });

})();
