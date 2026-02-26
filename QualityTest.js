(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  
  if (Lampa.Storage.get('applecation_show_studio') === null) {
      Lampa.Storage.set('applecation_show_studio', true);
  }

  // Спільні елементи для дизайну (градієнти та фільтри)
  var svgDefs = '<defs>' +
    '<linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#a31d1d;stop-opacity:1" /><stop offset="100%" style="stop-color:#5e0b0b;stop-opacity:1" /></linearGradient>' +
    '<linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#f9d976;stop-opacity:1" /><stop offset="100%" style="stop-color:#b2822b;stop-opacity:1" /></linearGradient>' +
    '<filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.5"/></filter>' +
  '</defs>';

  function createSvgIcon(content, isGold) {
    var bg = isGold ? 'url(#goldGrad)' : 'url(#redGrad)';
    var stroke = isGold ? '#7a5416' : '#f03e3e';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg width="120" height="100" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">' + 
      svgDefs + 
      '<path d="M10 15C10 8 16 5 25 5H95C104 5 110 8 110 15V70C110 85 95 95 60 95C25 95 10 85 10 70V15Z" fill="' + bg + '" stroke="' + stroke + '" stroke-width="2" filter="url(#shadow)"/>' +
      content + 
      '</svg>'
    );
  }

  var svgIcons = {
    '4K': createSvgIcon('<text x="60" y="48" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">4K</text><text x="60" y="75" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="14" font-weight="bold">ULTRA HD</text>'),
    'FULL HD': createSvgIcon('<text x="60" y="48" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">1080P</text><text x="60" y="75" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="16" font-weight="bold">FULL HD</text>'),
    'HD': createSvgIcon('<text x="60" y="48" text-anchor="middle" fill="white" font-family="Arial" font-size="28" font-weight="bold">720P</text><text x="60" y="75" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="18" font-weight="bold">HD</text>'),
    'HDR': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="36" font-weight="bold">HDR</text>'),
    'Dolby Vision': createSvgIcon('<path d="M35 30H45C52 30 52 40 45 40H35V30ZM75 30C82 30 82 40 75 40H65V30H75Z" fill="black" opacity="0.2"/><text x="60" y="45" text-anchor="middle" fill="#2a1b02" font-family="Arial" font-size="22" font-weight="bold">Dolby</text><text x="60" y="75" text-anchor="middle" fill="#2a1b02" font-family="Arial" font-size="18" letter-spacing="3">VISION</text>', true),
    '7.1': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="36" font-weight="bold">7.1</text>'),
    '5.1': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="36" font-weight="bold">5.1</text>'),
    '2.0': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="36" font-weight="bold">2.0</text>'),
    'DUB': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">DUB</text>'),
    'UKR': createSvgIcon('<text x="60" y="58" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">UKR</text>')
  };

  // --- Решта коду плагіна (без змін в логіці) ---

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
      var html = '<div class="quality-badge studio-logo" id="' + imgId + '">' +
                   '<img src="' + logo.url + '" title="' + logo.name + '" style="height: 1.8em; width: auto; opacity: 1;">' +
                 '</div>';
      container.append(html);
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
          var r = 0, g = 0, b = 0, pixelCount = 0, darkPixelCount = 0;
          for (var i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 50) {
              var br = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
              r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2];
              pixelCount++;
              if (br < 25) darkPixelCount++;
            }
          }
          if (pixelCount > 0) {
            var avgBr = (0.299 * (r/pixelCount) + 0.587 * (g/pixelCount) + 0.114 * (b/pixelCount));
            if (avgBr < 30 && (darkPixelCount / pixelCount) > 0.6) {
              $('#' + imgId + ' img').css({'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.9'});
            }
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
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';
      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) best.resolution = foundRes;
      if (item.ffprobe && Array.isArray(item.ffprobe)) {
        item.ffprobe.forEach(function(stream) {
          if (stream.codec_type === 'video') {
            if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
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
    return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false"></div>';
  }

  function addCardBadges(card, best) {
    if (card.find('.card-quality-badges').length) return;
    var badges = [];
    if (best.ukr) badges.push(createBadgeImg('UKR', true, badges.length));
    if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));
    if (badges.length) card.find('.card__view').append('<div class="card-quality-badges">' + badges.join('') + '</div>');
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
    .quality-badges-container { display: flex; align-items: center; gap: 0.8em; margin: 0.8em 0; min-height: 2em; flex-wrap: wrap; }\
    .quality-badge { height: 1.8em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; display: flex; align-items: center; }\
    .studio-logo { height: 2.2em !important; margin-right: 4px; }\
    .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }\
    .card-quality-badge { height: 1.4em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }\
    @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }\
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }\
  </style>';
  $('body').append(style);

})();
                          
