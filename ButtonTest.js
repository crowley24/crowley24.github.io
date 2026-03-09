(function () {
    'use strict';

    // Поліфіли для сумісності зі старими ТБ (2019 рік)
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(callback) {
            for (var i = 0; i < this.length; i++) callback(this[i], i, this);
        };
    }

    // Сховище для ваших кастомних назв
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

    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            // 1. ЗБІР УСІХ КНОПОК
            var allButtons = [];
            
            // Шукаємо абсолютно всі кнопки в межах картки, крім системних
            container.find('.full-start__button').each(function() {
                var btn = $(this);
                // Пропускаємо кнопку "Грати" та наш майбутній редактор
                if (btn.hasClass('button--play') || btn.hasClass('button--my-editor')) return;
                
                // Перевіряємо, чи немає всередині цієї кнопки ще кнопок (розгортання)
                var children = btn.find('.full-start__button, [class*="--online"], [class*="--torrent"]');
                if (children.length) {
                    children.each(function() {
                        allButtons.push($(this).clone(true).removeClass('hidden'));
                    });
                } else {
                    allButtons.push(btn.clone(true).removeClass('hidden'));
                }
            });

            // 2. СОРТУВАННЯ (Групуємо для порядку)
            allButtons.sort(function(a, b) {
                var clsA = a.attr('class'), clsB = b.attr('class');
                if (clsA.indexOf('online') !== -1 && clsB.indexOf('online') === -1) return -1;
                if (clsA.indexOf('torrent') !== -1 && clsB.indexOf('online') === -1 && clsB.indexOf('torrent') === -1) return -1;
                return 0;
            });

            // 3. ОЧИЩЕННЯ ТА ВИВОД В РЯД
            targetContainer.empty(); // Видаляємо все старе
            
            allButtons.forEach(function(btn) {
                var span = btn.find('span');
                var btnId = btn.attr('class').replace(/\s+/g, '_');
                
                // Застосовуємо збережену назву
                var savedName = Storage.getName(btnId, span.text().trim());
                span.text(savedName);
                
                targetContainer.append(btn);
            });

            // 4. ДОДАВАННЯ КНОПКИ РЕДАКТОРА
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
    });

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
            title: 'Редагувати назву',
            items: list,
            onSelect: function(item) {
                Lampa.Input.edit({
                    title: 'Нова назва',
                    value: item.title,
                    free: true
                }, function(newVal) {
                    if (newVal) {
                        Storage.saveName(item.id, newVal);
                        Lampa.Noty.show('Назву змінено! Оновіть картку.');
                    }
                });
            },
            onBack: function() { Lampa.Controller.toggle('full_start'); }
        });
    }
})();
