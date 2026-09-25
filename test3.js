function moveInfo(e) {  
  if (e.type !== 'complite') return;  
  
  var render  = e.object.activity.render();  
  var details = render.find('.full-descr__details');  
  if (!details.length) return;  
  if (details.find('.full-descr__info--moved').length) return;  
  
  function addInfo(name, value) {  
    details.append(  
      '<div class="full-descr__info full-descr__info--moved">' +  
        '<div class="full-descr__info-name">' + name + '</div>' +  
        '<div class="full-descr__info-body">' + value + '</div>' +  
      '</div>'  
    );  
  }  
  
  var pg = render.find('.full-start__pg');  
  if (pg.length && !pg.hasClass('hide')) {  
    addInfo('Віковий рейтинг', pg.text().trim());  
    pg.hide();  
  }  
  
  var status = render.find('.full-start__status');  
  if (status.length && !status.hasClass('hide')) {  
    addInfo('Статус', status.text().trim());  
    status.hide();  
  }  
  
  // --- прокат ---  
  var movie = (e.data && e.data.movie) || e.object.movie || {};  
  var rd = movie.release_date || movie.first_air_date;  
  
  // діагностика — дивіться в консолі  
  console.log('[CARD-TWEAKS] movie:', movie.id, '| status:', movie.status,  
              '| release_date:', rd, '| now:', new Date().toISOString().slice(0,10));  
  
  if (rd) {  
    var rel = new Date(rd);  
    var show = !isNaN(rel) &&  
               (rel > new Date() ||            // реліз попереду  
                (movie.status && /production|planned|rumored/i.test(movie.status)));  
  
    if (show) addInfo('У прокаті з', Lampa.Utils.parseTime(rd).full);  
  }  
}
