
(function () {
    'use strict';

    /*
     * CHATURBATE LAMPA BROWSER TEST 1.0.2
     * Native Lampa Modal + HTML iframe
     */

    var ID = 'chaturbate_lampa_browser_102';

    if (window[ID]) return;
    window[ID] = true;

    var currentUrl = 'https://example.com/';
    var modalOpened = false;

    function closeBrowser() {
        if (!modalOpened) return;

        try {
            Lampa.Modal.close();
        } catch (e) {
            console.log('[CB BROWSER] Close error:', e);
        }

        modalOpened = false;
    }

    function openBrowser(url) {
        currentUrl = url;

        var html = document.createElement('div');

        html.style.cssText =
            'width:100%;height:100%;display:flex;flex-direction:column;';

        var toolbar = document.createElement('div');

        toolbar.style.cssText =
            'display:flex;align-items:center;gap:8px;padding:10px;' +
            'background:#171717;flex-shrink:0;';

        function makeButton(label, callback) {
            var button = document.createElement('button');

            button.textContent = label;
            button.style.cssText =
                'padding:10px 14px;font-size:14px;border-radius:6px;';

            button.onclick = callback;

            return button;
        }

        var address = document.createElement('input');

        address.type = 'text';
        address.value = currentUrl;
        address.style.cssText =
            'flex:1;min-width:0;padding:11px;font-size:14px;' +
            'background:#292929;color:white;border:1px solid #555;';

        address.onkeydown = function (event) {
            if (event.key === 'Enter') {
                navigate(address.value);
            }
        };

        var frame = document.createElement('iframe');

        frame.src = currentUrl;

        frame.style.cssText =
            'width:100%;height:100%;border:0;background:white;flex:1;';

        frame.setAttribute('allow', 'fullscreen; autoplay');

        function navigate(value) {
            value = String(value || '').trim();

            if (!value) return;

            if (!/^https?:\/\//i.test(value)) {
                value = 'https://' + value;
            }

            try {
                var parsed = new URL(value);

                if (parsed.protocol !== 'https:' &&
                    parsed.protocol !== 'http:') {
                    return;
                }

                currentUrl = parsed.href;
                address.value = currentUrl;
                frame.src = currentUrl;

            } catch (e) {
                console.log('[CB BROWSER] Invalid URL:', e);
            }
        }

        toolbar.appendChild(
            makeButton('←', function () {
                try {
                    frame.contentWindow.history.back();
                } catch (e) {
                    console.log(e);
                }
            })
        );

        toolbar.appendChild(address);

        toolbar.appendChild(
            makeButton('↻', function () {
                frame.src = currentUrl;
            })
        );

        toolbar.appendChild(
            makeButton('×', closeBrowser)
        );

        html.appendChild(toolbar);
        html.appendChild(frame);

        Lampa.Modal.open({
            title: 'BROWSER TEST',
            html: html,
            size: 'full',
            overlay: true
        });

        modalOpened = true;

        console.log('[CB BROWSER] Opened:', currentUrl);
    }

    function start() {
        openBrowser('https://example.com/');
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
