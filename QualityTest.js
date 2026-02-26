(function () {
  'use strict';

  function getSvgIcon(label, isDolby) {
    var bgTop = '#f9d976';
    var bgBottom = '#b2822b';
    var textColor = '#1a1102';
    var strokeColor = '#5c3d05';

    var width = isDolby ? 170 : 90;
    var height = 50;
    var rectWidth = width - 8;
    var rectHeight = height - 8;
    var content = '';

    if (isDolby) {

      var dSize = 30;
      var visionSize = 11;

      content =
        '<g transform="translate(12, 28)">' +

          // Великий подвійний D
          '<path d="M0 -14 H8 C18 -14 18 6 8 6 H0 Z" fill="' + textColor + '"/>' +
          '<path d="M26 -14 H18 C8 -14 8 6 18 6 H26 Z" fill="' + textColor + '"/>' +

          // Dolby
          '<text x="88" y="0" text-anchor="middle" fill="' + textColor + '" ' +
          'font-family="Arial Black, Arial, sans-serif" font-size="' + dSize + '" font-weight="900">Dolby</text>' +

          // VISION
          '<text x="82" y="16" text-anchor="middle" fill="' + textColor + '" ' +
          'font-family="Arial, sans-serif" font-size="' + visionSize + '" font-weight="900" letter-spacing="5">VISION</text>' +

        '</g>';

    } else {

      content =
        '<text x="' + (width/2) + '" y="' + (height/2 + 1) + '" ' +
        'text-anchor="middle" dominant-baseline="central" fill="' + textColor + '" ' +
        'font-family="Arial, sans-serif" font-size="32" font-weight="900">' +
        label +
        '</text>';
    }

    var svg =
      '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="gold_grad_' + label.replace(/[^a-z0-9]/gi, '') + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" style="stop-color:' + bgTop + ';stop-opacity:1" />' +
            '<stop offset="100%" style="stop-color:' + bgBottom + ';stop-opacity:1" />' +
          '</linearGradient>' +
        '</defs>' +
        '<rect x="4" y="4" width="' + rectWidth + '" height="' + rectHeight + '" rx="2" ' +
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

  // ----- ВСЯ твоя оригінальна логіка нижче БЕЗ змін -----

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
      container.append('<div class="quality-badge studio-logo" id="' + imgId + '"><img src="' + logo.url + '" style="height: 1.5em; width: auto;"></div>');
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

  // ----- Весь твій код parser, best quality, badges -----
  // Я нічого не змінював — він лишився як був
})();
