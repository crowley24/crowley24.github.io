(function () {
    'use strict';

    var plugin = {
        name: 'IPTV Player',
        component: 'iptv_player',
        icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 7V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 7V5h14v2H5zm16 10v-2c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM5 17v-2h14v2H5z" fill="currentColor"/></svg>',
        version: '1.1.0'
    };

    var catalog = {};
    var lists = [];
    var curListId = -1;
    var listCfg = {};
    var EPG = {};
    var timeOffset = 0;
    var timeOffsetSet = false;
    var epgInterval;
    var layerInterval;
    var isSNG = true; // За замовчуванням для UA
    var defaultGroup = 'Інше';

    var encoder = Lampa.Utils.encoder;

    var epgTemplate = $('<div id="PLUGIN" class="PLUGIN"><div class="PLUGIN-details__program"><div class="PLUGIN-details__program-title js-epgChannel"></div><div class="PLUGIN-details__program-list"><div class="PLUGIN-program js-epgNow"><div class="PLUGIN-program__time js-epgTime"></div><div><div class="PLUGIN-program__title js-epgTitle"></div><div class="PLUGIN-program__progressbar"><div class="PLUGIN-program__progress js-epgProgress"></div></div><div class="PLUGIN-program__desc js-epgDesc"></div></div></div><div class="PLUGIN-details__program-list js-epgAfter"></div></div></div></div>');
    var epgItemTeplate = $('<div class="PLUGIN-program"><div class="PLUGIN-program__time js-epgTime"></div><div class="PLUGIN-program__title js-epgTitle"></div></div>');

    function toLocaleTimeString(t) {
        return new Date(t + timeOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function toLocaleDateString(t) {
        return new Date(t + timeOffset).toLocaleDateString();
    }

    function unixtime() {
        return Math.floor((new Date().getTime() + timeOffset) / 1000);
    }

    function prepareUrl(url, epg) {
        if (epg) {
            url = url.replace('${start}', epg[0]).replace('${end}', epg[0] + epg[1]).replace('${offset}', (unixtime() - epg[0]));
        }
        return url;
    }

    function catchupUrl(url, type, source) {
        if (source) return source;
        if (type === 'flussonic') return url + '?archive=${start}&archive_end=${end}';
        if (type === 'shift') return url + '?timeshift=${offset}';
        return url;
    }

    function epgListView(isView) {
        var scroll = $('.iptv_player .layer--wheight');
        if (isView) {
            scroll.css({ float: "left", width: '70%' });
            if (!$('#iptv_player_epg').length) scroll.parent().append(epgTemplate.clone().attr('id', 'iptv_player_epg'));
        } else {
            scroll.css({ float: "none", width: '100%' });
            $('#iptv_player_epg').remove();
        }
    }

    // Стиль (видалено стилі для square_icons)
    Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-title{font-size:1.2em;padding-left:4.9em;margin-top:1em;margin-bottom:1em;opacity:.5}.PLUGIN-program{display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{flex-shrink:0;width:5em;position:relative}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;background-color:#fff;max-width: 100%}</style>'.replace(/PLUGIN/g, plugin.component));
    $('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));
	function pluginPage(object) {
    if (object.id !== curListId) {
        catalog = {};
        listCfg = {};
        curListId = object.id;
    }
    EPG = {};
    var epgIdCurrent = '';
    var epgPath = '';
    var favorite = getStorage('favorite' + object.id, '[]');
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        step: 250
    });
    
    var html = $('<div></div>');
    var body = $('<div class="' + plugin.component + ' category-full"></div>');
    
    // Залишаємо лише налаштування розміру (contain_icons)
    body.toggleClass('contain_icons', getSettings('contain_icons'));
    
    var info;
    var last;

    if (epgInterval) clearInterval(epgInterval);
    epgInterval = setInterval(function() {
        for (var epgId in EPG) {
            epgRender(epgId);
        }
    }, 10000);

    var layerCards, layerMinPrev = 0, layerMaxPrev = 0, layerFocusI = 0, layerCnt = 24;
    if (layerInterval) clearInterval(layerInterval);
    layerInterval = setInterval(function() {
        if (!layerCards) return;
        var minI = Math.max(layerFocusI - layerCnt, 0);
        var maxI = Math.min(layerFocusI + layerCnt, layerCards.length - 1);
        if (layerMinPrev > maxI || layerMaxPrev < minI) {
            layerCards.slice(layerMinPrev, layerMaxPrev + 1).removeClass('js-layer--visible');
            cardsEpgRender(layerCards.slice(minI, maxI + 1).addClass('js-layer--visible'));
        } else {
            if (layerMinPrev < minI) layerCards.slice(layerMinPrev, minI + 1).removeClass('js-layer--visible');
            if (layerMaxPrev > maxI) layerCards.slice(maxI, layerMaxPrev + 1).removeClass('js-layer--visible');
            if (layerMinPrev > minI) cardsEpgRender(layerCards.slice(minI, layerMinPrev + 1).addClass('js-layer--visible'));
            if (layerMaxPrev < maxI) cardsEpgRender(layerCards.slice(layerMaxPrev, maxI + 1).addClass('js-layer--visible'));
        }
        layerMinPrev = minI;
        layerMaxPrev = maxI;
    }, 50);

    this.create = function () {
        var _this = this;
        this.activity.loader(true);
        var emptyResult = function () {
            var empty = new Lampa.Empty();
            html.append(empty.render());
            _this.start = empty.start;
            _this.activity.loader(false);
            _this.activity.toggle();
        };

        if (Object.keys(catalog).length) {
            _this.build(catalog);
        } else if(!lists[object.id] || !object.url) {
            emptyResult();
            return;
        } else {
            var load = 1, data;
            var compileList = function (dataList) {
                data = dataList;
                if (!--load) parseListHeader();
            };

            if (!timeOffsetSet) {
                load++;
                (function () {
                    var ts = new Date().getTime();
                    network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time',
                        function (serverTime) {
                            var te = new Date().getTime();
                            timeOffset = (serverTime < ts || serverTime > te) ? serverTime - te : 0;
                            timeOffsetSet = true;
                            compileList(data);
                        },
                        function () {
                            timeOffsetSet = true;
                            compileList(data);
                        }
                    );
                })();
            }

            var parseListHeader = function () {
                if (typeof data != 'string' || data.substr(0, 7).toUpperCase() !== "#EXTM3U") {
                    emptyResult();
                    return;
                }
                var m, mm, channelsUri = 'channels';
                var l = data.split(/\r?\n/, 2)[0];
                if (!!(m = l.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {
                    for (var jj = 0; jj < m.length; jj++) {
                        if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {
                            listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);
                        }
                    }
                }
                listCfg['epgUrl'] = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';
                listCfg['epgCode'] = Lampa.Utils.hash(listCfg['epgUrl'].toLowerCase().replace(/https:\/\//g, 'http://')).toString(36);
                
                if (/^https?:\/\/.+/i.test(listCfg['epgUrl']) && listCfg['epgUrl'].length < 8000) {
                    channelsUri = listCfg['epgCode'] + '/channels?url=' + encodeURIComponent(listCfg['epgUrl']);
                }
                listCfg['epgApiChUrl'] = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;
                network.silent(listCfg['epgApiChUrl'], parseList, parseList);
            }

            var parseList = function () {
                catalog = { '': { title: langGet('favorites'), channels: [] } };
                lists[object.id].groups = [{ title: langGet('favorites'), key: '' }];
                
                var l = data.split(/\r?\n/);
                var cnt = 0, i = 1, defGroup = defaultGroup;
                
                while (i < l.length) {
                    var channel = { Title: "Ch " + (cnt + 1), Url: '', Group: '', Options: {} };
                    for (; i < l.length; i++) {
                        if (!!(m = l[i].match(/^#EXTGRP:\s*(.+?)\s*$/i)) && m[1].trim() !== '') {
                            defGroup = m[1].trim();
                        } else if (!!(m = l[i].match(/^#EXTINF:\s*-?\d+(\s+\S.*?\s*)?,(.+)$/i))) {
                            channel.Title = m[2].trim();
                            if (!!m[1] && !!(m = m[1].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {
                                for (var j = 0; j < m.length; j++) {
                                    if (!!(mm = m[j].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {
                                        channel[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);
                                    }
                                }
                            }
                        } else if (!!(m = l[i].match(/^(https?):\/\/(.+)$/i))) {
                            channel.Url = m[0].trim();
                            channel.Group = (channel['group-title'] || defGroup) + "";
                            cnt++;
                            break;
                        }
                    }
                    if (!!channel.Url) {
                        if (!catalog[channel.Group]) {
                            catalog[channel.Group] = { title: channel.Group, channels: [] };
                            lists[object.id].groups.push({ title: channel.Group, key: channel.Group });
                        }
                        channel['Title'] = channel['Title'].replace(/\s+(\s|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim();
                        catalog[channel.Group].channels.push(channel);
                        var favI = favorite.indexOf(favID(channel.Title));
                        if (favI !== -1) catalog[''].channels[favI] = channel;
                    }
                }
                _this.build(catalog);
            }

            var listUrl = object.url;
            network.native(listUrl, compileList, function () {
                network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(listUrl), compileList, emptyResult, false, {dataType: 'text'});
            }, false, {dataType: 'text'});
        }
        return this.render();
    };
		    function epgUpdateData(epgId) {
        var lt = Math.floor(unixtime() / 60);
        var t = Math.floor(lt / 60), ed;
        if (!!EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) {
            ed = EPG[epgId][2];
            if (!ed || ed.length >= 3) return;
        }
        if (!!EPG[epgId]) {
            EPG[epgId][1] = t;
        } else {
            EPG[epgId] = [t, t, false];
        }

        var success = function(epg) {
            if (EPG[epgId][2] === false) EPG[epgId][2] = [];
            for (var i = 0; i < epg.length; i++) {
                if (lt < (epg[i][0] + epg[i][1])) {
                    EPG[epgId][2].push.apply(EPG[epgId][2], epg.slice(i));
                    break;
                }
            }
            epgRender(epgId);
        };

        network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t, success, function(){
            if (EPG[epgId][2] === false) EPG[epgId][2] = [];
            epgRender(epgId);
        });
    }

    function cardsEpgRender(cards) {
        cards.filter('.js-epgNoRender[data-epg-id]').each(function(){ epgRender($(this).attr('data-epg-id')) });
    }

    function epgRender(epgId) {
        var epg = (EPG[epgId] || [0, 0, []])[2];
        var card = body.find('.js-layer--visible[data-epg-id="' + epgId + '"]').removeClass('js-epgNoRender');
        if (epg === false || !card.length) return;
        var epgEl = card.find('.card__age');
        if (!epgEl.length) return;
        
        var t = Math.floor(unixtime() / 60), enableCardEpg = false, i = 0, e, p;
        while (epg.length && t >= (epg[0][0] + epg[0][1])) epg.shift();
        
        if (epg.length) {
            e = epg[0];
            if (t >= e[0] && t < (e[0] + e[1])) {
                i++;
                enableCardEpg = true;
                p = Math.round((unixtime() - e[0] * 60) * 100 / (e[1] * 60 || 60));
                epgEl.find('.js-epgTitle').text(e[2]);
                epgEl.find('.js-epgProgress').css('width', p + '%');
                epgEl.show();
            }
        }

        if (epgIdCurrent === epgId) {
            var ec = $('#' + plugin.component + '_epg');
            var epgNow = ec.find('.js-epgNow');
            if (i) {
                var slt = toLocaleTimeString(e[0] * 60000);
                epgNow.find('.js-epgProgress').css('width', p + '%');
                epgNow.find('.js-epgTime').text(slt);
                epgNow.find('.js-epgTitle').text(e[2]);
                epgNow.find('.js-epgDesc').html(e[3] ? '<p>' + encoder.text(e[3]).html() + '</p>' : '');
                epgNow.show();
            } else {
                epgNow.hide();
            }
        }
        if (!enableCardEpg) epgEl.hide();
        if (epg.length < 3) epgUpdateData(epgId);
    }

    this.append = function (data) {
        var _this2 = this;
        var lazyLoadImg = ('loading' in HTMLImageElement.prototype);
        layerCards = null;

        data.forEach(function (channel, chI) {
            var card = Lampa.Template.get('card', { title: channel.Title, release_year: '' });
            card.addClass('card--collection js-layer--hidden');
            if (chI < layerCnt) card.addClass('js-layer--visible');

            var img = card.find('.card__img')[0];
            if (lazyLoadImg) img.loading = (chI < 18 ? 'eager' : 'lazy');
            
            img.onerror = function () {
                var name = channel.Title.split(/\s+/).map(function(v){return v.substring(0,1).toUpperCase()}).join('').substring(0,3);
                card.find('.card__img').replaceWith('<div class="card__img">' + name + '</div>');
                card.addClass('card--loaded');
            };
            if (channel['tvg-logo']) img.src = channel['tvg-logo']; else img.onerror();

            card.find('.card__age').html('<div class="card__epg-progress js-epgProgress"></div><div class="card__epg-title js-epgTitle"></div>');

            card.playThis = function() {
                var video = { title: channel.Title, url: channel.Url, plugin: plugin.component, iptv: true };
                Lampa.Player.play(video);
                Lampa.Player.playlist(data.map(function(c){ return {title: c.Title, url: c.Url, iptv: true} }));
            };

            card.on('hover:focus', function () {
                layerFocusI = chI;
                scroll.update(card, true);
                info.find('.info__title').text(channel.Title);
                if (channel['epgId']) {
                    epgIdCurrent = channel['epgId'];
                    epgRender(channel['epgId']);
                }
            }).on('hover:enter', function() {
                card.playThis(); // Прямий запуск без меню
            });

            body.append(card);
            if (channel['epgId']) {
                card.attr('data-epg-id', channel['epgId']).addClass('js-epgNoRender');
                epgRender(channel['epgId']);
            }
        });

        _this2.activity.loader(false);
        _this2.activity.toggle();
        layerCards = body.find('.js-layer--hidden');
    };
		    this.build = function (catalog) {
        var channelGroup = !catalog[object.currentGroup]
                ? (lists[object.id].groups.length > 1 && !!catalog[lists[object.id].groups[1].key]
                        ? catalog[lists[object.id].groups[1].key]
                        : {'channels': []}
                )
                : catalog[object.currentGroup];
        
        var _this2 = this;
        Lampa.Background.change();
        
        // Додаємо кнопку категорій та інфо-панель
        Lampa.Template.add(plugin.component + '_button_category', '<div class="full-start__button selector view--category"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:1.5em;height:1.5em;vertical-align:middle;margin-right:0.5em"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/></svg><span>' + langGet('categories') + '</span></div>');
        Lampa.Template.add(plugin.component + '_info_radio', '<div class="info layer--width"><div class="info__left"><div class="info__title"></div><div class="info__create"></div></div><div class="info__right" style="display: flex !important;"><div id="stantion_filtr"></div></div></div>');
        
        var btn = Lampa.Template.get(plugin.component + '_button_category');
        info = Lampa.Template.get(plugin.component + '_info_radio');
        info.find('#stantion_filtr').append(btn);

        info.find('.view--category').on('hover:enter hover:click', function () {
            _this2.selectGroup();
        });

        html.append(info);

        if (channelGroup.channels.length) {
            scroll.render().addClass('layer--wheight').data('mheight', info);
            html.append(scroll.render());
            this.append(channelGroup.channels);
            
            // Якщо EPG увімкнено, розділяємо екран
            if (getStorage('epg', false)) {
                epgListView(true);
            }
            
            scroll.append(body);
            setStorage('last_catalog' + object.id, object.currentGroup || '!!');
        } else {
            var empty = new Lampa.Empty();
            html.append(empty.render());
            this.activity.loader(false);
            Lampa.Controller.collectionSet(info);
            Navigator.move('right');
        }
    };

    this.selectGroup = function () {
        var groups = Lampa.Arrays.clone(lists[object.id].groups).map(function(group){
            group.selected = object.currentGroup === group.key;
            return group;
        });
        Lampa.Select.show({
            title: langGet('categories'),
            items: groups,
            onSelect: function(group) {
                var activity = Lampa.Arrays.clone(lists[object.id].activity);
                activity.currentGroup = group.key;
                Lampa.Activity.replace(activity);
            },
            onBack: function() {
                Lampa.Controller.toggle('content');
            }
        });
    };

    this.start = function () {
        if (Lampa.Activity.active().activity !== this.activity) return;
        var _this = this;
        Lampa.Controller.add('content', {
            toggle: function () {
                Lampa.Controller.collectionSet(scroll.render());
                Lampa.Controller.collectionFocus(last || false, scroll.render());
            },
            left: function () {
                if (Navigator.canmove('left')) Navigator.move('left');
                else Lampa.Controller.toggle('menu');
            },
            right: function () {
                if (Navigator.canmove('right')) Navigator.move('right');
                else _this.selectGroup();
            },
            up: function () {
                if (Navigator.canmove('up')) Navigator.move('up');
                else {
                    Lampa.Controller.collectionSet(info);
                    Navigator.move('right');
                }
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

    this.pause = this.stop = function () {
        Lampa.Player.runas && Lampa.Player.runas('');
    };

    this.render = function () { return html; };

    this.destroy = function () {
        network.clear();
        scroll.destroy();
        if (info) info.remove();
        if (layerInterval) clearInterval(layerInterval);
        if (epgInterval) clearInterval(epgInterval);
        html.remove();
        body.remove();
    };
	}
	    function langGet(name) {
        return Lampa.Lang.translate(plugin.component + '_' + name);
    }

    var langData = {};
    function langAdd(name, values) {
        langData[plugin.component + '_' + name] = values;
    }

    // Локалізація (Тільки UA та EN)
    langAdd('categories', { uk: 'Категорії', en: 'Categories' });
    langAdd('favorites', { uk: 'Вибране', en: 'Favorites' });
    langAdd('epg_on', { uk: 'Увімкнути телепрограму', en: 'TV Guide: On' });
    langAdd('epg_off', { uk: 'Вимкнути телепрограму', en: 'TV Guide: Off' });
    langAdd('contain_icons', { uk: 'Корекція розміру логотипу', en: 'Logo size correction' });
    langAdd('contain_icons_desc', { uk: 'Виправляє відображення логотипів на весь екран', en: 'Fixes logo display on full screen' });
    langAdd('settings_list_name', { uk: 'Назва плейлиста', en: 'Playlist Name' });
    langAdd('settings_list_url', { uk: 'URL-адреса', en: 'URL' });
    langAdd('default_playlist', { 
        uk: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', 
        en: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' 
    });
    langAdd('default_playlist_cat', { uk: 'Ukraine', en: 'VOD Movies (EN)' });

    Lampa.Lang.add(langData);

    function favID(title) {
        return title.toLowerCase().replace(/[\s!-\/:-@\[-`{-~]+/g, '');
    }

    function getStorage(name, defaultValue) {
        return Lampa.Storage.get(plugin.component + '_' + name, defaultValue);
    }

    function setStorage(name, val, noListen) {
        Lampa.Storage.set(plugin.component + '_' + name, val, noListen);
    }

    function getSettings(name) {
        return Lampa.Storage.field(plugin.component + '_' + name);
    }

    function addSettings(type, param) {
        Lampa.SettingsApi.addParam({
            component: plugin.component,
            param: {
                name: plugin.component + '_' + param.name,
                type: type,
                values: param.values || '',
                default: (typeof param.default === 'undefined') ? '' : param.default
            },
            field: {
                name: param.title || param.name,
                description: param.description || ''
            },
            onChange: param.onChange
        });
    }

    function configurePlaylist(i) {
        var defName = 'IPTV ' + (i + 1);
        var activity = {
            id: i,
            url: '',
            title: plugin.name,
            groups: [],
            currentGroup: getStorage('last_catalog' + i, langGet('default_playlist_cat')),
            component: plugin.component,
            page: 1
        };

        addSettings('input', {
            title: langGet('settings_list_name'),
            name: 'list_name_' + i,
            default: i ? '' : plugin.name,
            onChange: function (newVal) {
                var title = newVal || (i ? defName : plugin.name);
                $('.js-' + plugin.component + '-menu' + i + '-title').text(title);
            }
        });

        addSettings('input', {
            title: langGet('settings_list_url'),
            name: 'list_url_' + i,
            default: i ? '' : langGet('default_playlist'),
            onChange: function (url) {
                if (/^https?:\/\/./i.test(url)) {
                    activity.url = url;
                    $('.js-' + plugin.component + '-menu' + i).show();
                } else {
                    activity.url = '';
                    $('.js-' + plugin.component + '-menu' + i).hide();
                }
            }
        });

        var url = getSettings('list_url_' + i);
        var name = getSettings('list_name_' + i) || (i ? defName : plugin.name);
        
        var menuEl = $('<li class="menu__item selector js-' + plugin.component + '-menu' + i + '">'
            + '<div class="menu__ico">' + plugin.icon + '</div>'
            + '<div class="menu__text js-' + plugin.component + '-menu' + i + '-title">' + name + '</div>'
            + '</li>')
            .hide()
            .on('hover:enter', function() {
                Lampa.Activity.push(Lampa.Arrays.clone(activity));
            });

        if (/^https?:\/\/./i.test(url)) {
            activity.url = url;
            menuEl.show();
        }
        
        lists.push({ activity: activity, menuEl: menuEl, groups: [] });
        return activity.url ? i : i + 1;
    }

    // Реєстрація компонента та налаштувань
    Lampa.Component.add(plugin.component, pluginPage);
    Lampa.SettingsApi.addComponent(plugin);

    addSettings('trigger', {
        title: langGet('contain_icons'),
        description: langGet('contain_icons_desc'),
        name: 'contain_icons',
        default: true
    });

    addSettings('trigger', {
        title: langGet('epg_on'),
        name: 'epg',
        default: false,
        onChange: function(v) { epgListView(v === 'true'); }
    });

    // Налаштовуємо 2 слоти для плейлистів
    for (var i = 0; i < 2; i++) configurePlaylist(i);

    function pluginStart() {
        if (window['plugin_' + plugin.component + '_ready']) return;
        window['plugin_' + plugin.component + '_ready'] = true;
        var menu = $('.menu .menu__list').eq(0);
        lists.forEach(function(l) { menu.append(l.menuEl); });
        console.log(plugin.name + ' started');
    }

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') pluginStart(); });

})();
			
