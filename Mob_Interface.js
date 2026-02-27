(function () {
    'use strict';

    // 1. Ініціалізація списку налаштувань (Повний список)
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_studios_bg_opacity', default: '0.15' },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' }, 
        { id: 'mobile_interface_slideshow_quality', default: 'w780' },
        { id: 'mobile_interface_ratings', default: true },
        { id: 'mobile_interface_ratings_size', default: '0.45em' },
        { id: 'mobile_interface_logo_quality', default: 'w500' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    
    // Іконки якості
    var svgIcons = {
        '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
    };

    // Іконки рейтингів
    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    // 2. Функція застосування CSS стилів
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } ';
        
        css += '@media screen and (max-width: 480px) { ';
        
        // Очищення інтерфейсу
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="status"] { display:none !important; } ';
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';

        // Стилі постера
        css += '.background { background: #000 !important; } ';
        css += '.full-start-new__poster { position: relative !important; overflow: hidden !important; background: #000; z-index: 1; height: 60vh !important; pointer-events: none !important; } ';
        css += '.full-start-new__poster img { ';
        css += (isAnimationEnabled ? 'animation: kenBurnsEffect 25s ease-in-out infinite !important; ' : '');
        css += 'transform-origin: center center !important; transition: opacity 1.5s ease-in-out !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; ';
        css += 'mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%) !important; } ';
        
        // Позиціонування контенту
        css += '.full-start-new__right { background: none !important; margin-top: -110px !important; z-index: 2 !important; display: flex !important; flex-direction: column !important; align-items: center !important; } ';
        
        // Логотип фільму (Ефект Преміум)
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: auto; margin-bottom: 0px; } ';
        css += '.full-start-new__title img { max-height: 100px; max-width: 85%; object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.8)); image-rendering: -webkit-optimize-contrast; } ';
        
        // Рейтинги
        css += '.plugin-ratings-row { display: flex; justify-content: center; align-items: center; gap: 12px; margin: 18px 0 2px; font-size: calc(' + rSize + ' * 2.8); width: 100%; } ';
        css += '.plugin-rating-item { display: flex; align-items: center; gap: 5px; font-weight: 600; color: #fff; line-height: 1; } ';
        css += '.plugin-rating-item img { height: 1em; width: auto; object-fit: contain; } ';

        // Слоган
        css += '.full-start-new__tagline { font-style: italic !important; opacity: 0.9 !important; font-size: 1.05em !important; margin: 5px 0 2px !important; color: #fff !important; text-align: center !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8); } ';
        
        // Кнопки
        css += '.full-start-new__buttons { display: flex !important; justify-content: center !important; gap: 8px !important; width: 100% !important; margin-top: 15px !important; flex-wrap: wrap !important; } ';
        css += '.full-start-new .full-start__button { background: none !important; border: none !important; box-shadow: none !important; padding: 4px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 54px !important; min-width: 0 !important; } ';
        css += '.full-start-new .full-start__button svg, .full-start-new .full-start__button img { width: 22px !important; height: 22px !important; margin-bottom: 4px !important; fill: #fff !important; } ';
        css += '.full-start-new .full-start__button span { display: block !important; font-size: 8px !important; font-weight: 500 !important; text-transform: uppercase !important; color: #fff !important; opacity: 0.6 !important; text-align: center !important; } ';

        // Студії та якість
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: 12px; margin: -14px 0 10px; width: 100%; padding: 0 !important; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 6px; width: 100%; } ';
        css += '.studio-item { height: 3.2em; opacity: 0; animation: qb_in 0.4s ease forwards; padding: 6px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: center; ';
        if (bgOpacity !== '0') {
            css += 'background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 2px 10px rgba(0,0,0,0.2); ';
        }
        css += '} ';
        css += '.quality-item { height: 2.2em; opacity: 0; animation: qb_in 0.4s ease forwards; } '; 
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // 3. Допоміжні функції
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7) return '#2ecc71';
        if (n >= 5) return '#feca57';
        if (n > 0) return '#ff4d4d';
        return '#fff';
    }

    function getCubRating(e) {
        if (!e.data || !e.data.reactions || !e.data.reactions.result) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        e.data.reactions.result.forEach(function(r) {
            if (r.counter) {
                sum += (r.counter * reactionCoef[r.type]);
                cnt += r.counter;
            }
        });
        if (cnt >= 10) {
            var isTv = e.object.method === 'tv';
            var avg = isTv ? 7.4 : 6.5;
            var m = isTv ? 60 : 200;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
        return null;
    }

    // 4. Функції рендерингу
    function renderRatings(container, e) {
        if (!Lampa.Storage.get('mobile_interface_ratings')) return;
        container.find('.plugin-ratings-row').remove();
        var $tagline = container.find('.full-start-new__tagline');
        var $row = $('<div class="plugin-ratings-row"></div>');
        var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);
        
        if (tmdb > 0) {
            $row.append('<div class="plugin-rating-item"><img src="'+ratingIcons.tmdb+'"><span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');
        }
        var cub = getCubRating(e);
        if (cub) {
            $row.append('<div class="plugin-rating-item"><img src="' + ratingIcons.cub + '"><span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');
        }
        if ($row.children().length > 0) {
            if ($tagline.length) $tagline.after($row);
            else container.find('.full-start-new__title').after($row);
        }
    }

    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        [data.networks, data.production_companies].forEach(function(source) {
            if (source) source.forEach(function(item) {
                if (item.logo_path) {
                    var url = Lampa.Api.img(item.logo_path, 'w200');
                    if (!logos.find(function(l){ return l.url === url; })) logos.push({ url: url, name: item.name });
                }
            });
        });

        logos.forEach(function(logo) {
            var id = 'lg_' + Math.random().toString(36).substr(2, 9);
            container.append('<div class="studio-item" id="'+id+'"><img src="'+logo.url+'"></div>');
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var d = ctx.getImageData(0,0,canvas.width,canvas.height).data, r=0, g=0, b=0, c=0;
                    for(var i=0; i<d.length; i+=4) { if(d[i+3]>50) { r+=d[i]; g+=d[i+1]; b+=d[i+2]; c++; } }
                    if(c > 0 && (0.299*(r/c)+0.587*(g/c)+0.114*(b/c)) < 35) $('#'+id+' img').css('filter', 'brightness(0) invert(1)');
                } catch(e){}
            };
            img.src = logo.url;
        });
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        results.slice(0, 20).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr')>=0 || t.indexOf('укр')>=0) best.ukr = true;
            var res = t.indexOf('4k')>=0 ? '4K' : t.indexOf('2k')>=0 ? '2K' : t.indexOf('1080')>=0 ? 'FULL HD' : t.indexOf('720')>=0 ? 'HD' : null;
            if (res && (!best.resolution || ['HD','FULL HD','2K','4K'].indexOf(res) > ['HD','FULL HD','2K','4K'].indexOf(best.resolution))) best.resolution = res;
            if (t.indexOf('vision')>=0) best.dolbyVision = true;
            if (t.indexOf('hdr')>=0) best.hdr = true;
            if (t.indexOf('dub')>=0) best.dub = true;
        });
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;
        var index = 0;
        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % backdrops.length;
            var q = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780');
            var imgUrl = Lampa.TMDB.image('/t/p/' + q + backdrops[index].file_path);
            var $current = $poster.find('img').first();
            var next = new Image();
            next.onload = function() {
                var $new = $('<img src="' + imgUrl + '" style="opacity: 0; z-index: -1;">');
                $poster.append($new);
                setTimeout(function() { $new.css('opacity', '1'); $current.css('opacity', '0'); setTimeout(function(){ $current.remove(); }, 1500); }, 100);
            };
            next.src = imgUrl;
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000')));
    }

    // 5. Ініціалізація плагіна
    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie, $render = e.object.activity.render(), $details = $render.find('.full-start-new__details');
                
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var q = Lampa.Storage.get('mobile_interface_logo_quality', 'w500');
                            $render.find('.full-start-new__title').html('<img src="' + Lampa.TMDB.image('/t/p/' + q + logo.file_path.replace('.svg', '.png')) + '">');
                        }
                        setTimeout(function(){ renderRatings($render.find('.full-start-new__right'), e); }, 200);
                        if (res.backdrops && res.backdrops.length > 1) startSlideshow($render.find('.full-start-new__poster'), res.backdrops.slice(0, 15));
                    }
                });

                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($info);
                    renderStudioLogos($info.find('.studio-row'), movie);
                    
                    if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                var b = getBest(res.Results), list = [];
                                if (b.resolution) list.push(b.resolution);
                                if (b.dolbyVision) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                                if (b.dub) list.push('DUB'); if (b.ukr) list.push('UKR');
                                list.forEach((t, i) => svgIcons[t] ? $info.find('.quality-row').append('<div class="quality-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[t]+'"></div>') : null);
                            }
                        });
                    }
                }
            }
        });
    }

    // 6. Реєстрація налаштувань
    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',
            name: 'Мобільний інтерфейс'
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_logo_quality', type: 'select', values: { 'w300': '300px', 'w500': '500px', 'original': 'Original' }, default: 'w500' },
            field: { name: 'Якість логотипу' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_ratings', type: 'trigger', default: true },
            field: { name: 'Рейтинги' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_ratings_size', type: 'select', values: { '0.4em': '0.4', '0.45em': '0.45', '0.5em': '0.5', '0.55em': '0.55' }, default: '0.45em' },
            field: { name: 'Розмір рейтингів' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація постера' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу фону' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow_time', type: 'select', values: { '10000': '10 сек', '15000': '15 сек', '20000': '20 сек' }, default: '10000' },
            field: { name: 'Інтервал слайд-шоу' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow_quality', type: 'select', values: { 'w780': '780px', 'w1280': '1280px', 'original': 'Original' }, default: 'w780' },
            field: { name: 'Якість фону слайд-шоу' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_studios', type: 'trigger', default: true },
            field: { name: 'Логотипи студій' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_studios_bg_opacity', type: 'select', values: { '0': 'Вимкнено', '0.15': 'Легка', '0.3': 'Середня', '0.5': 'Густа' }, default: '0.15' },
            field: { name: 'Фон студій' },
            onChange: function () { applyStyles(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_quality', type: 'trigger', default: true },
            field: { name: 'Значки якості' }
        });
    }

    // 7. Старт
    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        setInterval(function () { if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})(); 
