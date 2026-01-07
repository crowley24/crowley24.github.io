(function () {
    'use strict';

    if (!window.Lampa || Lampa.Manifest.app_digital < 300) return;

    const TMDB_KEY = Lampa.TMDB.api_key;
    const LOGO_LANGS = ['uk', 'en', 'ru', null];
    const CACHE_TIME = 24 * 60 * 60 * 1000;
    const CACHE_KEY = 'ni_logos_cache_v3';

    const cache = Lampa.Storage.get(CACHE_KEY, {});

    function saveCache() {
        Lampa.Storage.set(CACHE_KEY, cache);
    }

    function getCache(id) {
        const c = cache[id];
        if (!c) return null;
        if (Date.now() - c.time > CACHE_TIME) return null;
        return c.data;
    }

    function setCache(id, data) {
        cache[id] = {
            time: Date.now(),
            data: data
        };
        saveCache();
    }

    // ================== СТИЛІ ==================
    Lampa.Template.add('new_interface_style_v3', `
    <style>
        .new-interface-logos {
            position: absolute;
            left: 0.5em;
            bottom: 0.5em;
            right: 0.5em;
            display: flex;
            gap: 0.4em;
            flex-wrap: wrap;
            pointer-events: none;
        }

        .new-interface-logos img {
            height: 1.6em;
            background: rgba(0,0,0,0.6);
            padding: 0.25em 0.4em;
            border-radius: 0.3em;
            max-width: 100%;
            object-fit: contain;
        }

        /* вертикальні картки */
        .new-interface .card {
            width: 13em;
        }

        .new-interface .card .card__view {
            padding-bottom: 150%;
        }
    </style>
    `);

    $('body').append(Lampa.Template.get('new_interface_style_v3', {}, true));

    // ================== ЛОГОТИПИ ==================
    function loadLogos(movie, callback) {
        const cached = getCache(movie.id);
        if (cached) {
            callback(cached);
            return;
        }

        const url = `https://api.themoviedb.org/3/${movie.movie ? 'movie' : 'tv'}/${movie.id}/images?api_key=${TMDB_KEY}`;

        new Lampa.Reguest().silent(url, function (json) {
            const logos = [];

            if (json && json.logos && json.logos.length) {
                LOGO_LANGS.forEach(lang => {
                    const found = json.logos.find(l => l.iso_639_1 === lang);
                    if (found) logos.push(found);
                });
            }

            setCache(movie.id, logos);
            callback(logos);
        }, function () {
            callback([]);
        });
    }

    function drawLogos(card, movie) {
        if (!card || !movie) return;

        let container = card.querySelector('.new-interface-logos');
        if (container) container.remove();

        loadLogos(movie, function (logos) {
            if (!logos.length) return;

            container = document.createElement('div');
            container.className = 'new-interface-logos';

            logos.slice(0, 3).forEach(logo => {
                const img = document.createElement('img');
                img.src = 'https://image.tmdb.org/t/p/w300' + logo.file_path;
                container.appendChild(img);
            });

            card.appendChild(container);
        });
    }

    // ================== ОБГОРТКА КАРТОК ==================
    function wrapCards() {
        const original = Lampa.Card.create;

        Lampa.Card.create = function (data, params) {
            params = params || {};
            params.style = params.style || {};
            params.style.name = 'normal';

            const card = original.call(this, data, params);

            setTimeout(() => {
                drawLogos(card, data);
            }, 0);

            return card;
        };
    }

    // ================== СТАРТ ==================
    function startPluginV3() {
        if (window.__new_interface_logos_v3) return;
        window.__new_interface_logos_v3 = true;

        wrapCards();
        console.log('[New Interface Logos v3] loaded');
    }

    startPluginV3();

})();
