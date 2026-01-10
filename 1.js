(function(){
    "use strict";

    // Error logger: saves last error to localStorage and shows Noty/alert if possible
    function logKinoError(err){
        try{
            var data = {
                message: err && err.message ? err.message : (err && err.toString ? err.toString() : String(err)),
                stack: err && err.stack ? err.stack : '',
                time: (new Date()).toISOString()
            };
            try{ localStorage.setItem('kinovibe_last_error', JSON.stringify(data)); }catch(e){}
            if (window.Lampa && Lampa.Noty) {
                try{ Lampa.Noty.show('KinoVibe: ' + data.message); }catch(e){}
            } else if (window.alert) {
                try{ alert('KinoVibe: ' + data.message); }catch(e){}
            }
            console.error('KinoVibe error:', data);
        }catch(e){ console.error('KinoVibe log error failed', e); }
    }

    window.addEventListener && window.addEventListener('error', function(ev){
        try{ logKinoError(ev.error || ev.message || ev); }catch(e){}
    });
    window.addEventListener && window.addEventListener('unhandledrejection', function(ev){
        try{ logKinoError(ev.reason || ev); }catch(e){}
    });

    // Helper function to fetch HTML
    function fetchHTML(url) {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('Failed to fetch: ' + xhr.status));
                    }
                }
            };
            xhr.send();
        });
    }

    // Parse movie list from HTML
    function parseMovieList(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var movies = [];
        var links = doc.querySelectorAll('a[href*=".html"]');
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var href = link.getAttribute('href');
            var text = link.textContent.trim();
            if (href && href.match(/\/\d+-.+\.html$/) && text) {
                var id = href.match(/\/(\d+)-/)[1];
                var title = text.replace(/\(\d{4}\)$/, '').trim();
                var year = text.match(/\((\d{4})\)/) ? text.match(/\((\d{4})\)/)[1] : '';
                movies.push({
                    id: id,
                    title: title,
                    year: year,
                    url: 'https://kinovibe.vip' + href
                });
            }
        }
        return movies.slice(0, 20); // Limit for demo
    }

    // Parse movie details
    function parseMovieDetails(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var title = doc.querySelector('h1') ? doc.querySelector('h1').textContent.trim() : '';
        var poster = doc.querySelector('img') ? doc.querySelector('img').getAttribute('src') : '';
        var description = '';
        var descElem = doc.querySelector('p') || doc.querySelector('.description');
        if (descElem) description = descElem.textContent.trim();
        var year = '';
        var yearLink = doc.querySelector('a[href*="/yearfilm/"]');
        if (yearLink) year = yearLink.textContent.trim();
        var genre = '';
        var genreLinks = doc.querySelectorAll('a[href*="/genrefilm/"]');
        for (var i = 0; i < genreLinks.length; i++) {
            genre += genreLinks[i].textContent.trim() + ', ';
        }
        genre = genre.slice(0, -2);
        return {
            title: title,
            poster: poster.startsWith('http') ? poster : 'https://kinovibe.vip' + poster,
            description: description,
            year: year,
            genre: genre
        };
    }

    // Component function for online viewing
    function component(object) {
        this.create = function() {
            return $('<div style="padding: 2em; text-align: center;">KinoVibe Plugin Loaded Successfully!<br>Для просмотра фильмов нужно реализовать парсинг.</div>');
        };
        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(this.render());
                }.bind(this),
                back: function() {
                    Lampa.Activity.backward();
                }.bind(this)
            });
            Lampa.Controller.toggle('content');
        };
        this.render = function() {
            return this.create();
        };
        this.destroy = function() {};
    }

    // Plugin initialization
    function startPlugin() {
        if (window.kinovibe_plugin) return;
        window.kinovibe_plugin = true;

        // Add templates
        Lampa.Template.add('lampac_prestige_full', "<div class=\"online-prestige online-prestige--full selector\">\n            <div class=\"online-prestige__img\">\n                <img alt=\"\">\n                <div class=\"online-prestige__loader\"></div>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__timeline\"></div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                    <div class=\"online-prestige__quality\">{quality}</div>\n                </div>\n            </div>\n        </div>");
        Lampa.Template.add('lampac_content_loading', "<div class=\"online-empty\">\n            <div class=\"broadcast__scan\"><div></div></div>\n\t\t\t\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template selector\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
        Lampa.Template.add('lampac_does_not_answer', "<div class=\"online-empty\">\n            <div class=\"online-empty__title\">\n                Поиск не дал результатов\n            </div>\n            <div class=\"online-empty__time\">\n                Попробуйте изменить запрос\n            </div>\n            <div class=\"online-empty__buttons\">\n                <div class=\"online-empty__button selector cancel\">Отмена</div>\n                <div class=\"online-empty__button selector change\">Изменить источник</div>\n            </div>\n            <div class=\"online-empty__templates\">\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n                <div class=\"online-empty-template\">\n                    <div class=\"online-empty-template__ico\"></div>\n                    <div class=\"online-empty-template__body\"></div>\n                </div>\n            </div>\n        </div>");
        Lampa.Template.add('lampac_prestige_rate', "<div class=\"online-prestige-rate\">\n            <svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                <path d=\"M8.39409 0.192139L10.99 5.30994L16.7882 6.20387L12.5475 10.4277L13.5819 15.9311L8.39409 13.2425L3.20626 15.9311L4.24065 10.4277L0 6.20387L5.79819 5.30994L8.39409 0.192139Z\" fill=\"#fff\"></path>\n            </svg>\n            <span>{rate}</span>\n        </div>");
        Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige online-prestige--folder selector\">\n            <div class=\"online-prestige__folder\">\n                <svg viewBox=\"0 0 128 112\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <rect y=\"20\" width=\"128\" height=\"92\" rx=\"13\" fill=\"white\"></rect>\n                    <path d=\"M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z\" fill=\"white\" fill-opacity=\"0.23\"></path>\n                    <rect x=\"11\" y=\"8\" width=\"106\" height=\"76\" rx=\"13\" fill=\"white\" fill-opacity=\"0.51\"></rect>\n                </svg>\n            </div>\n            <div class=\"online-prestige__body\">\n                <div class=\"online-prestige__head\">\n                    <div class=\"online-prestige__title\">{title}</div>\n                    <div class=\"online-prestige__time\">{time}</div>\n                </div>\n\n                <div class=\"online-prestige__footer\">\n                    <div class=\"online-prestige__info\">{info}</div>\n                </div>\n            </div>\n        </div>");
        Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\">\n            <div class=\"online-prestige-watched__icon\">\n                <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/>\n                    <path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/>\n                </svg>\n            </div>\n            <div class=\"online-prestige-watched__body\">\n            </div>\n        </div>");

        // Add CSS
        // $('body').append(Lampa.Template.get('lampac_css', {}, true));

        var manifst = {
            type: 'video',
            version: '1.0.0',
            name: 'KinoVibe',
            description: 'Plugin for watching movies from kinovibe.vip in Lampa TV',
            component: 'kinovibe',
            onContextMenu: function onContextMenu(object) {
                return {
                    name: 'Смотреть онлайн',
                    description: ''
                };
            },
            onContextLauch: function onContextLauch(object) {
                Lampa.Component.add('kinovibe', component);
                Lampa.Activity.push({
                    url: '',
                    title: 'Онлайн',
                    component: 'kinovibe',
                    movie: object,
                    page: 1
                });
            }
        };

        Lampa.Manifest.plugins = manifst;

        Lampa.Lang.add({
            lampac_watch: {
                ru: 'Смотреть онлайн',
                en: 'Watch online'
            }
        });

        // Add button to full view
        function addButton(e) {
            if (e.render.find('.kinovibe--button').length) return;
            var btn = $("<div class=\"full-start__button selector view--online kinovibe--button\" data-subtitle=\"KinoVibe v1.0.0\"><svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 392.697 392.697\" xml:space=\"preserve\"><path d=\"M21.873,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18C19.784,81.593,20.584,82.847,21.837,83.419z\" fill=\"currentColor\"></path><path d=\"M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.406,0.257-0.869,0.386-1.333,0.386c-0.368,0-0.736-0.082-1.079-0.244l-68.874-32.625c-0.869-0.416-1.421-1.293-1.421-2.256v-92.229L6.804,95.5c-1.083-0.496-2.344-0.406-3.347,0.238c-1.002,0.645-1.608,1.754-1.608,2.944v208.744c0,1.371,0.799,2.615,2.045,3.185l178.886,81.768c0.464,0.211,0.96,0.315,1.455,0.315c0.661,0,1.318-0.188,1.892-0.555c1.002-0.645,1.608-1.754,1.608-2.945V180.445C187.735,179.076,186.936,177.831,185.689,177.261z\" fill=\"currentColor\"></path><path d=\"M389.24,95.74c-1.002-0.644-2.264-0.732-3.347-0.238l-178.876,81.76c-1.246,0.57-2.045,1.814-2.045,3.185v208.751c0,1.191,0.606,2.302,1.608,2.945c0.572,0.367,1.23,0.555,1.892,0.555c0.495,0,0.991-0.104,1.455-0.315l178.876-81.768c1.246-0.568,2.045-1.813,2.045-3.185V98.685C390.849,97.494,390.242,96.384,389.24,95.74z\" fill=\"currentColor\"></path><path d=\"M372.915,80.216c-0.009-1.377-0.823-2.621-2.082-3.18l-60.182-26.681c-0.938-0.418-2.013-0.399-2.938,0.045l-173.755,82.992l60.933,29.117c0.462,0.211,0.958,0.316,1.455,0.316s0.993-0.105,1.455-0.316l173.066-79.092C372.122,82.847,372.923,81.593,372.915,80.216z\" fill=\"currentColor\"></path></svg><span>Онлайн</span></div>");
            btn.on('hover:enter', function() {
                Lampa.Component.add('kinovibe', component);
                Lampa.Activity.push({
                    url: '',
                    title: 'Онлайн',
                    component: 'kinovibe',
                    movie: e.movie,
                    page: 1
                });
            });
            e.render.after(btn);
        }

        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                addButton({
                    render: e.object.activity.render().find('.view--torrent'),
                    movie: e.data.movie
                });
            }
        });

        if (Lampa.Activity.active().component == 'full') {
            addButton({
                render: Lampa.Activity.active().activity.render().find('.view--torrent'),
                movie: Lampa.Activity.active().card
            });
        }
    }

    function startPluginSafely(){
        try{
            startPlugin();
            console.log('KinoVibe: plugin started');
        }catch(e){
            console.error('KinoVibe start error', e);
            try{ if (Lampa && Lampa.Noty) Lampa.Noty.show('KinoVibe: ошибка при загрузке плагина'); }catch(_){ }
        }
    }

    if (window.appready) {
        startPluginSafely();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type == 'ready') {
                startPluginSafely();
            }
        });
    }
})();
