(function () {
    'use strict';

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' }, 
        { id: 'mobile_interface_slideshow_quality', default: 'w780' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        
        /* ПРИХОВУЄМО ЗАЙВЕ */
        css += '.full-start__status, .full-start-new__status { display: none !important; } ';
        
        /* ОБ'ЄДНАННЯ В ОДИН РЯДОК (Центрування віку та жанрів) */
        css += '.full-info-combined { display: flex !important; align-items: center !important; justify-content: center !important; flex-wrap: wrap !important; gap: 10px !important; width: 100% !important; margin: 10px 0 !important; color: #fff !important; } ';
        
        /* СТИЛЬ ВІКУ */
        css += '.full-info-combined .full-start__age { position: static !important; display: inline-block !important; border: 1px solid rgba(255,255,255,0.4) !important; padding: 1px 6px !important; border-radius: 4px !important; font-size: 0.9em !important; line-height: 1.4 !important; margin: 0 !important; height: auto !important; } ';
        
        /* СТИЛЬ ЖАНРІВ ТА ЧАСУ */
        css += '.full-info-combined .full-start-new__details { position: static !important; display: inline-flex !important; margin: 0 !important; font-size: 1em !important; opacity: 0.9 !important; white-space: nowrap !important; } ';

        /* ЗАГАЛЬНА КАРТКА */
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; } ';
        css += '.full-start-new__poster img { ' + (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '') + 'width: 100%; height: 100%; object-fit: cover; mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); } ';
        
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 15px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; } ';

        css += '.studio-item { height: 3.2em; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderStudioLogos(container, data) {
        var showStudio = Lampa.Storage.get('mobile_interface_studios');
        if (showStudio === false || showStudio === 'false') return;
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(function(source) {
            if (source && source.length) {
                source.forEach(function(item) {
                    if (item.logo_path) {
                        var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                        if (!logos.find(function(l) { return l.url === logoUrl; })) {
                            logos.push({ url: logoUrl, name: item.name });
                        }
                    }
                });
            }
        });
        logos.forEach(function(logo) {
            container.append('<div class="studio-item"><img src="' + logo.url + '"></div>');
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        for (var i = 0; i < Math.min(results.length, 20); i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            if (title.indexOf('vision') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0) best.dub = true;
        }
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/w780' + backdrops[index].file_path);
            var $currentImg = $poster.find('img').first();
            var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0; position: absolute; top:0; left:0;">');
            $poster.append($newImg);
            setTimeout(function() { $newImg.css('opacity', '1'); $currentImg.css('opacity', '0'); setTimeout(function() { $currentImg.remove(); }, 1500); }, 100);
        }, 10000);
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // СТВОРЕННЯ ОБ'ЄДНАНОГО РЯДКА (JS ФІКС)
                var $details = $render.find('.full-start-new__details');
                var $age = $render.find('.full-start__age');
                
                if ($details.length && $age.length) {
                    $('.full-info-combined').remove(); // Видаляємо дублі
                    var $combined = $('<div class="full-info-combined"></div>');
                    $combined.append($age.clone());
                    $combined.append($details.clone());
                    
                    $details.replaceWith($combined);
                    $age.hide(); // Ховаємо оригінальний вік зліва
                }

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                        if (res.backdrops && res.backdrops.length > 1) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 15));
                    }
                });

                // Блок студій та якості під рядком інфо
                setTimeout(function() {
                    var $anchor = $render.find('.full-info-combined');
                    if ($anchor.length) {
                        $('.plugin-info-block').remove();
                        var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                        $anchor.after($infoBlock);
                        renderStudioLogos($infoBlock.find('.studio-row'), movie);
                        
                        if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                            Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                                if (res && res.Results) {
                                    var best = getBest(res.Results);
                                    var list = [];
                                    if (best.resolution) list.push(best.resolution);
                                    if (best.dub) list.push('DUB'); if (best.ukr) list.push('UKR');
                                    list.forEach(type => {
                                        if (svgIcons[type]) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[type]+'"></div>');
                                    });
                                }
                            });
                        }
                    }
                }, 400);
            }
        });
    }

    function start() {
        applyStyles();
        initPlugin();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
