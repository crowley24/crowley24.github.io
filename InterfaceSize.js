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

    // Використовуємо ключі 01..07 для правильного порядку
    const sizeValues = {
      '01': lang_data.settings_param_interface_size_mini,
      '02': lang_data.settings_param_interface_size_very_small,
      '03': lang_data.settings_param_interface_size_small,
      '04': lang_data.settings_param_interface_size_medium,
      '05': lang_data.settings_param_interface_size_standard,
      '06': lang_data.settings_param_interface_size_large,
      '07': lang_data.settings_param_interface_size_very_large
    };

    // Створюємо select
    Lampa.Params.select('interface_size', sizeValues, '05'); // за замовчуванням Стандартний

    updateSize();
  }

  const updateSize = () => {
    const iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;
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
          if(type === 'Line') this.view = cardCount;
          else this.limit_view = cardCount;
        };
      });
    }
  };

  if (window.Lampa) {
    setTimeout(init, 500);
    Lampa.Storage.listener.follow('change', e => {
      if (e.name == 'interface_size') updateSize();
    });
  }
})();
