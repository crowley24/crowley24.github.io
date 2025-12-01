(function () {  
    'use strict';  
      
    console.log("COLOR TEST: Starting");  
      
    // Прості стилі  
    var style = document.createElement('style');  
    style.textContent = `  
        .card__color-test {  
            position: absolute !important;  
            top: 10px !important;  
            right: 10px !important;  
            background: purple !important;  
            color: white !important;  
            padding: 5px 10px !important;  
            border-radius: 5px !important;  
            z-index: 9999 !important;  
            font-weight: bold !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Тестова функція  
    function addColorTest() {  
        var cards = document.querySelectorAll('.card');  
        console.log("COLOR TEST: Found", cards.length, "cards");  
          
        for (var i = 0; i < Math.min(5, cards.length); i++) {  
            var card = cards[i];  
            if (!card.querySelector('.card__color-test')) {  
                var badge = document.createElement('div');  
                badge.className = 'card__color-test';  
                badge.textContent = 'COLOR';  
                card.appendChild(badge);  
                console.log("COLOR TEST: Added to card", i);  
            }  
        }  
    }  
      
    addColorTest();  
      
    // Спостерігач  
    var observer = new MutationObserver(function() {  
        setTimeout(addColorTest, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
})();
