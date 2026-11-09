
(function () {
    'use strict';

    var ID = 'crowley_chaturbate_bridge_probe';

    if (window[ID]) return;
    window[ID] = true;

    function inspect(name, fn) {
        var result = [];

        result.push('\n========== ' + name + ' ==========');

        if (typeof fn !== 'function') {
            result.push('Не є функцією');
            return result.join('\n');
        }

        try {
            result.push(Function.prototype.toString.call(fn));
        } catch (e) {
            result.push('Не вдалося прочитати: ' + e.message);
        }

        return result.join('\n');
    }

    function inspectObject(name, obj) {
        var result = [];

        result.push('\n========== ' + name + ' ==========');

        if (!obj) {
            result.push('Об’єкт відсутній');
            return result.join('\n');
        }

        var current = obj;
        var depth = 0;
        var visited = {};

        while (current && depth < 3) {
            Object.getOwnPropertyNames(current).forEach(function (key) {
                if (visited[key]) return;
                visited[key] = true;

                try {
                    var descriptor =
                        Object.getOwnPropertyDescriptor(current, key);

                    if (!descriptor || typeof descriptor.value !== 'function') {
                        return;
                    }

                    result.push('\n--- ' + key + ' ---');

                    try {
                        result.push(
                            Function.prototype.toString.call(descriptor.value)
                        );
                    } catch (e) {
                        result.push('[source unavailable]');
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

    function run() {
        var report = [];

        report.push('CHaturbate Android Bridge Probe 1.0.0');

        report.push(
            inspectObject('Lampa.Android', window.Lampa && Lampa.Android)
        );

        report.push(
            inspectObject('AndroidJS', window.AndroidJS)
        );

        report.push(
            inspectObject('window.android', window.android)
        );

        report.push(
            inspect(
                'Lampa.Android.openBrowser',
                window.Lampa &&
                Lampa.Android &&
                Lampa.Android.openBrowser
            )
        );

        report.push(
            inspect(
                'AndroidJS.openBrowser',
                window.AndroidJS &&
                AndroidJS.openBrowser
            )
        );

        report.push(
            inspect(
                'android.openBrowser',
                window.android &&
                android.openBrowser
            )
        );

        var output = report.join('\n');

        console.log(output);

        var old = document.getElementById('crowley-bridge-probe');

        if (old) old.remove();

        var box = document.createElement('div');

        box.id = 'crowley-bridge-probe';

        box.style.cssText =
            'position:fixed;z-index:999999;inset:3%;' +
            'background:#111;color:white;padding:15px;' +
            'display:flex;flex-direction:column;border:1px solid #555;' +
            'border-radius:10px;';

        var title = document.createElement('div');

        title.textContent = 'Android Bridge Probe — результат';

        title.style.cssText =
            'font-size:18px;font-weight:bold;margin-bottom:10px;';

        var area = document.createElement('textarea');

        area.value = output;
        area.readOnly = true;

        area.style.cssText =
            'flex:1;width:100%;background:#050505;color:#bde5c8;' +
            'font:11px monospace;padding:10px;box-sizing:border-box;';

        var copy = document.createElement('button');

        copy.textContent = 'КОПІЮВАТИ';

        copy.style.cssText =
            'padding:14px;margin-top:10px;background:#344;color:white;';

        copy.onclick = function () {
            area.focus();
            area.select();

            try {
                document.execCommand('copy');
                copy.textContent = 'СКОПІЙОВАНО';
            } catch (e) {
                copy.textContent = 'ВИДІЛЕНО — СКОПІЮЙ';
            }
        };

        var close = document.createElement('button');

        close.textContent = 'ЗАКРИТИ';

        close.style.cssText =
            'padding:14px;margin-top:6px;background:#333;color:white;';

        close.onclick = function () {
            box.remove();
        };

        box.appendChild(title);
        box.appendChild(area);
        box.appendChild(copy);
        box.appendChild(close);

        document.body.appendChild(box);
    }

    setTimeout(run, 1500);

})();
