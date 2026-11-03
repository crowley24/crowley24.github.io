(function () {
    'use strict';

    /*
     * NEWCARD 4.0.0 — CINEMATIC FULL CARD
     *
     * Lampa / Android TV
     *
     * Based on visual and loading logic from:
     * КІНОТРЕЙЛЕРИ 2.3
     *
     * FEATURES:
     * - TMDB backdrop w1280
     * - Smart TMDB logo selection
     * - Interface language > English > No language
     * - Smooth backdrop and logo loading
     * - Movie / TV metadata
     * - TMDB rating
     * - Genres
     * - Description
     * - Native Lampa buttons
     *
     * REMOVED:
     * - Custom settings
     * - Background slideshow
     * - Background animations
     * - Studio logos
     * - Quality badges
     * - Additional ratings
     * - Old image cache
     * - Parser integration
     */

    if (!window.Lampa || !window.$) return;
    if (window.new_card_style_v400) return;

    window.new_card_style_v400 = true;

    var VERSION = '4.0.0';
    var PLUGIN_NAME = 'NewCard';

    var tmdb = Lampa.Api.sources.tmdb;

    var imageCache = {};
    var requestCache = {};

    var activeCard = null;
    var cardSequence = 0;

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function getType(data) {
        return data && data.name ? 'tv' : 'movie';
    }

    function getTitle(data) {
        return (
            data.title ||
            data.name ||
            data.original_title ||
            data.original_name ||
            ''
        );
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getYear(data) {
        var date = data.release_date || data.first_air_date || '';

        return date ? date.slice(0, 4) : '';
    }

    function getGenres(data, type) {
        if (data.genres && data.genres.length) {
            return data.genres
                .map(function (genre) {
                    return genre.name;
                })
                .filter(Boolean)
                .slice(0, 3)
                .join(', ');
        }

        if (data.genre_ids && tmdb.getGenresNameFromIds) {
            try {
                return tmdb.getGenresNameFromIds(
                    type,
                    data.genre_ids
                ).slice(0, 3).join(', ');
            } catch (e) {}
        }

        return '';
    }

    function getMetadata(data, type) {
        var parts = [];

        var year = getYear(data);
        var rating = parseFloat(data.vote_average || 0);
        var genres = getGenres(data, type);

        if (year) {
            parts.push(year);
        }

        if (rating > 0) {
            parts.push('★ ' + rating.toFixed(1));
        }

        if (genres) {
            parts.push(genres);
        }

        return parts;
    }

    function getImageUrl(path, size) {
        if (!path) return '';

        try {
            return Lampa.Api.img(path, size);
        } catch (e) {
            return '';
        }
    }

    // --------------------------------------------------
    // LOGO SELECTION
    // --------------------------------------------------

    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

        var lang = Lampa.Storage.field('tmdb_lang') || 'en';

        var order = [
            lang,
            'en',
            null
        ];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (logo) {
                return logo.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    // --------------------------------------------------
    // TMDB LOGO REQUEST
    // --------------------------------------------------

    function ensureLogo(data, type, callback) {
        var key = type + '_' + data.id;

        if (imageCache[key] !== undefined) {
            callback(imageCache[key]);
            return;
        }

        if (requestCache[key]) {
            requestCache[key].push(callback);
            return;
        }

        requestCache[key] = [callback];

        var lang = Lampa.Storage.field('tmdb_lang') || 'en';

        var langs = lang + ',en,null';

        function finish(url) {
            imageCache[key] = url || null;

            var callbacks = requestCache[key] || [];

            delete requestCache[key];

            callbacks.forEach(function (cb) {
                try {
                    cb(imageCache[key]);
                } catch (e) {}
            });
        }

        try {
            tmdb.get(
                type + '/' + data.id + '/images',

                {
                    filter: {
                        include_image_language: langs
                    }
                },

                function (json) {
                    var logo = pickLogo(json.logos || []);

                    finish(
                        logo
                            ? getImageUrl(logo.file_path, 'w500')
                            : null
                    );
                },

                function () {
                    finish(null);
                }
            );
        } catch (e) {
            finish(null);
        }
    }

    // --------------------------------------------------
    // IMAGE PRELOADING
    // --------------------------------------------------

    function preloadImage(url, callback) {
        if (!url) {
            callback(false);
            return;
        }

        var img = new Image();

        img.onload = function () {
            callback(true, img);
        };

        img.onerror = function () {
            callback(false);
        };

        img.src = url;
    }

    // --------------------------------------------------
    // BACKGROUND
    // --------------------------------------------------

    function setBackground(render, data, sequence) {
        var background = render.find('.cas-background');

        if (!background.length) return;

        var url = getImageUrl(data.backdrop_path, 'w1280');

        background
            .removeClass('cas-background--loaded')
            .css('background-image', 'none');

        if (!url) return;

        preloadImage(url, function (loaded) {
            if (!loaded) return;
            if (sequence !== cardSequence) return;
            if (activeCard !== render[0]) return;

            background.css(
                'background-image',
                'url("' + url + '")'
            );

            requestAnimationFrame(function () {
                if (sequence !== cardSequence) return;

                background.addClass('cas-background--loaded');
            });
        });
    }

    // --------------------------------------------------
    // LOGO DISPLAY
    // --------------------------------------------------

    function setLogo(render, data, type, sequence) {
        var logoContainer = render.find('.cas-logo');
        var titleElement = render.find('.cas-title-fallback');

        var title = getTitle(data);

        logoContainer
            .removeClass('cas-logo--loaded')
            .empty();

        titleElement
            .removeClass('cas-title--loaded')
            .text('');

        ensureLogo(data, type, function (url) {
            if (sequence !== cardSequence) return;
            if (activeCard !== render[0]) return;

            if (!url) {
                titleElement
                    .text(title)
                    .addClass('cas-title--loaded');

                return;
            }

            preloadImage(url, function (loaded) {
                if (sequence !== cardSequence) return;
                if (activeCard !== render[0]) return;

                if (!loaded) {
                    titleElement
                        .text(title)
                        .addClass('cas-title--loaded');

                    return;
                }

                var img = $('<img class="cas-logo-image">');

                img.attr('src', url);

                logoContainer.empty().append(img);

                requestAnimationFrame(function () {
                    if (sequence !== cardSequence) return;

                    logoContainer.addClass('cas-logo--loaded');
                });
            });
        });
    }

    // --------------------------------------------------
    // METADATA
    // --------------------------------------------------

    function renderMetadata(render, data, type) {
        var parts = getMetadata(data, type);

        var html = parts.map(function (part, index) {
            return (
                (index ? '<span class="cas-meta-separator">·</span>' : '') +
                '<span class="cas-meta-item">' +
                escapeHtml(part) +
                '</span>'
            );
        }).join('');

        render.find('.cas-meta-info').html(html);
    }

    // --------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------

    function renderDescription(render, data) {
        var description = data.overview || '';

        var element = render.find('.cas-description');

        element
            .text(description)
            .toggleClass('cas-description--visible', !!description);
    }

    // --------------------------------------------------
    // CARD CONTENT
    // --------------------------------------------------

    function renderCard(render, data) {
        if (!data || !data.id) return;

        var type = getType(data);

        var sequence = ++cardSequence;

        activeCard = render[0];

        render
            .removeClass('cas-card-ready')
            .attr('data-cas-id', data.id);

        render.find('.cas-background')
            .removeClass('cas-background--loaded');

        render.find('.cas-logo')
            .removeClass('cas-logo--loaded')
            .empty();

        render.find('.cas-title-fallback')
            .removeClass('cas-title--loaded')
            .text('');

        render.find('.cas-meta-info').empty();

        render.find('.cas-description').empty();

        setBackground(render, data, sequence);

        setLogo(render, data, type, sequence);

        renderMetadata(render, data, type);

        renderDescription(render, data);

        requestAnimationFrame(function () {
            if (sequence !== cardSequence) return;

            render.addClass('cas-card-ready');
        });
    }

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    function cleanup() {
        cardSequence++;

        activeCard = null;
    }

    // --------------------------------------------------
    // TEMPLATE
    // --------------------------------------------------

    function addCustomTemplate() {
        var template = `
        <div class="full-start-new left-title cas-full-card">

            <div class="cas-background"></div>
            <div class="cas-gradient"></div>

            <div class="full-start-new__body">

                <div class="full-start-new__left hide">
                    <div class="full-start-new__poster">
                        <img class="full-start-new__img full--poster">
                    </div>
                </div>

                <div class="full-start-new__right">

                    <div class="left-title__content">

                        <div class="cas-logo-area">

                            <div class="cas-logo"></div>

                            <div class="cas-title-fallback"></div>

                        </div>

                        <div class="cas-meta-line">
                            <div class="cas-meta-info"></div>
                        </div>

                        <div class="cas-description"></div>

                        <div class="full-start-new__buttons">

                            <div class="full-start__button selector button--play">
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>
                                    <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>
                                </svg>
                                <span>#{title_watch}</span>
                            </div>

                            <div class="full-start__button selector button--book">
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                                </svg>
                                <span>#{settings_input_links}</span>
                            </div>

                            <div class="full-start__button selector button--reaction">
                                <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>
                                    <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>
                                </svg>
                                <span>#{title_reactions}</span>
                            </div>

                            <div class="full-start__button selector button--subscribe hide">
                                <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>
                                    <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>
                                </svg>
                                <span>#{title_subscribe}</span>
                            </div>

                            <div class="full-start__button selector button--options">
                                <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>
                                    <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>
                                    <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>
                                </svg>
                            </div>

                        </div>

                    </div>

                    <div class="full-start-new__reactions selector hide"></div>
                    <div class="full-start-new__rate-line hide"></div>
                    <div class="rating--modss" style="display:none"></div>

                </div>

            </div>

            <div class="hide buttons--container">

                <div class="full-start__button view--torrent hide">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24">
                        <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4S34.1,35,27,35c-1.4,0-3.6-.837-3.6-.837l4.17 9.643C26.727 43.92 25.874 44 25 44c-2.157 0-4.222-.377-6.155-1.039L9.237 16.851c0 0-.7-1.2.4-1.5 1.1-.3 5.4-1.2 5.4-1.2s1.475-.494 1.8.5c.5 1.3 4.063 11.112 4.063 11.112S22.6 29 27.4 29c4.7 0 5.9-3.437 5.7-3.937-1.2-3-4.993-11.862-4.993-11.862s-.6-1.1.8-1.4c1.4-.3 3.8-.7 3.8-.7s1.105-.163 1.6.8c.738 1.437 5.193 11.262 5.193 11.262s1.1 2.9 3.3 2.9c.464 0 .834-.046 1.152-.104-.082 1.635-.348 3.221-.817 4.722C42.541 30.867 41.756 30.963 40.5 30.963z" fill="currentColor"/>
                    </svg>
                    <span>#{full_torrents}</span>
                </div>

                <div class="full-start__button selector view--trailer">
                    <svg height="24" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7604 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/>
                    </svg>
                    <span>#{full_trailers}</span>
                </div>

            </div>

        </div>`;

        Lampa.Template.add('full_start_new', template);
    }

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    function addStyles() {
        if ($('#cas-v400-styles').length) return;

        var styles = `
        <style id="cas-v400-styles">

        .full-start-new.cas-full-card {
            position: relative !important;
            overflow: hidden !important;
            isolation: isolate;
            min-height: 85vh;
        }

        .cas-background {
            position: absolute;
            inset: 0;
            z-index: 0;
            background-color: #080808;
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;
            opacity: 0;
            transform: scale(1.015);
            transition:
                opacity .85s cubic-bezier(.2,.8,.2,1),
                transform 1.8s ease;
            will-change: opacity, transform;
            pointer-events: none;
        }

        .cas-background--loaded {
            opacity: 1;
            transform: scale(1);
        }

        .cas-gradient {
            position: absolute;
            inset: 0;
            z-index: 1;
            pointer-events: none;
            background:
                linear-gradient(
                    90deg,
                    rgba(0,0,0,.10) 0%,
                    rgba(0,0,0,.16) 35%,
                    rgba(0,0,0,.48) 100%
                ),
                linear-gradient(
                    0deg,
                    rgba(0,0,0,.96) 0%,
                    rgba(0,0,0,.78) 22%,
                    rgba(0,0,0,.22) 65%,
                    rgba(0,0,0,.08) 100%
                );
        }

        .cas-full-card .full-start-new__body {
            position: relative;
            z-index: 2;
            display: flex;
            width: 100%;
            height: 85vh;
            min-height: 600px;
            align-items: flex-end;
        }

        .cas-full-card .full-start-new__left {
            display: none !important;
        }

        .cas-full-card .full-start-new__right {
            position: relative;
            z-index: 2;
            width: 100% !important;
            margin: 0 !important;
            padding: 4em 4em 3em 3em !important;
            display: flex;
            flex-direction: column;
            align-items: flex-start !important;
            justify-content: flex-end;
            text-align: left !important;
        }

        .cas-full-card .left-title__content {
            display: flex;
            flex-direction: column;
            align-items: flex-start !important;
            justify-content: flex-end;
            width: 100%;
            max-width: 100%;
            text-align: left !important;
        }

        .cas-logo-area {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: flex-end;
            width: 100%;
            max-width: 650px;
            min-height: 2em;
            margin-bottom: 1.2em;
        }

        .cas-logo {
            display: flex;
            align-items: flex-end;
            justify-content: flex-start;
            max-width: 100%;
            max-height: 9em;
            opacity: 0;
            transform: translateY(8px);
            transition:
                opacity .45s ease,
                transform .45s cubic-bezier(.25,1,.5,1);
        }

        .cas-logo--loaded {
            opacity: 1;
            transform: translateY(0);
        }

        .cas-logo-image {
            display: block;
            width: auto;
            height: auto;
            max-width: 30em;
            max-height: 8em;
            object-fit: contain;
            object-position: left bottom;
            background: transparent !important;
            border: 0 !important;
            filter: drop-shadow(0 3px 12px rgba(0,0,0,.45));
        }

        .cas-title-fallback {
            display: block;
            max-width: 100%;
            font-size: 2.8em;
            font-weight: 800;
            line-height: 1.08;
            color: #fff;
            text-transform: none;
            text-shadow: 0 3px 14px rgba(0,0,0,.8);
            opacity: 0;
            transform: translateY(8px);
            transition:
                opacity .4s ease,
                transform .4s ease;
        }

        .cas-title--loaded {
            opacity: 1;
            transform: translateY(0);
        }

        .cas-meta-line {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: .8em;
            max-width: 100%;
        }

        .cas-meta-info {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: .55em;
            font-size: 1.25em;
            font-weight: 400;
            line-height: 1.4;
            color: rgba(255,255,255,.88);
            text-shadow: 0 2px 8px rgba(0,0,0,.8);
            opacity: 0;
            transform: translateY(7px);
            transition:
                opacity .4s ease .08s,
                transform .4s ease .08s;
        }

        .cas-card-ready .cas-meta-info {
            opacity: .9;
            transform: translateY(0);
        }

        .cas-meta-item {
            white-space: normal;
        }

        .cas-meta-separator {
            opacity: .65;
        }

        .cas-description {
            display: -webkit-box;
            max-width: 650px;
            margin: .1em 0 1.15em;
            overflow: hidden;
            color: rgba(255,255,255,.76);
            font-size: 1.15em;
            font-weight: 400;
            line-height: 1.45;
            text-align: left !important;
            text-shadow: 0 2px 7px rgba(0,0,0,.8);
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            opacity: 0;
            transform: translateY(7px);
            transition:
                opacity .4s ease .13s,
                transform .4s ease .13s;
        }

        .cas-card-ready .cas-description--visible {
            opacity: .82;
            transform: translateY(0);
        }

        .cas-full-card .full-start-new__buttons {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            flex-wrap: wrap;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            opacity: 0;
            transform: translateY(8px);
            transition:
                opacity .4s ease .18s,
                transform .4s ease .18s;
        }

        .cas-card-ready .full-start-new__buttons {
            opacity: 1;
            transform: translateY(0);
        }

        .cas-full-card .full-start-new__buttons .full-start__button {
            flex-shrink: 0;
        }

        .cas-full-card .full-start-new__details {
            display: none !important;
        }

        .cas-full-card .full-start-new__head {
            display: none !important;
        }

        .cas-full-card .full-start-new__poster,
        .cas-full-card .full-start-new__title {
            display: none !important;
        }

        .cas-full-card .full-start-new__reactions,
        .cas-full-card .full-start-new__rate-line,
        .cas-full-card .rating--modss {
            display: none !important;
        }

        .cas-full-card .buttons--container {
            display: none !important;
        }

        @media screen and (max-width: 1100px) {
            .cas-full-card .full-start-new__right {
                padding-left: 2em !important;
                padding-right: 2em !important;
            }

            .cas-logo-image {
                max-width: 25em;
            }
        }

        </style>`;

        $('head').append(styles);
    }

    // --------------------------------------------------
    // TEMPLATE INIT
    // --------------------------------------------------

    function initializePlugin() {
        addCustomTemplate();
        addStyles();
        attachLoader();
    }

    // --------------------------------------------------
    // FULL CARD LOADER
    // --------------------------------------------------

    function attachLoader() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type !== 'complite') return;

            var data = event.data && event.data.movie;

            var render = event.object.activity.render();

            var cardRoot = render.find('.full-start-new.left-title');

            if (!cardRoot.length) return;

            cardRoot.removeClass('cas-card-ready');

            event.object.activity.onBeforeDestroy = cleanup;

            if (data && data.id) {
                renderCard(cardRoot, data);
            }

            // Standard Lampa initial focus.
            setTimeout(function () {
                if (!cardRoot.length || !cardRoot[0].isConnected) return;

                var firstButton = cardRoot
                    .find('.full-start-new__buttons .full-start__button')
                    .not('.hide')
                    .first();

                if (firstButton.length) {
                    cardRoot.find('.full-start__button').removeClass('focus');

                    firstButton
                        .addClass('focus')
                        .trigger('focus');
                }
            }, 200);
        });
    }

    // --------------------------------------------------
    // START
    // --------------------------------------------------

    function startPlugin() {
        try {
            initializePlugin();

            console.log(
                PLUGIN_NAME + ' ' + VERSION + ' initialized'
            );
        } catch (error) {
            console.error(
                PLUGIN_NAME + ' initialization error:',
                error
            );
        }
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
