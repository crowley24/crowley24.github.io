(function () {
    'use strict';

    /**
     * ПЕРЕМІННІ ТА КОНФІГУРАЦІЯ
     */
    var rafId;
    var logoCache = {};
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var PLUGIN_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#E1134B"/><path d="M17 8H7V16H17V8Z" fill="white"/></svg>`;

    var svgIcons = {
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /**
     * СТИЛІ (CSS)
     */
    function addStyles() {
        if ($('#newcard-styles').length) return;
        $('head').append(`
            <style id="newcard-styles">
                .full-start-new__title {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 80px;
                    margin-bottom: 15px !important;
                }
                .full-start-new__title img {
                    max-width: 80%;
                    max-height: 140px;
                    object-fit: contain;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
                }
                
                /* Блок студій */
                .studio-row {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px !important;
                    width: 100%;
                }
                .studio-item {
                    height: 25px;
                    padding: 4px 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                }
                .studio-item img {
                    height: 100%;
                    width: auto;
                    filter: brightness(0) invert(1);
                }

                /* Рядок мета-даних (Рейтинги, Час, Жанр, Якість) */
                .combined-meta-row {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                    font-size: 14px;
                    color: #fff;
                    opacity: 0.9;
                    margin-top: 5px;
                }
                .meta-rating-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-weight: bold;
                }
                .meta-rating-item img {
                    height: 12px;
                }
                .meta-sep {
                    opacity: 0.4;
                }
                .meta-quality-icons {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-left: 5px;
                }
                .meta-quality-icons img {
                    height: 14px;
                    width: auto;
                }
                
                /* Приховуємо стандартні елементи */
                .full-start__info, .full-start__title-name { display: none !important; }
            </style>
        `);
    }

    /**
     * ЛОГІКА ТА ОБРОБКА ДАНИХ
     */
    function getRatingColor(val) {
        var n = parseFloat(val);
        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        return '#ff4d4d';
    }

    function formatTime(mins) {
        if (!mins) return '';
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        return (h > 0 ? h + 'г ' : '') + m + 'хв';
    }

    function getCubRating(data) {
        if (!data || !data.reactions || !data.reactions.result) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        data.reactions.result.forEach(r => {
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }
        });
        return cnt >= 5 ? ((6.5 * 150 + sum) / (150 + cnt)).toFixed(1) : null;
    }

    function getBestQuality(results) {
        var best = { res: null, hdr: false, dv: false, ukr: false };
        if (!results) return best;
        results.slice(0, 10).forEach(item => {
            var t = (item.Title || '').toLowerCase();
            if (t.includes('ukr') || t.includes('укр')) best.ukr = true;
            if (t.includes('4k')) best.res = '4K';
            else if (t.includes('1080') && !best.res) best.res = 'FULL HD';
            if (t.includes('vision') || t.includes(' dv ')) best.dv = true;
            if (t.includes('hdr')) best.hdr = true;
        });
        return best;
    }

    /**
     * РЕНДЕР КОМПОНЕНТІВ
     */
    function renderStudios(container, data) {
        var logos = [];
        var sources = [data.networks, data.production_companies];
        sources.forEach(src => {
            if (src) src.forEach(item => {
                if (item.logo_path && logos.length < 4) {
                    logos.push(Lampa.Api.img(item.logo_path, 'w200'));
                }
            });
        });

        if (logos.length) {
            var $row = $('<div class="studio-row"></div>');
            logos.forEach(url => {
                $row.append(`<div class="studio-item"><img src="${url}"></div>`);
            });
            container.append($row);
        }
    }

    async function renderMetaRow(container, data, fullData) {
        var $row = $('<div class="combined-meta-row"></div>');
        var sep = '<span class="meta-sep">•</span>';

        // 1. Рейтинги
        var tmdb = parseFloat(data.vote_average || 0).toFixed(1);
        if (tmdb > 0) {
            $row.append(`<div class="meta-rating-item"><img src="${ratingIcons.tmdb}"> <span style="color:${getRatingColor(tmdb)}">${tmdb}</span></div>`);
        }
        var cub = getCubRating(fullData);
        if (cub) {
            $row.append(sep);
            $row.append(`<div class="meta-rating-item"><img src="${ratingIcons.cub}"> <span style="color:${getRatingColor(cub)}">${cub}</span></div>`);
        }

        // 2. Тривалість
        var runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0);
        if (runtime) {
            $row.append(sep);
            $row.append(`<span>${formatTime(runtime)}</span>`);
        }

        // 3. Жанр
        if (data.genres && data.genres.length) {
            $row.append(sep);
            $row.append(`<span>${data.genres[0].name}</span>`);
        }

        // 4. Якість (з парсера)
        var $qIcons = $('<div class="meta-quality-icons"></div>');
        $row.append($qIcons);
        
        container.append($row);

        // Асинхронне отримання якості
        if (Lampa.Parser && Lampa.Parser.get) {
            Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function(res) {
                if (res && res.Results) {
                    var b = getBestQuality(res.Results);
                    if (b.res) $qIcons.append(`<img src="${svgIcons[b.res]}">`);
                    if (b.dv) $qIcons.append(`<img src="${svgIcons['Dolby Vision']}">`);
                    else if (b.hdr) $qIcons.append(`<img src="${svgIcons['HDR']}">`);
                    if (b.ukr) $qIcons.append(`<img src="${svgIcons['UKR']}">`);
                }
            });
        }
    }

    function loadLogo(event) {
        var data = event.data.movie;
        var $render = event.object.activity.render();
        var $right = $render.find('.full-start__right');
        
        // Очищення попередніх ін’єкцій
        $render.find('.full-start-new__title, .studio-row, .combined-meta-row').remove();

        // 1. Створення контейнера для лого назви
        var $titleCont = $('<div class="full-start-new__title"></div>');
        $right.prepend($titleCont);

        // Завантаження лого назви
        $.ajax({
            url: `https://api.themoviedb.org/3/${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`,
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                var logo = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    $titleCont.html(`<img src="${url}">`);
                } else {
                    $titleCont.html(`<h2>${data.title || data.name}</h2>`);
                }
            },
            error: function() {
                $titleCont.html(`<h2>${data.title || data.name}</h2>`);
            }
        });

        // 2. Рендер Студій
        renderStudios($right, data);

        // 3. Рендер комбінованого рядка (Рейтинги, Час, Жанр, Якість)
        renderMetaRow($right, data, event.data);
    }

    /**
     * СТАРТ ПЛАГІНА
     */
    function startPlugin() {
        addStyles();
        
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite' || event.type === 'complete') {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    loadLogo(event);
                });
            }
        });

        // Реєстрація в налаштуваннях
        if (Lampa.Manifest) {
            Lampa.Manifest.plugins.newcard = {
                type: 'other',
                version: '1.2.0',
                name: 'NewCard Pro',
                description: 'Дизайн картки: Лого назви, Студії та комбінована інфо-панель.',
                icon: PLUGIN_ICON
            };
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });

})();
