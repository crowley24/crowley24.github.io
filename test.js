(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
    if (Lampa.Manifest.app_digital < 300) return; // Тільки для v3.0.0+  
  
    // Перевіряємо, чи завантажено tmdbproxy  
    if (!Lampa.TMDB || !Lampa.TMDB.image) {  
        console.error('TMDB proxy not loaded');  
        return;  
    }  
  
    // Флаг, щоб уникнути повторної ініціалізації  
    if (window.plugin_new_interface_logo_ready) return;  
    window.plugin_new_interface_logo_ready = true;  
  
    // ========== ДОДАЄМО ПЕРЕКЛАДИ ==========  
    Lampa.Lang.add({  
        new_interface_name: {  
            en: 'New interface',  
            uk: 'Новий інтерфейс',  
            ru: 'Новый интерфейс'  
        },  
        new_interface_desc: {  
            en: 'Enable enhanced viewing interface with background and detailed information',  
            uk: 'Увімкнення розширеного інтерфейсу з фоном та детальною інформацією',  
            ru: 'Включение расширенного интерфейса с фоном и подробной информацией'  
        },  
        logo_name: {  
            en: 'Logos instead of titles',  
            uk: 'Логотипи замість назв',  
            ru: 'Логотипы вместо названий'  
        },  
        logo_desc: {  
            en: 'Show movie/series logos instead of text in fullscreen view',  
            uk: 'Показує логотипи фільмів/серіалів замість тексту в повноекранному перегляді',  
            ru: 'Показывает логотипы фильмов/сериалов вместо текста в полноэкранном просмотре'  
        }  
    });  
  
    // ========== НАЛАШТУВАННЯ В МЕНЮ ==========  
      
    // Налаштування для нового інтерфейсу  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'new_interface',  
            type: 'trigger',  
            default: true  // За замовчуванням увімкнено  
        },  
        field: {  
            name: Lampa.Lang.translate('new_interface_name'),  
            description: Lampa.Lang.translate('new_interface_desc')  
        }  
    });  
  
    // Налаштування для логотипів (беремо з оригінального плагіна)  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'logo_glav',  
            type: 'select',  
            values: {  
                1: 'Вимкнути',  
                0: 'Увімкнути',  
            },  
            default: '0', // За замовчуванням увімкнені  
        },  
        field: {  
            name: Lampa.Lang.translate('logo_name'),  
            description: Lampa.Lang.translate('logo_desc'),  
        }  
    });  
  
    // ========== ОСНОВНА ЛОГІКА НОВОГО ІНТЕРФЕЙСУ ==========  
  
    function startNewInterface() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
          
        addStyles();  
        applyGlobalCardFix(); // Додаємо глобальний фікс для карток  
  
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
  
    // ========== ГЛОБАЛЬНИЙ ФІКС ДЛЯ КАРТОК ==========  
      
    function applyGlobalCardFix() {  
        // CSS фікс для всіх карток в новому інтерфейсі  
        const styleId = 'new_interface_global_card_fix';  
        if (document.getElementById(styleId)) return;  
          
        const style = document.createElement('style');  
        style.id = styleId;  
        style.textContent = `  
            /* Основні картки - вертикальні та дуже малі */  
            .new-interface .card:not(.card--wide):not(.card--small):not(.card--more) {  
                width: 6em !important; /* Дуже малий розмір */  
            }  
            .new-interface .card:not(.card--wide):not(.card--small):not(.card--more) .card__view {  
                padding-bottom: 150% !important; /* Вертикальний формат */  
            }  
              
            /* Картки в колекціях (рекомендації тощо) */  
            .new-interface .card--collection:not(.card--wide) {  
                width: 10em !important; /* Менший розмір для колекцій */  
            }  
            .new-interface .card--collection:not(.card--wide) .card__view {  
                padding-bottom: 150% !important; /* Вертикальний формат */  
            }  
              
            /* Додаємо клас card--wide для коректної роботи анімацій */  
            .new-interface .card:not(.card--wide):not(.card--small) {  
                position: relative;  
            }  
            .new-interface .card:not(.card--wide):not(.card--small)::after {  
                content: '';  
                position: absolute;  
                top: 0;  
                left: 0;  
                right: 0;  
                bottom: 0;  
                pointer-events: none;  
                border-radius: 0.6em;  
                box-shadow: 0 0.3em 0.6em rgba(0, 0, 0, 0.3);  
            }  
              
            /* Важливо: забезпечуємо правильне відображення постерів */  
            .new-interface .card__img {  
                background-size: cover !important;  
                background-position: center !important;  
            }  
        `;  
        document.head.appendChild(style);  
          
        // Додаткова обгортка для створення карток  
        if (Lampa.Card && Lampa.Card.create) {  
            const originalCreate = Lampa.Card.create;  
            Lampa.Card.create = function(data, params) {  
                const result = originalCreate.call(this, data, params);  
                  
                // Перевіряємо, чи це новий інтерфейс  
                setTimeout(() => {  
                    const element = result.render(true);  
                    if (element && element.closest('.new-interface') && data.poster_path) {  
                        const img = element.querySelector('.card__img');  
                        if (img) {  
                            const posterUrl = Lampa.TMDB.image(data.poster_path);  
                            img.style.backgroundImage = `url('${posterUrl}')`;  
                        }  
                    }  
                }, 50);  
                  
                return result;  
            };  
        }  
    }  
  
    // ========== ДОПОМІЖНІ ФУНКЦІЇ ==========  
      
    function shouldUseNewInterface(object) {  
        return Lampa.Storage.get('new_interface') !== false;  
    }  
  
    function ensureState(target) {  
        if (!target.__newInterfaceState) {  
            target.__newInterfaceState = new InterfaceState();  
        }  
        return target.__newInterfaceState;  
    }  
  
    function prepareLineData(element) {  
        if (!element || !element.card_data) return;  
        element.classList.add('new-interface');  
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
  
        label.textContent = text; // Тільки текст, без логотипів  
  
        if (!label.parentNode || label.parentNode !== element) {  
            if (label.parentNode) label.parentNode.removeChild(label);  
            element.appendChild(label);  
        }  
  
        card.__newInterfaceLabel = label;  
    }  
  
    // Виправлена функція для зміни зображення на картках  
    function updateCardImage(card) {  
        if (!card || !card.data) return;  
          
        // Використовуємо setTimeout для гарантування, що елемент створено  
        setTimeout(() => {  
            const element = card.render(true);  
            if (!element) return;  
              
            // Шукаємо елемент зображення картки  
            const img = element.querySelector('.card__img');  
            if (img && card.data.poster_path) {  
                // Використовуємо проксі для зображень  
                const posterUrl = Lampa.TMDB.image(card.data.poster_path);  
                img.style.backgroundImage = `url('${posterUrl}')`;  
                  
                // Примусово оновлюємо стиль  
                img.setAttribute('style', img.getAttribute('style') + ` background-image: url('${posterUrl}') !important;`);  
            }  
        }, 100);  
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
                updateCardImage(card);  
            },  
            onHover() {  
                state.update(card.data);  
                updateCardImage(card);  
            },  
            onTouch() {  
                state.update(card.data);  
                updateCardImage(card);  
            },  
            onVisible() {  
                updateCardTitle(card);  
                updateCardImage(card);  
            },  
            onUpdate() {  
                updateCardTitle(card);  
                updateCardImage(card);  
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
        updateCardImage(card);  
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
  
    function addStyles() {  
        if (addStyles.added) return;  
        addStyles.added = true;  
  
        Lampa.Template.add('new_interface_logo_styles', `<style>  
        .new-interface {  
            position: relative;  
        }  
  
        .new-interface .card.card--wide {  
            width: 6em; /* Дуже малий розмір */  
        }  
  
        .new-interface .card.card--wide .card__view {  
            padding-bottom: 150%; /* Вертикальний формат */  
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
  
        .new-interface-info__title img {  
            max-height: 125px;  
            margin-top: 5px;  
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
  
        body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.focus .card__view {  
            animation: animation-card-focus 0.2s;  
        }  
  
        body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.animate-trigger-enter .card__view {  
            animation: animation-trigger-enter 0.2s forwards;  
        }  
        </style>`);  
  
        $('body').append(Lampa.Template.get('new_interface_logo_styles', {}, true));  
    }  
  
    // ========== КЛАС ДЛЯ ІНФОРМАЦІЇ З ПІДТРИМКОЮ ЛОГОТИПІВ ==========  
  
    class InterfaceInfo {  
        constructor() {  
            this.html = null;  
            this.timer = null;  
            this.network = new Lampa.Reguest();  
            this.loadedLogos = {}; // Кеш логотипів  
            this.currentLogoUrl = null;  
            this.logoData = null;  
        }  
  
        create() {  
            if (this.html) return;  
  
            this.html = $(`<div class="new-interface-info">  
                <div class="new-interface-info__body">  
                    <div class="new-interface-info__head"></div>  
                    <div class="new-interface-info__title"></div>  
                    <div class="new-interface-info__details"></div>  
                    <div class="new-interface-info__description"></div>  
                </div>  
            </div>`);  
        }  
  
        render(js) {  
            if (!this.html) this.create();  
            return js ? this.html[0] : this.html;  
        }  
  
        update(data) {  
            if (!data) return;  
            if (!this.html) this.create();  
  
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
              
            // Оновлюємо заголовок (текст або логотип)  
            this.updateTitle(data);  
              
            this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));  
              
            // Залишаємо обкладинку для фону  
            Lampa.Background.change(Lampa.Utils.cardImgBackground(data));  
  
            this.loadDetails(data);  
        }  
  
        updateTitle(data) {  
            const titleElement = this.html.find('.new-interface-info__title');  
              
            // Перевіряємо, чи увімкнені логотипи для нового інтерфейсу  
            // logo_glav != '1' - увімкнено  
            if (Lampa.Storage.get('logo_glav') != '1') {  
                // Показуємо текст тимчасово, поки завантажується логотип  
                titleElement.text(data.title || data.name || '');  
                this.loadLogo(data);  
            } else {  
                // Показуємо тільки текст  
                titleElement.text(data.title || data.name || '');  
                titleElement.find('img').remove();  
            }  
        }  
  
        loadLogo(data) {  
            if (!data || !data.id) return;  
              
            const source = data.source || 'tmdb';  
            if (source !== 'tmdb' && source !== 'cub') return;  
            if (!Lampa.TMDB || typeof Lampa.TMDB.api !== 'function' || typeof Lampa.TMDB.key !== 'function') return;  
  
            const type = data.media_type === 'tv' || data.name ? 'tv' : 'movie';  
            const userLanguage = Lampa.Storage.get('language');  
              
            // Генеруємо унікальний ключ для кешу  
            const cacheKey = `${type}_${data.id}_${userLanguage}`;  
              
            // Перевіряємо кеш  
            if (this.loadedLogos[cacheKey]) {  
                this.displayLogo(this.loadedLogos[cacheKey]);  
                return;  
            }  
  
            const url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + userLanguage);  
              
            clearTimeout(this.timer);  
            this.timer = setTimeout(() => {  
                this.network.clear();  
                this.network.timeout(5000);  
                this.network.silent(url, (movie) => {  
                    this.loadedLogos[cacheKey] = movie;  
                    if (this.currentUrl === url) this.drawLogo(movie);  
                });  
            }, 300);  
        }  
  
        displayLogo(movie) {  
            if (!movie || !this.html) return;  
  
            const logo = movie.logos && movie.logos.length ? movie.logos[0] : null;  
            const titleElement = this.html.find('.new-interface-info__title');  
  
            if (logo && logo.file_path) {  
                // Використовуємо проксі для логотипів  
                const logoUrl = Lampa.TMDB.image(logo.file_path.replace('.svg', '.png'));  
                titleElement.html('<img style="margin-top:5px;max-height:125px;" src="' + logoUrl + '"/>');  
            } else {  
                titleElement.text(movie.title || movie.name || '');  
            }  
        }  
  
        loadDetails(data) {  
            if (!data || !data.id) return;  
              
            const source = data.source || 'tmdb';  
            if (source !== 'tmdb' && source !== 'cub') return;  
  
            const type = data.media_type === 'tv' || data.name ? 'tv' : 'movie';  
            const url = Lampa.TMDB.api(type + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));  
              
            clearTimeout(this.timer);  
            this.timer = setTimeout(() => {  
                this.network.clear();  
                this.network.timeout(5000);  
                this.network.silent(url, (movie) => {  
                    this.drawDetails(movie);  
                });  
            }, 300);  
        }  
  
        drawDetails(movie) {  
            if (!movie || !this.html) return;  
  
            const create = ((movie.release_date || movie.first_air_date || '0000') + '').slice(0, 4);  
            const vote = parseFloat((movie.vote_average || 0) + '').toFixed(1);  
            const head = [];  
            const details = [];  
            const sources = Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb ? Lampa.Api.sources.tmdb : null;  
            const countries = sources && typeof sources.parseCountries === 'function' ? sources.parseCountries(movie) : [];  
            const pg = sources && typeof sources.parsePG === 'function' ? sources.parsePG(movie) : '';  
  
            if (create !== '0000') head.push(`<span>${create}</span>`);  
            if (countries && countries.length) head.push(countries.join(', '));  
  
            if (vote > 0) {  
                details.push(`<div class="full-start__rate"><div>${vote}</div><div>TMDB</div></div>`);  
            }  
  
            if (Array.isArray(movie.genres) && movie.genres.length) {  
                details.push(movie.genres.map((item) => Lampa.Utils.capitalizeFirstLetter(item.name)).join(' | '));  
            }  
  
            if (movie.runtime) details.push(Lampa.Utils.secondsToTime(movie.runtime * 60, true));  
            if (pg) details.push(`<span class="new-interface-info__pg" style="font-size: 0.9em;">${pg}</span>`);  
  
            this.html.find('.new-interface-info__head').empty().append(head.join(', '));  
            this.html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));  
        }  
  
        empty() {  
            if (!this.html) return;  
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
            this.html.find('.new-interface-info__title').empty();  
        }  
  
        destroy() {  
            clearTimeout(this.timer);  
            this.network.clear();  
            this.loadedLogos = {};  
            this.currentUrl = null;  
            this.currentLogoUrl = null;  
  
            if (this.html) {  
                this.html.remove();  
                this.html = null;  
            }  
        }  
    }  
  
    // ========== ЛОГІКА ЛОГОТИПІВ ДЛЯ СТАНДАРТНОГО ПОВНОЕКРАННОГО ПЕРЕГЛЯДУ ==========  
  
    function startLogosPlugin() {  
        // Слідкуємо за повноекранним переглядом  
        Lampa.Listener.follow('full', function(e){  
            if(e.type == 'complite' && Lampa.Storage.get('logo_glav') != '1'){  
                var data = e.data.movie;  
                var type = data.name ? 'tv' : 'movie';  
                  
                if(data.id != ''){  
                    var userLanguage = Lampa.Storage.get('language');  
                      
                    // Спочатку запит з поточною мовою користувача  
                    var currentLangUrl = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + userLanguage);  
                      
                    $.get(currentLangUrl, function(currentLangData){  
                        var logo = null;  
                          
                        // Якщо є логотип з поточною мовою  
                        if(currentLangData.logos && currentLangData.logos.length > 0 && currentLangData.logos[0].file_path){  
                            logo = currentLangData.logos[0].file_path;  
                            displayLogoInFullView(e, logo);  
                        }   
                        // Якщо немає логотипу з поточною мовою, шукаємо англійську версію  
                        else {  
                            var englishUrl = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en');  
                              
                            $.get(englishUrl, function(englishData){  
                                if(englishData.logos && englishData.logos.length > 0 && englishData.logos[0].file_path){  
                                    logo = englishData.logos[0].file_path;  
                                    displayLogoInFullView(e, logo);  
                                }  
                                // Якщо немає і англійської, беремо оригінальну версію  
                                else {  
                                    var originalUrl = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key());  
                                      
                                    $.get(originalUrl, function(originalData){  
                                        if(originalData.logos && originalData.logos.length > 0 && originalData.logos[0].file_path){  
                                            logo = originalData.logos[0].file_path;  
                                            displayLogoInFullView(e, logo);  
                                        }  
                                    });  
                                }  
                            });  
                        }  
                    });  
                }  
            }  
        });  
    }  
      
    function displayLogoInFullView(e, logoPath){  
        if(logoPath != ''){  
            // Використовуємо проксі для логотипів  
            const logoUrl = Lampa.TMDB.image(logoPath.replace('.svg','.png'));  
            e.object.activity.render().find('.full-start-new__title').html('<img style="margin-top:5px;max-height:125px;" src="' + logoUrl + '"/>');  
        }  
    }  
  
    // ========== ІНІЦІАЛІЗАЦІЯ ПЛАГІНУ ==========  
  
    // Запускаємо обидві частини плагіна  
    startNewInterface();  
    startLogosPlugin();  
  
})();
