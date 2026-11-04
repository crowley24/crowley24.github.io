(function () {
    'use strict';

    /*
     * CARD TRAILER INTERFACE OVERLAY PLUGIN (Safe Fix for Full Card)
     */

    if (!window.Lampa || !window.$) return;
    if (window.card_trailers_full_plugin) return;

    window.card_trailers_full_plugin = true;

    var tmdb = Lampa.Api && Lampa.Api.sources ? Lampa.Api.sources.tmdb : null;

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

    try {
        $('head').append('<style>' + css + '</style>');
    } catch (e) {}

    function pickLogo(logos) {
        try {
            var lang = (Lampa.Storage && typeof Lampa.Storage.field === 'function') ? Lampa.Storage.field('tmdb_lang') : 'uk';
            var order = [lang, 'en', null];
            for (var i = 0; i < order.length; i++) {
                var found = logos.filter(function (l) { return l && l.iso_639_1 === order[i]; })[0];
                if (found) return found;
            }
            return logos[0] || null;
        } catch (e) {
            return null;
        }
    }

    var OrigFull = Lampa.Component.get ? Lampa.Component.get('full') : null;

    if (OrigFull) {
        Lampa.Component.add('full', function (object) {
            var comp = new OrigFull(object);
            var superCreate = comp.create;

            comp.create = function () {
                var render;
                try {
                    render = superCreate.apply(this, arguments);
                } catch (e) {
                    return null;
                }

                if (!render) return render;

                try {
                    var data = (object && object.card) ? object.card : object;

                    if (data && data.id) {
                        // 1. Фон
                        if (data.backdrop_path && Lampa.Api && typeof Lampa.Api.img === 'function') {
                            var bgUrl = Lampa.Api.img(data.backdrop_path, 'w1280');
                            setTimeout(function() {
                                try {
                                    render.find('.full__background').css('background-image', 'url(' + bgUrl + ')');
                                } catch (e) {}
                            }, 10);
                        }

                        // 2. Дані та мета
                        var date = data.release_date || data.first_air_date || '';
                        var method = (data.name || data.media_type === 'tv' || (object && object.method === 'tv')) ? 'tv' : 'movie';
                        
                        var genresNames = [];
                        if (tmdb && tmdb.genres && tmdb.genres[method] && data.genre_ids && typeof tmdb.getGenresNameFromIds === 'function') {
                            try {
                                genresNames = tmdb.getGenresNameFromIds(method, data.genre_ids).slice(0, 3);
                            } catch (e) {}
                        } else if (data.genres && Array.isArray(data.genres)) {
                            genresNames = data.genres.map(function(g) { return g ? g.name : ''; }).filter(Boolean).slice(0, 3);
                        }

                        var metaText = [
                            date ? String(date).slice(0, 4) : '',
                            data.vote_average ? '★ ' + Number(data.vote_average).toFixed(1) : '',
                            genresNames.join(', ')
                        ].filter(Boolean).join(' · ');

                        var movieTitle = data.title || data.name || data.original_title || data.original_name || '';
                        var overviewText = data.overview || '';

                        // 3. Рендер блоку
                        setTimeout(function() {
                            try {
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

                                // 4. Логотип через TMDB API згідно з правилом UA / EN
                                if (tmdb && typeof tmdb.get === 'function' && Lampa.Storage && typeof Lampa.Storage.field === 'function') {
                                    var lang = (Lampa.Storage.field('tmdb_lang') || 'uk') + ',en,null';
                                    tmdb.get(method + '/' + data.id + '/images', {
                                        filter: { include_image_language: lang }
                                    }, function (json) {
                                        try {
                                            var logo = json && json.logos && json.logos.length ? pickLogo(json.logos) : null;
                                            if (logo && logo.file_path && Lampa.Api && typeof Lampa.Api.img === 'function') {
                                                logoEl.attr('src', Lampa.Api.img(logo.file_path, 'w500')).show();
                                                titleEl.hide();
                                            } else {
                                                logoEl.hide();
                                                titleEl.text(movieTitle).show();
                                            }
                                        } catch (e) {
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
                            } catch (e) {}
                        }, 50);
                    }
                } catch (e) {}

                return render;
            };

            return comp;
        });
    }

})();
