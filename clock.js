(function() {
    'use strict';

    // == Lampac Clock Style Plugin ==
    // Заміна стандартного годинника Lampa на кастомний стиль

    function createClock() {
        // Прибираємо стандартний годинник
        let oldClock = document.querySelector('.head__time, .time, [class*="time"]');
        if (oldClock) oldClock.style.display = 'none';

        // Якщо вже є наш годинник — не додаємо вдруге
        if (document.querySelector('#custom-clock')) return;

        // Створюємо контейнер
        const clock = document.createElement('div');
        clock.id = 'custom-clock';
        clock.style.position = 'fixed';
        clock.style.top = '10px';
        clock.style.right = '30px';
        clock.style.fontFamily = 'Segoe UI, Roboto, sans-serif';
        clock.style.fontWeight = '600';
        clock.style.fontSize = '2.2vw';
        clock.style.color = '#ffffff';
        clock.style.zIndex = '9999';
        clock.style.userSelect = 'none';
        clock.style.pointerEvents = 'none';
        clock.style.textShadow = '0 0 6px rgba(0,0,0,0.5)';
        clock.style.transition = 'all 0.3s ease';

        document.body.appendChild(clock);

        // Оновлення часу
        function updateClock() {
            const now = new Date();
            let h = now.getHours().toString().padStart(2, '0');
            let m = now.getMinutes().toString().padStart(2, '0');
            clock.innerHTML = `
                <span style="color:white">${h}</span>
                <span style="color:#ff9100">:${m}</span>
            `;
        }

        updateClock();
        setInterval(updateClock, 1000);
    }

    // Запуск після завантаження DOM
    document.addEventListener('DOMContentLoaded', createClock);

    // Якщо Lampa перезапускає інтерфейс
    setTimeout(createClock, 3000);
})();
