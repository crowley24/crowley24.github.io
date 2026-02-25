(function () {  
    'use strict';  

    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`
    };

    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="#333"/><circle cx="30" cy="50" r="10" fill="#fff"/></svg>';

    function initializePlugin() {  
        if (!Lampa.Platform.screen('tv')) return;  
        addCustomTemplate();  
        addStyles();  
        addSettings(); // Повертаємо налаштування
        attachLogoLoader();  
    }  

    // --- НАЛАШТУВАННЯ ---
    function addSettings() {
        const defaults = {  
            'applecation_logo_scale': '100', 
            'applecation_text_scale': '100', 
            'applecation_show_studio': true, 
            'applecation_apple_zoom': true 
        };  
        Object.keys(defaults).forEach(key => { if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]); });  

        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });  

        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_apple_zoom', type: 'trigger', default: true },  
            field: { name: 'Плаваючий зум фону', description: 'Повільна анімація наближення фонового зображення' },
            onChange: (v) => $('body').toggleClass('applecation--zoom-enabled', v)
        });  

        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_show_studio', type: 'trigger', default: true },  
            field: { name: 'Показувати студії', description: 'Відображати логотипи кінокомпаній' }  
        });

        const scaleVals = { '80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' };
        
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_logo_scale', type: 'select', values: scaleVals, default: '100' },
            field: { name: 'Розмір логотипу', description: 'Масштаб лого фільму' },
            onChange: applyScales
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_text_scale', type: 'select', values: scaleVals, default: '100' },
            field: { name: 'Розмір тексту', description: 'Масштаб опису та мета-даних' },
            onChange: applyScales
        });

        applyScales();
        $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'));
    }

    function applyScales() {
        const root = document.documentElement;
        root.style.setProperty('--apple-logo-size', (parseInt(Lampa.Storage.get('applecation_logo_scale')) / 100));
        root.style.setProperty('--apple-text-size', (parseInt(Lampa.Storage.get('applecation_text_scale')) / 100));
    }

    function addCustomTemplate() {  
        const template = `
        <div class="full-start-new applecation">  
            <div class="applecation__body">  
                <div class="applecation__main-content">
                    <div class="applecation__logo-container">
                        <div class="applecation__logo"></div>
                        <div class="full-start-new__title" style="display: none;">{title}</div>
                    </div>
                    <div class="applecation__meta">
                        <span class="applecation__studios"></span>
                        <span class="applecation__tags"></span>
                        <span class="full-start__pg"></span>
                    </div>
                    <div class="applecation__secondary-info">
                        <span class="applecation__year-time"></span>
                    </div>
                    <div class="applecation__buttons-row">
                        <div class="full-start__button selector button--main">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M8 5.14V19.14L19 12.14L8 5.14Z"/></svg>
                            <span>Онлайн</span>
                        </div>
                        <div class="full-start__button selector button--round">${ICONS.trailer}</div>
                        <div class="full-start__button selector button--round">${ICONS.book}</div>
                        <div class="full-start__button selector button--round">${ICONS.reaction}</div>
                        <div class="full-start__button selector button--round">${ICONS.options}</div>
                    </div>
                </div>
            </div>  
        </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `
        <style>
            :root { --apple-logo-size: 1; --apple-text-size: 1; }
            .applecation__body { 
                height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; 
                padding: 0 5% 8% 5%;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
            }
            .applecation__logo img { 
                max-width: calc(450px * var(--apple-logo-size)); 
                max-height: calc(180px * var(--apple-logo-size)); 
                object-fit: contain; object-position: left bottom;
            }
            .applecation__meta { 
                display: flex; align-items: center; gap: 15px; margin-top: 20px;
                font-size: calc(1.1em * var(--apple-text-size));
            }
            .applecation__studios img { max-height: 22px; filter: brightness(1.2); }
            .applecation__year-time { 
                display: block; margin: 10px 0 25px 0; 
                font-size: calc(1em * var(--apple-text-size)); color: rgba(255,255,255,0.6); 
            }
            .applecation__buttons-row { display: flex; align-items: center; gap: 15px; }
            .button--main { background: #fff !important; color: #000 !important; padding: 12px 30px !important; border-radius: 12px !important; font-weight: bold; display: flex; align-items: center; gap: 10px; }
            .button--round { width: 54px !important; height: 54px !important; border-radius: 50% !important; background: rgba(255,255,255,0.1) !important; display: flex; justify-content: center; align-items: center; padding: 0 !important; }
            .full-start__button.focus { transform: scale(1.1); background: rgba(255,255,255,0.3) !important; }
            .button--main.focus { background: #e0e0e0 !important; }
            
            @keyframes appleKenBurns { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
            body.applecation--zoom-enabled .full-start__background.loaded { animation: appleKenBurns 30s ease-out forwards !important; }
        </style>`;  
        $('body').append(styles);  
    }  

    function loadLogo(event) {  
        const data = event.data.movie, render = event.object.activity.render();  
        if (!data) return;

        // Студії (якщо дозволено в налаштуваннях)
        if (Lampa.Storage.get('applecation_show_studio')) {
            const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
            render.find('.applecation__studios').html(studios.map(s => `<img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}">`).join(''));
        }

        render.find('.applecation__tags').text(data.genres?.slice(0, 3).map(g => g.name).join(' · '));
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} г ${data.runtime % 60} хв` : '';
        render.find('.applecation__year-time').text(`${year} · ${runtime}`);

        $.get(Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`), (d) => {
            // Пріоритет: UA лого -> EN лого -> будь-яке перше [cite: 2026-02-17]
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
