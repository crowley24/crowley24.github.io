
(function () {
    'use strict';

    var ID = 'crowley_modal_visual_106';

    if (document.getElementById(ID)) return;

    var panel = document.createElement('div');

    panel.id = ID;
    panel.style.cssText =
        'position:fixed;z-index:2147483647;top:5%;left:3%;width:94%;' +
        'max-height:90%;overflow:auto;background:#17191f;color:white;' +
        'padding:15px;border:2px solid #35c98b;box-sizing:border-box';

    var result = document.createElement('pre');
    result.style.cssText = 'white-space:pre-wrap;font-size:12px';

    var copy = document.createElement('button');
    copy.textContent = 'КОПІЮВАТИ ЗВІТ';

    var close = document.createElement('button');
    close.textContent = 'ЗАКРИТИ';

    function add(text) {
        result.textContent += text + '\n';
    }

    function inspect() {
        var modal = document.querySelector('.modal');

        add('MODAL EXISTS: ' + !!modal);

        if (modal) {
            var css = getComputedStyle(modal);
            var rect = modal.getBoundingClientRect();

            add('RECT: ' + JSON.stringify({
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            }));

            add('Z-INDEX: ' + css.zIndex);

            var x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
            var y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));

            var topElement = document.elementFromPoint(x, y);

            add('ELEMENT AT MODAL CENTER: ' +
                (topElement ? topElement.tagName + '.' + topElement.className : 'none'));

            add('BODY CHILDREN: ' + document.body.children.length);
        }
    }

    copy.style.cssText = close.style.cssText =
        'padding:12px;margin:6px;background:#287b5a;color:white;border:0;font-size:15px';

    copy.onclick = function () {
        var area = document.createElement('textarea');
        area.value = result.textContent;
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();

        var ok = false;

        try {
            ok = document.execCommand('copy');
        } catch (e) {}

        area.remove();
        copy.textContent = ok ? 'СКОПІЙОВАНО' : 'ПОМИЛКА';
    };

    close.onclick = function () {
        panel.remove();
    };

    panel.appendChild(document.createTextNode('MODAL VISUAL PROBE 1.0.6'));
    panel.appendChild(result);
    panel.appendChild(copy);
    panel.appendChild(close);

    document.body.appendChild(panel);

    try {
        var content = $('<div>').css({
            background: '#d60000',
            color: '#ffffff',
            padding: '40px',
            'font-size': '28px',
            'min-height': '250px',
            'text-align': 'center'
        }).text('ЯСКРАВЕ ТЕСТОВЕ ВІКНО LAMPA');

        Lampa.Modal.open({
            title: 'VISUAL TEST',
            html: content,
            size: 'large',
            overlay: true
        });

        add('Modal.open: OK');
    } catch (e) {
        add('ERROR: ' + (e.stack || e.message || e));
    }

    inspect();

})();
