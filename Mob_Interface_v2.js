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
        { id: 'mobile_interface_logo_size_v2', default: '150' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '8px' },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' },
        { id: 'mobile_interface_quality', default: true }
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

    /**
     * СТИЛІ ІНТЕРФЕЙСУ (CSS)
     */
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnim = Lampa.Storage.get('mobile_interface_animation');
        var bgOp = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        var lH = Lampa.Storage.get('mobile_interface_logo_size_v2', '150'); 
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '8px');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '';
        css += '@keyframes kenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } ';
        
        css += '@media screen and (max-width: 480px) { ';
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"] { display:none !important; } ';
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { height: 65vh !important; background: #000; position: relative; overflow: hidden; pointer-events: none; } ';
        css += '.full-start-new__poster img { width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; ' + (isAnim ? 'animation: kenBurns 30s infinite;' : '') + ' mask-image: linear-gradient(to bottom, #000 65%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, #000 65%, transparent 100%); transition: opacity 1.2s ease-in-out; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -150px !important; z-index: 2; display: flex !important; flex-direction: column; align-items: center; padding: 0 10px; gap: ' + blocksGap + ' !important; } ';
        
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 65px; order: 2; overflow: visible !important; } ';
        css += '.full-start-new__title img { height: auto; max-height: ' + lH + 'px !important; width: auto; max-width: 90vw; object-fit: contain; filter: drop-shadow(0 0 15px rgba(0,0,0,0.8)); animation: slideUpFade 0.7s ease-out forwards; } ';
        
        css += '.full-start-new__tagline { font-style: italic; opacity: 0; text-align: center; order: 3; animation: slideUpFade 0.7s ease-out forwards 0.1s; color: #fff !important; font-size: 1.1em !important; } ';
        css += '.plugin-ratings-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px; font-size: calc(' + rSize + ' * 2.8); width: 100%; order: 4; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.2s; } ';
        
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: ' + blocksGap + '; width: 100%; order: 5; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.3s; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; } ';
        css += '.studio-item { height: 3.2em; padding: 5px 12px; border-radius: 12px; background: rgba(255,255,255,' + bgOp + '); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; } ';
        css += '.quality-item { height: 2.8em; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        css += '.full-start-new__buttons { display: flex !important; justify-content: center; gap: 12px; width: 100%; order: 6; opacity: 0; animation: slideUpFade 0.7s ease-out forwards 0.4s; padding-bottom: 20px; margin-top: 5px !important; } ';
        css += '.full-start-new .full-start__button { background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-radius: 15px !important; border: 1px solid rgba(255,255,255,0.1) !important; width: 70px !important; height: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 10px 5px !important; transition: all 0.3s ease; box-shadow: none !important; } ';
        css += '.full-start-new .full-start__button.focus { background: rgba(255,255,255,0.25) !important; transform: scale(1.1); border-color: rgba(255,255,255,0.4) !important; } ';
        css += '.full-start-new .full-start__button svg, .full-start-new .full-start__button img { width: 24px !important; height: 24px !important; margin-bottom: 5px !important; fill: #fff !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 9px !important; text-transform: uppercase !important; opacity: 0.8 !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * ЛОГІКА РЕЙТИНГІВ ТА ЖАНРІВ
     */
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        return '#ff4d4d';
    }

    function renderRatings(container, e) {
        container.find('.plugin-ratings-row').remove();
        var movie = e.data.movie;
        var $row = $('<div class="plugin-ratings-row"></div>');
        
        var tmdb = parseFloat(movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) $row.append('<div style="display:flex;align-items:center;gap:5px;"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg" style="height:1.1em"> <span style="color:'+ getRatingColor(tmdb) +'">'+tmdb+'</span></div>');
        
        var boring = ['Драма', 'Мелодрама', 'Документальний'];
        var genreList = (movie.genres || []).map(g => g.name);
        var bestGenre = genreList.find(g => !boring.includes(g)) || genreList[0] || '';
        var runtime = movie.runtime ? Math.floor(movie.runtime/60)+'г '+(movie.runtime%60)+'хв' : (movie.episode_run_time ? movie.episode_run_time[0] + 'хв' : '');
        
        if (runtime || bestGenre) {
            var infoText = (runtime ? runtime : '') + (runtime && bestGenre ? ' • ' : '') + bestGenre;
            $row.append('<div style="font-weight:400; opacity:0.9">' + infoText + '</div>');
        }
        
        var $target = container.find('.full-start-new__tagline');
        if (!$target.length || !Lampa.Storage.get('mobile_interface_show_tagline')) $target = container.find('.full-start-new__title');
        $target.after($row);
    }

    /**
     * ЛОГІКА СТУДІЙ ТА ЯКОСТІ
     */
    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        [data.networks, data.production_companies].forEach(source => {
            if (source) source.forEach(item => {
                if (item.logo_path) {
                    var url = Lampa.Api.img(item.logo_path, 'w200');
                    if (!logos.some(l => l.url === url)) logos.push({url: url, name: item.name});
                }
            });
        });

        logos.slice(0, 4).forEach(logo => {
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
                } catch(err) {}
            }; img.src = logo.url;
        });
    }

    function getBestResults(results) {
        var best = { res: null, hdr: false, dv: false, dub: false, ukr: false };
        results.slice(0, 20).forEach(item => {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr')>-1 || t.indexOf('укр')>-1) best.ukr = true;
            if (t.indexOf('4k')>-1 || t.indexOf('2160')>-1) best.res = '4K';
            else if (!best.res && t.indexOf('1080')>-1) best.res = 'FULL HD';
            if (t.indexOf('hdr')>-1) best.hdr = true;
            if (t.indexOf('vision')>-1 || t.indexOf(' dv ')>-1) best.dv = true;
            if (t.indexOf('dub')>-1 || t.indexOf('дуб')>-1) best.dub = true;
        });
        return best;
    }

    /**
     * ЛОГО ТА СЛАЙДШОУ
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
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url; $container.html('<img src="' + url + '">');
                }
                if (res.backdrops && res.backdrops.length > 1) startPosterSlideshow($('.full-start-new__poster'), res.backdrops.slice(0, 12));
            }
        });
    }

    function startPosterSlideshow($poster, items) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) return;
        var index = 0; clearInterval(slideshowTimer);
        var time = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/w780' + items[index].file_path);
            var $current = $poster.find('img').first();
            var nextImg = new Image();
            nextImg.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity: 0;">');
                $poster.append($next);
                setTimeout(() => { $next.css('opacity', '1'); $current.css('opacity', '0'); setTimeout(() => $current.remove(), 1200); }, 50);
            }; nextImg.src = imgUrl;
        }, time);
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
                
                $('.plugin-info-block').remove();
                var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                $render.find('.full-start-new__right').append($info);
                
                renderStudioLogos($info.find('.studio-row'), movie);
                
                if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && res.Results) {
                            var b = getBestResults(res.Results), list = [];
                            if (b.res) list.push(b.res);
                            if (b.dv) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                            if (b.dub) list.push('DUB'); if (b.ukr) list.push('UKR');
                            list.forEach(t => { if(svgIcons[t]) $info.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[t]+'"></div>'); });
                        }
                    });
                }
            }
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({ component: 'mobile_interface', name: 'Мобільний інтерфейс', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>' });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Анімація постера' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true }, field: { name: 'Слайд-шоу' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '125': 'Малий', '150': 'Середній', '180': 'Великий', '210': 'Гігант' }, default: '150' }, field: { name: 'Розмір логотипу' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_blocks_gap', type: 'select', values: { '6px': 'Щільно', '10px': 'Нормально', '16px': 'Вільно' }, default: '10px' }, field: { name: 'Відступи' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_studios_bg_opacity', type: 'select', values: { '0': 'Прозоро', '0.1': 'Легко', '0.2': 'Помітно' }, default: '0.15' }, field: { name: 'Фон студій' }, onChange: applyStyles });
    }

    function startPlugin() {
        applyStyles(); setupSettings(); init();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
            
