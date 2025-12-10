(function() {  
    'use strict';  
  
    console.log('[Style Interface DEBUG] === START PLUGIN ===');  
    console.log('[Style Interface DEBUG] Plugin loaded at:', new Date().toISOString());  
    console.log('[Style Interface DEBUG] Location:', window.location.href);  
    console.log('[Style Interface DEBUG] Lampa available:', typeof Lampa !== 'undefined');  
  
    if (typeof Lampa !== 'undefined') {  
        console.log('[Style Interface DEBUG] Lampa version:', Lampa.version || 'unknown');  
        console.log('[Style Interface DEBUG] Lampa.Manifest:', Lampa.Manifest);  
  
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
  
        // ==================== ШАБЛОНИ ====================  
        var full_start_new_template = `  
        <div class="full-start-new cardify">  
            <div class="full-start-new__body">  
                <div class="full-start-new__left hide">  
                    <div class="full-start-new__poster">  
                        <img class="full-start-new__img full--poster" />  
                    </div>  
                </div>  
  
                <div class="full-start-new__right">  
                      
                    <div class="cardify__left">  
                        <div class="full-start-new__title">{title}</div>  
                        <div class="full-start-new__head"></div>  
  
                        <div class="cardify__details">  
                            <div class="full-start-new__details"></div>  
                        </div>  
  
                        <div class="full-start-new__buttons">  
                            <div class="full-start__button selector button--play">  
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">  
                                    <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>  
                                    <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>  
                                </svg>  
  
                                <span>#{title_watch}</span>  
                            </div>  
  
                            <div class="full-start__button selector button--book">  
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">  
                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="1.5"/>  
                                </svg>  
  
                                <span>#{title_bookmark}</span>  
                            </div>  
  
                            <div class="full-start__button selector button--trailer">  
                                <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">  
                                <path d="M30.9995 12.0001C30.9995 18.6275 25.627 24.0001 18.9995 24.0001H12.9995C6.37208 24.0001 0.999512 18.6275 0.999512 12.0001C0.999512 5.37266 6.37208 0.00012207 12.9995 0.00012207H18.9995C25.627 0.00012207 30.9995 5.37266 30.9995 12.0001Z" stroke="currentColor" stroke-width="1.5"/>  
                                <path d="M13 7.5L13 16.5L20 12L13 7.5Z" fill="currentColor"/>  
                                </svg>  
  
                                <span>#{title_trailer}</span>  
                            </div>  
                        </div>  
                    </div>  
  
                    <div class="cardify__right">  
                        <div class="full-start-new__descr">{descr}</div>  
                    </div>  
                </div>  
            </div>  
        </div>`;  
  
        var card_template = `  
        <div class="card">  
            <div class="card__img">  
                <img />  
            </div>  
        </div>`;  
  
        // ==================== CSS СТИЛІ ====================  
        var style = `  
        <style>  
        .full-start-new__head {  
            margin-bottom: 1em;  
        }  
          
        body.cardify-trailer-active .full-start__background {  
            opacity: 0.3;  
        }  
          
        .cardify {  
            position: absolute;  
            top: 0;  
            left: 0;  
            right: 0;  
            bottom: 0;  
            z-index: 2;  
            background: rgba(0,0,0,0);  
            -webkit-mask-image: -webkit-gradient(linear, left top, left bottom, color-stop(50%, white), to(rgba(255,255,255,0)));  
            -webkit-mask-image: -webkit-linear-gradient(top, white 50%, rgba(255,255,255,0) 100%);  
            mask-image: -webkit-gradient(linear, left top, left bottom, color-stop(50%, white), to(rgba(255,255,255,0)));  
            mask-image: linear-gradient(to bottom, white 50%, rgba(255,255,255,0) 100%);  
        }  
          
        .cardify__left {  
            width: 50%;  
            display: inline-block;  
            vertical-align: top;  
            padding-right: 2em;  
        }  
          
        .cardify__right {  
            width: 50%;  
            display: inline-block;  
            vertical-align: top;  
        }  
          
        .cardify__details {  
            margin: 2em 0;  
        }  
          
        .cardify-trailer {  
            position: fixed;  
            top: 0;  
            left: 0;  
            width: 100%;  
            height: 100%;  
            background: rgba(0,0,0,0.9);  
            z-index: 100;  
            display: none;  
        }  
          
        .cardify-trailer.display {  
            display: block;  
        }  
          
        .cardify-trailer__youtube {  
            position: absolute;  
            top: 50%;  
            left: 50%;  
            -webkit-transform: translate(-50%, -50%);  
            transform: translate(-50%, -50%);  
            width: 80%;  
            height: 80%;  
            max-width: 900px;  
            max-height: 506px;  
        }  
          
        .cardify-trailer__youtube-iframe {  
            width: 100%;  
            height: 100%;  
        }  
          
        .cardify-trailer__controlls {  
            position: absolute;  
            bottom: 2em;  
            left: 50%;  
            -webkit-transform: translateX(-50%);  
            transform: translateX(-50%);  
            color: white;  
            text-align: center;  
        }  
          
        .cardify-trailer__title {  
            font-size: 1.5em;  
            margin-bottom: 1em;  
        }  
          
        .cardify-trailer__remote {  
            margin-top: 1em;  
        }  
          
        .cardify-trailer__remote-icon {  
            display: inline-block;  
            cursor: pointer;  
            padding: 1em;  
            background: rgba(255,255,255,0.1);  
            border-radius: 50%;  
        }  
          
        .cardify-trailer__remote-icon:hover {  
            background: rgba(255,255,255,0.2);  
        }  
          
        .cardify-trailer__youtube-line {  
            position: absolute;  
            background: rgba(255,255,255,0.1);  
        }  
          
        .cardify-trailer__youtube-line.one {  
            top: 0;  
            left: 0;  
            right: 0;  
            height: 3em;  
        }  
          
        .cardify-trailer__youtube-line.two {  
            bottom: 0;  
            left: 0;  
            right: 0;  
            height: 3em;  
        }  
          
        body:not(.menu--open) .cardify__background{  
            -webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));  
            -webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);  
            mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));  
            mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%);  
        }  
        </style>`;  
  
        // Додаємо стилі до сторінки  
        $('head').append(style);  
  
        // ==================== КЛАСИ ====================  
        var NewInterfaceInfo = /*#__PURE__*/function () {  
            function NewInterfaceInfo() {  
                _classCallCheck(this, NewInterfaceInfo);  
                this.info = null;  
            }  
  
            _createClass(NewInterfaceInfo, [{  
                key: "create",  
                value: function create(data) {  
                    this.info = $('<div class="full-start-new__info"></div>');  
                    return this.info;  
                }  
            }, {  
                key: "update",  
                value: function update(item) {  
                    console.log('[Style Interface] NewInterfaceInfo update:', item.title || item.name);  
                    if (this.info) {  
                        this.info.find('.full-start-new__title').text(item.title || item.name);  
                        this.info.find('.full-start-new__descr').text(item.description || '');  
                    }  
                }  
            }, {  
                key: "draw",  
                value: function draw(item) {  
                    console.log('[Style Interface] NewInterfaceInfo draw:', item.title || item.name);  
                    this.update(item);  
                    return this.info;  
                }  
            }]);  
  
            return NewInterfaceInfo;  
        }();
var NewInterface = /*#__PURE__*/function () {  
            function NewInterface(data) {  
                _classCallCheck(this, NewInterface);  
                  
                this.data = data;  
                this.activity = data.activity;  
                this.selected = 0;  
                this.scroll = new Lampa.Scrollbar({  
                    horizontal: true  
                });  
                this.info = new NewInterfaceInfo();  
                this.create();  
            }  
  
            _createClass(NewInterface, [{  
                key: "create",  
                value: function create() {  
                    var _this = this;  
                      
                    this.activity.loader(false);  
                    this.activity.toggle();  
                      
                    var html = $(full_start_new_template);  
                    this.body = html.find('.full-start-new__body');  
                    this.left = html.find('.full-start-new__left');  
                    this.right = html.find('.full-start-new__right');  
                      
                    // Створюємо картки  
                    this.data.cards.forEach((card, index) => {  
                        var card_html = $(card_template.replace('{title}', card.title));  
                        card_html.on('hover:enter', () => {  
                            this.selected = index;  
                            this.updateSelected();  
                        });  
                        this.body.append(card_html);  
                    });  
                      
                    this.activity.render().append(html);  
                    this.updateSelected();  
                }  
            }, {  
                key: "updateSelected",  
                value: function updateSelected() {  
                    this.body.find('.card').removeClass('focus');  
                    if (this.data.cards[this.selected]) {  
                        this.body.find('.card').eq(this.selected).addClass('focus');  
                        this.background(this.data.cards[this.selected]);  
                    }  
                }  
            }, {  
                key: "background",  
                value: function background(item) {  
                    if (item && item.backdrop) {  
                        this.activity.render().find('.full-start__background')  
                            .attr('src', Lampa.Utils.cardImgBackground(item.backdrop));  
                    }  
                }  
            }, {  
                key: "down",  
                value: function down() {  
                    this.selected++;  
                    if (this.selected >= this.data.cards.length) {  
                        this.selected = 0;  
                    }  
                    this.updateSelected();  
                }  
            }, {  
                key: "up",  
                value: function up() {  
                    this.selected--;  
                    if (this.selected < 0) {  
                        this.selected = this.data.cards.length - 1;  
                    }  
                    this.updateSelected();  
                }  
            }, {  
                key: "back",  
                value: function back() {  
                    Lampa.Activity.backward();  
                }  
            }]);  
  
            return NewInterface;  
        }();  
  
        // ==================== НАЛАШТУВАННЯ ====================  
        function initPlugin() {  
            // Додаємо debug панель  
            $('body').append(`  
                <div id="style-interface-debug" style="  
                    position: fixed;  
                    top: 10px;  
                    right: 10px;  
                    background: rgba(0,0,0,0.8);  
                    color: white;  
                    padding: 10px;  
                    border-radius: 5px;  
                    font-size: 12px;  
                    z-index: 9999;  
                ">  
                    <div>Style Interface Debug</div>  
                    <div>Calls: <span id="style-interface-calls">0</span></div>  
                    <div>Status: <span id="style-interface-status">WAITING</span></div>  
                </div>  
            `);  
  
            // Перехоплюємо InteractionMain  
            if (Lampa.InteractionMain) {  
                var originalInteractionMain = Lampa.InteractionMain;  
                  
                Lampa.InteractionMain = function(data) {  
                    debug.interactionCallCount++;  
                    debug.lastInteractionData = data;  
                    debug.interactionCalls.push({  
                        data: data,  
                        time: Date.now()  
                    });  
                      
                    console.log('[Style Interface] InteractionMain called:', data);  
                      
                    // Перевіряємо чи це TMDB або CUB джерело  
                    if (data.source && (data.source.name === 'tmdb' || data.source.name === 'cub')) {  
                        console.log('[Style Interface] Using custom interface for:', data.source.name);  
                          
                        try {  
                            var customInterface = new NewInterface(data);  
                            return customInterface;  
                        } catch (e) {  
                            console.error('[Style Interface] Error creating custom interface:', e);  
                            return originalInteractionMain.call(this, data);  
                        }  
                    }  
                      
                    return originalInteractionMain.call(this, data);  
                };  
                  
                console.log('[Style Interface] Plugin fully initialized');  
                  
                // Оновлюємо debug панель  
                setInterval(() => {  
                    $('#style-interface-calls').text(debug.interactionCallCount);  
                    $('#style-interface-status').text(  
                        debug.interactionCallCount > 0 ? 'WORKING' : 'WAITING'  
                    );  
                }, 1000);  
            }  
        }  
  
        // Запускаємо  
        const waitForLampa = setInterval(() => {  
            if (typeof Lampa !== 'undefined' && typeof $ !== 'undefined') {  
                clearInterval(waitForLampa);  
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
    }  
  
    console.log('[Style Interface DEBUG] === PLUGIN WRAPPER EXECUTED ===');  
})();  
  
// ==================== HTML ШАБЛОНИ ====================  
var full_start_new_template = `  
<div class="full-start-new cardify">  
    <div class="full-start-new__body">  
        <div class="full-start-new__left hide">  
            <div class="full-start-new__poster">  
                <img class="full-start-new__img full--poster" />  
            </div>  
        </div>  
          
        <div class="full-start-new__right">  
            <div class="cardify__left">  
                <div class="full-start-new__title">{title}</div>  
                <div class="full-start-new__head"></div>  
                  
                <div class="cardify__details">  
                    <div class="full-start-new__details"></div>  
                </div>  
                  
                <div class="full-start-new__buttons">  
                    <div class="full-start__button selector button--play">  
                        <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>  
                            <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>  
                        </svg>  
                        <span>#{title_watch}</span>  
                    </div>  
                      
                    <div class="full-start__button selector button--book">  
                        <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.7071 28.3536L10.5 21.5L2.29289 28.3536C1.97386 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2"/>  
                        </svg>  
                    </div>  
                      
                    <div class="full-start__button selector button--trailer">  
                        <svg width="32" height="23" viewBox="0 0 32 23" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <path d="M31 3.5C31 1.5 29.5 0 27.5 0H4.5C2.5 0 1 1.5 1 3.5V19.5C1 21.5 2.5 23 4.5 23H27.5C29.5 23 31 21.5 31 19.5V3.5Z" stroke="currentColor" stroke-width="2"/>  
                            <path d="M12 7L20 11.5L12 16V7Z" fill="currentColor"/>  
                        </svg>  
                    </div>  
                </div>  
            </div>  
              
            <div class="cardify__right">  
                <div class="cardify__scroll">  
                    <div class="cardify__items"></div>  
                </div>  
            </div>  
        </div>  
    </div>  
</div>`;  
  
var card_template = `  
<div class="card selector">  
    <div class="card__img">  
        <img />  
    </div>  
    <div class="card__title">{title}</div>  
</div>`;  
  
// ==================== CSS СТИЛІ ====================  
var style_interface_css = `  
<style>  
.full-start-new.cardify {  
    position: absolute;  
    top: 0;  
    left: 0;  
    right: 0;  
    bottom: 0;  
    background: #000;  
    z-index: 100;  
}  
  
.full-start-new__body {  
    display: flex;  
    height: 100%;  
}  
  
.full-start-new__left {  
    width: 30%;  
    position: relative;  
}  
  
.full-start-new__right {  
    width: 70%;  
    display: flex;  
    padding: 3em;  
}  
  
.cardify__left {  
    width: 50%;  
    padding-right: 2em;  
}  
  
.cardify__right {  
    width: 50%;  
    position: relative;  
}  
  
.full-start-new__title {  
    font-size: 3em;  
    font-weight: 300;  
    margin-bottom: 1em;  
    color: #fff;  
}  
  
.full-start-new__head {  
    margin-bottom: 2em;  
}  
  
.cardify__details {  
    margin-bottom: 2em;  
}  
  
.full-start-new__buttons {  
    display: flex;  
    gap: 1em;  
}  
  
.full-start__button {  
    display: flex;  
    align-items: center;  
    padding: 1em 1.5em;  
    background: rgba(255, 255, 255, 0.1);  
    border-radius: 0.5em;  
    color: #fff;  
    cursor: pointer;  
    transition: all 0.3s;  
}  
  
.full-start__button:hover,  
.full-start__button.focus {  
    background: rgba(255, 255, 255, 0.2);  
}  
  
.full-start__button svg {  
    margin-right: 0.5em;  
}  
  
.cardify__scroll {  
    height: 100%;  
    overflow: hidden;  
    position: relative;  
}  
  
.cardify__items {  
    display: flex;  
    gap: 1em;  
    height: 100%;  
    align-items: center;  
}  
  
.card {  
    flex-shrink: 0;  
    width: 12em;  
    cursor: pointer;  
    transition: transform 0.3s;  
}  
  
.card:hover,  
.card.focus {  
    transform: scale(1.05);  
}  
  
.card__img {  
    width: 100%;  
    height: 18em;  
    border-radius: 0.5em;  
    overflow: hidden;  
    position: relative;  
}  
  
.card__img img {  
    width: 100%;  
    height: 100%;  
    object-fit: cover;  
}  
  
.card__title {  
    margin-top: 0.5em;  
    font-size: 1.1em;  
    color: #fff;  
    text-align: center;  
}  
  
/* Debug панель */  
#style-interface-debug {  
    position: fixed;  
    top: 10px;  
    right: 10px;  
    background: rgba(0, 0, 0, 0.8);  
    color: #fff;  
    padding: 10px;  
    border-radius: 5px;  
    font-size: 12px;  
    z-index: 9999;  
}  
</style>`;  
  
// Додаємо CSS до сторінки  
$('head').append(style_interface_css);
// ==================== ДОДАТКОВІ УТИЛІТИ ====================  
function createDebugPanel() {  
    var debugHtml = `  
        <div id="style-interface-debug">  
            <div>Style Interface Debug</div>  
            <div>Calls: <span id="style-interface-calls">0</span></div>  
            <div>Status: <span id="style-interface-status">WAITING</span></div>  
        </div>  
    `;  
    $('body').append(debugHtml);  
}  
  
// ==================== ОБРОБНИКИ ПОДІЙ ====================  
function setupEventListeners() {  
    // Слухаємо зміни activity  
    Lampa.Listener.follow('activity', function(e) {  
        if (e.type === 'start' && e.object.activity) {  
            debug.pageChanges.push({  
                type: 'activity_start',  
                object: e.object.activity.component,  
                time: Date.now()  
            });  
            console.log('[Style Interface DEBUG] Activity started:', e.object.activity.component);  
        }  
    });  
  
    // Слухаємо зміни controller  
    Lampa.Controller.listener.follow('toggle', function(e) {  
        debug.pageChanges.push({  
            type: 'controller_toggle',  
            name: e.name,  
            time: Date.now()  
        });  
        console.log('[Style Interface DEBUG] Controller toggle:', e.name);  
    });  
}  
  
// ==================== ІНІЦІАЛІЗАЦІЯ ПЛАГІНА ====================  
function initPlugin() {  
    console.log('[Style Interface DEBUG] Initializing plugin...');  
      
    // Створюємо debug панель  
    createDebugPanel();  
      
    // Налаштовуємо слухачів подій  
    setupEventListeners();  
      
    // Перевіряємо наявність InteractionMain  
    if (typeof Lampa.InteractionMain === 'function') {  
        console.log('[Style Interface DEBUG] InteractionMain found, setting up wrapper...');  
          
        var originalInteractionMain = Lampa.InteractionMain;  
          
        Lampa.InteractionMain = function(data) {  
            debug.interactionCallCount++;  
            debug.lastInteractionData = data;  
            debug.interactionCalls.push({  
                data: data,  
                time: Date.now()  
            });  
              
            console.log('[Style Interface] InteractionMain called:', data);  
              
            // Перевіряємо чи це TMDB або CUB джерело  
            if (data.source && (data.source.name === 'tmdb' || data.source.name === 'cub')) {  
                console.log('[Style Interface] Using custom interface for:', data.source.name);  
                  
                try {  
                    var customInterface = new NewInterface(data);  
                    return customInterface;  
                } catch (e) {  
                    console.error('[Style Interface] Error creating custom interface:', e);  
                    return originalInteractionMain.call(this, data);  
                }  
            }  
              
            return originalInteractionMain.call(this, data);  
        };  
          
        console.log('[Style Interface] Plugin fully initialized');  
          
        // Оновлюємо debug панель  
        setInterval(() => {  
            $('#style-interface-calls').text(debug.interactionCallCount);  
            $('#style-interface-status').text(  
                debug.interactionCallCount > 0 ? 'WORKING' : 'WAITING'  
            );  
        }, 1000);  
    }  
}  
  
// ==================== ЗАПУСК ПЛАГІНА ====================  
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
})(); // Закриття IIFE
