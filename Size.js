(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.11.1',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // 1. Словник перекладів
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

  // 2. Ініціалізація перекладів та параметрів
  function init() {
    if (typeof Lampa !== 'undefined' && Lampa.Lang) {
      try {
        Lampa.Lang.add(lang_data);
      } catch (e) {
        console.error('Plugin: Error adding translations', e);
      }
    }

    // Додаємо вибір розміру інтерфейсу з перекладеними назвами
    Lampa.Params.select('interface_size', {  
      '09': Lampa.Lang.translate('settings_param_interface_size_mini'),        
      '09.5': Lampa.Lang.translate('settings_param_interface_size_very_small'), 
      '10': Lampa.Lang.translate('settings_param_interface_size_small'),       
      '10.5': Lampa.Lang.translate('settings_param_interface_size_medium'),    
      '11': Lampa.Lang.translate('settings_param_interface_size_standard'),    
      '11.5': Lampa.Lang.translate('settings_param_interface_size_large'),     
      '12': Lampa.Lang.translate('settings_param_interface_size_very_large')   
    }, '11');  
  
    // Параметр розміру тексту
    Lampa.Params.select('interface_text_size', {  
      '08': '8', '09': '9', '10': '10', '11': '11', '12': '12',  
      '13': '13', '14': '14', '15': '15', '16': '16'  
    }, '12');

    updateSize();
  }
  
  const getInterfaceSize = () => Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;  
  const getTextSize = () => parseFloat(Lampa.Storage.field('interface_text_size')) || 12;  
  
  const getCardCount = (interfaceSize) => {  
    if (interfaceSize <= 9.5) return 8;  
    if (interfaceSize <= 11) return 7;  
    return 6;  
  };  
  
  const updateSize = () => {  
    const interfaceSize = getInterfaceSize();  
    const textSize = getTextSize();  
  
    $('body').css({ fontSize: interfaceSize + 'px' });  
  
    // Коригування шрифтів для окремих елементів
    $('.settings-param__name, .settings-param__value, .settings-param__descr, .full-descr__text, .card__title, .card__genres, .filter__name, .filter__value').css({  
      fontSize: (textSize / interfaceSize) + 'em'  
    });  
  
    const cardCount = getCardCount(interfaceSize);  
  
    // Модифікація відображення карток
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
  
  // Запуск плагіна
  if (window.Lampa) {
    init();
    Lampa.Storage.listener.follow('change', e => {  
      if (e.name == 'interface_size' || e.name == 'interface_text_size') updateSize();  
    });
  }
})();
