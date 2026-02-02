(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  var svgIcons = {
    '4K': pluginPath + '4K.svg',
    '2K': pluginPath + '2K.svg',
    'FULL HD': pluginPath + 'FULL HD.svg',
    'HD': pluginPath + 'HD.svg',
    'HDR': pluginPath + 'HDR.svg',
    'Dolby Vision': pluginPath + 'Dolby Vision.svg',
    '7.1': pluginPath + '7.1.svg',
    '5.1': pluginPath + '5.1.svg',
    '4.0': pluginPath + '4.0.svg',
    '2.0': pluginPath + '2.0.svg',
    'DUB': pluginPath + 'DUB.svg',
    'UKR': pluginPath + 'UKR.svg'
  };

  function getBest(results) {
    var best = { resolution: null, hdr: false, audio: null, ukr: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    
    var limit = Math.min(results.length, 15);
    for (var i = 0; i < limit; i++) {
      var item = results[i];
      var title = (item.Title || '').toLowerCase();

      if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;

      var foundRes = null;
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
      else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0) foundRes = 'FULL HD';
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';

      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {
          best.resolution = foundRes;
      }
      if (title.indexOf('hdr') >= 0 || title.indexOf('vision') >= 0) best.hdr = true;
    }
    return best;
  }

  function createBadgeImg(type, index) {
    var iconPath = svgIcons[type];
    if (!iconPath) return '';
    var delay = (index * 0.05) + 's';
    return '<div class="card-quality-badge" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false"></div>';
  }

  function processCards(cards) {
    cards.forEach(function(el) {
      var card = $(el);
      if (card.hasClass('qb-processed')) return;
      
      // Спроба отримати дані фільму (різні методи для різних розділів)
      var movie = card.data('item') || (card[0] && card[0].card_data);
      
      if (movie && (movie.title || movie.name)) {
        card.addClass('qb-processed');
        
        if (Lampa.Storage.field('parser_use')) {
          Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
            if (response && response.Results && response.Results.length) {
              var best = getBest(response.Results);
              var badges = [];
              if (best.ukr) badges.push(createBadgeImg('UKR', badges.length));
              if (best.resolution) badges.push(createBadgeImg(best.resolution, badges.length));
              if (best.hdr) badges.push(createBadgeImg('HDR', badges.length));

              if (badges.length) {
                // Шукаємо контейнер для вставки (універсальний пошук)
                var container = card.find('.card__view, .items__view, .info-list__item-img, .image-body').first();
                if (container.length) {
                  container.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
                }
              }
            }
          });
        }
      }
    });
  }

  // Налаштування Observer (як у працюючому плагіні)
  var observer = new MutationObserver(function (mutations) {
    var added = [];
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.nodeType === 1) {
          if (node.classList.contains('card') || node.classList.contains('items__item')) added.push(node);
          var nested = node.querySelectorAll('.card, .items__item, .watchlist-item');
          for (var k = 0; k < nested.length; k++) added.push(nested[k]);
        }
      }
    }
    if (added.length) processCards(added);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Стилі (Більш агресивні, щоб перебити стандартні)
  var style = '<style>' +
    '.card-quality-badges { position: absolute !important; top: 0.3em !important; right: 0.3em !important; display: flex !important; flex-direction: row !important; gap: 0.2em !important; z-index: 20 !important; pointer-events: none; }' +
    '.card-quality-badge { height: 0.85em !important; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +
    '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +
    '.card-quality-badge img { height: 100% !important; width: auto !important; display: block !important; filter: drop-shadow(0 1px 2px #000) !important; }' +
    '.quality-badges-container { display: flex; gap: 0.4em; margin-bottom: 0.5em; }' +
    '.quality-badge { height: 1.2em; }' +
    '</style>';
  $('body').append(style);

  // Початковий запуск для тих, що вже є
  setTimeout(function() {
    processCards(Array.from(document.querySelectorAll('.card, .items__item, .watchlist-item')));
  }, 1000);

})();
