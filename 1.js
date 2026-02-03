(function () {
    'use strict';

    function RowScanner() {
        // Використовуємо window для збереження даних між відкриттями меню
        window.discoveredLampaRows = window.discoveredLampaRows || new Set();

        // 1. Функція показу результатів (виправлена)
        function showDiscoveredMenu() {
            var rowsArray = Array.from(window.discoveredLampaRows);
            var content = rowsArray.length > 0 
                ? rowsArray.map(function(name) { return '• ' + name; }).join('<br>') 
                : 'Список порожній. Погортайте головну сторінку, щоб дані завантажились!';

            Lampa.Modal.open({
                title: 'Знайдені категорії',
                html: $('<div style="padding: 20px; font-size: 1.2em; line-height: 1.6;">' + content + '</div>'),
                onBack: function() {
                    Lampa.Modal.close();
                }
            });
        }

        // 2. Додавання кнопки в налаштування
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') {
                var btn = $(`<div class="settings-param selector">
                    <div class="settings-param__name">Сканер головної сторінки</div>
                    <div class="settings-param__value">Показати категорії</div>
                </div>`);

                btn.on('hover:enter', function () {
                    showDiscoveredMenu();
                });

                e.body.find('.settings-param:last').after(btn);
            }
        });

        // 3. Перехоплення назв рядків
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'append' && e.data) {
                e.data.forEach(function (row) {
                    if (row.title && row.title.trim() !== '') {
                        window.discoveredLampaRows.add(row.title);
                    }
                });
            }
        });

        // Сповіщення про запуск
        Lampa.Noty.show('Сканер активовано. Погортайте головну!');
    }

    // Очікування готовності системи
    if (window.appready) RowScanner();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') RowScanner();
    });
})();
