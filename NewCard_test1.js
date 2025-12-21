(function () {
    'use strict';

    // Проста іконка для NewCard
    const PLUGIN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.5C4 4.22386 4.22386 4 4.5 4H19.5C19.7761 4 20 4.22386 20 4.5V19.5C20 19.7761 19.7761 20 19.5 20H4.5C4.22386 20 4 19.7761 4 19.5V4.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 16H15M6 8H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const uk_translations = {
        show_ratings: 'Показувати рейтинги',
        show_ratings_desc: 'Відображати рейтинги IMDB та КіноПошук',
        hide_reactions: 'Сховати реакції Lampa',
        hide_reactions_desc: 'Сховати блок з реакціями',
        ratings_position: 'Розташування рейтингів',
        ratings_position_desc: 'Виберіть де відображати рейтинги',
        position_card: 'У картці',
        position_corner: 'У лівому нижньому куті',
        logo_size: 'Розмір логотипу',
        logo_size_desc: 'Виберіть максимальний розмір логотипу',
        size_small: 'Маленький',
        size_medium: 'Середній',
        size_large: 'Великий'
    };

    const defaults = {
        newcard_show_ratings: false,
        newcard_hide_reactions: false,
        newcard_ratings_position: 'card',
        newcard_logo_size: 'medium'
    };

    function getUkrainianTranslation(key) {
        return uk_translations[key] || '';
    }

    function initializePlugin() {
        if (!Lampa.Platform.screen('tv')) return;

        patchApiImg();
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLogoLoader();
    }

    // ⭐ ПОКРАЩЕННЯ I: Функція міграції налаштувань
    function migrateStorage() {
        const storageMap = {
            'applecation_show_ratings': 'newcard_show_ratings',
            'applecation_hide_reactions': 'newcard_hide_reactions',
            'applecation_ratings_position': 'newcard_ratings_position',
            'applecation_logo_size': 'newcard_logo_size'
        };
        Object.keys(storageMap).forEach(oldKey => {
            if (Lampa.Storage.get(oldKey) !== undefined) {
                Lampa.Storage.set(storageMap[oldKey], Lampa.Storage.get(oldKey));
                Lampa.Storage.remove(oldKey); 
            }
        });
    }

    // ⭐ ПОКРАЩЕННЯ I: Функція застосування класів до <body>
    function applyCurrentSettings() {
        // 1. Показувати/ховати рейтинги
        $('body').toggleClass('newcard--hide-ratings', !Lampa.Storage.get('newcard_show_ratings', defaults.newcard_show_ratings));
        
        // 2. Позиція рейтингів
        const position = Lampa.Storage.get('newcard_ratings_position', defaults.newcard_ratings_position);
        $('body').removeClass('newcard--ratings-card newcard--ratings-corner').addClass('newcard--ratings-' + position);
        
        // 3. Сховати реакції
        $('body').toggleClass('newcard--hide-reactions', Lampa.Storage.get('newcard_hide_reactions', defaults.newcard_hide_reactions));
        
        // 4. Розмір логотипу
        const logoSize = Lampa.Storage.get('newcard_logo_size', defaults.newcard_logo_size);
        $('body').removeClass('newcard--logo-small newcard--logo-medium newcard--logo-large').addClass('newcard--logo-' + logoSize);
    }

    function addSettings() {
        migrateStorage(); // Запуск міграції

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) {
                Lampa.Storage.set(key, defaults[key]);
            }
        });

        Lampa.SettingsApi.addComponent({
            component: 'newcard_settings', 
            name: 'NewCard', 
            icon: PLUGIN_ICON
        });

        // Показувати рейтинги
        Lampa.SettingsApi.addParam({
            component: 'newcard_settings',
            param: { name: 'newcard_show_ratings', type: 'trigger', default: defaults.newcard_show_ratings },
            field: { name: getUkrainianTranslation('show_ratings'), description: getUkrainianTranslation('show_ratings_desc') },
            onChange: applyCurrentSettings
        });

        // Розташування рейтингів
        Lampa.SettingsApi.addParam({
            component: 'newcard_settings',
            param: {
                name: 'newcard_ratings_position',
                type: 'select',
                values: { card: getUkrainianTranslation('position_card'), corner: getUkrainianTranslation('position_corner') },
                default: defaults.newcard_ratings_position
            },
            field: { name: getUkrainianTranslation('ratings_position'), description: getUkrainianTranslation('ratings_position_desc') },
            onChange: (value) => {
                Lampa.Storage.set('newcard_ratings_position', value);
                applyCurrentSettings(); // Оновлюємо клас позиції
                addCustomTemplate();
                Lampa.Activity.back();
            }
        });

        // Розмір логотипу
        Lampa.SettingsApi.addParam({
            component: 'newcard_settings',
            param: {
                name: 'newcard_logo_size',
                type: 'select',
                values: { small: getUkrainianTranslation('size_small'), medium: getUkrainianTranslation('size_medium'), large: getUkrainianTranslation('size_large') },
                default: defaults.newcard_logo_size
            },
            field: { name: getUkrainianTranslation('logo_size'), description: getUkrainianTranslation('logo_size_desc') },
            onChange: applyCurrentSettings
        });

        // Сховати реакції
        Lampa.SettingsApi.addParam({
            component: 'newcard_settings',
            param: { name: 'newcard_hide_reactions', type: 'trigger', default: defaults.newcard_hide_reactions },
            field: { name: getUkrainianTranslation('hide_reactions'), description: getUkrainianTranslation('hide_reactions_desc') },
            onChange: applyCurrentSettings
        });

        // ⭐ ПОКРАЩЕННЯ I: Застосування поточної конфігурації
        applyCurrentSettings();
    }

    function addCustomTemplate() {
        const ratingsPosition = Lampa.Storage.get('newcard_ratings_position', 'card');
        
        const ratingsBlock = `<div class="newcard__ratings">
                        <div class="rate--imdb hide">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                        <div class="rate--kp hide">
                            <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                    </div>`;
        
        const template = `<div class="full-start-new newcard">
        <div class="full-start-new__body">
            <div class="full-start-new__left hide">
                <div class="full-start-new__poster">
                    <img class="full-start-new__img full--poster" />
                </div>
            </div>

            <div class="full-start-new__right">
                <div class="newcard__left">
                    <div class="newcard__logo"></div>
                    <div class="full-start-new__title" style="display: none;">{title}</div>
                    
                    <div class="newcard__meta">
                        <div class="newcard__meta-left">
                            <span class="newcard__network"></span>
                            <span class="newcard__meta-text"></span>
                            <div class="full-start__pg hide"></div>
                        </div>
                    </div>
                    
                    ${ratingsPosition === 'card' ? ratingsBlock : ''}
                    
                    
                    <div class="newcard__info"></div>
                    
                    <div class="full-start-new__head" style="display: none;"></div>
                    <div class="full-start-new__details" style="display: none;"></div>

                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play">
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>
                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>
 </svg>
                            <span>#{title_watch}</span>
                        </div>

                        <div class="full-start__button selector button--book">
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                            </svg>
                            <span>#{settings_input_links}</span>
                        </div>

                        <div class="full-start__button selector button--reaction">
                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>
                                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>
                            </svg>
                            <span>#{title_reactions}</span>
                        </div>

                        <div class="full-start__button selector button--subscribe hide">
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>
                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>
                            </svg>
                            <span>#{title_subscribe}</span>
                        </div>

                        <div class="full-start__button selector button--options">
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>
                                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>
                                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="newcard__right">
                    <div class="full-start-new__reactions selector">
                        <div>#{reactions_none}</div>
                    </div>
                    
                    ${ratingsPosition === 'corner' ? ratingsBlock : ''}

                    <div class="full-start-new__rate-line">
                        <div class="full-start__status hide"></div>
                    </div>
                    
                    <div class="rating--modss" style="display: none;"></div>
                </div>
            </div>
        </div>

        <div class="hide buttons--container">
            <div class="full-start__button view--torrent hide">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px">
                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>
                </svg>
                <span>#{full_torrents}</span>
            </div>

            <div class="full-start__button selector view--trailer">
                <svg height="70" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"></path>
                </svg>
                <span>#{full_trailers}</span>
            </div>
        </div>
    </div>`;

        Lampa.Template.add('full_start_new', template);
    }

    // ⭐ ПОКРАЩЕННЯ II: Мінімізація CSS
    function addStyles() {
        const styles = `<style>
.newcard{transition:all .3s}.newcard .full-start-new__body{height:80vh}.newcard .full-start-new__right{display:flex;align-items:flex-end}.newcard .full-start-new__title{font-size:2.5em;font-weight:700;line-height:1.2;margin-bottom:.5em;text-shadow:0 0 .1em rgba(0,0,0,.3)}.newcard__logo{margin-bottom:.5em;opacity:0;transform:translateY(20px);transition:opacity .4s ease-out,transform .4s ease-out}.newcard__logo.loaded{opacity:1;transform:translateY(0)}.newcard__logo img{display:block;max-width:35vw;width:auto;height:auto;object-fit:contain;object-position:left center;max-height:180px}body.newcard--logo-small .newcard__logo img{max-height:120px;max-width:25vw}body.newcard--logo-large .newcard__logo img{max-height:250px;max-width:45vw}.newcard__meta{display:flex;align-items:center;color:#fff;font-size:1.1em;margin-bottom:.5em;line-height:1;opacity:0;transform:translateY(15px);transition:opacity .4s ease-out,transform .4s ease-out;transition-delay:.05s}.newcard__meta.show{opacity:1;transform:translateY(0)}.newcard__meta-left{display:flex;align-items:center;line-height:1}.newcard__network{display:inline-flex;align-items:center;line-height:1}.newcard__network img{display:block;max-height:1.4em;width:auto;object-fit:contain;filter:brightness(0) invert(1)}.newcard__meta-text{margin-left:1em;line-height:1}.newcard__meta .full-start__pg{margin:0 0 0 .6em;padding:.2em .5em;font-size:.85em;font-weight:600;border:1.5px solid rgba(255,255,255,.4);border-radius:.3em;background:rgba(255,255,255,.1);color:rgba(255,255,255,.9);line-height:1;vertical-align:middle}.newcard__ratings{display:flex;align-items:center;gap:.8em;margin-bottom:.5em;opacity:0;transform:translateY(15px);transition:opacity .4s ease-out,transform .4s ease-out;transition-delay:.08s}.newcard__ratings.show{opacity:1;transform:translateY(0)}.newcard__ratings .rate--imdb,.newcard__ratings .rate--kp{display:flex;align-items:center;gap:.35em}.newcard__ratings svg{width:2.5em;height:auto;flex-shrink:0;color:rgba(255,255,255,.85)}.newcard__ratings .rate--kp svg{width:1.5em}.newcard__ratings > div > div{font-size:.95em;font-weight:600;line-height:1;color:#fff}body.newcard--hide-ratings .newcard__ratings{display:none !important}body.newcard--hide-reactions .full-start-new__reactions{display:none !important}body.newcard--ratings-corner .newcard__right{gap:1em}body.newcard--ratings-corner .newcard__ratings{margin-bottom:0}.newcard__description{color:rgba(255,255,255,.6);font-size:.95em;line-height:1.5;margin-bottom:.5em;max-width:35vw;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;opacity:0;transform:translateY(15px);transition:opacity .4s ease-out,transform .4s ease-out;transition-delay:.1s}.newcard__description.show{opacity:1;transform:translateY(0)}.newcard__info{color:rgba(255,255,255,.75);font-size:1em;line-height:1.4;margin-bottom:.5em;opacity:0;transform:translateY(15px);transition:opacity .4s ease-out,transform .4s ease-out;transition-delay:.15s}.newcard__info.show{opacity:1;transform:translateY(0)}.newcard__left{flex-grow:1}.newcard__right{display:flex;align-items:flex-end;flex-shrink:0;position:relative}body.newcard--ratings-corner:not(.newcard--hide-reactions) .newcard__right{align-items:last baseline}.newcard .full-start-new__reactions{margin:0;display:flex;flex-direction:column-reverse;align-items:flex-end}.newcard .full-start-new__reactions > div{align-self:flex-end}.newcard .full-start-new__reactions:not(.focus){margin:0}.newcard .full-start-new__reactions:not(.focus) > div:not(:first-child){display:none}.newcard .full-start-new__reactions > div:first-child .reaction{display:flex !important;align-items:center !important;background-color:rgba(0,0,0,0) !important;gap:0 !important}.newcard .full-start-new__reactions > div:first-child .reaction__icon{background-color:rgba(0,0,0,.3) !important;-webkit-border-radius:5em;-moz-border-radius:5em;border-radius:5em;padding:.5em;width:2.6em !important;height:2.6em !important}.newcard .full-start-new__reactions > div:first-child .reaction__count{font-size:1.2em !important;font-weight:500 !important}.newcard .full-start-new__reactions.focus{gap:.5em}.newcard .full-start-new__reactions.focus > div{display:block}.newcard .full-start-new__rate-line{margin:0;height:0;overflow:hidden;opacity:0;pointer-events:none}.full-start__background{height:calc(100% + 6em);left:0 !important;opacity:0 !important;transition:opacity .6s ease-out,filter .3s ease-out !important;animation:none !important;transform:none !important;will-change:opacity,filter}.full-start__background.loaded:not(.dim){opacity:1 !important}.full-start__background.dim{filter:blur(30px)}.full-start__background.loaded.newcard-animated{opacity:1 !important}body:not(.menu--open) .full-start__background{mask-image:none}body.advanced--animation:not(.no--animation) .full-start__background.loaded{animation:none !important}.newcard .full-start__status{display:none}.newcard__overlay{width:90vw;background:linear-gradient(to right,rgba(0,0,0,.792) 0%,rgba(0,0,0,.504) 25%,rgba(0,0,0,.264) 45%,rgba(0,0,0,.12) 55%,rgba(0,0,0,.043) 60%,rgba(0,0,0,0) 65%)}
</style>`;
        
        // Видаляємо зайві пробіли та переноси рядків для максимальної компактності
        const minifiedStyles = styles.replace(/\s+/g, ' ').replace(/> </g, '><').trim();

        Lampa.Template.add('newcard_css', minifiedStyles);
        $('body').append(Lampa.Template.get('newcard_css', {}, true));
    }

    function patchApiImg() {
        const originalImg = Lampa.Api.img;
        Lampa.Api.img = (src, size) => {
            if (size === 'w1280') {
                const sizeMap = { 'w200': 'w780', 'w300': 'w1280', 'w500': 'original' };
                size = sizeMap[Lampa.Storage.field('poster_size')] || 'w1280';
            }
            return originalImg.call(this, src, size);
        };
    }

    function getLogoQuality() {
        const qualityMap = { 'w200': 'w300', 'w300': 'w500', 'w500': 'original' };
        return qualityMap[Lampa.Storage.field('poster_size')] || 'w500';
    }
    
    function selectBestLogo(logos, currentLang) {
        let bestLogo = null;
        const priorityLangs = [currentLang, 'en'];

        for (const lang of priorityLangs) {
            const matches = logos.filter(l => l.iso_639_1 === lang);
            if (matches.length) {
                matches.sort((a, b) => b.vote_average - a.vote_average);
                return matches[0];
            }
        }
        
        if (logos.length) {
            logos.sort((a, b) => b.vote_average - a.vote_average);
            return logos[0];
        }

        return null;
    }

    function getMediaType(data) {
        return !!data.name ? 'Серіал' : 'Фільм';
    }

    function loadNetworkIcon(activity, data) {
        const networkContainer = activity.render().find('.newcard__network');
        let mediaSource = data.networks || data.production_companies;
        
        if (mediaSource && mediaSource.length && mediaSource[0].logo_path) {
            const logo = mediaSource[0];
            const logoUrl = Lampa.Api.img(logo.logo_path, 'w200');
            networkContainer.html(`<img src="${logoUrl}" alt="${logo.name}">`);
        } else {
            networkContainer.remove();
        }
    }

    function fillMetaInfo(activity, data) {
        const metaTextContainer = activity.render().find('.newcard__meta-text');
        const genres = (data.genres || []).slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name));
        
        const metaParts = [getMediaType(data), ...genres];
        metaTextContainer.html(metaParts.join(' · '));
        
        loadNetworkIcon(activity, data);
    }

    function formatSeasons(count) {
        const cases = [2, 0, 1, 1, 1, 2];
        const titles = ['сезон', 'сезони', 'сезонів'];
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
        return `${count} ${titles[caseIndex]}`;
    }

    function fillAdditionalInfo(activity, data) {
        const infoContainer = activity.render().find('.newcard__info');
        const infoParts = [];

        const releaseDate = data.release_date || data.first_air_date || '';
        if (releaseDate) {
            infoParts.push(releaseDate.split('-')[0]);
        }

        if (data.name) {
            if (data.episode_run_time && data.episode_run_time.length) {
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');
                infoParts.push(`${data.episode_run_time[0]} ${timeM}`);
            }
            const seasons = Lampa.Utils.countSeasons(data);
            if (seasons) {
                infoParts.push(formatSeasons(seasons));
            }
        } else if (data.runtime && data.runtime > 0) {
            const hours = Math.floor(data.runtime / 60);
            const minutes = data.runtime % 60;
            const timeH = Lampa.Lang.translate('time_h').replace('.', '');
            const timeM = Lampa.Lang.translate('time_m').replace('.', '');
            const timeStr = hours > 0 
                ? `${hours} ${timeH} ${minutes} ${timeM}` 
                : `${minutes} ${timeM}`;
            infoParts.push(timeStr);
        }

        infoContainer.html(infoParts.join(' · '));
    }

    function loadLogo(event) {
        const data = event.data.movie;
        const activity = event.object.activity;
        
        if (!data || !activity) return;

        const render = activity.render();
        render.find('.full-start-new__details, .full-start-new__head').hide().empty();
        
        // ⭐ ПОКРАЩЕННЯ III: Уніфікація медіа типу
        const mediaType = data.name ? 'tv' : 'movie';
        
        fillMetaInfo(activity, data);       
        fillAdditionalInfo(activity, data); 

        const showContent = () => {
            render.find('.newcard__meta').addClass('show');      
            render.find('.newcard__info').addClass('show');       
            render.find('.newcard__ratings').addClass('show');    
        };

        waitForBackgroundLoad(activity, showContent);

        const currentLang = Lampa.Storage.get('language', 'ru');
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);

        $.get(apiUrl, (imagesData) => {
            const logoContainer = render.find('.newcard__logo');
            const titleElement = render.find('.full-start-new__title');
            const bestLogo = selectBestLogo(imagesData.logos, currentLang);

            if (bestLogo) {
                const logoUrl = Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`);
                const img = new Image();
                img.onload = () => {
                    logoContainer.html(`<img src="${logoUrl}" alt="" />`);
                    waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));
                };
                img.src = logoUrl;
            } else {
                titleElement.show();
                waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));
            }
        }).fail(() => {
            render.find('.full-start-new__title').show();
            waitForBackgroundLoad(activity, () => render.find('.newcard__logo').addClass('loaded'));
        });
    }

    function waitForBackgroundLoad(activity, callback) {
        const background = activity.render().find('.full-start__background:not(.newcard__overlay)');
        if (!background.length) {
            callback();
            return;
        }

        if (background.hasClass('loaded') && background.hasClass('newcard-animated')) {
            callback();
            return;
        }

        const runCallback = () => {
            background.addClass('newcard-animated');
            // ⭐ ПОКРАЩЕННЯ IV: Зменшення затримки для швидшої реакції (650ms -> 400ms)
            setTimeout(callback, 400); 
        };

        if (background.hasClass('loaded')) {
            runCallback();
            return;
        }

        const checkInterval = setInterval(() => {
            if (background.hasClass('loaded')) {
                clearInterval(checkInterval);
                runCallback();
            }
        }, 50);

        setTimeout(() => {
            clearInterval(checkInterval);
            if (!background.hasClass('newcard-animated')) runCallback();
        }, 2000);
    }

    function addOverlay(activity) {
        const background = activity.render().find('.full-start__background');
        if (background.length && !background.next('.newcard__overlay').length) {
            background.after('<div class="full-start__background loaded newcard__overlay"></div>');
        }
    }

    function attachLogoLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                addOverlay(event.object.activity);
                loadLogo(event);
            }
        });
    }

    var pluginManifest = {
        type: 'other',
        version: '1.0.0',
        name: 'NewCard',
        description: 'Оновлений дизайн картки фільму та оптимізація під 4K',
        author: '@darkestclouds',
        icon: PLUGIN_ICON
    };

    if (Lampa.Manifest && Lampa.Manifest.plugins) {
        Lampa.Manifest.plugins = pluginManifest;
    }

    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (event) => {
            if (event.type === 'ready') {
                initializePlugin();
            }
        });
    }

})();
