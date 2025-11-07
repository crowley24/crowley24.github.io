(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    function startPluginV3() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
        if (window.plugin_interface_ready_v3) return;  
        window.plugin_interface_ready_v3 = true;  
  
        addStyleV3();  
  
        const mainMap = Lampa.Maker.map('Main');  
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;  
  
        // Завжди використовуємо новий інтерфейс  
        wrap(mainMap.Items, 'onInit', function (original, args) {  
            if (original) original.apply(this, args);  
            this.__newInterfaceEnabled = true; // Завжди true  
        });  
  
        wrap(mainMap.Create, 'onCreate', function (original, args) {  
            if (original) original.apply(this, args);  
              
            const object = this && this.object;  
            if (!object || !object.__newInterfaceEnabled) return;  
  
            const html = this.html;  
            if (!html) return;  
  
            html.addClass('new-interface');  
  
            const info = new InterfaceInfo();  
            info.create();  
            html.find('.items-line').before(info.render());  
  
            const items = html.find('.items-line .card');  
            items.addClass('card--wide');  
  
            items.on('hover:focus', function () {  
                const card = $(this);  
                const data = card.data('card');  
                if (data) info.update(data);  
            });  
        });  
  
        function wrap(target, method, wrapper) {  
            if (!target || !target[method]) return;  
            const original = target[method];  
            target[method] = function () {  
                return wrapper.call(this, original, arguments);  
            };  
        }  
  
        class InterfaceInfo {  
            constructor() {  
                this.html = null;  
                this.loaded = {};  
                this.timer = null;  
            }  
  
            create() {  
                this.html = Lampa.Template.get('new_interface_info', {}, true);  
                this.empty();  
            }  
  
            render() {  
                return this.html;  
            }  
  
            empty() {  
                if (!this.html) return;  
                this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
                this.html.find('.new-interface-info__title').text('');  
                this.html.find('.new-interface-info__description').text('');  
            }  
  
            update(data) {  
                if (!data) return;  
                if (!this.html) this.create();  
  
                this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');  
                this.html.find('.new-interface-info__title').text(data.title || data.name || '');  
                this.html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));  
  
                Lampa.Background.change(Lampa.Utils.cardImgBackground(data));  
  
                this.load(data);  
            }  
  
            load(data) {  
                if (!data || !data.id) return;  
  
                const source = data.name ? 'tv' : 'movie';  
                const url = Lampa.TMDB.api(source + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));  
                  
                if (this.loaded[url]) {  
                    this.draw(this.loaded[url]);  
                    return;  
                }  
  
                clearTimeout(this.timer);  
                  
                const self = this;  
                this.timer = setTimeout(function() {  
                    Lampa.TMDB.get(source + '/' + data.id, {  
                        append_to_response: 'content_ratings,release_dates'  
                    }, function(json) {  
                        self.loaded[url] = json;  
                        self.draw(json);  
                    }, function(error) {  
                        console.error('[NEW_INTERFACE] Помилка завантаження:', error);  
                    });  
                }, 300);  
            }  
  
            draw(json) {  
                if (!this.html || !json) return;  
  
                var year = json.release_date || json.first_air_date || '';  
                if (year) year = year.split('-')[0];  
  
                var countries = '';  
                if (json.production_countries && json.production_countries.length) {  
                    countries = json.production_countries.map(function(c) { return c.name; }).join(', ');  
                }  
  
                var rating = '';  
                if (json.content_ratings && json.content_ratings.results) {  
                    var cert = json.content_ratings.results.find(function(r) { return r.iso_3166_1 === 'US'; });  
                    if (cert) rating = cert.rating;  
                } else if (json.release_dates && json.release_dates.results) {  
                    var rel = json.release_dates.results.find(function(r) { return r.iso_3166_1 === 'US'; });  
                    if (rel && rel.release_dates && rel.release_dates[0]) {  
                        rating = rel.release_dates[0].certification;  
                    }  
                }  
  
                var genres = '';  
                if (json.genres && json.genres.length) {  
                    genres = json.genres.map(function(g) { return g.name; }).join(', ');  
                }  
  
                var runtime = '';  
                if (json.runtime) {  
                    var hours = Math.floor(json.runtime / 60);  
                    var mins = json.runtime % 60;  
                    runtime = hours + 'г ' + mins + 'хв';  
                } else if (json.episode_run_time && json.episode_run_time[0]) {  
                    runtime = json.episode_run_time[0] + 'хв';  
                }  
  
                var vote = json.vote_average ? json.vote_average.toFixed(1) : '';  
  
                this.html.find('.new-interface-info__head').text([year, countries, rating].filter(Boolean).join(' • '));  
                this.html.find('.new-interface-info__details').text([genres, runtime, vote ? 'IMDb ' + vote : ''].filter(Boolean).join(' • '));  
            }  
  
            destroy() {  
                if (this.html) {  
                    this.html.remove();  
                    this.html = null;  
                }  
                clearTimeout(this.timer);  
                this.loaded = {};  
            }  
        }  
    }  
  
    function addStyleV3() {  
        Lampa.Template.add('new_interface_info',   
            '<div class="new-interface-info">' +  
            '<div class="new-interface-info__body">' +  
            '<div class="new-interface-info__title"></div>' +  
            '<div class="new-interface-info__head"></div>' +  
            '<div class="new-interface-info__details"></div>' +  
            '<div class="new-interface-info__description"></div>' +  
            '</div>' +  
            '</div>'  
        );  
  
        Lampa.Template.add('new_interface_style',  
            '<style>' +  
            '.new-interface { position: relative; }' +  
            '.new-interface .card--small.card--wide { width: 18.3em; }' +  
            '.new-interface .card--small.card--wide .card__img { padding-bottom: 56.25%; }' +  
            '.new-interface-info { position: absolute; top: 0; left: 0; right: 0; height: 25em; padding: 2em; z-index: 1; }' +  
            '.new-interface-info__body { width: 50%; }' +  
            '.new-interface-info__title { font-size: 2.5em; font-weight: bold; margin-bottom: 0.5em; }' +  
            '.new-interface-info__head, .new-interface-info__details { font-size: 1.2em; opacity: 0.8; margin-bottom: 0.5em; }' +  
            '.new-interface-info__description { font-size: 1.1em; line-height: 1.5; opacity: 0.9; max-height: 6em; overflow: hidden; }' +  
            '.new-interface .card__promo { display: none; }' +  
            '.new-interface .card.card--wide + .card-more .card-more__box { padding-bottom: 95%; }' +  
            '.new-interface .card.card--wide .card-watched { display: none !important; }' +  
            'body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }' +  
            'body.light--version .new-interface-info { height: 25.3em; }' +  
            'body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }' +  
            'body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }' +  
            '</style>'  
        );  
          
        $('body').append(Lampa.Template.get('new_interface_style', {}, true));  
    }  
  
    // Перевірка версії Lampa  
    var isV3 = Lampa.Manifest && Lampa.Manifest.app_digital >= 300;  
      
    if (isV3) {  
        startPluginV3();  
    } else {  
        console.warn('[NEW_INTERFACE] Потрібна Lampa версії 3.0+');  
    }  
  
})();
