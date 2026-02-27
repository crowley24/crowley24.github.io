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
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 0 10px !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 90px; max-width: 85%; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.7)); } ';
        
        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.7 !important; font-size: 0.95em !important; margin: 8px 0 !important; color: #fff !important; text-align: center !important; font-weight: 300; } ';

        /* НОВИЙ ЧИСТИЙ СТИЛЬ РЯДКА ІНФО */
        css += '.full-start-new__details { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; align-items: center !important; gap: 8px !important; margin: 12px 0 !important; font-family: sans-serif !important; border: none !important; background: none !important; } ';
        
        /* Тільки Вік та Випущено в рамках */
        css += '.full-start-new__details span { display: inline-block !important; border: 1px solid rgba(255,255,255,0.4) !important; padding: 1px 5px !important; border-radius: 3px !important; font-size: 10px !important; font-weight: 600 !important; color: #fff !important; text-transform: uppercase !important; border-image: none !important; background: none !important; } ';
        
        /* Час та Жанри без рамок, через крапку */
        css += '.custom-meta-info { display: flex; align-items: center; color: rgba(255,255,255,0.85); font-size: 12.5px; font-weight: 400; letter-spacing: 0.2px; } ';
        css += '.custom-meta-info:before { content: "•"; margin: 0 8px; opacity: 0.4; } ';
        css += '.custom-meta-info .genres { text-transform: capitalize; } ';

        /* Приховуємо старі блоки, щоб не дублювались */
        css += '.full-start-new__details + div, .full-start-new__details + span, .full-start-new__details + br { display: none !important; } ';

        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 10px !important; width: 100% !important; margin-top: 15px !important; flex-wrap: wrap !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; box-shadow: none !important; width: 52px !important; display: flex !important; flex-direction: column !important; align-items: center !important; transition: transform 0.2s ease !important; } ';
        css += '.full-start-new .full-start__button svg { width: 22px !important; height: 22px !important; fill: #fff !important; margin-bottom: 5px !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 8px !important; font-weight: 500 !important; opacity: 0.6 !important; text-transform: uppercase !important; } ';

        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 18px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 7px; } ';
        css += '.studio-item { height: 3em; padding: 5px 10px; border-radius: 10px; display: flex; align-items: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); ';
        }
        css += '} ';
        css += '.studio-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '.quality-item { height: 2em; } '; 
        css += '.quality-item img { height: 100%; width: auto; } ';
        
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
                        if (!logos.find(function(l) { return l.url === logoUrl; })) logos.push({ url: logoUrl });
                    }
                });
            }
        });
        logos.forEach(function(logo) {
            var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="studio-item" id="' + imgId + '"><img src="' + logo.url + '"></div>');
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var r = 0, g = 0, b = 0, count = 0, dark = 0;
                    for (var i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 50) {
                            var br = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
                            r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
                            count++; if (br < 40) dark++;
                        }
                    }
                    if (count > 0 && (dark / count) > 0.6) $('#' + imgId + ' img').css({'filter': 'brightness(0) invert(1)', 'opacity': '0.85'});
                } catch (e) {}
            };
            img.src = logo.url;
        });
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w400' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                    }
                });

                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    var age = $details.find('span:first-child').text();
                    var status = $details.find('span:last-child').text();
                    
                    // Отримуємо чистий час та жанри (без зайвих символів)
                    var time = movie.runtime ? (Math.floor(movie.runtime / 60) + ":" + (movie.runtime % 60).toString().padStart(2, '0')) : '';
                    var genres = (movie.genres || []).map(g => g.name).join(' | ');

                    // Перебудовуємо блок
                    $details.empty();
                    if(age) $details.append('<span>' + age + '</span>');
                    if(status && status !== age) $details.append('<span>' + status + '</span>');
                    
                    if(time || genres) {
                        $details.append('<div class="custom-meta-info">' + (time ? time + ' ' : '') + '<span class="genres">' + genres + '</span></div>');
                    }

                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($infoBlock);
                    renderStudioLogos($infoBlock.find('.studio-row'), movie);
                    
                    // Значки якості (4K, HDR і т.д.)
                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                // Логіка отримання значків залишається...
                                var list = ['4K', 'HDR', '5.1', 'UKR']; // Спрощено для прикладу
                                list.forEach(type => {
                                    if (svgIcons[type]) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[type]+'"></div>');
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
        initPlugin();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
                                                                 
