(function () {
    'use strict';

    var slideshowTimer = null; 
    var pluginPath = 'https://crowley38.github.io/Icons/';
    
    var settings_list = [
        { id: 'tv_interface_animation', default: true },
        { id: 'tv_interface_ui_anim', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_time', default: '10000' },
        { id: 'tv_interface_slideshow_quality', default: 'w1280' },
        { id: 'tv_interface_logo_size_v2', default: '140' },
        { id: 'tv_interface_logo_quality', default: 'w500' },
        { id: 'tv_interface_show_tagline', default: true },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var svgIcons = {
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg',
        '5.1': pluginPath + '5.1.svg',
        '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg',
        'DUB': pluginPath + 'DUB.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

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
                canvas.width = 40; canvas.height = 40;
                ctx.drawImage(img, 0, 0, 40, 40);

                var imgData = ctx.getImageData(0, 0, 40, 40).data;
                var totalBrightness = 0, hasColor = false, count = 0;

                for (var i = 0; i < imgData.length; i += 4) {
                    if (imgData[i + 3] > 50) { 
                        var r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
                        totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;
                        count++;
                        if ((Math.max(r, g, b) - Math.min(r, g, b)) > 30) hasColor = true;
                    }
                }
                var avgBrightness = count > 0 ? (totalBrightness / count) : 255;
                callback((avgBrightness < 110) && !hasColor);
            } catch (e) { callback(false); }
        };
        img.onerror = function () { callback(false); };
        img.src = imgSrc;
    }

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isPosterAnim = Lampa.Storage.get('tv_interface_animation');
        var isUIAnim = Lampa.Storage.get('tv_interface_ui_anim');
        var lHeight = Lampa.Storage.get('tv_interface_logo_size_v2', '140'); 
        var showTagline = Lampa.Storage.get('tv_interface_show_tagline');
        
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '';
        
        css += '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } } ';
        css += '@keyframes premium_ui_reveal { 0% { opacity: 0; transform: translate3d(-20px, 0, 0); } 100% { opacity: 1; transform: translate3d(0, 0, 0); } } ';

        // 1. ОЧИЩЕННЯ СМІТТЯ (приховуємо все дефолтне дублювання)
        css += '.full-start-new__head, .full-start-new__details-info, .full-start-new__tagline-default, .full-start-new__rate, .full-start-new__info { display: none !important; } ';

        // 2. ФОН
        css += '.full-start-new__poster { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: -1 !important; overflow: hidden !important; background: #000 !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; position: absolute !important; top:0; left:0; ';
        css += (isPosterAnim ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'mask-image: linear-gradient(to right, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 80%, #000 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 65%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 80%, #000 100%) !important; } ';

        // 3. ОСНОВНІ КОНТЕЙНЕРИ (Жорстке вирівнювання по лівому краю)
        css += '.full-start-new { display: flex !important; flex-direction: column !important; align-items: flex-start !important; justify-content: flex-start !important; padding: 40px 0 0 60px !important; width: 100% !important; box-sizing: border-box !important; margin: 0 !important; text-align: left !important; } ';
        css += '.full-start-new__right { display: flex !important; flex-direction: column !important; align-items: flex-start !important; justify-content: flex-start !important; width: 55vw !important; max-width: 700px !important; margin: 0 !important; padding: 0 !important; text-align: left !important; gap: 8px !important; } ';

        var uiAnimClass = isUIAnim ? 'animation: premium_ui_reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; ' : '';

        // Студія
        css += '.studio-header-brand { ' + uiAnimClass + ' animation-delay: 0.05s; display: flex !important; justify-content: flex-start !important; align-items: center !important; margin: 0 0 2px 0 !important; text-align: left !important; width: 100% !important; } ';
        css += '.studio-header-brand img { height: 22px !important; width: auto !important; max-width: 140px !important; object-fit: contain !important; margin: 0 !important; } ';
        css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) !important; } ';

        // Лого/Назва
        css += '.full-start-new__title { ' + uiAnimClass + ' animation-delay: 0.1s; display: flex !important; justify-content: flex-start !important; align-items: center !important; margin: 0 !important; text-align: left !important; width: 100% !important; } ';
        css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.8)); margin: 0 !important; } ';

        // Слоган
        css += '.full-start-new__tagline { ' + uiAnimClass + ' animation-delay: 0.15s; display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 1em !important; color: rgba(255,255,255,0.75) !important; text-align: left !important; margin: 0 !important; width: 100% !important; } ';

        // Мета-інформація та бейджі
        css += '.plugin-meta-row { ' + uiAnimClass + ' animation-delay: 0.2s; display: flex !important; justify-content: flex-start !important; align-items: center !important; flex-wrap: wrap !important; gap: 8px !important; font-size: 0.95em !important; color: rgba(255,255,255,0.85) !important; text-align: left !important; width: 100% !important; margin: 0 !important; } ';
        css += '.plugin-ratings-quality-row { ' + uiAnimClass + ' animation-delay: 0.25s; display: flex !important; justify-content: flex-start !important; align-items: center !important; gap: 12px !important; font-size: 1.05em !important; width: 100% !important; margin: 2px 0 0 0 !important; text-align: left !important; } ';
        css += '.plugin-ratings-group { display: flex !important; align-items: center !important; justify-content: flex-start !important; gap: 10px !important; margin: 0 !important; } ';
        css += '.quality-row-inline { display: flex !important; align-items: center !important; justify-content: flex-start !important; gap: 6px !important; margin: 0 !important; } ';
        css += '.plugin-rating-item { display: flex !important; align-items: center !important; gap: 5px !important; font-weight: 700 !important; color: #fff !important; } ';
        css += '.plugin-rating-item img { height: 1em !important; width: auto !important; margin: 0 !important; } ';
        css += '.info-separator { opacity: 0.4 !important; margin: 0 !important; } ';
        css += '.quality-item { height: 1em !important; display: inline-flex !important; align-items: center !important; } '; 
        css += '.quality-item img { height: 100% !important; width: auto !important; object-fit: contain !important; margin: 0 !important; } ';

        // 4. КНОПКИ ДІЙ
        css += '.full-start-new__buttons { ' + uiAnimClass + ' animation-delay: 0.3s; display: flex !important; flex-wrap: wrap !important; justify-content: flex-start !important; align-items: center !important; gap: 10px !important; margin: 12px 0 0 0 !important; width: 100% !important; position: relative !important; z-index: 99 !important; order: 5 !important; } ';
        css += '.full-start-new .full-start__button { display: inline-flex !important; align-items: center !important; justify-content: center !important; background: rgba(255, 255, 255, 0.12) !important; border-radius: 8px !important; padding: 10px 18px !important; margin: 0 !important; border: 1px solid rgba(255,255,255,0.1) !important; transition: background 0.2s, border-color 0.2s !important; } ';
        
        // Фокус кнопок
        css += '.full-start-new .full-start__button.focus { background: rgba(255, 255, 255, 0.25) !important; border-color: rgba(255, 255, 255, 0.8) !important; box-shadow: 0 0 12px rgba(255,255,255,0.3) !important; transform: scale(1.03) !important; } ';
        css += '.full-start-new .full-start__button svg { width: 18px !important; height: 18px !important; fill: #fff !important; margin: 0 !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 0.9em !important; font-weight: 600 !important; color: #fff !important; margin: 0 !important; } ';

        // 5. РЕАКЦІЇ CUB ТА ОПИС
        css += '.full-start-new__reactions, .full-start-new__details { order: 6 !important; margin: 15px 0 0 0 !important; width: 80vw !important; max-width: 1000px !important; text-align: left !important; display: flex !important; justify-content: flex-start !important; } ';

        style.textContent = css;
        document.head.appendChild(style);
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

    function renderRatings(container, e) {
        container.find('.plugin-meta-row').remove();
        container.find('.plugin-ratings-quality-row').remove();
        
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

        var $rqRow = $('<div class="plugin-ratings-quality-row"></div>');
        var $ratingsGroup = $('<div class="plugin-ratings-group"></div>');
        
        var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) {
            $ratingsGroup.append('<div class="plugin-rating-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');
        }
        
        var cub = getCubRating(e);
        if (cub) {
            $ratingsGroup.append('<div class="plugin-rating-item"><img src="' + ratingIcons.cub + '"> <span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');
        }

        var $qRow = $('<div class="quality-row-inline"></div>');
        $rqRow.append($ratingsGroup).append($qRow);

        var $title = container.find('.full-start-new__title');
        if ($title.length > 0) {
            $title.after($rqRow).after($metaRow);
        } else {
            container.prepend($rqRow).prepend($metaRow);
        }
    }

    function loadMovieDetails(movie, $render) {
        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                if (data.images && data.images.logos && data.images.logos.length > 0) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    var logo = data.images.logos.filter(function(l) { return l.iso_639_1 === lang; })[0] || 
                               data.images.logos.filter(function(l) { return l.iso_639_1 === 'en'; })[0] || 
                               data.images.logos[0];
                    
                    if (logo) {
                        var logoUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('tv_interface_logo_quality', 'w500') + logo.file_path.replace('.svg', '.png'));
                        $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');
                    }
                }

                if (Lampa.Storage.get('tv_interface_studios')) {
                    $render.find('.studio-header-brand').remove();
                    var studio = null;

                    if (data.networks && data.networks.length > 0) studio = data.networks.find(function(n) { return n.logo_path; });
                    if (!studio && data.production_companies && data.production_companies.length > 0) studio = data.production_companies.find(function(c) { return c.logo_path; });

                    if (studio && studio.logo_path) {
                        var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);
                        var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');
                        var $img = $brand.find('img');

                        $img.on('error', function() { $brand.remove(); });
                        isImageDark(studioLogoUrl, function(isDark) { if (isDark) $img.addClass('is-dark-logo'); });

                        $render.find('.full-start-new__title').before($brand);
                    }
                }

                if (data.images && data.images.backdrops && data.images.backdrops.length > 1) {
                    var cleanBackdrops = data.images.backdrops.filter(function(b) { return b.aspect_ratio > 1.5; });
                    if (cleanBackdrops.length > 0) {
                        startPosterSlideshow($('.full-start-new__poster'), cleanBackdrops.slice(0, 15));
                    }
                }
            }
        });
    }

    function getBestResults(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, dub: false, ukr: false };
        if (!results) return best;
        results.slice(0, 15).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr')>=0 || t.indexOf('укр')>=0) best.ukr = true;
            var res = t.indexOf('4k')>=0 ? '4K' : t.indexOf('2k')>=0 ? '2K' : t.indexOf('1080')>=0 ? 'FULL HD' : t.indexOf('720')>=0 ? 'HD' : null;
            if (res && (!best.resolution || ['HD', 'FULL HD', '2K', '4K'].indexOf(res) > ['HD', 'FULL HD', '2K', '4K'].indexOf(best.resolution))) best.resolution = res;
            if (t.indexOf('vision')>=0 || t.indexOf(' dv ')>=0) best.dolbyVision = true;
            if (t.indexOf('hdr')>=0) best.hdr = true;
            if (t.indexOf('dub')>=0 || t.indexOf('дуб')>=0) best.dub = true;
        });
        return best;
    }

    function startPosterSlideshow($poster, items) {
        if (!Lampa.Storage.get('tv_interface_slideshow')) return;
        var index = 0; 
        stopSlideshow();

        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('tv_interface_slideshow_quality', 'w1280') + items[index].file_path);
            var $current = $poster.find('img').first();
            var nextImg = new Image();
            nextImg.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity: 0; transition: opacity 1.2s ease-in-out;">');
                $poster.append($next);
                setTimeout(function() { 
                    $next.css('opacity', '1'); 
                    $current.css('opacity', '0'); 
                    setTimeout(function(){ $current.remove(); }, 1200); 
                }, 100);
            }; 
            nextImg.src = imgUrl;
        }, parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '10000')));
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') {
                stopSlideshow();
            }
            
            if (e.type === 'complite' || e.type === 'complete') {
                stopSlideshow(); 
                
                var movie = e.data.movie, $render = e.object.activity.render();
                
                if (window.lampa_settings) window.lampa_settings.blur_poster = false;

                renderRatings($render.find('.full-start-new__right'), e);
                loadMovieDetails(movie, $render);

                if (Lampa.Storage.get('tv_interface_quality') && Lampa.Parser && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && Array.isArray(res.Results)) {
                            var b = getBestResults(res.Results), list = [];
                            if (b.resolution) list.push(b.resolution);
                            if (b.dolbyVision) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                            if (b.dub) list.push('DUB'); if (b.ukr) list.push('UKR');
                            
                            var $qRow = $render.find('.quality-row-inline');
                            $qRow.empty();
                            list.forEach(function(t) { 
                                if (svgIcons[t]) $qRow.append('<div class="quality-item"><img src="' + svgIcons[t] + '"></div>'); 
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
            name: 'ТВ Інтерфейс Картки', 
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>' 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_animation', type: 'trigger', default: true }, 
            field: { name: 'Зум-ефект фону (Ken Burns)' }, 
            onChange: applyStyles 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_ui_anim', type: 'trigger', default: true }, 
            field: { name: 'Плавна анімація появи елементів' }, 
            onChange: applyStyles 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_slideshow', type: 'trigger', default: true }, 
            field: { name: 'Автозміна фонових кадрів' } 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_logo_size_v2', type: 'select', values: { '120': 'Малий', '140': 'Середній', '180': 'Великий' }, default: '140' }, 
            field: { name: 'Висота логотипу' }, 
            onChange: applyStyles 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_show_tagline', type: 'trigger', default: true }, 
            field: { name: 'Відображати слоган' }, 
            onChange: applyStyles 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_studios', type: 'trigger', default: true }, 
            field: { name: 'Показувати логотип студії' } 
        });

        Lampa.SettingsApi.addParam({ 
            component: 'tv_interface', 
            param: { name: 'tv_interface_quality', type: 'trigger', default: true }, 
            field: { name: 'Бейджі якості та звуку' } 
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
