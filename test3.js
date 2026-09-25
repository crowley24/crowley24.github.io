(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // приховати рік/країну над назвою  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // фон чіткий і яскравий  
    '.full-start__background, .full-start-new__background {' +  
    '  opacity: 1 !important;' +  
    '  filter: none !important;' +  
    '  -webkit-filter: none !important;' +  
    '}' +  
  
    // преміальна анімація слайдшоу: crossfade + Ken Burns zoom  
    '.full-start__background, .full-start-new__background {' +  
    '  transition: opacity 0.8s ease-in-out, transform 12s linear !important;' +  
    '  transform-origin: 50% 50%;' +  
    '  will-change: transform, opacity;' +  
    '}' +  
    '.ct-bg-fade { opacity: 0 !important; }' +  
    '.ct-bg-zoom { transform: scale(1.12); }' +  
  
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
  
    // кнопки під верхнім блоком, на всю ширину  
    '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; }' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container { margin-top: 0.6em; }';  
  document.head.appendChild(style);  
  
  /* ---------- НАЛАШТУВАННЯ ---------- */  
  var CARD_ICON =  
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
    '<rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/>' +  
    '<rect x="4" y="6" width="7" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>' +  
    '<line x1="14" y1="8" x2="20" y2="8" stroke="currentColor" stroke-width="1.5"/>' +  
    '<line x1="14" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="1.5"/>' +  
    '<line x1="14" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1.5"/>' +  
    '</svg>';  
  
  function addSettings() {  
    if (!Lampa.SettingsApi) return;  
    Lampa.SettingsApi.addComponent({  
      component: 'card_tweaks',  
      name: 'Картка',  
      icon: CARD_ICON  
    });  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: { name: 'card_slideshow', type: 'trigger', "default": true },  
      field: { name: 'Слайдшоу фону', description: 'Зміна фонових артів картки (без написів)' }  
    });  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow_interval',  
        type: 'select',  
        values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' },  
        "default": '10'  
      },  
      field: { name: 'Інтервал слайдшоу', description: 'Як часто змінювати фонову картинку' }  
    });  
  }  
  
  function slideshowEnabled()  { return Lampa.Storage.get('card_slideshow', true); }  
  function slideshowInterval() { return parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10) * 1000; }  
  
  /* ---------- СЛАЙДШОУ ---------- */  
  var bgTimer = null, bgCardId = null;  
  var origins = ['0 0', '100% 0', '100% 100%', '0 100%', '50% 50%']; // lt rt br lb ct  
  
  function stopSlideshow() { clearInterval(bgTimer); bgTimer = null; bgCardId = null; }  
  
  function tmdbApi(path) {  
    try { return Lampa.TMDB.api(path + '&api_key=' + Lampa.TMDB.key()); } catch (e) {}  
    return 'https://api.themoviedb.org/3/' + path;  
  }  
  function tmdbImg(path) {  
    try { return Lampa.TMDB.image('t/p/original' + path); } catch (e) {}  
    return 'https://image.tmdb.org/t/p/original' + path;  
  }  
  
  function swapCardBackground(render, url) {  
    var swapped = false;  
  
    document.querySelectorAll('.full-start__background, .full-start-new__background').forEach(function (el) {  
      if (el.tagName !== 'IMG') return;  
      swapped = true;  
  
      // випадковий напрямок zoom (Ken Burns), як у .screensaver__slides  
      el.style.transformOrigin = origins[Math.floor(Math.random() * origins.length)];  
  
      // fade-out → підміна src → fade-in + zoom  
      el.classList.add('ct-bg-fade');  
      setTimeout(function () {  
        el.removeAttribute('srcset');  
        el.removeAttribute('data-src');  
        el.classList.remove('ct-bg-zoom');   // reset для нового циклу zoom  
        el.src = url;  
        requestAnimationFrame(function () {  
          requestAnimationFrame(function () {  
            el.classList.remove('ct-bg-fade');  
            el.classList.add('ct-bg-zoom');  
          });  
        });  
      }, 850);  
    });  
  
    return swapped;  
  }  
  
  function startSlideshow(e) {  
    var movie = (e.data && e.data.movie) || e.object.movie || {};  
    if (movie.id === bgCardId) return;  
    bgCardId = movie.id;  
    stopSlideshow(); bgCardId = movie.id;  
    if (!movie.id || !slideshowEnabled()) return;  
  
    var method = movie.number_of_seasons ? 'tv' : 'movie';  
    var render = e.object.activity.render();  
  
    Lampa.Network.silent(  
      tmdbApi(method + '/' + movie.id + '/images?include_image_language=null'),  
      function (res) {  
        var backdrops = (res && res.backdrops || [])  
          .filter(function (b) { return !b.iso_639_1; })  
          .slice(0, 8);  
        if (backdrops.length < 2) return;  
  
        var i = 0;  
        bgTimer = setInterval(function () {  
          if (bgCardId !== movie.id) return stopSlideshow();  
          swapCardBackground(render, tmdbImg(backdrops[i++ % backdrops.length].file_path));  
        }, slideshowInterval());  
      },  
      function () {}  
    );  
  }  
  
  /* ---------- ПЕРЕНОС БЛОКІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
  
    if (details.length && !details.find('.full-descr__info--moved').length) {  
      var addInfo = function (el, name) {  
        if (!el.length || el.hasClass('hide')) return;  
        details.append(  
          '<div class="full-descr__info full-descr__info--moved">' +  
            '<div class="full-descr__info-name">' + name + '</div>' +  
            '<div class="full-descr__info-body">' + el.text().trim() + '</div>' +  
          '</div>'  
        );  
        el.hide();  
      };  
      addInfo(render.find('.full-start__pg'),     'Віковий рейтинг');  
      addInfo(render.find('.full-start__status'), 'Статус');  
    }  
  
    // кнопки під верхнім блоком на всю ширину  
    var body    = render.find('.full-start-new__body, .full-start__body');  
    var wrapper = render.find('.card-tweaks__buttons');  
    if (body.length && !wrapper.length) {  
      var w = $('<div class="card-tweaks__buttons"></div>');  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        w.append(this);  
      });  
      if (w.children().length) body.after(w);  
    }  
  
    startSlideshow(e);  
  }  
  
  /* ---------- СТАРТ ---------- */  
  function start() {  
    addSettings();  
    Lampa.Listener.follow('full', moveInfo);  
    Lampa.Listener.follow('activity', function (e) {  
      if (e.type === 'destroy') stopSlideshow();  
    });  
  }  
  
  if (window.appready) start();  
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });  
})();
