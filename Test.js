(function () {
    'use strict';

    if (window.CardFusionMobileLogosLoaded) return;
    window.CardFusionMobileLogosLoaded = true;

    // Працюємо тільки на мобільних пристроях.
    function isMobile() {
        try {
            if (Lampa.Platform && Lampa.Platform.is) {
                return Lampa.Platform.is('mobile');
            }
        } catch (e) {}

        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }

    if (!isMobile()) return;

    var PREFIX = 'cf_mobile_logo_';
    var currentSerial = 0;
    var currentEvent = null;

    function get(key, fallback) {
        var value = Lampa.Storage.get(PREFIX + key);
        return value === undefined || value === null ? fallback : value;
    }

    function set(key, value) {
        Lampa.Storage.set(PREFIX + key, value);
    }

    function movieType(movie) {
        return movie.media_type === 'tv' ||
            !!movie.name ||
            !!movie.first_air_date ? 'tv' : 'movie';
    }

    function movieKey(movie) {
        return PREFIX + 'override_' + movieType(movie) + '_' + movie.id;
    }

    function imageUrl(path, size) {
        if (!path) return '';

        try {
            return Lampa.TMDB.image('t/p/' + (size || 'w500') + path);
        } catch (e) {
            return 'https://image.tmdb.org/t/p/' +
                (size || 'w500') + path;
        }
    }

    function getLanguage() {
        return get('language',
            Lampa.Storage.get('logo_lang', 'uk') ||
            Lampa.Storage.get('language', 'uk') ||
            'uk'
        );
    }

    function requestLogo(movie, callback) {
        var type = movieType(movie);
        var lang = getLanguage();

        var url = Lampa.TMDB.api(
            type + '/' + movie.id + '/images'
        );

        $.getJSON(url, {
            api_key: Lampa.TMDB.key(),
            include_image_language: lang + ',en,null'
        }, function (data) {
            var logos = data && data.logos ? data.logos : [];

            logos.sort(function (a, b) {
                function priority(item) {
                    if (item.iso_639_1 === lang) return 0;
                    if (item.iso_639_1 === 'en') return 1;
                    if (!item.iso_639_1) return 2;
                    return 3;
                }

                return priority(a) - priority(b) ||
                    (b.vote_average || 0) - (a.vote_average || 0);
            });

            callback(logos);
        }).fail(function () {
            callback([]);
        });
    }

    function restoreTitle(title, movie) {
        title.removeClass('cf-mobile-logo-title');
        title.find('.cf-mobile-logo-image').remove();

        title.text(
            movie.title ||
            movie.name ||
            movie.original_title ||
            movie.original_name ||
            ''
        );
    }

    function renderLogo(event, file) {
        if (!event || !event.object || !event.object.activity) return;

        var render = $(event.object.activity.render());
        var movie = event.data.movie;

        var title = render.find(
            '.full-start-new__title, .full-start__title'
        ).first();

        if (!title.length) return;

        if (!file) {
            restoreTitle(title, movie);
            return;
        }

        var url = imageUrl(file, 'w500');
        if (!url) return;

        title.empty();

        var img = $('<img>', {
            class: 'cf-mobile-logo-image',
            src: url,
            alt: movie.title || movie.name || ''
        });

        img.on('error', function () {
            restoreTitle(title, movie);
        });

        title.addClass('cf-mobile-logo-title').append(img);
    }

    function handleLogo(event) {
        if (!event || !event.data || !event.data.movie) return;

        var movie = event.data.movie;
        var serial = ++currentSerial;

        currentEvent = event;

        var render = $(event.object.activity.render());
        var title = render.find(
            '.full-start-new__title, .full-start__title'
        ).first();

        if (!title.length) return;

        var savedLogo = Lampa.Storage.get(movieKey(movie));

        if (savedLogo) {
            renderLogo(event, savedLogo);
        } else {
            restoreTitle(title, movie);
        }

        requestLogo(movie, function (logos) {
            if (serial !== currentSerial) return;

            var active = currentEvent;
            if (!active || !active.data ||
                String(active.data.movie.id) !== String(movie.id)) return;

            // Ручний вибір має пріоритет над автоматичним.
            var manual = Lampa.Storage.get(movieKey(movie));

            if (manual) {
                renderLogo(active, manual);
                return;
            }

            if (logos.length && logos[0].file_path) {
                renderLogo(active, logos[0].file_path);
            } else {
                renderLogo(active, '');
            }
        });

        addPickerButton(event);
    }

    function addPickerButton(event) {
        var render = $(event.object.activity.render());
        var buttons = render.find('.full-start-new__buttons').first();

        if (!buttons.length) {
            buttons = render.find('.full-start__buttons').first();
        }

        if (!buttons.length || buttons.find('.cf-mobile-logo-picker').length) {
            return;
        }

        var button = $(
            '<div class="full-start__button selector cf-mobile-logo-picker">' +
                '<svg viewBox="0 0 24 24" width="22" height="22" ' +
                'fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M12 20h9"/>' +
                '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4z"/>' +
                '</svg>' +
                '<span>Логотип</span>' +
            '</div>'
        );

        button.on('hover:enter', function () {
            openLogoPicker(event);
        });

        button.on('click', function () {
            openLogoPicker(event);
        });

        buttons.append(button);
    }

    function openLogoPicker(event) {
        var movie = event.data.movie;

        var panel = $('<div class="cf-mobile-logo-picker-list"></div>');
        panel.append(
            '<div class="cf-mobile-logo-loading">' +
            'Завантаження логотипів TMDB…</div>'
        );

        Lampa.Modal.open({
            title: 'Вибір логотипа',
            html: panel,
            size: 'large'
        });

        requestLogo(movie, function (logos) {
            panel.empty();

            if (!logos.length) {
                panel.append(
                    '<div class="cf-mobile-logo-empty">' +
                    'Логотипи не знайдені</div>'
                );
                return;
            }

            var originalTitle = movie.title || movie.name || '';

            var reset = $('<div class="cf-mobile-logo-choice selector">' +
                '<span>Використовувати назву</span></div>');

            reset.on('hover:enter click', function () {
                Lampa.Storage.set(movieKey(movie), '');
                renderLogo(event, '');
                Lampa.Modal.close();
            });

            panel.append(reset);

            logos.forEach(function (logo) {
                if (!logo.file_path) return;

                var item = $('<div class="cf-mobile-logo-choice selector"></div>');
                var img = $('<img>').attr(
                    'src',
                    imageUrl(logo.file_path, 'w300')
                );

                var lang = logo.iso_639_1 ?
                    logo.iso_639_1.toUpperCase() : 'Без мови';

                item.append(img);
                item.append($('<small></small>').text(lang));

                item.on('hover:enter click', function () {
                    Lampa.Storage.set(movieKey(movie), logo.file_path);
                    renderLogo(event, logo.file_path);
                    Lampa.Modal.close();
                });

                panel.append(item);
            });
        });
    }

    function addStyles() {
        if (document.getElementById('cf-mobile-logo-styles')) return;

        var css = `
            .cf-mobile-logo-title {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                width: 100% !important;
                min-height: var(--cf-mobile-logo-height, 18vh);
            }

            .cf-mobile-logo-image {
                display: block !important;
                width: auto !important;
                max-width: var(--cf-mobile-logo-width, 85vw) !important;
                height: auto !important;
                max-height: var(--cf-mobile-logo-height, 18vh) !important;
                object-fit: contain !important;
                object-position: left center !important;
            }

            .cf-mobile-logo-picker-list {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                padding: 12px;
                max-height: 70vh;
                overflow-y: auto;
            }

            .cf-mobile-logo-choice {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 90px;
                padding: 12px;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 10px;
                text-align: center;
            }

            .cf-mobile-logo-choice.focus {
                border-color: white;
                background: rgba(255,255,255,.12);
            }

            .cf-mobile-logo-choice img {
                width: 100%;
                height: 65px;
                object-fit: contain;
            }

            .cf-mobile-logo-choice small {
                opacity: .65;
                font-size: 11px;
            }

            .cf-mobile-logo-loading,
            .cf-mobile-logo-empty {
                grid-column: 1 / -1;
                padding: 20px;
                text-align: center;
            }

            @media (max-width: 480px) {
                .cf-mobile-logo-title {
                    min-height: var(--cf-mobile-logo-height, 16vh);
                }

                .cf-mobile-logo-image {
                    max-height: var(--cf-mobile-logo-height, 16vh) !important;
                    max-width: 90vw !important;
                }
            }
        `;

        $('<style>', {
            id: 'cf-mobile-logo-styles',
            text: css
        }).appendTo('head');
    }

    function init() {
        addStyles();

        Lampa.Listener.follow('activity', function (event) {
            if (event.type === 'start' &&
                event.component === 'full' &&
                event.data && event.data.movie) {
                handleLogo(event);
            }
        });
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }

})();
