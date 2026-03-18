(function () {
  'use strict';

  const DEFAULT_SIZE = '11';
  let patched = false;

  let manifest = {
    type: 'interface',
    version: '3.13.1',
    name: 'Interface Size Pro',
    component: 'interface_size_precise'
  };

  Lampa.Manifest.plugins = manifest;

  function init() {
    // 🔥 ПОВНЕ перезаписування стандартного параметра
    Lampa.Params.select('interface_size', {
      '8': '8px (Ultra Compact)',
      '9': '9px (Compact)',
      '10': '10px (Balanced)',
      '11': '11px (Default)',
      '12': '12px (Comfort)'
    }, DEFAULT_SIZE);

    applySize(true);
  }

  function applySize(smooth = false) {
    let size = parseInt(Lampa.Storage.field('interface_size')) || 11;

    if (Lampa.Platform.screen('mobile')) size = 10;

    if (smooth) {
      $('body').css({
        transition: 'font-size 0.25s ease'
      });
    }

    $('body').css({
      fontSize: size + 'px'
    });

    updateCards(size);
  }

  function updateCards(size) {
    if (!Lampa.Maker || !Lampa.Maker.map || patched) return;

    let cardCount;

    if (size <= 8) cardCount = 9;
    else if (size <= 9) cardCount = 8;
    else if (size <= 11) cardCount = 7;
    else cardCount = 6;

    ['Line', 'Category'].forEach(type => {
      let map = Lampa.Maker.map(type);
      if (!map || !map.Items || !map.Items.onInit) return;

      const original = map.Items.onInit;

      map.Items.onInit = function () {
        original.call(this);

        if (type === 'Line') this.view = cardCount;
        else this.limit_view = cardCount;
      };
    });

    patched = true;
  }

  if (window.Lampa) {
    // 🔥 важливо: даємо Lampa створити меню і потім переписуємо
    setTimeout(init, 800);

    Lampa.Storage.listener.follow('change', e => {
      if (e.name === 'interface_size') {
        applySize(true);
      }
    });
  }

})();
