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

        /* ТВОЄ РІШЕННЯ: ПРИХОВУЄМО МЕТАДАНІ */
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="status"] { display:none !important; } ';

        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -60px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.7)); } ';
        
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 10px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; width: 100%; } ';

        css += '.studio-item { height: 3.2em; opacity: 0; animation: qb_in 0.4s ease forwards; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 2px 10px rgba(0,0,0,0.2); ';
        }
        css += '} ';
        css += '.quality-item { height: 2.2em; opacity: 0; animation: qb_in 0.4s ease forwards; } '; 
        css += '.studio-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '.quality-item img { height: 100%; width: auto; object-fit: contain; filter: drop-shadow(0px 1px 3px rgba(0,0,0,0.5)); } ';
        
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
                        if (!logos.find(function(l) { return l.url === logoUrl; })) logos.push({ url: logoUrl, name: item.name });
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
                    var r = 0, g = 0, b = 0, pixelCount = 0;
                    for (var i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 50) {
                            r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
                            pixelCount++;
                        }
                    }
                    if (pixelCount > 0 && (0.299 * (r/pixelCount) + 0.587 * (g/pixelCount) + 0.114 * (b/pixelCount)) < 40) {
                        $('#' + imgId + ' img').css('filter', 'brightness(0) invert(1)');
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
        for (var i = 0; i < Math.min(results.length, 20); i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
            else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;

            if (item.ffprobe && Array.isArray(item.ffprobe)) {
                item.ffprobe.forEach(function(stream) {
                    if (stream.codec_type === 'video') {
                        if (JSON.stringify(stream.side_data_list || '').indexOf('Vision') >= 0) best.dolbyVision = true;
                        if (stream.color_transfer === 'smpte2084') best.hdr = true;
                    }
                    if (stream.codec_type === 'audio' && stream.channels) {
                        var ch = parseInt(stream.channels);
                        var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
                        if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
                    }
                });
            }
            if (title.indexOf('vision') >= 0 || title.indexOf('dv') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        }
        if (best.dolbyVision) best.hdr = false; // Пріоритет DV
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        var quality = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780');
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + quality + backdrops[index].file_path);
            var $currentImg = $poster.find('img').first();
            var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0; position: absolute; top:0;">');
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

                setTimeout(function() {
                    $('.plugin-info-block').remove();
                    var $title = $render.find('.full-start-new__title');
                    if ($title.length) {
                        var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                        $title.after($infoBlock);
                        renderStudioLogos($infoBlock.find('.studio-row'), movie);

                        if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
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
                                            $infoBlock.find('.quality-row').append('<div class="quality-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[type]+'"></div>');
                                        }
                                    });
                                }
                            });
                        }
                    }
                }, 400);
            }
        });
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Анімація постера' }, onChange: function () { applyStyles(); } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true }, field: { name: 'Слайд-шоу фону' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_slideshow_time', type: 'select', values: { '10000': '10 сек', '15000': '15 сек', '20000': '20 сек' }, default: '10000' }, field: { name: 'Інтервал слайд-шоу' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_studios', type: 'trigger', default: true }, field: { name: 'Логотипи студій' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_studios_bg_opacity', type: 'select', values: { '0': 'Вимкнено', '0.05': 'Мінімальна', '0.15': 'Легка', '0.3': 'Середня', '0.5': 'Густа' }, default: '0.15' }, field: { name: 'Фон студій' }, onChange: function () { applyStyles(); } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_quality', type: 'trigger', default: true }, field: { name: 'Значки якості' } });
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
