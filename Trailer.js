(function () {
    'use strict';

    const TRAILER_PLUGIN_NAME = 'trailer_only';
    const YOUTUBE_PLAYER_WIDTH = 400;
    const YOUTUBE_PLAYER_HEIGHT = 225;
    
    // Глобальна змінна для перевірки першого розм'ютування
    window.trailer_fist_unmute = false;

    // --- 1. Клас YouTube Player (Виправлений) ---
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
                        'autoplay': 0, 
                        'disablekb': 1,
                        'fs': 0,
                        'enablejsapi': 1,
                        'playsinline': 1,
                        'rel': 0,
                        'mute': 1
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

        unmute(force_unmute_only = false) {
            try {
                if (force_unmute_only && !this.isMuted) return;
                
                if (this.isMuted) {
                    this.youtube.unMute();
                    this.isMuted = false;
                    this.mute_button.find('svg').html(this.getSoundOnIcon());
                    this.mute_button.find('span').text(Lampa.Lang.translate('trailer_disable_sound'));
                } else {
                    if (force_unmute_only) return;
                    this.youtube.mute();
                    this.isMuted = true;
                    this.mute_button.find('svg').html(this.getSoundOffIcon());
                    this.mute_button.find('span').text(Lampa.Lang.translate('trailer_enable_sound'));
                }
                window.trailer_fist_unmute = true;
            } catch (e) {}
        }

        // Іконки виносяться як статичні методи, щоб їх можна було викликати до створення об'єкта
        static getSoundOffIcon() {
            return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>' +
                   '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/>' +
                   '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/>';
        }

        static getSoundOnIcon() {
            return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +
                   '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +
                   '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="currentColor"/>';
        }
        
        getSoundOffIcon() { return Player.getSoundOffIcon(); }
        getSoundOnIcon() { return Player.getSoundOnIcon(); }


        show() {
            this.html.addClass('display');
            this.display = true;
            $('body').addClass(`${TRAILER_PLUGIN_NAME}-active`); // Додаємо клас для CSS
        }

        hide() {
            this.html.removeClass('display');
            this.display = false;
            $('body').removeClass(`${TRAILER_PLUGIN_NAME}-active`);
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
            $('body').removeClass(`${TRAILER_PLUGIN_NAME}-active`);
        }
    }

    // --- 2. Менеджер Трейлера ---
    class TrailerManager {
        constructor(activity_object, video) {
            this.activity = activity_object;
            this.video = video;
            this.player = null;
            this.timer_show = null;
            this.mute_button = null;

            this.init();
        }

        sameActivity() {
            return Lampa.Activity.active().activity === this.activity.activity;
        }

        init() {
            const self = this;
            const full_start_el = this.activity.render();
            // Шукаємо контейнер для кнопок, підтримуючи обидва шаблони
            const $buttons_container = full_start_el.find('.full-start-new__buttons, .full-start__buttons');

            // 1. Створюємо кнопку Mute
            let $mute_button = full_start_el.find(`.${TRAILER_PLUGIN_NAME}-mute-button`);
            if ($mute_button.length === 0) {
                 const mute_html = `
                    <div class="full-start__button selector button--mute ${TRAILER_PLUGIN_NAME}-mute-button hide">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            ${Player.getSoundOffIcon()}
                        </svg>
                        <span>${Lampa.Lang.translate('trailer_enable_sound')}</span>
                    </div>`;
                
                // Вставляємо кнопку перед кнопкою "опції" (button--options) або в кінець
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
            full_start_el.find('.activity__body').prepend(this.player.render());

            // 3. Підписки на події плеєра
            this.player.listener.follow('loaded', () => {
                if (this.sameActivity() && Lampa.Controller.enabled().name === 'full_start') {
                    this.player.play();
                }
            });

            this.player.listener.follow('play', () => {
                this.mute_button.removeClass('hide');
                clearTimeout(this.timer_show);
                
                // Після початку відтворення (і проходження фази муту) показуємо вікно
                this.timer_show = setTimeout(() => {
                    this.player.show();
                    // Контролер створюємо після того, як трейлер став видимим
                    this.setupController(); 
                }, 500); 
            });

            this.player.listener.follow('ended,error', () => {
                this.hideAndDestroy();
            });

            // 4. Підписки на події Lampa
            const onToggle = (e) => {
                // Трейлер повинен працювати тільки коли фокус на 'full_start'
                if (e.name === 'full_start' && this.sameActivity()) {
                    this.player.play();
                    this.player.show();
                    this.mute_button.removeClass('hide');
                } else {
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
                // Після натискання на кнопку Mute, залишаємо фокус на ній 
                // або повертаємо на основну кнопку Play
                Lampa.Controller.toggle('full_start');
                Lampa.Controller.collectionFocus();
            });
            
            // Якщо activity вже активна (наприклад, при повторному вході), запускаємо play
            if (Lampa.Controller.enabled().name === 'full_start' && Lampa.Activity.active().activity === this.activity.activity) {
                this.player.play();
            }
        }

        // --- Controller для керування трейлером ---
        setupController() {
            // Ми не створюємо окремий контролер для плеєра, а лише додаємо логіку на кнопку mute
            // Це мінімізує конфлікти з full_start.
        }

        hideAndDestroy() {
            clearTimeout(this.timer_show);
            this.player.pause();
            this.player.hide();
            this.player.destroy();
            
            if (this.mute_button) {
                this.mute_button.off('hover:enter').addClass('hide').remove(); // Видаляємо кнопку
            }
            
            this.activity[`${TRAILER_PLUGIN_NAME}_initialized`] = false;
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
        
        items.sort((a, b) => (a.time > b.time ? -1 : a.time < b.time ? 1 : 0));
        
        const user_lang = Lampa.Storage.field('tmdb_lang') || 'en';
        let best_video = items.find(n => n.code === user_lang);

        if (!best_video) {
            best_video = items.find(n => n.code === 'en');
        }

        return best_video || items[0];
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
            trailer_auto_play: { ru: 'Автозапуск трейлера (Cardify)', en: 'Autoplay trailer (Cardify)', uk: 'Автозапуск трейлера' }
        });

        // 4.2. Додавання налаштування (У власний компонент)
        Lampa.SettingsApi.addComponent({
            component: TRAILER_PLUGIN_NAME,
            name: Lampa.Lang.translate('trailer_auto_play'),
            icon: `<svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M22.25 1.75C23.2165 1.75 24 2.5335 24 3.5V21.5C24 22.4665 23.2165 23.25 22.25 23.25H2.75C1.7835 23.25 1 22.4665 1 21.5V3.5C1 2.5335 1.7835 1.75 2.75 1.75H22.25ZM2.75 0.25C1.0335 0.25 0 1.2835 0 3.5V21.5C0 23.7165 1.0335 24.75 2.75 24.75H22.25C23.9665 24.75 25 23.7165 25 21.5V3.5C25 1.2835 23.9665 0.25 22.25 0.25H2.75ZM16.5 12.5L8.25 17.25V7.75L16.5 12.5Z" fill="currentColor"/></svg>`
        });
        
        Lampa.SettingsApi.addParam({
            component: TRAILER_PLUGIN_NAME,
            param: {
                name: 'trailer_auto_play',
                type: 'trigger',
                "default": true
            },
            field: {
                name: Lampa.Lang.translate('trailer_auto_play')
            }
        });
        
        // 4.3. Стилі для плеєра
        const style = `
            <style>
                .${TRAILER_PLUGIN_NAME}__player {
                    opacity: 0;
                    transition: opacity .3s;
                    z-index: 10000; /* Дуже високий z-index */
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
                    pointer-events: none; /* Забороняємо кліки, щоб не перебивати фокус */
                }
                .${TRAILER_PLUGIN_NAME}__youtube-iframe iframe {
                    border: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                }
                /* Скриваємо кнопку Mute, якщо трейлер неактивний */
                .full-start__button.button--mute.${TRAILER_PLUGIN_NAME}-mute-button.hide {
                    display: none;
                }
            </style>
        `;
        $('body').append(style);

        // 4.4. Хук на завантаження картки фільму
        Lampa.Listener.follow('full_start', function(e) {
            // Перевіряємо налаштування і запобігаємо повторній ініціалізації
            if (!Lampa.Storage.field('trailer_auto_play') || Lampa.Platform.screen('mobile') || e.object[`${TRAILER_PLUGIN_NAME}_initialized`]) return;

            e.object.listener.follow('complite', function(data) {
                // Повторна перевірка налаштувань
                if (!Lampa.Storage.field('trailer_auto_play') || e.object[`${TRAILER_PLUGIN_NAME}_initialized`]) return;

                const trailer_video = video(data.data); 

                if (trailer_video) {
                    new TrailerManager(e.object, trailer_video);
                    e.object[`${TRAILER_PLUGIN_NAME}_initialized`] = true;
                }
            });
        });
    }

    // --- Запуск плагіна ---
    // Якщо Lampa вже готова, запускаємо негайно, інакше чекаємо на подію 'ready'
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') startPlugin();
    });

})();

