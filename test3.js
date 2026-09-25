(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // приховати рік/країну над назвою  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // фон без затемнення — чіткий і яскравий  
    '.full-start__background, .full-start-new__background {' +  
    '  opacity: 1 !important;' +  
    '  filter: none !important;' +  
    '  -webkit-filter: none !important;' +  
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
    return parseInt(Lampa.Storage.get('card_slideshow_interval', '10'), 10) * 1000;  
  }  
  
  function registerSettings() {  
    if (!Lampa.SettingsApi) return;  
  
    Lampa.SettingsApi.addComponent({  
      component: 'card_tweaks',  
      name: 'Картка'  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: { name: 'card_slideshow', type: 'trigger', default: true },  
      field: {  
        name: 'Слайдшоу фону',  
        description: 'Показувати зміну фонових артів у картці фільму'  
      },  
      onChange: function () {  
        if (!Lampa.Storage.get('card_slideshow', true)) stopSlideshow();  
      }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'card_tweaks',  
      param: {  
        name: 'card_slideshow_interval',  
        type: 'select',  
        values: { '5': '5 сек', '10': '10 сек', '15': '15 сек' },  
        default: '10'  
      },  
      field: {  
        name: 'Інтервал слайдшоу',  
        description: 'Як часто змінювати фонове зображення'  
      }  
    });  
  }  
  
  /* ---------- ПЕРЕНОС БЛОКІВ ---------- */  
  function addInfo(details, name, value) {  
    details.append(  
      '<div class="full-descr__info full-descr__info--moved">' +  
        '<div class="full-descr__info-name">' + name + '</div>' +  
        '<div class="full-descr__info-body">' + value + '</div>' +  
      '</div>'  
    );  
  }  
  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
    if (details.length && !details.find('.full-descr__info--moved').length) {  
      var pg = render.find('.full-start__pg');  
      if (pg.length && !pg.hasClass('hide')) {  
        addInfo(details, 'Віковий рейтинг', pg.text().trim());  
        pg.hide();  
      }  
      var status = render.find('.full-start__status');  
      if (status.length && !status.hasClass('hide')) {  
        addInfo(details, 'Статус', status.text().trim());  
        status.hide();  
      }  
    }  
  
    // кнопки під верхній блок  
    var body    = render.find('.full-start-new__body');  
    var wrapper = render.find('.card-tweaks__buttons');  
    if (body.length && !wrapper.length) {  
      wrapper = $('<div class="card-tweaks__buttons"></div>');  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        wrapper.append(this);  
      });  
      body.after(wrapper);  
    }  
  
    startSlideshow(e);  
  }  
  
  /* ---------- СЛАЙДШОУ ФОНУ ---------- */  
  var bgTimer = null, bgCardId = null;  
  
  function stopSlideshow() {  
    clearInterval(bgTimer); bgTimer = null; bgCardId = null;  
  }  
  
  function tmdbApi(path) {  
    try { return Lampa.TMDB.api(path + '&api_key=' + Lampa.TMDB.key()); } catch (e) {}  
    return 'https://api.themoviedb.org/3/' + path;  
  }  
  function tmdbImg(path) {  
    try { return Lampa.TMDB.image('t/p/original' + path); } catch (e) {}  
    return 'https://image.tmdb.org/t/p/original' + path;  
  }  
  
  function swapCardBackground(url) {  
    var swapped = false;  
  
    // рідний <img class="full-start__background"> — той самий елемент, що й початковий фон  
    document.querySelectorAll('.full-start__background, .full-start-new__background').forEach(function (el) {  
      if (el.tagName === 'IMG') {  
        el.removeAttribute('srcset');  
        el.removeAttribute('data-src');  
        el.src = url;  
      } else {  
        el.style.backgroundImage    = 'url("' + url + '")';  
        el.style.backgroundSize     = 'cover';  
        el.style.backgroundPosition = 'center';  
      }  
      swapped = true;  
    });  
  
    return swapped;  
  }  
  
  function startSlideshow(e) {  
    var movie = (e.data && e.data.movie) || e.object.movie || {};  
    if (movie.id === bgCardId) return;  
    bgCardId = movie.id;  
    clearInterval(bgTimer); bgTimer = null;  
    if (!slideshowEnabled() || !movie.id) return;  
  
    var method = movie.number_of_seasons ? 'tv' : 'movie';  
  
    Lampa.Network.silent(  
      // include_image_language=null — лише арти без тексту  
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
  
  /* ---------- ЗАПУСК ---------- */  
  function onFull(e) {  
    if (e.type === 'complite') moveInfo(e);  
    if (e.type === 'destroy')  stopSlideshow();  
  }  
  
  function start() {  
    registerSettings();  
    Lampa.Listener.follow('full', onFull);  
  }  
  
  if (window.appready) start();  
  else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') start();  
    });  
  }  
})();
