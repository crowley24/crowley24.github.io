(function () {
    'use strict';

    // 1. Налаштування
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

    // 2. Стилі (Мета-дані + Дизайн)
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 62vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -125px !important; z-index: 2 !important; align-items: center !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 85px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 100px; object-fit: contain; filter: drop-shadow(0 0 8px rgba(0,0,0,0.6)); } ';
        
        // Стильна мета-інформація
        css += '.custom-meta-row { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9em; color: rgba(255,255,255,0.85); margin-bottom: 10px; font-weight: 400; } ';
        css += '.custom-meta-item.rating { background: #f5c518; color: #000; padding: 1px 5px; border-radius: 3px; font-weight: 900; font-size: 0.85em; } ';
        css += '.meta-sep { opacity: 0.4; font-size: 0.8em; } ';

        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.8 !important; font-size: 1.05em !important; margin: 5px 0 15px !important; color: #fff !important; text-align: center !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8); } ';

        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 15px; margin: 15px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px; width: 100%; } ';
        
        css += '.studio-item { height: 2.2em; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        css += '.quality-item { height: 1.25em; opacity: 0; animation: qb_in 0.4s ease forwards; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '.quality-item img { filter: brightness(0) invert(1); } ';
        
        // Ховаємо старі елементи
        css += '.full-start-new__details > span, .full-start-new__details > div:not(.plugin-info-block) { display: none !important; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // 3. Аналіз якості
    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        for (var i = 0; i < Math.min(results.length, 30); i++) {
            var title = (results[i].Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('ua') >= 0 || title.indexOf('укр') >= 0) best.ukr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
            var foundRes = title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 ? '4K' : title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0 ? '2K' : title.indexOf('1080') >= 0 ? 'FULL HD' : title.indexOf('720') >= 0 ? 'HD' : null;
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
        }
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    // 4. Слайд-шоу
    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_slideshow_quality') + backdrops[index].file_path);
            var $current = $poster.find('img').first();
            var next = new Image();
            next.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity:0; position:absolute; width:100%; height:100%; object-fit:cover;">');
                $poster.append($next);
                setTimeout(function(){ $next.css('opacity', 1); $current.css('opacity', 0); setTimeout(function(){ $current.remove(); }, 1500); }, 100);
            };
            next.src = imgUrl;
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time')));
    }

    // 5. Логіка ініціалізації
    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');

                // Побудова Мета-інформації
                var year = movie.release_date ? movie.release_date.split('-')[0] : (movie.first_air_date ? movie.first_air_date.split('-')[0] : '');
                var country = movie.production_countries && movie.production_countries.length ? movie.production_countries[0].name : '';
                var time = movie.runtime ? movie.runtime + ' хв' : (movie.episode_run_time ? movie.episode_run_time[0] + ' хв' : '');
                
                var metaHtml = '<div class="custom-meta-row">';
                if (movie.vote_average > 0) metaHtml += '<span class="custom-meta-item rating">' + movie.vote_average.toFixed(1) + '</span><span class="meta-sep">•</span>';
                if (year) metaHtml += '<span class="custom-meta-item">' + year + '</span>';
                if (country) metaHtml += '<span class="meta-sep">•</span><span class="custom-meta-item">' + country + '</span>';
                if (time) metaHtml += '<span class="meta-sep">•</span><span class="custom-meta-item">' + time + '</span>';
                metaHtml += '</div>';

                $details.find('.custom-meta-row').remove();
                $details.prepend(metaHtml);

                // Завантаження Лого та Слайд-шоу
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');
                        }
                        if (res.backdrops.length > 1) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 15));
                    }
                });

                // Блок іконок
                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.append($info);

                    if (Lampa.Storage.get('mobile_interface_studios')) {
                        var studios = (movie.networks || []).concat(movie.production_companies || []);
                        var added = [];
                        studios.forEach(s => {
                            if (s.logo_path && added.indexOf(s.logo_path) === -1) {
                                added.push(s.logo_path);
                                var logoUrl = Lampa.Api.img(s.logo_path, 'w200');
                                var $s = $('<div class="studio-item"><img src="' + logoUrl + '" crossOrigin="Anonymous"></div>');
                                $info.find('.studio-row').append($s);
                                var sImg = $s.find('img')[0];
                                sImg.onload = function() {
                                    var canv = document.createElement('canvas');
                                    var cx = canv.getContext('2d');
                                    cx.drawImage(sImg, 0, 0, 1, 1);
                                    if (cx.getImageData(0,0,1,1).data[0] < 45) $(sImg).css('filter', 'brightness(0) invert(1)');
                                };
                            }
                        });
                    }

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie }, function(res) {
                            if (res && res.Results) {
                                var b = getBest(res.Results);
                                var qList = [];
                                if (b.resolution) qList.push(b.resolution);
                                if (b.dolbyVision) qList.push('Dolby Vision'); else if (b.hdr) qList.push('HDR');
                                if (b.dub) qList.push('DUB'); if (b.ukr) qList.push('UKR');
                                qList.forEach((t, i) => {
                                    if (svgIcons[t]) $info.find('.quality-row').append('<div class="quality-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[t]+'"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    // 6. Налаштування
    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація постера', description: 'Ефект наближення фону' }
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
            field: { name: 'Інтервал слайд-шоу' }
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

    applyStyles();
    addSettings();
    init();
    setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);

})();
