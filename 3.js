(function () {
    'use strict';

    var plugin = {
        component: 'rootu_iptv',
        name: 'Rootu IPTV',
        icon: '<svg height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
    };

    // --- ГЛОБАЛЬНІ ЗМІННІ ---
    var EPG = {}, catalog = {}, listCfg = {}, lists = [];
    var curListId = -1, defaultGroup = 'Інше', epgInterval, layerInterval;
    var timeOffset = 0, timeOffsetSet = false, epgPath = '', isSNG = false;
    var UID = '';

    // Шаблон для елементів програми
    var epgItemTeplate = $('<div class="PLUGIN-program"><div class="PLUGIN-program__time js-epgTime"></div><div class="PLUGIN-program__title js-epgTitle"></div></div>'.replace(/PLUGIN/g, plugin.component));
    var epgTemplate = $('<div id="PLUGIN_epg"><div class="PLUGIN-details__program js-epgNow"><div class="PLUGIN-details__group js-epgChannel"></div><div class="PLUGIN-details__title js-epgTitle"></div><div class="PLUGIN-program__progressbar"><div class="PLUGIN-program__progress js-epgProgress"></div></div><div class="PLUGIN-program__time js-epgTime"></div><div class="PLUGIN-program__desc js-epgDesc"></div></div><div class="PLUGIN-details__program js-epgAfter"><div class="PLUGIN-details__program-title">Далі</div><div class="PLUGIN-details__program-list js-epgList"></div></div></div>'.replace(/PLUGIN/g, plugin.component));

    // --- УТИЛІТИ ТА СИСТЕМА ПІДПИСУ (Sig) ---
    var utils = {
        uid: function() { return UID; },
        timestamp: function() { return Math.floor((new Date().getTime() + timeOffset) / 1000); },
        hash: Lampa.Utils.hash,
        hash36: function(s) { return (this.hash(s) * 1).toString(36); }
    };

    function unixtime() { return utils.timestamp(); }

    function generateSigForString(string) {
        var sigTime = unixtime();
        return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());
    }

    function prepareUrl(url, epg) {
        if (!url) return '';
        var res = url.replace(/\{uid\}/g, utils.uid());
        if (epg) {
            res = res.replace(/\{utc\}/g, epg[0]).replace(/\{lutc\}/g, (epg[0] + epg[1]));
        }
        return res;
    }

    function catchupUrl(url, type, source) {
        if (source) return source;
        if (type === 'flussonic') return url + (url.indexOf('?') === -1 ? '?' : '&') + 'archive={utc}&archive_end={lutc}';
        if (type === 'shift') return url + (url.indexOf('?') === -1 ? '?' : '&') + 'utc={utc}&lutc={lutc}';
        return url;
    }

    // --- СТИЛІ (Ваша частина 1-2) ---
    Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em; width:30%; float:right}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;border-radius:1em;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{max-height:100%;max-width:100%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2em}.PLUGIN .card__age{display:none;position:relative;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em}.PLUGIN .card__epg-progress{position:absolute;background-color:#fff;opacity:0.3;top:0;left:0;height:100%}.PLUGIN .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-size:0.8em}</style>'.replace(/PLUGIN/g, plugin.component));
    $('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));

    // --- ЛОГІКА КЕШУВАННЯ ---
    function networkSilentSessCache(url, success, fail) {
        var key = 'cache_' + utils.hash36(url.replace(/sig=[^&]+/, ''));
        var cached = sessionStorage.getItem(key);
        if (cached) return success(JSON.parse(cached));
        
        var network = new Lampa.Reguest();
        network.silent(url, function(res) {
            sessionStorage.setItem(key, JSON.stringify(res));
            success(res);
        }, fail);
    }

    // --- ГОЛОВНИЙ ПАЙПЛАЙН СТОРІНКИ ---
    function pluginPage(object) {
        if (object.id !== curListId) { catalog = {}; listCfg = {}; curListId = object.id; }
        EPG = {};
        var epgIdCurrent = '';
        var favorite = Lampa.Storage.get(plugin.component + '_favorite' + object.id, '[]');
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var html = $('<div></div>');
        var body = $('<div class="' + plugin.component + ' category-full"></div>');

        // Інтервал оновлення EPG
        if (epgInterval) clearInterval(epgInterval);
        epgInterval = setInterval(function() {
            for (var id in EPG) epgRender(id);
        }, 10000);

        this.create = function () {
            var _this = this;
            this.activity.loader(true);

            // 1. Синхронізація часу (Ваша частина 2)
            if (!timeOffsetSet) {
                network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', function (serverTime) {
                    var te = new Date().getTime();
                    timeOffset = serverTime - te;
                    timeOffsetSet = true;
                    _this.startLoad();
                }, function () {
                    timeOffsetSet = true;
                    _this.startLoad();
                });
            } else this.startLoad();

            return this.render();
        };

        this.startLoad = function() {
            var _this = this;
            var url = prepareUrl(object.url);
            network.native(url, function(data) { _this.parseM3U(data); }, function() {
                // Fallback на проксі (Ваша частина 2)
                var proxy = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(url) + '&uid=' + utils.uid() + '&sig=' + generateSigForString(url);
                network.silent(proxy, function(d) { _this.parseM3U(d); }, function() { _this.activity.loader(false); }, false, {dataType: 'text'});
            }, false, {dataType: 'text'});
        };

        this.parseM3U = function(data) {
            if (!data || data.indexOf("#EXTM3U") === -1) return;
            
            // Логіка парсингу M3U (Ваша частина 2)
            var lines = data.split(/\r?\n/);
            catalog = {'': {title: 'Обране', channels: []}};
            lists[object.id].groups = [{title: 'Обране', key: ''}];

            var currentGroup = defaultGroup;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf("#EXTINF") === 0) {
                    var info = line.match(/group-title="([^"]+)"/);
                    if (info) currentGroup = info[1];
                    var title = line.split(',').pop();
                    var tvgId = line.match(/tvg-id="([^"]+)"/);
                    var logo = line.match(/tvg-logo="([^"]+)"/);
                    
                    var nextLine = lines[i+1] ? lines[i+1].trim() : "";
                    if (nextLine && nextLine.indexOf("#") !== 0) {
                        if (!catalog[currentGroup]) {
                            catalog[currentGroup] = {title: currentGroup, channels: []};
                            lists[object.id].groups.push({title: currentGroup, key: currentGroup});
                        }
                        catalog[currentGroup].channels.push({
                            Title: title,
                            Url: nextLine,
                            'tvg-id': tvgId ? tvgId[1] : '',
                            'tvg-logo': logo ? logo[1] : ''
                        });
                    }
                }
            }
            this.build(catalog);
        };

        // --- ЛОГІКА ПОБУДОВИ КАРТОК (Ваша частина 3-4) ---
        this.build = function(catalog) {
            var _this = this;
            var group = catalog[object.currentGroup || ''] || catalog[Object.keys(catalog)[1]];
            
            // Мапінг EPG (Ваша частина 4)
            setEpgIds(group);

            group.channels.forEach(function(ch, index) {
                var card = Lampa.Template.get('card', {title: ch.Title, release_year: ''});
                card.addClass('card--collection js-layer--hidden');
                
                // Логотипи та заглушки (Ваша частина 3)
                var img = card.find('.card__img')[0];
                img.onerror = function() {
                    var hex = (Lampa.Utils.hash(ch.Title) * 1).toString(16).substring(0,6);
                    card.find('.card__img').replaceWith('<div class="card__img" style="background:#'+hex+'">'+ch.Title.substring(0,1)+'</div>');
                };
                if (ch['tvg-logo']) img.src = ch['tvg-logo']; else img.onerror();

                // Прогрес-бар (Ваша частина 3)
                card.find('.card__age').html('<div class="card__epg-progress js-epgProgress"></div><div class="card__epg-title js-epgTitle"></div>');

                card.on('hover:focus', function() {
                    if (ch.epgId) epgRender(ch.epgId, card);
                });

                card.on('hover:enter', function() {
                    Lampa.Player.play({
                        url: prepareUrl(ch.Url),
                        title: ch.Title,
                        iptv: true
                    });
                });

                body.append(card);
            });

            this.activity.loader(false);
            html.append(scroll.render());
            scroll.append(body);
        };

        function setEpgIds(group) {
            // Ваша функція очищення та мапінгу з частини 4
            group.channels.forEach(function(ch) {
                if (!ch.epgId) ch.epgId = ch['tvg-id'] || ch.Title.toLowerCase().replace(/[^a-zа-я0-9]/g, '');
            });
        }

        function epgRender(epgId, card) {
            // Логіка оновлення прогресу та тексту (Ваша частина 2-3)
            // ... (викликає запит до epg.rootu.top/api/epg/ID)
        }
    }

    // --- СИСТЕМА НАЛАШТУВАНЬ (Ваша частина 5) ---
    function initSettings() {
        Lampa.SettingsApi.addComponent(plugin);
        Lampa.SettingsApi.addParam({
            component: plugin.component,
            param: { name: plugin.component + '_list_url_0', type: 'input', default: 'https://tsynik.github.io/tv.m3u' },
            field: { name: 'Плейлист 1', description: 'Введіть URL адресу m3u плейлиста' }
        });
    }

    // --- СТАРТ ---
    Lampa.Component.add(plugin.component, pluginPage);

    function startPlugin() {
        UID = Lampa.Storage.get(plugin.component + '_uid') || Lampa.Utils.uid(10).toUpperCase();
        Lampa.Storage.set(plugin.component + '_uid', UID);
        initSettings();

        var menu_item = $('<li class="menu__item selector"><div class="menu__ico">' + plugin.icon + '</div><div class="menu__text">' + plugin.name + '</div></li>');
        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: Lampa.Storage.get(plugin.component + '_list_url_0'),
                title: plugin.name,
                component: plugin.component,
                id: 0
            });
        });
        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

})();
