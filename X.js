
(function () {
    'use strict';

    var VERSION = '1.0.0';

    function runProbe() {
        var report = [];

        function add(value) {
            report.push(String(value));
        }

        add('LAMPA TEMPLATE SELECTOR PROBE ' + VERSION);
        add('==============================');

        try {
            var templates = Lampa.Template.all();

            add('TEMPLATE COUNT: ' + Object.keys(templates).length);
            add('');

            Object.keys(templates).sort().forEach(function (name) {
                var html = String(templates[name] || '');

                if (
                    html.indexOf('selector') !== -1 ||
                    html.indexOf('data-action') !== -1 ||
                    html.indexOf('hover:') !== -1
                ) {
                    add('TEMPLATE: ' + name);
                    add('LENGTH: ' + html.length);

                    var matches = html.match(/<[^>]*(?:selector|data-action|hover:)[^>]*>/gi);

                    if (matches) {
                        matches.slice(0, 12).forEach(function (item) {
                            add('  ' + item);
                        });
                    }

                    add('HTML PREVIEW:');
                    add(html.substring(0, 1800));
                    add('--------------------------------');
                }
            });

            add('');
            add('JQUERY CHECK');

            var test = Lampa.Template.get('modal');

            add('Template.get("modal"): ' + (test && test.jquery ? 'jQuery object' : typeof test));
            add('find(".selector") available: ' + !!(test && test.find));
            add('selector count: ' + (test && test.find ? test.find('.selector').length : 'N/A'));

        } catch (e) {
            add('ERROR: ' + e.message);
        }

        return report.join('\n');
    }

    function openReport() {
        var report = runProbe();

        var html = $('<div class="about">').css({
            padding: '20px',
            color: '#fff',
            'font-size': '14px'
        });

        var output = $('<pre>').css({
            'white-space': 'pre-wrap',
            'overflow-wrap': 'break-word',
            'max-height': '65vh',
            'overflow-y': 'auto',
            'font-size': '11px',
            'line-height': '1.5',
            'user-select': 'text'
        }).text(report);

        var buttons = $('<div>').css({
            display: 'flex',
            gap: '10px',
            'margin-top': '15px'
        });

        var copy = $('<div class="selector button selector--focus">')
            .text('КОПІЮВАТИ ЗВІТ');

        var close = $('<div class="selector button">')
            .text('ЗАКРИТИ');

        copy.on('hover:enter click', function () {
            var copied = false;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(report).then(function () {
                    copy.text('СКОПІЙОВАНО');
                }).catch(function () {
                    fallbackCopy();
                });
            } else {
                fallbackCopy();
            }

            function fallbackCopy() {
                var textarea = document.createElement('textarea');
                textarea.value = report;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();

                try {
                    copied = document.execCommand('copy');
                } catch (e) {}

                document.body.removeChild(textarea);
                copy.text(copied ? 'СКОПІЙОВАНО' : 'НЕ ВДАЛОСЯ СКОПІЮВАТИ');
            }
        });

        close.on('hover:enter click', function () {
            Lampa.Modal.close();
        });

        buttons.append(copy, close);
        html.append(output, buttons);

        Lampa.Modal.open({
            title: 'TEMPLATE SELECTOR PROBE',
            html: html,
            size: 'large'
        });
    }

    if (window.Lampa && Lampa.Template && Lampa.Modal) {
        Lampa.Template.add(
            'crowley_template_selector_probe_button',
            '<div class="selector">TEMPLATE SELECTOR PROBE</div>'
        );

        Lampa.Template.get('crowley_template_selector_probe_button')
            .on('hover:enter', openReport);

        $('body').append(
            Lampa.Template.get('crowley_template_selector_probe_button')
        );
    }
})();
