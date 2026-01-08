(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
    if (Lampa.Manifest.app_digital < 300) return; // Тільки для v3.0.0+  
  
    if (window.plugin_new_interface_logo_ready) return;  
    window.plugin_new_interface_logo_ready = true;  
  
    // ========== ПЕРЕКЛАДИ ==========  
    Lampa.Lang.add({  
        new_interface_name: { en: 'New interface', uk: 'Новий інтерфейс', ru: 'Новый интерфейс' },  
        new_interface_desc: { en: 'Vertical posters and background info', uk: 'Вертикальні постери та інфо-панель', ru: 'Вертикальные постеры и инфо-панель' },  
        logo_name: { en: 'Logos instead of titles', uk: 'Логотипи замість назв', ru: 'Логотипы вместо названий' },  
        logo_desc: { en: 'Show movie/series logos in info block', uk: 'Показує логотипи фільмів у блоці інформації', ru: 'Показывает логотипы фильмов в блоке информации' }  
    });  
  
    // ========== НАЛАШТУВАННЯ ==========  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: { name: 'new_interface', type: 'trigger', default: true },  
        field: { name: Lampa.Lang.translate('new_interface_name'), description: Lampa.Lang.translate('new_interface_desc') }  
    });  
  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: { name: 'logo_glav', type: 'select', values: { 1: 'Вимкнути', 0: 'Увімкнути' }, default: '0' },  
        field: { name: Lampa.Lang.translate('logo_name'), description: Lampa.Lang.translate('logo_desc') }  
    });  
  
    // ========== ГОЛОВНА ЛОГІКА ==========  
    function startNewInterface() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
          
        addStyles();  
        applyGlobalCardFix(); 
  
        const mainMap = Lampa.Maker.map('Main');  
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;  
  
        wrap(mainMap.Items, 'onInit', function (original, args) {  
            if (original) original.apply(this, args);  
            this.__newInterfaceEnabled = shouldUseNewInterface(this && this.object);  
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
  
    function applyGlobalCardFix() {  
        if (Lampa.Card && Lampa.Card.create) {  
            const originalCreate = Lampa.Card.create;  
            Lampa.Card.create = function(data, params) {  
                if ($('.new-interface').length > 0) {  
                    params = params || {};  
                    params.style = params.style || {};  
                    params.style.name = 'poster';  
                    params.card_wide = false;      
                }  
                return originalCreate.call(this, data, params);  
            };  
        }  
    }  
  
    function shouldUseNewInterface(object) {  
        if (!object) return false;  
        if (!(object.source === 'tmdb' || object.source === 'cub')) return false;  
        if (window.innerWidth < 767) return false;  
        return Lampa.Storage.field('new_interface');  
    }  
  
    function ensureState(main) {  
        if (main.__newInterfaceState) return main.__newInterfaceState;  
        const state = createInterfaceState(main);  
        main.__newInterfaceState = state;  
        return state;  
    }  
  
    function createInterfaceState(main) {  
        const info = new InterfaceInfo();  
        info.create();  
        const background = document.createElement('img');  
        background.className = 'full-start__background';  
  
        const state = {  
            main, info, background, attached: false,  
            attach() {  
                if (this.attached) return;  
                const container = main.render(true);  
                if (!container) return;  
                container.classList.add('new-interface');  
                if (!background.parentElement) container.insertBefore(background, container.firstChild || null);  
                const infoNode = info.render(true);  
                container.insertBefore(infoNode, background.nextSibling);  
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
                    this.backgroundLast = path;  
                    background.src = path;  
                }, 1000);  
            },  
            reset() { info.empty(); },  
            destroy() {  
                info.destroy();  
                const container = main.render(true);  
                if (container) container.classList.remove('new-interface');  
                if (background.parentNode) background.parentNode.removeChild(background);  
                this.attached = false;  
            }  
        };  
        return state;  
    }  
  
    function prepareLineData(element) {  
        if (element && Array.isArray(element.results)) {  
            Lampa.Utils.extendItemsParams(element.results, { style: { name: 'poster' } });  
        }  
    }  
  
    function decorateCard(state, card) {  
        if (!card || card.__newInterfaceCard || !card.data) return;  
        if (card.data.poster_path) card.data.img = card.data.poster_path;  
        
        card.__newInterfaceCard = true;  
        card.params = card.params || {};  
        card.params.style = card.params.style || { name: 'poster' };  
        card.params.style.name = 'poster';  
  
        card.use({  
            onFocus() { state.update(card.data); },  
            onHover() { state.update(card.data); },  
            onVisible() { updateCardTitle(card); },  
            onDestroy() { delete card.__newInterfaceCard; }  
        });  
        updateCardTitle(card);  
    }  
  
    function updateCardTitle(card) {  
        const element = card.render(true);  
        if (!element) return;  
        const text = card.data.title || card.data.name || '';  
        let label = element.querySelector('.new-interface-card-title');  
        if (!label) {  
            label = document.createElement('div');  
            label.className = 'new-interface-card-title';  
            element.appendChild(label);  
        }  
        label.textContent = text;  
    }  
  
    function attachLineHandlers(main, line, element) {  
        if (line.__newInterfaceLine) return;  
        line.__newInterfaceLine = true;  
        const state = ensureState(main);  
        line.use({  
            onInstance(card) { decorateCard(state, card); },  
            onActive(card) { if (card && card.data) state.update(card.data); }  
        });  
        if (line.items) line.items.forEach(c => decorateCard(state, c));  
    }  
  
    function wrap(target, method, handler) {  
        const original = target[method];  
        target[method] = function (...args) { return handler.call(this, original, args); };  
    }  
  
    function addStyles() {  
        const style = `<style>  
            .new-interface .card.card--poster { width: 10em !important; margin-right: 1.2em !important; display: inline-block !important; vertical-align: top; }  
            .new-interface .card.card--poster .card__view { padding-bottom: 150% !important; height: 0 !important; width: 100% !important; }  
            .new-interface .items__line { white-space: nowrap !important; display: block !important; }  
            .new-interface-info { position: relative; padding: 1.5em; height: 25em; display: flex; align-items: flex-end; }  
            .new-interface-info__body { width: 80%; z-index: 2; }  
            .new-interface-info__title { font-size: 3.5em; font-weight: bold; margin: 0.2em 0; min-height: 1.2em; }  
            .new-interface-info__title img { max-height: 120px; max-width: 450px; object-fit: contain; }  
            .new-interface-info__description { font-size: 1.1em; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; opacity: 0.8; width: 60%; }  
            .new-interface-card-title { margin-top: 0.5em; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }  
            .full-start__background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.5s; z-index: 0; }  
            .full-start__background.loaded { opacity: 0.4; }  
            .new-interface-info__details { margin: 1em 0; display: flex; gap: 15px; align-items: center; opacity: 0.9; }
            .new-interface-info__split { width: 4px; height: 4px; background: #fff; border-radius: 50%; }
        </style>`;  
        $('body').append(style);  
    }  
  
    class InterfaceInfo {  
        constructor() { this.network = new Lampa.Reguest(); this.loadedLogos = {}; }  
        create() {  
            this.html = $(`<div class="new-interface-info">  
                <div class="new-interface-info__body">  
                    <div class="new-interface-info__head"></div>  
                    <div class="new-interface-info__title"></div>  
                    <div class="new-interface-info__details"></div>  
                    <div class="new-interface-info__description"></div>  
                </div>  
            </div>`);  
        }  
        render(js) { return js ? this.html[0] : this.html; }  
        update(data) {  
            this.html.find('.new-interface-info__title').text(data.title || data.name);  
            this.html.find('.new-interface-info__description').text(data.overview || '');  
            if (Lampa.Storage.get('logo_glav') !== '1') this.loadLogo(data);  
            this.loadDetails(data);  
        }  
        loadLogo(data) {  
            const type = (data.name || data.first_air_date) ? 'tv' : 'movie';  
            const url = Lampa.TMDB.api(`${type}/${data.id}/images?api_key=${Lampa.TMDB.key()}&language=${Lampa.Storage.get('language')}`);  
            $.get(url, (res) => {  
                const logo = res.logos && res.logos[0] ? res.logos[0].file_path : null;  
                if (logo) {  
                    const imgUrl = Lampa.TMDB.image('/t/p/w300' + logo.replace('.svg', '.png'));  
                    this.html.find('.new-interface-info__title').html(`<img src="${imgUrl}">`);  
                }  
            });  
        }  
        loadDetails(data) {
            const type = (data.name || data.first_air_date) ? 'tv' : 'movie';
            const url = Lampa.TMDB.api(`${type}/${data.id}?api_key=${Lampa.TMDB.key()}&language=${Lampa.Storage.get('language')}`);
            this.network.silent(url, (movie) => {
                const details = [];
                if (movie.release_date) details.push(movie.release_date.slice(0,4));
                if (movie.vote_average) details.push('★ ' + movie.vote_average.toFixed(1));
                if (movie.genres) details.push(movie.genres.slice(0,2).map(g => g.name).join('/'));
                this.html.find('.new-interface-info__details').html(details.join('<div class="new-interface-info__split"></div>'));
            });
        }
        empty() { this.html.find('.new-interface-info__title, .new-interface-info__description').text(''); }  
        destroy() { if (this.html) this.html.remove(); }  
    }  
  
    function startLogosPlugin() {  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type === 'complite' && Lampa.Storage.get('logo_glav') !== '1') {  
                const data = e.data.movie;  
                const type = data.name ? 'tv' : 'movie';  
                const url = Lampa.TMDB.api(`${type}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
                $.get(url, (res) => {  
                    if (res.logos && res.logos[0]) {  
                        const img = Lampa.TMDB.image('/t/p/w300' + res.logos[0].file_path.replace('.svg', '.png'));  
                        e.object.activity.render().find('.full-start-new__title, .full-start__title').html(`<img src="${img}" style="max-height:100px">`);  
                    }  
                });  
            }  
        });  
    }  
  
    startNewInterface();  
    startLogosPlugin();  
})();
