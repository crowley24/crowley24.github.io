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
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg',
        '5.1': pluginPath + '5.1.svg',
        '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg',
        'DUB': pluginPath + 'DUB.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    // 2. Стилі (Додано Пункт 2 та 3: Динаміка та Анімація)
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        // ПУНКТ 3: Покращена анімація Ken Burns
        var css = '@keyframes kenBurns { 0% { transform: scale(1) translate(0,0); } 50% { transform: scale(1.15) translate(-1%, -1%); } 100% { transform: scale(1) translate(0,0); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; touch-action: none !important; pointer-events: none !important; background: #000; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurns 40s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; opacity: 0.7 !important; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; border: none !important; box-shadow: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; } ';
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 12px 0; flex-wrap: wrap; width: 100%; min-height: 2em; } ';
        css += '.quality-badge { height: 1.25em; opacity: 0; animation: qb_in 0.4s ease forwards; display: flex; align-items: center; } ';
        css += '.studio-logo { height: 1.7em !important; margin-right: 4px; } ';
        // ПУНКТ 1: Стиль рейтингу
        css += '.movie-rating-badge { background: #f5c518; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.85em; margin-right: 6px; display: flex; align-items: center; height: 1.4em; box-shadow: 0 2px 4px rgba(0,0,0,0.3); } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // ПУНКТ 2: Функція динамічного фону
    function updateDynamicBackground(imgUrl) {
        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = 1; canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            var p = ctx.getImageData(0, 0, 1, 1).data;
            var rgb = p[0] + ',' + p[1] + ',' + p[2];
            $('.full-start-new__poster').css('background', 'radial-gradient(circle at top, rgba(' + rgb + ', 0.4) 0%, #000 100%)');
        };
        img.src = imgUrl;
    }

    // 3. Рендер логотипів студій (повернено повну логіку аналізу яскравості)
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
                        $('#' + imgId + ' img').css({ 'filter': 'brightness(0) invert(1)', 'opacity': '0.9' });
                    }
                } catch (e) { }
            };
            img.src = logo.url;
        });
    }

    // 4. Глибокий аналіз якості
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
            else if (title.indexOf('1080') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
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
            if (title.indexOf('vision') >= 0 || title.indexOf(' dv ') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (!best.audio) {
                var fA = null;
                if (title.indexOf('7.1') >= 0) fA = '7.1';
                else if (title.indexOf('5.1') >= 0 || title.indexOf('6ch') >= 0) fA = '5.1';
                if (fA && (!best.audio || audioOrder.indexOf(fA) > audioOrder.indexOf(best.audio))) best.audio = fA;
            }
        }
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    // 5. Логіка завантаження
    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                var $title = $render.find('.full-start-new__title');
                var apiKey = Lampa.TMDB.key();

                // Динамічний фон (Пункт 2)
                if (movie.poster_path) updateDynamicBackground(Lampa.TMDB.image('/t/p/w200' + movie.poster_path));

                // Запит логотипу (Згідно інструкції: UKR -> ENG)
                var lang = Lampa.Storage.get('language') || 'uk';
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + lang,
                    success: function(res) {
                        if (res.logos && res.logos.length > 0) renderLogo(res.logos[0].file_path);
                        else $.ajax({ url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + apiKey + '&language=en', success: function(re) { if(re.logos && re.logos[0]) renderLogo(re.logos[0].file_path); }});
                    }
                });

                function renderLogo(p) {
                    $title.html('<img src="' + Lampa.TMDB.image('/t/p/w400' + p.replace('.svg', '.png')) + '" style="max-height: 110px; object-fit: contain; position: relative; z-index: 10;">');
                }

                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    
                    // ПУНКТ 1: Рейтинг перед усіма значками
                    if (movie.vote_average) {
                        container.append('<div class="movie-rating-badge">★ ' + movie.vote_average.toFixed(1) + '</div>');
                    }

                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                            if (response && response.Results) {
                                var best = getBest(response.Results);
                                var badgeList = [];
                                // ПОРЯДОК: 4K -> DV -> HDR -> AUDIO -> DUB -> UKR
                                if (best.resolution) badgeList.push(best.resolution);
                                if (best.dolbyVision) badgeList.push('Dolby Vision');
                                if (best.hdr && !best.dolbyVision) badgeList.push('HDR');
                                if (best.audio) badgeList.push(best.audio);
                                if (best.dub) badgeList.push('DUB');
                                if (best.ukr) badgeList.push('UKR');

                                badgeList.forEach(function(type, i) {
                                    var icon = svgIcons[type];
                                    if (icon) container.append('<div class="quality-badge" style="animation-delay:' + (i * 0.08) + 's"><img src="' + icon + '"></div>');
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
        initLogoAndBadges();
        Lampa.Storage.set('blur_poster', false);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
