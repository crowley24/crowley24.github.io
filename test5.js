(function () {  
    'use strict';  
  
    var detailsCache = {};  
    var imageCache = {}; // url -> true (завантажено)  
    var currentActiveId = null;  
    var TMDB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg';  
    var badgePath = 'https://crowley24.github.io/Icons/';  
  
    // Ключі = значення селекта в налаштуваннях  
    var LOGO_SIZES = { '60': 60, '90': 90, '140': 140, '200': 200, '270': 270 };  
  
    var settings_list = [  
        { id: 'movie_card_logo_enabled', default: true },  
        { id: 'movie_card_logo_studio', default: true },  
        { id: 'movie_card_logo_tagline', default: true },  
        { id: 'movie_card_logo_size', default: '140' },  
        { id: 'movie_card_logo_quality', default: 'w500' },  
        { id: 'movie_card_logo_quality_badges', default: true }  
    ];  
  
    settings_list.forEach(function (opt) {  
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {  
            Lampa.Storage.set(opt.id, opt.default);  
        }  
    });  
  
    // ---------- ХЕЛПЕРИ ----------  
  
    function logoSizePx() {  
        return LOGO_SIZES[String(Lampa.Storage.get('movie_card_logo_size', '140'))] || 140;  
    }  
  
    function rateColor(rating) {  
        if (rating >= 7) return '#3fd97f';  
        if (rating >= 5) return '#f5c518';  
        return '#e34b4b';  
    }  
  
    function pickTagline(translations, fallback) {  
        if (translations && translations.translations) {  
            var order = ['uk', 'ru', 'en'];  
            for (var i = 0; i < order.length; i++) {  
                var tr = translations.translations.find(function (t) {  
                    return t.iso_639_1 === order[i] && t.data && t.data.tagline && t.data.tagline.trim();  
                });  
                if (tr) return tr.data.tagline;  
            }  
        }  
        return fallback || '';  
    }  
  
    // Аналіз лого студії: темне (інвертувати) чи невидиме (прозоре/біле → не показувати)  
    function analyzeLogo(imgSrc, callback) {  
        var img = new Image();  
        img.crossOrigin = 'Anonymous';  
        img.onload = function () {  
            try {  
                var canvas = document.createElement('canvas');  
                var w = canvas.width = Math.min(img.width, 50);  
                var h = canvas.height = Math.min(img.height, 50);  
                var ctx = canvas.getContext('2d');  
                ctx.drawImage(img, 0, 0, w, h);  
                var d = ctx.getImageData(0, 0, w, h).data;  
                var totalA = 0, lightPx = 0, darkPx = 0, opaque = 0;  
                for (var i = 0; i < d.length; i += 4) {  
                    var a = d[i + 3];  
                    totalA += a;  
                    if (a > 40) {  
                        opaque++;  
                        var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];  
                        if (lum > 200) lightPx++;  
                        if (lum < 60) darkPx++;  
                    }  
                }  
                var pixels = w * h;  
                var avgAlpha = totalA / pixels;          // майже все прозоре  
                var whiteRatio = opaque ? lightPx / opaque : 0;  
                var darkRatio = opaque ? darkPx / opaque : 0;  
                callback({  
                    invisible: avgAlpha < 30 || whiteRatio > 0.85, // біле пляма / порожнеча  
                    dark: darkRatio > 0.6  
                });  
            } catch (e) { callback({ invisible: false, dark: false }); }  
        };  
        img.onerror = function () { callback({ invisible: true, dark: false }); };  
        img.src = imgSrc;  
    }  
  
    // Попереднє завантаження лого у кеш браузера → миттєва поява  
    function preloadImage(url) {  
        if (!url || imageCache[url]) return;  
        var pre = new Image();  
        pre.onload = function () { imageCache[url] = true; };  
        pre.src = url;  
    }  
  
    // Бейджі якості/звуку  
    var eliteBadgesConfig = [  
        { group: 'resolution', pattern: /2160p|4k|uhd|ultrahd/i, label: '4K', image: badgePath + '4k.png', color: '#e8b93f', priority: 100 },  
        { group: 'resolution', pattern: /1080p|fhd|fullhd/i,    label: 'FHD', image: badgePath + 'fhd.png', color: '#4a9eff', priority: 80 },  
        { group: 'resolution', pattern: /720p|hd/i,             label: 'HD',  image: badgePath + 'hd.png',  color: '#4a9eff', priority: 60 },  
        { group: 'resolution', pattern: /480p|sd/i,             label: 'SD',  image: badgePath + 'sd.png',  color: '#9e9e9e', priority: 40 },  
        { group: 'audio', pattern: /atmos/i,   label: 'ATMOS',   image: badgePath + 'atmos.png',   color: '#9b59b6' },  
        { group: 'audio', pattern: /dts[\s\-]*x|dts:x/i, label: 'DTS:X', image: badgePath + 'dtsx.png', color: '#e67e22' },  
        { group: 'audio', pattern: /dts/i,     label: 'DTS',     image: badgePath + 'dts.png',     color: '#e67e22' },  
        { group: 'audio', pattern: /5\.1/i,    label: '5.1',     image: badgePath + '51.png',      color: '#3498db' },  
        { group: 'audio', pattern: /7\.1/i,    label: '7.1',     image: badgePath + '71.png',      color: '#3498db' }  
    ];  
  
    // ---------- СТИЛІ ----------  
  
    function applyStyles() {  
        var style = document.getElementById('movie-card-logo-styles');  
        if (!style) {  
            style = document.createElement('style');  
            style.id = 'movie-card-logo-styles';  
            document.head.appendChild(style);  
        }  
  
        var showStudio  = Lampa.Storage.get('movie_card_logo_studio', true);  
        var showTagline = Lampa.Storage.get('movie_card_logo_tagline', true);  
        var isEnabled   = Lampa.Storage.get('movie_card_logo_enabled', true);  
  
        var css = '@keyframes logoIn { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } } ';  
  
        if (!isEnabled) {  
            css += '.logo-top-wrap { display: none !important; }';  
            css += '.full-start-new__title, .full-start-new__tagline, .full-start-new__head, .full-start-new__details { display: block !important; visibility: visible !important; }';  
        } else {  
            css += '.full-start-new__head { display: none !important; } ';  
            css += '.full-start__status { display: none !important; } ';  
            css += '.full-start-new__pg, .full-start__pg { display: none !important; } ';  
  
            css += '.logo-top-wrap { display: flex; flex-direction: column; margin-top: -0.4em; margin-bottom: 0.6em; } ';  
  
            // Скидання обрізки title: тема задає font-size 3.2em + max-height 2.6em + overflow:hidden  
            css += '.logo-top-wrap .full-start-new__title, .logo-top-wrap .full-start__title { font-size: 1em !important; max-height: none !important; max-width: 100% !important; overflow: visible !important; margin-bottom: 0 !important; line-height: 1.1 !important; } ';  
            css += '.logo-top-wrap .full-start-new__title img, .logo-top-wrap .full-start__title img { display: block; width: auto; max-width: 100%; object-fit: contain; animation: logoIn .45s ease both; } ';  
  
            // Слоган — компактний  
            css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.85em !important; margin: 0 !important; opacity: 0.8; } ';  
  
            // Рядок деталей — мінімалістичний  
            css += '.logo-top-wrap .full-start-new__details { margin-top: 1.4em !important; font-size: 0.9em !important; font-weight: 400 !important; color: rgba(255,255,255,0.75) !important; letter-spacing: 0.03em !important; } ';  
  
            // Рейтинг — правий верхній кут, без фону  
            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.5em !important; z-index: 60 !important; margin: 0 !important; background: none !important; padding: 0 !important; } ';  
            css += '.full-start-new__rate-line > :not(.tmdb-rate-badge), .full-start__rate-line > :not(.tmdb-rate-badge) { display: none !important; } ';  
            css += '.full-start .info__rate, .full-start-new .info__rate { display: none !important; } ';  
            css += '.tmdb-rate-badge { display: inline-flex !important; align-items: center !important; gap: 0.4em !important; } ';  
            css += '.tmdb-rate-badge img { height: 1.1em; width: auto; display: block; } ';  
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';  
  
            // Бейджі якості — під рейтингом  
            css += '.mcl-quality-row { position: absolute !important; top: 2.6em !important; right: 1.5em !important; z-index: 60 !important; display: flex; gap: 0.5em; align-items: center; } ';  
            css += '.mcl-quality-row img, .mcl-quality-row .mcl-qbadge { height: 1.4em; width: auto; display: inline-flex; align-items: center; padding: 0.15em 0.5em; border-radius: 0.3em; font-size: 0.8em; font-weight: 700; background: rgba(0,0,0,0.55); } ';  
  
            // Кнопки під постером, в один рядок  
            css += '.card-tweaks__buttons { width: 100%; margin-top: 1em; display: flex; flex-wrap: nowrap; gap: 0.5em; } ';  
            css += '.card-tweaks__buttons .full-start__button { flex-shrink: 0; margin: 0 !important; } ';  
  
            // Moved-рядки (вік) у деталях — як нативні  
            css += '.full-descr__info--moved { display: flex; } ';  
            css += '.full-descr__info--moved .full-descr__info-name { font-size: inherit !important; font-weight: inherit !important; color: inherit !important; opacity: 0.6; margin-right: 0.4em; } ';  
            css += '.full-descr__info--moved .full-descr__info-value { font-size: inherit !important; font-weight: inherit !important; color: inherit !important; } ';  
  
            // Лого студії  
            if (showStudio) {  
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; animation: logoIn .4s ease both; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            }  
        }  
        style.textContent = css;  
    }
    function rebuildLayout($render, rating) {  
        // 1. Wrap — першим у текстовій колонці .full-start-new__right  
        var $right = $render.find('.full-start-new__right').first();  
        if (!$right.length) return;  
  
        var $wrap = $render.find('.logo-top-wrap');  
        if (!$wrap.length) $wrap = $('<div class="logo-top-wrap"></div>');  
        if ($wrap.parent()[0] !== $right[0] || $wrap.index() !== 0) {  
            $right.prepend($wrap);  
        }  
  
        // 2. У wrap: title → tagline → details (жанри/тривалість)  
        ['.full-start-new__title', '.full-start-new__tagline', '.full-start-new__details'].forEach(function (sel) {  
            var $el = $render.find(sel).first();  
            if ($el.length && $el.parent()[0] !== $wrap[0]) {  
                $wrap.append($el);  
            }  
        });  
  
        // 3. Бейдж рейтингу TMDB: лого + кольорова цифра  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
            var color = rateColor(rating);  
            $rate.prepend(  
                '<span class="tmdb-rate-badge">' +  
                    '<img src="' + TMDB_LOGO_URL + '" alt="TMDB">' +  
                    '<span class="tmdb-rate-value" style="color:' + color + ';">' + rating.toFixed(1) + '</span>' +  
                '</span>'  
            );  
        }  
  
        // 4. Кнопки — wrapper ПІСЛЯ body (як у card-tweaks)  
        var $body = $render.find('.full-start-new__body, .full-start__body').first();  
        if ($body.length) {  
            var $wrapper = $render.find('.card-tweaks__buttons');  
            if (!$wrapper.length) $wrapper = $('<div class="card-tweaks__buttons"></div>');  
            $render.find('.full-start-new__buttons, .full-start__buttons, .buttons--container').each(function () {  
                if ($(this).parent()[0] !== $wrapper[0]) $wrapper.append(this);  
            });  
            if ($wrapper.children().length && $wrapper.parent()[0] !== $body.parent()[0]) {  
                $body.after($wrapper);  
            }  
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
        return found;  
    }  
  
    function renderQualityBadges($render, movie) {  
        if (!Lampa.Storage.get('movie_card_logo_quality_badges', true)) return;  
  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if (!$rate.length) return;  
  
        var $row = $render.find('.mcl-quality-row');  
        if (!$row.length) {  
            $row = $('<div class="mcl-quality-row"></div>');  
            $rate.after($row);  
        }  
        $row.empty();  
  
        var badges = getQualityBadges(movie._quality_results);  
  
        // Фолбек: якщо онлайн-результатів немає — беремо quality з самої картки  
        if (!badges.length && movie.quality) {  
            var q = String(movie.quality).toUpperCase();  
            if (/2160|4K|UHD/.test(q)) badges = [{ label: '4K' }];  
            else if (/1080/.test(q)) badges = [{ label: 'FHD' }];  
            else if (/720/.test(q)) badges = [{ label: 'HD' }];  
            else badges = [{ label: q }];  
        }  
  
        badges.forEach(function (b) {  
            if (b.imageURL) {  
                $row.append('<img class="mcl-qbadge-img" src="' + b.imageURL + '" alt="' + b.label + '">');  
            } else {  
                $row.append('<span class="mcl-qbadge">' + b.label + '</span>');  
            }  
        });  
    }  
  
    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        var rating = parseFloat(data.vote_average || movie.vote_average || 0);  
        rebuildLayout($render, rating);  
        renderQualityBadges($render, movie);  
  
        // Логотип назви — з попереднім завантаженням у imageCache  
        var logos = (data.images && data.images.logos) ? data.images.logos : [];  
        var logo = null;  
        var prefLang = ['uk', 'ru', 'en'];  
        for (var i = 0; i < prefLang.length && !logo; i++) {  
            logo = logos.find(function (l) { return l.iso_639_1 === prefLang[i]; });  
        }  
        if (!logo && logos.length) logo = logos[0];  
  
        var titleEl = $render.find('.full-start-new__title')[0] || $render.find('.full-start__title')[0];  
  
        if (logo && logo.file_path && titleEl) {  
            var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
            var logoUrl = Lampa.TMDB.image('/t/p/' + quality + logo.file_path);  
            var $logo = $('<img class="logo-animate" src="' + logoUrl + '" alt="logo">');  
  
            var showLogo = function () {  
                if (!titleEl.contains($logo[0])) {  
                    $(titleEl).empty().append($logo);  
                    $(titleEl).css({ 'max-height': 'none', 'overflow': 'visible' });  
                }  
            };  
  
            if (imageCache[logoUrl]) {  
                showLogo();  
            } else {  
                var pre = new Image();  
                pre.onload = function () { imageCache[logoUrl] = true; showLogo(); };  
                pre.src = logoUrl;  
            }  
  
            $logo.on('error', function () { $(titleEl).text(movie.title || movie.name); });  
        }  
  
        // Слоган (укр → рос → англ → data.tagline)  
        var taglineText = pickTagline(translations, data.tagline);  
        if (Lampa.Storage.get('movie_card_logo_tagline', true) && taglineText && titleEl) {  
            var $tagline = $render.find('.full-start-new__tagline');  
            if (!$tagline.length) {  
                $tagline = $('<div class="full-start-new__tagline"></div>').text(taglineText);  
                $(titleEl).after($tagline);  
            } else {  
                $tagline.text(taglineText);  
            }  
        }  
  
        // Логотип студії (network → companies)  
        if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
            var studio = null;  
            if (data.networks && data.networks.length > 0) {  
                studio = data.networks.find(function (n) { return n.logo_path; });  
            }  
            if (!studio && data.production_companies && data.production_companies.length > 0) {  
                studio = data.production_companies.find(function (c) { return c.logo_path; });  
            }  
  
            if (studio && studio.logo_path) {  
                var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
                var $brand = $('<div class="studio-header-brand"><img class="logo-animate" src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');  
                var $img = $brand.find('img');  
  
                var showBrand = function () {  
                    if (!$render.find('.studio-header-brand').length) {  
                        $render.find('.logo-top-wrap').prepend($brand);  
                    }  
                };  
  
                analyzeLogo(studioLogoUrl, function (res) {  
                    if (res.invisible) return; // біла пляма — не показуємо  
                    if (res.dark) $img.addClass('is-dark-logo');  
                    showBrand();  
                });  
  
                if (imageCache[studioLogoUrl]) showBrand();  
                $img.on('error', function () { $brand.remove(); });  
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
        var transUrl = 'https://api.themoviedb.org/3/' + type + '/' + movieId +  
            '/translations?api_key=' + Lampa.TMDB.key();  
  
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
  
    // Оновлення вже відкритої картки без перезаходу  
    function refreshActiveCard() {  
        try {  
            var active = Lampa.Activity.active();  
            if (active && active.component === 'full') {  
                var $render = active.activity.render();  
                var movie = active.card;  
                if ($render.length && movie) {  
                    detailsCache = {}; // знецінити кеш, щоб лого перечиталось  
                    loadMovieDetails(movie, $render);  
                }  
            }  
        } catch (e) { }  
    }  
  
    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'complite') {  
                var movie = e.data.movie;  
                var $render = e.object.activity.render();  
                loadMovieDetails(movie, $render);  
            }  
        });  
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
            field: { name: 'Увімкнути плагін', description: 'Відображати логотип фільму замість звичайної назви' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_studio', type: 'trigger', default: true },  
            field: { name: 'Логотип студії', description: 'Логотип студії/телеканалу над назвою' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
            field: { name: 'Слоган фільму', description: 'Слоган під логотипом (українською, якщо є переклад)' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_size',  
                type: 'select',  
                values: { '60': 'Дуже малий', '90': 'Малий', '140': 'Стандартний', '200': 'Великий', '270': 'Дуже великий' },  
                default: '140'  
            },  
            field: { name: 'Розмір логотипа назви', description: 'Застосовується одразу, без перезаходу' },  
            onChange: function () { applyStyles(); refreshActiveCard(); }  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_quality',  
                type: 'select',  
                values: { 'w300': 'Низька (w300)', 'w500': 'Середня (w500)', 'w780': 'Висока (w780)', 'original': 'Оригінал' },  
                default: 'w500'  
            },  
            field: { name: 'Якість логотипа' },  
            onChange: function () { applyStyles(); refreshActiveCard(); }  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_quality_badges', type: 'trigger', default: true },  
            field: { name: 'Бейджі якості', description: '4K/HD/SD та звук під рейтингом' },  
            onChange: function () { applyStyles(); refreshActiveCard(); }  
        });  
    }  
  
    function startPlugin() {  
        applyStyles();  
        setupSettings();  
        init();  
        refreshActiveCard();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
})();
