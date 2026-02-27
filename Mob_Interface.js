(function () {
    'use strict';

    // 1. Налаштування (Збережено)
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
        
        /* ХОВАЄМО ЗАЙВІ ЕЛЕМЕНТИ */
        css += '.full-start__status, .full-start-new__status { display: none !important; } ';
        
        /* ПРАВА ПАНЕЛЬ - ЦЕНТРУВАННЯ */
        css += '.full-start-new__right { display: flex !important; flex-direction: column !important; align-items: center !important; background: none !important; margin-top: -110px !important; z-index: 2 !important; } ';

        /* ГОЛОВНИЙ ФІКС ДЛЯ ОДНОГО РЯДКА */
        /* Робимо спільний контейнер для віку та деталей */
        css += '.full-start-new__details { display: inline-flex !important; align-items: center !important; justify-content: center !important; flex-wrap: nowrap !important; gap: 8px !important; margin: 15px 0 !important; font-size: 1.1em !important; width: auto !important; } ';
        
        /* ВІКОВИЙ РЕЙТИНГ (Додаємо його як елемент рядка) */
        css += '.full-start__age { position: static !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; border: 1px solid rgba(255,255,255,0.4) !important; padding: 0 6px !important; border-radius: 4px !important; font-size: 0.9em !important; height: 1.5em !important; line-height: 1 !important; order: -1 !important; } ';

        /* ЗАБЕЗПЕЧУЄМО, ЩОБ ВОНИ НЕ ПЕРЕНОСИЛИСЬ */
        css += '.full-start-new__details > * { white-space: nowrap !important; } ';

        /* СТИЛІ ПОСТЕРА */
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; } ';
        css += '.full-start-new__poster img { ' + (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '') + 'width: 100%; height: 100%; object-fit: cover; mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        /* ЛОГОТИП ФІЛЬМУ */
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); } ';

        /* БЛОК СТУДІЙ ТА ЯКОСТІ */
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 15px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; } ';
        css += '.studio-item { height: 3.2em; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ФУНКЦІЇ ДЛЯ ДАНИХ (БЕЗ ЗМІН) */
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
                        if (!logos.find(function(l) { return l.url === logoUrl; })) logos.push({ url: logoUrl, name: item.name });
                    }
                });
            }
        });
        logos.forEach(function(logo) { container.append('<div class="studio-item"><img src="' + logo.url + '"></div>'); });
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // ПЕРЕМІЩЕННЯ ВІКУ ВСЕРЕДИНУ ДЕТАЛЕЙ (для одного рядка)
                var $age = $render.find('.full-start__age');
                var $details = $render.find('.full-start-new__details');
                if ($age.length && $details.length) {
                    $details.prepend($age); // Ставимо вік на початок рядка з жанрами
                }

                // Логотип та слайдшоу
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                    }
                });

                // Блок студій
                setTimeout(function() {
                    if ($details.length) {
                        $('.plugin-info-block').remove();
                        var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                        $details.after($infoBlock);
                        renderStudioLogos($infoBlock.find('.studio-row'), movie);
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
