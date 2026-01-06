(function () {
  'use strict';

  var pluginPath = 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/';

  var svgIcons = {
    '4K': pluginPath + 'Quality_ico/4K.svg',
    '2K': pluginPath + 'Quality_ico/2K.svg',
    'FULL HD': pluginPath + 'Quality_ico/FULL HD.svg',
    'HD': pluginPath + 'Quality_ico/HD.svg',
    'HDR': pluginPath + 'Quality_ico/HDR.svg',
    'Dolby Vision': pluginPath + 'Quality_ico/Dolby Vision.svg',
    '7.1': pluginPath + 'Quality_ico/7.1.svg',
    '5.1': pluginPath + 'Quality_ico/5.1.svg',
    '4.0': pluginPath + 'Quality_ico/4.0.svg',
    '2.0': pluginPath + 'Quality_ico/2.0.svg',
    'DUB': pluginPath + 'Quality_ico/DUB.svg'
  };

  function getBest(results) {
    if (!Array.isArray(results)) return null;

    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];

    results.slice(0, 20).forEach(function (item) {
      if (!item || !item.Title) return;

      var t = item.Title.toLowerCase();

      var res =
        t.includes('2160') || t.includes('4k') ? '4K' :
        t.includes('1440') || t.includes('2k') ? '2K' :
        t.includes('1080') ? 'FULL HD' :
        t.includes('720') ? 'HD' : null;

      if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution)))
        best.resolution = res;

      if (t.includes('hdr')) best.hdr = true;
      if (t.includes('vision') || t.includes('dovi')) best.dolbyVision = true;
      if (t.includes('dub') || t.includes('дуб')) best.dub = true;

      if (item.ffprobe) {
        item.ffprobe.forEach(function (s) {
          if (s.codec_type === 'audio' && s.channels) {
            var a = s.channels >= 8 ? '7.1' :
                    s.channels >= 6 ? '5.1' :
                    s.channels >= 4 ? '4.0' : '2.0';

            if (!best.audio || audioOrder.indexOf(a) > audioOrder.indexOf(best.audio))
              best.audio = a;
          }
        });
      }
    });

    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function badge(type) {
    return svgIcons[type]
      ? '<div class="card-quality-badge"><img src="' + svgIcons[type] + '"></div>'
      : '';
  }

  function renderBadges(card, best) {
    if (!best || card.querySelector('.card-quality-badges')) return;

    var html = '';
    if (best.resolution) html += badge(best.resolution);
    if (best.hdr) html += badge('HDR');
    if (best.audio) html += badge(best.audio);
    if (best.dub) html += badge('DUB');
    if (best.dolbyVision) html += badge('Dolby Vision');

    if (!html) return;

    var wrap = document.createElement('div');
    wrap.className = 'card-quality-badges';
    wrap.innerHTML = html;

    var view = card.querySelector('.card__view');
    if (view) view.appendChild(wrap);
  }

  function processCard(card) {
    if (card.classList.contains('qb-ready')) return;

    var item = $(card).data('item');
    if (!item || !(item.title || item.name)) return;
    if (!Lampa.Storage.field('parser_use')) return;

    card.classList.add('qb-ready');

    Lampa.Parser.get(
      { search: item.title || item.name, movie: item, page: 1 },
      function (res) {
        var best = getBest(res && res.Results);
        renderBadges(card, best);
      }
    );
  }

  new MutationObserver(function (m) {
    m.forEach(function () {
      document.querySelectorAll('.card').forEach(processCard);
    });
  }).observe(document.body, { childList: true, subtree: true });

  Lampa.Listener.follow('full', function (e) {
    if (e.type !== 'complite') return;

    var box = document.querySelector('.quality-badges-container');
    if (!box) {
      box = document.createElement('div');
      box.className = 'quality-badges-container';
      document.querySelector('.full-start-new__details')?.after(box);
    }

    Lampa.Parser.get(
      { search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 },
      function (res) {
        var best = getBest(res && res.Results);
        if (!best) return;

        box.innerHTML = '';
        ['resolution', 'hdr', 'audio', 'dub', 'dolbyVision'].forEach(function (k) {
          if (best[k]) box.innerHTML += badge(best[k] === true ? 'HDR' : best[k]);
        });
      }
    );
  });

  $('body').append(`
    <style>
      .card-quality-badges {
        position:absolute;
        top:.3em;
        right:.3em;
        display:flex;
        gap:.2em;
        z-index:5;
        pointer-events:none
      }
      .card-quality-badge img {
        height:.85em;
        filter:drop-shadow(0 1px 2px #000)
      }
      .quality-badges-container {
        display:flex;
        gap:.3em;
        margin:.4em 0
      }
      .quality-badges-container img {
        height:1.2em
      }
    </style>
  `);

  console.log('[QualityBadges] OK');
})();
