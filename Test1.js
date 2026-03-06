(function () {
    'use strict';

    function initLogoSwitcher() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'ready') {
                var card = e.object;
                var container = e.body;
                
                // Знаходимо елемент заголовка
                var titleElement = container.find('.full-start__title');
                
                // 1. Шукаємо логотип у всіх можливих гілках даних
                var logoPath = findLogo(card.data);

                if (logoPath && titleElement.length) {
                    var imgUrl = (logoPath.indexOf('http') === -1) 
                        ? 'https://image.tmdb.org/t/p/w500' + logoPath 
                        : logoPath;

                    // Створюємо елемент зображення
                    var img = $('<img class="full-start__logo-img" src="' + imgUrl + '">');

                    // Стилі для коректного відображення
                    img.css({
                        'max-width': '400px',
                        'max-height': '120px',
                        'display': 'block',
                        'margin-bottom': '15px',
                        'object-fit': 'contain',
                        'object-position': 'left'
                    });

                    // Замінюємо текст на лого після завантаження картинки
                    img.on('load', function() {
                        titleElement.html(img);
                        titleElement.css('display', 'block');
                    });
                }
            }
        });
    }

    // Функція глибокого пошуку логотипа в об'єкті
    function findLogo(data) {
        if (!data) return null;
        
        // Пріоритетні місця (TMDB, Fanart, internal)
        if (data.logo) return data.logo;
        if (data.tmdb_data && data.tmdb_data.logo) return data.tmdb_data.logo;
        if (data.external && data.external.logo) return data.external.logo;
        
        // Пошук у масиві зображень, якщо він є
        if (data.images && data.images.logos && data.images.logos.length > 0) {
            // Тут якраз спрацює твоє правило: якщо є UA - беремо, якщо ні - перше доступне (EN)
            var uaLogo = data.images.logos.find(function(l) { return l.iso_639_1 === 'uk'; });
            return uaLogo ? uaLogo.file_path : data.images.logos[0].file_path;
        }

        return null;
    }

    // Запуск плагіна
    if (window.Lampa) {
        initLogoSwitcher();
    } else {
        window.addEventListener('lampa:ready', initLogoSwitcher);
    }
})();
