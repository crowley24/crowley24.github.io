(function () {
    'use strict';

    var settings_list = [
        { id: 'tv_interface_animation', default: true },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_studios_bg_opacity', default: '0.15' },
        { id: 'tv_interface_quality', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_time', default: '10000' }
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

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var bgOpacity = Lampa.Storage.get('tv_interface_studios_bg_opacity', '0.15');
        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        
        /* Примусове приховування стандартних елементів */
        css += '.full-start-new__poster, .full-start-new__bg, .full-start-new__poster--blur { display: none !important; opacity: 0 !important; visibility: hidden !important; height: 0 !important; } ';
        
        /* Наш новий фон */
        css += '#plugin-tv-background { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; background: #000; overflow: hidden; pointer-events: none; } ';
        css += '.plugin-slide { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 2s ease-in-out; } ';
        
        if (Lampa.Storage.get('tv_interface_animation')) {
            css += '.plugin-slide-anim { animation: kenBurnsEffect 40s ease-in-out infinite; } ';
        }

        css += '.plugin-slide-mask { mask-image: linear-gradient(to right, #000 15%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%); ';
        css += '-webkit-mask-image: linear-gradient(to right, #000 15%, transparent 95%), linear-gradient(to bottom, #000 40%, transparent 100%); } ';
        
        /* Контент */
        css += '.full-start-new__right { background: none !important; position: relative; z-index: 10; margin-top: 20px !important; } ';
        css += '.plugin-info-block { display: flex; flex-direction: column; gap: 15px; margin-top: 25px; } ';
        css += '.studio-row, .quality-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; } ';
        css += '.studio-item { height: 42px; padding: 6px 14px; border-radius: 10px; background: rgba(255,255,255,' + bgOpacity + '); backdrop-filter: blur(10px); display: flex; align-items: center; } ';
        css += '.quality-item { height: 30px; } ';
        css += '.studio-item img, .quality-item img { height: 100%; width: auto; object-fit: contain; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    function getBest(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
        var limit = Math.min(results.length, 20);
        for (var i = 0; i < limit; i++) {
            var item = results[i];
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
            if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0 || title.indexOf(' dv ') >= 0) best.dolbyVision = true;
            if (title.indexOf('hdr') >= 0) best.hdr = true;
            if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
        }
        return best;
    }

    function startSlideshow(backdrops) {
        var $bg = $('#plugin-tv-background');
        if (!$bg.length) $bg = $('<div id="plugin-tv-background"></div>').appendTo('body');
        
        $bg.empty(); // Видаляємо все старе перед стартом
        clearInterval(slideshowTimer);
        
        var index = 0;
        var animClass = Lampa.Storage.get('tv_interface_animation') ? 'plugin-slide-anim' : '';

        function nextSlide() {
            if (backdrops.length === 0) return;
            var imgUrl = Lampa.TMDB.image('/t/p/original' + backdrops[index].file_path);
            var $newSlide = $('<img class="plugin-slide plugin-slide-mask ' + animClass + '" src="' + imgUrl + '">');
            
            $bg.append($newSlide);
            $newSlide.on('load', function() {
                $(this).css('opacity', '1');
                setTimeout(function() {
                    $bg.find('.plugin-slide').not($newSlide).remove();
                }, 2200);
            });

            index = (index + 1) % backdrops.length;
        }

        nextSlide();
        if (Lampa.Storage.get('tv_interface_slideshow') && backdrops.length > 1) {
            slideshowTimer = setInterval(nextSlide, parseInt(Lampa.Storage.get('tv_interface_slideshow_time', '10000')));
        }
    }

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') {
                clearInterval(slideshowTimer);
                $('#plugin-tv-background').empty().remove();
            }
            
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        // Логотип
                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                        if (logo) {
                            var logoUrl = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                            $render.find('.full-start-new__title').html('<img src="' + logoUrl + '" style="max-width: 450px; max-height: 140px; object-fit: contain;">');
                        }
                        // Слайдшоу
                        if (res.backdrops && res.backdrops.length > 0) {
                            startSlideshow(res.backdrops.slice(0, 15));
                        }
                    }
                });

                var $details = $render.find('.full-start-new__details');
                if ($details.length) {
                    $('.plugin-info-block').remove();
                    var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.append($infoBlock);

                    // Студії
                    var studios = (movie.networks || []).concat(movie.production_companies || []);
                    var addedLogos = [];
                    studios.forEach(s => {
                        if (s.logo_path && addedLogos.indexOf(s.logo_path) === -1) {
                            addedLogos.push(s.logo_path);
                            $infoBlock.find('.studio-row').append('<div class="studio-item"><img src="' + Lampa.Api.img(s.logo_path, 'w200') + '"></div>');
                        }
                    });

                    // Якість
                    if (Lampa.Parser && Lampa.Parser.get) {
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

    function start() {
        applyStyles();
        
        Lampa.SettingsApi.addComponent({
            component: 'tv_interface',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>',
            name: 'TV Інтерфейс+'
        });

        initPlugin();
        
        // Постійне приховування сміття
        setInterval(function() {
            $('.full-start-new__poster, .full-start-new__bg, .full-start-new__poster--blur').css('display','none');
        }, 1500);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });

})();
