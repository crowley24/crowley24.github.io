(function () {
    'use strict';

    const PLUGIN_NAME = 'UaDV Prime';
    const VERSION = '1.0.0';

    // Конфігурація
    const CONFIG = {
        min_seeders: 3,
        max_size: 90 * 1024 * 1024 * 1024, // 90GB
        timeout: 15000,
        categories: '2000,2010,2030,2040,2045,5000,5030,5040' // Фільми + Серіали
    };

    function noty(msg) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);
    }

    // --- Робота з мережею та API ---
    async function getJackettResults(query) {
        let url = Lampa.Storage.field('jackett_url');
        let key = Lampa.Storage.field('jackett_key');
        
        if (!url) throw new Error('Вкажіть Jackett URL у налаштуваннях');

        let searchUrl = `${url.replace(/\/$/, '')}/api/v2.0/indexers/all/results?apikey=${key}&Query=${encodeURIComponent(query)}&Category[]=${CONFIG.categories.split(',').join('&Category[]=')}`;
        
        try {
            const response = await fetch(searchUrl);
            const json = await response.json();
            return json.Results || json.results || [];
        } catch (e) {
            console.error('Jackett error:', e);
            return [];
        }
    }

    // --- Алгоритм вибору найкращого релізу ---
    function scoreRelease(item) {
        let score = 0;
        const title = item.Title.toLowerCase();

        // Пріоритет мови (Українська обов'язкова)
        if (title.includes('ukr') || title.includes('ua') || title.includes('укр')) score += 1000;
        else return -1; // Ігноруємо без UA

        // Пріоритет якості відео
        if (title.includes('dv') || title.includes('dolby vision') || title.includes('dovi')) score += 500;
        if (title.includes('hdr')) score += 200;
        if (title.includes('2160p') || title.includes('4k')) score += 300;
        if (title.includes('1080p')) score += 100;

        // Пріоритет озвучки
        if (title.includes('dub') || title.includes('дубляж')) score += 150;

        // Вага розміру (якість бітрейту)
        score += Math.floor(item.Size / (1024 * 1024 * 1024)) * 5; 

        // Сиди (стабільність)
        score += Math.min(item.Seeders, 50);

        return score;
    }

    // --- Взаємодія з TorrServer ---
    async function startPlay(item, movie) {
        const ts_url = Lampa.Storage.field('torrserver_url').replace(/\/$/, '');
        const link = item.MagnetUri || item.Link;

        noty('Підготовка потоку...');

        try {
            // Додаємо торрент без збереження в базу для швидкості
            const res = await fetch(`${ts_url}/torrents`, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'add',
                    link: link,
                    title: `[UaDV] ${movie.title || movie.name}`,
                    save_to_db: false
                })
            });
            const data = await res.json();
            const hash = data.hash;

            // Отримуємо список файлів, щоб знайти найбільший (відео)
            const filesRes = await fetch(`${ts_url}/torrents`, {
                method: 'POST',
                body: JSON.stringify({ action: 'get', hash: hash })
            });
            const filesData = await filesRes.json();
            
            // Шукаємо найбільший файл (зазвичай це фільм)
            let mainFile = filesData.file_stats.reduce((prev, current) => (prev.length > current.length) ? prev : current);

            const playUrl = `${ts_url}/stream/?link=${hash}&index=${mainFile.id}&play=1`;

            Lampa.Player.play({
                url: playUrl,
                title: movie.title || movie.name,
                timeline: { hash: hash }
            });
        } catch (e) {
            noty('Помилка TorrServer');
        }
    }

    // --- Головна функція запуску ---
    async function run(data) {
        const movie = data.movie;
        const query = `${movie.original_title || movie.original_name} ${movie.release_date ? movie.release_date.slice(0, 4) : ''}`;
        
        noty(`Пошук найкращого UA релізу...`);

        let results = await getJackettResults(query);
        
        let scored = results
            .map(item => ({ item, score: scoreRelease(item) }))
            .filter(res => res.score > 0 && res.item.Size <= CONFIG.max_size && res.item.Seeders >= CONFIG.min_seeders)
            .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
            const best = scored[0].item;
            noty(`Знайдено: ${best.Title.slice(0, 30)}...`);
            startPlay(best, movie);
        } else {
            noty('Українських релізів не знайдено');
        }
    }

    // --- Інтерфейс (Кнопка) ---
    function addBtn() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                const btn = $(`
                    <div class="full-start__button selector playua-prime-btn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                            <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm7.039 3.399c0-.552-.446-1-1-1H5.433c-.552 0-1 .448-1 1v3.202c0 .552.448 1 1 1h1.606c.554 0 1-.448 1-1V6.399zM11.5 5.5h-1.306l-2.14 2.584L13.5 11h-1.428l-1.679-2.624-.615.7V11H8.59V5.001h1.187v2.686h.057L12.102 5z"/>
                        </svg>
                        <span>UA Prime</span>
                    </div>
                `);

                btn.on('hover:enter', () => run(e.object));
                
                const container = e.object.activity.render().find('.full-start__buttons, .full-start-new__buttons');
                if (container.length) container.prepend(btn);
            }
        });
    }

    // Запуск плагіна
    if (!window.uadv_prime_loaded) {
        window.uadv_prime_loaded = true;
        addBtn();
    }
})();

