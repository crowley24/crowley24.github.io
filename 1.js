(function () {
  'use strict';

  if (!window.Lampa) return;

  // =======================================================
  // MANIFEST
  // =======================================================
  let manifest = {
    type: 'interface',
    version: '3.11.5',
    name: 'Interface Size Precise',
    component: 'interface_size_precise'
  };

  Lampa.Manifest.plugins = manifest;

  // =======================================================
  // LANG
  // =======================================================
  const lang_data = {
    settings_param_interface_size_mini: 'Міні',
    settings_param_interface_size_very_small: 'Дуже малий',
    settings_param_interface_size_small: 'Малий',
    settings_param_interface_size_medium: 'Середній',
    settings_param_interface_size_standard: 'Стандартний',
    settings_param_interface_size_large: 'Великий',
    settings_param_interface_size_very_large: 'Дуже великий'
  };

  // =======================================================
  // INIT
  // =======================================================
  function init() {
    if (Lampa.Lang) {
      Lampa.Lang.add(lang_data);
    }

    // 🔥 Повне очищення стандартного interface_size
    delete Lampa.Params.values.interface_size;
    delete Lampa.Params.options.interface_size;

    // ✅ ЧИСЛОВІ ключі — порядок більше не ламається
    Lampa.Params.select(
      'interface_size',
      {
        9: lang_data.settings_param_interface_size_mini,
        9.5: lang_data.settings_param_interface_size_very_small,
        10: lang_data.settings_param_interface_size_small,
        10.5: lang_data.settings_param_interface_size_medium,
        11: lang_data.settings_param_interface_size_standard,
        11.5: lang_data.settings_param_interface_size_large,
        12: lang_data.settings_param_interface_size_very_large
      },
      11
    );

    updateSize();
  }

  // =======================================================
  // UPDATE SIZE
  // =======================================================
  function updateSize() {
    let stored = parseFloat(Lampa.Storage.field('interface_size')) || 11;

    // Mobile — м’яке обмеження
    let iSize = Lampa.Platform.screen('mobile')
      ? Math.min(stored, 10)
      : stored;

    // ✔ Коректніше, ніж body
    document.documentElement.style.fontSize = iSize + 'px';

    // ===================================================
    // CARD LOGIC
    // ===================================================
    let cardCount = 6;
    if (iSize <= 9.5) cardCount = 8;
    else if (iSize <= 11) cardCount = 7;

    // ✔ Безпечна зміна без перехоплення Maker
    Lampa.Listener.follow('activity', e => {
      if (!e.object || !e.object.items) return;

      if (e.object.component === 'line') {
        e.object.items.view = cardCount;
      }

      if (e.object.component === 'category') {
        e.object.items.limit_view = cardCount;
      }
    });
  }

  // =======================================================
  // EVENTS
  // =======================================================
  Lampa.Listener.follow('ready', init);

  Lampa.Storage.listener.follow('change', e => {
    if (e.name === 'interface_size') updateSize();
  });

})();
