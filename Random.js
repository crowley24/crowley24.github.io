(function () {
    'use strict';

    const STORAGE_KEY = 'pro_random_ai_data';

    function getData() {
        return Lampa.Storage.get(STORAGE_KEY, {
            history: [],
            blacklist: []
        });
    }

    function saveData(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    function getRandomMovie(callback) {

        let page = Math.floor(Math.random() * 5) + 1;

        let url = Lampa.TMDB.api('discover/movie', {
            sort_by: 'popularity.desc',
            page: page
        });

        Lampa.Reguest.get(url, function (json) {

            let data = getData();

            let items = (json.results || []).filter(function (item) {
                return data.history.indexOf(item.id) === -1 &&
                       data.blacklist.indexOf(item.id) === -1;
            });

            if (!items.length) {
                callback(null);
                return;
            }

            let movie = items[Math.floor(Math.random() * items.length)];

            data.history.push(movie.id);
            if (data.history.length > 50) data.history.shift();

            saveData(data);

            callback(movie);

        }, function () {
            callback(null);
        });
    }

    function openRandom() {
        getRandomMovie(function (movie) {

            if (!movie) {
                Lampa.Noty.show('Нічого не знайдено');
                return;
            }

            Lampa.Activity.push({
                url: movie,
                title: movie.title,
                component: 'full'
            });

        });
    }

    function init() {

        Lampa.Menu.add({
            title: '🎲 Pro Random',
            onSelect: openRandom
        });

        console.log('Pro Random: loaded');
    }

    if (window.Lampa) {
        init();
    } else {
        window.addEventListener('lampa_ready', init);
    }

})();
