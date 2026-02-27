function initPlugin() {

    function removeAgeRatings(container) {

        // стандартні класи
        container.find('.full-start__age').remove();
        container.find('.full-start-new__age').remove();

        // якщо Lampa вставляє як окремий div
        container.find('*').each(function () {
            var text = $(this).text().trim();
            if (/^\d+\+$/.test(text)) {
                $(this).remove();
            }
        });
    }

    Lampa.Listener.follow('full', function (e) {

        if (e.type === 'destroy') clearInterval(slideshowTimer);

        if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {

            var movie = e.data.movie;
            var $render = e.object.activity.render();

            /* 🔥 Видаляємо метадані */
            $render.find('.full-start-new__details').remove();

            /* 🔥 Видаляємо віковий рейтинг */
            removeAgeRatings($render);

            /* 🔥 Стежимо якщо Lampa перемалює */
            var observer = new MutationObserver(function () {
                removeAgeRatings($render);
            });

            observer.observe($render[0], {
                childList: true,
                subtree: true
            });

            /* TMDB логотип */
            $.ajax({
                url: 'https://api.themoviedb.org/3/' +
                    (movie.name ? 'tv' : 'movie') +
                    '/' + movie.id +
                    '/images?api_key=' + Lampa.TMDB.key(),
                success: function (res) {

                    var lang = Lampa.Storage.get('language') || 'uk';

                    var logo =
                        res.logos.filter(l => l.iso_639_1 === lang)[0] ||
                        res.logos.filter(l => l.iso_639_1 === 'en')[0] ||
                        res.logos[0];

                    if (logo) {
                        var imgUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path.replace('.svg', '.png'));
                        $render.find('.full-start-new__title').html('<img src="' + imgUrl + '">');
                    }
                }
            });

            /* Студії */
            setTimeout(function () {

                $('.plugin-info-block').remove();

                var $infoBlock = $('<div class="plugin-info-block"><div class="studio-row"></div></div>');

                $render.find('.full-start-new__title').after($infoBlock);

                renderStudioLogos($infoBlock.find('.studio-row'), movie);

            }, 400);
        }
    });
}
