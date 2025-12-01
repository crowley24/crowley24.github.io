(function () {  
    'use strict';  
      
    console.log("SIMPLE COLOR TEST: Starting");  
      
    // Кольорові стилі  
    var style = document.createElement('style');  
    style.id = 'simple_color_style';  
    style.textContent = `  
        .card__dv-simple { position: absolute !important; top: 10px !important; right: 10px !important;   
            background: linear-gradient(45deg, #6B46C1, #553C9A) !important; color: #FFFFFF !important;   
            padding: 5px 10px !important; border-radius: 5px !important; z-index: 9999 !important;   
            font-weight: bold !important; font-size: 0.7em !important; }  
        .card__hdr-simple { position: absolute !important; top: 10px !important; right: 10px !important;   
            background: linear-gradient(45deg, #FFD700, #FFA500) !important; color: #000000 !important;   
            padding: 5px 10px !important; border-radius: 5px !important; z-index: 9999 !important;   
            font-weight: bold !important; font-size: 0.7em !important; }  
    `;  
    document.head.appendChild(style);  
      
    // Функція додавання тестових бейджів  
    function addSimpleBadges() {  
        var cards = document.querySelectorAll('.card');  
        console.log("SIMPLE COLOR: Found", cards.length, "cards");  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            if (!card.hasAttribute('data-simple-color')) {  
                card.setAttribute('data-simple-color', 'true');  
                  
                // Чергуємо DV та HDR для тестування  
                var badge = document.createElement('div');  
                badge.className = i % 2 === 0 ? 'card__dv-simple' : 'card__hdr-simple';  
                badge.textContent = i % 2 === 0 ? 'DV' : 'HDR';  
                card.appendChild(badge);  
                  
                console.log("SIMPLE COLOR: Added", badge.textContent, "to card", i);  
            }  
        }  
    }  
      
    addSimpleBadges();  
      
    // Спостерігач  
    var observer = new MutationObserver(function() {  
        setTimeout(addSimpleBadges, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
      
    console.log("SIMPLE COLOR: Plugin started");  
})();
