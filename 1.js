// Мінімальний плагін якості без зависань  
(function () {  
  'use strict';  
    
  // Перевірка чи вже завантажено  
  if (window.qualitySafeLoaded) return;  
  window.qualitySafeLoaded = true;  
    
  console.log('[QualitySafe] Loading minimal safe version');  
    
  // Простий тест без API викликів  
  setTimeout(function() {  
    console.log('[QualitySafe] Plugin loaded safely - no badges added');  
  }, 100);  
    
})();
