(function () {
  'use strict';

  const PLUGIN_ID = 'interface_size_precise';
  const DEFAULT_SIZE = 11;

  let manifest = {
    type: 'interface',
    version: '3.13.0',
    name: 'Interface Size Pro',
    component: PLUGIN_ID
  };

  Lampa.Manifest.plugins = manifest;

  let patched = false;

  function init() {
    // Реєстрація параметра (без знищення системних значень)
    if (!Lampa.Params.values['interface_size']) {
      Lampa.Params.select('interface_size', {
        '8': '8px (Ultra Compact)',
        '9': '9px (Compact)',
        '10': '10px (Balanced)',
        '11': '11px (Default)',
        '12': '12px (Comfort)'
      }, DEFAULT_SIZE.toString());
    }

    applySize(true);
  }

  function applySize(smooth = false) {
    let stored = Lampa.Storage.field('interface_size');
    let size = parseInt(stored);

    if (!size || isNaN(size)) size = DEFAULT_SIZE;

    // Mobile fallback
    if (Lampa.Platform.screen('mobile')) size = 10;

    // Плавність
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

  // Init
  if (window.Lampa) {
    setTimeout(init, 300);

    Lampa.Storage.listener.follow('change', e => {
      if (e.name === 'interface_size') {
        applySize(true);
      }
    });
  }

})();
