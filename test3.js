(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // приховати рік/країну над назвою  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // фон чіткий і яскравий  
    '.full-start__background, .full-start-new__background,' +  
    '.ct-bg-layer {' +  
    '  opacity: 1 !important;' +  
    '  filter: none !important;' +  
    '  -webkit-filter: none !important;' +  
    '}' +  
  
    // crossfade-шари слайдшоу (без "провалу" в чорне)  
    '.ct-bg-layer {' +  
    '  position: absolute !important;' +  
    '  top: 0; left: 0; width: 100%; height: 100%;' +  
    '  object-fit: cover; object-position: top center;' +  
    '  z-index: -1;' +  
    '  opacity: 0 !important;' +  
    '  transition: opacity 0.7s ease-in-out, transform 16s linear !important;' +  
    '  will-change: opacity, transform;' +  
    '}' +  
    '.ct-bg-layer.ct-on {' +  
    '  opacity: 1 !important;' +  
    '}' +  
    '.ct-bg-layer.ct-zoom {' +  
    '  transform: scale(1.12);' +  
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
  
    // кнопки під верхнім блоком, на всю ширину  
    '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; }' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container { margin-top: 0.6em; }';  
  document.head.appendChild(style);  
  
  /* ---------- НАЛАШТУВАННЯ ---------- */  
  function slideshowEnabled() {  
    return Lampa.Storage.get('card_slideshow', true);  
  }  
  function slideshowInterval() {  
    return (parseInt(Lampa.Storage.get('card_slideshow_interval', '10')) || 10) * 1000;  
  }  
  
  var CARD_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="white" stroke-width="2"/><circle cx="8.5" cy="10" r="1.8" fill="white"/><path d="M3 18l5-5 3 3 4-4 6 6" stroke="white" stroke-width="2" fill="none"/></svg>';  
  
  function addSettings() {  
    Lampa.SettingsApi.addComponent({  
      component: 'card_tweaks',  
      name: 'Картка',  
      icon: CARD_ICON  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow',  
        type: 'trigger',  
        default: true  
      },  
      field: {  
        name: 'Слайдшоу фону',  
        description: 'Крутити backdrops фільму як фон картки'  
      },  
      onChange: function (v) {  
        if (!Lampa.Storage.get('card_slideshow', true)) stopSlideshow();  
      }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow_interval',  
        type: 'select',  
        values: { 5: '5 сек', 10: '10 сек', 15: '15 сек' },  
        default: '10'  
      },  
      field: {  
        name: 'Інтервал слайдшоу',  
        description: 'Як часто змінювати фонову картинку'  
      }  
    });  
  }  
  
  /* ---------- СЛАЙДШОУ (двошаровий crossfade) ---------- */  
  var bgTimer = null, bgCardId = null, bgActive = 0;  
  
  function stopSlideshow() {  
    clearInterval(bgTimer); bgTimer = null; bgCardId = null;  
  }  
  
  function tmdbApi(path) {  
    try { return Lampa.TMDB.api(path + '&api_key=' + Lampa.TMDB.key()); } catch (e) {}  
    return 'https://api.themoviedb.org/3/' + path;  
  }  
  function tmdbImg(path) {  
    try { return Lampa.TMDB.image('t/p/w1280' + path); } catch (e) {}  
    return 'https://image.tmdb.org/t/p/w1280' + path;  
  }  
  
  // два шари поверх рідного img — новий кадр напливає НА старий  
  function bgLayers() {  
    var host = document.querySelector('.full-start__background, .full-start-new__background');  
    if (!host) return null;  
    var wrap = host.parentNode;  
    if (getComputedStyle(wrap).position === 'static')  
      wrap.style.position = 'relative';  
  
    var a = wrap.querySelector('.ct-bg-layer.ct-a'),  
        b = wrap.querySelector('.ct-bg-layer.ct-b');  
  
    if (!a) {  
      a = document.createElement('img');  
      a.className = 'ct-bg-layer ct-a';  
      a.src = host.tagName === 'IMG' ? host.src : '';  
      if (a.src) a.classList.add('ct-on');  
      host.insertAdjacentElement('afterend', a);  
      // ховаємо рідний img — його місце займають шари  
      host.style.opacity = '0';  
    }  
    if (!b) {  
      b = document.createElement('img');  
      b.className = 'ct-bg-layer ct-b';  
      a.insertAdjacentElement('afterend', b);  
    }  
    return [a, b];  
  }  
  
  var origins = ['0 0', '100% 0', '100% 100%', '0 100%', '50% 50%'];  
  
  function swapCardBackground(url) {  
    var layers = bgLayers();  
    if (!layers) return false;  
  
    var cur  = layers[bgActive];       // зараз видимий  
    var next = layers[1 - bgActive];   // новий кадр поверх  
  
    // preload перед показом — без ривків  
    var pre = new Image();  
    pre.onload = function () {  
      if (bgCardId === null) return;  
      next.style.transformOrigin = origins[Math.floor(Math.random() * origins.length)];  
      next.classList.remove('ct-zoom');  
      next.src = url;  
  
      requestAnimationFrame(function () {  
        requestAnimationFrame(function () {  
          next.classList.add('ct-on', 'ct-zoom'); // fade-in + zoom  
          cur.classList.remove('ct-on');          // старий гасне ПІД новим  
          bgActive = 1 - bgActive;  
        });  
      });  
    };  
    pre.src = url;  
    return true;  
  }  
  
  function startSlideshow(e) {  
    var movie = (e.data && e.data.movie) || e.object.movie || {};  
    if (movie.id === bgCardId) return;  
    stopSlideshow();  
    bgCardId = movie.id;  
    if (!movie.id || !slideshowEnabled()) return;  
  
    var method = movie.number_of_seasons ? 'tv' : 'movie';  
  
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
          swapCardBackground(tmdbImg(backdrops[i++ % backdrops.length].file_path));  
        }, slideshowInterval());  
      },  
      function () {}  
    );  
  }  
  
  /* ---------- ПЕРЕНЕСЕННЯ БЛОКІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
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
  
    // кнопки під верхнім блоком (весь рядок, всю ширину)  
    var body    = render.find('.full-start-new__body, .full-start__body');  
    var wrapper = render.find('.card-tweaks__buttons');  
    if (body.length && !wrapper.length) {  
      wrapper = $('<div class="card-tweaks__buttons"></div>');  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        wrapper.append(this);  
      });  
      if (wrapper.children().length) body.after(wrapper);  
    }  
  
    startSlideshow(e);  
  }  
  
  /* ---------- ПІДПИСКА ---------- */  
  function start() {  
    addSettings();  
    Lampa.Listener.follow('full', moveInfo);  
    Lampa.Listener.follow('activity', function (e) {  
      if (e.type === 'destroy') stopSlideshow();  
    });  
  }  
  
  if (window.appready) {  
    start();  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') start();  
    });  
  }  
})();
