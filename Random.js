(function () {
    'use strict';

    function RandomMovie(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask:true, over: true});
        var items = [];
        var html = $('<div></div>');
        var active_node;

        // --- КОНФІГУРАЦІЯ ---
        var api_url = 'https://api.themoviedb.org/3/';
        var api_key = '4ef0d38dcf675646830707769d133f0f'; // Стандартний ключ Lampa

        this.create = function () {
            var _this = this;
            
            // Створення головного контейнера з ефектом розмиття
            html.addClass('random-plugin-glass');
            
            var btn = $(`<div class="random-plugin__button selector">
                <div class="random-plugin__icon">🎲</div>
                <div class="random-plugin__text">Знайти випадковий фільм</div>
            </div>`);

            btn.on('hover:enter', function () {
                _this.find();
            });

            html.append(btn);
            html.append(scroll.render());
        };

        this.find = function () {
            Lampa.Loading.show();
            
            // Випадкова сторінка від 1 до 500 для різноманітності
            var page = Math.floor(Math.random() * 500) + 1;
            var type = Math.random() > 0.5 ? 'movie' : 'tv'; // Рандом між фільмами та серіалами
            
            network.silent(api_url + 'discover/' + type + '?api_key=' + api_key + '&language=uk-UA&page=' + page + '&sort_by=popularity.desc&vote_count.gte=100', function (data) {
                Lampa.Loading.hide();
                
                if (data.results && data.results.length) {
                    var card = data.results[Math.floor(Math.random() * data.results.length)];
                    
                    // Відкриваємо картку знайденого фільму
                    Lampa.Activity.push({
                        url: '',
                        title: type === 'movie' ? 'Фільм' : 'Серіал',
                        component: 'full',
                        id: card.id,
                        method: type,
                        card: card,
                        source: 'tmdb'
                    });
                } else {
                    Lampa.Noty.show('Спробуйте ще раз, космос порожній');
                }
            }, function () {
                Lampa.Loading.hide();
                Lampa.Noty.show('Помилка з’єднання з TMDB');
            });
        };

        this.render = function () {
            return html;
        };
    }

    // --- ІНТЕГРАЦІЯ В МЕНЮ ---
    function addMenuItem() {
        var menu_item = $(`
            <div class="menu__item selector" data-action="random_movie">
                <div class="menu__ico">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5" fill="white"></circle>
                        <circle cx="15.5" cy="15.5" r="1.5" fill="white"></circle>
                        <circle cx="15.5" cy="8.5" r="1.5" fill="white"></circle>
                        <circle cx="8.5" cy="15.5" r="1.5" fill="white"></circle>
                    </svg>
                </div>
                <div class="menu__text">Мені пощастить</div>
            </div>
        `);

        menu_item.on('hover:enter', function () {
            Lampa.Component.add('random_movie', RandomMovie);
            Lampa.Activity.push({
                url: '',
                title: 'Рандомайзер',
                component: 'random_movie',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    // Додаємо стилі в HEAD
    var style = `
        <style>
            .random-plugin-glass {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                background: radial-gradient(circle, rgba(45,45,45,0.2) 0%, rgba(0,0,0,0.8) 100%);
            }
            .random-plugin__button {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 2em 4em;
                border-radius: 20px;
                text-align: center;
                transition: all 0.3s ease;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            .random-plugin__button.focus {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.4);
                transform: scale(1.1);
            }
            .random-plugin__icon {
                font-size: 4em;
                margin-bottom: 0.2em;
            }
            .random-plugin__text {
                font-size: 1.5em;
                font-weight: 300;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
        </style>
    `;

    $('body').append(style);

    if (window.appready) addMenuItem();
    else Lampa.Emitter.ready('app', addMenuItem);

})();
