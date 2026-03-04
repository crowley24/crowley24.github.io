// ==Lampa==
// name: NewCard Apple Layout
// version: 2.1.0
// author: Eugene
// ==/Lampa==

(function () {
    'use strict';

    const COMPONENT = 'applecation_settings';
    let logoCache = new Map();

    /* -------------------- DEFAULTS -------------------- */

    const DEFAULTS = {
        enable: true,
        show_logo: true,
        show_description: true
    };

    /* -------------------- STYLES -------------------- */

    function addStyles() {
        if ($('#applecation-style').length) return;

        $('body').append(`
        <style id="applecation-style">
            .applecation-layout .full-start__body{
                display:flex;
            }

            .applecation-left{
                width:40%;
                padding:3em;
                display:flex;
                flex-direction:column;
                justify-content:center;
                z-index:2;
            }

            .apple-logo{
                margin-bottom:2em;
                opacity:0;
                transform:translateY(20px);
                transition:.4s;
            }

            .apple-logo.loaded{
                opacity:1;
                transform:translateY(0);
            }

            .apple-logo img{
                max-width:80%;
                max-height:180px;
            }

            .apple-meta{
                font-size:1.1em;
                margin-bottom:1em;
                opacity:.8;
            }

            .apple-desc{
                margin-top:1.5em;
                line-height:1.6;
                opacity:.85;
            }

            .applecation-layout .full-start__title{
                display:none !important;
            }
        </style>
        `);
    }

    /* -------------------- SETTINGS -------------------- */

    function addSettings() {

        Lampa.SettingsApi.addComponent({
            component: COMPONENT,
            name: 'NewCard Apple Layout',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: 'applecation_enable',
                type: 'trigger',
                default: DEFAULTS.enable
            },
            field: {
                name: 'Увімкнути Apple Layout'
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: 'applecation_show_logo',
                type: 'trigger',
                default: DEFAULTS.show_logo
            },
            field: {
                name: 'Показувати логотип'
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {
                name: 'applecation_show_description',
                type: 'trigger',
                default: DEFAULTS.show_description
            },
            field: {
                name: 'Показувати опис'
            }
        });
    }

    /* -------------------- LOGO -------------------- */

    function selectBestLogo(logos) {
        if (!logos || !logos.length) return null;

        return logos
            .filter(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en')
            .sort((a, b) => b.vote_average - a.vote_average)[0] || logos[0];
    }

    function loadLogo(movie, container) {

        if (!Lampa.Storage.get('applecation_show_logo')) return;

        const type = movie.name ? 'tv' : 'movie';
        const key = type + '_' + movie.id;

        function render(res){
            if (!res || !res.logos) return;

            const best = selectBestLogo(res.logos);
            if (!best) return;

            const url = Lampa.TMDB.image('/t/p/w500' + best.file_path);

            const img = new Image();
            img.onload = function(){
                container.html('<img src="'+url+'">');
                container.addClass('loaded');
            };
            img.src = url;
        }

        if (logoCache.has(key)) render(logoCache.get(key));
        else {
            $.get(Lampa.TMDB.api(`${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}`), function(res){
                logoCache.set(key, res);
                render(res);
            });
        }
    }

    /* -------------------- BUILD LAYOUT -------------------- */

    function build(e) {

        if (!Lampa.Storage.get('applecation_enable')) return;
        if (!e.object || !e.object.activity) return;

        const render = e.object.activity.render();
        const movie = e.data.movie;

        if (!render || !movie) return;
        if (render.hasClass('applecation-layout')) return;

        render.addClass('applecation-layout');

        const left = $('<div class="applecation-left"></div>');
        const logo = $('<div class="apple-logo"></div>');
        const meta = $('<div class="apple-meta"></div>');
        const desc = $('<div class="apple-desc"></div>');

        const year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        const genres = (movie.genres || []).slice(0,2).map(g=>g.name).join(' · ');
        const type = movie.name ? 'Серіал' : 'Фільм';

        meta.text(`${type} · ${year}${genres ? ' · '+genres : ''}`);

        if (Lampa.Storage.get('applecation_show_description'))
            desc.text(movie.overview || '');

        left.append(logo);
        left.append(meta);
        left.append(desc);

        render.find('.full-start__body').prepend(left);

        loadLogo(movie, logo);
    }

    /* -------------------- INIT -------------------- */

    function init(){
        addStyles();
        addSettings();

        Lampa.Listener.follow('full', function(e){
            if(e.type === 'complite'){
                setTimeout(()=>build(e), 50);
            }
        });
    }

    if(window.appready) init();
    else {
        Lampa.Listener.follow('app', function(e){
            if(e.type === 'ready') init();
        });
    }

})();
