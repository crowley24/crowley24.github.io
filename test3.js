(function () {  
  'use strict';  
  var style = document.createElement('style');  
  style.textContent =  
    '.full-start-new__head, .full-start__tags { display: none !important; }';  
  document.head.appendChild(style);  
  console.log('[HIDE-PLUGIN] loaded');  
})();
