(function () {  
    'use strict';  
  
    var detailsCache = {};  
    var currentActiveId = null;  
    var TMDB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg';  
  
    // Шкала розміру лого: max-height у px (ширина авто, обмежена колонкою)  
    var LOGO_SIZES = { '50': 60, '80': 95, '120': 140, '160': 195, '210': 270 };  
  
    var settings_list = [  
        { id: 'movie_card_logo_enabled', default: true },  
        { id: 'movie_card_logo_studio', default: true },  
        { id: 'movie_card_logo_tagline', default: true },  
        { id: 'movie_card_logo_size', default: '120' },  
        { id: 'movie_card_logo_quality', default: 'w500' },  
        { id: 'movie_card_slideshow', default: true },  
        { id: 'movie_card_slideshow_interval', default: '10' }  
    ];  
  
    settings_list.forEach(function (opt) {  
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {  
            Lampa.Storage.set(opt.id, opt.default);  
        }  
    });  
  
    function logoSizePx() {  
        var v = String(Lampa.Storage.get('movie_card_logo_size', '120'));  
        return LOGO_SIZES[v] || 140;  
    }  
  
    function isImageDark(imgSrc, callback) {  
        var img = new Image();  
        img.crossOrigin = 'Anonymous';  
        img.onload = function () {  
            try {  
                var canvas = document.createElement('canvas');  
                canvas.width = canvas.height = 1;  
                var ctx = canvas.getContext('2d');  
                ctx.drawImage(img, 0, 0, 1, 1);  
                var d = ctx.getImageData(0, 0, 1, 1).data;  
                var brightness = (d[0] * 299 + d[1] * 587 + d[2] * 114) / 1000;  
                callback(brightness < 128);  
            } catch (e) { callback(false); }  
        };  
        img.onerror = function () { callback(false); };  
        img.src = imgSrc;  
    }  
  
    /* ---------- СЛАЙДШОУ ФОНУ (preload + blind swap) ---------- */  
    var bgTimer = null, bgCardId = null, bgActive = false;  
  
    function slideshowEnabled() {  
        return Lampa.Storage.get('movie_card_slideshow', true) &&  
               Lampa.Storage.get('movie_card_logo_enabled', true);  
    }  
  
    function slideshowInterval() {  
        return parseInt(Lampa.Storage.get('movie_card_slideshow_interval', '10'), 10) * 1000;  
    }  
  
    function stopSlideshow() {  
        bgActive = false;  
        if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }  
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }  
        bgCardId = null;  
    }  
  
    function startSlideshow(movie, $render, images) {  
        stopSlideshow();  
        if (!movie || !movie.id || !slideshowEnabled()) return;  
  
        var curLang = (Lampa.Storage.get('language', 'uk') || 'uk').split('-')[0];  
  
        // Пріоритет: безмовні арти → мова інтерфейсу → інші за рейтингом  
        var langB = [], noLangB = [], otherB = [];  
        ((images && images.backdrops) || []).forEach(function (b) {  
            var lang = b.iso_639_1;  
            if (lang === curLang) langB.push(b);  
            else if (!lang || lang === 'xx' || lang === 'null') noLangB.push(b);  
            else otherB.push(b);  
        });  
        var backdrops = [].concat(noLangB);  
        if (backdrops.length < 3) backdrops = backdrops.concat(langB);  
        if (backdrops.length < 3) {  
            otherB.sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });  
            backdrops = backdrops.concat(otherB);  
        }  
        backdrops = backdrops.slice(0, 15);  
        if (backdrops.length <= 1) return;  
  
        bgCardId = movie.id;  
        bgActive = true;  
  
        var i = 0;  
        bgTimer = setInterval(function () {  
            if (!bgActive || bgCardId !== movie.id || currentActiveId !== movie.id) {  
                clearInterval(bgTimer); bgTimer = null; return;  
            }  
  
            var url = Lampa.TMDB.image('/t/p/original' + backdrops[i++ % backdrops.length].file_path);  
  
            var $bgImg = $render.find('.full-start__background img, img.full-start__background').last();  
            if (!$bgImg.length) $bgImg = $(document).find('img.full-start__background').last();  
            if (!$bgImg.length) return;  
  
            // preload кадру в пам'ять — ключ від ривків на TV  
            var pre = new Image();  
            pre.onload = function () {  
                if (!bgActive || bgCardId !== movie.id) return;  
                var $container = $render.find('.full-start__background');  
                if (!$container.length) $container = $bgImg;  
  
                // blind swap: гасимо → міняємо src → проявляємо  
                $container.css('opacity', 0);  
                setTimeout(function () {  
                    if (!bgActive) return;  
                    $bgImg.attr('src', url);  
                    setTimeout(function () {  
                        if (!bgActive) return;  
                        $container.css('opacity', 1);  
                    }, 80);  
                }, 420);  
            };  
            pre.src = url;  
        }, slideshowInterval());  
  
        window.casBgInterval = bgTimer;  
    }  
    /* ---------- /СЛАЙДШОУ ---------- */  
  
    function applyStyles() {  
        var style = document.getElementById('movie-card-logo-styles');  
        if (!style) {  
            style = document.createElement('style');  
            style.id = 'movie-card-logo-styles';  
            document.head.appendChild(style);  
        }  
  
        var showStudio = Lampa.Storage.get('movie_card_logo_studio', true);  
        var showTagline = Lampa.Storage.get('movie_card_logo_tagline', true);  
        var isEnabled = Lampa.Storage.get('movie_card_logo_enabled', true);  
  
        var css = '';  
  
        if (!isEnabled) {  
            css += '.logo-top-wrap .full-start-new__title { display: block !important; } ';  
            css += '.logo-top-wrap .full-start-new__title img { display: none !important; } ';  
            css += '.full-start-new__title::before { content: none !important; } ';  
            css += '.studio-header-brand, .tmdb-rate-badge { display: none !important; } ';  
        } else {  
            // Приховати head (рік/країни) — дублюється в картці нижче  
            css += '.full-start-new__head { display: none !important; } ';  
  
            // СТАТУС фільма — видалено повністю  
            css += '.full-start__status, .full-start-new__status { display: none !important; } ';  
  
            // Фон чіткий + плавний fade для слайдшоу  
            css += '.full-start__background, .full-start-new__background { opacity: 1 !important; filter: none !important; -webkit-filter: none !important; transition: opacity 0.4s ease !important; } ';  
            css += '.background__one.visible, .background__two.visible { opacity: 1 !important; filter: none !important; -webkit-filter: none !important; } ';  
  
            // Обгортка лого: трохи піднята, відступ від рядка details  
            css += '.logo-top-wrap { display: flex; flex-direction: column; align-items: flex-start; width: 100%; margin-top: -0.4em; } ';  
  
            // Контейнер title: скинути обрізання теми (font-size/max-height/overflow)  
            css += '.logo-top-wrap .full-start-new__title { font-size: 1em !important; max-height: none !important; max-width: none !important; overflow: visible !important; margin-bottom: 4px !important; line-height: 1 !important; } ';  
            css += '.logo-top-wrap .full-start-new__title > *:not(img) { display: none !important; } ';  
            // Розмір img задається ІНЛАЙН у JS (logoSizePx) — тут лише обмеження ширини  
            css += '.logo-top-wrap .full-start-new__title img { display: block; width: auto; max-width: 100%; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.85)); } ';  
  
            // Слоган — компактний  
            css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.85em !important; color: rgba(255,255,255,0.8) !important; margin: 0 !important; line-height: 1.4 !important; } ';  
  
            // Деталі (тривалість • жанри) — мінімалістично, великий відступ зверху  
            css += '.logo-top-wrap .full-start-new__details { margin-top: 1.6em !important; font-size: 0.9em !important; font-weight: 400 !important; color: rgba(255,255,255,0.75) !important; letter-spacing: 0.03em !important; } ';  
  
            // Рейтинг-бейдж у правому верхньому куті  
            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.5em !important; left: auto !important; margin: 0 !important; background: none !important; background-color: transparent !important; padding: 0 !important; z-index: 10 !important; } ';  
            css += '.full-start-new__rate-line > :not(.tmdb-rate-badge), .full-start__rate-line > :not(.tmdb-rate-badge) { display: none !important; } ';  
            css += '.full-start .info__rate, .full-start-new .info__rate { display: none !important; } ';  
            css += '.tmdb-rate-badge { display: inline-flex; align-items: center; gap: 0.5em; } ';  
            css += '.tmdb-rate-badge img { height: 1.1em; width: auto; display: block; } ';  
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';  
  
            // Moved-рядки (вік) у шрифті нативних рядків деталей  
            css += '.full-descr__info--moved { font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; letter-spacing: normal !important; text-transform: none !important; color: inherit !important; } ';  
  
            // Кнопки під увесь body — в один рядок  
            css += '.card-tweaks__buttons { width: 100%; margin-top: 0.5em; } ';  
            css += '.card-tweaks__buttons .full-start__buttons { margin-top: 0.6em; } ';  
  
            if (showStudio) {  
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            }  
  
            if (!showTagline) {  
                css += '.logo-top-wrap .full-start-new__tagline { display: none !important; } ';  
            }  
        }  
        style.textContent = css;  
    }  
  
    function rateColor(v) {  
        if (v >= 7) return '#3fd97f';  
        if (v >= 5) return '#f5c518';  
        return '#e34b4b';  
    }  
  
    function rebuildLayout($render, rating) {  
        // 1. Wrap — на місці title (текстова колонка праворуч від постера)  
        var $title = $render.find('.full-start-new__title').first();  
        var $wrap = $render.find('.logo-top-wrap');  
        if ($title.length) {  
            if (!$wrap.length) {  
                $wrap = $('<div class="logo-top-wrap"></div>');  
                $title.before($wrap);  
                $wrap.append($title);  
            } else if ($title.parent()[0] !== $wrap[0]) {  
                $wrap.append($title);  
            }  
        } else {  
            return;  
        }  
  
        // 2. Порядок у wrap: title → tagline → details (тривалість/жанри)  
        ['.full-start-new__title', '.full-start-new__tagline', '.full-start-new__details'].forEach(function (sel) {  
            var $el = $render.find(sel).first();  
            if ($el.length && $el.parent()[0] !== $wrap[0]) {  
                $wrap.append($el);  
            }  
        });  
  
        // 3. Рейтинг-бейдж: лого TMDB + цифра кольором за оцінкою  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
            var value = rating.toFixed(1);  
            var color = rateColor(rating);  
            var $badge = $('<div class="tmdb-rate-badge">' +  
                '<img src="' + TMDB_LOGO_URL + '" alt="TMDB">' +  
                '<span class="tmdb-rate-value" style="color:' + color + '">' + value + '</span>' +  
            '</div>');  
            $rate.append($badge);  
        }  
  
        // 4. Кнопки під увесь body  
        var $body = $render.find('.full-start-new__body, .full-start__body').first();  
        if (!$body.length) return;  
        var $wrapper = $render.find('.card-tweaks__buttons');  
        if (!$wrapper.length) {  
            $wrapper = $('<div class="card-tweaks__buttons"></div>');  
            $render.find('.full-start-new__buttons, .full-start__buttons, .buttons--container').each(function () {  
                $wrapper.append(this);  
            });  
            if ($wrapper.children().length) $body.after($wrapper);  
        }  
    }  
  
    function pickTagline(translations, fallback) {  
        if (translations && translations.translations) {  
            var order = ['uk', 'ru', 'en'];  
            for (var i = 0; i < order.length; i++) {  
                var tr = translations.translations.find(function (t) {  
                    return t.iso_639_1 === order[i] && t.data && t.data.tagline && t.data.tagline.trim();  
                });  
                if (tr) return tr.data.tagline.trim();  
            }  
        }  
        return (fallback || '').trim();  
    }  
  
   // Копіює текстове значення $src у рядок деталей і ховає оригінал  
    function toInfo(name, $src, $details) {  
        if (!$src.length || $src.hasClass('hide')) return;  
        var val = $src.text().trim();  
        if (!val) return;  
        var exists = $details.find('.full-descr__info').toArray().some(function (el) {  
            return el.innerText.indexOf(val) !== -1;  
        });  
        if (!exists) {  
            $details.append(  
                '<div class="full-descr__info full-descr__info--moved">' +  
                '<div class="full-descr__info-name">' + name + '</div>' +  
                '<div class="full-descr__info-value">' + val + '</div>' +  
                '</div>'  
            );  
        }  
        $src.addClass('hide');  
    }  
  
    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        var rating = parseFloat(data.vote_average || movie.vote_average || 0);  
        rebuildLayout($render, rating);  
  
        // Слайдшоу: backdrops уже є в data.images (append_to_response=images)  
        startSlideshow(movie, $render, data.images);  
  
        setTimeout(function () {  
            rebuildLayout($render, rating);  
  
            var $details = $render.find('.full-descr__details');  
            if ($details.length) {  
                toInfo('Вік', $render.find('.full-start__pg'), $details);  
                // Статус видалено повністю — не додаємо  
            }  
  
            var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
            var logos = (data.images && data.images.logos) ? data.images.logos : [];  
            var logo = logos.find(function (l) { return l.iso_639_1 === 'uk'; }) ||  
                       logos.find(function (l) { return l.iso_639_1 === 'en'; }) ||  
                       logos.find(function (l) { return !l.iso_639_1; }) || logos[0];  
  
            var $title = $render.find('.full-start-new__title');  
            if (logo && logo.file_path && $title.length) {  
                var url = Lampa.TMDB.image('/t/p/' + quality + logo.file_path);  
                var $logo = $('<img class="logo-img" src="' + url + '" alt="' + (movie.title || movie.name || '') + '">');  
  
                // Розмір інлайном — не програє CSS-специфічності  
                $logo.css({  
                    'max-height': logoSizePx() + 'px',  
                    'max-width': '100%',  
                    'width': 'auto',  
                    'height': 'auto',  
                    'display': 'block',  
                    'object-fit': 'contain',  
                    'filter': 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))'  
                });  
  
                $logo.on('error', function () {  
                    $logo.remove();  
                    $title.show();  
                });  
  
                $title.empty().append($logo).css({  
                    'font-size': '0',  
                    'max-height': 'none',  
                    'max-width': 'none',  
                    'overflow': 'visible',  
                    'line-height': '1'  
                }).show();  
            }  
  
            // Слоган українською  
            var taglineText = pickTagline(translations, data.tagline);  
            if (Lampa.Storage.get('movie_card_logo_tagline', true) && taglineText && $title.length) {  
                var $tagline = $render.find('.full-start-new__tagline');  
                if (!$tagline.length) {  
                    $tagline = $('<div class="full-start-new__tagline"></div>').text(taglineText);  
                    $title.after($tagline);  
                    $tagline.appendTo($render.find('.logo-top-wrap'));  
                } else {  
                    $tagline.text(taglineText);  
                }  
            }  
  
            // Логотип студії  
            if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
                var studio = null;  
                if (data.networks && data.networks.length) {  
                    studio = data.networks.find(function (n) { return n.logo_path; });  
                }  
                if (!studio && data.production_companies && data.production_companies.length) {  
                    studio = data.production_companies.find(function (c) { return c.logo_path; });  
                }  
                if (studio && studio.logo_path && !$render.find('.studio-header-brand').length) {  
                    var studioUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
                    var $brand = $('<div class="studio-header-brand"><img src="' + studioUrl + '" alt=""></div>');  
                    var $img = $brand.find('img');  
                    $img.on('error', function () { $brand.remove(); });  
                    isImageDark(studioUrl, function (isDark) { if (isDark) $img.addClass('is-dark-logo'); });  
                    $render.find('.logo-top-wrap').prepend($brand);  
                }  
            }  
        }, 50);  
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
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images&include_image_language=uk,en,null';  
        var transUrl = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '/translations?api_key=' + Lampa.TMDB.key();  
  
        $.when(  
            $.ajax({ url: url, type: 'GET', dataType: 'json' }),  
            $.ajax({ url: transUrl, type: 'GET', dataType: 'json' })  
        ).done(function (resData, resTrans) {  
            if (currentActiveId !== movieId) return;  
            detailsCache[movieId] = { data: resData[0], translations: resTrans[0] };  
            applyMovieDetailsData(resData[0], movie, $render, resTrans[0]);  
        });  
    }  
  
    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'complite' || e.type === 'complete') {  
                loadMovieDetails(e.data.movie, e.object.activity.render());  
            }  
            if (e.type === 'destroy') {  
                stopSlideshow();  
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
            field: { name: 'Увімкнути плагін' },  
            onChange: function (v) {  
                applyStyles();  
                if (v === false || v === 'false') stopSlideshow();  
            }  
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
                values: { '50': 'Дуже малий', '80': 'Малий', '120': 'Стандартний', '160': 'Великий', '210': 'Дуже великий' },  
                default: '120'  
            },  
            field: { name: 'Розмір логотипа' },  
            onChange: applyStyles  
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
            param: { name: 'movie_card_slideshow', type: 'trigger', default: true },  
            field: { name: 'Слайдшоу фону', description: 'Прокручувати арти фільму на тлі картки' },  
            onChange: function (v) { if (v === false || v === 'false') stopSlideshow(); }  
        });  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_slideshow_interval', type: 'select',  
                values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' },  
                default: '10'  
            },  
            field: { name: 'Інтервал слайдшоу', description: 'Як часто змінюється фонове зображення' }  
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
