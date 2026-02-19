(function() {
    "use strict";

    var hideLampaStyle = document.createElement('style');
    hideLampaStyle.innerHTML = `
        /* Приховуємо головний прелоадер та заставку Lampa */
        body > div[class*="preloader"], 
        .preloader, 
        .lampa__preloader, 
        .prepare, 
        #preloader { 
            display: none !important; 
            opacity: 0 !important; 
            visibility: hidden !important; 
        }
        
        /* Наша заставка має бути вище за все */
        .my-welcome-screen {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 2147483647 !important;
            background: #000000 url('https://i.ibb.co/d0HFCFpP/IMG-20260218-142212-039.jpg') no-repeat 50% 50%;
            background-size: cover;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.6s ease;
        }
    `;
    document.documentElement.appendChild(hideLampaStyle);

    if (!window.welcomeplugin) {
        window.welcomeplugin = true;

        var init = function() {
            var welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'my-welcome-screen';
            
            var textDiv = document.createElement('div');
            textDiv.style.cssText = 'color: white; font-size: 48px; font-family: Arial, sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); background: rgba(0,0,0,0.3); padding: 20px 40px; border-radius: 10px; text-align: center;';
            textDiv.textContent = 'Welcome Lampa Max🍿';
            
            welcomeDiv.appendChild(textDiv);
            document.body.appendChild(welcomeDiv);

            var removeWelcome = function() {
                welcomeDiv.style.opacity = '0';
                setTimeout(function() {
                    if (welcomeDiv.parentNode) welcomeDiv.parentNode.removeChild(welcomeDiv);
                    if (hideLampaStyle.parentNode) hideLampaStyle.parentNode.removeChild(hideLampaStyle);
                }, 600);
            };

            setTimeout(removeWelcome, 4000); 
            
            window.addEventListener('keydown', removeWelcome);
            window.addEventListener('click', removeWelcome);
        };

        if (document.body) init();
        else document.addEventListener('DOMContentLoaded', init);
    }
})();
