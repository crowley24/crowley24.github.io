(function () {  
    "use strict";  
  
    // =======================================================  
    // I. НАЛАШТУВАННЯ ПЛАГІНА (Lampa.SettingsApi)  
    // =======================================================  
  
    // 1. Приховати/Відобразити логотипи  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_glav",  
            type: "select",  
            values: { 1: "Сховати", 0: "Відображати" },  
            default: "0"  
        },  
        field: {  
            name: "Логотипи замість назв",  
            description: "Відображає логотипи фільмів замість тексту"  
        }  
    });  
  
    // 2. Мова логотипу  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_lang",  
            type: "select",  
            values: {  
                "": "Як в Lampa",  
                ru: "Російська",  
                en: "English",  
                uk: "Українська",  
                be: "Білоруська",  
                kz: "Казахська",  
                pt: "Португальська",  
                es: "Іспанська",  
                fr: "Французька",  
                de: "Німецька",  
                it: "Італійська"  
            },  
            default: ""  
        },  
        field: {  
            name: "Мова логотипа",  
            description: "Пріоритетна мова для пошуку логотипа"  
        }  
    });  
  
    // 3. Розмір логотипа  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_size",  
            type: "select",  
            values: { w300: "w300", w500: "w500", w780: "w780", original: "Оригінал" },  
            default: "original"  
        },  
        field: {  
            name: "Розмір логотипа",  
            description: "Розширення завантажуваного зображення"  
        }  
    });  
  
    // 4. Очищення кешу логотипів  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_clear_cache",  
            type: "button",  
            action: function () {  
                localStorage.removeItem('logo_cache');  
                Lampa.Noty.show('Кеш логотипів очищено');  
            }  
        },  
        field: {  
            name: "Очистити кеш логотипів",  
            description: "Видаляє всі збережені логотипи"  
        }  
    });  
  
    // =======================================================  
    // II. ОСНОВНИЙ КОД ПЛАГІНА  
    // =======================================================  
  
    // Конфігурація  
    const CONFIG = {  
        baseUrl: "https://api.themoviedb.org/3",  
        apiKey: "4ef0d7355d9ffb5151e9877647082a3d",  
        imageBaseUrl: "https://image.tmdb.org/t/p/",  
        cacheKey: 'logo_cache',  
        cacheExpiry: 7 * 24 * 60 * 60 * 1000 // 7 днів  
    };  
  
    // Отримання налаштувань  
    function getSettings() {  
        return {  
            enabled: Lampa.Storage.get('logo_glav') !== '1',  
            language: Lampa.Storage.get('logo_lang') || '',  
            size: Lampa.Storage.get('logo_size') || 'original'  
        };  
    }  
  
    // Отримання кешованих логотипів  
    function getCachedLogos() {  
        try {  
            const cached = localStorage.getItem(CONFIG.cacheKey);  
            return cached ? JSON.parse(cached) : {};  
        } catch (e) {  
            return {};  
        }  
    }  
  
    // Збереження логотипів в кеш  
    function cacheLogos(logos) {  
        try {  
            localStorage.setItem(CONFIG.cacheKey, JSON.stringify({  
                data: logos,  
                timestamp: Date.now()  
            }));  
        } catch (e) {  
            console.warn('Не вдалося зберегти кеш логотипів:', e);  
        }  
    }  
  
    // Перевірка актуальності кешу  
    function isCacheValid() {  
        try {  
            const cached = localStorage.getItem(CONFIG.cacheKey);  
            if (!cached) return false;  
              
            const parsed = JSON.parse(cached);  
            return Date.now() - parsed.timestamp < CONFIG.cacheExpiry;  
        } catch (e) {  
            return false;  
        }  
    }  
  
    // Запит логотипів з TMDB  
    async function fetchLogos(movieId, type = 'movie') {  
        const settings = getSettings();  
        const languages = settings.language ? [settings.language] : ['uk', 'ru', 'en'];  
          
        for (const lang of languages) {  
            try {  
                const response = await fetch(  
                    `${CONFIG.baseUrl}/${type}/${movieId}/images?api_key=${CONFIG.apiKey}&include_image_language=${lang},null`  
                );  
                  
                if (!response.ok) continue;  
                  
                const data = await response.json();  
                const logos = data.logos || [];  
                  
                if (logos.length > 0) {  
                    return logos.filter(logo => logo.file_path).map(logo => ({  
                        ...logo,  
                        url: `${CONFIG.imageBaseUrl}${settings.size}${logo.file_path}`  
                    }));  
                }  
            } catch (e) {  
                console.warn(`Помилка завантаження логотипів для мови ${lang}:`, e);  
            }  
        }  
          
        return [];  
    }  
  
    // Створення елемента логотипа  
    function createLogoElement(logo) {  
        const img = document.createElement('img');  
        img.src = logo.url;  
        img.alt = 'Логотип';  
        img.style.cssText = `  
            max-width: 100%;  
            max-height: 80px;  
            width: auto;  
            height: auto;  
            object-fit: contain;  
        `;  
          
        return img;  
    }  
  
    // Відображення логотипа  
    function displayLogo(card, logo) {  
        const titleElement = card.querySelector('.full-start-new__title, .full-start__title, .card__title');  
        if (!titleElement) return;  
  
        const logoElement = createLogoElement(logo);  
        const container = document.createElement('div');  
        container.style.cssText = `  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            min-height: 80px;  
            margin: 10px 0;  
        `;  
        container.appendChild(logoElement);  
  
        // Заміна назви на логотип  
        titleElement.style.display = 'none';  
        titleElement.parentNode.insertBefore(container, titleElement.nextSibling);  
    }  
  
    // Обробка однієї картки  
    async function processCard(card) {  
        const settings = getSettings();  
        if (!settings.enabled) return;  
  
        // Перевірка чи вже оброблено  
        if (card.hasAttribute('data-logo-processed')) return;  
        card.setAttribute('data-logo-processed', 'true');  
  
        // Отримання ID фільму/серіалу  
        const movieData = card.movie_data || card.card_data;  
        if (!movieData || !movieData.id) return;  
  
        const movieId = movieData.id;  
        const type = movieData.number_of_seasons ? 'tv' : 'movie';  
  
        try {  
            // Перевірка кешу  
            let logos = [];  
            if (isCacheValid()) {  
                const cached = getCachedLogos();  
                logos = cached.data[`${type}_${movieId}`] || [];  
            }  
  
            // Якщо в кеші немає, завантажуємо  
            if (logos.length === 0) {  
                logos = await fetchLogos(movieId, type);  
                  
                // Оновлення кешу  
                const cached = getCachedLogos();  
                cached.data[`${type}_${movieId}`] = logos;  
                cacheLogos(cached.data);  
            }  
  
            // Відображення першого логотипа  
            if (logos.length > 0) {  
                displayLogo(card, logos[0]);  
            }  
  
        } catch (e) {  
            console.warn('Помилка обробки картки:', e);  
        }  
    }  
  
    // Обробка всіх карток  
    function processAllCards() {  
        const cards = document.querySelectorAll('.card:not([data-logo-processed]), .full-start-new:not([data-logo-processed])');  
        cards.forEach(processCard);  
    }  
  
    // Спостерігач за новими картками  
    const observer = new MutationObserver(function(mutations) {  
        setTimeout(processAllCards, 500);  
    });  
  
    // Ініціалізація плагіна  
    function init() {  
        console.log('Плагін логотипів завантажено (без анімації)');  
          
        // Обробка існуючих карток  
        processAllCards();  
          
        // Спостереження за новими картками  
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
    }  
  
    // Запуск  
    if (typeof Lampa !== 'undefined') {  
        init();  
    } else {  
        const checkInterval = setInterval(function() {  
            if (typeof Lampa !== 'undefined') {  
                clearInterval(checkInterval);  
                init();  
            }  
        }, 500);  
    }  
})();
