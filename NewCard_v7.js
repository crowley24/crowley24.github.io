// ==Lampa==
// name: NewCard Apple Layout (Safe)
// version: 2.0.0
// author: Eugene
// ==/Lampa==

(function () {
    'use strict';

    const PLUGIN_ID = 'applecation_safe';

    let logoCache = new Map();

    /* -------------------- CSS -------------------- */

    function addStyles() {
        if ($('#applecation-style').length) return;

        $('body').append(`
        <style id="applecation-style">
            .applecation-layout .full-start__body {
                display:flex;
                justify-content:flex-start;
            }

            .applecation-left {
                width:40%;
                padding:3em;
                display:flex;
                flex-direction:column;
                justify-content:center;
                z-index:2;
            }

            .applecation-left .apple-logo {
                margin-bottom:2em;
                opacity:0;
                transform:translateY(20px);
                transition:all .4s ease;
            }

            .applecation-left .apple-logo.loaded {
                opacity:1;
                transform:translateY(0);
            }

            .applecation-left .apple-logo img{
                max-width:80%;
                max-height:180px;
            }

            .applecation-left .apple-meta{
                font-size:1.1em;
                margin-bottom:1em;
                opacity:.8;
            }

            .applecation-left .apple-desc{
                margin-top:1.5em;
                line-height:1.6;
                opacity:.85;
            }

            .applecation-layout .full-start__right{
                width:60%;
            }

            .applecation-layout .full-start__title{
                display:none !important;
            }
        </style>
        `);
    }

    /* -------------------- Logo Loader -------------------- */

    function selectBestLogo(logos) {
        if (!logos || !logos.length) return null;

        const find = (l) =>
            logos
                .filter(a => a.iso_639_1 === l)
                .sort((a, b) => b.vote_average - a.vote_average)[0];

        return find('uk') || find('en') || logos[0] || null;
    }

    function loadLogo(movie, container) {
        if (!movie || !movie.id) return;

        const type = movie.name ? 'tv' : 'movie';
        const cacheKey = type + '_' + movie.id;

        const renderLogo = (res) => {
            if (!res || !res.logos) return;

            const best = selectBestLogo(res.logos);
            if (!best) return;

            const url = Lampa.TMDB.image('/t/p/w500' + best.file_path);

            const img = new Image();
            img.onload = function () {
                container.html(`<img src="${url}">`);
                container.addClass('loaded');
            };
            img.src = url;
        };

        if (logoCache.has(cacheKey)) {
            renderLogo(logoCache.get(cacheKey));
        } else {
            const url = `${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}`;
            $.get(Lampa.TMDB.api(url), function (res) {
                logoCache.set(cacheKey, res);
                renderLogo(res);
            });
        }
    }

    /* -------------------- Layout Builder -------------------- */

    function buildLayout(e) {
        if (!e.object || !e.object.activity) return;

        const activity = e.object.activity;
        const render = activity.render();
        const movie = e.data.movie;

        if (!render || !movie) return;

        // Захист від повторного запуску
        if (render.hasClass('applecation-layout')) return;

        render.addClass('applecation-layout');

        const left = $('<div class="applecation-left"></div>');
        const logo = $('<div class="apple-logo"></div>');
        const meta = $('<div class="apple-meta"></div>');
        const desc = $('<div class="apple-desc"></div>');

        const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        const genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' · ');
        const type = movie.name ? 'Серіал' : 'Фільм';

        meta.text(`${type} · ${year} ${genres ? '· ' + genres : ''}`);
        desc.text(movie.overview || '');

        left.append(logo);
        left.append(meta);
        left.append(desc);

        render.find('.full-start__body').prepend(left);

        loadLogo(movie, logo);
    }

    /* -------------------- Init -------------------- */

    function initialize() {
        addStyles();

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                setTimeout(() => buildLayout(e), 50);
            }
        });
    }

    if (window.appready) initialize();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initialize();
        });
    }

})();
