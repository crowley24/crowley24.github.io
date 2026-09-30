(function () {  
    'use strict';  
    /**  
     * ПЕРЕМІННІ ТА КЕШУВАННЯ  
     */  
    var pluginPath = 'https://crowley24.github.io/Icons/';  
    var detailsCache = {};  
    var currentActiveId = null;  
  
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
  
    var ratingIcons = {  
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
    };  
  
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
                        var r = data[i], g = data[i + 1], b = data[i + 2];  
                        var brightness = (r * 299 + g * 587 + b * 114) / 1000;  
                        totalBrightness += brightness;  
                        count++;  
                        if ((Math.max(r, g, b) - Math.min(r, g, b)) > 30) hasColor = true;  
                    }  
                }  
  
                var avgBrightness = count > 0 ? (totalBrightness / count) : 255;  
                callback((avgBrightness < 110) && !hasColor);  
            } catch (e) {  
                callback(false);  
            }  
        };  
        img.onerror = function () { callback(false); };  
        img.src = imgSrc;  
    }  

    function applyStyles() {  
        var style = document.getElementById('tv-interface-styles');  
        if (!style) {  
            style = document.createElement('style');  
            style.id = 'tv-interface-styles';  
            document.head.appendChild(style);  
        }  
  
        var isUIAnim = Lampa.Storage.get('tv_interface_ui_anim');  
        var animEffect = Lampa.Storage.get('tv_interface_ui_anim_effect', 'smooth_zoom');  
        var badgeAnim = Lampa.Storage.get('tv_interface_badge_anim', 'pulse');  
        var rSize = Lampa.Storage.get('tv_interface_ratings_size', '0.45em');  
        var showTagline = Lampa.Storage.get('tv_interface_show_tagline');  
        var blocksGap = Lampa.Storage.get('tv_interface_blocks_gap', '8px');  
  
        var css = '';  
  
        css += '@keyframes anim_smooth_zoom { 0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.94); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } } ';  
        css += '@keyframes anim_cine_slide { 0% { opacity: 0; transform: translate3d(0, 25px, 0); } 100% { opacity: 1; transform: translate3d(0, 0, 0); } } ';  
        css += '@keyframes anim_luxury_fade { 0% { opacity: 0; transform: translate3d(0, 12px, 0) scale(1.03); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } } ';  
        css += '@keyframes anim_modern_shift { 0% { opacity: 0; transform: translate3d(-18px, 0, 0); } 100% { opacity: 1; transform: translate3d(0, 0, 0); } } ';  
        css += '@keyframes wave_cascade { 0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(0.9); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); } } ';  
  
        css += '@keyframes badge_anim_pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } } ';  
        css += '@keyframes badge_anim_breathe { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.04); opacity: 1; } } ';  
        css += '@keyframes badge_anim_spin_slow { 0% { transform: rotate(0deg); } 25% { transform: rotate(2deg); } 75% { transform: rotate(-2deg); } 100% { transform: rotate(0deg); } } ';  
        css += '@keyframes badge_anim_float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } } ';  
  
        css += '.full-start__reactions, [class*="reactions"] { display: none !important; } ';  
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"] { display:none !important; } ';  
        css += '.full-start-new__right > div:first-child { display: none !important; } ';  
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';  
        css += '.background { background: #000 !important; } ';  
  
        css += '.full-start-new { position: relative !important; will-change: auto; } ';  
        css += '.full-start-new__poster { position: relative !important; background: #000; z-index: 1; } ';  
        css += '.full-start-new__poster img { filter: none !important; width: 100% !important; height: auto !important; object-fit: contain !important; ';  
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%) !important; } ';  
  
        css += '.full-start-new__right { background: none !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: flex-start !important; padding: 20px !important; gap: ' + blocksGap + ' !important; position: relative !important; } ';  
  
        var chosenAnimName = 'anim_' + animEffect;  
        var animTiming = 'cubic-bezier(0.16, 1, 0.3, 1)';  
  
        function getAnimRule(delay) {  
            if (!isUIAnim) return 'opacity: 1 !important;';  
            return 'animation: ' + chosenAnimName + ' 0.45s ' + animTiming + ' ' + delay + ' forwards; opacity: 0; will-change: transform, opacity;';  
        }  
  
        css += '.studio-header-brand { ' + getAnimRule('0.0s') + ' order: 1; width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: -2px !important; } ';  
        css += '.studio-header-brand img { height: 22px !important; width: auto; max-width: 130px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); opacity: 0.95; transition: opacity 0.3s ease; } ';  
        css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
  
        css += '.full-start-new__title { min-height: 60px; position: relative; font-size: 0 !important; color: transparent !important; ' + getAnimRule('0.08s') + ' width: 100% !important; display: flex !important; justify-content: flex-start !important; align-items: center !important; margin: 0 !important; order: 2; overflow: visible !important; } ';  
        css += '.full-start-new__title img { height: auto !important; max-height: 100px !important; width: auto !important; max-width: 45vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.7)); margin: 0 !important; opacity: 0; transition: opacity 0.3s ease-in-out; } ';  
        css += '.full-start-new__title img.loaded { opacity: 1; } ';  
  
        css += '.quality-row-inline { position: absolute; top: 30px; right: 24px; z-index: 99; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; pointer-events: none; } ';  
  
        css += '.full-start-new__tagline { ' + getAnimRule('0.15s') + ' display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 1em !important; margin: 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; order: 3; } ';  
        css += '.plugin-meta-row { ' + getAnimRule('0.22s') + ' display: flex; justify-content: flex-start; align-items: center; flex-wrap: nowrap; gap: 10px; margin: 0 !important; font-size: calc(' + rSize + ' * 2.8); width: 100%; order: 4; color: rgba(255,255,255,0.85); font-family: "Inter", -apple-system, system-ui, sans-serif; } ';  
  
        var loopAnimName = badgeAnim !== 'none' ? 'badge_anim_' + badgeAnim : '';  
        var loopDuration = badgeAnim === 'spin_slow' ? '4s' : (badgeAnim === 'breathe' ? '3s' : '2.5s');  
  
        css += '.wave-item { transform-origin: center center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); ';  
        if (badgeAnim !== 'none') {  
            css += 'animation: ' + loopAnimName + ' ' + loopDuration + ' ease-in-out infinite; ';  
        } else {  
            css += 'opacity: 1 !important;';  
        }  
        css += '} ';  
  
        css += '.quality-row-inline .plugin-rating-item { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #fff; font-size: 1.05em; padding: 2px 0; } ';  
        css += '.quality-row-inline .plugin-rating-item img { height: 1.1em; width: auto; } ';  
  
        css += '.info-text-item { opacity: 0.9; font-weight: 500; font-size: 0.9em; white-space: nowrap; } ';  
        css += '.info-separator { opacity: 0.35; font-size: 0.85em; margin: 0 -2px; } ';  
        css += '.card-tweaks__buttons { ' + getAnimRule('0.3s') + ' width: 100% !important; display: flex !important; justify-content: flex-start !important; align-items: center !important; gap: 15px !important; margin-top: 15px !important; order: 5; } ';  
  
        css += '.full-start__background { will-change: opacity; transition: opacity 0.8s ease-in-out; } ';  
  
        /* ПОВНІСТЮ ПРИХОВУЄМО СТАТИЧНИЙ ФОН ПІД ЧАС АКТИВНОГО ТРЕЙЛЕРА */  
        css += 'body.has-active-trailer .full-start__background { opacity: 0 !important; visibility: hidden !important; } ';  
  
        /* ТРЕЙЛЕР ПІДНЯТО ВИЩЕ, РАДІАЛЬНА МАСКА РОЗЧИНЯЄ ВЕНЬЄТКОЮ У ВИГЛЯДІ ГОРИЗОНТАЛЬНОГО ОВАЛУ */  
        css += '.tvi-trailer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; opacity: 0; transition: opacity .5s ease; pointer-events: none; } ';  
        css += '.tvi-trailer.display { opacity: 1; } ';  
        css += '.tvi-trailer__yt { position: fixed; top: -12vh; left: 30vw; width: 70vw; height: 118vh; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 0; ';  
        css += '-webkit-mask-image: radial-gradient(ellipse 60% 38% at 55% 50%, #000 10%, transparent 75%); ';  
        css += 'mask-image: radial-gradient(ellipse 80% 50% at 55% 50%, #000 10%, transparent 75%); } ';  
        css += '.tvi-trailer__iframe { width: 100%; height: 100%; pointer-events: none; } ';  
        css += '.tvi-trailer__yt iframe { border: 0; width: 100%; height: 100%; flex-shrink: 0; pointer-events: none; will-change: transform; transition: transform .3s; opacity: 1; filter: contrast(105%) brightness(102%); } ';  
        css += '.tvi-trailer__overlay { display: none !important; } ';  
  
        style.textContent = css;  
    }  
  
    function getRatingColor(val) {  
        var n = parseFloat(val);  
        if (n >= 7.5) return '#2ecc71';  
        if (n >= 6) return '#feca57';  
        if (n > 0) return '#ff4d4d';  
        return '#fff';  
    }  
  
    function formatTime(mins) {  
        if (!mins) return '';  
        var h = Math.floor(mins / 60);  
        var m = mins % 60;  
        return (h > 0 ? h + 'г ' : '') + m + 'хв';  
    }  
  
    function getCubRating(e) {  
        if (!e.data || !e.data.reactions || !e.data.reactions.result) return null;  
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };  
        var sum = 0, cnt = 0;  
        e.data.reactions.result.forEach(function (r) {  
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }  
        });  
        if (cnt >= 5) {  
            var isTv = e.object.method === 'tv', avg = isTv ? 7.4 : 6.5, m = isTv ? 50 : 150;  
            return ((avg * m + sum) / (m + cnt)).toFixed(1);  
        }  
        return null;  
    }  
  
    function renderMeta(container, e) {  
        container.find('.plugin-meta-row').remove();  
  
        var sep = '<span class="info-separator">•</span>';  
        var $metaRow = $('<div class="plugin-meta-row"></div>');  
  
        var year = (e.data.movie.release_date || e.data.movie.first_air_date || '').substring(0, 4);  
        if (year) $metaRow.append('<div class="info-text-item">' + year + '</div>');  
  
        var country = '';  
        if (e.data.movie.production_countries && e.data.movie.production_countries.length > 0) {  
            country = e.data.movie.production_countries[0].name || e.data.movie.production_countries[0].iso_3166_1;  
        } else if (e.data.movie.origin_country && e.data.movie.origin_country.length > 0) {  
            country = e.data.movie.origin_country[0];  
        }  
  
        if (country) {  
            if ($metaRow.children().length > 0) $metaRow.append(sep);  
            $metaRow.append('<div class="info-text-item">' + country + '</div>');  
        }  
  
        var runtime = e.data.movie.runtime || (e.data.movie.episode_run_time ? e.data.movie.episode_run_time[0] : 0);  
        if (runtime) {  
            if ($metaRow.children().length > 0) $metaRow.append(sep);  
            $metaRow.append('<div class="info-text-item">' + formatTime(runtime) + '</div>');  
        }  
  
        if (e.data.movie.genres && e.data.movie.genres.length > 0) {  
            if ($metaRow.children().length > 0) $metaRow.append(sep);  
            var genres = e.data.movie.genres.slice(0, 2).map(function (g) { return g.name; }).join(', ');  
            $metaRow.append('<div class="info-text-item">' + genres + '</div>');  
        }  
  
        container.append($metaRow);  
    }  
  
    function applyMovieDetailsData(data, movie, $render) {  
        if (data.images && data.images.logos && data.images.logos.length > 0) {  
            var lang = Lampa.Storage.get('language') || 'uk';  
            var logo = data.images.logos.filter(function (l) { return l.iso_639_1 === lang; })[0] ||  
                       data.images.logos.filter(function (l) { return l.iso_639_1 === 'en'; })[0] ||  
                       data.images.logos[0];  
  
            if (logo) {  
                var logoUrl = Lampa.TMDB.image('/t/p/original' + logo.file_path.replace('.svg', '.png'));  
                var $titleContainer = $render.find('.full-start-new__title');  
  
                var tempImg = new Image();  
                tempImg.onload = function () {  
                    $titleContainer.html('<img src="' + logoUrl + '">');  
                    setTimeout(function () {  
                        $titleContainer.find('img').addClass('loaded');  
                    }, 20);  
                };  
                tempImg.src = logoUrl;  
            }  
        }  
  
        if (Lampa.Storage.get('tv_interface_studios')) {  
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
                isImageDark(studioLogoUrl, function (isDark) { if (isDark) $img.addClass('is-dark-logo'); });  
                $render.find('.full-start-new__title').before($brand);  
            }  
        }  
    }  
  
    function loadMovieDetails(movie, $render) {  
        var movieId = movie.id;  
        currentActiveId = movieId;  
  
        if (detailsCache[movieId]) {  
            applyMovieDetailsData(detailsCache[movieId], movie, $render);  
            return;  
        }  
  
        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';  
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images&include_image_language=uk,en,null';  
  
        $.ajax({  
            url: url,  
            type: 'GET',  
            dataType: 'json',  
            success: function (data) {  
                if (currentActiveId !== movieId) return;  
                detailsCache[movieId] = data;  
                applyMovieDetailsData(data, movie, $render);  
            }  
        });  
    }  
  
    /**  
     * ФОНОВИЙ ТРЕЙЛЕР (YouTube)  
     */  
    function pickTrailer(data) {  
        var vids = data.videos || (data.movie && data.movie.videos) || (data.tv && data.tv.videos);  
        if (!vids || !vids.results || !vids.results.length) return null;  
  
        var items = vids.results.map(function (v) {  
            return {  
                id: v.key,  
                code: v.iso_639_1,  
                time: new Date(v.published_at).getTime(),  
                name_orig: (v.name || '').toLowerCase()  
            };  
        }).sort(function (a, b) { return b.time - a.time; });  
  
        var myLang = items.filter(function (n) { return n.code === Lampa.Storage.field('tmdb_lang'); });  
        var enLang = items.filter(function (n) { return n.code === 'en' && myLang.indexOf(n) === -1; });  
        var all = myLang.concat(enLang);  
        if (!all.length) return null;  
  
        return all.find(function (n) {  
            return n.name_orig.indexOf('official trailer') !== -1 ||  
                   n.name_orig.indexOf('офіційний трейлер') !== -1 ||  
                   n.name_orig.indexOf('официальный трейлер') !== -1;  
        }) || all.find(function (n) {  
            return n.name_orig.indexOf('trailer') !== -1 || n.name_orig.indexOf('трейлер') !== -1;  
        }) || all[0];  
    }  
  
    function startTrailer(e, $render, trailer) {  
        var movie = e.data.movie || (e.object && e.object.card);  
        var item_id = movie && movie.id;  
        var $wrap = $('<div class="tvi-trailer"><div class="tvi-trailer__yt"><div class="tvi-trailer__iframe"></div></div></div>');  
  
        $render.find('.activity__body').prepend($wrap);  
  
        var player = null, destroyed = false, pollTimer = null;  
  
        var destroy = function () {  
            if (destroyed) return;  
            destroyed = true;  
            clearInterval(pollTimer);  
            $('body').removeClass('has-active-trailer');  
            try { if (player) player.destroy(); } catch (err) {}  
            $wrap.remove();  
            $render.find('.full-start__background').css('opacity', '');  
        };  
  
        var stop = function (a) {  
            if (a.type === 'destroy' && a.object.activity === e.object.activity) {  
                destroy();  
                Lampa.Listener.remove('activity', stop);  
            }  
        };  
        Lampa.Listener.follow('activity', stop);  
  
        var initYT = function () {  
            if (destroyed || (item_id && currentActiveId !== item_id)) return;  
  
            player = new window.YT.Player($wrap.find('.tvi-trailer__iframe')[0], {  
                height: window.innerHeight,  
                width: Math.round(window.innerWidth * 0.70),  
                videoId: trailer.id,  
                playerVars: {  
                    controls: 0, autoplay: 1, mute: 1, disablekb: 1,  
                    fs: 0, playsinline: 1, rel: 0, modestbranding: 1,  
                    suggestedQuality: 'hd1080'  
                },  
                events: {  
                    onReady: function (ev) {  
                        var iframe = $(ev.target.getIframe());  
                        var blur = parseInt(Lampa.Storage.get('tv_interface_trailer_blur')) || 0;  
                        var zoom = Lampa.Storage.get('tv_interface_trailer_zoom') || '0';  
                        if (blur > 0) iframe.css('filter', 'blur(' + blur + 'px)');  
                        if (zoom !== '0') iframe.css('transform', 'scale(' + (1 + parseInt(zoom) / 100) + ') translateZ(0)');  
                        ev.target.playVideo();  
                    },  
                    onStateChange: function (st) {  
                        if (st.data === window.YT.PlayerState.PLAYING) {  
                            setTimeout(function () {  
                                if (destroyed || (item_id && currentActiveId !== item_id)) return;  
                                $('body').addClass('has-active-trailer');  
                                $wrap.addClass('display');  
                            }, 300);  
                        }  
                        if (st.data === window.YT.PlayerState.ENDED && !destroyed) {  
                            st.target.playVideo();  
                        }  
                        if (st.data === window.YT.PlayerState.BUFFERING) {  
                            st.target.setPlaybackQuality('hd1080');  
                        }  
                    },  
                    onError: function () { destroy(); }  
                }  
            });  
        };  
  
        if (window.YT && window.YT.Player) {  
            initYT();  
        } else {  
            pollTimer = setInterval(function () {  
                if (window.YT && window.YT.Player) { clearInterval(pollTimer); initYT(); }  
            }, 100);  
            if (!window.tvi_yt_loading) {  
                window.tvi_yt_loading = true;  
                Lampa.Utils.putScript(['https://www.youtube.com/iframe_api'], function () {});  
            }  
        }  
    }  
  
    /**  
     * СЛАЙДШОУ ФОНОВИХ ЗОБРАЖЕНЬ  
     */  
    function startSlideshow(e, $render) {  
        if (!Lampa.Storage.get('tv_interface_slideshow')) return;  
  
        var movie = e.data.movie || (e.object && e.object.card);  
        if (!movie || !movie.id) return;  
  
        var item_id = movie.id;  
        var media_type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';  
        var current_lang = Lampa.Storage.field('tmdb_lang') || 'uk';  
        var quality = Lampa.Storage.get('tv_interface_slideshow_quality') || 'w1280';  
        var duration = parseInt(Lampa.Storage.get('tv_interface_slideshow_duration')) || 8000;  
  
        Lampa.Api.sources.tmdb.get(  
            media_type + '/' + item_id + '/images?include_image_language=' + current_lang + ',xx,null,en',  
            {},  
            function (images_data) {  
                if (currentActiveId !== item_id) return;  
                if (!images_data || !images_data.backdrops || !images_data.backdrops.length) return;  
  
                var lang_b = [], clean_b = [], other_b = [];  
                images_data.backdrops.forEach(function (b) {  
                    var l = b.iso_639_1;  
                    if (l === current_lang) lang_b.push(b);  
                    else if (!l || l === 'xx' || l === 'null') clean_b.push(b);  
                    else other_b.push(b);  
                });  
  
                var final_b = [].concat(clean_b);  
                if (final_b.length < 3) final_b = final_b.concat(lang_b);  
                if (final_b.length < 3) {  
                    other_b.sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });  
                    final_b = final_b.concat(other_b);  
                }  
                final_b = final_b.slice(0, 15);  
                if (final_b.length < 2) return;  
  
                if (window.tviRotationTimer) clearInterval(window.tviRotationTimer);  
  
                var idx = 0;  
                var is_active = true;  
  
                window.tviRotationTimer = setInterval(function () {  
                    if (!is_active || currentActiveId !== item_id) {  
                        clearInterval(window.tviRotationTimer);  
                        return;  
                    }  
  
                    idx = (idx + 1) % final_b.length;  
                    var url = Lampa.TMDB.image('t/p/' + quality + final_b[idx].file_path);  
                    var $bg = $render.find('.full-start__background').first();  
                    if (!$bg.length) return;  
  
                    var img = new Image();  
                    img.onload = function () {  
                        if (!is_active || currentActiveId !== item_id) return;  
  
                        $bg.css('opacity', '0');  
                        setTimeout(function () {  
                            if (!is_active || currentActiveId !== item_id) return;  
                            $bg.attr('src', url);  
                            $bg.css('opacity', '1');  
                        }, 400);  
                    };  
                    img.src = url;  
                }, duration);  
  
                var stop = function (a) {  
                    if (a.type === 'destroy' && a.object.activity === e.object.activity) {  
                        is_active = false;  
                        clearInterval(window.tviRotationTimer);  
                        Lampa.Listener.remove('activity', stop);  
                    }  
                };  
                Lampa.Listener.follow('activity', stop);  
            }  
        );  
    }  
  
    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {  
                currentActiveId = null;  
                $('body').removeClass('has-active-trailer');  
                if (window.tviRotationTimer) {  
                    clearInterval(window.tviRotationTimer);  
                    window.tviRotationTimer = null;  
                }  
            }  
  
            if (e.type === 'complite' || e.type === 'complete') {  
                applyStyles();  
  
                var movie = e.data.movie, $render = e.object.activity.render();  
  
                $render.find('.full-start-new__title').empty();  
  
                if (window.lampa_settings) window.lampa_settings.blur_poster = false;  
  
                renderMeta($render.find('.full-start-new__right'), e);  
                loadMovieDetails(movie, $render);  
  
                var isTrailerBg = Lampa.Storage.get('tv_interface_trailer_bg');  
                var trailer = isTrailerBg ? pickTrailer(e.data) : null;  
  
                if (trailer && Lampa.Manifest.app_digital >= 220) {  
                    startTrailer(e, $render, trailer);  
                } else {  
                    startSlideshow(e, $render);  
                }  
  
                var $body = $render.find('.full-start-new__body');  
                var $buttons = $render.find('.full-start-new__buttons');  
  
                if ($body.length && $buttons.length && $render.find('.card-tweaks__buttons').length === 0) {  
                    var $tweaksButtons = $('<div class="card-tweaks__buttons"></div>');  
                    $buttons.detach().appendTo($tweaksButtons);  
                    $tweaksButtons.insertAfter($body);  
                }  
  
                var $mainContainer = $render.find('.full-start-new');  
                if ($mainContainer.length === 0) $mainContainer = $render;  
  
                $mainContainer.find('.quality-row-inline').remove();  
                var $qRow = $('<div class="quality-row-inline"></div>');  
                $mainContainer.append($qRow);  
  
                var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);  
                if (tmdb > 0) {  
                    var $tmdbItem = $('<div class="plugin-rating-item wave-item"><img src="' + ratingIcons.tmdb + '"> <span style="color:' + getRatingColor(tmdb) + '">' + tmdb + '</span></div>');  
                    $qRow.append($tmdbItem);  
                }  
  
                var cub = getCubRating(e);  
                if (cub) {  
                    var $cubItem = $('<div class="plugin-rating-item wave-item"><img src="' + ratingIcons.cub + '"> <span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');  
                    $qRow.append($cubItem);  
                }  
            }  
        });  
    }  
  
    function setupSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'tv_interface',  
            name: 'Інтерфейс картки (TV)',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>'  
        });  
  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_ui_anim', type: 'trigger', default: true }, field: { name: 'Плавна анімація появи елементів' }, onChange: applyStyles });  
        Lampa.SettingsApi.addParam({  
            component: 'tv_interface',  
            param: {  
                name: 'tv_interface_ui_anim_effect',  
                type: 'select',  
                values: {  
                    'smooth_zoom': 'Apple Smooth Zoom (Рекомендовано)',  
                    'cine_slide': 'Cinematic Slide Up',  
                    'luxury_fade': 'Luxury Depth Fade',  
                    'modern_shift': 'Modern Clean Shift'  
                },  
                default: 'smooth_zoom'  
            },  
            field: { name: 'Стиль анімації появи' },  
            onChange: applyStyles  
        });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_badge_anim', type: 'select', values: { 'none': 'Без анімації', 'pulse': 'Пульсація', 'breathe': 'Дихання', 'spin_slow': 'Гойдання', 'float': 'Підстрибування' }, default: 'pulse' }, field: { name: 'Анімація бейджів' }, onChange: applyStyles });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_show_tagline', type: 'trigger', default: true }, field: { name: 'Відображати слоган' }, onChange: applyStyles });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_blocks_gap', type: 'select', values: { '8px': 'Компактний', '12px': 'Стандартний', '18px': 'Просторий', '24px': 'Панорамний' }, default: '8px' }, field: { name: 'Відступи між блоками' }, onChange: applyStyles });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_ratings_size', type: 'select', values: { '0.4em': 'Дрібний', '0.45em': 'Звичайний', '0.5em': 'Великий', '0.55em': 'Дуже великий' }, default: '0.45em' }, field: { name: 'Розмір шрифту інфо-блоків' }, onChange: applyStyles });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_studios', type: 'trigger', default: true }, field: { name: 'Показувати логотип студії' } });  
  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_slideshow', type: 'trigger', default: true }, field: { name: 'Слайдшоу фонових зображень', description: 'Плавна зміна backdrops з TMDB на фоні картки' } });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_slideshow_duration', type: 'select', values: { 5000: '5 секунд', 8000: '8 секунд', 10000: '10 секунд', 15000: '15 секунд' }, default: 8000 }, field: { name: 'Інтервал зміни зображень' } });  
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_slideshow_quality', type: 'select', values: { w780: 'Стандартна (W780)', w1280: 'Висока (W1280)', original: 'Оригінал' }, default: 'w1280' }, field: { name: 'Якість зображень слайдшоу' } });  
  
        Lampa.SettingsApi.addParam({  
            component: 'tv_interface',  
            param: { name: 'tv_interface_trailer_bg', type: 'trigger', default: false },  
            field: { name: 'Фоновий відеоряд (Трейлер)', description: 'Автоматично відтворювати трейлер YouTube на фоні без звуку замість слайдшоу' }  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'tv_interface',  
            param: {  
                name: 'tv_interface_trailer_blur',  
                type: 'select',  
                values: { '0': 'Вимкнено (0%)', '1': '1%', '2': '2%', '3': '3%', '4': '4%', '5': '5%', '10': '10%' },  
                default: '0'  
            },  
            field: { name: 'Розмиття фонового відео', description: 'Ефект Blur для фонового плеєра' },  
            onRender: function (item) {  
                if (!Lampa.Storage.get('tv_interface_trailer_bg')) item.hide();  
            }  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'tv_interface',  
            param: {  
                name: 'tv_interface_trailer_zoom',  
                type: 'select',  
                values: { '0': 'Вимкнено (0%)', '25': '25%', '33': '33%', '40': '40%', '45': '45%', '50': '50%' },  
                default: '0'  
            },  
            field: { name: 'Масштабування відео', description: 'Збільшення відео для приховування чорних смуг' },  
            onRender: function (item) {  
                if (!Lampa.Storage.get('tv_interface_trailer_bg')) item.hide();  
            }  
        });  
    }  
  
    function startPlugin() {  
        applyStyles();  
        setupSettings();  
        init();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
})();
