(function () {
    'use strict';

    /* ================= НАСТРОЙКИ ================= */

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    /* ================= СТИЛІ ================= */

    function applyStyles() {

        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.remove();

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

        /* ================= ПРИХОВУВАННЯ МЕТАДАНИХ ================= */

        css += '.full-start-new__details { display:none !important; }';
        css += '.full-start__info { display:none !important; }';

        css += '.full-start__age, .full-start-new__age { display:none !important; }';

        css += '.full-start__status, .full-start-new__status { display:none !important; }';

        css += '[class*="age"] { display:none !important; }';
        css += '[class*="pg"] { display:none !important; }';
        css += '[class*="status"] { display:none !important; }';

        /* ================= ПІДЙОМ КОНТЕНТУ ================= */

        css += '.full-start-new__right {';
        css += 'display:flex !important;';
        css += 'flex-direction:column !important;';
        css += 'align-items:center !important;';
        css += 'margin-top:-60px !important;';
        css += 'z-index:2 !important;';
        css += '}';

        /* ================= ПОСТЕР ================= */

        css += '.full-start-new__poster {';
        css += 'position:relative !important;';
        css += 'overflow:hidden !important;';
        css += 'background:#000;';
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

        /* ================= НАЗВА ================= */

        css += '.full-start-new__title {';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'margin-bottom:15px;';
        css += '}';

        css += '.full-start-new__title img {';
        css += 'max-height:100px;';
        css += 'object-fit:contain;';
        css += 'filter:drop-shadow(0 0 10px rgba(0,0,0,0.7));';
        css += '}';

        /* ================= СТУДІЇ ================= */

        css += '.plugin-info-block {';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:8px;';
        css += 'margin-top:10px;';
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
                        if (!logos.find(l => l.url === logoUrl)) {
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

    /* ================= ІНІЦІАЛІЗАЦІЯ ================= */

    function initPlugin() {

        Lampa.Listener.follow('full', function (e) {

            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {

                var movie = e.data.movie;
                var $render = e.object.activity.render();

                setTimeout(function () {

                    $('.plugin-info-block').remove();

                    var $infoBlock = $('<div class="plugin-info-block"></div>');

                    $render.find('.full-start-new__title').after($infoBlock);

                    renderStudioLogos($infoBlock, movie);

                }, 400);
            }
        });
    }

    function start() {
        applyStyles();
        initPlugin();
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
