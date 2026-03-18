(function () {    
  "use strict";    
    
  let manifest = {    
    type: 'interface',    
    version: '3.11.5',    
    name: 'Interface Size Custom',    
    component: 'interface_size_custom'    
  };    
  Lampa.Manifest.plugins = manifest;    
    
  const lang_data = {  
    settings_param_interface_size_mini: 'Міні інтерфейс',    
    settings_param_interface_size_small: 'Малий інтерфейс',    
    settings_param_interface_size_medium: 'Середній інтерфейс',    
    settings_param_interface_size_standard: 'Стандартний інтерфейс',    
    settings_param_interface_size_large: 'Великий інтерфейс',    
    settings_param_interface_size_very_large: 'Дуже великий інтерфейс'  
  };  
  
  function init() {  
    if (window.Lampa && Lampa.Lang) {  
      Lampa.Lang.add(lang_data);  
    }  
  
    // Очищуємо старі значення  
    Lampa.Params.values['interface_size'] = {};  
  
    // Додаємо значення в правильному порядку: малий, стандартний, дуже великий, міні, середній, великий  
    Lampa.Params.select('interface_size', {   
      '09': lang_data.settings_param_interface_size_mini,        // міні
      '10': lang_data.settings_param_interface_size_small,        // малий 
      '10.5': lang_data.settings_param_interface_size_medium,    // середній
      '11': lang_data.settings_param_interface_size_standard,    // стандартний 
      '11.5': lang_data.settings_param_interface_size_large,      // великий
      '12': lang_data.settings_param_interface_size_very_large  // дуже великий  
      }, '11');    
  
    updateSize();  
  }  
    
  const updateSize = () => {  
    const iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;  
    $('body').css({ fontSize: iSize + 'px' });    
    
    // Логіка карток  
    let cardCount = 6;  
    if (iSize <= 9) cardCount = 8;  
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
