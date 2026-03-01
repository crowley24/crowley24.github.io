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
        addCustomTemplate();  
        addStyles();  
        attachLogoLoader();  
    }  

    function addCustomTemplate() {  
        // ПОВНЕ ВІДНОВЛЕННЯ СТРУКТУРИ ДЛЯ СУМІСНОСТІ
        // Ми залишаємо всі оригінальні класи (.full-start__left, .full-start__info тощо)
        // щоб Lampa могла в них писати дані без помилок.
        const template = `
        <div class="full-start-new applecation">  
            <div class="applecation__body">  
                <div class="applecation__logo-container">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title">{title}</div> 
                </div>

                <div class="applecation__premium-meta">
                    <span class="applecation__studios"></span>
                    <span class="applecation__line-meta"></span>
                    <div class="full-start__pg"></div> </div>

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

                <div class="full-start__left" style="display:none"></div>
                <div class="full-start__right" style="display:none">
                    <div class="full-start__info"></div>
                    <div class="full-start__details"></div>
                </div>
            </div>
        </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `
        <style>
            .applecation .full-start-new__title { display: none; }
            .applecation__body { 
                height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; 
                padding: 0 5% 8% 5%; position: relative; z-index: 10;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 40%, transparent 100%);
            }
            .applecation__logo img { max-width: 400px; max-height: 150px; object-fit: contain; object-position: left; }
            .applecation__premium-meta { display: flex; align-items: center; gap: 12px; margin: 15px 0 10px 0; font-size: 1.1em; color: #fff; }
            .applecation__studios img { max-height: 22px; }
            .applecation__description { max-width: 600px; line-height: 1.5; margin-bottom: 25px; opacity: 0.8; }
            .applecation__buttons-row { display: flex; align-items: center; gap: 15px; }
            
            .applecation .full-start__button { 
                background: rgba(255,255,255,0.1) !important; border-radius: 50%; width: 50px; height: 50px;
                display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s;
            }
            .button--play { 
                background: #fff !important; color: #000 !important; width: auto !important; 
                padding: 12px 30px !important; border-radius: 12px !important; font-weight: bold; 
            }
            .applecation .full-start__button.focus { transform: scale(1.1); background: rgba(255,255,255,0.2) !important; border: 2px solid #fff !important; }
        </style>`;  
        $('body').append(styles);
    }  

    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (e) => { 
            if (e.type === 'complite') {
                const render = e.object.activity.render();
                const data = e.data.movie;

                // Заповнюємо опис та мета-дані
                render.find('.applecation__description').text(data.overview);
                const year = (data.release_date || data.first_air_date || '').split('-')[0];
                render.find('.applecation__line-meta').text(`${year} · ${data.genres?.slice(0,2).map(g=>g.name).join(' · ')}`);

                // Завантаження логотипу через TMDB
                const url = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);
                $.get(url, (d) => {
                    const best = d.logos.find(l => l.iso_639_1 === 'uk') || d.logos.find(l => l.iso_639_1 === 'en') || d.logos[0];
                    if (best) {
                        render.find('.applecation__logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`);
                        render.find('.full-start-new__title').hide();
                    }
                });
            } 
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();
