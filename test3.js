(function () {  
  'use strict';  
  
  /* ---------- КЕШ / СТАН ---------- */  
  var detailsCache = {};  
  var currentActiveId = null;  
  var currentInterval = null;  
  
  /* ---------- ДЕФОЛТНІ НАЛАШТУВАННЯ ---------- */  
  [  
    { id: 'movie_card_logo_enabled', default: true },  
    { id: 'movie_card_logo_studio',  default: true },  
    { id: 'movie_card_logo_tagline', default: true },  
    { id: 'movie_card_logo_size',    default: '120' },  
    { id: 'movie_card_logo_quality', default: 'w500' },  
    { id: 'card_rate_corner',        default: true },  
    { id: 'card_buttons_bottom',     default: true },  
    { id: 'card_slideshow',          default: true },  
    { id: 'card_slideshow_interval', default: '10' }  
  ].forEach(function (opt) {  
    if (Lampa.Storage.get(opt.id, 'unset') === 'unset')  
      Lampa.Storage.set(opt.id, opt.default);  
  });  
  
  /* ---------- isImageDark (ваша, без змін) ---------- */  
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
        var total = 0, hasColor = false, count = 0;  
        for (var i = 0; i < data.length; i += 4) {  
          if (data[i + 3] > 50) {  
            var r = data[i], g = data[i + 1], b = data[i + 2];  
            total += (r * 299 + g * 587 + b * 114) / 1000;  
            count++;  
            if (Math.max(r, g, b) - Math.min(r, g, b) > 30) hasColor = true;  
          }  
        }  
        var avg = count ? total / count : 255;  
        callback(avg < 110 && !hasColor);  
      } catch (e) { callback(false); }  
    };  
    img.onerror = function () { callback(false); };  
    img.src = imgSrc;  
  }  
  
  /* ---------- СТИЛІ (динамічні, від налаштувань) ---------- */  
  function applyStyles() {  
    var style = document.getElementById('card-tweaks-styles');  
    if (!style) {  
      style = document.createElement('style');  
      style.id = 'card-tweaks-styles';  
      document.head.appendChild(style);  
    }  
  
    var enabled    = Lampa.Storage.get('movie_card_logo_enabled', true);  
    var lHeight    = Lampa.Storage.get('movie_card_logo_size', '120');  
    var showStudio = Lampa.Storage.get('movie_card_logo_studio', true);  
    var showTag    = Lampa.Storage.get('movie_card_logo_tagline', true);  
    var rateCorner = Lampa.Storage.get('card_rate_corner', true);  
  
    var css = '';  
  
    if (enabled) {  
      css += '.full-start-new__head, .full-start__tags { display: none !important; } ';  
      css += '.full-start-new__title { display: flex !important; justify-content: flex-start !important; align-items: center !important; height: auto !important; min-height: unset !important; overflow: visible !important; width: 100% !important; box-sizing: border-box !important; margin: 4px 0 !important; } ';  
      css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 55vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 20px rgba(0,0,0,0.9)); margin: 0 !important; } ';  
      css += '.full-start-new__tagline { display: ' + (showTag ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 0.9em !important; margin: 4px 0 0 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; } ';  
      if (showStudio) {  
        css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';  
        css += '.studio-header-brand img { height: 20px !important; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9)); opacity: 0.95; } ';  
        css += '.studio-header-brand img.is-dark-logo { filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8)) !important; } ';  
      }  
    }  
  
    // фон чіткий + fade для слайдшоу (ваша схема)  
    css += '.full-start__background, .full-start-new__background { opacity: 1 !important; filter: none !important; -webkit-filter: none !important; transition: opacity 0.4s ease; } ';  
  
    // рейтинг у верхній правий кут  
    if (rateCorner) {  
      css += '.full-start-new, .full-start { position: relative !important; } ';  
      css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 1.5em; right: 1.5em; z-index: 5; margin: 0 !important; display: flex; gap: 0.8em; align-items: center; background: rgba(0,0,0,0.45); padding: 0.4em 0.9em; border-radius: 0.5em; } ';  
    }  
  
    // кнопки під верхнім блоком  
    css += '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; } ';  
    css += '.card-tweaks__buttons .full-start-new__buttons, .card-tweaks__buttons .buttons--container { margin-top: 0.6em; } ';  
  
    style.textContent = css;  
  }  
  
  /* ---------- DOM-ТВІКИ КАРТКИ ---------- */  
  function moveInfo(e) {  
    if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
  
    if (details.length && !details.find('.full-descr__info--moved').length) {  
      function toInfo(el, name) {  
        if (!el.length || el.hasClass('hide')) return;  
        details.append(  
          '<div class="full-descr__info full-descr__info--moved">' +  
            '<div class="full-descr__info-name">' + name + '</div>' +  
            '<div class="full-descr__info-body">' + el.text().trim() + '</div>' +  
          '</div>'  
        );  
        el.hide();  
      }  
      toInfo(render.find('.full-start__pg'),     'Віковий рейтинг');  
      toInfo(render.find('.full-start__status'), 'Статус');  
    }  
  
    if (Lampa.Storage.get('card_buttons_bottom', true)) {  
      var body    = render.find('.full-start-new__body, .full-start__body');  
      var buttons = render.find('.full-start-new__buttons, .buttons--container');  
      if (body.length && buttons.length && !render.find('.card-tweaks__buttons').length) {  
        var wrap = $('<div class="card-tweaks__buttons"></div>');  
        buttons.each(function () { wrap.append(this); });  
        body.after(wrap);  
      }  
    }  
  }  
  
  /* ---------- СЛАЙДШОУ (з preload, ваша схема) ---------- */  
  function stopSlideshow() {  
    if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }  
  }  
  
  function slideshowInterval() {  
    var v = parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10);  
    return (isNaN(v) ? 10 : v) * 1000;  
  }  
  
  function tmdbImg(path) {  
    try { return Lampa.TMDB.image('t/p/original' + path); } catch (e) {}  
    return 'https://image.tmdb.org/t/p/original' + path;  
  }  
  
  function startSlideshow(movie, backdrops, render) {  
    stopSlideshow();  
    if (!Lampa.Storage.get('card_slideshow', true)) return;  
  
    // лише арти без написів  
    backdrops = (backdrops || []).filter(function (b) { return !b.iso_639_1; })  
                                 .sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); })  
                                 .slice(0, 8);  
    if (backdrops.length < 2) return;  
  
    var idx = 0;  
    currentInterval = setInterval(function () {  
      if (currentActiveId !== movie.id) { stopSlideshow(); return; }  
  
      var nextSrc = tmdbImg(backdrops[idx % backdrops.length].file_path);  
      idx++;  
  
      var img = new Image();  
      img.onload = function () {  
        if (currentActiveId !== movie.id) return;  
        var $bg = render.find('img.full-start__background, img.full-start-new__background');  
        if (!$bg.length) $bg = $(document).find('img.full-start__background').first();  
        if (!$bg.length) return;  
  
        var $container = $bg;  
        $container.css({ transition: 'opacity 0.4s ease', opacity: 0 });  
        setTimeout(function () {  
          if (currentActiveId !== movie.id) return;  
          $bg.attr('src', nextSrc);  
          setTimeout(function () {  
            if (currentActiveId !== movie.id) return;  
            $container.css('opacity', 1);  
          }, 100);  
        }, 400);  
      };  
      img.onerror = function () {};  
      img.src = nextSrc;  
    }, slideshowInterval());  
  }  
  
  /* ---------- ДАНІ КАРТКИ: лого/студія/slote/slideshow (ваша база) ---------- */  
  function applyMovieDetailsData(data, movie, $render, translations) {  
    if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
  
    // рік + країни у рядок з тривалістю/жанром  
    var year = (data.release_date || data.first_air_date || '').split('-')[0];  
    var countries = (data.production_countries || []).map(function (c) { return c.name; }).join(' • ');  
    var extraInfo = [];  
    if (year) extraInfo.push(year);  
    if (countries) extraInfo.push(countries);  
    var formattedDetails = extraInfo.join(' • ');  
  
    setTimeout(function () {  
      var $infoLine = $render.find('.full-start-new__info, .full-start__info');  
      if ($infoLine.length && formattedDetails) {  
        var original = $infoLine.attr('data-original-text');  
        if (!original) { original = $infoLine.text(); $infoLine.attr('data-original-text', original); }  
        if (original.indexOf(formattedDetails) === -1)  
          $infoLine.text(formattedDetails + ' • ' + original);  
      }  
    }, 50);  
  
    // логотип фільму замість назви  
    if (data.images && data.images.logos && data.images.logos.length) {  
      var lang = Lampa.Storage.get('language') || 'uk';  
      var logo = data.images.logos.filter(function (l) { return l.iso_639_1 === lang; })[0] ||  
                 data.images.logos.filter(function (l) { return l.iso_639_1 === 'en'; })[0] ||  
                 data.images.logos[0];  
      if (logo) {  
        var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
        var logoUrl = Lampa.TMDB.image('/t/p/' + quality + logo.file_path.replace('.svg', '.png'));  
        $render.find('.full-start-new__title').html('<img src="' + logoUrl + '">');  
      }  
    }  
  
    // слоган (uk з translations → data.tagline)  
    var taglineText = '';  
    if (translations && translations.translations) {  
      var ua = translations.translations.find(function (t) { return t.iso_639_1 === 'uk'; });  
      if (ua && ua.data && ua.data.tagline) taglineText = ua.data.tagline;  
    }  
    if (!taglineText && data.tagline) taglineText = data.tagline;  
  
    if (taglineText && taglineText.trim()) {  
      var $tagline = $render.find('.full-start-new__tagline');  
      if (!$tagline.length) {  
        $tagline = $('<div class="full-start-new__tagline"></div>');  
        $render.find('.full-start-new__title').after($tagline);  
      }  
      $tagline.text(taglineText);  
    }  
  
    // логотип студії  
    if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
      $render.find('.studio-header-brand').remove();  
      var studio = (data.networks || []).find(function (n) { return n.logo_path; }) ||  
                   (data.production_companies || []).find(function (c) { return c.logo_path; });  
      if (studio && studio.logo_path) {  
        var studioUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
        var $brand = $('<div class="studio-header-brand"><img src="' + studioUrl + '" alt="' + (studio.name || '') + '"></div>');  
        var $img = $brand.find('img');  
        $img.on('error', function () { $brand.remove(); });  
        isImageDark(studioUrl, function (isDark) { if (isDark) $img.addClass('is-dark-logo'); });  
        $render.find('.full-start-new__title').before($brand);  
      }  
    }  
  
    // слайдшоу — з того ж запиту (data.images.backdrops)  
    if (data.images && data.images.backdrops)  
      startSlideshow(movie, data.images.backdrops, $render);  
  }  
  
  function loadMovieDetails(movie, $render) {  
    if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  
    var movieId = movie.id;  
    if (!movieId) return;  
    currentActiveId = movieId;  
  
    if (detailsCache[movieId]) {  
      applyMovieDetailsData(detailsCache[movieId].data, movie, $render, detailsCache[movieId].translations);  
      return;  
    }  
  
    var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';  
    var key  = (function () { try { return Lampa.TMDB.key(); } catch (e) { return ''; } })();  
    var url      = 'https://api.themoviedb.org/3/' + type + '/' + movieId +  
                   '?api_key=' + key + '&append_to_response=images&include_image_language=uk,en,null';  
    var transUrl = 'https://api.themoviedb.org/3/' + type + '/' + movieId +  
                   '/translations?api_key=' + key;  
  
    $.when(  
      $.ajax({ url: url,      type: 'GET', dataType: 'json' }),  
      $.ajax({ url: transUrl, type: 'GET', dataType: 'json' })  
    ).done(function (resData, resTrans) {  
      if (currentActiveId !== movieId) return;  
      detailsCache[movieId] = { data: resData[0], translations: resTrans[0] };  
      applyMovieDetailsData(resData[0], movie, $render, resTrans[0]);  
    });  
  }  
  
  /* ---------- СЛУХАЧ ---------- */  
 /* ---------- ОБРОБКА ДЕТАЛЕЙ ---------- */  
  function applyMovieDetailsData(data, movie, $render, transData) {  
    var lang = Lampa.Storage.get('language', 'uk');  
    var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');  
    var maxH = Lampa.Storage.get('movie_card_logo_size', '120');  
    var images = (data && data.images) || {};  
  
    // --- Логотип назви фільму ---  
    if (Lampa.Storage.get('movie_card_logo_enabled', true)) {  
      var logos = images.logos || [];  
      var logo = pickByLang(logos, lang);  
      var $title = $render.find('.full-start-new__title, .full-start__title');  
      if (logo && $title.length && !$render.find('.mcl-title-logo').length) {  
        var imgUrl = 'https://image.tmdb.org/t/p/' + quality + logo.file_path;  
        var $logoImg = $('<img class="mcl-title-logo" src="' + imgUrl + '" ' +  
          'style="max-height:' + maxH + 'px; max-width:60%; display:block; margin-bottom:0.6em;">');  
        $title.before($logoImg);  
        $title.css('font-size', '0.5em'); // текстова назва лишається маленькою під лого  
      }  
    }  
  
    // --- Логотип студії ---  
    if (Lampa.Storage.get('movie_card_logo_studio', true)) {  
      var companies = (data && data.production_companies) || [];  
      var studio = companies.filter(function (c) { return c.logo_path; })[0];  
      var $details = $render.find('.full-descr__details');  
      if (studio && $details.length && !$details.find('.mcl-studio').length) {  
        $details.prepend(  
          '<div class="full-descr__info mcl-studio">' +  
            '<img src="https://image.tmdb.org/t/p/w300' + studio.logo_path + '" ' +  
            'style="max-height:3em; max-width:100%; filter:brightness(0) invert(1);">' +  
          '</div>'  
        );  
      }  
    }  
  
    // --- Слоган ---  
    if (Lampa.Storage.get('movie_card_logo_tagline', true)) {  
      var tagline = (transData && pickTranslation(transData, lang)) || movie.tagline || (data && data.tagline);  
      var $tag = $render.find('.full-start-new__tagline, .full-start__tagline');  
      if (tagline && !$tag.length) {  
        $render.find('.full-start-new__title, .full-start__title')  
          .after('<div class="mcl-tagline" style="opacity:0.7; font-style:italic; margin-bottom:0.8em;">' + tagline + '</div>');  
      }  
    }  
  
    // --- Слоган/віковий рейтинг/статус у "Детально" ---  
    moveInfo($render, movie);  
  
    // --- Слайдшоу з уже отриманих backdrops ---  
    startSlideshow($render, images.backdrops || [], lang);  
  }  
  
  function pickByLang(list, lang) {  
    var byLang  = list.filter(function (i) { return i.iso_639_1 === lang; })[0];  
    var byEn    = list.filter(function (i) { return i.iso_639_1 === 'en'; })[0];  
    var noLang  = list.filter(function (i) { return !i.iso_639_1; })[0];  
    return byLang || byEn || noLang || list[0];  
  }  
  
  function pickTranslation(transData, lang) {  
    var t = (transData && transData.translations) || [];  
    var hit = t.filter(function (x) { return x.iso_639_1 === lang && x.data && x.data.tagline; })[0];  
    return hit ? hit.data.tagline : '';  
  }  
  
  /* ---------- ПЕРЕНЕСЕННЯ pg/status + кнопок ---------- */  
  function moveInfo($render, movie) {  
    var details = $render.find('.full-descr__details');  
    if (!details.length) return;  
  
    if (!details.find('.full-descr__info--moved').length) {  
      function toInfo(sel, name) {  
        var el = $render.find(sel);  
        if (!el.length || el.hasClass('hide')) return;  
        details.append(  
          '<div class="full-descr__info full-descr__info--moved">' +  
            '<div class="full-descr__info-name">' + name + '</div>' +  
            '<div class="full-descr__info-body">' + el.text().trim() + '</div>' +  
          '</div>'  
        );  
        el.hide();  
      }  
      toInfo('.full-start__pg', 'Віковий рейтинг');  
      toInfo('.full-start__status', 'Статус');  
    }  
  
    if (Lampa.Storage.get('card_buttons_bottom', true)) {  
      var body = $render.find('.full-start-new__body');  
      var wrapper = $render.find('.card-tweaks__buttons');  
      if (body.length && !wrapper.length) {  
        wrapper = $('<div class="card-tweaks__buttons"></div>');  
        $render.find('.full-start-new__buttons, .buttons--container').each(function () {  
          wrapper.append(this);  
        });  
        if (wrapper.children().length) body.after(wrapper);  
      }  
    }  
  }  
  
  /* ---------- СЛАЙДШОУ (preload + fade "в сліпу") ---------- */  
  function stopSlideshow() {  
    if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }  
    if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }  
  }  
  
  function startSlideshow($render, backdrops, currentLang) {  
    stopSlideshow();  
    if (!Lampa.Storage.get('card_slideshow', true)) return;  
    if (!backdrops || backdrops.length <= 1) return;  
  
    var no_lang = backdrops.filter(function (b) { return !b.iso_639_1 || b.iso_639_1 === 'xx'; });  
    var pool = (no_lang.length > 1 ? no_lang : backdrops).slice(0, 8);  
    if (pool.length < 2) return;  
  
    var idx = 0;  
    var intervalTime = parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10) * 1000;  
  
    currentInterval = setInterval(function () {  
      var $container = $render.find('.full-start__background, .full-start-new__background');  
      if (!$container.length) return;  
      var $bgImg = $container.is('img') ? $container : $container.find('img');  
      if (!$bgImg.length) return;  
  
      idx = (idx + 1) % pool.length;  
      var nextSrc = 'https://image.tmdb.org/t/p/w1280' + pool[idx].file_path;  
  
      var img = new Image();  
      img.onload = function () {  
        $container.css({ transition: 'opacity 0.4s ease', opacity: 0 });  
        setTimeout(function () {  
          $bgImg.attr('src', nextSrc);  
          setTimeout(function () { $container.css('opacity', 1); }, 100);  
        }, 400);  
      };  
      img.src = nextSrc;  
    }, intervalTime);  
  
    window.casBgInterval = currentInterval;  
  }  
  
  /* ---------- НАЛАШТУВАННЯ ---------- */  
  function setupSettings() {  
    Lampa.SettingsApi.addComponent({  
      component: 'movie_card_logo',  
      name: 'Картка',  
      icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2 9h20" stroke="currentColor" stroke-width="2"/></svg>'  
    });  
  
    function param(p, field) {  
      Lampa.SettingsApi.addParam({ component: 'movie_card_logo', param: p, field: field });  
    }  
  
    param({ name: 'movie_card_logo_enabled', type: 'trigger', default: true },  
          { name: 'Логотип назви фільму' });  
    param({ name: 'movie_card_logo_studio', type: 'trigger', default: true },  
          { name: 'Логотип студії' });  
    param({ name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
          { name: 'Слоган' });  
    param({ name: 'movie_card_logo_size', type: 'select',  
            values: { '80': 'Малий', '120': 'Середній', '160': 'Великий' }, default: '120' },  
          { name: 'Розмір логотипа назви' });  
    param({ name: 'movie_card_logo_quality', type: 'select',  
            values: { 'w300': 'Низька (w300)', 'w500': 'Середня (w500)', 'w780': 'Висока (w780)', 'original': 'Оригінал' }, default: 'w500' },  
          { name: 'Якість логотипа' });  
    param({ name: 'card_rate_corner', type: 'trigger', default: true },  
          { name: 'Рейтинг у верхньому куті' });  
    param({ name: 'card_buttons_bottom', type: 'trigger', default: true },  
          { name: 'Кнопки під блоком картки' });  
    param({ name: 'card_slideshow', type: 'trigger', default: true },  
          { name: 'Слайдшоу фону' });  
    param({ name: 'card_slideshow_interval', type: 'select',  
            values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' }, default: '10' },  
          { name: 'Інтервал слайдшоу' });  
  }  
  
  /* ---------- СЛУХАЧ ---------- */  
  function init() {  
    Lampa.Listener.follow('full', function (e) {  
      if (e.type !== 'complite') return;  
      var movie = (e.data && e.data.movie) || (e.object && e.object.movie);  
      var render = e.object && e.object.activity && e.object.activity.render();  
      if (!movie || !movie.id || !render) return;  
      var $render = render instanceof jQuery ? render : $(render);  
      loadDetails(movie, $render);  
    });  
  
    Lampa.Listener.follow('activity', function (e) {  
      if (e.type === 'destroy') { stopSlideshow(); currentActiveId = null; }  
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
