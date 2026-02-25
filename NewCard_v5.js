(function () {
    'use strict';

    var settings_list = [
        { id: 'tv_interface_animation', default: true },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15' },
        { id: 'tv_interface_quality', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_time', default: '15000' }, 
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
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes fadeInSlide { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } ';
        
        // Фон та градієнт
        css += '.full-start-new__poster { position: fixed !important; overflow: hidden !important; background: #000; z-index: 0; width: 100% !important; height: 100% !important; top: 0; left: 0; pointer-events: none !important; } ';
        css += '.full-start-new__poster::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.4) 40%, transparent 100%), linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 30%); z-index: 1; } ';
        
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 40s linear infinite !important; ' : '');
        css += 'position: absolute; width: 100%; height: 100%; object-fit: cover; transition: opacity 2s ease-in-out !important; } ';
        
        // Головний контейнер (Netflix/AppleTV Style)
        css += '.full-start-new__right { z-index: 2 !important; position: relative; background: none !important; display: flex !important; flex-direction: column !important; align-items: flex-start !important; padding-left: 60px !important; padding-top: 5vh !important; text-align: left !important; width: 50% !important; } ';
        
        // Логотип фільму
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: flex-start; margin-bottom: 20px; animation: fadeInSlide 0.8s ease-out forwards; } ';
        css += '.full-start-new__title img { max-height: 180px; max-width: 450px; object-fit: contain; filter: drop-shadow(0 0 20px rgba(0,0,0,0.5)); } ';
        
        // Мета-інформація (Блок під назвою)
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 20px; animation: fadeInSlide 1s ease-out forwards; } ';
        css += '.studio-row, .quality-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } ';
        
        // Студії
        css += '.studio-item { height: 42px; padding: 6px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); ';
        }
        css += '} ';
        css += '.studio-item img { height: 100%; width: auto; filter: brightness(1.1); } ';

        // Значки якості
        css += '.quality-item { height: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); } ';
        css += '.quality-item img { height: 100%; width: auto; } ';

        // Опис фільму (якщо він є, робимо його вужчим для стилю)
        css += '.full-start-new__descr { max-width: 450px; font-size: 1.2em; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); margin-top: 20px !important; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // Функція пошуку найкращої якості залишається без змін...
    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        var limit = Math.min(results.length, 25);
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
        if (!Lampa.Storage.get('tv_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '15000'));
        var quality = Lampa.Storage.get('tv_interface_slideshow_quality', 'original');
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + quality + backdrops[index].file_path);
            var $currentImg = $poster.find('img').first();
            var nextImg = new Image();
            nextImg.onload = function() {
                var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0;">');
                $poster.append($newImg);
                setTimeout(function() {
                    $newImg.css('opacity', '1');
                    $currentImg.css('opacity', '0');
                    setTimeout(function() { $currentImg.remove(); }, 2000);
                }, 100);
            };
            nextImg.src = imgUrl;
        }, interval);
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                        if (res.backdrops && res.backdrops.length > 1) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 15));
                    }
                });

                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($infoBlock);

                    if (Lampa.Storage.get('tv_interface_studios')) {
                        var studios = (movie.networks || []).concat(movie.production_companies || []);
                        var addedLogos = [];
                        studios.forEach(s => {
                            if (s.logo_path && addedLogos.indexOf(s.logo_path) === -1) {
                                addedLogos.push(s.logo_path);
                                var logoUrl = Lampa.Api.img(s.logo_path, 'w300');
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
                                        var $q = $('<div class="quality-item"><img src="'+svgIcons[type]+'"></div>');
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
            name: 'TV Cinema Mode'
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { name: 'tv_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону', description: 'Кінематографічне наближення' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { name: 'tv_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу', description: 'Зміна кадрів фільму на фоні' }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: { 
                name: 'tv_interface_studios_bg_opacity', 
                type: 'select', 
                values: { '0': 'Прозорий', '0.15': 'Легкий', '0.3': 'Середній' }, 
                default: '0.15' 
            },
            field: { name: 'Підкладка для логотипів' },
            onChange: function () { applyStyles(); }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        setInterval(function () { 
            if (window.lampa_settings) window.lampa_settings.blur_poster = false; 
        }, 3000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
