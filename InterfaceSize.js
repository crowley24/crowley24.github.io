// ==Lampa==
// name: Interface Size Precise PRO
// version: 4.1.2
// author: Crowley (optimized by ChatGPT)
// ==/Lampa==

(function () {
    'use strict';

    const KEY = 'interface_size_precise';
    const sizes = ['9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13'];

    // 1. Додаємо свій окремий пункт у налаштування "Інтерфейс"
    Lampa.Params.select(KEY,
        sizes.map(s => ({
            title: s,
            value: s
        })),
        '12',
        'Виберіть точний розмір шрифту',
        {
            translate: false
        }
    );

    // 2. Функція застосування стилів
    const applySize = () => {
        const size = Lampa.Storage.field(KEY) || '12';
        $('body').css('font-size', size + 'px');
        
        // Синхронізуємо з системним параметром, щоб Lampa не "скидала" його
        Lampa.Storage.set('interface_size', Math.round(parseFloat(size)));
    };

    // 3. Патч для карток (кількість об'єктів у рядку)
    const patchGrid = () => {
        const size = parseFloat(Lampa.Storage.field(KEY)) || 12;
        const count = size <= 10 ? 7 : (size <= 11 ? 6 : 5);

        const line = Lampa.Maker.map('Line');
        if (line && line.Items && line.Items.onInit) {
            const original = line.Items.onInit;
            line.Items.onInit = function() {
                original.call(this);
                this.view = count;
            };
        }
    };

    // 4. Слухаємо зміни
    Lampa.Storage.listener.follow('change', (e) => {
        if (e.name === KEY) {
            applySize();
            Lampa.Noty.show('Розмір змінено: ' + e.value + 'px');
            // Перезавантажуємо сторінку для застосування сітки (найнадійніший метод у Lampa)
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    });

    // 5. Запуск
    Lampa.Listener.follow('app', (e) => {
        if (e.type === 'ready') {
            applySize();
            patchGrid();
        }
    });

    // Про всяк випадок застосовуємо відразу
    applySize();

})();
