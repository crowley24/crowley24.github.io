(function () {  
  'use strict';  
  
  var cardBadgesCache = {};  
  var pluginPath = 'https://crowley24.github.io/Icons/';  
  
  var svgIcons = {  
    '4K': pluginPath + '4K.svg',  
    '2K': pluginPath + '2K.svg',  
    'FULL HD': pluginPath + 'Quality_ico/FULL HD.svg',  
    'HD': pluginPath + 'Quality_ico/HD.svg',  
    'HDR': pluginPath + 'Quality_ico/HDR.svg',  
    'Dolby Vision': pluginPath + 'Quality_ico/Dolby Vision.svg',  
    '7.1': pluginPath + 'Quality_ico/7.1.svg',  
    '5.1': pluginPath + 'Quality_ico/5.1.svg',  
    '4.0': pluginPath + 'Quality_ico/4.0.svg',  
    '2.0': pluginPath + 'Quality_ico/2.0.svg',  
    'DUB': pluginPath + 'Quality_ico/DUB.svg',  
    'UKR': pluginPath + 'UKR.svg'  
  };  
  
  function getBest(results) {  
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };  
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];  
      
    var limit = Math.min(results.length, 20);  
    for (var i = 0; i < limit; i++) {  
      var item = results[i];  
      var title = (item.Title || '').toLowerCase();  
  
      // Перевірка на українську локалізацію  
      if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) {  
          best.ukr = true;  
      }  
  
      var foundRes = null;  
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';  
      else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';  
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';  
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';  
  
      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {  
          best.resolution = foundRes;  
      }  
  
      if (item.ffprobe && Array.isArray(item.ffprobe)) {  
        item.ffprobe.forEach(function(stream) {  
          if (stream.codec_type === 'video') {  
            var h = parseInt(stream.height || 0);  
            var w = parseInt(stream.width || 0);  
            var res = null;  
            if (h >= 2160 || w >= 3840) res = '4K';  
            else if (h >= 1440 || w >= 2560) res = '2K';  
            else if (h >= 1080 || w >= 1920) res = 'FULL HD';  
            else if (h >= 720 || w >= 1280) res = 'HD';  
              
            if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) {  
              best.resolution = res;  
            }  
            if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;  
            if (stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67') best.hdr = true;  
          }  
          if (stream.codec_type === 'audio' && stream.channels) {  
            var ch = parseInt(stream.channels);  
            var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';  
            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;  
          }  
        });  
      }  
        
      if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;  
    }  
    return best;  
  }  
  
  function createBadgeImg(type, isCard, index) {  
    var className = isCard ? 'card-quality-badge' : 'quality-badge';  
    var delay = (index * 0.08) + 's';  
      
    if (type === 'UKR') {  
      return '<div class="' + className + '" style="animation-delay: ' + delay + '; font-size: 1.2em; display: flex; align-items: center;">🇺🇦</div>';  
    }  
      
    var iconPath = svgIcons[type];  
    if (!iconPath) return '';  
      
    return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false" oncontextmenu="return false;"></div>';  
  }  
  
  function addCardBadges(card, best) {  
    if (card.find('.card-quality-badges').length) return;  
    var badges = [];  
    if (best.ukr) badges.push(createBadgeImg('UKR', true, badges.length));  
    if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));  
    if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));  
    if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));  
    if (best.dub) badges.push(createBadgeImg('DUB', true, badges.length));  
    if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', true, badges.length));  
    if (badges.length) card.find('.card__view').append('<div class="card-quality-badges">' + badges.join('') + '</div>');  
  }  
  
  // Функція для отримання типу картки  
  function getCardType(card) {  
    var type = card.media_type || card.type;  
    if (type === 'movie' || type === 'tv') return type;  
    return card.name || card.original_name ? 'tv' : 'movie';  
  }  
  
  // Оновлена функція обробки карток для головної сторінки  
  function processCards() {  
    $('.card:not(.qb-processed)').addClass('qb-processed').each(function() {  
      var card = $(this)[0]; // Отримуємо DOM елемент  
      var data = card.card_data; // ← Використовуємо card_data як у робочому плагіні  
        
      if (!data) {  
        console.log('No card_data found for card:', card);  
        return;  
      }  
        
      if (Lampa.Storage.field('parser_use')) {  
        // Створюємо normalizedCard як у робочому плагіні  
        var normalizedCard = {  
          id: data.id || '',  
          title: data.title || data.name || '',  
          original_title: data.original_title || data.original_name || '',  
          release_date: data.release_date || data.first_air_date || '',  
          type: getCardType(data)  
        };  
          
        Lampa.Parser.get({   
          search: normalizedCard.title,   
          movie: normalizedCard,   
          page: 1   
        }, function(response) {  
          if (response && response.Results) {  
            addCardBadges($(card), getBest(response.Results));  
          }  
        });  
      }  
    });  
  }  
  
  // Обробка повної картки (оригінальний функціонал)  
  Lampa.Listener.follow('full', function(e) {  
    if (e.type !== 'complite') return;  
    var details = $('.full-start-new__details');  
    if (details.length) {  
        if (!$('.quality-badges-container').length) details.after('<div class="quality-badges-container"></div>');  
        Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(response) {  
            if (response && response.Results) {  
                var best = getBest(response.Results);  
                var badges = [];  
                if (best.ukr) badges.push(createBadgeImg('UKR', false, badges.length));  
                if (best.resolution) badges.push(createBadgeImg(best.resolution, false, badges.length));  
                if (best.hdr) badges.push(createBadgeImg('HDR', false, badges.length));  
                if (best.audio) badges.push(createBadgeImg(best.audio, false, badges.length));  
                if (best.dub) badges.push(createBadgeImg('DUB', false, badges.length));  
                if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', false, badges.length));  
                $('.quality-badges-container').html(badges.join(''));  
            }  
        });  
    }  
  });  
  
  // Observer для відстеження нових карток  
  var observer = new MutationObserver(function (mutations) {  
    var newCards = [];  
    for (var m = 0; m < mutations.length; m++) {  
      var mutation = mutations[m];  
      if (mutation.addedNodes) {  
        for (var j = 0; j < mutation.addedNodes.length; j++) {  
          var node = mutation.addedNodes[j];  
          if (node.nodeType !== 1) continue;  
            
          if (node.classList && node.classList.contains('card')) {  
            newCards.push(node);  
          }  
            
          var nestedCards = node.querySelectorAll('.card');  
          for (var k = 0; k < nestedCards.length; k++) {  
            newCards.push(nestedCards[k]);  
          }  
        }  
      }  
    }  
    if (newCards.length) {  
      newCards.forEach(function(card) {  
        if (!card.classList.contains('qb-processed')) {  
          processCards();  
        }  
      });  
    }  
  });  
  
  // Запуск observer  
  observer.observe(document.body, { childList: true, subtree: true });  
  
  // Початкова обробка існуючих карток  
  setTimeout(function() {  
    processCards();  
  }, 1000);  
  
  // Інтервал для обробки нових карток  
  setInterval(processCards, 3000);  
  
  var style = '<style>\  
    .quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }\  
    .quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }\  
    .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }\  
    .card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; display: flex; align-items: center; }\  
    @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }\  
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }\  
    .card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }\  
    @media (max-width: 768px) {\  
      .quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }\  
      .quality-badge { height: 1em; }\  
      .card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }\  
      .card-quality-badge { height: 0.75em; }\  
    }\  
  </style>';  
  $('body').append(style);  
  
  console.log('[QualityBadges] Запущено з підтримкою головної сторінки та UKR');  
  
})();
