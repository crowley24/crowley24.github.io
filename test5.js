(function () {  
    'use strict';  
  
    var detailsCache = {};  
    var imageCache = {}; // url -> true (завантажено)  
    var currentActiveId = null;  
    var TMDB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg';  
    var badgePath = 'https://crowley24.github.io/Icons/';  
  
    var LOGO_SIZES = { '50': 60, '80': 100, '120': 160, '160': 220, '210': 280 };  
  
    var settings_list = [  
        { id: 'movie_card_logo_enabled', default: true },  
        { id: 'movie_card_logo_studio', default: true },  
        { id: 'movie_card_logo_tagline', default: true },  
        { id: 'movie_card_logo_size', default: '120' },  
        { id: 'movie_card_logo_quality', default: 'w500' },  
        { id: 'movie_card_logo_anim', default: true },  
        { id: 'movie_card_quality_badges', default: true }  
    ];  
  
    settings_list.forEach(function (opt) {  
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') Lampa.Storage.set(opt.id, opt.default);  
    });  
  
    var eliteBadgesConfig = [  
        { id: '4k', pattern: /\b(4k|2160p|uhd|ultra\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/4k_ultra_hd.png', group: 'resolution', priority: 3 },  
        { id: '1080p', pattern: /\b(1080p|fhd|full\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/1080p_full_hd.png', group: 'resolution', priority: 2 },  
        { id: '720p', pattern: /\b720p\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/720p_hd.png', group: 'resolution', priority: 1 },  
        { id: 'dv', pattern: /\b(dolby\s*vision|dovi|dv)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_vision.png' },  
        { id: 'hdr', pattern: /\b(hdr10\+|hdr10|hdr)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/hdr.png', group: 'hdr' },  
        { id: 'atmos', pattern: /\b(dolby\s*atmos|atmos)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_atmos.png' },  
        { id: 'dts', pattern: /\bdts\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts.png' }  
    ];  
  
    // попереднє завантаження картинки в кеш браузера  
    function preloadImage(url, cb) {  
        if (imageCache[url]) { if (cb) cb(true); return; }  
        var img = new Image();  
        img.onload = function () { imageCache[url] = true; if (cb) cb(true); };  
        img.onerror = function () { if (cb) cb(false); };  
        img.src = url;  
    }  
  
    // розширена перевірка: темне монохромне -> інверт; майже прозоре/біле без кольору -> тінь  
    function analyzeLogo(imgSrc, callback) {  
        var img = new Image();  
        img.crossOrigin = 'Anonymous';  
        img.onload = function () {  
            try {  
                var canvas = document.createElement('canvas');  
                var ctx = canvas.getContext('2d');  
                canvas.width = 40; canvas.height = 40;  
                ctx.drawImage(img, 0, 0, 40, 40);  
                var data = ctx.getImageData(0, 0, 40, 40).data;  
                var bright = 0, count = 0, hasColor = false;  
                for (var i = 0; i < data.length; i += 4) {  
                    if (data[i + 3] > 50) {  
                        var r = data[i], g = data[i + 1], b = data[i + 2];  
                        bright += (r * 299 + g * 587 + b * 114) / 1000;  
                        count++;  
                        if (Math.max(r, g, b) - Math.min(r, g, b) > 30) hasColor = true;  
                    }  
                }  
                var avg = count ? bright / count : 255;  
                callback({ dark: avg < 110 && !hasColor, white: avg > 220 && !hasColor });  
            } catch (e) { callback({ dark: false, white: false }); }  
        };  
        img.onerror = function () { callback({ dark: false, white: false }); };  
        img.src = imgSrc;  
    }  
  
    function logoSizePx() {  
        var v = String(Lampa.Storage.get('movie_card_logo_size', '120'));  
        return LOGO_SIZES[v] || 160;  
    }  
  
    function rateColor(rating) {  
        if (rating >= 7) return '#3fd97f';  
        if (rating >= 5) return '#f5c518';  
        return '#e34b4b';  
    }
     function applyStyles() {  
        var style = document.getElementById('movie-card-logo-styles');  
        if (!style) {  
            style = document.createElement('style');  
            style.id = 'movie-card-logo-styles';  
            document.head.appendChild(style);  
        }  
  
        var lHeight = logoSizePx();  
        var anim = Lampa.Storage.get('movie_card_logo_anim', true);  
        var css = '';  
  
        if (anim) {  
            css += '@keyframes logoIn { 0% { opacity: 0; transform: translateY(18px) scale(0.95); filter: blur(6px); } 100% { opacity: 1; transform: none; filter: none; } } ';  
        }  
  
        css += '.full-start-new__head, .full-start-new__status, .full-start__status { display: none !important; } ';  
        css += '.logo-top-wrap { display: flex; flex-direction: column; align-items: flex-start; width: 100%; margin-top: -0.4em; } ';  
        css += '.logo-top-wrap .full-start-new__title { font-size: 1em !important; max-height: none !important; overflow: visible !important; max-width: 100% !important; margin: 0 0 2px 0 !important; } ';  
  
        // лого: обмеження і по висоті, і по ширині вікна  
        css += '.logo-top-wrap .full-start-new__title img { max-height: ' + lHeight + 'px !important; max-width: 40vw !important; width: auto !important; height: auto !important; object-fit: contain !important; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.9)); ' + (anim ? 'animation: logoIn 0.7s cubic-bezier(0.16,1,0.3,1) both; ' : '') + '} ';  
  
        css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.85em !important; font-style: italic; color: rgba(255,255,255,0.75) !important; margin: 0 0 6px 0 !important; } ';  
        css += '.logo-top-wrap .full-start-new__details { margin-top: 1.6em !important; font-size: 0.9em !important; font-weight: 400 !important; color: rgba(255,255,255,0.75) !important; letter-spacing: 0.03em !important; } ';  
  
        css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.2em !important; z-index: 10 !important; background: none !important; } ';  
        css += '.full-start-new__rate-line > :not(.tmdb-rate-badge):not(.mcl-quality-row), .full-start__rate-line > :not(.tmdb-rate-badge):not(.mcl-quality-row) { display: none !important; } ';  
        css += '.full-start .info__rate { display: none !important; } ';  
        css += '.tmdb-rate-badge { display: flex; align-items: center; gap: 8px; } ';  
        css += '.tmdb-rate-badge img { height: 1.1em; width: auto; } ';  
        css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';  
  
        // бейджі якості — колонка під рейтингом  
        css += '.mcl-quality-row { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 8px; } ';  
        css += '.mcl-quality-row .mcl-qitem img { height: 1.1em; width: auto; max-width: 60px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8)); } ';  
  
        css += '.studio-header-brand { display: flex; align-items: center; margin-bottom: 4px !important; } ';  
        css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
        css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
        css += '.studio-header-brand img.is-white-logo { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.95)) drop-shadow(0 0 8px rgba(0,0,0,0.5)) !important; } ';  
  
        css += '.card-tweaks__buttons { display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 0.6em; width: 100%; margin-top: 1em; padding-bottom: 4px; } ';  
        css += '.card-tweaks__buttons .full-start__button, .card-tweaks__buttons .full-start-new__button { flex-shrink: 0; } ';  
  
        style.textContent = css;  
    }  
  
    // миттєве оновлення на відкритій картці без перезаходу  
    function refreshActiveCard() {  
        try {  
            var act = Lampa.Activity.active();  
            if (act && act.component === 'full') {  
                var $render = act.activity.render();  
                applyStyles();  
                $render.find('.logo-top-wrap .full-start-new__title img').css('max-height', logoSizePx() + 'px');  
            }  
        } catch (e) {}  
    }  
  
    function rebuildLayout($render, rating) {  
        var $title = $render.find('.full-start-new__title').first();  
        var $wrap = $render.find('.logo-top-wrap');  
        if ($title.length) {  
            if (!$wrap.length) {  
                $wrap = $('<div class="logo-top-wrap"></div>');  
                $title.before($wrap);  
            }  
            ['.full-start-new__title', '.full-start-new__tagline', '.full-start-new__details'].forEach(function (sel) {  
                var $el = $render.find(sel).first();  
                if ($el.length && $el.parent()[0] !== $wrap[0]) $wrap.append($el);  
            });  
        }  
  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
            $rate.prepend('<div class="tmdb-rate-badge"><img src="' + TMDB_LOGO_URL + '" alt="TMDB"><span class="tmdb-rate-value" style="color:' + rateColor(rating) + '">' + rating.toFixed(1) + '</span></div>');  
        }  
  
        var $body = $render.find('.full-start-new__body, .full-start__body').first();  
        if ($body.length) {  
            var $wrapper = $render.find('.card-tweaks__buttons');  
            if (!$wrapper.length) $wrapper = $('<div class="card-tweaks__buttons"></div>');  
            $render.find('.full-start-new__buttons, .full-start__buttons, .buttons--container').each(function () {  
                if ($(this).parent()[0] !== $wrapper[0]) $wrapper.append(this);  
            });  
            if ($wrapper.children().length && $wrapper.parent()[0] !== $body.parent()[0]) $body.after($wrapper);  
        }  
    }
    function getQualityBadges(results) {  
        var found = [];  
        if (!results) return found;  
        var text = '';  
        results.slice(0, 15).forEach(function (it) { text += ' ' + (it.Title || it.title || ''); });  
  
        var matched = eliteBadgesConfig.filter(function (b) { return b.pattern.test(text); });  
        var best = null;  
        matched.forEach(function (b) {  
            if (b.group === 'resolution' && (!best || b.priority > best.priority)) best = b;  
        });  
        if (best) found.push(best);  
        matched.forEach(function (b) { if (b.group === 'audio') found.push(b); });  
        return found.slice(0, 4);  
    }  
  
    function renderQualityBadges($render, movie) {  
        if (!Lampa.Storage.get('movie_card_logo_quality_badges', true)) return;  
  
        var $line = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if (!$line.length) return;  
        if ($line.siblings('.elite-quality-badges').length) return;  
  
        var $badges = $('<div class="elite-quality-badges"></div>');  
        var qualityUrl = Lampa.Api.source + '/lite/' +  
            (movie.name || movie.first_air_date ? 'lampac' : 'lampac') +  
            '?postid=' + movie.id + '&title=' + encodeURIComponent(movie.title || movie.name || '');  
  
        // Беремо результати з кешу онлайн-джерел, якщо вони вже є  
        var results = [];  
        try {  
            var online = Lampa.Activity.active().component === 'full' && Lampa.Account.getOnlineResults  
                ? null : null;  
            results = (movie._quality_results || movie.online_results || []);  
        } catch (e) { results = []; }  
  
        var badges = getQualityBadges(results);  
  
        if (!badges.length) {  
            // Фолбек: визначаємо мінімум за vote/форматом — 4K/HD бейдж з назви джерела  
            if (movie.quality) badges = [{ label: movie.quality, color: '#01b4e4' }];  
        }  
  
        badges.forEach(function (b) {  
            $badges.append('<span class="elite-badge" style="border:1px solid ' + (b.color || '#01b4e4') +  
                ';color:' + (b.color || '#01b4e4') + ';padding:0.15em 0.5em;border-radius:0.35em;' +  
                'font-size:0.75em;font-weight:600;letter-spacing:0.05em;margin-right:0.4em;' +  
                'display:inline-block;">' + b.label + '</span>');  
        });  
  
        if ($badges.children().length) $line.after($badges);  
    }  
  
    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        var rating = parseFloat(data.vote_average || movie.vote_average || 0);  
        rebuildLayout($render, rating);  
  
        setTimeout(function () {  
            rebuildLayout($render, rating);  
            renderQualityBadges($render, movie);  
        }, 50);  
  
        // Слоган (укр → ru → en → fallback)  
        var taglineText = pickTagline(translations, data.tagline);  
        if (Lampa.Storage.get('movie_card_logo_tagline', true) && taglineText) {  
            var $tagline = $render.find('.full-start-new__tagline');  
            if (!$tagline.length) {  
                $tagline = $('<div class="full-start-new__tagline"></div>').text(taglineText);  
                var $titleEl = $render.find('.logo-top-wrap .full-start-new__title').first();  
                if ($titleEl.length) $titleEl.after($tagline);  
            } else {  
                $tagline.text(taglineText);  
            }  
        }  
  
        // Лого назви — прекеш + анімація появи  
        var titleEl = $render.find('.full-start-new__title').first();  
        if (titleEl.length && data.images && data.images.logos && data.images.logos.length) {  
            var logo = data.images.logos.find(function (l) { return l.iso_639_1 === 'uk'; }) ||  
                       data.images.logos.find(function (l) { return l.iso_639_1 === 'en'; }) ||  
                       data.images.logos[0];  
            if (logo && logo.file_path) {  
                var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
                var url = Lampa.TMDB.image('/t/p/' + quality + logo.file_path);  
                titleEl.text('').css({ 'max-height': 'none', 'overflow': 'visible' });  
  
                var $logo = $('<img class="logo-animate">').attr('src', url).css({  
                    'max-height': logoSizePx() + 'px',  
                    'max-width': '100%',  
                    'object-fit': 'contain',  
                    'opacity': '0'  
                });  
  
                if (imageCache[url]) {  
                    $logo.css('opacity', '1').addClass('logo-animate');  
                    $(titleEl).html($logo);  
                } else {  
                    var pre = new Image();  
                    pre.onload = function () {  
                        imageCache[url] = true;  
                        $logo.css('opacity', '1').addClass('logo-animate');  
                        $(titleEl).html($logo);  
                    };  
                    pre.src = url;  
                }  
            }  
        }  
  
        // Лого студії з фіксом "білих плям" (перевірка альфа + яскравості)  
        if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
            var studio = (data.networks || []).find(function (n) { return n.logo_path; }) ||  
                         (data.production_companies || []).find(function (c) { return c.logo_path; });  
            if (studio && studio.logo_path) {  
                var sUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
                var $brand = $('<div class="studio-header-brand logo-animate"><img alt="' + (studio.name || '') + '"></div>');  
                var $img = $brand.find('img');  
  
                isImageBright(sUrl, function (res) {  
                    if (res.invisible) { $brand.remove(); return; }  
                    $img.attr('src', sUrl);  
                    if (res.dark) $img.addClass('is-dark-logo');  
                    $render.find('.logo-top-wrap').prepend($brand);  
                });  
            }  
        }  
    }  
  
    function loadMovieDetails(movie, $render) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        var movieId = movie.id;  
        currentActiveId = movieId;  
  
        if (detailsCache[movieId]) {  
            applyMovieDetailsData(detailsCache[movieId].data, movie, $render, detailsCache[movieId].translations);  
            return;  
        }  
  
        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';  
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId +  
                  '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images&include_image_language=uk,en,null';  
        var transUrl = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '/translations?api_key=' + Lampa.TMDB.key();  
  
        $.when(  
            $.ajax({ url: url, type: 'GET', dataType: 'json' }),  
            $.ajax({ url: transUrl, type: 'GET', dataType: 'json' })  
        ).done(function (resData, resTrans) {  
            if (currentActiveId !== movieId) return;  
            var data = resData[0];  
            var translations = resTrans[0];  
            detailsCache[movieId] = { data: data, translations: translations };  
            applyMovieDetailsData(data, movie, $render, translations);  
        });  
    }  
  
    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'complite') {  
                var movie = e.data.movie, $render = e.object.activity.render();  
                loadMovieDetails(movie, $render);  
            }  
        });  
    }
Та налаштування + запуск (з refreshCurrentCard() для миттєвої зміни розміру):

    function refreshCurrentCard() {  
        try {  
            var act = Lampa.Activity.active();  
            if (act && act.component === 'full') {  
                var $render = act.activity.render();  
                var px = logoSizePx();  
                $render.find('.logo-top-wrap .full-start-new__title img')  
                       .css({ 'max-height': px + 'px', 'max-width': '100%' });  
            }  
        } catch (e) {}  
    }  
  
    function setupSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'movie_card_logo',  
            name: 'Картка',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" fill="white"/></svg>'  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_enabled', type: 'trigger', default: true },  
            field: { name: 'Увімкнути плагін' },  
            onChange: applyStyles  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_studio', type: 'trigger', default: true },  
            field: { name: 'Логотип студії' },  
            onChange: applyStyles  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
            field: { name: 'Слоган фільму' },  
            onChange: applyStyles  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_size', type: 'select',  
                values: { '60': 'Дуже малий', '90': 'Малий', '140': 'Стандартний', '200': 'Великий', '270': 'Дуже великий' },  
                default: '140'  
            },  
            field: { name: 'Розмір логотипа' },  
            onChange: function () { applyStyles(); refreshCurrentCard(); }  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_quality', type: 'select',  
                values: { 'w300': 'Низька (w300)', 'w500': 'Середня (w500)', 'w780': 'Висока (w780)', 'original': 'Оригінал' },  
                default: 'w500'  
            },  
            field: { name: 'Якість логотипа' },  
            onChange: applyStyles  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_quality_badges', type: 'trigger', default: true },  
            field: { name: 'Бейджі якості', description: '4K/HD/SD та звук під рейтингом' },  
            onChange: applyStyles  
        });  
    }  
  
    function startPlugin() {  
        applyStyles();  
        setupSettings();  
        init();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
})();
