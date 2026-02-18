(function () {
    'use strict';

    // 1. Ініціалізація налаштувань
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

    // 2. Стилі з максимальним пріоритетом
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; touch-action: none !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; border: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100% !important; display: flex !important; flex-direction: column !important; align-items: center !important; min-height: 50px !important; } ';
        css += '.full-start-new__title img { max-height: 100px !important; margin-bottom: 15px !important; } ';
        
        // ПРЕМІАЛЬНІ РЕЙТИНГИ (ПЕРЕЗАПИС)
        css += '.full-start-new__rating { display: flex !important; justify-content: center !important; gap: 8px !important; margin: 15px 0 !important; padding: 0 !important; border: none !important; background: none !important; opacity: 1 !important; visibility: visible !important; } ';
        css += '.full-start-new__rating > div { display: flex !important; align-items: center !important; padding: 5px 10px !important; border-radius: 10px !important; font-weight: 800 !important; font-size: 13px !important; background: rgba(255, 255, 255, 0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; color: #fff !important; margin: 0 !important; } ';
        css += '.full-start-new__rating .tmdb { border-color: #01d277 !important; color: #01d277 !important; } ';
        css += '.full-start-new__rating .tmdb::before { content: "TMDB"; background: #01d277; color: #000; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-right: 6px; } ';
        css += '.full-start-new__rating .imdb { border-color: #f5c518 !important; color: #f5c518 !important; } ';
        css += '.full-start-new__rating .imdb::before { content: "IMDb"; background: #f5c518; color: #000; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-right: 6px; } ';
        css += '.full-start-new__rating .kp { border-color: #ff6600 !important; color: #ff6600 !important; } ';
        css += '.full-start-new__rating .kp::before { content: "КП"; background: #ff6600; color: #fff; padding: 1px 4px; border-radius: 3px; font-size: 9px; margin-right: 6px; } ';
        
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 12px 0; flex-wrap: wrap; width: 100%; } ';
        css += '.quality-badge { height: 1.3em; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(function (source) {
            if (source && source.length) {
                source.forEach(function (item) {
                    if (item.logo_path) {
                        var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                        var exists = false;
                        for(var i=0; i<logos.length; i++) { if(logos[i].url === logoUrl) exists = true; }
                        if (!exists) logos.push({ url: logoUrl, name: item.name });
                    }
                });
            }
        });
        logos.forEach(function (logo) {
            var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" style="height:1.8em"></div>');
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        results.slice(0, 30).forEach(function (item) {
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0) best.ukr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
            var foundRes = title.indexOf('4k') >= 0 ? '4K' : title.indexOf('2k') >= 0 ? '2K' : title.indexOf('1080') >= 0 ? 'FULL HD' : title.indexOf('720') >= 0 ? 'HD' : null;
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            if (title.indexOf('vision') >= 0 || title.indexOf(' dv ') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
        });
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $title = $render.find('.full-start-new__title');
                var $details = $render.find('.full-start-new__details');

                // 1. Завантаження логотипа
                var apiKey = Lampa.TMDB.key();
                var type = movie.name ? 'tv' : 'movie';
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + (Lampa.Storage.get('language') || 'uk'),
                    success: function(res) {
                        var logo = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                        if (!logo) {
                            $.ajax({
                                url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=en',
                                success: function(re) { if(re.logos && re.logos[0]) drawLogo(re.logos[0].file_path); }
                            });
                        } else drawLogo(logo);
                    }
                });

                function drawLogo(path) {
                    var url = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));
                    $title.prepend('<img src="' + url + '" class="movie-logo-img">');
                }

                // 2. Слідкуємо за рейтингом (MutationObserver)
                var observer = new MutationObserver(function() {
                    var $rating = $render.find('.full-start-new__rating');
                    if ($rating.length && !$rating.parent().hasClass('full-start-new__title')) {
                        $title.append($rating); // Переміщуємо в центр під лого
                    }
                });
                observer.observe($render[0], { childList: true, subtree: true });

                // 3. Студії та Якість
                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    renderStudioLogos(container, movie);
                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                            if (response && response.Results) {
                                var best = getBest(response.Results);
                                var list = [];
                                if (best.resolution) list.push(best.resolution);
                                if (best.dolbyVision) list.push('Dolby Vision');
                                if (best.hdr && !best.dolbyVision) list.push('HDR');
                                if (best.ukr) list.push('UKR');
                                list.forEach(function(t, i) {
                                    var icon = svgIcons[t];
                                    if(icon) container.append('<div class="quality-badge" style="animation-delay:'+(i*0.1)+'s"><img src="'+icon+'" style="height:1.3em"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initLogoAndBadges();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 1000);
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });
        var params = [
            { id: 'mobile_interface_animation', label: 'Анімація постера' },
            { id: 'mobile_interface_studios', label: 'Логотипи студій' },
            { id: 'mobile_interface_quality', label: 'Значки якості' }
        ];
        params.forEach(function (p) {
            Lampa.SettingsApi.addParam({
                component: 'mobile_interface',
                param: { name: p.id, type: 'trigger', default: true },
                field: { name: p.label },
                onChange: function () { applyStyles(); }
            });
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
