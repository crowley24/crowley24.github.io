/* jshint esversion: 5 */
/* global $, Lampa */

(function () {
    'use strict';

    function IPTVUltra() {
        var root, colG, colC;
        var groups_data = {};
        var _this;
        var detected_epg = ''; // Сюди запишемо посилання з плейлиста

        this.create = function () {
            _this = this;
            root = $('<div class="iptv-ultra-root"></div>');
            
            if (!$('#iptv-ultra-style').length) {
                $('head').append(
                    '<style id="iptv-ultra-style">' +
                    '.iptv-ultra-root { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 1000; display: flex; padding-top: 3.5rem; color: #fff; font-family: sans-serif; }' +
                    '.col-groups { width: 30%; background: #0d1013; border-right: 1px solid rgba(255,255,255,0.05); overflow-y: auto; }' +
                    '.col-channels { flex: 1; background: #0b0d10; overflow-y: auto; padding: 10px; }' +
                    '.iptv-row { padding: 12px 15px; margin: 5px; border-radius: 8px; background: rgba(255,255,255,0.03); cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }' +
                    '.iptv-row.active { background: #2962ff !important; border-color: #fff; }' +
                    '.ch-header { display: flex; align-items: center; gap: 12px; }' +
                    '.ch-logo { width: 50px; height: 50px; object-fit: contain; background: #000; border-radius: 6px; flex-shrink: 0; }' +
                    '.ch-info { flex: 1; overflow: hidden; }' +
                    '.ch-name { font-weight: bold; font-size: 1.1rem; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                    '.epg-text { font-size: 0.9rem; color: #30ffaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-height: 1.2rem; }' +
                    '.epg-bar-container { width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 6px; border-radius: 2px; overflow: hidden; }' +
                    '.epg-bar-fill { height: 100%; background: #30ffaa; width: 0%; transition: width 0.3s; }' +
                    '</style>'
                );
            }

            colG = $('<div class="col-groups"></div>');
            colC = $('<div class="col-channels"></div>');
            root.append(colG, colC);
            
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            colG.html('<div style="padding:20px; opacity:0.5;">...</div>');
            var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';
            var network = new Lampa.Reguest();
            network.silent(pl_url, function (data) {
                if (data) {
                    _this.extractEPG(data);
                    _this.parse(data);
                }
            }, function () {
                colG.html('<div style="padding:20px;">Помилка</div>');
            }, false, { dataType: 'text' });
        };

        // НОВА ФУНКЦІЯ: Шукаємо EPG у самому плейлисті
        this.extractEPG = function(data) {
            var match = data.match(/url-tvg="([^"]+)"/i);
            if (match && match[1]) {
                detected_epg = match[1];
                console.log('IPTV Ultra: Found EPG in playlist:', detected_epg);
                if (Lampa.Tvg && Lampa.Tvg.push) {
                    Lampa.Tvg.push(detected_epg);
                }
            }
        };

        this.parse = function (data) {
            groups_data = {"УСІ": []};
            var lines = data.split('\n');
            var ch = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    var name = line.split(',').pop().trim();
                    var grp = (line.match(/group-title="([^"]+)"/i) || [null, 'ІНШЕ'])[1];
                    var logo = (line.match(/tvg-logo="([^"]+)"/i) || [null, ''])[1];
                    var tid = (line.match(/tvg-id="([^"]+)"/i) || [null, ''])[1];
                    ch = { name: name, grp: grp, logo: logo, tid: tid };
                } else if (line.indexOf('http') === 0 && ch) {
                    ch.url = line;
                    if (!groups_data[ch.grp]) groups_data[ch.grp] = [];
                    groups_data[ch.grp].push(ch);
                    groups_data["УСІ"].push(ch);
                    ch = null;
                }
            }
            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function(name) {
                var item = $('<div class="iptv-row group-item">' + name + ' (' + groups_data[name].length + ')</div>');
                item.on('click', function () {
                    $('.group-item').removeClass('active');
                    $(this).addClass('active');
                    _this.renderChannels(name);
                });
                colG.append(item);
            });
            colG.find('.group-item').first().click();
        };

        this.renderChannels = function (groupName) {
            colC.empty().scrollTop(0);
            var list = groups_data[groupName] || [];
            list.forEach(function(ch, i) {
                var card = $(
                    '<div class="iptv-row chan-item">' +
                        '<div class="ch-header">' +
                            '<img src="' + ch.logo + '" class="ch-logo" onerror="this.src=\'https://placehold.co/100x100?text=TV\'">' +
                            '<div class="ch-info">' +
                                '<div class="ch-name">' + ch.name + '</div>' +
                                '<div class="epg-text" id="epg-t-' + i + '">...</div>' +
                                '<div class="epg-bar-container"><div class="epg-bar-fill" id="epg-b-' + i + '"></div></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );
                card.on('click', function () { Lampa.Player.play({ url: ch.url, title: ch.name }); });
                colC.append(card);
                _this.applyEPG(ch, i);
            });
        };

        this.applyEPG = function (ch, idx) {
            if (!Lampa.Tvg) return;

            // Запит з використанням динамічного EPG
            Lampa.Tvg.get({id: ch.tid, name: ch.name, url: detected_epg}, function(data) {
                var txt = $('#epg-t-' + idx);
                var bar = $('#epg-b-' + idx);
                
                if (data && data.list && data.list.length) {
                    var now = Date.now();
                    var current = null;
                    for (var j = 0; j < data.list.length; j++) {
                        if (data.list[j].start <= now && data.list[j].stop >= now) {
                            current = data.list[j];
                            break;
                        }
                    }
                    if (current) {
                        var per = Math.round(((now - current.start) / (current.stop - current.start)) * 100);
                        txt.text(current.title);
                        bar.css('width', per + '%');
                    } else { txt.text('Немає програми'); }
                } else { txt.text('Програма відсутня'); }
            });
        };

        this.start = function () {
            Lampa.Controller.add('iptv_ultra', {
                toggle: function () {},
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_ultra');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_ultra', IPTVUltra);
        var menu_item = $('<li class="menu__item selector"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></div><div class="menu__text">IPTV PRO</div></li>');
        menu_item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_ultra' }); });
        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
