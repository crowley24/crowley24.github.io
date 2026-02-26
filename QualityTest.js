(function () {
  'use strict';

  function getSvgIcon(label, isDolby) {
    var width = isDolby ? 160 : 100;
    var height = 54;
    
    // Кольорова палітра "Premium Gold"
    var col = {
      bgTop: '#fde08d',
      bgMid: '#b2822b',
      bgBottom: '#8a641b',
      stroke: '#5c3d05',
      text: '#1a1102',
      gloss: '#ffffff'
    };

    var content = '';
    var id = label.replace(/[^a-z0-9]/gi, '') + Math.floor(Math.random() * 1000);

    if (isDolby) {
      content = 
        // Символ DD
        '<g transform="translate(18, 27)">' +
          '<path d="M0 -11 C6 -11 10 -7 10 0 C10 7 6 11 0 11 H-2 V-11 Z" fill="' + col.text + '"/>' +
          '<path d="M12 -11 C18 -11 22 -7 22 0 C22 7 18 11 12 11 H10 V-11 Z" fill="' + col.text + '"/>' +
        '</g>' +
        // Розділювач
        '<line x1="48" y1="12" x2="48" y2="42" stroke="' + col.stroke + '" stroke-width="1.5" opacity="0.4"/>' +
        // Текст
        '<text x="56" y="25" text-anchor="start" fill="' + col.text + '" font-family="Arial Black, sans-serif" font-size="20" font-weight="900">Dolby</text>' +
        '<text x="56" y="40" text-anchor="start" fill="' + col.text + '" font-family="Arial, sans-serif" font-size="12" font-weight="900" letter-spacing="2">VISION</text>';
    } else {
      content = '<text x="' + (width/2) + '" y="' + (height/2 + 2) + '" text-anchor="middle" dominant-baseline="central" fill="' + col.text + '" font-family="Arial Black, sans-serif" font-size="32" font-weight="900">' + label + '</text>';
    }

    var svg = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        // Основний градієнт корпусу
        '<linearGradient id="grad_' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" style="stop-color:' + col.bgTop + ';stop-opacity:1" />' +
          '<stop offset="50%" style="stop-color:' + col.bgMid + ';stop-opacity:1" />' +
          '<stop offset="100%" style="stop-color:' + col.bgBottom + ';stop-opacity:1" />' +
        '</linearGradient>' +
        // Глянцевий відблиск зверху
        '<linearGradient id="gloss_' + id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" style="stop-color:' + col.gloss + ';stop-opacity:0.6" />' +
          '<stop offset="100%" style="stop-color:' + col.gloss + ';stop-opacity:0" />' +
        '</linearGradient>' +
      '</defs>' +
      // Тінь та основна форма
      '<rect x="4" y="4" width="' + (width-8) + '" height="' + (height-8) + '" rx="8" fill="url(#grad_' + id + ')" stroke="' + col.stroke + '" stroke-width="1.5"/>' +
      // Блік зверху
      '<rect x="6" y="6" width="' + (width-12) + '" height="' + (height/2-6) + '" rx="5" fill="url(#gloss_' + id + ')"/>' +
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
      container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" style="height: 1.6em; width: auto;"></div>');
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
            $('#' + imgId + ' img').css('filter', 'brightness(0) invert(1) contrast(2)');
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
    var limit = Math.min(results.length, 25);
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
    var delay = (index * 0.1) + 's';
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
    .quality-badges-container { display: flex; align-items: center; gap: 0.5em; margin: 0.6em 0; min-height: 2em; flex-wrap: wrap; }\
    .quality-badge { height: 1.8em; opacity: 0; transform: scale(0.8); animation: qb_pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }\
    .card-quality-badges { position: absolute; top: 0.4em; right: 0.4em; display: flex; flex-direction: row; gap: 0.2em; z-index: 5; }\
    .card-quality-badge { height: 1.2em; opacity: 0; transform: scale(0.8); animation: qb_pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }\
    @keyframes qb_pop { to { opacity: 1; transform: scale(1); } }\
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }\
  </style>';
  $('body').append(style);

})();
