(function () {
    'use strict';

    // 1. Налаштування
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    // 2. Стилі (Пункт 2 та 3 інтегровані)
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        // ПУНКТ 3: Покращена анімація
        var css = '@keyframes kenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.15) translate(-1%, -1%); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurns 40s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'opacity: 0.65 !important; mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        
        // ПУНКТ 1: Рейтинг на окремому рядку
        css += '.rating-row { width: 100%; display: flex; justify-content: center; margin-bottom: 8px; } ';
        css += '.movie-rating-badge { background: #f5c518; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9em; display: flex; align-items: center; height: 1.5em; box-shadow: 0 2px 5px rgba(0,0,0,0.4); animation: qb_in 0.4s ease forwards; } ';
        
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 8px 0; flex-wrap: wrap; width: 100%; min-height: 2em; } ';
        css += '.quality-badge { height: 1.25em; opacity: 0; animation: qb_in 0.4s ease forwards; display: flex; align-items: center; } ';
        css += '.studio-logo { height: 1.6em !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // ПУНКТ 2: Динамічний фон
    function updateDynamicBackground(imgUrl) {
        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = 1; canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            var p = ctx.getImageData(0, 0, 1, 1).data;
            $('.full-start-new__poster').css('background', 'radial-gradient(circle at top, rgba('+p[0]+','+p[1]+','+p[2]+',0.4) 0%, #000 100%)');
        };
        img.src = imgUrl;
    }

    // Рендер студій (повна логіка)
    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(function (source) {
            if (source) source.forEach(function (item) {
                if (item.logo_path) {
                    var url = Lampa.Api.img(item.logo_path, 'w200');
                    if (!logos.some(function(l){ return l.url === url; })) logos.push({url:url, name:item.name});
                }
            });
        });

        logos.forEach(function (logo) {
            var id = 'st_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="quality-badge studio-logo" id="'+id+'"><img src="'+logo.url+'"></div>');
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var r=0, g=0, b=0, c=0;
                    for (var i=0; i<d.length; i+=4) { if(d[i+3]>50){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; c++; } }
                    if (c>0 && (0.299*(r/c) + 0.587*(g/c) + 0.114*(b/c)) < 45) $('#'+id+' img').css('filter', 'brightness(0) invert(1)');
                } catch(e){}
            };
            img.src = logo.url;
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resO = ['HD', 'FULL HD', '2K', '4K'], audO = ['2.0', '4.0', '5.1', '7.1'];
        results.slice(0, 30).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr') >= 0 || t.indexOf('укр') >= 0 || t.indexOf('ua') >= 0) best.ukr = true;
            if (t.indexOf('dub') >= 0 || t.indexOf('дубл') >= 0) best.dub = true;
            var r = t.indexOf('4k')>=0?'4K':t.indexOf('1080')>=0?'FULL HD':null;
            if (r && (!best.resolution || resO.indexOf(r) > resO.indexOf(best.resolution))) best.resolution = r;
            if (t.indexOf('vision')>=0 || t.indexOf(' dv ')>=0) best.dolbyVision = true;
            if (t.indexOf('hdr')>=0) best.hdr = true;
            var a = t.indexOf('7.1')>=0?'7.1':t.indexOf('5.1')>=0?'5.1':null;
            if (a && (!best.audio || audO.indexOf(a) > audO.indexOf(best.audio))) best.audio = a;
        });
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie, $render = e.object.activity.render(), $title = $render.find('.full-start-new__title');
                
                if (movie.poster_path) updateDynamicBackground(Lampa.TMDB.image('/t/p/w200' + movie.poster_path));

                var lang = Lampa.Storage.get('language') || 'uk';
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang,
                    success: function(res) {
                        var logo = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                        if (!logo) {
                            $.ajax({ url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en', success: function(en){ if(en.logos[0]) renderLogo(en.logos[0].file_path); }});
                        } else renderLogo(logo);
                    }
                });

                function renderLogo(p) {
                    $title.html('<img src="' + Lampa.TMDB.image('/t/p/w400' + p.replace('.svg', '.png')) + '" style="max-height: 100px; object-fit: contain;">');
                }

                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.rating-row, .quality-badges-container').remove();
                    
                    // Додаємо рядок рейтингу окремо
                    if (movie.vote_average) {
                        $details.after('<div class="rating-row"><div class="movie-rating-badge">★ ' + movie.vote_average.toFixed(1) + '</div></div>');
                    }
                    
                    // Додаємо контейнер для студій та якості
                    var $ratingRow = $render.find('.rating-row');
                    $ratingRow.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    
                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (res) {
                            if (res && res.Results) {
                                var b = getBest(res.Results), list = [];
                                if (b.resolution) list.push(b.resolution);
                                if (b.dolbyVision) list.push('Dolby Vision');
                                if (b.hdr && !b.dolbyVision) list.push('HDR');
                                if (b.audio) list.push(b.audio);
                                if (b.dub) list.push('DUB');
                                if (b.ukr) list.push('UKR');
                                list.forEach(function(type, i){
                                    if(svgIcons[type]) container.append('<div class="quality-badge" style="animation-delay:'+(i*0.08)+'s"><img src="'+svgIcons[type]+'"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    applyStyles();
    init();
    Lampa.Storage.set('blur_poster', false);
})();
