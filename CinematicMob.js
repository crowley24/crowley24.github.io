(function () {
    'use strict';

    /*
     * @name MOB_INTERFACE
     * @version 3.2.0
     * @author Crowley24
     * @description Cinematic Premium Evolution
     * @platforms Lampa | Mobile
     *
     * 3.2.0 CHANGES:
     * - Cinematic staggered entrance animations
     * - Lightweight opacity + transform animations
     * - Removed expensive blur animations
     * - Refined metadata typography and separators
     * - Premium studio logo presentation
     * - Improved movie logo responsive sizing
     * - Refined button press feedback
     * - Optimized mobile WebView animations
     * - Added TMDB logo image quality setting
     * - Preserved native Lampa background
     * - Removed blur_poster modification
     * - Preserved TMDB logo loading and caching
     * - Preserved studio logos and metadata
     * - Preserved native Lampa ratings and buttons
     */

    if (window.MOB_INTERFACE_V320_READY) return;
    window.MOB_INTERFACE_V320_READY = true;

    var detailsCache = {};
    var logoCache = {};
    var logoRequests = {};
    var logoImageCache = {};
    var logoImageRequests = {};

    var currentActiveId = null;
    var activeRenderToken = 0;
    var started = false;

    // --------------------------------------------------
    // SETTINGS
    // --------------------------------------------------

    var settings_list = [
        { id: 'mobile_interface_ui_anim', default: true },
        { id: 'mobile_interface_ui_anim_effect', default: 'cinematic' },
        { id: 'mobile_interface_logo_size_v2', default: '150' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '10px' },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
        { id: 'mobile_interface_studios', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function isElementCurrent($render, renderToken) {
        return (
            renderToken === activeRenderToken &&
            $render &&
            $render[0] &&
            document.body.contains($render[0])
        );
    }

    function trimCache(cache, max) {
        var keys = Object.keys(cache);

        if (keys.length > max) {
            delete cache[keys[0]];
        }
    }

    function getLogoQuality() {
        var quality = Lampa.Storage.get(
            'mobile_interface_logo_quality',
            'w500'
        );

        var allowed = [
            'original',
            'w300',
            'w500'
        ];

        return allowed.indexOf(quality) !== -1
            ? quality
            : 'w500';
    }

    // --------------------------------------------------
    // TMDB LOGO LANGUAGE SELECTION
    // --------------------------------------------------

    function pickMovieLogo(logos, lang) {
        if (!logos || !logos.length) return null;

        var order = [
            lang,
            'en',
            null
        ];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (logo) {
                return logo.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    // --------------------------------------------------
    // LOGO IMAGE PRELOAD
    // --------------------------------------------------

    function preloadMovieLogo(url, callback) {
        if (!url) {
            callback(null);
            return;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                logoImageCache,
                url
            )
        ) {
            callback(logoImageCache[url]);
            return;
        }

        if (logoImageRequests[url]) {
            logoImageRequests[url].push(callback);
            return;
        }

        logoImageRequests[url] = [callback];

        var image = new Image();
        var completed = false;

        var timer = setTimeout(function () {
            finish(null, false);
        }, 20000);

        function finish(result, shouldCache) {
            if (completed) return;

            completed = true;

            clearTimeout(timer);

            var waiters = logoImageRequests[url] || [];

            delete logoImageRequests[url];

            if (shouldCache) {
                logoImageCache[url] = result;
                trimCache(logoImageCache, 100);
            }

            waiters.forEach(function (waiter) {
                try {
                    waiter(result);
                } catch (e) {}
            });
        }

        image.onload = function () {
            finish(image, true);
        };

        image.onerror = function () {
            finish(null, false);
        };

        image.src = url;

        if (image.complete && image.naturalWidth > 0) {
            finish(image, true);
        }
    }

    // --------------------------------------------------
    // TMDB LOGO REQUEST
    // --------------------------------------------------

    function ensureMovieLogo(movie, type, callback) {
        if (!movie || !movie.id) {
            callback(null);
            return;
        }

        var tmdb = Lampa.Api &&
            Lampa.Api.sources &&
            Lampa.Api.sources.tmdb;

        if (!tmdb || typeof tmdb.get !== 'function') {
            callback(null);
            return;
        }

        var lang = Lampa.Storage.field('tmdb_lang') || 'en';
        var langs = lang + ',en,null';

        var cacheKey = type + ':' + movie.id + ':' + lang;

        if (
            Object.prototype.hasOwnProperty.call(
                logoCache,
                cacheKey
            )
        ) {
            callback(logoCache[cacheKey]);
            return;
        }

        if (logoRequests[cacheKey]) {
            logoRequests[cacheKey].waiters.push(callback);
            return;
        }

        var request = {
            waiters: [callback],
            finished: false,
            timer: null
        };

        logoRequests[cacheKey] = request;

        function finish(url, shouldCache) {
            if (request.finished) return;

            request.finished = true;

            if (request.timer) {
                clearTimeout(request.timer);
                request.timer = null;
            }

            if (shouldCache) {
                logoCache[cacheKey] = url || null;
                trimCache(logoCache, 250);
            }

            var waiters = request.waiters.slice();

            request.waiters = [];

            delete logoRequests[cacheKey];

            waiters.forEach(function (waiter) {
                try {
                    waiter(url || null);
                } catch (e) {}
            });
        }

        request.timer = setTimeout(function () {
            finish(null, false);
        }, 20000);

        try {
            tmdb.get(
                type + '/' + movie.id + '/images',
                {
                    filter: {
                        include_image_language: langs
                    }
                },
                function (data) {
                    if (request.finished) return;

                    var logos = [];

                    if (data && data.logos) {
                        logos = data.logos;
                    } else if (
                        data &&
                        data.images &&
                        data.images.logos
                    ) {
                        logos = data.images.logos;
                    }

                    var logo = pickMovieLogo(logos, lang);

                    if (!logo || !logo.file_path) {
                        finish(null, true);
                        return;
                    }

                    var logoUrl = Lampa.Api.img(
                        logo.file_path,
                        getLogoQuality()
                    );

                    finish(logoUrl, true);
                },
                function () {
                    finish(null, false);
                }
            );
        } catch (e) {
            finish(null, false);
        }
    }

    // --------------------------------------------------
    // MOVIE TYPE
    // --------------------------------------------------

    function getMovieType(movie) {
        return (
            movie &&
            (
                movie.name ||
                movie.first_air_date
            )
        ) ? 'tv' : 'movie';
    }

    // --------------------------------------------------
    // MOVIE LOGO DISPLAY
    // --------------------------------------------------

    function displayMovieLogo(movie, $render, renderToken) {
        if (
            !movie ||
            !movie.id ||
            !$render ||
            !$render.length
        ) {
            return;
        }

        var $title = $render.find(
            '.full-start-new__title'
        ).first();

        if (!$title.length) return;

        var nativeTitle = $title.contents().detach();

        $title
            .empty()
            .removeClass('mi320-logo-ready')
            .addClass('mi320-logo-pending');

        var type = getMovieType(movie);

        function restoreNativeTitle() {
            if (!isElementCurrent($render, renderToken)) return;

            var $finalTitle = $render.find(
                '.full-start-new__title'
            ).first();

            if (!$finalTitle.length) return;

            $finalTitle
                .removeClass('mi320-logo-pending')
                .removeClass('mi320-logo-ready')
                .empty()
                .append(nativeTitle);
        }

        ensureMovieLogo(
            movie,
            type,
            function (logoUrl) {
                if (!isElementCurrent($render, renderToken)) return;

                if (!logoUrl) {
                    restoreNativeTitle();
                    return;
                }

                preloadMovieLogo(
                    logoUrl,
                    function (image) {
                        if (!isElementCurrent($render, renderToken)) return;

                        if (!image) {
                            restoreNativeTitle();
                            return;
                        }

                        var $finalTitle = $render.find(
                            '.full-start-new__title'
                        ).first();

                        if (!$finalTitle.length) return;

                        var $logo = $(image.cloneNode(false));

                        $logo
                            .addClass('mi320-movie-logo')
                            .attr(
                                'alt',
                                movie.title ||
                                movie.name ||
                                movie.original_title ||
                                movie.original_name ||
                                ''
                            );

                        $finalTitle
                            .empty()
                            .removeClass('mi320-logo-pending')
                            .addClass('mi320-logo-ready')
                            .append($logo);
                    }
                );
            }
        );
    }

    // --------------------------------------------------
    // IMAGE DARKNESS DETECTION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // DUPLICATE HEADER METADATA CLEANUP
    // --------------------------------------------------

    function hideDuplicateHeaderMetadata($render) {
        if (!$render || !$render.length) return;

        var $right = $render.find(
            '.full-start-new__right'
        ).first();

        if (!$right.length) return;

        var root = $right[0];

        var title = $right.find(
            '.full-start-new__title'
        ).first()[0];

        if (!title) return;

        var protectedSelector = [
            '.full-start-new__title',
            '.full-start-new__tagline',
            '.full-start-new__buttons',
            '.studio-header-brand',
            '.plugin-meta-row',
            '.full-start__rates',
            '.full-start__button',
            'button',
            'a',
            'input',
            'img',
            'video',
            'svg'
        ].join(',');

        function isProtected(element) {
            if (!element || element === root) return true;

            if (
                element.matches &&
                element.matches(protectedSelector)
            ) {
                return true;
            }

            if (
                element.querySelector &&
                element.querySelector(protectedSelector)
            ) {
                return true;
            }

            return false;
        }

        function isYearCountryLine(element) {
            if (!element) return false;

            var text = String(element.textContent || '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!text || text.length > 90) return false;

            var yearMatch = text.match(/\b(?:19|20)\d{2}\b/);

            if (!yearMatch) return false;

            var remaining = text
                .replace(/\b(?:19|20)\d{2}\b/g, '')
                .replace(/[•·|,;:\/\-–—()[\]]/g, '')
                .replace(/\s+/g, '')
                .trim();

            return /[\p{L}]/u.test(remaining);
        }

        var candidates = [];
        var elements = root.querySelectorAll('*');

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];

            if (
                element.classList.contains('mi312-header-meta-hidden') ||
                isProtected(element)
            ) {
                continue;
            }

            if (!isYearCountryLine(element)) continue;

            var position = element.compareDocumentPosition(title);
            var beforeTitle = !!(position & 4);

            if (!beforeTitle) continue;

            candidates.push(element);
        }

        candidates.forEach(function (element) {
            if (!element.parentElement) return;

            var target = element;
            var current = element;

            for (var depth = 0; depth < 3; depth++) {
                var parent = current.parentElement;

                if (!parent || parent === root) break;
                if (isProtected(parent)) break;

                var parentText = String(parent.textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                var childText = String(target.textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (parentText !== childText) break;

                target = parent;
                current = parent;
            }

            if (
                target &&
                target !== root &&
                !isProtected(target)
            ) {
                target.classList.add('mi312-header-meta-hidden');
            }
        });
    }

    // --------------------------------------------------
    // ANIMATION CONFIGURATION
    // --------------------------------------------------

    function getAnimationSettings() {
        var effect = Lampa.Storage.get(
            'mobile_interface_ui_anim_effect',
            'cinematic'
        );

        var allowed = [
            'fluid',
            'cyber',
            'cinematic',
            'elastic',
            'minimal'
        ];

        if (allowed.indexOf(effect) === -1) {
            effect = 'cinematic';
        }

        return {
            enabled: !!Lampa.Storage.get(
                'mobile_interface_ui_anim',
                true
            ),
            effect: effect
        };
    }

    // --------------------------------------------------
    // STYLES
    // --------------------------------------------------

    function applyStyles() {
        var style = document.getElementById(
            'mobile-interface-styles'
        );

        if (!style) {
            style = document.createElement('style');
            style.id = 'mobile-interface-styles';
            document.head.appendChild(style);
        }

        var animation = getAnimationSettings();

        var lHeight = parseInt(
            Lampa.Storage.get(
                'mobile_interface_logo_size_v2',
                '150'
            ),
            10
        );

        if (!lHeight || lHeight < 80 || lHeight > 260) {
            lHeight = 150;
        }

        var showTagline = Lampa.Storage.get(
            'mobile_interface_show_tagline',
            true
        );

        var blocksGap = Lampa.Storage.get(
            'mobile_interface_blocks_gap',
            '10px'
        );

        var rSize = Lampa.Storage.get(
            'mobile_interface_ratings_size',
            '0.45em'
        );

        var effect = animation.effect;

        var timing = effect === 'elastic'
            ? 'cubic-bezier(.22,1.35,.45,1)'
            : 'cubic-bezier(.16,1,.3,1)';

        var enter = animation.enabled
            ? 'animation:mi320_' + effect + ' .68s ' +
              timing + ' both;'
            : '';

        var css = '';

        // --------------------------------------------------
        // LIGHTWEIGHT ANIMATIONS
        // --------------------------------------------------

        css += '@keyframes mi320_cinematic{';
        css += '0%{opacity:0;transform:translate3d(0,14px,0) scale(.985)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi320_fluid{';
        css += '0%{opacity:0;transform:translate3d(0,18px,0) scale(.98)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi320_cyber{';
        css += '0%{opacity:0;transform:translate3d(-12px,0,0)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0)}';
        css += '}';

        css += '@keyframes mi320_elastic{';
        css += '0%{opacity:0;transform:translate3d(0,10px,0) scale(.96)}';
        css += '72%{opacity:1;transform:translate3d(0,0,0) scale(1.012)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi320_minimal{';
        css += '0%{opacity:0;transform:translate3d(0,7px,0)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0)}';
        css += '}';

        // --------------------------------------------------
        // MOBILE
        // --------------------------------------------------

        css += '@media screen and (max-width:480px){';

        // MAIN CARD

        css += '.full-start-new{';
        css += 'position:relative!important;';
        css += 'isolation:isolate;';
        css += 'background:transparent!important;';
        css += '}';

        // HIDE REACTIONS

        css += '.full-start-new .full-start__reactions,';
        css += '.full-start-new [class*="reactions"]{';
        css += 'display:none!important;';
        css += '}';

        // DUPLICATE METADATA

        css += '.full-start-new .mi312-header-meta-hidden{';
        css += 'display:none!important;';
        css += 'visibility:hidden!important;';
        css += 'height:0!important;';
        css += 'min-height:0!important;';
        css += 'margin:0!important;';
        css += 'padding:0!important;';
        css += 'overflow:hidden!important;';
        css += '}';

        // HIDE AGE / STATUS / DETAILS

        css += '.full-start-new .full-start__age,';
        css += '.full-start-new .full-start-new__age,';
        css += '.full-start-new [class*="age"],';
        css += '.full-start-new [class*="pg"]{';
        css += 'display:none!important;';
        css += 'visibility:hidden!important;';
        css += '}';

        css += '.full-start-new .full-start__status,';
        css += '.full-start-new .full-start-new__status,';
        css += '.full-start-new .full-start-new__details,';
        css += '.full-start-new .full-start__info{';
        css += 'display:none!important;';
        css += '}';

        /*
         * NATIVE LAMPA BACKGROUND
         *
         * Не змінюємо:
         * - poster
         * - backdrop
         * - висоту фонового зображення
         * - маску та градієнт
         * - фонові анімації
         */

        // MAIN CONTENT

        css += '.full-start-new .full-start-new__right{';
        css += 'position:relative!important;';
        css += 'z-index:3!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'gap:' + blocksGap + '!important;';
        css += 'padding:0 16px!important;';
        css += 'background:none!important;';
        css += 'box-sizing:border-box!important;';
        css += '}';

        // --------------------------------------------------
        // STUDIO LOGO
        // --------------------------------------------------

        css += '.full-start-new .studio-header-brand{';
        css += enter;
        css += 'animation-delay:.04s;';
        css += 'order:1;';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'align-items:center;';
        css += 'margin:0 0 3px!important;';
        css += 'min-height:19px;';
        css += 'opacity:.92;';
        css += '}';

        css += '.full-start-new .studio-header-brand img{';
        css += 'display:block;';
        css += 'height:18px!important;';
        css += 'width:auto!important;';
        css += 'max-width:112px!important;';
        css += 'object-fit:contain;';
        css += 'opacity:.88;';
        css += 'filter:drop-shadow(0 2px 7px rgba(0,0,0,.8));';
        css += 'transition:opacity .28s ease,filter .28s ease;';
        css += '}';

        css += '.full-start-new .studio-header-brand img.is-dark-logo{';
        css += 'filter:brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,.7))!important;';
        css += '}';

        // --------------------------------------------------
        // MOVIE LOGO
        // --------------------------------------------------

        css += '.full-start-new .full-start-new__title{';
        css += 'animation:none!important;';
        css += 'order:2;';
        css += 'width:100%!important;';
        css += 'min-height:64px;';
        css += 'display:flex!important;';
        css += 'justify-content:center!important;';
        css += 'align-items:center!important;';
        css += 'margin:0!important;';
        css += 'padding:0!important;';
        css += 'overflow:visible!important;';
        css += 'opacity:1!important;';
        css += 'transform:none!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title.mi320-logo-pending{';
        css += 'display:none!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title.mi320-logo-ready{';
        css += 'display:flex!important;';
        css += 'visibility:visible!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title img.mi320-movie-logo{';
        css += 'display:block!important;';
        css += 'height:auto!important;';
        css += 'max-height:' + lHeight + 'px!important;';
        css += 'width:auto!important;';
        css += 'max-width:min(88vw,440px)!important;';
        css += 'object-fit:contain!important;';
        css += 'filter:drop-shadow(0 4px 14px rgba(0,0,0,.88));';
        css += 'margin:0 auto!important;';
        css += 'opacity:1!important;';
        css += 'transform:none!important;';
        css += 'transition:none!important;';
        css += 'animation:none!important;';
        css += '}';

        // --------------------------------------------------
        // TAGLINE
        // --------------------------------------------------

        css += '.full-start-new .full-start-new__tagline{';
        css += enter;
        css += 'animation-delay:.14s;';
        css += 'order:3;';
        css += 'display:' + (showTagline ? 'block' : 'none') + '!important;';
        css += 'max-width:88%;';
        css += 'margin:2px 0 3px!important;';
        css += 'text-align:center!important;';
        css += 'font-family:Georgia,serif!important;';
        css += 'font-size:clamp(12px,3.1vw,14px)!important;';
        css += 'line-height:1.5!important;';
        css += 'font-style:italic!important;';
        css += 'font-weight:400!important;';
        css += 'letter-spacing:.035em;';
        css += 'color:rgba(255,255,255,.84)!important;';
        css += 'text-shadow:0 2px 12px rgba(0,0,0,.9);';
        css += '}';

        // --------------------------------------------------
        // METADATA ROW
        // --------------------------------------------------

        css += '.full-start-new .plugin-meta-row{';
        css += enter;
        css += 'animation-delay:.22s;';
        css += 'order:4;';
        css += 'width:100%;';
        css += 'max-width:100%;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'align-items:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:6px 9px;';
        css += 'margin:5px 0 0!important;';
        css += 'padding:4px 0;';
        css += 'box-sizing:border-box;';
        css += 'border:none!important;';
        css += 'border-radius:0!important;';
        css += 'background:transparent!important;';
        css += 'box-shadow:none!important;';
        css += 'backdrop-filter:none!important;';
        css += '-webkit-backdrop-filter:none!important;';
        css += 'font-family:Inter,-apple-system,system-ui,sans-serif;';
        css += 'font-size:calc(' + rSize + ' * 2.2);';
        css += 'line-height:1.45;';
        css += 'color:rgba(255,255,255,.93);';
        css += 'text-shadow:0 1px 6px rgba(0,0,0,.95);';
        css += '}';

        css += '.full-start-new .plugin-meta-row .info-text-item{';
        css += 'font-size:.88em;';
        css += 'font-weight:500;';
        css += 'white-space:normal;';
        css += 'text-align:center;';
        css += 'letter-spacing:.035em;';
        css += 'opacity:.91;';
        css += '}';

        // METADATA SEPARATORS

        css += '.full-start-new .plugin-meta-row .info-separator{';
        css += 'display:inline-block;';
        css += 'width:1px;';
        css += 'height:10px;';
        css += 'min-width:1px;';
        css += 'font-size:0;';
        css += 'line-height:0;';
        css += 'color:transparent;';
        css += 'background:rgba(255,255,255,.32);';
        css += 'margin:0 1px;';
        css += 'opacity:.85;';
        css += 'vertical-align:middle;';
        css += '}';

        // NATIVE RATINGS

        css += '.full-start-new .plugin-meta-row .full-start__rates{';
        css += 'display:inline-flex!important;';
        css += 'align-items:center;';
        css += 'justify-content:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:9px;';
        css += 'margin:0!important;';
        css += 'padding:0!important;';
        css += 'background:none!important;';
        css += '}';

        css += '.full-start-new .plugin-meta-row .rate--tmdb,';
        css += '.full-start-new .plugin-meta-row .rate--imdb,';
        css += '.full-start-new .plugin-meta-row .rate--kp{';
        css += 'display:inline-flex!important;';
        css += 'align-items:center;';
        css += 'margin:0!important;';
        css += 'padding:0!important;';
        css += 'font-size:.9em!important;';
        css += 'white-space:nowrap!important;';
        css += '}';

        // --------------------------------------------------
        // BUTTON CONTAINER
        // --------------------------------------------------

        css += '.full-start-new .full-start-new__buttons{';
        css += enter;
        css += 'animation-delay:.30s;';
        css += 'order:6;';
        css += 'display:flex!important;';
        css += 'justify-content:space-around!important;';
        css += 'align-items:center!important;';
        css += 'gap:6px;';
        css += 'width:100%!important;';
        css += 'max-width:100%!important;';
        css += 'padding:5px 0 0!important;';
        css += 'box-sizing:border-box!important;';
        css += 'margin:8px 0 0!important;';
        css += 'background:transparent!important;';
        css += 'border:none!important;';
        css += 'box-shadow:none!important;';
        css += '}';

        // BUTTONS

        css += '.full-start-new .full-start__button{';
        css += 'position:relative;';
        css += 'overflow:hidden;';
        css += 'background:transparent!important;';
        css += 'border:1px solid transparent!important;';
        css += 'border-radius:13px!important;';
        css += 'box-shadow:none!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'justify-content:center!important;';
        css += 'flex:1 1 0!important;';
        css += 'min-width:0!important;';
        css += 'min-height:56px;';
        css += 'padding:8px 3px!important;';
        css += 'opacity:.88;';
        css += 'transform:translateZ(0);';
        css += 'transition:transform .24s cubic-bezier(.2,.8,.2,1),background .24s ease,opacity .24s ease;';
        css += 'will-change:transform;';
        css += '}';

        css += '.full-start-new .full-start__button:before,';
        css += '.full-start-new .full-start__button:after{';
        css += 'display:none!important;';
        css += 'content:none!important;';
        css += '}';

        // BUTTON ICONS

        css += '.full-start-new .full-start__button svg,';
        css += '.full-start-new .full-start__button img{';
        css += 'position:relative;';
        css += 'z-index:1;';
        css += 'width:22px!important;';
        css += 'height:22px!important;';
        css += 'margin:0 0 6px!important;';
        css += 'fill:#fff!important;';
        css += 'filter:drop-shadow(0 2px 5px rgba(0,0,0,.65));';
        css += 'transition:transform .24s cubic-bezier(.2,.8,.2,1),opacity .2s ease;';
        css += '}';

        // BUTTON LABELS

        css += '.full-start-new .full-start__button span{';
        css += 'position:relative;';
        css += 'z-index:1;';
        css += 'font-size:8px!important;';
        css += 'line-height:1.25!important;';
        css += 'text-transform:uppercase!important;';
        css += 'opacity:.78!important;';
        css += 'font-weight:650;';
        css += 'letter-spacing:.075em;';
        css += 'text-shadow:0 1px 5px rgba(0,0,0,.85);';
        css += 'transition:opacity .2s ease;';
        css += '}';

        // PRESS FEEDBACK

        css += '.full-start-new .full-start__button:active{';
        css += 'transform:scale(.93)!important;';
        css += 'background:rgba(255,255,255,.09)!important;';
        css += 'border-color:rgba(255,255,255,.08)!important;';
        css += 'box-shadow:0 2px 12px rgba(0,0,0,.12)!important;';
        css += 'opacity:1;';
        css += '}';

        css += '.full-start-new .full-start__button:active svg,';
        css += '.full-start-new .full-start__button:active img{';
        css += 'transform:scale(.9);';
        css += 'opacity:1;';
        css += '}';

        css += '.full-start-new .full-start__button:active span{';
        css += 'opacity:1!important;';
        css += '}';

        // --------------------------------------------------
        // RESPONSIVE TUNING
        // --------------------------------------------------

        css += '@media screen and (max-width:360px){';

        css += '.full-start-new .full-start-new__right{';
        css += 'padding-left:12px!important;';
        css += 'padding-right:12px!important;';
        css += '}';

        css += '.full-start-new .plugin-meta-row{';
        css += 'gap:5px 7px;';
        css += '}';

        css += '.full-start-new .full-start__button{';
        css += 'min-height:52px;';
        css += '}';

        css += '.full-start-new .full-start__button svg,';
        css += '.full-start-new .full-start__button img{';
        css += 'width:20px!important;';
        css += 'height:20px!important;';
        css += '}';

        css += '}';

        css += '}';

        // --------------------------------------------------
        // REDUCED MOTION
        // --------------------------------------------------

        css += '@media (prefers-reduced-motion:reduce){';

        css += '.full-start-new *{';
        css += 'animation-duration:.01ms!important;';
        css += 'animation-iteration-count:1!important;';
        css += 'transition-duration:.01ms!important;';
        css += '}';

        css += '}';

        style.textContent = css;
    }

    // --------------------------------------------------
    // TIME FORMAT
    // --------------------------------------------------

    function formatTime(mins) {
        if (!mins) return '';

        var h = Math.floor(mins / 60);
        var m = mins % 60;

        return (h > 0 ? h + 'г ' : '') + m + 'хв';
    }

    // --------------------------------------------------
    // METADATA ROW
    // --------------------------------------------------

    function renderMeta(container, e) {
        container.find('.plugin-meta-row').remove();

        var movie = e.data.movie || {};
        var $metaRow = $('<div class="plugin-meta-row"></div>');

        function addText(value) {
            if (
                value === undefined ||
                value === null ||
                value === ''
            ) {
                return;
            }

            if ($metaRow.children().length) {
                $metaRow.append(
                    '<span class="info-separator">•</span>'
                );
            }

            $('<div class="info-text-item"></div>')
                .text(String(value))
                .appendTo($metaRow);
        }

        // YEAR

        var date = movie.release_date ||
            movie.first_air_date ||
            '';

        addText(date ? date.substring(0, 4) : '');

        // COUNTRY

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

        addText(country);

        // RUNTIME

        var runtime = movie.runtime || (
            movie.episode_run_time &&
            movie.episode_run_time.length
                ? movie.episode_run_time[0]
                : 0
        );

        if (runtime) {
            addText(formatTime(runtime));
        }

        // GENRES

        if (movie.genres && movie.genres.length) {
            addText(
                movie.genres
                    .slice(0, 2)
                    .map(function (g) {
                        return g.name || '';
                    })
                    .filter(Boolean)
                    .join(', ')
            );
        }

        // NATIVE LAMPA RATINGS

        var $card = container.closest('.full-start-new');
        var $nativeRates = $card.find('.full-start__rates').first();

        if (!$nativeRates.length) {
            var $rates = $card.find(
                '.rate--tmdb, .rate--imdb, .rate--kp'
            );

            if ($rates.length) {
                $nativeRates = $(
                    '<div class="full-start__rates"></div>'
                );

                $rates.each(function () {
                    $nativeRates.append(this);
                });
            }
        }

        if ($nativeRates.length) {
            if ($metaRow.children().length) {
                $metaRow.append(
                    '<span class="info-separator">•</span>'
                );
            }

            $nativeRates.appendTo($metaRow);
        }

        container.append($metaRow);
    }

    // --------------------------------------------------
    // TMDB DETAILS
    // Studio logos only — no backdrop handling
    // --------------------------------------------------

    function applyMovieDetailsData(
        data,
        movie,
        $render,
        renderToken
    ) {
        if (!isElementCurrent($render, renderToken)) return;

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
                studio = data.production_companies.find(function (c) {
                    return c.logo_path;
                });
            }

            if (studio && studio.logo_path) {
                var studioLogoUrl = Lampa.TMDB.image(
                    '/t/p/w200' + studio.logo_path
                );

                var $brand = $(
                    '<div class="studio-header-brand">' +
                    '<img src="' + studioLogoUrl +
                    '" alt="' + (studio.name || '') +
                    '">' +
                    '</div>'
                );

                var $img = $brand.find('img');

                $img.on('error', function () {
                    $brand.remove();
                });

                isImageDark(studioLogoUrl, function (isDark) {
                    if (!isElementCurrent($render, renderToken)) return;

                    if (isDark) {
                        $img.addClass('is-dark-logo');
                    }
                });

                $render.find('.full-start-new__title')
                    .before($brand);
            }
        }

        hideDuplicateHeaderMetadata($render);
    }

    // --------------------------------------------------
    // LOAD TMDB DETAILS
    // --------------------------------------------------

    function loadMovieDetails(movie, $render, renderToken) {
        var movieId = movie.id;
        var type = getMovieType(movie);
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

        var url =
            'https://api.themoviedb.org/3/' +
            type + '/' + movieId +
            '?api_key=' + Lampa.TMDB.key();

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
                trimCache(detailsCache, 100);

                applyMovieDetailsData(
                    data,
                    movie,
                    $render,
                    renderToken
                );
            },

            error: function () {
                // TMDB error must not interrupt card rendering.
            }
        });
    }

    // --------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------

    function init() {
        Lampa.Listener.follow('full', function (e) {

            if (
                e.type === 'destroy' ||
                e.type === 'onBeforeDestroy'
            ) {
                activeRenderToken++;
                currentActiveId = null;
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

            var renderToken = ++activeRenderToken;
            var movie = e.data.movie;
            var $render = e.object.activity.render();

            if (!$render || !$render.length) {
                return;
            }

            // METADATA

            renderMeta(
                $render.find('.full-start-new__right'),
                e
            );

            // HIDE DUPLICATE YEAR / COUNTRY

            hideDuplicateHeaderMetadata($render);

            // TMDB LOGO

            displayMovieLogo(
                movie,
                $render,
                renderToken
            );

            // TMDB DETAILS / STUDIO LOGO

            loadMovieDetails(
                movie,
                $render,
                renderToken
            );
        });
    }

    // --------------------------------------------------
    // SETTINGS
    // --------------------------------------------------

    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            name: 'Мобільний інтерфейс',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>'
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
                default: 'cinematic'
            },
            field: {
                name: 'Стиль анімації появи'
            },
            onChange: applyStyles
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
                default: '150'
            },
            field: {
                name: 'Висота логотипу тайтлу'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_logo_quality',
                type: 'select',
                values: {
                    w300: 'Економна',
                    w500: 'Висока',
                    original: 'Оригінальна'
                },
                default: 'w500'
            },
            field: {
                name: 'Якість логотипу TMDB'
            },
            onChange: function () {
                // Новий логотип буде завантажено при наступному відкритті картки.
                logoCache = {};
                logoImageCache = {};
            }
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
                    '10px': 'Стандартний',
                    '16px': 'Просторий',
                    '22px': 'Панорамний'
                },
                default: '10px'
            },
            field: {
                name: 'Відступи між блоками'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_ratings_size',
                type: 'select',
                values: {
                    '0.4em': 'Дрібний',
                    '0.45em': 'Звичайний',
                    '0.5em': 'Великий',
                    '0.55em': 'Дуже великий'
                },
                default: '0.45em'
            },
            field: {
                name: 'Розмір шрифту інфо-блоків'
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
            onChange: applyStyles
        });
    }

    // --------------------------------------------------
    // START
    // --------------------------------------------------

    function startPlugin() {
        if (started) return;

        started = true;

        applyStyles();
        setupSettings();
        init();

        console.log(
            '[MOB_INTERFACE] 3.2.0 Cinematic Premium Evolution initialized'
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
