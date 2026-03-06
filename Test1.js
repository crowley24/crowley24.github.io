(function () {
    'use strict';

    function startPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'ready') {
                var card = e.object;
                var body = e.body;
                
                // 1. Шукаємо контейнер заголовка
                var titleElement = body.find('.full-start__title');
                if (!titleElement.length) return;

                // 2. Шукаємо логотип (пріоритет: card.data -> tmdb_data -> external)
                var logoPath = '';
                if (card.data.logo) {
                    logoPath = card.data.logo;
                } else if (card.data.tmdb_data && card.data.tmdb_data.logo) {
                    logoPath = card.data.tmdb_data.logo;
                } else if (card.data.videos && card.data.videos.logo) {
                    logoPath = card.data.videos.logo;
                }

                // 3. Якщо лого знайдено — замінюємо текст
                if (logoPath) {
                    var imgUrl = logoPath.indexOf('http') === -1 
                        ? 'https://image.tmdb.org/t/p/w500' + logoPath 
                        : logoPath;

                    // Використовуємо вбудований у Lampa метод для створення елементів
                    var img = $('<img class="full-start__logo" src="' + imgUrl + '" style="max-width: 100%; max-height: 140px; object-fit: contain; margin-bottom: 15px; display: block;">');

                    img.on('load', function() {
                        titleElement.html(img);
                    });

                    img.on('error', function() {
                        console.log('Lampa Logo Plugin: Failed to load logo, keeping text.');
                    });
                }
            }
        });
    }

    // Очікування ініціалізації Lampa
    if (window.Lampa) {
        startPlugin();
    } else {
        window.addEventListener('lampa:ready', startPlugin);
    }
})();
