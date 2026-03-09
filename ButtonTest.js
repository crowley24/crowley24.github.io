(function () {
    'use strict';

    // 1. Використовуємо ту саму перевірку на завантаження, що і в робочому плагіні
    Lampa.Listener.follow('full', function(e) {
        // У вашому коді використовується 'complite' — це важливо для сумісності
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        // Якщо контейнер знайдено, додаємо нашу кнопку
        if (targetContainer.length) {
            
            // Перевіряємо, чи ми вже не додали кнопку раніше
            if (targetContainer.find('.button--my-editor').length === 0) {
                
                var myBtn = $('<div class="full-start__button selector button--my-editor">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">' +
                    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
                    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
                    '<span>Мій Редактор</span></div>');

                myBtn.on('hover:enter', function() {
                    Lampa.Noty.show('Вітаю! Тепер ми точно знаємо, як додати кнопку.');
                });

                targetContainer.append(myBtn);
                
                // Оновлюємо пульт, як у вашому прикладі
                if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {
                    Lampa.Controller.ready();
                }
            }
        }
    });
})();
