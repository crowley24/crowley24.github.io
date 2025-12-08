(function () {
    'use strict';

    const SOURCES = [
        { id: 'tmdb', title: 'TMDB' },
        { id: 'cub', title: 'CUB' },
        { id: 'trakt', title: 'TRAKT' },
        { id: 'kino', title: 'KinoDB' }
    ];

    const STORAGE_KEY = 'source_switcher_selected';

    function getSelected() {
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb');
    }

    function setSelected(id) {
        Lampa.Storage.set(STORAGE_KEY, id);
    }

    // --- СТВОРЮЄМО КНОПКУ ---
    function createButton() {
        // Якщо кнопка вже є — не створюємо
        if ($('.source-switcher-btn').length) return;

        const btn = $('<div class="header__icon source-switcher-btn" style="margin-left: 15px;">' +
            '<svg width="24" height="24" fill="currentColor"><path d="M4 6h16M4 12h10M4 18h7"/></svg>' +
        '</div>');

        btn.attr('title', 'Перемикач джерел (' + getSelected().toUpperCase() + ')');
        btn.on('click', showMenu);

        // Гарантовано додаємо кнопку в верхнє меню
        const headerRight = $('.header__right');
        if (headerRight.length) {
            headerRight.prepend(btn);
        }
    }

    // --- ПОКАЗАТИ МЕНЮ ---
    function showMenu() {
        const selected = getSelected();

        const items = SOURCES.map(src => ({
            title: (src.id === selected ? '✔️ ' : '') + src.title,
            source_id: src.id
        }));

        Lampa.Select.show({
            title: 'Перемикач джерел',
            items,
            onSelect(item) {
                setSelected(item.source_id);

                $('.source-switcher-btn').attr(
                    'title',
                    'Перемикач джерел (' + item.source_id.toUpperCase() + ')'
                );

                Lampa.Noty.show('Джерело: ' + item.title.replace('✔️ ', ''));
            }
        });
    }

    // --- ОБОВʼЯЗКОВА ЧАСТИНА: ЧЕКАЄМО НА UI ---
    function waitForUI() {
        if ($('.header__right').length) {
            createButton();
        } else {
            setTimeout(waitForUI, 300);
        }
    }

    // --- ДОДАТКОВО: створюємо кнопку кожен раз після зміни екранів ---
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready' || e.type === 'navigation') {
            setTimeout(createButton, 50);
        }
    });

    waitForUI();

})();
