(function () {
    'use strict';

    // Створюємо стиль для приховування блоку з роком та країною
    var style = document.createElement('style');
    style.innerHTML = `
        /* Селектор для метаданих над назвою (рік, країна, жанри тощо) */
        .card__age, 
        .full-start__tagline, 
        .full-start__details .info > div:has(> .fa-calendar-alt),
        .full-start__company,
        .card__view .card__age {
            display: none !important;
        }
        
        /* Універсальніший варіант для карток і повного опису, якщо потрібно прибрати рік/країну над заголовком */
        .full-start__details .info {
            /* За потреби можна точково налаштувати */
        }
    `;

    // Додатковий скрипт для точного видалення елементів через DOM (якщо CSS недостатньо)
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            setTimeout(function () {
                // Знаходимо блок деталей на сторінці фільму
                var details = document.querySelector('.full-start__details');
                if (details) {
                    var items = details.querySelectorAll('.info > div, .tagline');
                    items.forEach(function(el) {
                        // Шукаємо елементи, що містять роки (наприклад, 4 цифри) або виглядають як країна/дата
                        if (el.textContent.match(/\b(19|20)\d{2}\b/) || el.classList.contains('tagline')) {
                            // Можна розкоментувати рядок нижче, якщо треба видаляти повністю через JS:
                            // el.style.display = 'none';
                        }
                    });
                }
            }, 100);
        }
    });

    // Додаємо стилі на сторінку
    document.head.appendChild(style);

    console.log('Plugin Remove Year & Country loaded');
})();
