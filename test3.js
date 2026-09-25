(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // приховати рік/країну над назвою  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // фон чіткий і яскравий + плавний fade для слайдшоу  
    '.full-start__background, .full-start-new__background {' +  
    '  opacity: 1 !important;' +  
    '  filter: none !important;' +  
    '  -webkit-filter: none !important;' +  
    '  transition: opacity 0.4s ease;' +  
    '}' +  
    '.background__one.visible, .background__two.visible {' +  
    '  opacity: 1 !important;' +  
    '  filter: none !important;' +  
    '  -webkit-filter: none !important;' +  
    '}' +  
  
    // рейтинг у верхній правий кут  
    '.full-start-new, .full-start { position: relative !important; }' +  
    '.full-start-new__rate-line, .full-start__rate-line {' +  
    '  position: absolute !important;' +  
    '  top: 1.5em; right: 1.5em; z-index: 5;' +  
    '  margin: 0 !important;' +  
    '  display: flex; gap: 0.8em; align-items: center;' +  
    '  background: rgba(0,0,0,0.45);' +  
    '  padding: 0.4em 0.9em; border-radius: 0.5em;' +  
    '}' +  
  
    // кнопки під верхнім блоком  
    '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; }' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container { margin-top: 0.6em; }';  
  document.head.appendChild(style);  
  
  /* ---------- НАЛАШТУВАННЯ ---------- */  
  function slideshowEnabled() {  
    return Lampa.Storage.get('card_slideshow', true);  
  }  
  function slideshowInterval() {  
    return parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10) * 1000;  
  }  
  
  /* ---------- СЛАЙДШОУ (preload + blind swap) ---------- */  
  var bgTimer = null, bgCardId = null, bgActive = false;  
  
  function stopSlideshow() {  
    bgActive = false;  
    if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }  
    if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }  
    bgCardId = null;  
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
  
        // пріоритет: безмовні арти → мова інтерфейсу → інші за рейтингом  
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
  
          // preload кадру в пам'ять — ключ від ривків на TV  
          var pre = new Image();  
          pre.onload = function () {  
            if (!bgActive || bgCardId !== movie.id) return;  
            var $container = render.find('.full-start__background');  
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
      },  
      function () {},  
      false, { cache: { life: 60 * 60 } }  
    );  
  }  
  
  /* ---------- ПЕРЕНЕСЕННЯ БЛОКІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
  
    // кнопки під верхнім блоком, на всю ширину  
    var body    = render.find('.full-start-new__body');  
    var wrapper = render.find('.card-tweaks__buttons');  
    if (body.length && !wrapper.length) {  
      wrapper = $('<div class="card-tweaks__buttons"></div>');  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        wrapper.append(this);  
      });  
      if (wrapper.children().length) body.after(wrapper);  
    }  
  
    if (!details.length || details.find('.full-descr__info--moved').length) {  
      startSlideshow(e);  
      return;  
    }  
  
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
  
    startSlideshow(e);  
  }  
  
  /* ---------- НАЛАШТУВАННЯ В МЕНЮ ---------- */  
  var CARD_ICON = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2 9h20" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="6.5" r="0.8" fill="currentColor"/></svg>';  
  
  function addSettings() {  
    if (typeof Lampa.SettingsApi === 'undefined' || !Lampa.SettingsApi.addComponent) return;  
  
    Lampa.SettingsApi.addComponent({ component: 'card_tweaks', name: 'Картка', icon: CARD_ICON });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: { name: 'card_slideshow', type: 'trigger', "default": true },  
      field: { name: 'Слайдшоу фону', description: 'Прокручувати арти фільму на тлі картки' },  
      onChange: function (v) { if (v === false || v === 'false') stopSlideshow(); }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow_interval',  
        type: 'select',  
        values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' },  
        "default": '10'  
      },  
      field: { name: 'Інтервал слайдшоу', description: 'Як часто змінюється фонове зображення' }  
    });  
  }  
  
  /* ---------- ЗАПУСК ---------- */  
  function onFull(e) {  
    if (e.type === 'complite') moveInfo(e);  
    if (e.type === 'destroy') stopSlideshow();  
  }  
  
  if (window.appready) {  
    addSettings();  
    Lampa.Listener.follow('full', onFull);  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') {  
        addSettings();  
        Lampa.Listener.follow('full', onFull);  
      }  
    });  
  }  
})();
