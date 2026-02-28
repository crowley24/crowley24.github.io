(function () {
    'use strict';

    /**
     * ПЕРЕМІННІ ТА КЕШУВАННЯ
     */
    var logoCache = {}; 
    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    
    // Повний список налаштувань
    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_slideshow_quality', default: 'w780' },
        { id: 'mobile_interface_logo_size_v2', default: '150' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '10px' },
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

    /**
     * СТИЛІ ІНТЕРФЕЙСУ (CSS)
     * Реалізація пунктів: 1 (Відступи), 2 (Тіні), 4 (Glassmorphism), 5 (Анімація)
     */
    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isAnim = Lampa.Storage.get('mobile_interface_animation');
        var bgOp = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        var lH = Lampa.Storage.get('mobile_interface_logo_size_v2', '150'); 
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '10px');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '';
        css += '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.11); } 100% { transform: scale(1); } } ';
        css += '@keyframes slideUpFadeIn { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } } ';
        
        css += '@media screen and (max-width: 480px) { ';
        // Приховуємо стандартні елементи Lampa
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"] { display:none !important; } ';
        css += '.rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        css += '.background { background: #000 !important; } ';
        
        // Постер та анімація Ken Burns
        css += '.full-start-new__poster { height: 65vh !important; background: #000; position: relative; overflow: hidden; pointer-events: none; z-index: 1; } ';
        css += '.full-start-new__poster img { width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; ' + (isAnim ? 'animation: kenBurnsEffect 30s ease-in-out infinite;' : '') + ' mask-image: linear-gradient(to bottom, #000 60%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%); transition: opacity 1.5s ease-in-out; } ';
        
        // Основний контейнер контенту
        css += '.full-start-new__right { background: none !important; margin-top: -155px !important; z-index: 2; display: flex !important; flex-direction: column; align-items: center; padding: 0 12px; gap: ' + blocksGap + ' !important; } ';
        
        // Логотип з тінню та анімацією
        css += '.full-start-new__title { width: 100%; display: flex; justify-content: center; align-items: center; min-height: 70px; order: 2; overflow: visible !important; } ';
        css += '.full-start-new__title img { height: auto; max-height: ' + lH + 'px !important; width: auto; max-width: 85vw; object-fit: contain; filter: drop-shadow(0 0 20px rgba(0,0,0,0.85)); animation: slideUpFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; } ';
        
        // Слоган
        css += '.full-start-new__tagline { font-style: italic; opacity: 0; text-align: center; order: 3; animation: slideUpFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.1s; color: rgba(255,255,255,0.9) !important; font-size: 1.05em !important; margin: 0 !important; } ';
        
        // Ряд рейтингів, тривалості та жанру
        css += '.plugin-ratings-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 14px; font-size: calc(' + rSize + ' * 2.8); width: 100%; order: 4; opacity: 0; animation: slideUpFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s; } ';
        css += '.plugin-rating-item { display: flex; align-items: center; gap: 6px; font-weight: 700; } ';
        css += '.plugin-extra-info { font-weight: 400; opacity: 0.85; white-space: nowrap; } ';
        
        // Студії та якість
        css += '.plugin-info-block { display: flex; flex-direction: column; align-items: center; gap: ' + blocksGap + '; width: 100%; order: 5; opacity: 0; animation: slideUpFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.3s; } ';
        css += '.studio-row, .quality-row { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 9px; width: 100%; } ';
        css += '.studio-item { height: 3.2em; padding: 6px 14px; border-radius: 12px; background: rgba(255,255,255,' + bgOp + '); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.05); } ';
        css += '.quality-item { height: 2.8em; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';
        
        // Кнопки дій (Glassmorphism)
        css += '.full-start-new__buttons { display: flex !important; justify-content: center; gap: 12px; width: 100%; order: 6; opacity: 0; animation: slideUpFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s; padding-bottom: 25px; margin-top: 5px !important; } ';
        css += '.full-start-new .full-start__button { background: rgba(255,255,255,0.08) !important; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px !important; border: 1px solid rgba(255,255,255,0.1) !important; width: 72px !important; height: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; padding: 12px 4px !important; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important; } ';
        css += '.full-start-new .full-start__button.focus { background: rgba(255,255,255,0.22) !important; transform: scale(1.12); border-color: rgba(255,255,255,0.4) !important; box-shadow: 0 8px 25px rgba(0,0,0,0.4) !important; } ';
        css += '.full-start-new .full-start__button svg, .full-start-new .full-start__button img { width: 26px !important; height: 26px !important; margin-bottom: 6px !important; fill: #fff !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 8px !important; text-transform: uppercase !important; letter-spacing: 0.5px; opacity: 0.8 !important; font-weight: 600; } ';
        css += '} ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * ЛОГІКА РЕЙТИНГІВ ТА ЖАНРІВ (Пункт 3: Розумні жанри)
     */
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7.6) return '#2ecc71';
        if (n >= 6.1) return '#feca57';
        if (n > 0) return '#ff4d4d';
        return '#fff';
    }

    function renderRatings(container, e) {
        container.find('.plugin-ratings-row').remove();
        var movie = e.data.movie;
        var $row = $('<div class="plugin-ratings-row"></div>');
        
        // TMDB Рейтинг
        var tmdb = parseFloat(movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) {
            $row.append('<div class="plugin-rating-item"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg" style="height:1.1em"> <span style="color:'+ getRatingColor(tmdb) +'">'+tmdb+'</span></div>');
        }

        // CUB Рейтинг (якщо є)
        if (e.data.reactions && e.data.reactions.result) {
            var sum = 0, cnt = 0;
            var coef = { fire: 10, nice: 8, think: 5, bore: 3, shit: 1 };
            e.data.reactions.result.forEach(function(r) { if(r.counter){ sum += (r.counter * coef[r.type]); cnt += r.counter; } });
            if (cnt > 5) {
                var cub = ((sum / cnt)).toFixed(1);
                $row.append('<div class="plugin-rating-item"><img src="https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg" style="height:1.1em"> <span style="color:'+getRatingColor(cub)+'">'+cub+'</span></div>');
            }
        }
        
        // Розумний вибір жанру та тривалість
        var priority = ['Бойовик', 'Фантастика', 'Комедія', 'Жахи', 'Трилер', 'Пригоди', 'Мультфільм'];
        var genreList = (movie.genres || []).map(function(g){ return g.name; });
        var bestGenre = genreList.find(function(g){ return priority.indexOf(g) > -1; }) || genreList[0] || '';
        
        var runtime = '';
        if (movie.runtime) runtime = Math.floor(movie.runtime/60)+'г '+(movie.runtime%60)+'хв';
        else if (movie.episode_run_time && movie.episode_run_time.length) runtime = movie.episode_run_time[0] + 'хв';

        if (runtime || bestGenre) {
            var infoText = (runtime ? runtime : '') + (runtime && bestGenre ? ' • ' : '') + bestGenre;
            $row.append('<div class="plugin-extra-info">' + infoText + '</div>');
        }
        
        var $target = container.find('.full-start-new__tagline');
        if (!$target.length || !Lampa.Storage.get('mobile_interface_show_tagline')) $target = container.find('.full-start-new__title');
        $target.after($row);
    }

    /**
     * СТУДІЇ ТА АНАЛІЗ КОЛЬОРУ
     */
    function renderStudioLogos(container, data) {
        if (!Lampa.Storage.get('mobile_interface_studios')) return;
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(function(source) {
            if (source) source.forEach(function(item) {
                if (item.logo_path) {
                    var url = Lampa.Api.img(item.logo_path, 'w200');
                    if (!logos.some(function(l){ return l.url === url; })) logos.push({url: url, name: item.name});
                }
            });
        });

        logos.slice(0, 4).forEach(function(logo) {
            var id = 'st_' + Math.random().toString(36).substr(2, 9);
            var $el = $('<div class="studio-item" id="'+id+'"><img src="'+logo.url+'" alt="'+logo.name+'"></div>');
            container.append($el);
            
            var img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = this.width; canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                try {
                    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var r=0, g=0, b=0, count=0;
                    for (var i = 0; i < imageData.length; i += 4) {
                        if (imageData[i+3] > 50) { r += imageData[i]; g += imageData[i+1]; b += imageData[i+2]; count++; }
                    }
                    if (count > 0 && (0.299*r + 0.587*g + 0.114*b) / count < 50) {
                        $('#' + id + ' img').css('filter', 'brightness(0) invert(1)');
                    }
                } catch(e) {}
            };
            img.src = logo.url;
        });
    }

    /**
     * ПАРСИНГ ЯКОСТІ
     */
    function getBestResults(results) {
        var b = { res: '', hdr: false, dv: false, dub: false, ukr: false };
        results.slice(0, 20).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr') > -1 || t.indexOf('укр') > -1) b.ukr = true;
            if (t.indexOf('4k') > -1 || t.indexOf('2160') > -1) b.res = '4K';
            else if (!b.res && (t.indexOf('1080') > -1)) b.res = 'FULL HD';
            else if (!b.res && (t.indexOf('720') > -1)) b.res = 'HD';
            if (t.indexOf('hdr') > -1) b.hdr = true;
            if (t.indexOf('vision') > -1 || t.indexOf(' dv ') > -1) b.dv = true;
            if (t.indexOf('dub') > -1 || t.indexOf('дуб') > -1) b.dub = true;
        });
        return b;
    }

    /**
     * ЛОГО ТА СЛАЙДШОУ TMDB
     */
    function loadMovieLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) { $container.html('<img src="' + logoCache[movieId] + '">'); return; }
        
        var url = 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key();
        $.ajax({
            url: url,
            method: 'GET',
            success: function(res) {
                if (res.logos && res.logos.length > 0) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    var logo = res.logos.filter(function(l){ return l.iso_639_1 === lang; })[0] || 
                               res.logos.filter(function(l){ return l.iso_639_1 === 'en'; })[0] || 
                               res.logos[0];
                    if (logo) {
                        var imgHost = 'https://image.tmdb.org/t/p/' + Lampa.Storage.get('mobile_interface_logo_quality', 'w500');
                        var logoUrl = imgHost + logo.file_path.replace('.svg', '.png');
                        logoCache[movieId] = logoUrl;
                        $container.html('<img src="' + logoUrl + '">');
                    }
                }
                if (res.backdrops && res.backdrops.length > 1 && Lampa.Storage.get('mobile_interface_slideshow')) {
                    startPosterSlideshow($('.full-start-new__poster'), res.backdrops.slice(0, 15));
                }
            }
        });
    }

    function startPosterSlideshow($poster, items) {
        var index = 0;
        clearInterval(slideshowTimer);
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        var quality = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780');

        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = 'https://image.tmdb.org/t/p/' + quality + items[index].file_path;
            var $current = $poster.find('img').first();
            
            var nextImg = new Image();
            nextImg.onload = function() {
                var $next = $('<img src="' + imgUrl + '" style="opacity: 0;">');
                $poster.append($next);
                setTimeout(function(){
                    $next.css('opacity', '1');
                    $current.css('opacity', '0');
                    setTimeout(function(){ $current.remove(); }, 1500);
                }, 100);
            };
            nextImg.src = imgUrl;
        }, interval);
    }

    /**
     * ПІДКЛЮЧЕННЯ СЛУХАЧА LAMPA
     */
    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                loadMovieLogo(movie, $render.find('.full-start-new__title'));
                renderRatings($render.find('.full-start-new__right'), e);
                
                $('.plugin-info-block').remove();
                var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                $render.find('.full-start-new__right').append($info);
                
                renderStudioLogos($info.find('.studio-row'), movie);
                
                if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && res.Results) {
                            var b = getBestResults(res.Results);
                            var list = [];
                            if (b.res) list.push(b.res);
                            if (b.dv) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                            if (b.dub) list.push('DUB');
                            if (b.ukr) list.push('UKR');
                            
                            list.forEach(function(iconKey) {
                                if (svgIcons[iconKey]) {
                                    $info.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[iconKey]+'"></div>');
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    /**
     * НАЛАШТУВАННЯ
     */
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            name: 'Мобільний інтерфейс',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },
            field: { name: 'Анімація Ken Burns' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '125': 'Малий', '150': 'Середній', '180': 'Великий', '210': 'Дуже великий' }, default: '150' },
            field: { name: 'Розмір логотипу' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_blocks_gap', type: 'select', values: { '6px': 'Мінімальні', '10px': 'Стандартні', '16px': 'Великі' }, default: '10px' },
            field: { name: 'Відступи між блоками' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу фону' }
        });

        Lampa.SettingsApi.addParam({
            component: 'mobile_interface',
            param: { name: 'mobile_interface_quality', type: 'trigger', default: true },
            field: { name: 'Показувати якість' }
        });
    }

    function startPlugin() {
        applyStyles();
        setupSettings();
        init();
        // Вимикаємо стандартне розмиття Lampa для мобільних
        setInterval(function () {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
