(function () {
    'use strict';

    Lampa.Platform.tv();

    // Додаємо стилі для трьох колонок та оформлення EPG
    var style = `
        <style>
            .iptv-layout { display: flex; width: 100%; height: 100%; background: #1a1a1a; position: absolute; top: 0; left: 0; z-index: 10; }
            .iptv-col { display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
            .iptv-groups { width: 20%; background: #141414; }
            .iptv-channels { width: 35%; background: #1a1a1a; }
            .iptv-epg { width: 45%; background: #0e0e0e; }
            .iptv-item { padding: 12px 20px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 1.1rem; color: rgba(255,255,255,0.6); }
            .iptv-item.focus { background: #ffeb3b; color: #000; font-weight: bold; }
            .iptv-header { padding: 20px; font-weight: bold; font-size: 1.4rem; color: #ffeb3b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ffeb3b; }
            .epg-prog { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .epg-prog.active { background: rgba(255,235,59,0.1); border-left: 4px solid #ffeb3b; }
            .epg-time { color: #ffeb3b; font-weight: bold; margin-bottom: 5px; display: block; }
            .epg-name { font-size: 1.2rem; color: #fff; }
            .epg-desc { font-size: 0.9rem; color: rgba(255,255,255,0.5); margin-top: 5px; }
        </style>
    `;
    $('body').append(style);

    function MyIPTV(object) {
        var network = new Lampa.Reguest();
        var scroll_g = new Lampa.Scroll({mask: true, over: true});
        var scroll_c = new Lampa.Scroll({mask: true, over: true});
        var scroll_e = new Lampa.Scroll({mask: true, over: true});
        
        var playlist_url = "https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u";
        var EPG_CACHE = {};
        var data = {};

        this.create = function () {
            this.dom = $('<div class="iptv-layout">');
            this.groups_dom = $('<div class="iptv-col iptv-groups"><div class="iptv-header">Групи</div></div>');
            this.channels_dom = $('<div class="iptv-col iptv-channels"><div class="iptv-header">Канали</div></div>');
            this.epg_dom = $('<div class="iptv-col iptv-epg"><div class="iptv-header">Телепрограма</div></div>');

            this.dom.append(this.groups_dom, this.channels_dom, this.epg_dom);
            this.groups_dom.append(scroll_g.render());
            this.channels_dom.append(scroll_c.render());
            this.epg_dom.append(scroll_e.render());

            this.loadPlaylist();
            return this.dom;
        };

        this.loadPlaylist = function () {
            var self = this;
            network.silent(playlist_url, function (str) {
                self.parseM3U(str);
                self.renderGroups();
            }, function() {
                Lampa.Noty.show("Помилка завантаження плейлиста");
            }, false, {dataType: 'text'});
        };

        this.parseM3U = function (str) {
            var lines = str.split('\n');
            var currentGroup = "Інші";
            lines.forEach(function(line, index) {
                if (line.startsWith('#EXTINF')) {
                    var groupMatch = line.match(/group-title="([^"]+)"/);
                    if (groupMatch) currentGroup = groupMatch[1];
                    
                    var tvgId = line.match(/tvg-id="([^"]+)"/)?.[1] || "";
                    var name = line.split(',').pop().trim();
                    var url = lines[index + 1] ? lines[index + 1].trim() : "";

                    if (url && !url.startsWith('#')) {
                        if (!data[currentGroup]) data[currentGroup] = [];
                        data[currentGroup].push({name: name, url: url, epgId: tvgId});
                    }
                }
            });
        };

        this.renderGroups = function () {
            var self = this;
            scroll_g.clear();
            Object.keys(data).forEach(function(group) {
                var item = $('<div class="iptv-item selector">' + group + '</div>');
                item.on('hover:focus', function () {
                    self.renderChannels(group);
                });
                scroll_g.append(item);
            });
            Lampa.Controller.add('iptv_groups', {
                toggle: function () { Lampa.Controller.collectionSet(scroll_g.render()); },
                right: function () { Lampa.Controller.toggle('iptv_channels'); }
            });
            Lampa.Controller.toggle('iptv_groups');
        };

        this.renderChannels = function (group) {
            var self = this;
            scroll_c.clear();
            data[group].forEach(function(ch) {
                var item = $('<div class="iptv-item selector">' + ch.name + '</div>');
                item.on('hover:enter', function () {
                    self.play(ch);
                }).on('hover:focus', function() {
                    self.updateEPG(ch);
                });
                scroll_c.append(item);
            });
            Lampa.Controller.add('iptv_channels', {
                toggle: function () { Lampa.Controller.collectionSet(scroll_c.render()); },
                left: function () { Lampa.Controller.toggle('iptv_groups'); }
            });
        };

        this.updateEPG = function (ch) {
            var self = this;
            scroll_e.clear();
            if (!ch.epgId) {
                scroll_e.append('<div class="epg-prog">Програма відсутня</div>');
                return;
            }

            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            var epgUrl = 'https://epg.rootu.top/api/epg/' + encodeURIComponent(ch.epgId) + '/hour/' + t;

            network.silent(epgUrl, function (r) {
                if (r && r.list && r.list.length > 0) {
                    r.list.forEach(function (prog, i) {
                        var startTime = new Date(prog[0] * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        var isActive = (Date.now() / 1000 >= prog[0] && Date.now() / 1000 < (prog[0] + prog[1]));
                        
                        var item = $(`
                            <div class="epg-prog ${isActive ? 'active' : ''}">
                                <span class="epg-time">${startTime}</span>
                                <div class="epg-name">${prog[2]}</div>
                                ${prog[3] ? `<div class="epg-desc">${prog[3]}</div>` : ''}
                            </div>
                        `);
                        scroll_e.append(item);
                    });
                } else {
                    scroll_e.append('<div class="epg-prog">Немає даних на найближчу годину</div>');
                }
            });
        };

        this.play = function (ch) {
            Lampa.Player.play({
                url: ch.url,
                title: ch.name
            });
            Lampa.Player.playlist([{title: ch.name, url: ch.url}]);
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            this.dom.remove();
        };
    }

    function startPlugin() {
        Lampa.Component.add('my_iptv_pro', MyIPTV);

        var menu_item = $('<li class="menu__item selector">' +
            '<div class="menu__ico"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#fff"><path d="M2 12C2 7.58172 5.58172 4 10 4H14C18.4183 4 22 7.58172 22 12C22 16.4183 18.4183 20 14 20H10C5.58172 20 2 16.4183 2 12Z" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="#fff"/></svg></div>' +
            '<div class="menu__text">IPTV PRO</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'my_iptv_pro',
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
