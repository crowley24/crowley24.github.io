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

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; touch-action: none !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__img { border-radius: 0 !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; border: none !important; box-shadow: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__right::before, .full-start-new__right::after { content: unset !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; } ';
        css += '.full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline { justify-content: center !important; text-align: center !important; display: flex !important; } ';
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 10px 0; flex-wrap: wrap; width: 100%; } ';
        css += '.quality-badge { height: 1.2em; opacity: 0; transform: translateY(5px); animation: qb_in 0.4s ease forwards; display: flex; align-items: center; } ';
        css += '.studio-logo { height: 1.6em !important; margin-right: 2px; } ';
        css += '.quality-badge img { height: 100%; width: auto; display: block; } ';
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

    function getBestQuality(results) {
        var best = { resolution: null, hdr: false, dv: false, ukr: false };
        var limit = results.length > 20 ? 20 : results.length;
        for (var i = 0; i < limit; i++) {
            var t = (results[i].Title || '').toLowerCase();
            if (t.indexOf('ukr') > -1 || t.indexOf('укр') > -1 || t.indexOf('ua') > -1) best.ukr = true;
            if (t.indexOf('4k') > -1 || t.indexOf('2160') > -1) best.resolution = '4K';
            else if (!best.resolution && (t.indexOf('2k') > -1 || t.indexOf('1440') > -1)) best.resolution = '2K';
            else if (!best.resolution && (t.indexOf('1080') > -1 || t.indexOf('fhd') > -1)) best.resolution = 'FULL HD';
            if (t.indexOf('vision') > -1 || t.indexOf('dovi') > -1 || t.indexOf(' dv ') > -1) best.dv = true;
            if (t.indexOf('hdr') > -1) best.hdr = true;
        }
        return best;
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });

        var params = [
            { id: 'mobile_interface_animation', label: 'Анімація постера', desc: 'Ефект наближення фону' },
            { id: 'mobile_interface_studios', label: 'Логотипи студій', desc: 'Показувати іконки Netflix, Disney тощо' },
            { id: 'mobile_interface_quality', label: 'Значки якості', desc: 'Показувати 4K, HDR, UKR (потрібен парсер)' }
        ];

        params.forEach(function (p) {
            Lampa.SettingsApi.addParam({
                component: 'mobile_interface',
                param: { name: p.id, type: 'trigger', default: true },
                field: { name: p.label, description: p.desc },
                onChange: function () { applyStyles(); }
            });
        });
    }

    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                var $title = $render.find('.full-start-new__title');

                // Прямий запит до TMDB API без обгортки (для надійності)
                var lang = Lampa.Storage.get('language') || 'uk';
                var type = movie.name ? 'tv' : 'movie';
                var apiKey = Lampa.TMDB.key();
                var baseUrl = 'https://api.themoviedb.org/3/';

                function getLogo(l) {
                    $.ajax({
                        url: baseUrl + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + l,
                        type: 'GET',
                        success: function(res) {
                            if (res.logos && res.logos.length > 0) {
                                var imgUrl = Lampa.TMDB.image('/t/p/w300' + res.logos[0].file_path.replace('.svg', '.png'));
                                $title.html('<img src="' + imgUrl + '" style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;">');
                            } else if (l !== 'en') {
                                getLogo('en'); // Якщо немає нашої, беремо англійську
                            }
                        }
                    });
                }

                getLogo(lang);

                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                            if (response && response.Results) {
                                var b = getBestQuality(response.Results);
                                var html = '';
                                if (b.ukr) html += '<div class="quality-badge"><img src="' + svgIcons['UKR'] + '"></div>';
                                if (b.resolution) html += '<div class="quality-badge"><img src="' + svgIcons[b.resolution] + '"></div>';
                                if (b.dv) html += '<div class="quality-badge"><img src="' + svgIcons['Dolby Vision'] + '"></div>';
                                else if (b.hdr) html += '<div class="quality-badge"><img src="' + svgIcons['HDR'] + '"></div>';
                                container.append(html);
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
        setInterval(function () {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
