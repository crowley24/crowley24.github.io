(function() {  
    'use strict';  
      
    // Конфігурація  
    const PLUGIN_NAME = 'OpenCardify';  
    let currentTrailer = null;  
      
    // CSS стилі (скорочена версія для прикладу)  
    const style = `  
        <style>  
            .cardify-trailer {  
                position: fixed;  
                top: 0;  
                left: 0;  
                width: 100%;  
                height: 100%;  
                background: rgba(0,0,0,0.9);  
                z-index: 10000;  
                display: none;  
            }  
              
            .cardify-trailer.active {  
                display: flex;  
                align-items: center;  
                justify-content: center;  
            }  
              
            .cardify-trailer__player {  
                width: 80%;  
                height: 80%;  
                max-width: 1200px;  
                max-height: 700px;  
            }  
              
            .cardify-trailer__close {  
                position: absolute;  
                top: 20px;  
                right: 20px;  
                width: 40px;  
                height: 40px;  
                background: rgba(255,255,255,0.2);  
                border-radius: 50%;  
                cursor: pointer;  
                display: flex;  
                align-items: center;  
                justify-content: center;  
            }  
              
            .cardify-trailer__close:hover {  
                background: rgba(255,255,255,0.3);  
            }  
        </style>  
    `;  
      
    // Додаємо стилі  
    Lampa.Template.add('opencardify_css', style);  
    $('body').append(Lampa.Template.get('opencardify_css', {}, true));  
      
    // Іконка для налаштувань  
    const icon = `<svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
        <rect x="1.5" y="1.5" width="33" height="25" rx="3.5" stroke="white" stroke-width="3"/>  
        <rect x="5" y="14" width="17" height="4" rx="2" fill="white"/>  
        <rect x="5" y="20" width="10" height="3" rx="1.5" fill="white"/>  
        <rect x="25" y="20" width="6" height="3" rx="1.5" fill="white"/>  
    </svg>`;  
      
    // Додаємо компонент налаштувань  
    Lampa.SettingsApi.addComponent({  
        component: 'opencardify',  
        icon: icon,  
        name: 'Open Cardify'  
    });  
      
    Lampa.SettingsApi.addParam({  
        component: 'opencardify',  
        param: {  
            name: 'opencardify_run_trailers',  
            type: 'trigger',  
            default: false  
        },  
        field: {  
            name: 'Увімкнути автоматичні трейлери'  
        }  
    });  
      
    // Функція для вибору трейлера  
    function selectTrailer(data) {  
        if (!data.videos || !data.videos.results || !data.videos.results.length) {  
            return null;  
        }  
          
        const items = [];  
          
        // Збираємо всі трейлери  
        data.videos.results.forEach(function(element) {  
            items.push({  
                title: Lampa.Utils.shortText(element.name, 50),  
                id: element.key,  
                code: element.iso_639_1,  
                time: new Date(element.published_at).getTime(),  
                url: 'https://www.youtube.com/watch?v=' + element.key,  
                img: 'https://img.youtube.com/vi/' + element.key + '/default.jpg'  
            });  
        });  
          
        // Сортуємо за датою (новіші спочатку)  
        items.sort(function(a, b) {  
            return a.time > b.time ? -1 : a.time < b.time ? 1 : 0;  
        });  
          
        // Фільтруємо за мовою користувача  
        const userLang = Lampa.Storage.field('tmdb_lang');  
        const myLangTrailers = items.filter(function(n) {  
            return n.code === userLang;  
        });  
          
        // Фільтруємо англійські трейлери  
        const enLangTrailers = items.filter(function(n) {  
            return n.code === 'en' && myLangTrailers.indexOf(n) === -1;  
        });  
          
        // Пріоритет: мова користувача → англійська → будь-яка  
        let allTrailers = [];  
          
        if (myLangTrailers.length) {  
            allTrailers = allTrailers.concat(myLangTrailers);  
        }  
          
        allTrailers = allTrailers.concat(enLangTrailers);  
          
        if (allTrailers.length) {  
            return allTrailers[0];  
        }  
          
        // Якщо нічого не знайдено, повертаємо перший доступний  
        return items.length ? items[0] : null;  
    }  
      
    // Клас для керування трейлером  
    class TrailerPlayer {  
        constructor(activity, trailer) {  
            this.activity = activity;  
            this.trailer = trailer;  
            this.player = null;  
            this.container = null;  
              
            this.init();  
        }  
          
        init() {  
            // Перевіряємо чи увімкнено функцію  
            if (!Lampa.Storage.field('opencardify_run_trailers')) {  
                return;  
            }  
              
            // Створюємо контейнер  
            this.container = $('<div class="cardify-trailer"></div>');  
              
            // Кнопка закриття  
            const closeBtn = $('<div class="cardify-trailer__close">×</div>');  
            closeBtn.on('click', () => this.hide());  
              
            // YouTube плеєр  
            const playerDiv = $('<div class="cardify-trailer__player"></div>');  
            const iframe = $(`<iframe   
                src="https://www.youtube.com/embed/${this.trailer.id}?autoplay=1&mute=1&controls=1&rel=0"   
                frameborder="0"   
                allow="autoplay; encrypted-media"   
                allowfullscreen  
            ></iframe>`);  
              
            playerDiv.append(iframe);  
            this.container.append(closeBtn);  
            this.container.append(playerDiv);  
              
            $('body').append(this.container);  
              
            // Показуємо через 1 секунду  
            setTimeout(() => this.show(), 1000);  
              
            // Позначаємо що трейлер готовий  
            this.activity.trailer_ready = true;  
        }  
          
        show() {  
            this.container.addClass('active');  
        }  
          
        hide() {  
            this.container.removeClass('active');  
            setTimeout(() => {  
                this.container.remove();  
                this.activity.trailer_ready = false;  
            }, 300);  
        }  
    }  
      
    // Ініціалізація плагіна  
    function startPlugin() {  
        console.log('[OpenCardify] Plugin initialized');  
          
        // Слухаємо подію "full" (відкриття повної інформації про фільм/серіал)  
        Lampa.Listener.follow('full', function(event) {  
            if (event.type === 'complite' && event.data) {  
                // Перевіряємо чи увімкнено функцію  
                if (!Lampa.Storage.field('opencardify_run_trailers')) {  
                    return;  
                }  
                  
                // Вибираємо трейлер  
                const trailer = selectTrailer(event.data);  
                  
                if (!trailer) {  
                    return;  
                }  
                  
                // Перевіряємо версію Lampa  
                if (Lampa.Manifest.app_digital >= 220) {  
                    // Якщо активність вже відкрита  
                    if (Lampa.Activity.active().activity === event.object.activity) {  
                        new TrailerPlayer(event.object, trailer);  
                    } else {  
                        // Чекаємо на старт активності  
                        const activityListener = function(activityEvent) {  
                            if (activityEvent.type === 'start' &&   
                                activityEvent.object.activity === event.object.activity &&   
                                !event.object.activity.trailer_ready) {  
                                  
                                Lampa.Listener.remove('activity', activityListener);  
                                new TrailerPlayer(event.object, trailer);  
                            }  
                        };  
                          
                        Lampa.Listener.follow('activity', activityListener);  
                    }  
                }  
            }  
        });  
    }  
      
    // Запускаємо плагін  
    if (window.appready) {  
        startPlugin();  
    } else {  
        Lampa.Listener.follow('app', function(event) {  
            if (event.type === 'ready') {  
                startPlugin();  
            }  
        });  
    }  
})();
