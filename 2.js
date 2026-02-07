(function () {
    'use strict';

    function UnifiedWikiPlugin() {
        var ICON_WIKI = 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Wikipedia-logo-v2-en.svg';
        var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30'; // Висота 30 пікселів для логотипу

        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    setTimeout(function() {
                        try {
                            if (e.object && e.object.activity && e.object.activity.render) {
                                self.process(e.data, e.object.activity.render());
                            }
                        } catch (err) {
                            console.log('Wiki Error:', err);
                        }
                    }, 400);
                }
            });
        };

        this.process = function (data, render) {
            var movie = data.movie;
            if (!movie || !render) return;

            var $render = $(render);
            $render.find('.surs_wiki_unified').remove();

            // Створюємо контейнер для логотипів
            var studioRow = $('<div class="surs_wiki_unified surs_studio_row" style="width: 100%; display: flex; align-items: center; flex-wrap: wrap; gap: 15px; margin: 0.8em 0; clear: both;">' +
                                '<div class="studio_list" style="display: flex; align-items: center; gap: 10px;"></div>' +
                            '</div>');

            var wikiBtn = $('<div class="full-start__button selector surs_wiki_unified surs_wiki_btn_row">' +
                                '<img src="' + ICON_WIKI + '" style="width: 1.1em; height: 1.1em; filter: invert(1); vertical-align: middle; margin-right: 8px; opacity: 0.8;">' +
                                '<span class="wiki_text">WIKI: ...</span>' +
                            '</div>');

            var slogan = $render.find('.full-start__slogan');
            var ratings = $render.find('.full-start-new__rate-line, .full-start__rate-line');
            var buttonsContainer = $render.find('.full-start-new__buttons, .full-start__buttons');

            if (slogan.length) slogan.after(studioRow);
            else if (ratings.length) ratings.before(studioRow);
            else $render.find('.full-start__info').prepend(studioRow);

            if (buttonsContainer.length) {
                buttonsContainer.append(wikiBtn);
                if (Lampa.Activity.active().activity.toggle) Lampa.Activity.active().activity.toggle();
            }

            // Виводимо логотипи студій з TMDB
            this.renderLogos(movie, studioRow.find('.studio_list'));
            // Шукаємо Вікіпедію
            this.searchWiki(movie, wikiBtn);
        };

        this.renderLogos = function (movie, container) {
            // Lampa передає деталі фільму, де зазвичай є production_companies
            if (movie.production_companies && movie.production_companies.length) {
                movie.production_companies.forEach(function(co) {
                    if (co.logo_path) {
                        var img = $('<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '" style="height: 1.5em; max-width: 100px; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.8;">');
                        container.append(img);
                    } else {
                        // Якщо лого немає, можна вивести назву текстом (опціонально)
                        container.append('<span style="font-size: 0.9em; opacity: 0.6; margin-right: 5px;">' + co.name + '</span>');
                    }
                });
            }
        };

        this.searchWiki = function (movie, wikiBtn) {
            var self = this;
            var wikiText = wikiBtn.find('.wiki_text');
            var titleEN = (movie.original_title || movie.original_name || movie.title || movie.name || '').replace(/[^\w\s]/gi, '');
            var year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
            var queryStr = (titleEN + ' ' + year + ' film').trim();

            $.ajax({
                url: 'https://en.wikipedia.org/w/api.php',
                data: { action: 'query', list: 'search', srsearch: queryStr, format: 'json', origin: '*' },
                dataType: 'json',
                success: function(res) {
                    var pageEN = (res.query && res.query.search && res.query.search[0]) ? res.query.search[0] : null;
                    if (pageEN) {
                        $.ajax({
                            url: 'https://en.wikipedia.org/w/api.php',
                            data: { action: 'query', prop: 'langlinks', lllang: 'uk', pageids: pageEN.pageid, format: 'json', origin: '*' },
                            dataType: 'json',
                            success: function(details) {
                                var pageData = (details.query && details.query.pages && details.query.pages[pageEN.pageid]) ? details.query.pages[pageEN.pageid] : {};
                                var uaTitle = (pageData.langlinks && pageData.langlinks[0]) ? pageData.langlinks[0]['*'] : null;
                                wikiText.text(uaTitle ? 'WIKI: UA' : 'WIKI: EN');
                                wikiBtn.off('hover:enter').on('hover:enter', function() {
                                    var url = uaTitle ? 'https://uk.m.wikipedia.org/wiki/' + encodeURIComponent(uaTitle) : 'https://en.m.wikipedia.org/?curid=' + pageEN.pageid;
                                    self.open(url, movie.title || movie.name);
                                });
                            }
                        });
                    } else {
                        wikiText.text('WIKI: ?');
                    }
                }
            });
        };

        this.open = function (url, title) {
            var enabled = Lampa.Controller.enabled().name;
            Lampa.Modal.open({
                title: title,
                html: $('<div style="height: 500px;"><iframe src="' + url + '" style="width: 100%; height: 100%; border: none; background: #fff; border-radius: 8px;"></iframe></div>'),
                size: 'large',
                onBack: function() {
                    Lampa.Modal.close();
                    Lampa.Controller.toggle(enabled);
                }
            });
        };
    }

    if (window.Lampa) {
        new UnifiedWikiPlugin().init();
    } else {
        $(document).on('lampa:ready', function() { new UnifiedWikiPlugin().init(); });
    }
})();

