
(function () {
    'use strict';

    var ID = 'lampa_template_probe_100';

    if (window[ID]) return;
    window[ID] = true;

    var out = [];

    function inspect(name, obj) {
        out.push('\n' + name);

        if (!obj) {
            out.push('Not available');
            return;
        }

        out.push('Type: ' + typeof obj);
        out.push('Properties: ' +
            Object.getOwnPropertyNames(obj).join(', '));

        Object.getOwnPropertyNames(obj).forEach(function (key) {
            if (typeof obj[key] === 'function') {
                try {
                    out.push('\n' + key + ':\n' +
                        Function.prototype.toString.call(obj[key]));
                } catch (e) {}
            }
        });
    }

    out.push('LAMPA TEMPLATE PROBE 1.0.0');
    out.push('==========================');

    inspect('Lampa.Template', Lampa.Template);

    inspect('Lampa.Modal', Lampa.Modal);

    out.push('\nHTML TEMPLATE TEST');

    try {
        var template = Lampa.Template.get('modal', {
            title: 'TEST'
        });

        out.push('Template result type: ' + typeof template);
        out.push('Template result: ' +
            (template && template.length !== undefined
                ? 'length=' + template.length
                : 'No length property'));

        out.push('Template first element: ' +
            (template && template[0]
                ? template[0].tagName
                : 'Not found'));

    } catch (e) {
        out.push('Template error: ' + e.message);
    }

    var report = out.join('\n');

    console.log(report);

    var panel = document.createElement('div');

    panel.style.cssText =
        'position:fixed;z-index:999999;top:3%;left:3%;width:94%;' +
        'max-height:94%;overflow:auto;background:#111;color:#eee;' +
        'padding:16px;border:2px solid #777;border-radius:12px;' +
        'box-sizing:border-box;font:12px monospace;';

    var pre = document.createElement('pre');
    pre.textContent = report;
    pre.style.cssText =
        'white-space:pre-wrap;word-break:break-word;';

    var copy = document.createElement('button');
    copy.textContent = 'КОПІЮВАТИ ЗВІТ';
    copy.style.cssText = 'padding:14px;width:100%;font-size:16px;';

    copy.onclick = function () {
        var area = document.createElement('textarea');
        area.value = report;
        area.style.cssText =
            'position:fixed;left:-9999px;top:0;';

        document.body.appendChild(area);
        area.select();

        var success = false;

        try {
            success = document.execCommand('copy');
        } catch (e) {}

        area.remove();

        copy.textContent = success
            ? 'СКОПІЙОВАНО!'
            : 'КОПІЮВАННЯ НЕ ВДАЛОСЯ';
    };

    var close = document.createElement('button');
    close.textContent = 'ЗАКРИТИ';
    close.style.cssText =
        'padding:14px;width:100%;margin-top:10px;font-size:16px;';

    close.onclick = function () {
        panel.remove();
    };

    panel.appendChild(pre);
    panel.appendChild(copy);
    panel.appendChild(close);

    document.body.appendChild(panel);

})();
