(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    function MyIPTV() {
        var _this = this; // Виправляємо невикористану змінну
        var network = new Lampa.Reguest();
        var scroll_g = new Lampa.Scroll({mask: true, over: true});
        var scroll_c = new Lampa.Scroll({mask: true, over: true});
        var scroll_e = new Lampa.Scroll({mask: true, over: true});
        
        var playlist_url = "https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u";
        var data = {};
        var layout;

        this.create = function () {
            layout = $('<div class="iptv-layout">' +
                '<div class="iptv-col iptv-groups"><div class="iptv-header">Групи</div><div class="iptv-content"></div></div>' +
                '<div class="iptv-col iptv-channels"><div class="iptv-header">Канали</div><div class="iptv-content"></div></div>' +
                '<div class="iptv-col iptv-epg"><div class="iptv-header">Телепрограма</div><div class="iptv-content"></div></div>' +
            '</div>');

            layout.find('.iptv-groups .iptv-content').append(scroll_g.render());
            layout.find('.iptv-channels .iptv-content').append(scroll_c.render());
            layout.find('.iptv-epg .iptv-content').append(scroll_e.render());

            // Додаємо заглушку, щоб екран не був порожнім
            scroll_g.append($('<div class="iptv-item">Завантаження...</div>'));

            return layout;
        };

        this.render = function () {
            return layout;
        };

        this.start = function () {
            Lampa.Controller.add('iptv_groups', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll_g.render());
                },
                right: function () {
                    Lampa.Controller.toggle('iptv_channels');
                }
            });

            Lampa.Controller.add('iptv_channels', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll_c.render());
                },
                left: function () {
                    Lampa.Controller.toggle('iptv_groups');
                },
                right: function () {
                    Lampa.Controller.toggle('iptv_epg');
                }
            });

            _this.load(); // Використовуємо _this
        };

        this.load = function () {
            network.silent(playlist_url, function (str) {
                _this.parse(str);
                _this.renderGroups();
            }, function () {
                Lampa.Noty.show("Помилка завантаження плейлиста");
            }, false, {dataType: 'text'});
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var currentGroup = "Інше";
            data = {}; // Очищуємо перед парсингом
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (line.indexOf('#EXTINF') !== -1) {
                    var gMatch = line.match(/group-title="([^"]+)"/);
                    if (gMatch) currentGroup = gMatch[1];
                    var tvgId = (line.match(/tvg-id="([^"]+)"/) || [])[1] || "";
                    var name = line.split(',').pop().trim();
                    var url = (lines[i+1] || "").trim();
                    if (url && url.indexOf('#') !== 0) {
                        if (!data[currentGroup]) data[currentGroup] = [];
                        data[currentGroup].push({name: name, url: url, epgId: tvgId});
                    }
                }
            }
        };

        this.renderGroups = function () {
            scroll_g.clear();
            var groups = Object.keys(data);
            if (groups.length === 0) {
                scroll_g.append($('<div class="iptv-item">Плейлист порожній</div>'));
                return;
            }
            groups.forEach(function (group) {
                var item = $('<div class="iptv-item selector">' + group + '</div>');
                item.on('hover:focus', function () {
                    _this.renderChannels(group);
                });
                scroll_g.append(item);
            });
            Lampa.Controller.toggle('iptv_groups');
        };

        this.renderChannels = function (group) {
            scroll_c.clear();
            data[group].forEach(function (ch) {
                var item = $('<div class="iptv-item selector">' + ch.name + '</div>');
                item.on('hover:enter', function () {
                    Lampa.Player.play({ url: ch.url, title: ch.name });
                    Lampa.Player.playlist([{title: ch.name, url: ch.url}]);
                }).on('hover:focus', function () {
                    _this.loadEPG(ch);
                });
                scroll_c.append(item);
            });
        };

        this.loadEPG = function (ch) {
            scroll_e.clear();
            if (!ch.epgId) return;
            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            var url = 'https://epg.rootu.top/api/epg/' + encodeURIComponent(ch.epgId) + '/hour/' + t;
            network.silent(url, function (r) {
                if (r && r.list) {
                    r.list.forEach(function (p) {
                        var time = new Date(p[0] * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        var active = (Date.now()/1000 >= p[0] && Date.now()/1000 < (p[0]+p[1])) ? 'active' : '';
                        scroll_e.append('<div class="epg-prog ' + active + '"><span class="epg-time">' + time + '</span><div class="epg-name">' + p[2] + '</div></div>');
                    });
                }
            });
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            layout.remove();
            layout = null;
        };
    }

    var css = '.iptv-layout{display:flex;width:100%;height:100%;background:#141414;position:absolute;top:0;left:0;z-index:100}';
    css += '.iptv-col{display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,0.05);height:100%;overflow:hidden}';
    css += '.iptv-groups{width:20%}.iptv-channels{width:35%}.iptv-epg{width:45%}';
    css += '.iptv-item{padding:12px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);font-size:1.1rem;color:rgba(255,255,255,0.6)}';
    css += '.iptv-item.focus{background:#ffeb3b;color:#000;font-weight:bold}';
    css += '.iptv-header{padding:20px;font-weight:bold;color:#ffeb3b;border-bottom:1px solid rgba(255,235,59,0.3)}';
    css += '.epg-prog.active{background:rgba(255,235,59,0.1);border-left:4px solid #ffeb3b}';
    css += '.epg-time{color:#ffeb3b;font-weight:bold}';

    if (!$('style#iptv-style').length) {
        $('body').append('<style id="iptv-style">' + css + '</style>');
    }

    Lampa.Component.add('iptv_pro', MyIPTV);

    function addMenuItem() {
        var btn = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        btn.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_pro'
            });
        });
        $('.menu .menu__list').append(btn);
    }

    if (window.appready) addMenuItem();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addMenuItem(); });
})();
