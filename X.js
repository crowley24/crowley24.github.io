
(function () {
    'use strict';

    var ID = 'android_webview_detector_100';

    if (window[ID]) return;
    window[ID] = true;

    function safeSource(fn) {
        if (typeof fn !== 'function') return 'Not a function';

        try {
            return Function.prototype.toString.call(fn);
        } catch (e) {
            return 'Unavailable: ' + e.message;
        }
    }

    function keys(obj) {
        try {
            return obj ? Object.getOwnPropertyNames(obj).join(', ') : 'Not found';
        } catch (e) {
            return 'Access denied';
        }
    }

    var out = [];

    out.push('ANDROID WEBVIEW DETECTOR 1.0.0');
    out.push('================================');

    out.push('\n1. ANDROID CLIENT');
    out.push('Version: ' +
        (window.AndroidJS && AndroidJS.appVersion
            ? AndroidJS.appVersion()
            : 'Unknown'));

    out.push('\n2. AndroidJS METHODS');
    out.push(keys(window.AndroidJS));

    out.push('\n3. Lampa.Android METHODS');
    out.push(keys(window.Lampa && Lampa.Android));

    out.push('\n4. window.android');
    out.push(keys(window.android));

    out.push('\n5. AndroidJS.openBrowser SOURCE');
    out.push(safeSource(
        window.AndroidJS && AndroidJS.openBrowser
    ));

    out.push('\n6. Lampa.Android.openBrowser SOURCE');
    out.push(safeSource(
        window.Lampa && Lampa.Android && Lampa.Android.openBrowser
    ));

    out.push('\n7. GLOBAL BROWSER OBJECTS');

    var found = [];

    try {
        Object.getOwnPropertyNames(window).forEach(function (name) {
            if (/webview|browser|chrome|android|webkit/i.test(name)) {
                found.push(name);
            }
        });
    } catch (e) {
        found.push('Global scan unavailable: ' + e.message);
    }

    out.push(found.join(', '));

    out.push('\n8. LAMPA COMPONENTS');

    var components = [];

    try {
        Object.getOwnPropertyNames(Lampa).forEach(function (name) {
            if (/web|browser|iframe|modal|player|window/i.test(name)) {
                components.push(name + ' (' + typeof Lampa[name] + ')');
            }
        });
    } catch (e) {
        components.push('Scan unavailable: ' + e.message);
    }

    out.push(components.join('\n'));

    out.push('\n9. WEBVIEW RELATED GLOBALS');

    [
        'WebView',
        'AndroidWebView',
        'WebViewClient',
        'WebChromeClient',
        'webkit',
        'chrome',
        'browser',
        'Android'
    ].forEach(function (name) {
        out.push(name + ': ' + typeof window[name]);
    });

    var result = out.join('\n');

    console.log(result);

    var panel = document.createElement('div');

    panel.style.cssText =
        'position:fixed;z-index:999999;top:3%;left:3%;width:94%;' +
        'max-height:92%;overflow:auto;background:#111;color:#eee;' +
        'padding:16px;border:2px solid #777;border-radius:12px;' +
        'box-sizing:border-box;font:12px monospace;white-space:pre-wrap;';

    var heading = document.createElement('div');
    heading.textContent = 'ANDROID WEBVIEW DIAGNOSTIC';
    heading.style.cssText =
        'font-size:17px;font-weight:bold;color:#8fd3ff;margin-bottom:12px;';

    var pre = document.createElement('pre');
    pre.textContent = result;
    pre.style.cssText =
        'white-space:pre-wrap;word-break:break-word;';

    var button = document.createElement('button');
    button.textContent = 'ЗАКРИТИ';
    button.style.cssText =
        'padding:12px 25px;margin-top:12px;font-size:16px;';

    button.onclick = function () {
        panel.remove();
    };

    panel.appendChild(heading);
    panel.appendChild(pre);
    panel.appendChild(button);

    document.body.appendChild(panel);

})();
