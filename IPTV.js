(function () {  
    'use strict';  
  
    var plugin = {  
        component: 'my_iptv_classic',  
        icon: "<svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" style=\"fill-rule:evenodd;\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"/><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"/></svg>",  
        name: 'IPTV Classic'  
    };  
  
    var isSNG = false;  
    var lists = [];  
    var curListId = -1;  
    var defaultGroup = 'Other';  
    var catalog = {};  
    var listCfg = {};  
    var EPG = {};  
    var layerInterval;  
    var epgInterval;  
    var UID = '';  
  
    var chNumber = '';  
    var chTimeout = null;  
    var stopRemoveChElement = false;  
    var chPanel = $((  
        "<div class=\"player-info info--visible js-ch-PLUGIN\" style=\"top: 9em;right: auto;z-index: 1000;\">" +  
        "	<div class=\"player-info__body\">" +  
        "		<div class=\"player-info__line\">" +  
        "			<div class=\"player-info__name\">&nbsp;</div>" +  
        "			<div class=\"player-info__time\">&nbsp;</div>" +  
        "		</div>" +  
        "		<div class=\"player-info__line\">" +  
        "			<div class=\"player-info__name\">&nbsp;</div>" +  
        "			<div class=\"player-info__time\">&nbsp;</div>" +  
        "		</div>" +  
        "	</div>" +  
        "</div>"  
    ));  
  
    var utils = {  
        hash36: function (str) {  
            return (Lampa.Utils.hash(str) * 1).toString(36);  
        },  
        seconds: function (time) {  
            var t = time.split(':');  
            return parseInt(t[0]) * 3600 + parseInt(t[1]) * 60 + parseInt(t[2]);  
        },  
        toHHMMSS: function (sec) {  
            var hours = Math.floor(sec / 3600);  
            var minutes = Math.floor((sec - (hours * 3600)) / 60);  
            var seconds = Math.floor(sec - (hours * 3600) - (minutes * 60));  
            hours = hours < 10 ? "0" + hours : hours;  
            minutes = minutes < 10 ? "0" + minutes : minutes;  
            seconds = seconds < 10 ? "0" + seconds : seconds;  
            return hours + ':' + minutes + ':' + seconds;  
        }  
    };  
  
    var langGet = function (key) {  
        return Lampa.Lang.translate(key) || key;  
    };  
  
    var getStorage = function (key, def) {  
        try {  
            var val = localStorage.getItem(plugin.component + '_' + key);  
            return val !== null ? val : def;  
        } catch (e) {  
            return def;  
        }  
    };  
  
    var setStorage = function (key, val) {  
        try {  
            localStorage.setItem(plugin.component + '_' + key, val);  
        } catch (e) {}  
    };  
  
    var favID = function (str) {  
        return str.toLowerCase().replace(/\s+/g, '_');  
    };  
  
    var networkSilentSessCache = function (url, success, fail, param) {  
        var context = this;  
        var urlForKey = url.replace(/([&?])sig=[^&]+&?/, '$1');  
        var cacheKey = 'network_' + utils.hash36(urlForKey);  
        var cached = sessionStorage.getItem(cacheKey);  
        if (cached) {  
            try {  
                var data = JSON.parse(cached);  
                if (data && data.data) {  
                    success.call(context, data.data, param);  
                    return;  
                }  
            } catch (e) {}  
        }  
        var network = new Lampa.Reguest();  
        network.timeout = 5000;  
        network.silent(url, function (data) {  
            try {  
                sessionStorage.setItem(cacheKey, JSON.stringify({ data: data }));  
            } catch (e) {}  
            success.call(context, data, param);  
        }, function (a, c) {  
            fail && fail.call(context, a, c, param);  
        }, false, { dataType: 'text' });  
    };  
  
    var parseList = function (str, id) {  
        var data = [];  
        var lines = str.split('\n');  
        var channel = null;  
        var i = 0;  
        var m, mm;  
        if (!!(m = lines[0].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
            listCfg = {};  
            for (var jj = 0; jj < m.length; jj++) {  
                if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
                    listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
                }  
            }  
            listCfg['epgUrl'] = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
            listCfg['epgCode'] = utils.hash36(listCfg['epgUrl'].toLowerCase().replace(/https:\/\//g, 'http://'));  
            if (/^https?:\/\/.+/i.test(listCfg['epgUrl']) && listCfg['epgUrl'].length < 8000) {  
                var channelsUri = listCfg['epgCode'] + '/channels?url=' + encodeURIComponent(listCfg['epgUrl']);  
                listCfg['epgApiChUrl'] = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
            }  
        }  
        for (i = 1; i < lines.length; i++) {  
            var line = lines[i].trim();  
            if (line.indexOf('#EXTINF') === 0) {  
                channel = {  
                    name: line.split(',').pop().trim(),  
                    group: (line.match(/group-title="([^"]+)"/i) || [null, defaultGroup])[1],  
                    logo: (line.match(/tvg-logo="([^"]+)"/i) || [null, ''])[1],  
                    epgId: (line.match(/tvg-id="([^"]+)"/i) || [null, ''])[1],  
                    url: '',  
                    catchup: (line.match(/tvg-rec="([^"]+)"/i) || [null, ''])[1],  
                    catchupDays: (line.match(/tvg-rec-days="([^"]+)"/i) || [null, ''])[1],  
                    catchupType: (line.match(/tvg-rec-type="([^"]+)"/i) || [null, ''])[1],  
                    catchupSource: (line.match(/tvg-rec-source="([^"]+)"/i) || [null, ''])[1]  
                };  
            } else if (line && !/^#/.test(line) && channel) {  
                channel.url = line.trim();  
                data.push(channel);  
                channel = null;  
            }  
        }  
        return data;  
    };  
  
    var setEpgId = function (channelGroup) {  
        if (channelGroup.setEpgId || !channelGroup.channels || !listCfg['epgApiChUrl']) return;  
        var chIDs = { id2epg: {}, piconUrl: '', id2picon: [] }, i = 0, channel;  
        networkSilentSessCache(listCfg['epgApiChUrl'], function (d) {  
            chIDs = d;  
            if (!chIDs['id2epg']) chIDs['id2epg'] = {};  
            epgPath = !chIDs['epgPath'] ? '' : ('/' + chIDs['epgPath']);  
        });  
        var chShortName = function (chName) {  
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
        var trW = { "ё": "e", "у": "y", "к": "k", "е": "e", "н": "h", "ш": "w", "з": "3", "х": "x", "ы": "bl", "в": "b", "а": "a", "р": "p", "о": "o", "ч": "4", "с": "c", "м": "m", "т": "t", "ь": "b", "б": "6" };  
        var trName = function (word) {  
            return word.split('').map(function (char) {  
                return trW[char] || char;  
            }).join("");  
        };  
        var epgIdByName = function (v, find, epgId) {  
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
                for (var keyW in trW) {  
                    if (trW[keyW] === fw && !!chIDs[keyW]) {  
                        for (key in chIDs[keyW]) {  
                            if (chIDs[keyW][key] == epgId) {  
                                return epgId;  
                            } else if (n === trName(key)) {  
                                return chIDs[keyW][key];  
                            }  
                        }  
                    }  
                }  
            }  
            return 0;  
        };  
        var isEpgIt999 = /epg\.it999\.(ru|com|su|pro|ws|online)/i.test(listCfg['epgUrl']);  
        var isYosso = /yoss\.tv/i.test(listCfg['epgUrl']);  
        var isSNG = ['uk', 'ru', 'be'].indexOf(Lampa.Storage.field('language')) >= 0;  
        for (i = 0; i < channelGroup.channels.length; i++) {  
            channel = channelGroup.channels[i];  
            if (!channel['epgId']) {  
                if (isEpgIt999 || isYosso) {  
                    if (/^\d{1,4}$/.test(channel['name'])) {  
                        channel['epgId'] = channel['name'];  
                    } else {  
                        channel['epgId'] = epgIdByName(channel['name'], false, channel['epgId']);  
                    }  
                } else {  
                    if (!!chIDs['id2epg'][channel['epgId']]) {  
                        channel['epgId'] = chIDs['id2epg'][channel['epgId']];  
                    } else {  
                        channel['epgId'] = epgIdByName(channel['name'], false, channel['epgId']);  
                        if (!channel['epgId']) channel['epgId'] = epgIdByName(channel['name'], true, channel['epgId']);  
                        if (!channel['epgId']) channel['epgId'] = channel['epgId'];  
                    }  
                }  
            }  
           if (!channel['logo'] && !!channel['epgId'] && !!chIDs['piconUrl']) {  
                channel['logo'] = chIDs['piconUrl'].replace('${id}', channel['epgId']);  
            }  
            if (!channel['logo'] && !!channel['epgId'] && (isEpgIt999 || isYosso) && /^\d{1,4}$/.test(channel['epgId'])) {  
                channel['logo'] = Lampa.Utils.protocol() + 'epg.one/img2/' + channel['epgId'] + '.png';  
            }  
            if (!channel['logo'] && !!channel['epgId'] && isSNG && !/^\d+$/.test(channel['name'])) {  
                channel['logo'] = Lampa.Utils.protocol() + 'epg.rootu.top/picon/' + encodeURIComponent(channel['Title']) + '.png';  
            }  
        }  
        channelGroup.setEpgId = true;  
    };  
  
    /* ===================== CREATE ===================== */  
    this.create = function() {  
        _this = this;  
        root = $('<div class="iptv-classic"></div>');  
          
        // Додаємо стилі для трьохколонкового інтерфейсу  
        if (!$('#iptv-classic-style').length) {  
            $('head').append(  
                '<style id="iptv-classic-style">' +  
                '.iptv-classic{position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:1000;display:flex;padding-top:3.5rem;color:#fff;font-family:sans-serif}' +  
                '.col-groups{width:25%;background:#0d1013;border-right:1px solid rgba(255,255,255,.05);overflow-y:auto}' +  
                '.col-channels{width:40%;background:#0f1419;border-right:1px solid rgba(255,255,255,.05);overflow-y:auto}' +  
                '.col-epg{flex:1;background:#0d1013;overflow-y:auto}' +  
                '.group-item,.channel-item,.epg-item{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;transition:background .2s}' +  
                '.group-item:hover,.channel-item:hover,.epg-item:hover{background:rgba(255,255,255,.1)}' +  
                '.group-item.active,.channel-item.active{background:#1a2332}' +  
                '.channel-item{display:flex;align-items:center}' +  
                '.channel-logo{width:40px;height:40px;margin-right:12px;border-radius:4px}' +  
                '.channel-info{flex:1}' +  
                '.channel-name{font-size:14px;font-weight:500;margin-bottom:4px}' +  
                '.epg-text{font-size:12px;color:#30ffaa}' +  
                '.epg-bar{width:100%;height:3px;background:rgba(255,255,255,.1);margin-top:4px;border-radius:2px;overflow:hidden}' +  
                '.epg-bar-fill{height:100%;background:#30ffaa;transition:width .3s}' +  
                '.epg-time{font-size:11px;color:#888;margin-top:4px}' +  
                '.epg-title{font-size:13px;margin-bottom:4px}' +  
                '.epg-desc{font-size:11px;color:#aaa;line-height:1.3}' +  
                '</style>'  
            );  
        }  
  
        groupsList = $('<div class="col-groups"></div>');  
        channelsList = $('<div class="col-channels"></div>');  
        epgList = $('<div class="col-epg"></div>');  
          
        root.append(groupsList, channelsList, epgList);  
        $('body').append(root);  
          
        this.loadPlaylist();  
        return root;  
    };  
  
    /* ===================== LOAD PLAYLIST ===================== */  
    this.loadPlaylist = function() {  
        var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';  
        var network = new Lampa.Reguest();  
  
        network.silent(pl_url, function(data) {  
            if (!data) return;  
              
            if (Lampa.Tvg) {  
                Lampa.Tvg.push(EPG_URL);  
            }  
  
            _this.parse(data);  
        }, function() {  
            groupsList.html('<div style="padding:20px;">Помилка завантаження плейлиста</div>');  
        }, false, { dataType: 'text' });  
    };  
  
    /* ===================== PARSE ===================== */  
    this.parse = function(data) {  
        groups_data = { 'УСІ': [] };  
        var lines = data.split('\n');  
        var ch = null;  
  
        // Парсинг заголовка M3U  
        var firstLine = lines[0];  
        if (firstLine && firstLine.substr(0, 7).toUpperCase() === '#EXTM3U') {  
            var m, mm;  
            if (!!(m = firstLine.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
                listCfg = {};  
                for (var jj = 0; jj < m.length; jj++) {  
                    if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
                        listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
                    }  
                }  
            }  
            listCfg['epgUrl'] = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
            listCfg['epgCode'] = Lampa.Utils.hash36(listCfg['epgUrl'].toLowerCase().replace(/https:\/\//g, 'http://'));  
            if (/^https?:\/\/.+/i.test(listCfg['epgUrl']) && listCfg['epgUrl'].length < 8000) {  
                var channelsUri = listCfg['epgCode'] + '/channels?url=' + encodeURIComponent(listCfg['epgUrl']);  
                listCfg['epgApiChUrl'] = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
            }  
        }  
  
        lines.forEach(function(line) {  
            line = line.trim();  
  
            if (line.indexOf('#EXTINF') === 0) {  
                ch = {  
                    name: line.split(',').pop().trim(),  
                    grp: (line.match(/group-title="([^"]+)"/i) || [null, 'ІНШЕ'])[1],  
                    logo: (line.match(/tvg-logo="([^"]+)"/i) || [null, ''])[1],  
                    tid: (line.match(/tvg-id="([^"]+)"/i) || [null, ''])[1]  
                };  
            }  
            else if (line.indexOf('http') === 0 && ch) {  
                ch.url = line;  
  
                if (!groups_data[ch.grp]) groups_data[ch.grp] = [];  
                groups_data[ch.grp].push(ch);  
                groups_data['УСІ'].push(ch);  
                ch = null;  
            }  
        });  
  
        // Прив'язка EPG до всіх каналів  
        Object.keys(groups_data).forEach(function(g) {  
            setEpgId({ channels: groups_data[g] });  
        });  
  
        this.renderGroups();  
    };  
  
    /* ===================== RENDER GROUPS ===================== */  
    this.renderGroups = function() {  
        groupsList.empty();  
  
        Object.keys(groups_data).forEach(function(name) {  
            var el = $('<div class="group-item selector">' + name + ' (' + groups_data[name].length + ')</div>');  
            el.on('hover:enter', function() {  
                $('.group-item').removeClass('active');  
                $(this).addClass('active');  
                currentGroup = name;  
                _this.renderChannels();  
            });  
            groupsList.append(el);  
        });  
  
        // Встановлюємо фокус на першу групу  
        $('.group-item').first().addClass('active');  
        currentGroup = Object.keys(groups_data)[0];  
        this.renderChannels();  
    };  
  
    /* ===================== RENDER CHANNELS ===================== */  
    this.renderChannels = function() {  
        channelsList.empty();  
        var channels = groups_data[currentGroup] || [];  
  
        channels.forEach(function(channel) {  
            var el = $('<div class="channel-item selector" data-epg-id="' + (channel.epgId || '') + '">' +  
                '<img class="channel-logo" src="' + (channel.logo || 'https://placehold.co/40x40?text=TV') + '" onerror="this.src=\'https://placehold.co/40x40?text=TV\'">' +  
                '<div class="channel-info">' +  
                    '<div class="channel-name">' + channel.name + '</div>' +  
                    '<div class="epg-text">Завантаження...</div>' +  
                    '<div class="epg-bar"><div class="epg-bar-fill"></div></div>' +  
                '</div>' +  
            '</div>');  
  
            el.on('hover:enter', function() {  
                $('.channel-item').removeClass('active');  
                $(this).addClass('active');  
                currentChannel = channel;  
                _this.renderEpg();  
                Lampa.Player.play({ url: channel.url, title: channel.name });  
            });  
  
            channelsList.append(el);  
  
            if (channel.epgId) {  
                epgRender(channel.epgId);  
            }  
        });  
  
        // Встановлюємо фокус на перший канал  
        $('.channel-item').first().addClass('focus');  
        Lampa.Controller.toggle('content');  
    };  
  
    /* ===================== RENDER EPG ===================== */  
    this.renderEpg = function() {  
        if (!currentChannel || !currentChannel.epgId) {  
            epgList.html('<div style="padding:20px;">EPG відсутній</div>');  
            return;  
        }  
  
        epgUpdateData(currentChannel.epgId);  
    };  
  
    /* ===================== CORE ===================== */  
    this.start = function() {  
        Lampa.Controller.add('my_iptv_classic', {  
            back: function() {  
                Lampa.Activity.back();  
            }  
        });  
        Lampa.Controller.toggle('content');  
          
        setTimeout(function() {  
            $('.iptv-classic .selector').first().addClass('focus');  
        }, 100);  
    };  
  
    this.pause = this.stop = function() {  
        if (epgInterval) {  
            clearInterval(epgInterval);  
            epgInterval = null;  
        }  
    };  
  
    this.render = function() { return root; };  
  
    this.destroy = function() {  
        if (epgInterval) {  
            clearInterval(epgInterval);  
            epgInterval = null;  
        }  
        root.remove();  
    };  
}  
  
/* ===================== INIT ===================== */  
function pluginStart() {  
    if (!!window['plugin_' + plugin.component + '_ready']) {  
        console.log(plugin.name, 'plugin already start');  
        return;  
    }  
    window['plugin_' + plugin.component + '_ready'] = true;  
      
    var menu = $('.menu .menu__list').eq(0);  
    var menuItem = $('<li class="menu__item selector">' +  
        '<div class="menu__ico">' + plugin.icon + '</div>' +  
        '<div class="menu__text">' + plugin.name + '</div>' +  
    '</li>');  
      
    menuItem.on('hover:enter', function() {  
        Lampa.Activity.push({  
            title: plugin.name,  
            component: plugin.component  
        });  
    });  
      
    menu.append(menuItem);  
    console.log(plugin.name, 'plugin start');  
}  
  
console.log(plugin.name, 'plugin ready start', !!window.appready ? 'now' : 'waiting event ready');  
if (!!window.appready) pluginStart();  
else Lampa.Listener.follow('app', function(e) {  
    if (e.type === 'ready') pluginStart();  
});  
  
})();
  
