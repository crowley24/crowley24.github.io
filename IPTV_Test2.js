(function () {      
    'use strict';      
      
    function IPTVComponent() {      
        var _this = this;      
        var root, colG, colC, colE;      
        var groups_data = {};      
        var current_list = [];      
        var active_col = 'groups';      
        var index_g = 0, index_c = 0;      
        var EPG = {};      
        var epgInterval;      
        var epgIdCurrent = '';      
        var epgPath = '';      
        var timeOffset = 0;      
        var timeOffsetSet = false;      
        var listCfg = {};      
        var isSNG = false;      
      
        var storage_key = 'iptv_pro_v12';      
        var config = Lampa.Storage.get(storage_key, {      
            playlists: [{      
                name: 'TEST',      
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'      
            }],      
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',      
            favorites: [],      
            current_pl_index: 0      
        });      
      
        // EPG шаблони  
        var epgTemplate = $(('<div id="iptv_pro_epg">' +      
            '<h2 class="js-epgChannel"></h2>' +      
            '<div class="iptv-pro-details__program-body js-epgNow">' +      
            '   <div class="iptv-pro-details__program-title">ЗАРАЗ</div>' +      
            '   <div class="iptv-pro-program">' +      
            '       <div class="iptv-pro-program__time js-epgTime">XX:XX</div>' +      
            '       <div class="iptv-pro-program__body">' +      
            '           <div class="iptv-pro-program__title js-epgTitle"></div>' +      
            '           <div class="iptv-pro-program__progressbar">' +      
            '               <div class="iptv-pro-program__progress js-epgProgress"></div>' +      
            '           </div>' +      
            '       </div>' +      
            '   </div>' +      
            '   <div class="iptv-pro-program__desc js-epgDesc"></div>' +      
            '</div>' +      
            '<div class="iptv-pro-details__program-body js-epgAfter">' +      
            '   <div class="iptv-pro-details__program-title">ПОТОМ</div>' +      
            '   <div class="iptv-pro-details__program-list js-epgList"></div>' +      
            '</div>' +      
            '</div>'));      
      
        var epgItemTeplate = $(('<div class="iptv-pro-program selector">' +      
            '   <div class="iptv-pro-program__time js-epgTime">XX:XX</div>' +      
            '   <div class="iptv-pro-program__body">' +      
            '       <div class="iptv-pro-program__title js-epgTitle"> </div>' +      
            '   </div>' +      
            '</div>'));      
      
        // Утиліти  
        function unixtime() {      
            return Math.floor((new Date().getTime() + timeOffset)/1000);      
        }      
      
        function toLocaleTimeString(time) {      
            var date = new Date(),      
                ofst = parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n',''));      
            time = time || date.getTime();      
            date = new Date(time + (ofst * 1000 * 60 * 60));      
            return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);      
        }      
      
        function generateSigForString(string) {      
            var sigTime = unixtime();      
            var utils = {      
                uid: function() {return Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-')},      
                hash36: function(s) {return (Lampa.Utils.hash(s) * 1).toString(36)}      
            };      
            return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());      
        }      
      
        // Кешування  
        function networkSilentSessCache(url, success, fail, param) {      
            var context = this;      
            var urlForKey = url.replace(/([&?])sig=[^&]+&?/, '$1');      
            var key = ['cache', urlForKey, param ? Lampa.Utils.hash(JSON.stringify(param)) : ''].join('\t');      
            var data = sessionStorage.getItem(key);      
            if (data) {      
                data = JSON.parse(data);      
                if (data[0]) typeof success === 'function' && success.apply(context, [data[1]]);      
                else typeof fail === 'function' && fail.apply(context, [data[1]]);      
            } else {      
                var network = new Lampa.Reguest();      
                network.silent(      
                    url,      
                    function (data) {      
                        sessionStorage.setItem(key, JSON.stringify([true, data]));      
                        typeof success === 'function' && success.apply(context, [data]);      
                    },      
                    function (data) {      
                        sessionStorage.setItem(key, JSON.stringify([false, data]));      
                        typeof fail === 'function' && fail.apply(context, [data]);      
                    },      
                    false,      
                    {dataType: 'json'}      
                );      
            }      
        }      
      
        function getEpgSessCache(epgId, lt) {      
            var key = ['epg', epgId].join('\t');      
            var data = sessionStorage.getItem(key);      
            if (data) {      
                data = JSON.parse(data);      
                if (data.length && data[0] <= lt && (data[data.length - 1][0] + data[data.length - 1][1]) > lt) return data;      
            }      
            return false;      
        }      
      
        function setEpgSessCache(epgId, epg) {      
            var key = ['epg', epgId].join('\t');      
            sessionStorage.setItem(key, JSON.stringify(epg));      
        }      
      
        // EPG функції  
        function epgUpdateData(epgId) {      
            var lt = Math.floor(unixtime()/60);      
            var t = Math.floor(lt/60), ed, ede;      
            if (!!EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) {      
                ed = EPG[epgId][2];      
                if (!ed || !ed.length || ed.length >= 3) return;      
                ede = ed[ed.length - 1];      
                lt = (ede[0] + ede[1]);      
                var t2 = Math.floor(lt / 60);      
                if ((t2 - t) > 6 || t2 <= EPG[epgId][1]) return;      
                t = t2;      
            }      
            if (!!EPG[epgId]) {      
                ed = EPG[epgId][2];      
                if (typeof ed !== 'object') return;      
                if (ed.length) {      
                    ede = ed[ed.length - 1];      
                    lt = (ede[0] + ede[1]);      
                    var t3 = Math.max(t, Math.floor(lt / 60));      
                    if (t < t3 && ed.length >= 3) return;      
                    t = t3;      
                }      
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
                setEpgSessCache(epgId, EPG[epgId][2]);      
                epgRender(epgId);      
            };      
            var fail = function () {      
                if (EPG[epgId][2] === false) EPG[epgId][2] = [];      
                setEpgSessCache(epgId, EPG[epgId][2]);      
                epgRender(epgId);      
            };      
            if (EPG[epgId][2] === false) {      
                var epg = getEpgSessCache(epgId, lt);      
                if (!!epg) return success(epg);      
            }      
            networkSilentSessCache(      
                Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t,      
                success,      
                fail      
            );      
        }      
      
        function epgRender(epgId) {      
            var epg = (EPG[epgId] || [0, 0, []])[2];      
            var ec = $('#iptv_pro_epg');      
            if (epg === false || !ec.length) return;      
            var t = Math.floor(unixtime() / 60), i = 0, e, p, cId, cIdEl;      
            while (epg.length && t >= (epg[0][0] + epg[0][1])) epg.shift();      
            if (epg.length) {      
                e = epg[0];      
                if (t >= e[0] && t < (e[0] + e[1])) {      
                    i++;      
                    p = Math.round((unixtime() - e[0] * 60) * 100 / (e[1] * 60 || 60));      
                    cId = epgId + '_' + epg.length + (epg.length ? '_' + e[0][0] : '');      
                    cIdEl = ec.data('cId') || '';      
                    if (cIdEl !== cId) {      
                        ec.data('cId', cId);      
                        var epgNow = ec.find('.js-epgNow');      
                        var epgAfter = ec.find('.js-epgAfter');      
                        if (i) {      
                            var slt = toLocaleTimeString(e[0] * 60000);      
                            var elt = toLocaleTimeString((e[0] + e[1]) * 60000);      
                            epgNow.find('.js-epgProgress').css('width', p + '%');      
                            epgNow.find('.js-epgTime').text(slt);      
                            epgNow.find('.js-epgTitle').text(e[2]);      
                            var desc = e[3] ? ('<p>' + $('<div/>').text(e[3]).html() + '</p>') : '';      
                            epgNow.find('.js-epgDesc').html(desc.replace(/\n/g,'</p><p>'));      
                            epgNow.show();      
                        } else {      
                            epgNow.hide();      
                        }      
                        if (epg.length > i) {      
                            var list = epgAfter.find('.js-epgList');      
                            list.empty();      
                            var iEnd = Math.min(epg.length, 8);      
                            for (; i < iEnd; i++) {      
                                e = epg[i];      
                                var item = epgItemTeplate.clone();      
                                item.find('.js-epgTime').text(toLocaleTimeString(e[0] * 60000));      
                                item.find('.js-epgTitle').text(e[2]);      
                                list.append(item);      
                            }      
                            epgAfter.show();      
                        } else {      
                            epgAfter.hide();      
                        }      
                    } else if (i && epgNow.find('.js-epgProgress').css('width') !== (p + '%')) {      
                        epgNow.find('.js-epgProgress').css('width', p + '%');      
                    }      
                }      
            }      
            if (epg.length < 3) epgUpdateData(epgId);      
        }      
      
        // Функція setEpgId  
        function setEpgId(channelGroup) {      
            if (channelGroup.setEpgId || !channelGroup.channels || !listCfg['epgApiChUrl']) return;      
            var chIDs = {id2epg: {}, piconUrl: '', id2picon: []}, i=0, channel;      
            networkSilentSessCache(listCfg['epgApiChUrl'], function(d){      
                chIDs = d;      
                if (!chIDs['id2epg']) chIDs['id2epg'] = {};      
                epgPath = !chIDs['epgPath'] ? '' : ('/' + chIDs['epgPath']);      
            });      
            var chShortName = function(chName){      
                return chName      
                    .toLowerCase()      
                    .replace(/\s+\(архив\)$/, '')      
                    .replace(/\s+\((\+\d+)\)/g, ' $1')      
                    .replace(/^телеканал\s+/, '')      
                    .replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim()      
                    .replace(/\s(канал|тв)(\s.+|\s*)$/, '$2')      
                    .replace(/\s(50|orig|original)$/, '')      
                    .replace(/\s(\d+)/g, '$1')      
                    ;      
            };      
            var trW = {"ё":"e","у":"y","к":"k","е":"e","н":"h","ш":"w","з":"3","х":"x","ы":"bl","в":"b","а":"a","р":"p","о":"o","ч":"4","с":"c","м":"m","т":"t","ь":"b","б":"6"};      
            var trName = function(word) {      
                return word.split('').map(function (char) {      
                    return trW[char] || char;      
                }).join("");      
            };      
            var epgIdByName = function(v, find, epgId) {      
                var n = chShortName(v), fw, key;      
                if (n === '' || (!chIDs[n[0]] && !find)) return 0;      
                fw = n[0];      
                if (!!chIDs[fw]) {      
                    if (!!chIDs[fw][n]) return chIDs[fw][n];      
                    n = trName(n);      
                    if (!!chIDs[fw][n]) return chIDs[fw][n];      
                    if (find) {      
                        for (key in chIDs[fw]) {      
                            if (chIDs[fw][key] == epgId) {      
                                return epgId;      
                            } else if (n === trName(key)) {      
                                return chIDs[fw][key];      
                            }      
                        }      
                    }      
                }      
                if (n[0] !== fw && !!chIDs[n[0]]) {      
                    fw = n[0];      
                    if (!!chIDs[fw][n]) return chIDs[fw][n];      
                    if (find) {      
                        for (key in chIDs[fw]) {      
                            if (chIDs[fw][key] == epgId) {      
                                return epgId;      
                            } else if (n === trName(key)) {      
                                return chIDs[fw][key];      
                            }      
                        }      
                    }      
                } else if (find) {      
                    for(var keyW in trW) {      
                        if (trW[keyW] === fw && !!chIDs[keyW]) {      
                            for (key in chIDs[keyW]) {      
                                if (chIDs[keyW][key] == epgId) {      
                                    return epgId;      
                                } else if (n === trName(key)){      
                                    return chIDs[keyW][key];      
                            }      
                        }      
                    }      
                }      
            }      
            return 0;      
        };      
        for (;i < channelGroup.channels.length;i++) {      
            channel = channelGroup.channels[i];      
            channel['epgId'] = (listCfg['isEpgIt999'] || listCfg['isYosso'])      
                ? (channel['tvg_id'] && /^\d{1,4}$/.test(channel['tvg_id']) ? channel['tvg_id'] : epgIdByName(channel['name'], true, channel['tvg_id']))      
                : (chIDs.id2epg[channel['tvg_id'] || ''] || epgIdByName(channel['name'], isSNG, channel['tvg_id']) || channel['tvg_id']);      
            if (!channel['logo'] && channel['epgId'] && !!chIDs.piconUrl) {      
                channel['logo'] = Lampa.Utils.protocol() + chIDs.piconUrl.replace('{picon}', (chIDs.id2picon && chIDs.id2picon[channel['epgId']]) ? chIDs.id2picon[channel['epgId']] : channel['epgId']);      
            }      
            if (!channel['logo']) {      
                if (channel['epgId'] && (listCfg['isEpgIt999'] || isSNG) && /^\d{1,4}$/.test(channel['epgId'])) {      
                    channel['logo'] = Lampa.Utils.protocol() + 'epg.one/img2/' + channel['epgId'] + '.png'      
                } else if (isSNG && !/^Ch \d+$/.test(channel['name'])) {      
                    channel['logo'] = Lampa.Utils.protocol() + 'epg.rootu.top/picon/'      
                        + encodeURIComponent(channel['name']) + '.png';      
                }      
            }      
        }      
        channelGroup.setEpgId = true;      
    }      
  
    // Метод create - обов'язковий  
    this.create = function () {  
        root = $('<div class="iptv-root"></div>');  
        var container = $('<div class="iptv-flex-wrapper"></div>');  
  
        colG = $('<div class="iptv-col col-groups"></div>');  
        colC = $('<div class="iptv-col col-channels"></div>');  
        colE = $('<div class="iptv-col col-details"></div>');  
  
        container.append(colG, colC, colE);  
        root.append(container);  
  
        // Додайте CSS стилі якщо потрібно  
        if (!$('#iptv-style-v12').length) {  
            $('head').append('<style id="iptv-style-v12">' +  
                '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +  
                '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +  
                '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +  
                '.col-groups{width:20%; min-width:180px; flex-shrink:0;}' +  
                '.col-channels{width:45%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +  
                '.col-details{width:35%; min-width:300px; flex-shrink:0; background:#080a0d; padding:1.5rem;}' +  
                '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +  
                '.iptv-item.active{background:#2962ff;color:#fff;}' +  
                '.channel-row{display:flex;align-items:center;gap:1rem;}' +  
                '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +  
                '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +  
                '.epg-title-big{font-size:1.6rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +  
                '.epg-now{color:#2962ff; font-size:1.1rem; font-weight:bold; margin-top:1.5rem;}' +  
                '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0;}' +  
                '.epg-bar{height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0.5rem 0;}' +  
                '.epg-progress{height:100%; background:#2962ff; border-radius:2px;}' +  
                '.epg-desc{font-size:1rem; color:#999; margin-top:0.5rem;}' +  
                '.epg-list{margin-top:1rem;}' +  
                '.epg-item{padding:0.8rem; margin:0.5rem 0; background:rgba(255,255,255,0.05); border-radius:0.3rem;}' +  
                '.epg-time{font-size:0.9rem; color:#666; margin-bottom:0.3rem;}' +  
                '</style>');  
        }  
  
        this.loadPlaylist();  
        return root;  
    };  
  
    // Метод loadPlaylist  
    this.loadPlaylist = function () {  
        var pl = config.playlists[config.current_pl_index];  
        if (!pl || !pl.url) {  
            Lampa.Noty.show('Налаштуйте посилання на плейлист в налаштуваннях');  
            return;  
        }  
        $.ajax({  
            url: pl.url,  
            success: function (str) { _this.parse(str); },  
            error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }  
        });  
    };  
  
    // Метод parse  
    this.parse = function (str) {  
        var lines = str.split('\n');  
        groups_data = { '⭐ Обране': config.favorites };  
        var current_group = 'ЗАГАЛЬНІ';  
          
        // Парсинг заголовку M3U для EPG налаштувань  
        if (lines[0] && lines[0].indexOf('#EXTM3U') === 0) {  
            var l = lines[0];  
            var m, mm;  
            if (!!(m = l.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
                listCfg = {};  
                for (var jj = 0; jj < m.length; jj++) {  
                    if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
                        listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
                    }  
                }  
            }  
            listCfg['epgUrl'] = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
            listCfg['epgCode'] = Lampa.Utils.hash(listCfg['epgUrl'].toLowerCase().replace(/https:\/\//g, 'http://')).toString(36);  
              
            // Визначення типу EPG провайдера  
            listCfg['isEpgIt999'] = ["0", "4v7a2u", "skza0s", "oj8j5z", "sab9bx", "rv7awh", "2blr83"].indexOf(listCfg['epgCode']) >= 0;  
            listCfg['isYosso'] = ["godxcd"].indexOf(listCfg['epgCode']) >= 0;  
              
            // Налаштування EPG API  
            var channelsUri = 'channels';  
            if (/^https?:\/\/.+/i.test(listCfg['epgUrl']) && listCfg['epgUrl'].length < 8000) {  
                channelsUri = listCfg['epgCode'] + '/' + channelsUri + '?url=' + encodeURIComponent(listCfg['epgUrl']);  
            }  
            listCfg['epgApiChUrl'] = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
        }  
              
        for (var i = 0; i < lines.length; i++) {  
            var l = lines[i].trim();  
                  
            if (l.indexOf('#EXTINF') === 0) {  
                var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();  
                var group = (l.match(/group-title="([^"]+)"/i) || ['', current_group])[1];  
                var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];  
                var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];  
                var url = lines[i + 1] ? lines[i + 1].trim() : '';  
                      
                if (url && url.indexOf('http') === 0) {  
                    var item = {   
                        name: name,   
                        url: url,   
                        group: group,   
                        logo: logo,  
                        tvg_id: tvg_id  
                    };  
                          
                    if (!groups_data[group]) {  
                        groups_data[group] = [];  
                    }  
                    groups_data[group].push(item);  
                }  
            }  
        }  
          
        // Встановлення EPG ID для всіх груп  
        for (var group in groups_data) {  
            setEpgId({channels: groups_data[group]});  
        }  
          
        this.renderG();  
    };  
  
    // Метод renderG  
    this.renderG = function () {  
        colG.empty();  
        var groups = Object.keys(groups_data);  
          
        for (var i = 0; i < groups.length; i++) {  
            var item = $('<div class="iptv-item">' + groups[i] + ' [' + groups_data[groups[i]].length + ']</div>');  
            item.on('hover:enter', function () {  
                var group = $(this).text().split(' [')[0];  
                _this.renderC(groups_data[group]);  
                active_col = 'channels';  
                index_c = 0;  
                _this.updateFocus();  
            });  
            colG.append(item);  
        }  
          
        this.updateFocus();  
    };  
  
    // Метод renderC  
    this.renderC = function (channels) {  
        current_list = channels;  
        colC.empty();  
          
        for (var i = 0; i < channels.length; i++) {  
            var channel = channels[i];  
            var item = $('<div class="iptv-item">' +  
                '<div class="channel-row">' +  
                '<img class="channel-logo" src="' + (channel.logo || '') + '" onerror="this.src=\'\'">' +  
                '<div class="channel-title">' + channel.name + '</div>' +  
                '</div>' +  
                '</div>');  
              
            item.data('channel', channel);  
            item.on('hover:enter', function () {  
                var ch = $(this).data('channel');  
                _this.showDetails(ch);  
            });  
              
            colC.append(item);  
        }  
    };  
  
    // Метод showDetails  
    this.showDetails = function (channel) {  
        colE.empty();  
          
        var details = $('<div>' +  
            '<img src="' + (channel.logo || '') + '" style="width:80px;height:80px;object-fit:contain;margin-bottom:1rem;" onerror="this.style.display=\'none\'">' +  
            '<h2 class="epg-title-big">' + channel.name + '</h2>' +  
            '</div>');  
          
        colE.append(details);  
        colE.append(epgTemplate.clone());  
          
        epgIdCurrent = channel.epgId;  
        $('.js-epgChannel').text(channel.name);  
  
        if (channel.epgId) {  
            epgUpdateData(channel.epgId);  
            epgRender(channel.epgId);  
        } else {  
            $('.js-epgNow').hide();  
            $('.js-epgAfter').hide();  
        }  
    };  
  
    // Метод updateFocus  
    this.updateFocus = function () {  
        $('.iptv-item').removeClass('active');  
        var col = active_col === 'groups' ? colG : colC;  
        var index = active_col === 'groups' ? index_g : index_c;  
        var item = col.find('.iptv-item').eq(index);  
        item.addClass('active');  
        if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });  
    };  
  
    // Метод start  
    this.start = function () {  
        isSNG = ['uk', 'ru', 'be'].indexOf(Lampa.Storage.field('language')) >= 0;  
          
        // Запуск інтервалу оновлення EPG  
        if (epgInterval) clearInterval(epgInterval);  
        epgInterval = setInterval(function() {  
            for (var epgId in EPG) {  
                epgRender(epgId);  
            }  
        }, 10000);  
  
        Lampa.Controller.add('iptv_pro', {  
            up: function () {  
                if (active_col === 'groups') index_g = Math.max(0, index_g - 1);  
                else index_c = Math.max(0, index_c - 1);  
                _this.updateFocus();  
                if (active_col === 'channels') _this.showDetails(current_list[index_c]);  
            },  
            down: function () {  
                if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);  
                else index_c = Math.min(current_list.length - 1, index_c + 1);  
                _this.updateFocus();  
                if (active_col === 'channels') _this.showDetails(current_list[index_c]);  
            },  
            right: function () {  
                if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);  
            },  
            left: function () {  
                if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }  
            },  
            enter: function () {  
                if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);  
                else if (current_list[index_c]) Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });  
            },  
            back: function () {  
                if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }  
                else Lampa.Activity.backward();  
            }  
        });  
        Lampa.Controller.toggle('iptv_pro');  
    };  
  
    this.render = function () { return root; };  
    this.destroy = function () {  
        if (epgInterval) clearInterval(epgInterval);  
        Lampa.Controller.remove('iptv_pro');  
        root.remove();  
    };  
}  
  
// Функції налаштувань та ініціалізація  
function showPlaylistSettings() {  
    var config = Lampa.Storage.get('iptv_pro_v12', {  
        playlists: [{ url: '' }],  
        epg_url: ''  
    });  
          
    Lampa.Input.edit({  
        value: config.playlists[0].url || '',  
        title: 'URL плейлиста',  
        placeholder: 'https://example.com/playlist.m3u'  
    }, function(new_value) {  
        config.playlists[0].url = new_value;  
        Lampa.Storage.set('iptv_pro_v12', config);  
        Lampa.Noty.show('Плейлист оновлено');  
    });  
}  
  
function showEpgSettings() {  
    var config = Lampa.Storage.get('iptv_pro_v12', {  
        playlists: [{ url: '' }],  
        epg_url: ''  
    });  
          
    Lampa.Input.edit({  
        value: config.epg_url || '',  
        title: 'URL EPG',  
        placeholder: 'https://example.com/epg.xml.gz'  
    }, function(new_value) {  
        config.epg_url = new_value;  
        Lampa.Storage.set('iptv_pro_v12', config);  
        Lampa.Noty.show('EPG оновлено');  
    });  
}  
  
function addPluginSettings() {  
    try {  
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;  
              
        Lampa.SettingsApi.addComponent({ component: "iptv_pro", name: "IPTV PRO" });  
              
        Lampa.SettingsApi.addParam({  
            component: "iptv_pro",  
            param: { name: "Плейлист URL", type: "button" },  
            field: { name: "Плейлист URL", description: "Ввести URL плейлиста" },  
            onChange: showPlaylistSettings  
        });  
              
        Lampa.SettingsApi.addParam({  
            component: "iptv_pro",       
            param: { name: "EPG URL", type: "button" },  
            field: { name: "EPG URL", description: "Ввести URL EPG" },  
            onChange: showEpgSettings  
        });  
    } catch (e) { console.log("settings error", e); }  
}  
 function init() {      
    Lampa.Component.add('iptv_pro', IPTVComponent);      
          
    var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');      
    item.on('hover:enter', function () {      
        Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });      
    });      
    $('.menu .menu__list').append(item);      
          
    addPluginSettings();      
}      
  
if (window.app_ready) init();      
else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });      
  
})();
