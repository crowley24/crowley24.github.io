(function() {
    "use strict";

    // Створюємо стилі для приховування стандартних елементів та налаштування нашого екрана
    var hideLampaStyle = document.createElement('style');
    hideLampaStyle.innerHTML = `
        /* Приховуємо стандартний прелоадер Lampa */
        body > div[class*="preloader"], 
        .preloader, 
        .lampa__preloader, 
        .prepare, 
        #preloader { 
            display: none !important; 
            opacity: 0 !important; 
            visibility: hidden !important; 
        }
        
        /* Налаштування нашого вітального екрана */
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

        /* Стиль для тексту (без темного фону) */
        .my-welcome-text {
            color: white;
            font-size: 48px;
            font-family: 'Roboto', Arial, sans-serif;
            font-weight: bold;
            text-align: center;
            /* Посилена тінь, щоб текст не губився на фоні попкорну чи обличчя */
            text-shadow: 0px 4px 10px rgba(0, 0, 0, 0.9), 0px 0px 5px rgba(0, 0, 0, 0.5);
            padding: 20px;
            user-select: none;
        }
    `;
    document.documentElement.appendChild(hideLampaStyle);

    if (!window.welcomeplugin) {
        window.welcomeplugin = true;

        var init = function() {
            var welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'my-welcome-screen';
            
            var textDiv = document.createElement('div');
            textDiv.className = 'my-welcome-text';
            textDiv.textContent = 'Welcome Lampa Max🍿';
            
            welcomeDiv.appendChild(textDiv);
            document.body.appendChild(welcomeDiv);

            // Функція для плавного видалення екрана
            var removeWelcome = function() {
                if (welcomeDiv.style.opacity === '0') return; // Запобігаємо повторному виклику
                
                welcomeDiv.style.opacity = '0';
                setTimeout(function() {
                    if (welcomeDiv.parentNode) welcomeDiv.parentNode.removeChild(welcomeDiv);
                    if (hideLampaStyle.parentNode) hideLampaStyle.parentNode.removeChild(hideLampaStyle);
                }, 600);
            };

            // Автоматичне закриття через 4 секунди
            var autoHide = setTimeout(removeWelcome, 4000); 
            
            // Закриття при взаємодії користувача
            window.addEventListener('keydown', function() {
                clearTimeout(autoHide);
                removeWelcome();
            }, { once: true });

            window.addEventListener('click', function() {
                clearTimeout(autoHide);
                removeWelcome();
            }, { once: true });

            // Спроба закрити, коли Lampa повідомить про готовність (якщо підтримується)
            if (window.Lampa && window.Lampa.Listener) {
                window.Lampa.Listener.follow('app', function(e) {
                    if (e.type === 'ready') {
                        clearTimeout(autoHide);
                        removeWelcome();
                    }
                });
            }
        };

        // Запуск після завантаження DOM
        if (document.body) init();
        else document.addEventListener('DOMContentLoaded', init);
    }
})();
