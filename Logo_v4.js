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

    function styleLogo(img) {
        // ❗ Без зміни розміру — тільки базові стилі
        img.style.height = "auto";
        img.style.objectFit = "contain";
        img.style.display = "block";
    }

    Lampa.Listener.follow("full", function (event) {
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
})();
