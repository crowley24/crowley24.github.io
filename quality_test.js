(function () {  
    'use strict';  
      
    var DEBUG = true;  
      
    // Кольорові стилі  
    var style = document.createElement('style');  
    style.id = 'debug_dv_style';  
    style.textContent = `  
        .card__dv-debug { position: absolute !important; top: 10px !important; right: 10px !important;   
            background: linear-gradient(45deg, #6B46C1, #553C9A) !important; color: #FFFFFF !important;   
            padding: 5px 10px !important; border-radius: 5px !important; z-index: 9999 !important;   
            font-weight: bold !important; font-size: 0.7em !important; }  
        .card__hdr-debug { position: absolute !important; top: 10px !important; right: 10px !important;   
            background: linear-gradient(45deg, #FFD700, #FFA500) !important; color: #000000 !important;   
            padding: 5px 10px !important; border-radius: 5px !important; z-index: 9999 !important;   
            font-weight: bold !important; font-size: 0.7em !important; }  
    `;  
    document.head.appendChild(style);  
      
    // Функція виявлення якості  
    function detectQuality(title) {  
        if (!title) return null;  
        var lower = title.toLowerCase();  
          
        if (/\b(dolby\s*vision|dolbyvision|dv|dovi)\b/i.test(lower)) return 'DV';  
        if (/\b(hdr10\+|hdr10plus)\b/i.test(lower)) return 'HDR10+';  
        if (/\b(hdr|hdr10)\b/i.test(lower)) return 'HDR';  
        if (/\b(4k|2160p|uhd)\b/i.test(lower)) return '4K';  
        return null;  
    }  
      
    // Функція додавання бейджів з симуляцією  
    function addDebugBadges() {  
        var cards = document.querySelectorAll('.card');  
        console.log("DEBUG: Processing", cards.length, "cards");  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            if (!card.hasAttribute('data-debug-processed')) {  
                card.setAttribute('data-debug-processed', 'true');  
                  
                // Симулюємо різні якості для тестування  
                var qualities = ['DV', 'HDR10+', 'HDR', '4K'];  
                var quality = qualities[i % qualities.length];  
                  
                var badge = document.createElement('div');  
                badge.className = 'card__' + quality.toLowerCase().replace('+', 'plus') + '-debug';  
                badge.textContent = quality;  
                card.appendChild(badge);  
                  
                console.log("DEBUG: Added", quality, "to card", i);  
            }  
        }  
    }  
      
    addDebugBadges();  
      
    // Спостерігач  
    var observer = new MutationObserver(function() {  
        setTimeout(addDebugBadges, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
      
    console.log("DEBUG: Plugin with simulated qualities started");  
})();
