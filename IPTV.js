// ==Lampa==  
// name: IPTV Native Enhanced  
// version: 6.1  
// author: Gemini & Artrax90 (Enhanced)  
// ==/Lampa==  
  
(function () {  
    'use strict';  
  
    function IPTVComponent(object) {  
        var _this = this;  
        var root, colG, colC, colE;  
        var playlists = Lampa.Storage.get('iptv_pl', [{name: 'TEST', url: 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u'}]);  
        var fav = Lampa.Storage.get('iptv_fav', []);  
        var epgCache = {}; // Кеш для EPG даних  
        var CACHE_DURATION = 30 * 60 * 1000; // 30 хвилин  
  
        this.create = function () {  
            root = $('<div class="iptv-root"></div>');  
            colG = $('<div class="iptv-col g" data-group="1"></div>');  
            colC = $('<div class="iptv-col c" data-group="2"></div>');  
            colE = $('<div class="iptv-col e"></div>');  
            root.append(colG, colC, colE);  
  
            if (!$('#iptv-style-v6').length) {  
                $('head').append(`  
                <style id="iptv-style-v6">  
                    .iptv-root { display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 100; }  
                    .iptv-col { height: 100%; overflow-y: auto; display: block; }  
                    .g { width: 250px; background: #14171b; border-right: 1px solid #2a2e33; }  
                    .c { flex: 1; background: #0b0d10; }  
                    .e { width: 350px; background: #080a0d; border-left: 1px solid #2a2e33; padding: 20px; }  
                    .item { padding: 15px; margin: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; border: 2px solid transparent; display: flex; align-items: center; }  
                    .item.focus { background: #2962ff !important; border-color: #fff; }  
                    .info-title { font-size: 1.6em; font-weight: bold; color: #fff; }  
                    .channel-logo { width: 40px; height: 40px; margin-right: 15px; border-radius: 4px; object-fit: cover; }  
                    .channel-info { flex: 1; }  
                    .channel-name { font-size: 1.1em; margin-bottom: 5px; }  
                    .epg-info { font-size: 0.9em; color: #ccc; }  
                    .error-message { color: #ff6b6b; padding: 20px; text-align: center; }  
                    .loading-spinner { border: 3px solid #333; border-top: 3px solid #2962ff; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }  
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }  
                </style>`);  
            }  
  
            this.load();  
            return root;  
        };  
  
        // Перевірка кешу  
        function isCacheValid(cacheKey) {  
            var cached = Lampa.Storage.get('iptv_cache_' + cacheKey);  
            if (!cached) return false;  
            return Date.now() - cached.timestamp < CACHE_DURATION;  
        }  
  
        // Збереження в кеш  
        function saveToCache(cacheKey, data) {  
            Lampa.Storage.set('iptv_cache_' + cacheKey, {  
                data: data,  
                timestamp: Date.now()  
            });  
        }  
  
        // Завантаження з кешу  
        function loadFromCache(cacheKey) {  
            var cached = Lampa.Storage.get('iptv_cache_' + cacheKey);  
            return cached ? cached.data : null;  
        }  
  
        this.load = function () {  
            var url = playlists[0].url;  
            var cacheKey = btoa(url).replace(/[^a-zA-Z0-9]/g, '');  
              
            // Показуємо індикатор завантаження  
            colG.html('<div class="loading-spinner"></div>');  
              
            // Перевіряємо кеш  
            if (isCacheValid(cacheKey)) {  
                var cachedData = loadFromCache(cacheKey);  
                if (cachedData) {  
                    _this.parse(cachedData);  
                    return;  
                }  
            }  
  
            $.ajax({  
                url: url,  
                timeout: 15000,  
                success: function(str) {   
                    saveToCache(cacheKey, str);  
                    _this.parse(str);   
                },  
                error: function(xhr, status, error) {  
                    console.error('Playlist loading error:', error);  
                    var errorMsg = 'Помилка завантаження плейлиста';  
                    if (status === 'timeout') errorMsg = 'Час очікування перевищено';  
                    else if (status === 'abort') errorMsg = 'Завантаження скасовано';  
                    else if (xhr.status === 404) errorMsg = 'Плейлист не знайдено';  
                      
                    colG.html('<div class="error-message">' + errorMsg + '</div>');  
                      
                    // Спроба завантажити з кешу навіть якщо він застарів  
                    var cachedData = loadFromCache(cacheKey);  
                    if (cachedData) {  
                        colG.append('<div class="item">Використовується кешована версія</div>');  
                        setTimeout(function() { _this.parse(cachedData); }, 1000);  
                    }  
                }  
            });  
        };  
  
        // Завантаження EPG для каналу  
        function loadEPG(channelId, callback) {  
            if (epgCache[channelId]) {  
                callback(epgCache[channelId]);  
                return;  
            }  
  
            // Спроба завантажити EPG з різних джерел  
            var epgSources = [  
                'https://epg.it999.ru/epg.xml.gz',  
                'https://iptvx.one/epg/epg.xml.gz'  
            ];  
  
            function tryNextSource(index) {  
                if (index >= epgSources.length) {  
                    callback(null);  
                    return;  
                }  
  
                $.ajax({  
                    url: epgSources[index],  
                    timeout: 5000,  
                    success: function(data) {  
                        parseEPG(data, channelId, callback);  
                    },  
                    error: function() {  
                        tryNextSource(index + 1);  
                    }  
                });  
            }  
  
            tryNextSource(0);  
        }  
  
        // Парсинг EPG  
        function parseEPG(xmlData, channelId, callback) {  
            try {  
                var parser = new DOMParser();  
                var xmlDoc = parser.parseFromString(xmlData, 'text/xml');  
                var programmes = xmlDoc.querySelectorAll('programme[channel="' + channelId + '"]');  
                  
                if (programmes.length > 0) {  
                    var currentProgramme = null;  
                    var now = new Date();  
                      
                    for (var i = 0; i < programmes.length; i++) {  
                        var start = new Date(programmes[i].getAttribute('start'));  
                        var stop = new Date(programmes[i].getAttribute('stop'));  
                          
                        if (start <= now && stop >= now) {  
                            currentProgramme = {  
                                title: programmes[i].querySelector('title')?.textContent || '',  
                                desc: programmes[i].querySelector('desc')?.textContent || '',  
                                start: start,  
                                stop: stop  
                            };  
                            break;  
                        }  
                    }  
                      
                    epgCache[channelId] = currentProgramme;  
                    callback(currentProgramme);  
                } else {  
                    callback(null);  
                }  
            } catch (e) {  
                console.error('EPG parsing error:', e);  
                callback(null);  
            }  
        }  
  
        this.parse = function (str) {  
            var groups = {'⭐ Избранное': []};  
            var channels = [];  
            var lines = str.split('\n');  
  
            for (var i = 0; i < lines.length; i++) {  
                var l = lines[i].trim();  
                if (l.indexOf('#EXTINF') === 0) {  
                    var n = (l.match(/,(.*)$/) || [,''])[1];  
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];  
                    var tvgId = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];  
                    var tvgLogo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];  
                      
                    channels.push({  
                        name: n,   
                        group: g,   
                        url: '',  
                        tvgId: tvgId,  
                        logo: tvgLogo  
                    });  
                } else if (l.indexOf('http') === 0 && channels.length > 0) {  
                    var last = channels[channels.length - 1];  
                    if (!last.url) {  
                        last.url = l;  
                        if (!groups[last.group]) groups[last.group] = [];  
                        groups[last.group].push(last);  
                    }  
                }  
            }  
            groups['⭐ Избранное'] = channels.filter(c => fav.includes(c.name));  
            this.renderG(groups);  
        };  
  
        this.renderG = function (groups) {  
            colG.empty();  
            Object.keys(groups).forEach(function(g) {  
                if (groups[g].length === 0 && g !== '⭐ Избранное') return;  
                var item = $('<div class="selector item">' + g + '</div>');  
                  
                item.on('hover:enter', function() { _this.renderC(groups[g]); });  
                item.on('hover:focus', function() { colE.html('<div class="info-title">' + g + '</div>'); });  
                  
                colG.append(item);  
            });  
              
            Lampa.Controller.collectionSet(root);  
        };  
  
        this.renderC = function (list) {  
            colC.empty();  
            list.forEach(function(c) {  
                var row = $('<div class="selector item"></div>');  
                  
                // Додаємо логотип якщо є  
                if (c.logo) {  
                    var logo = $('<img class="channel-logo" src="' + c.logo + '" onerror="this.style.display=\'none\'">');  
                    row.append(logo);  
                }  
                  
                var info = $('<div class="channel-info"></div>');  
                info.append('<div class="channel-name">' + c.name + '</div>');  
                  
                // Додаємо EPG інформацію  
                if (c.tvgId) {  
                    loadEPG(c.tvgId, function(epg) {  
                        if (epg) {  
                            var epgText = epg.title + ' (' +   
                                epg.start.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}) + ' - ' +   
                                epg.stop.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'}) + ')';  
                            info.find('.epg-info').remove();  
                            info.append('<div class="epg-info">' + epgText + '</div>');  
                        }  
                    });  
                    info.append('<div class="epg-info">Завантаження EPG...</div>');  
                }  
                  
                row.append(info);  
                  
                row.on('hover:enter', function() {   
                    Lampa.Player.play({url: c.url, title: c.name});   
                });  
                row.on('hover:focus', function() {   
                    colE.html('<div class="info-title">' + c.name + '</div>');  
                    if (c.logo) {  
                        colE.append('<img src="' + c.logo + '" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" onerror="this.style.display=\'none\'">');  
                    }  
                });  
                colC.append(row);  
            });  
              
            Lampa.Controller.collectionSet(root);  
              
            var first = colC.find('.selector').first();  
            if(first.length) Lampa.Controller.focus(first[0]);  
        };  
  
        this.start = function () {  
            Lampa.Controller.add('iptv_native', {  
                toggle: function () {   
                    Lampa.Controller.collectionSet(root);   
                },  
                back: function () {   
                    Lampa.Activity.back();   
                }  
            });  
              
            Lampa.Controller.toggle('iptv_native');  
              
            setTimeout(function() {  
                var firstCategory = colG.find('.selector').first();  
                if(firstCategory.length) Lampa.Controller.focus(firstCategory[0]);  
            }, 500);  
        };  
  
        this.pause = this.stop = function () {};  
        this.render = function () { return root; };  
        this.destroy = function () {   
            Lampa.Controller.remove('iptv_native');  
            $('.menu__item:contains("IPTV PRO Enhanced")').remove();  
            root.remove();   
        };  
    }  
  
    function init() {  
        // Перевірка, чи компонент уже зареєстровано  
        if (Lampa.Component.get('iptv_native')) return;  
  
        Lampa.Component.add('iptv_native', IPTVComponent);  
          
        // Перевірка, чи кнопка вже існує  
        if (!$('.menu__item:contains("IPTV PRO Enhanced")').length) {  
            var btn = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO Enhanced</div></li>');  
            btn.on('hover:enter', function () {  
                Lampa.Activity.push({title: 'IPTV', component: 'iptv_native'});  
            });  
            $('.menu .menu__list').append(btn);  
        }  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });  
})();
