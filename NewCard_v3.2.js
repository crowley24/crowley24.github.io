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
        { id: 'mobile_interface_logo_size_v2', default: '150' },
        { id: 'mobile_interface_logo_quality', default: 'w500' },
        { id: 'mobile_interface_show_tagline', default: true },
        { id: 'mobile_interface_blocks_gap', default: '12px' },
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

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var isPosterAnim = Lampa.Storage.get('mobile_interface_animation');
        var isUIAnim = Lampa.Storage.get('mobile_interface_ui_anim');
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity', '0.15');
        var rSize = Lampa.Storage.get('mobile_interface_ratings_size', '0.45em');
        var lHeight = Lampa.Storage.get('mobile_interface_logo_size_v2', '150'); 
        var showTagline = Lampa.Storage.get('mobile_interface_show_tagline');
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap', '12px');
        
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        
        var css = '';
        css += '@keyframes kenBurnsCustom { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes ui_reveal { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } } ';
        
        // Кастомний фон
        css += '.custom-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; background: #000; } ';
        css += '.custom-bg-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1.5s ease-in-out; ';
        css += (isPosterAnim ? 'animation: kenBurnsCustom 40s ease-in-out infinite; ' : '') + '} ';
        // Netflix-style градієнт: затемнення зліва та знизу
        css += '.custom-bg-layer::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at 20% 70%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%), linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%), linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 40%); } ';

        css += '.full-start-new__poster, .background { display: none !important; } ';
        css += '.full-start-new__details, .full-start__info, .full-start__age, .full-start-new__age, .full-start__status, .full-start-new__status, [class*="age"], [class*="pg"], [class*="rating-count"], [class*="status"], .rate--tmdb, .rate--imdb, .rate--kp, .full-start__rates { display: none !important; } ';
        
        // ПОЗИЦІОНУВАННЯ NETFLIX (Ліворуч знизу)
        css += '.full-start-new__right { position: absolute !important; bottom: 8vh !important; left: 5vw !important; width: 45% !important; z-index: 2 !important; background: none !important; display: flex !important; flex-direction: column !important; align-items: flex-start !important; text-align: left !important; gap: ' + blocksGap + ' !important; } ';
        
        var uiAnimClass = isUIAnim ? 'animation: ui_reveal 0.8s ease-out forwards; opacity: 0; ' : '';

        css += '.full-start-new__title { ' + uiAnimClass + ' order: 1; width: 100%; display: flex; justify-content: flex-start; margin-bottom: 10px !important; } ';
        css += '.full-start-new__title img { max-height: ' + lHeight + 'px !important; width: auto; filter: drop-shadow(0 0 20px rgba(0,0,0,0.5)); } ';
        
        css += '.plugin-info-block { ' + uiAnimClass + ' animation-delay: 0.1s; order: 2; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; } ';
        css += '.plugin-ratings-row { display: flex; align-items: center; gap: 15px; font-size: calc(' + rSize + ' * 3); color: #fff; font-weight: bold; } ';
        css += '.info-text-item { opacity: 0.8; font-size: 0.9em; } ';

        css += '.full-start-new__tagline { ' + uiAnimClass + ' animation-delay: 0.2s; order: 3; display: ' + (showTagline ? 'block' : 'none') + ' !important; font-size: 1.2em !important; opacity: 0.9 !important; color: #fff !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8); max-width: 100%; } ';
        
        css += '.studio-row { order: 4; display: flex; gap: 10px; margin-top: 5px; } ';
        css += '.studio-item { height: 1.8em; padding: 5px 12px; border-radius: 6px; background: rgba(255,255,255,'+bgOpacity+'); backdrop-filter: blur(10px); } ';
        css += '.studio-item img { height: 100%; filter: brightness(0) invert(1); } ';

        css += '.quality-row-inline { ' + uiAnimClass + ' animation-delay: 0.3s; order: 5; display: flex; gap: 8px; margin-top: 5px; opacity: 0.8; } ';
        css += '.quality-item { height: 1.2em; } ';
        css += '.quality-item img { height: 100%; } ';

        css += '.full-start-new__buttons { ' + uiAnimClass + ' animation-delay: 0.4s; order: 6; display: flex !important; justify-content: flex-start !important; gap: 15px !important; margin-top: 20px !important; } ';
        css += '.full-start-new .full-start__button { background: #fff !important; color: #000 !important; border-radius: 4px !important; flex-direction: row !important; padding: 10px 25px !important; width: auto !important; min-width: 140px !important; } ';
        css += '.full-start-new .full-start__button.focus { background: #e50914 !important; color: #fff !important; transform: scale(1.05); } ';
        css += '.full-start-new .full-start__button svg { width: 22px !important; height: 22px !important; margin: 0 10px 0 0 !important; fill: currentColor !important; } ';
        css += '.full-start-new .full-start__button span { font-size: 14px !important; text-transform: none !important; font-weight: bold !important; opacity: 1 !important; } ';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // --- ФУНКЦІОНАЛ (БЕЗ ЗМІН) ---
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7.5) return '#46d369'; // Netflix green
        if (n >= 6) return '#feca57';
        return '#ff4d4d';
    }

    function getCubRating(e) {
        if (!e.data || !e.data.reactions || !e.data.reactions.result) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        e.data.reactions.result.forEach(function(r) {
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }
        });
        if (cnt >= 5) {
            var isTv = e.object.method === 'tv', avg = isTv ? 7.4 : 6.5, m = isTv ? 50 : 150;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
        return null;
    }

    function renderRatings(container, e) {
        var $row = $('<div class="plugin-ratings-row"></div>');
        var tmdb = parseFloat(e.data.movie.vote_average || 0).toFixed(1);
        if (tmdb > 0) $row.append('<div class="plugin-rating-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');
        
        var cub = getCubRating(e);
        if (cub) $row.append('<div class="plugin-rating-item"><img src="'+ratingIcons.cub+'"> <span style="color:'+getRatingColor(cub)+'">'+cub+'</span></div>');

        var year = (e.data.movie.release_date || e.data.movie.first_air_date || '').split('-')[0];
        if (year) $row.append('<span class="info-text-item">'+year+'</span>');

        var runtime = e.data.movie.runtime || (e.data.movie.episode_run_time ? e.data.movie.episode_run_time[0] : 0);
        if (runtime) $row.append('<span class="info-text-item">'+runtime+' хв</span>');
        
        container.find('.plugin-info-block').prepend($row);
    }

    function renderStudioLogos(container, data) {
        var source = (data.networks || []).concat(data.production_companies || []);
        source.filter(i => i.logo_path).slice(0, 3).forEach(function(item) {
            container.append('<div class="studio-item"><img src="'+Lampa.Api.img(item.logo_path, 'w200')+'"></div>');
        });
    }

    function startCustomSlideshow($container, items) {
        if (!Lampa.Storage.get('mobile_interface_slideshow')) return;
        var index = 0; clearInterval(slideshowTimer);
        slideshowTimer = setInterval(function() {
            index = (index + 1) % items.length;
            var imgUrl = Lampa.TMDB.image('/t/p/original' + items[index].file_path);
            var $newImg = $('<img class="custom-bg-img" src="' + imgUrl + '">');
            $container.append($newImg);
            setTimeout(function() { 
                $newImg.css('opacity', '1');
                var $old = $container.find('.custom-bg-img').not($newImg);
                $old.css('opacity', '0');
                setTimeout(function() { $old.remove(); }, 2000);
            }, 150);
        }, parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000')));
    }

    function getBestResults(results) {
        var best = { resolution: null, hdr: false, dolbyVision: false, dub: false, ukr: false };
        results.slice(0, 15).forEach(function(item) {
            var t = (item.Title || '').toLowerCase();
            if (t.indexOf('ukr')>=0 || t.indexOf('укр')>=0) best.ukr = true;
            var res = t.indexOf('4k')>=0 ? '4K' : t.indexOf('1080')>=0 ? 'FULL HD' : null;
            if (res && (!best.resolution || res === '4K')) best.resolution = res;
            if (t.indexOf('vision')>=0) best.dolbyVision = true;
            if (t.indexOf('hdr')>=0) best.hdr = true;
        });
        return best;
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'destroy') clearInterval(slideshowTimer);
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie, $render = e.object.activity.render();
                var $customBg = $('<div class="custom-bg-layer"></div>');
                $render.prepend($customBg);

                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
                    success: function(res) {
                        if (movie.backdrop_path) $customBg.append('<img class="custom-bg-img" src="' + Lampa.TMDB.image('/t/p/original' + movie.backdrop_path) + '" style="opacity:1">');
                        var logo = res.logos.filter(l => l.iso_639_1 === (Lampa.Storage.get('language') || 'uk'))[0] || res.logos[0];
                        if (logo) $render.find('.full-start-new__title').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png')) + '">');
                        if (res.backdrops && res.backdrops.length > 1) startCustomSlideshow($customBg, res.backdrops.filter(b => b.aspect_ratio > 1.5).slice(0, 10));
                    }
                });

                var $right = $render.find('.full-start-new__right');
                var $info = $('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row-inline"></div></div>');
                $right.append($info);
                renderStudioLogos($info.find('.studio-row'), movie);
                renderRatings($right, e);

                if (Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && res.Results) {
                            var b = getBestResults(res.Results), list = [];
                            if (b.resolution) list.push(b.resolution);
                            if (b.dolbyVision) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');
                            if (b.ukr) list.push('UKR');
                            var $qRow = $render.find('.quality-row-inline');
                            list.forEach(function(t) { if (svgIcons[t]) $qRow.append('<div class="quality-item"><img src="'+svgIcons[t]+'"></div>'); });
                        }
                    });
                }
            }
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({ component: 'mobile_interface', name: 'Netflix Style UI', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/></svg>' });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_animation', type: 'trigger', default: true }, field: { name: 'Zoom-анімація фону' }, onChange: applyStyles });
        Lampa.SettingsApi.addParam({ component: 'mobile_interface', param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '120': 'Малий', '150': 'Середній', '200': 'Великий' }, default: '150' }, field: { name: 'Розмір логотипу' }, onChange: applyStyles });
    }

    function startPlugin() {
        applyStyles(); setupSettings(); init();
        setInterval(function () { if (window.lampa_settings) window.lampa_settings.blur_poster = false; }, 2000);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
