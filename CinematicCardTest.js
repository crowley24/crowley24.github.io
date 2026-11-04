(function () {
    'use strict';

    /*
     * CARD TRAILER INTERFACE OVERLAY PLUGIN v2.0
     * Повністю переносить інтерфейс КіноТрейлерів у повну картку Lampa
     */

    if (!window.Lampa || !window.$) return;
    if (window.card_tfeed_interface_plugin) return;

    window.card_tfeed_interface_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    // --------------------------------------------------
    // CSS СТИЛІ (Точна копія інтерфейсу КіноТрейлерів)
    // --------------------------------------------------
    var css = '' +
        /* Ховаємо зайві стандартні елементи шапки, які заважають */
        '.full.view--full .full__background{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;background-size:cover!important;background-position:center!important;transform:scale(1.01);z-index:0}' +
        '.full.view--full .full__left, .full.view--full .full__right{z-index:5!important}' +
        
        /* Наш інформаційний блок унизу в стилі tfeed__info */
        '.card-tfeed-info{' +
            'position:absolute;left:0;right:0;bottom:0;' +
            'padding:7em 12em 2.5em 3em;' +
            'background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.65) 48%,transparent 100%);' +
            'z-index:10;pointer-events:none;' +
        '}' +
        '.card-tfeed-logo{' +
            'display:block;max-width:30em;max-height:8em;margin-bottom:.5em;' +
            'object-fit:contain;object-position:left center;' +
        '}' +
        '.card-tfeed-title{' +
            'font-size:2.6em;font-weight:700;text-shadow:0 2px 12px #000;' +
            'color:#fff;line-height:1.1;margin-bottom:.3em;' +
        '}' +
        '.card-tfeed-meta{' +
            'font-size:1.25em;opacity:.82;margin-top:.4em;color:#fff;' +
        '}' +
        '.card-tfeed-descr{' +
            'font-size:1.15em;opacity:.76;margin-top:.65em;max-width:70%;' +
            'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;color:#fff;' +
        '}' +
        /* Адаптивність для мобільних / планшетів */
        '@media screen and (max-width:768px){' +
            '.card-tfeed-info{padding:4em 8em 4.5em 1.5em;right:0}' +
            '.card-tfeed-title{font-size:1.8em}' +
            '.card-tfeed-logo{max-width:80%;max-height:5em}' +
            '.card-tfeed-descr{font-size:.95em;max-width:95%;-webkit-line-clamp:3}' +
        '}' +
    '';

    $('head').append('<style>' + css + '</style>');

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
    // ПЕРЕХОПЛЕННЯ КОМПОНЕНТА FULL
    // --------------------------------------------------
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite' || e.type === 'start') {
            var render = e.object.render();
            var data = e.data;

            if (!data || !data.id) return;

            // 1. Встановлюємо якісний фон w1280
            if (data.backdrop_path) {
                var bgUrl = Lampa.Api.img(data.backdrop_path, 'w1280');
                var bgBlock = render.find('.full__background');
                if (bgBlock.length) {
                    bgBlock.css('background-image', 'url(' + bgUrl + ')');
                }
            }

            // 2. Формуємо метадані (рік, рейтинг, жанри)
            var date = data.release_date || data.first_air_date || '';
            var method = (data.name || data.media_type === 'tv') ? 'tv' : 'movie';
            
            var genresNames = [];
            if (tmdb.genres && tmdb.genres[method] && data.genre_ids) {
                genresNames = tmdb.getGenresNameFromIds(method, data.genre_ids).slice(0, 3);
            }

            var metaText = [
                date.slice(0, 4),
                data.vote_average ? '★ ' + Number(data.vote_average).toFixed(1) : '',
                genresNames.join(', ')
            ].filter(Boolean).join(' · ');

            var movieTitle = data.title || data.name || data.original_title || data.original_name || '';
            var overviewText = data.overview || '';

            // 3. Створюємо кастомний блок інтерфейсу `.card-tfeed-info` поверх стандартного
            setTimeout(function() {
                // Видаляємо попередній, якщо вже створювався
                render.find('.card-tfeed-info').remove();

                var infoHtml = $(
                    '<div class="card-tfeed-info">' +
                        '<img class="card-tfeed-logo" style="display:none;">' +
                        '<div class="card-tfeed-title" style="display:none;"></div>' +
                        '<div class="card-tfeed-meta">' + metaText + '</div>' +
                        '<div class="card-tfeed-descr">' + overviewText + '</div>' +
                    '</div>'
                );

                render.append(infoHtml);

                var logoEl = infoHtml.find('.card-tfeed-logo');
                var titleEl = infoHtml.find('.card-tfeed-title');

                // 4. Підтягуємо логотип TMDB (або виводимо назву тексту)
                if (tmdb && tmdb.get) {
                    var lang = (Lampa.Storage.field('tmdb_lang') || 'uk') + ',en,null';

                    tmdb.get(method + '/' + data.id + '/images', {
                        filter: { include_image_language: lang }
                    }, function (json) {
                        var logo = json.logos && json.logos.length ? pickLogo(json.logos) : null;
                        if (logo && logo.file_path) {
                            var logoUrl = Lampa.Api.img(logo.file_path, 'w500');
                            logoEl.attr('src', logoUrl).show();
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
    });

})();
