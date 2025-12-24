(function () {
    'use strict';

    // Ім'я вашого нового джерела для налаштувань
    const SOURCE_NAME = 'my_tmdb_addon';
    
    // Список категорій з відповідними TMDB API-запитами
    // та налаштуваннями за замовчуванням
    const categories = [
        {
            id: 'now_watch',
            title: '🔥 Зараз дивляться',
            api_path: '/movie/now_playing',
            remove_key: 'now_watch_remove',
            default_order: 1,
            default_remove: false,
        },
        {
            id: 'upcoming_episodes',
            title: '📺 Найближчі епізоди',
            api_path: '/tv/airing_today', // Використовуємо TV Airing Today як заміну
            remove_key: 'upcoming_episodes_remove',
            default_order: 2,
            default_remove: false,
        },
        {
            id: 'trend_day_tv',
            title: '📈 Тренд за день (Серіали)',
            api_path: '/trending/tv/day',
            remove_key: 'trend_day_tv_remove',
            default_order: 3,
            default_remove: false,
        },
        {
            id: 'trend_day_film',
            title: '📈 Тренд за день (Фільми)',
            api_path: '/trending/movie/day',
            remove_key: 'trend_day_film_remove',
            default_order: 4,
            default_remove: false,
        },
        {
            id: 'top_movie',
            title: '⭐ Топ Фільми',
            api_path: '/movie/top_rated',
            remove_key: 'top_movie_remove',
            default_order: 5,
            default_remove: false,
        },
        {
            id: 'top_tv',
            title: '⭐ Топ Серіали',
            api_path: '/tv/top_rated',
            remove_key: 'top_tv_remove',
            default_order: 6,
            default_remove: false,
        },
        {
            id: 'upcoming',
            title: '🔜 Майбутні релізи',
            api_path: '/movie/upcoming',
            remove_key: 'upcoming_remove',
            default_order: 7,
            default_remove: false,
        },
        // Додаткова категорія "Жахи"
        {
            id: 'horror_genre',
            title: '💀 Жахи (Фільми)',
            api_path: '/discover/movie?with_genres=27&sort_by=popularity.desc', // ID жанру "Horror" - 27
            remove_key: 'horror_remove',
            default_order: 8,
            default_remove: false,
        },
    ];

    /**
     * Головна функція ініціалізації плагіна
     */
    function initialize() {
        // 1. Додаємо всі категорії в налаштування Lampa
        categories.forEach(category => {
            // Додаємо налаштування для ввімкнення/вимкнення
            Lampa.SettingsApi.addParam({
                component: 'main', // Додаємо до головних налаштувань
                param: {
                    name: category.remove_key,
                    type: 'toggle',
                    default: category.default_remove,
                },
                field: {
                    name: 'Сховати ' + category.title,
                    description: `Видалити категорію "${category.title}" з головної сторінки.`,
                },
            });

            // Додаємо налаштування для зміни порядку (як у вашому прикладі)
            Lampa.SettingsApi.addParam({
                component: 'main',
                param: {
                    name: 'number_' + category.id,
                    type: 'select',
                    values: [...Array(30).keys()].map(i => ({ [i + 1]: String(i + 1) })), // Числа від 1 до 30
                    default: String(category.default_order),
                },
                field: {
                    name: 'Порядок ' + category.title,
                },
            });
        });

        // 2. Реєструємо функцію для завантаження даних
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                
                // Додаємо кожну категорію на головний екран
                categories.forEach(category => {
                    const remove = Lampa.Storage.get(category.remove_key);
                    
                    if (!remove) {
                        // Отримуємо порядок з налаштувань
                        const order = parseInt(Lampa.Storage.get('number_' + category.id), 10) || category.default_order;
                        
                        Lampa.Home.add({
                            id: category.id,
                            title: category.title,
                            order: order,
                            visible: true,
                            
                            // Функція для отримання контенту
                            onLoad: function(resolve, reject) {
                                Lampa.Api.get(category.api_path, {}, function(data) {
                                    // TMDB повертає data.results
                                    resolve(data.results); 
                                }, function(error) {
                                    Lampa.Noty.error('Помилка завантаження категорії: ' + category.title);
                                    reject(error);
                                });
                            }
                        });
                    }
                });

                // Після додавання всіх компонентів, оновлюємо головний екран
                Lampa.Home.render();
            }
        });

    }

    // Запускаємо плагін після готовності Lampa
    if (window.appready) {
        initialize();
    } else {
        Lampa.Listener.follow('app', initialize);
    }
    
})();

