(function() {
    "use strict";

    // 1. Створюємо стилі і додаємо їх ВЖЕ ЗАРАЗ у самий верх сторінки
    var style = document.createElement('style');
    style.innerHTML = 
        /* Ховаємо ВСЕ, що може належати Lampa на старті */
        'html body > div:not(.my-welcome-screen), .prepare, .lampa__preloader, .preloader, #preloader, [class*="logo"] { ' +
        'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; } ' +
        
        /* Наша заставка - єдине, що дозволено бачити */
        '.my-welcome-screen { ' +
        'position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; ' +
        'z-index: 2147483647 !important; background: #000 url("https://i.ibb.co/d0HFCFpP/IMG-20260218-142212-039.jpg") no-repeat 50% 50% !important; ' +
        'background-size: cover !important; display: flex !important; align-items: center; justify-content: center; ' +
        'opacity: 1; visibility: visible !important; transition: opacity 0.5s ease; }' +
        
        '.welcome-text { color: white; font-size: 48px; font-family: Arial, sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); background: rgba(0,0,0,0.3); padding: 20px 40px; border-radius: 10px; text-align: center; }';
    
    document.documentElement.appendChild(style);

    if (!window.welcomeplugin) {
        window.welcomeplugin = true;

        var welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'my-welcome-screen';
        welcomeDiv.innerHTML = '<div class="welcome-text">Welcome Lampa Max🍿</div>';
        
        // Додаємо заставку в body або в documentElement, якщо body ще немає
        var mountInterval = setInterval(function() {
            if (document.body) {
                document.body.appendChild(welcomeDiv);
                clearInterval(mountInterval);
            }
        }, 10);

        var removeWelcome = function() {
            welcomeDiv.style.opacity = '0';
            setTimeout(function() {
                if (welcomeDiv.parentNode) welcomeDiv.parentNode.removeChild(welcomeDiv);
                if (style.parentNode) style.parentNode.removeChild(style);
                // Повертаємо видимість елементам Lampa
                var restoreStyle = document.createElement('style');
                restoreStyle.innerHTML = 'div { display: block; opacity: 1; visibility: visible; }';
                document.head.appendChild(restoreStyle);
            }, 500);
        };

        // Збільшуємо час очікування до 4.5 секунд, щоб Lampa точно прогрузилася під заставкою
        setTimeout(removeWelcome, 4500);

        window.addEventListener('keydown', removeWelcome);
        window.addEventListener('click', removeWelcome);
    }
})();
