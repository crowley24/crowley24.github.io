
(function () {
    'use strict';

    [
        'crowley_modal_visual_106',
        'crowley_modal_state_105',
        'crowley_modal_diagnostic_104',
        'crowley_plugin_boot_test'
    ].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });

    try {
        var content = $('<div>').css({
            background: '#c90000',
            color: '#ffffff',
            padding: '45px 20px',
            'font-size': '26px',
            'text-align': 'center',
            'min-height': '250px'
        }).text('LAMPA MODAL ПРАЦЮЄ!');

        Lampa.Modal.open({
            title: 'CROWLEY TEST',
            html: content,
            size: 'large',
            overlay: true
        });

        console.log('[CROWLEY] Modal opened');

    } catch (e) {
        console.error('[CROWLEY]', e);
    }
})();
