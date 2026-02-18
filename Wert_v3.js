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

    // 2. Стилі (Оновлено для преміальних рейтингів)
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
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; touch-action: none !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important; ' : 'animation: none !important; ');
        css += 'transform-origin: center center !important; ';
        css += 'mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; ';
        css += '-webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__img { border-radius: 0 !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important; -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important; } ';
        css += '.full-start-new__right { background: none !important; border: none !important; box-shadow: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new__right::before, .full-start-new__right::after { content: unset !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; margin-bottom: 10px; } ';
        css += '.full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline { justify-content: center !important; text-align: center !important; display: flex !important; } ';
        css += '.quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 12px 0; flex-wrap: wrap; width: 100%; min-height: 2em; } ';
        css += '.quality-badge { height: 1.3em; opacity: 0; animation: qb_in 0.4s ease forwards; display: flex; align-items: center; } ';
        css += '.studio-logo { height: 1.8em !important; margin-right: 4px; } ';
        css += '.quality-badge img { height: 100%; width: auto; display: block; } ';
        
        // НОВІ ПРЕМІУМ СТИЛІ РЕЙТИНГІВ
        css += '.premium-ratings { display: flex; gap: 8px; justify-content: center; margin-bottom: 10px; width: 100%; animation: qb_in 0.6s ease; } ';
        css += '.rating-pill { display: flex; align-items: center; padding: 4px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.15); font-weight: 700; font-size: 13px; color: #fff; } ';
        css += '.rating-pill.imdb { border-color: rgba(245, 197, 24, 0.5); } ';
        css += '.rating-pill.imdb span { color: #f5c518; } ';
        css += '.rating-pill.tmdb { border-color: rgba(1, 210, 119, 0.5); } ';
        css += '.rating-pill.tmdb span { color: #01d277; } ';
        css += '.rating-pill.kp { border-color: rgba(255, 102, 0, 0.5); } ';
        css += '.rating-pill.kp span { color: #ff6600; } ';
        css += '.rating-pill img { height: 12px; margin-right: 6px; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // Рендер преміальних рейтингів
    function renderPremiumRatings(container, movie) {
        $('.premium-ratings').remove();
        var ratingsHtml = $('<div class="premium-ratings"></div>');
        
        var r = {
            imdb: movie.vote_average_imdb || (movie.source == 'tmdb' ? '' : movie.imdb_rating),
            tmdb: movie.vote_average,
            kp: movie.vote_average_kp || movie.kp_rating
        };

        if (r.imdb && r.imdb > 0) {
            ratingsHtml.append('<div class="rating-pill imdb"><img src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg"><span>' + parseFloat(r.imdb).toFixed(1) + '</span></div>');
        }
        if (r.tmdb && r.tmdb > 0) {
            ratingsHtml.append('<div class="rating-pill tmdb"><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg"><span>' + Math.round(r.tmdb * 10) + '%</span></div>');
        }
        if (r.kp && r.kp > 0) {
            ratingsHtml.append('<div class="rating-pill kp"><span>КP: ' + parseFloat(r.kp).toFixed(1) + '</span></div>');
        }

        if (ratingsHtml.children().length > 0) {
            container.append(ratingsHtml);
        }
    }

    // 3. Рендер логотипів студій (без змін)
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

    // 4. Аналіз якості з сортуванням (без змін)
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

    // 5. Реєстрація налаштувань
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

    // 6. Логіка завантаження Лого фільму, Рейтингів та Якості
    function initLogoAndBadges() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                var $title = $render.find('.full-start-new__title');
                var $right = $render.find('.full-start-new__right');

                var lang = Lampa.Storage.get('language') || 'uk';
                var type = movie.name ? 'tv' : 'movie';
                var apiKey = Lampa.TMDB.key();
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=' + lang,
                    success: function(res) {
                        if (res.logos && res.logos.length > 0) renderLogo(res.logos[0].file_path);
                        else $.ajax({ url: 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '/images?api_key=' + apiKey + '&language=en', success: function(re) { if(re.logos && re.logos[0]) renderLogo(re.logos[0].file_path); }});
                    }
                });

                function renderLogo(p) {
                    var imgUrl = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    $title.html('<img src="' + imgUrl + '" style="max-height: 110px; object-fit: contain; position: relative; z-index: 10;">');
                    // Додаємо рейтинги одразу під логотипом
                    renderPremiumRatings($title, movie);
                }

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

                                var htmlBadges = badgeList.map(function(type, i) {
                                    return createBadgeImg(type, i);
                                });
                                
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
