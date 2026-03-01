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
        addSettings();
        attachLogoLoader();
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
                    <span class="applecation__studios"></span>
                    <span class="applecation__line-meta"></span>
                    <span class="full-start__pg"></span>
                </div>

                <div class="applecation__description-container">
                    <div class="applecation__description"></div>
                </div>

                <div class="full-start-new__buttons applecation__buttons-row">
                    <div class="full-start__button selector button--play">${ICONS.play} <span>Дивитися</span></div>
                    <div class="full-start__button selector view--trailer">${ICONS.trailer}</div>
                    <div class="full-start__button selector button--book">${ICONS.book}</div>
                    <div class="full-start__button selector button--reaction">${ICONS.reaction}</div>
                    <div class="full-start__button selector button--options">${ICONS.options}</div>
                </div>

                <div class="full-start__left hide" style="display:none"></div>
                <div class="full-start__right hide" style="display:none">
                    <div class="full-start__info"></div>
                    <div class="full-start__details"></div>
                    <div class="full-start__descr"></div>
                </div>
            </div>
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `
        <style>
            :root { --apple-logo-scale: 1; --apple-text-scale: 1; }
            .applecation__body { 
                height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; 
                padding: 0 5% 10% 5%; position: relative; z-index: 10;
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
            }
            .applecation__logo img { 
                max-width: calc(480px * var(--apple-logo-scale)); 
                max-height: calc(180px * var(--apple-logo-scale)); 
                object-fit: contain; object-position: left bottom;
            }
            .applecation__premium-meta { display: flex; align-items: center; gap: 12px; margin: 20px 0 10px 0; font-size: calc(1.1em * var(--apple-text-scale)); color: #fff; }
            .applecation__line-meta { color: rgba(255,255,255,0.7); }
            .applecation__description { max-width: 700px; line-height: 1.5; margin-bottom: 25px; font-size: calc(1.05em * var(--apple-text-scale)); color: rgba(255,255,255,0.85); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .applecation__buttons-row { display: flex; align-items: center; gap: 20px; }
            .button--play { background: #fff !important; color: #000 !important; padding: 12px 35px !important; border-radius: 12px !important; font-weight: 700 !important; }
            .applecation .full-start__button { background: none !important; border: none !important; color: rgba(255,255,255,0.6) !important; padding: 10px !important; transition: 0.2s; cursor: pointer; }
            .applecation .full-start__button.focus { transform: scale(1.2); color: #fff !important; filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)); }
        </style>`;
        $('body').append(styles);
    }

    function loadLogo(event) {
        try {
            const data = event.data.movie;
            const render = event.object.activity.render();
            if (!data || !render) return;

            // Заповнення мета-даних
            const year = (data.release_date || data.first_air_date || '').split('-')[0];
            const genres = data.genres ? data.genres.slice(0, 2).map(g => g.name).join(' · ') : '';
            render.find('.applecation__line-meta').text(`${year}  ·  ${genres}`);
            render.find('.applecation__description').text(data.overview || '');

            // Безпечний запит логотипу
            const url = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
            
            Lampa.Network.native(url, (json) => {
                if (json && json.logos && json.logos.length) {
                    const best = json.logos.find(l => l.iso_639_1 === 'uk') || json.logos.find(l => l.iso_639_1 === 'en') || json.logos[0];
                    render.find('.applecation__logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + best.file_path) + '">');
                } else {
                    render.find('.full-start-new__title').show();
                }
            }, () => {
                render.find('.full-start-new__title').show();
            });
        } catch (e) {
            console.log('Apple Plugin Error:', e);
        }
    }

    function addSettings() {
        // Спрощені налаштування для браузера
        Lampa.SettingsApi.addComponent({ component: 'apple_settings', name: 'Apple UI', icon: '<svg>...</svg>' });
    }

    function attachLogoLoader() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                // Використовуємо невелику затримку, щоб DOM встиг відмалюватися
                setTimeout(() => loadLogo(e), 100);
            }
        });
    }

    if (window.appready) initializePlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });
})();
