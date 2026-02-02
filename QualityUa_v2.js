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

  // Використовуємо Template Literals для CSS (виправляє помилки EOL)
  var style = `
    <style>
      .quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }
      .quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }
      .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }
      .card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }
      @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }
      .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }
      .card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }
    </style>`;
  $('body').append(style);

  function getBest(results) {
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
    
    results.slice(0, 20).forEach(function(item) {
      var title = (item.Title || '').toLowerCase();
      if (/ukr|укр|ua/.test(title)) best.ukr = true;

      // Спрощений пошук роздільної здатності
      if (title.includes('4k') || title.includes('2160')) updateRes('4K');
      else if (title.includes('2k') || title.includes('1440')) updateRes('2K');
      else if (title.includes('1080') || title.includes('fhd')) updateRes('FULL HD');
      else if (title.includes('720') || title.includes('hd')) updateRes('HD');

      function updateRes(res) {
        if (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution)) best.resolution = res;
      }

      if (title.includes('vision') || title.includes('dovi')) best.dolbyVision = true;
      if (title.includes('hdr')) best.hdr = true;
      if (title.includes('dub') || title.includes('дубл')) best.dub = true;
    });
    
    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function createBadgeImg(type, isCard, index) {
    var iconPath = svgIcons[type];
    if (!iconPath) return '';
    var className = isCard ? 'card-quality-badge' : 'quality-badge';
    return '<div class="' + className + '" style="animation-delay: ' + (index * 0.08) + 's"><img src="' + iconPath + '"></div>';
  }

  function processCards() {
    // Розширений селектор для карток
    $('.card, .items__item').not('.qb-processed').each(function() {
      var card = $(this).addClass('qb-processed');
      var movie = card.data('item');
      
      if (movie && Lampa.Storage.field('parser_use')) {
        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
          if (response && response.Results) {
            var best = getBest(response.Results);
            var badges = [];
            if (best.ukr) badges.push(createBadgeImg('UKR', true, badges.length));
            if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));
            if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));
            
            if (badges.length) {
                // Шукаємо куди вставити (в різних темах Lampa різні класи)
                var container = card.find('.card__view, .items__view').first();
                if (container.length) container.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
            }
          }
        });
      }
    });
  }

  setInterval(processCards, 3000);
  console.log('[QualityBadges] Active with UKR support');
})();
