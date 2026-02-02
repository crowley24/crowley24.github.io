(function () {
    'use strict';

    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    var style = '<style>' +
        '.card-quality-badges { ' +
        '   position: absolute !important; ' +
        '   top: 5px !important; ' +
        '   right: 5px !important; ' +
        '   display: flex !important; ' +
        '   gap: 3px !important; ' +
        '   z-index: 20 !important; ' +
        '   pointer-events: none; ' +
        '}' +
        '.card-quality-badge { height: 14px !important; display: block !important; }' +
        '.card-quality-badge img { height: 100% !important; width: auto !important; filter: drop-shadow(0 1px 2px #000) !important; }' +
        '.quality-badges-container { display: flex; gap: 5px; margin-bottom: 10px; }' +
        '.quality-badge { height: 20px; }' +
        '</style>';
    $('body').append(style);

    function getBest(results) {
        var best = { resolution: null, hdr: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var limit = Math.min(results.length, 12);
        
        for (var i = 0; i < limit; i++) {
            var item = results[i];
            var title = (item.Title || '').toLowerCase();
            if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) best.ukr = true;
            
            var foundRes = null;
            if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0) foundRes = '4K';
            else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';
            else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0) foundRes = 'FULL HD';
            else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';

            if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {
                best.resolution = foundRes;
            }
            if (title.indexOf('hdr') >= 0 || title.indexOf('vision') >= 0) best.hdr = true;
        }
        return best;
    }

    function apply(card) {
        if (card.getAttribute('data-qb-ready')) return;
        
        // Пошук даних: пробуємо всі варіанти, які використовує Lampa
        var data = card.card_data || $(card).data('item');
        if (!data || !(data.title || data.name)) return;

        card.setAttribute('data-qb-ready', 'true');

        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function (response) {
            if (response && response.Results && response.Results.length) {
                var best = getBest(response.Results);
                var badges = [];
                if (best.ukr) badges.push('<div class="card-quality-badge"><img src="' + svgIcons['UKR'] + '"></div>');
                if (best.resolution) badges.push('<div class="card-quality-badge"><img src="' + svgIcons[best.resolution] + '"></div>');
                if (best.hdr) badges.push('<div class="card-quality-badge"><img src="' + svgIcons['HDR'] + '"></div>');

                if (badges.length) {
                    // Контейнер для іконок — шукаємо місце, де постер
                    var target = $(card).find('.card__view, .items__view, .image-body').first();
                    if (target.length) {
                        target.append('<div class="card-quality-badges">' + badges.join('') + '</div>');
                    }
                }
            }
        });
    }

    // Обробка нових елементів (MutationObserver як у вашому робочому плагіні)
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.addedNodes) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.classList.contains('card') || node.classList.contains('items__item')) apply(node);
                    var nested = node.querySelectorAll('.card, .items__item');
                    nested.forEach(apply);
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Початковий запуск для тих, що вже завантажені
    setTimeout(function() {
        document.querySelectorAll('.card, .items__item').forEach(apply);
    }, 1000);

    // Підтримка повної картки фільму
    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;
        setTimeout(function() {
            var det = $('.full-start-new__details, .full-start__details');
            if (det.length && !$('.quality-badges-container').length) {
                det.after('<div class="quality-badges-container"></div>');
                Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function (res) {
                    if (res && res.Results) {
                        var b = getBest(res.Results);
                        var html = [];
                        if (b.ukr) html.push('<div class="quality-badge"><img src="' + svgIcons['UKR'] + '"></div>');
                        if (b.resolution) html.push('<div class="quality-badge"><img src="' + svgIcons[b.resolution] + '"></div>');
                        if (b.hdr) html.push('<div class="quality-badge"><img src="' + svgIcons['HDR'] + '"></div>');
                        $('.quality-badges-container').html(html.join(''));
                    }
                });
            }
        }, 200);
    });
})();
