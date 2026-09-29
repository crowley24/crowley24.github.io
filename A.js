(function () {
    'use strict';

    function initEPG() {
        console.log('EPG Plugin: Initialized');

        Lampa.Component.add('epg_view', function () {
            var scroll = new Lampa.Scroll({ fields: {} });
            var html = $('<div><div style="padding: 20px; text-align: center;">Завантаження телепрограми...</div></div>');
            
            scroll.body().append(html);

            this.create = function () {
                return scroll.render();
            };

            this.start = function () {
                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.enable('content');
                    },
                    left: function () {
                        Lampa.Controller.toggle('menu');
                    },
                    up: function () {
                        scroll.up();
                    },
                    down: function () {
                        scroll.down();
                    },
                    back: function () {
                        Lampa.Activity.backward();
                    }
                });
                Lampa.Controller.toggle('content');

                loadEPGData(function (channels, programmes) {
                    html.empty();
                    if (!channels.length) {
                        html.html('<div style="padding: 20px; text-align: center; color: #ff5252;">Не вдалося завантажити або розібрати EPG (можливо блокування CORS)</div>');
                        scroll.update();
                        return;
                    }

                    var list = $('<div class="settings-list"></div>');
                    
                    channels.forEach(function (channel) {
                        var item = $(`
                            <div class="settings-item selector" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div class="settings-item__name">${channel.name}</div>
                                <div class="settings-item__descr" style="color: #aaa; font-size: 0.9em;">Натисніть для перегляду програми</div>
                            </div>
                        `);

                        item.on('hover:enter', function () {
                            showChannelPrograms(channel.id, programmes);
                        });

                        list.append(item);
                    });

                    html.append(list);
                    scroll.update();
                });
            };

            this.destroy = function () {
                scroll.destroy();
            };
        });
    }

    function loadEPGData(callback) {
        var epgUrl = 'http://only4.tv/epg/epg.xml';
        
        $.ajax({
            url: epgUrl,
            dataType: 'text',
            timeout: 10000,
            success: function (xmlString) {
                try {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlString, "text/xml");

                    var channels = [];
                    var channelNodes = xmlDoc.getElementsByTagName('channel');
                    for (var i = 0; i < channelNodes.length; i++) {
                        var node = channelNodes[i];
                        var id = node.getAttribute('id');
                        var nameNode = node.getElementsByTagName('display-name')[0];
                        channels.push({
                            id: id,
                            name: nameNode ? nameNode.textContent : id
                        });
                    }

                    var programmes = [];
                    var progNodes = xmlDoc.getElementsByTagName('programme');
                    // Обмежуємо першими 5000 елементами для стабільності на слабких приставках
                    var limit = Math.min(progNodes.length, 5000);
                    for (var j = 0; j < limit; j++) {
                        var pNode = progNodes[j];
                        programmes.push({
                            channel: pNode.getAttribute('channel'),
                            start: pNode.getAttribute('start'),
                            stop: pNode.getAttribute('stop'),
                            title: pNode.getElementsByTagName('title')[0] ? pNode.getElementsByTagName('title')[0].textContent : ''
                        });
                    }

                    callback(channels, programmes);
                } catch (e) {
                    console.error('EPG Parse Error:', e);
                    callback([], []);
                }
            },
            error: function (xhr, status, error) {
                console.error('EPG Load Error:', error);
                callback([], []);
            }
        });
    }

    function showChannelPrograms(channelId, programmes) {
        var filtered = programmes.filter(function(p) { return p.channel === channelId; });
        
        var modalContent = $('<div style="max-height: 400px; overflow-y: auto; padding: 10px;"></div>');
        if (filtered.length === 0) {
            modalContent.append('<p>Немає даних про програми для цього каналу.</p>');
        } else {
            filtered.forEach(function (p) {
                modalContent.append(`<div style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;"><b>${formatTime(p.start)}</b> — ${p.title}</div>`);
            });
        }

        Lampa.Modal.open({
            title: 'Телепрограма',
            html: modalContent,
            size: 'medium',
            onBack: function () {
                Lampa.Modal.close();
            }
        });
    }

    function formatTime(str) {
        if (!str || str.length < 12) return str;
        return str.substring(8, 10) + ':' + str.substring(10, 12);
    }

    if (window.appready) {
        initEPG();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                initEPG();
            }
        });
    }
})();
