// ==Lampa==
// name: Interface Size Precise PRO
// version: 4.0.0
// author: Crowley
// ==/Lampa==

(function () {
    'use strict';

    let manifest = {
        type: 'interface',
        version: '4.0.0',
        name: 'Interface Size Precise PRO',
        component: 'interface_size_precise'
    };

    Lampa.Manifest.plugins = manifest;

    // =========================
    // SELECT (правильний порядок)
    // =========================
    Lampa.Params.select('interface_size', {
    '9': '9',
    '9.5': '9.5',
    '10': '10',
    '10.5': '10.5',
    '11': '11',
    '11.5': '11.5',
    '12': '12'
}, '12');

    // =========================
    // STATE
    // =========================
    let patched = false;

    // =========================
    // LOGIC
    // =========================
    const getSize = () => {
        return parseFloat(Lampa.Storage.field('interface_size')) || 12;
    };

    const getCardCount = (fontSize) => {
        return Math.max(5, Math.round(14 - fontSize));
    };

    const applyFontSize = () => {
        const fontSize = getSize();
        $('body').css({ fontSize: fontSize + 'px' });
    };

    // =========================
    // PATCH UI (один раз)
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
    // UPDATE
    // =========================
    const updateSize = () => {
        applyFontSize();
        patchUI();

        Lampa.Noty.show('⚙️ Розмір інтерфейсу оновлено');
    };

    // =========================
    // INIT
    // =========================
    function init() {
        applyFontSize();
        patchUI();
    }

    init();

    // =========================
    // LISTENER
    // =========================
    Lampa.Storage.listener.follow('change', (e) => {
        if (e.name === 'interface_size') {
            updateSize();
        }
    });

})();
