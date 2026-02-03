(function () {
    "use strict";

    function init() {
        // 1. Додаємо переклад для нового пункту
        Lampa.Lang.add({
            settings_main_editor: {
                uk: 'Редактор головної',
                en: 'Home Editor'
            },
            settings_main_editor_descr: {
                uk: 'Налаштування відображення головної сторінки',
                en: 'Home screen display settings'
            },
            settings_editor_show_banner: {
                uk: 'Показувати банер',
                en: 'Show banner'
            }
        });

        // 2. Створюємо новий пункт у головному меню налаштувань
        Lampa.Settings.main({
            name: 'main_editor',
            type: 'open',
            icon: '<svg ...></svg>', // Можна додати SVG іконку
            name_lang: 'settings_main_editor',
            descr_lang: 'settings_main_editor_descr'
        });

        // 3. Слухаємо подію відкриття цього пункту
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'main_editor') {
                let items = [
                    {
                        title: Lampa.Lang.translate('settings_editor_show_banner'),
                        name: 'home_editor_banner',
                        type: 'select',
                        values: {
                            'show': 'Так',
                            'hide': 'Ні'
                        },
                        default: 'show'
                    }
                    // Тут можна додати інші параметри (сортування, кількість рядків тощо)
                ];

                // Викликаємо вікно з параметрами
                Lampa.Settings.create(items, {
                    title: Lampa.Lang.translate('settings_main_editor'),
                    onBack: () => {
                        Lampa.Settings.main(); // Повернення в головне меню налаштувань
                    }
                });
            }
        });
    }

    if (window.Lampa) {
        init();
    }
})();
