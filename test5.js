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
                canvas.width = 40; canvas.height = 40;  
                ctx.drawImage(img, 0, 0, 40, 40);  
                var data = ctx.getImageData(0, 0, 40, 40).data;  
                var totalBrightness = 0, hasColor = false, count = 0;  
                for (var i = 0; i < data.length; i += 4) {  
                    if (data[i + 3] > 50) {  
                        var r = data[i], g = data[i + 1], b = data[i + 2];  
                        totalBrightness += (r * 299 + g * 587 + b * 114) / 1000;  
                        count++;  
                        if (Math.abs(r - g) > 15 || Math.abs(g - b) > 15 || Math.abs(r - b) > 15) hasColor = true;  
                    }  
                }  
                if (!count || hasColor) return callback(false);  
                callback((totalBrightness / count) < 100);  
            } catch (e) { callback(false); }  
        };  
        img.onerror = function () { callback(false); };  
        img.src = imgSrc;  
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
  
        var css = '';  
        if (isEnabled) {  
            css += '.full-start-new__head, .full-start__tags { display: none !important; } ';  
  
            // Обгортка лого — на місці title у текстовій колонці  
            css += '.logo-top-wrap { display: flex !important; flex-direction: column !important; align-items: flex-start !important; width: 100% !important; } ';  
            css += '.logo-top-wrap .full-start-new__title { margin: 0 0 4px 0 !important; display: flex !important; align-items: center !important; height: auto !important; min-height: unset !important; line-height: 1 !important; width: 100% !important; } ';  
  
            // Лого назви: max-height керує розміром, max-width — захист від виходу за межі  
            css += '.logo-top-wrap .full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 100% !important; object-fit: contain !important; object-position: left center !important; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.7)) !important; } ';  
  
            // Слоган — компактний  
            if (showTagline) {  
                css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.85em !important; font-style: italic !important; font-weight: 400 !important; color: rgba(255,255,255,0.72) !important; line-height: 1.35 !important; margin: 4px 0 0 0 !important; } ';  
            }  
  
            // Інфо-рядок — преміальний стиль + великий відступ  
            css += '.logo-top-wrap .full-start-new__info, .logo-top-wrap .full-start__info { margin-top: 1.2em !important; font-size: 0.95em !important; font-weight: 500 !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; color: rgba(255,255,255,0.85) !important; line-height: 1.6 !important; } ';  
  
            // Рейтинг у правому верхньому куті, без фону  
            css += '.full-start-new, .full-start { position: relative !important; } ';  
            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.5em !important; z-index: 5; margin: 0 !important; display: flex; gap: 0.5em; align-items: center; background: none !important; padding: 0 !important; } ';  
            css += '.full-start .info__rate, .full-start-new .info__rate { background: none !important; padding: 0 !important; } ';  
            css += '.full-start-new__rate-line > :not(.tmdb-rate-badge), .full-start__rate-line > :not(.tmdb-rate-badge) { display: none !important; } ';  
  
            // Новий бейдж рейтингу: лого TMDB + цифра (колір інлайн за оцінкою)  
            css += '.tmdb-rate-badge { display: flex !important; align-items: center !important; gap: 0.5em !important; } ';  
            css += '.tmdb-rate-badge img { height: 1.1em !important; width: auto !important; display: block !important; } ';  
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; line-height: 1 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';  
  
            // Кнопки під верхнім блоком, на всю ширину  
            css += '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; } ';  
            css += '.card-tweaks__buttons .full-start-new__buttons, .card-tweaks__buttons .buttons--container, .card-tweaks__buttons .full-start__buttons { margin-top: 0.6em; } ';  
  
            if (showStudio) {  
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            }  
        }  
        style.textContent = css;  
    }  
  
    function rateColor(rating) {  
        if (rating >= 7) return '#3fd97f';  
        if (rating >= 5) return '#f5c518';  
        return '#e34b4b';  
    }  
  
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
            var $left = $render.find('.full-start-new__left, .full-start__left').first();  
            if ($left.length) {  
                $wrap = $('<div class="logo-top-wrap"></div>');  
                $left.prepend($wrap);  
            }  
        }  
  
        // 2. Слоган та інфо-рядок — у wrap під title  
        if ($wrap && $wrap.length) {  
            ['.full-start-new__tagline', '.full-start-new__info', '.full-start__info'].forEach(function (sel) {  
                var $el = $render.find(sel).first();  
                if ($el.length && $el.parent()[0] !== $wrap[0]) $wrap.append($el);  
            });  
        }  
  
        // 3. Бейдж: лого TMDB + цифра кольором за рейтингом  
        var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
        if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
            $rate.append(  
                '<div class="tmdb-rate-badge">' +  
                    '<img src="' + TMDB_LOGO_URL + '" alt="TMDB">' +  
                    '<span class="tmdb-rate-value" style="color:' + rateColor(rating) + ';">' + rating.toFixed(1) + '</span>' +  
                '</div>'  
            );  
        }  
  
        // 4. Кнопки під body, на всю ширину  
        var $body = $render.find('.full-start-new__body, .full-start__body').first();  
        var $wrapper = $render.find('.card-tweaks__buttons');  
        if ($body.length && !$wrapper.length) {  
            $wrapper = $('<div class="card-tweaks__buttons"></div>');  
            $render.find('.full-start-new__buttons, .full-start__buttons, .buttons--container').each(function () {  
                $wrapper.append(this);  
            });  
            if ($wrapper.children().length) $body.after($wrapper);  
        }  
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
  
            var $infoLine = $render.find('.full-start-new__info, .full-start__info').first();  
            if ($infoLine.length && formattedDetails) {  
                var originalText = $infoLine.attr('data-original-text');  
                if (!originalText) {  
                    originalText = $infoLine.text();  
                    $infoLine.attr('data-original-text', originalText);  
                }  
                if (originalText.indexOf(formattedDetails) === -1) {  
                    $infoLine.text(formattedDetails + ' • ' + originalText);  
                }  
            }  
  
            // Вік + статус → у .full-descr__details (де бюджет)  
            var $details = $render.find('.full-descr__details').first();  
            if ($details.length) {  
                function toInfo($el, name) {  
                    if (!$el.length || $el.hasClass('hide')) return;  
                    $details.append(  
                        '<div class="full-descr__info full-descr__info--moved">' +  
                            '<div class="full-descr__info-name">' + name + '</div>' +  
                            '<div class="full-descr__info-body">' + $el.text().trim() + '</div>' +  
                        '</div>'  
                    );  
                    $el.hide();  
                }  
                toInfo($render.find('.full-start__pg'), 'Віковий рейтинг');  
                toInfo($render.find('.full-start__status'), 'Статус');  
            }  
        }, 50);  
  
        // Логотип назви — БЕЗ height-атрибута, розмір тільки через CSS  
        var $titleEl = $render.find('.full-start-new__title').first();  
        var logoPath = null;  
  
        if (data.images && data.images.logos && data.images.logos.length > 0) {  
            var logo = data.images.logos.find(function (l) { return l.iso_639_1 === 'uk'; }) ||  
                       data.images.logos.find(function (l) { return l.iso_639_1 === 'en'; }) ||  
                       data.images.logos.find(function (l) { return !l.iso_639_1; }) ||  
                       data.images.logos[0];  
            logoPath = logo.file_path;  
        }  
  
        if (logoPath && $titleEl.length) {  
            var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
            var logoUrl = Lampa.TMDB.image('/t/p/' + quality + logoPath);  
  
            var $logo = $('<img src="' + logoUrl + '" alt="">');  
            $logo.on('error', function () { $titleEl.text(movie.title || movie.name || ''); });  
            $titleEl.empty().append($logo);  
        }  
  
        // Слоган  
        if (Lampa.Storage.get('movie_card_logo_tagline', true)) {  
            var taglineText = data.tagline || '';  
            if (!taglineText && translations && translations.translations) {  
                var trans = translations.translations.find(function (t) { return t.iso_639_1 === 'uk'; }) ||  
                            translations.translations.find(function (t) { return t.iso_639_1 === 'en'; });  
                if (trans && trans.data && trans.data.tagline) taglineText = trans.data.tagline;  
            }  
  
            if (taglineText) {  
                var $tagline = $render.find('.full-start-new__tagline');  
                if (!$tagline.length) {  
                    $tagline = $('<div class="full-start-new__tagline"></div>');  
                    $titleEl.after($tagline);  
                }  
                $tagline.text(taglineText);  
            }  
        }  
  
        // Логотип студії  
        if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
            $render.find('.studio-header-brand').remove();  
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
            if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {  
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
                values: { '50': 'Дуже малий', '80': 'Малий', '120': 'Стандартний', '160': 'Великий', '210': 'Дуже великий' },  
                default: '120'  
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
