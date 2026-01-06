/Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Testing card data');  
  
  // Перевіряємо перші 3 картки  
  $('.card').slice(0, 3).each(function(index) {  
    var card = $(this);  
    var itemData = card.data('item');  
    var movieData = card.data('movie');  
    var title = card.find('.card__title').text();  
      
    console.log('[QualityBadges] Card', index, ':');  
    console.log('  - Title:', title);  
    console.log('  - Has data.item:', !!itemData);  
    console.log('  - Has data.movie:', !!movieData);  
    console.log('  - Parser enabled:', Lampa.Storage.field('parser_use'));  
      
    if (itemData) {  
      console.log('  - Item data keys:', Object.keys(itemData));  
    }  
    if (movieData) {  
      console.log('  - Movie data keys:', Object.keys(movieData));  
    }  
  });  
  
  // Додаємо тестовий бейдж до першої картки  
  var firstCard = $('.card').first();  
  if (firstCard.length) {  
    var testBadge = '<div style="position: absolute; top: 5px; right: 5px; background: red; color: white; padding: 2px 5px; font-size: 10px; z-index: 10;">TEST</div>';  
    firstCard.find('.card__view').append(testBadge);  
    console.log('[QualityBadges] Added test badge to first card');  
  }  
  
})();
