(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.11.5',
    name: 'Interface Size Precise',
    component: 'interface_size_precise'
  };
  Lampa.Manifest.plugins = manifest;

  const lang_data = {
    settings_param_interface_size_mini: 'Міні',
    settings_param_interface_size_very_small: 'Дуже малий',
    settings_param_interface_size_small: 'Малий',
    settings_param_interface_size_medium: 'Середній',
    settings_param_interface_size_standard: 'Стандартний',
    settings_param_interface_size_large: 'Великий',
    settings_param_interface_size_very_large: 'Дуже великий'
  };

  function init() {
    if (window.Lampa && Lampa.Lang) {
      Lampa.Lang.add(lang_data);
    }

    // Очищуємо старі значення
    Lampa.Params.values['interface_size'] = {};

    // Значення з реальними розмірами
    const sizeValues = {
      9: lang_data.settings_param_interface_size_mini,
      9.5: lang_data.settings_param_interface_size_very_small,
      10: lang_data.settings_param_interface_size_small,
      10.5: lang_data.settings_param_interface_size_medium,
      11: lang_data.settings_param_interface_size_standard,
      11.5: lang_data.settings_param_interface_size_large,
      12: lang_data.settings_param_interface_size_very_large
    };

    // Щоб порядок у меню був правильний, передаємо ключі як масив
    const orderedKeys = [9, 9.5, 10, 10.5, 11, 11.5, 12];
    let orderedValues = {};
    orderedKeys.forEach(k => orderedValues[k] = sizeValues[k]);

    // Створюємо select
    Lampa.Params.select('interface_size', orderedValues, 11); // за замовчуванням Стандартний

    updateSize();
  }

  const updateSize = () => {
    let iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;
    $('body').css({ fontSize: iSize + 'px' });

    // Логіка карток
    let cardCount = 6;
    if (iSize <= 9.5) cardCount = 8;
    else if (iSize <= 11) cardCount = 7;

    if (Lampa.Maker && Lampa.Maker.map) {
      ['Line', 'Category'].forEach(type => {
        const original = Lampa.Maker.map(type).Items.onInit;
        Lampa.Maker.map(type).Items.onInit = function() {
          original.call(this);
          if (type === 'Line') this.view = cardCount;
          else this.limit_view = cardCount;
        };
      });
    }
  };

  if (window.Lampa) {
    setTimeout(init, 500);

    // Слухаємо зміни
    Lampa.Storage.listener.follow('change', e => {
      if (e.name === 'interface_size') updateSize();
    });
  }
})();
