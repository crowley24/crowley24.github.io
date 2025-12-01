(function () {  
    'use strict';  
      
    console.log("DV Full Test Plugin: Starting");  
      
    // Стилі для тестового бейджа  
    var style = document.createElement('style');  
    style.textContent = `  
        .card__dv-test {  
            position: absolute !important;  
            top: 10px !important;  
            right: 10px !important;  
            background: red !important;  
            color: white !important;  
            padding: 5px 10px !important;  
            border-radius: 5px !important;  
            z-index: 9999 !important;  
            font-weight: bold !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Функція додавання тестового бейджа до ВСІХ карток  
    function addTestBadge() {  
        var cards = document.querySelectorAll('.card');  
        console.log("DV Full Test Plugin: Found cards:", cards.length);  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            if (!card.querySelector('.card__dv-test')) {  
                var badge = document.createElement('div');  
                badge.className = 'card__dv-test';  
                badge.textContent = 'TEST DV';  
                card.appendChild(badge);  
                console.log("DV Full Test Plugin: Added badge to card", i);  
            }  
        }  
    }  
      
    // Запускаємо тест  
    addTestBadge();  
      
    // Спостерігач за новими картками  
    var observer = new MutationObserver(function() {  
        setTimeout(addTestBadge, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
      
    console.log("DV Full Test Plugin: Started");  
})();
