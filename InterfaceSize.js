(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.10.0',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // Використовуємо рядки з нулями для правильного порядку сортування  
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
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });  
    
  updateSize();  
    
  Lampa.Storage.listener.follow('change', e => {  
    if (e.name == 'interface_size') updateSize();  
  });  
})();
