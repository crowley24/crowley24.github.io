(function () {
  'use strict';

  var pluginPath = 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/';
  var processed = new WeakSet();

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

  /* ====== ОРИГІНАЛЬНА ЛОГІКА ЯКОСТІ (БЕЗ ЗМІН) ====== */
  function getBest(results) {
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];

    results.slice(0, 20).forEach(function (item) {
      var t = (item.Title || '').toLowerCase();

      var r =
        t.includes('4k') || t.includes('2160') || t.includes('uhd') ? '4K' :
        t.includes('2k') || t.includes('1440') ? '2K' :
        t.includes('1080') || t.includes('fhd') || t.includes('full hd') ? 'FULL HD' :
        t.includes('720') || t.includes('hd') ? 'HD' : null;

      if (r && (!best.resolution || resOrder.indexOf(r) > resOrder.indexOf(best.resolution)))
        best.resolution = r;

      if (t.includes('hdr')) best.hdr = true;
      if (t.includes('vision') || t.includes('dovi')) best.dolbyVision = true;
      if (t.includes('dub') || t.includes('дубл')) best.dub = true;
    });

    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  function createBadge(type, idx) {
    return `
      <div class="card-quality-badge" style="animation-delay:${idx * 0.08}s">
        <img src="${svgIcons[type]}" draggable="false">
      </div>`;
  }

  function applyBadges(card, best) {
    if (!best || processed.has(card)) return;

    var view = card.querySelector('.card__view');
    if (!view) return;

    var html = '';
    var i = 0;

    if (best.resolution) html += createBadge(best.resolution, i++);
    if (best.hdr) html += createBadge('HDR', i++);
    if (best.audio) html += createBadge(best.audio, i++);
    if (best.dub) html += createBadge('DUB', i++);
    if (best.dolbyVision) html += createBadge('Dolby Vision', i++);

    if (html) {
      view.insertAdjacentHTML('beforeend',
        `<div class="card-quality-badges">${html}</div>`
      );
      processed.add(card);
    }
  }

  function processCard(card) {
    if (!card.card_data || processed.has(card)) return;

    var movie = card.card_data;
    if (!Lampa.Storage.field('parser_use')) return;

    Lampa.Parser.get({
      search: movie.title || movie.name,
      movie: movie,
      page: 1
    }, function (res) {
      if (res && res.Results)
        applyBadges(card, getBest(res.Results));
    });
  }

  /* ====== OBSERVER ЯК В MAXSM ====== */
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;

        if (n.classList.contains('card')) processCard(n);
        n.querySelectorAll && n.querySelectorAll('.card').forEach(processCard);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.querySelectorAll('.card').forEach(processCard);

  /* ====== СТИЛІ (оригінальні) ====== */
  $('body').append(`
    <style>
      .card-quality-badges{position:absolute;top:.3em;right:.3em;display:flex;gap:.2em;pointer-events:none;z-index:5}
      .card-quality-badge{height:.9em;opacity:0;transform:translateY(5px);animation:qb .3s ease forwards}
      .card-quality-badge img{height:100%;filter:drop-shadow(0 1px 2px #000)}
      @keyframes qb{to{opacity:1;transform:none}}
    </style>
  `);

  console.log('[QualityBadges] MAXSM-style observer enabled');
})();
