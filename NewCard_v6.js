(function () {  
    'use strict';  
  
    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style';

    // Нові SVG іконки з наданого коду
    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`
    };

    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();
        attachLoader();  
    }  

    function addSettings() {
        const defaults = { 'cas_logo_scale': '100', 'cas_bg_animation': true };
        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff"><rect x="10" y="30" width="80" height="40" rx="5" fill="rgba(255,255,255,0.2)"/><circle cx="50" cy="50" r="12" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону' },
            onChange: applySettings
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;
        root.style.setProperty('--cas-logo-scale', scale);
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
    }
  
    function addCustomTemplate() {  
        const template = `<div class="full-start-new left-title cas-apple-style">  
        <div class="full-start-new__body">  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster"><img class="full-start-new__img full--poster" /></div>  
            </div>  
  
            <div class="full-start-new__right">  
                <div class="left-title__content">  
                    <div class="cas-logo-container" style="margin-bottom: 25px;">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title">{title}</div>  
                    </div>
                      
                    <div class="full-start-new__head"></div>  
                    <div class="full-start-new__details"></div>  
                      
                    <div class="full-start-new__buttons applecation__buttons-row">  
                        <div class="full-start__button selector button--play">  
                            ${ICONS.play} <span>Дивитися</span>  
                        </div>  
                        
                        <div class="full-start__button selector view--trailer">${ICONS.trailer}</div>

                        <div class="full-start__button selector button--book">${ICONS.book}</div>  
  
                        <div class="full-start__button selector button--reaction">${ICONS.reaction}</div>  
  
                        <div class="full-start__button selector button--options">${ICONS.options}</div>  
                    </div>  
                </div>  
  
                <div class="full-start-new__reactions selector"><div>#{reactions_none}</div></div>  
                <div class="full-start-new__rate-line"><div class="full-start__status hide"></div></div>  
                <div class="rating--modss" style="display: none;"></div>  
            </div>  
        </div>  
  
        <div class="hide buttons--container">  
            <div class="full-start__button view--torrent hide">${ICONS.play}</div>   
        </div>  
    </div>`;  
  
        Lampa.Template.add('full_start_new', template);  
    }  
  
    function addStyles() {  
        const styles = `<style>  
:root { --cas-logo-scale: 1; }

.left-title .full-start-new__body { height: 85vh; }  
.left-title .full-start-new__right { display: flex; align-items: flex-end; padding-left: 5%; }  
.left-title__content { flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 40px; }  

/* Приховування зайвого */
.left-title .full-start-new__reactions,
.left-title .full-start-new__rate-line,
.left-title .full-start__status,
.left-title .rating--modss { display: none !important; }

/* Логотип */
.cas-logo img {
    max-width: calc(480px * var(--cas-logo-scale));
    max-height: calc(180px * var(--cas-logo-scale));
    object-fit: contain; object-position: left bottom;
    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
}

/* НОВИЙ СТИЛЬ КНОПОК ЯК У ПЛАГІНІ */
.applecation__buttons-row { display: flex; align-items: center; gap: 15px; margin-top: 20px; }

/* Головна кнопка */
.cas-apple-style .button--play {  
    background: #fff !important; color: #000 !important;  
    padding: 12px 35px !important; border-radius: 12px !important;  
    font-weight: 700 !important; text-transform: none;
    display: flex; align-items: center; gap: 8px;
    transition: transform 0.2s, background 0.2s;
}

/* Мінімалістичні іконки */
.cas-apple-style .full-start__button:not(.button--play) {  
    background: none !important; border: none !important;  
    color: rgba(255,255,255,0.6) !important; padding: 10px !important;
    display: flex; justify-content: center; align-items: center;
    transition: transform 0.2s, color 0.2s;
}

/* Фокус на кнопках */
.cas-apple-style .full-start__button.focus:not(.button--play) {  
    transform: scale(1.3);  
    color: #fff !important;
    filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)) !important;  
}

.cas-apple-style .button--play.focus {  
    background: #e0e0e0 !important;  
    transform: scale(1.05);
    filter: none !important; 
}

/* Анімація Ken Burns */
@keyframes casKenBurns { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
body.cas--zoom-enabled .full-start__background.loaded { 
    animation: casKenBurns 45s ease-out forwards !important; 
}

.left-title .full-start-new__title { font-size: 2.5em; font-weight: 700; color: #fff; }  
</style>`;  
  
        Lampa.Template.add('left_title_css', styles);  
        $('body').append(Lampa.Template.get('left_title_css', {}, true));  
    }  
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                if (data && data.id) {
                    $.get(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()), (res) => {
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (bestLogo) {
                            render.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path) + '">');
                            render.find('.full-start-new__title').hide();
                        } else {
                            render.find('.full-start-new__title').show();
                        }
                    });
                }
            }  
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
  
})();
