(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.11.0',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // Додаємо переклади для нового параметра та для локалізованих міток розміру  
  if (typeof Lampa !== 'undefined' && Lampa.Lang) {  
    try {  
      Lampa.Lang.add({  
        settings_interface_text_size: 'Розмір тексту',  
        settings_interface_text_size_descr: 'Незалежний розмір тексту елементів інтерфейсу',  
        // Нові ключі для розміру інтерфейсу  
        settings_param_interface_size_mini: 'Міні',  
        settings_param_interface_size_very_small: 'Дуже малий',  
        settings_param_interface_size_small: 'Малий',  
        settings_param_interface_size_medium: 'Середній',  
        settings_param_interface_size_standard: 'Стандартний',  
        settings_param_interface_size_large: 'Великий',  
        settings_param_interface_size_very_large: 'Дуже великий'  
      });  
    } catch (e) {  
      console.error('Помилка додавання перекладів:', e);  
    }  
  }  
  
  // Розширені опції розміру з дробовими значеннями, тепер з локалізованими мітками  
  Lampa.Params.select('interface_size', {  
    '09': 'settings_param_interface_size_mini',        // Міні (9)  
    '09.5': 'settings_param_interface_size_very_small', // Дуже малий (9.5)  
    '10': 'settings_param_interface_size_small',       // Малий (10)  
    '10.5': 'settings_param_interface_size_medium',    // Середній (10.5)  
    '11': 'settings_param_interface_size_standard',    // Стандартний (11)  
    '11.5': 'settings_param_interface_size_large',     // Великий (11.5)  
    '12': 'settings_param_interface_size_very_large'   // Дуже великий (12)  
  }, '12');  
  
  // Новий параметр для розміру тексту з префіксом interface_  
  Lampa.Params.select('interface_text_size', {  
    '08': '8',  
    '09': '9',  
    '10': '10',  
    '11': '11',  
    '12': '12',  
    '13': '13',  
    '14': '14',  
    '15': '15',  
    '16': '16'  
  }, '12');  
  
  const getInterfaceSize = () => Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 12;  
  const getTextSize = () => parseFloat(Lampa.Storage.field('interface_text_size')) || 12;  
  
  const getCardCount = (interfaceSize) => {  
    if (interfaceSize <= 9) return 8;  
    if (interfaceSize <= 9.5) return 8;  
    if (interfaceSize <= 10) return 7;  
    if (interfaceSize <= 10.5) return 7;  
    if (interfaceSize <= 11) return 7;  
    if (interfaceSize <= 11.5) return 6;  
    return 6;  
  };  
  
  const updateSize = () => {  
    const interfaceSize = getInterfaceSize();  
    const textSize = getTextSize();  
  
    $('body').css({ fontSize: interfaceSize + 'px' });  
  
    $('.settings-param__name, .settings-param__value, .settings-param__descr, .full-descr__text, .card__title, .card__genres, .filter__name, .filter__value').css({  
      fontSize: (textSize / interfaceSize) + 'em'  
    });  
  
    const cardCount = getCardCount(interfaceSize);  
  
    const originalLine = Lampa.Maker.map('Line').Items.onInit;  
    Lampa.Maker.map('Line').Items.onInit = function () {  
      originalLine.call(this);  
      this.view = cardCount;  
    };  
  
    const originalCategory = Lampa.Maker.map('Category').Items.onInit;  
    Lampa.Maker.map('Category').Items.onInit = function () {  
      originalCategory.call(this);  
      this.limit_view = cardCount;  
    };  
  };  
  
  updateSize();  
  
  Lampa.Storage.listener.follow('change', e => {  
    if (e.name == 'interface_size' || e.name == 'interface_text_size') updateSize();  
  });  
})();
