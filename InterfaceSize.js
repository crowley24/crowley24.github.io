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

    // Додаємо значення в меню у **правильному порядку**
    const sizeValues = [
      { id: '09', name: lang_data.settings_param_interface_size_mini },
      { id: '09.5', name: lang_data.settings_param_interface_size_very_small },
      { id: '10', name: lang_data.settings_param_interface_size_small },
      { id: '10.5', name: lang_data.settings_param_interface_size_medium },
      { id: '11', name: lang_data.settings_param_interface_size_standard },
      { id: '11.5', name: lang_data.settings_param_interface_size_large },
      { id: '12', name: lang_data.settings_param_interface_size_very_large }
    ];

    // Очищуємо старі дані
    Lampa.Params.values['interface_size'] = {};

    // Створюємо об’єкт для Params.select
    let orderedValues = {};
    sizeValues.forEach(v => orderedValues[v.id] = v.name);

    // Передаємо у select
    Lampa.Params.select('interface_size', orderedValues, '11'); // за замовчуванням Стандартний

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
