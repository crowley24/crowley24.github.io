(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.11.4',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // 1. Словник перекладів (тільки для розміру інтерфейсу)
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
    // Реєструємо переклади
    if (window.Lampa && Lampa.Lang) {
      Lampa.Lang.add(lang_data);
    }

    // Реєструємо параметр. 
    // ВАЖЛИВО: Передаємо об'єкт, де назва ключа вже містить перекладений текст
    Lampa.Params.select('interface_size', {  
      '09': lang_data.settings_param_interface_size_mini,        
      '09.5': lang_data.settings_param_interface_size_very_small, 
      '10': lang_data.settings_param_interface_size_small,       
      '10.5': lang_data.settings_param_interface_size_medium,    
      '11': lang_data.settings_param_interface_size_standard,    
      '11.5': lang_data.settings_param_interface_size_large,     
      '12': lang_data.settings_param_interface_size_very_large   
    }, '11');  

    updateSize();
  }
  
  const updateSize = () => {
    // Отримуємо значення, враховуючи платформу
    const iSize = Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 11;
  
    // Встановлюємо розмір шрифту для всього додатка
    $('body').css({ fontSize: iSize + 'px' });  
  
    // Вираховуємо кількість карток
    let cardCount = 6;
    if (iSize <= 9.5) cardCount = 8;
    else if (iSize <= 11) cardCount = 7;

    // Оновлюємо відображення ліній та категорій
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
  
  // Запуск плагіна
  if (window.Lampa) {
    // Використовуємо невелику затримку, щоб переклади гарантовано підхопилися
    setTimeout(init, 300); 
    
    Lampa.Storage.listener.follow('change', e => {  
      if (e.name == 'interface_size') updateSize();  
    });
  }
})();

