// Простий плагін якості для карток  
(function () {  
  'use strict';  
    
  console.log('[QualitySimple] Loading simple version');  
    
  // Перевірка залежностей  
  if (typeof $ === 'undefined') {  
    console.error('[QualitySimple] jQuery not available');  
    return;  
  }  
    
  // Функція додавання тестових бейджів  
  function addSimpleBadges() {  
    $('.card').each(function(index) {  
      var card = $(this);  
      if (!card.find('.quality-simple-badge').length) {  
        var badge = '<div class="quality-simple-badge" style="position: absolute; top: 5px; right: 5px; background: #ff4444; color: white; padding: 2px 6px; font-size: 10px; z-index: 9999;">Q</div>';  
        card.find('.card__view').append(badge);  
      }  
    });  
  }  
    
  // Запуск через 2 секунди  
  setTimeout(function() {  
    console.log('[QualitySimple] Adding badges');  
    addSimpleBadges();  
  }, 2000);  
    
})();
