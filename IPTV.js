(function () {  
    'use strict';  
  
    function IPTVClassic() {  
        var root, groupsList, channelsList, epgList;  
        var groups_data = {};  
        var currentGroup = '';  
        var currentChannel = null;  
        var EPG = {};  
        var epgInterval;  
        var epgPath = '';  
        var listCfg = {};  
        var chIDs = {id2epg: {}, piconUrl: '', id2picon: []};  
        var _this = this;  
  
        // Поліфіл hash36  
        if (typeof Lampa.Utils.hash36 !== 'function') {  
            Lampa.Utils.hash36 = function (str) {  
                return (Lampa.Utils.hash(str) * 1).toString(36);  
            };  
        }  
  
        /* ===================== EPG HELPERS (скорочено) ===================== */  
        function unixtime() { return Math.floor(Date.now() / 1000); }  
        function toLocaleTimeString(time) {  
            var date = new Date(),  
                ofst = parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n',''));  
            time = time || date.getTime();  
            date = new Date(time + (ofst * 1000 * 60 * 60));  
            return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);  
        }  
        function getEpgSessKey(epgId) { return ['epg', epgId].join('\t'); }  
        function getEpgSessCache(epgId, t) {  
            var key = getEpgSessKey(epgId);  
            var epg = sessionStorage.getItem(key);  
            if (epg) {  
                epg = JSON.parse(epg);  
                if (t) {  
                    if (epg.length && (t < epg[0][0] || t > (epg[epg.length - 1][0] + epg[epg.length - 1][1]))) return false;  
                    while (epg.length && t >= (epg[0][0] + epg[0][1])) epg.shift();  
                }  
            }  
            return epg;  
        }  
        function setEpgSessCache(epgId, epg) {  
            var key = getEpgSessKey(epgId);  
            sessionStorage.setItem(key, JSON.stringify(epg));  
        }  
        function networkSilentSessCache(url, success, fail, param) {  
            var urlForKey = url.replace(/([&?])sig=[^&]+&?/, '$1');  
            var key = ['cache', urlForKey, param ? Lampa.Utils.hash36(JSON.stringify(param)) : ''].join('\t');  
            var cached = sessionStorage.getItem(key);  
            if (cached) {  
                try {  
                    var data = JSON.parse(cached);  
                    if (data && data.data) { success(data.data); return; }  
                } catch (e) {}  
            }  
            Lampa.Network.silent(url, function (data) {  
                sessionStorage.setItem(key, JSON.stringify({data: data}));  
                success(data);  
            }, fail);  
        }  
        function epgUpdateData(epgId) {  
            var t = Math.floor(Date.now() / 3600000);  
            var epg = getEpgSessCache(epgId, t);  
            if (epg) { EPG[epgId] = epg; epgRender(epgId); return; }  
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t;  
            Lampa.Network.silent(url, function (json) {  
                if (json && Array.isArray(json)) {  
                    EPG[epgId] = json;  
                    setEpgSessCache(epgId, json);  
                    epgRender(epgId);  
                }  
            });  
        }  
        function epgRender(epgId) {  
            var now = unixtime();  
            var e = EPG[epgId];  
            if (!e || !e.length) return;  
            var prog = e.filter(function (p) { return p[0] <= now && now < (p[0] + p[1]); })[0];  
            if (!prog) return;  
            var percent = Math.round((now - prog[0]) * 100 / (prog[1] || 60));  
            $('.epg-program-name').text(prog[2] || '');  
            $('.epg-progress-bar').css('width', percent + '%');  
        }  
        function setEpgId(channelGroup) {  
            if (!channelGroup.channels || !listCfg.epgApiChUrl) {  
                channelGroup.channels.forEach(function (ch) {  
                    ch.epgId = ch.tid;  
                });  
                return;  
            }  
            networkSilentSessCache(listCfg.epgApiChUrl, function (d) {  
                chIDs = d;  
                if (!chIDs.id2epg) chIDs.id2epg = {};  
                epgPath = chIDs.epgPath ? '/' + chIDs.epgPath : '';  
                channelGroup.channels.forEach(function (ch) {  
                    if (ch.tid && chIDs.id2epg[ch.tid]) { ch.epgId = chIDs.id2epg[ch.tid]; }  
                    else { ch.epgId = ch.tid; }  
                });  
            });  
        }  
  
        /* ===================== CREATE ===================== */  
        this.create = function () {  
            _this = this;  
            root = $('<div class="iptv-classic"></div>');  
            // Стилі  
            if (!$('#iptv-classic-style').length) {  
                $('head').append('<style id="iptv-classic-style">' +  
                    '.iptv-classic{position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:1000;display:flex;color:#fff}' +  
                    '.iptv-classic__col{padding:1em;overflow-y:auto}' +  
                    '.iptv-classic__groups{width:25%;background:#0d1013;border-right:1px solid rgba(255,255,255,.05)}' +  
                    '.iptv-classic__channels{flex:1;background:#0b0d10}' +  
                    '.iptv-classic__epg{width:30%;background:#0d1013;border-left:1px solid rgba(255,255,255,.05)}' +  
                    '.iptv-classic__item{padding:0.8em;margin:0.3em;border-radius:6px;background:rgba(255,255,255,.03);cursor:pointer;border:2px solid transparent}' +  
                    '.iptv-classic__item.focus{border-color:#30ffaa;background:rgba(48,255,170,0.1)}' +  
                    '.iptv-classic__item--active{border-color:#30ffaa}' +  
                    '.epg-program-name{font-size:1em;margin-bottom:0.5em}' +  
                    '.epg-progress-bar{height:4px;background:#30ffaa;border-radius:2px;transition:width 0.3s}' +  
                    '</style>');  
            }  
            $('body').append(root); // ВАЖЛИВО: додати в body  
            groupsList = $('<div class="iptv-classic__col iptv-classic__groups"></div>');  
            channelsList = $('<div class="iptv-classic__col iptv-classic__channels"></div>');  
            epgList = $('<div class="iptv-classic__col iptv-classic__epg"><div class="epg-program-name"></div><div class="epg-progress-bar"></div></div>');  
            root.append(groupsList, channelsList, epgList);  
            this.loadPlaylist();  
            return root;  
        };  
  
        /* ===================== PLAYLIST ===================== */  
        this.loadPlaylist = function () {  
            var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';  
            Lampa.Network.silent(pl_url, function (data) {  
                _this.parse(data);  
            }, function () {  
                groupsList.html('<div>Помилка завантаження</div>');  
            }, false, { dataType: 'text' });  
        };  
  
        /* ===================== PARSE ===================== */  
        this.parse = function (data) {  
            groups_data = { 'УСІ': [] };  
            var lines = data.split('\n');  
            var ch = null;  
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
                listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
                listCfg.epgCode = Lampa.Utils.hash36(listCfg.epgUrl.toLowerCase().replace(/https:\/\//g, 'http://'));  
                if (/^https?:\/\/.+/i.test(listCfg.epgUrl) && listCfg.epgUrl.length < 8000) {  
                    var channelsUri = listCfg.epgCode + '/channels?url=' + encodeURIComponent(listCfg.epgUrl);  
                    listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
                }  
            }  
            lines.forEach(function (line) {  
                line = line.trim();  
                if (line.indexOf('#EXTINF') === 0) {  
                    ch = {  
                        name: line.split(',').pop().trim(),  
                        grp: (line.match(/group-title="([^"]+)"/i) || [null, 'ІНШЕ'])[1],  
                        logo: (line.match(/tvg-logo="([^"]+)"/i) || [null, ''])[1],  
                        tid: (line.match(/tvg-id="([^"]+)"/i) || [null, ''])[1]  
                    };  
                } else if (line.indexOf('http') === 0 && ch) {  
                    ch.url = line;  
                    if (!groups_data[ch.grp]) groups_data[ch.grp] = [];  
                    groups_data[ch.grp].push(ch);  
                    groups_data['УСІ'].push(ch);  
                    ch = null;  
                }  
            });  
            Object.keys(groups_data).forEach(function (g) {  
                setEpgId({ channels: groups_data[g] });  
            });  
            this.renderGroups();  
        };  
  
        /* ===================== GROUPS ===================== */  
        this.renderGroups = function () {  
            groupsList.empty();  
            Object.keys(groups_data).forEach(function (name) {  
                var el = $('<div class="iptv-classic__item selector">' + name + ' (' + groups_data[name].length + ')</div>');  
                el.on('hover:enter', function () {  
                    $('.iptv-classic__item').removeClass('iptv-classic__item--active');  
                    $(this).addClass('iptv-classic__item--active');  
                    _this.renderChannels(name);  
                });  
                groupsList.append(el);  
            });  
            groupsList.find('.selector').first().addClass('focus');  
        };  
  
        /* ===================== CHANNELS ===================== */  
        this.renderChannels = function (group) {  
            channelsList.empty();  
            (groups_data[group] || []).forEach(function (item) {  
                var el = $('<div class="iptv-classic__item selector">' + item.name + '</div>');  
                el.on('hover:enter', function () {  
                    currentChannel = item;  
                    _this.renderEpgPanel();  
                    Lampa.Player.play({ url: item.url, title: item.name });  
                });  
                channelsList.append(el);  
                if (item.epgId) epgUpdateData(item.epgId);  
            });  
            channelsList.find('.selector').first().addClass('focus');  
        };  
  
        /* ===================== EPG PANEL ===================== */  
        this.renderEpgPanel = function () {  
            if (!currentChannel) return;  
            epgList.find('.epg-program-name').text('Завантаження...');  
            epgList.find('.epg-progress-bar').css('width', '0%');  
            if (currentChannel.epgId) {  
                epgUpdateData(currentChannel.epgId);  
            } else {  
                epgList.find('.epg-program-name').text('EPG відсутній');  
            }  
        };  
  
        /* ===================== CORE ===================== */  
        this.start = function () {  
            Lampa.Controller.add('iptv_classic', {  
                back: function () { Lampa.Activity.back(); }  
            });  
            Lampa.Controller.toggle('content');  
            setTimeout(function () {  
                var first = $('.iptv-classic .selector').first();  
                if (first.length) {  
                    $('.iptv-classic .selector').removeClass('focus');  
                    first.addClass('focus');  
                }  
            }, 100);  
        };  
        this.pause = this.stop = function () {  
            if (epgInterval) { clearInterval(epgInterval); epgInterval = null; }  
        };  
        this.render = function () { return root; };  
        this.destroy = function () {  
            if (epgInterval) { clearInterval(epgInterval); epgInterval = null; }  
            root.remove();  
        };  
    }  
  
    /* ===================== INIT ===================== */  
    function init() {  
        Lampa.Component.add('iptv_classic', IPTVClassic);  
        var menuItem = $('<li class="menu__item selector"><div class="menu__ico">📺</div><div class="menu__text">IPTV Classic</div></li>');  
        menuItem.on('hover:enter', function () {  
            Lampa.Activity.push({ title: 'IPTV Classic', component: 'iptv_classic' });  
        });  
        $('.menu .menu__list').append(menuItem);  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });  
  
})();
