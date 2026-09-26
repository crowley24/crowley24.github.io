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
                        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);  
                        if (Math.abs(r - g) > 15 || Math.abs(g - b) > 15 || Math.abs(r - b) > 15) hasColor = true;  
                        count++;  
                    }  
                }  
                callback(count > 0 && (totalBrightness / count) < 110 && !hasColor);  
            } catch (e) { callback(false); }  
        };  
        img.onerror = function () { callback(false); };  
        img.src = imgSrc;  
    }  
  
    // Пороги кольору цифри рейтингу  
    function rateColor(rating) {  
        if (rating >= 7) return '#3fd97f'; // зелений  
        if (rating >= 5) return '#f5c518'; // жовтий  
        return '#e34b4b';                  // червоний  
    }  
  
    // Пріоритет слогана: uk → ru → оригінал  
    function pickTagline(data, translations) {  
        if (translations && translations.translations) {  
            var langs = ['uk', 'ru'];  
            for (var i = 0; i < langs.length; i++) {  
                var tr = translations.translations.find(function (t) {  
                    return t.iso_639_1 === langs[i] && t.data && t.data.tagline && t.data.tagline.trim();  
                });  
                if (tr) return tr.data.tagline.trim();  
            }  
        }  
        return (data.tagline || '').trim();  
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
  
        // px-шкала: значення опції -> max-height лого  
        var logoSizes = { '50': '60px', '80': '90px', '120': '130px', '160': '190px', '210': '270px' };  
        var logoH = logoSizes[String(lHeight)] || '130px';  
  
        var css = '';  
        if (isEnabled) {  
            css += '.full-start-new__head, .full-start__tags { display: none !important; } ';  
  
            // Обгортка лого: піднята вгору + великий відступ до інфо-рядка  
            css += '.logo-top-wrap { display: flex !important; flex-direction: column !important; align-items: flex-start !important; width: 100% !important; margin-top: -0.4em !important; margin-bottom: 1.6em !important; } ';  
  
            // Скидання теми на title: без обрізки, базовий font-size (em вже не множить розмір лого)  
            css += '.logo-top-wrap .full-start-new__title { font-size: 1em !important; font-weight: normal !important; line-height: 1 !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; margin: 0 0 4px 0 !important; } ';  
            css += '.logo-top-wrap .full-start-new__title img { display: block; height: auto; width: auto; max-height: ' + logoH + ' !important; max-width: 100% !important; object-fit: contain; } ';  
  
            // Слоган — компактний під лого  
            css += '.logo-top-wrap .full-start-new__tagline { font-size: 0.8em !important; font-style: italic !important; font-weight: 400 !important; color: rgba(255,255,255,0.72) !important; line-height: 1.35 !important; margin: 2px 0 0 0 !important; } ';  
  
            // Інфо-рядок — преміальний стиль + великий відступ  
            css += '.logo-top-wrap .full-start-new__info, .logo-top-wrap .full-start__info { margin-top: 1em !important; font-size: 0.9em !important; font-weight: 500 !important; letter-spacing: 0.12em !important; text-transform: uppercase !important; color: rgba(255,255,255,0.75) !important; } ';  
  
            // Рейтинг у правий верхній кут, без фону; старий вміст приховано  
            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.8em !important; right: 1.5em !important; z-index: 5; margin: 0 !important; display: flex; align-items: center; } ';  
            css += '.full-start-new__rate-line > :not(.tmdb-rate-badge), .full-start__rate-line > :not(.tmdb-rate-badge) { display: none !important; } ';  
            css += '.full-start .info__rate, .full-start-new .info__rate { display: none !important; background: none !important; } ';  
  
            // Новий бейдж рейтингу: лого TMDB + цифра  
            css += '.tmdb-rate-badge { display: inline-flex; align-items: center; gap: 0.4em; } ';  
            css += '.tmdb-rate-badge img { height: 1.1em; width: auto; display: inline-block; } ';  
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; line-height: 1 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';  
  
            // Кнопки під body на всю ширину  
            css += '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; } ';  
            css += '.card-tweaks__buttons .full-start-new__buttons, .card-tweaks__buttons .buttons--container, .card-tweaks__buttons .full-start__buttons { margin-top: 0.6em; } ';  
  
            if (showStudio) {  
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 6px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            }  
        }  
        style.textContent = css;  
    }  
  
    function rebuildLayout($render, rating) {  
        // 1. Wrap — на місці title  
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
        } else if (!$wrap.length) {  
            var $left = $render.find('.full-start-new__left, .full-start__left').first();  
            if ($left.length) $left.prepend($('<div class="logo-top-wrap"></div>'));  
        }  
  
        // 2. Слоган та інфо-рядок — у wrap під title  
        $wrap = $render.find('.logo-top-wrap');  
        if ($wrap.length) {  
            ['.full-start-new__tagline', '.full-start-new__info', '.full-start__info'].forEach(function (sel) {  
                var $el = $render.find(sel).first();  
                if ($el.length && $el.parent()[0] !== $wrap[0]) $wrap.append($el);  
            });  
        }  
  
        // 3. Новий рейтинг: лого TMDB + кольорова цифра  
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
  
            // Вік/статус → у деталі  
            var $details = $render.find('.full-descr__details').first();  
            if ($details.length) {  
                var toInfo = function ($el, label) {  
                    if ($el.length && !$el.hasClass('hide')) {  
                        var text = $el.text().trim();  
                        if (text && !$details.find('.full-descr__info--moved').filter(function () {  
                            return $(this).text().indexOf(text) !== -1;  
                        }).length) {  
                            $details.append(  
                                $('<div class="full-descr__info full-descr__info--moved">' +  
                                  '<div class="full-descr__info-name">' + label + '</div>' +  
                                  '<div class="full-descr__info-value">' + text + '</div></div>')  
                            );  
                        }  
                        $el.hide();  
                    }  
                };  
                toInfo($render.find('.full-start__pg'), 'Віковий рейтинг');  
                toInfo($render.find('.full-start__status'), 'Статус');  
            }  
        }, 50);  
  
        // Логотип назви — без height-атрибута, розмір із CSS  
        var logoUrl = null;  
        var languages = ['uk', 'ru', 'en'];  
        for (var li = 0; li < languages.length; li++) {  
            var found = (data.images && data.images.logos || []).find(function (l) {  
                return l.iso_639_1 === languages[li];  
            });  
            if (found) { logoUrl = found.file_path; break; }  
        }  
        if (!logoUrl && data.images && data.images.logos && data.images.logos.length) {  
            logoUrl = data.images.logos[0].file_path;  
        }  
  
        var $titleEl = $render.find('.full-start-new__title').first();  
        var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
        var $logo;  
        if (logoUrl) {  
            $logo = $('<img src="' + Lampa.TMDB.image('/t/p/' + quality + logoUrl) + '" alt="' + (data.title || data.name || '') + '">');  
            $logo.on('error', function () {  
                $logo.remove();  
                $titleEl.text(data.title || data.name || movie.title || movie.name || '');  
            });  
        } else {  
            $logo = $('<span></span>').text(data.title || data.name || movie.title || movie.name || '');  
        }  
        $titleEl.empty().append($logo);  
  
        // Слоган — українською (або фолбек)  
        var taglineText = Lampa.Storage.get('movie_card_logo_tagline', true) ?  
            pickTagline(translations, data.tagline) : '';  
        var $tagline = $render.find('.full-start-new__tagline').first();  
        if (!$tagline.length && taglineText) {  
            $tagline = $('<div class="full-start-new__tagline"></div>');  
            $titleEl.after($tagline);  
        }  
        if ($tagline.length) {  
            if (taglineText) {  
                $tagline.text(taglineText);  
                var $w = $render.find('.logo-top-wrap');  
                if ($w.length && $tagline.parent()[0] !== $w[0]) $w.append($tagline);  
            } else {  
                $tagline.remove();  
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
            detailsCache[movieId] = { data: resData[0], translations: resTrans[0] };  
            applyMovieDetailsData(resData[0], movie, $render, resTrans[0]);  
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
            field: { name: 'Увімкнути плагін', description: 'Відображати логотип фільму замість звичайної назви' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_studio', type: 'trigger', default: true },  
            field: { name: 'Логотип студії', description: 'Відображати логотип студії/телеканалу' },  
            onChange: applyStyles  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
            field: { name: 'Слоган фільму', description: 'Відображати слоган під логотипом' },  
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
