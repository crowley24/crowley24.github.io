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
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 0 10px !important; } ';
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; margin-bottom: 5px; } ';
        css += '.full-start-new__title img { max-height: 90px; max-width: 85%; object-fit: contain; filter: drop-shadow(0 0 12px rgba(0,0,0,0.8)); } ';
        
        /* СТИЛЬ ДЛЯ ЄДИНОГО РЯДКА */
        css += '.full-start-new__details { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; justify-content: center !important; align-items: center !important; gap: 6px !important; margin: 12px 0 !important; font-family: sans-serif !important; border: none !important; background: none !important; width: 100% !important; } ';
        
        /* Бейджі (Вік, Статус) */
        css += '.custom-badge { display: inline-block !important; border: 1px solid rgba(255,255,255,0.4) !important; padding: 1px 5px !important; border-radius: 3px !important; font-size: 10px !important; font-weight: 700 !important; color: #fff !important; text-transform: uppercase !important; white-space: nowrap !important; } ';
        
        /* Мета-інфо (Час та Жанри) */
        css += '.custom-meta { color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; } ';
        css += '.custom-meta:before { content: "•"; margin: 0 6px; opacity: 0.5; } ';

        /* Примусове приховування дублів Lampa */
        css += '.full-start-new__details ~ div, .full-start-new__details ~ span { display: none !important; } ';

        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 10px !important; width: 100% !important; margin-top: 15px !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; width: 52px !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        css += '.full-start-new .full-start__button svg { width: 22px !important; height: 22px !important; fill: #fff !important; margin-bottom: 5px !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 8px !important; opacity: 0.6 !important; text-transform: uppercase !important; } ';

        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: 18px 0; width: 100%; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 7px; } ';
        css += '.studio-item { height: 2.8em; padding: 4px 10px; border-radius: 10px; display: flex; align-items: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); ';
        }
        css += '} ';
        css += '.studio-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Завантаження Лого
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w400' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                    }
                });

                // ПОВНА ПЕРЕЗБІРКА РЯДКА
                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    // Витягуємо дані з об'єкта movie безпосередньо, щоб уникнути помилок парсингу тексту
                    var age = movie.adult ? '18+' : (movie.vote_average > 7 ? '12+' : '6+'); // Спрощено, бо TMDB не завжди віддає age_rating
                    var status = movie.status === 'Released' || movie.status === 'Випущено' ? 'Випущено' : (movie.status || '');
                    var time = movie.runtime ? (Math.floor(movie.runtime / 60) + ":" + (movie.runtime % 60).toString().padStart(2, '0')) : '';
                    var genres = (movie.genres || []).slice(0, 3).map(g => g.name).join(' | ');

                    // Очищуємо оригінальний блок і вставляємо свою структуру в ОДИН рядок
                    $details.empty();
                    
                    var html = '';
                    if(age) html += '<div class="custom-badge">' + age + '</div>';
                    if(status) html += '<div class="custom-badge">' + status + '</div>';
                    
                    if(time || genres) {
                        html += '<div class="custom-meta">';
                        if(time) html += time + ' ';
                        if(genres) html += ' • ' + genres;
                        html += '</div>';
                    }
                    
                    $details.append(html);

                    // Видаляємо всі наступні елементи до блоку кнопок, щоб прибрати сміття (2.6K тощо)
                    $details.nextUntil('.full-start-new__buttons').remove();

                    // Рендер студій
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($infoBlock);
                    
                    var container = $infoBlock.find('.studio-row');
                    var logos = [];
                    (movie.production_companies || []).forEach(function(item) {
                        if (item.logo_path) logos.push(Lampa.Api.img(item.logo_path, 'w200'));
                    });
                    
                    logos.slice(0, 3).forEach(function(url) {
                        var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
                        container.append('<div class="studio-item" id="' + imgId + '"><img src="' + url + '"></div>');
                        // Інверсія для темних логотипів
                        var img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = function() {
                            try {
                                var canvas = document.createElement('canvas');
                                var ctx = canvas.getContext('2d');
                                canvas.width = 10; canvas.height = 10;
                                ctx.drawImage(this, 0, 0, 10, 10);
                                var p = ctx.getImageData(0,0,10,10).data;
                                var b = 0, c = 0;
                                for(var i=0; i<p.length; i+=4) { if(p[i+3]>50) { b += (p[i]+p[i+1]+p[i+2])/3; c++; } }
                                if(c > 0 && (b/c) < 50) $('#'+imgId+' img').css('filter', 'brightness(0) invert(1)');
                            } catch(e){}
                        };
                        img.src = url;
                    });
                }
            }
        });
    }

    function start() {
        applyStyles();
        initPlugin();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
