
(function () {
    'use strict';

    var VERSION = '1.0.1';

    function start() {
        if (!window.Lampa || !Lampa.Template || !Lampa.Modal) {
            alert('Lampa API не знайдено');
            return;
        }

        var report = [];

        function log(value) {
            report.push(String(value));
        }

        try {
            var templates = Lampa.Template.all();

            log('LAMPA TEMPLATE SELECTOR PROBE ' + VERSION);
            log('==============================');
            log('Template count: ' + Object.keys(templates).length);
            log('');

            Object.keys(templates).sort().forEach(function (name) {
                var source = String(templates[name] || '');

                if (
                    source.indexOf('selector') !== -1 ||
                    source.indexOf('data-action') !== -1
                ) {
                    log('TEMPLATE: ' + name);
                    log('LENGTH: ' + source.length);

                    var matches = source.match(/<[^>]*(?:selector|data-action)[^>]*>/gi);

                    if (matches) {
                        matches.slice(0, 10).forEach(function (item) {
                            log(item);
                        });
                    }

                    log('HTML:');
                    log(source.substring(0, 1200));
                    log('------------------------------');
                }
            });

            var modal = Lampa.Template.get('modal');

            log('');
            log('MODAL TEMPLATE');
            log('Type: ' + typeof modal);
            log('jQuery: ' + !!modal.jquery);
            log('Length: ' + modal.length);
            log('modal content: ' + modal.find('.modal__content').length);
            log('modal body: ' + modal.find('.modal__body').length);

        } catch (error) {
            log('DIAGNOSTIC ERROR: ' + error.message);
        }

        var content = $('<div>').css({
            padding: '15px',
            color: '#fff'
        });

        var output = $('<pre>').css({
            'white-space': 'pre-wrap',
            'overflow-wrap': 'break-word',
            'font-size': '11px',
            'line-height': '1.5',
            'max-height': '60vh',
            'overflow-y': 'auto'
        }).text(report.join('\n'));

        var copy = $('<div class="selector button">КОПІЮВАТИ ЗВІТ</div>');
        var close = $('<div class="selector button">ЗАКРИТИ</div>');

        copy.css({
            padding: '12px',
            'margin-top': '12px'
        });

        close.css({
            padding: '12px',
            'margin-top': '8px'
        });

        function fallbackCopy() {
            var area = document.createElement('textarea');
            area.value = report.join('\n');
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();

            var success = false;

            try {
                success = document.execCommand('copy');
            } catch (e) {}

            document.body.removeChild(area);
            copy.text(success ? 'СКОПІЙОВАНО' : 'НЕ ВДАЛОСЯ СКОПІЮВАТИ');
        }

        copy.on('hover:enter click', function () {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(report.join('\n'))
                    .then(function () {
                        copy.text('СКОПІЙОВАНО');
                    })
                    .catch(fallbackCopy);
            } else {
                fallbackCopy();
            }
        });

        close.on('hover:enter click', function () {
            Lampa.Modal.close();
        });

        content.append(output, copy, close);

        Lampa.Modal.open({
            title: 'ДІАГНОСТИКА LAMPA',
            html: content,
            size: 'large'
        });
    }

    start();
})();
