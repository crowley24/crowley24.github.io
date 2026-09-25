(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
    '.full-start-new, .full-start { position: relative !important; }' +  
    '.full-start-new__rate-line, .full-start__rate-line {' +  
    '  position: absolute !important;' +  
    '  top: 1.5em; right: 1.5em; z-index: 5;' +  
    '  margin: 0 !important;' +  
    '  display: flex; gap: 0.8em; align-items: center;' +  
    '  background: rgba(0,0,0,0.45);' +  
    '  padding: 0.4em 0.9em; border-radius: 0.5em;' +  
    '}' +  
    '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; }' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container { margin-top: 0.6em; }';  
  document.head.appendChild(style);  
  
  /* ---------- НАЛАШТУВАННЯ: розділ "Картка" ---------- */  
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
      name: 'Картка',  
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>'  
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
        description: 'Крутити фонові арти фільму без написів'  
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
  
  /* ---------- ПЕРЕНЕСЕННЯ БЛОКІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
    var render = e.object.activity.render();  
  
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
  
    var wrapper = render.find('.card-tweaks__buttons');  
    if (!wrapper.length) {  
      var body = render.find('.full-start-new__body');  
      var btns = render.find('.full-start-new__buttons, .buttons--container');  
      if (body.length && btns.length) {  
        wrapper = $('<div class="card-tweaks__buttons"></div>');  
        body.after(wrapper);  
        btns.each(function () { wrapper.append(this); });  
      }  
    }  
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
  
  function startSlideshow(e) {  
    if (!slideshowEnabled()) return;  
  
    var movie = (e.data && e.data.movie) || e.object.movie || {};  
    if (movie.id === bgCardId) return;  
    bgCardId = movie.id;  
    clearInterval(bgTimer); bgTimer = null;  
    if (!movie.id) return;  
  
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
          if (!Lampa.Activity.active() || bgCardId !== movie.id) return;  
          Lampa.Background.change(tmdbImg(backdrops[i++ % backdrops.length].file_path));  
        }, slideshowInterval());  
      },  
      function () {}  
    );  
  }  
  
  /* ---------- ПІДПИСКА ---------- */  
  function onFull(e) {  
    if (e.type === 'complite') { moveInfo(e); startSlideshow(e); }  
    if (e.type === 'destroy')  stopSlideshow();  
  }  
  
  function init() {  
    registerSettings();  
    Lampa.Listener.follow('full', onFull);  
  }  
  
  if (window.appready) init();  
  else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') init();  
    });  
  }  
})();
