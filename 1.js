(function () {
    'use strict';

    var PLUGIN_NAME = 'iptv_country_parser';

    var COUNTRIES = [
        { title: '🇺🇦 Украина', code: 'ua' },
        { title: '🇷🇺 Россия', code: 'ru' },
        { title: '🇰🇿 Казахстан', code: 'kz' },
        { title: '🇺🇿 Узбекистан', code: 'uz' },
        { title: '🇺🇸 США', code: 'us' },
        { title: '🇬🇧 Великобритания', code: 'uk' },
        { title: '🇵🇱 Польша', code: 'pl' },
        { title: '🇩🇪 Германия', code: 'de' },
        { title: '🇫🇷 Франция', code: 'fr' },
        { title: '🇮🇹 Италия', code: 'it' },
        { title: '🇪🇸 Испания', code: 'es' },
        { title: '🇹🇷 Турция', code: 'tr' },
        { title: '🇨🇦 Канада', code: 'ca' },
        { title: '🌐 Международные', code: 'int' }
    ];

    // Яркие стили интерфейса с высоким контрастом
    function injectStyles() {
        if ($('#iptv-bright-styles').length) return;
        var style = $(
            '<style id="iptv-bright-styles">' +
                '.iptv-btn-country { background: #1a1a1c !important; color: #ffffff !important; border: 1.5px solid #3a3a40 !important; border-radius: 8px; font-weight: 600; padding: 10px 18px; margin: 4px; font-size: 14px; transition: 0.15s; }' +
                '.iptv-btn-country.active-country { border-color: #ffd700 !important; color: #ffd700 !important; background: #2a2a30 !important; }' +
                '.iptv-btn-country.focus { background: #ffd700 !important; color: #000000 !important; border-color: #ffffff !important; transform: scale(1.06); font-weight: bold; }' +
                
                '.iptv-channel-card { display: flex; align-items: center; width: 100%; max-width: 900px; padding: 12px 18px; margin-bottom: 8px; background: #161618 !important; border: 1.5px solid #2a2a30 !important; border-radius: 10px; box-sizing: border-box; transition: transform 0.15s ease, background-color 0.15s ease; }' +
                '.iptv-channel-card .ch-title { color: #ffffff !important; font-size: 18px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.iptv-channel-card .ch-group { color: #aaaaaa !important; font-size: 13px; font-weight: 500; margin-top: 3px; }' +
                '.iptv-channel-card .ch-icon { color: #888888; font-size: 16px; font-weight: bold; }' +
                
                '.iptv-channel-card.focus { background: #ffffff !important; border-color: #ffd700 !important; transform: scale(1.02); box-shadow: 0 6px 20px rgba(0,0,0,0.8); }' +
                '.iptv-channel-card.focus .ch-title { color: #000000 !important; }' +
                '.iptv-channel-card.focus .ch-group { color: #333333 !important; font-weight: 600; }' +
                '.iptv-channel-card.focus .ch-icon { color: #000000 !important; }' +
                '.iptv-channel-card.focus .logo-box { background: #e0e0e0 !important; }' +
            '</style>'
        );
        $('head').append(style);
    }

    function openIPTVActivity() {
        Lampa.Activity.push({
            url: '',
            title: 'IPTV Каналы',
            component: 'iptv_country_component',
            page: 1
        });
    }

    function init() {
        injectStyles();

        // Добавление в меню
        function tryInjectMenu() {
            var menuList = $('.menu .menu__list');
            if (menuList.length && !menuList.find('[data-action="iptv_auto_open"]').length) {
                var menu_item = $(
                    '<li class="menu__item selector" data-action="iptv_auto_open">' +
                        '<div class="menu__ico">' +
                            '<svg height="24" viewBox="0 0 24 24" width="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
                        '</div>' +
                        '<div class="menu__text">IPTV Страны</div>' +
                    '</li>'
                );
                menu_item.on('hover:enter', function () {
                    openIPTVActivity();
                });
                menuList.append(menu_item);
            }
        }

        tryInjectMenu();
        var timer = setInterval(tryInjectMenu, 500);
        setTimeout(function () { clearInterval(timer); }, 5000);

        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start') tryInjectMenu();
        });

        // Компонент с корректным скроллом
        Lampa.Component.add('iptv_country_component', function () {
            var scroll = new Lampa.Scroll({ mask: true, over: true, step: 200 });
            var container = $('<div style="padding: 20px 25px 80px 25px; width: 100%; box-sizing: border-box;"></div>');
            var navBar = $('<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 25px;"></div>');
            var list = $('<div style="display: flex; flex-direction: column; width: 100%;"></div>');
            var network = new Lampa.Reguest();
            var currentCountry = Lampa.Storage.get('iptv_last_country', 'ua');

            this.create = function () {
                container.append(navBar);
                container.append(list);
                scroll.append(container);

                this.buildCountries();
                this.loadCountry(currentCountry);

                return this.render();
            };

            this.buildCountries = function () {
                var _this = this;
                navBar.empty();

                COUNTRIES.forEach(function (c) {
                    var btn = $('<div class="iptv-btn-country selector">' + c.title + '</div>');
                    
                    if (c.code === currentCountry) {
                        btn.addClass('active-country');
                    }

                    btn.on('hover:focus', function () {
                        scroll.update($(this), true);
                    });

                    btn.on('hover:enter', function () {
                        navBar.find('.active-country').removeClass('active-country');
                        btn.addClass('active-country');
                        currentCountry = c.code;
                        Lampa.Storage.set('iptv_last_country', c.code);
                        _this.loadCountry(c.code);
                    });

                    navBar.append(btn);
                });
            };

            this.loadCountry = function (countryCode) {
                var _this = this;
                _this.activity.loader(true);
                list.empty();

                var endpoint = 'https://iptv-org.github.io/iptv/countries/' + countryCode + '.m3u';

                network.silent(endpoint, function (str) {
                    _this.activity.loader(false);
                    var channels = parseM3U(str);

                    if (!channels.length) {
                        list.html('<div style="padding: 40px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold;">Каналы не найдены</div>');
                    } else {
                        _this.renderChannels(channels);
                    }

                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Layer.update();
                }, function () {
                    _this.activity.loader(false);
                    list.html('<div style="padding: 40px; text-align: center; color: #ff5555; font-size: 20px; font-weight: bold;">Ошибка загрузки плейлиста</div>');
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Layer.update();
                }, false, { dataType: 'text' });
            };

            this.renderChannels = function (channels) {
                list.empty();

                channels.forEach(function (ch) {
                    var card = $(
                        '<div class="iptv-channel-card selector">' +
                            '<div class="logo-box" style="width: 48px; height: 48px; min-width: 48px; display: flex; align-items: center; justify-content: center; background: #222226; border-radius: 8px; margin-right: 16px; overflow: hidden;">' +
                                (ch.img ? '<img src="' + ch.img + '" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.style.display=\'none\'" />' : '<span style="font-size: 22px;">📺</span>') +
                            '</div>' +
                            '<div style="flex: 1; overflow: hidden; padding-right: 15px;">' +
                                '<div class="ch-title">' + ch.title + '</div>' +
                                (ch.group ? '<div class="ch-group">' + ch.group + '</div>' : '') +
                            '</div>' +
                            '<div class="ch-icon">▶</div>' +
                        '</div>'
                    );

                    // Центрирование экрана на выбранном канале
                    card.on('hover:focus', function () {
                        scroll.update($(this), true);
                    });

                    card.on('hover:enter', function () {
                        Lampa.Player.play({
                            url: ch.url,
                            title: ch.title,
                            timeline: false
                        });

                        Lampa.Player.playlist(channels.map(function (item) {
                            return { title: item.title, url: item.url };
                        }));
                    });

                    list.append(card);
                });
            };

            this.render = function () {
                return scroll.render();
            };

            this.start = function () {
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(false, scroll.render());
                    },
                    left: function () {
                        if (Navigator.canmove('left')) Navigator.move('left');
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function () {
                        if (Navigator.canmove('right')) Navigator.move('right');
                    },
                    up: function () {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head');
                    },
                    down: function () {
                        if (Navigator.canmove('down')) Navigator.move('down');
                    },
                    back: function () {
                        Lampa.Activity.backward();
                    }
                });

                Lampa.Controller.toggle('content');
            };

            this.pause = function () {};
            this.stop = function () {};
            this.destroy = function () {
                network.clear();
                scroll.destroy();
            };
        });
    }

    function parseM3U(data) {
        var lines = data.split('\n');
        var items = [];
        var current = null;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            if (line.indexOf('#EXTINF:') === 0) {
                var nameMatch = line.match(/,(.+)$/);
                var logoMatch = line.match(/tvg-logo="([^"]*)"/i);
                var groupMatch = line.match(/group-title="([^"]*)"/i);

                current = {
                    title: nameMatch ? nameMatch[1].trim() : 'Без названия',
                    img: logoMatch ? logoMatch[1] : '',
                    group: groupMatch ? groupMatch[1].trim() : '',
                    url: ''
                };
            } else if (line.indexOf('#') !== 0 && current) {
                current.url = line;
                items.push(current);
                current = null;
            }
        }

        return items;
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
