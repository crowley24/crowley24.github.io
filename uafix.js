(function () {

    function get(url) {
        return fetch(url).then(r => r.text());
    }

    function parseCatalog(html) {
        let out = [];
        let div = document.createElement("div");
        div.innerHTML = html;

        let links = div.querySelectorAll("a[href]");

        links.forEach(a => {
            let href = a.href;
            if (href.includes("/film") || href.includes("/watch") || href.includes("/movie")) {
                out.push({
                    title: a.getAttribute("title") || a.textContent.trim(),
                    poster: (a.querySelector("img") || {}).src || "",
                    url: href,
                    description: "Фільм з UAFIX"
                });
            }
        });

        return out;
    }

    function parseVideo(html, page) {
        let out = [];
        let div = document.createElement("div");
        div.innerHTML = html;

        let iframe = div.querySelector("iframe");
        if (iframe && iframe.src) {
            out.push({
                title: "Плеєр 1",
                url: iframe.src
            });
        }

        let video = div.querySelector("video source");
        if (video && video.src) {
            out.push({
                title: "Потік",
                url: video.src
            });
        }

        return out;
    }

    Lampa.Provider.add("uafix", {

        title: "UAFix",
        description: "Каталог фільмів uafix.net",

        search: function (query, callback) {
            get("https://uafix.net/?s=" + encodeURIComponent(query))
                .then(html => callback(parseCatalog(html)))
                .catch(() => callback([]));
        },

        main: function (callback) {
            get("https://uafix.net/")
                .then(html => callback(parseCatalog(html)))
                .catch(() => callback([]));
        },

        item: function (url, callback) {
            get(url)
                .then(html => callback(parseVideo(html, url)))
                .catch(() => callback([]));
        }

    });

})();
