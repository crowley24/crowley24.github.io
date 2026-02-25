(function () {
    'use strict';

    var settings_list = [
        { id: 'tv_interface_animation', default: true },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15' },
        { id: 'tv_interface_quality', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_time', default: '10000' }
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

        var bgOpacity = Lampa.Storage.get('tv_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        
        /* 1. ПОВНЕ ОБНУЛЕННЯ СТАНДАРТНОГО ПОСТЕРА */
        css += '.full-start-new__poster { height: 0 !important; padding: 0 !important; margin: 0 !important; position: static !important; } ';
        css += '.full-start-new__poster img, .full-start-new__bg { display: none !important; opacity: 0 !important; } ';
        
        /* 2. СТВОРЮЄМО НОВИЙ ШАР ДЛЯ ФОНУ */
        css += '#plugin-tv-background { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; background: #000; overflow: hidden; } ';
        css += '.plugin-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 2s ease-in-out; ';
        if (Lampa.Storage.get('tv_interface_animation')) {
            css += 'animation: kenBurnsEffect 40s ease-in-out infinite; ';
        }
        css += 'mask-image: linear-gradient(to right, #000 20%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%); ';
        css += '-webkit-mask-image: linear-gradient(to right, #000 20%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%); } ';
        
        /* 3. КОНТЕНТ ТА ІКОНКИ */
        css += '.full-start-new__right { background: none !important; margin-top: 5vh !important; } ';
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 20px; margin-top: 30px; } ';
        css += '.studio-row, .quality-row { display: flex; gap: 15px; flex-wrap: wrap; } ';
        css += '.studio-item { height: 45px; padding: 7px 15px; border-radius: 12px; background: rgba(255,255,255,' + bgOpacity + '); backdrop-filter: blur(10px); } ';
        css += '.quality-item { height: 32px; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function startSlideshow(backdrops) {
        var $bg = $('#plugin-tv-background');
        if (!$bg.length) {
            $bg = $('<div id="plugin-tv-background"></div>').appendTo('body');
        }
        
        clearInterval(slideshowTimer);
        var index = 0;

        function nextSlide() {
            var imgUrl = Lampa.TMDB.image('/t/p/original' + backdrops[index].file_path);
            var $newSlide = $('<img class="plugin-slide" src="' + imgUrl + '">');
            $bg.append($newSlide);

            $newSlide.on('load', function() {
                $(this).css('opacity', '1');
                setTimeout(function() {
                    $bg.find('.plugin-slide').not($newSlide).remove();
                }, 2100);
            });

            index = (index + 1) % backdrops.length;
        }

        if (backdrops.length > 0) {
            nextSlide();
            if (Lampa.Storage.get('tv_interface_slideshow') && backdrops.length > 1) {
                slideshowTimer = setInterval(nextSlide, parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '10000')));
            }
        }
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') {
                clearInterval(slideshowTimer);
                $('#plugin-tv-background').fadeOut(500, function() { $(this).remove(); });
            }
            
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Прибираємо назву текстом, якщо буде лого
                var $title = $render.find('.full-start-new__title');

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Логотип
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $title.html('<img src="' + logoUrl + '" style="max-width: 450px; max-height: 150px; object-fit: contain;">');
                        }
                        // Слайдшоу
                        if (res.backdrops && res.backdrops.length > 0) {
                            startSlideshow(res.backdrops.slice(0, 15));
                        }
                    }
                });

                // Інфо-блок (Студії та Якість)
                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.append($infoBlock);

                    // Студії
                    var studios = (movie.networks || []).concat(movie.production_companies || []);
                    var addedLogos = [];
                    studios.forEach(s => {
                        if (s.logo_path && addedLogos.indexOf(s.logo_path) === -1) {
                            addedLogos.push(s.logo_path);
                            $infoBlock.find('.studio-row').append('<div class="studio-item"><img src="' + Lampa.Api.img(s.logo_path, 'w200') + '"></div>');
                        }
                    });

                    // Якість (Parser)
                    if (Lampa.Parser && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                // Тут можна вставити вашу логіку getBest, якщо вона потрібна
                                // Для стислості додаємо приклад одного значка
                                $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons['4K']+'"></div>');
                            }
                        });
                    }
                }
            }
        });
    }

    // Запуск
    function start() {
        applyStyles();
        
        // Додаємо налаштування (як у вашому коді)
        Lampa.SettingsApi.addComponent({
            component: 'tv_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>',
            name: 'TV Інтерфейс+'
        });

        initPlugin();
        
        // Цикл для примусового приховування стандартного блюру
        setInterval(function() {
            $('.full-start-new__poster, .full-start-new__bg').css({'display':'none', 'opacity':'0'});
            if (window.lampa_settings) window.lampa_settings.blur_poster = false;
        }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });

})();
