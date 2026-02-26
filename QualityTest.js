(function () {
  'use strict';

  // Функція для створення іконок з точною геометрією як на фото
  function getSvgIcon(label, isDolby) {
    var bgTop = '#f9d976';    
    var bgBottom = '#b2822b'; 
    var textColor = '#1a1102'; 
    var strokeColor = '#5c3d05';

    // Ширина плашки: Dolby ширша, звичайні — стандартні
    var width = isDolby ? 140 : 95;
    var height = 50;
    var rectWidth = width - 8;
    var rectHeight = height - 8;
    var content = '';
    
    if (isDolby) {
      // Малюємо логотип Dolby Vision за зразком
      content = 
        // Символ Double D (ліва частина)
        '<path d="M14 16 C19 16 22 19 22 25 C22 31 19 34 14 34 H12 V16 Z" fill="' + textColor + '"/>' +
        // Символ Double D (права частина)
        '<path d="M24 16 C19 16 16 19 16 25 C16 31 19 34 24 34 H26 V16 Z" fill="' + textColor + '"/>' +
        
        // Вертикальна лінія-розділювач
        '<line x1="38" y1="12" x2="38" y2="38" stroke="' + strokeColor + '" stroke-width="1.2" opacity="0.6"/>' +
        
        // Текст Dolby (верхній рядок)
        '<text x="44" y="24" text-anchor="start" fill="' + textColor + '" ' +
        'font-family="Arial Black, Arial, sans-serif" font-size="19" font-weight="900">Dolby</text>' +
        
        // Текст VISION (нижній рядок)
        '<text x="44" y="38" text-anchor="start" fill="' + textColor + '" ' +
        'font-family="Arial, sans-serif" font-size="11" font-weight="900" letter-spacing="2.5">VISION</text>';
    } else {
      // Звичайний текст для 4K, HDR, UKR тощо
      content = '<text x="' + (width/2) + '" y="' + (height/2 + 2) + '" text-anchor="middle" dominant-baseline="central" fill="' + textColor + '" font-family="Arial, sans-serif" font-size="30" font-weight="900">' + label + '</text>';
    }

    var svg = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="gold_grad_' + label.replace(/[^a-z0-9]/gi, '') + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" style="stop-color:' + bgTop + ';stop-opacity:1" />' +
          '<stop offset="100%" style="stop-color:' + bgBottom + ';stop-opacity:1" />' +
        '</linearGradient>' +
      '</defs>' +
      '<rect x="4" y="4" width="' + rectWidth + '" height="' + rectHeight + '" rx="5" ' +
      'fill="url(#gold_grad_' + label.replace(/[^a-z0-9]/gi, '') + ')" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
      content + 
    '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var svgIcons = {
    '4K': getSvgIcon('4K'),
    'FULL HD': getSvgIcon('1080'),
    'HD': getSvgIcon('720'),
    'HDR': getSvgIcon('HDR'),
    'Dolby Vision': getSvgIcon('Dolby', true),
    '7.1': getSvgIcon('7.1'),
    '5.1': getSvgIcon('5.1'),
    '2.0': getSvgIcon('2.0'),
    'DUB': getSvgIcon('DUB'),
    'UKR': getSvgIcon('UKR'),
    '2K': getSvgIcon('2K')
  };

  // --- Логіка відображення студій ---

  function renderStudioLogos(container, data) {
    var showStudio = Lampa.Storage.get('applecation_show_studio');
    if (showStudio === false || showStudio === 'false') return;
    var logos = [];
    var sources = [data.networks, data.production_companies];
    sources.forEach(function(source) {
      if (source && source.length) {
        source.forEach(function(item) {
          if (item.logo_path) {
            var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
            if (!logos.find(function(l) { return l.url === logoUrl; })) {
                logos.push({ url: logoUrl, name: item.name });
            }
          }
        });
      }
    });
    logos.forEach(function(logo) {
      var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);
      container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" style="height: 1.4em; width: auto;"></div>');
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = this.width; canvas.height = this.height;
        ctx.drawImage(this, 0, 0);
        try {
          var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var pixels = imageData.data;
          var r = 0, g = 0, b = 0, count = 0;
          for (var i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 50) {
              r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count++;
            }
          }
          if (count > 0 && (0.299 * (r/count) + 0.587 * (g/count) + 0.114 * (b/count)) < 35) {
            $('#' + imgId + ' img').css('filter', 'brightness(0) invert(1)');
          }
        } catch (e) {}
      };
      img.src = logo.url;
    });
  }

  // --- Аналіз результатів парсера ---

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
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
      else if (title.indexOf('1080') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';
      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
      
      if (item.ffprobe && Array.isArray(item.ffprobe)) {
        item.ffprobe.forEach(function(stream) {
          if (stream.codec_type === 'video') {
            if (JSON.stringify(stream.side_data_list || []).indexOf('Vision') >= 0) best.dolbyVision = true;
            if (stream.color_transfer === 'smpte2084') best.hdr = true;
          }
          if (stream.codec_type === 'audio' && stream.channels) {
            var ch = parseInt(stream.channels);
            var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
          }
        });
      }
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
    return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '"></div>';
  }

  function addCardBadges(card, best) {
    if (card.find('.card-quality-badges').length) return;
    var b = [];
    if (best.ukr) b.push(createBadgeImg('UKR', true, b.length));
    if (best.resolution) b.push(createBadgeImg(best.resolution, true, b.length));
    if (b.length) card.find('.card__view').append('<div class="card-quality-badges">' + b.join('') + '</div>');
  }

  function processCards() {
    var cards = $('.card:not(.qb-processed)');
    if (!cards.length) return;
    
    cards.addClass('qb-processed').each(function() {
      var card = $(this);
      var movie = card.data('item');
      if (movie && Lampa.Storage.field('parser_use')) {
        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
          if (response && response.Results) addCardBadges(card, getBest(response.Results));
        });
      }
    });
  }

  // --- Слухач відкриття картки ---

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    var details = $('.full-start-new__details');
    if (details.length) {
        if (!$('.quality-badges-container').length) details.after('<div class="quality-badges-container"></div>');
        var container = $('.quality-badges-container');
        container.empty();
        
        renderStudioLogos(container, e.data.movie);
        
        Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(response) {
            if (response && response.Results) {
                var best = getBest(response.Results);
                var b = [];
                if (best.ukr) b.push(createBadgeImg('UKR', false, b.length));
                if (best.resolution) b.push(createBadgeImg(best.resolution, false, b.length));
                if (best.dolbyVision) b.push(createBadgeImg('Dolby Vision', false, b.length));
                if (best.hdr) b.push(createBadgeImg('HDR', false, b.length));
                if (best.audio) b.push(createBadgeImg(best.audio, false, b.length));
                if (best.dub) b.push(createBadgeImg('DUB', false, b.length));
                container.append(b.join(''));
            }
        });
    }
  });

  setInterval(processCards, 3000);

  // --- Стилі ---
  var style = '<style>\
    .quality-badges-container { display: flex; align-items: center; gap: 0.4em; margin: 0.5em 0; min-height: 1.8em; flex-wrap: wrap; }\
    .quality-badge { height: 1.6em; opacity: 0; transform: translateY(5px); animation: qb_in 0.4s ease forwards; }\
    .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.15em; z-index: 5; }\
    .card-quality-badge { height: 1.1em; opacity: 0; transform: translateY(3px); animation: qb_in 0.3s ease forwards; }\
    @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }\
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4)); }\
    .studio-logo { margin-right: 0.3em; }\
  </style>';
  $('body').append(style);

})();
