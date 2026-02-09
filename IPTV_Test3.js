(function() {  
    'use strict';  
  
    function IPTVPlugin() {  
        this.playlistUrl = 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u';  
        this.channels = [];  
        this.EPG = {};  
        this.epgInterval = false;  
  
        this.init = function() {  
            var self = this;  
              
            // Додаємо пункт в меню для доступу до IPTV  
            this.addMenuItem();  
              
            // Завантажуємо плейлист  
            this.loadPlaylist();  
              
            // Запускаємо оновлення EPG  
            this.startEpgUpdates();  
        };  
  
        this.addMenuItem = function() {  
            Lampa.Listener.follow('app', function(e) {  
                if (e.type === 'ready') {  
                    // Додаємо IPTV в головне меню  
                    Lampa.Menu.add({  
                        title: 'IPTV Україна',  
                        icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>',  
                        onSelect: function() {  
                            this.showIPTVList();  
                        }.bind(this)  
                    });  
                }  
            }.bind(this));  
        };  
  
        this.loadPlaylist = function() {  
            var self = this;  
              
            Lampa.Network.native('get', this.playlistUrl, {}, false, false, function(data) {  
                if (data) {  
                    self.parsePlaylist(data);  
                } else {  
                    Lampa.Noty.show('Помилка завантаження плейлисту');  
                }  
            }.bind(this));  
        };  
  
        this.parsePlaylist = function(data) {  
            var lines = data.split('\n');  
            var currentChannel = null;  
              
            for (var i = 0; i < lines.length; i++) {  
                var line = lines[i].trim();  
                  
                if (line.startsWith('#EXTINF:')) {  
                    currentChannel = this.parseChannelInfo(line);  
                } else if (line && !line.startsWith('#') && currentChannel) {  
                    currentChannel.url = line;  
                    this.channels.push(currentChannel);  
                    currentChannel = null;  
                }  
            }  
              
            console.log('Завантажено каналів:', this.channels.length);  
        };  
  
        this.parseChannelInfo = function(extinfLine) {  
            var channel = {  
                name: '',  
                logo: '',  
                group: '',  
                tvgId: ''  
            };  
              
            // Парсинг назви  
            var nameMatch = extinfLine.match(/,(.+)$/);  
            if (nameMatch) {  
                channel.name = nameMatch[1].trim();  
            }  
              
            // Парсинг логотипа  
            var logoMatch = extinfLine.match(/tvg-logo="([^"]+)"/);  
            if (logoMatch) {  
                channel.logo = logoMatch[1];  
            }  
              
            // Парсинг групи  
            var groupMatch = extinfLine.match(/group-title="([^"]+)"/);  
            if (groupMatch) {  
                channel.group = groupMatch[1];  
            }  
              
            // Парсинг EPG ID  
            var tvgIdMatch = extinfLine.match(/tvg-id="([^"]+)"/);  
            if (tvgIdMatch) {  
                channel.tvgId = tvgIdMatch[1];  
            }  
              
            return channel;  
        };  
  
        this.showIPTVList = function() {  
            var items = this.channels.map(function(channel) {  
                return {  
                    title: channel.name,  
                    image: channel.logo,  
                    subtitle: channel.group,  
                    onSelect: function() {  
                        this.playChannel(channel);  
                    }.bind(this)  
                };  
            }.bind(this));  
              
            Lampa.Select.show({  
                title: 'IPTV Канали',  
                items: items,  
                onSelect: function() {  
                    this.playChannel(items[this.select].channel);  
                }.bind(this)  
            });  
        };  
  
        this.playChannel = function(channel) {  
            // Використовуємо налаштований IPTV плеєр з Lampa  
            var playerType = Lampa.Storage.field('player_iptv_type') || 'inner';  
              
            Lampa.Player.play({  
                url: channel.url,  
                title: channel.name,  
                type: 'iptv',  
                player: playerType  
            });  
        };  
  
        this.startEpgUpdates = function() {  
            var self = this;  
              
            if (this.epgInterval) {  
                clearInterval(this.epgInterval);  
            }  
              
            this.epgInterval = setInterval(function() {  
                self.updateEpg();  
            }, 60000); // Оновлення кожну хвилину  
        };  
  
        this.updateEpg = function() {  
            // Оновлення EPG даних для каналів  
            for (var i = 0; i < this.channels.length; i++) {  
                var channel = this.channels[i];  
                if (channel.tvgId) {  
                    this.loadEpgForChannel(channel.tvgId);  
                }  
            }  
        };  
  
        this.loadEpgForChannel = function(tvgId) {  
            var self = this;  
              
            // Завантаження EPG з API (якщо доступно)  
            Lampa.Network.native('get', 'https://epg.rootu.top/api/epg/' + tvgId + '/hour/' + Math.floor(Date.now() / 1000 / 3600) * 3600, {}, false, false, function(data) {  
                if (data && data.list) {  
                    self.EPG[tvgId] = data.list;  
                }  
            });  
        };  
    }  
  
    // Реєстрація плагіна  
    if (window.Lampa) {  
        Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};  
        Lampa.Manifest.plugins.iptv_ukraine = {  
            type: 'component',  
            name: 'IPTV Україна',  
            version: '1.0.0',  
            component: 'iptv_ukraine'  
        };  
          
        new IPTVPlugin().init();  
        console.log('[IPTV Plugin] Плагін IPTV Україна успішно завантажено');  
    }  
})();
