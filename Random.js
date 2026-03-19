(function () {
    'use strict';

    const PLUGIN_ID = 'pro_random_ai';
    const STORAGE_KEY = 'pro_random_ai_data';

    const DEFAULT_DATA = {
        mode: 'smart',
        filters: {
            genres: [],
            year_from: 2000,
            year_to: 2025,
            rating: 6
        },
        history: [],
        blacklist: [],
        seed: Date.now()
    };

    function getData() {
        let data = Lampa.Storage.get(STORAGE_KEY, null);
        if (!data) {
            data = DEFAULT_DATA;
            Lampa.Storage.set(STORAGE_KEY, data);
        }
        return data;
    }

    function saveData(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    function randomSeeded(seed) {
        let x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function shuffleWithSeed(array, seed) {
        return array.sort(() => randomSeeded(seed) - 0.5);
    }

    function filterMovies(items, data) {
        return items.filter(item => {
            if (data.blacklist.includes(item.id)) return false;
            if (data.history.includes(item.id)) return false;

            if (data.filters.rating && item.vote_average < data.filters.rating) return false;

            if (data.filters.genres.length) {
                if (!item.genre_ids.some(g => data.filters.genres.includes(g))) return false;
            }

            if (item.release_date) {
                let year = parseInt(item.release_date);
                if (year < data.filters.year_from || year > data.filters.year_to) return false;
            }

            return true;
        });
    }

    function getRandomMovie(callback) {
        let data = getData();

        let url = Lampa.TMDB.api('discover/movie', {
            sort_by: 'popularity.desc',
            vote_average_gte: data.filters.rating,
            'primary_release_date.gte': data.filters.year_from + '-01-01',
            'primary_release_date.lte': data.filters.year_to + '-12-31',
            with_genres: data.filters.genres.join(',')
        });

        Lampa.Reguest.get(url, function (json) {
            let items = json.results || [];

            items = filterMovies(items, data);
            items = shuffleWithSeed(items, data.seed);

            let movie = items[0];

            if (movie) {
                data.history.push(movie.id);
                if (data.history.length > 100) data.history.shift();
                data.seed++;
                saveData(data);
            }

            callback(movie);
        });
    }

    function openRandom() {
        getRandomMovie(function (movie) {
            if (!movie) {
                Lampa.Noty.show('Нічого не знайдено 😢');
                return;
            }

            let html = `
            <div class="pro-random">
                <div class="pro-random__bg" style="background-image:url(https://image.tmdb.org/t/p/w780${movie.backdrop_path})"></div>
                <div class="pro-random__content">
                    <img class="pro-random__poster" src="https://image.tmdb.org/t/p/w342${movie.poster_path}">
                    <div class="pro-random__info">
                        <h2>${movie.title}</h2>
                        <div>⭐ ${movie.vote_average}</div>
                        <div>${movie.overview || ''}</div>
                        <div class="pro-random__buttons">
                            <div class="btn watch">▶ Дивитись</div>
                            <div class="btn next">🔁 Інший</div>
                            <div class="btn dislike">👎 Не подобається</div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            let container = $(html);

            container.find('.watch').on('hover:enter', () => {
                Lampa.Activity.push({
                    url: movie,
                    title: movie.title,
                    component: 'full'
                });
            });

            container.find('.next').on('hover:enter', () => {
                openRandom();
            });

            container.find('.dislike').on('hover:enter', () => {
                let data = getData();
                data.blacklist.push(movie.id);
                saveData(data);
                openRandom();
            });

            Lampa.Modal.open({
                title: '🎲 Pro Random',
                html: container,
                size: 'large'
            });
        });
    }

    function createRow() {
        let data = getData();

        let component = {
            component: 'pro_random_row',
            name: '🎲 Випадкова добірка',
            items: [],
            onMore: openRandom,
            create: function () {
                let self = this;

                for (let i = 0; i < 15; i++) {
                    getRandomMovie(function (movie) {
                        if (movie) self.items.push(movie);
                    });
                }
            }
        };

        Lampa.Component.add(component);
        Lampa.Component.push(component);
    }

    function init() {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                Lampa.Menu.add({
                    title: '🎲 Pro Random',
                    icon: '🎲',
                    onSelect: openRandom
                });

                createRow();
            }
        });
    }

    init();

})();
