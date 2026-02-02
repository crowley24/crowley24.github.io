(function () {
    "use strict";

    let manifest = {
        type: 'interface',
        version: '3.12.0',
        name: 'Interface Size Precise Pro',
        component: 'interface_size_precise'
    };
    Lampa.Manifest.plugins = manifest;

    // Додаємо переклади
    if (window.Lampa && Lampa.Lang) {
        Lampa.Lang.add({
            settings_interface_text_size: 'Розмір тексту',
            settings_interface_text_size_descr: 'Розмір шрифту відносно елементів інтерфейсу'
        });
    }

    // Реєструємо параметри
    Lampa.Params.select('interface_size', {
        '09': '9', '09.5': '9.5', '10': '10', '10.5': '10.5', '11': '11', '11.5': '11.5', '12': '12'
    }, '12');

    Lampa.Params.select('interface_text_size', {
        '08': '8', '09': '9', '10': '10', '11': '11', '12': '12', '13': '13', '14': '14', '15': '15', '16': '16'
    }, '12');

    // Створюємо динамічний стиль у head, щоб не мучити DOM постійними перерахунками
    const styleId = 'lampa-precise-size-style';
    if (!$('#' + styleId).length) {
        $('head').append(`<style id="${styleId}"></style>`);
    }

    const getInterfaceSize = () => Lampa.Platform.screen('mobile') ? 10 : parseFloat(Lampa.Storage.field('interface_size')) || 12;
    const getTextSize = () => parseFloat(Lampa.Storage.field('interface_text_size')) || 12;

    const getCardCount = (size) => {
        if (size <= 9.5) return 8;
        if (size <= 11) return 7;
        return 6;
    };

    const updateSize = () => {
        const interfaceSize = getInterfaceSize();
        const textSize = getTextSize();
        const ratio = (textSize / interfaceSize).toFixed(2);
        const cardCount = getCardCount(interfaceSize);

        // Оновлюємо CSS через змінні
        $('#' + styleId).html(`
            body { font-size: ${interfaceSize}px !important; }
            .settings-param__name, .settings-param__value, .settings-param__descr, 
            .full-descr__text, .card__title, .card__genres, .filter__name, 
            .filter__value, .items-line__title { 
                font-size: ${ratio}em !important; 
            }
        `);

        // Хук для кількості карток
        Lampa.Maker.map('Line').Items.onInit = function () {
            this.view = cardCount;
        };

        Lampa.Maker.map('Category').Items.onInit = function () {
            this.limit_view = cardCount;
        };

        // Спроба оновити поточний екран, якщо ми в налаштуваннях
        if (Lampa.Activity.active()) {
            const component = Lampa.Activity.active().component;
            if (component === 'main' || component === 'category' || component === 'full') {
                // Можна додати Lampa.Activity.active().activity.render() для миттєвого оновлення
            }
        }
    };

    // Запуск
    updateSize();

    // Слідкуємо за змінами
    Lampa.Storage.listener.follow('change', e => {
        if (e.name === 'interface_size' || e.name === 'interface_text_size') {
            updateSize();
        }
    });
})();
