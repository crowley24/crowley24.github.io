(function () {
    'use strict';

    // --- Параметри та Хост (використовується для заглушки, оскільки ми не завантажуємо зображення) ---
    var TRAILER_PLUGIN_NAME = 'trailer_only';
    var YOUTUBE_PLAYER_WIDTH = 400;
    var YOUTUBE_PLAYER_HEIGHT = 225;

    // --- 1. Клас YouTube Player (Спрощений) ---
    class Player {
        constructor(video, mute_button) {
            this.paused = false;
            this.display = false;
            this.isMuted = true;
            this.mute_button = mute_button;
            this.listener = Lampa.Subscribe();
            this.timer = null;

            // Елемент для вбудовування
            this.html = $(`
                <div class="cardify-trailer ${TRAILER_PLUGIN_NAME}__player">
                    <div class="${TRAILER_PLUGIN_NAME}__youtube-iframe"></div>
                </div>
            `);

            // Перевіряємо, чи завантажено API YouTube
            if (typeof YT !== 'undefined' && YT.Player) {
                this.youtube = new YT.Player(this.html.find(`.${TRAILER_PLUGIN_NAME}__youtube-iframe`)[0], {
                    height: YOUTUBE_PLAYER_HEIGHT,
                    width: YOUTUBE_PLAYER_WIDTH,
                    playerVars: {
                        'controls': 1,
                        'showinfo': 0,
                        'autohide': 1,
                        'modestbranding': 1,
                        'autoplay': 0, // Потрібно для ініціалізації, playVideo() викликаємо пізніше
                        'disablekb': 1,
                        'fs': 0,
                        'enablejsapi': 1,
                        'playsinline': 1,
                        'rel': 0,
                        'mute': 1 // Завжди починаємо з Mute для коректного автозапуску
                    },
                    videoId: video.id,
                    events: {
                        onReady: (event) => {
                            this.loaded = true;
                            this.listener.send('loaded');
                        },
                        onStateChange: (state) => {
                            if (state.data == YT.PlayerState.PLAYING) {
                                this.paused = false;
                                clearInterval(this.timer);
                                
                                // Логіка плавного зменшення гучності наприкінці (з вашого прикладу)
                                this.timer = setInterval(() => {
                                    const left = this.youtube.getDuration() - this.youtube.getCurrentTime();
                                    const toend = 13;
                                    const fade = 5;

                                    if (left <= toend + fade) {
                                        const vol = 1 - (toend + fade - left) / fade;
                                        this.youtube.setVolume(Math.max(0, vol * 100));

                                        if (left <= toend) {
                                            clearInterval(this.timer);
                                            this.listener.send('ended');
                                        }
                                    }
                                }, 100);

                                this.listener.send('play');
                                // Якщо користувач вже розм'ютував хоч раз, розм'ютуємо знову
                                if (window.trailer_fist_unmute) this.unmute(true);

                            } else if (state.data == YT.PlayerState.PAUSED) {
                                this.paused = true;
                                clearInterval(this.timer);
                                this.listener.send('paused');
                            } else if (state.data == YT.PlayerState.ENDED) {
                                this.listener.send('ended');
                            }
                        },
                        onError: (e) => {
                            this.loaded = false;
                            this.listener.send('error');
                        }
                    }
                });
            }
        }

        play() {
            try { this.youtube.playVideo(); } catch (e) {}
        }

        pause() {
            try { this.youtube.pauseVideo(); } catch (e) {}
        }

        /**
         * Увімкнути/вимкнути звук.
         * @param {boolean} force_unmute_only - Якщо true, тільки розм'ютує, інакше - перемикає.
         */
        unmute(force_unmute_only = false) {
            try {
                if (force_unmute_only && !this.isMuted) return; // Нічого не робити, якщо вже розм'ютано і вимагаємо тільки розм'ют
                
                if (this.isMuted) {
                    this.youtube.unMute();
                    this.isMuted = false;
                    this.mute_button.find('svg').html(this.getSoundOnIcon());
                    this.mute_button.find('span').text(Lampa.Lang.translate('trailer_disable_sound'));
                } else {
                    if (force_unmute_only) return; // Пропускаємо, якщо вимагаємо тільки розм'ют
                    this.youtube.mute();
                    this.isMuted = true;
                    this.mute_button.find('svg').html(this.getSoundOffIcon());
                    this.mute_button.find('span').text(Lampa.Lang.translate('trailer_enable_sound'));
                }
                window.trailer_fist_unmute = true; // Запам'ятовуємо, що користувач взаємодіяв
            } catch (e) {}
        }

        getSoundOffIcon() {
            return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>' +
                   '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/>' +
                   '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/>';
        }

        getSoundOnIcon() {
            return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +
                   '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +
                   '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="currentColor"/>';
        }

        show() {
            this.html.addClass('display');
            this.display = true;
        }

        hide() {
            this.html.removeClass('display');
            this.display = false;
        }

        render() {
            return this.html;
        }

        destroy() {
            this.loaded = false;
            this.display = false;
            try { this.youtube.destroy(); } catch (e) {}
            clearInterval(this.timer);
            this.html.remove();
        }
    }

    // --- 2. Менеджер Трейлера (Спрощений) ---
    class TrailerManager {
        constructor(activity_object, video) {
            this.activity = activity_object;
            this.video = video;
            this.player = null;
            this.timer_show = null;
            this.timer_load = null;
            this.mute_button = null;

            this.init();
        }

        sameActivity() {
            return Lampa.Activity.active().activity === this.activity.activity;
        }

        init() {
            const self = this;
            const full_start_el = this.activity.render();
            const $buttons_container = full_start_el.find('.full-start-new__buttons, .full-start__buttons'); // Підтримка обох шаблонів

            // 1. Створюємо кнопку Mute, якщо її немає
            let $mute_button = full_start_el.find(`.${TRAILER_PLUGIN_NAME}-mute-button`);
            if ($mute_button.length === 0) {
                 const mute_html = `
                    <div class="full-start__button selector button--mute ${TRAILER_PLUGIN_NAME}-mute-button hide">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            ${new Player().getSoundOffIcon()}
                        </svg>
                        <span>${Lampa.Lang.translate('trailer_enable_sound')}</span>
                    </div>`;
                
                // Вставляємо кнопку перед кнопкою "опції", якщо є, або в кінець
                const $options_button = $buttons_container.find('.button--options');
                if ($options_button.length) {
                    $options_button.before(mute_html);
                } else {
                    $buttons_container.append(mute_html);
                }
                $mute_button = full_start_el.find(`.${TRAILER_PLUGIN_NAME}-mute-button`);
            }
            this.mute_button = $mute_button;

            // 2. Ініціалізуємо плеєр
            this.player = new Player(this.video, this.mute_button);
            
            // Вставляємо плеєр
            full_start_el.find('.activity__body').prepend(this.player.render());

            // 3. Підписки на події плеєра
            this.player.listener.follow('loaded', () => {
                // Плеєр завантажився, починаємо відтворення
                if (this.sameActivity() && Lampa.Controller.enabled().name === 'full_start') {
                    this.player.play();
                }
            });

            this.player.listener.follow('play', () => {
                this.mute_button.removeClass('hide');
                
                clearTimeout(this.timer_show);
                // Затримка, щоб показати плеєр після початку відтворення
                this.timer_show = setTimeout(() => {
                    this.player.show();
                    this.setupController();
                }, 500);
            });

            this.player.listener.follow('ended,error', () => {
                this.hideAndDestroy();
            });

            // 4. Підписки на події Lampa
            const onToggle = (e) => {
                if (e.name === 'full_start' && this.sameActivity()) {
                    // Фокус повернувся на full_start, відновлюємо відтворення
                    this.player.play();
                    this.mute_button.removeClass('hide');
                } else {
                    // Фокус пішов з full_start, ставимо на паузу та приховуємо
                    this.player.pause();
                    this.player.hide();
                    this.mute_button.addClass('hide');
                }
            };
            
            const onDestroy = (e) => {
                if (e.type == 'destroy' && e.object.activity === self.activity.activity) {
                    this.hideAndDestroy();
                    Lampa.Listener.remove('activity', onDestroy);
                    Lampa.Controller.listener.remove('toggle', onToggle);
                }
            };

            Lampa.Listener.follow('activity', onDestroy);
            Lampa.Controller.listener.follow('toggle', onToggle);

            // 5. Обробник натискання на кнопку Mute
            $mute_button.on('hover:enter', () => {
                this.player.unmute();
            });
        }

        // --- Controller для керування трейлером ---
        setupController() {
            const self = this;
            
            // Створюємо контролер для керування плеєром, коли він активний
            Lampa.Controller.add(`${TRAILER_PLUGIN_NAME}_controller`, {
                toggle: function() {
                    // Якщо викликали toggle, повертаємо управління на full_start, 
                    // що викличе onToggle і приховає трейлер
                    Lampa.Controller.toggle('full_start');
                },
                enter: function() {
                    // Натискання Enter на трейлері - розм'ютити
                    self.player.unmute();
                },
                // Навігація повертає управління на full_start і симулює рух
                back: function() {
                    // Натискання Back/Return - закрити трейлер
                    self.hideAndDestroy();
                    Lampa.Controller.toggle('full_start');
                },
                left: function() { Lampa.Controller.toggle('full_start'); Lampa.Controller.move('left'); },
                up: function() { Lampa.Controller.toggle('full_start'); Lampa.Controller.move('up'); },
                down: function() { Lampa.Controller.toggle('full_start'); Lampa.Controller.move('down'); },
                right: function() { Lampa.Controller.toggle('full_start'); Lampa.Controller.move('right'); }
            });

            // Перемикаємо на новий контролер, щоб кнопка Mute була активною.
            // Приховуємо трейлер, якщо фокус пішов з full_start.
            // Оскільки кнопка Mute знаходиться на full_start, нам потрібно, щоб контролер full_start
            // мав спеціальну логіку. Але для простоти, ми просто дозволимо кнопці Mute працювати 
            // в рамках full_start контролера, якщо він є.
            
            // Оскільки ми хочемо, щоб трейлер був "фокусом", як у вашому прикладі,
            // ми маємо перевірити, чи активний full_start, і якщо так, дати можливість 
            // кнопці Mute бути "наступним" фокусом.
            
            // Якщо контролер full_start вже доданий, ми просто розм'ючуємо.
            // Щоб уникнути створення окремого контролера, ми покладаємося на те, що 
            // кнопка Mute є частиною full_start і буде оброблена ним.
            
            // Просто забезпечуємо, що full_start активний, щоб ми могли натиснути Mute
            if(Lampa.Controller.enabled().name !== 'full_start') {
                Lampa.Controller.toggle('full_start');
            }
        }

        hideAndDestroy() {
            clearTimeout(this.timer_load);
            clearTimeout(this.timer_show);
            this.player.pause();
            this.player.hide();
            this.player.destroy();
            
            if (this.mute_button) {
                this.mute_button.off('hover:enter').addClass('hide');
            }
            
            // Видаляємо допоміжний елемент контролера
            Lampa.Controller.remove(`${TRAILER_PLUGIN_NAME}_controller`);
        }
    }

    // --- 3. Утиліта: Пошук найкращого трейлера ---
    function video(data) {
      if (data.videos && data.videos.results.length) {
        let items = [];
        data.videos.results.forEach(function (element) {
          items.push({
            title: Lampa.Utils.shortText(element.name, 50),
            id: element.key,
            code: element.iso_639_1,
            time: new Date(element.published_at).getTime()
          });
        });
        
        // Сортуємо за датою (найновіший)
        items.sort((a, b) => (a.time > b.time ? -1 : a.time < b.time ? 1 : 0));
        
        // Шукаємо трейлер мовою користувача
        const user_lang = Lampa.Storage.field('tmdb_lang');
        let best_video = items.find(n => n.code === user_lang);

        // Якщо не знайдено, шукаємо англійською
        if (!best_video) {
            best_video = items.find(n => n.code === 'en');
        }

        // Якщо не знайдено, беремо будь-який найновіший
        if (!best_video) {
            best_video = items[0];
        }
        
        return best_video;
      }
      return null;
    }

    // --- 4. Налаштування Lampa та Хуки ---
    function startPlugin() {
        if (!Lampa.Platform.screen('tv')) return;

        // 4.1. Додавання перекладів
        Lampa.Lang.add({
            trailer_enable_sound: { ru: 'Включить звук', en: 'Enable sound', uk: 'Увімкнути звук' },
            trailer_disable_sound: { ru: 'Выключить звук', en: 'Disable sound', uk: 'Вимкнути звук' },
            trailer_auto_play: { ru: 'Автозапуск трейлера', en: 'Autoplay trailer', uk: 'Автозапуск трейлера' }
        });

        // 4.2. Додавання налаштування
        Lampa.SettingsApi.addParam({
            component: 'other', // Додаємо в 'Інше'
            param: {
                name: 'trailer_auto_play',
                type: 'trigger',
                "default": true
            },
            field: {
                name: Lampa.Lang.translate('trailer_auto_play'),
                description: Lampa.Lang.translate('trailer_auto_play')
            }
        });
        
        // 4.3. Стилі для плеєра
        const style = `
            <style>
                .${TRAILER_PLUGIN_NAME}__player {
                    opacity: 0;
                    transition: opacity .3s;
                    z-index: 1000;
                }
                .${TRAILER_PLUGIN_NAME}__player.display {
                    opacity: 1;
                }
                .${TRAILER_PLUGIN_NAME}__player {
                    background-color: #000;
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: ${YOUTUBE_PLAYER_WIDTH}px;
                    height: ${YOUTUBE_PLAYER_HEIGHT}px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .${TRAILER_PLUGIN_NAME}__youtube-iframe iframe {
                    border: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                }
                /* Стиль для кнопки Mute, щоб вона була в одному ряду з іншими */
                .full-start-new__buttons .${TRAILER_PLUGIN_NAME}-mute-button,
                .full-start__buttons .${TRAILER_PLUGIN_NAME}-mute-button {
                    /* Додаткові стилі, якщо необхідно */
                }
            </style>
        `;
        $('body').append(style);

        // 4.4. Хук на завантаження картки фільму
        Lampa.Listener.follow('full_start', function(e) {
            // Перевіряємо налаштування та платформу
            if (!Lampa.Storage.field('trailer_auto_play') || Lampa.Platform.screen('mobile')) return;

            // Хук на завершення завантаження даних картки
            e.object.listener.follow('complite', function(data) {
                // Використовуємо тимчасове поле для запобігання подвійній ініціалізації
                if (e.object[`${TRAILER_PLUGIN_NAME}_initialized`]) return; 

                const trailer_video = video(data.data); 

                if (trailer_video) {
                    new TrailerManager(e.object, trailer_video);
                    e.object[`${TRAILER_PLUGIN_NAME}_initialized`] = true;
                }
            });
        });
    }

    // --- Запуск плагіна ---
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') startPlugin();
    });

})();

