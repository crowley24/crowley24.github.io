(function () {
    'use strict';

    function waitForLampa(callback) {
        if (window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.TMDB && Lampa.Lang && Lampa.SettingsApi) {
            callback();
        } else {
            setTimeout(function () { waitForLampa(callback); }, 100);
        }
    }

    waitForLampa(function () {
        if (window.logoplugin) return;
        window.logoplugin = true;

        var logoCache = {};

        function getCachedLogo(mediaType, itemId, lang, size) {
            var key = mediaType + "_" + itemId + "_" + lang + "_" + size;
            if (logoCache[key]) return logoCache[key];

            try {
                var cached = localStorage.getItem('logo_cache_' + key);
                if (cached) {
                    var parsed = JSON.parse(cached);
                    if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        logoCache[key] = parsed.data;
                        return parsed.data;
                    }
                }
            } catch (e) {
                console.error('[LogoPlugin] Ошибка чтения localStorage', e);
            }

            return null;
        }

        function setCachedLogo(mediaType, itemId, lang, size, path) {
            var key = mediaType + "_" + itemId + "_" + lang + "_" + size;
            logoCache[key] = path;
            try {
                localStorage.setItem('logo_cache_' + key, JSON.stringify({
                    data: path,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.error('[LogoPlugin] Ошибка записи localStorage', e);
            }
        }

        // Додати параметри плагіна
        Lampa.Lang.add({
            logo_main_title: { en: 'Logos instead of titles', uk: 'Логотипи замість назв', ru: 'Логотипы вместо названий' },
            logo_main_description: { en: 'Displays movie logos instead of text', uk: 'Відображає логотипи фільмів замість тексту', ru: 'Отображает логотипы фильмов вместо текста' },
            logo_main_show: { en: 'Show', uk: 'Показати', ru: 'Отображать' },
            logo_main_hide: { en: 'Hide', uk: 'Приховати', ru: 'Скрыть' },
            logo_display_mode_title: { en: 'Display mode', uk: 'Режим відображення', ru: 'Режим отображения' },
            logo_display_mode_logo_only: { en: 'Logo only', uk: 'Тільки логотип', ru: 'Только логотип' },
            logo_display_mode_logo_and_text: { en: 'Logo and text', uk: 'Логотип і текст', ru: 'Логотип и текст' },
            logo_size_title: { en: 'Logo size', uk: 'Розмір логотипа', ru: 'Размер логотипа' },
            logo_size_description: { en: 'Maximum logo height', uk: 'Максимальна висота логотипа', ru: 'Максимальная высота логотипа' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_main', type: 'select', values: { '1': Lampa.Lang.translate('logo_main_hide'), '0': Lampa.Lang.translate('logo_main_show') }, default: '0' },
            field: { name: Lampa.Lang.translate('logo_main_title'), description: Lampa.Lang.translate('logo_main_description') }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_display_mode', type: 'select', values: { 'logo_only': Lampa.Lang.translate('logo_display_mode_logo_only'), 'logo_and_text': Lampa.Lang.translate('logo_display_mode_logo_and_text') }, default: 'logo_only' },
            field: { name: Lampa.Lang.translate('logo_display_mode_title'), description: Lampa.Lang.translate('logo_main_description'), show: function () { return Lampa.Storage.get('logo_main') === '0'; } }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_size', type: 'select', values: { 'w300': 'w300', 'w500': 'w500', 'w780': 'w780', 'original': 'original' }, default: 'original' },
            field: { name: Lampa.Lang.translate('logo_size_title'), description: Lampa.Lang.translate('logo_size_description'), show: function () { return Lampa.Storage.get('logo_main') === '0'; } }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_hide_year', type: 'trigger', default: true },
            field: { name: 'Скрывать год и страну', description: 'Скрывать информацию над логотипом' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_use_text_height', type: 'trigger', default: false },
            field: { name: 'Логотип по высоте текста', description: 'Размер логотипа равен высоте текста' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'logo_animation_type', type: 'select', values: { js: 'JavaScript', css: 'CSS' }, default: 'css' },
            field: { name: 'Тип анимации логотипов', description: 'Способ анимации логотипов' }
        });

        // ------------------ Функції ------------------
        function animateOpacity(el, from, to, duration, callback) {
            var start = null;
            requestAnimationFrame(function step(timestamp) {
                if (!start) start = timestamp;
                var progress = Math.min((timestamp - start) / duration, 1);
                el.style.opacity = from + (to - from) * progress;
                if (progress < 1) requestAnimationFrame(step);
                else if (callback) callback();
            });
        }

        function setLogoSize(el, textHeight) {
            var useTextHeight = Lampa.Storage.get("logo_use_text_height", false);
            var defaultSize = 7; // 7em desktop
            var a = Lampa.Storage.get("logo_hide_year", true) ? 0 : 0.3;

            if (useTextHeight && textHeight) {
                el.style.height = textHeight + "px";
                el.style.width = "auto";
            } else if (window.innerWidth < 768) {
                el.style.width = "100%";
                el.style.height = "auto";
            } else {
                el.style.width = defaultSize + "em";
                el.style.height = "auto";
            }

            el.style.paddingTop = a + "em";
            el.style.paddingBottom = "0.2em";
            el.style.display = "block";
            el.style.objectFit = "contain";
            el.style.objectPosition = "left bottom";
        }

        function moveYearToDetails(card) {
            if (!Lampa.Storage.get("logo_hide_year", true)) return;
            var head = card.find(".full-start-new__head");
            var details = card.find(".full-start-new__details");
            if (head.length && details.length && details.find(".logo-moved-head").length === 0) {
                var html = head.html();
                if (html) {
                    var moved = $('<span class="logo-moved-head">' + html + '</span>');
                    var separator = $('<span class="full-start-new__split logo-moved-separator">●</span>');
                    details.append(separator).append(moved);
                    head.css({opacity:0});
                }
            }
        }

        function renderLogo(logoPath, card, item) {
            if (!logoPath) return;
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');
            var showTitle = displayMode === 'logo_and_text';
            var titleElement = card.find('.full-start-new__title');
            if (!titleElement.length) titleElement = card.find('.full-start__title');
            if (!titleElement.length) return;

            var img = new Image();
            img.src = Lampa.TMDB.image('/t/p/' + Lampa.Storage.get('logo_size', 'w500') + logoPath.replace('.svg','.png'));
            setLogoSize(img, titleElement[0].getBoundingClientRect().height);

            var html = $('<div>').append(img);
            if (showTitle) html.append('<span style="display:block;">'+ (item.title || item.name) +'</span>');

            titleElement.empty().append(html);
            moveYearToDetails(card);
        }

        function loadAndRenderLogo(item, card) {
            var $ = window.$ || window.jQuery;
            if (!$) return;
            var apiKey = Lampa.TMDB.key();
            if (!apiKey) return;

            var mediaType = item.first_air_date && !item.release_date ? 'tv' : 'movie';
            var lang = Lampa.Storage.get('language') || 'en';
            var size = Lampa.Storage.get('logo_size', 'w500');
            var cached = getCachedLogo(mediaType, item.id, lang, size);
            if (cached) return renderLogo(cached, card, item);

            var url = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + lang);
            $.get(url, function(resp) {
                if (resp.logos && resp.logos.length) {
                    var png = resp.logos.find(l=>!l.file_path.endsWith('.svg')) || resp.logos[0];
                    setCachedLogo(mediaType, item.id, lang, size, png.file_path);
                    renderLogo(png.file_path, card, item);
                } else {
                    // Спробувати англійську
                    if (lang !== 'en') {
                        var enUrl = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');
                        $.get(enUrl, function(resp2) {
                            if (resp2.logos && resp2.logos.length) {
                                var png = resp2.logos.find(l=>!l.file_path.endsWith('.svg')) || resp2.logos[0];
                                setCachedLogo(mediaType, item.id, 'en', size, png.file_path);
                                renderLogo(png.file_path, card, item);
                            }
                        });
                    }
                }
            });
        }

        Lampa.Listener.follow('full', function(event) {
            if ((event.type === 'complite' || event.type === 'movie') && Lampa.Storage.get('logo_main') !== '1') {
                var item = event.data.movie;
                if (!item || !item.id) return;
                var card = event.object.activity.render();
                setTimeout(function() { loadAndRenderLogo(item, card); }, 150);
            }
        });

        console.log('[LogoPlugin] Плагін успішно ініціалізовано');
    });
})();
