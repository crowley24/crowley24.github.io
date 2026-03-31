(function () {      
    'use strict';      
      
    function IPTVComponent() {      
        var _this = this;      
        var root, colG, colC, colE;      
        var groups_data = {};      
        var current_list = [];      
        var active_col = 'groups';      
        var index_g = 0, index_c = 0;      
        var epg_cache = {};      
        var epgPath = '';      
        var listCfg = {};      
        var epgInterval;      
      
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
      
        // Допоміжні функції для EPG    
        var utils = {    
            uid: function() { return Date.now().toString(36); },    
            hash: function(s) { return s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0); },    
            hash36: function(s) { return (this.hash(s) * 1).toString(36); }    
        };    
      
        function generateSigForString(string) {    
            var sigTime = Math.floor(Date.now() / 1000);    
            return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());    
        }    
      
        function networkSilentSessCache(url, success, fail, param) {    
            var context = this;    
            var urlForKey = url.replace(/([&?])sig=[^&]+&?/, '$1');    
            var key = ['cache', urlForKey, param ? utils.hash36(JSON.stringify(param)) : ''].join('\t');    
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
                    param    
                );    
            }    
        }    
      
        function getEpgSessCache(epgId, t) {    
            var key = ['epg', epgId].join('\t');    
            var epg = sessionStorage.getItem(key);    
            if (epg) {    
                epg = JSON.parse(epg);    
                if (t) {    
                    if (epg.length    
                        && (    
                            t < epg[0][0]    
                            || t > (epg[epg.length - 1][0] + epg[epg.length - 1][1])    
                        )    
                    ) return false;    
                    while (epg.length && t >= (epg[0][0] + epg[0][1])) epg.shift();    
                }    
            }    
            return epg;    
        }    
      
        function setEpgSessCache(epgId, epg) {    
            var key = ['epg', epgId].join('\t');    
            sessionStorage.setItem(key, JSON.stringify(epg));    
        }    
  
        // EPG шаблон з my_iptv плагіна  
        var epgTemplate = $('<div id="iptv_pro_epg">' +  
            '<h2 class="js-epgChannel"></h2>' +  
            '<div class="iptv-pro-details__program-body js-epgNow">' +  
            '   <div class="iptv-pro-details__program-title">Зараз</div>' +  
            '   <div class="iptv-pro-program selector">' +  
            '       <div class="iptv-pro-program__time js-epgTime">XX:XX</div>' +  
            '       <div class="iptv-pro-program__body">' +  
            '           <div class="iptv-pro-program__title js-epgTitle"></div>' +  
            '           <div class="iptv-pro-program__progressbar"><div class="iptv-pro-program__progress js-epgProgress"></div></div>' +  
            '       </div>' +  
            '   </div>' +  
            '</div>' +  
            '<div class="iptv-pro-details__program-body js-epgAfter">' +  
            '   <div class="iptv-pro-details__program-title">Потім</div>' +  
            '   <div class="iptv-pro-details__program-list js-epgList"></div>' +  
            '</div>' +  
            '</div>');  
  
        // Функція оновлення EPG відображення  
        function updateEpgDisplay(channel) {  
            if (!channel || !channel.tvg_id) return;  
              
            _this.loadEPG(channel, function(data) {  
                if (!data || !data.program) return;  
                  
                var now = Date.now() / 1000;  
                var currentProgram = null;  
                var upcomingPrograms = [];  
                  
                for (var i = 0; i < data.program.length; i++) {  
                    var p = data.program[i];  
                    if (p.start <= now && p.stop > now) {  
                        currentProgram = p;  
                    } else if (p.start > now) {  
                        upcomingPrograms.push(p);  
                    }  
                }  
                  
                // Оновлення поточної програми  
                var epgNow = epgTemplate.find('.js-epgNow');  
                if (currentProgram) {  
                    epgNow.find('.js-epgTime').text(new Date(currentProgram.start * 1000).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}));  
                    epgNow.find('.js-epgTitle').text(currentProgram.title);  
                      
                    var progress = ((now - currentProgram.start) / (currentProgram.stop - currentProgram.start)) * 100;  
                    epgNow.find('.js-epgProgress').css('width', Math.min(100, Math.max(0, progress)) + '%');  
                    epgNow.show();  
                } else {  
                    epgNow.hide();  
                }  
                  
                // Оновлення майбутніх програм  
                var epgAfter = epgTemplate.find('.js-epgAfter');  
                var epgList = epgAfter.find('.js-epgList');  
                epgList.empty();  
                  
                upcomingPrograms.slice(0, 5).forEach(function(prog) {  
                    var item = $('<div class="iptv-pro-program selector">' +  
                        '<div class="iptv-pro-program__time">' + new Date(prog.start * 1000).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}) + '</div>' +  
                        '<div class="iptv-pro-program__title">' + prog.title + '</div>' +  
                        '</div>');  
                    epgList.append(item);  
                });  
                  
                epgAfter.toggle(upcomingPrograms.length > 0);  
            });  
        }  
      
        this.create = function () {      
            root = $('<div class="iptv-root"></div>');      
            var container = $('<div class="iptv-flex-wrapper"></div>');      
      
            colG = $('<div class="iptv-col col-groups"></div>');      
            colC = $('<div class="iptv-col col-channels"></div>');      
            colE = $('<div class="iptv-col col-details"></div>');      
      
            container.append(colG, colC, colE);      
            root.append(container);      
      
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
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;}' +      
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%;}' +  
                    // Додаткові стилі для EPG  
                    '.iptv-pro-details__program-body{margin-top:1.5rem;}' +  
                    '.iptv-pro-details__program-title{font-size:1.2rem;color:#2962ff;margin-bottom:1rem;opacity:0.8;}' +  
                    '.iptv-pro-program{display:flex;font-size:1.1rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.1);}' +  
                    '.iptv-pro-program__time{flex-shrink:0;width:5rem;color:#888;}' +  
                    '.iptv-pro-program__title{flex-grow:1;color:#ccc;}' +  
                    '.iptv-pro-program__progressbar{width:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;margin-top:0.5rem;}' +  
                    '.iptv-pro-program__progress{height:100%;background:#2962ff;width:0%;transition:width 1s linear;}' +  
                    '</style>');      
            }  
  
            // Запуск інтервалу оновлення EPG  
            epgInterval = setInterval(function() {  
                if (current_list.length > 0 && index_c >= 0) {  
                    var currentChannel = current_list[index_c];  
                    if (currentChannel && currentChannel.tvg_id) {  
                        updateEpgDisplay(currentChannel);  
                    }  
                }  
            }, 10000);  
      
            this.loadPlaylist();      
            return root;      
        };      
      
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
      
        this.parse = function (str) {      
            var lines = str.split('\n');      
            groups_data = { '⭐ Обране': config.favorites };      
            var current_group = 'ЗАГАЛЬНІ';      
                  
            // Парсинг заголовка M3U для EPG налаштувань    
            var l = str.split(/\r?\n/, 2)[0];    
            if (l.indexOf('#EXTM3U') === 0) {    
                var m, mm;    
                if (!!(m = l.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {    
                    for (var jj = 0; jj < m.length; jj++) {    
                        if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {    
                            listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);    
                        }    
                    }    
                }    
                listCfg['epgUrl'] = listCfg['url-tvg'] || listCfg['x-tvg-url'] || config.epg_url;    
                listCfg['epgCode'] = utils.hash36(listCfg['epgUrl'].toLowerCase().replace(/https:\/\//g, 'http://'));    
                    
                // Встановлення EPG API URL    
                if (/^https?:\/\/.+/i.test(listCfg['epgUrl']) && listCfg['epgUrl'].length < 8000) {    
                    var channelsUri = listCfg['epgCode'] + '/channels?url=' + encodeURIComponent(listCfg['epgUrl'])    
                        + '&uid=' + utils.uid() + '&sig=' + generateSigForString(listCfg['epgUrl']);    
                    listCfg['epgApiChUrl'] = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;    
                }    
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
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id };      
                        if (!groups_data[group]) groups_data[group] = [];      
                        groups_data[group].push(item);      
                    }      
                }      
            }      
            this.setEpgIds();    
            this.renderG();      
        };      
      
        this.setEpgIds = function() {    
            if (!listCfg['epgApiChUrl']) {    
                console.log('EPG API URL не встановлено');    
                return;    
            }    
                
            var _this = this;    
            networkSilentSessCache(listCfg['epgApiChUrl'], function(d){    
                var chIDs = d;    
                if (!chIDs['id2epg']) chIDs['id2epg'] = {};    
                epgPath = !chIDs['epgPath'] ? '' : ('/' + chIDs['epgPath']);  
          
        console.log('EPG Path встановлено:', epgPath);  
        console.log('Отримано chIDs:', chIDs);  
          
        // Встановлення EPG ID для каналів  
        Object.keys(groups_data).forEach(function(groupName) {  
            groups_data[groupName].forEach(function(channel) {  
                if (channel.tvg_id) return;  
                  
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
                  
                var n = chShortName(channel.name);  
                var fw = n[0];  
                  
                if (chIDs[fw]) {  
                    if (chIDs[fw][n]) {  
                        channel.tvg_id = chIDs[fw][n];  
                        console.log('Знайдено EPG ID для', channel.name, ':', channel.tvg_id);  
                    } else {  
                        n = trName(n);  
                        if (chIDs[fw][n]) {  
                            channel.tvg_id = chIDs[fw][n];  
                            console.log('Знайдено EPG ID (трансліт) для', channel.name, ':', channel.tvg_id);  
                        }  
                    }  
                }  
            });  
        });  
          
        // Оновити відображення після встановлення EPG ID  
        _this.renderG();  
    }, function(error) {  
        console.error('Помилка завантаження EPG API:', error);  
    });  
};  
  
this.renderG = function () {  
    colG.empty();  
    Object.keys(groups_data).forEach(function (g, i) {  
        var count = groups_data[g].length;  
        var item = $('<div class="iptv-item">' + g + ' (' + count + ')</div>');  
        item.on('click', function () {   
            index_g = i;   
            active_col = 'groups';   
            _this.renderC(groups_data[g]);   
        });  
        colG.append(item);  
    });  
    this.updateFocus();  
};  
  
this.renderC = function (list) {  
    colC.empty();  
    current_list = list || [];  
    current_list.forEach(function (c, idx) {  
        var row = $('<div class="iptv-item">' +  
                        '<div class="channel-row">' +  
                            '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +  
                            '<div class="channel-title">' + c.name + '</div>' +  
                        '</div>' +  
                    '</div>');  
        row.on('click', function () {   
            Lampa.Player.play({ url: c.url, title: c.name });   
        });  
        row.on('hover:focus', function () {   
            index_c = idx;   
            _this.showDetails(c);   
        });  
        colC.append(row);  
    });  
    active_col = 'channels';  
    index_c = 0;  
    if (current_list.length) this.showDetails(current_list[0]);  
    this.updateFocus();  
};  
  
this.loadEPG = function(channel, callback) {  
    if (epg_cache[channel.tvg_id]) {  
        callback(epg_cache[channel.tvg_id]);  
        return;  
    }  
      
    if (!channel.tvg_id) {  
        callback(null);  
        return;  
    }  
      
    var lt = Math.floor(Date.now()/60000);  
    var t = Math.floor(lt/60);  
      
    var success = function(epg) {  
        if (epg && epg.length > 0) {  
            var epgData = {   
                program: epg.map(function(item) {  
                    return {  
                        start: item[0] * 60,  
                        stop: (item[0] + item[1]) * 60,  
                        title: item[2],  
                        descr: item[3] || ''  
                    };  
                })  
            };  
            epg_cache[channel.tvg_id] = epgData;  
            setEpgSessCache(channel.tvg_id, epg);  
            callback(epgData);  
        } else {  
            callback(null);  
        }  
    };  
      
    var fail = function() {  
        callback(null);  
    };  
      
    var cachedEpg = getEpgSessCache(channel.tvg_id, lt);  
    if (cachedEpg) {  
        success(cachedEpg);  
        return;  
    }  
      
    var epgUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + channel.tvg_id + '/hour/' + t;  
    networkSilentSessCache(epgUrl, success, fail);  
};  
  
this.showDetails = function (channel) {  
    colE.empty();  
      
    var content = $('<div class="details-box">' +  
        '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:5px; border-radius:5px;">' +  
        '<div class="epg-title-big">' + channel.name + '</div>' +  
        '</div>');  
      
    colE.append(content);  
    colE.append(epgTemplate);  
      
    epgTemplate.find('.js-epgChannel').text(channel.name);  
      
    this.loadEPG(channel, function(data) {  
        if (!data || !data.program) return;  
          
        var now = Date.now() / 1000;  
        var currentProgram = null;  
        var upcomingPrograms = [];  
          
        for (var i = 0; i < data.program.length; i++) {  
            var p = data.program[i];  
            if (p.start <= now && p.stop > now) {  
                currentProgram = p;  
            } else if (p.start > now) {  
                upcomingPrograms.push(p);  
            }  
        }  
          
        var epgNow = epgTemplate.find('.js-epgNow');  
        if (currentProgram) {  
            epgNow.find('.js-epgTime').text(new Date(currentProgram.start * 1000).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}));  
            epgNow.find('.js-epgTitle').text(currentProgram.title);  
              
            var progress = ((now - currentProgram.start) / (currentProgram.stop - currentProgram.start)) * 100;  
            epgNow.find('.js-epgProgress').css('width', Math.min(100, Math.max(0, progress)) + '%');  
            epgNow.show();  
        } else {  
            epgNow.hide();  
        }  
          
        var epgAfter = epgTemplate.find('.js-epgAfter');  
        var epgList = epgAfter.find('.js-epgList');  
        epgList.empty();  
          
        upcomingPrograms.slice(0, 5).forEach(function(prog) {  
            var item = $('<div class="iptv-pro-program selector">' +  
                '<div class="iptv-pro-program__time">' + new Date(prog.start * 1000).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}) + '</div>' +  
                '<div class="iptv-pro-program__title">' + prog.title + '</div>' +  
                '</div>');  
            epgList.append(item);  
        });  
          
        epgAfter.toggle(upcomingPrograms.length > 0);  
    });  
};  
  
this.updateFocus = function () {  
    $('.iptv-item').removeClass('active');  
    var target = active_col === 'groups' ? colG : colC;  
    var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);  
    item.addClass('active');  
    if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });  
};  
  
this.start = function () {  
    this.registerEPG();  
  
    Lampa.Controller.add('iptv_pro', {  
        up: function () {  
            if (active_col === 'groups') index_g = Math.max(0, index_g - 1);  
            else index_c = Math.max(0, index_c - 1);  
            _this.updateFocus();  
        },  
        down: function () {  
            if (active_col === 'groups') {  
                var max_g = Object.keys(groups_data).length - 1;  
                index_g = Math.min(max_g, index_g + 1);  
            } else {  
                var max_c = current_list.length - 1;  
                index_c = Math.min(max_c, index_c + 1);  
            }  
            _this.updateFocus();  
        },  
        left: function () {  
            if (active_col === 'channels') {  
                active_col = 'groups';  
                _this.updateFocus();  
            }  
        },  
        right: function () {  
            if (active_col === 'groups') {  
                active_col = 'channels';  
                _this.updateFocus();  
            }  
        },  
        enter: function () {  
            if (active_col === 'groups') {  
                var groups = Object.keys(groups_data);  
                if (groups[index_g]) {  
                    _this.renderC(groups_data[groups[index_g]]);  
                }  
            } else if (active_col === 'channels' && current_list[index_c]) {  
                Lampa.Player.play({   
                    url: current_list[index_c].url,   
                    title: current_list[index_c].name   
                });  
            }  
        },  
        back: function () {  
            _this.destroy();  
        }  
    });  
  
    Lampa.Controller.toggle('iptv_pro');  
};  
  
this.destroy = function () {  
    if (epgInterval) clearInterval(epgInterval);  
    if (root) root.remove();  
    Lampa.Controller.remove('iptv_pro');  
};  
  
this.registerEPG = function() {  
    if (window.Lampa && Lampa.Storage) {  
        var iptv_config = Lampa.Storage.get('iptv_config', {});  
        iptv_config.xmltv_url = config.epg_url;       
        Lampa.Storage.set('iptv_config', iptv_config);  
    }  
};  
  
    }  
  
    // Реєстрація компонента  
    Lampa.Component.add('iptv_pro_v12', IPTVComponent);  
  
    // Додавання в меню  
    function pluginStart() {  
        if (!!window['plugin_iptv_pro_v12_ready']) {  
            console.log('IPTV Pro plugin already started');  
            return;  
        }  
        window['plugin_iptv_pro_v12_ready'] = true;  
          
        var menu = $('.menu .menu__list').eq(0);  
        var menuEl = $('<li class="menu__item selector">' +  
            '<div class="menu__ico">📺</div>' +  
            '<div class="menu__text">IPTV Pro</div>' +  
            '</li>');  
          
        menuEl.on('hover:enter', function(){  
            Lampa.Activity.push({  
                component: 'iptv_pro_v12',  
                page: 1  
            });  
        });  
          
        menu.append(menuEl);  
        console.log('IPTV Pro plugin started');  
    }  
  
    if (!!window.appready) pluginStart();  
    else Lampa.Listener.follow('app', function(e){if (e.type === 'ready') pluginStart()});  
  
})();
