(function () {  
    'use strict';  
    /**  
     * ПЕРЕМІННІ ТА КЕШУВАННЯ  
     */  
    var detailsCache = {};   
    var currentActiveId = null;  
      
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
                canvas.width = 40;  
                canvas.height = 40;  
                ctx.drawImage(img, 0, 0, 40, 40);  
  
                var imgData = ctx.getImageData(0, 0, 40, 40);  
                var data = imgData.data;  
                var totalBrightness = 0;  
                var hasColor = false;  
                var count = 0;  
  
                for (var i = 0; i < data.length; i += 4) {  
                    var alpha = data[i + 3];  
                    if (alpha > 50) {   
                        var r = data[i], g = data[i + 1], b = data[i + 2];  
                        var brightness = (r * 299 + g * 587 + b * 114) / 1000;  
                        totalBrightness += brightness;  
                        count++;  
                        if ((Math.max(r, g, b) - Math.min(r, g, b)) > 30) hasColor = true;  
                    }  
                }  
  
                var avgBrightness = count > 0 ? (totalBrightness / count) : 255;  
                callback((avgBrightness < 110) && !hasColor);  
            } catch (e) {  
                callback(false);  
            }  
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
            // Приховуємо оригінальний рік та країну над назвою  
            css += '.full-start-new__head, .full-start__tags { display: none !important; } ';  
              
            // Обгортка для логотипів (студія + назва + слоган)  
            css += '.logo-top-wrap { display: flex !important; flex-direction: column !important; justify-content: flex-start !important; align-items: flex-start !important; width: 100% !important; margin-bottom: 0 !important; } ';  
            css += '.logo-top-wrap .full-start-new__title, .logo-top-wrap .full-start-new__tagline { margin-left: 0 !important; } ';  
            css += '.logo-top-wrap .full-start-new__title { margin-bottom: 2px !important; } ';  
              
            css += '.full-start-new__title { display: flex !important; justify-content: flex-start !important; align-items: center !important; height: auto !important; min-height: unset !important; overflow: visible !important; width: 100% !important; box-sizing: border-box !important; margin: 4px 0 !important; } ';  
            css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 55vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.9)); margin: 0 !important; } ';  
              
            // Слоган впритул до лого назви  
            css += '.full-start-new__tagline { display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 0.9em !important; margin: 0 0 6px 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; } ';  
  
            // Рейтинги у правому верхньому куті  
            css += '.full-start, .full-start-new { position: relative !important; } ';  
            css += '.full-start__ratings { position: absolute !important; top: 1em !important; right: 1.5em !important; margin-left: 0 !important; z-index: 5 !important; } ';  
  
            // Рядок деталей (вік, статус "випущено")  
            css += '.full-start-new__details-line { display: flex; flex-wrap: wrap; align-items: center; margin: 4px 0; } ';  
  
            if (showStudio) {  
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';  
                css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
                css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
            }  
        }  
  
        style.textContent = css;  
    }  
  
    // Вирівнювання верху обгортки логотипів по верху постера (з невеликим зсувом вниз)  
    function alignLogoTop($render) {  
        var $wrap = $render.find('.logo-top-wrap');  
        var $poster = $render.find('.full-start-new__poster, .full-start__poster');  
        if ($wrap.length === 0 || $poster.length === 0) return;  
  
        var OFFSET = 8; // px вниз від верху постера — збільшуйте за потреби (12–16)  
        var diff = Math.round($poster.offset().top - $wrap.offset().top) + OFFSET;  
  
        if (Math.abs(diff) < 500) {  
            $wrap.css('transform', 'translateY(' + diff + 'px)');  
        }  
    }  
  
    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
        // Збираємо рік та країну з даних API напряму для гарантії  
        var year = (data.release_date || data.first_air_date || '').split('-')[0];  
        var countries = (data.production_countries && data.production_countries.length > 0) ?   
            data.production_countries.map(function(c) { return c.name; }).join(' • ') : '';  
          
        var extraInfo = [];  
        if (year) extraInfo.push(year);  
        if (countries) extraInfo.push(countries);  
        var formattedDetails = extraInfo.join(' • ');  
  
        // Вставляємо у рядок з тривалістю та жанром + переносимо теги віку/статусу  
        setTimeout(function() {  
            var $infoLine = $render.find('.full-start-new__info, .full-start__info');  
              
            if ($infoLine.length > 0) {  
                var originalText = $infoLine.attr('data-original-text');  
                if (!originalText) {  
                    originalText = $infoLine.text();  
                    $infoLine.attr('data-original-text', originalText);  
                }  
  
                if (formattedDetails && originalText.indexOf(formattedDetails) === -1) {  
                    $infoLine.text(formattedDetails + ' • ' + originalText);  
                }  
  
                // Переносимо теги (вік, статус "випущено") в окремий рядок деталей  
                var $details = $render.find('.full-start-new__details-line');  
                if ($details.length === 0) {  
                    $details = $('<div class="full-start-new__details-line"></div>');  
                    $infoLine.after($details);  
                }  
                $render.find('.full-start-new__tags .full-start__tag, .full-start__tags .full-start__tag')  
                    .appendTo($details);  
            }  
        }, 50);  
  
        // Створюємо обгортку навколо назви (один раз)  
        var $title = $render.find('.full-start-new__title');  
        if ($title.length > 0 && $title.parent('.logo-top-wrap').length === 0) {  
            var $wrap = $('<div class="logo-top-wrap"></div>');  
            $title.before($wrap);  
            $wrap.append($title);  
        }  
  
        // Відображення логотипа фільму замість назви  
        if (data.images && data.images.logos && data.images.logos.length > 0) {  
            var lang = Lampa.Storage.get('language') || 'uk';  
            var logo = data.images.logos.filter(function(l) { return l.iso_639_1 === lang; })[0] ||   
                       data.images.logos.filter(function(l) { return l.iso_639_1 === 'en'; })[0] ||   
                       data.images.logos[0];  
              
            if (logo) {  
                var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
                var logoUrl = Lampa.TMDB.image('/t/p/' + quality + logo.file_path.replace('.svg', '.png'));  
                $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');  
            }  
        }  
  
        // Слоган українською (або запасний варіант)  
        var taglineText = '';  
        if (translations && translations.translations) {  
            var uaTrans = translations.translations.find(function(t) { return t.iso_639_1 === 'uk'; });  
            if (uaTrans && uaTrans.data && uaTrans.data.tagline) {  
                taglineText = uaTrans.data.tagline;  
            }  
        }  
        if (!taglineText && data.tagline) {  
            taglineText = data.tagline;  
        }  
  
        if (taglineText && taglineText.trim() !== '') {  
            var $tagline = $render.find('.full-start-new__tagline');  
            if ($tagline.length === 0) {  
                $tagline = $('<div class="full-start-new__tagline"></div>');  
                $render.find('.logo-top-wrap').append($tagline);  
            }  
            $tagline.text(taglineText);  
        }  
  
        // Відображення логотипа студії  
        if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
            $render.find('.studio-header-brand').remove();  
            var studio = null;  
  
            if (data.networks && data.networks.length > 0) {  
                studio = data.networks.find(function(n) { return n.logo_path; });  
            }  
            if (!studio && data.production_companies && data.production_companies.length > 0) {  
                studio = data.production_companies.find(function(c) { return c.logo_path; });  
            }  
  
            if (studio && studio.logo_path) {  
                var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
                var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');  
                var $img = $brand.find('img');  
  
                $img.on('error', function() { $brand.remove(); });  
                isImageDark(studioLogoUrl, function(isDark) { if (isDark) $img.addClass('is-dark-logo'); });  
                $render.find('.logo-top-wrap').prepend($brand);  
            }  
        }  
  
        // Вирівнюємо верх блоку логотипів по верху постера  
        setTimeout(function() { alignLogoTop($render); }, 100);  
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
        ).done(function(resData, resTrans) {  
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
                    '50': 'Дуже малий',   
                    '80': 'Малий',   
                    '120': 'Стандартний',  
                    '160': 'Великий',   
                    '210': 'Дуже великий'   
                },   
                default: '120'   
            },   
            field: { name: 'Розмір логотипа назви фільму' },   
            onChange: applyStyles   
        });  
  
        Lampa.SettingsApi.addParam({   
            component: 'movie_card_logo',   
            param: {   
                name: 'movie_card_logo_quality',   
                type: 'select',   
                values: {   
                    'w300': 'Низька (w300)',   
                    'w500': 'Середня (w500)',   
                    'w780': 'Висока (w780)',   
                    'original': 'Оригінал (original)'   
                },   
                default: 'w500'   
            },   
            field: { name: 'Якість логотипа назви' },   
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
