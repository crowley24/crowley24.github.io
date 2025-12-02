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
        el.style.opacity = 0;
        el.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
            el.style.opacity = 1;
        });
    }

    function styleLogo(img) {
        img.style.height = "auto";
        img.style.objectFit = "contain";
        img.style.display = "block";
    }

    // --- ОБРОБНИК ПОДІЙ ---

    Lampa.Listener.follow("full", function (event) {
        // Перевірка налаштування: якщо вимкнено, то виходимо
        if (!isEnabled()) return;

        if (event.type !== "complite") return;

        const movie = event.data.movie;
        const type = movie.name ? "tv" : "movie";
        const box = event.object.activity.render().find(".full-start-new__title");
        if (!box.length) return;

        const lang = Lampa.Storage.get("language") || "en";
        // const container = box[0]; // не використовується, можна видалити

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

            // Використовуємо .replace(".svg", ".png") лише для TMDB,
            // оскільки Lampa.TMDB.image сам додає шлях /t/p/original
            const finalUrl = Lampa.TMDB.image(path.replace(".svg", ".png")); 
            
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

    // --- СТВОРЕННЯ МЕНЮ НАЛАШТУВАНЬ (Виправлено) ---
    
    // Додаємо новий компонент налаштувань
    Lampa.Component.add('settings_component', {
        name: 'logo_settings_select',
        mount: function(data) {
            const component = this;

            // Створення елементів меню
            const items = [
                {
                    title: 'Логотипи фільмів',
                    subtitle: 'Показувати логотипи замість текстової назви фільму.',
                    right: true,
                    type: 'title'
                },
                {
                    title: 'Увімкнути',
                    value: true,
                },
                {
                    title: 'Вимкнути',
                    value: false,
                }
            ];
            
            // Створення компонента Select
            Lampa.Select.show({
                title: 'Логотипи фільмів',
                items: items,
                selected: isEnabled(),
                onSelect: function (a) {
                    Lampa.Storage.set(SETTINGS_KEY, a.value);
                    Lampa.Controller.select('settings_component', component.parent) // Повертаємо фокус
                },
                onBack: function() {
                    Lampa.Controller.select('settings_component', component.parent) // Повертаємо фокус
                }
            });
        },
        // Не обов'язково, але для безпеки:
        render: () => $('<div></div>') 
    })

    // Додаємо кнопку, яка відкриватиме підменю в розділ "Інтерфейс"
    Lampa.Settings.listener.follow("open", function (e) {
        if (e.name == 'interface') {
            e.body.find('[data-name="interface_poster_size"]').after(`
                <div class="settings-item selector" data-component="logo_settings_select" data-name="logo_settings">
                    <div class="settings-item__name">Логотипи фільмів</div>
                    <div class="settings-item__value">${isEnabled() ? 'Увімкнено' : 'Вимкнено'}</div>
                    <div class="settings-item__descr">Налаштування відображення логотипів фільмів.</div>
                </div>
            `);
            
            // Оновлення тексту при відкритті
            e.body.find('[data-name="logo_settings"]').find('.settings-item__value').text(isEnabled() ? 'Увімкнено' : 'Вимкнено');
        }
    });
    
    // Оновлення тексту після зміни налаштувань (для відображення одразу)
    Lampa.Settings.listener.follow("update", function (e) {
        if (e.name == 'interface') {
             e.body.find('[data-name="logo_settings"]').find('.settings-item__value').text(isEnabled() ? 'Увімкнено' : 'Вимкнено');
        }
    });

})();
