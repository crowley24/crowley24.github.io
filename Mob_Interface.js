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
        
        /* 1. ПРИХОВУЄМО СТАТУС ("Випущено") */
        css += '.full-start__status, .full-start-new__status { display: none !important; } ';
        
        /* 2. РОБИМО ПРАВУ ПАНЕЛЬ КОНТЕЙНЕРОМ FLEX ДЛЯ ЦЕНТРУВАННЯ */
        css += '.full-start-new__right { display: flex !important; flex-direction: column !important; align-items: center !important; text-align: center !important; background: none !important; margin-top: -110px !important; z-index: 2 !important; } ';

        /* 3. ГОЛОВНИЙ ФІКС: ЗМУШУЄМО ВІК ТА ЖАНРИ СТАТИ В ОДИН РЯД */
        /* Ми використовуємо селектор, який охоплює сусідні елементи */
        css += '.full-start-new__right { display: flex !important; flex-direction: column !important; } ';
        
        /* Створюємо ілюзію одного рядка для віку та деталей */
        css += '.full-start__age { position: relative !important; display: inline-block !important; margin: 10px auto 5px !important; border: 1px solid rgba(255,255,255,0.4) !important; padding: 1px 6px !important; border-radius: 4px !important; font-size: 0.9em !important; line-height: 1.4 !important; height: auto !important; left: auto !important; top: auto !important; } ';
        
        /* Жанри та тривалість підтягуємо вгору до віку */
        css += '.full-start-new__details { display: flex !important; align-items: center !important; justify-content: center !important; margin-top: -30px !important; padding-left: 60px !important; min-height: 30px !important; font-size: 1.1em !important; } ';

        /* ДЛЯ ПРАВИЛЬНОГО ВІДОБРАЖЕННЯ, ЯКЩО DETAILS ЙДЕ ПЕРШИМ */
        css += '.full-start-new__right > * { order: 2; } ';
        css += '.full-start-new__title { order: 1 !important; width: 100%; display: flex; justify-content: center; min-height: 80px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); } ';

        /* СТИЛІ ПОСТЕРА ТА СЛАЙДШОУ */
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; } ';
        css += '.full-start-new__poster img { ' + (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '') + 'width: 100%; height: 100%; object-fit: cover; mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        /* БЛОК СТУДІЙ ТА ЯКОСТІ */
        css += '.plugin-info-block { order: 10 !important; display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 15px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; } ';
        css += '.studio-item { height: 3.2em; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ФУНКЦІЇ ЛОГОТИПІВ, ЯКОСТІ ТА СЛАЙДШОУ (БЕЗ ЗМІН) */
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
        var best = { resolution: null, hdr: false, audio: null, dub: false, ukr: false };
        for (var i = 0; i < Math.min(results.length, 20); i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            if (title.indexOf('4k') >= 0) best.resolution = '4K';
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
            var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0; position: absolute; top:0;">');
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
                
                // Фізично переставляємо вік ближче до деталей для CSS-хаку
                var $age = $render.find('.full-start__age');
                var $details = $render.find('.full-start-new__details');
                if ($age.length && $details.length) {
                    $age.insertBefore($details);
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

                // Додаємо блок інфо
                setTimeout(function() {
                    if ($details.length) {
                        $('.plugin-info-block').remove();
                        var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                        $details.after($infoBlock);
                        renderStudioLogos($infoBlock.find('.studio-row'), movie);
                        
                        if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                            Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                                if (res && res.Results) {
                                    var best = getBest(res.Results);
                                    if (best.resolution) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[best.resolution]+'"></div>');
                                    if (best.ukr) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons['UKR']+'"></div>');
                                }
                            });
                        }
                    }
                }, 500);
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
