(function () {  
    'use strict';    

    if (typeof Lampa === 'undefined' || !Lampa.Utils) {  

        setTimeout(arguments.callee, 100);  

        return;  

    }  
      
 // Завантажуємо плагіни  

    Lampa.Utils.putScriptAsync([  

        'https://crowley24.github.io/NewLogo.js',  

        'https://crowley24.github.io/mob_style.js',

    ], function () {  

        console.log('NewLogo и mob_style плагіни завантажені');  

    });  

})();













