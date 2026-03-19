(function () {
    'use strict';

    const STORAGE_KEY = 'pro_random_ai_data';

    const DEFAULT_DATA = {
        history: [],
        blacklist: []
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

    function getRandomMovie(callback) {
        Lampa.Api.get('discover/movie', {
            sort_by: 'popularity.desc',
            page: Math.floor(Math.random() * 10) + 1
        }, function (json) {

            let data = getData();

            let items = (json.results || []).filter(item => {
                return !data.history.includes(item.id) && !data.blacklist.includes(item.id);
            });

            let movie = items[Math.floor(Math.random() * items.length)];

            if (movie) {
                data.history.push(movie.id);
                if (data.history.length > 50) data.history.shift();
                saveData(data);
            }

            callback(movie);
        });
    }

    function openRandom() {
        getRandomMovie(function (movie) {

            if (!movie) {
                Lampa.Noty.show('Немає результатів');
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

        // ДОДАЄМО В МЕНЮ
        Lampa.Menu.add({
            title: '🎲 Pro Random',
            onSelect: openRandom
        });

        Lampa.Noty.show('Pro Random активовано');
    }

    if (window.Lampa) init();
    else {
        document.addEventListener('lampa_ready', init);
    }

})();
