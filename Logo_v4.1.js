(function () {
    "use strict";

    const CACHE_NAME = 'lampa_logo_cache_v1';
    const LOGO_SELECTOR = '.card__poster';
    const TEXT_SELECTOR = '.card__title';

    // =============================
    //  SETTINGS
    // =============================
    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'logo_enable',
            type: 'select',
            values: { 1: 'Увімкнено', 0: 'Вимкнено' },
            default: 1
        },
        field: 'Відображення логотипів'
    });

    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'logo_text',
            type: 'select',
            values: { 1: 'Показувати', 0: 'Приховати' },
            default: 1
        },
        field: 'Опис під логотипом'
    });

    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'logo_size',
            type: 'select',
            values: { small: 'Маленькі', normal: 'Стандартні', large: 'Великі' },
            default: 'normal'
        },
        field: 'Розмір логотипів'
    });

    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'logo_clear',
            type: 'trigger',
        },
        field: 'Очистити кеш логотипів'
    });

    // =============================
    //  CLEAR CACHE
    // =============================
    Lampa.SettingsApi.listener.follow('interface', function (name) {
        if (name === 'logo_clear') {
            caches.delete(CACHE_NAME).then(() => {
                Lampa.Noty.show('Кеш логотипів очищено');
            });
        }
    });

    // =============================
    //  LOAD WITH CACHE
    // =============================
    function loadWithCache(url) {
        return caches.open(CACHE_NAME).then(cache =>
            cache.match(url).then(cached => {
                if (cached) return cached.clone();

                return fetch(url).then(response => {
                    cache.put(url, response.clone());
                    return response;
                });
            })
        );
    }

    // =============================
    //  APPLY EFFECTS + SETTINGS
    // =============================
    function applyLogo(item, url) {
        const enable = Lampa.SettingsApi.get('logo_enable', 1);
        const size = Lampa.SettingsApi.get('logo_size', 'normal');
        const showText = Lampa.SettingsApi.get('logo_text', 1);

        const img = $(item).find(LOGO_SELECTOR);
        const text = $(item).find(TEXT_SELECTOR);

        // hide logos
        if (!enable) {
            img.hide();
            return;
        } else img.show();

        // hide text
        if (!showText) text.hide();
        else text.show();

        // sizes
        if (size === 'small') img.css({ transform: 'scale(0.75)' });
        else if (size === 'large') img.css({ transform: 'scale(1.25)' });
        else img.css({ transform: 'scale(1)' });

        // fade-in
        img.css({
            opacity: 0,
            transition: 'opacity 0.4s ease'
        });

        // load logo
        loadWithCache(url)
            .then(resp => resp.blob())
            .then(blob => {
                const local = URL.createObjectURL(blob);
                img.attr('src', local);

                requestAnimationFrame(() => {
                    img.css({ opacity: 1 });
                });
            });
    }

    // =============================
    //  OBSERVER — APPLY TO ALL CARDS
    // =============================
    const observer = new MutationObserver(m => {
        m.forEach(rec => {
            rec.addedNodes.forEach(node => {
                if ($(node).hasClass('card')) {
                    const logoUrl = $(node).data('logo');

                    if (logoUrl) applyLogo(node, logoUrl);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log('%c[Plugin] Logo Enhancer loaded', 'color: #0f0');

})();
