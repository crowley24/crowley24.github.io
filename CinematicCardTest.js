(function () {
    'use strict';

    /*
     * CARD TRAILER INTERFACE OVERLAY PLUGIN (Apple TV / Trailers Style for Full Card)
     */

    if (!window.Lampa || !window.$) return;
    if (window.card_trailers_full_plugin) return;

    window.card_trailers_full_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    // Стилі, адаптовані під повну картку Lampa з урахуванням дизайну КіноТрейлерів
    var css = '' +
        '.full.view--full .full__background{' +
            'position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;' +
            'background-size:cover!important;background-position:center!important;transform:scale(1.01);z-index:0;' +
        '}' +
        '.full.view--full .full__background::after {' +
            'content:"";position:absolute;left:0;top:0;width:100%;height:100%;' +
            'background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.65) 48%,transparent 100%)!important;' +
            'pointer-events:none;z-index:1;' +
        '}' +
        '.full.view--full .full__title, .full.view--full .full__info, .full.view--full .full__descr, .full.view--full .full__left {' +
            'display:none!important;' +
        '}' +
        '.card-tfeed-info{' +
            'position:absolute!important;left:0!important;right:0!important;bottom:0!important;' +
            'padding:5em 10em 2.5em 3em!important;z-index:10!important;' +
        '}' +
        '.card-tfeed-logo{' +
            'display:block;max-width:30em;max-height:8em;margin-bottom:.5em;' +
            'object-fit:contain;object-position:left center;' +
        '}' +
        '.card-tfeed-title{' +
            'font-size:2.6em;font-weight:700;text-shadow:0 2px 12px #000;color:#fff;line-height:1.1;margin-bottom:.3em;' +
        '}' +
        '.card-tfeed-meta{' +
            'font-size:1.25em;opacity:.82;margin-top:.4em;color:#fff;' +
        '}' +
        '.card-tfeed-descr{' +
            'font-size:1.15em;opacity:.76;margin-top:.65em;max-width:70%;' +
            'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;color:#fff;' +
        '}' +
    '';

    $('head').append('<style>' + css + '</style>');

    function pickLogo(logos) {
        var lang = Lampa.Storage.field('tmdb_lang') || 'uk';
        var order = [lang, 'en', null];
        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (l) { return l.iso_639_1 === order[i]; })[0];
            if (found) return found;
        }
        return logos[0] || null;
    }

    // Перехоплюємо стандартний компонент повної картки 'full'
    var OrigFull = Lampa.Component.get('full');

    if (OrigFull) {
        Lampa.Component.add('full', function (object) {
            var comp = new OrigFull(object);
            var superCreate = comp.create;

            comp.create = function () {
                var render = superCreate.apply(this, arguments);
                var data = object.card || object;

                if (data && data.id) {
                    // 1. Встановлюємо фонове зображення з високою якістю (backdrop)
                    if (data.backdrop_path) {
                        var bgUrl = Lampa.Api.img(data.backdrop_path, 'w1280');
                        setTimeout(function() {
                            render.find('.full__background').css('background-image', 'url(' + bgUrl + ')');
                        }, 10);
                    }

                    // 2. Формуємо метадані (Рік, Рейтинг, Жанри)
                    var date = data.release_date || data.first_air_date || '';
                    var method = (data.name || data.media_type === 'tv' || object.method === 'tv') ? 'tv' : 'movie';
                    
                    var genresNames = [];
                    if (tmdb.genres && tmdb.genres[method] && data.genre_ids) {
                        genresNames = tmdb.getGenresNameFromIds(method, data.genre_ids).slice(0, 3);
                    } else if (data.genres && Array.isArray(data.genres)) {
                        genresNames = data.genres.map(function(g) { return g.name; }).slice(0, 3);
                    }

                    var metaText = [
                        date.slice(0, 4),
                        data.vote_average ? '★ ' + Number(data.vote_average).toFixed(1) : '',
                        genresNames.join(', ')
                    ].filter(Boolean).join(' · ');

                    var movieTitle = data.title || data.name || data.original_title || data.original_name || '';
                    var overviewText = data.overview || '';

                    // 3. Інжектуємо блок інформації в стилі КіноТрейлерів всередину .full__center
                    setTimeout(function() {
                        var centerBlock = render.find('.full__center');
                        if (!centerBlock.length) return;

                        centerBlock.find('.card-tfeed-info').remove();

                        var infoHtml = $(
                            '<div class="card-tfeed-info">' +
                                '<img class="card-tfeed-logo" style="display:none;">' +
                                '<div class="card-tfeed-title" style="display:none;"></div>' +
                                '<div class="card-tfeed-meta">' + metaText + '</div>' +
                                '<div class="card-tfeed-descr">' + overviewText + '</div>' +
                            '</div>'
                        );

                        centerBlock.append(infoHtml);

                        var logoEl = infoHtml.find('.card-tfeed-logo');
                        var titleEl = infoHtml.find('.card-tfeed-title');

                        // 4. Підвантажуємо якісний логотип (з урахуванням пріоритету UA/EN)
                        if (tmdb && tmdb.get) {
                            var lang = (Lampa.Storage.field('tmdb_lang') || 'uk') + ',en,null';
                            tmdb.get(method + '/' + data.id + '/images', {
                                filter: { include_image_language: lang }
                            }, function (json) {
                                var logo = json.logos && json.logos.length ? pickLogo(json.logos) : null;
                                if (logo && logo.file_path) {
                                    logoEl.attr('src', Lampa.Api.img(logo.file_path, 'w500')).show();
                                    titleEl.hide();
                                } else {
                                    logoEl.hide();
                                    titleEl.text(movieTitle).show();
                                }
                            }, function () {
                                logoEl.hide();
                                titleEl.text(movieTitle).show();
                            });
                        } else {
                            titleEl.text(movieTitle).show();
                        }
                    }, 50);
                }

                return render;
            };

            return comp;
        });
    }

})();
