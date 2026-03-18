(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_premium';
    var STORAGE_KEY = 'lampa_random_selected_genres';

    var ALL_GENRES = {
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
    };

    function tr(uk, ru) {
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;
    }

    function getSelectedGenres() {
        var saved = Lampa.Storage.get(STORAGE_KEY);
        if (!saved || !Array.isArray(saved)) return Object.keys(ALL_GENRES);
        return saved;
    }

    // --- Функція налаштувань, яка НЕ закриває вікно ---
    function showGenreSettings() {
        var ids = Object.keys(ALL_GENRES);
        var items = ids.map(function(id) {
            var selected = getSelectedGenres();
            return {
                title: (selected.indexOf(id) !== -1 ? '✅ ' : '❌ ') + ALL_GENRES[id],
                value: id
            };
        });

        Lampa.Select.show({
            title: tr('Оберіть жанри', 'Выберите жанры'),
            items: items,
            onSelect: function (item) {
                // Цей блок порожній, бо ми обробляємо клік через свою подію нижче
            },
            onRender: function(render) {
                // Перехоплюємо клік на пункти меню
                render.find('.select__item').on('hover:enter', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    var item_data = items[$(this).index()];
                    var current = getSelectedGenres();
                    var idx = current.indexOf(item_data.value);
                    
                    if (idx > -1) current.splice(idx, 1);
                    else current.push(item_data.value);
                    
                    Lampa.Storage.set(STORAGE_KEY, current);

                    // Оновлюємо текст прямо в списку без закриття
                    var is_now_active = current.indexOf(item_data.value) !== -1;
                    $(this).find('.select__title').text((is_now_active ? '✅ ' : '❌ ') + ALL_GENRES[item_data.value]);
                    
                    Lampa.Noty.show(tr('Оновлено', 'Обновлено'), {time: 300});
                });
            },
            onBack: function() {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function getRandomParams() {
        var genres = getSelectedGenres();
        if (!genres.length) genres = Object.keys(ALL_GENRES);
        var random_genre = genres[Math.floor(Math.random() * genres.length)];
        var page = Math.floor(Math.random() * 15) + 1;
        var type = Math.random() > 0.3 ? 'movie' : 'tv';
        
        return {
            type: type,
            params: {
                with_genres: random_genre,
                'vote_average.gte': 6.5,
                'vote_count.gte': 200,
                page: page,
                language: Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU'
            }
        };
    }

    // --- Виведення на Головну (Найвищий пріоритет) ---
    function injectToMain() {
        var originalCall = Lampa.ContentRows.call;
        Lampa.ContentRows.call = function (screen, params, calls) {
            if (screen === 'main') {
                var randomRow = function (call) {
                    var config = getRandomParams();
                    var method = config.type === 'movie' ? 'discover/movie' : 'discover/tv';
                    
                    Lampa.Api.sources.tmdb.get(method, config.params, function (json) {
                        if (json && json.results && json.results.length) {
                            json.results.forEach(function(i) { i.type = config.type; });
                            call({
                                results: json.results,
                                title: tr('Випадкова добірка: ' + (ALL_GENRES[config.params.with_genres] || ''), 'Случайная подборка')
                            });
                        } else call({ results: [] });
                    }, function () { call({ results: [] }); });
                };

                // Вставляємо на самий початок
                calls.unshift(randomRow);
            }
            
            // Виклик основних рядків
            originalCall.apply(this, arguments);
        };
    }

    function addMenuButton() {
        if ($('.menu__item[data-action="' + PLUGIN_ID + '"]').length) return;

        var button = $(
            '<li class="menu__item selector" data-action="' + PLUGIN_ID + '">' +
                '<div class="menu__ico">' +
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                        '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>' +
                        '<circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>' +
                        '<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/>' +
                        '<circle cx="16" cy="8" r="1.5" fill="currentColor"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="menu__text">' + tr('Випадкова добірка', 'Мне повезёт') + '</div>' +
            '</li>'
        );

        button.on('hover:enter', function () {
            var config = getRandomParams();
            Lampa.Activity.push({
                url: 'discover/' + config.type + '?with_genres=' + config.params.with_genres + '&page=' + config.params.page,
                title: tr('Випадкова добірка', 'Мне повезёт'),
                component: 'category_full',
                source: 'tmdb',
                card_type: true
            });
        });

        button.on('hover:long', function() {
            showGenreSettings();
        });

        var historyBtn = $('.menu .menu__list .menu__item[data-action="history"]');
        if (historyBtn.length) historyBtn.after(button);
        else $('.menu .menu__list').prepend(button);
    }

    function start() {
        addMenuButton();
        injectToMain();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });

})();
