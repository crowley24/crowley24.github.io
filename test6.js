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
        { id: 'tv_interface_ui_anim_effect', default: 'fluid' },
        { id: 'tv_interface_badge_anim', default: 'pulse' },
        { id: 'tv_interface_logo_quality', default: 'w500' },
        { id: 'tv_interface_show_tagline', default: true },
        { id: 'tv_interface_blocks_gap', default: '8px' },
        { id: 'tv_interface_ratings_size', default: '0.45em' },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var eliteBadgesConfig = [
        { id: '4k-ultra-hd', pattern: /\b(4k|2160p|uhd|ultra\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/4k_ultra_hd.png', group: 'resolution', priority: 3 },
        { id: '1080p-full-hd', pattern: /\b(1080p|fhd|full\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/1080p_full_hd.png', group: 'resolution', priority: 2 },
        { id: '720p-hd', pattern: /\b720p\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/720p_hd.png', group: 'resolution', priority: 1 },
        
        { id: 'dolby-vision', pattern: /\b(dolby\s*vision|dovi|dv)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_vision.png' },
        
        { id: 'hdr', pattern: /\b(hdr10\+|hdr10\s*plus\b|hdr\s*10\s*\+|hdr10|hdr\s*10|hdr)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/hdr.png', group: 'hdr' },
        { id: 'sdr', pattern: /\bsdr\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/SDR_transparent_4x.png' },
        
        { id: 'dolby-atmos', pattern: /\b(dolby\s*atmos|atmos)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_atmos.png' },
        { id: 'truehd', pattern: /\b(truehd|true\s*hd|dolby\s*truehd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/truehd.png' },
        { id: 'dolby-digital-plus', pattern: /\b(ddp[\s._-]*[0-9][\s._-]*[0-9]|ddp|dd\+|dolby[\s._-]*digital[\s._-]*plus|e-?ac-?3)(?![a-z])/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital_plus.png' },
        { id: 'dolby-digital', pattern: /\b(dd[\s._-]*[0-9][\s._-]*[0-9]|dd|dolby[\s._-]*digital|ac-?3)(?![\s._-]*plus|\+|p|[a-z])/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital.png' },
        { id: 'dts-hd-master-audio', pattern: /\b(dts[\s._-]*hd[\s._-]*ma|dtshd\s*ma|dts[\s._-]*hd[\s._-]*master)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd_master_audio.png' },
        { id: 'dts-hd', pattern: /\b(dts[\s._-]*hd|dtshd)(?![\s._-]*(ma|master)|ma)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd.png' },
        { id: 'dts', pattern: /\bdts\b(?![\s._:-]*(x|hd))/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts.png' }
    ];

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
        var animEffect = Lampa.Storage.get('tv_interface_ui_anim_effect', 'fluid');
        var badgeAnim = Lampa.Storage.get('tv_interface_badge_anim', 'pulse');
        var rSize = Lampa.Storage.get('tv_interface_ratings_size', '0.45em');
        var showTagline = Lampa.Storage.get('tv_interface_show_tagline');
        var blocksGap = Lampa.Storage.get('tv_interface_blocks_gap', '8px');
        
        var css = '';
        
        css += '@keyframes anim_fluid { 0% { opacity: 0; transform: translate3d(0, 25px, 0) scale(0.95); filter: blur(10px); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0px); } } ';
        css += '@keyframes anim_cyber { 0% { opacity: 0; transform: translate3d(-40px, 0, 0) scale(0.9); filter: brightness(1.5); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: brightness(1); } } ';
        css += '@keyframes anim_cinematic { 0% { opacity: 0; transform: translate3d(0, 15px, 0) scale(1.08); filter: blur(6px); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0px); } } ';
        css += '@keyframes anim_elastic { 0% { opacity: 0; transform: scale(0.7); } 70% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } } ';
        css += '@keyframes anim_minimal { 0% { opacity: 0; transform: translate3d(0, 10px, 0); } 100% { opacity: 1; transform: translate3d(0, 0, 0); } } ';
        css += '@keyframes wave_cascade { 0% { opacity: 0; transform: scale(0.5) translateY(10px); filter: blur(4px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); } } ';
        css += '@keyframes badge_anim_pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } } ';
        css += '@keyframes badge_anim_breathe { 0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); } 50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.6)); } } ';
        css += '@keyframes badge_anim_spin_slow { 0% { transform: rotate(0deg); } 25% { transform: rotate(4deg); } 75% { transform: rotate(-4deg); } 100% { transform: rotate(0deg); } } ';
        css += '@keyframes badge_anim_float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } } ';
        
        css += '.full-start__reactions, [class*="reactions"] { display: none !important; } ';
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"] { display:none !important; } ';
        css += '.full-start-new__right > div:first-child { display: none !important; } ';
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        css += '.background { background: #000 !important; } ';
        
        // Стандартний вигляд постера
        css += '.full-start-new { position: relative !important; } ';
        css += '.full-start-new__poster { position: relative !important; background: #000; z-index: 1; } ';
        css += '.full-start-new__poster img { filter: none !important; width: 100% !important; height: auto !important; object-fit: contain !important; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 75%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: flex-start !important; padding: 20px !important; gap: ' + blocksGap + ' !important; position: relative !important; } ';
        
        var chosenAnimName = 'anim_' + animEffect;
        var animTiming = animEffect === 'elastic' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)';
        var uiAnimClass = isUIAnim ? 'animation: ' + chosenAnimName + ' 0.8s ' + animTiming + ' forwards; opacity: 0; will-change: transform, opacity, filter; transform: translateZ(0); ' : '';

        css += '.quality-row-inline { position: absolute; top: 30px; right: 24px; z-index: 99; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; pointer-events: none; } '; 

        css += '.studio-header-brand { ' + uiAnimClass + ' animation-delay: 0.08s; order: 1; width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: -2px !important; } ';
        css += '.studio-header-brand img { height: 22px !important; width: auto; max-width: 130px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';
        css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';

        css += '.full-start-new__title { ' + uiAnimClass + ' animation-delay: 0.15s; width: 100% !important; display: flex !important; justify-content: flex-start !important; align-items: center !important; margin: 0 !important; min-height: 50px; order: 2; overflow: visible !important; } ';
        css += '.full-start-new__title img { height: auto !important; max-height: 140px !important; width: auto !important; max-width: 80vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.9)); margin: 0 !important; } ';

        css += '.full-start-new__tagline { ' + uiAnimClass + ' animation-delay: 0.22s; display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 1em !important; margin: 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; order: 3; } ';
        
        css += '.plugin-meta-row { ' + uiAnimClass + ' animation-delay: 0.28s; display: flex; justify-content: flex-start; align-items: center; flex-wrap: nowrap; gap: 10px; margin: 0 !important; font-size: calc(' + rSize + ' * 2.8); width: 100%; order: 4; color: rgba(255,255,255,0.85); font-family: "Inter", -apple-system, system-ui, sans-serif; } ';
        
        var loopAnimName = badgeAnim !== 'none' ? 'badge_anim_' + badgeAnim : '';
        var loopDuration = badgeAnim === 'spin_slow' ? '4s' : (badgeAnim === 'breathe' ? '3s' : '2.5s');

        css += '.wave-item { transform-origin: center center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); ';
        if (isUIAnim) {
            css += 'opacity: 0; animation: wave_cascade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            if (badgeAnim !== 'none') {
                css += ', ' + loopAnimName + ' ' + loopDuration + ' ease-in-out infinite';
                css += '; animation-delay: calc(0.35s + (var(--item-index) * 0.08s)), calc(1s + (var(--item-index) * 0.15s))';
            } else {
                css += '; animation-delay: calc(0.35s + (var(--item-index) * 0.08s))';
            }
            css += '; will-change: transform, opacity, filter; ';
        } else if (badgeAnim !== 'none') {
            css += 'animation: ' + loopAnimName + ' ' + loopDuration + ' ease-in-out infinite; ';
            css += 'animation-delay: calc(var(--item-index) * 0.15s); ';
        }
        css += '} ';

        css += '.quality-row-inline .plugin-rating-item { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #fff; font-size: 1.05em; padding: 2px 0; } ';
        css += '.quality-row-inline .plugin-rating-item img { height: 1.1em; width: auto; } ';
        
        css += '.quality-item { transform-origin: center center; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8)); height: 1.3em; display: flex; align-items: center; justify-content: flex-end; ';
        if (isUIAnim) {
            css += 'opacity: 0; animation: wave_cascade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            if (badgeAnim !== 'none') {
                css += ', ' + loopAnimName + ' ' + loopDuration + ' ease-in-out infinite';
                css += '; animation-delay: calc(0.35s + (var(--item-index) * 0.08s)), calc(1s + (var(--item-index) * 0.15s))';
            } else {
                css += '; animation-delay: calc(0.35s + (var(--item-index) * 0.08s))';
            }
            css += '; will-change: transform, opacity, filter; ';
        } else if (badgeAnim !== 'none') {
            css += 'animation: ' + loopAnimName + ' ' + loopDuration + ' ease-in-out infinite; ';
            css += 'animation-delay: calc(var(--item-index) * 0.15s); ';
        }
        css += '} ';
        css += '.quality-item img { height: 100%; width: auto; max-width: 70px; object-fit: contain; } ';

        css += '.info-text-item { opacity: 0.9; font-weight: 500; font-size: 0.9em; white-space: nowrap; } ';
        css += '.info-separator { opacity: 0.35; font-size: 0.85em; margin: 0 -2px; } ';

        css += '.card-tweaks__buttons { width: 100% !important; display: flex !important; justify-content: flex-start !important; align-items: center !important; gap: 15px !important; margin-top: 15px !important; order: 5; } ';

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
        e.data.reactions.result.forEach(function(r) {
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
            var genres = e.data.movie.genres.slice(0, 2).map(function(g) { return g.name; }).join(', ');
            $metaRow.append('<div class="info-text-item">' + genres + '</div>');
        }

        container.append($metaRow);
    }

    function applyMovieDetailsData(data, movie, $render) {
        if (data.images && data.images.logos && data.images.logos.length > 0) {
            var lang = Lampa.Storage.get('language') || 'uk';
            var logo = data.images.logos.filter(function(l) { return l.iso_639_1 === lang; })[0] || 
                       data.images.logos.filter(function(l) { return l.iso_639_1 === 'en'; })[0] || 
                       data.images.logos[0];
            
            if (logo) {
                var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');
            }
        }

        if (Lampa.Storage.get('tv_interface_studios')) {
            $render.find('.studio-header-brand').remove();
            var studio = null;

            if (data.networks && data.networks.length > 0) {
                studio = data.networks.find(function(n) { return n.logo_path; });
            }
            if (!studio && data.production_companies && data.production_companies.length > 0) {
                studio = data.production_companies.find(function(c) { return c.logo_path; });
            }

            if (studio && studio.logo_path) {
                var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);
                var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');
                var $img = $brand.find('img');

                $img.on('error', function() { $brand.remove(); });
                isImageDark(studioLogoUrl, function(isDark) { if (isDark) $img.addClass('is-dark-logo'); });
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
            success: function(data) {
                if (currentActiveId !== movieId) return;
                detailsCache[movieId] = data;
                applyMovieDetailsData(data, movie, $render);
            }
        });
    }

    function getEliteBadges(results) {
        var foundBadges = [];
        if (!results) return foundBadges;

        var combinedText = '';
        results.slice(0, 15).forEach(function(item) {
            combinedText += ' ' + (item.Title || item.title || '');
        });

        var matchedBadges = [];
        eliteBadgesConfig.forEach(function(badge) {
            if (badge.pattern && badge.pattern.test(combinedText)) {
                matchedBadges.push(badge);
            }
        });

        var highestResolution = null;
        matchedBadges.forEach(function(b) {
            if (b.group === 'resolution') {
                if (!highestResolution || b.priority > highestResolution.priority) {
                    highestResolution = b;
                }
            }
        });

        matchedBadges.forEach(function(badge) {
            if (badge.group !== 'resolution' || badge.id === highestResolution.id) {
                foundBadges.push(badge.imageURL);
            }
        });

        var hasUkr = /ukr|укр/i.test(combinedText);
        var hasDub = /dub|дуб/i.test(combinedText);
        if (hasUkr) foundBadges.push(pluginPath + 'UKR.svg');
        if (hasDub) foundBadges.push(pluginPath + 'DUB.svg');

        return foundBadges.filter(function(elem, pos, arr) {
            return arr.indexOf(elem) === pos;
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {
                currentActiveId = null;
            }
            
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie, $render = e.object.activity.render();
                
                if (window.lampa_settings) window.lampa_settings.blur_poster = false;

                renderMeta($render.find('.full-start-new__right'), e);
                loadMovieDetails(movie, $render);

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

                var globalIndex = 0;

                var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);
                if (tmdb > 0) {
                    var $tmdbItem = $('<div class="plugin-rating-item wave-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');
                    $tmdbItem.css('--item-index', globalIndex++);
                    $qRow.append($tmdbItem);
                }
                
                var cub = getCubRating(e);
                if (cub) {
                    var $cubItem = $('<div class="plugin-rating-item wave-item"><img src="' + ratingIcons.cub + '"> <span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');
                    $cubItem.css('--item-index', globalIndex++);
                    $qRow.append($cubItem);
                }

                if (Lampa.Storage.get('tv_interface_quality') && Lampa.Parser && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && Array.isArray(res.Results)) {
                            var eliteBadgesList = getEliteBadges(res.Results);
                            
                            eliteBadgesList.forEach(function(imgUrl) { 
                                var $badge = $('<div class="quality-item wave-item"><img src="' + imgUrl + '"></div>');
                                $badge.css('--item-index', globalIndex++);
                                $qRow.append($badge);
                            });
                        }
                    });
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
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_ui_anim_effect', type: 'select', values: { 'fluid': 'Apple Fluid', 'cyber': 'Cyber Neon', 'cinematic': 'Cinematic Depth', 'elastic': 'Elastic Spring', 'minimal': 'Minimal Fade' }, default: 'fluid' }, field: { name: 'Стиль анімації появи' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_badge_anim', type: 'select', values: { 'none': 'Без анімації', 'pulse': 'Пульсація', 'breathe': 'Дихання', 'spin_slow': 'Гойдання', 'float': 'Підстрибування' }, default: 'pulse' }, field: { name: 'Анімація бейджів' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_show_tagline', type: 'trigger', default: true }, field: { name: 'Відображати слоган' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_blocks_gap', type: 'select', values: { '8px': 'Компактний', '12px': 'Стандартний', '18px': 'Просторий', '24px': 'Панорамний' }, default: '8px' }, field: { name: 'Відступи між блоками' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_ratings_size', type: 'select', values: { '0.4em': 'Дрібний', '0.45em': 'Звичайний', '0.5em': 'Великий', '0.55em': 'Дуже великий' }, default: '0.45em' }, field: { name: 'Розмір шрифту інфо-блоків' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_studios', type: 'trigger', default: true }, field: { name: 'Показувати логотип студії' } });
        Lampa.SettingsApi.addParam({ component: 'tv_interface', param: { name: 'tv_interface_quality', type: 'trigger', default: true }, field: { name: 'Бейджі якості та звуку' } });
    }

    function startPlugin() {
        applyStyles(); 
        setupSettings(); 
        init();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
