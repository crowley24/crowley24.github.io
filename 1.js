// Об'єднаний плагін якості з правильним завантаженням SVG  
(function () {  
  'use strict';  
  
  // Перевірка залежностей  
  if (typeof $ === 'undefined' || typeof Lampa === 'undefined') {  
    console.error('[QualityBadges] jQuery або Lampa не доступні');  
    return;  
  }  
  
  // SVG іконки якості (як в оригіналі)  
  var pluginPath = 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/';  
  var svgIcons = {  
    '4K': pluginPath + 'Quality_ico/4K.svg',  
    '2K': pluginPath + 'Quality_ico/2K.svg',  
    'FULL HD': pluginPath + 'Quality_ico/FULL HD.svg',  
    'HD': pluginPath + 'Quality_ico/HD.svg',  
    'HDR': pluginPath + 'Quality_ico/HDR.svg',  
    'Dolby Vision': pluginPath + 'Quality_ico/Dolby Vision.svg',  
    '7.1': pluginPath + 'Quality_ico/7.1.svg',  
    '5.1': pluginPath + 'Quality_ico/5.1.svg',  
    '4.0': pluginPath + 'Quality_ico/4.0.svg',  
    '2.0': pluginPath + 'Quality_ico/2.0.svg',  
    'DUB': pluginPath + 'Quality_ico/DUB.svg'  
  };  
  
  // Функція отримання якості (як в оригіналі)  
  function getBest(results) {  
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };  
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];  
      
    var limit = Math.min(results.length, 20);  
    for (var i = 0; i < limit; i++) {  
      var item = results[i];  
      var title = (item.Title || '').toLowerCase();  
  
      var foundRes = null;  
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';  
      else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';  
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';  
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';  
  
      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {  
        best.resolution = foundRes;  
      }  
  
      if (title.indexOf('hdr') >= 0) best.hdr = true;  
      if (title.indexOf('dolby vision') >= 0) best.dolbyVision = true;  
  
      var foundAudio = null;  
      if (title.indexOf('7.1') >= 0) foundAudio = '7.1';  
      else if (title.indexOf('5.1') >= 0) foundAudio = '5.1';  
      else if (title.indexOf('4.0') >= 0) foundAudio = '4.0';  
      else if (title.indexOf('2.0') >= 0) foundAudio = '2.0';  
  
      if (foundAudio && (!best.audio || audioOrder.indexOf(foundAudio) > audioOrder.indexOf(best.audio))) {  
        best.audio = foundAudio;  
      }  
  
      if (title.indexOf('dub') >= 0 || title.indexOf('дубляж') >= 0 || title.indexOf('дубляж') >= 0) best.dub = true;  
    }  
    return best;  
  }  
  
  // Додавання бейджів до картки (як в оригіналі)  
  function addCardBadges(card, best) {  
    var badges = [];  
      
    if (best.resolution) {  
      badges.push('<img class="card-quality-badge" src="' + svgIcons[best.resolution] + '" onerror="this.style.display=\'none\'">');  
    }  
    if (best.hdr) {  
      badges.push('<img class="card-quality-badge" src="' + svgIcons['HDR'] + '" onerror="this.style.display=\'none\'">');  
    }  
    if (best.dolbyVision) {  
      badges.push('<img class="card-quality-badge" src="' + svgIcons['Dolby Vision'] + '" onerror="this.style.display=\'none\'">');  
    }  
    if (best.audio) {  
      badges.push('<img class="card-quality-badge" src="' + svgIcons[best.audio] + '" onerror="this.style.display=\'none\'">');  
    }  
    if (best.dub) {  
      badges.push('<img class="card-quality-badge" src="' + svgIcons['DUB'] + '" onerror="this.style.display=\'none\'">');  
    }  
  
    if (badges.length > 0) {  
      var container = '<div class="card-quality-badges">' + badges.join('') + '</div>';  
      card.find('.card__view').append(container);  
    }  
  }  
  
  // Обробка карток  
  function processCards() {  
    $('.card:not(.quality-processed)').each(function() {  
      var card = $(this);  
      card.addClass('quality-processed');  
        
      var movie = card.data('item') || card.data('movie') || card.data();  
      if (movie && (movie.title || movie.name)) {  
        if (Lampa.Storage.field('parser_use')) {  
          Lampa.Parser.get({   
            search: movie.title || movie.name,   
            movie: movie,   
            page: 1   
          }, function(response) {  
            if (response && response.Results) {  
              var best = getBest(response.Results);  
              addCardBadges(card, best);  
            }  
          });  
        }  
      }  
    });  
  }  
  
  // Обробка повної картки  
  function processFullCard() {  
    $('.full__right .quality-badges-container').each(function() {  
      var container = $(this);  
      if (container.find('.quality-badge').length === 0) {  
        var movie = Lampa.Activity.get().movie;  
        if (movie && Lampa.Storage.field('parser_use')) {  
          Lampa.Parser.get({   
            search: movie.title || movie.name,   
            movie: movie,   
            page: 1   
          }, function(response) {  
            if (response && response.Results) {  
              var best = getBest(response.Results);  
              var badges = [];  
                
              if (best.resolution) {  
                badges.push('<img class="quality-badge" src="' + svgIcons[best.resolution] + '" onerror="this.style.display=\'none\'">');  
              }  
              if (best.hdr) {  
                badges.push('<img class="quality-badge" src="' + svgIcons['HDR'] + '" onerror="this.style.display=\'none\'">');  
              }  
              if (best.dolbyVision) {  
                badges.push('<img class="quality-badge" src="' + svgIcons['Dolby Vision'] + '" onerror="this.style.display=\'none\'">');  
              }  
              if (best.audio) {  
                badges.push('<img class="quality-badge" src="' + svgIcons[best.audio] + '" onerror="this.style.display=\'none\'">');  
              }  
              if (best.dub) {  
                badges.push('<img class="quality-badge" src="' + svgIcons['DUB'] + '" onerror="this.style.display=\'none\'">');  
              }  
                
              if (badges.length > 0) {  
                container.html(badges.join(''));  
              }  
            }  
          });  
        }  
      }  
    });  
  }  
  
  // CSS стилі  
  var style = '<style>' +  
    '.quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }' +  
    '.quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }' +  
    '.card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }' +  
    '.card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +  
    '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +  
    '.quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }' +  
    '.card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }' +  
    '@media (max-width: 768px) {' +  
      '.quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }' +  
      '.quality-badge { height: 1em; }' +  
      '.card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }' +  
      '.card-quality-badge { height: 0.75em; }' +  
    '}' +  
  '</style>';  
  $('body').append(style);  
  
  // Запуск  
  setTimeout(function() {  
    processCards();  
    processFullCard();  
  }, 2000);  
  
  // Observer для нових карток  
  var observer = new MutationObserver(function(mutations) {  
    setTimeout(processCards, 500);  
  });  
    
  observer.observe(document.body, { childList: true, subtree: true });  
  
  // Обробка повної картки  
  Lampa.Listener.follow('full', function(e) {  
    if (e.type === 'complite') {  
      setTimeout(processFullCard, 1000);  
    }  
  });  
  
  console.log('[QualityBadges] Плагін завантажено з SVG іконками');  
})();
