(function () {
    'use strict';

    // Сховище для налаштувань (порядок, назви, видимість)
    var Storage = {
        set: function(key, value) { Lampa.Storage.set('custom_btns_' + key, JSON.stringify(value)); },
        get: function(key) { return JSON.parse(Lampa.Storage.get('custom_btns_' + key, '{}')); }
    };

    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            var allButtons = [];
            var settings = Storage.get('settings'); // Отримуємо збережений порядок

            // 1. ЗБІР ТА РОЗГОРТАННЯ (Extracting all nested buttons)
            container.find('.full-start__button').each(function() {
                var btn = $(this);
                if (btn.hasClass('button--play') || btn.hasClass('button--my-editor')) return;

                var children = btn.find('.full-start__button, [class*="--online"], [class*="--torrent"], [class*="--trailer"]');
                if (children.length) {
                    children.each(function() {
                        allButtons.push($(this).clone(true).removeClass('hidden'));
                    });
                } else {
                    allButtons.push(btn.clone(true).removeClass('hidden'));
                }
            });

            // 2. СОРТУВАННЯ (Online -> Torrent -> Trailer -> Others)
            allButtons.sort(function(a, b) {
                var getRank = function(el) {
                    var cls = el.attr('class').toLowerCase();
                    if (cls.indexOf('online') !== -1) return 1;
                    if (cls.indexOf('torrent') !== -1) return 2;
                    if (cls.indexOf('trailer') !== -1) return 3;
                    return 4;
                };
                return getRank(a) - getRank(b);
            });

            // 3. ВІДОБРАЖЕННЯ
            targetContainer.empty();
            allButtons.forEach(function(btn) {
                var id = btn.attr('class').replace(/\s+/g, '_');
                var span = btn.find('span');
                var customName = Storage.get('names')[id];
                
                if (customName) span.text(customName);
                targetContainer.append(btn);
            });

            // Кнопка налаштувань
            var editBtn = $('<div class="full-start__button selector button--my-editor"><span>⚙️ Налаштування</span></div>');
            editBtn.on('hover:enter', function() { openAdvancedMenu(allButtons); });
            targetContainer.append(editBtn);
            
            Lampa.Controller.ready();
        }
    });

    // 4. СКЛАДНЕ МЕНЮ (як на вашому фото)
    function openAdvancedMenu(buttons) {
        var items = buttons.map(function(btn) {
            var name = btn.find('span').text().trim();
            var id = btn.attr('class').replace(/\s+/g, '_');
            
            // Створюємо HTML елемент для списку з іконками керування
            return {
                title: name,
                id: id,
                template: 'is_row' // Сигнал для Lampa використовувати кастомний рядок
            };
        });

        Lampa.Select.show({
            title: 'Порядок та назви кнопок',
            items: items,
            onSelect: function(item) {
                // Тут ми викликаємо підменю: Змінити назву / Вгору / Вниз
                showActionMenu(item);
            },
            onBack: function() { Lampa.Controller.toggle('full_start'); }
        });
    }

    function showActionMenu(item) {
        Lampa.Select.show({
            title: item.title,
            items: [
                {title: '✏️ Змінити назву', action: 'rename'},
                {title: '⬆️ Перемістити вгору', action: 'up'},
                {title: '⬇️ Перемістити вниз', action: 'down'},
                {title: '👁️ Приховати/Показати', action: 'toggle'}
            ],
            onSelect: function(action) {
                if (action.action === 'rename') {
                    Lampa.Input.edit({title: 'Нова назва', value: item.title, free: true}, function(newVal) {
                        if (newVal) {
                            var names = Storage.get('names');
                            names[item.id] = newVal;
                            Storage.set('names', names);
                            Lampa.Noty.show('Змінено');
                        }
                    });
                }
                // Логіка Up/Down буде додана в наступному кроці для збереження масиву порядку
            }
        });
    }
})();
