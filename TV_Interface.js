(function () {  
    'use strict';  

    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`
    };

    function initializePlugin() {  
        if (!Lampa.Platform.screen('tv')) return;  
        addCustomTemplate();  
        addStyles();  
        addSettings();
        attachLogoLoader();  
    }  

    function addSettings() {
        const defaults = { 'applecation_logo_scale': '100', 'applecation_text_scale': '100' };  
        Object.keys(defaults).forEach(key => { if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]); });  
        
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="white" fill="none" stroke-width="5"/></svg>` });  
        
        const scaleVals = { '70':'70%','85':'85%','100':'100%','115':'115%','130':'130%' };
        Lampa.SettingsApi.addParam({ component: 'applecation_settings', param: { name: 'applecation_logo_scale', type: 'select', values: scaleVals, default: '100' }, field: { name: 'Розмір логотипу' }, onChange: applyScales });
        Lampa.SettingsApi.addParam({ component: 'applecation_settings', param: { name: 'applecation_text_scale', type: 'select', values: scaleVals, default: '100' }, field: { name: 'Розмір тексту' }, onChange: applyScales });
        applyScales();
    }

    function applyScales() {
        const root = document.documentElement;
        root.style.setProperty('--apple-logo-scale', parseInt(Lampa.Storage.get('applecation_logo_scale')) / 100);
        root.style.setProperty('--apple-text-scale', parseInt(Lampa.Storage.get('applecation_text_scale')) / 100);
    }

    function addCustomTemplate() {  
        const template = `
        <div class="full-start-new applecation">  
            <div class="applecation__body">  
                <div class="applecation__logo-container">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title" style="display: none;">{title}</div>
                </div>

                <div class="applecation__meta-row">
                    <span class="applecation__studios"></span>
                    <span class="applecation__info-text"></span>
                </div>

                <div class="applecation__descr"></div>

                <div class="applecation__btns">
                    <div class="full-start__button selector button--play">
                        ${ICONS.play} <span>Онлайн</span>
                    </div>
                    <div class="full-start__button selector view--trailer">${ICONS.trailer}</div>
                    <div class="full-start__button selector button--book">${ICONS.book}</div>
                    <div class="full-start__button selector button--reaction">${ICONS.reaction}</div>
                    <div class="full-start__button selector button--options">${ICONS.options}</div>
                </div>
            </div>
            <div class="full-start-new__right hide-this-completely"></div>
        </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `
        <style>
            :root { --apple-logo-scale: 1; --apple-text-scale: 1; }

            /* ПРИБИРАЄМО ПОЛОСУ ТА ПРАВУ ПАНЕЛЬ НАЗАВЖДИ */
            .applecation .full-start-new__right, 
            .applecation .full-start-new__split,
            .hide-this-completely { 
                display: none !important; 
                width: 0 !important; 
                border: none !important; 
                opacity: 0 !important;
                pointer-events: none !important;
            }

            .applecation .full-start-new__body { 
                width: 100% !important; 
                background: none !important; 
            }

            .applecation__body { 
                height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; 
                padding: 0 5% 7% 5%;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
                width: 100% !important;
            }

            .applecation__logo img { 
                max-width: calc(500px * var(--apple-logo-scale)); 
                max-height: calc(180px * var(--apple-logo-scale)); 
                object-fit: contain; object-position: left bottom;
            }

            .applecation__meta-row { 
                display: flex; align-items: center; gap: 15px; margin: 15px 0;
                font-size: calc(1.1em * var(--apple-text-scale)); color: #fff;
            }
            .applecation__studios img { max-height: 22px; filter: drop-shadow(0 0 2px #000); }

            .applecation__descr {
                max-width: 850px; margin-bottom: 25px; line-height: 1.5;
                font-size: calc(1em * var(--apple-text-scale));
                color: rgba(255,255,255,0.8);
                display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
            }

            .applecation__btns { display: flex; align-items: center; gap: 25px; }
            
            /* Кнопка "Дивитися" */
            .button--play { 
                background: #fff !important; color: #000 !important; 
                padding: 10px 30px !important; border-radius: 12px !important; 
                font-weight: bold; display: flex; align-items: center; gap: 10px;
                border: none !important;
            }

            /* Кнопки без кіл (просто іконки) */
            .applecation .full-start__button { 
                background: none !important; border: none !important; 
                padding: 5px !important; color: #fff !important;
                box-shadow: none !important;
            }

            /* Ефект фокусу */
            .applecation .full-start__button.focus { 
                transform: scale(1.3) !important; 
                color: #fff !important;
                filter: drop-shadow(0 0 8px rgba(255,255,255,0.8)) !important;
            }
            .button--play.focus { 
                background: #e0e0e0 !important; 
                color: #000 !important; 
                transform: scale(1.05) !important;
                filter: none !important;
            }
        </style>`;  
        $('body').append(styles);  
    }  

    function loadLogo(event) {  
        const data = event.data.movie, render = event.object.activity.render();  
        if (!data) return;

        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const genres = data.genres?.slice(0, 2).map(g => g.name).join(' · ');
        const time = data.runtime ? `${Math.floor(data.runtime / 60)}г ${data.runtime % 60}хв` : '';
        render.find('.applecation__info-text').text(`${year} · ${genres} · ${time}`);
        render.find('.applecation__descr').text(data.overview);

        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 2);
        render.find('.applecation__studios').html(studios.map(s => `<img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}">`).join(''));

        $.get(Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`), (d) => {
            const best = d.logos.find(l => l.iso_639_1 === 'uk') || d.logos.find(l => l.iso_639_1 === 'en') || d.logos[0];
            if (best) render.find('.applecation__logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`);
            else render.find('.full-start-new__title').show();
        });
    }  

    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (e) => { if (e.type === 'complite') setTimeout(() => loadLogo(e), 10); });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();
