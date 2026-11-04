(function () {
    'use strict';

    /*
     * CARD TRAILER BACKGROUND & LOGO PLUGIN v1.1
     * Переносить стиль оформлення з КіноТрейлерів у повну картку Lampa
     */

    if (!window.Lampa || !window.$) return;
    if (window.card_trailer_bg_plugin) return;

    window.card_trailer_bg_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    // --------------------------------------------------
    // CSS СТИЛІ
    // --------------------------------------------------
    var css = '' +
        '.full.view--full .full__background {' +
            'background-size: cover !important;' +
            'background-position: center !important;' +
            'opacity: 1 !important;' +
        '}' +
        '.full.view--full .full__background::after {' +
            'content: "";' +
            'position: absolute;' +
            'left: 0; top: 0; width: 100%; height: 100%;' +
            'background: linear-gradient(to top, rgba(0,0,0,.94) 0%, rgba(0,0,0,.65) 48%, transparent 100%) !important;' +
            'pointer-events: none;' +
            'z-index: 1;' +
        '}' +
        '.full__center .full__title-logo {' +
            'display: block;' +
            'max-width: 28em;' +
            'max-height: 7em;' +
            'object-fit: contain;' +
            'object-position: left center;' +
            'margin-bottom: .5em;' +
        '}' +
    '';

    $('head').append('<style>' + css + '</style>');

    // --------------------------------------------------
    // ФУНКЦІЇ ВИБОРУ ЛОГОТИПУ
    // --------------------------------------------------
    function pickLogo(logos) {
        var lang = Lampa.Storage.field('tmdb_lang') || 'uk';
        var order = [lang, 'en', null];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (l) {
                return l.iso_639_1 === order[i];
            })[0];
            if (found) return found;
        }
        return logos[0] || null;
    }

    // --------------------------------------------------
    // СЛУХАЧ ПОДІЙ КАРТКИ
    // --------------------------------------------------
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite' || e.type === 'start') {
            var render = e.object.render();
            var data = e.data;

            if (!data || !data.id) return;

            // 1. Примусове встановлення якісного фону (backdrop)
            if (data.backdrop_path) {
                var bgUrl = Lampa.Api.img(data.backdrop_path, 'w1280');
                
                setTimeout(function() {
                    var bgBlock = render.find('.full__background');
                    if (bgBlock.length) {
                        bgBlock.css('background-image', 'url(' + bgUrl + ')');
                    }
                }, 50);
            }

            // 2. Завантаження та підстановка логотипу TMDB
            var titleContainer = render.find('.full__title');
            if (titleContainer.length && tmdb && tmdb.get) {
                var method = (data.name || data.media_type === 'tv') ? 'tv' : 'movie';
                var lang = (Lampa.Storage.field('tmdb_lang') || 'uk') + ',en,null';

                tmdb.get(method + '/' + data.id + '/images', {
                    filter: { include_image_language: lang }
                }, function (json) {
                    var logo = json.logos && json.logos.length ? pickLogo(json.logos) : null;
                    if (logo && logo.file_path) {
                        var logoUrl = Lampa.Api.img(logo.file_path, 'w500');
                        
                        var logoImg = titleContainer.find('.full__title-logo');
                        if (!logoImg.length) {
                            logoImg = $('<img class="full__title-logo">');
                            titleContainer.html(logoImg);
                        }
                        logoImg.attr('src', logoUrl);
                    }
                }, function () {});
            }
        }
    });

})();
