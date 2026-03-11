(function () {
    "use strict";

    var CardifyLite = {
        rotationTimer: null,
        bgPlayer: null,

        init: function () {
            var _this = this;
            // Реєструємо плагін у системі
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    _this.start();
                }
            });
        },

        start: function () {
            this.addStyles();
            this.addSettings();
            this.listenActivity();
        },

        addStyles: function () {
            var style = '<style>' +
                '.cardify-lite .full-start-new__body { position: relative; z-index: 2; }' +
                '.cardify-effects-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%); transition: background 0.5s ease; }' +
                '.cardify-effects-overlay.cardify-scrolled { background: rgba(0,0,0,0.7); }' +
                '.cardify-bg-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; background: #000; }' +
                '.cardify-bg-container iframe { width: 100vw; height: 56.25vw; min-height: 100vh; min-width: 177.77vh; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1.1); }' +
                '</style>';
            $('body').append(style);
        },

        listenActivity: function () {
            var _this = this;
            Lampa.Subscribe.follow('full', function (e) {
                if (e.type == 'complete') {
                    _this.cleanUp(); // Очищуємо старі таймери/плеєри
                    _this.applyTransform(e);
                }
                if (e.type == 'destroy') {
                    _this.cleanUp();
                }
            });
        },

        applyTransform: function (e) {
            var _this = this;
            var render = e.object.activity.render();
            
            // Додаємо клас для кастомних стилів
            render.find('.full-start-new').addClass('cardify-lite');

            // Вставляємо оверлей
            var overlay = $('<div class="cardify-effects-overlay"></div>');
            render.find('.full-start__background').after(overlay);

            // Обробка скролу
            var titleEl = render.find('.full-start-new__title')[0];
            if (titleEl && window.IntersectionObserver) {
                var observer = new IntersectionObserver(function (entries) {
                    if (!entries[0].isIntersecting) overlay.addClass('cardify-scrolled');
                    else overlay.removeClass('cardify-scrolled');
                }, { threshold: 0 });
                observer.observe(titleEl);
            }

            // Запуск медіа (Трейлер або Слайдшоу)
            var data = e.data.movie || e.data.tv;
            if (Lampa.Storage.field('cardify_lite_trailers')) {
                _this.tryTrailer(data, render);
            } else {
                _this.trySlideshow(data, render);
            }
        },

        tryTrailer: function (data, render) {
            var _this = this;
            // Перевіряємо наявність відео в об'єкті
            if (data.videos && data.videos.results.length) {
                var trailer = data.videos.results.find(function(v) { return v.iso_639_1 === 'uk'; }) || 
                              data.videos.results.find(function(v) { return v.type === 'Trailer'; }) || 
                              data.videos.results[0];

                if (trailer && trailer.site === 'YouTube') {
                    var container = $('<div class="cardify-bg-container"><div id="cardify-yt-player"></div></div>');
                    render.find('.cardify-effects-overlay').before(container);

                    _this.initYT(function() {
                        _this.bgPlayer = new window.YT.Player('cardify-yt-player', {
                            videoId: trailer.key,
                            playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: trailer.key, rel: 0 },
                            events: { onReady: function(ev) { ev.target.playVideo(); } }
                        });
                    });
                }
            } else {
                this.trySlideshow(data, render); // Якщо відео немає - вмикаємо слайдшоу
            }
        },

        initYT: function (callback) {
            if (window.YT && window.YT.Player) return callback();
            window.onYouTubeIframeAPIReady = callback;
            if (!$('script[src*="youtube.com/iframe_api"]').length) {
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
        },

        trySlideshow: function (data, render) {
            var _this = this;
            var type = data.number_of_seasons ? 'tv' : 'movie';
            
            Lampa.Api.sources.tmdb.get(type + '/' + data.id + '/images', {}, function (res) {
                if (res.backdrops && res.backdrops.length > 1) {
                    var photos = res.backdrops.slice(0, 10);
                    var i = 0;
                    _this.rotationTimer = setInterval(function () {
                        i = (i + 1) % photos.length;
                        var url = 'https://image.tmdb.org/t/p/w1280' + photos[i].file_path;
                        var currentBg = render.find('.full-start__background');
                        
                        var nextBg = currentBg.clone().attr('src', url).css({ 'opacity': 0, 'position': 'absolute', 'z-index': 0 });
                        currentBg.after(nextBg);
                        
                        nextBg.animate({ opacity: 1 }, 1000);
                        currentBg.animate({ opacity: 0 }, 1000, function() { $(this).remove(); });
                    }, 7000);
                }
            });
        },

        cleanUp: function () {
            if (this.rotationTimer) clearInterval(this.rotationTimer);
            if (this.bgPlayer && this.bgPlayer.destroy) this.bgPlayer.destroy();
            $('.cardify-bg-container').remove();
        },

        addSettings: function () {
            Lampa.SettingsApi.addComponent({ component: 'cardify_lite', name: 'Cardify Lite', icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="white"/></svg>' });
            Lampa.SettingsApi.addParam({
                component: 'cardify_lite',
                param: { name: 'cardify_lite_trailers', type: 'trigger', default: true },
                field: { name: 'Фонові трейлери', description: 'Замінює статичний фон на відео з YouTube' }
            });
        }
    };

    CardifyLite.init();
})();

