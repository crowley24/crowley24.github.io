//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Plugin started IMMEDIATELY');  
  
  // Перевірка доступності залежностей  
  if (typeof $ === 'undefined') {  
    console.error('[QualityBadges] jQuery not available');  
    return;  
  }  
  
  if (typeof Lampa === 'undefined') {  
    console.error('[QualityBadges] Lampa not available');  
    return;  
  }  
  
  console.log('[QualityBadges] Dependencies OK - jQuery and Lampa available');  
  
  // Функція для тестування карток  
  function testCardProcessing() {  
    console.log('[QualityBadges] === Testing card processing ===');  
    console.log('[QualityBadges] Current URL:', window.location.href);  
    console.log('[QualityBadges] Body HTML length:', document.body.innerHTML.length);  
      
    // Тестуємо різні селектори  
    var selectors = [  
      '.card',  
      '.items-cards .card',  
      '.scroll__content .card',  
      '[class*="card"]',  
      '.card--item',  
      '.movie-card',  
      '.poster'  
    ];  
      
    var totalFound = 0;  
    selectors.forEach(function(selector) {  
      var elements = $(selector);  
      console.log('[QualityBadges] Selector "' + selector + '":', elements.length, 'elements');  
      totalFound += elements.length;  
        
      if (elements.length > 0) {  
        elements.each(function(index) {  
          var element = $(this);  
          var hasData = !!element.data('item');  
          var title = element.find('.card__title, .title, [class*="title"]').text();  
          console.log('[QualityBadges] Element', index, '- has data:', hasData, '- title:', title.substring(0, 50));  
        });  
      }  
    });  
      
    console.log('[QualityBadges] Total card elements found:', totalFound);  
      
    // Перевіряємо структуру DOM  
    console.log('[QualityBadges] Body classes:', document.body.className);  
    var containers = $('.scroll__content, .items-cards, .content, main');  
    console.log('[QualityBadges] Main containers found:', containers.length);  
      
    // Показуємо перші 3 елементи body для аналізу  
    var bodyChildren = $(document.body).children().slice(0, 3);  
    bodyChildren.each(function(index) {  
      console.log('[QualityBadges] Body child', index, ':', this.tagName, this.className);  
    });  
  }  
  
  // Запускаємо тест НЕЗАЛЕЖНО від затримок  
  console.log('[QualityBadges] Running IMMEDIATE test...');  
  testCardProcessing();  
  
  // Додаємо кілька затримок для впевненості  
  setTimeout(function() {  
    console.log('[QualityBadges] Running test after 3 seconds...');  
    testCardProcessing();  
  }, 3000);  
    
  setTimeout(function() {  
    console.log('[QualityBadges] Running test after 7 seconds...');  
    testCardProcessing();  
  }, 7000);  
  
  // Додаємо кнопку для тестування  
  var testButton = '<button id="quality-test-btn" style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px; font-size: 16px;">TEST QUALITY</button>';  
  $('body').append(testButton);  
  $('#quality-test-btn').on('click', function() {  
    console.log('[QualityBadges] Manual test triggered by button click');  
    testCardProcessing();  
  });  
  
  console.log('[QualityBadges] Plugin fully initialized with IMMEDIATE diagnostics');  
  
})();
