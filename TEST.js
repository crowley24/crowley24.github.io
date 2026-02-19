(function() {
    "use strict";

    // Виносимо конфігурацію в об'єкт для зручного редагування
    const config = {
        title: 'Welcome Lampa Max 🍿',
        image: 'https://i.ibb.co/d0HFCFpP/IMG-20260218-142212-039.jpg',
        timeout: 5000, // Максимальний час показу
        fadeOut: 600   // Час анімації зникнення
    };

    const style = document.createElement('style');
    style.innerHTML = `
        /* Блокуємо стандартні елементи */
        body > div[class*="preloader"], .preloader, .lampa__preloader, .prepare, #preloader { 
            display: none !important; 
            opacity: 0 !important; 
        }
        
        .my-welcome-screen {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            background: #000 url('${config.image}') no-repeat center center;
            background-size: cover;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: opacity ${config.fadeOut}ms ease, transform ${config.fadeOut}ms ease;
            font-family: 'Roboto', Arial, sans-serif;
        }

        .my-welcome-content {
            text-align: center;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(5px);
            padding: 30px 60px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            transform: translateY(0);
            transition: transform 0.5s ease;
        }

        .my-welcome-text {
            color: white;
            font-size: 3rem;
            font-weight: bold;
            text-shadow: 0 4px 15px rgba(0,0,0,0.8);
            margin-bottom: 20px;
        }

        /* Анімована лінія завантаження */
        .my-welcome-loader {
            width: 200px;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            margin: 0 auto;
            overflow: hidden;
            position: relative;
        }

        .my-welcome-loader::after {
            content: '';
            position: absolute;
            left: -150%;
            width: 150%;
            height: 100%;
            background: linear-gradient(90deg, transparent, #fff, transparent);
            animation: welcome-loading 1.5s infinite;
        }

        @keyframes welcome-loading {
            100% { left: 100%; }
        }

        .my-welcome-screen.hide {
            opacity: 0;
            transform: scale(1.05);
            pointer-events: none;
        }
    `;
    document.documentElement.appendChild(style);

    const init = function() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'my-welcome-screen';
        welcomeDiv.innerHTML = `
            <div class="my-welcome-content">
                <div class="my-welcome-text">${config.title}</div>
                <div class="my-welcome-loader"></div>
            </div>
        `;
        
        document.body.appendChild(welcomeDiv);

        let isRemoved = false;
        const removeWelcome = function() {
            if (isRemoved) return;
            isRemoved = true;
            
            welcomeDiv.classList.add('hide');
            
            setTimeout(() => {
                welcomeDiv.remove();
                // Видаляємо стилі обмеження лише після того, як заставка зникла
                style.remove();
            }, config.fadeOut);
        };

        // 1. Закриття по таймеру (страховка)
        const timer = setTimeout(removeWelcome, config.timeout);

        // 2. Закриття при старті Lampa (найкращий варіант)
        // Спробуємо підключитися до події рендеру головного меню
        if (window.Lampa && window.Lampa.Listener) {
            window.Lampa.Listener.follow('app', (e) => {
                if (e.type === 'ready') removeWelcome();
            });
        }

        // 3. Закриття по кліку/клавіші
        ['keydown', 'click'].forEach(evt => 
            window.addEventListener(evt, () => {
                clearTimeout(timer);
                removeWelcome();
            }, { once: true })
        );
    };

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
