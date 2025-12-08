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

    // --- показати меню ---
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

    // --- додаємо кнопку ---
    function injectButton(headerElement) {
        if (headerElement.querySelector('.source-switcher-btn')) return;

        const btn = document.createElement('div');
        btn.classList.add('header__icon', 'source-switcher-btn');
        btn.style.marginLeft = '15px';
        btn.innerHTML = `
            <svg width="24" height="24" fill="currentColor"><path d="M4 6h16M4 12h10M4 18h7"/></svg>
        `;

        btn.addEventListener('click', showMenu);

        const right = headerElement.querySelector('.header__right');
        if (right) right.prepend(btn);
    }

    // --- перехоплення рендера Header ---
    const original = Lampa.Header.create;

    Lampa.Header.create = function () {
        const header = original.apply(this, arguments);

        // DOM може зʼявитися за 0–100ms
        setTimeout(() => {
            const headerDom = document.querySelector('.header');
            if (headerDom) injectButton(headerDom);
        }, 50);

        return header;
    };

})();
