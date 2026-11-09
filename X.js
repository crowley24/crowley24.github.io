
(function () {
    'use strict';

    var ID = 'crowley_modal_diagnostic_104';

    if (document.getElementById(ID)) return;

    var report = [];

    function log(text) {
        report.push(String(text));
        console.log('[LAMPA DIAG]', text);
    }

    log('LAMPA MODAL DIAGNOSTIC 1.0.4');
    log('Lampa: ' + !!window.Lampa);
    log('Modal: ' + !!(window.Lampa && Lampa.Modal));
    log('Template: ' + !!(window.Lampa && Lampa.Template));

    var panel = document.createElement('div');

    panel.id = ID;
    panel.style.cssText =
        'position:fixed;z-index:2147483647;top:4%;left:3%;width:94%;' +
        'max-height:90%;overflow:auto;background:#17191f;color:white;' +
        'padding:20px;box-sizing:border-box;border:2px solid #35c98b;' +
        'border-radius:12px;font:14px Arial;';

    var heading = document.createElement('div');
    heading.textContent = 'LAMPA MODAL DIAGNOSTIC';
    heading.style.cssText = 'font-size:20px;font-weight:bold;color:#35c98b;margin-bottom:15px';

    var output = document.createElement('pre');
    output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5';
    output.textContent = report.join('\n');

    function refresh() {
        output.textContent = report.join('\n');
    }

    function button(label, callback) {
        var el = document.createElement('button');
        el.textContent = label;
        el.style.cssText = 'padding:13px;margin:6px 6px 6px 0;background:#287b5a;color:white;border:0;border-radius:6px;font-size:14px';
        el.onclick = callback;
        return el;
    }

    var test = button('ТЕСТ MODAL', function () {
        try {
            log('--- MODAL TEST ---');

            var tpl = Lampa.Template.get('modal', {
                title: 'DIAGNOSTIC TEST'
            });

            log('Template type: ' + typeof tpl);
            log('jQuery: ' + !!tpl.jquery);
            log('Length: ' + tpl.length);
            log('Body found: ' + tpl.find('.modal__body').length);

            var body = $('<div>').text('MODAL TEST CONTENT');

            Lampa.Modal.open({
                title: 'TEST',
                html: body,
                size: 'large'
            });

            log('Modal.open call returned successfully');
        } catch (e) {
            log('MODAL ERROR: ' + (e.stack || e.message || e));
        }

        refresh();
    });

    var copy = button('КОПІЮВАТИ ЗВІТ', function () {
        var area = document.createElement('textarea');
        area.value = report.join('\n');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();

        var ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (e) {}

        document.body.removeChild(area);
        copy.textContent = ok ? 'СКОПІЙОВАНО' : 'КОПІЮВАННЯ НЕ ВДАЛОСЯ';
    });

    var close = button('ЗАКРИТИ', function () {
        panel.remove();
    });

    panel.appendChild(heading);
    panel.appendChild(output);
    panel.appendChild(test);
    panel.appendChild(copy);
    panel.appendChild(close);

    document.body.appendChild(panel);

    log('Diagnostic panel created');
    refresh();

})();
