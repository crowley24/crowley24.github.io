
(function () {
    'use strict';

    /*
     * CHaturbate WebView Detector 1.0.0
     * Crowley24
     *
     * Діагностика Android Bridge / WebView у Lampa.
     * Нічого не запускає і не змінює в системі.
     */

    var PLUGIN_ID = 'crowley_chaturbate_webview_detector';
    var REPORT_ID = 'crowley-webview-detector-report';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    function safeKeys(obj) {
        if (!obj) return [];

        try {
            return Object.getOwnPropertyNames(obj);
        } catch (e) {
            return [];
        }
    }

    function describeObject(name, obj) {
        var result = [];

        if (!obj) {
            return name + ': НЕ ЗНАЙДЕНО';
        }

        result.push(name + ': ЗНАЙДЕНО');

        var current = obj;
        var depth = 0;
        var found = {};

        while (current && depth < 3) {
            safeKeys(current).forEach(function (key) {
                if (found[key]) return;

                found[key] = true;

                try {
                    var descriptor =
                        Object.getOwnPropertyDescriptor(current, key);

                    if (!descriptor) return;

                    var value = descriptor.value;

                    if (typeof value === 'function') {
                        result.push('  ' + key + '()');
                    } else if (
                        value &&
                        typeof value === 'object'
                    ) {
                        result.push('  ' + key + ' [object]');
                    }
                } catch (e) {}
            });

            try {
                current = Object.getPrototypeOf(current);
            } catch (e) {
                break;
            }

            depth++;
        }

        return result.join('\n');
    }

    function collectReport() {
        var lines = [];

        lines.push('CHaturbate WebView Detector 1.0.0');
        lines.push('================================');
        lines.push('');

        lines.push('1. PLATFORM');
        lines.push('User Agent: ' + navigator.userAgent);
        lines.push('URL: ' + location.href);
        lines.push('');

        lines.push('2. LAMPA');

        var L = window.Lampa;

        lines.push('Lampa: ' + (!!L ? 'YES' : 'NO'));

        if (L) {
            [
                'Android',
                'Platform',
                'Player',
                'Modal',
                'Component',
                'Activity',
                'Settings',
                'Listener',
                'Storage',
                'Notice'
            ].forEach(function (key) {
                lines.push(
                    describeObject('Lampa.' + key, L[key])
                );
                lines.push('');
            });
        }

        lines.push('3. ANDROID BRIDGES');

        [
            'Android',
            'android',
            'AndroidBridge',
            'AndroidInterface',
            'NativeAndroid',
            'App',
            'Native',
            'WebView',
            'webkit',
            'JSBridge',
            'LampaAndroid'
        ].forEach(function (key) {
            var obj;

            try {
                obj = window[key];
            } catch (e) {}

            lines.push(describeObject('window.' + key, obj));
            lines.push('');
        });

        lines.push('4. MATCHING GLOBAL OBJECTS');

        safeKeys(window).forEach(function (key) {
            if (!/(android|webview|bridge|native|intent|browser)/i.test(key)) {
                return;
            }

            try {
                var value = window[key];

                lines.push(
                    key + ': ' +
                    (typeof value === 'function'
                        ? 'FUNCTION'
                        : typeof value)
                );

                if (value && typeof value === 'object') {
                    var methods = safeKeys(value).filter(function (k) {
                        try {
                            return typeof value[k] === 'function';
                        } catch (e) {
                            return false;
                        }
                    });

                    if (methods.length) {
                        lines.push('  Methods: ' + methods.join(', '));
                    }
                }
            } catch (e) {
                lines.push(key + ': inaccessible');
            }
        });

        lines.push('');
        lines.push('5. ENVIRONMENT');

        lines.push(
            'Touch support: ' +
            ('ontouchstart' in window)
        );

        lines.push(
            'Cordova: ' +
            (!!window.cordova)
        );

        lines.push(
            'Capacitor: ' +
            (!!window.Capacitor)
        );

        lines.push(
            'External protocol handler: ' +
            (!!window.navigator.registerProtocolHandler)
        );

        lines.push('');
        lines.push('END OF REPORT');

        return lines.join('\n');
    }

    function showReport(report) {
        var old = document.getElementById(REPORT_ID);

        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = REPORT_ID;

        overlay.style.cssText =
            'position:fixed;inset:0;z-index:999999;' +
            'background:rgba(0,0,0,.94);' +
            'display:flex;align-items:center;' +
            'justify-content:center;padding:3%;' +
            'box-sizing:border-box;color:white;';

        var panel = document.createElement('div');

        panel.style.cssText =
            'width:100%;max-width:900px;max-height:90%;' +
            'display:flex;flex-direction:column;' +
            'background:#17191e;border:1px solid #444;' +
            'border-radius:12px;padding:20px;' +
            'box-sizing:border-box;';

        var title = document.createElement('div');
        title.textContent = 'CHaturbate — WebView Detector';

        title.style.cssText =
            'font-size:20px;font-weight:bold;margin-bottom:12px;';

        var info = document.createElement('div');

        info.textContent =
            'Скопіюй звіт і надішли його сюди. ' +
            'Він покаже, чи доступний Android WebView у Lampa.';

        info.style.cssText =
            'font-size:14px;color:#aaa;margin-bottom:12px;';

        var output = document.createElement('textarea');

        output.value = report;
        output.readOnly = true;

        output.style.cssText =
            'width:100%;height:48vh;min-height:180px;' +
            'resize:none;background:#08090b;color:#bde5c8;' +
            'border:1px solid #444;border-radius:6px;' +
            'padding:12px;box-sizing:border-box;' +
            'font:12px monospace;outline:none;';

        var buttons = document.createElement('div');

        buttons.style.cssText =
            'display:flex;gap:10px;margin-top:12px;';

        function makeButton(label, callback) {
            var button = document.createElement('button');

            button.textContent = label;

            button.style.cssText =
                'flex:1;padding:13px;border:0;border-radius:6px;' +
                'background:#303640;color:white;font-size:15px;' +
                'font-weight:bold;';

            button.onclick = callback;

            return button;
        }

        var copyButton = makeButton('КОПІЮВАТИ ЗВІТ', function () {
            output.focus();
            output.select();

            try {
                var ok = document.execCommand('copy');

                copyButton.textContent =
                    ok ? 'СКОПІЙОВАНО' : 'ВИДІЛЕНО — СКОПІЮЙ';

            } catch (e) {
                copyButton.textContent = 'ВИДІЛЕНО — СКОПІЮЙ';
            }
        });

        var closeButton = makeButton('ЗАКРИТИ', function () {
            overlay.remove();
        });

        buttons.appendChild(copyButton);
        buttons.appendChild(closeButton);

        panel.appendChild(title);
        panel.appendChild(info);
        panel.appendChild(output);
        panel.appendChild(buttons);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        output.focus();
    }

    function run() {
        try {
            var report = collectReport();

            console.log(report);

            showReport(report);

            if (
                window.Lampa &&
                Lampa.Notice &&
                typeof Lampa.Notice.show === 'function'
            ) {
                Lampa.Notice.show(
                    'CHaturbate WebView Detector: звіт готовий'
                );
            }

        } catch (e) {
            console.error(
                'CHaturbate WebView Detector:',
                e
            );
        }
    }

    var attempts = 0;

    function waitForLampa() {
        attempts++;

        if (window.Lampa && document.body) {
            run();
            return;
        }

        if (attempts < 20) {
            setTimeout(waitForLampa, 1000);
        }
    }

    setTimeout(waitForLampa, 1500);

})();
