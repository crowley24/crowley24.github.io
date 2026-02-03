(function () {
    'use strict';

    function myInterfaceModifier() {
        // --- 1. ДОДАЄМО ПУНКТ У НАЛАШТУВАННЯ ---
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') {
                var field = $(`<div class="settings-param selector" data-name="hide_trending" data-type="switch">
                    <div class="settings-param__name">Приховати "В тренді"</div>
                    <div class="settings-param__value"></div>
                </div>`);

                // Додаємо клік для перемикання
                field.on('hover:enter', function () {
                    var status = Lampa.Storage.get('hide_trending', 'false');
                    var new_status = !(status == 'true' || status == true);
                    Lampa.Storage.set('hide_trending', new_status);
                    field.find('.settings-param__value').text(new_status ? 'Так' : 'Ні');
                });

                e.body.find('.settings-param:last').before(field);
                field.find('.settings-param__value').text(Lampa.Storage.get('hide_trending') ? 'Так' : 'Ні');
            }
        });

        // --- 2. АНАЛІЗ РЯДКІВ ГОЛОВНОЇ СТОРІНКИ ---
        // Перехоплюємо подію додавання контенту
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'append') {
                // e.data - це масив об'єктів (рядків), які додаються
                if (e.data && e.data.length) {
                    console.log('Lampa Analyzer: Знайдено рядки на сторінці:');
                    
                    e.data.forEach(function (row, index) {
                        // Виводимо назву кожного рядка в консоль
                        console.log(`Рядок №${index + 1}: ${row.title}`);

                        // Логіка приховування, якщо назва збігається
                        if (Lampa.Storage.get('hide_trending') && row.title == 'В тренді') {
                            // Видаляємо елементи з цього рядка, щоб він став порожнім
                            row.items = [];
                        }
                    });
                }
            }
        });
    }

    if (window.appready) myInterfaceModifier();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') myInterfaceModifier();
    });
})();
