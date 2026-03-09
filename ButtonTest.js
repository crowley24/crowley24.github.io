(function () {
    'use strict';

    // 1. Функція для збереження та завантаження назв
    var Storage = {
        saveName: function(id, name) {
            var data = Lampa.Storage.get('custom_button_names', '{}');
            if (typeof data === 'string') data = JSON.parse(data);
            data[id] = name;
            Lampa.Storage.set('custom_button_names', JSON.stringify(data));
        },
        getName: function(id, defaultName) {
            var data = Lampa.Storage.get('custom_button_names', '{}');
            if (typeof data === 'string') data = JSON.parse(data);
            return data[id] || defaultName;
        }
    };

    // 2. Основний слухач подій Lampa
    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            
            // Оновлюємо назви існуючих кнопок з пам'яті
            targetContainer.find('.full-start__button').each(function() {
                var btn = $(this);
                var span = btn.find('span');
                var currentText = span.text().trim();
                
                // Створюємо унікальний ID для кожної кнопки на основі її класу
                var btnId = btn.attr('class').replace(/\s+/g, '_');
                var savedName = Storage.getName(btnId, currentText);
                
                if (savedName !== currentText) {
                    span.text(savedName);
                }
            });

            // Додаємо нашу кнопку-редактор, якщо її ще немає
            if (targetContainer.find('.button--my-editor').length === 0) {
                var myBtn = $('<div class="full-start__button selector button--my-editor">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">' +
                    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
                    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
                    '<span>Редактор кнопок</span></div>');

                myBtn.on('hover:enter', function() {
                    openEditorMenu(targetContainer);
                });

                targetContainer.append(myBtn);
                Lampa.Controller.ready();
            }
        }
    });

    // 3. Функція відкриття меню редагування
    function openEditorMenu(container) {
        var buttons = [];
        container.find('.full-start__button').each(function() {
            var btn = $(this);
            if (!btn.hasClass('button--my-editor')) {
                buttons.push({
                    id: btn.attr('class').replace(/\s+/g, '_'),
                    name: btn.find('span').text().trim()
                });
            }
        });

        // Створюємо список для вибору кнопки
        var list = buttons.map(function(b) {
            return {
                title: b.name,
                id: b.id
            };
        });

        Lampa.Select.show({
            title: 'Оберіть кнопку для зміни назви',
            items: list,
            onSelect: function(item) {
                // Викликаємо вікно введення тексту
                Lampa.Input.edit({
                    title: 'Нова назва для: ' + item.title,
                    value: item.title,
                    free: true
                }, function(newVal) {
                    if (newVal) {
                        Storage.saveName(item.id, newVal);
                        Lampa.Noty.show('Назву змінено! Перезавантажте картку.');
                    }
                });
            },
            onBack: function() {
                Lampa.Controller.toggle('full_start');
            }
        });
    }

})();
