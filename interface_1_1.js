(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    function startPluginV3() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
        if (window.plugin_interface_ready_v3) return;  
        window.plugin_interface_ready_v3 = true;  
  
        addStyleV3();  
  
        const mainMap = Lampa.Maker.map('Main');  
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;  
  
        // Завжди використовуємо новий інтерфейс - БЕЗ УМОВ  
        wrap(mainMap.Items, 'onInit', function (original, args) {  
            if (original) original.apply(this, args);  
            this.__newInterfaceEnabled = true; // Завжди true  
        });  
  
        wrap(mainMap.Create, 'onCreate', function (original, args) {  
            if (original) original.apply(this, args);  
              
            // Завжди додаємо клас new-interface  
            if (this.container) {  
                this.container.classList.add('new-interface');  
            }  
        });  
  
        wrap(mainMap.Create, 'onRender', function (original, args) {  
            if (original) original.apply(this, args);  
              
            // Завжди створюємо інформаційну панель для карток  
            if (this.card && this.card.classList.contains('card--small') && this.card.classList.contains('card--wide')) {  
                const info = new InterfaceInfo(this.card, this.data);  
                info.create();  
            }  
        });  
    }  
  
    // Клас InterfaceInfo залишається без змін  
    class InterfaceInfo {  
        constructor(card, data) {  
            this.card = card;  
            this.data = data || {};  
            this.element = null;  
        }  
  
        create() {  
            if (!this.card || this.card.querySelector('.new-interface-info')) return;  
              
            this.element = document.createElement('div');  
            this.element.className = 'new-interface-info';  
            this.card.appendChild(this.element);  
              
            this.render();  
            this.load();  
        }  
  
        render() {  
            if (!this.element) return;  
              
            const title = this.data.title || this.data.name || '';  
            const year = this.data.release_date ? this.data.release_date.split('-')[0] :   
                        (this.data.first_air_date ? this.data.first_air_date.split('-')[0] : '');  
              
            this.element.innerHTML = `  
                <div class="new-interface-info__title">${title}</div>  
                ${year ? `<div class="new-interface-info__year">${year}</div>` : ''}  
                <div class="new-interface-info__details"></div>  
            `;  
        }  
  
        load() {  
            if (!this.data.id) return;  
              
            const type = this.data.media_type || (this.data.first_air_date ? 'tv' : 'movie');  
            const url = `https://api.themoviedb.org/3/${type}/${this.data.id}?api_key=c87a543116135a4120443155bf680876&language=uk`;  
              
            fetch(url)  
                .then(response => response.json())  
                .then(data => this.draw(data))  
                .catch(() => {});  
        }  
  
        draw(data) {  
            if (!this.element) return;  
              
            const details = this.element.querySelector('.new-interface-info__details');  
            if (!details) return;  
              
            const countries = data.production_countries?.map(c => c.name).join(', ') || '';  
            const genres = data.genres?.map(g => g.name).join(', ') || '';  
            const rating = data.vote_average ? data.vote_average.toFixed(1) : '';  
            const runtime = data.runtime ? `${data.runtime} хв` :   
                          (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} хв` : '');  
              
            let html = '';  
            if (countries) html += `<div>${countries}</div>`;  
            if (genres) html += `<div>${genres}</div>`;  
            if (runtime) html += `<div>${runtime}</div>`;  
            if (rating) html += `<div class="new-interface-info__rating">⭐ ${rating}</div>`;  
              
            details.innerHTML = html;  
        }  
  
        update(data) {  
            this.data = data;  
            this.render();  
            this.load();  
        }  
  
        destroy() {  
            if (this.element && this.element.parentNode) {  
                this.element.parentNode.removeChild(this.element);  
            }  
            this.element = null;  
        }  
    }  
  
    function wrap(obj, method, wrapper) {  
        if (!obj || !obj[method]) return;  
        const original = obj[method];  
        obj[method] = function(...args) {  
            return wrapper.call(this, original.bind(this), args);  
        };  
    }  
  
    function addStyleV3() {  
        if (document.getElementById('new-interface-style-v3')) return;  
          
        const style = document.createElement('style');  
        style.id = 'new-interface-style-v3';  
        style.textContent = `  
            .new-interface .card--small.card--wide {  
                aspect-ratio: 16/9 !important;  
                height: auto !important;  
            }  
              
            .new-interface .card--small.card--wide .card__img {  
                aspect-ratio: 16/9 !important;  
                height: 100% !important;  
            }  
              
            .new-interface-info {  
                position: absolute;  
                bottom: 0;  
                left: 0;  
                right: 0;  
                padding: 1em;  
                background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);  
                color: white;  
                font-size: 0.9em;  
                opacity: 0;  
                transition: opacity 0.3s;  
            }  
              
            .new-interface .card--small.card--wide:hover .new-interface-info,  
            .new-interface .card--small.card--wide.focus .new-interface-info {  
                opacity: 1;  
            }  
              
            .new-interface-info__title {  
                font-weight: bold;  
                margin-bottom: 0.3em;  
                font-size: 1.1em;  
            }  
              
            .new-interface-info__year {  
                opacity: 0.7;  
                margin-bottom: 0.5em;  
            }  
              
            .new-interface-info__details {  
                font-size: 0.85em;  
                opacity: 0.8;  
            }  
              
            .new-interface-info__details > div {  
                margin-bottom: 0.2em;  
            }  
              
            .new-interface-info__rating {  
                color: #ffd700;  
                font-weight: bold;  
            }  
        `;  
          
        document.head.appendChild(style);  
    }  
  
    // Перевірка версії Lampa  
    const isV3 = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
      
    if (isV3) {  
        startPluginV3();  
    } else {  
        console.warn('[NEW_INTERFACE] Потрібна Lampa версії 3.0+');  
    }  
  
})();
