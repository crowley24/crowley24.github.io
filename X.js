
(function () {
    'use strict';

    var ID = 'crowley_chaturbate_browser_test_110';

    if (window[ID]) return;
    window[ID] = true;

    function showMessage(message) {
        if (window.Lampa && Lampa.Notice) {
            Lampa.Notice.show(message);
        } else {
            alert(message);
        }
    }

    function createButton() {
        if (!document.body) return;

        if (document.getElementById('cb-browser-test')) return;

        var panel = document.createElement('div');
        panel.id = 'cb-browser-test';

        panel.style.cssText =
            'position:fixed;bottom:25px;left:50%;' +
            'transform:translateX(-50%);z-index:999999;' +
            'width:90%;max-width:420px;padding:16px;' +
            'box-sizing:border-box;background:#171a20;' +
            'border:1px solid #555;border-radius:12px;' +
            'color:white;font-family:Arial,sans-serif;';

        var heading = document.createElement('div');
        heading.textContent = 'CHaturbate Browser Test 1.1.0';
        heading.style.cssText =
            'font-size:17px;font-weight:bold;margin-bottom:12px;';

        var button = document.createElement('button');
        button.textContent = 'ВІДКРИТИ TEST PAGE';

        button.style.cssText =
            'width:100%;padding:15px;border:0;border-radius:8px;' +
            'background:#347bba;color:white;font-size:15px;' +
            'font-weight:bold;';

        button.onclick = function () {
            var android = window.Lampa && Lampa.Android;

            if (!android ||
                typeof android.openBrowser !== 'function') {
                showMessage('Lampa.Android.openBrowser недоступний');
                return;
            }

            showMessage('Перевіряємо відкриття сторінки...');

            try {
                android.openBrowser('https://example.com/');
            } catch (e) {
                showMessage('Помилка: ' + e.message);
            }
        };

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ ТЕСТ';

        close.style.cssText =
            'width:100%;padding:12px;margin-top:8px;' +
            'border:0;border-radius:8px;background:#343840;' +
            'color:white;font-size:14px;';

        close.onclick = function () {
            panel.remove();
        };

        panel.appendChild(heading);
        panel.appendChild(button);
        panel.appendChild(close);

        document.body.appendChild(panel);
    }

    function start() {
        createButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    setTimeout(start, 2500);
    setTimeout(start, 5000);

})();
