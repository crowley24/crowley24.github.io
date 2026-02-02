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
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
    
    var limit = Math.min(results.length, 20);
    for (var i = 0; i < limit; i++) {
      var item = results[i];
      var title = (item.Title || '').toLowerCase();
      if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
      
      var foundRes = null;
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';
      else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';

      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
      if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;
      if (title.indexOf('hdr') >= 0) best.hdr = true;
      if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;
    }
    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function createBadgeImg(type, isCard, index) {
    var iconPath = svgIcons[type];
    if (!iconPath) return '';
    var className = isCard ? 'card-quality-badge' : 'quality-badge';
    var delay = (index * 0.08) + 's';
    return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false"></div>';
  }

  // Функція обробки списку карток (аналог вашого updateCards)
  function processCards(cards) {
    cards.forEach(function(cardElement) {
      var card = $(cardElement);
      if (card.hasClass('qb-processed')) return;
      card.addClass('qb-processed');

      var movie = card.data('item');
      if (movie && Lampa.Storage.field('parser_use')) {
        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
          if (response && response.Results) {
            var best = getBest(response.Results);
            var badges = [];
            if (best.ukr) badges.push(createBadgeImg('UKR', true, badges.length));
            if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));
            if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));
            if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));
            
            if (badges.length) {
              var container = card.find('.card__view, .items__view, .info-list__item-img').first();
              if (container.length) container.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
            }
          }
        });
      }
    });
  }

  // MutationObserver — стежимо за появою карток як у вашому прикладі
  var observer = new MutationObserver(function (mutations) {
    var cardsToProcess = [];
    mutations.forEach(function (mutation) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && (node.classList.contains('card') || node.classList.contains('items__item'))) {
            cardsToProcess.push(node);
          }
          var nested = node.querySelectorAll('.card, .items__item');
          nested.forEach(function (n) { cardsToProcess.push(n); });
        });
      }
    });
    if (cardsToProcess.length) processCards(cardsToProcess);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Для повної картки (залишаємо Listener, бо це окремий екран)
  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    var details = $('.full-start-new__details, .full-start__details');
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
                $('.quality-badges-container').html(badges.join(''));
            }
        });
    }
  });

  // Стилі (універсальні)
  var style = '<style>' +
    '.quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }' +
    '.quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }' +
    '.card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 10; }' +
    '.card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +
    '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +
    '.quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; filter: drop-shadow(0 1px 2px #000); }' +
    '</style>';
  $('body').append(style);

  // Обробка карток, що вже є на екрані при старті
  processCards(Array.from(document.querySelectorAll('.card, .items__item')));

})();
