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
        'settings_cas_ken_burns_duration': 'Тривалість анімації',  
        'settings_cas_vignette_opacity': 'Інтенсивність затемнення'  
    };  
  
    // Покращена функція preloadImage з обробкою помилок  
    function preloadImage(src) {  
        return new Promise((resolve, reject) => {  
            const img = new Image();  
            img.onload = () => resolve(img);  
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));  
            img.src = src;  
        });  
    }  
  
    // Оптимізоване кешування з перевіркою валідності  
    function getCachedData(cacheId) {  
        try {  
            const cached = localStorage.getItem(`cas_${cacheId}`);  
            if (!cached) return null;  
              
            const { data, timestamp } = JSON.parse(cached);  
            if (Date.now() - timestamp > CACHE_LIFETIME) {  
                localStorage.removeItem(`cas_${cacheId}`);  
                return null;  
            }  
            return data;  
        } catch (error) {  
            console.warn('Cache read error:', error);  
            return null;  
        }  
    }  
  
    function setCachedData(cacheId, data) {  
        try {  
            const cacheData = {  
                data,  
                timestamp: Date.now()  
            };  
            localStorage.setItem(`cas_${cacheId}`, JSON.stringify(cacheData));  
        } catch (error) {  
            console.warn('Cache write error:', error);  
        }  
    }  
  
    // Покращена функція addStyles з CSS змінними та апаратним прискоренням  
    function addStyles() {  
        if ($('#cas-main-styles').length) return;  
        const styles = `<style id="cas-main-styles">  
        :root {   
            --cas-logo-scale: 1;   
            --cas-blocks-gap: 30px;   
            --cas-meta-size: 1.3em;   
            --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1);  
            /* Нові CSS змінні для гнучкості */  
            --cas-ken-burns-duration: 50s;  
            --cas-vignette-opacity: 0.1;  
        }  
          
        /* Чистий фон без стандартних фільтрів Lampa з апаратним прискоренням */  
        .full-start__background {  
            height: calc(100% + 6em);  
            left: 0 !important;  
            opacity: 0 !important;  
            transition: opacity 0.6s ease-out !important;  
            will-change: opacity;  
            transform: scale(1.05);  
            backface-visibility: hidden;  
            perspective: 1000px;  
        }  
  
        .full-start__background.loaded:not(.dim) {  
            opacity: 1 !important;  
        }  
  
        /* Відключення стандартної анімації Lampa */  
        body.advanced--animation:not(.no--animation) .full-start__background.loaded {  
            animation: none !important;  
        }  
          
        /* Покращена Ken Burns анімація з використанням CSS змінних */  
        @keyframes casKenBurnsParallax {  
            0% { transform: scale(1.05) translateY(0px) translateX(0px); }  
            25% { transform: scale(1.08) translateY(-12px) translateX(-6px); }  
            50% { transform: scale(1.12) translateY(-18px) translateX(8px); }  
            75% { transform: scale(1.09) translateY(-10px) translateX(-4px); }  
            100% { transform: scale(1.05) translateY(0px) translateX(0px); }  
        }  
                
        body.cas--zoom-enabled .full-start__background.loaded {  
            animation: casKenBurnsParallax var(--cas-ken-burns-duration, 50s) ease-in-out infinite !important;  
            will-change: transform;  
        }  
  
        /* Додатковий subtle ефект глибини */  
        body.cas--zoom-enabled .full-start__background::after {  
            content: '';  
            position: absolute;  
            top: 0;  
            left: 0;  
            right: 0;  
            bottom: 0;  
            background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,var(--cas-vignette-opacity, 0.1)) 100%);  
            pointer-events: none;  
            animation: vignettePulse var(--cas-ken-burns-duration, 50s) ease-in-out infinite;  
        }  
  
        @keyframes vignettePulse {  
            0%, 100% { opacity: 0.3; }  
            50% { opacity: 0.1; }  
        }  
  
        /* Анімації контенту з покращеною продуктивністю */  
        .cas-logo, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description, .cas-details-wrapper {  
            opacity: 0 !important;  
            transform: translateY(10px);  
            transition: opacity 0.4s var(--cas-anim-curve), transform 0.4s var(--cas-anim-curve);  
            will-change: transform, opacity;  
        }  
                
        .cas-animated .cas-logo { opacity: 1 !important; transform: translateY(0); transition-delay: 0s; }  
        .cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.1s; }  
        .cas-animated .cas-rate-items { opacity: 1 !important; transform: translateY(0); transition-delay: 0.2s; }  
        .cas-animated .cas-meta-info { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.3s; }  
        .cas-animated .cas-quality-row { opacity: 0.8 !important; transform: translateY(0); transition-delay: 0.4s; }  
        .cas-animated .cas-description { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.5s; }  
        .cas-animated .cas-details-wrapper { opacity: 0.6 !important; transform: translateY(0); transition-delay: 0.6s; }  
  
        /* Покращені стилі контейнерів */  
        .cas-logo-container {  
            position: relative;  
            overflow: visible;  
            max-width: 100%;  
            padding-left: 0%;  
            margin-bottom: calc(var(--cas-blocks-gap) * 1.5);  
            max-height: 300px;  
        }  
  
        .cas-logo img {  
            max-height: 200px;  
            width: auto;  
            height: auto;  
            transform: scale(var(--cas-logo-scale));  
            transform-origin: left center;  
            display: block;  
            object-fit: contain;  
        }  
                
        .cas-studio-item {  
            height: 2.3em !important;  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            background: rgba(255, 255, 255, 0.1);  
            padding: 4px 8px;  
            border-radius: 6px;  
        }  
          
        .cas-studio-item img {  
            height: 100%;  
            width: auto;  
            object-fit: contain;  
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));  
            opacity: 1;  
            transition: all 0.3s ease;  
        }  
  
        .cas-description {   
            font-size: var(--cas-meta-size) !important;   
            line-height: 1.4;   
            color: rgba(255,255,255,0.7);   
            display: -webkit-box;   
            -webkit-line-clamp: 4;   
            -webkit-box-orient: vertical;   
            overflow: hidden;   
            max-width: 650px;   
            margin-top: calc(var(--cas-blocks-gap) * 0.4);   
        }  
          
        .cas-quality-item img { height: 12px; }  
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; font-size: var(--cas-meta-size); font-weight: 600; height: 30px; }  
        .cas-rate-item { display: flex; align-items: center; gap: 6px; }  
        .cas-rate-item img { height: 1.1em; }  
          
        .left-title .full-start-new__body { height: 85vh; }  
        .left-title .full-start-new__right {   
            display: flex;   
            align-items: flex-end;   
            justify-content: flex-end;   
            padding-bottom: 2vh;   
            padding-left: 1.5%;   
        }  
        .cas-meta-info { display: flex; align-items: center; gap: 8px; font-weight: 400; }  
                
        .full-start__background img {  
            transform: translateZ(0);  
            -webkit-transform: translateZ(0);  
        }  
        </style>`;  
        Lampa.Template.add('left_title_css', styles);  
        $('body').append(Lampa.Template.get('left_title_css', {}, true));  
    }  
  
    // Покращена функція startSlideshow з плавними переходами  
    function startSlideshow(render, backdrops) {  
        stopSlideshow();  
        if (!backdrops || backdrops.length < 2) return;  
  
        let currentIndex = 0;  
        const background = render.find('.full-start__background');  
          
        function changeBackground() {  
            const backdrop = backdrops[currentIndex];  
            const imageUrl = Lampa.TMDB.image(backdrop.file_path);  
              
            background.css({  
                'background-image': `url(${imageUrl})`,  
                'opacity': '0'  
            });  
              
            setTimeout(() => {  
                background.css('opacity', '1');  
            }, 100);  
              
            currentIndex = (currentIndex + 1) % backdrops.length;  
        }  
  
        changeBackground();  
        currentInterval = setInterval(changeBackground, 8000);  
    }  
  
    function stopSlideshow() {  
        if (currentInterval) {  
            clearInterval(currentInterval);  
            currentInterval = null;  
        }  
    }  
  
    // Покращена функція processImages з кращою обробкою помилок  
    async function processImages(render, data) {  
        try {  
            const cacheId = `${data.id}_images`;  
            let res = getCachedData(cacheId);  
              
            if (!res) {  
                const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());  
                res = await $.getJSON(imagesUrl);  
                setCachedData(cacheId, res);  
            }  
              
            processImagesWrapper(res);  
        } catch (error) {  
            console.error('Error in processImages:', error);  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }  
  
    // Покращена функція processImagesWrapper з оптимізацією логотипів  
    function processImagesWrapper(res) {  
        const render = $('.full-start-new');  
        if (!render.length) return;  
  
        const data = render.data('card');  
        if (!data) return;  
  
        try {  
            // Покращена логіка вибору логотипу  
            const bestLogo = res.logos?.find(l => l.iso_639_1 === 'uk') ||   
                           res.logos?.find(l => l.iso_639_1 === 'en') ||   
                           res.logos?.[0];  
                           
            if (bestLogo) {  
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);  
                  
                try {  
                    await preloadImage(logoSrc);  
                    render.find('.cas-logo').html(`<img src="${logoSrc}" alt="${data.title || data.name} logo">`);  
                } catch (logoError) {  
                    console.warn('Failed to load logo:', logoError);  
                    render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
                }  
            } else {  
                render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
            }  
                
            stopSlideshow();  
            if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {  
                console.log('Slideshow enabled, backdrops:', res.backdrops.length);  
                startSlideshow(render, res.backdrops);  
            } else {  
                console.log('Slideshow disabled or not enough backdrops');  
            }  
        } catch (error) {  
            console.error('Error in processImages:', error);  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }  
  
    // Покращена функція addSettings з новими опціями  
    function addSettings() {  
        if (Lampa.Settings.main && Lampa.Settings.main().render().find('[data-component="cas"]').length) return;  
  
        const items = [];  
          
        // Основні налаштування  
        items.push({  
            component: 'switch',  
            name: 'cas_bg_animation',  
            default: true  
        });  
  
        items.push({  
            component: 'switch',  
            name: 'cas_slideshow_enabled',  
            default: true  
        });  
  
        items.push({  
            component: 'switch',  
            name: 'cas_show_studios',  
            default: true  
        });  
  
        items.push({  
            component: 'switch',  
            name: 'cas_show_quality',  
            default: true  
        });  
  
        items.push({  
            component: 'switch',  
            name: 'cas_show_rating',  
            default: true  
        });  
  
        // Нові налаштування для гнучкості  
        items.push({  
            component: 'slider',  
            name: 'cas_ken_burns_duration',  
            default: 50,  
            step: 10,  
            min: 30,  
            max: 120  
        });  
  
        items.push({  
            component: 'slider',  
            name: 'cas_vignette_opacity',  
            default: 0.1,  
            step: 0.05,  
            min: 0,  
            max: 0.3  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'settings',  
            name: 'cas',  
            params: items  
        });  
    }  
  
    // Покращена функція applySettings з новими налаштуваннями  
    function applySettings() {  
        const bgAnimation = Lampa.Storage.get('cas_bg_animation', true);  
        const slideshowEnabled = Lampa.Storage.get('cas_slideshow_enabled', true);  
        const showStudios = Lampa.Storage.get('cas_show_studios', true);  
        const showQuality = Lampa.Storage.get('cas_show_quality', true);  
        const showRating = Lampa.Storage.get('cas_show_rating', true);  
        const kenBurnsDuration = Lampa.Storage.get('cas_ken_burns_duration', 50);  
        const vignetteOpacity = Lampa.Storage.get('cas_vignette_opacity', 0.1);  
  
        // Оновлюємо CSS змінні  
        document.documentElement.style.setProperty('--cas-ken-burns-duration', kenBurnsDuration + 's');  
        document.documentElement.style.setProperty('--cas-vignette-opacity', vignetteOpacity);  
  
        $('body').toggleClass('cas--zoom-enabled', bgAnimation);  
        $('body').toggleClass('cas--slideshow-enabled', slideshowEnabled);  
        $('body').toggleClass('cas--studios-enabled', showStudios);  
        $('body').toggleClass('cas--quality-enabled', showQuality);  
        $('body').toggleClass('cas--rating-enabled', showRating);  
    }  
  
    // Покращена функція startSlideshow з плавнішими переходами  
    function startSlideshow(render, backdrops) {  
        if (!backdrops || backdrops.length < 2) return;  
          
        stopSlideshow();  
        const transitionTime = 3000; // 3 секунди для плавного переходу  
        let currentIndex = 0;  
          
        const changeBackground = () => {  
            const nextIndex = (currentIndex + 1) % backdrops.length;  
            const nextImage = Lampa.TMDB.image('/t/p/original' + backdrops[nextIndex].file_path);  
              
            const bgElement = render.find('.full-start__background');  
              
            // Створюємо новий елемент для плавного переходу  
            const newBg = $('<div class="full-start__background" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; background-image: url(' + nextImage + '); background-size: cover; background-position: center; transition: opacity ' + (transitionTime/1000) + 's ease-in-out;"></div>');  
              
            bgElement.append(newBg);  
              
            // Плавна зміна  
            setTimeout(() => {  
                newBg.css('opacity', '1');  
                bgElement.find('> div:first').css('opacity', '0');  
                  
                setTimeout(() => {  
                    bgElement.find('> div:first').remove();  
                    newBg.css('position', '').css('opacity', '');  
                }, transitionTime);  
            }, 50);  
              
            currentIndex = nextIndex;  
        };  
          
        currentInterval = setInterval(changeBackground, 8000); // Змінюємо кожні 8 секунд  
    }  
  
    function stopSlideshow() {  
        if (currentInterval) {  
            clearInterval(currentInterval);  
            currentInterval = null;  
        }  
    }  
  
    // Покращена функція processImages з кращою обробкою помилок  
    async function processImages(render, data) {  
        try {  
            const imagesUrl = Lampa.TMDB.api('movie/' + data.id + '/images?include_image_language=en,ru,uk,null');  
              
            const res = await new Promise((resolve, reject) => {  
                $.getJSON(imagesUrl, resolve).fail(reject);  
            });  
              
            setCachedData(cacheId, res);  
              
            if (res.logos?.length) {  
                const bestLogo = res.logos.find(logo => logo.iso_639_1 === 'uk') ||   
                                 res.logos.find(logo => logo.iso_639_1 === 'ru') ||   
                                 res.logos.find(logo => logo.iso_639_1 === 'en') ||   
                                 res.logos[0];  
                  
                if (bestLogo) {  
                    const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
                    const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);  
                      
                    try {  
                        await preloadImage(logoSrc);  
                        render.find('.cas-logo').html(`<img src="${logoSrc}" alt="${data.title || data.name} logo">`);  
                    } catch (logoError) {  
                        console.warn('Failed to load logo:', logoError);  
                        render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
                    }  
                } else {  
                    render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
                }  
            }  
              
            stopSlideshow();  
            if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {  
                console.log('Slideshow enabled, backdrops:', res.backdrops.length);  
                startSlideshow(render, res.backdrops);  
            } else {  
                console.log('Slideshow disabled or not enough backdrops');  
            }  
        } catch (error) {  
            console.error('Error in processImages:', error);  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }  
  
    // Покращена функція attachLoader з оптимізацією  
    function attachLoader() {  
        Lampa.Listener.follow('full', (e) => {  
            if (e.type === 'complite' && e.data.card && e.data.card.id) {  
                const data = e.data.card;  
                const render = e.render;  
                const content = render.find('.full-start-new__body');  
                  
                if (!content.length) return;  
                  
                // Додаємо клас для оптимізації  
                content.addClass('cas-optimized');  
                  
                // Обробляємо зображення  
                processImages(render, data);  
                  
                // Об'єднуємо дані реакцій з об'єктом фільму  
                if (e.data.reactions) data.reactions = e.data.reactions;  
                debouncedLoadMovieData(render, data);  
                  
                // Оптимізована анімація  
                requestAnimationFrame(() => {  
                    setTimeout(() => content.addClass('cas-animated'), 100);  
                });  
                  
                // Фокус на першій кнопці  
                setTimeout(() => {  
                    const firstButton = render.find('.full-start-new__buttons .full-start__button').first();  
                    if (firstButton.length) {  
                        render.find('.full-start__button').removeClass('focus');  
                        firstButton.addClass('focus').trigger('focus');  
                    }  
                }, 200);  
            }  
        });  
    }  
  
    // Ініціалізація плагіна  
    function initializePlugin() {  
        addStyles();  
        addCustomTemplate();  
        addSettings();  
        applySettings();  
        attachLoader();  
          
        // Слухаємо зміни налаштувань  
        Lampa.Listener.follow('settings', (e) => {  
            if (e.type === 'change' && e.name && e.name.startsWith('cas_')) {  
                applySettings();  
            }  
        });  
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
  
