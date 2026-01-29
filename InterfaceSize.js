(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'interface',  
    version: '3.10.0',  
    name: 'Interface Size Precise',  
    component: 'interface_size_precise'  
  };  
  Lampa.Manifest.plugins = manifest;  
  
  // Використовуємо масив об'єктів для правильного порядку  
  Lampa.Params.select('interface_size', [  
    { value: '9', name: '9' },  
    { value: '9.5', name: '9.5' },  
    { value: '10', name: '10' },  
    { value: '10.5', name: '10.5' },  
    { value: '11', name: '11' },  
    { value: '11.5', name: '11.5' },  
    { value: '12', name: '12' }  
  ], '12');  
    
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 12;  
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });  
    
  updateSize();  
    
  Lampa.Storage.listener.follow('change', e => {  
    if (e.name == 'interface_size') updateSize();  
  });  
})();
