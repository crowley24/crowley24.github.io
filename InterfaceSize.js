(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.10.0',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // Розширені опції розміру з дробовими значеннями  
  Lampa.Params.select('interface_size', {   
    '09': '9',   
    '09.5': '9.5',   
    '10': '10',   
    '10.5': '10.5',   
    '11': '11',   
    '11.5': '11.5',   
    '12': '12'  
  }, '12');  
    
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 12;  
    
  // Розрахунок кількості карток залежно від розміру шрифту  
  const getCardCount = (fontSize) => {  
    if (fontSize <= 9) return 8;      // 9px - 8 карток  
    if (fontSize <= 9.5) return 8;    // 9.5px - 8 карток    
    if (fontSize <= 10) return 7;     // 10px - 7 карток  
    if (fontSize <= 10.5) return 7;   // 10.5px - 7 карток  
    if (fontSize <= 11) return 7;     // 11px - 7 карток  
    if (fontSize <= 11.5) return 6;   // 11.5px - 6 карток  
    return 6;                         // 12px - 6 карток  
  };  
    
  const updateSize = () => {  
    const fontSize = getSize();  
    $('body').css({ fontSize: fontSize + 'px' });  
      
    // Оновлюємо кількість карток для Line та Category  
    const cardCount = getCardCount(fontSize);  
      
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
    if (e.name == 'interface_size') updateSize();  
  });  
})();
