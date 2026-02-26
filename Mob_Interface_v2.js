(function () {
    'use strict';

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
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
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); } ';
        
        // Видаляємо зайві плашки (вік, статус)
        css += '.full-start-new__details, .full-start-new__age { display: none !important; } ';

        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.8 !important; font-size: 0.95em !important; margin: 2px 0 10px !important; color: #fff !important; text-align: center !important; } ';

        // КОМПАКТНИЙ ІНФО-РЯДОК ПІД ЛОГО ТИТРОМ
        css += '.mobile-info-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; } ';
        css += '.mobile-info-item:not(:last-child):after { content: "•"; margin-left: 6px; opacity: 0.5; } ';

        // КНОПКИ КЕРУВАННЯ
        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 8px !important; width: 100% !important; margin-top: 15px !important; flex-wrap: wrap !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; box-shadow: none !important; padding: 4px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 54px !important; min-width: 0 !important; } ';
        css += '.full-start-new .full-start__button svg { width: 22px !important; height: 22px !important; margin-bottom: 4px !important; fill: #fff !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 8px !important; opacity: 0.5 !important; text-transform: uppercase !important; } ';

        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 10px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px; width: 100%; } ';

        // ЕФЕКТ ДЛЯ ЛОГО СТУДІЙ (Золотистий фільтр для чорних лого)
        css += '.studio-item { height: 2.0em; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        css += '.studio-item img { height: 100%; width: auto; object-fit: contain; filter: sepia(1) saturate(5) hue-rotate(5deg) brightness(1.2); } ';
        
        css += '.quality-item { height: 2.2em; opacity: 0; animation: qb_in 0.4s ease forwards; } '; 
        css += '.quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        for (var i = 0; i < Math.min(results.length, 20); i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0) foundRes = 'FULL HD';
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        }
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/w780' + backdrops[index].file_path);
            var $currentImg = $poster.find('img').first();
            var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0; position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">');
            $poster.append($newImg);
            setTimeout(function() { $newImg.css('opacity', '1'); $currentImg.css('opacity', '0'); setTimeout(function() { $currentImg.remove(); }, 1500); }, 100);
        }, interval);
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Видаляємо старі блоки, якщо вони є
                $('.mobile-info-row, .plugin-info-block').remove();

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

                // НОВИЙ ІНФО-РЯДОК (Без країни, тільки Жанри та Час)
                var infoHtml = '<div class="mobile-info-row">';
                if (movie.genres && movie.genres.length) infoHtml += '<span class="mobile-info-item">' + movie.genres.slice(0, 2).map(g => g.name).join(', ') + '</span>';
                if (movie.runtime) {
                    var h = Math.floor(movie.runtime / 60);
                    var m = movie.runtime % 60;
                    infoHtml += '<span class="mobile-info-item">' + (h > 0 ? h + 'г ' : '') + m + 'хв</span>';
                }
                infoHtml += '</div>';
                $render.find('.full-start-new__title').after(infoHtml);

                var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                $render.find('.full-start-new__tagline').after($infoBlock);

                if (Lampa.Storage.get('mobile_interface_studios')) {
                    var studios = (movie.networks || []).concat(movie.production_companies || []);
                    var added = [];
                    studios.forEach(s => {
                        if (s.logo_path && added.indexOf(s.logo_path) === -1) {
                            added.push(s.logo_path);
                            $infoBlock.find('.studio-row').append('<div class="studio-item"><img src="' + Lampa.Api.img(s.logo_path, 'w200') + '"></div>');
                        }
                    });
                }

                if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && res.Results) {
                            var best = getBest(res.Results);
                            ['resolution', 'hdr', 'audio', 'dub', 'ukr'].forEach(key => {
                                var type = (key === 'resolution') ? best.resolution : (key === 'hdr' && best.hdr) ? 'HDR' : (key === 'dub' && best.dub) ? 'DUB' : (key === 'ukr' && best.ukr) ? 'UKR' : null;
                                if (type && svgIcons[type]) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[type]+'"></div>');
                            });
                        }
                    });
                }
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
