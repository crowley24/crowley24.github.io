(function () {  
    'use strict';  
  
    var detailsCache = {};  
    var currentActiveId = null;  
    var TMDB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg';  
  
    var settings_list = [  
        { id: 'movie_card_logo_enabled', default: true },  
        { id: 'movie_card_logo_studio', default: true },  
        { id: 'movie_card_logo_tagline', default: true },  
        { id: 'movie_card_logo_size', default: '120' },  
        { id: 'movie_card_logo_quality', default: 'w500' }  
    ];  
  
    settings_list.forEach(function (opt) {  
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {  
            Lampa.Storage.set(opt.id, opt.default);  
        }  
    });  
  
    function isImageDark(imgSrc, callback) {  
        var img = new Image();  
        img.crossOrigin = 'Anonymous';  
        img.onload = function () {  
            try {  
                var canvas = document.createElement('canvas');  
                var ctx = canvas.getContext('2d');  
                canvas.width = img.width; canvas.height = img.height;  
                ctx.drawImage(img, 0, 0);  
                var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;  
                var light = 0, total = 0;  
                for (var i = 0; i < data.length; i += 4) {  
                    if (data[i + 3] > 128) {  
                        var lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];  
                        if (lum > 128) light++;  
                        total++;  
                    }  
                }  
                callback(total > 0 && light / total > 0.5);  
            } catch (e) { callback(false); }  
        };  
        img.onerror = function () { callback(false); };  
        img.src = imgSrc;  
    }  
  
    // Колір цифри рейтингу за порогами  
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
  
        var lHeight = Lampa.Storage.get('movie_card_logo_size', '120');  
        var showStudio = Lampa.Storage.get('movie_card_logo_studio', true);  
        var showTagline = Lampa.Storage.get('movie_card_logo_tagline', true);  
        var isEnabled = Lampa.Storage.get('movie_card_logo_enabled', true);  
  
        // px-шкала: висота лого, ширина обмежена колонкою  
        var logoSizes = { '50': 60, '80': 95, '120': 140, '160': 200, '210': 270 };  
        var logoH = logoSizes[lHeight] || 140;  
  
        var css = '';  
        if (!isEnabled) {  
            css = '.logo-top-wrap, .studio-header-brand, .card-tweaks__buttons, .tmdb-rate-badge { display: none !important; }';  
        } else {  
            // Приховуємо head (рік/країни) — він видається в details через formattedDetails  
            css += '.full-start-new__head { display: none !important; } ';  
  
            // Wrap: блок лого в текстовій колонці .full-start-new__right  
            css += '.logo-top-wrap { display: flex; flex-direction: column; align-items: flex-start; margin-top: -0.4em; margin-bottom: 1.6em; } ';  
  
            // Слоган — компактний  
            css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.85em !important; font-style: italic !important; font-weight: 400 !important; color: rgba(255,255,255,0.72) !important; line-height: 1.4 !important; margin: 0 !important; } ';  
  
            // Рядок тривалість/жанри — преміальний стиль + великий відступ  
            css += '.logo-top-wrap .full-start-new__details { font-size: 0.95em !important; font-weight: 500 !important; letter-spacing: 0.12em !important; text-transform: uppercase !important; color: rgba(255,255,255,0.6) !important; line-height: 1.5 !important; margin-top: 1.4em !important; } ';  
  
            // Title: скинути обрізку теми, задати розмір лого  
            css += '.logo-top-wrap .full-start-new__title { margin: 0 0 0.3em 0 !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; } ';  
            css += '.logo-top-wrap .full-start-new__title img { max-height: ' + logoH + 'px !important; max-width: 100% !important; width: auto !important; height: auto !important; object-fit: contain !important; display: block; } ';  
  
            // Rate-line: новий бейдж у правому верхньому куті  
            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.5em !important; margin: 0 !important; z-index: 5 !important; background: none !important; padding: 0 !important; } ';  
            css += '.full-start .info__rate, .full-start-new .info__rate { display: none !important; } ';  
            css += '.full-start-new__rate-line > :not(.tmdb-rate-badge), .full-start__rate-line > :not(.tmdb-rate-badge) { display: none !important; } ';  
  
            // TMDB-бейдж  
            css += '.tmdb-rate-badge { display: inline-flex !important; align-items: center !important; gap: 0.4em; } ';  
            css += '.tmdb-rate-badge img { height: 1.1em !important; width: auto !important; display: block; } ';  
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; line-height: 1 !important; } ';  
  
            // Кнопки під body в один рядок  
            css += '.card-tweaks__buttons { display: flex; flex-wrap: nowrap; gap: 0.5em; width: 100%; margin-top: 1em; } ';  
            css += '.card-tweaks__buttons .full-start__button { flex-shrink: 0; } ';  
            css += '.card-tweaks__buttons .full-start-new__buttons, .card-tweaks__buttons .full-start__buttons, .card-tweaks__buttons .buttons--container { margin-top: 0 !important; } ';  
  
            if (!showTagline) css += '.logo-top-wrap .full-start-new__tagline { display: none !important; } ';  
  
            if (showStudio) {  
                css += '.studio-header-brand { display: flex; align-items: center; margin-bottom: 4px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            } else {  
                css += '.studio-header-brand { display: none !important; } ';  
            }  
        }  
        style.textContent = css;  
    }  
  
    // Вік/статус → в .full-descr__details (рядок бюджету)  
    function toInfo(render, selector, label) {  
        var el = render.find(selector).first();  
        if (!el.length || el.hasClass('hide')) return;  
        var text = el.text().trim();  
        if (!text) return;  
        el.hide();  
        var details = render.find('.full-descr__details');  
        if (!details.length) return;  
        if (details.find('.full-descr__info--moved[data-sel="' + selector + '"]').length) return;  
        var row = $('<div class="full-descr__info full-descr__info--moved" data-sel="' + selector + '">' +  
            '<div class="full-descr__info-name">' + label + '</div>' +  
            '<div class="full-descr__info-value">' + text + '</div></div>');  
        details.append(row);  
    }  
  
    // Перебудова: wrap на місці title в .full-start-new__right,  
    // details — у wrap, кнопки — під body, бейдж — у куті  
    function rebuildLayout($render, rating) {  
        // 1. Wrap на місці title  
        var $title = $render.find('.full-start-new__title').first();  
        var $wrap = $render.find('.logo-top-wrap');  
        if ($title.length) {  
            if (!$wrap.length) {  
                $wrap = $('<div class="logo-top-wrap"></div>');  
                $title.before($wrap);  
            }  
            if ($title.parent()[0] !== $wrap[0]) $wrap.append($title);  
        } else if (!$wrap.length) {  
            var $col = $render.find('.full-start-new__right, .full-start__left').first();  
            if ($col.length) $wrap = $('<div class="logo-top-wrap"></div>').prependTo($col);  
        }  
        if (!$wrap || !$wrap.length) return;  
  
        // 2. Слоган та details — у wrap під лого (порядок: title → tagline → details)  
        ['.full-start-new__tagline', '.full-start-new__details'].forEach(function (sel) {  
            var $el = $render.find(sel).first();  
            if ($el.length && $el.parent()[0] !== $wrap[0]) $wrap.append($el);  
        });  
  
        // 3. Новий рейтинг: лого TMDB + кольорова цифра  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
            $rate.append(  
                '<div class="tmdb-rate-badge">' +  
                '<img src="' + TMDB_LOGO_URL + '" alt="TMDB">' +  
                '<span class="tmdb-rate-value" style="color:' + rateColor(rating) + '">' + rating.toFixed(1) + '</span>' +  
                '</div>'  
            );  
        }  
  
        // 4. Вік та статус → рядок деталей  
        toInfo($render, '.full-start__pg', 'Вік');  
        toInfo($render, '.full-start__status', 'Статус');  
  
        // 5. Кнопки під body  
        var $wrapper = $render.find('.card-tweaks__buttons').first();  
        var $body = $render.find('.full-start-new__body, .full-start__body').first();  
        if ($body.length && !$wrapper.length) {  
            $wrapper = $('<div class="card-tweaks__buttons"></div>');  
            $render.find('.full-start-new__buttons, .full-start__buttons, .buttons--container').each(function () {  
                $wrapper.append(this);  
            });  
            if ($wrapper.children().length) $body.after($wrapper);  
        }  
    }  
  
    // Слоган: uk → ru → en → оригінал  
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
        return fallback || '';  
    }  
  
    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        var rating = parseFloat(data.vote_average || movie.vote_average || 0);  
        rebuildLayout($render, rating);  
  
        var year = (data.release_date || data.first_air_date || '').split('-')[0];  
        var countries = (data.production_countries && data.production_countries.length > 0) ?  
            data.production_countries.map(function (c) { return c.name; }).join(' • ') : '';  
  
        var extraInfo = [];  
        if (year) extraInfo.push(year);  
        if (countries) extraInfo.push(countries);  
        var formattedDetails = extraInfo.join(' • ');  
  
        setTimeout(function () {  
            rebuildLayout($render, rating);  
  
            // Рік/країни додаємо в details (head прихований)  
            var $infoLine = $render.find('.full-start-new__details').first();  
            if ($infoLine.length && formattedDetails) {  
                var cur = $infoLine.text().trim();  
                if (cur && cur.indexOf(year) === -1) $infoLine.text(formattedDetails + ' ● ' + cur);  
            }  
  
            var titleEl = $render.find('.full-start-new__title').get(0);  
  
            // Лого назви  
            var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
            var logoUrl = null;  
            if (data.images && data.images.logos && data.images.logos.length) {  
                var logo = data.images.logos.find(function (l) { return l.iso_639_1 === 'uk'; }) ||  
                           data.images.logos.find(function (l) { return l.iso_639_1 === 'en'; }) ||  
                           data.images.logos.find(function (l) { return !l.iso_639_1; }) ||  
                           data.images.logos[0];  
                logoUrl = Lampa.TMDB.image('/t/p/' + quality + logo.file_path);  
            }  
  
            if (titleEl && logoUrl) {  
                titleEl.innerHTML = '';  
                var $logo = $('<img src="' + logoUrl + '" alt="logo">');  
                $logo.on('error', function () { titleEl.textContent = data.title || data.name; });  
                titleEl.appendChild($logo.get(0));  
            }  
  
            // Слоган  
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
                    var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');  
                    var $img = $brand.find('img');  
  
                    $img.on('error', function () { $brand.remove(); });  
                    isImageDark(studioLogoUrl, function (isDark) { if (isDark) $img.addClass('is-dark-logo'); });  
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
            var data = resData[0];  
            var translations = resTrans[0];  
  
            detailsCache[movieId] = { data: data, translations: translations };  
            applyMovieDetailsData(data, movie, $render, translations);  
        });  
    }  
  
    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'destroy') {  
                currentActiveId = null;  
            }  
  
            if (e.type === 'complite' || e.type === 'complete') {  
                var movie = e.data.movie, $render = e.object.activity.render();  
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
            field: { name: 'Логотип студії', description: 'Відображати чи не відображати логотип студії/телеканалу' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
            field: { name: 'Слоган фільму', description: 'Відображати чи не відображати слоган під логотипом' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_size',  
                type: 'select',  
                values: {  
                    '60': 'Дуже малий',  
                    '90': 'Малий',  
                    '140': 'Стандартний',  
                    '200': 'Великий',  
                    '270': 'Дуже великий'  
                },  
                default: '140'  
            },  
            field: { name: 'Розмір логотипа назви' },  
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
    }  
  
    function startPlugin() {  
        applyStyles();  
        setupSettings();  
        init();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
})();
