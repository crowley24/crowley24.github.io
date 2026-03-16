(function () {
    'use strict';

    var logoCache = {}; 
    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/Icons/';
    
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_ui_anim', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_logo_size_v2', default: '125' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '8px' },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' },
        { id: 'mobile_interface_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /**
     * СТИЛІ
     */
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isPosterAnim = Lampa.Storage.get('mobile_interface_animation');
        var isUIAnim = Lampa.Storage.get('mobile_interface_ui_anim');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        var lHeight = Lampa.Storage.get('mobile_interface_logo_size_v2', '125'); 
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '8px');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '';
        css += '@keyframes kenBurnsCustom { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } } ';
        css += '@keyframes ui_reveal { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } ';
        
        // Наш новий шар фону
        css += '.custom-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; background: #000; } ';
        css += '.custom-bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1.5s ease-in-out; ';
        css += (isPosterAnim ? 'animation: kenBurnsCustom 35s ease-in-out infinite; ' : '') + '} ';
        css += '.custom-bg-layer::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 50%, #000 95%); } ';

        // Приховуємо стандартні елементи
        css += '.full-start-new__poster, .background { display: none !important; } ';
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, .rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        
        // Текстовий блок поверх нашого фону
        css += '.full-start-new__right { position: relative !important; z-index: 2 !important; background: none !important; margin-top: 15vh !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: ' + blocksGap + ' !important; } ';
        
        var uiAnimClass = isUIAnim ? 'animation: ui_reveal 0.6s forwards; opacity: 0; ' : '';
        css += '.full-start-new__title { ' + uiAnimClass + ' order: 2; width: 100%; display: flex; justify-content: center; min-height: 60px; } ';
        css += '.full-start-new__title img { max-height: ' + lHeight + 'px !important; width: auto; filter: drop-shadow(0 0 15px rgba(0,0,0,0.8)); } ';
        css += '.plugin-ratings-row { ' + uiAnimClass + ' order: 5; display: flex; align-items: center; gap: 12px; font-size: calc(' + rSize + ' * 2.8); color: #fff; } ';
        css += '.studio-row { order: 4; display: flex; gap: 12px; } ';
        css += '.studio-item { height: 2.2em; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,'+bgOpacity+'); backdrop-filter: blur(10px); } ';
        css += '.studio-item img { height: 100%; filter: brightness(0) invert(1); } ';
        css += '.full-start-new__buttons { ' + uiAnimClass + ' order: 7; display: flex !important; justify-content: center !important; gap: 10px !important; margin-top: 20px !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; display: flex !important; flex-direction: column !important; align-items: center !important; width: 70px !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 9px !important; text-transform: uppercase; margin-top: 5px; opacity: 0.8; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * ФУНКЦІОНАЛ (РЕЙТИНГИ, СТУДІЇ, ЯКІСТЬ)
     */
    function renderRatings(container, e) {
        var $row = $('<div class="plugin-ratings-row"></div>');
        var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) $row.append('<span>TMDB: ' + tmdb + '</span>');
        
        var runtime = e.data.movie.runtime;
        if (runtime) $row.append('<span class="info-separator">•</span><span>' + runtime + ' хв</span>');
        
        container.append($row).append('<div class="quality-row-inline"></div>');
    }

    function renderStudioLogos(container, data) {
        var source = (data.networks || []).concat(data.production_companies || []);
        source.filter(i => i.logo_path).slice(0, 4).forEach(function(item) {
            container.append('<div class="studio-item"><img src="'+Lampa.Api.img(item.logo_path, 'w200')+'"></div>');
        });
    }

    /**
     * СЛАЙДШОУ НА НАШОМУ НОВОМУ ФОНІ
     */
    function startCustomSlideshow(items) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) return;
        var index = 0; clearInterval(slideshowTimer);
        var $layer = $('.custom-bg-layer');

        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/original' + items[index].file_path);
            var $newImg = $('<img class="custom-bg-img" src="' + imgUrl + '">');
            
            $layer.append($newImg);
            setTimeout(function() { 
                $newImg.css('opacity', '1');
                $layer.find('.custom-bg-img').not($newImg).css('opacity', '0');
                setTimeout(function() { $layer.find('.custom-bg-img').not($newImg).remove(); }, 1600);
            }, 100);
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000')));
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie, $render = e.object.activity.render();
                
                // Створюємо наш шар фону
                var $customBg = $('<div class="custom-bg-layer"></div>');
                $render.prepend($customBg);

                // Завантажуємо дані TMDB для фонів та лого
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Початковий фон
                        if (movie.backdrop_path) {
                            var firstBg = Lampa.TMDB.image('/t/p/original' + movie.backdrop_path);
                            $customBg.append('<img class="custom-bg-img" src="' + firstBg + '" style="opacity:1">');
                        }
                        // Логотип
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');
                        }
                        // Запуск слайдшоу
                        if (res.backdrops && res.backdrops.length > 1) {
                            startCustomSlideshow(res.backdrops.slice(0, 15));
                        }
                    }
                });

                // Рендер функціоналу
                var $right = $render.find('.full-start-new__right');
                var $info = $('<div class="plugin-info-block"><div class="studio-row"></div></div>');
                $right.append($info);
                
                renderStudioLogos($info.find('.studio-row'), movie);
                renderRatings($right, e);
            }
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({ component: 'mobile_interface', name: 'ТВ та Мобільний інтерфейс', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>' });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Анімація фону (Зум)' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true }, field: { name: 'Слайд-шоу фону' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '125': 'Малий', '150': 'Середній', '180': 'Великий' }, default: '125' }, field: { name: 'Висота лого' }, onChange: applyStyles });
    }

    function startPlugin() {
        applyStyles(); setupSettings(); init();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
