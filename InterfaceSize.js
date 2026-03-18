// ==Lampa==
// name: Interface Size Precise PRO
// version: 4.1.1
// author: Crowley (optimized by ChatGPT)
// ==/Lampa==

(function () {
    'use strict';

    // =========================
    // Маніфест
    // =========================
    let manifest = {
        type: 'interface',
        version: '4.1.1',
        name: 'Interface Size Precise PRO',
        component: 'interface_size_precise'
    };

    Lampa.Manifest.plugins = manifest;

    // =========================
    // ПАРАМЕТРИ (SELECT)
    // =========================
    const sizes = ['9', '9.5', '10', '10.5', '11', '11.5', '12'];

    // Використовуємо системний ключ 'interface_size', але з правильними параметрами
    Lampa.Params.select('interface_size',
        sizes.map(s => ({
            title: s, // Відображення в списку
            value: s  // Значення в сховищі
        })),
        '12', // Значення за замовчуванням
        null, // Опис (можна залишити null)
        {
            translate: false // ВАЖЛИВО: вимикаємо спроби перекладу значень, щоб не було [object Object]
        }
    );

    // =========================
    // STATE
    // =========================
    let patched = false;

    // =========================
    // ЛОГІКА РОЗМІРУ
    // =========================
    const getSize = () => parseFloat(Lampa.Storage.field('interface_size')) || 12;

    // Розрахунок кількості карток залежно від розміру шрифту (щоб не було порожнечі)
    const getCardCount = (fontSize) => {
        if (fontSize <= 10) return 7;
        if (fontSize <= 11) return 6;
        return 5;
    };

    const applyFontSize = () => {
        const fontSize = getSize();
        $('body').css({ fontSize: fontSize + 'px' });
    };

    // =========================
    // ПАТЧ UI
    // =========================
    const patchUI = () => {
        if (patched) return;
        
        const line = Lampa.Maker.map('Line');
        const category = Lampa.Maker.map('Category');

        if (line && line.Items && line.Items.onInit) {
            const originalLine = line.Items.onInit;
            line.Items.onInit = function () {
                originalLine.call(this);
                this.view = getCardCount(getSize());
            };
            patched = true;
        }

        if (category && category.Items && category.Items.onInit) {
            const originalCategory = category.Items.onInit;
            category.Items.onInit = function () {
                originalCategory.call(this);
                this.limit_view = getCardCount(getSize());
            };
            patched = true;
        }
    };

    // =========================
    // LIVE UPDATE (БЕЗ ПЕРЕЗАВАНТАЖЕННЯ)
    // =========================
    const updateSize = () => {
        applyFontSize();
        
        // Оновлюємо поточні відкриті стрічки/категорії
        Lampa.Maker.map('Line')?.Items?.reload?.();
        Lampa.Maker.map('Category')?.Items?.reload?.();

        Lampa.Noty.show('⚙️ Розмір інтерфейсу: ' + getSize() + 'px');
    };

    // =========================
    // INIT
    // =========================
    const init = () => {
        // Чекаємо повної готовності Lampa
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                applyFontSize();
                patchUI();
            }
        });
    };

    // Слухаємо зміну параметра в налаштуваннях
    Lampa.Storage.listener.follow('change', (e) => {
        if (e.name === 'interface_size') {
            updateSize();
        }
    });

    init();

})();
