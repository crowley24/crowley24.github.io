(function () {
    'use strict';

    /**
     * ПЕРЕМІННІ ТА КЕШУВАННЯ
     */
    var logoCache = {}; 
    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_slideshow_quality', default: 'w780' },
        { id: 'mobile_interface_logo_size_v2', default: '125' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '8px' },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_progress_bar', default: true }
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

    /**
     * СТИЛІ ІНТЕРФЕЙСУ (CSS)
     */
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        var lHeight = Lampa.Storage.get('mobile_interface_logo_size_v2', '125'); 
        var showTagline = Lampa.Storage.get('mobile_interface_show_tagline');
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '8px');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '';
        css += '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } ';
        
        css += '@media screen and (max-width: 480px) { ';
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"] { display:none !important; } ';
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        css += '.background { background: #000 !important; } ';
        
        // Постер
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 62vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 65%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 65%, transparent 100%) !important; } ';
        
        // Прогрес-бар
        css += '.plugin-poster-progress { position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: rgba(255,255,255,0.15); z-index: 5; overflow: hidden; } ';
        css += '.plugin-poster-progress-fill { height: 100%; background: #ff4d4d; box-shadow: 0 0 12px rgba(255,77,77,0.7); transition: width 0.5s ease; } ';

        // Контейнер праворуч (тепер по центру)
        css += '.full-start-new__right { background: none !important; margin-top: -160px !important; z-index: 10 !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 0 10px !important; gap: ' + blocksGap + ' !important; } ';
        css += '.full-start-new__right > div:first-child { margin: 0 !important; font-size: 0.9em !important; opacity: 0.8; order: 1; } ';
        
        // Логотип
        css += '.full-start-new__title { width: 100% !important; display: flex !important; justify-content: center !important; align-items: center !important; margin: 5px 0 !important; min-height: 60px; order: 2; overflow: visible !important; } ';
        css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 90vw !important; object-fit: contain !important; filter: drop-shadow(0 0 15px rgba(0,0,0,0.8)); margin: 0 !important; animation: slideUpFade 0.7s ease-out forwards; } ';
        
        // Слоган
        css += '.full-start-new__tagline { display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; opacity: 0; font-size: 1.1em !important; margin: 0 !important; color: #fff !important; text-align: center !important; order: 3; animation: slideUpFade 0.7s ease-out forwards 0.1s; } ';
        
        // Рейтинги
        css += '.plugin-ratings-row { display: flex; justify(content: center; align-items: center; flex-wrap: wrap; gap: 12px; margin: 0 !important; font-size: calc(' + rSize + ' * 2.8); width: 100%; order: 4; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.2s; } ';
        css += '.plugin-rating-item, .plugin-extra-info { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #fff; } ';
        css += '.plugin-rating-item img { height: 1.1em; width: auto; } ';
        css += '.plugin-extra-info { font-weight: 400; opacity: 0.9; } ';
        
        // Студії та якість
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: ' + blocksGap + '; margin: 0 !important; width: 100%; order: 5; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.3s; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; } ';
        css += '.studio-item { height: 3.2em !important; opacity: 0; animation: qb_in 0.4s ease forwards; padding: 5px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); ';
        }
        css += '} ';
        css += '.quality-item { height: 2.3em; opacity: 0; animation: qb_in 0.4s ease forwards; } '; 
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        // Кнопки (Glassmorphism)
        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 10px !important; width: 100% !important; margin-top: 5px !important; order: 6; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.4s; } ';
        css += '.full-start-new .full-start__button { background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 15px !important; border: 1px solid rgba(255,255,255,0.1) !important; display: flex !important; flex-direction: column !important; align-items: center !important; width: 65px !important; padding: 10px 5px !important; transition: all 0.3s ease; } ';
        css += '.full-start-new .full-start__button.focus { background: rgba(255,255,255,0.25) !important; transform: scale(1.1); border-color: rgba(255,255,255,0.4) !important; } ';
        css += '.full-start-new .full-start__button svg, .full-start-new .full-start__button img { width: 24px !important; height: 24px !important; margin-bottom: 5px !important; fill: #fff !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 8px !important; text-transform: uppercase !important; opacity: 0.7 !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * ЛОГІКА РЕЙТИНГІВ ТА ТРИВАЛОСТІ
     */
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        if (n > 0) return '#ff4d4d';
        return '#fff';
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
        container.find('.plugin-ratings-row').remove();
        var $row = $('<div class="plugin-ratings-row"></div>');
        var movie = e.data.movie;
        
        var tmdb = parseFloat(movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) $row.append('<div class="plugin-rating-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');
        var cub = getCubRating(e);
        if (cub) $row.append('<div class="plugin-rating-item"><img src="' + ratingIcons.cub + '"> <span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');
        
        var minutes = movie.runtime || (movie.episode_run_time ? movie.episode_run_time[0] : 0);
        var runtime = minutes ? (Math.floor(minutes / 60) > 0 ? Math.floor(minutes / 60) + 'г ' : '') + (minutes % 60) + 'хв' : '';
        var genres = (movie.genres || []).slice(0, 1).map(function(g){ return g.name; }).join('');
        
        if (runtime || genres) {
            var info = (runtime ? runtime : '') + (runtime && genres ? ' • ' : '') + (genres ? genres : '');
            $row.append('<div class="plugin-extra-info">' + info + '</div>');
        }

        var $target = container.find('.full-start-new__tagline');
        if (!$target.length || !Lampa.Storage.get('mobile_interface_show_tagline')) $target = container.find('.full-start-new__title');
        $target.after($row);
    }

    /**
     * ЛОГІКА СТУДІЙ ТА ПРОГРЕСУ
     */
    function renderProgressBar(container, movie) {
        if (!Lampa.Storage.get('mobile_interface_progress_bar')) return;
        var view = Lampa.Timeline.view(movie.id);
        if (view && view.percent > 0) {
            var $bar = $('<div class="plugin-poster-progress"><div class="plugin-poster-progress-fill" style="width:' + view.percent + '%"></div></div>');
            container.append($bar);
        }
    }

    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        [data.networks, data.production_companies].forEach(function(source) {
            if (source) source.forEach(function(item) {
                if (item.logo_path) {
                    var url = Lampa.Api.img(item.logo_path, 'w200');
                    if (!logos.some(function(l) { return l.url === url; })) logos.push({ url: url, name: item.name });
                }
            });
        });

        logos.slice(0, 4).forEach(function(logo) {
            var id = 'lg_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="studio-item" id="'+id+'"><img src="'+logo.url+'"></div>');
            var img = new Image(); img.crossOrigin = 'anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height; ctx.drawImage(this, 0, 0);
                try {
                    var d = ctx.getImageData(0,0,canvas.width,canvas.height).data, r=0, g=0, b=0, c=0;
                    for(var i=0; i<d.length; i+=4) { if(d[i+3]>50) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; c++; } }
                    if(c > 0 && (0.299*r + 0.587*g + 0.114*b) / c < 45) $('#'+id+' img').css('filter', 'brightness(0) invert(1)');
                } catch(e) {}
            }; img.src = logo.url;
        });
    }

    /**
     * TMDB ЛОГО ТА СЛАЙДШОУ
     */
    function loadMovieLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) { $container.html('<img src="' + logoCache[movieId] + '">'); return; }
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_logo_quality', 'w500') + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url; $container.html('<img src="' + url + '">');
                }
                if (res.backdrops && res.backdrops.length > 1) startPosterSlideshow($('.full-start-new__poster'), res.backdrops.slice(0, 15));
            }
        });
    }

    function startPosterSlideshow($poster, items) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) return;
        var index = 0; clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780') + items[index].file_path);
            var $current = $poster.find('img').first();
            var nextImg = new Image();
            nextImg.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity: 0;">');
                $poster.append($next);
                setTimeout(function() { $next.css('opacity', '1'); $current.css('opacity', '0'); setTimeout(function(){ $current.remove(); }, 1500); }, 100);
            }; nextImg.src = imgUrl;
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000')));
    }

    /**
     * ІНІЦІАЛІЗАЦІЯ
     */
    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie, $render = e.object.activity.render();
                
                loadMovieLogo(movie, $render.find('.full-start-new__title'));
                renderRatings($render.find('.full-start-new__right'), e);
                renderProgressBar($render.find('.full-start-new__poster'), movie);
                
                $('.plugin-info-block').remove();
                var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                $render.find('.full-start-new__right').append($info);
                renderStudioLogos($info.find('.studio-row'), movie);
                
                if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && res.Results) {
                            var b = { res: null, hdr: false, dv: false, dub: false, ukr: false };
                            res.Results.slice(0, 15).forEach(function(item) {
                                var t = (item.Title || '').toLowerCase();
                                if (t.indexOf('ukr')>=0 || t.indexOf('укр')>=0) b.ukr = true;
                                if (t.indexOf('4k')>=0) b.res = '4K'; else if (!b.res && t.indexOf('1080')>=0) b.res = 'FULL HD';
                                if (t.indexOf('hdr')>=0) b.hdr = true; if (t.indexOf('vision')>=0) b.dv = true;
                                if (t.indexOf('dub')>=0 || t.indexOf('дуб')>=0) b.dub = true;
                            });
                            var list = []; if (b.res) list.push(b.res);
                            if (b.dv) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                            if (b.dub) list.push('DUB'); if (b.ukr) list.push('UKR');
                            list.forEach(function(t) { if (svgIcons[t]) $info.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[t]+'"></div>'); });
                        }
                    });
                }
            }
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({ component: 'mobile_interface', name: 'Мобільний інтерфейс', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>' });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Анімація постера' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_progress_bar', type: 'trigger', default: true }, field: { name: 'Прогрес перегляду' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '100': 'Малий', '125': 'Середній', '150': 'Великий' }, default: '125' }, field: { name: 'Висота логотипу' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_blocks_gap', type: 'select', values: { '6px': 'Щільно', '10px': 'Нормально', '16px': 'Вільно' }, default: '8px' }, field: { name: 'Відступи' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_studios_bg_opacity', type: 'select', values: { '0': 'Прозоро', '0.15': 'Легко', '0.3': 'Помітно' }, default: '0.15' }, field: { name: 'Фон студій' }, onChange: applyStyles });
    }

    function startPlugin() {
        applyStyles(); setupSettings(); init();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
