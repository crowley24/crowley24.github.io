
(function () {
    'use strict';

    /*
     * CHATURBATE IFRAME DIAGNOSTIC 1.0.0
     * Перевірка внутрішнього компонента Lampa.Iframe
     */

    var PLUGIN_ID = 'chaturbate_iframe_diagnostic_100';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    function inspect() {
        var output = [];

        function add(title, value) {
            output.push(title + '\n' + String(value));
        }

        add('CHATURBATE IFRAME DIAGNOSTIC 1.0.0',
            '================================');

        add('Lampa version',
            window.AndroidJS && AndroidJS.appVersion
                ? AndroidJS.appVersion()
                : 'Unknown');

        add('Lampa.Iframe type',
            typeof Lampa.Iframe);

        if (typeof Lampa.Iframe === 'function') {
            add('Constructor source',
                Function.prototype.toString.call(Lampa.Iframe));

            add('Prototype methods',
                Object.getOwnPropertyNames(
                    Lampa.Iframe.prototype || {}
                ).join(', ') || 'None');

            add('Static properties',
                Object.getOwnPropertyNames(Lampa.Iframe)
                    .join(', ') || 'None');
        } else if (Lampa.Iframe) {
            add('Iframe properties',
                Object.keys(Lampa.Iframe).join(', '));
        }

        add('Lampa.Modal type',
            typeof Lampa.Modal);

        add('Document',
            document.readyState);

        add('Iframe support',
            typeof document.createElement('iframe').src);

        var result = output.join('\n\n');

        console.log(result);

        var panel = document.createElement('div');

        panel.id = PLUGIN_ID + '_panel';

        panel.style.cssText = [
            'position:fixed',
            'z-index:999999',
            'top:5%',
            'left:4%',
            'width:92%',
            'max-height:88%',
            'overflow:auto',
            'background:#111',
            'color:#eee',
            'border:2px solid #777',
            'border-radius:12px',
            'padding:18px',
            'box-sizing:border-box',
            'font:14px monospace',
            'white-space:pre-wrap',
            'word-break:break-word'
        ].join(';');

        var heading = document.createElement('div');
        heading.textContent = 'IFRAME DIAGNOSTIC';
        heading.style.cssText =
            'font-size:18px;font-weight:bold;margin-bottom:14px;color:#8fd3ff';

        var content = document.createElement('pre');
        content.textContent = result;
        content.style.cssText =
            'white-space:pre-wrap;word-break:break-word;margin:0;';

        var close = document.createElement('button');
        close.textContent = 'ЗАКРИТИ';
        close.style.cssText =
            'margin-top:16px;padding:12px 24px;font-size:16px;';

        close.onclick = function () {
            panel.remove();
        };

        panel.appendChild(heading);
        panel.appendChild(content);
        panel.appendChild(close);

        document.body.appendChild(panel);
    }

    function start() {
        inspect();
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
