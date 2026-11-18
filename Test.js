(function () {
    'use strict';

    // Унікальний ідентифікатор плагіна
    const PLUGIN_NAME = 'card_lite_fusion';
    
    // Налаштування за замовчуванням
    let settings = {
        bg_type: 'trailer', // 'trailer' або 'slideshow'
        blur: 20,
        zoom: 1.1,
        slideshow_interval: 8000,
        slideshow_quality: 'w1280',
        trailer_sound: false,
        trailer_volume: 0,
        logo_auto_invert: true
    };

    // Завантаження збережених налаштувань
    function loadSettings() {
        try {
            let saved = Lampa.Storage.get(PLUGIN_NAME + '_settings');
            if (saved) {
                settings = Object.assign({}, settings, saved);
            }
        } catch (e) {
            console.error(PLUGIN_NAME, 'Помилка завантаження налаштувань:', e);
        }
    }

    // Збереження налаштувань "на льоту"
    function saveSettings() {
        try {
            Lampa.Storage.set(PLUGIN_NAME + '_settings', settings);
        } catch (e) {
            console.error(PLUGIN_NAME, 'Помилка збереження налаштувань:', e);
        }
    }

    loadSettings();

    // Інтерфейс плагіна
    function CardLiteFusion() {
        let network = new Lampa.Reguest();
        let background_container = null;
        let active_trailer = null;
        let slideshow_timer = null;
        let current_posters = [];
        let current_poster_index = 0;

        this.create = function (data) {
            let html = $('<div><div class="card-lite-fusion-wrap"></div></div>');
            return html;
        };

        // Встановлення фону (Трейлер або Слайдшоу)
        this.setBackground = function (element, movie) {
            background_container = $('<div class="card-lite-background"></div>').css({
                'position': 'absolute',
                'top': 0,
                'left': 0,
                'width': '100%',
                'height': '100%',
                'z-index': -1,
                'overflow': 'hidden',
                'filter': `blur(${settings.blur}px)`,
                'transform': `scale(${settings.zoom})`,
                'transition': 'all 0.5s ease'
            });

            element.find('.full-view__background').html(background_container);

            if (settings.bg_type === 'trailer') {
                this.loadTrailer(movie);
            } else {
                this.loadSlideshow(movie);
            }
        };

        // Завантаження трейлера з YouTube
        this.loadTrailer = function (movie) {
            let id = movie.id;
            let type = movie.name ? 'tv' : 'movie';

            network.silent(`https://api.themoviedb.org/3/${type}/${id}/videos?api_key=4ef0ecd7c5d4dda4661e92a49f96b27e&language=ru-RU`, (data) => {
                let videos = data.results || [];
                let trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') || videos[0];

                if (trailer && trailer.key) {
                    let yt_url = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${settings.trailer_sound ? 0 : 1}&controls=0&loop=1&playlist=${trailer.key}&enablejsapi=1`;
                    background_container.html(`<iframe src="${yt_url}" style="width:100%;height:100%;border:none;pointer-events:none;" allow="autoplay"></iframe>`);
                } else {
                    this.loadSlideshow(movie); // Fallback на слайдшоу якщо немає трейлера
                }
            }, () => {
                this.loadSlideshow(movie);
            });
        };

        // Слайдшоу постерів TMDB
        this.loadSlideshow = function (movie) {
            let id = movie.id;
            let type = movie.name ? 'tv' : 'movie';

            network.silent(`https://api.themoviedb.org/3/${type}/${id}/images?api_key=4ef0ecd7c5d4dda4661e92a49f96b27e`, (data) => {
                let backdrops = data.backdrops || [];
                if (backdrops.length > 0) {
                    current_posters = backdrops.map(b => `https://image.tmdb.org/t/p/${settings.slideshow_quality}${b.file_path}`);
                    current_poster_index = 0;
                    
                    let img_el = $(`<div style="width:100%;height:100%;background-size:cover;background-position:center;transition:background-image 1s ease-in-out;"></div>`);
                    background_container.html(img_el);
                    
                    this.changeSlide(img_el);
                    slideshow_timer = setInterval(() => {
                        this.changeSlide(img_el);
                    }, settings.slideshow_interval);
                }
            });
        };

        this.changeSlide = function (el) {
            if (current_posters.length === 0) return;
            el.css('background-image', `url(${current_posters[current_poster_index]})`);
            current_poster_index = (current_poster_index + 1) % current_posters.length;
        };

        // Графічні логотипи TMDB + Пікер + Автоінвертування
        this.setLogo = function (element, movie) {
            let title_block = element.find('.full-start__title');
            let id = movie.id;
            let type = movie.name ? 'tv' : 'movie';

            // Перевірка збереженого ручного вибору користувача
            let custom_logo = Lampa.Storage.get(PLUGIN_NAME + '_logo_' + id);
            if (custom_logo) {
                this.applyLogoImage(title_block, custom_logo, movie, element);
                return;
            }

            network.silent(`https://api.themoviedb.org/3/${type}/${id}/images?api_key=4ef0ecd7c5d4dda4661e92a49f96b27e&include_image_language=ru,en,uk,null`, (data) => {
                let logos = data.logos || [];
                // Шукаємо українську, руську або англійську
                let logo = logos.find(l => l.iso_639_1 === 'uk') || logos.find(l => l.iso_639_1 === 'ru') || logos.find(l => l.iso_639_1 === 'en') || logos[0];

                if (logo) {
                    let logo_url = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
                    this.applyLogoImage(title_block, logo_url, movie, element);
                }
            });
        };

        this.applyLogoImage = function (title_block, url, movie, root_element) {
            let img = $(`<img class="card-lite-tmdb-logo" src="${url}" alt="logo" style="max-height: 80px; max-width: 300px; object-fit: contain; cursor: pointer;" />`);
            
            if (settings.logo_auto_invert) {
                img.css('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))');
            }

            // Додаємо обробник кліку для ручного вибору (пікер)
            img.on('hover:enter click', () => {
                this.openLogoPicker(movie, root_element);
            });

            title_block.html(img);
        };

        // Вікно вибору логотипа (Пікер)
        this.openLogoPicker = function (movie, root_element) {
            let id = movie.id;
            let type = movie.name ? 'tv' : 'movie';

            network.silent(`https://api.themoviedb.org/3/${type}/${id}/images?api_key=4ef0ecd7c5d4dda4661e92a49f96b27e`, (data) => {
                let logos = data.logos || [];
                let items = logos.map(l => {
                    return {
                        title: l.iso_639_1 ? l.iso_639_1.toUpperCase() : 'Original',
                        background: `https://image.tmdb.org/t/p/w300${l.file_path}`,
                        url: `https://image.tmdb.org/t/p/w500${l.file_path}`
                    };
                });

                if (items.length === 0) {
                    Lampa.Noty.show('Логотипів не знайдено');
                    return;
                }

                Lampa.Select.show({
                    title: 'Виберіть логотип',
                    items: items,
                    onSelect: (a) => {
                        Lampa.Storage.set(PLUGIN_NAME + '_logo_' + id, a.url);
                        this.setLogo(root_element, movie);
                        Lampa.Noty.show('Логотип змінено успішно');
                    },
                    onBack: () => {
                        Lampa.Controller.toggle('full_start');
                    }
                });
            });
        };

        this.destroy = function () {
            if (slideshow_timer) clearInterval(slideshow_timer);
        };
    }

    // Додавання CSS стилів для компонування та мобільного центрування
    $('<style>').prop('type', 'text/css').html(`
        @media screen and (max-width: 768px) {
            .full-start__tail, .full-start__title, .full-start__actions, .full-start__body {
                text-align: center !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .full-start__buttons {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
        }
        .card-lite-fusion-wrap {
            position: relative;
        }
    `).appendTo('head');

    // Реєстрація плагіна в Lampa
    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                let fusion = new CardLiteFusion();
                fusion.setBackground(e.object.activity.render(), e.data);
                fusion.setLogo(e.object.activity.render(), e.data);
            }
        });
    }

    function initializePlugin() {
        console.log(PLUGIN_NAME, 'ініціалізовано успішно');
    }

})();
