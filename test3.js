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
  
    // 3) ліва колонка вертикальна: постер зверху, кнопки знизу  
    '.full-start-new__left {' +  
    '  display: flex !important;' +  
    '  flex-direction: column !important;' +  
    '  flex-shrink: 0;' +  
    '  width: 17em;' +  
    '}' +  
    // кнопки — в один рядок, з переносом при потребі  
    '.full-start-new__left .full-start-new__buttons,' +  
    '.full-start-new__left .buttons--container {' +  
    '  display: flex !important;' +  
    '  flex-direction: row !important;' +  
    '  flex-wrap: wrap;' +  
    '  align-items: center; gap: 0.6em;' +  
    '  margin-top: 1em; width: 100%;' +  
    '}' +  
    '.full-start-new__left .full-start__button { margin-right: 0; }' +  
    // права колонка займає решту ширини  
    '.full-start-new__right { flex: 1 1 auto; min-width: 0; }';  
  document.head.appendChild(style);  
  
  /* ---------- ПЕРЕНЕСЕННЯ ЕЛЕМЕНТІВ ---------- */  
  function moveInfo(e) {  
    if (e.type !== 'complite') return;  
  
    var render  = e.object.activity.render();  
    var details = render.find('.full-descr__details');  
    if (!details.length) return;  
    if (details.find('.full-descr__info--moved').length) return;  
  
    // віковий рейтинг та статус → у блок "Детально"  
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
  
    // кнопки → під постер  
    var left = render.find('.full-start-new__left');  
    if (left.length && !left.find('.full-start-new__buttons, .buttons--container').length) {  
      render.find('.full-start-new__buttons, .buttons--container').each(function () {  
        left.append(this);  
      });  
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
