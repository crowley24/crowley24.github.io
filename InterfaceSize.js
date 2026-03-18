// ==Lampa==
// name: Interface Size Precise PRO
// version: 4.1.0
// author: Crowley (optimized by ChatGPT)
// ==/Lampa==

(function () {
    'use strict';

    // =========================
    // Манифест
    // =========================
    let manifest = {
        type: 'interface',
        version: '4.1.0',
        name: 'Interface Size Precise PRO',
        component: 'interface_size_precise'
    };

    Lampa.Manifest.plugins = manifest;

    // =========================
    // SELECT з правильним порядком
    // =========================
    const sizes = ['9', '9.5', '10', '10.5', '11', '11.5', '12'];

    Lampa.Params.select('interface_size',
        sizes.map(s => ({ value: s, title: s })),
        '12'
    );

    // =========================
    // STATE
    // =========================
    let patched = false;

    // =========================
    // Логіка розміру
    // =========================
    const getSize = () => parseFloat(Lampa.Storage.field('interface_size')) || 12;

    const getCardCount = (fontSize) => Math.max(5, Math.round(14 - fontSize));

    const applyFontSize = () => {
        const fontSize = getSize();
        $('body').css({ fontSize: fontSize + 'px' });
    };

    // =========================
    // Патч UI (один раз)
    // =========================
    const patchUI = () => {
        if (patched) return;
        patched = true;

        const line = Lampa.Maker.map('Line');
        const category = Lampa.Maker.map('Category');

        if (line && line.Items && line.Items.onInit) {
            const originalLine = line.Items.onInit;
            line.Items.onInit = function () {
                originalLine.call(this);
                this.view = getCardCount(getSize());
            };
        }

        if (category && category.Items && category.Items.onInit) {
            const originalCategory = category.Items.onInit;
            category.Items.onInit = function () {
                originalCategory.call(this);
                this.limit_view = getCardCount(getSize());
            };
        }
    };

    // =========================
    // LIVE UPDATE
    // =========================
    const updateSize = () => {
        applyFontSize();
        patchUI();

        // Live preview (оновлюємо карти без перезапуску)
        Lampa.Maker.map('Line')?.Items?.reload?.();
        Lampa.Maker.map('Category')?.Items?.reload?.();

        Lampa.Noty.show('⚙️ Розмір інтерфейсу оновлено');
    };

    // =========================
    // INIT
    // =========================
    const init = () => {
        applyFontSize();
        patchUI();
    };

    init();

    // =========================
    // LISTENER для select
    // =========================
    Lampa.Storage.listener.follow('change', (e) => {
        if (e.name === 'interface_size') {
            updateSize();
        }
    });

})();
