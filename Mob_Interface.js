(function () {
    'use strict';

    // 1. Ініціалізація налаштувань
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
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    // 2. Стилі (Виправлено розміри студій та стиль напису)
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
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 62vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; margin-top: -130px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; border: none !important; box-shadow: none !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 80px; margin-bottom: 5px; } ';
        
        // Оригінальний стиль напису під назвою
        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.8 !important; font-size: 1.1em !important; margin-bottom: 15px !important; color: #fff !important; text-align: center !important; width: 100% !important; display: block !important; text-shadow: 0 2px 4px rgba(0,0,0,0.5); } ';

        // Збільшені логотипи студій
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.8em; margin: 15px 0; flex-wrap: wrap; width: 100%; position: relative; z-index: 5; } ';
        css += '.quality-badge { height: 1.4em; display: flex; align-items: center; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        css += '.quality-badge.studio-logo { height: 2.2em !important; } '; 
        css += '.quality-badge img { height: 100%; width: auto; display: block; object-fit: contain; } ';
        css += '.full-start-new__buttons, .full-start-new__details { justify-content: center !important; text-align: center !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        var quality = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780');
        
        clearInterval(slideshowTimer);

        slideshowTimer = setInterval(function() {
            index++;
            if (index >= backdrops.length) index = 0;

            var imgUrl = Lampa.TMDB.image('/t/p/' + quality + backdrops[index].file_path);
            var $currentImg = $poster.find('img').first();
            
            var nextImg = new Image();
            nextImg.onload = function() {
                var $newImg = $('<img src="' + imgUrl + '" style="opacity: 0; z-index: -1;">');
                $poster.append($newImg);
                
                setTimeout(function() {
                    $newImg.css('opacity', '1');
                    $currentImg.css('opacity', '0');
                    setTimeout(function() { $currentImg.remove(); }, 1600);
                }, 100);
            };
            nextImg.src = imgUrl;
        }, interval);
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
            container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" title="' + logo.name + '"></div>');
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var r = 0, g = 0, b = 0, cnt = 0;
                    for (var i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] > 50) { r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; cnt++; } }
                    if (cnt > 0 && (0.299 * (r / cnt) + 0.587 * (g / cnt) + 0.114 * (b / cnt)) < 40) {
                        $('#' + imgId + ' img').css({ 'filter': 'brightness(0) invert(1)', 'opacity': '0.95' });
                    }
                } catch (e) { }
            };
            img.src = logo.url;
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        var limit = Math.min(results.length, 30);
        for (var i = 0; i < limit; i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
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
            if (!best.audio) {
                var fA = null;
                if (title.indexOf('7.1') >= 0) fA = '7.1';
                else if (title.indexOf('5.1') >= 0 || title.indexOf('6ch') >= 0 || title.indexOf('ac3') >= 0) fA = '5.1';
                else if (title.indexOf('4.0') >= 0) fA = '4.0';
                else if (title.indexOf('2.0') >= 0 || title.indexOf('2ch') >= 0) fA = '2.0';
                if (fA && (!best.audio || audioOrder.indexOf(fA) > audioOrder.indexOf(best.audio))) best.audio = fA;
            }
        }
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function createBadgeImg(type, index) {
        var iconPath = svgIcons[type];
        if (!iconPath) return '';
        var delay = (index * 0.08) + 's';
        return '<div class="quality-badge" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false"></div>';
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
            field: { name: 'Слайд-шоу фону', description: 'Автоматична зміна зображень фону' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { 
                name: 'mobile_interface_slideshow_time', 
                type: 'select', 
                values: { '10000': '10 сек', '15000': '15 сек', '20000': '20 сек' }, 
                default: '10000' 
            },
            field: { name: 'Інтервал слайд-шоу', description: 'Час між зміною зображень' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { 
                name: 'mobile_interface_slideshow_quality', 
                type: 'select', 
                values: { 'w300': '300p', 'w780': '780p', 'w1280': '1280p', 'original': 'Оригінал' }, 
                default: 'w780' 
            },
            field: { name: 'Якість слайд-шоу', description: 'Роздільна здатність картинок' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_studios', type: 'trigger', default: true },
            field: { name: 'Логотипи студій', description: 'Показувати іконки Netflix, Disney тощо' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_quality', type: 'trigger', default: true },
            field: { name: 'Значки якості', description: 'Показувати 4K, HDR, UKR' }
        });
    }

    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);

            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $poster = $render.find('.full-start-new__poster');
                var $details = $render.find('.full-start-new__details');
                var $title = $render.find('.full-start-new__title');

                var lang = Lampa.Storage.get('language') || 'uk';
                var type = movie.name ? 'tv' : 'movie';
                var apiKey = Lampa.TMDB.key();
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey,
                    success: function(res) {
                        var bestLogo = res.logos.filter(function(l) { return l.iso_639_1 === lang; })[0] || 
                                       res.logos.filter(function(l) { return l.iso_639_1 === 'en'; })[0] || 
                                       res.logos[0];
                        
                        if (bestLogo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w300' + bestLogo.file_path.replace('.svg', '.png'));
                            $title.html('<img src="' + imgUrl + '" style="max-height: 110px; object-fit: contain; position: relative; z-index: 10;">');
                        }
                        if (res.backdrops && res.backdrops.length > 1) {
                            startSlideshow($poster, res.backdrops.slice(0, 15));
                        }
                    }
                });

                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                            if (response && response.Results) {
                                var best = getBest(response.Results);
                                var badgeList = [];
                                if (best.resolution) badgeList.push(best.resolution);
                                if (best.dolbyVision) badgeList.push('Dolby Vision');
                                if (best.hdr && !best.dolbyVision) badgeList.push('HDR'); 
                                if (best.audio) badgeList.push(best.audio);
                                if (best.dub) badgeList.push('DUB');
                                if (best.ukr) badgeList.push('UKR');
                                var htmlBadges = badgeList.map(function(type, i) { return createBadgeImg(type, i); });
                                container.append(htmlBadges.join(''));
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

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
                
