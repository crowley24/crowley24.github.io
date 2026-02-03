(function () {
    "use strict";

    const plugin_name = 'main_editor';

    function init() {
        // 1. Додаємо переклади
        Lampa.Lang.add({
            settings_main_editor: { uk: 'Редактор головної', ru: 'Редактор главной', en: 'Home Editor' },
            settings_main_editor_descr: { uk: 'Налаштування відображення головної сторінки', ru: 'Настройка отображения главной страницы', en: 'Home screen settings' }
        });

        // 2. Додаємо пункт у меню через подію рендеру
        Lampa.Settings.listener.follow('render', function (e) {
            if (e.name == 'main') { // Якщо рендериться головне меню налаштувань
                let item = $('<div class="settings-param selector" data-name="' + plugin_name + '">' +
                    '<div class="settings-param__name">' + Lampa.Lang.translate('settings_main_editor') + '</div>' +
                    '<div class="settings-param__descr">' + Lampa.Lang.translate('settings_main_editor_descr') + '</div>' +
                '</div>');

                // Додаємо івент кліку
                item.on('hover:enter', function () {
                    openEditor();
                });

                // Вставляємо в кінець списку (або перед іншим пунктом)
                e.body.find('.settings-list').append(item);
            }
        });
    }

    function openEditor() {
        let items = [
            {
                title: 'Показувати банер',
                name: 'home_editor_banner',
                type: 'select',
                values: {
                    'show': 'Так',
                    'hide': 'Ні'
                },
                default: 'show'
            },
            {
                title: 'Кількість рядків',
                name: 'home_editor_rows',
                type: 'select',
                values: {
                    '2': '2 рядки',
                    '5': '5 рядків',
                    '10': '10 рядків'
                },
                default: '5'
            }
        ];

        Lampa.Settings.create(items, {
            title: 'Редактор головної',
            onBack: () => {
                // Повертаємося до головного меню
                Lampa.Controller.toggle('settings_main'); 
            }
        });
    }

    // Чекаємо на завантаження Lampa
    if (window.Lampa) {
        init();
    }
})();
