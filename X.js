
(function () {
    'use strict';

    var VERSION = '1.0.2';
    var ID = 'crowley_plugin_boot_test';

    // Не створювати панель повторно
    if (document.getElementById(ID)) return;

    function showPanel() {
        if (document.getElementById(ID)) return;

        var panel = document.createElement('div');
        panel.id = ID;

        panel.style.cssText = [
            'position:fixed',
            'z-index:2147483647',
            'top:10%',
            'left:5%',
            'width:90%',
            'padding:22px',
            'box-sizing:border-box',
            'background:#17191f',
            'color:#ffffff',
            'border:2px solid #35c98b',
            'border-radius:12px',
            'font-size:18px',
            'font-family:Arial,sans-serif',
            'line-height:1.6'
        ].join(';');

        var title = document.createElement('div');
        title.textContent = 'PLUGIN BOOT TEST ' + VERSION;
        title.style.cssText = 'font-size:22px;font-weight:bold;margin-bottom:15px;color:#35c98b';

        var status = document.createElement('div');
        status.textContent = 'JavaScript плагіна успішно виконується.';
        
        var api = document.createElement('div');
        api.style.marginTop = '10px';
        api.textContent = 'Lampa API: ' + (window.Lampa ? 'ЗНАЙДЕНО' : 'НЕ ЗНАЙДЕНО');

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ';
        close.style.cssText = 'margin-top:20px;padding:12px 25px;font-size:17px;color:white;background:#287b5a;border:0;border-radius:7px';

        close.onclick = function () {
            panel.remove();
        };

        panel.appendChild(title);
        panel.appendChild(status);
        panel.appendChild(api);
        panel.appendChild(close);

        document.body.appendChild(panel);
    }

    // Якщо DOM вже готовий
    if (document.body) {
        showPanel();
    } else {
        document.addEventListener('DOMContentLoaded', showPanel, { once: true });
    }

    // Резервна перевірка, якщо DOM ще не створений
    var attempts = 0;
    var timer = setInterval(function () {
        attempts++;

        if (document.body) {
            clearInterval(timer);
            showPanel();
        }

        if (attempts >= 40) {
            clearInterval(timer);
        }
    }, 500);

})();
