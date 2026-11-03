(function () {
    'use strict';

    /*
     * CINEMATIC CARD 1.1.0
     *
     * Lampa / Android TV
     *
     * Features:
     * - Fullscreen TMDB backdrop
     * - TMDB logos: Ukrainian > English > fallback
     * - Smooth logo fade-in
     * - Cinematic bottom gradient
     * - Description and metadata
     * - Native Lampa buttons preserved
     * - TMDB details cache
     *
     * No trailers / no YouTube / no video playback
     */

    if (!window.Lampa || !window.$) return;
    if (window.CINEMATIC_CARD_V110_READY) return;

    window.CINEMATIC_CARD_V110_READY = true;

    var VERSION = '1.1.0';

    var CFG = {
        enabled: true,

        // TMDB image sizes
        backdropSize: 'w1280',
        logoSize: 'w500',

        // Cache
        cacheTTL: 6 * 60 * 60 * 1000,

        // Animation
        logoFadeDuration: 900,
        backdropFadeDuration: 700,

        // Layout
        left: '4.2%',
        bottom: '7.5%',
        logoMaxWidth: '36%',
        logoMaxHeight: '170px',

        // Description
        descriptionMaxWidth: '48%',
        descriptionLines: 3,

        // TV only
        mobileWidthLimit: 480
    };

    var CACHE = {};
    var activeToken = 0;
    var styleInstalled = false;

    var $ = window.$;

    /*
     * ---------------------------------------------------------
     * HELPERS
     * ---------------------------------------------------------
     */

    function isTV() {
        return window.innerWidth > CFG.mobileWidthLimit;
    }

    function escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getType(movie) {
        return (movie.name || movie.first_air_date) ? 'tv' : 'movie';
    }

    function getYear(data, movie) {
        var date = data.release_date ||
            data.first_air_date ||
            movie.release_date ||
            movie.first_air_date ||
            '';

        return date ? String(date).slice(0, 4) : '';
    }

    function getRating(data, movie) {
        var rating = Number(data.vote_average || movie.vote_average || 0);

        if (!rating || rating <= 0) return '';

        return rating.toFixed(1);
    }

    function getGenres(data) {
        if (!data.genres || !data.genres.length) return '';

        return data.genres
            .slice(0, 4)
            .map(function (genre) {
                return genre.name;
            })
            .filter(Boolean)
            .join(' · ');
    }

    function getTitle(data, movie, type) {
        return data.title ||
            data.name ||
            movie.title ||
            movie.name ||
            (type === 'tv' ? 'Серіал' : 'Фільм');
    }

    function getDescription(data, movie) {
        return data.overview || movie.overview || '';
    }

    function getImage(path, size) {
        if (!path || !window.Lampa.TMDB || !Lampa.TMDB.image) {
            return '';
        }

        return Lampa.TMDB.image('/t/p/' + size + path);
    }

    /*
     * ---------------------------------------------------------
     * TMDB LOGO SELECTION
     * ---------------------------------------------------------
     */

    function selectLogo(logos) {
        if (!logos || !logos.length) return null;

        var available = logos.filter(function (logo) {
            return logo && logo.file_path;
        });

        if (!available.length) return null;

        function bestByLanguage(language) {
            var list = available.filter(function (logo) {
                return logo.iso_639_1 === language;
            });

            if (!list.length) return null;

            list.sort(function (a, b) {
                return Number(b.vote_average || 0) -
                    Number(a.vote_average || 0);
            });

            return list[0];
        }

        // Ukrainian first
        var selected = bestByLanguage('uk');

        // English second
        if (!selected) {
            selected = bestByLanguage('en');
        }

        // Neutral logo
        if (!selected) {
            selected = bestByLanguage(null);
        }

        // Any available logo as final fallback
        if (!selected) {
            available.sort(function (a, b) {
                return Number(b.vote_average || 0) -
                    Number(a.vote_average || 0);
            });

            selected = available[0];
        }

        return selected;
    }

    /*
     * ---------------------------------------------------------
     * TMDB DETAILS
     * ---------------------------------------------------------
     */

    function loadDetails(movie, callback) {
        var type = getType(movie);
        var id = movie.id;

        if (!id || !Lampa.TMDB || !Lampa.TMDB.key) {
            callback(null);
            return;
        }

        var cacheKey = type + ':' + id;
        var now = Date.now();

        if (
            CACHE[cacheKey] &&
            now - CACHE[cacheKey].time < CFG.cacheTTL
        ) {
            callback(CACHE[cacheKey].data);
            return;
        }

        var url =
            'https://api.themoviedb.org/3/' +
            type + '/' + id +
            '?api_key=' + Lampa.TMDB.key() +
            '&append_to_response=images' +
            '&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 12000,

            success: function (data) {
                if (!data) {
                    callback(null);
                    return;
                }

                CACHE[cacheKey] = {
                    time: Date.now(),
                    data: data
                };

                callback(data);
            },

            error: function () {
                callback(null);
            }
        });
    }

    /*
     * ---------------------------------------------------------
     * STYLES
     * ---------------------------------------------------------
     */

    function installStyles() {
        if (styleInstalled) return;

        styleInstalled = true;

        var css = `
            .full-start-new.cinematic-card-active {
                position: relative !important;
                overflow: hidden !important;
                isolation: isolate;
            }

            .cinematic-card-visual {
                position: absolute;
                inset: 0;
                z-index: 0;
                overflow: hidden;
                pointer-events: none;
                opacity: 1;
            }

            .cinematic-card-backdrop {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center center;
                opacity: 0;
                transition: opacity ${CFG.backdropFadeDuration}ms ease;
            }

            .cinematic-card-backdrop.is-visible {
                opacity: 1;
            }

            .cinematic-card-gradient {
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(
                        90deg,
                        rgba(0,0,0,0.78) 0%,
                        rgba(0,0,0,0.48) 34%,
                        rgba(0,0,0,0.12) 72%,
                        rgba(0,0,0,0.12) 100%
                    ),
                    linear-gradient(
                        0deg,
                        rgba(0,0,0,0.96) 0%,
                        rgba(0,0,0,0.78) 17%,
                        rgba(0,0,0,0.30) 43%,
                        rgba(0,0,0,0.04) 75%
                    );
            }

            .cinematic-card-info {
                position: absolute;
                left: ${CFG.left};
                bottom: ${CFG.bottom};
                width: 58%;
                max-width: 900px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                z-index: 2;
                pointer-events: none;
                opacity: 0;
                transform: translateY(12px);
                transition:
                    opacity 600ms ease,
                    transform 600ms ease;
            }

            .cinematic-card-info.is-visible {
                opacity: 1;
                transform: translateY(0);
            }

            .cinematic-card-logo-wrap {
                display: flex;
                align-items: flex-end;
                min-height: 65px;
                max-width: 100%;
                margin-bottom: 1.4em;
            }

            .cinematic-card-logo {
                display: block;
                width: auto;
                height: auto;
                max-width: ${CFG.logoMaxWidth};
                max-height: ${CFG.logoMaxHeight};
                object-fit: contain;
                object-position: left bottom;
                opacity: 0;
                transform: translateY(8px);
                transition:
                    opacity ${CFG.logoFadeDuration}ms ease,
                    transform ${CFG.logoFadeDuration}ms ease;
                filter: drop-shadow(0 3px 12px rgba(0,0,0,0.35));
            }

            .cinematic-card-logo.is-visible {
                opacity: 1;
                transform: translateY(0);
            }

            .cinematic-card-title {
                color: #fff;
                font-size: 2.7em;
                line-height: 1.08;
                font-weight: 700;
                letter-spacing: -0.025em;
                text-shadow: 0 3px 16px rgba(0,0,0,0.65);
                margin-bottom: 0.45em;
                max-width: 100%;
            }

            .cinematic-card-description {
                color: rgba(255,255,255,0.91);
                font-size: 1.12em;
                line-height: 1.48;
                font-weight: 400;
                max-width: ${CFG.descriptionMaxWidth};
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: ${CFG.descriptionLines};
                overflow: hidden;
                text-shadow: 0 2px 9px rgba(0,0,0,0.8);
                margin-bottom: 1.15em;
            }

            .cinematic-card-meta {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 0.75em;
                color: rgba(255,255,255,0.88);
                font-size: 1.02em;
                font-weight: 500;
                text-shadow: 0 2px 8px rgba(0,0,0,0.9);
            }

            .cinematic-card-meta-item {
                display: inline-flex;
                align-items: center;
                white-space: nowrap;
            }

            .cinematic-card-meta-separator {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(255,255,255,0.65);
                display: inline-block;
                margin-left: 0.75em;
            }

            .cinematic-card-meta-rating {
                color: #fff;
                font-weight: 700;
            }

            .cinematic-card-meta-rating::before {
                content: '★';
                color: #f5c518;
                margin-right: 0.35em;
            }

            /*
             * Hide duplicate native poster and text.
             * Native buttons remain available.
             */

            .full-start-new.cinematic-card-active
            .full-start-new__poster {
                opacity: 0 !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            .full-start-new.cinematic-card-active
            .full-start-new__title,
            .full-start-new.cinematic-card-active
            .full-start-new__tagline,
            .full-start-new.cinematic-card-active
            .full-start-new__description,
            .full-start-new.cinematic-card-active
            .full-start-new__details,
            .full-start-new.cinematic-card-active
            .full-start-new__rate,
            .full-start-new.cinematic-card-active
            .full-start-new__status {
                opacity: 0 !important;
                visibility: hidden !important;
            }

            /*
             * Keep the native Lampa controls above the backdrop.
             */

            .full-start-new.cinematic-card-active
            .full-start-new__right {
                position: relative;
                z-index: 3;
                background: transparent !important;
            }

            .full-start-new.cinematic-card-active
            .full-start-new__buttons {
                position: relative;
                z-index: 5;
            }

            .full-start-new.cinematic-card-active
            .full-start-new__buttons *,
            .full-start-new.cinematic-card-active
            .full-start-new__button,
            .full-start-new.cinematic-card-active
            .full-start-new__buttons .selector {
                pointer-events: auto;
            }

            @media screen and (max-width: 1100px) {
                .cinematic-card-info {
                    width: 68%;
                }

                .cinematic-card-description {
                    max-width: 90%;
                }

                .cinematic-card-title {
                    font-size: 2.1em;
                }
            }
        `;

        $('<style>')
            .attr('id', 'cinematic-card-v110-styles')
            .text(css)
            .appendTo('head');
    }

    /*
     * ---------------------------------------------------------
     * VISUAL ELEMENTS
     * ---------------------------------------------------------
     */

    function createVisual($render, movie, data, token) {
        if (!$render || !$render.length) return;

        if (token !== activeToken) return;

        var $old = $render.find('.cinematic-card-visual');

        if ($old.length) {
            $old.remove();
        }

        var type = getType(movie);
        var title = getTitle(data || {}, movie, type);
        var description = getDescription(data || {}, movie);

        var year = data ? getYear(data, movie) : getYear({}, movie);
        var rating = data ? getRating(data, movie) : getRating({}, movie);
        var genres = data ? getGenres(data) : '';

        var backdropPath = data && data.backdrop_path
            ? data.backdrop_path
            : movie.backdrop_path;

        if (!backdropPath && data && data.poster_path) {
            backdropPath = data.poster_path;
        }

        if (!backdropPath && movie.poster_path) {
            backdropPath = movie.poster_path;
        }

        var backdropURL = getImage(backdropPath, CFG.backdropSize);

        var logo = data && data.images
            ? selectLogo(data.images.logos)
            : null;

        var logoURL = logo
            ? getImage(
                logo.file_path.replace(/\.svg$/i, '.png'),
                CFG.logoSize
            )
            : '';

        var html = `
            <div class="cinematic-card-visual">

                <img
                    class="cinematic-card-backdrop"
                    alt=""
                />

                <div class="cinematic-card-gradient"></div>

                <div class="cinematic-card-info">

                    <div class="cinematic-card-logo-wrap">
                        <img
                            class="cinematic-card-logo"
                            alt=""
                        />
                    </div>

                    <div class="cinematic-card-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="cinematic-card-description">
                        ${escapeHTML(description)}
                    </div>

                    <div class="cinematic-card-meta">

                        ${year ? `
                            <span class="cinematic-card-meta-item">
                                ${escapeHTML(year)}
                            </span>
                        ` : ''}

                        ${rating ? `
                            <span class="cinematic-card-meta-item cinematic-card-meta-rating">
                                ${escapeHTML(rating)}
                            </span>
                        ` : ''}

                        ${genres ? `
                            <span class="cinematic-card-meta-item">
                                ${escapeHTML(genres)}
                            </span>
                        ` : ''}

                    </div>

                </div>

            </div>
        `;

        var $visual = $(html);

        $render
            .addClass('cinematic-card-active')
            .append($visual);

        var $backdrop = $visual.find('.cinematic-card-backdrop');
        var $info = $visual.find('.cinematic-card-info');
        var $logo = $visual.find('.cinematic-card-logo');
        var $logoWrap = $visual.find('.cinematic-card-logo-wrap');
        var $title = $visual.find('.cinematic-card-title');

        /*
         * Backdrop loading
         */

        if (backdropURL) {
            $backdrop
                .attr('src', backdropURL)
                .one('load', function () {
                    if (token !== activeToken) return;

                    $backdrop.addClass('is-visible');
                })
                .one('error', function () {
                    if (token !== activeToken) return;

                    $backdrop.remove();
                });
        }
        else {
            $backdrop.remove();
        }

        /*
         * Logo loading
         */

        if (logoURL) {
            $logo
                .attr('src', logoURL)
                .one('load', function () {
                    if (token !== activeToken) return;

                    $title.hide();
                    $logo.addClass('is-visible');
                    $info.addClass('is-visible');
                })
                .one('error', function () {
                    if (token !== activeToken) return;

                    $logo.remove();
                    $logoWrap.remove();
                    $title.show();
                    $info.addClass('is-visible');
                });
        }
        else {
            $logo.remove();
            $logoWrap.remove();
            $title.show();
            $info.addClass('is-visible');
        }

        /*
         * Show info even if logo request is slow.
         * The title remains hidden until logo result is known.
         */

        if (logoURL) {
            $title.hide();

            setTimeout(function () {
                if (token !== activeToken) return;
                if (!$logo.length) return;

                if (!$logo.hasClass('is-visible')) {
                    if (!$logo[0].complete || !$logo[0].naturalWidth) {
                        $logo.remove();
                        $logoWrap.remove();
                        $title.show();
                    }

                    $info.addClass('is-visible');
                }
            }, 5000);
        }

        else {
            $info.addClass('is-visible');
        }
    }

    /*
     * ---------------------------------------------------------
     * FULL CARD EVENT
     * ---------------------------------------------------------
     */

    function handleFull(e) {
        if (!CFG.enabled || !isTV()) return;

        if (
            e.type !== 'complite' &&
            e.type !== 'complete'
        ) {
            return;
        }

        if (
            !e.data ||
            !e.data.movie ||
            !e.object ||
            !e.object.activity
        ) {
            return;
        }

        var movie = e.data.movie;
        var $render = e.object.activity.render();

        if (!$render || !$render.length) return;

        var token = ++activeToken;

        /*
         * Remove previous plugin visuals from this render.
         */

        $render
            .removeClass('cinematic-card-active')
            .find('.cinematic-card-visual')
            .remove();

        installStyles();

        /*
         * Load TMDB details.
         */

        loadDetails(movie, function (data) {
            if (token !== activeToken) return;

            /*
             * Make sure this render still exists.
             */

            if (!$render.length || !$render[0]) return;

            createVisual(
                $render,
                movie,
                data,
                token
            );
        });
    }

    /*
     * ---------------------------------------------------------
     * INITIALIZATION
     * ---------------------------------------------------------
     */

    function init() {
        if (!window.Lampa || !Lampa.Listener) return;

        installStyles();

        Lampa.Listener.follow('full', handleFull);
    }

    init();

    /*
     * Support delayed Lampa initialization.
     */

    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            init();
        }
    });

    /*
     * ---------------------------------------------------------
     * DEBUG INFO
     * ---------------------------------------------------------
     */

    window.CINEMATIC_CARD = {
        version: VERSION,

        clearCache: function () {
            CACHE = {};
        },

        disable: function () {
            CFG.enabled = false;
        },

        enable: function () {
            CFG.enabled = true;
        }
    };

})();
