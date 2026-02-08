(function () {  
    'use strict';  
  
    function IPTVUltra() {  
        var root, colG, colC;  
        var groups_data = {};  
        var _this;  
        var EPG = {};  
        var epgInterval;  
        var epgPath = '';  
        var listCfg = {};  
        var chIDs = {id2epg: {}, piconUrl: '', id2picon: []};  
  
        var EPG_URL = 'https://iptvx.one/epg/epg.xml.gz';  
  
        // Поліфіл для Lampa.Utils.hash36, якщо відсутній  
        if (typeof Lampa.Utils.hash36 !== 'function') {  
            Lampa.Utils.hash36 = function (str) {  
                return (Lampa.Utils.hash(str) * 1).toString(36);  
            };  
        }  
  
        /* ===================== EPG HELPERS (з першого плагіна) ===================== */  
  
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
                    { dataType: 'json' }  
                );  
            }  
        }  
  
        function epgUpdateData(epgId) {  
            var t = Math.floor(unixtime() / 3600);  
            var epg = getEpgSessCache(epgId, t);  
            if (epg) {  
                EPG[epgId] = epg;  
                epgRender(epgId);  
                return;  
            }  
            var url = Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t;  
            networkSilentSessCache(url, function (data) {  
                if (data && data.length) {  
                    EPG[epgId] = data;  
                    setEpgSessCache(epgId, data);  
                    epgRender(epgId);  
                }  
            });  
        }  
  
        function epgRender(epgId) {  
            var cards = $('.iptv-row[data-epg-id="' + epgId + '"]');  
            if (!cards.length) return;  
            var epg = EPG[epgId];  
            if (!epg || !epg.length) {  
                cards.find('.epg-text').text('EPG відсутній');  
                cards.find('.epg-bar-fill').css('width', '0%');  
                return;  
            }  
            var now = unixtime();  
            var current = null;  
            for (var i = 0; i < epg.length; i++) {  
                var e = epg[i];  
                if (now >= e[0] * 60 && now < (e[0] + e[1]) * 60) {  
                    current = e;  
                    break;  
                }  
            }  
            if (current) {  
                var p = Math.round((now - current[0] * 60) * 100 / (current[1] * 60 || 60));  
                cards.find('.epg-text').text(current[2]);  
                cards.find('.epg-bar-fill').css('width', p + '%');  
            } else {  
                cards.find('.epg-text').text('Немає програми');  
                cards.find('.epg-bar-fill').css('width', '0%');  
            }  
        }  
  
        function setEpgId(channelGroup) {  
            if (!channelGroup.channels) return;  
            if (!listCfg.epgApiChUrl) {  
                channelGroup.channels.forEach(function (channel) {  
                    channel.epgId = channel.tid;  
                });  
                return;  
            }  
            networkSilentSessCache(listCfg.epgApiChUrl, function(d){  
                chIDs = d;  
                if (!chIDs.id2epg) chIDs.id2epg = {};  
                epgPath = !chIDs.epgPath ? '' : ('/' + chIDs.epgPath);  
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
                    .replace(/\s(\d+)/g, '$1');  
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
                return 0;  
            };  
            channelGroup.channels.forEach(function (channel) {  
                channel.epgId = chIDs.id2epg[channel.tid || ''] || epgIdByName(channel.name, false, channel.tid) || channel.tid;  
            });  
        }  
  
        /* ===================== CREATE ===================== */  
  
        this.create = function () {  
            _this = this;  
            root = $('<div class="iptv-ultra-root"></div>');  
  
            if (!$('#iptv-ultra-style').length) {  
                $('head').append(  
                    '<style id="iptv-ultra-style">' +  
                    '.iptv-ultra-root{position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:1000;display:flex;padding-top:3.5rem;color:#fff;font-family:sans-serif}' +  
                    '.col-groups{width:30%;background:#0d1013;border-right:1px solid rgba(255,255,255,.05);overflow-y:auto}' +  
                    '.col-channels{flex:1;background:#0b0d10;overflow-y:auto;padding:10px}' +  
                    '.iptv-row{padding:12px 15px;margin:5px;border-radius:8px;background:rgba(255,255,255,.03);cursor:pointer;border:2px solid transparent}' +  
                    '.iptv-row.active{background:#2962ff!important;border-color:#fff}' +  
                    '.ch-header{display:flex;gap:12px}' +  
                    '.ch-logo{width:50px;height:50px;object-fit:contain;background:#000;border-radius:6px;flex-shrink:0}' +  
                    '.ch-info{flex:1;overflow:hidden}' +  
                    '.ch-name{font-weight:bold;font-size:1.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +  
                    '.epg-text{font-size:.9rem;color:#30ffaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:1.2rem}' +  
                    '.epg-bar-container{width:100%;height:4px;background:rgba(255,255,255,.1);margin-top:6px;border-radius:2px;overflow:hidden}' +  
                    '.epg-bar-fill{height:100%;background:#30ffaa;width:0%}' +  
                    '</style>'  
                );  
            }  
  
            $('body').append(root); // ← додати root до body  
            colG = $('<div class="col-groups"></div>');  
            colC = $('<div class="col-channels"></div>');  
            root.append(colG, colC);  
  
            this.loadPlaylist();  
            return root;  
        };  
  
        /* ===================== PLAYLIST ===================== */  
  
        this.loadPlaylist = function () {  
            var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';  
            var network = new Lampa.Reguest();  
  
            network.silent(pl_url, function (data) {  
                if (!data) return;  
  
                if (Lampa.Tvg) {  
                    Lampa.Tvg.push(EPG_URL);  
                }  
  
                _this.parse(data);  
            }, function () {  
                colG.html('<div style="padding:20px;">Помилка мережі</div>');  
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
                }  
                else if (line.indexOf('http') === 0 && ch) {  
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
            colG.empty();  
  
            Object.keys(groups_data).forEach(function (name) {  
                var el = $('<div class="iptv-row group-item selector">' + name + ' (' + groups_data[name].length + ')</div>');  
                el.on('hover:enter', function () {  
                    $('.group-item').removeClass('active');  
                    $(this).addClass('active');  
                    _this.renderChannels(name);  
                });  
                colG.append(el);  
            });  
  
            colG.find('.group-item').first().addClass('focus');  
            Lampa.Controller.toggle('content');  
        };  
  
        /* ===================== CHANNELS ===================== */  
  
        this.renderChannels = function (group) {  
            colC.empty().scrollTop(0);  
  
            (groups_data[group] || []).forEach(function (item) {  
                var card = $(  
                    '<div class="iptv-row selector" data-epg-id="' + (item.epgId || '') + '">' +  
                        '<div class="ch-header">' +  
                            '<img class="ch-logo" src="' + (item.logo || 'https://placehold.co/100x100?text=TV') + '" onerror="this.src=\'https://placehold.co/100x100?text=TV\'">' +  
                            '<div class="ch-info">' +  
                                '<div class="ch-name">' + item.name + '</div>' +  
                                '<div class="epg-text">Завантаження...</div>' +  
                                '<div class="epg-bar-container"><div class="epg-bar-fill"></div></div>' +  
                            '</div>' +  
                        '</div>' +  
                    '</div>'  
                );  
  
                card.on('hover:enter', function () {  
                    Lampa.Player.play({ url: item.url, title: item.name });  
                });  
  
                colC.append(card);  
  
                if (item.epgId) {  
                    epgRender(item.epgId);  
                } else {  
                    card.find('.epg-text').text('EPG відсутній');  
                    card.find('.epg-bar-fill').css('width', '0%');  
                }  
            });  
  
            if (epgInterval) clearInterval(epgInterval);  
            epgInterval = setInterval(function () {  
                colC.find('.iptv-row[data-epg-id]').each(function () {  
                    var epgId = $(this).attr('data-epg-id');  
                    if (epgId) epgRender(epgId);  
                });  
            }, 10000);  
  
            colC.find('.selector').first().addClass('focus');  
            Lampa.Controller.toggle('content');  
        };  
  
        /* ===================== CORE ===================== */  
  
        this.start = function () {  
            Lampa.Controller.add('iptv_ultra', {  
                back: function () {  
                    Lampa.Activity.back();  
                }  
            });  
            Lampa.Controller.toggle('content');  
            setTimeout(function () {  
                var first = $('.iptv-ultra-root .selector').first();  
                if (first.length) {  
                    $('.iptv-ultra-root .selector').removeClass('focus');  
                    first.addClass('focus');  
                }  
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
        Lampa.Component.add('iptv_ultra', IPTVUltra);  
  
        var item = $('<li class="menu__item selector">' +  
            '<div class="menu__ico">📺</div>' +  
            '<div class="menu__text">IPTV PRO</div>' +  
        '</li>');  
  
        item.on('hover:enter', function () {  
            Lampa.Activity.push({  
                title: 'IPTV PRO',  
                component: 'iptv_ultra'  
            });  
        });  
  
        $('.menu .menu__list').append(item);  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) {  
        if (e.type === 'ready') init();  
    });  
  
})();
  
