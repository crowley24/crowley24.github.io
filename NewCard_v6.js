(function () {  
    'use strict';  

    const logoCache = {};
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
        attachListeners();  
    }  

    function addCustomTemplate() {  
        const template = `
        <div class="full-start-new applecation">  
            <div class="applecation__body">  
                <div class="applecation__logo-container">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title" style="display: none;">{title}</div>
                </div>

                <div class="applecation__premium-meta">
                    <span class="applecation__line-meta"></span>
                </div>

                <div class="applecation__description-container">
                    <div class="applecation__description"></div>
                </div>

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
            <div class="hide" style="display: none !important;">
                <div class="full-start__button view--torrent"></div>
            </div>
        </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `
        <style>
            /* 1. Повне очищення стандартного інтерфейсу */
            .applecation.full-start-new, 
            .applecation .full-start-new__right, 
            .applecation .full-start-new__details { 
                background: none !important; 
            }
            .applecation .full-start-new__left { display: none !important; }

            /* 2. Фон з градієнтом */
            .applecation .full-start-new__poster {
                position: absolute !important;
                top: 0; right: 0; bottom: 0; left: 0;
                width: 100% !important; height: 100% !important;
                z-index: 1 !important;
                background-size: cover !important;
                background-position: center 20% !important;
                mask-image: linear-gradient(to right, #000 0%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 100%) !important;
                -webkit-mask-image: linear-gradient(to right, #000 0%, #000 25%, rgba(0,0,0,0.5) 60%, transparent 100%) !important;
            }

            /* 3. Тіло контенту (Apple Style) */
            .applecation__body { 
                position: relative;
                z-index: 10;
                height: 100vh; 
                display: flex; 
                flex-direction: column; 
                justify-content: flex-end; 
                padding: 0 0 8% 60px; /* Відступ зліва 60px */
                background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 100%);
            }

            /* 4. Логотип */
            .applecation__logo img { 
                max-width: 450px; 
                max-height: 180px; 
                object-fit: contain; 
                object-position: left bottom;
                filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
            }

            /* 5. Метадані та опис */
            .applecation__premium-meta { 
                margin: 20px 0 10px 0;
                font-size: 1.2rem;
                font-weight: 500; 
                color: rgba(255,255,255,0.7);
            }
            
            .applecation__description {
                max-width: 750px; 
                line-height: 1.5; 
                margin-bottom: 30px;
                font-size: 1.3rem;
                color: rgba(255,255,255,0.9);
                display: -webkit-box; 
                -webkit-line-clamp: 2; 
                -webkit-box-orient: vertical; 
                overflow: hidden;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            }

            /* 6. Кнопки */
            .applecation__buttons-row { 
                display: flex !important; 
                align-items: center !important; 
                gap: 25px !important; 
                background: none !important;
            }
            
            /* Головна кнопка Дивитися */
            .button--play { 
                background: #fff !important; 
                color: #000 !important; 
                padding: 12px 35px !important; 
                border-radius: 12px !important; 
                font-weight: 700 !important;
                display: flex; align-items: center; gap: 10px;
            }

            /* Мінімалістичні сервісні кнопки */
            .applecation .full-start__button { 
                background: none !important; 
                border: none !important; 
                color: rgba(255,255,255,0.6) !important; 
                padding: 5px !important;
                transition: all 0.2s ease;
            }

            /* Фокус */
            .applecation .full-start__button.focus { 
                transform: scale(1.3); 
                color: #fff !important;
                filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));
            }

            .button--play.focus { 
                background: rgba(255,255,255,0.8) !important; 
                transform: scale(1.05) !important;
                filter: none !important;
            }
        </style>`;  
        $('body').append(styles);  
    }  

    function loadData(event) {  
        const data = event.data.movie;
        const render = event.object.activity.render();  
        if (!data) return;

        // Формування метаданих
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const genres = data.genres?.slice(0, 2).map(g => g.name).join(' · ');
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}г ${data.runtime % 60}хв` : '';
        render.find('.applecation__line-meta').text(`${year}  ·  ${genres}  ·  ${runtime}`);
        
        // Опис
        render.find('.applecation__description').text(data.overview || 'Опис відсутній.');

        // Завантаження Лого [cite: 2026-02-17]
        const type = data.name ? 'tv' : 'movie';
        const key = Lampa.TMDB.key();
        
        $.ajax({
            url: `https://api.themoviedb.org/3/${type}/${data.id}/images?api_key=${key}`,
            success: function(res) {
                const lang = Lampa.Storage.get('language') || 'uk';
                const bestLogo = res.logos.find(l => l.iso_639_1 === lang) || 
                                 res.logos.find(l => l.iso_639_1 === 'en') || 
                                 res.logos[0];
                
                if (bestLogo) {
                    const url = 'https://image.tmdb.org/t/p/w500' + bestLogo.file_path;
                    render.find('.applecation__logo').html(`<img src="${url}">`);
                } else {
                    render.find('.full-start-new__title').show();
                }
            }
        });
    }  

    function attachListeners() {  
        Lampa.Listener.follow('full', (e) => { 
            if (e.type === 'complite' || e.type === 'complete') {
                setTimeout(() => loadData(e), 50);
            }
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();
