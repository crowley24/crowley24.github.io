(function () {
    'use strict';

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' }, 
        { id: 'mobile_interface_slideshow_quality', default: 'w780' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') Lampa.Storage.set(opt.id, opt.default);
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
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } ';
        css += '@media screen and (max-width: 480px) { ';
        css += '.full-start-new__poster { height: 55vh !important; pointer-events: none !important; background: #000; } ';
        css += '.full-start-new__poster img { transition: opacity 1.2s ease-in-out !important; ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%) !important; } ';
        
        css += '.full-start-new__right { margin-top: -100px !important; z-index: 2 !important; align-items: center !important; background: none !important; } ';
        css += '.full-start-new__title img { max-height: 90px !important; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); } ';
        
        // Стиль Tagline (напис під лого)
        css += '.full-start-new__tagline { font-style: italic; opacity: 0.9; font-size: 1em; margin: 10px 0 15px; text-align: center; color: #fff; text-shadow: 1px 1px 3px rgba(0,0,0,0.8); } ';

        // Контейнери для іконок
        css += '.plugin-icons-wrapper { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; margin: 15px 0; } ';
        css += '.studio-logos-row, .quality-badges-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px; } ';
        
        // Іконки студій
        css += '.studio-logo-item { height: 2.2em; animation: qb_in 0.5s ease forwards; } ';
        css += '.studio-logo-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        // Значки якості
        css += '.quality-badge-item { height: 1.2em; animation: qb_in 0.5s ease forwards; } ';
        css += '.quality-badge-item img { height: 100%; width: auto; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780') + backdrops[index].file_path);
            var $old = $poster.find('img').first();
            var $new = $('<img src="' + imgUrl + '" style="opacity: 0; position: absolute; z-index: -1; width:100%; height:100%; object-fit:cover;">');
            $poster.append($new);
            setTimeout(function() { $new.css('opacity', '1'); $old.css('opacity', '0'); setTimeout(function() { $old.remove(); }, 1200); }, 100);
        }, interval);
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');
                
                // Отримуємо зображення
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Логотип назви
                        var logo = res.logos.filter(l => l.iso_639_1 === (Lampa.Storage.get('language') || 'uk'))[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) $render.find('.full-start-new__title').html('<img src="' + Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png')) + '">');
                        // Слайд-шоу
                        if (res.backdrops.length > 1) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 12));
                    }
                });

                // Виводимо іконки
                if ($details.length) {
                    $('.plugin-icons-wrapper').remove();
                    var $wrapper = $('<div class="plugin-icons-wrapper"><div class="studio-logos-row"></div><div class="quality-badges-row"></div></div>');
                    $details.after($wrapper);

                    // Студії
                    if (Lampa.Storage.get('mobile_interface_studios')) {
                        var studios = (movie.networks || []).concat(movie.production_companies || []);
                        var added = [];
                        studios.forEach(s => {
                            if (s.logo_path && added.indexOf(s.logo_path) === -1) {
                                added.push(s.logo_path);
                                var $img = $('<div class="studio-logo-item"><img src="' + Lampa.Api.img(s.logo_path, 'w200') + '"></div>');
                                $wrapper.find('.studio-logos-row').append($img);
                                // Інверсія темних лого
                                var tempImg = new Image();
                                tempImg.crossOrigin = "Anonymous";
                                tempImg.onload = function() {
                                    var canvas = document.createElement('canvas');
                                    var ctx = canvas.getContext('2d');
                                    canvas.width = 1; canvas.height = 1;
                                    ctx.drawImage(tempImg, 0, 0, 1, 1);
                                    if (ctx.getImageData(0,0,1,1).data[0] < 40) $img.find('img').css('filter', 'brightness(0) invert(1)');
                                };
                                tempImg.src = Lampa.Api.img(s.logo_path, 'w200');
                            }
                        });
                    }

                    // Якість
                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie }, function(res) {
                            if (res && res.Results) {
                                // Тут ваша логіка getBest (скорочено для прикладу)
                                ['4K', 'HDR', 'UKR'].forEach((type, i) => { 
                                    $wrapper.find('.quality-badges-row').append('<div class="quality-badge-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[type]+'"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    applyStyles();
    init();
    // Налаштування (залишаються як у вас)
})();
                                          
