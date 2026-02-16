(function () {
    'use strict';

    var plugin = {
        component: 'my_iptv',
        icon: "<svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"/><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"/></svg>",
        name: 'ipTV'
    };

    var catalog = {};
    var lists = [];
    var listCfg = {};
    var curListId = -1;
    var EPG = {};
    var epgPath = '';
    var epgInterval, layerInterval;
    var timeOffset = 0, timeOffsetSet = false;
    var isSNG = false;
    var UID = '';

    var utils = {
        hash36: function (s) {
            var hash = 0, i, chr;
            if (s.length === 0) return hash;
            for (i = 0; i < s.length; i++) {
                chr = s.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return (hash >>> 0).toString(36);
        },
        uid: function () { return UID; }
    };

    var encoder = {
        text: function (t) {
            return {
                html: function () {
                    var e = document.createElement('div');
                    e.textContent = t;
                    return e.innerHTML;
                }
            };
        }
    };

    function unixtime() { return Math.floor(Date.now() / 1000) + timeOffset; }

    function toLocaleTimeString(t) {
        var d = new Date(t);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }

    function toLocaleDateString(t) {
        var d = new Date(t);
        return d.toLocaleDateString();
    }

    function prepareUrl(url, epg) {
        if (!url) return '';
        var t = unixtime();
        url = url.replace('{uid}', UID);
        if (epg) {
            url = url.replace('${start}', epg[0]).replace('${end}', epg[0] + epg[1]).replace('${offset}', t - epg[0]);
        }
        return url;
    }

    function catchupUrl(url, type, source) {
        if (source) return source;
        if (type === 'flussonic') return url + '?archive=${start}&archive_end=${end}';
        return url;
    }

    function generateSigForString(s) { return utils.hash36(s + 'salt'); }

    function networkSilentSessCache(url, success, fail) {
        var cache = Lampa.Storage.get('sess_' + utils.hash36(url));
        if (cache) return success(JSON.parse(cache));
        var network = new Lampa.Reguest();
        network.silent(url, function (data) {
            Lampa.Storage.set('sess_' + utils.hash36(url), JSON.stringify(data));
            success(data);
        }, fail);
    }

    function getEpgSessCache(key, lt) {
        var cache = Lampa.Storage.get('epg_cache_' + key);
        if (cache) {
            var d = JSON.parse(cache);
            if (d.length && (d[d.length - 1][0] + d[d.length - 1][1]) > lt) return d;
        }
        return null;
    }

    function setEpgSessCache(key, data) { Lampa.Storage.set('epg_cache_' + key, JSON.stringify(data)); }

    var epgTemplate = $('<div id="' + plugin.component + '_epg" class="PLUGIN-details PLUGIN-details__program PLUGIN-details__program-list PLUGIN-details__title PLUGIN-details__group PLUGIN-details__program-title PLUGIN-program PLUGIN-program__time PLUGIN-program__progressbar PLUGIN-program__progress PLUGIN-program__desc PLUGIN-program focus PLUGIN-program__time::after'.replace(/PLUGIN/g, plugin.component) + '"></div>');
    var epgItemTeplate = $('<div class="' + plugin.component + '-program"><div class="' + plugin.component + '-program__time js-epgTime"></div><div class="js-epgTitle"></div></div>');

    function epgListView(show) {
        var ec = $('#' + plugin.component + '_epg');
        show ? ec.show() : ec.hide();
    }

    // --- Частина 2: Стилі та Логіка Сторінки ---
    Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__group{font-size:1.3em;margin-bottom:.9em;opacity:.5}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-list>div+div{margin-top:1em}.PLUGIN-program{display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{flex-shrink:0;width:5em;position:relative}.PLUGIN-program.focus .PLUGIN-program__time::after{content:\'\';position:absolute;top:.5em;right:.9em;width:.4em;background-color:#fff;height:.4em;border-radius:100%;margin-top:-0.1em;font-size:1.2em}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;border:0.05em solid #fff;background-color:#fff;max-width: 100%}</style>'.replace(/PLUGIN/g, plugin.component));
    $('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));

    function pluginPage(object) {
        if (object.id !== curListId) {
            catalog = {};
            listCfg = {};
            curListId = object.id;
        }
        EPG = {};
        var epgIdCurrent = '';
        var favorite = JSON.parse(getStorage('favorite' + object.id, '[]'));
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var html = $('<div></div>');
        var body = $('<div class="' + plugin.component + ' category-full"></div>');
        var info, last;

        body.toggleClass('square_icons', getSettings('square_icons') === 'true');
        body.toggleClass('contain_icons', getSettings('contain_icons') === 'true');

        if (epgInterval) clearInterval(epgInterval);
        epgInterval = setInterval(function () { for (var id in EPG) epgRender(id); }, 10000);

        var layerCards, layerMinPrev = 0, layerMaxPrev = 0, layerFocusI = 0, layerCnt = 24;
        if (layerInterval) clearInterval(layerInterval);
        layerInterval = setInterval(function () {
            if (!layerCards) return;
            var minI = Math.max(layerFocusI - layerCnt, 0), maxI = Math.min(layerFocusI + layerCnt, layerCards.length - 1);
            if (layerMinPrev > maxI || layerMaxPrev < minI) {
                layerCards.slice(layerMinPrev, layerMaxPrev + 1).removeClass('js-layer--visible');
                cardsEpgRender(layerCards.slice(minI, maxI + 1).addClass('js-layer--visible'));
            } else {
                if (layerMinPrev < minI) layerCards.slice(layerMinPrev, minI + 1).removeClass('js-layer--visible');
                if (layerMaxPrev > maxI) layerCards.slice(maxI, layerMaxPrev + 1).removeClass('js-layer--visible');
                if (layerMinPrev > minI) cardsEpgRender(layerCards.slice(minI, layerMinPrev + 1).addClass('js-layer--visible'));
                if (layerMaxPrev < maxI) cardsEpgRender(layerCards.slice(layerMaxPrev, maxI + 1).addClass('js-layer--visible'));
            }
            layerMinPrev = minI; layerMaxPrev = maxI;
        }, 50);

        this.create = function () {
            var _this = this;
            this.activity.loader(true);
            var emptyResult = function () {
                var empty = new Lampa.Empty();
                html.append(empty.render());
                _this.activity.loader(false); _this.activity.toggle();
            };

            if (Object.keys(catalog).length) {
                _this.build(catalog);
            } else {
                var load = 1, dataRaw;
                var compileList = function (d) { dataRaw = d; if (!--load) parseListHeader(); };
                if (!timeOffsetSet) {
                    load++;
                    network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', function (st) {
                        var te = Date.now();
                        timeOffset = (st < (te - 10000) || st > (te + 10000)) ? st - te : 0;
                        timeOffsetSet = true; compileList(dataRaw);
                    }, function () { timeOffsetSet = true; compileList(dataRaw); });
                }

                var parseListHeader = function () {
                    if (typeof dataRaw !== 'string' || dataRaw.substr(0, 7).toUpperCase() !== "#EXTM3U") return emptyResult();
                    var lines = dataRaw.split(/\r?\n/, 2)[0].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g);
                    if (lines) lines.forEach(function (m) {
                        var mm = m.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/);
                        if (mm) listCfg[mm[1].toLowerCase()] = mm[4] || mm[2];
                    });
                    listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';
                    listCfg.epgCode = utils.hash36(listCfg.epgUrl.toLowerCase());
                    listCfg.isEpgIt999 = ["0", "4v7a2u", "skza0s", "oj8j5z", "sab9bx", "rv7awh", "2blr83"].indexOf(listCfg.epgCode) >= 0;
                    var chUri = 'channels';
                    if (listCfg.epgUrl) chUri = listCfg.epgCode + '/channels?url=' + encodeURIComponent(listCfg.epgUrl) + '&uid=' + UID + '&sig=' + generateSigForString(listCfg.epgUrl);
                    listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + chUri;
                    networkSilentSessCache(listCfg.epgApiChUrl, parseList, parseList);
                };

                var parseList = function () {
                    catalog = { '': { title: langGet('favorites'), channels: [] } };
                    lists[object.id].groups = [{ title: langGet('favorites'), key: '' }];
                    var l = dataRaw.split(/\r?\n/), i = 1, cnt = 0, defGroup = 'Other', maxCh = parseInt(getSettings('max_ch_in_group')) || 300, chInG = {};
                    while (i < l.length) {
                        var channel = { ChNum: ++cnt, Title: "Ch " + cnt, Url: '', Group: '', Options: {} };
                        for (; i < l.length; i++) {
                            var m;
                            if (m = l[i].match(/^#EXTGRP:\s*(.+)$/i)) defGroup = m[1].trim();
                            else if (m = l[i].match(/^#EXTINF:\s*-?\d+(.*),(.*)$/i)) {
                                channel.Title = m[2].trim();
                                var tags = m[1].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g);
                                if (tags) tags.forEach(function (t) {
                                    var mm = t.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/);
                                    if (mm) channel[mm[1].toLowerCase()] = mm[4] || mm[2];
                                });
                            } else if (m = l[i].match(/^(https?):\/\/(.+)$/i)) {
                                channel.Url = m[0].trim();
                                channel.Group = (channel['group-title'] || defGroup) + "";
                                break;
                            }
                        }
                        if (channel.Url) {
                            chInG[channel.Group] = (chInG[channel.Group] || 0) + 1;
                            var gPage = maxCh ? Math.floor((chInG[channel.Group] - 1) / maxCh) : 0;
                            var gKey = channel.Group + (gPage ? ' #' + (gPage + 1) : '');
                            if (!catalog[gKey]) {
                                catalog[gKey] = { title: gKey, channels: [] };
                                lists[object.id].groups.push({ title: gKey, key: gKey });
                            }
                            catalog[gKey].channels.push(channel);
                            var fI = favorite.indexOf(favID(channel.Title));
                            if (fI !== -1) catalog[''].channels[fI] = channel;
                        }
                    }
                    _this.build(catalog);
                };

                network.native(prepareUrl(object.url), compileList, function () {
                    network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(object.url), compileList, emptyResult, false, { dataType: 'text' });
                }, false, { dataType: 'text' });
            }
            return this.render();
        };

        // --- Рендеринг Картки та EPG (Частина 3) ---
        this.append = function (data) {
            var chIndex = 0, _this2 = this;
            layerCards = null;
            var bulkFn = Lampa.Arrays.bulk(data, function (channel) {
                var chI = chIndex++;
                var card = Lampa.Template.get('card', { title: channel.Title, release_year: '' });
                card.addClass('card--collection js-layer--hidden');
                if (chI < layerCnt) card.addClass('js-layer--visible');

                var img = card.find('.card__img')[0];
                img.onerror = function () {
                    var fl = channel.Title.substring(0, 2).toUpperCase();
                    card.find('.card__img').replaceWith('<div class="card__img">' + fl + '</div>');
                    card.addClass('card--loaded');
                };
                if (channel['tvg-logo']) img.src = channel['tvg-logo']; else img.onerror();

                card.on('hover:focus', function () {
                    layerFocusI = chI;
                    info.find('.info__title').text(channel.Title);
                    if (channel.epgId) epgRender(channel.epgId);
                }).on('hover:enter', function () {
                    var video = { title: channel.Title, url: prepareUrl(channel.Url), iptv: true };
                    Lampa.Player.play(video);
                });

                body.append(card);
                if (channel.epgId) card.attr('data-epg-id', channel.epgId).addClass('js-epgNoRender');
            }, 18);
            _this2.activity.loader(false); _this2.activity.toggle();
            layerCards = body.find('.js-layer--hidden');
        };

        // --- Мапінг та Навігація (Частина 4-5) ---
        function setEpgId(group) {
            if (!group.channels.length || !listCfg.epgApiChUrl) return;
            networkSilentSessCache(listCfg.epgApiChUrl, function (chIDs) {
                epgPath = chIDs.epgPath ? '/' + chIDs.epgPath : '';
                group.channels.forEach(function (ch) {
                    if (!ch.epgId) ch.epgId = chIDs.id2epg[ch['tvg-id']] || ch['tvg-id'];
                });
            });
        }

        this.build = function (cat) {
            var g = cat[object.currentGroup] || cat[''] || { channels: [] };
            setEpgId(g);
            html.append(scroll.render());
            scroll.append(body);
            this.append(g.channels);
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () { Lampa.Controller.collectionSet(scroll.render()); },
                left: function () { Lampa.Controller.toggle('menu'); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function () { return html; };
        this.destroy = function () { if (epgInterval) clearInterval(epgInterval); if (layerInterval) clearInterval(layerInterval); };
    }

    // Реєстрація налаштувань та плагіна
    function langAdd(n, v) { langData[plugin.component + '_' + n] = v; }
    var langData = {};
    langAdd('favorites', { ru: 'Избранное', uk: 'Вибране' });
    langAdd('max_ch_in_group', { ru: 'Каналов в группе', uk: 'Каналів у групі' });
    Lampa.Lang.add(langData);

    function getStorage(n, d) { return Lampa.Storage.get(plugin.component + '_' + n, d); }
    function getSettings(n) { return Lampa.Storage.field(plugin.component + '_' + n); }

    Lampa.Component.add(plugin.component, pluginPage);

    function pluginStart() {
        var menu = $('.menu .menu__list').eq(0);
        var menuEl = $('<li class="menu__item selector"><div class="menu__ico">' + plugin.icon + '</div><div class="menu__text">' + plugin.name + '</div></li>')
            .on('hover:enter', function () {
                Lampa.Activity.push({ title: plugin.name, component: plugin.component, url: getSettings(plugin.component + '_list_url_0'), id: 0 });
            });
        menu.append(menuEl);
    }

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') pluginStart(); });
})();

                
