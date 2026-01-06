//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Starting minimal version');  
  
  // Перевірка залежностей  
  if (typeof $ === 'undefined') {  
    console.error('[QualityBadges] jQuery not found');  
    return;  
  }  
  
  // Проста функція додавання тестових бейджів  
  function addTestBadges() {  
    console.log('[QualityBadges] Adding test badges to cards');  
      
    $('.card').each(function(index) {  
      var card = $(this);  
        
      // Перевіряємо чи вже є бейдж  
      if (card.find('.test-quality-badge').length === 0) {  
        var badge = '<div class="test-quality-badge" style="position: absolute; top: 5px; right: 5px; background: #ff4444; color: white; padding: 2px 6px; font-size: 10px; z-index: 10; border-radius: 3px;">TEST</div>';  
        card.find('.card__view').append(badge);  
        console.log('[QualityBadges] Added badge to card', index);  
      }  
    });  
  }  
  
  // Запускаємо кілька разів з різними затримками  
  setTimeout(addTestBadges, 1000);  
  setTimeout(addTestBadges, 3000);  
  setTimeout(addTestBadges, 5000);  
  
  // Додаємо кнопку для ручного тестування  
  $('body').append('<button id="test-badge-btn" style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: #ff4444; color: white; padding: 10px;">ADD BADGES</button>');  
  $('#test-badge-btn').on('click', addTestBadges);  
  
  console.log('[QualityBadges] Minimal plugin initialized');  
  
})();
