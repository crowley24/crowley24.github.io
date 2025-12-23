(function () {
    'use strict';

    // --- КОНСТАНТИ ---
    const PLUGIN_ID = 'continue_watching_plugin';
    const STORAGE_KEY = 'cw_progress_list';
    const MAX_ITEMS = 50; 
    const COMPONENT_NAME = 'continue_watching_component';
    
    // Зберігаємо посилання на екземпляр плагіна для доступу до методів
    let plugin_instance = null; 

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
            template: '', 
        });

        // --- МЕТОДИ ЖИТТЄВОГО ЦИКЛУ ---
        component.onReady = function () {
            this.render();
            // Викликаємо метод з основного об'єкта плагіна
            this.loadHistory(); 
        };

        component.onStart = function () {
            Lampa.Controller.add(this);
            Lampa.Background.set(Lampa.Utils.img('')); 
            this.toggle();
        };
        
        // ... (Інші методи onStop, onToggle, onRender не змінювалися)
        component.onRender = function () {
            this.parent = Lampa.Template.js('title_main');
            this.parent.addClass('loading');
            this.parent.find('.title').text(this.data.title);

            this.list = Lampa.Template.js('scroll_main');
            this.list.empty();
            this.parent.append(this.list);

            this.parent.find('.title').append(`<span class="list-total"></span>`);

            const self = this;
            this.clear_btn = Lampa.Template.js('settings_link', {title: 'Очистити історію'});
            
            // Важливо: перевіряємо, чи існує Lampa.Controller.collection перед використанням
            if (Lampa.Controller.collection) {
                 this.clear_btn.on('hover:focus', function(){
                    Lampa.Controller.collection = self.list.find('.card');
                    Lampa.Controller.set(self.clear_btn, self);
                });
            }
           
            this.clear_btn.on('hover:click', this.clearHistory.bind(this));
            this.parent.append(this.clear_btn);

            Lampa.Controller.collection = this.list.find('.card');

            this.parent.find('.list-total').text(this.data.total_items);
        };

        // --- ЛОГІКА ДАНИХ ТА ВІДОБРАЖЕННЯ ---

        component.loadHistory = function () {
            // Використовуємо екземпляр плагіна для отримання історії
            if (plugin_instance) {
                this.data.history = plugin_instance.getHistory();
                this.data.total_items = this.data.history.length;
                this.data.loading = false;
                this.buildCards();
            } else {
                 console.error(`[${PLUGIN_ID}] Plugin instance not available.`);
                 Lampa.Noty.show('Помилка: Плагін не ініціалізовано.');
            }
        };

        component.buildCards = function () {
            this.list.empty();
            this.parent.removeClass('loading');
            this.parent.find('.list-total').text(this.data.total_items);

            if (this.data.history.length === 0) {
                this.list.html('<div class="list-empty">Історія перегляду порожня.</div>');
                // Навігація до кнопки "Очистити історію"
                Lampa.Controller.collection = [this.clear_btn]; 
                Lampa.Controller.set(this.clear_btn);
                return;
            }

            this.data.history.forEach((item, index) => {
                const card = Lampa.Template.js('card', item);
                card.attr('data-id', index);

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
                    // Викликаємо метод відновлення з основного об'єкта плагіна
                    if (plugin_instance) {
                        plugin_instance.resumePlayback(item);
                    }
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
        version: '1.0.2', // Оновлена версія
        author: 'AI Assistant',
        
        methods: {
            // ... (Методи getHistory, saveProgress, removeItem, listenForPlayerEvents, addMenuItem не змінилися)
            getHistory: function () {
                try {
                    return Lampa.Storage.get(STORAGE_KEY, []).slice(0, MAX_ITEMS);
                } catch (e) {
                    console.error(`[${PLUGIN_ID}] Failed to load history:`, e);
                    return [];
                }
            },

            saveProgress: function (item) {
                let history = this.getHistory();
                const uniqueKey = `${item.item_id}_s${item.season}_e${item.episode}`;

                const index = history.findIndex(i => 
                    `${i.item_id}_s${i.season}_e${i.episode}` === uniqueKey
                );

                if (index !== -1) {
                    history[index] = item;
                } else {
                    history.unshift(item); 
                }

                try {
                    Lampa.Storage.set(STORAGE_KEY, history.slice(0, MAX_ITEMS));
                } catch (e) {
                    console.error(`[${PLUGIN_ID}] Failed to save history:`, e);
                }
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
            
            listenForPlayerEvents: function () {
                Lampa.Listener.follow('player.close', (e) => {
                    const player = e.object; 
                    
                    if (!player || !player.duration || !Lampa.Player.card) return; 

                    const timeWatched = player.currentTime;
                    const totalDuration = player.duration;

                    if (totalDuration < 60 || timeWatched < 1) return;

                    const isFinished = (totalDuration - timeWatched) < (totalDuration * 0.05);

                    const card = Lampa.Player.card; 
                    const source = player.playlist[0]; 

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
                        episode: card.episode || 0,
                        season: card.season || 0,
                        source_data: {
                            url: source.url,
                            title: source.title,
                            method: source.method || 'stream', 
                            movie_id: source.movie_id, 
                            file_id: source.file_id, 
                        }, 
                    };
                    
                    if (isFinished) {
                         this.removeItem(dataToSave);
                    } else {
                         this.saveProgress(dataToSave);
                    }
                });
            },

            // --- 3. ЛОГІКА ВІДНОВЛЕННЯ ВІДТВОРЕННЯ ---
            resumePlayback: function(item) {
                if (!item || !item.source_data || !item.source_data.url) {
                    Lampa.Noty.show('Не вдалося знайти джерело для відновлення.');
                    return;
                }
                
                // 1. Створення плейлиста
                const playlist = [{
                    ...item.source_data, 
                    url: item.source_data.url, 
                    title: item.title,
                }];

                // 2. Створення об'єкта картки
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
                    setTimeout(() => {
                        Lampa.Player.time(item.time_watched);
                        Lampa.Noty.show(`Продовжуємо перегляд з ${Lampa.Utils.secondsToTime(item.time_watched)}`);
                    }, 1500); 
                }
            },

            // --- 4. ІНТЕГРАЦІЯ З UI ---
            addMenuItem: function () {
                Lampa.Listener.follow('app', (e) => {
                    if (e.type === 'ready') {
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
                console.log(`[${PLUGIN_ID}] Plugin attached. Version 1.0.2`);
                
                // Зберігаємо посилання на цей екземпляр плагіна
                plugin_instance = this; 

                // Реєструємо компонент сторінки
                Lampa.Component.add(COMPONENT_NAME, ContinueWatchingPage);

                this.listenForPlayerEvents(); 
                this.addMenuItem();
            }
        }
    });

})();

