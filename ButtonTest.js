(function () {
    'use strict';

    // 1. Сховище налаштувань (Порядок, Назви, Видимість)
    var Storage = {
        set: function(key, value) { Lampa.Storage.set('custom_btns_' + key, JSON.stringify(value)); },
        get: function(key) { return JSON.parse(Lampa.Storage.get('custom_btns_' + key, '{}')); }
    };

    // Ініціалізація пам'яті, якщо вона порожня
    if (!Lampa.Storage.get('custom_btns_order')) Storage.set('order', []);
    if (!Lampa.Storage.get('custom_btns_names')) Storage.set('names', {});

    // 2. Головна логіка плагіна
    Lampa.Listener.follow('full', function(e) {
        if (e.type !== 'complite') return;

        var container = e.object.activity.render();
        var targetContainer = container.find('.full-start-new__buttons');

        if (targetContainer.length) {
            
            function buildInterface() {
                var allButtons = [];
                
                // Збираємо та розгортаємо всі кнопки (навіть приховані)
                container.find('.full-start__button').each(function() {
                    var btn = $(this);
                    if (btn.hasClass('button--play') || btn.hasClass('button--my-editor')) return;

                    var children = btn.find('.full-start__button, [class*="--online"], [class*="--torrent"], [class*="--trailer"]');
                    if (children.length) {
                        children.each(function() { allButtons.push($(this).clone(true).removeClass('hidden')); });
                    } else {
                        allButtons.push(btn.clone(true).removeClass('hidden'));
                    }
                });

                // Сортування за вашим правилом: Online -> Torrent -> Trailer -> Others
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

                targetContainer.empty();
                
                // Виводимо кнопки та застосовуємо кастомні назви
                allButtons.forEach(function(btn) {
                    var id = btn.attr('class').replace(/\s+/g, '_');
                    var span = btn.find('span');
                    var customName = Storage.get('names')[id];
                    if (customName) span.text(customName);
                    targetContainer.append(btn);
                });

                // Додаємо кнопку Налаштувань (⚙️)
                var editBtn = $('<div class="full-start__button selector button--my-editor"><span>⚙️ Налаштування</span></div>');
                editBtn.on('hover:enter', function() { openComplexMenu(allButtons); });
                targetContainer.append(editBtn);
                
                Lampa.Controller.ready();
            }

            buildInterface();

            // "Вартовий", щоб кнопка не зникала при оновленні сторінки системою
            var observer = new MutationObserver(function(mutations) {
                if (targetContainer.find('.button--my-editor').length === 0) buildInterface();
            });
            observer.observe(targetContainer[0], { childList: true });
        }
    });

    // 3. Функція для створення вікна як на ФОТО
    function openComplexMenu(buttons) {
        var items = buttons.map(function(btn) {
            var name = btn.find('span').text().trim();
            var id = btn.attr('class').replace(/\s+/g, '_');
            
            // Створюємо структуру: [Іконка] Назва [Редагувати] [Вгору] [Вниз]
            return {
                title: name,
                id: id,
                // Використовуємо HTML для схожості з вашим прикладом
                html: '<div class="custom-btn-row" style="display:flex; align-items:center; justify-content:space-between; width:100%">' +
                        '<span>' + name + '</span>' +
                        '<div style="display:flex; gap:15px">' +
                            '<span>✏️</span>' +
                            '<span>⬆️</span>' +
                            '<span>⬇️</span>' +
                        '</div>' +
                      '</div>'
            };
        });

        Lampa.Select.show({
            title: 'Порядок та назви кнопок',
            items: items,
            onSelect: function(item) {
                // При натисканні на рядок відкриваємо дії
                Lampa.Select.show({
                    title: 'Дія для: ' + item.title,
                    items: [
                        {title: '✏️ Змінити назву', action: 'rename'},
                        {title: '⬆️ Вгору (в розробці)', action: 'up'},
                        {title: '⬇️ Вниз (в розробці)', action: 'down'},
                        {title: '🔄 Скинути все', action: 'reset'}
                    ],
                    onSelect: function(a) {
                        if (a.action === 'rename') {
                            Lampa.Input.edit({title: 'Нова назва', value: item.title, free: true}, function(newVal) {
                                if (newVal) {
                                    var names = Storage.get('names');
                                    names[item.id] = newVal;
                                    Storage.set('names', names);
                                    Lampa.Noty.show('Збережено. Оновіть картку.');
                                }
                            });
                        } else if (a.action === 'reset') {
                            Lampa.Storage.set('custom_btns_names', '{}');
                            Lampa.Noty.show('Скинуто до стандартних');
                        }
                    },
                    onBack: function() { Lampa.Controller.toggle('select'); }
                });
            },
            onBack: function() { Lampa.Controller.toggle('full_start'); }
        });
    }

})();
