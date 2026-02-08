// ==Lampa==
// name: IPTV Clean Adaptive
// version: 7.4
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    const style = `
        <style id="iptv-v74-style">
            .iptv-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0b0d10; z-index: 1000; padding-top: 5rem; box-sizing: border-box; }
            .iptv-wrapper { display: flex; width: 100%; height: 100%; overflow: hidden; }
            
            .iptv-col { height: 100%; overflow-y: auto; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.05); transition: width 0.3s; }
            
            /* Десктопні розміри */
            .col-groups { width: 20rem; flex-shrink: 0; }
            .col-channels { flex: 1; }
            .col-details { width: 25rem; flex-shrink: 0; background: #080a0d; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; }
            
            /* Адаптація під мобільні (екран < 768px) */
            @media screen and (max-width: 768px) {
                .col-details { display: none; } /* Ховаємо праву панель на мобільних */
                .col-groups { width: 40%; }
                .iptv-item { font-size: 1rem !important; padding: 0.8rem !important; }
            }

            .iptv-item { 
                padding: 1rem; margin: 0.3rem 0.8rem; border-radius: 0.5rem; 
                background: rgba(255,255,255,0.03); color: #fff; 
                border: 2px solid transparent; cursor: pointer;
                font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .iptv-item.active { background: #2962ff !important; border-color: #fff; }
            
            /* Виправлення ЛОГО */
            .info-logo-container { width: 100%; max-width: 15rem; aspect-ratio: 16/9; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); border-radius: 0.5rem; overflow: hidden; }
            .info-logo { max-width: 100%; max-height: 100%; object-fit: contain; }
            
            .info-title { font-size: 1.6rem; font-weight: bold; color: #fff; margin-bottom: 0.5rem; text-align: center; width: 100%; }
            .info-desc { font-size: 1rem; color: rgba(255,255,255,0.5); text-align: center; }
            
            .loading-shimmer { padding: 2rem; text-align: center; color: #fff; }
        </style>
    `;

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups'; 
        var index_g = 0, index_c = 0;

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            
            container.append(colG, colC, colE);
            root.append(container);
            this.load();
            return root;
        };

        this.load = function () {
            colG.html('<div class="loading-shimmer">Завантаження...</div>');
            $.ajax({
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="iptv-item">Помилка завантаження</div>'); }
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
                    channels.push({name: n, group: g, logo: img, url: ''});
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
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click hover:enter', function() {
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
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click hover:enter', function() {
                    index_c = i; active_col = 'channels';
                    _this.updateFocus();
                });
                row.on('dblclick', function() { Lampa.Player.play({url: c.url, title: c.name}); });
                colC.append(row);
            });
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var g_item = colG.find('.iptv-item').eq(index_g);
            var c_item = colC.find('.iptv-item').eq(index_c);

            if (active_col === 'groups') {
                g_item.addClass('active');
                if(g_item[0]) g_item[0].scrollIntoView({block: "center"});
                this.setDetails('', g_item.text(), "Оберіть категорію");
            } else {
                c_item.addClass('active');
                if(c_item[0]) c_item[0].scrollIntoView({block: "center"});
                var chan = current_list[index_c];
                if (chan) this.setDetails(chan.logo, chan.name, "Натисніть OK для перегляду");
            }
        };

        this.setDetails = function(logo, title, desc) {
            var imgHtml = logo ? `<img src="${logo}" class="info-logo" onerror="this.style.display='none'">` : '<span style="font-size:3rem">📺</span>';
            colE.html(`
                <div class="info-logo-container">${imgHtml}</div>
                <div class="info-title">${title}</div>
                <div class="info-desc">${desc}</div>
            `);
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
        if (!$('#iptv-v74-style').length) $('head').append(style);
        Lampa.Component.add('iptv_clean', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_clean'});
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
