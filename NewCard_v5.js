(function () {
    'use strict';

    // 1. Ініціалізація та реєстрація налаштувань
    var settings_list = [
        { id: 'tv_interface_animation', default: true, name: 'Анімація (Зум)', desc: 'Ефект Ken Burns для фону' },
        { id: 'tv_interface_slideshow', default: true, name: 'Слайд-шоу', desc: 'Автозміна кадрів фільму' },
        { id: 'tv_interface_studios', default: true, name: 'Логотипи студій', desc: 'Показувати компанії виробники' },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15', name: 'Прозорість фону студій', desc: 'Насиченість підкладки логотипів' },
        { id: 'tv_interface_slideshow_time', default: '10000', name: 'Час слайду', desc: 'Тривалість відображення одного кадру (мс)' }
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

    // 2. Стилі (виправлено зум та контейнер)
    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var bgOpacity = Lampa.Storage.get('tv_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '@keyframes kenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } } ';
        
        /* Розблокування контейнера */
        css += '.full-start-new__poster { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: -1 !important; overflow: hidden !important; display: block !important; margin: 0 !important; } ';
        css += '.full-start-new__poster img:not(.plugin-slide), .full-start-new__bg { display: none !important; } ';
        
        /* Слайди та Анімація зуму */
        css += '.plugin-slide { position: absolute !important; top: 0; left: 0; width: 100% !important; height: 100% !important; object-fit: cover !important; opacity: 0; transition: opacity 2s ease-in-out !important; } ';
        if (Lampa.Storage.get('tv_interface_animation')) {
            css += '.plugin-slide { animation: kenBurns 40s ease-in-out infinite !important; } ';
        }
        
        /* Маска для тексту */
        css += '.plugin-slide { -webkit-mask-image: linear-gradient(to right, #000 20%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%) !important; } ';

        /* Інтерфейс */
        css += '.full-start-new__right { background: none !important; z-index: 10 !important; } ';
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 15px; margin-top: 25px; } ';
        css += '.studio-row, .quality-row { display: flex; gap: 12px; flex-wrap: wrap; } ';
        css += '.studio-item { height: 42px; padding: 6px 14px; border-radius: 10px; background: rgba(255,255,255,' + bgOpacity + '); backdrop-filter: blur(10px); display: flex; align-items: center; } ';
        css += '.studio-item img { height: 100%; width: auto; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // 3. Логіка слайд-шоу
    function startSlideshow($container, backdrops) {
        if (!$container.length) return;
        $container.empty();
        clearInterval(slideshowTimer);
        
        var index = 0;
        function nextSlide() {
            if (!backdrops.length) return;
            var imgUrl = Lampa.TMDB.image('/t/p/original' + backdrops[index].file_path);
            var $newSlide = $('<img class="plugin-slide" src="' + imgUrl + '">');
            
            $container.append($newSlide);
            $newSlide.on('load', function() {
                $(this).css('opacity', '1');
                setTimeout(function() {
                    $container.find('.plugin-slide').not($newSlide).remove();
                }, 2200);
            });
            index = (index + 1) % backdrops.length;
        }

        nextSlide();
        if (Lampa.Storage.get('tv_interface_slideshow')) {
            slideshowTimer = setInterval(nextSlide, parseInt(Lampa.Storage.get('tv_interface_slideshow_time')));
        }
    }

    // 4. Ініціалізація плагіна
    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $poster = $render.find('.full-start-new__poster');

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Логотип замість тексту
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + logoUrl + '" style="max-width: 450px; max-height: 140px; object-fit: contain;">');
                        }
                        // Слайдшоу
                        if (res.backdrops && res.backdrops.length > 0) {
                            startSlideshow($poster, res.backdrops.slice(0, 15));
                        }
                    }
                });
            }
        });
    }

    // 5. Функція додавання параметрів у меню (щоб не було пусто)
    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'tv_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>',
            name: 'TV Інтерфейс+'
        });

        settings_list.forEach(function(opt) {
            Lampa.SettingsApi.addParam({
                component: 'tv_interface',
                param: { name: opt.id, type: (opt.id.indexOf('opacity') > -1 ? 'select' : 'trigger'), default: opt.default },
                field: { name: opt.name, description: opt.desc },
                values: opt.id.indexOf('opacity') > -1 ? { '0': 'Вимкнено', '0.15': 'Легка', '0.3': 'Середня' } : {},
                onChange: function() { applyStyles(); }
            });
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        setInterval(function() { if (window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
