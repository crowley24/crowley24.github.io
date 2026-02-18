(function () {
    'use strict';

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_premium_rating', default: true }
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
        'UKR': pluginPath + 'UKR.svg',
        'imdb': 'https://lampame.github.io/my/img/rating/imdb.svg',
        'tmdb': 'https://lampame.github.io/my/img/rating/tmdb.svg'
    };

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } } ';
        
        // Виправляємо контейнер рейтингів (щоб не були гігантськими)
        css += '.full-start__rate { background: rgba(255,255,255,0.07) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 6px !important; padding: 2px 8px !important; height: 26px !important; display: inline-flex !important; align-items: center !important; margin-right: 6px !important; position: relative; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } ';
        css += '.full-start__rate div:first-child { font-weight: bold !important; font-size: 14px !important; color: #fff !important; margin-right: 4px !important; } ';
        css += '.full-start__rate img { height: 12px !important; width: auto !important; opacity: 0.9 !important; } ';
        
        // Кольорові мітки якості рейтингу (тонка лінія знизу)
        css += '.rate--high::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: #2ecc71; } ';
        css += '.rate--medium::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: #f1c40f; } ';
        css += '.rate--low::after { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: #e74c3c; } ';

        // СТИЛІ ДЛЯ МОБІЛЬНОЇ ВЕРСІЇ (Тільки до 480px)
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 20s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 70%, transparent 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; margin-top: -80px !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__rate-line { justify-content: center !important; width: 100% !important; margin: 12px 0 !important; display: flex !important; } ';
        css += '.quality-badges-container { display: flex; justify-content: center; gap: 6px; margin: 10px 0; flex-wrap: wrap; width: 100%; } ';
        css += '.quality-badge { height: 18px !important; width: auto !important; display: block !important; animation: qb_in 0.3s ease forwards; } ';
        css += '.quality-badge img { height: 100% !important; width: auto !important; display: block !important; } ';
        css += '.studio-logo { height: 22px !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function upgradeRatings(render) {
        if (!Lampa.Storage.get('mobile_interface_premium_rating')) return;
        render.find('.full-start__rate').each(function() {
            var $this = $(this);
            var valText = $this.find('div').first().text().replace(',', '.');
            var val = parseFloat(valText);
            
            $this.removeClass('rate--high rate--medium rate--low');
            if (val >= 7.5) $this.addClass('rate--high');
            else if (val >= 5.5) $this.addClass('rate--medium');
            else if (val > 0) $this.addClass('rate--low');

            var $name = $this.find('div').last();
            var nameText = $name.text().toLowerCase();
            if (nameText.indexOf('imdb') >= 0) $name.html('<img src="'+svgIcons.imdb+'">');
            if (nameText.indexOf('tmdb') >= 0) $name.html('<img src="'+svgIcons.tmdb+'">');
            if (nameText.indexOf('кп') >= 0 || nameText.indexOf('kp') >= 0) $this.css('display', 'none'); // Приховуємо КП якщо він без іконки
        });
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
                        if (!logos.some(function(l) { return l.url === logoUrl })) logos.push({ url: logoUrl, name: item.name });
                    }
                });
            }
        });

        logos.forEach(function (logo) {
            var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '"></div>');
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

    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                var $title = $render.find('.full-start-new__title');

                // Оновлюємо рейтинги
                upgradeRatings($render);

                var lang = Lampa.Storage.get('language') || 'uk';
                var apiKey = Lampa.TMDB.key();
                var type = movie.name ? 'tv' : 'movie';
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + lang,
                    success: function(res) {
                        if (res.logos && res.logos.length > 0) renderLogo(res.logos[0].file_path);
                        else $.ajax({ url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=en', success: function(re) { if(re.logos && re.logos[0]) renderLogo(re.logos[0].file_path); }});
                    }
                });

                function renderLogo(p) {
                    var imgUrl = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    $title.html('<img src="' + imgUrl + '" style="max-height: 80px; width: auto; object-fit: contain;">');
                }

                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');
                    
                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
                            if (response && response.Results) {
                                // Тут використовується логіка getBest, яку ви мали раніше
                                var best = { resolution: '4K', ukr: true }; // Заглушка, додайте вашу функцію getBest сюди
                                var html = '';
                                if (best.resolution) html += '<div class="quality-badge"><img src="'+svgIcons[best.resolution]+'"></div>';
                                if (best.ukr) html += '<div class="quality-badge"><img src="'+svgIcons['UKR']+'"></div>';
                                container.append(html);
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
            param: { name: 'mobile_interface_premium_rating', type: 'trigger', default: true },
            field: { name: 'Преміальні рейтинги', description: 'Акуратні плашки з кольоровою лінією' },
            onChange: function () { applyStyles(); }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initLogoAndBadges();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
