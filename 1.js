//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Starting fixed version');  
  
  // Перевірка залежностей  
  if (typeof $ === 'undefined') {  
    console.error('[QualityBadges] jQuery not found');  
    return;  
  }  
  
  // Функція додавання тестових бейджів з правильним позиціонуванням  
  function addTestBadges() {  
    console.log('[QualityBadges] Adding VISIBLE test badges to cards');  
      
    $('.card').each(function(index) {  
      var card = $(this);  
        
      // Перевіряємо чи вже є бейдж  
      if (card.find('.test-quality-badge').length === 0) {  
        // Шукаємо правильний контейнер для бейджа  
        var cardView = card.find('.card__view') || card.find('.card__poster') || card;  
          
        var badge = '<div class="test-quality-badge" style="position: absolute; top: 5px; right: 5px; background: #ff0000 !important; color: white !important; padding: 3px 6px !important; font-size: 12px !important; z-index: 9999 !important; border-radius: 3px !important; font-weight: bold !important; pointer-events: none !important;">TEST</div>';  
          
        cardView.append(badge);  
        console.log('[QualityBadges] Added VISIBLE badge to card', index);  
      }  
    });  
  }  
  
  // Запускаємо кілька разів з різними затримками  
  setTimeout(addTestBadges, 1000);  
  setTimeout(addTestBadges, 3000);  
  setTimeout(addTestBadges, 5000);  
  
  // Додаємо кнопку для ручного тестування  
  $('body').append('<button id="test-badge-btn" style="position: fixed; top: 10px; right: 10px; z-index: 10000; background: #ff0000; color: white; padding: 10px; font-size: 14px; font-weight: bold;">ADD BADGES</button>');  
  $('#test-badge-btn').on('click', function() {  
    console.log('[QualityBadges] Manual test triggered');  
    addTestBadges();  
  });  
  
  console.log('[QualityBadges] Fixed plugin initialized');  
  
})();
