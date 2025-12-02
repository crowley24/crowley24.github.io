(function () {
    "use strict";

    if (window.simpleLogoPlugin) return;
    window.simpleLogoPlugin = true;

    const CACHE_PREFIX = "simple_logo_cache_v1_";
    const FADE_DURATION = 400; // мс

    function fadeIn(el, duration = FADE_DURATION) {
        el.style.opacity = 0;
        el.style.transition = `opacity ${duration}ms ease`;
        requestAnimationFrame(() => {
            el.style.opacity = 1;
        });
    }

    function applyLogoStyle(img) {
        img.style.width = "7em";
        img.style.height = "auto";
        img.style.objectFit = "contain";
        img.style.display = "block";
        img.style.margin = "0";
        img.style.padding = "0";
    }

    // слухаємо відкриття картки фільму/серіалу
    Lampa.Listener.follow("full", function (event) {
        if (event.type !== "complite") return;

        const movie = event.data.movie;
        const contentType = movie.name ? "tv" : "movie";
        const container = event.object.activity.render().find(".full-start-new__title");
        if (!container.length) return;

        const titleEl = container[0];
        const lang = Lampa.Storage.get("language") || "en";
        const size = "original";

        const cacheKey = `${CACHE_PREFIX}${contentType}_${movie.id}_${lang}`;
        const cached = Lampa.Storage.get(cacheKey);

        // Якщо є кеш — показуємо без запиту
        if (cached && cached !== "none") {
            const img = new Image();
            img.src = cached;
            applyLogoStyle(img);
            container.empty().append(img);
            fadeIn(img);
            return;
        }

        // Немає кешу → отримуємо з TMDB
        const url =
            Lampa.TMDB.api(
                `${contentType}/${movie.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`
            );

        $.get(url, function (data) {
            if (!data.logos || !data.logos.length) {
                Lampa.Storage.set(cacheKey, "none");
                return;
            }

            // Вибір логотипу:
            let path =
                data.logos.find(l => l.iso_639_1 === lang)?.file_path ||
                data.logos.find(l => l.iso_639_1 === "en")?.file_path ||
                data.logos[0].file_path;

            const finalUrl = Lampa.TMDB.image(`/t/p/${size}${path.replace(".svg", ".png")}`);

            Lampa.Storage.set(cacheKey, finalUrl);

            const img = new Image();
            img.src = finalUrl;
            img.onload = () => {
                applyLogoStyle(img);
                container.empty().append(img);
                fadeIn(img);
            };
        }).fail(() => {});
    });

})();
