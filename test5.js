(function () {
    'use strict';

    // Кеш для перевірки яскравості зображень та глобальний canvas (оптимізація для Android TV)
    let globalCanvas = null;
    let globalCtx = null;

    function getSharedCanvas(width = 50, height = 50) {
        if (!globalCanvas) {
            globalCanvas = document.createElement('canvas');
            globalCtx = globalCanvas.getContext('2d', { willReadFrequently: true });
        }
        if (globalCanvas.width !== width) globalCanvas.width = width;
        if (globalCanvas.height !== height) globalCanvas.height = height;
        return { canvas: globalCanvas, ctx: globalCtx };
    }

    function isImageDark(imgElement) {
        try {
            const { canvas, ctx } = getSharedCanvas(30, 30);
            ctx.clearRect(0, 0, 30, 30);
            ctx.drawImage(imgElement, 0, 0, 30, 30);
            const data = ctx.getImageData(0, 0, 30, 30).data;
            
            let colorSum = 0;
            for (let i = 0; i < data.length; i += 4) {
                // Формула яскравості (luminance)
                colorSum += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            }
            const brightness = colorSum / (data.length / 4);
            return brightness < 120; // true, якщо зображення темне
        } catch (e) {
            return false;
        }
    }

    // Кешування результатів парсингу бейджів для прискорення
    const badgeCache = new Map();

    function getEliteBadges(title, releaseName = '') {
        const cacheKey = title + '_' + releaseName;
        if (badgeCache.has(cacheKey)) {
            return badgeCache.get(cacheKey);
        }

        const badges = [];
        // Тут ваша логіка обробки елітних бейджів та регулярних виразів
        // Наприклад, перевірка ключових слів у назві роздачі

        badgeCache.set(cacheKey, badges);
        // Обмежуємо розмір кешу, щоб уникнути роздування пам'яті
        if (badgeCache.size > 500) {
            const firstKey = badgeCache.keys().next().value;
            badgeCache.delete(firstKey);
        }

        return badges;
    }

    // Головний об'єкт плагіна
    class LampaCustomPlugin {
        constructor() {
            this.qualityTimers = {};
            this.activeMovieId = null;
        }

        init() {
            this.listenEvents();
        }

        listenEvents() {
            Lampa.Listener.follow('full', (e) => {
                if (e.type === 'complite') {
                    this.handleCardOpen(e.data);
                }
            });
        }

        handleCardOpen(data) {
            this.activeMovieId = data.movie.id;
            const currentId = this.activeMovieId;

            // Відкладений запуск парсера з захистом від гонок запитів (race conditions)
            if (this.qualityTimers[currentId]) {
                clearTimeout(this.qualityTimers[currentId]);
            }

            this.qualityTimers[currentId] = setTimeout(() => {
                if (this.activeMovieId !== currentId) return; // Якщо картку вже закрили/змінили
                
                this.loadStudioLogo(data);
                this.processQualityBadges(data);

                // Очищаємо використаний таймер з пам'яті
                delete this.qualityTimers[currentId];
            }, 650);
        }

        loadStudioLogo(data) {
            const movieId = data.movie.id;
            const isMovie = data.movie.name || data.movie.title;
            const type = isMovie ? 'movie' : 'tv';

            // Використовуємо запит з чітким пріоритетом мов: спочатку українська, потім англійська (або дефолтна)
            const url = `https://api.themoviedb.org/3/${type}/${movieId}/images?include_image_language=uk,en,null`;

            Lampa.Network.silent(url, (response) => {
                if (response && response.logos && response.logos.length > 0) {
                    // Фільтруємо логотипи з урахуванням правила: якщо немає українського, беремо англійське
                    let logo = response.logos.find(l => l.iso_639_1 === 'uk') || 
                               response.logos.find(l => l.iso_639_1 === 'en') || 
                               response.logos[0];

                    if (logo && logo.file_path) {
                        const logoUrl = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
                        this.renderLogo(logoUrl);
                    }
                }
            }, (err) => {
                console.error('Plugin: Помилка завантаження логотипу TMDB', err);
            });
        }

        renderLogo(logoUrl) {
            // Логіка виведення логотипу в інтерфейс Lampa
            const renderTarget = document.querySelector('.full-start__logo');
            if (!renderTarget) return;

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const dark = isImageDark(img);
                renderTarget.innerHTML = '';
                renderTarget.appendChild(img);
                renderTarget.classList.toggle('is-dark-logo', dark);
            };
            img.src = logoUrl;
        }

        processQualityBadges(data) {
            // Фонова обробка якості та бейджів без навантаження на UI
            requestAnimationFrame(() => {
                // Ваша логіка рендерингу бейджів якості
            });
        }
    }

    // Реєстрація та запуск плагіна в середовищі Lampa
    if (window.appready) {
        new LampaCustomPlugin().init();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                new LampaCustomPlugin().init();
            }
        });
    }

})();
