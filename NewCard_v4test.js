(function () {
    "use strict";

    var CardifyLite = {
        bgPlayer: null,
        rotationTimer: null,

        init: function () {
            var _this = this;
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') {
                    _this.start();
                }
            });
        },

        start: function () {
            this.addStyles();
            this.replaceTemplate(); // Ключова відмінність оригіналу
            this.addSettings();
            this.listenActivity();
        },

        // 1. ПОВНА ЗАМІНА ШАБЛОНУ (Як в оригіналі)
        replaceTemplate: function () {
            Lampa.Template.add('full_start_new', 
                '<div class="full-start-new cardify-lite">' +
                    '<div class="cardify-bg-container"></div>' + // Місце для відео/слайдшоу
                    '<div class="cardify-effects-overlay"></div>' + // Шар градієнтів
                    '<div class="full-start-new__body">' +
                        '<div class="full-start-new__left">' +
                            '<div class="full-start-new__poster">' +
                                '<img class="full--poster" src="{poster}" />' +
                            '</div>' +
                        '</div>' +
                        '<div class="full-start-new__right">' +
                            '<div class="full-start-new__title">{title}</div>' +
                            '<div class="full-start-new__details"></div>' +
                            '<div class="full-start-new__buttons"></div>' +
                            '<div class="full-start-new__description">{tagline}</div>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        },

        addStyles: function () {
            var style = '<style>' +
                '.cardify-lite { position: relative; background: #000; overflow: hidden; }' +
                '.cardify-lite .full-start-new__body { position: relative; z-index: 10; padding: 3.5em 3em; display: flex; }' +
                '.cardify-lite .full--poster { width: 20em; border-radius: 0.8em; box-shadow: 0 1em 3em rgba(0,0,0,0.8); }' +
                '.cardify-lite .full-start-new__title { font-size: 3.5em; font-weight: bold; margin-bottom: 0.2em; text-shadow: 0 2px 10px rgba(0,0,0,0.9); }' +
                
                /* Оверлей градієнтів */
                '.cardify-effects-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 2; ' +
                'background: linear-gradient(70deg, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%), ' +
                'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 40%); transition: opacity 0.5s; }' +
                
                /* Контейнер для медіа */
                '.cardify-bg-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }' +
                '.cardify-bg-container iframe { width: 100%; height: 100%; transform: scale(1.3); pointer-events: none; border: none; }' +
                '.cardify-bg-image { width: 100%; height: 100%; background-size: cover; background-position: center; transition: opacity 1s ease-in-out; position: absolute; top: 0; left: 0; }' +
                '</style>';
            $('body').append(style);
        },

        listenActivity: function () {
            var _this = this;
            Lampa.Subscribe.follow('full', function (e) {
                if (e.type == 'complete') {
                    _this.renderMedia(e);
                }
                if (e.type == 'destroy') {
                    _this.clear();
                }
            });
        },

        renderMedia: function (e) {
            var _this = this;
            var render = e.object.activity.render();
            var container = render.find('.cardify-bg-container');
            var data = e.data.movie || e.data.tv;

            // 1. Пріоритет Трейлера
            if (Lampa.Storage.field('cardify_lite_trailers') && data.videos && data.videos.results.length) {
                var trailer = data.videos.results.find(function(v) { return v.iso_639_1 === 'uk'; }) || 
                              data.videos.results.find(function(v) { return v.type === 'Trailer'; }) || 
                              data.videos.results[0];

                if (trailer && trailer.site === 'YouTube') {
                    this.playVideo(trailer.key, container);
                    return;
                }
            }

            // 2. Фолбек на Слайдшоу
            if (Lampa.Storage.field('cardify_lite_slideshow')) {
                this.playSlideshow(data, container);
            }
        },

        playVideo: function (key, container) {
            var _this = this;
            container.html('<div id="cardify-player"></div>');
            
            this.initYT(function() {
                _this.bgPlayer = new window.YT.Player('cardify-player', {
                    videoId: key,
                    playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: key, rel: 0, showinfo: 0, iv_load_policy: 3 },
                    events: {
                        onReady: function(ev) { ev.target.playVideo(); }
                    }
                });
            });
        },

        playSlideshow: function (data, container) {
            var _this = this;
            var type = data.number_of_seasons ? 'tv' : 'movie';
            
            Lampa.Api.sources.tmdb.get(type + '/' + data.id + '/images', {}, function (res) {
                if (res.backdrops && res.backdrops.length > 0) {
                    var images = res.backdrops.slice(0, 10);
                    var idx = 0;
                    
                    var displayImage = function() {
                        var url = 'https://image.tmdb.org/t/p/w1280' + images[idx].file_path;
                        var imgTag = $('<div class="cardify-bg-image"></div>').css({
                            'background-image': 'url(' + url + ')',
                            'opacity': 0
                        });
                        
                        container.append(imgTag);
                        imgTag.animate({ opacity: 1 }, 1000);
                        
                        if (container.children().length > 1) {
                            $(container.children()[0]).animate({ opacity: 0 }, 1000, function() { $(this).remove(); });
                        }
                        idx = (idx + 1) % images.length;
                    };

                    displayImage();
                    _this.rotationTimer = setInterval(displayImage, 8000);
                }
            });
        },

        initYT: function (cb) {
            if (window.YT && window.YT.Player) return cb();
            window.onYouTubeIframeAPIReady = cb;
            if (!$('script[src*="youtube.com/iframe_api"]').length) {
                var s = document.createElement('script');
                s.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(s);
            }
        },

        clear: function () {
            if (this.rotationTimer) clearInterval(this.rotationTimer);
            if (this.bgPlayer && this.bgPlayer.destroy) this.bgPlayer.destroy();
        },

        addSettings: function () {
            Lampa.SettingsApi.addComponent({ component: 'cardify_lite', name: 'Cardify Lite' });
            Lampa.SettingsApi.addParam({
                component: 'cardify_lite',
                param: { name: 'cardify_lite_trailers', type: 'trigger', default: true },
                field: { name: 'Трейлери', description: 'Відео замість фону' }
            });
            Lampa.SettingsApi.addParam({
                component: 'cardify_lite',
                param: { name: 'cardify_lite_slideshow', type: 'trigger', default: true },
                field: { name: 'Слайд-шоу', description: 'Динамічні картинки' }
            });
        }
    };

    CardifyLite.init();
})();
