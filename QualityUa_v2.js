(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  var badgeCache = {}; // Кеш для результатів

  var svgIcons = {
    '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
    'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
    '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
    '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
  };

  function getBest(results) {
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
    if (!results || !results.length) return best;
    
    results.slice(0, 15).forEach(function(item) {
      var title = (item.Title || '').toLowerCase();
      if (/ukr|укр|ua/.test(title)) best.ukr = true;
      if (/4k|2160|uhd/.test(title)) best.resolution = '4K';
      else if (/1080|fhd|full hd/.test(title) && !best.resolution) best.resolution = 'FULL HD';
      if (/vision|dovi/.test(title)) best.dolbyVision = true;
      if (/hdr/.test(title)) best.hdr = true;
      if (/dub|дубл/.test(title)) best.dub = true;
    });
    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function addBadgesToElement(el, best, isCard) {
    if (el.querySelector('.card-quality-badges, .quality-badges-container-done')) return;
    
    var badges = [];
    var list = ['ukr', 'resolution', 'hdr', 'audio', 'dub'];
    
    list.forEach(function(key) {
      var val = best[key];
      if (val) {
        var type = (typeof val === 'string') ? val : key.toUpperCase();
        var icon = svgIcons[type];
        if (icon) {
          badges.push('<div class="' + (isCard ? 'card-quality-badge' : 'quality-badge') + '"><img src="' + icon + '"></div>');
        }
      }
    });

    if (badges.length) {
      var html = '<div class="' + (isCard ? 'card-quality-badges' : 'quality-badges-container-done') + '">' + badges.join('') + '</div>';
      if (isCard) {
        var view = el.querySelector('.card__view') || el;
        $(view).append(html);
      } else {
        $(el).after(html);
      }
    }
  }

  function processCards() {
    $('.card:not(.qb-processed)').each(function() {
      var card = $(this).addClass('qb-processed');
      var data = card.data('item');
      if (!data || !data.title) return;

      var id = data.id + '_' + (data.title || data.name);

      // Якщо вже є в кеші - малюємо миттєво
      if (badgeCache[id]) {
        addBadgesToElement(this, badgeCache[id], true);
      } else {
        // Затримка, щоб не "покласти" парсер при скролі
        setTimeout(function() {
          Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function(res) {
            if (res && res.Results) {
              badgeCache[id] = getBest(res.Results);
              addBadgesToElement(card[0], badgeCache[id], true);
            }
          });
        }, 1000);
      }
    });
  }

  // Для повної картки
  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    var id = e.data.movie.id + '_' + (e.data.movie.title || e.data.movie.name);
    
    Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(res) {
      if (res && res.Results) {
        badgeCache[id] = getBest(res.Results);
        var details = $('.full-start-new__details');
        if (details.length) addBadgesToElement(details[0], badgeCache[id], false);
      }
    });
  });

  setInterval(processCards, 2000);

  var style = '<style>\
    .card-quality-badges { position: absolute !important; top: 5px !important; left: 5px !important; display: flex !important; flex-wrap: wrap; gap: 3px !important; z-index: 20 !important; width: 90%; }\
    .card-quality-badge { height: 11px !important; }\
    .card-quality-badge img { height: 100% !important; filter: drop-shadow(0 0 2px black); }\
    .quality-badges-container-done { display: flex; gap: 6px; margin: 10px 0; }\
    .quality-badge { height: 20px; }\
    .quality-badge img { height: 100%; }\
    .card__view { overflow: visible !important; }\
  </style>';
  
  if (!$('style#qb-style').length) $('body').append($(style).attr('id', 'qb-style'));

})();
