(function() {
    "use strict";
    
    // Створюємо стилі негайно, щоб заблокувати оригінальне лого в CSS
    var fastStyle = document.createElement('style');
    fastStyle.id = 'welcome-plugin-pre-style';
    fastStyle.innerHTML = 
        /* Максимально жорстке приховування стандартних елементів */
        '.lampa__logo, .lampa__preloader, #preloader, .loader, [class*="logo"] { display: none !important; opacity: 0 !important; visibility: hidden !important; } ' +
        '.welcome { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2147483647; background: #000; display: flex; align-items: center; justify-content: center; transition: opacity 0.6s ease; }';
    
    document.documentElement.appendChild(fastStyle);

    if (!window.welcomeplugin) {
        window.welcomeplugin = true;
        
        var init = function() {
            var welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome';
            welcomeDiv.style.backgroundImage = "url('https://i.ibb.co/d0HFCFpP/IMG-20260218-142212-039.jpg')";
            welcomeDiv.style.backgroundRepeat = "no-repeat";
            welcomeDiv.style.backgroundPosition = "50% 50%";
            welcomeDiv.style.backgroundSize = "cover";
            
            var textDiv = document.createElement('div');
            textDiv.style.cssText = 'color: white; font-size: 48px; font-family: Arial, sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); background: rgba(0,0,0,0.3); padding: 20px 40px; border-radius: 10px; text-align: center;';
            textDiv.textContent = 'Welcome Lampa Max🍿';
            
            welcomeDiv.appendChild(textDiv);
            document.body.appendChild(welcomeDiv);

            var removeWelcome = function() {
                welcomeDiv.style.opacity = '0';
                setTimeout(function() {
                    if (welcomeDiv.parentNode) welcomeDiv.parentNode.removeChild(welcomeDiv);
                    // Видаляємо блокуючий стиль, щоб Lampa могла працювати далі
                    if (fastStyle.parentNode) fastStyle.parentNode.removeChild(fastStyle);
                }, 600);
            };

            setTimeout(removeWelcome, 3500); 
            window.addEventListener('keydown', removeWelcome);
            window.addEventListener('click', removeWelcome);
        };

        // Запуск при завантаженні DOM
        if (document.body) init();
        else document.addEventListener('DOMContentLoaded', init);
    }
})();
