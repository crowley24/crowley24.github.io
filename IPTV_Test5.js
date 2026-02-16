// ==Lampa==
// name: IPTV EPG DEBUG SIMPLE
// version: 1.0
// ==/Lampa==

(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    var EPG_URL = 'http://only4.tv/epg/epg.xml'; // <-- можеш змінити
    var EPG = {};
    var EPG_LOG = [];

    function epgLog(message) {
        EPG_LOG.push(message);

        if (component.colE) {
            component.colE.html(
                '<div style="padding:20px;font-size:18px;">'
                + '<h2>EPG Debug</h2>'
                + EPG_LOG.map(function(m){
                    return '<div style="margin-bottom:6px;">• ' + m + '</div>';
                }).join('')
                + '</div>'
            );
        }

        console.log('[EPG]', message);
    }

    function loadEPG() {

        epgLog('Завантаження: ' + EPG_URL);

        fetch(EPG_URL)
            .then(function(resp){

                epgLog('HTTP статус: ' + resp.status);

                if (!resp.ok) {
                    throw new Error('HTTP error ' + resp.status);
                }

                return resp.text();
            })
            .then(function(text){

                if (!text || text.length < 100) {
                    epgLog('XML занадто короткий або пустий');
                    return;
                }

                var parser = new DOMParser();
                var xml = parser.parseFromString(text, "text/xml");

                var programmes = xml.querySelectorAll("programme");

                epgLog('Знайдено programme: ' + programmes.length);

                programmes.forEach(function(p){

                    var channel = p.getAttribute("channel");
                    var title = p.querySelector("title");

                    if (!channel || !title) return;

                    if (!EPG[channel]) EPG[channel] = [];

                    EPG[channel].push({
                        title: title.textContent
                    });
                });

                epgLog('Унікальних каналів: ' + Object.keys(EPG).length);

                if (Object.keys(EPG).length === 0) {
                    epgLog('⚠ tvg-id не співпадають або XML порожній');
                }
            })
            .catch(function(err){
                epgLog('ПОМИЛКА: ' + err.message);
                epgLog('Можливо: HTTP замість HTTPS або CORS блок');
            });
    }

    function IPTVComponent() {

        var _this = this;

        this.colG = $('<div style="width:40%;float:left;"></div>');
        this.colE = $('<div style="width:60%;float:left;"></div>');

        this.create = function () {

            this.render();
            loadEPG();

            return this.colG.add(this.colE);
        };

        this.render = function () {

            var channels = [
                {name: 'Твоє Кіно Action HD', tid: 'tvoje-kino-action'},
                {name: 'Новий Канал HD', tid: 'novy-kanal-ua'}
            ];

            var html = '<div style="padding:20px;font-size:20px;"><h2>Канали</h2>';

            channels.forEach(function(ch, index){
                html += '<div data-index="'+index+'" style="margin:10px 0;cursor:pointer;">'
                      + ch.name
                      + '</div>';
            });

            html += '</div>';

            _this.colG.html(html);

            _this.colG.find('div[data-index]').on('click', function(){

                var index = $(this).data('index');
                showChannelEPG(channels[index]);
            });
        };

        function showChannelEPG(item){

            _this.colE.empty();

            if (!item.tid) {
                epgLog('У каналу немає tvg-id');
                return;
            }

            epgLog('Перевірка tvg-id: ' + item.tid);

            if (!EPG[item.tid]) {
                epgLog('❌ Не знайдено в EPG: ' + item.tid);
                return;
            }

            var list = EPG[item.tid];

            _this.colE.html(
                '<div style="padding:20px;font-size:18px;">'
                + '<h2>' + item.name + '</h2>'
                + list.slice(0,10).map(function(e){
                    return '<div style="margin-bottom:6px;">• ' + e.title + '</div>';
                }).join('')
                + '</div>'
            );
        }

        var component = this;
    }

    Lampa.Component.add('iptv_epg_debug_simple', IPTVComponent);

    Lampa.Template.add('iptv_epg_debug_simple', '<div></div>');

    Lampa.Activity.add({
        id: 'iptv_epg_debug_simple',
        title: 'IPTV EPG Debug',
        component: 'iptv_epg_debug_simple',
        icon: 'settings'
    });

})();
