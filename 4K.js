(function () {
    'use strict';

    var PLUGIN_ID = 'auto_ua_dv_player';

    function log() {
        console.log('[UA DV]', ...arguments);
    }

    function normalize(text) {
        return (text || '').toLowerCase();
    }

    function isUA(torrent) {
        let t = normalize(torrent.title);

        return t.includes('ukr') ||
               t.includes('ua') ||
               t.includes('україн') ||
               t.includes('dub') ||
               t.includes('dvo');
    }

    function isDV(torrent) {
        let t = normalize(torrent.title);

        return t.includes('dolby vision') ||
               t.includes(' dv ') ||
               t.includes('.dv') ||
               t.includes('dovi');
    }

    function sortBest(list) {
        return list.sort(function (a, b) {
            return (b.size || 0) - (a.size || 0);
        });
    }

    function findBest(torrents) {
        if (!torrents || !torrents.length) return null;

        let ua = torrents.filter(isUA);
        let ua_dv = ua.filter(isDV);

        log('UA:', ua.length, 'UA+DV:', ua_dv.length);

        if (ua_dv.length) {
            return sortBest(ua_dv)[0];
        }

        if (ua.length) {
            return sortBest(ua)[0];
        }

        return null;
    }

    function showNotFound() {
        Lampa.Noty.show('Немає українського дубляжу 😢');
    }

    function play(torrent) {
        if (!torrent) return showNotFound();

        log('PLAY:', torrent.title);

        Lampa.Player.play(torrent);
    }

    function loadTorrents(card, callback) {
        try {
            Lampa.Torrents.list(card, function (items) {
                callback(items || []);
            });
        } catch (e) {
            log('ERROR LOAD:', e);
            callback([]);
        }
    }

    function addButton(card) {
        if (!card || card._ua_dv_added) return;
        card._ua_dv_added = true;

        let button = $(`<div class="full-start__button selector">
            ⚡ UA DV
        </div>`);

        button.on('hover:enter', function () {
            Lampa.Noty.show('Пошук UA + Dolby Vision...');
            
            loadTorrents(card, function (torrents) {
                let best = findBest(torrents);
                play(best);
            });
        });

        card.buttons().append(button);
    }

    function init() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                addButton(event.object);
            }
        });

        log('initialized');
    }

    if (window.Lampa) {
        init();
    } else {
        window.addEventListener('lampa', init);
    }

})();
