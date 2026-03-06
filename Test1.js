(function () {
    'use strict';

    function initLogoPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'ready') {
                var card = e.object; // Дані фільму
                var container = e.body; // DOM елемент картки
                
                // Знаходимо заголовок
                var titleElement = container.find('.full-start__title');
                
                // Шукаємо логотип: спочатку в основних даних, потім у вкладених
                var logoPath = card.data.logo || 
                               (card.data.tmdb_data && card.data.tmdb_data.logo) ||
                               (card.data.external && card.data.external.logo);

                if (logoPath && titleElement.length) {
                    // Формуємо URL. Якщо шлях від TMDB, додаємо базовий URL
                    var imgUrl = logoPath.indexOf('http') === -1 
                        ? 'https://image.tmdb.org/t/p/w500' + logoPath 
                        : logoPath;

                    // Створюємо картинку-логотип
                    var logoImg = $('<img class="custom-movie-logo" src="' + imgUrl + '">');

                    // Стилізація для гарного вигляду
                    logoImg.on('load', function() {
                        titleElement.html(logoImg);
                        logoImg.css({
                            'max-width': '100%',
                            'max-height': '120px',
                            'object-fit': 'contain',
                            'margin-bottom': '10px'
                        });
                    });

                    // Якщо картинка не завантажилась (наприклад, 404), лишаємо текст
                    logoImg.on('error', function() {
                        console.log('Logo not found, keeping text title');
                    });
                }
            }
        });
    }

    // Очікуємо повної готовності Lampa
    if (window.appready) initLogoPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initLogoPlugin();
        });
    }
})();

