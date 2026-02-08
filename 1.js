/* jshint esversion: 5 */
/* global $, Lampa */

(function () {
    'use strict';

    function IPTVUltra() {
        var root, colG, colC;
        var groups_data = {};
        var _this;

        var EPG_URL = 'https://iptvx.one/epg/epg.xml.gz';

        this.create = function () {
            _this = this;
            root = $('<div class="iptv-ultra-root"></div>');

            if (!$('#iptv-ultra-style').length) {
                $('head').append(
                    '<style id="iptv-ultra-style">' +
                    '.iptv-ultra-root{position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:1000;display:flex;padding-top:3.5rem;color:#fff;font-family:sans-serif}' +
                    '.col-groups{width:30%;background:#0d1013;border-right:1px solid rgba(255,255,255,.05);overflow-y:auto}' +
                    '.col-channels{flex:1;background:#0b0d10;overflow-y:auto;padding:10px}' +
                    '.iptv-row{padding:12px 15px;margin:5px;border-radius:8px;background:rgba(255,255,255,.03);cursor:pointer;border:2px solid transparent}' +
                    '.iptv-row.active{background:#2962ff!important;border-color:#fff}' +
                    '.ch-header{display:flex;gap:12px}' +
                    '.ch-logo{width:50px;height:50px;object-fit:contain;background:#000;border-radius:6px;flex-shrink:0}' +
                    '.ch-info{flex:1;overflow:hidden}' +
                    '.ch-name{font-weight:bold;font-size:1.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
                    '.epg-text{font-size:.9rem;color:#30ffaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:1.2rem}' +
                    '.epg-bar-container{width:100%;height:4px;background:rgba(255,255,255,.1);margin-top:6px;border-radius:2px;overflow:hidden}' +
                    '.epg-bar-fill{height:100%;background:#30ffaa;width:0%}' +
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
            var pl_url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';
            var network = new Lampa.Reguest();

            network.silent(pl_url, function (data) {
                if (!data) return;

                if (Lampa.Tvg) {
                    Lampa.Tvg.push(EPG_URL);
                }

                _this.parse(data);
            }, function () {
                colG.html('<div style="padding:20px;">Помилка завантаження</div>');
            }, false, { dataType: 'text' });
        };

        this.parse = function (data) {
            groups_data = { 'УСІ': [] };

            var lines = data.split('\n');
            var ch = null;

            lines.forEach(function (line) {
                line = line.trim();

                if (line.indexOf('#EXTINF') === 0) {
                    ch = {
                        name: line.split(',').pop().trim(),
                        grp: (line.match(/group-title="([^"]+)"/i) || [null, 'ІНШЕ'])[1],
                        logo: (line.match(/tvg-logo="([^"]+)"/i) || [null, ''])[1],
                        tid: (line.match(/tvg-id="([^"]+)"/i) || [null, ''])[1]
                    };
                }
                else if (line.indexOf('http') === 0 && ch) {
                    ch.url = line;

                    if (!groups_data[ch.grp]) groups_data[ch.grp] = [];
                    groups_data[ch.grp].push(ch);
                    groups_data['УСІ'].push(ch);

                    ch = null;
                }
            });

            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();

            Object.keys(groups_data).forEach(function (name) {
                var el = $('<div class="iptv-row group-item">' + name + ' (' + groups_data[name].length + ')</div>');
                el.on('click', function () {
                    $('.group-item').removeClass('active');
                    $(this).addClass('active');
                    _this.renderChannels(name);
                });
                colG.append(el);
            });

            colG.find('.group-item').first().click();
        };

        this.renderChannels = function (group) {
            colC.empty().scrollTop(0);

            (groups_data[group] || []).forEach(function (item) {
                var card = $(
                    '<div class="iptv-row selector">' +
                        '<div class="ch-header">' +
                            '<img class="ch-logo" src="' + item.logo + '" onerror="this.src=\'https://placehold.co/100x100?text=TV\'">' +
                            '<div class="ch-info">' +
                                '<div class="ch-name">' + item.name + '</div>' +
                                '<div class="epg-text">Завантаження...</div>' +
                                '<div class="epg-bar-container"><div class="epg-bar-fill"></div></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );

                card.on('click', function () {
                    Lampa.Player.play({ url: item.url, title: item.name });
                });

                colC.append(card);

                if (Lampa.Tvg) {
                    Lampa.Tvg.ready(function () {
                        Lampa.Tvg.get({
                            id: item.tid || item.name,
                            name: item.name
                        }, function (epg) {
                            if (!epg || !epg.list) {
                                card.find('.epg-text').text('EPG відсутній');
                                return;
                            }

                            var now = Date.now();
                            var prog = epg.list.filter(function (p) {
                                return p.start <= now && p.stop >= now;
                            })[0];

                            if (!prog) {
                                card.find('.epg-text').text('Немає програми');
                                return;
                            }

                            var percent = ((now - prog.start) / (prog.stop - prog.start)) * 100;
                            card.find('.epg-text').text(prog.title);
                            card.find('.epg-bar-fill').css('width', percent + '%');
                        });
                    });
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add('iptv_ultra', {
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

        var item = $('<li class="menu__item selector">' +
            '<div class="menu__ico">📺</div>' +
            '<div class="menu__text">IPTV PRO</div>' +
        '</li>');

        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_ultra' });
        });

        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });

})();
