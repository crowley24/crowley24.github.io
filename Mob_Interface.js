(function () {
    'use strict';

    /* ================= НАСТРОЙКИ ================= */

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

    /* ================= СТИЛІ ================= */

    function applyStyles() {

        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');

        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';

        var css = '';

        css += '@keyframes kenBurnsEffect {';
        css += '0% { transform: scale(1); }';
        css += '50% { transform: scale(1.1); }';
        css += '100% { transform: scale(1); }';
        css += '}';

        css += '@media screen and (max-width: 480px) {';

        /* Ховаємо стандартні статуси */
        css += '.full-start__status, .full-start-new__status { display:none !important; }';

        /* Права панель */
        css += '.full-start-new__right {';
        css += 'display:flex !important;';
        css += 'flex-direction:column !important;';
        css += 'align-items:center !important;';
        css += 'background:none !important;';
        css += 'margin-top:-80px !important;';
        css += 'z-index:2 !important;';
        css += '}';

        /* Постер */
        css += '.full-start-new__poster {';
        css += 'position:relative !important;';
        css += 'overflow:hidden !important;';
        css += 'background:#000;';
        css += 'z-index:1;';
        css += 'height:60vh !important;';
        css += '}';

        css += '.full-start-new__poster img {';
        if (isAnimationEnabled) {
            css += 'animation:kenBurnsEffect 25s ease-in-out infinite !important;';
        }
        css += 'width:100%;';
        css += 'height:100%;';
        css += 'object-fit:cover;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 60%,transparent 100%) !important;';
        css += '-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 60%,transparent 100%) !important;';
        css += '}';

        /* Логотип */
        css += '.full-start-new__title {';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'min-height:80px;';
        css += 'margin-bottom:10px;';
        css += '}';

        css += '.full-start-new__title img {';
        css += 'max-height:100px;';
        css += 'object-fit:contain;';
        css += 'filter:drop-shadow(0 0 10px rgba(0,0,0,0.7));';
        css += '}';

        /* Блок студій */
        css += '.plugin-info-block {';
        css += 'display:flex;';
        css += 'flex-direction:column;';
        css += 'align-items:center;';
        css += 'gap:12px;';
        css += 'margin:10px 0 0 0;';
        css += 'width:100%;';
        css += '}';

        css += '.studio-row {';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'align-items:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:8px;';
        css += '}';

        css += '.studio-item {';
        css += 'height:3em;';
        css += 'padding:6px 14px;';
        css += 'border-radius:14px;';
        css += 'display:flex;';
        css += 'align-items:center;';
        css += 'background:rgba(255,255,255,' + bgOpacity + ');';
        css += 'backdrop-filter:blur(10px);';
        css += '}';

        css += '.studio-item img {';
        css += 'height:100%;';
        css += 'width:auto;';
        css += 'object-fit:contain;';
        css += '}';

        css += '}';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ================= ЛОГО СТУДІЙ ================= */

    function renderStudioLogos(container, data) {

        var showStudio = Lampa.Storage.get('mobile_interface_studios');
        if (showStudio === false || showStudio === 'false') return;

        var logos = [];
        var sources = [data.networks, data.production_companies];

        sources.forEach(function (source) {
            if (source && source.length) {
                source.forEach(function (item) {
                    if (item.logo_path) {
                        var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                        if (!logos.find(function (l) { return l.url === logoUrl; })) {
                            logos.push({ url: logoUrl });
                        }
                    }
                });
            }
        });

        logos.forEach(function (logo) {
            container.append('<div class="studio-item"><img src="' + logo.url + '"></div>');
        });
    }

    /* ================= ОСНОВНА ЛОГІКА ================= */

    function initPlugin() {

        Lampa.Listener.follow('full', function (e) {

            if (e.type === 'destroy') clearInterval(slideshowTimer);

            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {

                var movie = e.data.movie;
                var $render = e.object.activity.render();

                /* 🔥 ПОВНІСТЮ ВИДАЛЯЄМО МЕТАДАНІ */
                $render.find('.full-start-new__details').remove();
                $render.find('.full-start__age').remove();

                /* Логотип TMDB */
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' +
                        (movie.name ? 'tv' : 'movie') +
                        '/' + movie.id +
                        '/images?api_key=' + Lampa.TMDB.key(),
                    success: function (res) {

                        var lang = Lampa.Storage.get('language') || 'uk';

                        var logo =
                            res.logos.filter(l => l.iso_639_1 === lang)[0] ||
                            res.logos.filter(l => l.iso_639_1 === 'en')[0] ||
                            res.logos[0];

                        if (logo) {
                            var imgUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                        }
                    }
                });

                /* Додаємо студії */
                setTimeout(function () {

                    $('.plugin-info-block').remove();

                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div></div>');

                    $render.find('.full-start-new__title').after($infoBlock);

                    renderStudioLogos($infoBlock.find('.studio-row'), movie);

                }, 400);
            }
        });
    }

    /* ================= СТАРТ ================= */

    function start() {
        applyStyles();
        initPlugin();

        setInterval(function () {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 2000);
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
