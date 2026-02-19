(function() {
    "use strict";
    if (!window.welcomeplugin) {
        window.welcomeplugin = true;
        
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = 
            /* Приховуємо оригінальні елементи завантаження Lampa */
            '.lampa__logo, .loader, .preloader { display: none !important; opacity: 0 !important; } ' +
            
            '.welcome {' +
                'position: fixed;' +
                'top: 0; left: 0; right: 0; bottom: 0;' +
                'z-index: 999999;' + /* Максимальний пріоритет */
                'background: #000000 url("https://i.ibb.co/d0HFCFpP/IMG-20260218-142212-039.jpg") no-repeat 50% 50%;' +
                'background-size: cover;' +
                'display: flex;' +
                'align-items: center;' +
                'justify-content: center;' +
                'transition: opacity 0.6s ease;' +
            '}' +
            '.welcome-text {' +
                'color: white;' +
                'font-size: 48px;' +
                'font-family: Arial, sans-serif;' +
                'text-shadow: 2px 2px 4px rgba(0,0,0,0.5);' +
                'background: rgba(0,0,0,0.3);' +
                'padding: 20px 40px;' +
                'border-radius: 10px;' +
                'text-align: center;' +
            '}';
            
        document.getElementsByTagName('head')[0].appendChild(style);
        
        var welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome';
        
        var textDiv = document.createElement('div');
        textDiv.className = 'welcome-text';
        textDiv.textContent = 'Welcome Lampa Max🍿';
        
        welcomeDiv.appendChild(textDiv);
        document.body.appendChild(welcomeDiv);

        var removeWelcome = function() {
            welcomeDiv.style.opacity = '0';
            setTimeout(function() {
                if (welcomeDiv.parentNode) {
                    welcomeDiv.parentNode.removeChild(welcomeDiv);
                }
                /* Повертаємо видимість інтерфейсу після заставки */
                var styleShow = document.createElement('style');
                styleShow.innerHTML = '.lampa__logo, .loader { display: block !important; opacity: 1 !important; }';
                // Але краще просто не повертати лого, якщо воно заважає
            }, 600);
        };

        // Закриття через 3 секунди
        setTimeout(removeWelcome, 3000); 

        // Додатково: закриття при натисканні будь-якої кнопки (для швидкості)
        window.addEventListener('keydown', removeWelcome);
        window.addEventListener('click', removeWelcome);
    }
})();
