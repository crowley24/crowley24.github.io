
(function () {
    'use strict';

    var VERSION = '1.0.3';

    function start() {
        if (!window.Lampa || !Lampa.Template || !Lampa.Modal) {
            alert('Lampa API unavailable');
            return;
        }

        try {
            // Створюємо вміст через штатний jQuery-шаблон Lampa
            var html = Lampa.Template.get('modal', {
                title: 'MODAL TEST'
            });

            var content = $('<div class="about">');

            var message = $('<div>').css({
                padding: '25px',
                color: '#ffffff',
                'font-size': '20px',
                'line-height': '1.5'
            }).text('Якщо ти бачиш це повідомлення, Lampa.Modal успішно відкрився.');

            var details = $('<pre>').css({
                padding: '15px',
                color: '#35c98b',
                'font-size': '13px',
                'white-space': 'pre-wrap'
            }).text(
                'Lampa version: 1.13.5-581\n' +
                'Template API: OK\n' +
                'Modal API: OK\n' +
                'jQuery HTML: OK'
            );

            var close = $('<div class="selector button">ЗАКРИТИ ТЕСТ</div>').css({
                padding: '15px',
                'margin-top': '15px'
            });

            close.on('hover:enter', function () {
                Lampa.Modal.close();
            });

            content.append(message, details, close);

            Lampa.Modal.open({
                title: 'LAMPA MODAL TEST ' + VERSION,
                html: content,
                size: 'large'
            });

        } catch (error) {
            console.error('[MODAL TEST]', error);

            alert(
                'Помилка Lampa.Modal:\n' +
                (error.message || error)
            );
        }
    }

    start();
})();
