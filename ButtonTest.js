(function () {
    'use strict';

    var Storage = {
        set: function(key, value) { Lampa.Storage.set('custom_btns_' + key, JSON.stringify(value)); },
        get: function(key) { return JSON.parse(Lampa.Storage.get('custom_btns_' + key, '{}')); }
    };

    // Функція створення нашої кнопки
    function injectEditButton(targetContainer, allButtons) {
        if (targetContainer.find('.button--my-editor').length > 0) return;

        var editBtn = $('<div class="full-start__button selector button--my-editor"><span>⚙️ Налаштування</span></div>');
        editBtn.on('hover:enter', function() { 
            // Тут викликаємо наше розширене меню, яке ми обговорювали
            Lampa.Noty.show('Відкриваємо меню...'); 
        });

        targetContainer.append(editBtn);
        Lampa.Controller.ready();
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            // Запускаємо логіку розгортання та додавання кнопки
            // (сюди ми вставимо весь попередній код збору кнопок)
            
            // Створюємо "вартового", який стежитиме за targetContainer
            var observer = new MutationObserver(function() {
                if (targetContainer.find('.button--my-editor').length === 0) {
                    injectEditButton(targetContainer, []); // Повертаємо кнопку, якщо вона зникла
                }
            });

            observer.observe(targetContainer[0], { childList: true });
            
            injectEditButton(targetContainer, []);
        }
    });
})();
