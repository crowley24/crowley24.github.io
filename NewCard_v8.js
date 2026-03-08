(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard Optimized';
    const PLUGIN_ID = 'new_card_style_opt';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';

    const ICONS = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    const QUALITY_ICONS = {
        '4K': ASSETS_PATH + '4K.svg', '2K': ASSETS_PATH + '2K.svg', 
        'FULL HD': ASSETS_PATH + 'FULL HD.svg', 'HD': ASSETS_PATH + 'HD.svg', 
        'HDR': ASSETS_PATH + 'HDR.svg', 'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg', 
        'UKR': ASSETS_PATH + 'UKR.svg'
    };

    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;

    function getRatingColor(val) {
        const n = parseFloat(val);
        return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';
    }

    function formatTime(mins) {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return (h > 0 ? h + 'г ' : '') + (m > 0 ? m + 'хв' : '');
    }

    function addStyles() {
        const styles = `<style>
:root { 
    --cas-logo-scale: 1; 
    --cas-blocks-gap: 20px; 
    --cas-meta-size: 1.3em;
    --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1);
    --cas-glow-color: rgba(255, 255, 255, 0.6); 
}

/* Прискорення рендеру */
.full-start-new__right, .cas-logo, .cas-description, .full-start-new__buttons {
    backface-visibility: hidden;
    perspective: 1000px;
    transform: translateZ(0);
    will-change: transform, opacity;
}

/* Оптимізована анімація появи */
.cas-logo, .cas-ratings-line, .cas-description, .cas-studios-row, .full-start-new__buttons {
    opacity: 0; 
    transform: translateY(8px) translateZ(0);
    transition: opacity 0.35s var(--cas-anim-curve), transform 0.35s var(--cas-anim-curve);
}

.cas-animated .cas-logo { opacity: 1; transform: translateY(0); transition-delay: 30ms; }
.cas-animated .cas-ratings-line { opacity: 1; transform: translateY(0); transition-delay: 80ms; }
.cas-animated .cas-studios-row { opacity: 1; transform: translateY(0); transition-delay: 130ms; }
.cas-animated .cas-description { opacity: 1; transform: translateY(0); transition-delay: 180ms; }
.cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); transition-delay: 240ms; }

/* Опис з оптимізацією */
.cas-description {
    max-width: 650px;
    font-size: var(--cas-meta-size);
    line-height: 1.4;
    color: rgba(255,255,255,0.7);
    font-weight: 400;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    contain: layout style;
}

/* Кнопки без важких фільтрів у спокої */
.left-title .full-start-new__buttons .full-start__button {
    background: transparent !important;
    color: rgba(255,255,255,0.5);
    transition: transform 0.2s var(--cas-anim-curve), color 0.2s ease;
}

.left-title .full-start-new__buttons .full-start__button.focus {
    color: #fff !important;
    transform: scale(1.06) translateZ(0);
    filter: drop-shadow(0 0 5px var(--cas-glow-color));
}

.cas-logo img {
    max-width: 450px; max-height: 160px;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

/* Ken Burns оптимізація: використання 3D трансформації */
@keyframes casKenBurns {
    0% { transform: scale(1) translateZ(0); }
    50% { transform: scale(1.07) translateZ(0); }
    100% { transform: scale(1) translateZ(0); }
}
body.cas--zoom-enabled .full-start__background.loaded {
    animation: casKenBurns 40s linear infinite !important;
}

.left-title .full-start-new__body { height: 100vh; }
.left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 8vh; padding-left: 5%; }
</style>`;
        $('body').append(styles);
    }

    function attachLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                const data = event.data.movie;
                const render = event.object.activity.render();
                const content = render.find('.left-title__content');
                
                content.removeClass('cas-animated');

                // Оптимізоване завантаження зображень
                if (data && data.id) {
                    const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    
                    $.ajax({ url: imagesUrl, dataType: 'json', success: (res) => {
                        const logoContainer = render.find('.cas-logo');
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];

                        if (bestLogo) {
                            const img = new Image();
                            img.src = Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path);
                            img.onload = () => logoContainer.html(img);
                        } else {
                            logoContainer.html(`<div style="font-size: 2.5em; font-weight: 800;">${data.title || data.name}</div>`);
                        }

                        // Слайдшоу з throttling
                        if (window.casBgInterval) clearInterval(window.casBgInterval);
                        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {
                            let idx = 0;
                            window.casBgInterval = setInterval(() => {
                                const bg = $('.full-start__background img, img.full-start__background');
                                if (!bg.length) return clearInterval(window.casBgInterval);
                                idx = (idx + 1) % Math.min(res.backdrops.length, 10);
                                const nextImg = new Image();
                                nextImg.src = Lampa.TMDB.image('/t/p/original' + res.backdrops[idx].file_path);
                                nextImg.onload = () => bg.attr('src', nextImg.src);
                            }, 15000);
                        }
                    }});

                    // Рендер тексту (миттєво)
                    render.find('.cas-description').text(data.overview || '');
                    
                    // Рейтинги та мета
                    let ratesHtml = '';
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    if (tmdbV > 0) ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;
                    
                    render.find('.cas-rate-items').html(ratesHtml);
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text(`${formatTime(data.runtime || data.episode_run_time)} • ${genre}`);

                    // Студії (тільки якщо увімкнено)
                    if (Lampa.Storage.get('cas_show_studios')) {
                        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                    }
                }

                // Використовуємо requestAnimationFrame для плавності запуску анімації
                requestAnimationFrame(() => {
                    setTimeout(() => content.addClass('cas-animated'), 50);
                });
            }
        });
    }

    // Решта стандартних функцій (Template, Settings, Register) залишаються такими ж...
    // (Додайте функції addCustomTemplate, addSettings, applySettings, registerPlugin з попередньої відповіді)

    function startPlugin() { 
        registerPlugin(); 
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLoader(); 
    }
    
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });
})();
