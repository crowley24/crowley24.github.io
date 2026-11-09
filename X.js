
(function () {
    'use strict';

    /*
     * CHATURBATE MODAL HTML TEST 1.0.0
     */

    var ID = 'chaturbate_modal_html_test_100';

    if (window[ID]) return;
    window[ID] = true;

    function source(fn) {
        if (typeof fn !== 'function') return String(fn);

        try {
            return Function.prototype.toString.call(fn);
        } catch (e) {
            return 'Unavailable';
        }
    }

    function inspectModal() {
        var modal = Lampa.Modal;
        var output = [];

        output.push('LAMPA MODAL DIAGNOSTIC');
        output.push('=====================');
        output.push('Properties: ' +
            Object.getOwnPropertyNames(modal).join(', '));

        Object.getOwnPropertyNames(modal).forEach(function (key) {
            if (typeof modal[key] === 'function') {
                output.push('\n' + key + ':\n' + source(modal[key]));
            }
        });

        return output.join('\n');
    }

    function showPanel() {
        var old = document.getElementById(ID + '_panel');
        if (old) old.remove();

        var panel = document.createElement('div');

        panel.id = ID + '_panel';

        panel.style.cssText =
            'position:fixed;z-index:999999;top:5%;left:4%;width:92%;' +
            'max-height:90%;overflow:auto;background:#151515;color:white;' +
            'padding:18px;box-sizing:border-box;border:1px solid #777;' +
            'border-radius:12px;font-family:Arial,sans-serif;';

        var title = document.createElement('h3');
        title.textContent = 'LAMPA MODAL HTML TEST';
        panel.appendChild(title);

        var info = document.createElement('pre');
        info.textContent = inspectModal();
        info.style.cssText =
            'white-space:pre-wrap;word-break:break-word;font-size:12px;';
        panel.appendChild(info);

        var button = document.createElement('button');
        button.textContent = 'ТЕСТ HTML + IFRAME';
        button.style.cssText =
            'width:100%;padding:16px;margin-top:15px;font-size:16px;';

        button.onclick = function () {
            panel.remove();
            showHtmlTest();
        };

        panel.appendChild(button);

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ';
        close.style.cssText =
            'width:100%;padding:14px;margin-top:10px;font-size:16px;';

        close.onclick = function () {
            panel.remove();
        };

        panel.appendChild(close);
        document.body.appendChild(panel);
    }

    function showHtmlTest() {
        var wrap = document.createElement('div');

        wrap.id = ID + '_html';

        wrap.style.cssText =
            'position:fixed;z-index:999999;top:4%;left:3%;width:94%;' +
            'height:90%;background:#111;border:2px solid #888;' +
            'border-radius:12px;overflow:hidden;';

        var header = document.createElement('div');

        header.style.cssText =
            'height:48px;background:#222;color:white;' +
            'display:flex;align-items:center;justify-content:space-between;' +
            'padding:0 12px;font-size:15px;';

        header.innerHTML =
            '<span>HTML WEBVIEW TEST</span>' +
            '<button id="' + ID + '_close">ЗАКРИТИ</button>';

        var frame = document.createElement('iframe');

        frame.src = 'https://example.com/';
        frame.style.cssText =
            'width:100%;height:calc(100% - 48px);border:0;background:white;';

        frame.setAttribute('allow', 'fullscreen; autoplay');

        wrap.appendChild(header);
        wrap.appendChild(frame);
        document.body.appendChild(wrap);

        document.getElementById(ID + '_close').onclick = function () {
            frame.src = 'about:blank';
            wrap.remove();
        };
    }

    function start() {
        showPanel();
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
