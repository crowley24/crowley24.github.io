(function () {
    'use strict';

    // 1. Налаштування з унікальними ключами
    var settings_list = [
        { id: 'tv_net_animation', default: true },
        { id: 'tv_net_slideshow', default: true },
        { id: 'tv_net_studios', default: true },
        { id: 'tv_net_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer;
    
    // 2. Стилі Netflix Layout
    function applyStyles() {
        if (document.getElementById('tv-net-styles')) return;
        var style = document.createElement('style');
        style.id = 'tv-net-styles';
        style.textContent = `
            /* Ефект зуму */
            @keyframes netZoom { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
            
            /* Фон на весь екран */
            .full-start-new__poster { 
                position: fixed !important; top: 0; left: 0; width: 100vw !important; height: 100vh !important; 
                z-index: -1 !important; margin: 0 !important; background: #000 !important; overflow: hidden !important;
            }
            .full-start-new__poster img { 
                position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0; 
                transition: opacity 1.2s ease-in-out !important;
                mask-image: linear-gradient(to right, #000 30%, transparent 95%), linear-gradient(to top, #000 30%, transparent 100%) !important;
                -webkit-mask-image: linear-gradient(to right, #000 30%, transparent 95%), linear-gradient(to top, #000 30%, transparent 100%) !important;
            }
            .net-anim { animation: netZoom 35s infinite ease-in-out !important; }
            
            /* Приховуємо стандартні елементи Lampa */
            .full-start-new__bg { display: none !important; }
            .full-start-new__poster img:not(.net-slide) { display: none !important; }

            /* Контент зліва знизу */
            .full-start-new__right { 
                background: none !important; position: absolute !important; bottom: 12% !important; 
                left: 5% !important; width: 50% !important; display: flex !important; 
                flex-direction: column !important; align-items: flex-start !important; z-index: 10 !important;
            }
            .full-start-new__title { margin-bottom: 20px; justify-content: flex-start !important; width: 100%; }
            .full-start-new__title img { max-height: 160px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 0 15px rgba(0,0,0,0.7)); }
            
            /* Інфо-блоки */
            .net-info { display: flex; flex-direction: column; gap: 15px; margin-top: 15px; }
            .net-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
            .net-studio { 
                height: 45px; padding: 6px 14px; border-radius: 10px; 
                background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
            }
            .net-studio img { height: 100%; object-fit: contain; }
            .net-badge { 
                font-weight: bold; color: #fff; padding: 2px 8px; border: 1px solid rgba(255,255,255,0.5); 
                border-radius: 4px; font-size: 14px; text-transform: uppercase;
                background: rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // 3. Слайдшоу
    function startSlideshow($el, items) {
        clearInterval(slideshowTimer);
        if (!Lampa.Storage.get('tv_net_slideshow') || !items.length) return;
        
        var i = 0;
        function showNext() {
            var url = Lampa.TMDB.image('/t/p/original' + items[i].file_path);
            var $new = $('<img class="net-slide' + (Lampa.Storage.get('tv_net_animation') ? ' net-anim' : '') + '" src="' + url + '">');
            $el.append($new);
            $new.on('load', function() {
                $new.css('opacity', '1');
                $el.find('img').not($new).css('opacity', '0');
                setTimeout(function() { $el.find('img').not($new).remove(); }, 1500);
            });
            i = (i + 1) % items.length;
        }
        showNext();
        slideshowTimer = setInterval(showNext, 12000);
    }

    // 4. Логіка плагіна
    function startPlugin() {
        applyStyles();

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Отримання графіки (Лого + Слайди)
                var url = 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key();
                $.getJSON(url, function(res) {
                    // Логотип
                    var logo = res.logos.filter(l => l.iso_639_1 === 'uk')[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                    if (logo) {
                        var logoImg = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                        $render.find('.full-start-new__title').html('<img src="' + logoImg + '">');
                    }
                    // Слайдшоу
                    if (res.backdrops.length) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 12));
                });

                // Студії та якість
                var $details = $render.find('.full-start-new__details');
                $('.net-info').remove();
                var $info = $('<div class="net-info"><div class="net-row net-studios"></div><div class="net-row net-qualities"></div></div>');
                $details.after($info);

                if (Lampa.Storage.get('tv_net_studios') && movie.production_companies) {
                    movie.production_companies.slice(0, 4).forEach(function(c) {
                        if (c.logo_path) $info.find('.net-studios').append('<div class="net-studio"><img src="'+Lampa.Api.img(c.logo_path, 'w200')+'"></div>');
                    });
                }
                
                // Проста якість (текстові бейджі, щоб уникнути CORS проблем з картинками)
                if (Lampa.Storage.get('tv_net_quality')) {
                    var qRow = $info.find('.net-qualities');
                    if (movie.vote_average) qRow.append('<div class="net-badge" style="border-color:#46d369;color:#46d369">Rating: ' + movie.vote_average.toFixed(1) + '</div>');
                    if (movie.release_date) qRow.append('<div class="net-badge">' + movie.release_date.split('-')[0] + '</div>');
                }
            }
        });
    }

    // Реєстрація налаштувань
    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'tv_net_cfg',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M7 19h10V4H7v15zm-5-2h4V6H2v11zM18 6v11h4V6h-4z" fill="white"/></svg>',
            name: 'Netflix TV Style'
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_net_cfg',
            param: { name: 'tv_net_animation', type: 'trigger', default: true },
            field: { name: 'Анімація (Зум)', description: 'Ефект руху фону' }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_net_cfg',
            param: { name: 'tv_net_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу', description: 'Автозміна кадрів' }
        });
    }

    // 5. ГАРАНТОВАНИЙ ЗАПУСК
    if (window.appready) {
        startPlugin();
        addSettings();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
                addSettings();
            }
        });
    }
})();
