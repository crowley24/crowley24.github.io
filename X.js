
(function () {
    'use strict';

    var ID = 'crowley_chaturbate_browser_test';

    if (window[ID]) return;
    window[ID] = true;

    function addButton() {
        if (!window.Lampa || !Lampa.Template) return;

        var html = `
            <div class="settings-param selector"
                 id="crowley_chaturbate_browser_test"
                 style="margin:15px;padding:18px;background:#20242b;border-radius:10px;">
                <div style="font-size:18px;font-weight:bold;">
                    CHaturbate Browser Test
                </div>
                <div style="font-size:13px;color:#aaa;margin-top:8px;">
                    Перевірка нативного Android WebView
                </div>
                <div style="margin-top:14px;color:#6bcf91;">
                    Відкрити тестову сторінку example.com
                </div>
            </div>
        `;

        var node = $(html);

        node.on('hover:enter', function () {
            if (
                Lampa.Android &&
                typeof Lampa.Android.openBrowser === 'function'
            ) {
                Lampa.Android.openBrowser('https://example.com/');
            } else {
                Lampa.Notice.show('Android openBrowser недоступний');
            }
        });

        Lampa.Settings.add({
            component: 'interface'
        });

        $('.settings-param').last().after(node);
    }

    if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') addButton();
        });
    }

    setTimeout(addButton, 3000);

})();
