(function () {
    "use strict";

    var CardifyLite = {
        rotationTimer: null,
        bgPlayer: null,

        // --- 1. Ініціалізація ---
        init: function () {
            var _this = this;
            
            // Чекаємо готовності Lampa
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    _this.start();
                }
            });
        },

        start: function () {
            this.addStyles();
            this.addTemplates();
            this.addSettings();
            this.listenActivity();
        },

        // --- 2. Візуальна трансформація (Макет та Стилі) ---
        addStyles: function () {
            var style = '<style>' +
                '.cardify-lite .full-start-new__body { height: 85vh; position: relative; }' +
                '.cardify-effects-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; background-image: linear-gradient(225deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%); transition: background-color 0.4s; }' +
                '.cardify-effects-overlay.cardify-scrolled { background-color: rgba(0,0,0,0.6); }' +
                '.cardify-trailer-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; overflow: hidden; background: #000; }' +
                '.cardify-trailer-container iframe { width: 100%; height: 100%; transform: scale(1.35); pointer-events: none; }' + // Zoom 35% для прибирання полос
                '.full-start-new__title { text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }' +
                '.full--poster { border-radius: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }' +
                '</style>';
            $('body').append(style);
        },

        addTemplates: function () {
            // Спрощений макет картки
            Lampa.Template.add('full_start_new', 
                '<div class="full-start-new cardify-lite">' +
                    '<div class="full-start-new__body">' +
                        '<div class="full-start-new__left">' +
                            '<div class="full-start-new__poster"><img class="full--poster" src="" /></div>' +
                        '</div>' +
                        '<div class="full-start-new__right">' +
                            '<div class="full-start-new__title">{title}</div>' +
                            '<div class="full-start-new__details"></div>' +
                            '<div class="full-start-new__buttons"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        },

        // --- 3. Логіка активності (IntersectionObserver та запуск фону) ---
        listenActivity: function () {
            var _this = this;
            Lampa.Subscribe.follow('full', function (e) {
                if (e.type == 'complete') {
                    var render = e.object.activity.render();
                    
                    // Додаємо оверлей градієнту
                    if (render.find('.cardify-effects-overlay').length === 0) {
                        render.find('.full-start__background').after('<div class="cardify-effects-overlay"></div>');
                    }

                    // Оптимізація: IntersectionObserver (якщо підтримується)
                    _this.initObserver(render);

                    // Визначаємо що запускати: Трейлер або Слайд-шоу
                    if (Lampa.Storage.field('cardify_lite_trailers')) {
                        _this.loadTrailer(e);
                    } else if (Lampa.Storage.field('cardify_lite_slideshow')) {
                        _this.loadSlideshow(e);
                    }
                }
            });
        },

        initObserver: function (render) {
            var titleEl = render.find('.full-start-new__title')[0];
            if (titleEl && window.IntersectionObserver) {
                var observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        var overlay = render.find('.cardify-effects-overlay');
                        if (!entry.isIntersecting) overlay.addClass('cardify-scrolled');
                        else overlay.removeClass('cardify-scrolled');
                    });
                }, { threshold: 0 });
                observer.observe(titleEl);
            }
        },

        // --- 4. Функціонал трейлерів ---
        loadTrailer: function (e) {
            var _this = this;
            var movie = e.data.movie || e.data.tv;
            if (!movie || !movie.videos || !movie.videos.results.length) return;

            // Шукаємо трейлер (UA -> EN)
            var video = movie.videos.results.find(function(v) { return v.iso_639_1 === 'uk'; }) || 
                        movie.videos.results.find(function(v) { return v.type === 'Trailer'; }) || 
                        movie.videos.results[0];

            if (video && video.site === 'YouTube') {
                var container = $('<div class="cardify-trailer-container"><div id="cardify-player"></div></div>');
                e.object.activity.render().find('.cardify-effects-overlay').before(container);

                _this.injectYouTubeAPI(function() {
                    _this.bgPlayer = new window.YT.Player('cardify-player', {
                        videoId: video.key,
                        playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: video.key },
                        events: {
                            onReady: function(ev) { ev.target.playVideo(); }
                        }
                    });
                });
            }
        },

        injectYouTubeAPI: function (callback) {
            if (window.YT && window.YT.Player) return callback();
            window.onYouTubeIframeAPIReady = callback;
            Lampa.Utils.putScript(['https://www.youtube.com/iframe_api'], function () {});
        },

        // --- 5. Слайд-шоу ---
        loadSlideshow: function (e) {
            var _this = this;
            var movie = e.data.movie || e.data.tv;
            var activity = e.object.activity;

            Lampa.Api.sources.tmdb.get((e.data.movie ? 'movie' : 'tv') + '/' + movie.id + '/images', {}, function (data) {
                if (data.backdrops && data.backdrops.length > 1) {
                    var images = data.backdrops.slice(0, 10);
                    var index = 0;
                    
                    if (_this.rotationTimer) clearInterval(_this.rotationTimer);
                    
                    _this.rotationTimer = setInterval(function () {
                        index = (index + 1) % images.length;
                        var imgUrl = 'https://image.tmdb.org/t/p/w1280' + images[index].file_path;
                        
                        var bg = activity.render().find('.full-start__background');
                        var newBg = bg.clone().attr('src', imgUrl).css('opacity', '0');
                        
                        bg.after(newBg);
                        newBg.animate({ opacity: 1 }, 1000);
                        bg.animate({ opacity: 0 }, 1000, function() { $(this).remove(); });
                    }, 8000);
                }
            });
        },

        addSettings: function () {
            Lampa.SettingsApi.addComponent({ component: 'cardify_lite', name: 'Cardify Lite', icon: '' });
            Lampa.SettingsApi.addParam({
                component: 'cardify_lite',
                param: { name: 'cardify_lite_trailers', type: 'trigger', default: true },
                field: { name: 'Фонові трейлери', description: 'Запускати відео замість фото' }
            });
            Lampa.SettingsApi.addParam({
                component: 'cardify_lite',
                param: { name: 'cardify_lite_slideshow', type: 'trigger', default: true },
                field: { name: 'Слайд-шоу', description: 'Плавно змінювати фонові зображення' }
            });
        }
    };

    CardifyLite.init();
})();

