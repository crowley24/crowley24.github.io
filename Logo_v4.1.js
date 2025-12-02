(function () {
    "use strict";

    // Перевіряємо, чи плагін вже завантажено
    if (window.simpleLogoPlugin) return;
    window.simpleLogoPlugin = true;

    // --- КОНСТАНТИ ТА НАЛАШТУВАННЯ ---
    const CACHE_PREFIX = "simple_logo_cache_v1_";
    const FADE_DURATION = 400; // мс
    const SETTINGS_KEY = "simple_logo_enabled"; // Ключ для зберігання налаштування

    // Встановлення значення за замовчуванням (увімкнено)
    if (Lampa.Storage.get(SETTINGS_KEY) === null) {
        Lampa.Storage.set(SETTINGS_KEY, true);
    }

    // Функція для отримання поточного стану
    function isEnabled() {
        return Lampa.Storage.get(SETTINGS_KEY);
    }

    // --- ФУНКЦІЇ ДОПОМОГИ ---
    
    function fadeIn(el, duration = FADE_DURATION) {
        // ... (функція fadeIn залишається без змін)
        el.style.opacity = 0;
        el.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
            el.style.opacity = 1;
        });
    }

    function styleLogo(img) {
        // ... (функція styleLogo залишається без змін)
        // ❗ Без зміни розміру — тільки базові стилі
        img.style.height = "auto";
        img.style.objectFit = "contain";
        img.style.display = "block";
    }

    // --- ОБРОБНИК ПОДІЙ ---

    Lampa.Listener.follow("full", function (event) {
        // ❗ Додано перевірку налаштування
        if (!isEnabled()) return;

        if (event.type !== "complite") return;

        const movie = event.data.movie;
        const type = movie.name ? "tv" : "movie";
        const box = event.object.activity.render().find(".full-start-new__title");
        if (!box.length) return;

        const lang = Lampa.Storage.get("language") || "en";
        const container = box[0];

        const cacheKey = `${CACHE_PREFIX}${type}_${movie.id}_${lang}`;
        const cached = Lampa.Storage.get(cacheKey);

        // ------------ КЕШ ------------
        if (cached && cached !== "none") {
            const img = new Image();
            img.src = cached;
            styleLogo(img);
            box.empty().append(img);
            fadeIn(img);
            return;
        }

        // ------------ TMDB ЗАПИТ ------------
        const url = Lampa.TMDB.api(
            `${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`
        );

        $.get(url, function (res) {
            if (!res.logos || !res.logos.length) {
                Lampa.Storage.set(cacheKey, "none");
                return;
            }

            let path =
                res.logos.find(l => l.iso_639_1 === lang)?.file_path ||
                res.logos.find(l => l.iso_639_1 === "en")?.file_path ||
                res.logos[0].file_path;

            const finalUrl = Lampa.TMDB.image("/t/p/original" + path.replace(".svg", ".png"));
            Lampa.Storage.set(cacheKey, finalUrl);

            const img = new Image();
            img.src = finalUrl;
            img.onload = () => {
                styleLogo(img);
                box.empty().append(img);
                fadeIn(img);
            };
        });

    });

    // --- СТВОРЕННЯ МЕНЮ НАЛАШТУВАНЬ ---

    // Чекаємо готовності Lampa.Settings для додавання налаштувань
    if (window.Lampa && Lampa.Settings) {
        let button_logo; // Зберігаємо кнопку для оновлення тексту

        // Додаємо новий розділ в меню Інтерфейс
        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == 'interface') {
                e.body.find('[data-name="interface_poster_size"]').after(`
                    <div class="settings-item selector" data-name="simple_logo_settings">
                        <div class="settings-item__name">Логотипи фільмів</div>
                        <div class="settings-item__value" data-value="true">${isEnabled() ? 'Увімкнено' : 'Вимкнено'}</div>
                        <div class="settings-item__descr">Показувати логотипи замість текстової назви фільму.</div>
                    </div>
                `);

                button_logo = e.body.find('[data-name="simple_logo_settings"]');
                button_logo.on('hover:enter', function () {
                    Lampa.Select.show({
                        title: 'Логотипи фільмів',
                        items: [
                            {
                                title: 'Увімкнути',
                                value: true,
                            },
                            {
                                title: 'Вимкнути',
                                value: false,
                            }
                        ],
                        selected: isEnabled(),
                        onSelect: function (a) {
                            Lampa.Storage.set(SETTINGS_KEY, a.value);
                            button_logo.find('.settings-item__value').text(a.value ? 'Увімкнено' : 'Вимкнено');
                            Lampa.Select.close();
                            // Можна додати перезавантаження сторінки full, якщо потрібно,
                            // але для простоти краще покластися на наступне відкриття.
                        },
                        onBack: function () {
                            Lampa.Select.close();
                            Lampa.Controller.toggle('settings_component');
                        }
                    });
                });
            }
        });
    }

})();
