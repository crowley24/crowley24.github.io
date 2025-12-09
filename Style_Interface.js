(function() {

    'use strict';



    console.log('[Style Interface DEBUG] === START PLUGIN ===');

    console.log('[Style Interface DEBUG] Plugin loaded at:', new Date().toISOString());

    console.log('[Style Interface DEBUG] Location:', window.location.href);

    console.log('[Style Interface DEBUG] Lampa available:', typeof Lampa !== 'undefined');

    

    if (typeof Lampa !== 'undefined') {

        console.log('[Style Interface DEBUG] Lampa version:', Lampa.version || 'unknown');

        console.log('[Style Interface DEBUG] Lampa.Manifest:', Lampa.Manifest);

        console.log('[Style Interface DEBUG] Lampa keys (filtered):', 

            Object.keys(Lampa).filter(k => 

                k.toLowerCase().includes('interaction') || 

                k.toLowerCase().includes('main') || 

                k.toLowerCase().includes('activity') ||

                k === 'Storage' || k === 'Api' || k === 'TMDB'

            )

        );

        

        // Перевіряємо конкретно InteractionMain

        console.log('[Style Interface DEBUG] Lampa.InteractionMain exists:', !!Lampa.InteractionMain);

        console.log('[Style Interface DEBUG] Lampa.InteractionMain type:', typeof Lampa.InteractionMain);

        if (Lampa.InteractionMain) {

            console.log('[Style Interface DEBUG] InteractionMain sample:', 

                Lampa.InteractionMain.toString().substring(0, 300) + '...'

            );

        }

    }



    // ==================== ДІАГНОСТИКА ====================

    let debug = {

        interactionCallCount: 0,

        lastInteractionData: null,

        interactionCalls: [],

        pageChanges: []

    };



    // Логуємо зміни URL

    let lastUrl = window.location.href;

    const originalPushState = history.pushState;

    const originalReplaceState = history.replaceState;

    

    history.pushState = function(...args) {

        debug.pageChanges.push({type: 'pushState', url: args[2], time: Date.now()});

        console.log('[Style Interface DEBUG] pushState:', args[2]);

        return originalPushState.apply(this, args);

    };

    

    history.replaceState = function(...args) {

        debug.pageChanges.push({type: 'replaceState', url: args[2], time: Date.now()});

        console.log('[Style Interface DEBUG] replaceState:', args[2]);

        return originalReplaceState.apply(this, args);

    };



    // Логуємо зміни hash

    window.addEventListener('hashchange', function() {

        debug.pageChanges.push({type: 'hashchange', url: window.location.href, time: Date.now()});

        console.log('[Style Interface DEBUG] hashchange:', window.location.href);

    });



    // Перехоплюємо InteractionMain ДУЖЕ РАННЬО

    if (Lampa && Lampa.InteractionMain) {

        console.log('[Style Interface DEBUG] Hooking InteractionMain...');

        

        const originalInteractionMain = Lampa.InteractionMain;

        

        Lampa.InteractionMain = function(data) {

            debug.interactionCallCount++;

            debug.lastInteractionData = data;

            debug.interactionCalls.push({

                count: debug.interactionCallCount,

                data: {...data},

                timestamp: Date.now(),

                stack: new Error().stack

            });

            

            console.log(`[Style Interface DEBUG] InteractionMain CALLED #${debug.interactionCallCount}`, {

                source: data.source,

                type: data.type,

                title: data.title || data.name || 'no title',

                id: data.id || 'no id',

                url: window.location.href,

                fullData: data

            });

            

            // Перевіряємо, чи це те, що нам потрібно

            if (data.source === 'tmdb' || data.source === 'cub') {

                console.log('[Style Interface DEBUG] TMDB/CUB source detected! Should activate new interface.');

                

                // Тест: намагаємось створити наш інтерфейс

                try {

                    console.log('[Style Interface DEBUG] Testing NewInterface creation...');

                    // Тимчасовий тестовий клас

                    const TestInterface = class {

                        constructor(data) {

                            console.log('[Style Interface DEBUG] TestInterface created!', data);

                            this.data = data;

                        }

                        render() {

                            console.log('[Style Interface DEBUG] TestInterface render called');

                            return $('<div style="background:red;color:white;padding:20px;">TEST INTERFACE ACTIVE</div>');

                        }

                    };

                    

                    const test = new TestInterface(data);

                    console.log('[Style Interface DEBUG] Test interface created successfully');

                    

                } catch (e) {

                    console.error('[Style Interface DEBUG] Error creating test interface:', e);

                }

            }

            

            // Викликаємо оригінальний

            console.log('[Style Interface DEBUG] Calling original InteractionMain...');

            const result = new originalInteractionMain(data);

            console.log('[Style Interface DEBUG] Original InteractionMain returned:', result);

            return result;

        };

        

        console.log('[Style Interface DEBUG] InteractionMain hook installed');

        

        // Додаємо метод для примусового тестування

        window.testStyleInterface = function() {

            console.log('[Style Interface DEBUG] Manual test started');

            const testData = {

                source: 'tmdb',

                type: 'movie',

                title: 'Test Movie',

                id: 123,

                url: 'test'

            };

            

            console.log('[Style Interface DEBUG] Creating InteractionMain with test data...');

            const instance = Lampa.InteractionMain(testData);

            console.log('[Style Interface DEBUG] Test instance:', instance);

        };

    } else {

        console.error('[Style Interface DEBUG] Cannot hook InteractionMain - not found!');

    }



    // ==================== ОСНОВНИЙ КОД ПЛАГІНА ====================

    const PLUGIN_NAME = 'style_interface';

    const PLUGIN_DISPLAY_NAME = 'Стильный интерфейс';



    class NewInterfaceInfo {

        constructor(data) {

            console.log('[Style Interface] NewInterfaceInfo created for:', data.title || data.name);

            this.data = data;

            this.cache = {};

            this.request = new Lampa.Reguest();

            this.timeout = null;

            this.create();

        }



        create() {

            this.element = $(`

                <div class="new-interface-info">

                    <div class="new-interface-info__body">

                        <div class="new-interface-info__head"></div>

                        <div class="new-interface-info__title"></div>

                        <div class="new-interface-info__details"></div>

                        <div class="new-interface-info__description"></div>

                    </div>

                </div>

            `);

        }



        update(item) {

            console.log('[Style Interface] NewInterfaceInfo update:', item.title || item.name);

            // ... решта методу без змін ...

        }



        draw(item) {

            console.log('[Style Interface] NewInterfaceInfo draw:', item.title || item.name);

            // ... решта методу без змін ...

        }



        render() {

            console.log('[Style Interface] NewInterfaceInfo render called');

            return this.element;

        }

    }



    class NewInterface {

        constructor(data) {

            console.log('[Style Interface] ⭐⭐⭐ NEWINTERFACE CONSTRUCTOR CALLED! ⭐⭐⭐', {

                source: data.source,

                title: data.title || data.name,

                id: data.id

            });

            this.data = data;

            this.request = new Lampa.Reguest();

            this.scroll = new Lampa.Scroll({mask: true, over: true, scroll_by_item: true});

            this.cards = [];

            this.currentIndex = 0;

            this.infoBlock = null;

            this.items = null;

            this.backgroundElement = null;

            this.currentBackground = '';

            this.backgroundTimeout = null;

            

            this.create();

        }



        create() {

            console.log('[Style Interface] Creating NewInterface element');

            this.element = $(`

                <div class="new-interface">

                    <img class="full-start__background">

                    <div style="position:absolute;top:20px;left:20px;background:red;color:white;padding:10px;z-index:1000;">

                        🎨 STYLE INTERFACE ACTIVE

                    </div>

                </div>

            `);

            this.backgroundElement = this.element.find('.full-start__background');

            

            // Додаємо тестовий елемент для візуальної перевірки

            setTimeout(() => {

                $('body').append('<div id="style-interface-test" style="position:fixed;top:10px;right:10px;background:#ff4444;color:white;padding:10px;z-index:9999;border-radius:5px;">🎨 Style Interface LOADED</div>');

                setTimeout(() => $('#style-interface-test').fadeOut(), 3000);

            }, 1000);

        }



        render(items) {

            console.log('[Style Interface] ⭐⭐⭐ NEWINTERFACE RENDER CALLED! ⭐⭐⭐', {

                itemsCount: items.length,

                firstItem: items[0]

            });

            

            const self = this;

            this.items = items;

            this.infoBlock = new NewInterfaceInfo(this.data);

            this.infoBlock.create();

            

            this.scroll.minus(this.infoBlock.render());

            

            // Додаємо перші елементи

            const viewType = Lampa.Storage.field('card_views_type') === 'view' || 

                           Lampa.Storage.field('navigation_type') === 'static';

            const itemsToShow = viewType ? items.length : Math.min(2, items.length);

            items.slice(0, itemsToShow).forEach(this.append.bind(this));

            

            this.element.append(this.infoBlock.render());

            this.element.append(this.scroll.render());

            

            // Завжди активуємо

            Lampa.Layer.update(this.element);

            Lampa.Layer.visible(this.scroll.render(true));

            this.scroll.onEnd = this.loadNext.bind(this);

            this.scroll.onChange = function(position) {

                if (!Lampa.Controller.own(self)) {

                    self.start();

                }

                if (position > 0) {

                    self.down();

                } else {

                    if (self.currentIndex > 0) {

                        self.up();

                    }

                }

            };

            

            this.activity.loader(false);

            this.activity.toggle();

            

            console.log('[Style Interface] NewInterface render completed');

            return this;

        }



        append(cardData) {

            console.log('[Style Interface] Appending card:', cardData.title || cardData.name);

            if (cardData.rendered) return;

            cardData.rendered = true;

            

            const self = this;

            const card = new Lampa.InteractionLine(cardData, {

                url: cardData.url,

                card_small: true,

                cardClass: cardData.cardClass,

                genres: this.data.genres,

                object: this.data,

                card_wide: Lampa.Storage.field('wide_post') !== false,

                nomore: cardData.nomore

            });

            

            card.create();

            card.onDown = this.down.bind(this);

            card.onUp = this.up.bind(this);

            card.onBack = this.back.bind(this);

            card.onChange = function() {

                self.currentIndex = self.cards.indexOf(card);

            };

            

            card.onFocus = function(item) {

                console.log('[Style Interface] Card focused:', item.title || item.name);

                self.infoBlock.update(item);

                self.background(item);

            };

            

            card.onHover = function(item) {

                self.infoBlock.update(item);

                self.background(item);

            };

            

            card.onToggle = self.infoBlock.clear.bind(self.infoBlock);

            

            this.scroll.append(card.render());

            this.cards.push(card);

        }



        start() {

            console.log('[Style Interface] NewInterface start() called');

            const self = this;

            Lampa.Controller.add('content', {

                link: this,

                toggle: function() {

                    if (self.activity.canRefresh()) return false;

                    self.cards.length && self.cards[self.currentIndex].toggle();

                },

                update: function() {},

                left: function() {

                    if (Navigator.canmove('left')) {

                        Navigator.move('left');

                    } else {

                        Lampa.Controller.toggle('menu');

                    }

                },

                right: function() {

                    Navigator.move('right');

                },

                up: function() {

                    if (Navigator.canmove('up')) {

                        Navigator.move('up');

                    } else {

                        Lampa.Controller.toggle('head');

                    }

                },

                down: function() {

                    if (Navigator.canmove('down')) {

                        Navigator.move('down');

                    }

                },

                back: this.back.bind(this)

            });

            Lampa.Controller.toggle('content');

        }



        renderElement() {

            return this.element;

        }

    }



    function initPlugin() {

        console.log('[Style Interface] Initializing plugin...');

        

        if (typeof Lampa === 'undefined' || typeof $ === 'undefined') {

            console.error('[Style Interface] Lampa or jQuery not found');

            return;

        }



        // Тепер перевизначаємо InteractionMain ПРАВИЛЬНО

        const originalInteractionMain = Lampa.InteractionMain;

        

        Lampa.InteractionMain = function(data) {

            console.log('[Style Interface] 🎯 InteractionMain intercepted!', {

                source: data.source,

                type: data.type,

                title: data.title || data.name

            });

            

            // Тільки для TMDB/CUB

            if (data.source === 'tmdb' || data.source === 'cub') {

                console.log('[Style Interface] 🚀 Creating NewInterface for', data.source);

                try {

                    const instance = new NewInterface(data);

                    console.log('[Style Interface] ✅ NewInterface created successfully:', instance);

                    return instance;

                } catch (e) {

                    console.error('[Style Interface] ❌ Error creating NewInterface:', e);

                    console.log('[Style Interface] Falling back to original');

                    return new originalInteractionMain(data);

                }

            }

            

            // Для інших джерел - оригінальний

            console.log('[Style Interface] Using original InteractionMain for', data.source);

            return new originalInteractionMain(data);

        };



        console.log('[Style Interface] InteractionMain override installed');



        // Додаємо стилі

        const css = `

            .new-interface {

                position: relative;

                background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%);

                min-height: 400px;

                border-bottom: 2px solid #ff4444;

            }

            

            .new-interface .card--small.card--wide {

                width: 18.3em !important;

                margin: 0 1em;

                transform: scale(1.05);

                transition: transform 0.2s;

            }

            

            .new-interface .card--small.card--wide:hover {

                transform: scale(1.1);

            }

            

            .new-interface-info {

                padding: 2em;

                color: white;

                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);

            }

            

            #style-interface-debug {

                position: fixed;

                top: 50px;

                right: 10px;

                background: rgba(0,0,0,0.8);

                color: #0f0;

                padding: 10px;

                font-family: monospace;

                z-index: 99999;

                border: 2px solid #0f0;

                border-radius: 5px;

            }

        `;



        $('head').append(`<style id="style-interface-styles">${css}</style>`);

        console.log('[Style Interface] Styles added');



        // Додаємо debug панель

        const debugPanel = $(`

            <div id="style-interface-debug">

                <div>🎨 Style Interface v1.0</div>

                <div>Status: <span id="style-interface-status">ACTIVE</span></div>

                <div>Calls: <span id="style-interface-calls">0</span></div>

                <button onclick="window.testStyleInterface()">Test</button>

            </div>

        `);

        $('body').append(debugPanel);



        // Реєстрація налаштувань

        const waitForSettings = setInterval(() => {

            if (Lampa.Settings && Lampa.SettingsApi) {

                clearInterval(waitForSettings);

                console.log('[Style Interface] Registering settings...');

                

                const settings = [

                    {name: 'wide_post', field: 'Широкие постеры', default: true},

                    {name: 'logo_card_style', field: 'Логотип вместо названия', default: true},

                    {name: 'info', field: 'Показывать описание', default: true},

                    {name: 'status', field: 'Показывать статус фильма/сериала', default: false},

                    {name: 'seas', field: 'Показывать количество сезонов', default: false},

                    {name: 'eps', field: 'Показывать количество эпизодов', default: false},

                    {name: 'year_ogr', field: 'Показывать возрастное ограничение', default: true},

                    {name: 'ganr', field: 'Показывать жанр фильма', default: true},

                    {name: 'vremya', field: 'Показывать время фильма', default: true},

                    {name: 'rat', field: 'Показывать рейтинг фильма', default: true}

                ];



                // Додаємо компонент

                Lampa.SettingsApi.addComponent({

                    component: PLUGIN_NAME,

                    name: PLUGIN_DISPLAY_NAME,

                    icon: `<div style="color:#ff4444;font-weight:bold">🎨</div>`

                });



                // Додаємо параметри
                settings.forEach(setting => {
                    try {
                        Lampa.SettingsApi.addParam({
                            component: PLUGIN_NAME,
                            param: {name: setting.name, type: 'trigger', default: setting.default},
                            field: {name: setting.field}
                        });
                        console.log(`[Style Interface] Added setting: ${setting.field}`);
                    } catch (e) {
                        console.error(`[Style Interface] Error adding ${setting.field}:`, e);
                    }
                });

                console.log('[Style Interface] Plugin fully initialized');
                
                // Оновлюємо debug панель
                setInterval(() => {
                    $('#style-interface-calls').text(debug.interactionCallCount);
                    $('#style-interface-status').text(
                        debug.interactionCallCount > 0 ? 'WORKING' : 'WAITING'
                    );
                }, 1000);
            }
        }, 100);
    }

    // Запускаємо
    const waitForLampa = setInterval(() => {
        if (typeof Lampa !== 'undefined' && typeof $ !== 'undefined') {
            clearInterval(waitForLampa);
            console.log('[Style Interface DEBUG] Lampa and jQuery loaded, starting init...');
            
            // Чекаємо трохи більше
            setTimeout(() => {
                try {
                    initPlugin();
                    
                    // Після ініціалізації
                    setTimeout(() => {
                        console.log('[Style Interface DEBUG] === FINAL DIAGNOSTICS ===');
                        console.log('[Style Interface DEBUG] Total InteractionMain calls:', debug.interactionCallCount);
                        console.log('[Style Interface DEBUG] Page changes:', debug.pageChanges.length);
                        console.log('[Style Interface DEBUG] Plugin state: READY');
                        
                        if (debug.interactionCallCount === 0) {
                            console.warn('[Style Interface DEBUG] WARNING: No InteractionMain calls detected yet.');
                            console.log('[Style Interface DEBUG] Try navigating to a movie/series page.');
                        }
                    }, 2000);
                    
                } catch (e) {
                    console.error('[Style Interface DEBUG] Init error:', e);
                }
            }, 1500);
        }
    }, 100);

    console.log('[Style Interface DEBUG] === PLUGIN WRAPPER EXECUTED ===');

})();
