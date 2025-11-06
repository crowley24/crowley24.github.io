(function () {  
    'use strict';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined') {  
        console.error('[NEW_INTERFACE] Lampa не знайдено');  
        return;  
    }  
  
    // Перевірка на повторний запуск  
    if (window.plugin_interface_ready_v3) {  
        console.warn('[NEW_INTERFACE] Плагін вже запущено');  
        return;  
    }  
  
    window.plugin_interface_ready_v3 = true;  
  
    // Визначення версії Lampa  
    var isV3 = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
  
    if (isV3) {  
        startPluginV3();  
    } else {  
        console.warn('[NEW_INTERFACE] Lampa версії < 3.0 не підтримується цим плагіном');  
    }  
  
    // ===== ВЕРСІЯ ДЛЯ LAMPA V3.0+ =====  
    function startPluginV3() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) {  
            console.error('[NEW_INTERFACE] Lampa.Maker не доступний');  
            return;  
        }  
  
        console.log('[NEW_INTERFACE] Запуск версії v3');  
  
        addStyleV3();  
  
        const mainMap = Lampa.Maker.map('Main');  
  
        if (!mainMap || !mainMap.Items || !mainMap.Create) {  
            console.error('[NEW_INTERFACE] mainMap не має необхідних методів');  
            return;  
        }  
  
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
  
    function shouldUseNewInterface(object) {  
        if (!object) return false;  
        if (!(object.source === 'tmdb' || object.source === 'cub')) return false;  
        if (window.innerWidth < 767) return false;  
          
        // БЕЗ перевірки Premium  
        return true;  
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
  
                const infoNode = info.render(true);  
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
                info.empty();  
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
            onDestroy() {  
                delete card.__newInterfaceCard;  
            }  
        });  
    }  
  
    function getCardData(card, element, index) {  
        index = index || 0;  
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
        const applyToCard = function(card) { decorateCard(state, card); };  
  
        line.use({  
            onInstance(card) {  
                applyToCard(card);  
            },  
            onActive(card, itemData) {  
                const current = getCardData(card, itemData);  
                if (current) state.update(current);  
            },  
            onToggle() {  
                setTimeout(function() {  
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
        target[method] = function () {  
            var args = Array.prototype.slice.call(arguments);  
            return handler.call(this, original, args);  
        };  
    }  
  
    function addStyleV3() {  
        if (addStyleV3.added) return;  
        addStyleV3.added = true;  
  
        Lampa.Template.add('new_interface_style_v3', '<style>\n' +  
        '.new-interface {\n' +  
        '    position: relative;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .card.card--wide {\n' +  
        '    width: 18.3em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info {\n' +  
        '    position: relative;\n' +  
        '    padding: 1.5em;\n' +  
        '    height: 24em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__body {\n' +  
        '    width: 80%;\n' +  
        '    padding-top: 1.1em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__head {\n' +  
        '    color: rgba(255, 255, 255, 0.6);\n' +  
        '    margin-bottom: 1em;\n' +  
        '    font-size: 1.3em;\n' +  
        '    min-height: 1em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__head span {\n' +  
        '    color: #fff;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__title {\n' +  
        '    font-size: 4em;\n' +  
        '    font-weight: 600;\n' +  
        '    margin-bottom: 0.3em;\n' +  
        '    overflow: hidden;\n' +  
        '    -o-text-overflow: ".";\n' +  
        '    text-overflow: ".";\n' +  
        '    display: -webkit-box;\n' +  
        '    -webkit-line-clamp: 1;\n' +  
        '    line-clamp: 1;\n' +  
        '    -webkit-box-orient: vertical;\n' +  
        '    margin-left: -0.03em;\n' +  
        '    line-height: 1.3;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__details {\n' +  
        '    margin-bottom: 1.6em;\n' +  
        '    display: flex;\n' +  
        '    align-items: center;\n' +  
        '    flex-wrap: wrap;\n' +  
        '    min-height: 1.9em;\n' +  
        '    font-size: 1.1em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__split {\n' +  
        '    margin: 0 1em;\n' +  
        '    font-size: 0.7em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface-info__description {\n' +  
        '    font-size: 1.2em;\n' +  
        '    font-weight: 300;\n' +  
        '    line-height: 1.5;\n' +  
        '    overflow: hidden;\n' +  
        '    -o-text-overflow: ".";\n' +  
        '    text-overflow: ".";\n' +  
        '    display: -webkit-box;\n' +  
        '    -webkit-line-clamp: 4;\n' +  
        '    line-clamp: 4;\n' +  
        '    -webkit-box-orient: vertical;\n' +  
        '    width: 70%;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .card-more__box {\n' +  
        '    padding-bottom: 95%;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .full-start__background {\n' +  
        '    height: 108%;\n' +  
        '    top: -6em;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .full-start__rate {\n' +  
        '    font-size: 1.3em;\n' +  
        '    margin-right: 0;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .card__promo {\n' +  
        '    display: none;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .card.card--wide + .card-more .card-more__box {\n' +  
        '    padding-bottom: 95%;\n' +  
        '}\n' +  
        '\n' +  
        '.new-interface .card.card--wide .card-watched {\n' +  
        '    display: none !important;\n' +  
        '}\n' +  
        '\n' +  
        'body.light--version .new-interface-info__body {\n' +  
        '    width: 69%;\n' +  
        '    padding-top: 1.5em;\n' +  
        '}\n' +  
        '\n' +  
        'body.light--version .new-interface-info {\n' +  
        'body.light--version .new-interface-info {\n' +  
        '    height: 25.3em;\n' +  
        '}\n' +  
        '\n' +  
        'body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.focus .card__view {\n' +  
        '    animation: animation-card-focus 0.2s;\n' +  
        '}\n' +  
        '\n' +  
        'body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.animate-trigger-enter .card__view {\n' +  
        '    animation: animation-trigger-enter 0.2s forwards;\n' +  
        '}\n' +  
        '</style>');  
  
        $('body').append(Lampa.Template.get('new_interface_style_v3', {}, true));  
    }  
  
    class InterfaceInfo {  
        constructor() {  
            this.html = null;  
            this.timer = null;  
            this.network = new Lampa.Reguest();  
            this.loaded = {};  
        }  
  
        create() {  
            if (this.html) return;  
  
            this.html = $('<div class="new-interface-info">' +  
                '<div class="new-interface-info__body">' +  
                '<div class="new-interface-info__head"></div>' +  
                '<div class="new-interface-info__title"></div>' +  
                '<div class="new-interface-info__details"></div>' +  
                '<div class="new-interface-info__description"></div>' +  
                '</div>' +  
                '</div>');  
        }  
  
        render(js) {  
            if (!this.html) this.create();  
            return js ? this.html[0] : this.html;  
        }  
  
        update(data) {  
            if (!data) return;  
            if (!this.html) this.create();  
  
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
            this.html.find('.new-interface-info__title').text(data.title || data.name || '');  
            this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));  
  
            Lampa.Background.change(Lampa.Utils.cardImgBackground(data));  
  
            this.load(data);  
        }  
  
        load(data) {  
            if (!data || !data.id) return;  
  
            var source = data.name ? 'tv' : 'movie';  
            var url = Lampa.TMDB.api(source + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));  
              
            if (this.loaded[url]) {  
                this.draw(this.loaded[url]);  
                return;  
            }  
  
            clearTimeout(this.timer);  
              
            var self = this;  
            this.timer = setTimeout(function() {  
                self.network.clear();  
                self.network.timeout(5000);  
                self.network.silent(url, function(movie) {  
                    self.loaded[url] = movie;  
                    self.draw(movie);  
                }, function(error) {  
                    console.error('[NEW_INTERFACE] Помилка завантаження даних:', error);  
                });  
            }, 300);  
        }  
  
        draw(data) {  
            var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);  
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);  
            var head = [];  
            var details = [];  
              
            if (create !== '0000') head.push('<span>' + create + '</span>');  
              
            if (data.production_countries && data.production_countries.length > 0) {  
                var countries = data.production_countries.map(function(c) { return c.name; }).join(', ');  
                head.push(countries);  
            }  
              
            if (vote > 0) {  
                details.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>');  
            }  
              
            if (data.genres && data.genres.length > 0) {  
                var genres = data.genres.map(function(g) { return g.name; }).join(' | ');  
                details.push(genres);  
            }  
              
            if (data.runtime) {  
                var hours = Math.floor(data.runtime / 60);  
                var minutes = data.runtime % 60;  
                details.push(hours + 'г ' + minutes + 'хв');  
            }  
              
            this.html.find('.new-interface-info__head').empty().append(head.join(', '));  
            this.html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));  
        }  
  
        empty() {  
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
            this.html.find('.new-interface-info__title').text('');  
            this.html.find('.new-interface-info__description').text('');  
        }  
  
        destroy() {  
            clearTimeout(this.timer);  
            this.network.clear();  
            if (this.html) {  
                this.html.remove();  
                this.html = null;  
            }  
            this.loaded = {};  
        }  
    }  
  
})();
