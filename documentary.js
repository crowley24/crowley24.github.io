(function() {
    if (!window.Lampa) return;

    const CATEGORY_NAME = 'Документалки';

    const DocumentaryPlugin = {
        name: 'DocumentaryPlugin',

        init: function() {
            // Добавляем пункт в главное меню
            Lampa.Menu.add({
                title: CATEGORY_NAME,
                component: 'category_doc',
                background: true
            });

            // Регистрируем компонент
            Lampa.Component.add('category_doc', {
                onCreate: function() {
                    this.activity.loader(true);
                    this.activity.background('https://image.tmdb.org/t/p/original/1ZQZ4HbnzS4U6mTR3E5EKeosN8p.jpg');

                    Lampa.Api.themoviedb.get('discover/movie', {
                        with_genres: '99', // жанр "Documentary" в TMDb
                        sort_by: 'popularity.desc',
                        language: Lampa.Lang.get('tmdb_lang') || 'ru-RU',
                        page: 1
                    }, (result) => {
                        this.activity.loader(false);

                        if (result.results && result.results.length) {
                            const items = result.results.map(movie => {
                                return {
                                    title: movie.title,
                                    original_title: movie.original_title,
                                    release_year: (movie.release_date || '').split('-')[0],
                                    img: Lampa.Api.themoviedb.image(movie.poster_path),
                                    background: Lampa.Api.themoviedb.image(movie.backdrop_path),
                                    movie: movie
                                };
                            });

                            const scroll = new Lampa.Scroll({ mask: true });
                            const cards = new Lampa.CardCollection(items, { onSelect: (card) => {
                                Lampa.Activity.push({
                                    component: 'full',
                                    movie: card.movie,
                                    id: card.movie.id,
                                    method: 'tv'
                                });
                            }});

                            scroll.append(cards.render());
                            this.activity.render().empty().append(scroll.render());
                            scroll.render();
                        } else {
                            this.empty();
                        }
                    }, (error) => {
                        this.activity.loader(false);
                        this.empty();
                    });
                },
                onBack: function() {
                    Lampa.Activity.back();
                },
                onStop: function() {}
            });

            console.log('✅ Документалки: модуль подключён');
        }
    };

    Lampa.Plugin.add(DocumentaryPlugin);
})();
