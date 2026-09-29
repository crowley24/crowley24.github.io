(function () {
    'use strict';

    function initEPG() {
        console.log('EPG Plugin: Initialized');

        // Реєструємо сторінку/компонент телепрограми
        Lampa.Component.add('epg_view', function () {
            var scroll = new Lampa.Scroll({ fields: {} });
            var html = $('<div><div style="padding: 20px; text-align: center;">Завантаження та обробка EPG...</div></div>');
            
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
                    
                    var stats = $(`
                        <div style="padding: 15px; background: rgba(255,255,255,0.05); margin-bottom: 10px; border-radius: 6px;">
                            <div><b>Знайдено каналів:</b> ${channels.length}</div>
                            <div><b>Знайдено передач (всього):</b> ${programmes.length}</div>
                        </div>
                    `);
                    html.append(stats);

                    if (!channels.length) {
                        html.append('<div style="padding: 20px; text-align: center; color: #ff5252;">Не вдалося знайти канали у файлі. Перевірте CORS або посилання.</div>');
                        scroll.update();
                        return;
                    }

                    var list = $('<div class="settings-list"></div>');
                    
                    channels.forEach(function (channel) {
                        var item = $(`
                            <div class="settings-item selector" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div class="settings-item__name">${channel.name}</div>
                                <div class="settings-item__descr" style="color: #aaa; font-size: 0.9em;">ID: ${channel.id}</div>
                            </div>
                        `);

                        item.on('hover:enter', function () {
                            showChannelPrograms(channel, programmes);
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

        // Додаємо пункт у головне меню Lampa
        if (window.menu) {
            var menu_item = $(`
                <li class="menu__item selector" data-action="epg">
                    <div class="menu__ico">
                        <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                        </svg>
                    </div>
                    <div class="menu__text">Телепрограма</div>
                </li>
            `);

            menu_item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    component: 'epg_view',
                    title: 'Телепрограма',
                    page: 1
                });
            });

            $('.menu__list').append(menu_item);
        }
    }

    function loadEPGData(callback) {
        var epgUrl = 'http://only4.tv/epg/epg.xml';
        
        $.ajax({
            url: epgUrl,
            dataType: 'text',
            timeout: 15000,
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
                    var limit = Math.min(progNodes.length, 20000);
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

    function showChannelPrograms(channel, programmes) {
        var filtered = programmes.filter(function(p) { 
            return p.channel === channel.id; 
        });
        
        var modalContent = $('<div style="max-height: 400px; overflow-y: auto; padding: 10px;"></div>');
        modalContent.append(`<div style="margin-bottom: 10px; color: #aaa;">Канал: ${channel.name} (ID: ${channel.id}) — Знайдено передач: ${filtered.length}</div>`);

        if (filtered.length === 0) {
            modalContent.append('<p style="color: #ff5252;">Немає програм для цього ID каналу. Можливо, у файлі EPG використовуються інші ідентифікатори.</p>');
        } else {
            filtered.forEach(function (p) {
                modalContent.append(`<div style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;"><b>${formatTime(p.start)} - ${formatTime(p.stop)}</b> — ${p.title}</div>`);
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
        return str.substring(6, 8) + '.' + str.substring(4, 6) + ' ' + str.substring(8, 10) + ':' + str.substring(10, 12);
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
