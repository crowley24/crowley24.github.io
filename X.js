
(function () {
    'use strict';

    var ID = 'crowley_modal_state_105';

    if (document.getElementById(ID)) return;

    var report = [];

    function log(s) {
        report.push(String(s));
        console.log('[MODAL STATE]', s);
    }

    function inspect() {
        log('');
        log('===== MODAL STATE =====');

        try {
            log('Modal.opened(): ' + Lampa.Modal.opened());
        } catch (e) {
            log('opened error: ' + e.message);
        }

        var modals = document.querySelectorAll('.modal');

        log('DOM .modal count: ' + modals.length);

        Array.prototype.forEach.call(modals, function (el, i) {
            var css = window.getComputedStyle(el);
            var rect = el.getBoundingClientRect();

            log('MODAL #' + i);
            log('class: ' + el.className);
            log('display: ' + css.display);
            log('visibility: ' + css.visibility);
            log('opacity: ' + css.opacity);
            log('z-index: ' + css.zIndex);
            log('position: ' + css.position);
            log('size: ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
            log('parent: ' + (el.parentElement ? el.parentElement.tagName : 'none'));
        });

        log('Controller: ' + !!Lampa.Controller);

        if (Lampa.Controller) {
            log('Controller properties: ' + Object.keys(Lampa.Controller).join(', '));
        }
    }

    var panel = document.createElement('div');

    panel.id = ID;
    panel.style.cssText =
        'position:fixed;z-index:2147483647;top:3%;left:3%;width:94%;' +
        'max-height:92%;overflow:auto;background:#17191f;color:white;' +
        'padding:18px;box-sizing:border-box;border:2px solid #35c98b;' +
        'font:13px Arial;border-radius:10px';

    var heading = document.createElement('h3');
    heading.textContent = 'MODAL STATE PROBE 1.0.5';
    heading.style.color = '#35c98b';

    var output = document.createElement('pre');
    output.style.whiteSpace = 'pre-wrap';
    output.style.overflowWrap = 'anywhere';

    var test = document.createElement('button');
    test.textContent = 'ВІДКРИТИ MODAL І ПЕРЕВІРИТИ';
    test.onclick = function () {
        try {
            log('Opening modal...');

            var content = Lampa.Template.get('modal', {
                title: 'STATE TEST'
            });

            content.find('.modal__body').append(
                $('<div>').text('TEST CONTENT')
            );

            Lampa.Modal.open({
                title: 'STATE TEST',
                html: content.find('.modal__body').children(),
                size: 'large'
            });

            log('Modal.open returned');
        } catch (e) {
            log('ERROR: ' + (e.stack || e.message || e));
        }

        inspect();
        output.textContent = report.join('\n');
    };

    var copy = document.createElement('button');
    copy.textContent = 'КОПІЮВАТИ ЗВІТ';
    copy.onclick = function () {
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
        copy.textContent = ok ? 'СКОПІЙОВАНО' : 'ПОМИЛКА КОПІЮВАННЯ';
    };

    var close = document.createElement('button');
    close.textContent = 'ЗАКРИТИ';
    close.onclick = function () {
        panel.remove();
    };

    [test, copy, close].forEach(function (b) {
        b.style.cssText = 'padding:12px;margin:5px;background:#287b5a;color:white;border:0;border-radius:5px;font-size:14px';
    });

    panel.appendChild(heading);
    panel.appendChild(output);
    panel.appendChild(test);
    panel.appendChild(copy);
    panel.appendChild(close);

    document.body.appendChild(panel);

    log('Initial state');
    inspect();
    output.textContent = report.join('\n');

})();
