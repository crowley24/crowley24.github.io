(function () {  
  'use strict';  
  
  /* ---------- СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // 1) приховати рік/країну над назвою  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // 2) рейтинг у верхній правий кут  
    '.full-start-new, .full-start { position: relative !important; }' +  
    '.full-start-new__rate-line, .full-start__rate-line {' +  
    '  position: absolute !important;' +  
    '  top: 1.5em; right: 1.5em;' +  
    '  z-index: 5;' +  
    '  margin: 0 !important;' +  
    '  display: flex; gap: 0.8em; align-items: center;' +  
    '  background: rgba(0,0,0,0.45);' +  
    '  padding: 0.4em 0.9em;' +  
    '  border-radius: 0.5em;' +  
    '}' +  
  
    // 3) кнопки — повна ширина, під всім верхнім блоком  
    '.card-tweaks__buttons {' +  
    '  margin-top: 1.5em;' +  
    '  width: 100%;' +  
    '}' +  
    '.card-tweaks__buttons .full-start-new__buttons,' +  
    '.card-tweaks__buttons .buttons--container {' +  
    '  margin-top: 0.6em;' +  
    '}';  
  document.head.appendChild(style);  
  
  /* ---------- ПЕРЕНЕСЕННЯ ЕЛЕМЕНТІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render = e.object.activity.render();  
  
    // віковий рейтинг та статус → у блок "Детально"  
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
  
    // 3) кнопки → під весь верхній блок (на всю ширину, не під постер)  
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
  
  /* ---------- ПІДПИСКА ---------- */  
  if (window.appready) {  
    Lampa.Listener.follow('full', moveInfo);  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') Lampa.Listener.follow('full', moveInfo);  
    });  
  }  
})();
