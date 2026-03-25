(function () {
    'use strict';

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

        if (ua_dv.length) return sortBest(ua_dv)[0];
        if (ua.length) return sortBest(ua)[0];

        return null;
    }

    function play(card) {
        Lampa.Noty.show('Пошук UA DV...');

        Lampa.Torrents.list(card, function (items) {
            let best = findBest(items || []);

            if (!best) {
                Lampa.Noty.show('Немає українського дубляжу 😢');
                return;
            }

            Lampa.Player.play(best);
        });
    }

    function addButtonToController(controller) {
        if (!controller || controller._ua_dv_added) return;

        controller._ua_dv_added = true;

        controller.append({
            title: '⚡ UA DV',
            icon: 'star',
            onClick: function () {
                let card = Lampa.Activity.active().card;
                if (card) play(card);
            }
        });

        log('button added via controller');
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                let activity = Lampa.Activity.active();

                if (activity && activity.controller) {
                    addButtonToController(activity.controller);
                }
            }
        });

        log('init OK');
    }

    if (window.Lampa) init();
    else window.addEventListener('lampa', init);

})();
