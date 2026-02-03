(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.11.3',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  const lang_data = {
    settings_interface_text_size: 'Розмір тексту',  
    settings_interface_text_size_descr: 'Незалежний розмір тексту елементів інтерфейсу',  
    settings_param_interface_size_mini: 'Міні',  
    settings_param_interface_size_very_small: 'Дуже малий',  
    settings_param_interface_size_small: 'Малий',  
    settings_param_interface_size_medium: 'Середній',  
    settings_param_interface_size_standard: 'Стандартний',  
    settings_param_interface_size_large: 'Великий',  
    settings_param_interface_size_very_large: 'Дуже великий'
  };

  function init() {
    // 1. Додаємо переклади в усі можливі мовні пакети Lampa
    if (window.Lampa && Lampa.Lang) {
      try {
        // Додаємо в поточну та в українську локаль примусово
        Lampa.Lang.add(lang_data);
      } catch (e) {
        console.error('Plugin: Lang error', e);
      }
    }

    // 2. Функція-помічник для гарантованого отримання тексту
    const getL = (key) => {
      if (window.Lampa && Lampa.Lang) {
        return Lampa.Lang.translate(key);
      }
      return lang_data[key] || key;
    };

    // 3. Реєструємо параметри
    Lampa.Params.select('interface_size', {  
      '09': getL('settings_param_interface_size_mini'),        
      '09.5': getL('settings_param_interface_size_very_small'), 
      '10': getL('settings_param_interface_size_small'),       
      '10.5': getL('settings_param_interface_size_medium'),    
      '11': getL('settings_param_interface_size_standard'),    
      '11.5': getL('settings_param_interface_size_large'),     
      '12': getL('settings_param_interface_size_very_large')   
    }, '11');  
  
    Lampa.Params.select('interface_text_size', {  
      '08': '8', '09': '9', '10': '10', '11': '11', '12': '12',  
      '13': '13', '14': '14', '15': '15', '16': '16'  
    }, '12');

    updateSize();
  }
  
  const updateSize = () => {
    const iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;
    const tSize = parseFloat(Lampa.Storage.field('interface_text_size')) || 12;
  
    $('body').css({ fontSize: iSize + 'px' });  
  
    const elements = '.settings-param__name, .settings-param__value, .settings-param__descr, .full-descr__text, .card__title, .card__genres, .filter__name, .filter__value';
    $(elements).css({ fontSize: (tSize / iSize) + 'em' });  
  
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
  
  // Використовуємо подію 'app:ready' або затримку, щоб Lampa встигла завантажити Lang
  if (window.Lampa) {
    setTimeout(init, 500); // Збільшено затримку для надійності
    Lampa.Storage.listener.follow('change', e => {  
      if (e.name == 'interface_size' || e.name == 'interface_text_size') updateSize();  
    });
  }
})();
