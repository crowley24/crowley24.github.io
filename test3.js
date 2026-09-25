(function () {  
  'use strict';  
  
  // Селектори блоків деталей над назвою (новий і старий інтерфейс картки)  
  var DETAILS = '.full-start-new__details, .full-start__details, .full-start__tags';  
  
  function hideDetails(render) {  
    render.find(DETAILS).each(function () {  
      $(this).find('span, div').each(function () {  
        var el   = $(this);  
        var text = el.text().trim();  
        var cls  = el.attr('class') || '';  
  
        var isYear    = /^\d{4}$/.test(text) || /year/i.test(cls);  
        var isCountry = /country/i.test(cls) ||  
                        /quality/.test(cls) === false && /^[A-ZА-ЯІЇЄҐa-zа-яіїєґ\s,\.]+$/.test(text) && !text;  
  
        // країна може не мати окремого класу — ховаємо за класом або точним текстом  
        if (isYear || /country/i.test(cls)) {  
          el.addClass('hide');  
        }  
      });  
    });  
  }  
  
  function onFull(e) {  
    if (e.type == 'complite') {  
      hideDetails(e.object.activity.render());  
    }  
  }  
  
  function startPlugin() {  
    // підписка на відкриття нових карток  
    Lampa.Listener.follow('full', onFull);  
  
    // якщо картка вже відкрита в момент старту плагіна  
    try {  
      if (Lampa.Activity.active().component == 'full') {  
        hideDetails(Lampa.Activity.active().activity.render());  
      }  
    } catch (e) { }  
  }  
  
  if (window.app_ready || (window.Lampa && Lampa.Manifest)) {  
    startPlugin();  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type == 'ready') startPlugin();  
    });  
  }  
})();
