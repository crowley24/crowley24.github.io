(function () {
    "use strict";

    if (window.simpleLogoPlugin) return;
    window.simpleLogoPlugin = true;

    const CACHE_PREFIX = "simple_logo_cache_v1_";
    const FADE_DURATION = 400;

    // ============================
    // ⚙️ НАЛАШТУВАННЯ ПЛАГІНА
    // ============================
    Lampa.SettingsApi.addGroup({
        type: "simple_logo",
        name: "Логотипи фільмів"
    });

    Lampa.SettingsApi.addParam({
        component: "simple_logo",
        param: {
            name: "enable_logos",
            type: "checkbox",
            default: true
        },
        field: {
            name: "Увімкнути логотипи"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "simple_logo",
        param: {
            name: "enable_title",
            type: "checkbox",
            default: false
        },
        field: {
            name: "Показувати текст під логотипом"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "simple_logo",
        param: {
            name: "logo_size",
            type: "select",
            values: {
                small: "Малий",
                normal: "Нормальний",
                big: "Великий"
            },
            default: "normal"
        },
        field: {
            name: "Розмір логотипа"
        }
    });

    Lampa.SettingsApi.addButton({
        component: "simple_logo",
        name: "Очистити кеш логотипів",
        onClick: function () {
            Object.keys(localStorage)
                .filter(k => k.startsWith(CACHE_PREFIX))
                .forEach(k => localStorage.removeItem(k));

            Lampa.Noty.show("Кеш логотипів очищено");
        }
    });

    // ============================
    // 🎬 Fading
    // ============================
    function fadeIn(el, duration = FADE_DURATION) {
        el.style.opacity = 0;
        el.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
            el.style.opacity = 1;
        });
    }

    // ============================
    // 🎨 Стилі логотипа
    // ============================
    function styleLogo(img) {
        let size = Lampa.SettingsApi.getParam("simple_logo", "logo_size") || "normal";

        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.height = "auto";

        if (size === "small") {
            img.style.maxHeight = "32px";
        }
        else if (size === "big") {
            img.style.maxHeight = "72px";
        }
        else {
            img.style.maxHeight = "48px";
        }
    }

    // ============================
    // 📌 Головна логіка
    // ============================
    Lampa.Listener.follow("full", function (event) {
        if (event.type !== "complite") return;

        const enabled = Lampa.SettingsApi.getParam("simple_logo", "enable_logos");
        if (!enabled) return;

        const movie = event.data.movie;
        const type = movie.name ? "tv" : "movie";

        const box = event.object.activity.render().find(".full-start-new__title");
        if (!box.length) return;

        const lang = Lampa.Storage.get("language") || "en";
        const container = box[0];

        const cacheKey = `${CACHE_PREFIX}${type}_${movie.id}_${lang}`;
        const cached = Lampa.Storage.get(cacheKey);

        // ======================
        // 📦 Якщо є в кеші
        // ======================
        if (cached && cached !== "none") {
            const img = new Image();
            img.src = cached;

            img.onload = () => {
                box.empty().append(img);
                styleLogo(img);
                fadeIn(img);

                // Показ тексту якщо увімкнено
                if (Lampa.SettingsApi.getParam("simple_logo", "enable_title")) {
                    box.append(`<div class="logo-title">${movie.title || movie.name}</div>`);
                }
            };

            return;
        }

        // ======================
        // 🌐 Завантаження з TMDB
        // ======================
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
                box.empty().append(img);
                styleLogo(img);
                fadeIn(img);

                // Показ тексту
                if (Lampa.SettingsApi.getParam("simple_logo", "enable_title")) {
                    box.append(`<div class="logo-title">${movie.title || movie.name}</div>`);
                }
            };
        });

    });
})();
