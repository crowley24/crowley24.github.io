(function () {
    "use strict";

    if (!window.logo_only_plugin) {
        window.logo_only_plugin = true;

        Lampa.Listener.follow("full", function (event) {
            if (event.type !== "complite") return;

            const movie = event.data.movie;
            const type = movie.name ? "tv" : "movie";
            const lang = Lampa.Storage.get("language") || "en";

            const render = event.object.activity.render();
            const title_box = render.find(".full-start-new__title");
            if (!title_box.length) return;

            const title_el = title_box[0];

            // URL TMDB
            const url = Lampa.TMDB.api(
                `${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`
            );

            // Працюємо тільки якщо є айді
            if (!movie.id) return;

            $.get(url, function (res) {
                if (!res.logos || !res.logos.length) return;

                // Пошук логотипа: 1) мова системи, 2) en, 3) перший доступний
                let path = null;

                path = res.logos.find(l => l.iso_639_1 === lang)?.file_path
                    || res.logos.find(l => l.iso_639_1 === "en")?.file_path
                    || res.logos[0].file_path;

                if (!path) return;

                const img_url = Lampa.TMDB.image("/t/p/original" + path.replace(".svg", ".png"));
                const img = new Image();
                img.src = img_url;

                img.style.width = "100%";
                img.style.height = "auto";
                img.style.objectFit = "contain";
                img.style.objectPosition = "left bottom";
                img.style.display = "block";

                img.onload = function () {
                    title_box.empty().append(img);
                };
            });
        });
    }
})();
