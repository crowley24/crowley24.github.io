(function () {
  'use strict';

  // =======================================================
  // CONFIG
  // =======================================================

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

  // =======================================================
  // QUALITY DETECTION
  // =======================================================

  function getBest(results) {
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];

    for (var i = 0; i < Math.min(results.length, 20); i++) {
      var item = results[i];
      var title = (item.Title || '').toLowerCase();

      var res = null;
      if (title.includes('2160') || title.includes('4k') || title.includes('uhd')) res = '4K';
      else if (title.includes('1440') || title.includes('2k')) res = '2K';
      else if (title.includes('1080') || title.includes('fhd') || title.includes('full hd')) res = 'FULL HD';
      else if (title.includes('720') || title.includes('hd')) res = 'HD';

      if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) {
        best.resolution = res;
      }

      if (item.ffprobe && Array.isArray(item.ffprobe)) {
        item.ffprobe.forEach(function (s) {
          if (s.codec_type === 'video') {
            if (s.side_data_list && JSON.stringify(s.side_data_list).includes('Vision')) best.dolbyVision = true;
            if (s.color_transfer === 'smpte2084' || s.color_transfer === 'arib-std-b67') best.hdr = true;
          }
          if (s.codec_type === 'audio' && s.channels) {
            var ch = parseInt(s.channels);
            var aud = ch >= 8 ? '7.1' : ch >= 6 ? '5.1' : ch >= 4 ? '4.0' : '2.0';
            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
          }
        });
      }

      if (title.includes('hdr')) best.hdr = true;
      if (title.includes('vision') || title.includes('dovi')) best.dolbyVision = true;
      if (title.includes('dub') || title.includes('дубл')) best.dub = true;
    }

    if (best.dolbyVision) best.hdr = true;
    return best;
  }

  // =======================================================
  // UI HELPERS
  // =======================================================

  function createBadge(type, isCard, index) {
    var src = svgIcons[type];
    if (!src) return '';
    var cls = isCard ? 'card-quality-badge' : 'quality-badge';
    return '<div class="' + cls + '" style="animation-delay:' + (index * 0.07) + 's"><img src="' + src + '" draggable="false"></div>';
  }

  function getCardTarget(card) {
    return (
      card.find('.card__view').first().length ? card.find('.card__view').first() :
      card.find('.card__img').first().length ? card.find('.card__img').first() :
      card.find('.card__image').first().length ? card.find('.card__image').first() :
      card.find('.card__poster').first()
    );
  }

  function addCardBadges(card, best) {
    if (!document.body.contains(card[0])) return;
    if (card.hasClass('qb-processed')) return;

    var badges = [];
    if (best.resolution) badges.push(createBadge(best.resolution, true, badges.length));
    if (best.hdr) badges.push(createBadge('HDR', true, badges.length));
    if (best.audio) badges.push(createBadge(best.audio, true, badges.length));
    if (best.dub) badges.push(createBadge('DUB', true, badges.length));
    if (best.dolbyVision) badges.push(createBadge('Dolby Vision', true, badges.length));

    if (!badges.length) return;

    var target = getCardTarget(card);
    if (!target.length) return;

    target.css('position', 'relative');
    target.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
    card.addClass('qb-processed');
  }

  // =======================================================
  // CARD PROCESSING
  // =======================================================

  function waitForData(card, attempt) {
    var max = 6;
    var delay = 250;

    var item = card.data('item');

    if (item && (item.title || item.name)) {
      Lampa.Parser.get(
        { search: item.title || item.name, movie: item, page: 1 },
        function (r) {
          if (r && r.Results) addCardBadges(card, getBest(r.Results));
        }
      );
    } else if (attempt < max) {
      setTimeout(function () {
        waitForData(card, attempt + 1);
      }, delay);
    }
  }

  function processCards(cards) {
    $(cards)
      .filter(':not(.qb-processing):not(.qb-processed)')
      .addClass('qb-processing')
      .each(function () {
        waitForData($(this), 0);
      });
  }

  // =======================================================
  // FULL CARD
  // =======================================================

  Lampa.Listener.follow('full', function (e) {
    if (e.type !== 'complite') return;

    var details = $('.full-start-new__details');
    if (!details.length) return;

    if (!$('.quality-badges-container').length) {
      details.after('<div class="quality-badges-container"></div>');
    }

    Lampa.Parser.get(
      { search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 },
      function (r) {
        if (!r || !r.Results) return;

        var best = getBest(r.Results);
        var out = [];

        if (best.resolution) out.push(createBadge(best.resolution, false, out.length));
        if (best.hdr) out.push(createBadge('HDR', false, out.length));
        if (best.audio) out.push(createBadge(best.audio, false, out.length));
        if (best.dub) out.push(createBadge('DUB', false, out.length));
        if (best.dolbyVision) out.push(createBadge('Dolby Vision', false, out.length));

        $('.quality-badges-container').html(out.join(''));
      }
    );
  });

  // =======================================================
  // STYLES
  // =======================================================

  $('body').append(`
<style>
.quality-badges-container{display:flex;gap:.3em;margin:.4em 0;pointer-events:none}
.quality-badge{height:1.2em;opacity:0;transform:translateY(6px);animation:qb .3s ease forwards}
.card-quality-badges{position:absolute;top:.3em;right:.3em;display:flex;gap:.2em;pointer-events:none;z-index:10}
.card-quality-badge{height:.9em;opacity:0;transform:translateY(5px);animation:qb .25s ease forwards}
@keyframes qb{to{opacity:1;transform:none}}
.quality-badge img,.card-quality-badge img{height:100%;width:auto;filter:drop-shadow(0 1px 2px #000)}
</style>`);

  // =======================================================
  // OBSERVER
  // =======================================================

  var observer = new MutationObserver(function (mutations) {
    var cards = [];
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n.nodeType === 1) {
          if (n.classList.contains('card')) cards.push(n);
          n.querySelectorAll && n.querySelectorAll('.card').forEach(function (c) {
            cards.push(c);
          });
        }
      });
    });
    if (cards.length) processCards(cards);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(function () {
    processCards(document.querySelectorAll('.card'));
  }, 1500);

  console.log('[QualityBadges] Loaded OK');

})();
