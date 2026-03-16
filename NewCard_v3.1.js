(function () {
    'use strict';

    /**
     * ПЕРЕМІННІ ТА КОНФІГУРАЦІЯ
     */
    var logoCache = {};
    var slideshowTimer;
    var rafId;
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var PLUGIN_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#E1134B"/><path d="M17 8H7V16H17V8Z" fill="white"/></svg>`;

    // Список налаштувань зі збереженням значень за замовчуванням
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_ui_anim', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_logo_size_v2', default: '125' },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var svgIcons = {
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /**
     * СТИЛІ (CSS)
     */
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isPosterAnim = Lampa.Storage.get('mobile_interface_animation');
        var isUIAnim = Lampa.Storage.get('mobile_interface_ui_anim');
        var lHeight = Lampa.Storage.get('mobile_interface_logo_size_v2', '125');

        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';

        var css = `
            @keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            @keyframes ui_reveal { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

            @media screen and (max-width: 480px) {
                .full-start__info, .full-start__title-name, .full-start__rates, .full-start__details { display: none !important; }
                
                .full-start-new__poster { position: relative; overflow: hidden; background: #000; height: 62vh !important; }
                .full-start-new__poster img { 
                    ${isPosterAnim ? 'animation: kenBurnsEffect 25s ease-in-out infinite;' : ''}
                    width: 100%; height: 100%; object-fit: cover; 
                    mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
                    -webkit-mask-image: linear-gradient(to bottom, #000 70%, transparent 100%);
                }

                .full-start-new__right { margin-top: -140px !important; z-index: 2; position: relative; display: flex; flex-direction: column; align-items: center; }

                /* Лого назви */
                .full-start-new__title { 
                    ${isUIAnim ? 'animation: ui_reveal 0.6s ease forwards;' : ''} 
                    width: 100%; display: flex; justify-content: center; min-height: 60px; margin-bottom: 10px;
                }
                .full-start-new__title img { max-height: ${lHeight}px !important; max-width: 90vw; object-fit: contain; }

                /* Ряд студій */
                .studio-row { 
                    display: flex; justify-content: center; gap: 10px; margin-bottom: 10px; width: 100%; 
                    ${isUIAnim ? 'animation: ui_reveal 0.6s ease 0.1s forwards; opacity: 0;' : ''}
                }
                .studio-item { height: 22px; padding: 3px 8px; background: rgba(255,255,255,0.15); border-radius: 6px; }
                .studio-item img { height: 100%; filter: brightness(0) invert(1); }

                /* Комбінований рядок метаданих */
                .meta-combined-row { 
                    display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; 
                    color: #fff; font-size: 13px; font-weight: 500;
                    ${isUIAnim ? 'animation: ui_reveal 0.6s ease 0.2s forwards; opacity: 0;' : ''}
                }
                .meta-rating-item { display: flex; align-items: center; gap: 4px; }
                .meta-rating-item img { height: 12px; }
                .meta-sep { opacity: 0.4; }
                .meta-quality-icons { display: flex; gap: 5px; }
                .meta-quality-icons img { height: 14px; }

                /* Кнопки */
                .full-start__buttons { 
                    margin-top: 20px !important; justify-content: center !important; 
                    ${isUIAnim ? 'animation: ui_reveal 0.6s ease 0.3s forwards; opacity: 0;' : ''}
                }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * ЛОГІКА ТА ДОПОМІЖНІ ФУНКЦІЇ
     */
    function getRatingColor(val) {
        var n = parseFloat(val);
        return n >= 7.5 ? '#2ecc71' : (n >= 6 ? '#feca57' : '#ff4d4d');
    }

    function formatTime(mins) {
        if (!mins) return '';
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        return (h > 0 ? h + 'г ' : '') + m + 'хв';
    }

    function getCubRating(e) {
        if (!e.data || !e.data.reactions || !e.data.reactions.result) return null;
        var sum = 0, cnt = 0;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        e.data.reactions.result.forEach(function(r) {
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }
        });
        return cnt >= 5 ? ((6.5 * 150 + sum) / (150 + cnt)).toFixed(1) : null;
    }

    /**
     * РЕНДЕР КОМПОНЕНТІВ
     */
    function renderContent(e) {
        var movie = e.data.movie;
        var $render = e.object.activity.render();
        var $right = $render.find('.full-start-new__right');
        
        // Очищуємо старі блоки, якщо вони є
        $right.find('.full-start-new__title, .studio-row, .meta-combined-row').remove();

        // 1. Лого назви
        var $titleBox = $('<div class="full-start-new__title"></div>');
        $right.prepend($titleBox);
        
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    $titleBox.html('<img src="' + url + '">');
                } else {
                    $titleBox.html('<h2>' + (movie.title || movie.name) + '</h2>');
                }

                // Слайдшоу
                if (res.backdrops && res.backdrops.length > 1) {
                    startPosterSlideshow($render.find('.full-start-new__poster'), res.backdrops.filter(b => b.aspect_ratio > 1.5).slice(0, 15));
                }
            }
        });

        // 2. Студії
        if (Lampa.Storage.get('mobile_interface_studios')) {
            var $studios = $('<div class="studio-row"></div>');
            var logos = [];
            [movie.networks, movie.production_companies].forEach(function(s) {
                if (s) s.forEach(function(item) {
                    if (item.logo_path && logos.length < 4) logos.push(Lampa.Api.img(item.logo_path, 'w200'));
                });
            });
            logos.forEach(url => $studios.append('<div class="studio-item"><img src="'+url+'"></div>'));
            if (logos.length) $titleBox.after($studios);
        }

        // 3. Комбінований рядок (Рейтинг, Час, Жанр, Якість)
        var $meta = $('<div class="meta-combined-row"></div>');
        var sep = '<span class="meta-sep">•</span>';

        // TMDB
        var tmdb = parseFloat(movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) $meta.append('<div class="meta-rating-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');

        // CUB
        var cub = getCubRating(e);
        if (cub) {
            $meta.append(sep);
            $meta.append('<div class="meta-rating-item"><img src="'+ratingIcons.cub+'"> <span style="color:'+getRatingColor(cub)+'">'+cub+'</span></div>');
        }

        // Час
        var runtime = movie.runtime || (movie.episode_run_time ? movie.episode_run_time[0] : 0);
        if (runtime) {
            $meta.append(sep);
            $meta.append('<span>' + formatTime(runtime) + '</span>');
        }

        // Жанр
        if (movie.genres && movie.genres.length) {
            $meta.append(sep);
            $meta.append('<span>' + movie.genres[0].name + '</span>');
        }

        // Якість
        var $qBox = $('<div class="meta-quality-icons"></div>');
        $meta.append($qBox);
        $right.find('.studio-row').length ? $right.find('.studio-row').after($meta) : $titleBox.after($meta);

        if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
            Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                if (res && res.Results) {
                    var b = { res: null, hdr: false, dv: false, ukr: false };
                    res.Results.slice(0, 15).forEach(function(i) {
                        var t = (i.Title || '').toLowerCase();
                        if (t.includes('ukr') || t.includes('укр')) b.ukr = true;
                        if (t.includes('4k')) b.res = '4K';
                        if (t.includes('vision')) b.dv = true; else if (t.includes('hdr')) b.hdr = true;
                    });
                    if (b.res) $qBox.append('<img src="'+svgIcons[b.res]+'">');
                    if (b.dv) $qBox.append('<img src="'+svgIcons['Dolby Vision']+'">'); else if (b.hdr) $qBox.append('<img src="'+svgIcons['HDR']+'">');
                    if (b.ukr) $qBox.append('<img src="'+svgIcons['UKR']+'">');
                }
            });
        }
    }

    function startPosterSlideshow($poster, items) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) return;
        var index = 0; clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/w780' + items[index].file_path);
            var $current = $poster.find('img').first();
            var nextImg = new Image();
            nextImg.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity: 0; transition: opacity 1.5s ease-in-out; position:absolute; top:0; left:0;">');
                $poster.append($next);
                setTimeout(function() { $next.css('opacity', '1'); $current.css('opacity', '0'); setTimeout(function(){ $current.remove(); }, 1500); }, 100);
            }; nextImg.src = imgUrl;
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000')));
    }

    /**
     * НАЛАШТУВАННЯ
     */
    function setupSettings() {
        Lampa.SettingsApi.addComponent({ component: 'mobile_interface', name: 'Мобільний інтерфейс', icon: PLUGIN_ICON });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Анімація постера' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_ui_anim', type: 'trigger', default: true }, field: { name: 'Анімація елементів' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true }, field: { name: 'Слайд-шоу постера' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '100': 'Малий', '125': 'Середній', '150': 'Великий' }, default: '125' }, field: { name: 'Розмір логотипу' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_studios', type: 'trigger', default: true }, field: { name: 'Показувати студії' } });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_quality', type: 'trigger', default: true }, field: { name: 'Показувати якість' } });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(function() { renderContent(e); });
            }
        });
    }

    function startPlugin() {
        applyStyles();
        setupSettings();
        init();
        // Вимикаємо розмиття постера в налаштуваннях Lampa для кращого вигляду
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });

})();
