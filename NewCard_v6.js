(function () {
    'use strict';

    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style';
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff"><rect x="10" y="30" width="80" height="40" rx="5" fill="rgba(255,255,255,0.2)"/><circle cx="50" cy="50" r="12" fill="white"/></svg>';

    function initializePlugin() {
        console.log(PLUGIN_NAME, 'v1.2.0 Init');
        
        addCustomTemplate();
        addStyles();
        addSettings();
        attachEvents();
    }

    function addSettings() {
        // Дефолтні налаштування
        const defaults = {
            'cas_logo_scale': '100',
            'cas_bg_animation': true
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        // Реєстрація пункту в налаштуваннях Lampa
        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: PLUGIN_ICON
        });

        const scaleVals = { '70':'70%','80':'80%','90':'90%','100':'Стандарт','110':'110%','120':'120%','130':'130%' };

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: scaleVals, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону (Zoom)' },
            onChange: applySettings
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale')) / 100;
        root.style.setProperty('--cas-logo-scale', scale);
        
        $('body').toggleClass('cas--zoom-enabled', Lampa.Storage.get('cas_bg_animation'));
    }

    function addCustomTemplate() {
        const template = `
        <div class="full-start-new left-title cas-wrapper">
            <div class="full-start-new__body cas-body">
                <div class="cas-content">
                    <div class="cas-logo-container">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title cas-text-title">{title}</div>
                    </div>

                    <div class="full-start-new__details"></div>

                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play">
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>
                            <span>#{title_watch}</span>
                        </div>
                        <div class="full-start__button selector button--book">
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none"><path d="M2 1.5H19V27.9618C19.5 28.3756 18.697 28.3595 12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.5 28.3756 1.5 27.9618V2Z" stroke="currentColor" stroke-width="2.5"/></svg>
                        </div>
                        <div class="full-start__button selector button--trailer">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>
                        </div>
                    </div>
                </div>

                <div class="full-start-new__reactions selector" style="display:none"></div>
                <div class="full-start-new__rate-line" style="display:none"></div>
            </div>
        </div>`;

        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `
        <style>
            :root { --cas-logo-scale: 1; }
            
            .cas-body {
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                padding: 0 5% 8% 5% !important;
                background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
            }

            .cas-logo-container { margin-bottom: 20px; }

            .cas-logo img {
                max-width: calc(450px * var(--cas-logo-scale));
                max-height: calc(180px * var(--cas-logo-scale));
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 0 10px rgba(0,0,0,0.3));
            }

            .cas-text-title {
                font-size: 3em;
                font-weight: 800;
                text-shadow: 0 2px 15px rgba(0,0,0,0.8);
            }

            /* Анімація фону Ken Burns */
            @keyframes casKenBurns {
                0% { transform: scale(1); }
                100% { transform: scale(1.15); }
            }

            body.cas--zoom-enabled .full-start__background.loaded {
                animation: casKenBurns 45s ease-out forwards !important;
            }

            /* Приховуємо все зайве, що просив користувач */
            .left-title .full-start-new__reactions,
            .left-title .full-start-new__rate-line,
            .left-title .rating--modss,
            .left-title .full-start__status {
                display: none !important;
            }

            /* Корекція кнопок */
            .cas-content .full-start-new__buttons { display: flex; gap: 15px; align-items: center; }
            .cas-content .full-start__button { background: rgba(255,255,255,0.1); border-radius: 10px; }
            .cas-content .full-start__button.focus { background: #fff; color: #000; transform: scale(1.1); }
        </style>`;
        $('body').append(styles);
    }

    function loadMediaData(event) {
        const data = event.data.movie;
        const render = event.object.activity.render();
        if (!data) return;

        // Пошук логотипу через TMDB API
        const url = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);
        
        $.get(url, (res) => {
            const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || 
                             res.logos.find(l => l.iso_639_1 === 'en') || 
                             res.logos[0];

            if (bestLogo) {
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path);
                render.find('.cas-logo').html(\`<img src="\${logoUrl}">\`);
                render.find('.cas-text-title').hide(); // Ховаємо текст, якщо є лого
            } else {
                render.find('.cas-text-title').show();
            }
        });
    }

    function attachEvents() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                setTimeout(() => loadMediaData(e), 50);
            }
        });
    }

    // Запуск плагіна
    if (window.appready) initializePlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });

})();
