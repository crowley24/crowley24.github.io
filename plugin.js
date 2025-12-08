(function () {
    'use strict';

    // --- Налаштування джерел ---
    const SOURCES = [
        { id: 'tmdb', title: 'TMDB' },
        { id: 'cub', title: 'CUB' },
        { id: 'trakt', title: 'TRAKT' },
        { id: 'kino', title: 'KinoDB' }
    ];

    const STORAGE_KEY = 'source_switcher_selected';

    function getSelectedSource() {
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb');
    }

    function setSelectedSource(id) {
        Lampa.Storage.set(STORAGE_KEY, id);
    }

    // --- UI: створити кнопку в шапці ---
    function addTopButton() {
        // Перевіряємо, чи вже кнопка існує
        if ($('.source-switcher-btn').length) return;

        let selected = getSelectedSource();

        // HTML-кнопка
        let btn = $('<div class="header__icon source-switcher-btn" style="margin-left: 15px;">')
            .append(`<img src="https://img.icons8.com/fluency-systems-regular/24/sorting-options.png">`)
            .attr('title', 'Перемикач джерел (' + selected.toUpperCase() + ')');

        // Подія натискання
        btn.on('click', showSourceMenu);

        // Додаємо у верхнє меню
        $('.header__right').prepend(btn);
    }

    // --- Меню вибору джерела ---
    function showSourceMenu() {
        let selected = getSelectedSource();

        let list = SOURCES.map(src => {
            return {
                title: (src.id === selected ? '✔️ ' : '') + src.title,
                source_id: src.id
            };
        });

        Lampa.Select.show({
            title: 'Перемикач джерел',
            items: list,
            onSelect: function (item) {
                setSelectedSource(item.source_id);

                // Оновити іконку в шапці
                $('.source-switcher-btn').attr(
                    'title',
                    'Перемикач джерел (' + item.source_id.toUpperCase() + ')'
                );

                Lampa.Controller.toggle('content');
                Lampa.Noty.show('Джерело змінено на: ' + item.title.replace('✔️ ', ''));
            }
        });
    }

    // --- Чекаємо на Lampa ---
    function waitForHeader() {
        if ($('.header__right').length) {
            addTopButton();
        } else {
            setTimeout(waitForHeader, 500);
        }
    }

    waitForHeader();

})();
