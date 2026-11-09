
(function () {
    'use strict';

    /*
     * CHATURBATE MODAL HTML TEST 1.0.1
     * - Lampa.Modal diagnostics
     * - HTML + iframe test
     * - Copy diagnostic report
     * - Clipboard fallback
     */

    var ID = 'chaturbate_modal_html_test_101';

    if (window[ID]) return;
    window[ID] = true;

    var report = '';

    function source(fn) {
        if (typeof fn !== 'function') return String(fn);

        try {
            return Function.prototype.toString.call(fn);
        } catch (e) {
            return 'Unavailable: ' + e.message;
        }
    }

    function inspectModal() {
        var modal = Lampa.Modal;
        var output = [];

        output.push('CHATURBATE MODAL HTML TEST 1.0.1');
        output.push('================================');
        output.push('Lampa version: ' +
            (window.AndroidJS && AndroidJS.appVersion
                ? AndroidJS.appVersion()
                : 'Unknown'));

        output.push('\nLAMPA MODAL');
        output.push('Properties: ' +
            Object.getOwnPropertyNames(modal).join(', '));

        Object.getOwnPropertyNames(modal).forEach(function (key) {
            if (typeof modal[key] === 'function') {
                output.push('\n' + key + ':\n' + source(modal[key]));
            }
        });

        output.push('\nHTML SUPPORT');
        output.push('document.createElement: ' +
            typeof document.createElement);
        output.push('document.execCommand: ' +
            typeof document.execCommand);
        output.push('navigator.clipboard: ' +
            typeof navigator.clipboard);

        return output.join('\n');
    }

    function copyText(text, callback) {
        function fallback() {
            var area = document.createElement('textarea');

            area.value = text;
            area.style.cssText =
                'position:fixed;left:-9999px;top:0;opacity:0;';

            document.body.appendChild(area);
            area.focus();
            area.select();

            var success = false;

            try {
                success = document.execCommand('copy');
            } catch (e) {
                success = false;
            }

            area.remove();
            callback(success);
        }

        if (navigator.clipboard &&
            typeof navigator.clipboard.writeText === 'function') {

            navigator.clipboard.writeText(text)
                .then(function () {
                    callback(true);
                })
                .catch(fallback);

        } else {
            fallback();
        }
    }

    function showPanel() {
        var old = document.getElementById(ID + '_panel');
        if (old) old.remove();

        report = inspectModal();

        var panel = document.createElement('div');

        panel.id = ID + '_panel';

        panel.style.cssText =
            'position:fixed;z-index:999999;top:3%;left:3%;width:94%;' +
            'max-height:94%;overflow:auto;background:#151515;color:white;' +
            'padding:18px;box-sizing:border-box;border:1px solid #777;' +
            'border-radius:12px;font-family:Arial,sans-serif;';

        var title = document.createElement('h3');
        title.textContent = 'LAMPA MODAL HTML TEST';
        title.style.cssText = 'margin:0 0 12px 0;';
        panel.appendChild(title);

        var info = document.createElement('pre');
        info.textContent = report;
        info.style.cssText =
            'white-space:pre-wrap;word-break:break-word;' +
            'font-size:12px;line-height:1.5;margin:0;';
        panel.appendChild(info);

        var copy = document.createElement('button');
        copy.textContent = 'КОПІЮВАТИ ЗВІТ';
        copy.style.cssText =
            'width:100%;padding:16px;margin-top:15px;' +
            'font-size:16px;border-radius:8px;';

        copy.onclick = function () {
            copy.disabled = true;
            copy.textContent = 'КОПІЮВАННЯ...';

            copyText(report, function (success) {
                copy.disabled = false;
                copy.textContent = success
                    ? 'СКОПІЙОВАНО!'
                    : 'НЕ ВДАЛОСЯ СКОПІЮВАТИ';

                setTimeout(function () {
                    if (copy.parentNode) {
                        copy.textContent = 'КОПІЮВАТИ ЗВІТ';
                    }
                }, 2000);
            });
        };

        panel.appendChild(copy);

        var test = document.createElement('button');
        test.textContent = 'ТЕСТ HTML + IFRAME';
        test.style.cssText =
            'width:100%;padding:16px;margin-top:10px;' +
            'font-size:16px;border-radius:8px;';

        test.onclick = function () {
            panel.remove();
            showHtmlTest();
        };

        panel.appendChild(test);

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

        var label = document.createElement('span');
        label.textContent = 'HTML WEBVIEW TEST';

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ';
        close.style.cssText = 'padding:8px 12px;';

        header.appendChild(label);
        header.appendChild(close);

        var frame = document.createElement('iframe');

        frame.src = 'https://example.com/';
        frame.style.cssText =
            'width:100%;height:calc(100% - 48px);border:0;background:white;';

        frame.setAttribute('allow', 'fullscreen; autoplay');

        wrap.appendChild(header);
        wrap.appendChild(frame);
        document.body.appendChild(wrap);

        close.onclick = function () {
            frame.src = 'about:blank';
            wrap.remove();
            showPanel();
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
