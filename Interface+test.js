(function () {
    'use strict';

    /*
     * @name MOB_INTERFACE
     * @version 3.0.2
     * @author Crowley24
     * @description Мобільний інтерфейс Lampa
     * @platforms Lampa | Mobile
     *
     * Зміни:
     * - видалено бейджі якості, звуку та мови
     * - видалено кастомні рейтинги
     * - стандартні рейтинги Lampa перенесено в рядок метаданих
     * - кеш TMDB розділено за типом контенту
     * - додано захист від застарілих асинхронних відповідей
     * - виправлено роботу таймера слайдшоу
     * - CSS обмежений карткою фільму
     * - оригінальний дизайн 3.0 збережено
     */

    if (window.MOB_INTERFACE_V302_READY) return;
    window.MOB_INTERFACE_V302_READY = true;

    var slideshowTimer = null;
    var detailsCache = {};
    var currentActiveId = null;
    var activeRenderToken = 0;
    var started = false;

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_ui_anim', default: true },
        { id: 'mobile_interface_ui_anim_effect', default: 'fluid' },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_slideshow_quality', default: 'w780' },
        { id: 'mobile_interface_logo_size_v2', default: '125' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '8px' },
        { id: 'mobile_interface_studios', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    function stopSlideshow() {
        if (slideshowTimer) {
            clearInterval(slideshowTimer);
            slideshowTimer = null;
        }
    }

    function isImageDark(imgSrc, callback) {
        var img = new Image();

        img.crossOrigin = 'Anonymous';

        img.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                canvas.width = 40;
                canvas.height = 40;

                ctx.drawImage(img, 0, 0, 40, 40);

                var imgData = ctx.getImageData(0, 0, 40, 40);
                var data = imgData.data;

                var totalBrightness = 0;
                var hasColor = false;
                var count = 0;

                for (var i = 0; i < data.length; i += 4) {
                    var alpha = data[i + 3];

                    if (alpha > 50) {
                        var r = data[i];
                        var g = data[i + 1];
                        var b = data[i + 2];

                        var brightness =
                            (r * 299 + g * 587 + b * 114) / 1000;

                        totalBrightness += brightness;
                        count++;

                        if (
                            Math.max(r, g, b) -
                            Math.min(r, g, b) > 30
                        ) {
                            hasColor = true;
                        }
                    }
                }

                var avgBrightness = count > 0
                    ? totalBrightness / count
                    : 255;

                callback(avgBrightness < 110 && !hasColor);

            } catch (e) {
                callback(false);
            }
        };

        img.onerror = function () {
            callback(false);
        };

        img.src = imgSrc;
    }

    function applyStyles() {
        var style = document.getElementById(
            'mobile-interface-styles'
        );

        if (!style) {
            style = document.createElement('style');
            style.id = 'mobile-interface-styles';
            document.head.appendChild(style);
        }

        var isPosterAnim = Lampa.Storage.get(
            'mobile_interface_animation'
        );

        var isUIAnim = Lampa.Storage.get(
            'mobile_interface_ui_anim'
        );

        var animEffect = Lampa.Storage.get(
            'mobile_interface_ui_anim_effect',
            'fluid'
        );

        var lHeight = Lampa.Storage.get(
            'mobile_interface_logo_size_v2',
            '125'
        );

        var showTagline = Lampa.Storage.get(
            'mobile_interface_show_tagline'
        );

        var blocksGap = Lampa.Storage.get(
            'mobile_interface_blocks_gap',
            '8px'
        );

        var css = '';

        css += '@keyframes kenBurnsEffect {';
        css += '0% { transform: scale(1); }';
        css += '50% { transform: scale(1.08); }';
        css += '100% { transform: scale(1); }';
        css += '}';

        css += '@keyframes anim_fluid {';
        css += '0% { opacity: 0; transform: translate3d(0,25px,0) scale(0.95); filter: blur(10px); }';
        css += '100% { opacity: 1; transform: translate3d(0,0,0) scale(1); filter: blur(0); }';
        css += '}';

        css += '@keyframes anim_cyber {';
        css += '0% { opacity: 0; transform: translate3d(-40px,0,0) scale(0.9); filter: brightness(1.5); }';
        css += '100% { opacity: 1; transform: translate3d(0,0,0) scale(1); filter: brightness(1); }';
        css += '}';

        css += '@keyframes anim_cinematic {';
        css += '0% { opacity: 0; transform: translate3d(0,15px,0) scale(1.08); filter: blur(6px); }';
        css += '100% { opacity: 1; transform: translate3d(0,0,0) scale(1); filter: blur(0); }';
        css += '}';

        css += '@keyframes anim_elastic {';
        css += '0% { opacity: 0; transform: scale(0.7); }';
        css += '70% { opacity: 1; transform: scale(1.04); }';
        css += '100% { opacity: 1; transform: scale(1); }';
        css += '}';

        css += '@keyframes anim_minimal {';
        css += '0% { opacity: 0; transform: translate3d(0,10px,0); }';
        css += '100% { opacity: 1; transform: translate3d(0,0,0); }';
        css += '}';

        css += '@keyframes poster_fade_in {';
        css += '0% { opacity: 0; transform: scale(1.05); }';
        css += '100% { opacity: 1; transform: scale(1); }';
        css += '}';

        css += '@media screen and (max-width:480px) {';

        /*
         * Приховування елементів тільки всередині картки.
         */

        css += '.full-start-new .full-start__reactions,';
        css += '.full-start-new [class*="reactions"] {';
        css += 'display:none!important;';
        css += '}';

        css += '.full-start-new .full-start-new__details,';
        css += '.full-start-new .full-start__info,';
        css += '.full-start-new .full-start__age,';
        css += '.full-start-new .full-start-new__age,';
        css += '.full-start-new .full-start__status,';
        css += '.full-start-new .full-start-new__status,';
        css += '.full-start-new [class*="age"],';
        css += '.full-start-new [class*="status"] {';
        css += 'display:none!important;';
        css += '}';

        /*
         * Оригінальне приховування першого блоку.
         */

        css += '.full-start-new .full-start-new__right > div:first-child {';
        css += 'display:none!important;';
        css += '}';

        /*
         * Фон обмежено карткою.
         */

        css += '.full-start-new {';
        css += 'position:relative!important;';
        css += '}';

        css += '.full-start-new .full-start-new__poster {';
        css += 'position:relative!important;';
        css += 'overflow:hidden!important;';
        css += 'background:#000;';
        css += 'z-index:1;';
        css += 'height:62vh!important;';

        if (isUIAnim) {
            css += 'animation:poster_fade_in 0.9s cubic-bezier(0.16,1,0.3,1) forwards;';
        }

        css += '}';

        css += '.full-start-new .full-start-new__poster img {';
        css += 'filter:none!important;';

        if (isPosterAnim) {
            css += 'animation:kenBurnsEffect 25s ease-in-out infinite!important;';
        }

        css += 'transform-origin:center center!important;';
        css += 'transition:opacity 1.2s ease-in-out!important;';
        css += 'position:absolute;';
        css += 'top:0;';
        css += 'left:0;';
        css += 'width:100%;';
        css += 'height:100%;';
        css += 'object-fit:cover;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';
        css += '-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';
        css += '}';

        css += '.full-start-new .full-start-new__right {';
        css += 'background:none!important;';
        css += 'margin-top:-160px!important;';
        css += 'z-index:2!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'padding:0 10px!important;';
        css += 'gap:' + blocksGap + '!important;';
        css += 'position:relative!important;';
        css += '}';

        var chosenAnimName = 'anim_' + animEffect;

        var animTiming = animEffect === 'elastic'
            ? 'cubic-bezier(0.34,1.56,0.64,1)'
            : 'cubic-bezier(0.16,1,0.3,1)';

        var uiAnimClass = isUIAnim
            ? 'animation:' + chosenAnimName +
              ' 0.8s ' + animTiming +
              ' forwards;opacity:0;' +
              'will-change:transform,opacity,filter;' +
              'transform:translateZ(0);'
            : '';

        css += '.full-start-new .studio-header-brand {';
        css += uiAnimClass;
        css += 'animation-delay:0.08s;';
        css += 'order:1;';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:flex-start;';
        css += 'align-items:center;';
        css += 'padding-left:5vw;';
        css += 'margin-bottom:-2px!important;';
        css += '}';

        css += '.full-start-new .studio-header-brand img {';
        css += 'height:18px!important;';
        css += 'width:auto;';
        css += 'max-width:110px;';
        css += 'object-fit:contain;';
        css += 'filter:drop-shadow(0 2px 5px rgba(0,0,0,0.9));';
        css += 'opacity:0.95;';
        css += '}';

        css += '.full-start-new .studio-header-brand img.is-dark-logo {';
        css += 'filter:brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title {';
        css += uiAnimClass;
        css += 'animation-delay:0.15s;';
        css += 'width:100%!important;';
        css += 'display:flex!important;';
        css += 'justify-content:center!important;';
        css += 'align-items:center!important;';
        css += 'margin:0!important;';
        css += 'min-height:50px;';
        css += 'order:2;';
        css += 'overflow:visible!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title img {';
        css += 'height:auto!important;';
        css += 'max-height:' + lHeight + 'px!important;';
        css += 'width:auto!important;';
        css += 'max-width:90vw!important;';
        css += 'object-fit:contain!important;';
        css += 'filter:drop-shadow(0 4px 20px rgba(0,0,0,0.9));';
        css += 'margin:0!important;';
        css += '}';

        css += '.full-start-new .full-start-new__tagline {';
        css += uiAnimClass;
        css += 'animation-delay:0.22s;';
        css += 'display:' + (showTagline ? 'block' : 'none') + '!important;';
        css += 'font-style:italic!important;';
        css += 'font-size:0.9em!important;';
        css += 'margin:0!important;';
        css += 'color:rgba(255,255,255,0.8)!important;';
        css += 'text-align:center!important;';
        css += 'order:3;';
        css += '}';

        css += '.full-start-new .plugin-meta-row {';
        css += uiAnimClass;
        css += 'animation-delay:0.28s;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'align-items:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:8px;';
        css += 'margin:0!important;';
        css += 'font-size:0.9em;';
        css += 'width:100%;';
        css += 'order:4;';
        css += 'color:rgba(255,255,255,0.85);';
        css += 'font-family:Inter,-apple-system,system-ui,sans-serif;';
        css += '}';

        /*
         * Стандартні рейтинги Lampa всередині рядка метаданих.
         */

        css += '.full-start-new .plugin-meta-row .full-start__rates {';
        css += 'display:flex!important;';
        css += 'align-items:center!important;';
        css += 'gap:6px!important;';
        css += 'margin:0!important;';
        css += 'padding:0!important;';
        css += 'background:none!important;';
        css += '}';

        css += '.full-start-new .plugin-meta-row .rate--tmdb,';
        css += '.full-start-new .plugin-meta-row .rate--imdb,';
        css += '.full-start-new .plugin-meta-row .rate--kp {';
        css += 'display:inline-flex!important;';
        css += 'align-items:center!important;';
        css += 'margin:0!important;';
        css += 'font-size:0.9em!important;';
        css += 'white-space:nowrap!important;';
        css += '}';

        css += '.full-start-new .info-text-item {';
        css += 'opacity:0.9;';
        css += 'font-weight:500;';
        css += 'font-size:0.85em;';
        css += 'white-space:nowrap;';
        css += '}';

        css += '.full-start-new .info-separator {';
        css += 'opacity:0.35;';
        css += 'font-size:0.8em;';
        css += 'margin:0 -2px;';
        css += '}';

        css += '.full-start-new .full-start-new__buttons {';
        css += uiAnimClass;
        css += 'animation-delay:0.42s;';
        css += 'display:flex!important;';
        css += 'justify-content:space-around!important;';
        css += 'align-items:center!important;';
        css += 'width:100%!important;';
        css += 'max-width:100%!important;';
        css += 'padding:0 4px!important;';
        css += 'box-sizing:border-box!important;';
        css += 'margin-top:4px!important;';
        css += 'order:6;';
        css += '}';

        css += '.full-start-new .full-start__button {';
        css += 'background:none!important;';
        css += 'border:none!important;';
        css += 'box-shadow:none!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'justify-content:center!important;';
        css += 'flex:1!important;';
        css += 'padding:8px 0!important;';
        css += 'min-width:0!important;';
        css += 'transition:transform 0.2s ease, opacity 0.2s ease;';
        css += '}';

        css += '.full-start-new .full-start__button:active {';
        css += 'transform:scale(0.9);';
        css += 'opacity:0.7;';
        css += '}';

        css += '.full-start-new .full-start__button svg,';
        css += '.full-start-new .full-start__button img {';
        css += 'width:24px!important;';
        css += 'height:24px!important;';
        css += 'margin-bottom:4px!important;';
        css += 'fill:#fff!important;';
        css += 'filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));';
        css += '}';

        css += '.full-start-new .full-start__button span {';
        css += 'font-size:9px!important;';
        css += 'text-transform:uppercase!important;';
        css += 'opacity:0.75!important;';
        css += 'font-weight:600;';
        css += 'letter-spacing:0.05em;';
        css += '}';

        css += '}';

        style.textContent = css;
    }

    function formatTime(mins) {
        if (!mins) return '';

        var h = Math.floor(mins / 60);
        var m = mins % 60;

        return (h > 0 ? h + 'г ' : '') + m + 'хв';
    }

    function renderMeta(container, e) {
        container.find('.plugin-meta-row').remove();

        var $metaRow = $('<div class="plugin-meta-row"></div>');
        var movie = e.data.movie || {};

        function addText(value) {
            if (value === undefined || value === null || value === '') return;

            if ($metaRow.children().length) {
                $metaRow.append('<span class="info-separator">•</span>');
            }

            $('<div class="info-text-item"></div>')
                .text(String(value))
                .appendTo($metaRow);
        }

        var date = movie.release_date || movie.first_air_date || '';
        addText(date ? date.substring(0, 4) : '');

        var country = '';

        if (movie.production_countries && movie.production_countries.length) {
            country = movie.production_countries[0].name ||
                movie.production_countries[0].iso_3166_1 ||
                '';
        } else if (movie.origin_country && movie.origin_country.length) {
            country = movie.origin_country[0];
        }

        addText(country);

        var runtime = movie.runtime || (
            movie.episode_run_time && movie.episode_run_time.length
                ? movie.episode_run_time[0]
                : 0
        );

        addText(runtime ? formatTime(runtime) : '');

        if (movie.genres && movie.genres.length) {
            addText(
                movie.genres.slice(0, 2).map(function (genre) {
                    return genre.name || '';
                }).filter(Boolean).join(', ')
            );
        }

        /*
         * Переміщуємо саме стандартні рейтинги Lampa.
         * Не створюємо власних оцінок і не змінюємо їхні значення.
         */

        var $card = container.closest('.full-start-new');
        var $nativeRates = $card.find('.full-start__rates').first();

        /*
         * Резервний варіант для збірок, де рейтинги
         * знаходяться окремими елементами.
         */

        if (!$nativeRates.length) {
            var $individualRates = $card.find(
                '.rate--tmdb, .rate--imdb, .rate--kp'
            );

            if ($individualRates.length) {
                $nativeRates = $('<div class="full-start__rates"></div>');

                $individualRates.each(function () {
                    $nativeRates.append(this);
                });
            }
        }

        if ($nativeRates.length) {
            if ($metaRow.children().length) {
                $metaRow.append('<span class="info-separator">•</span>');
            }

            $nativeRates.appendTo($metaRow);
        }

        container.append($metaRow);
    }

    function applyMovieDetailsData(data, movie, $render, renderToken) {
        if (
            data.images &&
            data.images.logos &&
            data.images.logos.length > 0
        ) {
            var lang = Lampa.Storage.get('language') || 'uk';

            var logo = data.images.logos.filter(function (l) {
                return l.iso_639_1 === lang;
            })[0] || data.images.logos.filter(function (l) {
                return l.iso_639_1 === 'en';
            })[0] || data.images.logos[0];

            if (logo) {
                var logoUrl = Lampa.TMDB.image(
                    '/t/p/' +
                    Lampa.Storage.get(
                        'mobile_interface_logo_quality',
                        'w500'
                    ) +
                    logo.file_path.replace('.svg', '.png')
                );

                $render.find('.full-start-new__title')
                    .html('<img src="' + logoUrl + '">');
            }
        }

        if (Lampa.Storage.get('mobile_interface_studios')) {
            $render.find('.studio-header-brand').remove();

            var studio = null;

            if (data.networks && data.networks.length > 0) {
                studio = data.networks.find(function (n) {
                    return n.logo_path;
                });
            }

            if (
                !studio &&
                data.production_companies &&
                data.production_companies.length > 0
            ) {
                studio = data.production_companies.find(
                    function (c) {
                        return c.logo_path;
                    }
                );
            }

            if (studio && studio.logo_path) {
                var studioLogoUrl = Lampa.TMDB.image(
                    '/t/p/w200' + studio.logo_path
                );

                var $brand = $(
                    '<div class="studio-header-brand">' +
                    '<img src="' + studioLogoUrl +
                    '" alt="' + (studio.name || '') +
                    '"></div>'
                );

                var $img = $brand.find('img');

                $img.on('error', function () {
                    $brand.remove();
                });

                isImageDark(studioLogoUrl, function (isDark) {
                    if (isDark) {
                        $img.addClass('is-dark-logo');
                    }
                });

                $render.find('.full-start-new__title')
                    .before($brand);
            }
        }

        if (data.images && data.images.backdrops) {
            var backdrops = data.images.backdrops.filter(
                function (elem) {
                    return elem.aspect_ratio > 1.5 &&
                        (
                            !elem.iso_639_1 ||
                            elem.iso_639_1 === 'xx'
                        );
                }
            );

            if (backdrops.length === 0) {
                backdrops = data.images.backdrops.filter(
                    function (elem) {
                        return elem.aspect_ratio > 1.5;
                    }
                );
            }

            if (backdrops.length > 0) {
                backdrops.sort(function (a, b) {
                    return (
                        b.vote_average || 0
                    ) - (
                        a.vote_average || 0
                    );
                });

                startPosterSlideshow(
                    $render.find('.full-start-new__poster'),
                    backdrops.slice(0, 15),
                    renderToken
                );
            }
        }
    }

    function loadMovieDetails(movie, $render, renderToken) {
        var movieId = movie.id;
        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';
        var cacheKey = type + ':' + movieId;

        currentActiveId = cacheKey;

        if (detailsCache[cacheKey]) {
            if (renderToken === activeRenderToken) {
                applyMovieDetailsData(
                    detailsCache[cacheKey],
                    movie,
                    $render,
                    renderToken
                );
            }
            return;
        }

        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId +
            '?api_key=' + Lampa.TMDB.key() +
            '&append_to_response=images' +
            '&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 12000,

            success: function (data) {
                if (
                    !data ||
                    renderToken !== activeRenderToken ||
                    currentActiveId !== cacheKey
                ) {
                    return;
                }

                detailsCache[cacheKey] = data;

                var keys = Object.keys(detailsCache);

                if (keys.length > 100) {
                    delete detailsCache[keys[0]];
                }

                applyMovieDetailsData(
                    data,
                    movie,
                    $render,
                    renderToken
                );
            },

            error: function () {
                // Помилка TMDB не повинна ламати картку Lampa.
            }
        });
    }
  
    function startPosterSlideshow($poster, items, renderToken) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) {
            return;
        }

        if (!items || !items.length || !$poster || !$poster.length) {
            return;
        }

        var index = 0;

        stopSlideshow();

        var intervalTime = parseInt(
            Lampa.Storage.get(
                'mobile_interface_slideshow_time',
                '10000'
            ),
            10
        );

        if (!intervalTime || intervalTime < 1000) {
            intervalTime = 10000;
        }

        slideshowTimer = setInterval(function () {
            if (
                !$poster ||
                $poster.length === 0 ||
                !document.body.contains($poster[0])
            ) {
                stopSlideshow();
                return;
            }

            index = (index + 1) % items.length;

            var imgUrl = Lampa.TMDB.image(
                '/t/p/' +
                Lampa.Storage.get(
                    'mobile_interface_slideshow_quality',
                    'w780'
                ) +
                items[index].file_path
            );

            var $current = $poster.find('img').first();
            var nextImg = new Image();

            nextImg.onload = function () {
                if (
                    renderToken !== activeRenderToken ||
                    !$poster[0] ||
                    !document.body.contains($poster[0])
                ) {
                    return;
                }

                var $next = $(
                    '<img src="' + imgUrl +
                    '" style="opacity:0;transition:opacity 1.2s ease-in-out;">'
                );

                $poster.append($next);

                setTimeout(function () {
                    if (
                        renderToken !== activeRenderToken ||
                        !$next[0] ||
                        !document.body.contains($next[0])
                    ) {
                        return;
                    }

                    $next.css('opacity', '1');
                    $current.css('opacity', '0');

                    setTimeout(function () {
                        if ($current && $current.length) {
                            $current.remove();
                        }
                    }, 1200);
                }, 100);
            };

            nextImg.src = imgUrl;
        }, intervalTime);
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (
                e.type === 'destroy' ||
                e.type === 'onBeforeDestroy'
            ) {
                activeRenderToken++;
                currentActiveId = null;
                stopSlideshow();
                return;
            }

            if (
                window.innerWidth > 480 ||
                (
                    e.type !== 'complite' &&
                    e.type !== 'complete'
                )
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

            stopSlideshow();

            var renderToken = ++activeRenderToken;
            var movie = e.data.movie;
            var $render = e.object.activity.render();

            if (!$render || !$render.length) {
                return;
            }

            if (window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }

            renderMeta(
                $render.find('.full-start-new__right'),
                e
            );

            loadMovieDetails(
                movie,
                $render,
                renderToken
            );
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            name: 'Мобільний інтерфейс',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_animation',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Зум-ефект постера (Ken Burns)'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_ui_anim',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Плавна анімація появи елементів'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_ui_anim_effect',
                type: 'select',
                values: {
                    fluid: 'Apple Fluid',
                    cyber: 'Cyber Neon',
                    cinematic: 'Cinematic Depth',
                    elastic: 'Elastic Spring',
                    minimal: 'Minimal Fade'
                },
                default: 'fluid'
            },
            field: {
                name: 'Стиль анімації появи'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_slideshow',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Автозміна фонових кадрів'
            },
            onChange: function () {
                stopSlideshow();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_slideshow_time',
                type: 'select',
                values: {
                    '10000': '10 сек',
                    '15000': '15 сек',
                    '20000': '20 сек'
                },
                default: '10000'
            },
            field: {
                name: 'Інтервал зміни фону'
            },
            onChange: function () {
                stopSlideshow();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_logo_size_v2',
                type: 'select',
                values: {
                    '125': 'Малий',
                    '150': 'Середній',
                    '180': 'Стандартний',
                    '210': 'Великий'
                },
                default: '125'
            },
            field: {
                name: 'Висота логотипу тайтлу'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_show_tagline',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Відображати слоган'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_blocks_gap',
                type: 'select',
                values: {
                    '8px': 'Компактний',
                    '12px': 'Стандартний',
                    '18px': 'Просторий',
                    '24px': 'Панорамний'
                },
                default: '8px'
            },
            field: {
                name: 'Відступи між блоками'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_studios',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Показувати логотип студії'
            },
            onChange: function () {
                applyStyles();
            }
        });
    }

    function startPlugin() {
        if (started) return;

        started = true;

        applyStyles();
        setupSettings();
        init();

        console.log(
            '[MOB_INTERFACE] 3.0.2 initialized'
        );
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
