
(function () {
    'use strict';

    var ID = 'crowley_chaturbate_version_detector';

    if (window[ID]) return;
    window[ID] = true;

    function readValue(fn) {
        try {
            var value = fn();
            return String(value);
        } catch (e) {
            return 'ERROR: ' + e.message;
        }
    }

    function run() {
        var report = [];

        report.push('CHaturbate Version Detector 1.0.0');
        report.push('================================');

        report.push(
            'Lampa.Platform.version(): ' +
            readValue(function () {
                return Lampa.Platform.version();
            })
        );

        report.push(
            'Lampa.Platform.get(): ' +
            readValue(function () {
                return Lampa.Platform.get();
            })
        );

        report.push(
            'AndroidJS.appVersion(): ' +
            readValue(function () {
                return AndroidJS.appVersion();
            })
        );

        report.push(
            'AndroidJS.openBrowser type: ' +
            typeof AndroidJS.openBrowser
        );

        report.push(
            'Lampa.Android.openBrowser type: ' +
            typeof Lampa.Android.openBrowser
        );

        var output = report.join('\n');

        var panel = document.createElement('div');

        panel.style.cssText =
            'position:fixed;inset:10px;z-index:999999;' +
            'background:#15171b;color:white;padding:18px;' +
            'border:1px solid #555;border-radius:10px;';

        var area = document.createElement('textarea');

        area.value = output;
        area.readOnly = true;

        area.style.cssText =
            'width:100%;height:65%;background:#080808;' +
            'color:#9ee5ad;font:14px monospace;padding:12px;' +
            'box-sizing:border-box;';

        var close = document.createElement('button');

        close.textContent = 'ЗАКРИТИ';

        close.style.cssText =
            'width:100%;padding:15px;margin-top:15px;' +
            'background:#39414c;color:white;border:0;';

        close.onclick = function () {
            panel.remove();
        };

        panel.appendChild(area);
        panel.appendChild(close);

        document.body.appendChild(panel);
    }

    setTimeout(function () {
        try {
            run();
        } catch (e) {
            console.error('Version Detector:', e);
        }
    }, 2000);

})();
