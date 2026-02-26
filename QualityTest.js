(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  
  if (Lampa.Storage.get('applecation_show_studio') === null) {
      Lampa.Storage.set('applecation_show_studio', true);
  }

  // Функція для генерації SVG коду в преміальному золотому стилі
  function getSvgIcon(label, sublabel) {
    var bgTop = '#f9d976';    // Світле золото
    var bgBottom = '#b2822b'; // Темне золото (бронза)
    var textColor = '#2a1b02'; // Майже чорний для контрасту
    var strokeColor = '#7a5416'; // Контур

    var svg = '<svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="gold_grad_' + label.replace(/[^a-z0-9]/gi, '') + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" style="stop-color:' + bgTop + ';stop-opacity:1" />' +
          '<stop offset="100%" style="stop-color:' + bgBottom + ';stop-opacity:1" />' +
        '</linearGradient>' +
      '</defs>' +
      // Форма щита з твого фото
      '<path d="M10 15C10 8 16 5 25 5H95C104 5 110 8 110 15V70C110 85 95 95 60 95C25 95 10 85 10 70V15Z" ' +
      'fill="url(#gold_grad_' + label.replace(/[^a-z0-9]/gi, '') + ')" stroke="' + strokeColor + '" stroke-width="1.5"/>' +
      // Основний текст
      '<text x="60" y="' + (sublabel ? '48' : '58') + '" text-anchor="middle" fill="' + textColor + '" font-family="Arial, sans-serif" font-size="' + (label.length > 4 ? '20' : '32') + '" font-weight="900">' + label + '</text>' +
      // Підпис (якщо є)
      (sublabel ? '<text x="60" y="76" text-anchor="middle" fill="' + textColor + '" fill-opacity="0.7" font-family="Arial, sans-serif" font-size="14" font-weight="bold" letter-spacing="0.5">' + sublabel + '</text>' : '') +
    '</svg>';

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Словник іконок - тепер всі золоті
  var svgIcons = {
    '4K': getSvgIcon('4K', 'ULTRA HD'),
    'FULL HD': getSvgIcon('1080P', 'FULL HD'),
    'HD': getSvgIcon('720P', 'HD'),
    'HDR': getSvgIcon('HDR', 'HIGH DYNAMIC'),
    'Dolby Vision': getSvgIcon('Dolby', 'VISION'),
    '7.1': getSvgIcon('7.1', 'CHANNELS'),
    '5.1': getSvgIcon('5.1', 'CHANNELS'),
    '2.0': getSvgIcon('2.0', 'STEREO'),
    'DUB': getSvgIcon('DUB', 'STUDIO'),
    'UKR': getSvgIcon('UKR', 'LANGUAGE'),
    '2K': getSvgIcon('2K', 'QUAD HD')
  };

  // --- Рендеринг та логіка плагіна ---

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
      container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" style="height: 1.8em; width: auto;"></div>');

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
          var r = 0, g = 0, b = 0, pixelCount = 0;
          for (var i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 50) {
              r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
              pixelCount++;
            }
          }
          if (pixelCount > 0) {
            var brightness = (0.299 * (r/pixelCount) + 0.587 * (g/pixelCount) + 0.114 * (b/pixelCount));
            if (brightness < 35) $('#' + imgId + ' img').css('filter', 'brightness(0) invert(1)');
          }
        } catch (e) {}
      };
      img.src = logo.url;
    });
  }

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
    $('.card:not(.qb-processed)').addClass('qb-processed').each(function() {
      var card = $(this);
      var movie = card.data('item');
      if (movie && Lampa.Storage.field('parser_use')) {
        Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(response) {
          if (response && response.Results) addCardBadges(card, getBest(response.Results));
        });
      }
    });
  }

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

  var style = '<style>\
    .quality-badges-container { display: flex; align-items: center; gap: 0.8em; margin: 0.8em 0; min-height: 2.5em; flex-wrap: wrap; }\
    .quality-badge { height: 2.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }\
    .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; z-index: 5; }\
    .card-quality-badge { height: 1.6em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }\
    @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }\
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }\
  </style>';
  $('body').append(style);

})();
