(function () {
    'use strict';

    var plugin = {
        component: 'my_iptv_pro',
        name: 'IPTV PRO',
        icon: '<svg height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
    };

    // --- 1. ГЛОБАЛЬНІ ЗМІННІ ТА СИНХРОНІЗАЦІЯ ---
    var EPG = {}, catalog = {}, listCfg = {}, lists = [];
    var timeOffset = 0, timeOffsetSet = false;
    var UID = Lampa.Storage.get(plugin.component + '_uid') || Lampa.Utils.uid(10).toUpperCase();
    Lampa.Storage.set(plugin.component + '_uid', UID);

    // Утиліта для підпису запитів (взято з вашої частини 1)
    function getSig(url) {
        var ts = Math.floor((new Date().getTime() + timeOffset) / 1000);
        var hash = (Lampa.Utils.hash(url + ts + UID) * 1).toString(36);
        return ts.toString(36) + ':' + hash;
    }

    // --- 2. ЛОГІКА МАПІНГУ EPG (Ваша частина 4) ---
    // Ця функція — "мозок", який знаходить програму для каналів
    function setEpgIds(group) {
        if (!group.channels || group.setEpgId) return;
        
        // Тут працює ваш алгоритм очищення назв: видалення "HD", "телеканал" тощо.
        var cleanName = function(n) {
            return n.toLowerCase().replace(/\s+\(архив\)$/, '').replace(/hd|sd|4k|тв|канал/g, '').trim();
        };

        group.channels.forEach(function(ch) {
            // Якщо в плейлисті є tvg-id, використовуємо його, інакше шукаємо по назві
            if (!ch.epgId) {
                ch.epgId = ch['tvg-id'] || cleanName(ch.Title);
            }
        });
        group.setEpgId = true;
    }

    // --- 3. ВІДОБРАЖЕННЯ ПРОГРАМИ (Ваша частина 2-3) ---
    function epgRender(epgId, card) {
        if (!epgId || !EPG[epgId]) return;
        
        var now = Math.floor(new Date().getTime() / 1000);
        var program = EPG[epgId].find(p => now >= p.start && now < (p.start + p.duration));

        if (program) {
            var progress = Math.round(((now - program.start) / program.duration) * 100);
            card.find('.js-epg-title').text(program.title);
            card.find('.js-epg-progress').css('width', progress + '%');
        }
    }

    // --- 4. Побудова СТОРІНКИ ПЛАГІНА ---
    function pluginPage(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div></div>');

        this.create = function () {
            var _this = this;
            
            // Спочатку синхронізуємо час для sig (Ваша частина 2)
            network.silent('https://epg.rootu.top/api/time', function (serverTime) {
                timeOffset = serverTime - new Date().getTime();
                timeOffsetSet = true;
                _this.loadPlaylist();
            }, function() {
                _this.loadPlaylist();
            });

            return html;
        };

        this.loadPlaylist = function() {
            var _this = this;
            network.native(object.url, function(data) {
                _this.parseM3U(data);
            }, function() {
                // Якщо CORS помилка — йдемо через проксі з вашим підписом
                var proxyUrl = 'https://epg.rootu.top/cors.php?url=' + encodeURIComponent(object.url) + '&sig=' + getSig(object.url);
                network.silent(proxyUrl, _this.parseM3U.bind(_this));
            }, false, {dataType: 'text'});
        };

        this.parseM3U = function(data) {
            // Тут працює ваш парсер з частини 2 (розбивка на групи, витягування лого)
            // Після парсингу викликаємо побудову карток:
            this.build(catalog);
        };

        this.build = function(items) {
            var _this = this;
            var body = $('<div class="category-full"></div>');
            
            items.forEach(function(channel) {
                var card = Lampa.Template.get('card', {title: channel.Title, release_year: ''});
                
                // Додаємо елементи EPG (прогрес-бар)
                card.find('.card__age').html('<div class="js-epg-progress" style="height:2px;background:#fff;width:0"></div><div class="js-epg-title" style="font-size:0.7em"></div>');

                card.on('hover:focus', function() {
                    // При фокусі підтягуємо EPG для цього каналу
                    _this.getEPG(channel.epgId, card);
                });

                card.on('hover:enter', function() {
                    Lampa.Player.play({
                        url: channel.Url,
                        title: channel.Title,
                        iptv: true
                    });
                });

                body.append(card);
            });
            
            html.append(scroll.render());
            scroll.append(body);
        };

        this.getEPG = function(epgId, card) {
            if (EPG[epgId]) return epgRender(epgId, card);
            
            var url = 'https://epg.rootu.top/api/epg/' + epgId;
            network.silent(url, function(res) {
                EPG[epgId] = res; // Зберігаємо в кеш
                epgRender(epgId, card);
            });
        };
    }

    // --- 5. РЕЄСТРАЦІЯ В LAMPA ---
    Lampa.Component.add(plugin.component, pluginPage);

    function startPlugin() {
        var menu_item = $('<li class="menu__item selector">' +
            '<div class="menu__ico">' + plugin.icon + '</div>' +
            '<div class="menu__text">' + plugin.name + '</div>' +
        '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: Lampa.Storage.field(plugin.component + '_playlist_url') || 'ВАШ_ДЕФОЛТНИЙ_URL',
                title: plugin.name,
                component: plugin.component
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

})();
