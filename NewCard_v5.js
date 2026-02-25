(function () {
    'use strict';

    var settings_list = [
        { id: 'tv_net_animation', default: true, name: 'Netflix: Зум', desc: 'Ефект Ken Burns' },
        { id: 'tv_net_slideshow', default: true, name: 'Netflix: Слайд-шоу', desc: 'Зміна фону' },
        { id: 'tv_net_studios', default: true, name: 'Netflix: Студії', desc: 'Логотипи компаній' },
        { id: 'tv_net_quality', default: true, name: 'Netflix: Якість', desc: 'Значки 4K/HDR/UKR' },
        { id: 'tv_net_opacity', default: '0.2', name: 'Netflix: Фон лого', desc: 'Прозорість підкладки' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer;
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', 'HDR': pluginPath + 'HDR.svg', 'UKR': pluginPath + 'UKR.svg',
        'FULL HD': pluginPath + 'FULL HD.svg', '5.1': pluginPath + '5.1.svg'
    };

    function applyStyles() {
        var oldStyle = document.getElementById('tv-net-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-net-styles';
        var opacity = Lampa.Storage.get('tv_net_opacity', '0.2');
        
        var css = `
            @keyframes netflixZoom { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            
            /* Фон на весь екран */
            .full-start-new__poster { 
                position: fixed !important; top: 0; left: 0; width: 100vw !important; height: 100vh !important; 
                z-index: -1 !important; margin: 0 !important; overflow: hidden !important; background: #000 !important;
            }
            .full-start-new__poster img { 
                position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0; 
                transition: opacity 1.5s ease-in-out !important;
                mask-image: linear-gradient(to right, #000 25%, transparent 90%), linear-gradient(to top, #000 20%, transparent 80%);
                -webkit-mask-image: linear-gradient(to right, #000 25%, transparent 90%), linear-gradient(to top, #000 20%, transparent 80%);
            }
            ${Lampa.Storage.get('tv_net_animation') ? '.full-start-new__poster img { animation: netflixZoom 30s infinite !important; }' : ''}
            
            /* Приховуємо сміття */
            .full-start-new__bg, .full-start-new__poster img:not(.net-slide) { display: none !important; }

            /* Контент ліворуч (Netflix Style) */
            .full-start-new__right { 
                background: none !important; position: absolute !important; bottom: 10% !important; 
                left: 5% !important; width: 45% !important; align-items: flex-start !important; z-index: 10;
            }
            .full-start-new__title { justify-content: flex-start !important; margin-bottom: 20px; }
            .full-start-new__title img { max-height: 150px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
            
            .net-info-box { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
            .net-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
            
            .net-studio { 
                height: 40px; padding: 5px 12px; border-radius: 8px; 
                background: rgba(255,255,255, ${opacity}); backdrop-filter: blur(10px); 
            }
            .net-studio img { height: 100%; width: auto; }
            .net-quality { height: 25px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }
            .net-quality img { height: 100%; }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function startSlideshow($container, backdrops) {
        if (!Lampa.Storage.get('tv_net_slideshow') || !backdrops.length) return;
        var index = 0;
        clearInterval(slideshowTimer);
        
        function next() {
            var imgUrl = Lampa.TMDB.image('/t/p/original' + backdrops[index].file_path);
            var $img = $('<img class="net-slide" src="'+imgUrl+'">');
            $container.append($img);
            $img.on('load', function() {
                $(this).css('opacity', '1');
                $container.find('img').not($(this)).css('opacity', '0');
                setTimeout(() => $container.find('img').not($(this)).remove(), 1600);
            });
            index = (index + 1) % backdrops.length;
        }
        next();
        slideshowTimer = setInterval(next, parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '10000')));
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var $render = e.object.activity.render();
                var movie = e.data.movie;

                // Завантаження графіки
                $.get('https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(), function(res) {
                    // Лого
                    var logo = res.logos.filter(l => l.iso_639_1 === 'uk')[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                    if (logo) {
                        var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                        $render.find('.full-start-new__title').html('<img src="'+logoUrl+'">');
                    }
                    // Слайди
                    if (res.backdrops.length) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 10));
                });

                // Студії та якість
                var $details = $render.find('.full-start-new__details');
                $('.net-info-box').remove();
                var $box = $('<div class="net-info-box"><div class="net-row net-studios"></div><div class="net-row net-qualities"></div></div>');
                $details.after($box);

                if (Lampa.Storage.get('tv_net_studios')) {
                    (movie.production_companies || []).slice(0, 4).forEach(s => {
                        if (s.logo_path) $box.find('.net-studios').append('<div class="net-studio"><img src="'+Lampa.Api.img(s.logo_path, 'w200')+'"></div>');
                    });
                }
            }
        });
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: 'tv_net', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="white"/></svg>', name: 'Netflix TV Interface' });
        settings_list.forEach(opt => {
            Lampa.SettingsApi.addParam({
                component: 'tv_net',
                param: { name: opt.id, type: opt.id.indexOf('opacity') > -1 ? 'select' : 'trigger', default: opt.default },
                field: { name: opt.name, description: opt.desc },
                values: opt.id.indexOf('opacity') > -1 ? { '0': 'Без фону', '0.2': 'Тонкий', '0.5': 'Темний' } : {},
                onChange: () => applyStyles()
            });
        });
    }

    if (window.appready) { applyStyles(); addSettings(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); addSettings(); init(); } });
})();
