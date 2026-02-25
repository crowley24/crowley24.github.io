(function () {
    'use strict';

    var settings_list = [
        { id: 'tv_interface_animation', default: true },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15' },
        { id: 'tv_interface_quality', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_time', default: '10000' }, 
        { id: 'tv_interface_slideshow_quality', default: 'original' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('tv_interface_animation');
        var bgOpacity = Lampa.Storage.get('tv_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } ';
        
        /* 1. ПРИМУСОВО ХОВАЄМО ВСІ СТАНДАРТНІ ЕЛЕМЕНТИ ФОНУ */
        css += '.full-start-new__poster img, .full-start-new__poster--blur, .full-start-new__bg { display: none !important; opacity: 0 !important; visibility: hidden !important; } ';
        
        /* 2. НАЛАШТОВУЄМО КОНТЕЙНЕР ДЛЯ НАШИХ СЛАЙДІВ */
        css += '.full-start-new__poster { ';
        css += 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; ';
        css += 'z-index: -1 !important; margin: 0 !important; background: #000 !important; overflow: hidden !important; display: block !important; } ';
        
        /* 3. СТИЛІ НАШИХ СЛАЙДІВ */
        css += '.plugin-slide { ';
        css += 'position: absolute !important; top: 0; left: 0; width: 100% !important; height: 100% !important; object-fit: cover !important; ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 35s ease-in-out infinite !important; ' : '');
        css += 'transition: opacity 2.5s ease-in-out !important; ';
        css += 'mask-image: linear-gradient(to right, #000 15%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to right, #000 15%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%) !important; } ';
        
        /* КОНТЕНТ */
        css += '.full-start-new__right { background: none !important; z-index: 5 !important; } ';
        css += '.full-start-new__title img { max-width: 480px; max-height: 160px; filter: drop-shadow(0 0 15px rgba(0,0,0,0.9)); } ';

        /* ІНФО-БЛОКИ */
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 20px; margin-top: 30px; } ';
        css += '.studio-row, .quality-row { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; } ';
        css += '.studio-item { height: 44px; padding: 6px 14px; border-radius: 12px; background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(10px); animation: qb_in 0.6s ease forwards; } ';
        css += '.quality-item { height: 32px; animation: qb_in 0.6s ease forwards; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        var limit = Math.min(results.length, 20);
        for (var i = 0; i < limit; i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
            else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            if (item.ffprobe && Array.isArray(item.ffprobe)) {
                item.ffprobe.forEach(function(stream) {
                    if (stream.codec_type === 'video') {
                        if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
                        if (stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67') best.hdr = true;
                    }
                    if (stream.codec_type === 'audio' && stream.channels) {
                        var ch = parseInt(stream.channels);
                        var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
                        if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
                    }
                });
            }
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0 || title.indexOf(' dv ') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        }
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('tv_interface_slideshow') || backdrops.length < 1) return;
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '10000'));
        var quality = Lampa.Storage.get('tv_interface_slideshow_quality', 'original');
        
        clearInterval(slideshowTimer);

        function nextSlide() {
            var imgUrl = Lampa.TMDB.image('/t/p/' + quality + backdrops[index].file_path);
            var nextImg = new Image();
            nextImg.onload = function() {
                var $newImg = $('<img src="' + imgUrl + '" class="plugin-slide" style="opacity: 0;">');
                $poster.append($newImg);
                setTimeout(function() {
                    $newImg.css('opacity', '1');
                    setTimeout(function() { 
                        $poster.find('img.plugin-slide').not($newImg).remove(); 
                    }, 2500);
                }, 100);
                index = (index + 1) % backdrops.length;
            };
            nextImg.src = imgUrl;
        }

        nextSlide(); // Перший слайд
        if (backdrops.length > 1) {
            slideshowTimer = setInterval(nextSlide, interval);
        }
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $poster = $render.find('.full-start-new__poster');
                
                // Радикальна чистка контейнера
                $poster.empty();

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                        if (res.backdrops && res.backdrops.length > 0) {
                            startSlideshow($poster, res.backdrops.slice(0, 15));
                        }
                    }
                });

                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.append($infoBlock);

                    if (Lampa.Storage.get('tv_interface_studios')) {
                        var studios = (movie.networks || []).concat(movie.production_companies || []);
                        var addedLogos = [];
                        studios.forEach(s => {
                            if (s.logo_path && addedLogos.indexOf(s.logo_path) === -1) {
                                addedLogos.push(s.logo_path);
                                var logoUrl = Lampa.Api.img(s.logo_path, 'w200');
                                $infoBlock.find('.studio-row').append('<div class="studio-item"><img src="' + logoUrl + '"></div>');
                            }
                        });
                    }

                    if (Lampa.Storage.get('tv_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                var best = getBest(res.Results);
                                var list = [];
                                if (best.resolution) list.push(best.resolution);
                                if (best.dolbyVision) list.push('Dolby Vision');
                                else if (best.hdr) list.push('HDR');
                                if (best.audio) list.push(best.audio);
                                if (best.dub) list.push('DUB');
                                if (best.ukr) list.push('UKR');
                                
                                list.forEach((type, i) => {
                                    if (svgIcons[type]) {
                                        var $q = $('<div class="quality-item" style="animation-delay:'+(i*0.15)+'s"><img src="'+svgIcons[type]+'"></div>');
                                        $infoBlock.find('.quality-row').append($q);
                                    }
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
            component: 'tv_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>',
            name: 'TV Інтерфейс+'
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { name: 'tv_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону', description: 'Ефект Ken Burns' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { name: 'tv_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу', description: 'Зміна кадрів фільму' }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { 
                name: 'tv_interface_studios_bg_opacity', 
                type: 'select', 
                values: { '0': 'Вимкнено', '0.15': 'Легка', '0.3': 'Середня' }, 
                default: '0.15' 
            },
            field: { name: 'Фон студій', description: 'Прозорість логотипів' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { name: 'tv_interface_quality', type: 'trigger', default: true },
            field: { name: 'Значки якості', description: '4K, HDR, UKR' }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        setInterval(function () { 
            if (window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
                window.lampa_settings.poster_type = 'original'; 
            }
        }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
