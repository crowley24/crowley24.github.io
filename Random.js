(function () {
    'use strict';

    function RandomMovie() {
        var network = new Lampa.Reguest();
        var html = $('<div class="random-plugin-glass"></div>');
        
        this.create = function () {
            var _this = this;
            var btn = $(`
                <div class="random-plugin__content">
                    <div class="random-plugin__button selector">
                        <div class="random-plugin__icon">🎲</div>
                        <div class="random-plugin__text">Знайти випадковий фільм</div>
                    </div>
                </div>
            `);

            btn.find('.selector').on('hover:enter', function () {
                _this.find();
            });

            html.append(btn);
        };

        this.find = function () {
            Lampa.Loading.show();
            
            // TMDB API параметри
            var api_key = '4ef0d38dcf675646830707769d133f0f';
            var page = Math.floor(Math.random() * 200) + 1; // Обмежимо 200 сторінками для якості
            var type = Math.random() > 0.5 ? 'movie' : 'tv';
            
            var url = 'https://api.themoviedb.org/3/discover/' + type + 
                      '?api_key=' + api_key + 
                      '&language=uk-UA' + 
                      '&page=' + page + 
                      '&sort_by=popularity.desc' + 
                      '&vote_count.gte=150';

            network.silent(url, function (data) {
                Lampa.Loading.hide();
                
                if (data && data.results && data.results.length) {
                    var card = data.results[Math.floor(Math.random() * data.results.length)];
                    
                    // Закриваємо поточну активність перед відкриттям картки
                    Lampa.Activity.backward();

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
                    Lampa.Noty.show('Нічого не знайдено, спробуйте ще раз');
                }
            }, function () {
                Lampa.Loading.hide();
                Lampa.Noty.show('Помилка завантаження даних');
            });
        };

        this.render = function () {
            return html;
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            html.remove();
            network.clear();
        };
    }

    // Реєстрація компонента та додавання в меню
    function init() {
        if (window.random_movie_inited) return;
        window.random_movie_inited = true;

        // Реєструємо компонент у системі Lampa
        Lampa.Component.add('random_movie', RandomMovie);

        var menu_item = $(`
            <div class="menu__item selector" data-action="random_movie">
                <div class="menu__ico">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M8 8h.01"></path><path d="M16 16h.01"></path><path d="M16 8h.01"></path><path d="M8 16h.01"></path><path d="M12 12h.01"></path></svg>
                </div>
                <div class="menu__text">Рандом</div>
            </div>
        `);

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'Рандомайзер',
                component: 'random_movie',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    // Стилі (додані через JS для зручності)
    var styles = `
        <style>
            .random-plugin-glass {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.6);
            }
            .random-plugin__content {
                text-align: center;
            }
            .random-plugin__button {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                padding: 40px 60px;
                border-radius: 30px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .random-plugin__button.focus {
                background: rgba(255, 255, 255, 0.25);
                border-color: #fff;
                transform: scale(1.1);
                box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            }
            .random-plugin__icon {
                font-size: 80px;
                line-height: 1;
                margin-bottom: 20px;
            }
            .random-plugin__text {
                font-size: 24px;
                font-weight: bold;
                color: #fff;
            }
        </style>
    `;

    // Безпечний запуск
    if (window.appready) {
        $('body').append(styles);
        init();
    } else {
        Lampa.Emitter.ready('app', function () {
            $('body').append(styles);
            init();
        });
    }
})();
