/* jshint esversion: 5 */  
/* global $, Lampa */  
  
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
  
        // Поліфіл для hash36  
        if (typeof Lampa.Utils.hash36 !== 'function') {  
            Lampa.Utils.hash36 = function (str) {  
                return (Lampa.Utils.hash(str) * 1).toString(36);  
            };  
        }  
  
        /* ===================== EPG HELPERS ===================== */  
        function unixtime() {  
            return Math.floor(Date.now() / 1000);  
        }  
  
        function toLocaleTimeString(time) {  
            var date = new Date(),  
                ofst = parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n',''));  
            time = time || date.getTime();  
            date = new Date(time + (ofst * 1000 * 60 * 60));  
            return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);  
        }  
  
        function getEpgSessKey(epgId) {  
            return ['epg', epgId].join('\t');  
        }  
  
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
            var context = this;  
            var urlForKey = url.replace(/([&?])sig=[^&]+&?/, '$1');  
            var key = ['cache', urlForKey, param ? Lampa.Utils.hash36(JSON.stringify(param)) : ''].join('\t');  
            var data = sessionStorage.getItem(key);  
            if (data) {  
                data = JSON.parse(data);  
                if (data[0]) typeof success === 'function' && success.apply(context, [data[1]]);  
                else typeof fail === 'function' && fail.apply(context, [data[1]]);  
            } else {  
                var network = new Lampa.Reguest();  
                network.timeout(5000);  
                network.silent(url, function (str) {  
                    data = [true, str];  
                    sessionStorage.setItem(key, JSON.stringify(data));  
                    typeof success === 'function' && success.apply(context, [str]);  
                }, function (a, c) {  
                    data = [false, a];  
                    sessionStorage.setItem(key, JSON.stringify(data));  
                    typeof fail === 'function' && fail.apply(context, [a]);  
                }, false, param);  
            }  
        }  
  
        function epgUpdateData(epgId) {  
            if (!epgId) return;  
            var t = Math.floor(unixtime() / 3600);  
            var epg = getEpgSessCache(epgId, t);  
            if (epg) {  
                EPG[epgId] = epg;  
                epgRender(epgId);  
                return;  
            }  
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t;  
            networkSilentSessCache(url, function (data) {  
                try {  
                    data = JSON.parse(data);  
                    if (Array.isArray(data) && data.length) {  
                        EPG[epgId] = data;  
                        setEpgSessCache(epgId, data);  
                        epgRender(epgId);  
                    }  
                } catch (e) {}  
            });  
        }  
  
        function epgRender(epgId) {  
            if (!EPG[epgId] || !EPG[epgId].length) return;  
            var now = unixtime();  
            var current = null;  
            var next = null;  
            for (var i = 0; i < EPG[epgId].length; i++) {  
                var e = EPG[epgId][i];  
                if (now >= e[0] * 60 && now < (e[0] + e[1]) * 60) {  
                    current = e;  
                    if (i + 1 < EPG[epgId].length) next = EPG[epgId][i + 1];  
                    break;  
                }  
            }  
            renderEpgPanel(current, next);  
        }  
  
        function renderEpgPanel(current, next) {  
            epgList.empty();  
            if (!current) {  
                epgList.html('<div class="epg-empty">Немає програми</div>');  
                return;  
            }  
            var html = '<div class="epg-item current">' +  
                '<div class="epg-time">' + toLocaleTimeString(current[0] * 60 * 1000) + '</div>' +  
                '<div class="epg-title">' + current[2] + '</div>' +  
                '<div class="epg-desc">' + (current[3] || '') + '</div>' +  
                '</div>';  
            if (next) {  
                html += '<div class="epg-item next">' +  
                    '<div class="epg-time">' + toLocaleTimeString(next[0] * 60 * 1000) + '</div>' +  
                    '<div class="epg-title">' + next[2] + '</div>' +  
                    '<div class="epg-desc">' + (next[3] || '') + '</div>' +  
                    '</div>';  
            }  
            epgList.html(html);  
        }  
  
        function setEpgId(channelGroup) {  
            if (!channelGroup.channels || !listCfg.epgApiChUrl) {  
                channelGroup.channels.forEach(function (channel) {  
                    channel.epgId = channel.tid;  
                });  
                return;  
            }  
            networkSilentSessCache(listCfg.epgApiChUrl, function(d){  
                chIDs = d;  
                if (!chIDs.id2epg) chIDs.id2epg = {};  
                epgPath = !chIDs.epgPath ? '' : ('/' + chIDs.epgPath);  
                channelGroup.channels.forEach(function (channel) {  
                    channel.epgId = chIDs.id2epg[channel.tid] || channel.tid;  
                });  
            });  
        }  
  
        /* ===================== CREATE ===================== */  
        this.create = function () {  
            root = $('<div class="iptv-classic"></div>');  
              
            // Стилі  
            if (!$('#iptv-classic-style').length) {  
                $('head').append(  
                    '<style id="iptv-classic-style">' +  
                    '.iptv-classic{display:flex;height:100vh;background:#0b0d10;color:#fff}' +  
                    '.iptv-groups{width:25%;background:#0d1013;border-right:1px solid rgba(255,255,255,.05);overflow-y:auto}' +  
                    '.iptv-channels{width:45%;background:#0b0d10;overflow-y:auto}' +  
                    '.iptv-epg{width:30%;background:#0d1013;border-left:1px solid rgba(255,255,255,.05);overflow-y:auto;padding:1em}' +  
                    '.iptv-item{padding:1em;margin:0.5em;border-radius:8px;background:rgba(255,255,255,.03);cursor:pointer;border:2px solid transparent}' +  
                    '.iptv-item.active{background:#2962ff;border-color:#fff}' +  
                    '.iptv-item.focus{background:#fff;color:#000}' +  
                    '.channel-item{display:flex;align-items:center;gap:1em}' +  
                    '.channel-logo{width:50px;height:50px;object-fit:contain;background:#000;border-radius:6px}' +  
                    '.channel-info{flex:1}' +  
                    '.channel-name{font-weight:bold;font-size:1.1rem}' +  
                    '.epg-text{font-size:0.9rem;color:#30ffaa;margin-top:0.5em}' +  
                    '.epg-item{padding:1em;margin-bottom:0.5em;border-radius:8px;background:rgba(255,255,255,.03)}' +  
                    '.epg-item.current{background:rgba(48,255,170,0.1)}' +  
                    '.epg-time{font-size:0.8rem;color:#888}' +  
                    '.epg-title{font-weight:bold;margin-top:0.3em}' +  
                    '.epg-desc{font-size:0.9rem;color:#ccc;margin-top:0.3em}' +  
                    '.epg-empty{text-align:center;padding:2em;color:#666}' +  
                    '</style>'  
                );  
            }  
  
            groupsList = $('<div class="iptv-groups"></div>');  
            channelsList = $('<div class="iptv-channels"></div>');  
            epgList = $('<div class="iptv-epg"></div>');  
              
            root.append(groupsList, channelsList, epgList);  
            $('body').append(root);  
              
            this.loadPlaylist();  
            return root;  
        };  
  
        /* ===================== PLAYLIST ===================== */  
        this.loadPlaylist = function () {  
            var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';  
            var network = new Lampa.Reguest();  
              
            network.silent(pl_url, function (data) {  
                if (!data) return;  
                _this.parse(data);  
            }, function () {  
                groupsList.html('<div style="padding:20px;">Помилка завантаження</div>');  
            }, false, { dataType: 'text' });  
        };  
  
        /* ===================== PARSE ===================== */  
        this.parse = function (data) {  
            groups_data = { 'УСІ': [] };  
            var lines = data.split('\n');  
            var ch = null;  
  
            // Парсинг заголовка  
            var firstLine = lines[0];  
            if (firstLine && firstLine.substr(0, 7).toUpperCase() === '#EXTM3U') {  
                var m = firstLine.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g);  
                if (m) {  
                    listCfg = {};  
                    m.forEach(function (attr) {  
                        var mm = attr.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/);  
                        if (mm) listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
                    });  
                    listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
                    listCfg.epgCode = Lampa.Utils.hash36(listCfg.epgUrl.toLowerCase().replace(/https:\/\//g, 'http://'));  
                    if (/^https?:\/\/.+/i.test(listCfg.epgUrl) && listCfg.epgUrl.length < 8000) {  
                        var channelsUri = listCfg.epgCode + '/channels?url=' + encodeURIComponent(listCfg.epgUrl);  
                        listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
                    }  
                }  
            }  
  
            // Парсинг каналів  
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
  
            // Прив'язка EPG  
            Object.keys(groups_data).forEach(function (g) {  
                setEpgId({ channels: groups_data[g] });  
            });  
  
            this.renderGroups();  
        };  
  
        /* ===================== GROUPS ===================== */  
        this.renderGroups = function () {  
            groupsList.empty();  
            Object.keys(groups_data).forEach(function (name) {  
                var item = $('<div class="iptv-item selector">' + name + ' (' + groups_data[name].length + ')</div>');  
                item.on('hover:enter', function () {  
                    $('.iptv-item').removeClass('active');  
                    $(this).addClass('active');  
                    currentGroup = name;  
                    _this.renderChannels(name);  
                });  
                groupsList.append(item);  
            });  
            groupsList.find('.selector').first().trigger('hover:enter');  
        };  
  
        /* ===================== CHANNELS ===================== */  
        this.renderChannels = function (group) {  
            channelsList.empty();  
            (groups_data[group] || []).forEach(function (channel) {  
                var item = $('<div class="iptv-item channel-item selector" data-epg-id="' + (channel.epgId || '') + '">' +  
                    '<img class="channel-logo" src="' + (channel.logo || 'https://placehold.co/100x100?text=TV') + '" onerror="this.src=\'https://placehold.co/100x100?text=TV\'">' +  
                    '<div class="channel-info">' +  
                    '<div class="channel-name">' + channel.name + '</div>' +  
                    '<div class="epg-text">Завантаження...</div>' +  
                    '</div>' +  
                    '</div>');  
                  
                item.on('hover:enter', function () {  
                    $('.channel-item').removeClass('active');  
                    $(this).addClass('active');  
                    currentChannel = channel;  
                    if (channel.epgId) {  
                        epgUpdateData(channel.epgId);  
                    } else {  
                        renderEpgPanel(null);  
                    }  
                });  
                  
                item.on('click', function () {  
                    Lampa.Player.play({ url: channel.url, title: channel.name });  
                });  
                  
                channelsList.append(item);  
                  
                if (channel.epgId) {  
                    epgUpdateData(channel.epgId);  
                }  
            });  
              
            // Оновлення EPG кожні 30 секунд  
            if (epgInterval) clearInterval(epgInterval);  
            epgInterval = setInterval(function () {  
                if (currentChannel && currentChannel.epgId) {  
                    epgUpdateData(currentChannel.epgId);  
                }  
            }, 30000);  
        };  
  
        /* ===================== CORE ===================== */  
        this.start = function () {  
            Lampa.Controller.add('iptv_classic', {  
                back: function () {  
                    Lampa.Activity.back();  
                }  
            });  
            Lampa.Controller.toggle('content');  
            setTimeout(function () {  
                $('.iptv-classic .selector').first().addClass('focus');  
            }, 100);  
        };  
  
        this.pause = this.stop = function () {  
            if (epgInterval) {  
                clearInterval(epgInterval);  
                epgInterval = null;  
            }  
        };  
  
        this.render = function () { return root; };  
  
        this.destroy = function () {  
            if (epgInterval) {  
                clearInterval(epgInterval);  
                epgInterval = null;  
            }  
            root.remove();  
        };  
    }  
  
    /* ===================== INIT ===================== */  
    function init() {  
        Lampa.Component.add('iptv_classic', IPTVClassic);  
          
        var menuItem = $('<li class="menu__item selector">' +  
            '<div class="menu__ico">📺</div>' +  
            '<div class="menu__text">IPTV Classic</div>' +  
        '</li>');  
          
        menuItem.on('hover:enter', function () {  
            Lampa.Activity.push({  
                title: 'IPTV Classic',  
                component: 'iptv_classic'  
            });  
        });  
          
          $('.menu .menu__list').append(menuItem);  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) {  
        if (e.type === 'ready') init();  
    });  
  
})();
