/* jshint esversion: 5 */
/* global $, Lampa */

(function () {
    'use strict';

    function IPTVUltra() {
        var root, colG, colC;
        var groups_data = {};
        var _this;

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
                    '.ch-logo { width: 45px; height: 45px; object-fit: contain; background: #000; border-radius: 6px; flex-shrink: 0; }' +
                    '.ch-info { flex: 1; overflow: hidden; }' +
                    '.ch-name { font-weight: bold; font-size: 1.1rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                    '.epg-text { font-size: 0.85rem; color: #30ffaa; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                    '.epg-bar-container { width: 100%; height: 4px; background: rgba(255,255,255,0.15); margin-top: 8px; border-radius: 2px; overflow: hidden; }' +
                    '.epg-bar-fill { height: 100%; background: #30ffaa; width: 0%; transition: width 0.4s ease; }' +
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
            colG.html('<div style="padding:20px; opacity:0.6;">Завантаження...</div>');
            var url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';
            
            var network = new Lampa.Reguest();
            network.silent(url, function (data) {
                if (data) _this.parse(data);
                else colG.html('<div style="padding:20px;">Порожньо</div>');
            }, function () {
                colG.html('<div style="padding:20px;">Помилка мережі</div>');
            }, false, { dataType: 'text' });
        };

        this.parse = function (data) {
            groups_data = {"УСІ": []};
            var lines = data.split('\n');
            var ch = null;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    var name = line.split(',').pop();
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

        // Винесена функція створення групи для уникнення проблем з циклом
        function createGroupItem(name) {
            var count = groups_data[name].length;
            var item = $('<div class="iptv-row group-item" data-name="' + name + '">' + name + ' (' + count + ')</div>');
            item.on('click', function () {
                $('.group-item').removeClass('active');
                $(this).addClass('active');
                _this.renderChannels(name);
            });
            return item;
        }

        this.renderGroups = function () {
            colG.empty();
            var names = Object.keys(groups_data);
            for (var i = 0; i < names.length; i++) {
                colG.append(createGroupItem(names[i]));
            }
            colG.find('.group-item').first().click();
        };

        // Винесена функція створення картки каналу
        function createChannelItem(ch, idx) {
            var card = $(
                '<div class="iptv-row chan-item">' +
                    '<div class="ch-header">' +
                        '<img src="' + ch.logo + '" class="ch-logo" onerror="this.src=\'https://placehold.co/100x100?text=TV\'">' +
                        '<div class="ch-info">' +
                            '<div class="ch-name">' + ch.name + '</div>' +
                            '<div class="epg-text" id="epg-t-' + idx + '">Завантаження...</div>' +
                            '<div class="epg-bar-container"><div class="epg-bar-fill" id="epg-b-' + idx + '"></div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );

            card.on('click', function () {
                Lampa.Player.play({ url: ch.url, title: ch.name });
            });

            return card;
        }

        this.renderChannels = function (groupName) {
            colC.empty().scrollTop(0);
            var list = groups_data[groupName] || [];
            for (var i = 0; i < list.length; i++) {
                colC.append(createChannelItem(list[i], i));
                this.loadEPG(list[i], i);
            }
        };

        this.loadEPG = function (ch, idx) {
            if (!Lampa.Tvg) return;
            Lampa.Tvg.get({name: ch.name, id: ch.tid}, function (data) {
                var txtEl = $('#epg-t-' + idx);
                var barEl = $('#epg-b-' + idx);
                
                if (data && data.list && data.list.length) {
                    var now = Date.now();
                    var cur = null;
                    for (var j = 0; j < data.list.length; j++) {
                        if (data.list[j].start <= now && data.list[j].stop >= now) {
                            cur = data.list[j];
                            break;
                        }
                    }
                    if (cur) {
                        var total = cur.stop - cur.start;
                        var elapsed = now - cur.start;
                        var per = Math.min(100, Math.max(0, (elapsed / total) * 100));
                        txtEl.text(cur.title);
                        barEl.css('width', per + '%');
                    } else {
                        txtEl.text('Немає ефіру');
                    }
                } else {
                    txtEl.text('Програма відсутня');
                }
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
        var menu_item = $(
            '<li class="menu__item selector">' +
                '<div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></div>' +
                '<div class="menu__text">IPTV PRO</div>' +
            '</li>'
        );

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_ultra' });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
