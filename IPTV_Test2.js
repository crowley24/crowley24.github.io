(function () {
    'use strict';

    Lampa.Platform.tv();

    // Додаємо стилі для трьох колонок
    var style = `
        <style>
            .iptv-layout { display: flex; width: 100%; height: 100%; background: #1a1a1a; position: absolute; top: 0; left: 0; z-index: 10; }
            .iptv-col { display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.1); }
            .iptv-groups { width: 20%; }
            .iptv-channels { width: 35%; }
            .iptv-epg { width: 45%; background: rgba(0,0,0,0.2); }
            .iptv-item { padding: 15px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 1.2rem; }
            .iptv-item.focus { background: #fff; color: #000; }
            .iptv-header { padding: 20px; font-weight: bold; font-size: 1.5rem; color: #ffeb3b; border-bottom: 2px solid #ffeb3b; }
            .epg-program { padding: 10px; opacity: 0.7; }
            .epg-program.active { opacity: 1; border-left: 4px solid #ffeb3b; background: rgba(255,235,59,0.1); }
        </style>
    `;
    $('body').append(style);

    function MyIPTV(object) {
        var network = new Lampa.Reguest();
        var scroll_g = new Lampa.Scroll({mask: true, over: true});
        var scroll_c = new Lampa.Scroll({mask: true, over: true});
        var scroll_e = new Lampa.Scroll({mask: true, over: true});
        
        var playlist_url = "https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u";
        var data = [];

        this.create = function () {
            var self = this;
            this.dom = $('<div class="iptv-layout">');
            
            this.groups_dom = $('<div class="iptv-col iptv-groups"><div class="iptv-header">Групи</div></div>');
            this.channels_dom = $('<div class="iptv-col iptv-channels"><div class="iptv-header">Канали</div></div>');
            this.epg_dom = $('<div class="iptv-col iptv-epg"><div class="iptv-header">Програма</div></div>');

            this.dom.append(this.groups_dom, this.channels_dom, this.epg_dom);
            
            this.groups_dom.append(scroll_g.render());
            this.channels_dom.append(scroll_c.render());
            this.epg_dom.append(scroll_e.render());

            this.load();
            return this.dom;
        };

        this.load = function () {
            var self = this;
            network.silent(playlist_url, function (str) {
                self.parse(str);
                self.renderGroups();
            }, function(){
                Lampa.Noty.show("Помилка завантаження плейлиста");
            }, false, {dataType: 'text'});
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var currentGroup = "Інше";
            var channels = [];
            
            lines.forEach(line => {
                if (line.includes('group-title="')) {
                    currentGroup = line.split('group-title="')[1].split('"')[0];
                    var name = line.split(',').pop();
                    var tvgId = line.match(/tvg-id="([^"]+)"/)?.[1] || "";
                    var url = lines[lines.indexOf(line) + 1];
                    
                    if (!data[currentGroup]) data[currentGroup] = [];
                    data[currentGroup].push({name: name, url: url, epgId: tvgId});
                }
            });
        };

        this.renderGroups = function () {
            var self = this;
            scroll_g.clear();
            Object.keys(data).forEach(group => {
                var item = $('<div class="iptv-item selector">' + group + '</div>');
                item.on('hover:enter', function () {
                    self.renderChannels(group);
                });
                scroll_g.append(item);
            });
            Lampa.Controller.add('iptv_groups', {
                toggle: function () { Lampa.Controller.collectionSet(scroll_g.render()); }
            });
            Lampa.Controller.toggle('iptv_groups');
        };

        this.renderChannels = function (group) {
            var self = this;
            scroll_c.clear();
            data[group].forEach(ch => {
                var item = $('<div class="iptv-item selector">' + ch.name + '</div>');
                item.on('hover:enter', function () {
                    self.play(ch);
                }).on('hover:focus', function(){
                    self.loadEPG(ch);
                });
                scroll_c.append(item);
            });
            Lampa.Controller.add('iptv_channels', {
                toggle: function () { Lampa.Controller.collectionSet(scroll_c.render()); }
            });
            Lampa.Controller.toggle('iptv_channels');
        };

        this.loadEPG = function (ch) {
            scroll_e.clear();
            scroll_e.append($('<div class="epg-program">Завантаження програми для ' + ch.name + '...</div>'));
            // Тут використовується логіка запиту до вашого XML або проксі
            // Для тесту додамо заглушку
            setTimeout(() => {
                scroll_e.clear();
                scroll_e.append($('<div class="epg-program active"><b>12:00</b> Зараз у ефірі: Новини</div>'));
                scroll_e.append($('<div class="epg-program"><b>13:00</b> Наступне: Фільм дня</div>'));
            }, 500);
        };

        this.play = function (ch) {
            var video = {
                url: ch.url,
                title: ch.name
            };
            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {};
    }

    // Реєстрація плагіна в Lampa
    function startPlugin() {
        Lampa.Component.add('my_iptv', MyIPTV);

        var menu_item = $('<li class="menu__item selector">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 3L3 7V17L12 21L21 17V7Z" stroke="white" stroke-width="2" stroke-linejoin="round"/></svg></div>' +
            '<div class="menu__text">Мій IPTV</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'IPTV Pro',
                component: 'my_iptv',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') startPlugin();
    });

})();
