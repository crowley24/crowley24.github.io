(function () {
    'use strict';

    const ICONS = {
        play: `<svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>`,
        book: `<svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>`,
        reaction: `<svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/></svg>`,
        options: `<svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>`
    };

    function initializePlugin() {
        addCustomTemplate();
        addStyles();
        attachEvents();
    }

    function addCustomTemplate() {
        const template = `
        <div class="full-start-new applecation">
            <div class="applecation__body">
                <div class="applecation__left">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title" style="display: none;">{title}</div>
                    
                    <div class="applecation__meta">
                        <span class="applecation__meta-text"></span>
                        <div class="full-start__pg hide"></div>
                    </div>

                    <div class="applecation__description-wrapper">
                        <div class="applecation__description"></div>
                    </div>

                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play">${ICONS.play} <span>#{title_watch}</span></div>
                        <div class="full-start__button selector button--book">${ICONS.book} <span>#{settings_input_links}</span></div>
                        <div class="full-start__button selector button--reaction">${ICONS.reaction} <span>#{title_reactions}</span></div>
                        <div class="full-start__button selector button--options">${ICONS.options}</div>
                    </div>
                </div>

                <div class="full-start__left hide" style="display:none"></div>
                <div class="full-start__right hide" style="display:none">
                    <div class="full-start__info"></div>
                    <div class="full-start__details"></div>
                    <div class="full-start__status"></div>
                </div>
                <div class="full-start-new__reactions hide" style="display:none"></div>
            </div>
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `
        <style>
            .applecation .applecation__body { 
                height: 100vh; display: flex; align-items: flex-end; 
                padding: 0 5% 10% 5%; 
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
                position: relative; z-index: 10;
            }
            .applecation__logo img { max-width: 450px; max-height: 200px; object-fit: contain; object-position: left; margin-bottom: 20px; }
            .applecation__meta { margin-bottom: 15px; font-size: 1.2em; color: rgba(255,255,255,0.8); }
            .applecation__description { max-width: 650px; font-size: 1.1em; line-height: 1.5; opacity: 0.9; margin-bottom: 30px; }
            .full-start-new__buttons { display: flex; gap: 15px; }
            .applecation .full-start__button { 
                background: rgba(255,255,255,0.1) !important; border-radius: 14px !important; 
                padding: 12px 25px !important; display: flex; align-items: center; gap: 10px; transition: 0.2s !important;
            }
            .applecation .full-start__button.focus { background: #fff !important; color: #000 !important; transform: scale(1.08); }
            .applecation .full-start__button svg { width: 24px; height: 24px; }
        </style>`;
        if (!$('style#apple-fix-browser').length) $('body').append('<style id="apple-fix-browser">' + styles + '</style>');
    }

    function attachEvents() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                try {
                    const render = e.object.activity.render();
                    const data = e.data.movie;

                    // Безпечне заповнення тексту
                    render.find('.applecation__description').text(data.overview || '');
                    const year = (data.release_date || data.first_air_date || '').split('-')[0];
                    const genres = data.genres ? data.genres.slice(0, 2).map(g => g.name).join(' · ') : '';
                    render.find('.applecation__meta-text').text(`${year} · ${genres}`);

                    // Завантаження лого через проксі Lampa
                    const tmdb_url = `movie/${data.id}/images`; 
                    const tv_url = `tv/${data.id}/images`;
                    
                    $.ajax({
                        url: Lampa.TMDB.api(data.name ? tv_url : tmdb_url),
                        dataType: 'json',
                        success: (res) => {
                            const best = res.logos && res.logos.find(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en') || (res.logos && res.logos[0]);
                            if (best) {
                                render.find('.applecation__logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`);
                            } else {
                                render.find('.full-start-new__title').show();
                            }
                        },
                        error: () => render.find('.full-start-new__title').show()
                    });
                } catch (err) {
                    console.error('Apple plugin error:', err);
                }
            }
        });
    }

    if (window.appready) initializePlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });
})();
