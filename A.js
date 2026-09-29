(function () {
    'use strict';

    // Перевірка, чи Lampa завантажена
    function initEPG() {
        console.log('EPG Plugin: Initialized');

        // Додаємо пункт у головне меню або розділ налаштувань
        Lampa.Component.add('epg_view', function (object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({, fields: {}});
            var html = $('<div><div class="epg-loading">Завантаження телепрограми...</div></div>');
            
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

                // Завантаження та парсинг XML файлу
                loadEPGData(function (channels, programmes) {
                    html.empty();
                    if (!channels.length) {
                        html.html('<div class="epg-error">Не вдалося завантажити програму передач</div>');
                        return;
                    }

                    var list = $('<div class="settings-list"></div>');
                    
                    // Виводимо список каналів та їх передачі (приклад базового виведення)
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
                network.clear();
                scroll.destroy();
            };
        });

        // Додаємо кнопку до головного меню (або розділу плагінів)
        if (window.menu) {
            // Можна додати пункт у меню Lampa
        }
    }

    // Функція завантаження та простого парсингу XMLTV за допомогою DOMParser
    function loadEPGData(callback) {
        var epgUrl = 'http://only4.tv/epg/epg.xml';
        
        // Увага: Через CORS прямий запит з браузера на сторонній домен може блокуватися. 
        // Можливо, знадобиться простий проксі-сервер або запуск через CORS-політики пристрою.
        $.ajax({
            url: epgUrl,
            dataType: 'text',
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
                    for (var j = 0; j < progNodes.length; j++) {
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
        var filtered = programmes.filter(p => p.channel === channelId);
        
        var modalContent = $('<div class="scroll" style="max-height: 400px; overflow-y: auto; padding: 10px;"></div>');
        if (filtered.length === 0) {
            modalContent.append('<p>Немає даних про програми для цього каналу.</p>');
        } else {
            filtered.forEach(function (p) {
                modalContent.append(`<div style="margin-bottom: 8px;"><b>${formatTime(p.start)}</b> — ${p.title}</div>`);
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
        // Формат XMLTV: YYYYMMDDhhmmss +ZZZZ -> витягуємо години та хвилини
        return str.substring(8, 10) + ':' + str.substring(10, 12);
    }

    if (window.appready) {
        initEPG();
    } else {
        Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                initEPG();
            }
        });
    }
})();
