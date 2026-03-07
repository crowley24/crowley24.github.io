(function () {  
    'use strict';  
  
    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style';

    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`
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
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="5" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','85':'85%','100':'100%','115':'115%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону (Ken Burns)' },
            onChange: applySettings
        });

        applySettings();
    }

    function applySettings() {
        const scale = (parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100).toFixed(2);
        document.documentElement.style.setProperty('--cas-logo-scale', scale);
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
    }
  
    function addCustomTemplate() {  
        const template = `
        <div class="full-start-new left-title cas-apple-style">  
            <div class="full-start-new__body">  
                <div class="full-start-new__right">  
                    <div class="left-title__content">  
                        <div class="cas-logo-container">
                            <div class="cas-logo"></div>
                            <div class="full-start-new__title">{title}</div>  
                        </div>
                          
                        <div class="full-start-new__details" style="margin-top: 20px;"></div>  
                          
                        <div class="full-start-new__buttons applecation__buttons-row">  
                            <div class="full-start__button selector button--play">  
                                ${ICONS.play} <span>#{title_watch}</span>  
                            </div>  
                            <div class="full-start__button selector view--trailer">
                                ${ICONS.trailer} <span>#{full_trailers}</span>
                            </div>
                            <div class="full-start__button selector button--book">
                                ${ICONS.book} <span>#{settings_input_links}</span>
                            </div>  
                            <div class="full-start__button selector button--options">
                                ${ICONS.options}
                            </div>  
                        </div>  
                    </div>  
                </div>  
            </div>  
        </div>`;  
  
        Lampa.Template.add('full_start_new', template);  
    }  
  
    function addStyles() {  
        const styles = `<style>  
            :root { --cas-logo-scale: 1; }

            /* Контейнер картки */
            .cas-apple-style .full-start-new__body { 
                height: 100vh; 
                background: linear-gradient(to top, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.3) 50%, transparent 100%);
            }
            .cas-apple-style .full-start-new__right { padding-left: 60px; padding-bottom: 80px; }

            /* Логотип */
            .cas-logo img {
                display: block;
                width: auto;
                height: auto;
                max-width: calc(450px * var(--cas-logo-scale));
                max-height: calc(180px * var(--cas-logo-scale));
                object-fit: contain; 
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
                margin-bottom: 10px;
            }

            /* Кнопки в стилі Apple */
            .applecation__buttons-row { display: flex; gap: 12px; margin-top: 35px; }
            .cas-apple-style .full-start__button {  
                background: rgba(255,255,255,0.1) !important; 
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.05) !important;
                color: #fff !important; 
                padding: 14px 28px !important;
                border-radius: 14px !important;
                display: flex; align-items: center; gap: 12px;
                font-size: 1.2em; font-weight: 500;
                transition: transform 0.3s cubic-bezier(0.2, 0, 0.2, 1), background 0.3s;
            }

            .cas-apple-style .full-start__button.focus {  
                transform: scale(1.08);  
                background: rgba(255,255,255,0.95) !important;
                color: #000 !important;
                box-shadow: 0 15px 30px rgba(0,0,0,0.4);
            }

            /* Анімація Ken Burns */
            @keyframes casKenBurns { 
                0% { transform: scale(1); } 
                100% { transform: scale(1.12); } 
            }
            body.cas--zoom-enabled .full-start__background.loaded img { 
                animation: casKenBurns 60s ease-out forwards !important; 
            }

            .full-start-new__title { font-size: 3.5em; font-weight: 800; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        </style>`;  
  
        Lampa.Template.add('cas_styles', styles);  
        $('body').append(Lampa.Template.get('cas_styles', {}, true));  
    }  
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                if (data && data.id) {
                    const type = data.name ? 'tv' : 'movie';
                    const url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    
                    $.get(url, (res) => {
                        if (res.logos && res.logos.length > 0) {
                            // Пріоритет: UK -> EN -> Будь-яка перша
                            const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || 
                                             res.logos.find(l => l.iso_639_1 === 'en') || 
                                             res.logos[0];
                            
                            if (bestLogo) {
                                const imgUrl = Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path);
                                render.find('.cas-logo').html(`<img src="${imgUrl}" alt="logo">`);
                                render.find('.full-start-new__title').hide();
                            }
                        }
                    });
                }
            }  
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
  
})();

