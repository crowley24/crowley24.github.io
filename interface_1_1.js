(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    function startPluginV3() {  
        console.log('[NEW_INTERFACE] startPluginV3() викликано');  
          
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) {  
            console.log('[NEW_INTERFACE] API недоступний');  
            return;  
        }  
          
        if (window.plugin_interface_ready_v3) {  
            console.log('[NEW_INTERFACE] Плагін вже запущено');  
            return;  
        }  
          
        window.plugin_interface_ready_v3 = true;  
  
        addStyleV3();  
  
        const mainMap = Lampa.Maker.map('Main');  
        console.log('[NEW_INTERFACE] mainMap:', mainMap);  
          
        if (!mainMap || !mainMap.Items) {  
            console.log('[NEW_INTERFACE] mainMap.Items недоступний');  
            return;  
        }  
  
        // Обгортка для Items.onInit  
        const originalOnInit = mainMap.Items.onInit;  
        mainMap.Items.onInit = function() {  
            console.log('[NEW_INTERFACE] Items.onInit викликано');  
              
            if (originalOnInit) {  
                originalOnInit.apply(this, arguments);  
            }  
              
            // Додаємо клас для нового інтерфейсу  
            if (this.object && this.object.card) {  
                $(this.object.card).addClass('card--wide');  
                console.log('[NEW_INTERFACE] Додано клас card--wide');  
            }  
              
            // Створюємо інформаційну панель  
            try {  
                const info = new InterfaceInfo(this.object);  
                info.create();  
                console.log('[NEW_INTERFACE] Інформаційна панель створена');  
            } catch (e) {  
                console.error('[NEW_INTERFACE] Помилка створення інфо-панелі:', e);  
            }  
        };  
  
        console.log('[NEW_INTERFACE] Плагін успішно ініціалізовано');  
    }  
  
    // Клас для інформаційної панелі  
    class InterfaceInfo {  
        constructor(object) {  
            this.object = object;  
            this.element = null;  
        }  
  
        create() {  
            if (!this.object) return;  
              
            this.element = $('<div class="new-interface-info"></div>');  
              
            // Додаємо постер  
            if (this.object.img) {  
                const poster = $('<img class="new-interface-info__poster">');  
                poster.attr('src', this.object.img);  
                this.element.append(poster);  
            }  
              
            // Додаємо деталі  
            const details = $('<div class="new-interface-info__details"></div>');  
              
            if (this.object.title) {  
                details.append(`<div class="new-interface-info__title">${this.object.title}</div>`);  
            }  
              
            if (this.object.year) {  
                details.append(`<div class="new-interface-info__year">${this.object.year}</div>`);  
            }  
              
            if (this.object.vote_average) {  
                details.append(`<div class="new-interface-info__rating">★ ${this.object.vote_average}</div>`);  
            }  
              
            if (this.object.overview) {  
                details.append(`<div class="new-interface-info__overview">${this.object.overview}</div>`);  
            }  
              
            this.element.append(details);  
              
            // Додаємо до DOM  
            if (this.object.card) {  
                $(this.object.card).append(this.element);  
            }  
        }  
  
        destroy() {  
            if (this.element) {  
                this.element.remove();  
            }  
        }  
    }  
  
    function addStyleV3() {  
        const style = document.createElement('style');  
        style.id = 'new-interface-styles';  
        style.textContent = `  
            /* Широкі картки */  
            .card--wide {  
                width: 100% !important;  
                aspect-ratio: 16/9 !important;  
            }  
              
            .card--wide .card__img {  
                width: 100% !important;  
                height: 100% !important;  
                object-fit: cover !important;  
            }  
              
            /* Інформаційна панель */  
            .new-interface-info {  
                position: absolute;  
                bottom: 0;  
                left: 0;  
                right: 0;  
                background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);  
                padding: 2em;  
                display: flex;  
                gap: 1em;  
            }  
              
            .new-interface-info__poster {  
                width: 100px;  
                height: 150px;  
                object-fit: cover;  
                border-radius: 0.5em;  
            }  
              
            .new-interface-info__details {  
                flex: 1;  
                color: white;  
            }  
              
            .new-interface-info__title {  
                font-size: 1.5em;  
                font-weight: bold;  
                margin-bottom: 0.5em;  
            }  
              
            .new-interface-info__year,  
            .new-interface-info__rating {  
                font-size: 0.9em;  
                opacity: 0.8;  
                margin-bottom: 0.3em;  
            }  
              
            .new-interface-info__rating {  
                color: #ffd700;  
            }  
              
            .new-interface-info__overview {  
                font-size: 0.85em;  
                opacity: 0.7;  
                margin-top: 0.5em;  
                max-height: 3em;  
                overflow: hidden;  
                text-overflow: ellipsis;  
            }  
        `;  
          
        document.head.appendChild(style);  
        console.log('[NEW_INTERFACE] Стилі додано');  
    }  
  
    // Перевірка версії Lampa  
    const isV3 = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
    console.log('[NEW_INTERFACE] Версія Lampa:', Lampa.Manifest?.app_digital, 'isV3:', isV3);  
      
    if (isV3) {  
        // Запускаємо після готовності Lampa  
        if (window.appready) {  
            startPluginV3();  
        } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
            Lampa.Listener.follow('app', function(e) {  
                if (e.type === 'ready') {  
                    startPluginV3();  
                }  
            });  
        } else {  
            setTimeout(startPluginV3, 1000);  
        }  
    } else {  
        console.warn('[NEW_INTERFACE] Потрібна Lampa версії 3.0+');  
    }  
})();
