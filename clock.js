(function() {  
    'use strict';  
  
    // == Lampac Clock Style Plugin ==  
    // Годинник поруч з індикаторами статусу  
  
    function createClock() {  
        // Знаходимо стандартний годинник  
        let oldClock = document.querySelector('.head__time');  
        if (!oldClock) {  
            console.warn('[ClockPlugin] .head__time не знайдено');  
            return;  
        }  
  
        // Якщо вже є наш годинник — не додаємо вдруге  
        if (document.querySelector('#custom-clock')) return;  
  
        // Створюємо контейнер для годинника  
        const clock = document.createElement('div');  
        clock.id = 'custom-clock';  
        clock.style.display = 'flex';  
        clock.style.alignItems = 'center';  
        clock.style.gap = '0.8em';  
        clock.style.fontFamily = 'Segoe UI, Roboto, sans-serif';  
        clock.style.fontWeight = '600';  
        clock.style.fontSize = '1.8em';  
        clock.style.whiteSpace = 'nowrap';  
        clock.style.marginLeft = '1.5em';  
  
        // Створюємо індикатори (зелений, жовтий, червоний)  
        const indicators = document.createElement('div');  
        indicators.style.display = 'flex';  
        indicators.style.gap = '0.5em';  
        indicators.style.alignItems = 'center';  
  
        // Функція створення індикатора  
        function createIndicator(color) {  
            const dot = document.createElement('div');  
            dot.style.width = '0.6em';  
            dot.style.height = '0.6em';  
            dot.style.borderRadius = '100%';  
            dot.style.backgroundColor = color;  
            return dot;  
        }  
  
        // Додаємо три індикатори  
        indicators.appendChild(createIndicator('#93d46d')); // зелений  
        indicators.appendChild(createIndicator('#FFD028')); // жовтий  
        indicators.appendChild(createIndicator('#f53f32')); // червоний  
  
        // Створюємо елемент для часу  
        const timeDisplay = document.createElement('div');  
        timeDisplay.style.display = 'flex';  
        timeDisplay.style.alignItems = 'baseline';  
  
        // Додаємо індикатори та час до контейнера  
        clock.appendChild(indicators);  
        clock.appendChild(timeDisplay);  
  
        // Вставляємо годинник замість стандартного  
        oldClock.parentNode.replaceChild(clock, oldClock);  
  
        // Оновлення часу  
        function updateClock() {  
            const now = new Date();  
            let h = now.getHours().toString().padStart(2, '0');  
            let m = now.getMinutes().toString().padStart(2, '0');  
            timeDisplay.innerHTML = `  
                <span style="color:#ffffff; font-size:1em;">${h}</span>  
                <span style="color:#ff9100; font-size:1em;">:${m}</span>  
            `;  
        }  
  
        updateClock();  
        setInterval(updateClock, 1000);  
    }  
  
    // Запуск після завантаження Lampa  
    if (window.Lampa && window.Lampa.Listener) {  
        Lampa.Listener.follow('app', function(e) {  
            if (e.type === 'ready') {  
                setTimeout(createClock, 1000);  
            }  
        });  
    } else {  
        // Fallback для старих версій  
        document.addEventListener('DOMContentLoaded', function() {  
            setTimeout(createClock, 3000);  
        });  
    }  
})();
