
(function () {
    'use strict';

    var ID = 'chaturbate_iframe_api_probe_101';

    if (window[ID]) return;
    window[ID] = true;

    var iframe = Lampa.Iframe;
    var methods = ['init', 'show', 'close', 'render'];
    var result = [];

    result.push('LAMPA IFRAME API PROBE 1.0.1');
    result.push('============================');

    methods.forEach(function (name) {
        var fn = iframe && iframe[name];

        result.push('\n' + name + ':');
        result.push('Type: ' + typeof fn);

        if (typeof fn === 'function') {
            try {
                result.push(
                    'Source:\n' +
                    Function.prototype.toString.call(fn)
                );
            } catch (e) {
                result.push('Source unavailable: ' + e.message);
            }
        }
    });

    result.push('\nObject keys: ' + Object.keys(iframe).join(', '));

    var output = result.join('\n');

    console.log(output);

    var panel = document.createElement('div');
    panel.style.cssText =
        'position:fixed;z-index:999999;top:4%;left:3%;width:94%;' +
        'max-height:90%;overflow:auto;background:#111;color:#eee;' +
        'padding:16px;border:2px solid #888;border-radius:10px;' +
        'box-sizing:border-box;font:13px monospace;white-space:pre-wrap;';

    var pre = document.createElement('pre');
    pre.textContent = output;
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;';

    var button = document.createElement('button');
    button.textContent = 'ЗАКРИТИ';
    button.style.cssText = 'padding:12px 24px;margin-top:12px;';

    button.onclick = function () {
        panel.remove();
    };

    panel.appendChild(pre);
    panel.appendChild(button);
    document.body.appendChild(panel);
})();
