(function () {
    'use strict';

    const ICONS = {
        play: `<svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>`,
        book: `<svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>`,
        reaction: `<svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg>`,
        options: `<svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>`
    };

    let logoCache = new Map();

    function initialize() {
        if (!Lampa.Platform.screen('tv')) return;
        addTemplate();
        addStyles();
        listenEvents();
    }

    function addTemplate() {
        const template = `
        <div class="full-start-new apple-style">  
            <div class="apple-style__body">  
                <div class="apple-style__left-panel">  
                    <div class="apple-style__logo"></div>  
                    <div class="full-start-new__title apple-style__title-fallback" style="display: none;">{title}</div>  
                    
                    <div class="apple-style__meta">  
                        <span class="apple-style__type"></span>  
                        <span class="apple-style__genres"></span>  
                    </div>  

                    <div class="apple-style__description">{overview}</div>  

                    <div class="full-start-new__buttons apple-style__buttons">  
                        <div class="full-start__button selector button--play">${ICONS.play}<span>#{title_watch}</span></div>
                        <div class="full-start__button selector button--book">${ICONS.book}<span>#{settings_input_links}</span></div>
                        <div class="full-start__button selector button--reaction">${ICONS.reaction}<span>#{title_reactions}</span></div>
                        <div class="full-start__button selector button--options">${ICONS.options}</div>
                    </div>  
                </div>  
            </div>  
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const css = `<style>
            .apple-style { width: 100%; height: 100%; padding: 4% 6%; box-sizing: border-box; background: none !important; }
            .apple-style__body { display: flex; align-items: flex-end; height: 80vh; }
            .apple-style__left-panel { width: 42%; display: flex; flex-direction: column; gap: 1.2em; z-index: 10; }
            
            /* Логотип */
            .apple-style__logo img { max-width: 100%; max-height: 160px; object-fit: contain; object-position: left; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
            .apple-style__title-fallback { font-size: 3.2em; font-weight: 800; margin: 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
            
            /* Мета */
            .apple-style__meta { font-size: 1.3em; color: rgba(255,255,255,0.7); display: flex; gap: 15px; font-weight: 500; }
            .apple-style__type { color: #fff; text-transform: uppercase; letter-spacing: 1px; }
            
            /* Опис */
            .apple-style__description { 
                font-size: 1.25em; line-height: 1.5; color: rgba(255,255,255,0.9);
                display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
                text-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }

            /* Кнопки - Повернення твого оригінального стилю */
            .apple-style__buttons { display: flex; gap: 12px; margin-top: 15px; }
            .apple-style__buttons .full-start__button { 
                background: rgba(255, 255, 255, 0.1); 
                border-radius: 10px;
                padding: 11px 24px;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                color: #fff;
                transition: all 0.25s ease;
                opacity: 0.85;
            }
            .apple-style__buttons .full-start__button.focus { 
                background: rgba(255, 255, 255, 0.25); 
                opacity: 1;
                transform: scale(1.03);
                box-shadow: 0 0 15px rgba(255,255,255,0.1);
            }
            .apple-style__buttons .full-start__button span { font-size: 1.1em; font-weight: 600; }
            .apple-style__buttons .full-start__button svg { width: 22px; height: 22px; }
        </style>`;
        $('body').append(css);
    }

    function selectBestLogo(logos) {
        // Правило: UA -> EN -> TOP
        const ua = logos.find(l => l.iso_639_1 === 'uk');
        if (ua) return ua;
        const en = logos.find(l => l.iso_639_1 === 'en');
        if (en) return en;
        return logos.sort((a, b) => b.vote_average - a.vote_average)[0];
    }

    function loadData(event) {
        const data = event.data.movie;
        const render = event.object.activity.render();
        
        // Рендеримо тип та жанри
        render.find('.apple-style__type').text(data.number_of_seasons ? 'Серіал' : 'Фільм');
        render.find('.apple-style__genres').text(data.genres?.slice(0, 2).map(g => g.name).join(' • '));

        const logoCont = render.find('.apple-style__logo');
        const titleFallback = render.find('.apple-style__title-fallback');
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;

        const applyLogo = (logos) => {
            const best = selectBestLogo(logos || []);
            if (best) {
                logoCont.html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`).show();
                titleFallback.hide();
            } else {
                logoCont.hide();
                titleFallback.show();
            }
        };

        if (logoCache.has(cacheKey)) {
            applyLogo(logoCache.get(cacheKey));
        } else {
            const url = `${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`;
            $.get(Lampa.TMDB.api(url), (res) => {
                if (res.logos) {
                    logoCache.set(cacheKey, res.logos);
                    applyLogo(res.logos);
                }
            }).fail(() => applyLogo([]));
        }
    }

    function listenEvents() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                setTimeout(() => loadData(e), 50);
            }
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });

})();
