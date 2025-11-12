(function() {
    'use strict';

    const PLUGIN_ID = 'poster_customizer';
    const STORAGE_KEY = 'poster_customizer_settings';

    const defaults = {
        posterType: 'vertical', // або 'horizontal'
        rowOrder: {             // порядок стрічок
            'trending_today': 3,
            'top_rated': 1,
            'new_movies': 2
        }
    };

    // Завантаження налаштувань
    let settings = Object.assign({}, defaults, Lampa.Storage.get(STORAGE_KEY, {}));

    // === 1. Реєструємо в меню налаштувань ===
    Lampa.Settings.add({
        id: PLUGIN_ID,
        name: 'Постери та порядок стрічок',
        icon: 'images/icons/settings/paint.svg',
        category: 'interface',
        onSelect: () => {
            const modal = Lampa.Modal.open({
                title: 'Налаштування постерів',
                html: `
                    <div class="selector" data-name="posterType" data-value="vertical">Вертикальні постери</div>
                    <div class="selector" data-name="posterType" data-value="horizontal">Горизонтальні постери</div>
                    <div class="hr"></div>
                    <div>Порядок стрічок (напр. тренди, топи):</div>
                    <textarea data-name="rowOrder" style="width:100%;height:100px;">${JSON.stringify(settings.rowOrder, null, 2)}</textarea>
                `,
                onBack: () => Lampa.Modal.close()
            });

            modal.querySelectorAll('.selector').forEach(el => {
                el.addEventListener('hover:enter', () => {
                    settings.posterType = el.dataset.value;
                    Lampa.Storage.set(STORAGE_KEY, settings);
                    Lampa.Notify.show('Тип постерів оновлено');
                });
            });

            modal.querySelector('textarea').addEventListener('blur', e => {
                try {
                    settings.rowOrder = JSON.parse(e.target.value);
                    Lampa.Storage.set(STORAGE_KEY, settings);
                    Lampa.Notify.show('Порядок стрічок оновлено');
                } catch(err) {
                    Lampa.Notify.show('Помилка JSON');
                }
            });
        }
    });

    // === 2. Модифікуємо головний екран ===
    Lampa.Listener.follow('main_build', function(e){
        let items = e.data.items;

        // reorder rows
        let reordered = [];
        Object.entries(settings.rowOrder).forEach(([id, pos]) => {
            let found = items.find(i => i.id === id);
            if (found) reordered[pos-1] = found;
        });
        reordered = reordered.filter(Boolean);
        e.data.items = reordered.length ? reordered : items;

        // apply poster type
        items.forEach(row => {
            if (row.body) {
                row.body.poster_size = (settings.posterType === 'horizontal') ? 'poster_16x9' : 'poster';
            }
        });
    });

    Lampa.Plugin.create(PLUGIN_ID, {
        title: 'Плагін для кастомізації постерів',
        version: '1.0.0',
        description: 'Додає зміну типу постерів і порядок стрічок',
        author: 'Eugene'
    });
})();
