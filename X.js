
(function () {
    'use strict';

    var ID = 'chaturbate_webview_detector_100';

    if (window[ID]) return;
    window[ID] = true;

    function inspectObject(obj) {
        if (!obj) return ['Об’єкт недоступний'];

        try {
            return Object.getOwnPropertyNames(obj).sort();
        } catch (e) {
            return ['Помилка читання: ' + e.message];
        }
    }

    function run() {
        var report = [];

        report.push('CHATURBATE WEBVIEW DETECTOR 1.0.0');
        report.push('================================');
        report.push('');

        report.push('Lampa version: ' +
            (typeof AndroidJS !== 'undefined' &&
             typeof AndroidJS.appVersion === 'function'
                ? AndroidJS.appVersion()
                : 'невідомо'));

        report.push('');
        report.push('1. Lampa.Android methods:');

        var androidMethods = inspectObject(
            window.Lampa && Lampa.Android
        );

        report.push(androidMethods.join(', '));

        report.push('');
        report.push('2. AndroidJS methods:');

        var nativeMethods = inspectObject(window.AndroidJS);

        report.push(nativeMethods.join(', '));

        report.push('');
        report.push('3. WebView-related methods:');

        var all = androidMethods.concat(nativeMethods);
        var matches = all.filter(function (name) {
            return /webview|web_view|browser|url|html|page|window/i.test(name);
        });

        report.push(matches.length ? matches.join(', ') : 'Не знайдено');

        report.push('');
        report.push('4. Global objects:');

        var globals = Object.getOwnPropertyNames(window).filter(function (name) {
            return /webview|browser|android|web_view/i.test(name);
        });

        report.push(globals.length ? globals.join(', ') : 'Не знайдено');

        report.push('');
        report.push('5. Lampa components:');

        var components = inspectObject(window.Lampa);

        report.push(
            components.filter(function (name) {
                return /browser|web|iframe|player|modal/i.test(name);
            }).join(', ') || 'Не знайдено'
        );

        return report.join('\n');
    }

    function show() {
        var old = document.getElementById('cb_webview_detector');
        if (old) old.remove();

        var box = document.createElement('div');

        box.id = 'cb_webview_detector';

        box.style.cssText =
            'position:fixed;z-index:999999;top:5%;left:5%;' +
            'width:90%;max-width:700px;max-height:85%;' +
            'overflow:auto;background:#171717;color:white;' +
            'padding:18px;box-sizing:border-box;border-radius:12px;';

        var title = document.createElement('div');
        title.textContent = 'CHaturbate WebView Detector';
        title.style.cssText =
            'font-size:20px;font-weight:bold;margin-bottom:12px;';

        var output = document.createElement('textarea');
        output.readOnly = true;
        output.value = run();

        output.style.cssText =
            'width:100%;height:350px;box-sizing:border-box;' +
            'background:#080808;color:#ddd;border:1px solid #444;' +
            'padding:12px;font-size:13px;';

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ';
        close.style.cssText =
            'width:100%;padding:13px;margin-top:12px;' +
            'background:#555;color:white;border:0;border-radius:7px;';

        close.onclick = function () {
            box.remove();
        };

        box.appendChild(title);
        box.appendChild(output);
        box.appendChild(close);

        document.body.appendChild(box);

        output.focus();
        output.select();
    }

    var button = document.createElement('button');

    button.textContent = 'WEBVIEW TEST';
    button.style.cssText =
        'position:fixed;z-index:999998;right:20px;bottom:100px;' +
        'padding:15px 20px;background:#315b9b;color:white;' +
        'border:0;border-radius:8px;font-weight:bold;';

    button.onclick = show;

    function init() {
        if (!document.getElementById('cb_webview_detector_button')) {
            button.id = 'cb_webview_detector_button';
            document.body.appendChild(button);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    setTimeout(init, 2000);
})();
