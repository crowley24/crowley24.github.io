(function () {
  'use strict';

  var pluginPath = 'https://crowley24.github.io/Icons/';
  var parserCache = {};
  var parserLoading = {};
  var cardTimer = null;

  // Налаштування
  if (Lampa.Storage.get('applecation_show_studio') === null) {
    Lampa.Storage.set('applecation_show_studio', true);
  }

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

  function getMovieKey(movie) {
    if (!movie) return '';

    return String(
      movie.id ||
      movie.tmdb_id ||
      movie.kinopoisk_id ||
      movie.title ||
      movie.name ||
      ''
    ).toLowerCase();
  }

  function renderStudioLogos(container, data) {
    var showStudio = Lampa.Storage.get('applecation_show_studio');

    if (showStudio === false || showStudio === 'false') return;
    if (!data) return;

    var logos = [];
    var sources = [data.networks, data.production_companies];

    sources.forEach(function (source) {
      if (!source || !source.length) return;

      source.forEach(function (item) {
        if (!item || !item.logo_path) return;

        var logoUrl = Lampa.Api.img(item.logo_path, 'w200');

        if (!logos.some(function (l) {
          return l.url === logoUrl;
        })) {
          logos.push({
            url: logoUrl,
            name: item.name || ''
          });
        }
      });
    });

    logos.forEach(function (logo) {
      var imgId = 'logo_' + Math.random().toString(36).substr(2, 9);

      var html =
        '<div class="quality-badge studio-logo" id="' + imgId + '">' +
          '<img src="' + logo.url + '"' +
          ' title="' + logo.name + '"' +
          ' draggable="false">' +
        '</div>';

      container.append(html);

      /*
       * Аналізуємо не оригінальний великий логотип,
       * а маленьку копію 40x40.
       */
      var img = new Image();

      img.crossOrigin = 'anonymous';

      img.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d', {
            willReadFrequently: true
          });

          var size = 40;

          canvas.width = size;
          canvas.height = size;

          ctx.drawImage(this, 0, 0, size, size);

          var imageData = ctx.getImageData(
            0,
            0,
            size,
            size
          );

          var pixels = imageData.data;
          var r = 0;
          var g = 0;
          var b = 0;
          var pixelCount = 0;
          var darkPixelCount = 0;

          for (var i = 0; i < pixels.length; i += 4) {
            var alpha = pixels[i + 3];

            if (alpha > 50) {
              var brightness =
                0.299 * pixels[i] +
                0.587 * pixels[i + 1] +
                0.114 * pixels[i + 2];

              r += pixels[i];
              g += pixels[i + 1];
              b += pixels[i + 2];

              pixelCount++;

              if (brightness < 25) {
                darkPixelCount++;
              }
            }
          }

          if (pixelCount > 0) {
            var avgBrightness =
              0.299 * (r / pixelCount) +
              0.587 * (g / pixelCount) +
              0.114 * (b / pixelCount);

            var darkRatio =
              darkPixelCount / pixelCount;

            if (
              avgBrightness < 30 &&
              darkRatio > 0.6
            ) {
              var el = document.getElementById(imgId);

              if (el) {
                var logoImg = el.querySelector('img');

                if (logoImg) {
                  logoImg.style.filter =
                    'brightness(0) invert(1) contrast(1.2)';

                  logoImg.style.opacity = '0.9';
                }
              }
            }
          }
        } catch (e) {}
      };

      img.onerror = function () {};

      img.src = logo.url;
    });
  }

  function getBest(results) {
    var best = {
      resolution: null,
      hdr: false,
      dolbyVision: false,
      audio: null,
      dub: false,
      ukr: false
    };

    var resOrder = [
      'HD',
      'FULL HD',
      '2K',
      '4K'
    ];

    var audioOrder = [
      '2.0',
      '4.0',
      '5.1',
      '7.1'
    ];

    if (!results || !results.length) {
      return best;
    }

    var limit = Math.min(results.length, 20);

    for (var i = 0; i < limit; i++) {
      var item = results[i];

      if (!item) continue;

      var title = String(
        item.Title || ''
      ).toLowerCase();

      if (
        title.indexOf('ukr') >= 0 ||
        title.indexOf('укр') >= 0 ||
        title.indexOf('ua') >= 0
      ) {
        best.ukr = true;
      }

      var foundRes = null;

      if (
        title.indexOf('4k') >= 0 ||
        title.indexOf('2160') >= 0 ||
        title.indexOf('uhd') >= 0
      ) {
        foundRes = '4K';
      } else if (
        title.indexOf('2k') >= 0 ||
        title.indexOf('1440') >= 0
      ) {
        foundRes = '2K';
      } else if (
        title.indexOf('1080') >= 0 ||
        title.indexOf('fhd') >= 0 ||
        title.indexOf('full hd') >= 0
      ) {
        foundRes = 'FULL HD';
      } else if (
        title.indexOf('720') >= 0 ||
        title.indexOf('hd') >= 0
      ) {
        foundRes = 'HD';
      }

      if (
        foundRes &&
        (
          !best.resolution ||
          resOrder.indexOf(foundRes) >
          resOrder.indexOf(best.resolution)
        )
      ) {
        best.resolution = foundRes;
      }

      if (
        item.ffprobe &&
        Array.isArray(item.ffprobe)
      ) {
        item.ffprobe.forEach(function (stream) {
          if (!stream) return;

          if (stream.codec_type === 'video') {
            var sideData = stream.side_data_list;

            if (
              sideData &&
              Array.isArray(sideData)
            ) {
              for (var s = 0; s < sideData.length; s++) {
                var side = sideData[s];

                if (
                  side &&
                  (
                    String(
                      side.side_data_type || ''
                    ).toLowerCase().indexOf('dolby') >= 0 ||
                    String(
                      side.side_data_type || ''
                    ).toLowerCase().indexOf('vision') >= 0
                  )
                ) {
                  best.dolbyVision = true;
                  break;
                }
              }
            }

            if (
              stream.color_transfer === 'smpte2084' ||
              stream.color_transfer === 'arib-std-b67'
            ) {
              best.hdr = true;
            }
          }

          if (
            stream.codec_type === 'audio' &&
            stream.channels
          ) {
            var ch = parseInt(
              stream.channels,
              10
            );

            var aud =
              ch >= 8 ? '7.1' :
              ch >= 6 ? '5.1' :
              ch >= 4 ? '4.0' :
              '2.0';

            if (
              !best.audio ||
              audioOrder.indexOf(aud) >
              audioOrder.indexOf(best.audio)
            ) {
              best.audio = aud;
            }
          }
        });
      }

      if (
        title.indexOf('vision') >= 0 ||
        title.indexOf('dovi') >= 0 ||
        title.indexOf(' dv ') >= 0
      ) {
        best.dolbyVision = true;
      }

      if (title.indexOf('hdr') >= 0) {
        best.hdr = true;
      }

      if (
        title.indexOf('dub') >= 0 ||
        title.indexOf('дубл') >= 0
      ) {
        best.dub = true;
      }
    }

    if (best.dolbyVision) {
      best.hdr = true;
    }

    return best;
  }

  function createBadgeImg(type, isCard, index) {
    var iconPath = svgIcons[type];

    if (!iconPath) return '';

    var className =
      isCard ?
      'card-quality-badge' :
      'quality-badge';

    var delay =
      (index * 0.08) + 's';

    return (
      '<div class="' +
      className +
      '" style="animation-delay:' +
      delay +
      '">' +
        '<img src="' +
        iconPath +
        '" draggable="false">' +
      '</div>'
    );
  }

  function addCardBadges(card, best) {
    if (!card || !card.length) return;

    if (
      card.find('.card-quality-badges').length
    ) {
      return;
    }

    var badges = [];

    if (best.ukr) {
      badges.push(
        createBadgeImg(
          'UKR',
          true,
          badges.length
        )
      );
    }

    if (best.resolution) {
      badges.push(
        createBadgeImg(
          best.resolution,
          true,
          badges.length
        )
      );
    }

    if (!badges.length) return;

    card.find('.card__view').append(
      '<div class="card-quality-badges">' +
      badges.join('') +
      '</div>'
    );
  }

  /*
   * Parser з кешем.
   */
  function getParser(movie, callback) {
    if (!movie) return;

    var key = getMovieKey(movie);

    if (!key) return;

    if (parserCache[key]) {
      callback(parserCache[key]);
      return;
    }

    if (parserLoading[key]) {
      return;
    }

    parserLoading[key] = true;

    Lampa.Parser.get(
      {
        search:
          movie.title ||
          movie.name ||
          '',
        movie: movie,
        page: 1
      },
      function (response) {
        delete parserLoading[key];

        if (
          response &&
          response.Results
        ) {
          var best =
            getBest(response.Results);

          parserCache[key] = best;

          callback(best);
        } else {
          parserCache[key] = {
            resolution: null,
            hdr: false,
            dolbyVision: false,
            audio: null,
            dub: false,
            ukr: false
          };

          callback(
            parserCache[key]
          );
        }
      }
    );
  }

  /*
   * Обробка карток.
   */
  function processCards() {
    if (
      !Lampa.Storage.field('parser_use')
    ) {
      return;
    }

    $('.card:not(.qb-processed)')
      .addClass('qb-processed')
      .each(function () {
        var card = $(this);
        var movie = card.data('item');

        if (!movie) return;

        /*
         * Не запускаємо Parser прямо під час
         * масового створення DOM-карток.
         */
        var run = function () {
          getParser(
            movie,
            function (best) {
              if (
                document.body.contains(
                  card[0]
                )
              ) {
                addCardBadges(
                  card,
                  best
                );
              }
            }
          );
        };

        if (
          window.requestIdleCallback
        ) {
          requestIdleCallback(
            run,
            { timeout: 1500 }
          );
        } else {
          setTimeout(
            run,
            150
          );
        }
      });
  }

  /*
   * Відкриття повної картки.
   */
  Lampa.Listener.follow(
    'full',
    function (e) {
      if (
        e.type !== 'complite' ||
        !e.data ||
        !e.data.movie
      ) {
        return;
      }

      var movie = e.data.movie;

      /*
       * Невелика затримка дозволяє NewCard
       * спочатку виконати власну анімацію.
       */
      clearTimeout(cardTimer);

      cardTimer = setTimeout(
        function () {
          var details =
            $('.full-start-new__details');

          if (!details.length) {
            return;
          }

          var container =
            $('.quality-badges-container');

          if (!container.length) {
            details.after(
              '<div class="quality-badges-container"></div>'
            );

            container =
              $('.quality-badges-container');
          }

          container.empty();

          /*
           * Логотипи студій не повинні блокувати
           * відкриття картки.
           */
          renderStudioLogos(
            container,
            movie
          );

          /*
           * Parser запускаємо у вільний момент.
           */
          var loadParser = function () {
            getParser(
              movie,
              function (best) {
                if (
                  !document.body.contains(
                    container[0]
                  )
                ) {
                  return;
                }

                var badges = [];

                if (best.ukr) {
                  badges.push(
                    createBadgeImg(
                      'UKR',
                      false,
                      badges.length
                    )
                  );
                }

                if (best.resolution) {
                  badges.push(
                    createBadgeImg(
                      best.resolution,
                      false,
                      badges.length
                    )
                  );
                }

                if (best.dolbyVision) {
                  badges.push(
                    createBadgeImg(
                      'Dolby Vision',
                      false,
                      badges.length
                    )
                  );
                }

                if (best.hdr) {
                  badges.push(
                    createBadgeImg(
                      'HDR',
                      false,
                      badges.length
                    )
                  );
                }

                if (best.audio) {
                  badges.push(
                    createBadgeImg(
                      best.audio,
                      false,
                      badges.length
                    )
                  );
                }

                if (best.dub) {
                  badges.push(
                    createBadgeImg(
                      'DUB',
                      false,
                      badges.length
                    )
                  );
                }

                if (badges.length) {
                  container.append(
                    badges.join('')
                  );
                }
              }
            );
          };

          if (
            window.requestIdleCallback
          ) {
            requestIdleCallback(
              loadParser,
              { timeout: 2000 }
            );
          } else {
            setTimeout(
              loadParser,
              100
            );
          }
        },
        700
      );
    }
  );

  /*
   * Перевіряємо нові картки рідше,
   * щоб не навантажувати Lampa кожні 3 секунди.
   */
  setInterval(
    processCards,
    5000
  );

  var style =
    '<style>' +

    '.quality-badges-container{' +
      'display:flex;' +
      'align-items:center;' +
      'gap:.8em;' +
      'margin:.8em 0;' +
      'min-height:2em;' +
      'flex-wrap:wrap;' +
    '}' +

    '.quality-badge{' +
      'height:1.3em;' +
      'opacity:0;' +
      'transform:translate3d(0,8px,0);' +
      'animation:qb_in .4s ease forwards;' +
      'display:flex;' +
      'align-items:center;' +
      'will-change:transform,opacity;' +
      'backface-visibility:hidden;' +
    '}' +

    '.studio-logo{' +
      'height:1.8em !important;' +
      'margin-right:4px;' +
      'will-change:auto;' +
    '}' +

    '.studio-logo img{' +
      'height:100%;' +
      'width:auto;' +
      'display:block;' +
    '}' +

    '.card-quality-badges{' +
      'position:absolute;' +
      'top:.3em;' +
      'right:.3em;' +
      'display:flex;' +
      'flex-direction:row;' +
      'gap:.2em;' +
      'pointer-events:none;' +
      'z-index:5;' +
      'contain:layout style;' +
    '}' +

    '.card-quality-badge{' +
      'height:.9em;' +
      'opacity:0;' +
      'transform:translate3d(0,5px,0);' +
      'animation:qb_in .3s ease forwards;' +
      'will-change:transform,opacity;' +
      'backface-visibility:hidden;' +
    '}' +

    '@keyframes qb_in{' +
      'to{' +
        'opacity:1;' +
        'transform:translate3d(0,0,0);' +
      '}' +
    '}' +

    '.quality-badge img,' +
    '.card-quality-badge img{' +
      'height:100%;' +
      'width:auto;' +
      'display:block;' +
    '}' +

    '.card-quality-badge img{' +
      'filter:drop-shadow(0 1px 2px #000);' +
    '}' +

    '</style>';

  $('body').append(style);

})();
