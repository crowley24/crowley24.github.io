(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  var svgIcons = {
    '4K': pluginPath + '4K.svg', '2K': pluginPath + '2K.svg', 'FULL HD': pluginPath + 'FULL HD.svg',
    'HD': pluginPath + 'HD.svg', 'HDR': pluginPath + 'HDR.svg', 'Dolby Vision': pluginPath + 'Dolby Vision.svg',
    '7.1': pluginPath + '7.1.svg', '5.1': pluginPath + '5.1.svg', '4.0': pluginPath + '4.0.svg',
    '2.0': pluginPath + '2.0.svg', 'DUB': pluginPath + 'DUB.svg', 'UKR': pluginPath + 'UKR.svg'
  };

  function getBest(results) {
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
    
    results.slice(0, 20).forEach(function(item) {
      var title = (item.Title || '').toLowerCase();
      if (/ukr|укр|ua/.test(title)) best.ukr = true;

      var foundRes = null;
      if (/4k|2160|uhd/.test(title)) foundRes = '4K';
      else if (/2k|1440/.test(title)) foundRes = '2K';
      else if (/1080|fhd|full hd/.test(title)) foundRes = 'FULL HD';
      else if (/720|hd/.test(title)) foundRes = 'HD';

      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;

      if (item.ffprobe && Array.isArray(item.ffprobe)) {
        item.ffprobe.forEach(function(s) {
          if (s.codec_type === 'video') {
            var h = parseInt(s.height || 0), w = parseInt(s.width || 0), res = null;
            if (h >= 2160 || w >= 3840) res = '4K';
            else if (h >= 1440 || w >= 2560) res = '2K';
            else if (h >= 1080 || w >= 1920) res = 'FULL HD';
            else if (h >= 720 || w >= 1280) res = 'HD';
            if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) best.resolution = res;
            if (s.side_data_list && JSON.stringify(s.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
            if (s.color_transfer === 'smpte2084' || s.color_transfer === 'arib-std-b67') best.hdr = true;
          }
          if (s.codec_type === 'audio' && s.channels) {
            var ch = parseInt(s.channels);
            var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
          }
        });
      }
      if (/vision|dovi/.test(title)) best.dolbyVision = true;
      if (/hdr/.test(title)) best.hdr = true;
      if (/dub|дубл/.test(title)) best.dub = true;
    });
    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function createBadgeImg(type, isCard, index) {
    var iconPath = svgIcons[type];
    if (!iconPath) return '';
    var className = isCard ? 'card-quality-badge' : 'quality-badge';
    return '<div class="' + className + '" style="animation-delay: ' + (index * 0.05) + 's"><img src="' + iconPath + '"></div>';
  }

  function addCardBadges(card, best) {
    if (card.find('.card-quality-badges').length) return;
    var badges = [];
    if (best.ukr) badges.push(createBadgeImg('UKR', true, badges.length));
    if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));
    if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));
    if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));
    if (best.dub) badges.push(createBadgeImg('DUB', true, badges.length));
    
    if (badges.length) {
      // Додаємо в .card__view або саму карту
      var container = card.find('.card__view').length ? card.find('.card__view') : card;
      container.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
    }
  }

  function process() {
    $('.card:not(.qb-processed)').each(function() {
      var card = $(this).addClass('qb-processed');
      var data = card.data('item');
      if (data && data.title) {
         // Робимо невелику затримку, щоб не забивати чергу запитів миттєво
         setTimeout(function() {
            Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function(response) {
              if (response && response.Results && response.Results.length) {
                addCardBadges(card, getBest(response.Results));
              }
            });
         }, 500);
      }
    });
  }

  // Обробка сторінки фільму
  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    setTimeout(function() {
        var details = $('.full-start-new__details');
        if (details.length && !$('.quality-badges-container').length) {
            details.after('<div class="quality-badges-container"></div>');
            Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(res) {
                if (res && res.Results) {
                    var best = getBest(res.Results);
                    var b = [];
                    if (best.ukr) b.push(createBadgeImg('UKR', false, b.length));
                    if (best.resolution) b.push(createBadgeImg(best.resolution, false, b.length));
                    if (best.hdr) b.push(createBadgeImg('HDR', false, b.length));
                    if (best.audio) b.push(createBadgeImg(best.audio, false, b.length));
                    $('.quality-badges-container').html(b.join(''));
                }
            });
        }
    }, 100);
  });

  // Запуск через Observer та інтервал для надійності
  setInterval(process, 3000);
  
  // Додаємо стилі в HEAD
  var style = '<style>\
    .card-quality-badges { position: absolute !important; top: 5px !important; right: 5px !important; display: flex !important; flex-direction: column !important; gap: 3px !important; z-index: 100 !important; pointer-events: none; }\
    .card-quality-badge { height: 12px !important; opacity: 0; transform: scale(0.8); animation: qb_pop 0.3s forwards; }\
    .card-quality-badge img { height: 100% !important; width: auto !important; display: block !important; filter: drop-shadow(0 0 2px rgba(0,0,0,1)); }\
    .quality-badges-container { display: flex; gap: 5px; margin-bottom: 10px; }\
    .quality-badge { height: 20px; }\
    .quality-badge img { height: 100%; }\
    @keyframes qb_pop { to { opacity: 1; transform: scale(1); } }\
    .card__view { overflow: visible !important; }\
  </style>';
  $('body').append(style);

})();
