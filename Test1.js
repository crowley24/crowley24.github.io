(function () {
    // 1. Оновлені стилі (додаємо !important, щоб Lampa не перебила їх)
    Lampa.Utils.putStyle('apple_tv_v2', `
        .apple-full {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 100 !important;
            background: #000 !important;
            display: block !important;
        }
        /* ... інші стилі залишаємо ... */
    `);

    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            // Спробуємо знайти конкретний елемент, який Lampa точно створює
            var scroll = e.object.render().find('.scroll-content');
            
            if (scroll.length > 0) {
                var movie = e.data.movie;
                
                fetchLogo(movie, function(logoUrl) {
                    var html = `
                        <div class="apple-full">
                            <div class="apple-full__bg" style="background-image: url(${movie.background_image || movie.backdrop_path})"></div>
                            <div class="apple-full__shadow"></div>
                            <div class="apple-full__content">
                                <div class="apple-full__logo">
                                    ${logoUrl ? `<img src="${logoUrl}">` : `<h1>${movie.title || movie.name}</h1>`}
                                </div>
                                <div class="apple-full__buttons"></div>
                            </div>
                        </div>
                    `;
                    
                    // Це "агресивний" метод: ми повністю затираємо все всередині компонента
                    e.object.render().html(html);
                    
                    // Повертаємо кнопки на місце
                    e.object.render().find('.apple-full__buttons').append(e.object.buttons.render());
                });
            }
        }
    });
})();
