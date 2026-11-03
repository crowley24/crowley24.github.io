(function () {
    'use strict';

    /*
     * CROWLEY24 — FULL CARD LOGO REPLACER
     * Заміна текстового заголовка на графічний логотип у повній картці (на базі «КіноТрейлери»)
     */

    if (!window.Lampa || !window.$) return;
    if (window.crowley_full_logo_replacer) return;

    window.crowley_full_logo_replacer = true;

    var tmdb = Lampa.Api.sources.tmdb;
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
        var type = (item.name || item.first_air_date) ? 'tv' : 'movie';
        if (item.method) type = item.method; // Точне визначення типу від Lampa
        
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
    // ОБРОБКА ПОВНОЇ КАРТКИ
    // --------------------------------------------------

    function processFullCard(container) {
        $(container).find('.full-start').each(function () {
            var $fullStart = $(this);
            
            // Запобігаємо повторній обробці того самого контейнера
            if ($fullStart.hasClass('crowley-logo-processed')) return;

            // Отримуємо дані фільму/серіалу з активіті або DOM
            var cardData = $fullStart.data('card') || (window.active && window.active.card);
            
            // Якщо напряму через data немає, пробуємо витягнути з глобального об'єкта поточного компонента
            if (!cardData && Lampa.Activity.active() && Lampa.Activity.active().card) {
                cardData = Lampa.Activity.active().card;
            }

            if (!cardData || !cardData.id) return;

            $fullStart.addClass('crowley-logo-processed');

            var $title = $fullStart.find('.full-start__title');
            if (!$title.length) return;

            // Створюємо елемент для графічного логотипа перед заголовком
            var $logo = $fullStart.find('.crowley-full-logo');
            if (!$logo.length) {
                $logo = $('<img class="crowley-full-logo" style="display:none; object-fit:contain; object-position:left center; max-width:28em; max-height:7em; margin-bottom:0.4em;">');
                $title.before($logo);
            }

            cachedLogo(cardData, function (url) {
                if (url) {
                    $logo.attr('src', url).show();
                    $title.hide(); // Ховаємо текстовий заголовок, якщо є якісний логотип
                } else {
                    $logo.hide();
                    $title.show(); // Залишаємо стандартний текст за відсутності логотипа
                }
            });
        });
    }

    // --------------------------------------------------
    // МОНІТОРИНГ ПОЯВИ ПОВНОЇ КАРТКИ (MutationObserver)
    // --------------------------------------------------

    function initObserver() {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        if (node.nodeType === 1) {
                            if ($(node).hasClass('full-start') || $(node).find('.full-start').length) {
                                processFullCard(node);
                            }
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
    // ЗАПУСК ПЛАГІНА
    // --------------------------------------------------

    function start() {
        if (window.crowley_full_logo_replacer_started) return;
        window.crowley_full_logo_replacer_started = true;

        processFullCard(document.body);
        initObserver();

        console.log('Crowley24 Full Card Logo Replacer initialized.');
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
