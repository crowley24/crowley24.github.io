(function () {
    'use strict';

    /*
     * CROWLEY24 — LOGO REPLACER PLUGIN
     * Заміна текстових заголовків на графічні логотипи (на базі механіки плагіна «КіноТрейлери»)
     */

    if (!window.Lampa || !window.$) return;
    if (window.crowley_logo_replacer) return;

    window.crowley_logo_replacer = true;

    var tmdb = Lampa.Api.sources.tmdb;

    // Кеш для логотипів, щоб не робити зайвих запитів до API
    var logoCache = {};

    // --------------------------------------------------
    // ПОМІЧНИКИ (з плагіна «КіноТрейлери»)
    // --------------------------------------------------

    function pickLogo(logos) {
        var order = [
            Lampa.Storage.field('tmdb_lang'),
            'en',
            null
        ];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (l) {
                return l.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    function cachedLogo(item, cb) {
        var type = item.name ? 'tv' : 'movie';
        var id = item.id;
        var cacheKey = type + '_' + id;

        if (logoCache[cacheKey] !== undefined) {
            cb(logoCache[cacheKey]);
            return;
        }

        if (logoCache[cacheKey + '_wait']) {
            logoCache[cacheKey + '_wait'].push(cb);
            return;
        }

        logoCache[cacheKey + '_wait'] = [cb];

        var lang = Lampa.Storage.field('tmdb_lang');
        var langs = (lang || 'en') + ',en,null';

        tmdb.get(
            type + '/' + id + '/images',
            {
                filter: {
                    include_image_language: langs
                }
            },
            function (json) {
                var logo = json.logos && json.logos.length
                    ? pickLogo(json.logos)
                    : null;

                var logoUrl = logo ? Lampa.Api.img(logo.file_path, 'w500') : null;

                finish(logoUrl);
            },
            function () {
                finish(null);
            }
        );

        function finish(url) {
            logoCache[cacheKey] = url || null;
            var list = logoCache[cacheKey + '_wait'] || [];
            logoCache[cacheKey + '_wait'] = null;

            list.forEach(function (f) {
                try {
                    f(logoCache[cacheKey]);
                } catch (e) {}
            });
        }
    }

    // --------------------------------------------------
    // ІН'ЄКЦІЯ ЛОГОТИПІВ У КАРТКИ ТА ЕКРАНИ
    // --------------------------------------------------

    function processElement(container) {
        $(container).find('.card, .full-start, .view--full').each(function () {
            var $el = $(this);
            
            // Шукаємо дані картки у DOM-елементі Lampa
            var cardData = $el.data('card') || $el[0].card_data;
            if (!cardData || !cardData.id) return;

            // Шукаємо контейнери для заголовка та майбутнього логотипа
            var $title = $el.find('.card__title, .full-start__title');
            if (!$title.length) return;

            // Перевіряємо, чи вже створювали логотип для цієї картки
            if ($el.hasClass('has-tmdb-logo')) return;
            $el.addClass('has-tmdb-logo');

            // Створюємо елемент картинки для логотипа, якщо його ще немає
            var $logo = $el.find('.tmdb-replaced-logo');
            if (!$logo.length) {
                $logo = $('<img class="tmdb-replaced-logo" style="display:none; object-fit:contain; object-position:left center; max-width:100%; max-height:4.5em; margin-bottom:.3em;">');
                $title.before($logo);
            }

            cachedLogo(cardData, function (url) {
                if (url) {
                    $logo.attr('src', url).show();
                    $title.hide(); // Ховаємо звичайний текст, якщо знайшли якісний логотип
                } else {
                    $logo.hide();
                    $title.show();
                }
            });
        });
    }

    // --------------------------------------------------
    // СТЕЖЕННЯ ЗА ЗМІНАМИ ДОМ-ДЕРЕВА (СПЕЦІЙНО ДЛЯ LAMPA)
    // --------------------------------------------------

    function initObserver() {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        if (node.nodeType === 1) {
                            processElement(node);
                        }
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // --------------------------------------------------
    // ЗАПУСК
    // --------------------------------------------------

    function start() {
        if (window.crowley_logo_replacer_started) return;
        window.crowley_logo_replacer_started = true;

        // Первинна обробка того, що вже є на сторінці
        processElement(document.body);

        // Запуск моніторингу динамічного завантаження елементів
        initObserver();

        console.log('Crowley24 Logo Replacer initialized.');
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                start();
            }
        });
    }

})();
