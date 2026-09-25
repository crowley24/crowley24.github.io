(function () {
    'use strict';

    if (window.plugin_hide_full_info_ready) return;
    window.plugin_hide_full_info_ready = true;

    var STYLE_ID = 'plugin_hide_full_info_style';

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
            /* Прибираємо рядок "рік, країна" над назвою фільму */
            .full-start__head .full-start__details,
            .full-start__head .full-start__info {
                display: none !important;
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        addStyle();

        setTimeout(addStyle, 500);
        setTimeout(addStyle, 1500);
        setTimeout(addStyle, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('full', function () {
            setTimeout(addStyle, 100);
            setTimeout(addStyle, 500);
        });
    }
})();
