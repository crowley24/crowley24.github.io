(function () {
    'use strict';

    // 1. ПОВНИЙ СПИСОК НАЛАШТУВАНЬ
    var settings_list = [
        { id: 'tv_interface_animation', default: true, name: 'Анімація (Ken Burns)', desc: 'Ефект плавного зуму фону' },
        { id: 'tv_interface_slideshow', default: true, name: 'Слайд-шоу', desc: 'Автоматична зміна кадрів на фоні' },
        { id: 'tv_interface_slideshow_time', default: '10000', name: 'Інтервал слайдів', desc: 'Час відображення кадру в мілісекундах' },
        { id: 'tv_interface_studios', default: true, name: 'Логотипи студій', desc: 'Відображати виробників (Netflix, Warner Bros тощо)' },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15', name: 'Фон студій', desc: 'Прозорість підкладки для логотипів' },
        { id: 'tv_interface_quality', default: true, name: 'Значки якості', desc: 'Відображати 4K, HDR, UKR, Звук' }
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

    // 2. ФУНКЦІЯ АНАЛІЗУ ЯКОСТІ (ДЛЯ ІКОНОК)
    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        
        results.slice(0, 20).forEach(function(item) {
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
            else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';
            
            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
            
            if (item.ffprobe && Array.isArray(item.ffprobe)) {
                item.ffprobe.forEach(function(s) {
                    if (s.codec_type === 'video') {
                        if (s.side_data_list && JSON.stringify(s.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
                        if (s.color_transfer === 'smpte2084' || s.color_transfer === 'arib-std-b67') best.hdr = true;
                    }
                    if (s.codec_type === 'audio' && s.channels) {
                        var ch = parseInt(s.channels);
                        var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
                        if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
                    }
                });
            }
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        });
        if (best.dolbyVision) best.hdr = true;
        return best;
    }

    // 3. СТИЛІ (ПОВНЕ РОЗБЛОКУВАННЯ ТА МАСКИ)
    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var bgOpacity = Lampa.Storage.get('tv_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } } ';
        
        /* Розблокування стандартного контейнера */
        css += '.full-start-new__poster { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: -1 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; display: block !important; background: #000 !important; } ';
        css += '.full-start-new__poster img:not(.plugin-slide), .full-start-new__bg { display: none !important; } ';
        
        /* Наші слайди */
        css += '.plugin-slide { position: absolute !important; top: 0; left: 0; width: 100% !important; height: 100% !important; object-fit: cover !important; opacity: 0; transition: opacity 2.5s ease-in-out !important; } ';
        if (Lampa.Storage.get('tv_interface_animation')) {
            css += '.plugin-slide { animation: kenBurnsEffect 45s ease-in-out infinite !important; } ';
        }
        
        /* Градієнтна маска для читабельності тексту */
        css += '.plugin-slide { -webkit-mask-image: linear-gradient(to right, #000 15%, transparent 90%), linear-gradient(to bottom, #000 45%, transparent 100%) !important; } ';

        /* Інтерфейс контенту */
        css += '.full-start-new__right { background: none !important; z-index: 10 !important; position: relative !important; margin-top: 20px !important; } ';
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 15px; margin-top: 30px; } ';
        css += '.studio-row, .quality-row { display: flex; gap: 15px; flex-wrap: wrap; align-items: center; } ';
        css += '.studio-item { height: 44px; padding: 7px 15px; border-radius: 12px; background: rgba(255, 255, 255, ' + bgOpacity + '); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; } ';
        css += '.quality-item { height: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // 4. ЛОГІКА СЛАЙД-ШОУ
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
                }, 2600);
            });
            index = (index + 1) % backdrops.length;
        }

        nextSlide();
        if (Lampa.Storage.get('tv_interface_slideshow')) {
            var time = parseInt(Lampa.Storage.get('tv_interface_slideshow_time')) || 10000;
            slideshowTimer = setInterval(nextSlide, time);
        }
    }

    // 5. ІНІЦІАЛІЗАЦІЯ (ГОЛОВНИЙ ЦИКЛ)
    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $poster = $render.find('.full-start-new__poster');

                // А) Запит на лого та бекдропи
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Логотип фільму
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + logoUrl + '" style="max-width: 480px; max-height: 160px; object-fit: contain;">');
                        }
                        // Запуск слайдшоу
                        if (res.backdrops && res.backdrops.length > 0) {
                            startSlideshow($poster, res.backdrops.slice(0, 15));
                        }
                    }
                });

                // Б) Додавання студій та якості
                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.append($infoBlock);

                    // Студії (Netflix тощо)
                    if (Lampa.Storage.get('tv_interface_studios')) {
                        var studios = (movie.networks || []).concat(movie.production_companies || []);
                        var addedLogos = [];
                        studios.forEach(s => {
                            if (s.logo_path && addedLogos.indexOf(s.logo_path) === -1) {
                                addedLogos.push(s.logo_path);
                                $infoBlock.find('.studio-row').append('<div class="studio-item"><img src="' + Lampa.Api.img(s.logo_path, 'w200') + '"></div>');
                            }
                        });
                    }

                    // Якість через парсер
                    if (Lampa.Storage.get('tv_interface_quality') && Lampa.Parser && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                            if (res && res.Results) {
                                var best = getBest(res.Results);
                                var list = [];
                                if (best.resolution) list.push(best.resolution);
                                if (best.dolbyVision) list.push('Dolby Vision'); else if (best.hdr) list.push('HDR');
                                if (best.audio) list.push(best.audio);
                                if (best.dub) list.push('DUB');
                                if (best.ukr) list.push('UKR');
                                
                                list.forEach(type => {
                                    if (svgIcons[type]) $infoBlock.find('.quality-row').append('<div class="quality-item"><img src="'+svgIcons[type]+'"></div>');
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    // 6. РЕЄСТРАЦІЯ НАЛАШТУВАНЬ
    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'tv_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>',
            name: 'TV Інтерфейс+'
        });

        settings_list.forEach(function(opt) {
            Lampa.SettingsApi.addParam({
                component: 'tv_interface',
                param: { name: opt.id, type: (opt.id.indexOf('opacity') > -1 || opt.id.indexOf('time') > -1 ? 'select' : 'trigger'), default: opt.default },
                field: { name: opt.name, description: opt.desc },
                values: opt.id.indexOf('opacity') > -1 ? { '0': 'Вимкнено', '0.15': 'Легка', '0.3': 'Середня' } : 
                        opt.id.indexOf('time') > -1 ? { '5000': '5 сек', '10000': '10 сек', '20000': '20 сек' } : {},
                onChange: function() { applyStyles(); }
            });
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initPlugin();
        // Примусове вимкнення стандартного блюру
        setInterval(function() { 
            if (window.lampa_settings) window.lampa_settings.blur_poster = false;
            $('.full-start-new__bg').hide();
        }, 2000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
