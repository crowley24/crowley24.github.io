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
        attachLogoLoader();  
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

                <div class="applecation__stats">
                    <div class="applecation__rating-pill">
                         <span class="icon">🔥</span>
                         <span class="value">637</span>
                    </div>
                </div>
            </div>  
        </div>`;  
  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `
        <style>
            /* Головний контейнер */
            .applecation { background: transparent; }
            .applecation__body { 
                height: 100vh; 
                display: flex; 
                flex-direction: column; 
                justify-content: flex-end; 
                padding: 0 5% 8% 5%;
                background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%);
            }

            /* Логотип */
            .applecation__logo img { 
                max-width: 450px; 
                max-height: 180px; 
                object-fit: contain; 
                object-position: left bottom;
            }

            /* Мета-дані (студії, жанри) */
            .applecation__meta { 
                display: flex; 
                align-items: center; 
                gap: 15px; 
                margin-top: 20px;
                font-size: 1.1em;
                color: rgba(255,255,255,0.8);
            }
            .applecation__studios { display: flex; gap: 10px; align-items: center; }
            .applecation__studios img { max-height: 22px; filter: brightness(1.2); }
            
            .full-start__pg { 
                border: 1px solid rgba(255,255,255,0.5); 
                padding: 1px 6px; 
                border-radius: 4px; 
                font-size: 0.8em; 
            }

            .applecation__year-time {
                display: block;
                margin: 10px 0 25px 0;
                font-size: 1em;
                color: rgba(255,255,255,0.6);
            }

            /* Ряд кнопок */
            .applecation__buttons-row { display: flex; align-items: center; gap: 15px; }

            /* Головна кнопка "Онлайн" */
            .button--main {
                background: #fff !important;
                color: #000 !important;
                padding: 12px 30px !important;
                border-radius: 12px !important;
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
                height: auto !important;
            }

            /* Круглі кнопки */
            .button--round {
                width: 54px !important;
                height: 54px !important;
                border-radius: 50% !important;
                background: rgba(255,255,255,0.1) !important;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 0 !important;
            }

            .full-start__button.focus {
                transform: scale(1.1);
                background: rgba(255,255,255,0.3) !important;
                box-shadow: 0 0 20px rgba(255,255,255,0.2);
            }

            .button--main.focus { background: #e0e0e0 !important; color: #000 !important; }

            /* Рейтинг справа */
            .applecation__stats {
                position: absolute;
                right: 5%;
                bottom: 8.5%;
            }
            .applecation__rating-pill {
                background: rgba(255,255,255,0.1);
                padding: 8px 15px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
        </style>`;  
        $('body').append(styles);  
    }  

    function loadLogo(event) {  
        const data = event.data.movie, render = event.object.activity.render();  
        if (!data) return;

        // Студії
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
        render.find('.applecation__studios').html(studios.map(s => `<img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}">`).join(''));

        // Жанри
        render.find('.applecation__tags').text(data.genres?.slice(0, 3).map(g => g.name).join(' · '));

        // Рік та час
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)} г ${data.runtime % 60} хв` : '';
        render.find('.applecation__year-time').text(`${year} · ${runtime}`);

        // Завантаження логотипу
        const logoContainer = render.find('.applecation__logo');
        $.get(Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`), (d) => {
            const best = d.logos.find(l => l.iso_639_1 === 'uk') || d.logos.find(l => l.iso_639_1 === 'en') || d.logos[0];
            if (best) {
                logoContainer.html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`);
            } else {
                render.find('.full-start-new__title').show();
            }
        });
    }  

    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (e) => {  
            if (e.type === 'complite') setTimeout(() => loadLogo(e), 10);  
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();

