(function () {  
  'use strict';  
  
  // 1) Приховати рік та країну над назвою (новий і старий шаблони картки)  
  var style = document.createElement('style');  
  style.id = 'hide-year-country';  
  style.textContent =  
    '.full-start-new__head, .full-start__tags { display: none !important; }';  
  document.head.appendChild(style);  
  
  // 2) Перенести віковий рейтинг та статус у блок "Детально"  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
    if (!details.length) return;  
    if (details.find('.full-descr__info--moved').length) return;  
  
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
  
  if (window.appready) {  
    Lampa.Listener.follow('full', moveInfo);  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') Lampa.Listener.follow('full', moveInfo);  
    });  
  }  
})();
