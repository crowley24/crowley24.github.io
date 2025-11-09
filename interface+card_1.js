(function () {    
    'use strict';    
    
    if (typeof Lampa === 'undefined') return;    
    
    // Клас для інформаційної панелі    
    class InterfaceInfo {    
        constructor(object) {    
            this.object = object;    
            this.element = null;    
        }    
    
        create() {    
            if (!this.object) return;    
    
            this.element = document.createElement('div');    
            this.element.className = 'new-interface-info';    
    
            this.render();      
    
            return this.element;    
        }    
    
        render() {    
            if (!this.element) return;    
    
            var html = '<div class="new-interface-info__poster"></div>';    
            html += '<div class="new-interface-info__body">';    
            html += '<div class="new-interface-info__title"></div>';    
            html += '<div class="new-interface-info__details"></div>';    
            html += '<div class="new-interface-info__description"></div>';    
            html += '</div>';    
    
            this.element.innerHTML = html;    
        }    
    
        load() {    
            console.log('[InterfaceInfo] load() викликано, object:', this.object);    
                
            if (!this.object || !this.object.id) {    
                console.warn('[InterfaceInfo] Немає id, вихід з load()');    
                return;    
            }    
                
            var type = this.object.is_serial ? 'tv' : 'movie';    
            var self = this;    
                
            console.log('[InterfaceInfo] Завантаження даних з TMDB, type:', type, 'id:', this.object.id);    
                
            Lampa.TMDB.get(type, this.object.id, function(data) {    
                console.log('[InterfaceInfo] Дані отримано з TMDB:', data);    
                    
                self.object.title = data.title || data.name;    
                self.object.year = (data.release_date || data.first_air_date || '').split('-')[0];    
                self.object.countries = data.production_countries?.map(c => c.name).join(', ');    
                self.object.genres = data.genres?.map(g => g.name).join(', ');    
                self.object.rating = data.vote_average;    
                self.object.overview = data.overview;    
                self.object.poster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;    
                    
                console.log('[InterfaceInfo] Оновлення відображення');    
                self.update();    
            });    
        }    
    
        update() {  
    if (!this.element) return;  
      
    var title = this.element.querySelector('.new-interface-info__title');  
    var details = this.element.querySelector('.new-interface-info__details');  
    var description = this.element.querySelector('.new-interface-info__description');  
    var poster = this.element.querySelector('.new-interface-info__poster');  
      
    // Використовуємо наявні дані з this.object  
    if (title) {  
        title.textContent = this.object.title || this.object.name || '';  
    }  
      
    if (description) {  
        description.textContent = this.object.overview || this.object.description || '';  
    }  
      
    if (poster && (this.object.poster || this.object.img)) {  
        var posterUrl = this.object.poster || this.object.img;  
        poster.style.backgroundImage = 'url(' + posterUrl + ')';  
    }  
      
    if (details) {  
        var detailsHtml = '';  
          
        if (this.object.year) {  
            detailsHtml += '<div>' + this.object.year + '</div>';  
        }  
          
        if (this.object.rating || this.object.vote_average) {  
            var rating = this.object.rating || this.object.vote_average;  
            detailsHtml += '<div class="new-interface-info__rating">★ ' + rating + '</div>';  
        }  
          
        details.innerHTML = detailsHtml;  
    }  
}    
    
        empty() {    
            if (!this.element) return;    
    
            var title = this.element.querySelector('.new-interface-info__title');    
            var details = this.element.querySelector('.new-interface-info__details');    
            var description = this.element.querySelector('.new-interface-info__description');    
            var poster = this.element.querySelector('.new-interface-info__poster');    
    
            if (title) title.textContent = '';    
            if (details) details.innerHTML = '';    
            if (description) description.textContent = '';    
            if (poster) poster.style.backgroundImage = '';    
        }    
    
        destroy() {    
            if (this.element && this.element.parentNode) {    
                this.element.parentNode.removeChild(this.element);    
            }    
            this.element = null;    
            this.object = null;    
        }    
    }    
    
    function startPluginV3() {    
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;    
        if (window.plugin_interface_ready_v3) return;    
        window.plugin_interface_ready_v3 = true;    
    
        addStyleV3();    
    
        const mainMap = Lampa.Maker.map('Main');    
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;    
    
        wrap(mainMap.Items, 'onInit', function (original, args) {    
            if (original) original.apply(this, args);    
            this.__newInterfaceEnabled = true;    
    
            if (this.object && this.object.card) {    
                $(this.object.card).addClass('card--wide');    
            }    
        });    
    
        wrap(mainMap.Create, 'onCreate', function (original, args) {    
            if (original) original.apply(this, args);    
    
            if (this.object && this.object.__newInterfaceEnabled) {    
                $(this.object.container).addClass('new-interface');    
    
                var info = new InterfaceInfo(this.object);    
                var infoElement = info.create();    
    
                if (infoElement) {    
                    $(this.object.container).prepend(infoElement);    
                }    
            }    
        });    
    }    
    
    function wrap(target, methodName, wrapper) {    
        if (!target || typeof target[methodName] !== 'function') return;    
    
        var original = target[methodName];    
        target[methodName] = function() {    
            return wrapper.call(this, original.bind(this), arguments);    
        };    
    }    
    
    function addStyleV3() {    
        if (addStyleV3.added) return;    
        addStyleV3.added = true;    
    
        var style = document.createElement('style');    
        style.textContent = `    
        .new-interface {    
            display: flex;    
            flex-direction: column;    
        }    
    
        .new-interface-info {    
            display: flex;    
            width: 100%;    
            height: 25em;    
            margin-bottom: 2em;    
            background: rgba(0, 0, 0, 0.3);    
            border-radius: 0.5em;    
            overflow: hidden;    
        }    
    
        .new-interface-info__poster {    
            width: 30%;    
            background-size: cover;    
            background-position: center;    
        }    
    
        .new-interface-info__body {    
            width: 70%;    
            padding: 2em;    
            display: flex;    
            flex-direction: column;    
            justify-content: center;    
        }    
    
        .new-interface-info__title {    
            font-size: 2em;    
            font-weight: bold;    
            margin-bottom: 0.5em;    
        }    
    
        .new-interface-info__details {    
            display: flex;    
            gap: 1em;    
            margin-bottom: 1em;    
            opacity: 0.8;    
        }    
    
        .new-interface-info__rating {    
            color: #ffd700;    
        }    
    
        .new-interface-info__description {    
            line-height: 1.5;    
            opacity: 0.9;    
        }    
    
        .new-interface .card--wide {    
            aspect-ratio: 16/9;    
        }    
    
        .new-interface .card--wide .card__view {    
            border-radius: 0.5em;    
        }    
        `;    
    
        document.head.appendChild(style);    
    }    
    
    // Перевірка версії Lampa    
    const isV3 = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;    
    
    if (isV3) {    
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
