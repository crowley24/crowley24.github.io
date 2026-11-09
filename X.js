
(function () {
    'use strict';

    /*
     * CHATURBATE IFRAME TEST 1.0.2
     * Native Lampa Iframe
     */

    var ID = 'chaturbate_iframe_test_102';

    if (window[ID]) return;
    window[ID] = true;

    var currentUrl = 'https://example.com/';

    function openPage(url) {
        if (!Lampa.Iframe ||
            typeof Lampa.Iframe.init !== 'function' ||
            typeof Lampa.Iframe.show !== 'function') {
            alert('Lampa.Iframe недоступний');
            return;
        }

        try {
            Lampa.Iframe.init();

            Lampa.Iframe.show({
                url: url,
                onBack: function () {
                    console.log('[CHATURBATE] Iframe closed');
                }
            });

            console.log('[CHATURBATE] Opened:', url);
        } catch (e) {
            console.error('[CHATURBATE] Iframe error:', e);
            alert('Помилка Iframe: ' + e.message);
        }
    }

    function closePage() {
        try {
            Lampa.Iframe.close();
        } catch (e) {
            console.error(e);
        }
    }

    function createPanel() {
        var old = document.getElementById(ID + '_panel');
        if (old) old.remove();

        var panel = document.createElement('div');

        panel.id = ID + '_panel';

        panel.style.cssText = [
            'position:fixed',
            'z-index:999998',
            'left:5%',
            'top:12%',
            'width:90%',
            'background:#151515',
            'color:#fff',
            'border:1px solid #555',
            'border-radius:14px',
            'padding:20px',
            'box-sizing:border-box',
            'font-family:Arial,sans-serif'
        ].join(';');

        var title = document.createElement('div');
        title.textContent = 'CHATURBATE — IFRAME TEST';
        title.style.cssText =
            'font-size:20px;font-weight:bold;margin-bottom:18px;';

        panel.appendChild(title);

        function addButton(label, url) {
            var button = document.createElement('button');

            button.textContent = label;
            button.style.cssText =
                'display:block;width:100%;padding:16px;margin:10px 0;' +
                'font-size:17px;border-radius:8px;';

            button.onclick = function () {
                panel.remove();
                openPage(url);
            };

            panel.appendChild(button);
        }

        addButton(
            '1. Відкрити example.com',
            'https://example.com/'
        );

        addButton(
            '2. Відкрити Chaturbate',
            'https://chaturbate.com/'
        );

        var closeButton = document.createElement('button');
        closeButton.textContent = 'ЗАКРИТИ';
        closeButton.style.cssText =
            'display:block;width:100%;padding:14px;margin-top:16px;' +
            'font-size:16px;';

        closeButton.onclick = function () {
            panel.remove();
        };

        panel.appendChild(closeButton);
        document.body.appendChild(panel);
    }

    function start() {
        createPanel();
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                setTimeout(start, 1500);
            }
        });
    } else {
        setTimeout(start, 3000);
    }

})();
