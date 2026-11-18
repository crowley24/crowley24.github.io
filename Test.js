(function () {
    'use strict';

    /*
     * @name MOB_INTERFACE
     * @version 3.1.5
     * @author Crowley24
     * @description Minimal Cinematic Premium Mobile Interface with Filtered Slideshow & Trailers
     * @platforms Lampa | Mobile
     *
     * 3.1.5 CHANGES:
     * - Advanced TMDB backdrop filtering (aspect ratio > 1.5, language filtering)
     * - Robust poster slideshow with crossfade animation and timer cleanup
     * - Full YouTube trailer integration via TMDB videos API & Lampa Player
     * - Preserved minimal transparent metadata, buttons & layout
     */

    if (window.MOB_INTERFACE_V315_READY) return;
    window.MOB_INTERFACE_V315_READY = true;

    var slideshowTimer = null;
    var detailsCache = {};
    var currentActiveId = null;
    var activeRenderToken = 0;
    var started = false;

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_ui_anim', default: true },
        { id: 'mobile_interface_ui_anim_effect', default: 'cinematic' },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_slideshow_quality', default: 'w780' },
        { id: 'mobile_interface_logo_size_v2', default: '125' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '8px' },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
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

                        var brightness = (r * 299 + g * 587 + b * 114) / 1000;

                        totalBrightness += brightness;
                        count++;

                        if (Math.max(r, g, b) - Math.min(r, g, b) > 30) {
                            hasColor = true;
                        }
                    }
                }

                var avgBrightness = count > 0 ? totalBrightness / count : 255;
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

    /*
     * DUPLICATE HEADER METADATA CLEANUP
     */

    function hideDuplicateHeaderMetadata($render) {
        if (!$render || !$render.length) return;

        var $right = $render.find('.full-start-new__right').first();
        if (!$right.length) return;

        var root = $right[0];
        var title = $right.find('.full-start-new__title').first()[0];
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
            if (element.matches && element.matches(protectedSelector)) return true;
            if (element.querySelector && element.querySelector(protectedSelector)) return true;
            return false;
        }

        function isYearCountryLine(element) {
            if (!element) return false;
            var text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
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
            if (element.classList.contains('mi315-header-meta-hidden') || isProtected(element)) {
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

                var parentText = String(parent.textContent || '').replace(/\s+/g, ' ').trim();
                var childText = String(target.textContent || '').replace(/\s+/g, ' ').trim();

                if (parentText !== childText) break;
                target = parent;
                current = parent;
            }

            if (target && target !== root && !isProtected(target)) {
                target.classList.add('mi315-header-meta-hidden');
            }
        });
    }

    /*
     * STYLES
     */

    function applyStyles() {
        var style = document.getElementById('mobile-interface-styles');

        if (!style) {
            style = document.createElement('style');
            style.id = 'mobile-interface-styles';
            document.head.appendChild(style);
        }

        var isPosterAnim = Lampa.Storage.get('mobile_interface_animation');
        var isUIAnim = Lampa.Storage.get('mobile_interface_ui_anim');
        var animEffect = Lampa.Storage.get('mobile_interface_ui_anim_effect', 'cinematic');
        var lHeight = Lampa.Storage.get('mobile_interface_logo_size_v2', '125');
        var showTagline = Lampa.Storage.get('mobile_interface_show_tagline');
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '8px');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');

        var animNames = ['fluid', 'cyber', 'cinematic', 'elastic', 'minimal'];
        if (animNames.indexOf(animEffect) === -1) animEffect = 'cinematic';

        var animTiming = animEffect === 'elastic'
            ? 'cubic-bezier(0.34,1.56,0.64,1)'
            : 'cubic-bezier(0.16,1,0.3,1)';

        var enter = isUIAnim ? 'animation:anim_' + animEffect + ' .8s ' + animTiming + ' both;' : '';

        var css = '';

        css += '@keyframes kenBurnsEffect{';
        css += '0%{transform:scale(1)}';
        css += '50%{transform:scale(1.075)}';
        css += '100%{transform:scale(1)}';
        css += '}';

        css += '@keyframes anim_fluid{';
        css += '0%{opacity:0;transform:translate3d(0,22px,0) scale(.97);filter:blur(7px)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}';
        css += '}';

        css += '@keyframes anim_cyber{';
        css += '0%{opacity:0;transform:translate3d(-24px,0,0);filter:brightness(1.4)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0);filter:brightness(1)}';
        css += '}';

        css += '@keyframes anim_cinematic{';
        css += '0%{opacity:0;transform:translate3d(0,18px,0) scale(1.025);filter:blur(6px)}';
        css += '100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}';
        css += '}';

        css += '@keyframes anim_elastic{';
        css += '0%{opacity:0;transform:scale(.88)}';
        css += '75%{opacity:1;transform:scale(1.025)}';
        css += '100%{opacity:1;transform:scale(1)}';
        css += '}';

        css += '@keyframes anim_minimal{';
        css += '0%{opacity:0;transform:translateY(9px)}';
        css += '100%{opacity:1;transform:translateY(0)}';
        css += '}';

        css += '@keyframes poster_fade_in{';
        css += '0%{opacity:0;transform:scale(1.025)}';
        css += '100%{opacity:1;transform:scale(1)}';
        css += '}';

        css += '@media screen and (max-width:480px){';

        css += '.full-start-new{position:relative!important;isolation:isolate;background:transparent!important;}';
        css += '.full-start-new .full-start__reactions, .full-start-new [class*="reactions"]{display:none!important;}';

        css += '.full-start-new .mi315-header-meta-hidden{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}';
        css += '.full-start-new .full-start__age, .full-start-new .full-start-new__age, .full-start-new [class*="age"], .full-start-new [class*="pg"]{display:none!important;visibility:hidden!important;}';
        css += '.full-start-new .full-start__status, .full-start-new .full-start-new__status{display:none!important;}';
        css += '.full-start-new .full-start-new__details, .full-start-new .full-start__info{display:none!important;}';

        /* POSTER CONTAINER */
        css += '.full-start-new .full-start-new__poster{position:relative!important;overflow:hidden!important;background:#050608;z-index:1;height:62vh!important;min-height:390px;';
        if (isUIAnim) css += 'animation:poster_fade_in .9s cubic-bezier(.16,1,.3,1) both;';
        css += '}';

        css += '.full-start-new .full-start-new__poster:after{content:"";position:absolute;inset:15% 0 0;pointer-events:none;z-index:2;background:linear-gradient(180deg,rgba(5,7,11,0) 0%,rgba(5,7,11,.12) 22%,rgba(5,7,11,.38) 48%,rgba(5,7,11,.82) 78%,#050608 100%);}';

        css += '.full-start-new .full-start-new__poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.06) contrast(1.045)!important;transform-origin:center center!important;transition:opacity 1.35s ease-in-out!important;';
        if (isPosterAnim) css += 'animation:kenBurnsEffect 28s ease-in-out infinite!important;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 64%,transparent 100%)!important;-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 64%,transparent 100%)!important;}';

        /* MAIN CONTENT */
        css += '.full-start-new .full-start-new__right{position:relative!important;z-index:3!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:' + blocksGap + '!important;padding:0 14px!important;margin-top:-168px!important;background:none!important;}';

        /* STUDIO LOGO */
        css += '.full-start-new .studio-header-brand{' + enter + 'animation-delay:.04s;order:1;width:100%;display:flex;justify-content:center;align-items:center;margin:0 0 2px!important;min-height:20px;}';
        css += '.full-start-new .studio-header-brand img{height:20px!important;width:auto;max-width:120px;object-fit:contain;opacity:.94;filter:drop-shadow(0 2px 8px rgba(0,0,0,.95));transition:opacity .3s ease,filter .3s ease;}';
        css += '.full-start-new .studio-header-brand img.is-dark-logo{filter:brightness(0) invert(1) drop-shadow(0 2px 6px rgba(0,0,0,.8))!important;}';

        /* MOVIE LOGO */
        css += '.full-start-new .full-start-new__title{' + enter + 'animation-delay:.1s;order:2;width:100%!important;min-height:60px;display:flex!important;justify-content:center!important;align-items:center!important;margin:0!important;overflow:visible!important;}';
        css += '.full-start-new .full-start-new__title img{display:block;height:auto!important;max-height:' + lHeight + 'px!important;width:auto!important;max-width:90vw!important;object-fit:contain!important;filter:drop-shadow(0 5px 18px rgba(0,0,0,.95)) drop-shadow(0 0 12px rgba(255,255,255,.08));margin:0!important;transition:filter .4s ease,transform .4s ease;}';

        /* TAGLINE */
        css += '.full-start-new .full-start-new__tagline{' + enter + 'animation-delay:.17s;order:3;display:' + (showTagline ? 'block' : 'none') + '!important;max-width:90%;margin:1px 0 2px!important;text-align:center!important;font-family:Georgia,serif!important;font-size:.91em!important;line-height:1.5!important;font-style:italic!important;font-weight:400!important;letter-spacing:.025em;color:rgba(255,255,255,.82)!important;text-shadow:0 2px 12px rgba(0,0,0,.95);}';

        /* METADATA */
        css += '.full-start-new .plugin-meta-row{' + enter + 'animation-delay:.23s;order:4;width:100%;max-width:100%;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px 9px;margin:4px 0 0!important;padding:3px 0;box-sizing:border-box;border:none!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;font-family:Inter,-apple-system,system-ui,sans-serif;font-size:calc(' + rSize + ' * 2.25);line-height:1.5;color:rgba(255,255,255,.91);text-shadow:0 1px 5px rgba(0,0,0,.9);}';
        css += '.full-start-new .plugin-meta-row .info-text-item{font-size:.88em;font-weight:500;white-space:normal;text-align:center;letter-spacing:.025em;opacity:.94;}';
        css += '.full-start-new .plugin-meta-row .info-separator{display:inline-block;width:1px;height:11px;min-width:1px;font-size:0;line-height:0;color:transparent;background:rgba(255,255,255,.38);margin:0 1px;opacity:.8;vertical-align:middle;}';
        css += '.full-start-new .plugin-meta-row .full-start__rates{display:inline-flex!important;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px;margin:0!important;padding:0!important;background:none!important;}';
        css += '.full-start-new .plugin-meta-row .rate--tmdb, .full-start-new .plugin-meta-row .rate--imdb, .full-start-new .plugin-meta-row .rate--kp{display:inline-flex!important;align-items:center;margin:0!important;padding:0!important;font-size:.9em!important;white-space:nowrap!important;}';

        /* BUTTONS */
        css += '.full-start-new .full-start-new__buttons{' + enter + 'animation-delay:.31s;order:6;display:flex!important;justify-content:space-around!important;align-items:center!important;gap:7px;width:100%!important;max-width:100%!important;padding:3px 0 0!important;box-sizing:border-box!important;margin:7px 0 0!important;background:transparent!important;border:none!important;box-shadow:none!important;}';
        css += '.full-start-new .full-start__button{position:relative;overflow:hidden;background:transparent!important;border:1px solid transparent!important;border-radius:12px!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;flex:1 1 0!important;min-width:0!important;min-height:54px;padding:8px 2px!important;transition:transform .22s cubic-bezier(.16,1,.3,1),background .22s ease,color .22s ease,opacity .22s ease;opacity:.9;}';
        css += '.full-start-new .full-start__button:before{display:none!important;content:none!important;}';
        css += '.full-start-new .full-start__button:active{transform:scale(.94);background:rgba(255,255,255,.075)!important;border-color:transparent!important;box-shadow:none!important;opacity:1;}';
        css += '.full-start-new .full-start__button svg, .full-start-new .full-start__button img{position:relative;z-index:1;width:22px!important;height:22px!important;margin:0 0 5px!important;fill:#fff!important;filter:drop-shadow(0 2px 5px rgba(0,0,0,.65));transition:transform .22s ease,filter .22s ease;}';
        css += '.full-start-new .full-start__button span{position:relative;z-index:1;font-size:8px!important;line-height:1.2!important;text-transform:uppercase!important;opacity:.8!important;font-weight:650;letter-spacing:.065em;text-shadow:0 1px 5px rgba(0,0,0,.8);transition:opacity .22s ease;}';
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
        var movie = e.data.movie || {};
        var $metaRow = $('<div class="plugin-meta-row"></div>');

        function addText(value) {
            if (value === undefined || value === null || value === '') return;
            if ($metaRow.children().length) {
                $metaRow.append('<span class="info-separator">•</span>');
            }
            $('<div class="info-text-item"></div>').text(String(value)).appendTo($metaRow);
        }

        var date = movie.release_date || movie.first_air_date || '';
        addText(date ? date.substring(0, 4) : '');

        var country = '';
        if (movie.production_countries && movie.production_countries.length) {
            country = movie.production_countries[0].name || movie.production_countries[0].iso_3166_1 || '';
        } else if (movie.origin_country && movie.origin_country.length) {
            country = movie.origin_country[0];
        }
        addText(country);

        var runtime = movie.runtime || (movie.episode_run_time && movie.episode_run_time.length ? movie.episode_run_time[0] : 0);
        if (runtime) addText(formatTime(runtime));

        if (movie.genres && movie.genres.length) {
            addText(movie.genres.slice(0, 2).map(function (g) { return g.name || ''; }).filter(Boolean).join(', '));
        }

        var $card = container.closest('.full-start-new');
        var $nativeRates = $card.find('.full-start__rates').first();

        if (!$nativeRates.length) {
            var $rates = $card.find('.rate--tmdb, .rate--imdb, .rate--kp');
            if ($rates.length) {
                $nativeRates = $('<div class="full-start__rates"></div>');
                $rates.each(function () { $nativeRates.append(this); });
            }
        }

        if ($nativeRates.length) {
            if ($metaRow.children().length) $metaRow.append('<span class="info-separator">•</span>');
            $nativeRates.appendTo($metaRow);
        }

        container.append($metaRow);
    }

    /*
     * COMBINED DETAILS, FILTERED BACKDROPS, SLIDESHOW & TRAILERS HANDLER
     */

    function applyMovieDetailsData(data, movie, $render, renderToken) {
        if (renderToken !== activeRenderToken || !$render[0] || !document.body.contains($render[0])) return;

        /* 1. TITLE LOGO */
        if (data.images && data.images.logos && data.images.logos.length > 0) {
            var lang = Lampa.Storage.get('language') || 'uk';
            var logo = data.images.logos.filter(function (l) { return l.iso_639_1 === lang; })[0] ||
                       data.images.logos.filter(function (l) { return l.iso_639_1 === 'en'; })[0] ||
                       data.images.logos[0];

            if (logo) {
                var logoUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_logo_quality', 'w500') + logo.file_path.replace('.svg', '.png'));
                $render.find('.full-start-new__title').html($('<img>').attr('src', logoUrl).attr('alt', movie.title || movie.name || ''));
            }
        }

        /* 2. STUDIO LOGO */
        if (Lampa.Storage.get('mobile_interface_studios')) {
            $render.find('.studio-header-brand').remove();
            var studio = null;

            if (data.networks && data.networks.length > 0) {
                studio = data.networks.find(function (n) { return n.logo_path; });
            }
            if (!studio && data.production_companies && data.production_companies.length > 0) {
                studio = data.production_companies.find(function (c) { return c.logo_path; });
            }

            if (studio && studio.logo_path) {
                var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);
                var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');
                var $img = $brand.find('img');

                $img.on('error', function () { $brand.remove(); });
                isImageDark(studioLogoUrl, function (isDark) {
                    if (renderToken !== activeRenderToken || !$render[0] || !document.body.contains($render[0])) return;
                    if (isDark) $img.addClass('is-dark-logo');
                });

                $render.find('.full-start-new__title').before($brand);
            }
        }

        /* 3. TRAILERS INTEGRATION */
        if (data.videos && data.videos.results && data.videos.results.length > 0) {
            var trailers = data.videos.results.filter(function (v) {
                return v.site === 'YouTube' && v.type === 'Trailer';
            });

            if (trailers.length > 0) {
                var trailer = trailers.find(function (v) { return v.iso_639_1 === 'uk'; }) ||
                              trailers.find(function (v) { return v.iso_639_1 === 'en'; }) ||
                              trailers[0];

                if (trailer && trailer.key) {
                    var $trailerBtn = $render.find('.full-start__button.button--trailer, [data-action="trailer"]');
                    if ($trailerBtn.length) {
                        $trailerBtn.off('click.mi_trailer').on('click.mi_trailer', function (e) {
                            e.preventDefault();
                            Lampa.Noty.show('Запуск трейлера...');
                            if (Lampa.Player && typeof Lampa.Player.play === 'function') {
                                Lampa.Player.play({
                                    url: 'https://www.youtube.com/watch?v=' + trailer.key,
                                    title: (movie.title || movie.name || '') + ' (Трейлер)'
                                });
                            }
                        });
                    }
                }
            }
        }

        /* 4. FILTERED BACKDROPS & SLIDESHOW */
        if (data.images && data.images.backdrops) {
            // Фільтруємо кадри за горизонтальним співвідношенням та відсутністю зайвого тексту/мовних плашок
            var backdrops = data.images.backdrops.filter(function (elem) {
                return elem.aspect_ratio > 1.5 && (!elem.iso_639_1 || elem.iso_639_1 === 'xx');
            });
            if (backdrops.length === 0) {
                backdrops = data.images.backdrops.filter(function (elem) { return elem.aspect_ratio > 1.5; });
            }
            if (backdrops.length > 0) {
                backdrops.sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });
                startPosterSlideshow($render.find('.full-start-new__poster'), backdrops.slice(0, 15), renderToken);
            }
        }

        hideDuplicateHeaderMetadata($render);
    }

    function loadMovieDetails(movie, $render, renderToken) {
        var movieId = movie.id;
        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';
        var cacheKey = type + ':' + movieId;
        currentActiveId = cacheKey;

        if (detailsCache[cacheKey]) {
            if (renderToken === activeRenderToken) {
                applyMovieDetailsData(detailsCache[cacheKey], movie, $render, renderToken);
            }
            return;
        }

        // Запит до TMDB API з підтримкою зображень (бедропи, лого) та відео (трейлери)
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images,videos&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 12000,
            success: function (data) {
                if (!data || renderToken !== activeRenderToken || currentActiveId !== cacheKey) return;
                detailsCache[cacheKey] = data;
                var cacheKeys = Object.keys(detailsCache);
                if (cacheKeys.length > 100) delete detailsCache[cacheKeys[0]];
                applyMovieDetailsData(data, movie, $render, renderToken);
            },
            error: function () {}
        });
    }

    /*
     * SLIDESHOW MANAGER
     */

    function startPosterSlideshow($poster, items, renderToken) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || !items || !items.length || !$poster || !$poster.length) return;

        var index = 0;
        stopSlideshow();

        var intervalTime = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'), 10);
        if (!intervalTime || intervalTime < 1000) intervalTime = 10000;

        slideshowTimer = setInterval(function () {
            if (renderToken !== activeRenderToken || !$poster[0] || !document.body.contains($poster[0])) {
                stopSlideshow();
                return;
            }

            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780') + items[index].file_path);
            var nextImg = new Image();

            nextImg.onload = function () {
                if (renderToken !== activeRenderToken || !$poster[0] || !document.body.contains($poster[0])) return;

                var $current = $poster.find('img').first();
                var $next = $('<img>').attr('src', imgUrl).css({
                    opacity: 0,
                    transition: 'opacity 1.35s ease-in-out'
                });

                $poster.append($next);

                requestAnimationFrame(function () {
                    if (renderToken !== activeRenderToken) return;
                    $next.css('opacity', 1);
                    $current.css('opacity', 0);
                });

                setTimeout(function () {
                    if ($current && $current.length) $current.remove();
                }, 1450);
            };

            nextImg.onerror = function () {};
            nextImg.src = imgUrl;

        }, intervalTime);
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {
                activeRenderToken++;
                stopSlideshow();
                currentActiveId = null;
                return;
            }

            if (window.innerWidth > 480 || (e.type !== 'complite' && e.type !== 'complete')) return;
            if (!e.data || !e.data.movie || !e.object || !e.object.activity) return;

            stopSlideshow();

            var renderToken = ++activeRenderToken;
            var movie = e.data.movie;
            var $render = e.object.activity.render();

            if (!$render || !$render.length) return;

            if (window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }

            renderMeta($render.find('.full-start-new__right'), e);
            hideDuplicateHeaderMetadata($render);
            loadMovieDetails(movie, $render, renderToken);
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
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },
            field: { name: 'Зум-ефект постера (Ken Burns)' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_ui_anim', type: 'trigger', default: true },
            field: { name: 'Плавна анімація появи елементів' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_ui_anim_effect',
                type: 'select',
                values: { fluid: 'Apple Fluid', cyber: 'Cyber Neon', cinematic: 'Cinematic Depth', elastic: 'Elastic Spring', minimal: 'Minimal Fade' },
                default: 'cinematic'
            },
            field: { name: 'Стиль анімації появи' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Автозміна фонових кадрів' },
            onChange: function () { stopSlideshow(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_slideshow_time',
                type: 'select',
                values: { '10000': '10 сек', '15000': '15 сек', '20000': '20 сек' },
                default: '10000'
            },
            field: { name: 'Інтервал зміни фону' },
            onChange: function () { stopSlideshow(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_logo_size_v2',
                type: 'select',
                values: { '125': 'Малий', '150': 'Середній', '180': 'Стандартний', '210': 'Великий' },
                default: '125'
            },
            field: { name: 'Висота логотипу тайтлу' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_show_tagline', type: 'trigger', default: true },
            field: { name: 'Відображати слоган' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_blocks_gap',
                type: 'select',
                values: { '8px': 'Компактний', '12px': 'Стандартний', '18px': 'Просторий', '24px': 'Панорамний' },
                default: '8px'
            },
            field: { name: 'Відступи між блоками' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: {
                name: 'mobile_interface_ratings_size',
                type: 'select',
                values: { '0.4em': 'Дрібний', '0.45em': 'Звичайний', '0.5em': 'Великий', '0.55em': 'Дуже великий' },
                default: '0.45em'
            },
            field: { name: 'Розмір шрифту інфо-блоків' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_studios', type: 'trigger', default: true },
            field: { name: 'Показувати логотип студії' },
            onChange: applyStyles
        });
    }

    function startPlugin() {
        if (started) return;
        started = true;

        applyStyles();
        setupSettings();
        init();

        console.log('[MOB_INTERFACE] 3.1.5 Minimal Cinematic Premium with Filtered Slideshow & Trailers initialized');
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
