(function () {  
    'use strict';  
  
    /**  
     * ПЕРЕМІННІ ТА КЕШУВАННЯ  
     */  
    var logoCache = new Map(); // Використовуємо Map для кращої продуктивності  
    var slideshowTimer;   
    var pluginPath = 'https://crowley24.github.io/NewIcons/';  
      
    var settings_list = [  
        { id: 'mobile_interface_animation', default: true },  
        { id: 'mobile_interface_slideshow', default: true },  
        { id: 'mobile_interface_slideshow_time', default: '10000' },  
        { id: 'mobile_interface_slideshow_quality', default: 'w1280' }, // Збільшено якість для ТВ  
        { id: 'mobile_interface_logo_size_v2', default: '180' }, // Збільшено для ТВ  
        { id: 'mobile_interface_logo_quality', default: 'original' }, // Вища якість  
        { id: 'mobile_interface_show_tagline', default: true },  
        { id: 'mobile_interface_blocks_gap', default: '16px' }, // Більші відступи  
        { id: 'mobile_interface_ratings_size', default: '0.55em' }, // Більші рейтинги  
        { id: 'mobile_interface_studios', default: true },  
        { id: 'mobile_interface_studios_bg_opacity', default: '0.2' }, // Трохи темніший  
        { id: 'mobile_interface_quality', default: true },  
        { id: 'mobile_interface_tv_optimized', default: true } // Нове налаштування для ТВ  
    ];  
  
    settings_list.forEach(function (opt) {  
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {  
            Lampa.Storage.set(opt.id, opt.default);  
        }  
    });  
  
    var svgIcons = {  
        '4K': pluginPath + '4K.svg',  
        '2K': pluginPath + '2K.svg',  
        'FULL HD': pluginPath + 'FULL HD.svg',  
        'HD': pluginPath + 'HD.svg',  
        'HDR': pluginPath + 'HDR.svg',  
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',  
        '7.1': pluginPath + '7.1.svg',  
        '5.1': pluginPath + '5.1.svg',  
        '4.0': pluginPath + '4.0.svg',  
        '2.0': pluginPath + '2.0.svg',  
        'DUB': pluginPath + 'DUB.svg',  
        'UKR': pluginPath + 'UKR.svg'  
    };  
  
    var ratingIcons = {  
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
    };  
  
    /**  
     * СТИЛІ ІНТЕРФЕЙСУ (CSS) - ОПТИМІЗОВАНО ДЛЯ ТВ  
     */  
    function applyStyles() {  
        var oldStyle = document.getElementById('mobile-interface-styles');  
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);  
  
        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');  
        var isTvOptimized = Lampa.Storage.get('mobile_interface_tv_optimized');  
        var bgOpacity = Lampa.Storage.get('mobile_interface_studios_bg_opacity');  
        var logoSize = Lampa.Storage.get('mobile_interface_logo_size_v2');  
        var blocksGap = Lampa.Storage.get('mobile_interface_blocks_gap');  
        var ratingsSize = Lampa.Storage.get('mobile_interface_ratings_size');  
          
        var css = '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';  
        css += '@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } ';  
          
        // ТВ-оптимізовані стилі замість мобільних  
        if (isTvOptimized) {  
            css += `  
                .mobile-interface__poster {  
                    height: 70vh !important;  
                    position: relative;  
                    overflow: hidden;  
                }  
                  
                .mobile-interface__logo {  
                    height: ${logoSize}px !important;  
                    margin-bottom: 1.5em;  
                    text-align: center;  
                }  
                  
                .mobile-interface__quality-badges {  
                    gap: 16px;  
                    margin: 1em 0;  
                    justify-content: center;  
                }  
                  
                .mobile-interface__quality-badges img {  
                    height: 2.5em !important;  
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));  
                }  
                  
                .mobile-interface__ratings {  
                    font-size: ${ratingsSize} !important;  
                    gap: 12px;  
                    margin: 1em 0;  
                }  
                  
                .mobile-interface__studios {  
                    gap: 12px;  
                    padding: 12px;  
                    background: rgba(0,0,0,${bgOpacity});  
                    border-radius: 8px;  
                    margin: 1em 0;  
                }  
                  
                .mobile-interface__studios img {  
                    max-height: 2.5em;  
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));  
                }  
                  
                .mobile-interface__content {  
                    padding: 2em;  
                    gap: ${blocksGap};  
                }  
                  
                .mobile-interface__title {  
                    font-size: 2.5em;  
                    margin-bottom: 0.5em;  
                }  
                  
                .mobile-interface__tagline {  
                    font-size: 1.3em;  
                    opacity: 0.8;  
                    margin-bottom: 1em;  
                }  
                  
                .mobile-interface__description {  
                    font-size: 1.2em;  
                    line-height: 1.6;  
                    margin-bottom: 1.5em;  
                }  
                  
                /* Оптимізація для пульта ДК */  
                .mobile-interface__button {  
                    padding: 12px 24px;  
                    font-size: 1.1em;  
                    min-height: 48px;  
                    display: flex;  
                    align-items: center;  
                    justify-content: center;  
                }  
                  
                .mobile-interface__button:focus {  
                    outline: 3px solid #fff;  
                    outline-offset: 2px;  
                }  
            `;  
        }  
          
        // Зберігаємо анімацію якщо увімкнено  
        if (isAnimationEnabled) {  
            css += '.mobile-interface__poster img { animation: kenBurnsEffect 40s linear infinite; }';  
            css += '.mobile-interface__content > * { animation: fadeInUp 0.6s ease forwards; }';  
        }  
  
        var style = document.createElement('style');  
        style.id = 'mobile-interface-styles';  
        style.textContent = css;  
        document.head.appendChild(style);  
    }  
  
    /**  
     * РЕЙТИНГИ - ОПТИМІЗОВАНО ДЛЯ ТВ  
     */  
    function displayRatings(data, render) {  
        if (!Lampa.Storage.get('mobile_interface_quality')) return;  
          
        var ratingsContainer = render.find('.mobile-interface__ratings');  
        if (!ratingsContainer.length) return;  
          
        var ratings = [];  
          
        // TMDB рейтинг  
        if (data.vote_average && data.vote_average > 0) {  
            ratings.push({  
                icon: ratingIcons.tmdb,  
                value: data.vote_average.toFixed(1),  
                color: '#032541'  
            });  
        }  
          
        // CUB рейтинг  
        if (Lampa.Storage.get('cub_status') === 'true' && data.cub_rating) {  
            ratings.push({  
                icon: ratingIcons.cub,  
                value: data.cub_rating.toFixed(1),  
                color: '#4CAF50'  
            });  
        }  
          
        if (ratings.length > 0) {  
            var html = ratings.map(function(r) {  
                return '<div class="rating-item" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">' +  
                    '<img src="' + r.icon + '" style="height: 1.2em; width: auto;">' +  
                    '<span style="font-weight: 600; color: ' + r.color + ';">' + r.value + '</span>' +  
                    '</div>';  
            }).join('');  
              
            ratingsContainer.html(html);  
        }  
    }  
  
    /**  
     * СТУДІЇ - ОПТИМІЗОВАНО ДЛЯ ТВ  
     */  
    function displayStudios(data, render) {  
        if (!Lampa.Storage.get('mobile_interface_studios')) return;  
          
        var studiosContainer = render.find('.mobile-interface__studios');  
        if (!studiosContainer.length) return;  
          
        var studios = [];  
          
        // Додаємо мережі  
        if (data.networks) {  
            data.networks.forEach(function(network) {  
                if (network.logo_path) {  
                    studios.push({  
                        name: network.name,  
                        logo: Lampa.Api.img(network.logo_path, 'w500')  
                    });  
                }  
            });  
        }  
          
        // Додаємо компанії  
        if (data.production_companies) {  
            data.production_companies.forEach(function(company) {  
                if (company.logo_path && studios.length < 6) {  
                    studios.push({  
                        name: company.name,  
                        logo: Lampa.Api.img(company.logo_path, 'w500')  
                    });  
                }  
            });  
        }  
          
        if (studios.length > 0) {  
            var html = studios.map(function(s) {  
                return '<img src="' + s.logo + '" alt="' + s.name + '" title="' + s.name + '" style="max-height: 2.5em; width: auto; object-fit: contain;">';  
            }).join('');  
              
            studiosContainer.html(html);  
        } else {  
            studiosContainer.hide();  
        }  
    }  
  
    /**  
     * СЛАЙД-ШОУ - ОПТИМІЗОВАНО ДЛЯ ТВ  
     */  
    function startSlideshow(render, backdrops) {  
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;  
          
        var poster = render.find('.mobile-interface__poster');  
        if (!poster.length) return;  
          
        var index = 0;  
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '15000')); // Більший інтервал для ТВ  
        var quality = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w1280');  
          
        clearInterval(slideshowTimer);  
        slideshowTimer = setInterval(function() {  
            index = (index + 1) % backdrops.length;  
            var imgUrl = Lampa.TMDB.image('/t/p/' + quality + backdrops[index].file_path);  
            var currentImg = poster.find('img').first();  
              
            $('<img src="' + imgUrl + '">').on('load', function() {  
                currentImg.fadeOut(1000, function() {  
                    $(this).attr('src', imgUrl).fadeIn(1000);  
                });  
            });  
        }, interval);  
    }  
  
    /**  
     * ІНІЦІАЛІЗАЦІЯ ПЛАГІНА  
     */  
    function init() {  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type === 'complite') {  
                var render = e.render;  
                var data = e.data;  
                  
                // Додаємо контейнери для ТВ-інтерфейсу  
                if (!render.find('.mobile-interface__content').length) {  
                    render.find('.full-start-new__right').prepend(`  
                        <div class="mobile-interface__content">  
                            <div class="mobile-interface__logo"></div>  
                            <div class="mobile-interface__title">${data.title || data.name}</div>  
                            <div class="mobile-interface__tagline">${data.tagline || ''}</div>  
                            <div class="mobile-interface__ratings"></div>  
                            <div class="mobile-interface__studios"></div>  
                            <div class="mobile-interface__quality-badges"></div>  
                            <div class="mobile-interface__description">${data.overview || ''}</div>  
                        </div>  
                    `);  
                }  
                  
                // Відображаємо рейтинги  
                displayRatings(data, render);  
                  
                // Відображаємо студії  
                displayStudios(data, render);  
                  
                // Запускаємо слайд-шоу  
                if (data.images && data.images.backdrops) {  
                    startSlideshow(render, data.images.backdrops);  
                }  
            }  
              
            // Зупиняємо слайд-шоу при закритті  
            if (e.type === 'destroy') {  
                clearInterval(slideshowTimer);  
            }  
        });  
    }  
  
    /**  
     * НАЛАШТУВАННЯ - ДОДАНО ТВ-ПАРАМЕТРИ  
     */  
    function setupSettings() {  
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_tv_optimized', type: 'trigger', default: true },  
            field: { name: 'ТВ-оптимізація', description: 'Адаптувати інтерфейс для телевізорів' },  
            onChange: applyStyles  
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_animation', type: 'trigger', default: true },  
            field: { name: 'Анімація', description: 'Ефекти анімації інтерфейсу' },  
            onChange: applyStyles  
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_slideshow', type: 'trigger', default: true },  
            field: { name: 'Слайд-шоу', description: 'Автоматична зміна фонових зображень' }  
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: {   
                name: 'mobile_interface_slideshow_time',   
                type: 'select',   
                values: { '10000': '10 сек', '15000': '15 сек', '20000': '20 сек', '30000': '30 сек' },   
                default: '15000'   
            },  
            field: { name: 'Інтервал слайд-шоу' }  
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: {   
                name: 'mobile_interface_slideshow_quality',   
                type: 'select',   
                values: { 'w780': '780px', 'w1280': '1280px', 'original': 'Оригінал' },   
                default: 'w1280'   
            },  
            field: { name: 'Якість слайд-шоу' }  
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_logo_size_v2', type: 'select', values: { '125': 'Малий', '180': 'Середній', '240': 'Великий' }, default: '180' },   
            field: { name: 'Розмір логотипу' },   
            onChange: applyStyles   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_logo_quality', type: 'select', values: { 'w300': '300px', 'w500': '500px', 'original': 'Оригінал' }, default: 'original' },   
            field: { name: 'Якість логотипу' }   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_show_tagline', type: 'trigger', default: true },   
            field: { name: 'Показувати слоган' },   
            onChange: applyStyles   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_blocks_gap', type: 'select', values: { '8px': 'Компактний', '16px': 'Стандартний', '24px': 'Просторий' }, default: '16px' },   
            field: { name: 'Відступи між блоками' },   
            onChange: applyStyles   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_ratings_size', type: 'select', values: { '0.45em': 'Малий', '0.55em': 'Середній', '0.65em': 'Великий' }, default: '0.55em' },   
            field: { name: 'Розмір рейтингів' },   
            onChange: applyStyles   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_studios', type: 'trigger', default: true },   
            field: { name: 'Показувати студії' }   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_studios_bg_opacity', type: 'select', values: { '0': 'Вимкнено', '0.1': 'Світлий', '0.2': 'Середній', '0.3': 'Темний' }, default: '0.2' },   
            field: { name: 'Фон студій' },   
            onChange: applyStyles   
        });  
          
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: { name: 'mobile_interface_quality', type: 'trigger', default: true },   
            field: { name: 'Показувати якість' } });  
    }  
  
    function startPlugin() {  
        applyStyles();   
        setupSettings();   
        init();  
        setInterval(function () {   
            if (window.innerWidth <= 480 && window.lampa_settings) window.lampa_settings.blur_poster = false;   
        }, 2000);  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
  
})();  
  
