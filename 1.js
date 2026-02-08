// ==Lampa==
// name: IPTV Ultra + Real EPG
// version: 7.6
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    const style = `
        <style id="iptv-v76-style">
            .iptv-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0b0d10; z-index: 1000; padding-top: 4rem; box-sizing: border-box; }
            .iptv-wrapper { display: flex; width: 100%; height: 100%; overflow: hidden; }
            .iptv-col { height: 100%; overflow-y: auto; background: rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.05); }
            .col-groups { width: 30%; flex-shrink: 0; background: #0d1013; }
            .col-channels { flex: 1; background: #0b0d10; }
            .iptv-item { 
                padding: 0.8rem 1rem; margin: 0.3rem 0.5rem; border-radius: 0.5rem; 
                background: rgba(255,255,255,0.03); color: #fff; 
                display: flex; align-items: center; gap: 1rem;
                border: 2px solid transparent; cursor: pointer;
            }
            .iptv-item.active { background: #2962ff !important; border-color: rgba(255,255,255,0.3); }
            .item-logo { width: 2.8rem; height: 2.8rem; object-fit: contain; background: rgba(0,0,0,0.2); border-radius: 0.3rem; flex-shrink: 0; }
            .item-text { font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; line-height: 1.2; }
            .item-epg-name { font-size: 0.8rem; color: #30ffaa; margin-top: 0.2rem; display: block; overflow: hidden; text-overflow: ellipsis; }
            .item-epg-progress { width: 100%; height: 2px; background: rgba(255,255,255,0.1); margin-top: 4px; border-radius: 2px; overflow: hidden; }
            .item-epg-bar { height: 100%; background: #30ffaa; width: 0%; }
        </style>
    `;

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups'; 
        var index_g = 0, index_c = 0;

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            container.append(colG, colC);
            root.append(container);
            this.load();
            return root;
        };

        this.load = function () {
            colG.html('<div style="padding:2rem;color:#fff">Завантаження...</div>');
            $.ajax({
                url: 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u',
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="iptv-item">Помилка</div>'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var channels = [];
            groups_data = {}; 
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,'Без назви'])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var img = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var tid = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    channels.push({name: n, group: g, logo: img, tid: tid, url: ''});
                } else if (l.indexOf('http') === 0 && channels.length > 0) {
                    var last = channels[channels.length - 1];
                    if (!last.url) {
                        last.url = l;
                        if (!groups_data[last.group]) groups_data[last.group] = [];
                        groups_data[last.group].push(last);
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function(g, i) {
                var item = $(`<div class="iptv-item"><div class="item-text">${g}</div></div>`);
                item.on('click', function() {
                    index_g = i; active_col = 'groups';
                    _this.renderC();
                });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function () {
            colC.empty();
            var g_name = Object.keys(groups_data)[index_g];
            current_list = groups_data[g_name] || [];
            current_list.forEach(function(c, i) {
                var img = c.logo ? `<img src="${c.logo}" class="item-logo" onerror="this.src='https://placehold.co/100x100?text=TV'">` : `<div class="item-logo" style="display:flex;align-items:center;justify-content:center;background:#222">📺</div>`;
                
                var row = $(`
                    <div class="iptv-item" id="chan-${i}">
                        ${img}
                        <div class="item-text">
                            <div class="chan-name">${c.name}</div>
                            <div class="item-epg-name" id="epg-name-${i}">Програма відсутня</div>
                            <div class="item-epg-progress"><div class="item-epg-bar" id="epg-bar-${i}"></div></div>
                        </div>
                    </div>
                `);

                row.on('click', function() {
                    index_c = i; active_col = 'channels';
                    _this.updateFocus();
                    Lampa.Player.play({url: c.url, title: c.name});
                });
                colC.append(row);
                _this.getEPG(c, i);
            });
            this.updateFocus();
        };

        this.getEPG = function(channel, id) {
            Lampa.Tvg.get({
                name: channel.name,
                id: channel.tid
            }, function(data) {
                if(data && data.list && data.list.length) {
                    var current = data.list.find(e => e.start <= Date.now() && e.stop >= Date.now());
                    if(current) {
                        $(`#epg-name-${id}`).text(current.title);
                        var total = current.stop - current.start;
                        var elapsed = Date.now() - current.start;
                        var percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
                        $(`#epg-bar-${id}`).css('width', percent + '%');
                    }
                }
            });
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var g_item = colG.find('.iptv-item').eq(index_g);
            var c_item = colC.find('.iptv-item').eq(index_c);
            if (active_col === 'groups') {
                g_item.addClass('active');
                if(g_item[0]) g_item[0].scrollIntoView({block: "center"});
            } else {
                c_item.addClass('active');
                if(c_item[0]) c_item[0].scrollIntoView({block: "center"});
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_clean', {
                toggle: function () {},
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(Object.keys(groups_data).length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') { active_col = 'channels'; index_c = 0; _this.renderC(); }
                },
                left: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else { Lampa.Activity.back(); }
                },
                enter: function () {
                    if (active_col === 'groups') { active_col = 'channels'; index_c = 0; _this.renderC(); }
                    else { 
                        var chan = current_list[index_c];
                        if (chan) Lampa.Player.play({url: chan.url, title: chan.name}); 
                    }
                },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_clean');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove('iptv_clean'); root.remove(); };
    }

    function init() {
        if (!$('#iptv-v76-style').length) $('head').append(style);
        Lampa.Component.add('iptv_clean', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV PRO', component: 'iptv_clean'});
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
