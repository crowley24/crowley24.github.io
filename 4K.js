(function () {
    'use strict';

    function normalize(text) {
        return (text || '').toLowerCase();
    }

    function isUA(t) {
        t = normalize(t.title);
        return t.includes('ukr') ||
               t.includes('ua') ||
               t.includes('україн') ||
               t.includes('dub') ||
               t.includes('dvo');
    }

    function isDV(t) {
        t = normalize(t.title);
        return t.includes('dolby vision') ||
               t.includes('dovi') ||
               t.includes('.dv') ||
               t.includes(' dv ');
    }

    function sortBest(arr) {
        return arr.sort((a, b) => (b.size || 0) - (a.size || 0));
    }

    function findBest(list) {
        if (!list || !list.length) return null;

        let ua = list.filter(isUA);
        let ua_dv = ua.filter(isDV);

        if (ua_dv.length) return sortBest(ua_dv)[0];
        if (ua.length) return sortBest(ua)[0];

        return null;
    }

    function smartPlay(card, original) {
        Lampa.Noty.show('Пошук UA DV...');

        try {
            Lampa.Torrents.list(card, function (items) {
                let best = findBest(items || []);

                if (best) {
                    Lampa.Player.play(best);
                } else {
                    Lampa.Noty.show('Нічого не знайдено — відкриваю список');
                    original(); // fallback
                }
            });
        } catch (e) {
            console.log('UA DV error', e);
            original();
        }
    }

    function intercept() {
        let orig = Lampa.Torrents.open;

        if (!orig || orig._ua_dv) return;

        Lampa.Torrents.open = function (card) {
            smartPlay(card, () => orig.call(this, card));
        };

        Lampa.Torrents.open._ua_dv = true;

        console.log('UA DV override enabled');
    }

    function init() {
        intercept();
    }

    if (window.Lampa) init();
    else window.addEventListener('lampa', init);

})();
