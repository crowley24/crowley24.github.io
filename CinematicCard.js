(function () {
    'use strict';

    /*
     * CARD OVERLAY / UI OVERLAY PLUGIN
     * 
     * Переносить візуальний стиль плагіна "КіноТрейлери" (фон, 
     * логотип у лівому куті, опис, жанри) на сторінку картки фільму (full).
     */

    if (!window.Lampa || !window.$) return;
    if (window.card_overlay_plugin) return;

    window.card_overlay_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    // --------------------------------------------------
    // CSS СТИЛІ (адаптовано під сторінку картки full)
    // --------------------------------------------------

    var css = '' +
        // Ховаємо стандартний фон повної картки, якщо потрібно, або накладаємо свій поверх
        '.card-overlay{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2}' +
        '.card-overlay__bg{position:absolute;left:0;top:0;width:100%;height:100%;background-size:cover;background-position:center;z-index:1}' +
        '.card-overlay__gradient{position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(to top,rgba(0,0,0,.95) 0%,rgba(0,0,0,.7) 50%,rgba(0,0,0,.4) 100%);z-index:2}' +
        
        // Інформаційний блок у лівому куті (поверх екрана картки)
        '.card-overlay__info{position:absolute;left:0;right:0;bottom:0;padding:6em 10em 3em 3.5em;z-index:5;pointer-events:auto}' +
        '.card-overlay__logo{display:block;max-width:28em;max-height:7em;margin-bottom:.6em;object-fit:contain;object-position:left center}' +
        '.card-overlay__title{font-size:2.4em;font-weight:700;text-shadow:0 2px 12px #000}' +
        '.card-overlay__meta{font-size:1.2em;opacity:.82;margin-top:.4em}' +
        '.card-overlay__descr{font-size:1.1em;opacity:.76;margin-top:.6em;max-width:65%;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +

        '@media screen and (max-width:768px){' +
            '.card-overlay__info{padding:3em 2em 8em 1.5em}' +
            '.card-overlay__title{font-size:1.6em}' +
            '.card-overlay__logo{max-width:75%;max-height:4em}' +
            '.card-overlay__descr{font-size:.9em;max-width:95%}' +
        '}';

    $('head').append('<style>' + css + '</style>');

    // --------------------------------------------------
    // ДОПОМІЖНІ ФУНКЦІЇ (як у Трейлерах)
    // --------------------------------------------------

    function pickLogo(logos) {
        var order = [Lampa.Storage.field('tmdb_lang'), 'en', null];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (l) {
                return l.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    function ensureLogo(item, type, cb) {
        var lang = Lampa.Storage.field('tmdb_lang');
        var langs = (lang || 'en') + ',en,null';

        tmdb.get(
            type + '/' + item.id + '/images',
            { filter: { include_image_language: langs } },
            function (json) {
                var logo = json.logos && json.logos.length ? pickLogo(json.logos) : null;
                cb(logo ? Lampa.Api.img(logo.file_path, 'w500') : null);
            },
            function () {
                cb(null);
            }
        );
    }

    // --------------------------------------------------
    // ПЕРЕХОПЛЕННЯ КОМПОНЕНТА FULL
    // --------------------------------------------------

    var OrigFull = Lampa.Component.get('full');

    function CustomFull(object) {
        var comp = new OrigFull(object);
        var render_orig = comp.render;

        comp.render = function () {
            var html = render_orig.apply(this, arguments);

            // Чекаємо поки відмалюється картка та додаємо наш кастомний оверлей
            setTimeout(function () {
                if (!html || !object.card) return;

                var item = object.card;
                var type = object.method || item.name ? 'tv' : 'movie';

                // Створюємо елемент оверлею
                var overlay = $(
                    '<div class="card-overlay">' +
                        '<div class="card-overlay__bg"></div>' +
                        '<div class="card-overlay__gradient"></div>' +
                        '<div class="card-overlay__info">' +
                            '<img class="card-overlay__logo" style="display:none;">' +
                            '<div class="card-overlay__title" style="display:none;"></div>' +
                            '<div class="card-overlay__meta"></div>' +
                            '<div class="card-overlay__descr"></div>' +
                        '</div>' +
                    '</div>'
                );

                // Встановлюємо фон бекдропу
                if (item.backdrop_path) {
                    overlay.find('.card-overlay__bg').css(
                        'background-image',
                        'url(' + Lampa.Api.img(item.backdrop_path, 'w1280') + ')'
                    );
                }

                // Формуємо метадані (дата, рейтинг, жанри)
                var date = item.release_date || item.first_air_date || '';
                var genres = tmdb.getGenresNameFromIds(type, item.genre_ids || []).slice(0, 3).join(', ');
                var meta = [
                    date.slice(0, 4),
                    item.vote_average ? '★ ' + item.vote_average.toFixed(1) : '',
                    genres
                ].filter(Boolean).join(' · ');

                overlay.find('.card-overlay__meta').text(meta);
                overlay.find('.card-overlay__descr').text(item.overview || '');

                var movieTitle = item.title || item.name || item.original_title || item.original_name || '';
                var titleEl = overlay.find('.card-overlay__title');
                var logoEl = overlay.find('.card-overlay__logo');

                // Завантажуємо TMDB логотип у лівому куті
                ensureLogo(item, type, function (url) {
                    if (url) {
                        logoEl.attr('src', url).show();
                        titleEl.hide();
                    } else {
                        logoEl.hide();
                        titleEl.text(movieTitle).show();
                    }
                });

                // Ховаємо стандартний фон та шари повної картки Lampa, щоб залишити лише чистий дизайн
                html.find('.full__background').css('opacity', '0');
                
                // Встромляємо наш шар всередину контейнера картки
                html.find('.full').prepend(overlay);
            }, 50);

            return html;
        };

        return comp;
    }

    // Реєструємо модифікований компонент
    Lampa.Component.add('full', CustomFull);

})();
