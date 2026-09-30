(function () {
    'use strict';
    /**
     * TV INTERFACE — PERFORMANCE EDITION
     * Оптимізована версія без втрати функціоналу
     */

    var pluginPath = 'https://crowley24.github.io/Icons/';

    /* =========================================================
       КЕШ
    ========================================================= */

    var detailsCache = Object.create(null);
    var darkLogoCache = Object.create(null);
    var backdropCache = Object.create(null);

    var currentActiveId = null;
    var currentActivity = null;

    var rotationTimer = null;
    var trailerDestroy = null;

    var styleApplied = false;
    var settingsInitialized = false;

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /* =========================================================
       НАЛАШТУВАННЯ
    ========================================================= */

    var settings_list = [
        { id: 'tv_interface_ui_anim', default: true },
        { id: 'tv_interface_ui_anim_effect', default: 'smooth_zoom' },
        { id: 'tv_interface_badge_anim', default: 'pulse' },
        { id: 'tv_interface_logo_quality', default: 'original' },
        { id: 'tv_interface_show_tagline', default: true },
        { id: 'tv_interface_blocks_gap', default: '8px' },
        { id: 'tv_interface_ratings_size', default: '0.45em' },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_duration', default: 8000 },
        { id: 'tv_interface_slideshow_quality', default: 'w1280' },
        { id: 'tv_interface_trailer_bg', default: false },
        { id: 'tv_interface_trailer_blur', default: '0' },
        { id: 'tv_interface_trailer_zoom', default: '0' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    /* =========================================================
       UTILS
    ========================================================= */

    function getMovieId(e) {
        var movie = e && e.data && e.data.movie;

        if (!movie && e && e.object && e.object.card) {
            movie = e.object.card;
        }

        return movie && movie.id ? movie.id : null;
    }

    function getMovie(e) {
        if (e && e.data && e.data.movie) {
            return e.data.movie;
        }

        if (e && e.object && e.object.card) {
            return e.object.card;
        }

        return null;
    }

    function getMediaType(movie) {
        if (!movie) return 'movie';

        return (
            movie.name ||
            movie.first_air_date ||
            movie.number_of_seasons ||
            movie.number_of_episodes
        ) ? 'tv' : 'movie';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getRatingColor(val) {
        var n = parseFloat(val);

        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        if (n > 0) return '#ff4d4d';

        return '#fff';
    }

    function formatTime(mins) {
        mins = parseInt(mins);

        if (!mins) return '';

        var h = Math.floor(mins / 60);
        var m = mins % 60;

        if (h > 0) {
            return h + 'г ' + m + 'хв';
        }

        return m + 'хв';
    }

    /* =========================================================
       ОСТАНОВКА АКТИВНОГО КОНТЕНТУ
    ========================================================= */

    function stopRotation() {
        if (rotationTimer) {
            clearTimeout(rotationTimer);
            rotationTimer = null;
        }
    }

    function stopTrailer() {
        if (trailerDestroy) {
            try {
                trailerDestroy();
            } catch (e) {}

            trailerDestroy = null;
        }
    }

    function stopAllMedia() {
        stopRotation();
        stopTrailer();
    }

    /* =========================================================
       АНАЛІЗ ТЕМНОГО ЛОГОТИПА
    ========================================================= */

    function isImageDark(imgSrc, callback) {
        if (!imgSrc) {
            callback(false);
            return;
        }

        if (darkLogoCache[imgSrc] !== undefined) {
            callback(darkLogoCache[imgSrc]);
            return;
        }

        var img = new Image();

        img.crossOrigin = 'Anonymous';

        img.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d', {
                    willReadFrequently: true
                });

                canvas.width = 32;
                canvas.height = 32;

                ctx.drawImage(img, 0, 0, 32, 32);

                var data = ctx.getImageData(0, 0, 32, 32).data;

                var totalBrightness = 0;
                var count = 0;
                var hasColor = false;

                for (var i = 0; i < data.length; i += 4) {
                    var alpha = data[i + 3];

                    if (alpha <= 50) continue;

                    var r = data[i];
                    var g = data[i + 1];
                    var b = data[i + 2];

                    totalBrightness += (
                        r * 299 +
                        g * 587 +
                        b * 114
                    ) / 1000;

                    count++;

                    if (
                        Math.max(r, g, b) -
                        Math.min(r, g, b) > 30
                    ) {
                        hasColor = true;
                    }
                }

                var average = count ?
                    totalBrightness / count :
                    255;

                var result = average < 110 && !hasColor;

                darkLogoCache[imgSrc] = result;

                callback(result);

            } catch (e) {
                darkLogoCache[imgSrc] = false;
                callback(false);
            }
        };

        img.onerror = function () {
            darkLogoCache[imgSrc] = false;
            callback(false);
        };

        img.src = imgSrc;
    }

    /* =========================================================
       CSS
    ========================================================= */

    function applyStyles() {
        var style = document.getElementById('tv-interface-styles');

        if (!style) {
            style = document.createElement('style');
            style.id = 'tv-interface-styles';
            document.head.appendChild(style);
        }

        var isUIAnim = !!Lampa.Storage.get('tv_interface_ui_anim');
        var animEffect = Lampa.Storage.get(
            'tv_interface_ui_anim_effect',
            'smooth_zoom'
        );

        var badgeAnim = Lampa.Storage.get(
            'tv_interface_badge_anim',
            'pulse'
        );

        var rSize = Lampa.Storage.get(
            'tv_interface_ratings_size',
            '0.45em'
        );

        var showTagline = !!Lampa.Storage.get(
            'tv_interface_show_tagline'
        );

        var blocksGap = Lampa.Storage.get(
            'tv_interface_blocks_gap',
            '8px'
        );

        var css = '';

        /* -----------------------------------------------------
           KEYFRAMES
        ----------------------------------------------------- */

        css +=
            '@keyframes anim_smooth_zoom{' +
            '0%{opacity:0;transform:translate3d(0,10px,0) scale(.94)}' +
            '100%{opacity:1;transform:translate3d(0,0,0) scale(1)}' +
            '}';

        css +=
            '@keyframes anim_cine_slide{' +
            '0%{opacity:0;transform:translate3d(0,25px,0)}' +
            '100%{opacity:1;transform:translate3d(0,0,0)}' +
            '}';

        css +=
            '@keyframes anim_luxury_fade{' +
            '0%{opacity:0;transform:translate3d(0,12px,0) scale(1.03)}' +
            '100%{opacity:1;transform:translate3d(0,0,0) scale(1)}' +
            '}';

        css +=
            '@keyframes anim_modern_shift{' +
            '0%{opacity:0;transform:translate3d(-18px,0,0)}' +
            '100%{opacity:1;transform:translate3d(0,0,0)}' +
            '}';

        css +=
            '@keyframes badge_anim_pulse{' +
            '0%,100%{transform:scale(1)}' +
            '50%{transform:scale(1.08)}' +
            '}';

        css +=
            '@keyframes badge_anim_breathe{' +
            '0%,100%{transform:scale(1);opacity:.85}' +
            '50%{transform:scale(1.04);opacity:1}' +
            '}';

        css +=
            '@keyframes badge_anim_spin_slow{' +
            '0%,100%{transform:rotate(0)}' +
            '25%{transform:rotate(2deg)}' +
            '75%{transform:rotate(-2deg)}' +
            '}';

        css +=
            '@keyframes badge_anim_float{' +
            '0%,100%{transform:translate3d(0,0,0)}' +
            '50%{transform:translate3d(0,-3px,0)}' +
            '}';

        /* -----------------------------------------------------
           ОСНОВНІ ПРАВИЛА
        ----------------------------------------------------- */

        css +=
            '.full-start__reactions,' +
            '[class*="reactions"]{' +
            'display:none!important}' ;

        css +=
            '.full-start-new__details,' +
            '.full-start__info,' +
            '.full-start__age,' +
            '.full-start-new__age,' +
            '.full-start__status,' +
            '.full-start-new__status,' +
            '[class*="age"],' +
            '[class*="pg"],' +
            '[class*="rating-count"],' +
            '[class*="status"]{' +
            'display:none!important}';

        css +=
            '.full-start-new__right>div:first-child{' +
            'display:none!important}';

        css +=
            '.rate--tmdb,' +
            '.rate--imdb,' +
            '.rate--kp,' +
            '.full-start__rates{' +
            'display:none!important}';

        css +=
            '.background{' +
            'background:#000!important}';

        /* -----------------------------------------------------
           КОНТЕЙНЕР
        ----------------------------------------------------- */

        css +=
            '.full-start-new{' +
            'position:relative!important;' +
            'contain:layout style;' +
            'will-change:auto}';

        css +=
            '.full-start-new__poster{' +
            'position:relative!important;' +
            'background:#000;' +
            'z-index:1}';

        /*
         * Зберігаємо вигляд poster,
         * але не змушуємо браузер постійно перераховувати layout.
         */

        css +=
            '.full-start-new__poster img{' +
            'filter:none!important;' +
            'width:100%!important;' +
            'height:auto!important;' +
            'object-fit:contain!important;' +
            'display:block!important}';

        /* -----------------------------------------------------
           RIGHT
        ----------------------------------------------------- */

        css +=
            '.full-start-new__right{' +
            'background:none!important;' +
            'z-index:2!important;' +
            'display:flex!important;' +
            'flex-direction:column!important;' +
            'align-items:flex-start!important;' +
            'padding:20px!important;' +
            'gap:' + blocksGap + '!important;' +
            'position:relative!important}';

        var chosenAnimName = 'anim_' + animEffect;

        var animTiming =
            'cubic-bezier(0.16,1,0.3,1)';

        function getAnimRule(delay) {
            if (!isUIAnim) {
                return 'opacity:1!important;';
            }

            return (
                'animation:' +
                chosenAnimName +
                ' .45s ' +
                animTiming +
                ' ' +
                delay +
                ' both;' +
                'will-change:transform,opacity;'
            );
        }

        /* -----------------------------------------------------
           STUDIO
        ----------------------------------------------------- */

        css +=
            '.studio-header-brand{' +
            getAnimRule('0s') +
            'order:1;' +
            'width:100%;' +
            'display:flex;' +
            'justify-content:flex-start;' +
            'align-items:center;' +
            'margin-bottom:-2px!important;' +
            'contain:layout style}';

        css +=
            '.studio-header-brand img{' +
            'height:22px!important;' +
            'width:auto;' +
            'max-width:130px;' +
            'object-fit:contain;' +
            'filter:drop-shadow(0 2px 4px rgba(0,0,0,.8));' +
            'opacity:.95;' +
            'display:block}';

        css +=
            '.studio-header-brand img.is-dark-logo{' +
            'filter:brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,.8))!important}';

        /* -----------------------------------------------------
           TITLE LOGO
        ----------------------------------------------------- */

        css +=
            '.full-start-new__title{' +
            'min-height:60px;' +
            'position:relative;' +
            'font-size:0!important;' +
            'color:transparent!important;' +
            getAnimRule('.08s') +
            'width:100%!important;' +
            'display:flex!important;' +
            'justify-content:flex-start!important;' +
            'align-items:center!important;' +
            'margin:0!important;' +
            'order:2;' +
            'overflow:visible!important;' +
            'contain:layout style}';

        css +=
            '.full-start-new__title img{' +
            'height:auto!important;' +
            'max-height:100px!important;' +
            'width:auto!important;' +
            'max-width:45vw!important;' +
            'object-fit:contain!important;' +
            'filter:drop-shadow(0 4px 12px rgba(0,0,0,.7));' +
            'margin:0!important;' +
            'opacity:0;' +
            'display:block!important;' +
            'transition:opacity .25s ease}';

        css +=
            '.full-start-new__title img.loaded{' +
            'opacity:1}';

        /* -----------------------------------------------------
           RATING
        ----------------------------------------------------- */

        css +=
            '.quality-row-inline{' +
            'position:absolute;' +
            'top:30px;' +
            'right:24px;' +
            'z-index:99;' +
            'display:flex;' +
            'flex-direction:column;' +
            'align-items:flex-end;' +
            'gap:4px;' +
            'pointer-events:none;' +
            'contain:layout style}';

        /* -----------------------------------------------------
           TAGLINE
        ----------------------------------------------------- */

        css +=
            '.full-start-new__tagline{' +
            getAnimRule('.15s') +
            'display:' +
            (showTagline ? 'block' : 'none') +
            '!important;' +
            'font-style:italic!important;' +
            'font-size:1em!important;' +
            'margin:0!important;' +
            'color:rgba(255,255,255,.8)!important;' +
            'text-align:left!important;' +
            'order:3}';

        /* -----------------------------------------------------
           META
        ----------------------------------------------------- */

        css +=
            '.plugin-meta-row{' +
            getAnimRule('.22s') +
            'display:flex;' +
            'justify-content:flex-start;' +
            'align-items:center;' +
            'flex-wrap:nowrap;' +
            'gap:10px;' +
            'margin:0!important;' +
            'font-size:calc(' +
            rSize +
            '*2.8);' +
            'width:100%;' +
            'order:4;' +
            'color:rgba(255,255,255,.85);' +
            'font-family:"Inter",-apple-system,system-ui,sans-serif;' +
            'contain:layout style}';

        css +=
            '.info-text-item{' +
            'opacity:.9;' +
            'font-weight:500;' +
            'font-size:.9em;' +
            'white-space:nowrap}';

        css +=
            '.info-separator{' +
            'opacity:.35;' +
            'font-size:.85em;' +
            'margin:0 -2px}';

        /* -----------------------------------------------------
           BUTTONS
        ----------------------------------------------------- */

        css +=
            '.card-tweaks__buttons{' +
            getAnimRule('.3s') +
            'width:100%!important;' +
            'display:flex!important;' +
            'justify-content:flex-start!important;' +
            'align-items:center!important;' +
            'gap:15px!important;' +
            'margin-top:15px!important;' +
            'order:5}';

        /* -----------------------------------------------------
           RATING BADGES
        ----------------------------------------------------- */

        var loopAnimName =
            badgeAnim !== 'none' ?
            'badge_anim_' + badgeAnim :
            '';

        var loopDuration =
            badgeAnim === 'spin_slow' ?
            '4s' :
            badgeAnim === 'breathe' ?
            '3s' :
            '2.5s';

        css +=
            '.wave-item{' +
            'transform-origin:center;' +
            'filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));' +
            'will-change:transform,opacity;';

        if (badgeAnim !== 'none') {
            css +=
                'animation:' +
                loopAnimName +
                ' ' +
                loopDuration +
                ' ease-in-out infinite;';
        }

        css += '}';

        css +=
            '.quality-row-inline .plugin-rating-item{' +
            'display:flex;' +
            'align-items:center;' +
            'gap:6px;' +
            'font-weight:700;' +
            'color:#fff;' +
            'font-size:1.05em;' +
            'padding:2px 0}';

        css +=
            '.quality-row-inline .plugin-rating-item img{' +
            'height:1.1em;' +
            'width:auto;' +
            'display:block}';

        /* -----------------------------------------------------
           BACKGROUND
        ----------------------------------------------------- */

        css +=
            '.full-start__background{' +
            'will-change:opacity;' +
            'transition:opacity .5s ease;' +
            'backface-visibility:hidden;' +
            'transform:translateZ(0)}';

        /* -----------------------------------------------------
           НОВА СИСТЕМА СЛАЙДШОУ
        ----------------------------------------------------- */

        css +=
            '.tvi-bg-layer{' +
            'position:absolute;' +
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'object-fit:cover;' +
            'opacity:0;' +
            'pointer-events:none;' +
            'transition:opacity .6s ease;' +
            'will-change:opacity;' +
            'backface-visibility:hidden;' +
            'transform:translateZ(0)}';

        css +=
            '.tvi-bg-layer.active{' +
            'opacity:1}';

        /* -----------------------------------------------------
           TRAILER
        ----------------------------------------------------- */

        css +=
            '.tvi-trailer{' +
            'position:absolute;' +
            'top:0;' +
            'left:0;' +
            'width:100%;' +
            'height:100%;' +
            'z-index:0;' +
            'opacity:0;' +
            'transition:opacity .5s ease;' +
            'pointer-events:none;' +
            'contain:strict}';

        css +=
            '.tvi-trailer.display{' +
            'opacity:1}';

        css +=
            '.tvi-trailer__yt{' +
            'position:fixed;' +
            'top:0;' +
            'left:0;' +
            'width:100vw;' +
            'height:100vh;' +
            'background:#000;' +
            'overflow:hidden;' +
            'display:flex;' +
            'align-items:center;' +
            'justify-content:center;' +
            'z-index:0;' +
            'contain:strict}';

        css +=
            '.tvi-trailer__iframe{' +
            'width:100%;' +
            'height:100%;' +
            'pointer-events:none;' +
            'will-change:transform}';

        css +=
            '.tvi-trailer__yt iframe{' +
            'border:0;' +
            'width:100%;' +
            'height:100%;' +
            'flex-shrink:0;' +
            'pointer-events:none;' +
            'will-change:transform;' +
            'backface-visibility:hidden}';

        css +=
            '.tvi-trailer__overlay{' +
            'position:absolute;' +
            'top:0;' +
            'left:0;' +
            'width:100%;' +
            'height:100%;' +
            'z-index:1;' +
            'pointer-events:none;' +
            'background:' +
            'linear-gradient(90deg,#0f0f0f 0%,rgba(15,15,15,.85) 30%,rgba(15,15,15,.35) 45%,rgba(15,15,15,.05) 65%,transparent 100%),' +
            'linear-gradient(to top,#0f0f0f 0%,rgba(15,15,15,.7) 25%,rgba(15,15,15,.2) 45%,transparent 60%),' +
            'linear-gradient(to bottom,#0f0f0f 0%,rgba(15,15,15,.7) 25%,rgba(15,15,15,.2) 45%,transparent 60%)}';

        style.textContent = css;

        styleApplied = true;
    }

    /* =========================================================
       META
    ========================================================= */

    function renderMeta(container, e) {
        if (!container || !container.length || !e || !e.data) {
            return;
        }

        container.find('.plugin-meta-row').remove();

        var movie = e.data.movie || {};
        var html = '';

        var year = (
            movie.release_date ||
            movie.first_air_date ||
            ''
        ).substring(0, 4);

        if (year) {
            html +=
                '<div class="info-text-item">' +
                escapeHtml(year) +
                '</div>';
        }

        var country = '';

        if (
            movie.production_countries &&
            movie.production_countries.length
        ) {
            country =
                movie.production_countries[0].name ||
                movie.production_countries[0].iso_3166_1 ||
                '';
        } else if (
            movie.origin_country &&
            movie.origin_country.length
        ) {
            country = movie.origin_country[0];
        }

        if (country) {
            if (html) {
                html +=
                    '<span class="info-separator">•</span>';
            }

            html +=
                '<div class="info-text-item">' +
                escapeHtml(country) +
                '</div>';
        }

        var runtime =
            movie.runtime ||
            (
                movie.episode_run_time &&
                movie.episode_run_time[0]
            ) ||
            0;

        if (runtime) {
            if (html) {
                html +=
                    '<span class="info-separator">•</span>';
            }

            html +=
                '<div class="info-text-item">' +
                escapeHtml(formatTime(runtime)) +
                '</div>';
        }

        if (movie.genres && movie.genres.length) {
            if (html) {
                html +=
                    '<span class="info-separator">•</span>';
            }

            var genres = movie.genres
                .slice(0, 2)
                .map(function (g) {
                    return g.name;
                })
                .join(', ');

            html +=
                '<div class="info-text-item">' +
                escapeHtml(genres) +
                '</div>';
        }

        if (!html) return;

        var $meta = $(
            '<div class="plugin-meta-row">' +
            html +
            '</div>'
        );

        container.append($meta);
    }

    /* =========================================================
       CUB RATING
    ========================================================= */

    function getCubRating(e) {
        if (
            !e ||
            !e.data ||
            !e.data.reactions ||
            !e.data.reactions.result
        ) {
            return null;
        }

        var reactionCoef = {
            fire: 10,
            nice: 7.5,
            think: 5,
            bore: 2.5,
            shit: 0
        };

        var sum = 0;
        var cnt = 0;

        e.data.reactions.result.forEach(function (r) {
            if (!r.counter) return;

            var coef = reactionCoef[r.type];

            if (coef === undefined) return;

            sum += r.counter * coef;
            cnt += r.counter;
        });

        if (cnt < 5) {
            return null;
        }

        var isTv =
            e.object &&
            e.object.method === 'tv';

        var avg = isTv ? 7.4 : 6.5;
        var m = isTv ? 50 : 150;

        return (
            (avg * m + sum) /
            (m + cnt)
        ).toFixed(1);
    }

    /* =========================================================
       TMDB DETAILS
    ========================================================= */

    function applyMovieDetailsData(data, movie, $render) {
        if (
            !$render ||
            !$render.length ||
            !data
        ) {
            return;
        }

        /* -----------------------------------------------------
           LOGO
        ----------------------------------------------------- */

        if (
            data.images &&
            data.images.logos &&
            data.images.logos.length
        ) {
            var lang =
                Lampa.Storage.get('language') ||
                'uk';

            var logos = data.images.logos;

            var logo =
                logos.find(function (l) {
                    return l.iso_639_1 === lang;
                }) ||
                logos.find(function (l) {
                    return l.iso_639_1 === 'en';
                }) ||
                logos[0];

            if (logo && logo.file_path) {
                var logoUrl = Lampa.TMDB.image(
                    '/t/p/original' +
                    logo.file_path.replace(
                        '.svg',
                        '.png'
                    )
                );

                var $title =
                    $render.find(
                        '.full-start-new__title'
                    );

                if ($title.length) {
                    var $img = $(
                        '<img alt="">'
                    );

                    $img.attr('src', logoUrl);

                    $img.on('load', function () {
                        if (
                            currentActiveId ===
                            movie.id
                        ) {
                            requestAnimationFrame(
                                function () {
                                    $img.addClass(
                                        'loaded'
                                    );
                                }
                            );
                        }
                    });

                    $img.on('error', function () {
                        $img.remove();
                    });

                    $title.empty().append($img);
                }
            }
        }

        /* -----------------------------------------------------
           STUDIO
        ----------------------------------------------------- */

        if (
            Lampa.Storage.get(
                'tv_interface_studios'
            )
        ) {
            var $right =
                $render.find(
                    '.full-start-new__right'
                );

            $render
                .find('.studio-header-brand')
                .remove();

            var studio = null;

            if (
                data.networks &&
                data.networks.length
            ) {
                studio = data.networks.find(
                    function (n) {
                        return n.logo_path;
                    }
                );
            }

            if (
                !studio &&
                data.production_companies &&
                data.production_companies.length
            ) {
                studio =
                    data.production_companies.find(
                        function (c) {
                            return c.logo_path;
                        }
                    );
            }

            if (
                studio &&
                studio.logo_path
            ) {
                var studioUrl =
                    Lampa.TMDB.image(
                        '/t/p/w200' +
                        studio.logo_path
                    );

                var $brand = $(
                    '<div class="studio-header-brand">' +
                    '<img alt="' +
                    escapeHtml(
                        studio.name || ''
                    ) +
                    '">' +
                    '</div>'
                );

                var $img =
                    $brand.find('img');

                $img.attr(
                    'src',
                    studioUrl
                );

                $img.on(
                    'error',
                    function () {
                        $brand.remove();
                    }
                );

                isImageDark(
                    studioUrl,
                    function (dark) {
                        if (
                            dark &&
                            currentActiveId ===
                            movie.id
                        ) {
                            $img.addClass(
                                'is-dark-logo'
                            );
                        }
                    }
                );

                $render
                    .find(
                        '.full-start-new__title'
                    )
                    .before($brand);
            }
        }
    }

    function loadMovieDetails(movie, $render) {
        if (
            !movie ||
            !movie.id ||
            !$render ||
            !$render.length
        ) {
            return;
        }

        var movieId = movie.id;

        currentActiveId = movieId;

        if (detailsCache[movieId]) {
            applyMovieDetailsData(
                detailsCache[movieId],
                movie,
                $render
            );

            return;
        }

        var type = getMediaType(movie);

        var url =
            'https://api.themoviedb.org/3/' +
            type +
            '/' +
            movieId +
            '?api_key=' +
            Lampa.TMDB.key() +
            '&append_to_response=images&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            cache: true,

            success: function (data) {
                if (
                    currentActiveId !==
                    movieId
                ) {
                    return;
                }

                if (!data) return;

                detailsCache[movieId] =
                    data;

                applyMovieDetailsData(
                    data,
                    movie,
                    $render
                );
            }
        });
    }

    /* =========================================================
       TRAILER
    ========================================================= */

    function pickTrailer(data) {
        var vids =
            data.videos ||
            (
                data.movie &&
                data.movie.videos
            ) ||
            (
                data.tv &&
                data.tv.videos
            );

        if (
            !vids ||
            !vids.results ||
            !vids.results.length
        ) {
            return null;
        }

        var items = vids.results
            .filter(function (v) {
                return v &&
                    v.key &&
                    (
                        v.site === 'YouTube' ||
                        !v.site
                    );
            })
            .map(function (v) {
                return {
                    id: v.key,
                    code: v.iso_639_1,
                    time: v.published_at ?
                        new Date(
                            v.published_at
                        ).getTime() :
                        0,
                    name_orig:
                        (
                            v.name || ''
                        ).toLowerCase()
                };
            })
            .sort(function (a, b) {
                return b.time - a.time;
            });

        var currentLang =
            Lampa.Storage.field(
                'tmdb_lang'
            );

        var myLang =
            items.filter(function (n) {
                return n.code === currentLang;
            });

        var enLang =
            items.filter(function (n) {
                return (
                    n.code === 'en' &&
                    myLang.indexOf(n) === -1
                );
            });

        var all =
            myLang.concat(enLang);

        if (!all.length) {
            return null;
        }

        return (
            all.find(function (n) {
                return (
                    n.name_orig.indexOf(
                        'official trailer'
                    ) !== -1 ||
                    n.name_orig.indexOf(
                        'офіційний трейлер'
                    ) !== -1 ||
                    n.name_orig.indexOf(
                        'официальный трейлер'
                    ) !== -1
                );
            }) ||
            all.find(function (n) {
                return (
                    n.name_orig.indexOf(
                        'trailer'
                    ) !== -1 ||
                    n.name_orig.indexOf(
                        'трейлер'
                    ) !== -1
                );
            }) ||
            all[0]
        );
    }

    function startTrailer(
        e,
        $render,
        trailer
    ) {
        if (
            !trailer ||
            !$render ||
            !$render.length
        ) {
            return;
        }

        stopTrailer();

        var movie = getMovie(e);
        var itemId =
            movie && movie.id;

        var $wrap = $(
            '<div class="tvi-trailer">' +
            '<div class="tvi-trailer__yt">' +
            '<div class="tvi-trailer__iframe"></div>' +
            '<div class="tvi-trailer__overlay"></div>' +
            '</div>' +
            '</div>'
        );

        var $body =
            $render.find(
                '.activity__body'
            );

        if (!$body.length) {
            return;
        }

        $body.prepend($wrap);

        var player = null;
        var destroyed = false;
        var pollTimer = null;

        function destroy() {
            if (destroyed) return;

            destroyed = true;

            if (pollTimer) {
                clearInterval(
                    pollTimer
                );
                pollTimer = null;
            }

            try {
                if (player) {
                    player.destroy();
                }
            } catch (err) {}

            player = null;

            $wrap.remove();

            $render
                .find(
                    '.full-start__background'
                )
                .css('opacity', '');

            if (
                Lampa.Listener &&
                activityListener
            ) {
                Lampa.Listener.remove(
                    'activity',
                    activityListener
                );
            }
        }

        function activityListener(a) {
            if (
                destroyed ||
                !a ||
                a.type !== 'destroy'
            ) {
                return;
            }

            if (
                e.object &&
                a.object &&
                a.object.activity ===
                e.object.activity
            ) {
                destroy();
            }
        }

        Lampa.Listener.follow(
            'activity',
            activityListener
        );

        function initYT() {
            if (
                destroyed ||
                (
                    itemId &&
                    currentActiveId !==
                    itemId
                )
            ) {
                return;
            }

            if (
                !window.YT ||
                !window.YT.Player
            ) {
                return;
            }

            player = new window.YT.Player(
                $wrap.find(
                    '.tvi-trailer__iframe'
                )[0],
                {
                    height:
                        window.innerHeight,
                    width:
                        window.innerWidth,

                    videoId:
                        trailer.id,

                    playerVars: {
                        controls: 0,
                        autoplay: 1,
                        mute: 1,
                        disablekb: 1,
                        fs: 0,
                        playsinline: 1,
                        rel: 0,
                        modestbranding: 1,
                        iv_load_policy: 3,
                        enablejsapi: 1
                    },

                    events: {
                        onReady: function (
                            ev
                        ) {
                            if (destroyed) {
                                return;
                            }

                            var iframe =
                                $(ev.target.getIframe());

                            var blur =
                                parseInt(
                                    Lampa.Storage.get(
                                        'tv_interface_trailer_blur'
                                    )
                                ) || 0;

                            var zoom =
                                parseInt(
                                    Lampa.Storage.get(
                                        'tv_interface_trailer_zoom'
                                    )
                                ) || 0;

                            if (blur > 0) {
                                iframe.css(
                                    'filter',
                                    'blur(' +
                                    blur +
                                    'px)'
                                );
                            }

                            if (zoom > 0) {
                                iframe.css(
                                    'transform',
                                    'scale(' +
                                    (
                                        1 +
                                        zoom /
                                        100
                                    ) +
                                    ') translateZ(0)'
                                );
                            }

                            try {
                                ev.target.mute();
                                ev.target.playVideo();
                            } catch (err) {}
                        },

                        onStateChange:
                            function (st) {
                                if (
                                    destroyed
                                ) {
                                    return;
                                }

                                if (
                                    st.data ===
                                    window.YT.PlayerState.PLAYING
                                ) {
                                    requestAnimationFrame(
                                        function () {
                                            if (
                                                destroyed ||
                                                (
                                                    itemId &&
                                                    currentActiveId !==
                                                    itemId
                                                )
                                            ) {
                                                return;
                                            }

                                            $wrap.addClass(
                                                'display'
                                            );

                                            $render
                                                .find(
                                                    '.full-start__background'
                                                )
                                                .css(
                                                    'opacity',
                                                    '0'
                                                );
                                        }
                                    );
                                }

                                if (
                                    st.data ===
                                    window.YT.PlayerState.ENDED &&
                                    !destroyed
                                ) {
                                    try {
                                        st.target.seekTo(
                                            0,
                                            true
                                        );

                                        st.target.playVideo();
                                    } catch (
                                        err
                                    ) {}
                                }
                            },

                        onError:
                            function () {
                                destroy();
                            }
                    }
                }
            );
        }

        if (
            window.YT &&
            window.YT.Player
        ) {
            initYT();
        } else {
            pollTimer =
                setInterval(
                    function () {
                        if (
                            window.YT &&
                            window.YT.Player
                        ) {
                            clearInterval(
                                pollTimer
                            );

                            pollTimer = null;

                            initYT();
                        }
                    },
                    150
                );

            if (
                !window.tvi_yt_loading
            ) {
                window.tvi_yt_loading =
                    true;

                Lampa.Utils.putScript(
                    [
                        'https://www.youtube.com/iframe_api'
                    ],
                    function () {}
                );
            }
        }

        trailerDestroy = destroy;
    }

    /* =========================================================
       BACKDROP URL
    ========================================================= */

    function getBackdropUrl(
        quality,
        filePath
    ) {
        return Lampa.TMDB.image(
            't/p/' +
            quality +
            filePath
        );
    }

    /* =========================================================
       ПОПЕРЕДНЄ ЗАВАНТАЖЕННЯ
    ========================================================= */

    function preloadImage(
        url,
        callback
    ) {
        if (!url) {
            if (callback) callback(false);
            return;
        }

        if (backdropCache[url]) {
            if (callback) {
                callback(
                    backdropCache[url] ===
                    'loaded'
                );
            }

            return;
        }

        backdropCache[url] =
            'loading';

        var img = new Image();

        img.onload = function () {
            backdropCache[url] =
                'loaded';

            if (callback) {
                callback(true);
            }
        };

        img.onerror = function () {
            delete backdropCache[url];

            if (callback) {
                callback(false);
            }
        };

        img.src = url;
    }

    /* =========================================================
       СЛАЙДШОУ
       Подвійний шар замість постійної заміни src
    ========================================================= */

    function startSlideshow(
        e,
        $render
    ) {
        if (
            !Lampa.Storage.get(
                'tv_interface_slideshow'
            )
        ) {
            return;
        }

        var movie = getMovie(e);

        if (
            !movie ||
            !movie.id
        ) {
            return;
        }

        stopRotation();

        var itemId = movie.id;

        var mediaType =
            getMediaType(movie);

        var currentLang =
            Lampa.Storage.field(
                'tmdb_lang'
            ) || 'uk';

        var quality =
            Lampa.Storage.get(
                'tv_interface_slideshow_quality'
            ) || 'w1280';

        var duration =
            parseInt(
                Lampa.Storage.get(
                    'tv_interface_slideshow_duration'
                )
            ) || 8000;

        var requestKey =
            mediaType +
            '_' +
            itemId +
            '_' +
            currentLang;

        var cachedImages =
            backdropCache[
                'list_' + requestKey
            ];

        if (cachedImages) {
            setupBackdropRotation(
                $render,
                itemId,
                cachedImages,
                quality,
                duration
            );

            return;
        }

        Lampa.Api.sources.tmdb.get(
            mediaType +
            '/' +
            itemId +
            '/images?include_image_language=' +
            currentLang +
            ',xx,null,en',
            {},
            function (imagesData) {
                if (
                    currentActiveId !==
                    itemId
                ) {
                    return;
                }

                if (
                    !imagesData ||
                    !imagesData.backdrops ||
                    !imagesData.backdrops.length
                ) {
                    return;
                }

                var langB = [];
                var cleanB = [];
                var otherB = [];

                imagesData.backdrops.forEach(
                    function (b) {
                        var l =
                            b.iso_639_1;

                        if (
                            l === currentLang
                        ) {
                            langB.push(b);
                        } else if (
                            !l ||
                            l === 'xx' ||
                            l === 'null'
                        ) {
                            cleanB.push(b);
                        } else {
                            otherB.push(b);
                        }
                    }
                );

                var finalB =
                    cleanB.slice();

                if (
                    finalB.length < 3
                ) {
                    finalB =
                        finalB.concat(
                            langB
                        );
                }

                if (
                    finalB.length < 3
                ) {
                    otherB.sort(
                        function (a, b) {
                            return (
                                b.vote_average ||
                                0
                            ) - (
                                a.vote_average ||
                                0
                            );
                        }
                    );

                    finalB =
                        finalB.concat(
                            otherB
                        );
                }

                finalB =
                    finalB.slice(0, 15);

                if (
                    finalB.length < 2
                ) {
                    return;
                }

                backdropCache[
                    'list_' +
                    requestKey
                ] = finalB;

                setupBackdropRotation(
                    $render,
                    itemId,
                    finalB,
                    quality,
                    duration
                );
            }
        );
    }

    function setupBackdropRotation(
        $render,
        itemId,
        backdrops,
        quality,
        duration
    ) {
        stopRotation();

        if (
            !backdrops ||
            backdrops.length < 2
        ) {
            return;
        }

        var $original =
            $render
                .find(
                    '.full-start__background'
                )
                .first();

        if (!$original.length) {
            return;
        }

        var $container =
            $original.parent();

        if (!$container.length) {
            return;
        }

        /*
         * Видаляємо тільки шари,
         * створені нашим плагіном.
         */

        $container
            .find('.tvi-bg-layer')
            .remove();

        var firstUrl =
            getBackdropUrl(
                quality,
                backdrops[0].file_path
            );

        var secondUrl =
            getBackdropUrl(
                quality,
                backdrops[1].file_path
            );

        var $layerA = $(
            '<img class="tvi-bg-layer active" alt="">'
        );

        var $layerB = $(
            '<img class="tvi-bg-layer" alt="">'
        );

        $layerA.attr(
            'src',
            firstUrl
        );

        /*
         * Другий backdrop завантажується
         * заздалегідь.
         */

        preloadImage(
            secondUrl,
            function () {
                if (
                    currentActiveId ===
                    itemId
                ) {
                    $layerB.attr(
                        'src',
                        secondUrl
                    );
                }
            }
        );

        $container.append(
            $layerA
        );

        $container.append(
            $layerB
        );

        /*
         * Залишаємо оригінальний фон
         * під нашими шарами.
         */

        $original.css(
            'opacity',
            '0'
        );

        var index = 0;
        var activeLayer = 0;
        var destroyed = false;

        function scheduleNext() {
            if (destroyed) {
                return;
            }

            rotationTimer =
                setTimeout(
                    changeBackdrop,
                    duration
                );
        }

        function changeBackdrop() {
            rotationTimer = null;

            if (
                destroyed ||
                currentActiveId !==
                itemId
            ) {
                return;
            }

            index =
                (index + 1) %
                backdrops.length;

            var nextUrl =
                getBackdropUrl(
                    quality,
                    backdrops[index].file_path
                );

            var $active =
                activeLayer === 0 ?
                $layerA :
                $layerB;

            var $next =
                activeLayer === 0 ?
                $layerB :
                $layerA;

            /*
             * Спочатку завантажуємо
             * наступне зображення.
             */

            preloadImage(
                nextUrl,
                function (loaded) {
                    if (
                        destroyed ||
                        currentActiveId !==
                        itemId
                    ) {
                        return;
                    }

                    if (!loaded) {
                        scheduleNext();
                        return;
                    }

                    $next.attr(
                        'src',
                        nextUrl
                    );

                    /*
                     * Даємо браузеру завершити
                     * встановлення src.
                     */

                    requestAnimationFrame(
                        function () {
                            if (
                                destroyed ||
                                currentActiveId !==
                                itemId
                            ) {
                                return;
                            }

                            $next.addClass(
                                'active'
                            );

                            $active.removeClass(
                                'active'
                            );

                            activeLayer =
                                activeLayer === 0 ?
                                1 :
                                0;

                            scheduleNext();
                        }
                    );
                }
            );
        }

        scheduleNext();

        /*
         * Перша картинка також
         * прогрівається.
         */

        preloadImage(
            firstUrl
        );

        /*
         * Listener для destroy.
         */

        function activityStop(a) {
            if (
                !a ||
                a.type !== 'destroy'
            ) {
                return;
            }

            if (
                e.object &&
                a.object &&
                a.object.activity ===
                e.object.activity
            ) {
                destroyed = true;

                stopRotation();

                $container
                    .find(
                        '.tvi-bg-layer'
                    )
                    .remove();

                Lampa.Listener.remove(
                    'activity',
                    activityStop
                );
            }
        }

        Lampa.Listener.follow(
            'activity',
            activityStop
        );
    }

    /* =========================================================
       RATING ROW
    ========================================================= */

    function renderRatings(
        e,
        $render
    ) {
        var $main =
            $render.find(
                '.full-start-new'
            );

        if (!$main.length) {
            $main = $render;
        }

        $main
            .find(
                '.quality-row-inline'
            )
            .remove();

        var $row = $(
            '<div class="quality-row-inline"></div>'
        );

        var movie =
            e.data &&
            e.data.movie;

        if (!movie) {
            return;
        }

        var tmdb =
            parseFloat(
                movie.vote_average || 0
            );

        if (tmdb > 0) {
            tmdb =
                tmdb.toFixed(1);

            var $tmdb =
                $(
                    '<div class="plugin-rating-item wave-item">' +
                    '<img src="' +
                    ratingIcons.tmdb +
                    '">' +
                    '<span>' +
                    tmdb +
                    '</span>' +
                    '</div>'
                );

            $tmdb
                .find('span')
                .css(
                    'color',
                    getRatingColor(tmdb)
                );

            $row.append(
                $tmdb
            );
        }

        var cub =
            getCubRating(e);

        if (cub) {
            var $cub =
                $(
                    '<div class="plugin-rating-item wave-item">' +
                    '<img src="' +
                    ratingIcons.cub +
                    '">' +
                    '<span>' +
                    cub +
                    '</span>' +
                    '</div>'
                );

            $cub
                .find('span')
                .css(
                    'color',
                    getRatingColor(cub)
                );

            $row.append(
                $cub
            );
        }

        if ($row.children().length) {
            $main.append(
                $row
            );
        }
    }

    /* =========================================================
       КНОПКИ
    ========================================================= */

    function moveButtons(
        $render
    ) {
        var $body =
            $render.find(
                '.full-start-new__body'
            );

        var $buttons =
            $render.find(
                '.full-start-new__buttons'
            );

        if (
            !$body.length ||
            !$buttons.length
        ) {
            return;
        }

        if (
            $render.find(
                '.card-tweaks__buttons'
            ).length
        ) {
            return;
        }

        var $wrap = $(
            '<div class="card-tweaks__buttons"></div>'
        );

        $buttons
            .detach()
            .appendTo($wrap);

        $wrap.insertAfter(
            $body
        );
    }

    /* =========================================================
       FULL CARD
    ========================================================= */

    function init() {
        Lampa.Listener.follow(
            'full',
            function (e) {

                /*
                 * ------------------------------------------------
                 * DESTROY
                 * ------------------------------------------------
                 */

                if (
                    e.type ===
                    'destroy' ||
                    e.type ===
                    'onBeforeDestroy'
                ) {
                    currentActiveId =
                        null;

                    currentActivity =
                        null;

                    stopAllMedia();

                    return;
                }

                /*
                 * ------------------------------------------------
                 * CARD READY
                 * ------------------------------------------------
                 */

                if (
                    e.type !== 'complite' &&
                    e.type !== 'complete'
                ) {
                    return;
                }

                var movie =
                    e.data &&
                    e.data.movie;

                if (!movie) {
                    return;
                }

                var $render =
                    e.object &&
                    e.object.activity ?
                    e.object.activity.render() :
                    null;

                if (
                    !$render ||
                    !$render.length
                ) {
                    return;
                }

                currentActivity =
                    e.object.activity;

                currentActiveId =
                    movie.id;

                /*
                 * Зупиняємо все,
                 * що залишилося від попередньої картки.
                 */

                stopAllMedia();

                /*
                 * CSS створюємо лише один раз.
                 */

                if (!styleApplied) {
                    applyStyles();
                }

                /*
                 * Забираємо стандартний текстовий
                 * title — його замінює TMDB logo.
                 */

                var $title =
                    $render.find(
                        '.full-start-new__title'
                    );

                $title.empty();

                /*
                 * Відключення стандартного blur poster.
                 */

                if (
                    window.lampa_settings
                ) {
                    window.lampa_settings.blur_poster =
                        false;
                }

                /*
                 * Meta
                 */

                renderMeta(
                    $render.find(
                        '.full-start-new__right'
                    ),
                    e
                );

                /*
                 * TMDB details
                 */

                loadMovieDetails(
                    movie,
                    $render
                );

                /*
                 * Кнопки
                 */

                moveButtons(
                    $render
                );

                /*
                 * Ratings
                 */

                renderRatings(
                    e,
                    $render
                );

                /*
                 * Trailer / slideshow
                 */

                var trailerEnabled =
                    !!Lampa.Storage.get(
                        'tv_interface_trailer_bg'
                    );

                var trailer =
                    trailerEnabled ?
                    pickTrailer(e.data) :
                    null;

                if (
                    trailer &&
                    Lampa.Manifest.app_digital >=
                    220
                ) {
                    startTrailer(
                        e,
                        $render,
                        trailer
                    );
                } else {
                    startSlideshow(
                        e,
                        $render
                    );
                }
            }
        );
    }

    /* =========================================================
       SETTINGS
    ========================================================= */

    function setupSettings() {
        if (settingsInitialized) {
            return;
        }

        settingsInitialized = true;

        Lampa.SettingsApi.addComponent({
            component:
                'tv_interface',

            name:
                'Інтерфейс картки (TV)',

            icon:
                '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/>' +
                '</svg>'
        });

        /* -----------------------------------------------------
           UI ANIMATION
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_ui_anim',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    'Плавна анімація появи елементів'
            },

            onChange:
                applyStyles
        });

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_ui_anim_effect',

                type:
                    'select',

                values: {
                    smooth_zoom:
                        'Apple Smooth Zoom (Рекомендовано)',

                    cine_slide:
                        'Cinematic Slide Up',

                    luxury_fade:
                        'Luxury Depth Fade',

                    modern_shift:
                        'Modern Clean Shift'
                },

                default:
                    'smooth_zoom'
            },

            field: {
                name:
                    'Стиль анімації появи'
            },

            onChange:
                applyStyles
        });

        /* -----------------------------------------------------
           BADGES
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_badge_anim',

                type:
                    'select',

                values: {
                    none:
                        'Без анімації',

                    pulse:
                        'Пульсація',

                    breathe:
                        'Дихання',

                    spin_slow:
                        'Гойдання',

                    float:
                        'Підстрибування'
                },

                default:
                    'pulse'
            },

            field: {
                name:
                    'Анімація бейджів'
            },

            onChange:
                applyStyles
        });

        /* -----------------------------------------------------
           TAGLINE
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_show_tagline',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    'Відображати слоган'
            },

            onChange:
                applyStyles
        });

        /* -----------------------------------------------------
           GAP
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_blocks_gap',

                type:
                    'select',

                values: {
                    '8px':
                        'Компактний',

                    '12px':
                        'Стандартний',

                    '18px':
                        'Просторий',

                    '24px':
                        'Панорамний'
                },

                default:
                    '8px'
            },

            field: {
                name:
                    'Відступи між блоками'
            },

            onChange:
                applyStyles
        });

        /* -----------------------------------------------------
           FONT
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_ratings_size',

                type:
                    'select',

                values: {
                    '0.4em':
                        'Дрібний',

                    '0.45em':
                        'Звичайний',

                    '0.5em':
                        'Великий',

                    '0.55em':
                        'Дуже великий'
                },

                default:
                    '0.45em'
            },

            field: {
                name:
                    'Розмір шрифту інфо-блоків'
            },

            onChange:
                applyStyles
        });

        /* -----------------------------------------------------
           STUDIOS
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_studios',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    'Показувати логотип студії'
            }
        });

        /* -----------------------------------------------------
           SLIDESHOW
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_slideshow',

                type:
                    'trigger',

                default:
                    true
            },

            field: {
                name:
                    'Слайдшоу фонових зображень',

                description:
                    'Плавна зміна backdrops з TMDB на фоні картки'
            }
        });

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_slideshow_duration',

                type:
                    'select',

                values: {
                    5000:
                        '5 секунд',

                    8000:
                        '8 секунд',

                    10000:
                        '10 секунд',

                    15000:
                        '15 секунд'
                },

                default:
                    8000
            },

            field: {
                name:
                    'Інтервал зміни зображень'
            }
        });

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_slideshow_quality',

                type:
                    'select',

                values: {
                    w780:
                        'Стандартна (W780)',

                    w1280:
                        'Висока (W1280)',

                    original:
                        'Оригінал'
                },

                default:
                    'w1280'
            },

            field: {
                name:
                    'Якість зображень слайдшоу'
            }
        });

        /* -----------------------------------------------------
           TRAILER
        ----------------------------------------------------- */

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_trailer_bg',

                type:
                    'trigger',

                default:
                    false
            },

            field: {
                name:
                    'Фоновий відеоряд (Трейлер)',

                description:
                    'Автоматично відтворювати трейлер YouTube на фоні без звуку замість слайдшоу'
            }
        });

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_trailer_blur',

                type:
                    'select',

                values: {
                    '0':
                        'Вимкнено (0%)',

                    '1':
                        '1%',

                    '2':
                        '2%',

                    '3':
                        '3%',

                    '4':
                        '4%',

                    '5':
                        '5%',

                    '10':
                        '10%'
                },

                default:
                    '0'
            },

            field: {
                name:
                    'Розмиття фонового відео',

                description:
                    'Ефект Blur для фонового плеєра'
            },

            onRender:
                function (item) {
                    if (
                        !Lampa.Storage.get(
                            'tv_interface_trailer_bg'
                        )
                    ) {
                        item.hide();
                    }
                }
        });

        Lampa.SettingsApi.addParam({
            component:
                'tv_interface',

            param: {
                name:
                    'tv_interface_trailer_zoom',

                type:
                    'select',

                values: {
                    '0':
                        'Вимкнено (0%)',

                    '25':
                        '25%',

                    '33':
                        '33%',

                    '40':
                        '40%',

                    '45':
                        '45%',

                    '50':
                        '50%'
                },

                default:
                    '0'
            },

            field: {
                name:
                    'Масштабування відео',

                description:
                    'Збільшення відео для приховування чорних смуг'
            },

            onRender:
                function (item) {
                    if (
                        !Lampa.Storage.get(
                            'tv_interface_trailer_bg'
                        )
                    ) {
                        item.hide();
                    }
                }
        });
    }

    /* =========================================================
       START
    ========================================================= */

    function startPlugin() {
        applyStyles();
        setupSettings();
        init();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow(
            'app',
            function (e) {
                if (
                    e.type === 'ready'
                ) {
                    startPlugin();
                }
            }
        );
    }

})();
