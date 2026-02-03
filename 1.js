(function () {
    'use strict';

    function RowScanner() {
        var discoveredRows = new Set(); // Сюди запишемо унікальні назви

        // 1. Функція для відображення знайденого списку
        function showDiscoveredMenu() {
            var list = Array.from(discoveredRows).join('<br>');
            Lampa.Modal.open({
                title: 'Знайдені категорії',
                html: '<div style="padding: 20px; line-height: 1.5;">' + (list || 'Рядки ще не завантажились... зачекайте') + '</div>',
                size: 'medium'
            });
        }

        // 2. Додаємо кнопку сканування в налаштування
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') {
                var btn = $(`<div class="settings-param selector">
                    <div class="settings-param__name">Показати список категорій</div>
                    <div class="settings-param__value">Знайти</div>
                </div>`);

                btn.on('hover:enter', function () {
                    showDiscoveredMenu();
                });

                e.body.find('.settings-param:last').before(btn);
            }
        });

        // 3. ПЕРЕХОПЛЕННЯ ДАНИХ (ОСНОВНА ЧАСТИНА)
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'append') {
                if (e.data && e.data.length) {
                    e.data.forEach(function (row) {
                        if (row.title) {
                            discoveredRows.add(row.title);
                            console.log('Знайдено рядок:', row.title);
                        }
                    });
                }
            }
        });
        
        // Додатково перевіряємо компонент Home
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                Lampa.Noty.show('Сканер рядків активовано. Погортайте головну сторінку!');
            }
        });
    }

    if (window.appready) RowScanner();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') RowScanner();
    });
})();
