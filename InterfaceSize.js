// ==Lampa==
// name: Interface Size Precise PRO Slider
// version: 4.2.0
// author: Crowley (optimized by ChatGPT)
// ==/Lampa==

(function () {
    'use strict';

    // =========================
    // Manifest
    // =========================
    let manifest = {
        type: 'interface',
        version: '4.2.0',
        name: 'Interface Size Precise PRO Slider',
        component: 'interface_size_precise_slider'
    };
    Lampa.Manifest.plugins = manifest;

    // =========================
    // STATE
    // =========================
    let patched = false;
    const sizes = [9, 9.5, 10, 10.5, 11, 11.5, 12];

    // =========================
    // Slider Param
    // =========================
    Lampa.Params.slider('interface_size', {
        min: Math.min(...sizes),
        max: Math.max(...sizes),
        step: 0.5,
        default: 12,
        format: v => v.toFixed(1)
    });

    // =========================
    // Core Logic
    // =========================
    const getSize = () => parseFloat(Lampa.Storage.field('interface_size')) || 12;
    const getCardCount = (fontSize) => Math.max(5, Math.round(14 - fontSize));

    const applyFontSize = () => {
        $('body').css({ fontSize: getSize() + 'px' });
    };

    const patchUI = () => {
        if (patched) return;
        patched = true;

        const line = Lampa.Maker.map('Line');
        const category = Lampa.Maker.map('Category');

        if (line?.Items?.onInit) {
            const originalLine = line.Items.onInit;
            line.Items.onInit = function () {
                originalLine.call(this);
                this.view = getCardCount(getSize());
            };
        }

        if (category?.Items?.onInit) {
            const originalCategory = category.Items.onInit;
            category.Items.onInit = function () {
                originalCategory.call(this);
                this.limit_view = getCardCount(getSize());
            };
        }
    };

    const updateSize = () => {
        applyFontSize();
        patchUI();

        // Live preview
        Lampa.Maker.map('Line')?.Items?.reload?.();
        Lampa.Maker.map('Category')?.Items?.reload?.();

        Lampa.Noty.show(`⚙️ Розмір інтерфейсу: ${getSize().toFixed(1)}`);
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
    // LISTENER
    // =========================
    Lampa.Storage.listener.follow('change', e => {
        if (e.name === 'interface_size') {
            updateSize();
        }
    });

})();
