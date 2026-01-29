(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.10.0',  
    name: 'Interface Size',  
    component: 'interface_size'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // Розширені опції розміру інтерфейсу  
  Lampa.Params.select('interface_size', {   
    '8': '8',   
    '9': '9',   
    '10': '10',   
    '11': '11',   
    '12': '12',   
    '13': '13',   
    '14': '14',   
    '16': '16',   
    '18': '18'   
  }, '12');  
    
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseInt(Lampa.Storage.field('interface_size')) || 12;  
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });  
    
  updateSize();  
    
  Lampa.Storage.listener.follow('change', e => {  
    if (e.name == 'interface_size') updateSize();  
  });  
})();
