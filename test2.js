(function () {  
  'use strict';  

  var detailsCache = {}; 
  var currentActiveId = null;
  
  var settings_list = [
      { id: 'movie_card_logo_enabled', default: true },
      { id: 'movie_card_logo_studio', default: true },
      { id: 'movie_card_logo_tagline', default: true },
      { id: 'movie_card_logo_size', default: '120' },
      { id: 'movie_card_logo_quality', default: 'w500' },
      { id: 'card_slideshow', default: true },
      { id: 'card_slideshow_interval', default: '10' }
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

  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // Приховуємо стандартні теги внизу, бо переносимо їх наверх
    '.full-start__tags { display: none !important; }' +  

    // Анімація та налаштування фону
    '.full-start__background, .full-start-new__background, .background__one, .background__two {' +  
    '  opacity: 1 !important;' +  
    '  filter: brightness(1) contrast(1) !important;' +  
    '  -webkit-filter: brightness(1) contrast(1) !important;' +  
    '  transition: filter 0.4s ease, opacity 0.4s ease !important;' +  
    '}' +  
    
    '.full-start.is-scrolled .full-start__background,' + 
    '.full-start.is-scrolled .full-start-new__background,' +
    '.full-start.is-scrolled .background__one,' + 
    '.full-start.is-scrolled .background__two {' +  
    '  filter: brightness(0.35) contrast(1.1) !important;' +  
    '  -webkit-filter: brightness(0.35) contrast(1.1) !important;' +  
    '}' +  

    // Коригування розташування рейтингу (виводимо в рядку під логотипом)
    '.full-start-new__rate-line, .full-start__rate-line {' +  
    '  position: relative !important;' +  
    '  top: auto !important; right: auto !important;' +  
    '  margin: 6px 0 8px 0 !important;' +  
    '  display: flex; gap: 0.8em; align-items: center;' +  
    '  background: transparent !important;' +  
    '  padding: 0 !important;' +  
    '  z-index: 2 !important;' +  
    '}' +  

    // Кнопки
    '.card-tweaks__buttons { margin-top: 1.0em; width: 100%; position: relative; z-index: 2; }' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container { margin-top: 0.4em; }';  

  function applyStyles() {
      var lHeight = Lampa.Storage.get('movie_card_logo_size', '120'); 
      var showStudio = Lampa.Storage.get('movie_card_logo_studio', true);
      var showTagline = Lampa.Storage.get('movie_card_logo_tagline', true);
      var isEnabled = Lampa.Storage.get('movie_card_logo_enabled', true);
      
      var css = style.textContent;
      
      if (isEnabled) {
          // Головна назва / логотип фільму
          css += '.full-start-new__title { display: flex !important; justify-content: flex-start !important; align-items: center !important; height: auto !important; min-height: unset !important; overflow: visible !important; width: 100% !important; box-sizing: border-box !important; margin: 4px 0 2px 0 !important; z-index: 2 !important; position: relative !important; } ';
          css += '.full-start-new__title:not(:has(img)) { color: transparent !important; }'; 
          css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 55vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.9)); margin: 0 !important; display: block !important; } ';
          
          // Слоган
          css += '.full-start-new__tagline { display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 0.9em !important; margin: 4px 0 10px 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; z-index: 2 !important; position: relative !important; } ';

          // Верхній рядок: рік і країни (як на скріншоті)
          css += '.full-start-new__head { display: block !important; font-size: 0.9em !important; color: rgba(255,255,255,0.75) !important; margin-bottom: 2px !important; z-index: 2 !important; position: relative !important; }';

          if (showStudio) {
              // Логотип студії під роком/країнами, над назвою фільму
              css += '.full-start-new__body { display: flex; flex-direction: column; position: relative; }';
              css += '.studio-header-brand { order: 0; width: 100%; display: flex; justify-content: flex-start; align-items: center; margin: 2px 0 6px 0 !important; z-index: 2 !important; position: relative !important; } ';
              css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 130px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';
              css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';
          }
      }

      style.textContent = css;
  }
  document.head.appendChild(style);  

  /* ---------- СЛАЙДШОУ ---------- */  
  var bgTimer = null, bgCardId = null, bgActive = false;  
  
  function stopSlideshow() {  
    bgActive = false;  
    if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }  
    if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }  
    bgCardId = null;  
  }  
  
  function slideshowEnabled() {  
    return Lampa.Storage.get('card_slideshow', true);  
  }  
  function slideshowInterval() {  
    return parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10) * 1000;  
  }  
  
  function tmdbApi(path) {  
    try { return Lampa.TMDB.api(path + '&api_key=' + Lampa.TMDB.key()); } catch (e) {}  
    return 'https://api.themoviedb.org/3/' + path;  
  }  
  
  function startSlideshow(e) {  
    stopSlideshow();  
    var movie = (e.data && e.data.movie) || e.object.movie || {};  
    if (!movie.id || !slideshowEnabled()) return;  
    bgCardId = movie.id;  
    bgActive = true;  
  
    var render  = e.object.activity.render();  
    var method  = movie.number_of_seasons ? 'tv' : 'movie';  
    var curLang = (Lampa.Storage.get('language', 'uk') || 'uk').split('-')[0];  
  
    Lampa.Network.silent(  
      tmdbApi(method + '/' + movie.id + '/images?include_image_language=' + curLang + ',en,null'),  
      function (res) {  
        if (!bgActive || bgCardId !== movie.id) return;  
  
        var langB = [], noLangB = [], otherB = [];  
        (res && res.backdrops || []).forEach(function (b) {  
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
  
        var i = 0;  
        bgTimer = setInterval(function () {  
          if (!bgActive || bgCardId !== movie.id) { clearInterval(bgTimer); bgTimer = null; return; }  
  
          var url = Lampa.TMDB.image('t/p/original' + backdrops[i++ % backdrops.length].file_path);  
  
          var $bgImg = render.find('.full-start__background img, img.full-start__background').last();  
          if (!$bgImg.length) $bgImg = $(document).find('img.full-start__background').last();  
          if (!$bgImg.length) return;  
  
          var pre = new Image();  
          pre.onload = function () {  
            if (!bgActive || bgCardId !== movie.id) return;  
            var $container = render.find('.full-start__background');  
            if (!$container.length) $container = $bgImg;  
  
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
      },  
      function () {},  
      false, { cache: { life: 60 * 60 } }  
    );  
  }  
  
  /* ---------- ІНТЕГРАЦІЯ ДАНИХ ---------- */  
  function applyMovieDetailsData(data, movie, $render, translations) {
      if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;

      var year = (data.release_date || data.first_air_date || '').split('-')[0];
      var countries = (data.production_countries && data.production_countries.length > 0) ? 
          data.production_countries.map(function(c) { return c.name; }).join(' | ') : '';
      
      var extraInfo = [];
      if (year) extraInfo.push(year);
      if (countries) extraInfo.push(countries);
      var formattedDetails = extraInfo.join(', ');

      // Виводимо рік і країни у блок .full-start-new__head (над студією та назвою)
      setTimeout(function() {
          var $headLine = $render.find('.full-start-new__head');
          if ($headLine.length > 0 && formattedDetails) {
              $headLine.text(formattedDetails).show();
          } else if ($headLine.length === 0 && formattedDetails) {
              var $titleBlock = $render.find('.full-start-new__title');
              if ($titleBlock.length > 0) {
                  $titleBlock.before('<div class="full-start-new__head">' + formattedDetails + '</div>');
              }
          }
      }, 50);

      // Логотип фільму
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

      // Слоган
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
              $render.find('.full-start-new__title').after($tagline);
          }
          $tagline.text(taglineText);
      }

      // Логотип студії
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
              
              // Вставляємо одразу після рядка з роком/країнами (перед назвою)
              var $head = $render.find('.full-start-new__head');
              if ($head.length > 0) {
                  $head.after($brand);
              } else {
                  $render.find('.full-start-new__title').before($brand);
              }
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
      ).done(function(resData, resTrans) {
          if (currentActiveId !== movieId) return;
          var data = resData[0];
          var translations = resTrans[0];

          detailsCache[movieId] = { data: data, translations: translations };
          applyMovieDetailsData(data, movie, $render, translations);
      });
  }

  function moveInfo(e) {  
    if (e.type !== 'complite' && e.type !== 'complete') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
    var body    = render.find('.full-start-new__body');  
    var wrapper = render.find('.card-tweaks__buttons');  

    if (body.length && !wrapper.length) {  
      wrapper = $('<div class="card-tweaks__buttons"></div>');  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        wrapper.append(this);  
      });  
      if (wrapper.children().length) body.after(wrapper);  
    }  
  
    if (details.length && !details.find('.full-descr__info--moved').length) {  
      function addInfo(name, value) {  
        details.append(  
          '<div class="full-descr__info full-descr__info--moved">' +  
            '<div class="full-descr__info-name">' + name + '</div>' +  
            '<div class="full-descr__info-body">' + value + '</div>' +  
          '</div>'  
        );  
      }  
      function toInfo(el, name) {  
        if (!el.length || el.hasClass('hide')) return;  
        addInfo(name, el.text().trim());  
        el.hide();  
      }  
  
      toInfo(render.find('.full-start__pg'),     'Віковий рейтинг');  
      toInfo(render.find('.full-start__status'), 'Статус');  
  
      var movie = (e.data && e.data.movie) || e.object.movie || {};  
      var rd = movie.release_date || movie.first_air_date;  
      if (rd && new Date(rd) > new Date()) {  
        addInfo('У прокаті з', Lampa.Utils.parseTime(rd).full);  
      }  
    }

    var $scrollContainer = render.find('.scroll');
    if (!$scrollContainer.length) $scrollContainer = render;

    $scrollContainer.on('scroll', function() {
        var scrollTop = $(this).scrollTop();
        var $startBlock = render.find('.full-start-new, .full-start');
        if (scrollTop > 80) {
            $startBlock.addClass('is-scrolled');
        } else {
            $startBlock.removeClass('is-scrolled');
        }
    });

    startSlideshow(e);
    loadMovieDetails((e.data && e.data.movie) || e.object.movie || {}, render);
  }  

  /* ---------- НАЛАШТУВАННЯ ---------- */  
  var CARD_ICON = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2 9h20" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="6.5" r="0.8" fill="currentColor"/></svg>';  
  
  function addSettings() {  
    if (typeof Lampa.SettingsApi === 'undefined' || !Lampa.SettingsApi.addComponent) return;  
  
    Lampa.SettingsApi.addComponent({ component: 'card_tweaks', name: 'Картка', icon: CARD_ICON });  
  
    Lampa.SettingsApi.addParam({ 
        component: 'card_tweaks', 
        param: { name: 'movie_card_logo_enabled', type: 'trigger', default: true }, 
        field: { name: 'Увімкнути логотип', description: 'Відображати логотип фільму замість звичайної назви' }, 
        onChange: applyStyles 
    });

    Lampa.SettingsApi.addParam({ 
        component: 'card_tweaks', 
        param: { name: 'movie_card_logo_studio', type: 'trigger', default: true }, 
        field: { name: 'Логотип студії', description: 'Відображати чи не відображати логотип студії/телеканалу' }, 
        onChange: applyStyles 
    });

    Lampa.SettingsApi.addParam({ 
        component: 'card_tweaks', 
        param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true }, 
        field: { name: 'Слоган фільму', description: 'Відображати чи не відображати слоган під логотипом' }, 
        onChange: applyStyles 
    });

    Lampa.SettingsApi.addParam({ 
        component: 'card_tweaks', 
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
        component: 'card_tweaks', 
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

    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: { name: 'card_slideshow', type: 'trigger', default: true },  
      field: { name: 'Слайдшоу фону', description: 'Прокручувати арти фільму на тлі картки' },  
      onChange: function (v) { if (v === false || v === 'false') stopSlideshow(); }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow_interval',  
        type: 'select',  
        values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' },  
        default: '10'  
      },  
      field: { name: 'Інтервал слайдшоу', description: 'Як часто змінюється фонове зображення' }  
    });  
  }  
  
  function onFull(e) {  
    if (e.type === 'complite' || e.type === 'complete') moveInfo(e);  
    if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {
        currentActiveId = null;
        stopSlideshow();  
    }
  }  
  
  if (window.appready) {  
    applyStyles();
    addSettings();  
    Lampa.Listener.follow('full', onFull);  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') {  
        applyStyles();
        addSettings();  
        Lampa.Listener.follow('full', onFull);  
      }  
    });  
  }  
})();
