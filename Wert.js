(function () {
    'use strict';

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
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%) !important; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; } ';
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.8em; margin: 12px 0; flex-wrap: wrap; width: 100%; } ';
        css += '.quality-badge { height: 1.3em; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        
        // Логіка адаптивності: якщо додано клас .is-dark-bg, інвертуємо логотипи
        css += '.studio-logo { height: 1.8em !important; } ';
        css += '.is-dark-bg .studio-logo img { filter: brightness(0) invert(1) !important; } ';
        css += '.studio-logo img { height: 100%; transition: filter 0.3s ease; } ';
        
        css += '.quality-badge img { height: 100%; width: auto; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // Функція аналізу фону постера
    function analyzeBackground(imgElement, container) {
        var img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = 10; canvas.height = 10;
            // Малюємо нижню частину постера, де зазвичай знаходяться лого
            ctx.drawImage(img, 0, img.height * 0.7, img.width, img.height * 0.3, 0, 0, 10, 10);
            try {
                var data = ctx.getImageData(0, 0, 10, 10).data;
                var r = 0, g = 0, b = 0;
                for (var i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
                var avg = (r + g + b) / (data.length / 4 * 3);
                if (avg < 100) container.addClass('is-dark-bg'); // Якщо фон темний, інвертуємо
                else container.removeClass('is-dark-bg');
            } catch(e) { 
                // Якщо CORS заблокував аналіз, за замовчуванням вважаємо фон темним (бо в Lampa це 90% випадків)
                container.addClass('is-dark-bg'); 
            }
        };
        img.src = imgElement.attr('src');
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

        logos.forEach(function (logo, index) {
            var delay = (index * 0.05) + 's';
            container.append('<div class="quality-badge studio-logo" style="animation-delay: ' + delay + '"><img src="' + logo.url + '" title="' + logo.name + '"></div>');
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        var limit = Math.min(results.length, 20);
        for (var i = 0; i < limit; i++) {
            var item = results[i], title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
            var fR = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) fR = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) fR = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0) fR = 'FULL HD';
            if (fR && (!best.resolution || resOrder.indexOf(fR) > resOrder.indexOf(best.resolution))) best.resolution = fR;
            if (item.ffprobe) {
                item.ffprobe.forEach(function(s) {
                    if (s.codec_type === 'video') {
                        if (JSON.stringify(s.side_data_list || {}).indexOf('Vision') >= 0) best.dolbyVision = true;
                        if (s.color_transfer === 'smpte2084') best.hdr = true;
                    }
                    if (s.codec_type === 'audio' && s.channels) {
                        var aud = (s.channels >= 6) ? '5.1' : '2.0';
                        if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
                    }
                });
            }
            if (title.indexOf('vision') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (!best.audio && (title.indexOf('5.1') >= 0 || title.indexOf('ac3') >= 0)) best.audio = '5.1';
        }
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function createBadgeImg(type, index) {
        var delay = (index * 0.08) + 's';
        return '<div class="quality-badge" style="animation-delay: ' + delay + '"><img src="' + svgIcons[type] + '"></div>';
    }

    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $title = $render.find('.full-start-new__title');
                var $poster = $render.find('.full-start-new__poster img');

                // Аналізуємо фон під логотипами
                if ($poster.length) analyzeBackground($poster, $render.find('.full-start-new__right'));

                var apiKey = Lampa.TMDB.key();
                var lang = Lampa.Storage.get('language') || 'uk';
                var type = movie.name ? 'tv' : 'movie';
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + lang,
                    success: function(res) {
                        if (res.logos && res.logos.length > 0) render(res.logos[0].file_path);
                        else $.ajax({ url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=en', success: function(re) { if(re.logos && re.logos[0]) render(re.logos[0].file_path); }});
                    }
                });

                function render(p) {
                    $title.html('<img src="' + Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png')) + '" style="max-height: 120px; object-fit: contain;">');
                }

                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    renderStudioLogos(container, movie);

                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                        if (response && response.Results) {
                            var best = getBest(response.Results), badges = [], cur = container.find('.quality-badge').length;
                            if (best.ukr) badges.push(createBadgeImg('UKR', cur + badges.length));
                            if (best.dub) badges.push(createBadgeImg('DUB', cur + badges.length));
                            if (best.resolution) badges.push(createBadgeImg(best.resolution, cur + badges.length));
                            if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', cur + badges.length));
                            if (best.hdr) badges.push(createBadgeImg('HDR', cur + badges.length));
                            if (best.audio) badges.push(createBadgeImg(best.audio, cur + badges.length));
                            container.append(badges.join(''));
                        }
                    });
                }
            }
        });
    }

    function start() {
        applyStyles();
        initLogoAndBadges();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
