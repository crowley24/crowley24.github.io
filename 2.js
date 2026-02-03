(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.11.6',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  const lang_data = {
    settings_param_interface_size_mini: 'Міні (9)',  
    settings_param_interface_size_very_small: 'Дуже малий (9.5)',  
    settings_param_interface_size_small: 'Малий (10)',  
    settings_param_interface_size_medium: 'Середній (10.5)',  
    settings_param_interface_size_standard: 'Стандартний (11)',  
    settings_param_interface_size_large: 'Великий (11.5)',  
    settings_param_interface_size_very_large: 'Дуже великий (12)'
  };

  function init() {
    if (window.Lampa && Lampa.Lang) {
      Lampa.Lang.add(lang_data);
    }

    // 1. Повністю очищуємо існуючі значення для цього параметра
    Lampa.Params.values['interface_size'] = {};

    // 2. Створюємо список у правильному порядку
    // Використовуємо масив об'єктів для гарантованого порядку відображення
    let precise_sizes = {
      '09': lang_data.settings_param_interface_size_mini,
      '09.5': lang_data.settings_param_interface_size_very_small,
      '10': lang_data.settings_param_interface_size_small,
      '10.5': lang_data.settings_param_interface_size_medium,
      '11': lang_data.settings_param_interface_size_standard,
      '11.5': lang_data.settings_param_interface_size_large,
      '12': lang_data.settings_param_interface_size_very_large
    };

    // 3. Реєструємо параметр заново
    Lampa.Params.select('interface_size', precise_sizes, '11');

    updateSize();
  }
  
  const updateSize = () => {
    const iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;
    $('body').css({ fontSize: iSize + 'px' });  
  
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
    // Збільшуємо затримку до 1 секунди, щоб перебити стандартні налаштування Lampa
    setTimeout(init, 1000); 
    Lampa.Storage.listener.follow('change', e => {  
      if (e.name == 'interface_size') updateSize();  
    });
  }
})();
