(function () {
    'use strict';

    // --- КОНСТАНТИ ---
    const PLUGIN_ID = 'continue_watching_plugin';
    const STORAGE_KEY = 'cw_progress_list';
    const MAX_ITEMS = 50; // Максимальна кількість елементів в історії
    const COMPONENT_NAME = 'continue_watching_component';

    /**
     * @class ContinueWatchingPage
     * Сторінка для відображення історії перегляду
     */
    function ContinueWatchingPage() {
        // --- ПРИВАТНІ ЗМІННІ КОМПОНЕНТА ---
        let component = Lampa.Component.prototype.extend({
            name: COMPONENT_NAME,
            data: {
                title: 'Продовжити перегляд',
                history: [],
                loading: true,
                total_items: 0,
            },
            template: '', // Шаблон буде динамічно формуватися
        });

        // --- МЕТОДИ ЖИТТЄВОГО ЦИКЛУ ---
        component.onReady = function () {
            this.render();
            this.loadHistory();
        };

        component.onStart = function () {
            Lampa.Controller.add(this);
            Lampa.Background.set(Lampa.Utils.img('')); // Чистий фон
            this.toggle();
        };

        component.onRender = function () {
            this.parent = Lampa.Template.js('title_main');
            this.parent.addClass('loading');
            this.parent.find('.title').text(this.data.title);

            // Створюємо контейнер для карток
            this.list = Lampa.Template.js('scroll_main');
            this.list.empty();
            this.parent.append(this.list);

            this.parent.find('.title').append(`<span class="list-total"></span>`);

            // Додаємо кнопку "Очистити історію"
            const self = this;
            this.clear_btn = Lampa.Template.js('settings_link', {title: 'Очистити історію'});
            this.clear_btn.on('hover:focus', function(){
                Lampa.Controller.collection = self.list.find('.card');
                Lampa.Controller.set(self.clear_btn, self);
            });
            this.clear_btn.on('hover:click', this.clearHistory.bind(this));
            this.parent.append(this.clear_btn);

            Lampa.Controller.collection = this.list.find('.card');

            this.parent.find('.list-total').text(this.data.total_items);
        };

        // --- ЛОГІКА ДАНИХ ТА ВІДОБРАЖЕННЯ ---

        component.loadHistory = function () {
            try {
                this.data.history = Lampa.Storage.get(STORAGE_KEY, []);
                this.data.total_items = this.data.history.length;
                this.data.loading = false;
                this.buildCards();
            } catch (e) {
                console.error(`[${PLUGIN_ID}] Failed to load history:`, e);
                this.data.loading = false;
                Lampa.Noty.show('Помилка завантаження історії.');
            }
        };

        component.buildCards = function () {
            this.list.empty();
            this.parent.removeClass('loading');
            this.parent.find('.list-total').text(this.data.total_items);

            if (this.data.history.length === 0) {
                this.list.html('<div class="list-empty">Історія перегляду порожня.</div>');
                Lampa.Controller.collection = this.clear_btn;
                return;
            }

            this.data.history.forEach((item, index) => {
                const card = Lampa.Template.js('card', item);
                card.attr('data-id', index);

                // Додаємо накладання з прогресом
                const percent = Math.floor((item.time_watched / item.time_total) * 100);
                let overlay = Lampa.Template.js('card_overlay');
                overlay.find('.title').text('Продовжити');
                overlay.find('.progress').html(`<div class="progress__line" style="width: ${percent}%;"></div>`);
                card.find('.card__body').append(overlay);

                card.on('hover:focus', (e) => {
                    Lampa.Controller.collection = this.list.find('.card');
                    Lampa.Controller.set(e.target, this);
                });

                card.on('hover:click', () => {
                    Lampa.Player.continueWatching.resumePlayback(item);
                });

                this.list.append(card);
            });

            Lampa.Controller.collection = this.list.find('.card');
            Lampa.Controller.set(this.list.find('.card').eq(0));
        };

        component.clearHistory = function() {
            Lampa.Modal.open({
                title: 'Очистити історію?',
                text: 'Ви впевнені, що хочете повністю очистити список "Продовжити перегляд"?',
                buttons: [
                    { name: 'Так, очистити', onSelect: () => {
                        Lampa.Storage.set(STORAGE_KEY, []);
                        this.data.history = [];
                        this.data.total_items = 0;
                        this.buildCards();
                        Lampa.Modal.close();
                        Lampa.Noty.show('Історію очищено.');
                    }},
                    { name: 'Скасувати' }
                ]
            });
        };

        return component;
    }

    // --- ЛОГІКА ПЛАГІНА (ОСНОВНИЙ ОБ'ЄКТ) ---
    Lampa.Plugin.create({
        id: PLUGIN_ID,
        component: true,
        name: 'continue watching',
        version: '1.0.1',
        author: 'AI Assistant',
        
        methods: {
            // --- 1. МЕТОДИ СХОВИЩА ---
            getHistory: function () {
                try {
                    // Повертаємо останніх MAX_ITEMS переглядів
                    return Lampa.Storage.get(STORAGE_KEY, []).slice(0, MAX_ITEMS);
                } catch (e) {
                    console.error(`[${PLUGIN_ID}] Failed to load history:`, e);
                    return [];
                }
            },

            saveProgress: function (item) {
                let history = this.getHistory();

                // Унікальний ключ для фільму/серіалу/епізоду
                const uniqueKey = `${item.item_id}_s${item.season}_e${item.episode}`;

                const index = history.findIndex(i => 
                    `${i.item_id}_s${i.season}_e${i.episode}` === uniqueKey
                );

                // Оновлюємо або додаємо
                if (index !== -1) {
                    history[index] = item;
                } else {
                    history.unshift(item); // Додаємо на початок
                }

                try {
                    // Зберігаємо та обмежуємо розмір
                    Lampa.Storage.set(STORAGE_KEY, history.slice(0, MAX_ITEMS));
                    // console.log(`[${PLUGIN_ID}] Progress saved for: ${item.title}`);
                } catch (e) {
                    console.error(`[${PLUGIN_ID}] Failed to save history:`, e);
                }
            },

            // --- 2. ПЕРЕХОПЛЕННЯ ПОДІЙ ВІДТВОРЕННЯ ---
            listenForPlayerEvents: function () {
                Lampa.Listener.follow('player.close', (e) => {
                    const player = e.object; 
                    
                    if (!player || !player.duration || !Lampa.Player.card) return; 

                    const timeWatched = player.currentTime;
                    const totalDuration = player.duration;

                    // Якщо тривалість менше 60 секунд або час менше 1 секунди - ігноруємо
                    if (totalDuration < 60 || timeWatched < 1) return;

                    // Вважаємо, що перегляд завершено, якщо залишилося менше 5% часу 
                    const isFinished = (totalDuration - timeWatched) < (totalDuration * 0.05);

                    const card = Lampa.Player.card; // Повна картка з даними
                    const source = player.playlist[0]; // Дані поточного джерела

                    // Перевірка наявності даних для відновлення
                    if (!source || !source.url) {
                        console.warn(`[${PLUGIN_ID}] Could not get source data for resume.`);
                        return;
                    }

                    const dataToSave = {
                        item_id: card.id, 
                        title: card.title,
                        poster: card.poster_high || card.poster, 
                        time_watched: timeWatched,
                        time_total: totalDuration,
                        updated_at: Date.now(),
                        // Для серіалів (якщо не серіал, то 0)
                        episode: card.episode || 0,
                        season: card.season || 0,
                        // Дані для відновлення відтворення
                        source_data: {
                            url: source.url,
                            title: source.title,
                            // Зберігаємо додаткові дані, які можуть бути потрібні парсеру
                            method: source.method || 'stream', 
                            movie_id: source.movie_id, 
                            file_id: source.file_id, 
                        }, 
                    };
                    
                    if (isFinished) {
                         // Якщо закінчено, видаляємо з історії
                         this.removeItem(dataToSave);
                    } else {
                         this.saveProgress(dataToSave);
                    }
                });
            },
            
            removeItem: function(item) {
                let history = this.getHistory();
                const uniqueKey = `${item.item_id}_s${item.season}_e${item.episode}`;
                
                const filtered = history.filter(i => 
                    `${i.item_id}_s${i.season}_e${i.episode}` !== uniqueKey
                );
                
                try {
                    Lampa.Storage.set(STORAGE_KEY, filtered);
                } catch (e) {
                    console.error(`[${PLUGIN_ID}] Failed to remove item:`, e);
                }
            },

            // --- 3. ЛОГІКА ВІДНОВЛЕННЯ ВІДТВОРЕННЯ ---
            resumePlayback: function(item) {
                if (!item || !item.source_data || !item.source_data.url) {
                    Lampa.Noty.show('Не вдалося знайти джерело для відновлення.');
                    return;
                }
                
                // 1. Створення плейлиста з відновленим джерелом
                const playlist = [{
                    ...item.source_data, // Всі збережені дані джерела
                    url: item.source_data.url, 
                    title: item.title,
                }];

                // 2. Створення об'єкта картки для плеєра
                const card = {
                    id: item.item_id,
                    title: item.title,
                    poster: item.poster,
                    season: item.season,
                    episode: item.episode,
                };

                // 3. Запуск плеєра
                Lampa.Player.play(playlist, card);

                // 4. Встановлення позиції
                if (item.time_watched > 0) {
                    // Невелика затримка, щоб плеєр встиг завантажити потік
                    setTimeout(() => {
                        Lampa.Player.time(item.time_watched);
                        Lampa.Noty.show(`Продовжуємо перегляд з ${Lampa.Utils.secondsToTime(item.time_watched)}`);
                    }, 1500); // 1.5 секунди
                }
            },

            // --- 4. ІНТЕГРАЦІЯ З UI ---
            addMenuItem: function () {
                Lampa.Listener.follow('app', (e) => {
                    if (e.type === 'ready') {
                        // Додаємо пункт меню
                        Lampa.Menu.add('continue_watching', {
                            title: 'Продовжити перегляд', 
                            icon: 'play_arrow', 
                            component: COMPONENT_NAME, 
                        });
                        console.log(`[${PLUGIN_ID}] Menu item added.`);
                    }
                });
            },

            // --- 5. ОСНОВНИЙ ATTACH ---
            attach: function () {
                console.log(`[${PLUGIN_ID}] Plugin attached.`);
                // Реєструємо компонент сторінки
                Lampa.Component.add(COMPONENT_NAME, ContinueWatchingPage);
                
                // Передаємо важливі функції в глобальний простір Lampa.Player 
                // для використання компонентом
                Lampa.Player.continueWatching = {
                    resumePlayback: this.resumePlayback.bind(this),
                };

                this.listenForPlayerEvents(); 
                this.addMenuItem();
            }
        }
    });

})();
                  
