(function () {
    'use strict';

    // 1. Polyfills для стабільнаї роботи на пристроях 2019 року
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(callback) {
            for (var i = 0; i < this.length; i++) callback(this[i], i, this);
        };
    }

    // 2. Робота з пам'яттю (збереження ваших назв)
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

    // 3. Логіка розгортання кнопок та перейменування
    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            // РОЗГОРТАННЯ: Шукаємо приховані кнопки онлайн-перегляду
            // Зазвичай вони знаходяться в додаткових контейнерах всередині кнопок
            container.find('.full-start__button').each(function() {
                var btn = $(this);
                
                // Якщо всередині кнопки є прихований список інших кнопок (онлайн-сервіси)
                var hiddenButtons = btn.find('.button--online, .modss--online, .showy--online');
                
                if (hiddenButtons.length) {
                    hiddenButtons.each(function() {
                        var hBtn = $(this).clone(true); // Копіюємо кнопку
                        hBtn.removeClass('hidden');     // Робимо видимою
                        targetContainer.append(hBtn);   // Додаємо в основний ряд
                    });
                    btn.remove(); // Видаляємо стару "батьківську" кнопку, щоб не дублювати
                }
            });

            // ПЕРЕЙМЕНУВАННЯ: Застосовуємо збережені назви
            targetContainer.find('.full-start__button').each(function() {
                var btn = $(this);
                var span = btn.find('span');
                var btnId = btn.attr('class').replace(/\s+/g, '_');
                var savedName = Storage.getName(btnId, span.text().trim());
                span.text(savedName);
            });

            // ДОДАВАННЯ РЕДАКТОРА
            if (targetContainer.find('.button--my-editor').length === 0) {
                var editBtn = $('<div class="full-start__button selector button--my-editor">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">' +
                    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
                    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' +
                    '<span>Редактор</span></div>');

                editBtn.on('hover:enter', function() {
                    openEditorMenu(targetContainer);
                });

                targetContainer.append(editBtn);
                Lampa.Controller.ready();
            }
        }
    });

    // 4. Меню вибору кнопок
    function openEditorMenu(container) {
        var list = [];
        container.find('.full-start__button').not('.button--my-editor').each(function() {
            var btn = $(this);
            list.push({
                title: btn.find('span').text().trim(),
                id: btn.attr('class').replace(/\s+/g, '_')
            });
        });

        Lampa.Select.show({
            title: 'Оберіть кнопку',
            items: list,
            onSelect: function(item) {
                Lampa.Input.edit({
                    title: 'Нова назва',
                    value: item.title,
                    free: true
                }, function(newVal) {
                    if (newVal) {
                        Storage.saveName(item.id, newVal);
                        Lampa.Noty.show('Збережено! Оновіть сторінку.');
                    }
                });
            },
            onBack: function() { Lampa.Controller.toggle('full_start'); }
        });
    }

})();
