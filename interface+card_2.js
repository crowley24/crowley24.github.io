(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  

    class InterfaceInfo {  
        constructor(object) {  
            this.object = object;  
            this.element = null;  
        }  
          
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
          
        // ✅ ДОДАЙТЕ ЦЕЙ ВИКЛИК  
        this.load();  
          
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
      
    // ✅ ДОДАЙТЕ ЦЕЙ МЕТОД  
    load() {  
        if (!this.object || !this.object.id) return;  
          
        var self = this;  
        var type = this.object.is_serial ? 'tv' : 'movie';  
          
        // Завантаження даних з TMDB через Lampa API  
        Lampa.TMDB.get(type, this.object.id, function(data) {  
            if (data) {  
                // Оновлення об'єкта даними з TMDB  
                self.object.title = data.title || data.name;  
                self.object.year = (data.release_date || data.first_air_date || '').split('-')[0];  
                self.object.countries = data.production_countries?.map(c => c.name).join(', ');  
                self.object.genres = data.genres?.map(g => g.name).join(', ');  
                self.object.rating = data.vote_average;  
                self.object.overview = data.overview;  
                self.object.poster = data.poster_path ? 'https://image.tmdb.org/t/p/w500' + data.poster_path : null;  
                  
                // Оновлення відображення  
                self.update();  
            }  
        });  
    }  
      
    update() {  
        if (!this.element) return;  
          
        var title = this.element.querySelector('.new-interface-info__title');  
        var details = this.element.querySelector('.new-interface-info__details');  
        var description = this.element.querySelector('.new-interface-info__description');  
        var poster = this.element.querySelector('.new-interface-info__poster');  
          
        if (title && this.object.title) {  
            title.textContent = this.object.title;  
        }  
          
        if (details) {  
            var detailsHtml = '';  
              
            if (this.object.year) {  
                detailsHtml += '<div>' + this.object.year + '</div>';  
            }  
              
            if (this.object.countries) {  
                detailsHtml += '<div>' + this.object.countries + '</div>';  
            }  
              
            if (this.object.genres) {  
                detailsHtml += '<div>' + this.object.genres + '</div>';  
            }  
              
            if (this.object.rating) {  
                detailsHtml += '<div class="new-interface-info__rating">★ ' + this.object.rating + '</div>';  
            }  
              
            details.innerHTML = detailsHtml;  
        }  
          
        if (description && this.object.overview) {  
            description.textContent = this.object.overview;  
        }  
          
        if (poster && this.object.poster) {  
            poster.style.backgroundImage = 'url(' + this.object.poster + ')';  
        }  
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
  
        // Завжди використовуємо новий інтерфейс - БЕЗ УМОВ  
         wrap(mainMap.Items, 'onInit', function (original, args) {  
            if (original) original.apply(this, args);  
            this.__newInterfaceEnabled = true;  
        });  
  
        wrap(mainMap.Create, 'onCreate', function (original, args) {  
            if (original) original.apply(this, args);  
            if (!this.__newInterfaceEnabled) return;  
            const state = ensureState(this);  
            state.attach();  
        });  
  
        wrap(mainMap.Create, 'onCreateAndAppend', function (original, args) {  
            const element = args && args[0];  
            if (this.__newInterfaceEnabled && element) {  
                prepareLineData(element);  
            }  
            return original ? original.apply(this, args) : undefined;  
        });  
  
        wrap(mainMap.Items, 'onAppend', function (original, args) {  
            if (original) original.apply(this, args);  
            if (!this.__newInterfaceEnabled) return;  
            const item = args && args[0];  
            const element = args && args[1];  
            if (item && element) attachLineHandlers(this, item, element);  
        });  
  
        wrap(mainMap.Items, 'onDestroy', function (original, args) {  
            if (this.__newInterfaceState) {  
                this.__newInterfaceState.destroy();  
                delete this.__newInterfaceState;  
            }  
            delete this.__newInterfaceEnabled;  
            if (original) original.apply(this, args);  
        });  
    }  
  
    function ensureState(main) {  
        if (main.__newInterfaceState) return main.__newInterfaceState;  
        const state = createInterfaceState(main);  
        main.__newInterfaceState = state;  
        return state;  
    }  
  
    function createInterfaceState(main) {  
        const info = new InterfaceInfo({});  
        info.create();  
  
        const background = document.createElement('img');  
        background.className = 'full-start__background';  
  
        const state = {  
            main,  
            info,  
            background,  
            infoElement: null,  
            backgroundTimer: null,  
            backgroundLast: '',  
            attached: false,  
            attach() {  
                if (this.attached) return;  
  
                const container = main.render(true);  
                if (!container) return;  
  
                container.classList.add('new-interface');  
  
                if (!background.parentElement) {  
                    container.insertBefore(background, container.firstChild || null);  
                }  
  
                // ✅ Виправлено: info.element замість info.render(true)  
                const infoNode = info.element;  
                this.infoElement = infoNode;  
  
                if (infoNode && infoNode.parentNode !== container) {  
                    if (background.parentElement === container) {  
                        container.insertBefore(infoNode, background.nextSibling);  
                    } else {  
                        container.insertBefore(infoNode, container.firstChild || null);  
                    }  
                }  
  
                main.scroll.minus(infoNode);  
  
                this.attached = true;  
            },  
            update(data) {  
                if (!data) return;  
                info.update(data);  
                this.updateBackground(data);  
            },  
            updateBackground(data) {  
                const path = data && data.backdrop_path ? Lampa.Api.img(data.backdrop_path, 'w1280') : '';  
  
                if (!path || path === this.backgroundLast) return;  
  
                clearTimeout(this.backgroundTimer);  
  
                this.backgroundTimer = setTimeout(() => {  
                    background.classList.remove('loaded');  
  
                    background.onload = () => background.classList.add('loaded');  
                    background.onerror = () => background.classList.remove('loaded');  
  
                    this.backgroundLast = path;  
  
                    setTimeout(() => {  
                        background.src = this.backgroundLast;  
                    }, 300);  
                }, 1000);  
            },  
            reset() {  
                info.empty(); // ✅ Тепер метод існує  
            },  
            destroy() {  
                clearTimeout(this.backgroundTimer);  
                info.destroy();  
  
                const container = main.render(true);  
                if (container) container.classList.remove('new-interface');  
  
                if (this.infoElement && this.infoElement.parentNode) {  
                    this.infoElement.parentNode.removeChild(this.infoElement);  
                }  
  
                if (background && background.parentNode) {  
                    background.parentNode.removeChild(background);  
                }  
  
                this.attached = false;  
            }  
        };  
  
        return state;  
    }   
  
    function prepareLineData(element) {  
        if (!element) return;  
        if (Array.isArray(element.results)) {  
            Lampa.Utils.extendItemsParams(element.results, {  
                style: {  
                    name: 'wide'  
                }  
            });  
        }  
    }  
  
    function updateCardTitle(card) {  
        if (!card || typeof card.render !== 'function') return;  
  
        const element = card.render(true);  
        if (!element) return;  
  
        if (!element.isConnected) {  
            clearTimeout(card.__newInterfaceLabelTimer);  
            card.__newInterfaceLabelTimer = setTimeout(() => updateCardTitle(card), 50);  
            return;  
        }  
  
        clearTimeout(card.__newInterfaceLabelTimer);  
  
        const text = (card.data && (card.data.title || card.data.name || card.data.original_title || card.data.original_name)) ? (card.data.title || card.data.name || card.data.original_title || card.data.original_name).trim() : '';  
  
        const seek = element.querySelector('.new-interface-card-title');  
  
        if (!text) {  
            if (seek && seek.parentNode) seek.parentNode.removeChild(seek);  
            card.__newInterfaceLabel = null;  
            return;  
        }  
  
        let label = seek || card.__newInterfaceLabel;  
  
        if (!label) {  
            label = document.createElement('div');  
            label.className = 'new-interface-card-title';  
        }  
  
        label.textContent = text;  
  
        if (!label.parentNode || label.parentNode !== element) {  
            if (label.parentNode) label.parentNode.removeChild(label);  
            element.appendChild(label);  
        }  
  
        card.__newInterfaceLabel = label;  
    }  
  
    function decorateCard(state, card) {  
        if (!card || card.__newInterfaceCard || typeof card.use !== 'function' || !card.data) return;  
  
        card.__newInterfaceCard = true;  
  
        card.params = card.params || {};  
        card.params.style = card.params.style || {};  
  
        if (!card.params.style.name) card.params.style.name = 'wide';  
  
        card.use({  
            onFocus() {  
                state.update(card.data);  
            },  
            onHover() {  
                state.update(card.data);  
            },  
            onTouch() {  
                state.update(card.data);  
            },  
            onVisible() {  
                updateCardTitle(card);  
            },  
            onUpdate() {  
                updateCardTitle(card);  
            },  
            onDestroy() {  
                clearTimeout(card.__newInterfaceLabelTimer);  
                if (card.__newInterfaceLabel && card.__newInterfaceLabel.parentNode) {  
                    card.__newInterfaceLabel.parentNode.removeChild(card.__newInterfaceLabel);  
                }  
                card.__newInterfaceLabel = null;  
                delete card.__newInterfaceCard;  
            }  
        });  
  
        updateCardTitle(card);  
    }  
  
    function getCardData(card, element, index = 0) {  
        if (card && card.data) return card.data;  
        if (element && Array.isArray(element.results)) return element.results[index] || element.results[0];  
        return null;  
    }  
  
    function getDomCardData(node) {  
        if (!node) return null;  
  
        let current = node && node.jquery ? node[0] : node;  
  
        while (current && !current.card_data) {  
            current = current.parentNode;  
        }  
  
        return current && current.card_data ? current.card_data : null;  
    }  
  
    function getFocusedCardData(line) {  
        const container = line && typeof line.render === 'function' ? line.render(true) : null;  
        if (!container || !container.querySelector) return null;  
  
        const focus = container.querySelector('.selector.focus') || container.querySelector('.focus');  
  
        return getDomCardData(focus);  
    }  
  
    function attachLineHandlers(main, line, element) {  
        if (line.__newInterfaceLine) return;  
        line.__newInterfaceLine = true;  
  
        const state = ensureState(main);  
        const applyToCard = (card) => decorateCard(state, card);  
  
        line.use({  
            onInstance(card) {  
                applyToCard(card);  
            },  
            onActive(card, itemData) {  
                const current = getCardData(card, itemData);  
                if (current) state.update(current);  
            },  
            onToggle() {  
                setTimeout(() => {  
                    const domData = getFocusedCardData(line);  
                    if (domData) state.update(domData);  
                }, 32);  
            },  
            onMore() {  
                state.reset();  
            },  
            onDestroy() {  
                state.reset();  
                delete line.__newInterfaceLine;  
            }  
        });  
  
        if (Array.isArray(line.items) && line.items.length) {  
            line.items.forEach(applyToCard);  
        }  
  
        if (line.last) {  
            const lastData = getDomCardData(line.last);  
            if (lastData) state.update(lastData);  
        }  
    }  
  
    function wrap(target, method, handler) {  
        if (!target) return;  
        const original = typeof target[method] === 'function' ? target[method] : null;  
        target[method] = function (...args) {  
            return handler.call(this, original, args);  
        };  
    }  
  
    function addStyleV3() {    
    if (addStyleV3.added) return;    
    addStyleV3.added = true;    
    
    const style = document.createElement('style');  
    style.textContent = `  
        .new-interface {    
            position: relative;    
        }    
    
        .new-interface .card.card--wide {    
            width: 18.3em;    
        }    
    
        .new-interface-info {    
            position: relative;    
            padding: 1.5em;    
            height: 24em;    
        }    
    
        .new-interface-info__body {    
            width: 80%;    
            padding-top: 1.1em;    
        }    
    
        .new-interface-info__head {    
            color: rgba(255, 255, 255, 0.6);    
            margin-bottom: 1em;    
            font-size: 1.3em;    
            min-height: 1em;    
        }    
    
        .new-interface-info__head span {    
            color: #fff;    
        }    
    
        .new-interface-info__title {    
            font-size: 4em;    
            font-weight: 600;    
            margin-bottom: 0.3em;    
            overflow: hidden;    
            -o-text-overflow: '.';    
            text-overflow: '.';    
            display: -webkit-box;    
            -webkit-line-clamp: 1;    
            line-clamp: 1;    
            -webkit-box-orient: vertical;    
            margin-left: -0.03em;    
            line-height: 1.3;    
        }    
    
        .new-interface-info__details {    
            margin-bottom: 1.6em;    
            display: flex;    
            align-items: center;    
            flex-wrap: wrap;    
            min-height: 1.9em;    
            font-size: 1.1em;    
        }    
    
        .new-interface-info__split {    
            margin: 0 1em;    
            font-size: 0.7em;    
        }    
    
        .new-interface-info__description {    
            font-size: 1.2em;    
            font-weight: 300;    
            line-height: 1.5;    
            overflow: hidden;    
            -o-text-overflow: '.';    
            text-overflow: '.';    
            display: -webkit-box;    
            -webkit-line-clamp: 4;    
            line-clamp: 4;    
            -webkit-box-orient: vertical;    
            width: 70%;    
        }    
    
        .new-interface .card-more__box {    
            padding-bottom: 95%;    
        }    
    
        .new-interface .full-start__background {    
            height: 108%;    
            top: -6em;    
        }    
    
        .new-interface .full-start__rate {    
            font-size: 1.3em;    
            margin-right: 0;    
        }    
    
        .new-interface .card__promo {    
            display: none;    
        }    
    
        .new-interface .card.card--wide + .card-more .card-more__box {    
            padding-bottom: 95%;    
        }    
    
        .new-interface .card.card--wide .card-watched {    
            display: none !important;    
        }    
    
        .new-interface-card-title {    
            margin-top: 0.6em;    
            font-size: 1.05em;    
            font-weight: 500;    
            color: #fff;    
            display: block;    
            text-align: left;    
            max-width: 100%;    
            overflow: hidden;    
            text-overflow: ellipsis;    
            white-space: nowrap;    
            pointer-events: none;    
        }    
    
        body.light--version .new-interface-card-title {    
            color: #111;    
        }    
    
        body.light--version .new-interface-info__body {    
            width: 69%;    
            padding-top: 1.5em;    
        }    
            
        body.light--version .new-interface-info {    
            height: 25.3em;    
        }    
    
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view {    
            animation: animation-card-focus 0.2s;  
        }  
          
        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view {    
            animation: animation-trigger-enter 0.2s forwards;  
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
