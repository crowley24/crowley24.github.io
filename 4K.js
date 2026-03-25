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

    function play(torrent) {
        if (!torrent) {
            Lampa.Noty.show('Немає українського дубляжу 😢');
            return;
        }

        Lampa.Player.play(torrent);
    }

    function loadAndPlay(card) {
        Lampa.Noty.show('Пошук UA DV...');

        try {
            Lampa.Torrents.list(card, function (items) {
                let best = findBest(items || []);
                play(best);
            });
        } catch (e) {
            log('ERROR:', e);
        }
    }

    function insertButton() {
        let container = document.querySelector('.full-start__buttons');

        if (!container) return;

        if (container.querySelector('.ua-dv-btn')) return;

        let btn = document.createElement('div');
        btn.className = 'full-start__button selector ua-dv-btn';
        btn.innerText = '⚡ UA DV';

        btn.addEventListener('click', function () {
            let card = Lampa.Activity.active().card;
            if (card) loadAndPlay(card);
        });

        container.appendChild(btn);

        log('button added');
    }

    function waitAndInsert() {
        let tries = 0;

        let timer = setInterval(function () {
            insertButton();

            tries++;
            if (tries > 20) clearInterval(timer);
        }, 300);
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                waitAndInsert();
            }
        });

        log('init');
    }

    if (window.Lampa) init();
    else window.addEventListener('lampa', init);

})();
