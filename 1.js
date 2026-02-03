(function () {
    'use strict';

    function myInterfaceModifier() {
        // 1. Додаємо пункт у меню налаштувань
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') { // Додаємо в розділ "Інтерфейс"
                var field = $(`<div class="settings-param selector" data-name="hide_trending" data-type="switch">
                    <div class="settings-param__name">Приховати "В тренді"</div>
                    <div class="settings-param__value"></div>
                </div>`);

                e.body.find('.settings-param:last').before(field);

                // Оновлюємо стан перемикача з пам'яті
                field.find('.settings-param__value').text(Lampa.Storage.get('hide_trending') ? 'Так' : 'Ні');
            }
        });

        // 2. Логіка збереження вибору
        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'hide_trending') {
                Lampa.Noty.show('Налаштування збережено. Перезавантажте додаток.');
            }
        });

        // 3. Основна магія: фільтрація рядків
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                // Перехоплюємо побудову головної сторінки
                Lampa.Component.add('home', function(object){
                    // Тут можна додати логіку фільтрації масиву даних (data.items)
                    // перед тим, як Lampa почне їх малювати
                    if(Lampa.Storage.get('hide_trending')) {
                         console.log('Плагін: Рядок трендів буде видалено');
                         // Логіка видалення об'єкта з масиву
                    }
                });
            }
        });
    }

    // Запуск плагіна
    if (window.appready) myInterfaceModifier();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') myInterfaceModifier();
    });
})();

