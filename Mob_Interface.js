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
        
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 0 20px !important; } ';
        
        // Заголовок (Логотип)
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; max-width: 80%; object-fit: contain; filter: drop-shadow(0 0 12px rgba(0,0,0,0.8)); } ';
        
        // Слоган
        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.8 !important; font-size: 1em !important; margin: 10px 0 !important; color: #fff !important; text-align: center !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8); font-weight: 300; } ';

        // НОВИЙ СТИЛЬ: Вік, Час, Жанри
        css += '.full-start-new__details { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; align-items: center !important; gap: 8px !important; margin: 10px 0 !important; font-family: "Roboto Condensed", sans-serif !important; text-transform: none !important; } ';
        
        // Бейджі (17+, Випущено)
        css += '.full-start-new__details span { display: inline-block !important; border: 1.5px solid rgba(255,255,255,0.5) !important; padding: 1px 6px !important; border-radius: 4px !important; font-size: 11px !important; font-weight: 700 !important; color: #fff !important; line-height: 1.2 !important; letter-spacing: 0.5px !important; } ';
        
        // Рядок опису (01:47 • Бойовик...)
        css += '.full-start-new__description-row { display: flex; align-items: center; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 400; letter-spacing: 0.3px; } ';
        css += '.full-start-new__description-row:before { content: "•"; margin: 0 8px; opacity: 0.5; } ';

        // Кнопки дій
        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 12px !important; width: 100% !important; margin-top: 20px !important; flex-wrap: wrap !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; box-shadow: none !important; padding: 4px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 56px !important; transition: transform 0.2s ease !important; } ';
        css += '.full-start-new .full-start__button svg { width: 24px !important; height: 24px !important; margin-bottom: 6px !important; fill: #fff !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); } ';
        css += '.full-start-new .full-start__button span { font-size: 9px !important; font-weight: 500 !important; text-transform: uppercase !important; color: #fff !important; opacity: 0.6 !important; text-align: center !important; } ';

        // Студії та Якість
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 20px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%; } ';
        css += '.studio-item { height: 3.2em; opacity: 0; animation: qb_in 0.4s ease forwards; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); ';
        }
        css += '} ';
        css += '.quality-item { height: 2.2em; opacity: 0; animation: qb_in 0.4s ease forwards; } '; 
        css += '.studio-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '.quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
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
                    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    var pixels = imageData.data;
                    var r = 0, g = 0, b = 0, count = 0, dark = 0;
                    for (var i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 50) {
                            var br = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
                            r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
                            count++; if (br < 30) dark++;
                        }
                    }
                    if (count > 0 && (dark / count) > 0.6) {
                        $('#' + imgId + ' img').css({'filter': 'brightness(0) invert(1)', 'opacity': '0.9'});
                    }
                } catch (e) {}
            };
            img.src = logo.url;
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        results.slice(0, 20).forEach(function(item) {
            var title = (item.Title || '').toLowerCase();
            if (/ukr|укр|ua/.test(title)) best.ukr = true;
            var res = title.includes('4k') || title.includes('2160') ? '4K' : title.includes('2k') || title.includes('1440') ? '2K' : title.includes('1080') ? 'FULL HD' : title.includes('720') ? 'HD' : null;
            if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) best.resolution = res;
            if (item.ffprobe) {
                JSON.stringify(item.ffprobe).includes('Vision') ? best.dolbyVision = true : null;
                item.ffprobe.forEach(s => {
                    if (s.codec_type === 'audio' && s.channels) {
                        var a = s.channels >= 8 ? '7.1' : s.channels >= 6 ? '5.1' : s.channels >= 4 ? '4.0' : '2.0';
                        if (!best.audio || audioOrder.indexOf(a) > audioOrder.indexOf(best.audio)) best.audio = a;
                    }
                });
            }
            if (/vision|dovi| dv /.test(title)) best.dolbyVision = true;
            if (title.includes('hdr')) best.hdr = true;
            if (/dub|дубл/.test(title)) best.dub = true;
        });
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        clearInterval(slideshowTimer);
        var index = 0;
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var url = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_slideshow_quality') + backdrops[index].file_path);
            var $old = $poster.find('img').first();
            $('<img src="'+url+'" style="opacity:0; z-index:-1;">').appendTo($poster).on('load', function() {
                $(this).css('opacity', '1'); $old.css('opacity', '0');
                setTimeout(() => $old.remove(), 1500);
            });
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time')));
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Отримання Лого та Слайдшоу
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w400' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                        if (res.backdrops) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 15));
                    }
                });

                // Переробка блоку Details (Вік, Час, Жанри)
                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    var age = $details.find('span:first-child').text();
                    var status = $details.find('span:last-child').text();
                    var metaText = $render.find('.full-start-new__details').next('div').text(); // Отримуємо рядок 01:47 • Бойовик...
                    
                    // Очищуємо та створюємо нову структуру
                    $details.empty().append('<span>' + age + '</span>');
                    if(status && status !== age) $details.append('<span>' + status + '</span>');
                    $details.append('<div class="full-start-new__description-row">' + metaText + '</div>');
                    $render.find('.full-start-new__details').next('div').remove(); // Видаляємо старий дублюючий рядок

                    // Студії та Якість
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($infoBlock);
                    renderStudioLogos($infoBlock.find('.studio-row'), movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                var best = getBest(res.Results);
                                var list = [best.resolution, best.dolbyVision ? 'Dolby Vision' : (best.hdr ? 'HDR' : null), best.audio, best.dub ? 'DUB' : null, best.ukr ? 'UKR' : null].filter(Boolean);
                                list.forEach((type, i) => {
                                    if (svgIcons[type]) $infoBlock.find('.quality-row').append('<div class="quality-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[type]+'"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });
        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація постера', description: 'Ефект наближення фону' },
            onChange: function () { applyStyles(); }
        });
        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу фону' }
        });
        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_studios', type: 'trigger', default: true },
            field: { name: 'Логотипи студій' }
        });
        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_quality', type: 'trigger', default: true },
            field: { name: 'Значки якості' }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
                        
