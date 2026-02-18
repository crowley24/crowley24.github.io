(function() {  
    'use strict';  
  
    // 1. Ініціалізація налаштування  
    if (Lampa.Storage.get('mobile_interface_animation', 'unset') === 'unset') {  
        Lampa.Storage.set('mobile_interface_animation', true);  
    }  
  
    // 2. Функція застосування стилів
    function applyStyles() {  
        var oldStyle = document.getElementById('mobile-interface-styles');  
        if (oldStyle) oldStyle.remove();  
  
        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');  
        var style = document.createElement('style');  
        style.id = 'mobile-interface-styles';  
        style.textContent = `  
            @keyframes kenBurnsEffect {  
                0% { transform: scale(1); }  
                50% { transform: scale(1.15); }  (function() {  
    'use strict';  
  
    // 1. Ініціалізація налаштувань
    var settings = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true }
    ];

    settings.forEach(function(opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {  
            Lampa.Storage.set(opt.id, opt.default);  
        }
    });

    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    // 2. Стилі (об'єднані твої та нові для іконок)
    function applyStyles() {  
        var oldStyle = document.getElementById('mobile-interface-styles');  
        if (oldStyle) oldStyle.remove();  
  
        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');  
        var style = document.createElement('style');  
        style.id = 'mobile-interface-styles';  
        style.textContent = `  
            @keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }  
            @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }

            @media screen and (max-width: 480px) {  
                .background { background: #000 !important; }  
                .full-start-new__poster { position: relative !important; overflow: hidden !important; touch-action: none !important; pointer-events: none !important; }  
                .full-start-new__poster img {  
                    ${isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important;' : 'animation: none !important;'}  
                    transform-origin: center center !important;  
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                }  
                .full-start-new__img { border-radius: 0 !important; mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important; }  
                .full-start-new__right { background: none !important; border: none !important; box-shadow: none !important; margin-top: -120px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; }  
                .full-start-new__right::before, .full-start-new__right::after { content: unset !important; }  
                .full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; }  
                .full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline { justify-content: center !important; text-align: center !important; display: flex !important; }  
                
                /* Стилі для іконок */
                .quality-badges-container { display: flex; align-items: center; justify-content: center; gap: 0.6em; margin: 10px 0; flex-wrap: wrap; width: 100%; }
                .quality-badge { height: 1.2em; opacity: 0; transform: translateY(5px); animation: qb_in 0.4s ease forwards; display: flex; align-items: center; }
                .studio-logo { height: 1.6em !important; margin-right: 2px; }
                .quality-badge img { height: 100%; width: auto; display: block; }
            }  
        `;  
        document.head.appendChild(style);  
    }  

    // 3. Логіка Студій та Якості
    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(function(source) {
            if (source && source.length) {
                source.forEach(function(item) {
                    if (item.logo_path) {
                        var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                        if (!logos.find(function(l) { return l.url === logoUrl; })) logos.push({ url: logoUrl, name: item.name });
                    }
                });
            }
        });

        logos.forEach(function(logo) {
            var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" title="' + logo.name + '"></div>');
            
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var r = 0, g = 0, b = 0, cnt = 0;
                    for (var i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 50) { r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; cnt++; }
                    }
                    if (cnt > 0 && (0.299 * (r/cnt) + 0.587 * (g/cnt) + 0.114 * (b/cnt)) < 40) {
                        $('#' + imgId + ' img').css({'filter': 'brightness(0) invert(1)', 'opacity': '0.9'});
                    }
                } catch (e) {}
            };
            img.src = logo.url;
        });
    }

    function getBestQuality(results) {
        var best = { resolution: null, hdr: false, dv: false, audio: null, ukr: false };
        results.slice(0, 20).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.match(/ukr|укр|ua/)) best.ukr = true;
            if (t.match(/4k|2160/)) best.resolution = '4K';
            else if (!best.resolution && t.match(/2k|1440/)) best.resolution = '2K';
            else if (!best.resolution && t.match(/1080|fhd/)) best.resolution = 'FULL HD';
            if (t.match(/vision|dovi| dv /)) best.dv = true;
            if (t.match(/hdr/)) best.hdr = true;
        });
        return best;
    }

    // 4. Налаштування (через твій метод SettingsApi)
    function addSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'mobile_interface',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',  
            name: 'Мобільний інтерфейс'  
        });  
  
        var params = [
            { name: 'mobile_interface_animation', label: 'Анімація постера', desc: 'Ефект наближення фону' },
            { name: 'mobile_interface_studios', label: 'Логотипи студій', desc: 'Показувати іконки Netflix, Disney тощо' },
            { name: 'mobile_interface_quality', label: 'Значки якості', desc: 'Показувати 4K, HDR, UKR (потрібен парсер)' }
        ];

        params.forEach(function(p) {
            Lampa.SettingsApi.addParam({  
                component: 'mobile_interface',  
                param: { name: p.name, type: 'trigger', default: true },  
                field: { name: p.label, description: p.desc },  
                onChange: function() { applyStyles(); }  
            });
        });
    }  
  
    // 5. Основна логіка рендеру
    function initLogoAndBadges() {  
        Lampa.Listener.follow('full', function(e) {  
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {  
                var movie = e.data.movie;  
                var $details = e.object.activity.render().find('.full-start-new__details');
                
                // Рендер логотипу TMDB (твій метод)
                var lang = Lampa.Storage.get('language') || 'uk';  
                Lampa.TMDB.api((movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang, function(res) {  
                    var path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                    if (!path) return;
                    var imgUrl = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));  
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+imgUrl+'" style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;">');  
                });

                // Рендер Студій та Якості
                if ($details.length) {
                    $('.quality-badges-container').remove();
                    $details.after('<div class="quality-badges-container"></div>');
                    var container = $('.quality-badges-container');

                    renderStudioLogos(container, movie);

                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Storage.field('parser_use')) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
                            if (response && response.Results) {
                                var b = getBestQuality(response.Results);
                                var html = '';
                                if (b.ukr) html += '<div class="quality-badge"><img src="'+svgIcons['UKR']+'"></div>';
                                if (b.resolution) html += '<div class="quality-badge"><img src="'+svgIcons[b.resolution]+'"></div>';
                                if (b.dv) html += '<div class="quality-badge"><img src="'+svgIcons['Dolby Vision']+'"></div>';
                                else if (b.hdr) html += '<div class="quality-badge"><img src="'+svgIcons['HDR']+'"></div>';
                                container.append(html);
                            }
                        });
                    }
                }
            }  
        });  
    }  
  
    function start() {  
        applyStyles();  
        addSettings();  
        initLogoAndBadges();  
        setInterval(function() { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 1000);  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });  
})();

                100% { transform: scale(1); }  
            }  
  
            @media screen and (max-width: 480px) {  
                /* Загальний фон */
                .background { background: #000 !important; }  
  
                /* Вимикаємо стандартне розмиття Lampa */
                .full-start__poster, .full-start-new__poster,  
                .full-start__poster img, .full-start-new__poster img {  
                    filter: none !important;  
                    -webkit-filter: none !important;  
                }  
  
                /* Контейнер постера - ВИПРАВЛЕННЯ "ПЛАВАННЯ" ЕКРАНА */
                .full-start-new__poster {  
                    position: relative !important;  
                    overflow: hidden !important; /* Обрізає збільшену картинку, щоб не було скролу */
                    touch-action: none !important; /* Забороняє браузеру рухати екран при торканні картинки */
                    pointer-events: none !important; /* Пропускає кліки/свайпи крізь картинку на фон */
                }  
  
                /* Сама картинка з анімацією та маскою */
                .full-start-new__poster img {  
                    ${isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important;' : 'animation: none !important;'}  
                    transform-origin: center center !important;  
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                }  
  
                /* Маска контенту для приховання ліній */
                .full-start-new__img {  
                    border-radius: 0 !important;  
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;  
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;  
                }  
  
                /* Права частина з контентом */
                .full-start-new__right {  
                    background: none !important;  
                    border: none !important;  
                    box-shadow: none !important;  
                    margin-top: -120px !important;  
                    z-index: 2 !important;  
                    display: flex !important;  
                    flex-direction: column !important;  
                    align-items: center !important;  
                }  
  
                .full-start-new__right::before, .full-start-new__right::after { content: unset !important; }  
  
                /* Заголовок та центрування */
                .full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; }  
                .full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline {  
                    justify-content: center !important;  
                    text-align: center !important;  
                    display: flex !important;  
                }  
            }  
        `;  
        document.head.appendChild(style);  
    }  
  
    // 3. Реєстрація налаштувань у меню
    function addSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'mobile_interface',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',  
            name: 'Мобільний інтерфейс'  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: {  
                name: 'mobile_interface_animation',  
                type: 'trigger',  
                default: true  
            },  
            field: {  
                name: 'Анімація постера',  
                description: 'Повільна анімація наближення фонового зображення'  
            },  
            onChange: function(value) {  
                applyStyles();  
            }  
        });  
    }  
  
    // 4. Логіка завантаження логотипів (TMDB)
    function initLogo() {  
        Lampa.Listener.follow('full', function(e) {  
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {  
                var movie = e.data.movie;  
                if (!movie || !movie.id) return;  
                var type = movie.name ? 'tv' : 'movie';  
                var lang = Lampa.Storage.get('language') || 'uk';  
  
                var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang);  
                $.get(url, function(res) {  
                    let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;  
                    if (!path) {  
                        $.get(Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en'), function(resEn) {  
                            if (resEn.logos && resEn.logos[0]) render(resEn.logos[0].file_path);  
                        });  
                    } else render(path);  
                });  
  
                function render(p) {  
                    const imgUrl = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));  
                    var $title = e.object.activity.render().find('.full-start-new__title');  
                    if ($title.length) {  
                        $title.html('<img src="'+imgUrl+'" style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;">');  
                    }  
                }  
            }  
        });  
    }  
  
    // 5. Запуск плагіна
    function start() {  
        applyStyles();  
        addSettings();  
        initLogo();  
  
        // Постійне вимкнення стандартного блюру
        setInterval(function() {  
            if (window.innerWidth <= 480 && window.lampa_settings) {  
                window.lampa_settings.blur_poster = false;  
            }  
        }, 1000);  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });  
})();
