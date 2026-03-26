(function () {  
    'use strict';  
    const PLUGIN_NAME = 'NewCard';  
    const PLUGIN_ID = 'new_card_style';  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24;  
  
    let currentInterval = null;  
  
    const ICONS = {  
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
    };  
  
    const QUALITY_ICONS = {  
        '4K': ASSETS_PATH + '4K.svg',  
        '2K': ASSETS_PATH + '2K.svg',  
        'FULL HD': ASSETS_PATH + 'FULL HD.svg',  
        'HD': ASSETS_PATH + 'HD.svg',  
        'HDR': ASSETS_PATH + 'HDR.svg',  
        'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',  
        'UKR': ASSETS_PATH + 'UKR.svg'  
    };  
  
    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;  
  
    const TRANSLATIONS = {  
        'settings_cas_logo_quality': 'Якість логотипу',  
        'settings_cas_logo_scale': 'Розмір логотипу',  
        'settings_cas_meta_size': 'Розмір шрифту',  
        'settings_cas_blocks_gap': 'Відступи між блоками',  
        'settings_cas_bg_animation': 'Анімація фону (Ken Burns)',  
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',  
        'settings_cas_show_studios': 'Показувати студії',  
        'settings_cas_show_quality': 'Показувати якість',  
        'settings_cas_show_rating': 'Показувати рейтинги',  
        'settings_cas_show_description': 'Опис фільму'  
    };  
  
    let debounceTimer;  
    function debounce(func, delay) {  
        return function() {  
            const context = this;  
            const args = arguments;  
            clearTimeout(debounceTimer);  
            debounceTimer = setTimeout(() => func.apply(context, args), delay);  
        };  
    }  
  
    function preloadImage(src) {  
        return new Promise((resolve, reject) => {  
            const img = new Image();  
            img.onload = () => resolve(img);  
            img.onerror = () => {  
                console.warn('Failed to load logo:', src);  
                reject(new Error('Image load failed'));  
            };  
            img.src = src;  
        });  
    }  
  
    function getRatingColor(val) {  
        const n = parseFloat(val);  
        return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';  
    }  
  
    function formatTime(mins) {  
        if (!mins) return '';  
        const h = Math.floor(mins / 60);  
        const m = mins % 60;  
        return (h > 0 ? h + 'г ' : '') + m + 'хв';  
    }  
  
    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLoader();  
    }  
  
    function addStyles() {  
        const style = document.createElement('style');  
        style.textContent = `  
            .full-start-new.left-title .cas-logo-container {  
                position: relative !important;  
                overflow: visible !important;  
                max-width: 100% !important;  
                padding-left: 0% !important;  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8) !important;  
                min-height: 120px !important;  
                height: calc(120px * var(--cas-logo-scale)) !important;  
                max-height: 25vh !important;  
                display: flex !important;  
                align-items: flex-start !important;  
            }  
  
            .cas-logo img {  
                background: transparent !important;  
                border: none !important;  
                max-width: 350px !important;  
                width: auto;  
                height: 120px !important;  
                transform: scale(var(--cas-logo-scale));  
                transform-origin: left center;  
                display: block;  
                object-fit: contain;  
                position: relative;  
                z-index: 1;  
                transition: transform 0.3s ease;  
            }  
  
            .cas-logo {  
                background: transparent !important;  
                border: none !important;  
                max-width: 100%;  
                padding-left: 0%;  
                margin-bottom: calc(var(--cas-blocks-gap) * 1.5);  
                max-height: 200px;  
                display: flex;  
                align-items: center;  
                justify-content: flex-start;  
            }  
  
            .cas-ratings-line {  
                display: flex;  
                align-items: center;  
                gap: 15px;  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
                flex-wrap: wrap;  
            }  
  
            .cas-meta-info {  
                font-size: var(--cas-meta-size);  
                color: rgba(255, 255, 255, 0.8);  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
                line-height: 1.4;  
            }  
  
            .cas-studios-row {  
                display: flex;  
                align-items: center;  
                gap: 8px;  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
                flex-wrap: wrap;  
            }  
  
            .cas-studio-logo {  
                max-width: 60px;  
                max-height: 30px;  
                object-fit: contain;  
                filter: brightness(0) invert(1);  
                opacity: 0.8;  
                transition: opacity 0.3s ease, transform 0.3s ease;  
            }  
  
            .cas-studio-logo:hover {  
                opacity: 1;  
                transform: scale(1.1);  
            }  
  
            .cas-quality-row {  
                display: flex;  
                align-items: center;  
                gap: 8px;  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
                flex-wrap: wrap;  
            }  
  
            .cas-quality-item {  
                display: flex;  
                align-items: center;  
                justify-content: center;  
                padding: 4px 8px;  
                background: rgba(255, 255, 255, 0.1);  
                border-radius: 4px;  
                font-size: 0.8em;  
                font-weight: 600;  
                color: white;  
                backdrop-filter: blur(10px);  
                transition: all 0.3s ease;  
            }  
  
            .cas-quality-item:hover {  
                background: rgba(255, 255, 255, 0.2);  
                transform: translateY(-2px);  
            }  
  
            .cas-quality-item img {  
                width: 20px;  
                height: 20px;  
                margin-right: 4px;  
                object-fit: contain;  
            }  
  
            .cas-rate-items {  
                display: flex;  
                align-items: center;  
                gap: 15px;  
                margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
                flex-wrap: wrap;  
            }  
  
            .cas-rate-item {  
                display: flex;  
                align-items: center;  
                gap: 6px;  
                padding: 6px 12px;  
                background: rgba(255, 255, 255, 0.1);  
                border-radius: 20px;  
                font-size: 0.9em;  
                font-weight: 600;  
                backdrop-filter: blur(10px);  
                transition: all 0.3s ease;  
            }  
  
            .cas-rate-item:hover {  
                background: rgba(255, 255, 255, 0.2);  
                transform: translateY(-2px);  
            }  
  
            .cas-rate-item img {  
                width: 18px;  
                height: 18px;  
                object-fit: contain;  
            }  
  
            .cas-description {  
                font-size: var(--cas-meta-size);  
                color: rgba(255, 255, 255, 0.7);  
                line-height: 1.6;  
                margin-bottom: calc(var(--cas-blocks-gap) * 1.2);  
                max-height: 4.8em;  
                overflow: hidden;  
                display: -webkit-box;  
                -webkit-line-clamp: 3;  
                -webkit-box-orient: vertical;  
                transition: all 0.3s ease;  
            }  
  
            .cas-description:hover {  
                color: rgba(255, 255, 255, 0.9);  
                max-height: none;  
                -webkit-line-clamp: unset;  
            }  
  
            .cas-sep {  
                color: rgba(255, 255, 255, 0.4);  
                font-weight: 300;  
            }  
  
            .cas-slideshow-overlay {  
                position: absolute;  
                top: 0;  
                left: 0;  
                right: 0;  
                bottom: 0;  
                background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%);  
                opacity: 0;  
                transition: opacity 1s ease;  
                pointer-events: none;  
            }  
  
            .cas--zoom-enabled .cas-slideshow-overlay {  
                animation: kenBurns 20s ease-in-out infinite alternate;  
            }  
  
            @keyframes kenBurns {  
                0% { transform: scale(1) translate(0, 0); }  
                25% { transform: scale(1.1) translate(-2%, -2%); }  
                50% { transform: scale(1.2) translate(2%, -1%); }  
                75% { transform: scale(1.1) translate(-1%, 2%); }  
                100% { transform: scale(1) translate(0, 0); }  
            }  
  
            .left-title__content {  
                transition: all 0.5s ease;  
            }  
  
            .left-title__content.cas-animated {  
                opacity: 1;  
                transform: translateY(0);  
            }  
  
            .left-title__content:not(.cas-animated) {  
                opacity: 0;  
                transform: translateY(20px);  
            }  
  
            .full-start-new__buttons {  
                margin-top: calc(var(--cas-blocks-gap) * 1.5);  
                transition: margin-top 0.3s ease;  
            }  
  
            .full-start-new__buttons:has(+ .cas-description) {  
                margin-top: calc(var(--cas-blocks-gap) * 0.8);  
            }  
  
            @media (max-width: 768px) {  
                .cas-logo img {  
                    max-width: 250px !important;  
                    height: 100px !important;  
                }  
                  
                .cas-studio-logo {  
                    max-width: 50px;  
                    max-height: 25px;  
                }  
                  
                .cas-meta-info, .cas-description {  
                    font-size: 0.9em;  
                }  
            }  
        `;  
        document.head.appendChild(style);  
    }  
  
    function addSettings() {  
        const defaults = {  
            'cas_logo_scale': '100',  
            'cas_logo_quality': 'original',  
            'cas_bg_animation': true,  
            'cas_slideshow_enabled': true,  
            'cas_blocks_gap': '20',  
            'cas_meta_size': '1.3',  
            'cas_show_studios': true,  
            'cas_show_quality': true,  
            'cas_show_rating': true,  
            'cas_show_description': true  
        };  
  
        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
        });  
  
        Lampa.SettingsApi.addComponent({  
            component: PLUGIN_ID,  
            name: PLUGIN_NAME,  
            icon: SETTINGS_ICON  
        });  
  
        const params = [  
            { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' } },  
            { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' } },  
            { name: 'cas_meta_size', type: 'select', values: { '1.1': 'Міні', '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },  
            { name: 'cas_blocks_gap', type: 'select', values: { '10':'Дуже тісно','15':'Тісно','20':'Стандарт','25':'Просторе','30':'Дуже просторе' } },  
            { name: 'cas_bg_animation', type: 'trigger' },  
            { name: 'cas_slideshow_enabled', type: 'trigger' },  
            { name: 'cas_show_studios', type: 'trigger' },  
            { name: 'cas_show_quality', type: 'trigger' },  
            { name: 'cas_show_rating', type: 'trigger' },  
            { name: 'cas_show_description', type: 'trigger' }  
        ];  
  
        params.forEach(p => {  
            Lampa.SettingsApi.addParam({  
                component: PLUGIN_ID,  
                param: {  
                    name: p.name,  
                    type: p.type,  
                    values: p.values,  
                    default: defaults[p.name]  
                },  
                field: {  
                    name: TRANSLATIONS['settings_' + p.name]  
                },  
                onChange: applySettings  
            });  
        });  
  
        applySettings();  
    }  
  
    function applySettings() {  
        const root = document.documentElement;  
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;  
        const gap = Lampa.Storage.get('cas_blocks_gap') || '20';  
        const metaSize = Lampa.Storage.get('cas_meta_size') || '1.3';  
  
        root.style.setProperty('--cas-logo-scale', scale);  
        root.style.setProperty('--cas-blocks-gap', gap + 'px');  
        root.style.setProperty('--cas-meta-size', metaSize + 'em');  
  
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));  
  
        const currentCard = $('.full-start-new.left-title');  
        if (currentCard.length > 0) {  
            currentCard.find('.cas-description').toggle(!!Lampa.Storage.get('cas_show_description'));  
            currentCard.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));  
            currentCard.find('.cas-quality-row').toggle(!!Lampa.Storage.get('cas_show_quality'));  
            currentCard.find('.cas-rate-items').toggle(!!Lampa.Storage.get('cas_show_rating'));  
  
            const hasVisibleElements = currentCard.find('.cas-studios-row:visible, .cas-rate-items:visible, .cas-quality-row:visible, .cas-description:visible').length > 0;  
            const buttons = currentCard.find('.full-start-new__buttons');  
              
            if (!hasVisibleElements) {  
                buttons.css('margin-top', '0.2em');  
                currentCard.find('.cas-ratings-line').css('margin-bottom', '0');  
            } else {  
                buttons.css('margin-top', '');  
                currentCard.find('.cas-ratings-line').css('margin-bottom', '');  
            }  
        }  
    }  
  
    function addCustomTemplate() {  
        const template = `  
            <div class="cas-logo"></div>  
            <div class="cas-ratings-line"></div>  
            <div class="cas-meta-info"></div>  
            <div class="cas-studios-row"></div>  
            <div class="cas-quality-row"></div>  
            <div class="cas-rate-items"></div>  
            <div class="cas-description"></div>  
        `;  
  
        Lampa.Template.add('full_start_new', `  
            <div class="full-start-new full-start-new--card">  
                <div class="full-start-new__poster">  
                    <div class="cas-slideshow-overlay"></div>  
                    <img class="full-start-new__img">  
                </div>  
                <div class="full-start-new__body left-title">  
                    <div class="left-title__content">  
                        ${template}  
                    </div>  
                    <div class="full-start-new__buttons"></div>  
                </div>  
            </div>  
        `);  
    }  
  
    function getCachedData(key) {  
        try {  
            const cached = localStorage.getItem('cas_cache_' + key);  
             if (cached) {  
                const data = JSON.parse(cached);  
                if (Date.now() - data.timestamp < CACHE_LIFETIME) {  
                    return data.data;  
                }  
            }  
        } catch (e) {  
            console.warn('Cache read error:', e);  
        }  
        return null;  
    }  
  
    function setCachedData(key, data) {  
        try {  
            localStorage.setItem('cas_cache_' + key, JSON.stringify({  
                data: data,  
                timestamp: Date.now()  
            }));  
        } catch (e) {  
            console.warn('Cache write error:', e);  
        }  
    }  
  
    function analyzeImageColor(imageSrc) {  
        return new Promise((resolve) => {  
            const img = new Image();  
            img.crossOrigin = 'anonymous';  
            img.onload = function() {  
                const canvas = document.createElement('canvas');  
                const ctx = canvas.getContext('2d');  
                canvas.width = this.width;  
                canvas.height = this.height;  
                ctx.drawImage(this, 0, 0);  
                  
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);  
                const data = imageData.data;  
                let r = 0, g = 0, b = 0, count = 0;  
                  
                for (let i = 0; i < data.length; i += 4) {  
                    if (data[i + 3] > 128) {  
                        r += data[i];  
                        g += data[i + 1];  
                        b += data[i + 2];  
                        count++;  
                    }  
                }  
                  
                if (count > 0) {  
                    r = Math.floor(r / count);  
                    g = Math.floor(g / count);  
                    b = Math.floor(b / count);  
                      
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;  
                    resolve({  
                        rgb: `rgb(${r}, ${g}, ${b})`,  
                        brightness: brightness,  
                        isDark: brightness < 128  
                    });  
                } else {  
                    resolve({ rgb: 'rgb(128, 128, 128)', brightness: 128, isDark: false });  
                }  
            };  
            img.onerror = () => resolve({ rgb: 'rgb(128, 128, 128)', brightness: 128, isDark: false });  
            img.src = imageSrc;  
        });  
    }  
  
    async function renderStudioLogosWithColorAnalysis(container, data) {  
        if (!data.production_companies || data.production_companies.length === 0) {  
            container.empty();  
            return;  
        }  
  
        const studios = data.production_companies.slice(0, 5);  
        const logoPromises = studios.map(async (studio) => {  
            if (studio.logo_path) {  
                const logoUrl = Lampa.TMDB.image('/t/p/h30' + studio.logo_path);  
                try {  
                    const color = await analyzeImageColor(logoUrl);  
                    return {  
                        ...studio,  
                        logoUrl: logoUrl,  
                        color: color  
                    };  
                } catch (e) {  
                    return {  
                        ...studio,  
                        logoUrl: logoUrl,  
                        color: { rgb: 'rgb(255, 255, 255)', brightness: 255, isDark: false }  
                    };  
                }  
            }  
            return null;  
        });  
  
        const results = await Promise.all(logoPromises);  
        const validStudios = results.filter(studio => studio !== null);  
  
        if (validStudios.length === 0) {  
            container.empty();  
            return;  
        }  
  
        const logosHtml = validStudios.map(studio => {  
            const bgColor = studio.color.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';  
            return `  
                <div class="cas-studio-logo" style="  
                    background: ${bgColor};  
                    border: 1px solid rgba(255, 255, 255, 0.2);  
                    border-radius: 4px;  
                    padding: 4px 8px;  
                    margin-right: 8px;  
                    display: inline-flex;  
                    align-items: center;  
                    height: 30px;  
                    box-sizing: border-box;  
                ">  
                    <img src="${studio.logoUrl}"   
                         style="  
                            height: 20px;  
                            width: auto;  
                            object-fit: contain;  
                            filter: ${studio.color.isDark ? 'brightness(1.2)' : 'brightness(0.8)'};  
                         "   
                         alt="${studio.name}"  
                         title="${studio.name}">  
                </div>  
            `;  
        }).join('');  
  
        container.html(logosHtml);  
    }  
  
    function startSlideshow(render, backdrops) {  
        stopSlideshow();  
          
        if (!Lampa.Storage.get('cas_slideshow_enabled') || backdrops.length < 2) return;  
          
        const poster = render.find('.full-start-new__img');  
        const overlay = render.find('.cas-slideshow-overlay');  
          
        let currentIndex = 0;  
          
        function showNextImage() {  
            const backdrop = backdrops[currentIndex];  
            const imageUrl = Lampa.TMDB.image('/t/p/original' + backdrop.file_path);  
              
            overlay.css('background-image', `url(${imageUrl})`);  
            overlay.addClass('visible');  
              
            currentIndex = (currentIndex + 1) % backdrops.length;  
        }  
          
        showNextImage();  
        currentInterval = setInterval(showNextImage, 5000);  
    }  
  
    function stopSlideshow() {  
        if (currentInterval) {  
            clearInterval(currentInterval);  
            currentInterval = null;  
        }  
        $('.cas-slideshow-overlay').removeClass('visible');  
    }  
  
    function cleanup() {  
        stopSlideshow();  
    }  
  
    async function loadMovieDataOptimized(render, data) {  
        const tasks = [];  
  
        tasks.push(Promise.resolve().then(() => {  
            const genres = (data.genres || []).slice(0, 3).map(g => g.name).join(', ');  
            const year = (data.release_date || data.first_air_date || '').split('-')[0];  
            const countries = (data.production_countries || []).slice(0, 2).map(c => c.name).join(', ');  
              
            let metaInfo = '';  
            if (year) metaInfo += year;  
            if (genres) metaInfo += (metaInfo ? ' • ' : '') + genres;  
            if (countries) metaInfo += (metaInfo ? ' • ' : '') + countries;  
              
            render.find('.cas-meta-info').text(metaInfo);  
        }));  
  
        if (Lampa.Storage.get('cas_show_rating')) {  
            tasks.push(Promise.resolve().then(() => {  
                const ratesHtml = [];  
                  
                if (data.vote_average && data.vote_average > 0) {  
                    const tmdbColor = getRatingColor(data.vote_average);  
                    ratesHtml.push(`<div class="cas-rate-item" style="color:${tmdbColor}">TMDB ${data.vote_average.toFixed(1)}</div>`);  
                }  
                  
                if (data.kinopoisk && data.kinopoisk.vote_average > 0) {  
                    const kpColor = getRatingColor(data.kinopoisk.vote_average);  
                    ratesHtml.push(`<div class="cas-rate-item" style="color:${kpColor}">КП ${data.kinopoisk.vote_average.toFixed(1)}</div>`);  
                }  
                  
                if (data.imdb && data.imdb.rating > 0) {  
                    const imdbColor = getRatingColor(data.imdb.rating);  
                    ratesHtml.push(`<div class="cas-rate-item" style="color:${imdbColor}">IMDb ${data.imdb.rating.toFixed(1)}</div>`);  
                }  
                  
                if (ratesHtml.length > 0) {  
                    render.find('.cas-rate-items').html('<div class="cas-rate-items">' + ratesHtml.join('') + '</div>');  
                } else {  
                    render.find('.cas-rate-items').empty();  
                }  
            }));  
        }  
  
        if (Lampa.Storage.get('cas_show_description') && (data.overview || data.description)) {  
            tasks.push(Promise.resolve().then(() => {  
                const description = data.overview || data.description || '';  
                const maxLength = 200;  
                const truncated = description.length > maxLength ?   
                    description.substring(0, maxLength) + '...' : description;  
                  
                render.find('.cas-description').html(`<div class="cas-description-text">${truncated}</div>`);  
            }));  
        }  
  
        await Promise.all(tasks);  
    }  
  
    function startPlugin() {  
        try {  
            initializePlugin();  
            console.log('NewCard plugin initialized successfully');  
        } catch (error) {  
            console.error('Failed to initialize NewCard plugin:', error);  
        }  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
  
})();
  
