
(function () {
    'use strict';

    /*
     * CINEMATIC CARD 1.0.0
     *
     * Lampa / Android TV
     *
     * Independent cinematic redesign of the standard
     * movie and TV full card.
     *
     * Features:
     * - Fullscreen TMDB backdrop
     * - Cinematic bottom gradient
     * - TMDB logo
     * - Original title fallback
     * - Year, rating and genres
     * - Overview
     *
     * No trailers, YouTube or random content.
     */

    if (!window.Lampa || window.cinematic_card_100_ready) return;

    window.cinematic_card_100_ready = true;

    var VERSION = '1.0.0';

    var CONFIG = {
        logoMaxWidth: '30em',
        logoMaxHeight: '8em',
        descriptionLines: 3,
        logoLanguage: 'uk,en,null',
        backgroundSize: 'cover'
    };

    var CSS = `
        .cinematic-card {
            position: absolute;
            inset: 0;
            z-index: 2;
            overflow: hidden;
            pointer-events: none;
            color: #fff;
            font-family: inherit;
        }

        .cinematic-card__background {
            position: absolute;
            inset: 0;
            z-index: 0;
            background-position: center center;
            background-size: cover;
            background-repeat: no-repeat;
            transform: scale(1.01);
            opacity: 0;
            transition: opacity .65s ease;
        }

        .cinematic-card__background.is-visible {
            opacity: 1;
        }

        .cinematic-card__gradient {
            position: absolute;
            inset: 0;
            z-index: 1;
            background:
                linear-gradient(
                    to top,
                    rgba(0,0,0,.96) 0%,
                    rgba(0,0,0,.84) 18%,
                    rgba(0,0,0,.62) 38%,
                    rgba(0,0,0,.20) 68%,
                    rgba(0,0,0,.04) 100%
                );
        }

        .cinematic-card__info {
            position: absolute;
            z-index: 3;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 7em 12em 2.5em 3em;
            box-sizing: border-box;
        }

        .cinematic-card__logo {
            display: block;
            max-width: ${CONFIG.logoMaxWidth};
            max-height: ${CONFIG.logoMaxHeight};
            width: auto;
            height: auto;
            object-fit: contain;
            object-position: left center;
            margin: 0 0 .65em 0;
            opacity: 0;
            transition: opacity .45s ease;
        }

        .cinematic-card__logo.is-visible {
            opacity: 1;
        }

        .cinematic-card__title {
            display: none;
            max-width: 75%;
            margin: 0 0 .35em 0;
            font-size: 2.6em;
            line-height: 1.08;
            font-weight: 700;
            color: #fff;
            text-shadow: 0 2px 12px rgba(0,0,0,.5);
        }

        .cinematic-card__title.is-visible {
            display: block;
        }

        .cinematic-card__meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: .25em;
            max-width: 80%;
            margin-top: .25em;
            font-size: 1.25em;
            line-height: 1.4;
            font-weight: 500;
            color: rgba(255,255,255,.86);
            text-shadow: 0 1px 5px rgba(0,0,0,.5);
        }

        .cinematic-card__meta-item {
            white-space: nowrap;
        }

        .cinematic-card__separator {
            margin: 0 .35em;
            opacity: .55;
        }

        .cinematic-card__rating {
            color: #fff;
        }

        .cinematic-card__description {
            max-width: 70%;
            margin-top: .65em;
            font-size: 1.15em;
            line-height: 1.45;
            font-weight: 400;
            color: rgba(255,255,255,.78);
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: ${CONFIG.descriptionLines};
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: 0 1px 5px rgba(0,0,0,.6);
        }

        /*
         * Hide duplicate standard text elements.
         * Buttons and navigation remain untouched.
         */

        .full-start.cinematic-card-active .full-start__title,
        .full-start.cinematic-card-active .full-start__details,
        .full-start.cinematic-card-active .full-start__description {
            opacity: 0 !important;
            pointer-events: none !important;
        }

        .full-start.cinematic-card-active .cinematic-card {
            pointer-events: none;
        }

        .full-start.cinematic-card-active .full-start__buttons,
        .full-start.cinematic-card-active .full-start__buttons *,
        .full-start.cinematic-card-active .full-start__tags,
        .full-start.cinematic-card-active .full-start__pg {
            position: relative;
            z-index: 6;
        }

        @media screen and (max-width: 900px) {
            .cinematic-card__info {
                padding: 4em 8em 12.5em 1.5em;
            }

            .cinematic-card__logo {
                max-width: 80%;
                max-height: 5em;
            }

            .cinematic-card__title {
                font-size: 1.8em;
                max-width: 95%;
            }

            .cinematic-card__meta {
                font-size: 1em;
                max-width: 95%;
            }

            .cinematic-card__description {
                max-width: 95%;
                font-size: .95em;
                -webkit-line-clamp: 3;
            }
        }

        @media screen and (max-width: 600px) {
            .cinematic-card__info {
                padding: 3em 1.5em 10em 1.5em;
            }

            .cinematic-card__logo {
                max-width: 78%;
                max-height: 4.5em;
            }

            .cinematic-card__title {
                font-size: 1.65em;
            }

            .cinematic-card__meta {
                font-size: .9em;
            }

            .cinematic-card__description {
                font-size: .9em;
                line-height: 1.4;
            }
        }
    `;

    var style = document.createElement('style');
    style.id = 'cinematic-card-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var currentRoot = null;
    var currentItem = null;
    var requestId = 0;
    var observer = null;

    var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[char];
        });
    }

    function getLanguage() {
        try {
            return Lampa.Storage.get('tmdb_lang', 'uk') || 'uk';
        } catch (e) {
            return 'uk';
        }
    }

    function getType(item) {
        if (!item) return 'movie';

        if (
            item.name ||
            item.first_air_date ||
            item.number_of_seasons ||
            item.media_type === 'tv'
        ) {
            return 'tv';
        }

        return 'movie';
    }

    function getTitle(item) {
        return item.title ||
            item.name ||
            item.original_title ||
            item.original_name ||
            '';
    }

    function getYear(item) {
        var date = item.release_date || item.first_air_date || '';

        if (!date && item.year) {
            return String(item.year);
        }

        return date ? String(date).substring(0, 4) : '';
    }

    function getRating(item) {
        var rating = parseFloat(item.vote_average || item.rating || 0);

        if (!rating || rating <= 0) return '';

        return rating.toFixed(1);
    }

    function getGenres(item) {
        var names = [];

        try {
            var source = Lampa.Api.sources.tmdb;

            if (
                source &&
                typeof source.getGenresNameFromIds === 'function' &&
                item.genre_ids &&
                item.genre_ids.length
            ) {
                names = source.getGenresNameFromIds(
                    getType(item),
                    item.genre_ids
                ) || [];
            }
        } catch (e) {}

        if (!Array.isArray(names)) return [];

        return names.slice(0, 3).filter(Boolean);
    }

    function getImage(path, size) {
        if (!path) return '';

        try {
            return Lampa.Api.img(path, size || 'w1280');
        } catch (e) {
            return 'https://image.tmdb.org/t/p/' +
                (size || 'w1280') + path;
        }
    }

    function getRoot() {
        var roots = document.querySelectorAll('.full-start');

        if (!roots.length) return null;

        return roots[roots.length - 1];
    }

    function getItemFromEvent(event) {
        if (!event) return null;

        var data = event.data || {};

        if (data.movie) return data.movie;
        if (data.card) return data.card;
        if (data.item) return data.item;

        if (data.id && (data.title || data.name || data.backdrop_path)) {
            return data;
        }

        if (
            event.object &&
            event.object.movie
        ) {
            return event.object.movie;
        }

        return null;
    }

    function getLogoUrl(item, callback) {
        var id = item.id;

        if (!id) {
            callback('');
            return;
        }

        var type = getType(item);
        var language = getLanguage();

        var url =
            'https://api.themoviedb.org/3/' +
            type + '/' + id +
            '/images?api_key=' + TMDB_KEY +
            '&include_image_language=' +
            encodeURIComponent(language + ',en,null');

        fetch(url)
            .then(function (response) {
                if (!response.ok) throw new Error('TMDB images error');

                return response.json();
            })
            .then(function (data) {
                var logos = data.logos || [];

                if (!logos.length) {
                    callback('');
                    return;
                }

                var selected = null;

                var preferred = logos.filter(function (logo) {
                    return logo.iso_639_1 === language;
                });

                var english = logos.filter(function (logo) {
                    return logo.iso_639_1 === 'en';
                });

                var neutral = logos.filter(function (logo) {
                    return !logo.iso_639_1;
                });

                selected =
                    preferred[0] ||
                    english[0] ||
                    neutral[0] ||
                    logos[0];

                callback(
                    selected && selected.file_path
                        ? getImage(selected.file_path, 'w500')
                        : ''
                );
            })
            .catch(function () {
                callback('');
            });
    }

    function buildMeta(item) {
        var parts = [];

        var year = getYear(item);
        var rating = getRating(item);
        var genres = getGenres(item);

        if (year) {
            parts.push(year);
        }

        if (rating) {
            parts.push('<span class="cinematic-card__rating">★ ' +
                escapeHtml(rating) + '</span>');
        }

        genres.forEach(function (genre) {
            parts.push(escapeHtml(genre));
        });

        return parts.map(function (part, index) {
            return (index
                ? '<span class="cinematic-card__separator">·</span>'
                : '') +
                '<span class="cinematic-card__meta-item">' +
                part +
                '</span>';
        }).join('');
    }

    function removePrevious() {
        if (currentRoot) {
            currentRoot.classList.remove('cinematic-card-active');

            var old = currentRoot.querySelector('.cinematic-card');

            if (old) old.remove();
        }

        currentRoot = null;
        currentItem = null;
    }

    function render(item) {
        if (!item || !item.id) return;

        var root = getRoot();

        if (!root) return;

        if (
            currentRoot === root &&
            currentItem &&
            String(currentItem.id) === String(item.id)
        ) {
            return;
        }

        removePrevious();

        currentRoot = root;
        currentItem = item;

        var localRequest = ++requestId;

        var title = getTitle(item);
        var overview = item.overview || '';
        var backdrop = getImage(item.backdrop_path, 'w1280');

        var card = document.createElement('div');
        card.className = 'cinematic-card';

        card.innerHTML = `
            <div class="cinematic-card__background"></div>
            <div class="cinematic-card__gradient"></div>

            <div class="cinematic-card__info">
                <img class="cinematic-card__logo" alt="">
                <div class="cinematic-card__title"></div>
                <div class="cinematic-card__meta"></div>
                <div class="cinematic-card__description"></div>
            </div>
        `;

        root.appendChild(card);
        root.classList.add('cinematic-card-active');

        var background = card.querySelector(
            '.cinematic-card__background'
        );

        var logo = card.querySelector('.cinematic-card__logo');
        var fallbackTitle = card.querySelector('.cinematic-card__title');
        var meta = card.querySelector('.cinematic-card__meta');
        var description = card.querySelector(
            '.cinematic-card__description'
        );

        if (backdrop) {
            var image = new Image();

            image.onload = function () {
                if (localRequest !== requestId) return;

                background.style.backgroundImage =
                    'url("' + backdrop + '")';

                background.classList.add('is-visible');
            };

            image.onerror = function () {
                background.style.backgroundImage = '';
            };

            image.src = backdrop;
        }

        fallbackTitle.textContent = title;
        meta.innerHTML = buildMeta(item);
        description.textContent = overview;

        getLogoUrl(item, function (logoUrl) {
            if (localRequest !== requestId) return;
            if (!currentRoot || !currentRoot.contains(card)) return;

            if (!logoUrl) {
                fallbackTitle.classList.add('is-visible');
                return;
            }

            var logoImage = new Image();

            logoImage.onload = function () {
                if (localRequest !== requestId) return;

                logo.src = logoUrl;
                logo.classList.add('is-visible');
            };

            logoImage.onerror = function () {
                fallbackTitle.classList.add('is-visible');
            };

            logoImage.src = logoUrl;
        });
    }

    function refresh() {
        var root = getRoot();

        if (!root) {
            removePrevious();
            return;
        }

        if (currentRoot && currentRoot !== root) {
            removePrevious();
        }
    }

    function initObserver() {
        if (observer) observer.disconnect();

        observer = new MutationObserver(function () {
            var root = getRoot();

            if (!root) {
                if (currentRoot) removePrevious();
                return;
            }

            if (currentRoot && !document.body.contains(currentRoot)) {
                removePrevious();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function init() {
        if (!window.Lampa || !Lampa.Listener) return;

        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                var item = getItemFromEvent(event);

                if (item) {
                    setTimeout(function () {
                        render(item);
                    }, 100);
                }
            }

            if (
                event.type === 'destroy' ||
                event.type === 'close'
            ) {
                removePrevious();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (
                event.type === 'destroy' &&
                currentRoot
            ) {
                setTimeout(function () {
                    if (!getRoot()) removePrevious();
                }, 100);
            }
        });

        initObserver();

        console.log(
            '[CINEMATIC CARD] Version ' + VERSION + ' initialized'
        );
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }

})();
