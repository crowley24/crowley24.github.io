(function () {  
  'use strict';  
  
  /* ---------- 1) СТИЛІ ---------- */  
  var style = document.createElement('style');  
  style.id = 'card-tweaks';  
  style.textContent =  
    // приховати рік/країну над назвою (новий і старий шаблони)  
    '.full-start-new__head, .full-start__tags { display: none !important; }' +  
  
    // рейтинг у верхній правий кут картки  
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
    '}';  
  document.head.appendChild(style);  
  
  /* ---------- 2) ПЕРЕНЕСЕННЯ БЛОКІВ У "ДЕТАЛЬНО" ---------- */  
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
    if (!details.length) return;  
    if (details.find('.full-descr__info--moved').length) return; // захист від дублікатів  
  
    // віковий рейтинг  
    var pg = render.find('.full-start__pg');  
    if (pg.length && !pg.hasClass('hide')) {  
      addInfo(details, 'Віковий рейтинг', pg.text().trim());  
      pg.hide();  
    }  
  
    // статус ("Випущено" тощо)  
    var status = render.find('.full-start__status');  
    if (status.length && !status.hasClass('hide')) {  
      addInfo(details, 'Статус', status.text().trim());  
      status.hide();  
    }  
  
    // дата виходу в прокат — тільки якщо реліз ще попереду  
    var movie = e.data && e.data.movie ? e.data.movie : (e.object.movie || {});  
    var rd = movie.release_date || movie.first_air_date;  
    if (rd && new Date(rd) > new Date()) {  
      addInfo(details, 'У прокаті з', Lampa.Utils.parseTime(rd).full);  
    }  
  }  
  
  /* ---------- 3) ПІДПИСКА ---------- */  
  if (window.appready) {  
    Lampa.Listener.follow('full', moveInfo);  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type === 'ready') Lampa.Listener.follow('full', moveInfo);  
    });  
  }  
})();
