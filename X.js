
(function () {
    'use strict';

    var ID = 'chaturbate_open_test';

    if (window[ID]) return;
    window[ID] = true;

    function addButton() {
        if (document.getElementById('cb_open_test')) return;

        var btn = document.createElement('button');

        btn.id = 'cb_open_test';
        btn.textContent = 'OPEN CHATURBATE';

        btn.style.cssText =
            'position:fixed;' +
            'z-index:999999;' +
            'right:20px;' +
            'bottom:100px;' +
            'padding:16px 22px;' +
            'background:#e65b83;' +
            'color:white;' +
            'border:0;' +
            'border-radius:9px;' +
            'font-size:16px;' +
            'font-weight:bold;';

        btn.onclick = function () {
            try {
                Lampa.Android.openBrowser('https://chaturbate.com/');
            } catch (e) {
                alert('Помилка: ' + e.message);
            }
        };

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButton);
    } else {
        addButton();
    }

    setTimeout(addButton, 2000);
})();
