(function () {
    'use strict';

    const SOURCES = [
        { id: 'tmdb', title: 'TMDB' },
        { id: 'cub', title: 'CUB' },
        { id: 'trakt', title: 'TRAKT' }
    ];

    const STORAGE_KEY = 'source_switcher_selected';

    function getSelected() {
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb');
    }

    function setSelected(id) {
        Lampa.Storage.set(STORAGE_KEY, id);
    }

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
                Lampa.Noty.show('Джерело: ' + item.title.replace('✔️ ', ''));
            }
        });
    }

    // ----------------------------------------
    // ДОДАВАННЯ КНОПКИ В ШАПКУ (гарантовано)
    // ----------------------------------------
    function addButton() {
        const header = document.querySelector('.header');
        if (!header) return;

        const right = header.querySelector('.header__right');
        if (!right) return;

        // Якщо кнопка вже існує — не додаємо повторно
        if (right.querySelector('.source-switcher-btn')) return;

        const btn = document.createElement('div');
        btn.classList.add('header__icon', 'source-switcher-btn');
        btn.style.marginLeft = '15px';
        btn.innerHTML =
            `<svg width="24" height="24" fill="currentColor">
                <path d="M4 6h16M4 12h10M4 18h7"/>
            </svg>`;

        btn.addEventListener('click', showMenu);

        right.prepend(btn);
    }

    // ----------------------------------------
    // СЛУХАЧ ПЕРЕМАЛЮВАННЯ ІНТЕРФЕЙСУ
    // ЦЕ ЄДИНЕ, ЩО ПРАЦЮЄ НА ВСІХ LAMPA
    // ----------------------------------------
    Lampa.Listener.follow('full', function (event) {
        if (event.type === 'render') {
            // даємо 50 ms щоб Lampa вставила DOM
            setTimeout(addButton, 50);
        }
    });

    // спроба додати кнопку одразу (на всяк випадок)
    setTimeout(addButton, 500);

})();
