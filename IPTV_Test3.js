// ==Lampa==
// name: IPTV PRO Final Fix
// version: 13.0
// author: Fix by ChatGPT
// ==/Lampa==

(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    function IPTVComponent() {
        var component = this;

        var html = $('<div class="iptv-root"></div>');
        var colGroups = $('<div class="iptv-groups"></div>');
        var colChannels = $('<div class="iptv-channels"></div>');
        var colEPG = $('<div class="iptv-epg"></div>');

        var groups = {};
        var channels = [];
        var current = null;

        /* =========================
           START (ОБОВʼЯЗКОВО)
        ========================= */
        component.start = function () {
            html.append(colGroups, colChannels, colEPG);
            loadPlaylists();
        };

        component.render = function () {
            return html;
        };

        component.destroy = function () {
            html.remove();
        };

        /* =========================
           LOAD PLAYLISTS
        ========================= */
        function loadPlaylists() {
            var pls = Lampa.Storage.get('iptv_pl', []);

            groups = {};
            channels = [];

            pls.forEach(function (pl) {
                if (!groups[pl.group]) groups[pl.group] = [];
                groups[pl.group].push(pl);
                channels.push(pl);
            });

            drawGroups();
        }

        /* =========================
           DRAW GROUPS
        ========================= */
        function drawGroups() {
            colGroups.empty();

            Object.keys(groups).forEach(function (name) {
                var btn = $('<div class="iptv-group selector"></div>');
                btn.text(name);

                btn.on('click', function () {
                    drawChannels(groups[name]);
                });

                colGroups.append(btn);
            });
        }

        /* =========================
           DRAW CHANNELS
        ========================= */
        function drawChannels(list) {
            colChannels.empty();
            colEPG.empty();

            list.forEach(function (item) {
                var card = $('<div class="iptv-channel selector"></div>');
                card.text(item.name);

                card.on('hover:enter', function () {
                    loadEPG(item, card);
                });

                card.on('click', function () {
                    Lampa.Player.play({
                        title: item.name,
                        url: item.url
                    });
                });

                colChannels.append(card);
            });
        }

        /* =========================
           EPG (ПРАВИЛЬНО)
        ========================= */
        function loadEPG(item, card) {
            colEPG.html('<div class="iptv-epg-loading">Завантаження EPG…</div>');

            Lampa.Tvg.get({
                id: item.tid || item.name,
                name: item.name
            }, function (epg) {

                colEPG.empty();

                if (!epg || !epg.list || !epg.list.length) {
                    colEPG.html('<div class="iptv-epg-empty">EPG недоступний</div>');
                    return;
                }

                epg.list.slice(0, 6).forEach(function (p) {
                    var row = $('<div class="iptv-epg-row"></div>');
                    row.text(
                        Lampa.Utils.parseTime(p.time_start) +
                        ' — ' +
                        p.title
                    );
                    colEPG.append(row);
                });
            });
        }
    }

    /* =========================
       REGISTER
    ========================= */
    Lampa.Component.add('iptv_pro_final', IPTVComponent);

    Lampa.Activity.push({
        component: 'iptv_pro_final',
        name: 'IPTV PRO'
    });

})();
