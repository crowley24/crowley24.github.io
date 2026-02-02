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

    // Стилі як у вашому робочому плагіні, але для іконок
    var style = '<style>' +
        '.card__view { position: relative !important; }' +
        '.card-quality-badges { ' +
        '   position: absolute !important; ' +
        '   top: 0.5em !important; ' +
        '   right: 0.5em !important; ' +
        '   display: flex !important; ' +
        '   gap: 0.2em !important; ' +
        '   z-index: 10 !important; ' +
        '}' +
        '.card-quality-badge { height: 0.9em !important; }' +
        '.card-quality-badge img { height: 100% !important; width: auto !important; filter: drop-shadow(0 1px 2px #000); }' +
        '.quality-badges-container { display: flex; gap: 0.4em; margin-bottom: 0.5em; }' +
        '.quality-badge { height: 1.2em; }' +
        '</style>';
    $('body').append(style);

    function getBest(results) {
        var best = { resolution: null, hdr: false, ukr: false };
        var resOrder = ['HD', 'FULL HD', '2K', '4K'];
        var limit = Math.min(results.length, 15);
        
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

    function createBadge(type) {
        var iconPath = svgIcons[type];
        if (!iconPath) return '';
        return '<div class="card-quality-badge"><img src="' + iconPath + '"></div>';
    }

    function applyBadges(cardElement, movieData) {
        if (cardElement.getAttribute('data-quality-added')) return;
        cardElement.setAttribute('data-quality-added', 'true');

        Lampa.Parser.get({ search: movieData.title || movieData.name, movie: movieData, page: 1 }, function (response) {
            if (response && response.Results && response.Results.length) {
                var best = getBest(response.Results);
                var badges = [];
                if (best.ukr) badges.push(createBadge('UKR'));
                if (best.resolution) badges.push(createBadge(best.resolution));
                if (best.hdr) badges.push(createBadge('HDR'));

                if (badges.length) {
                    var container = cardElement.querySelector('.card__view');
                    if (container) {
                        var badgeWrapper = document.createElement('div');
                        badgeWrapper.className = 'card-quality-badges';
                        badgeWrapper.innerHTML = badges.join('');
                        container.appendChild(badgeWrapper);
                    }
                }
            }
        });
    }

    // Логіка оновлення карток через MutationObserver (як у вашому прикладі)
    function updateCards(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType !== 1) continue;
            
            // Шукаємо всі картки
            var cards = node.classList.contains('card') ? [node] : node.querySelectorAll('.card');
            
            for (var j = 0; j < cards.length; j++) {
                var card = cards[j];
                var data = card.card_data || $(card).data('item'); // Беремо card_data як у вашому плагіні
                if (data) applyBadges(card, data);
            }
        }
    }

    var observer = new MutationObserver(function (mutations) {
        for (var m = 0; m < mutations.length; m++) {
            if (mutations[m].addedNodes.length) updateCards(mutations[m].addedNodes);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Початкова перевірка
    updateCards([document.body]);

    // Для повної картки
    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;
        var details = $('.full-start-new__details, .full-start__details');
        if (details.length && !$('.quality-badges-container').length) {
            details.after('<div class="quality-badges-container"></div>');
            Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function (response) {
                if (response && response.Results) {
                    var best = getBest(response.Results);
                    var b = [];
                    if (best.ukr) b.push('<div class="quality-badge"><img src="' + svgIcons['UKR'] + '"></div>');
                    if (best.resolution) b.push('<div class="quality-badge"><img src="' + svgIcons[best.resolution] + '"></div>');
                    if (best.hdr) b.push('<div class="quality-badge"><img src="' + svgIcons['HDR'] + '"></div>');
                    $('.quality-badges-container').html(b.join(''));
                }
            });
        }
    });
})();
