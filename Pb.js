/**
 * KinoPub Balancer for Lampa
 * Версія: 2.1.2 (Підтримка зовнішніх плеєрів та пріоритет UA озвучки)
 */

(function() {
    'use strict';

    var CONFIG = {
        name: 'KinoPub',
        version: '2.1.2',
        apiBase: 'https://api.service-kp.com/v1',
        token: '1ksgubh1qkewyq3u4z65bpnwn9eshhn2',
        protocol: 'hls4' // Можна змінити на 'http' для кращої сумісності з дуже старими плеєрами
    };

    // ========================================================================
    // API
    // ========================================================================
    
    function apiRequest(path, params) {
        return new Promise(function(resolve, reject) {
            var url = CONFIG.apiBase + path;

            if (params) {
                var query = Object.keys(params).map(function(key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                }).join('&');
                url += '?' + query;
            }

            var network = new Lampa.Reguest();

            network.native(url, function(response) {
                if (typeof response === 'string') {
                    try { response = JSON.parse(response); } catch(e) {}
                }
                resolve(response);
            }, function(err) {
                reject(err);
            }, false, {
                headers: { 'Authorization': 'Bearer ' + CONFIG.token },
                timeout: 15000
            });
        });
    }

    function searchContent(query) {
        return apiRequest('/items/search', { q: query });
    }

    function getItem(id) {
        return apiRequest('/items/' + id);
    }

    // ========================================================================
    // ПАРСИНГ ВІДЕО
    // ========================================================================
    
    function extractVideoUrl(files) {
        if (!files || !files.length) return null;

        var allQualities = {};
        var protocols = [CONFIG.protocol, 'hls', 'http'];

        var sorted = files.slice().sort(function(a, b) {
            return (b.quality_id || 0) - (a.quality_id || 0);
        });

        var bestUrl = null;
        var bestQuality = null;

        for (var i = 0; i < sorted.length; i++) {
            var file = sorted[i];
            if (!file.url) continue;

            for (var p = 0; p < protocols.length; p++) {
                var protocol = protocols[p];
                if (file.url[protocol]) {
                    if (!allQualities[file.quality]) {
                        allQualities[file.quality] = file.url[protocol];
                    }
                    if (!bestUrl) {
                        bestUrl = file.url[protocol];
                        bestQuality = file.quality;
                    }
                }
            }
        }

        if (!bestUrl) return null;

        return {
            url: bestUrl,
            quality: bestQuality,
            qualities: allQualities
        };
    }
    
    function buildFileList(item) {
        var files = [];
        var defaultVoice = item.voice || '';

        if (item.videos && item.videos.length) {
            item.videos.forEach(function(video) {
                var extracted = extractVideoUrl(video.files);
                if (!extracted) return;
                var voice = video.voice || defaultVoice;

                files.push({
                    title: video.title || item.title,
                    quality: extracted.quality,
                    url: extracted.url,
                    qualitys: extracted.qualities,
                    subtitles: (video.subtitles || []).map(function(s) {
                        return { label: s.lang, url: s.url };
                    }),
                    voice: voice,
                    year: item.year,
                    duration: item.duration ? formatDuration(item.duration.total) : '',
                    poster: item.posters ? item.posters.medium : ''
                });
            });
        }

        if (item.seasons && item.seasons.length) {
            item.seasons.forEach(function(season) {
                (season.episodes || []).forEach(function(episode) {
                    var extracted = extractVideoUrl(episode.files);
                    if (!extracted) return;
                    var voice = defaultVoice;

                    files.push({
                        title: episode.title,
                        season: season.number,
                        episode: episode.number,
                        quality: extracted.quality,
                        url: extracted.url,
                        qualitys: extracted.qualities,
                        subtitles: (episode.subtitles || []).map(function(s) {
                            return { label: s.lang, url: s.url };
                        }),
                        voice: voice,
                        duration: episode.duration ? formatDuration(episode.duration) : '',
                        poster: episode.thumbnail || (item.posters ? item.posters.medium : '')
                    });
                });
            });
        }
        
        // СОРТУВАННЯ: ПРІОРИТЕТ УКРАЇНСЬКІЙ ОЗВУЧЦІ
        files.sort(function(a, b) {
            var voiceA = (a.voice || '').toLowerCase();
            var voiceB = (b.voice || '').toLowerCase();
            var isUkrainianA = voiceA.indexOf('украинский') !== -1 || voiceA.indexOf('українськ') !== -1;
            var isUkrainianB = voiceB.indexOf('украинский') !== -1 || voiceB.indexOf('українськ') !== -1;

            if (isUkrainianA && !isUkrainianB) return -1;
            if (!isUkrainianA && isUkrainianB) return 1;
            return 0;
        });

        return files;
    }

    function formatDuration(seconds) {
        if (!seconds) return '';
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? h + ':' + (m < 10 ? '0' : '') + m : m + ' хв';
    }

    // ========================================================================
    // КОМПОНЕНТ
    // ========================================================================
    
    function KinoPubComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);

        var last = null;
        var initialized = false;
        var videoFiles = [];
        var filterData = { season: [] };
        var currentSeason = 0;
        var searchQueries = [];
        var currentQueryIndex = 0;

        files.appendFiles(scroll.render());
        files.appendHead(filter.render());
        scroll.minus(files.render().find('.explorer__files-head'));

        this.initialize = function() {
            var self = this;
            this.loading(true);
            searchQueries = this.buildSearchQueries(object.movie);
            currentQueryIndex = 0;
            this.tryNextSearch();
        };

        this.buildSearchQueries = function(movie) {
            var queries = [];
            var seen = {};
            function add(q) {
                if (!q) return;
                q = q.trim();
                if (q && !seen[q.toLowerCase()]) {
                    seen[q.toLowerCase()] = true;
                    queries.push(q);
                }
            }
            add(movie.title);
            add(movie.name);
            add(movie.original_title);
            add(movie.original_name);
            return queries;
        };

        this.tryNextSearch = function() {
            var self = this;
            if (currentQueryIndex >= searchQueries.length) {
                this.showMessage('Нічого не знайдено', '');
                return;
            }
            var query = searchQueries[currentQueryIndex++];
            searchContent(query).then(function(response) {
                if (response && response.items && response.items.length > 0) {
                    self.handleSearchResults(response.items);
                } else {
                    self.tryNextSearch();
                }
            }).catch(function(err) {
                self.showMessage('Помилка пошуку', err.message || '');
            });
        };

        this.handleSearchResults = function(items) {
            if (items.length === 1) {
                this.loadAndPlay(items[0].id);
            } else {
                this.showSearchResults(items);
            }
        };

        this.loadAndPlay = function(id) {
            var self = this;
            getItem(id).then(function(response) {
                if (response && response.item) {
                    videoFiles = buildFileList(response.item);
                    if (response.item.type === 'movie' && videoFiles.length > 0) {
                        self.play(videoFiles[0], videoFiles);
                    } else if (videoFiles.length > 0) {
                        self.buildFilters();
                        self.display();
                    } else {
                        self.showMessage('Відео не знайдено', '');
                    }
                }
            }).catch(function(err) {
                self.showMessage('Помилка завантаження', err.message || '');
            });
        };

        this.showSearchResults = function(items) {
            var self = this;
            scroll.clear();
            scroll.reset();
            items.forEach(function(item) {
                var html = self.createSearchCard(item);
                html.on('hover:enter', function() { self.loadAndPlay(item.id); })
                    .on('hover:focus', function(e) { last = e.target; scroll.update($(e.target), true); });
                scroll.append(html);
            });
            this.loading(false);
            Lampa.Controller.enable('content');
        };

        this.createSearchCard = function(item) {
            var poster = item.posters ? item.posters.small : '';
            var html = $('<div class="kinopub-card selector"><div class="kinopub-card__img">' + (poster ? '<img src="'+poster+'">' : '') + '</div><div class="kinopub-card__body"><div class="kinopub-card__title">' + item.title + '</div><div class="kinopub-card__info">' + (item.year || '') + '</div></div></div>');
            return html;
        };

        this.display = function() {
            var self = this;
            scroll.clear();
            scroll.reset();
            var filtered = currentSeason ? videoFiles.filter(function(f) { return f.season === currentSeason; }) : videoFiles;
            filtered.forEach(function(file) {
                var html = self.createVideoCard(file);
                html.on('hover:enter', function() { self.play(file, filtered); })
                    .on('hover:focus', function(e) { last = e.target; scroll.update($(e.target), true); });
                scroll.append(html);
            });
            this.updateFilter();
            this.loading(false);
            Lampa.Controller.enable('content');
        };

        this.createVideoCard = function(file) {
            var title = (file.season && file.episode) ? file.episode + '. ' + file.title : file.title;
            return $('<div class="kinopub-card selector"><div class="kinopub-card__img">' + (file.poster ? '<img src="'+file.poster+'">' : '') + '</div><div class="kinopub-card__body"><div class="kinopub-card__title">' + title + '</div><div class="kinopub-card__info">' + (file.voice || '') + '</div></div><div class="kinopub-card__meta"><div class="kinopub-card__quality">' + (file.quality || '') + '</div></div></div>');
        };

        this.buildFilters = function() {
            var seasons = {};
            videoFiles.forEach(function(f) { if (f.season) seasons[f.season] = true; });
            var nums = Object.keys(seasons).map(Number).sort(function(a, b) { return a - b; });
            if (nums.length) {
                filterData.season = nums.map(function(n) { return { title: 'Сезон ' + n, number: n }; });
                currentSeason = nums[0];
            }
        };

        this.updateFilter = function() {
            var self = this;
            if (filterData.season.length > 1) {
                filter.set('filter', filterData.season.map(function(s) { return { title: s.title, selected: s.number === currentSeason, season: s.number }; }));
                filter.onSelect = function(type, a) { if (a.season) { currentSeason = a.season; self.display(); } Lampa.Select.close(); };
                var cur = filterData.season.find(function(s) { return s.number === currentSeason; });
                filter.chosen('filter', [cur ? cur.title : '']);
            }
        };

        // ====================================================================
        // ВІДТВОРЕННЯ (УНІВЕРСАЛЬНЕ: ВНУТРІШНІЙ + ЗОВНІШНІЙ ПЛЕЄР)
        // ====================================================================
        this.play = function(file, playlist) {
            var lampaPlaylist = playlist.map(function(f) {
                return {
                    title: (f.season && f.episode) ? '[S' + f.season + '/E' + f.episode + '] ' + f.title : f.title,
                    url: f.url,
                    quality: f.qualitys,
                    subtitles: f.subtitles,
                    season: f.season,
                    episode: f.episode
                };
            });

            var currentIndex = playlist.indexOf(file);
            var current = lampaPlaylist[currentIndex];

            if (current && current.url) {
                if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
                
                // Використовуємо run для підтримки зовнішніх плеєрів
                Lampa.Player.run({
                    title: current.title,
                    url: current.url,
                    quality: current.quality,
                    subtitles: current.subtitles,
                    playlist: lampaPlaylist
                });
                Lampa.Player.playlist(lampaPlaylist);
            } else {
                Lampa.Noty.show('Посилання не знайдено');
            }
        };

        this.showMessage = function(title, subtitle) {
            scroll.clear();
            scroll.append($('<div class="kinopub-empty"><div class="kinopub-empty__title">' + title + '</div><div class="kinopub-empty__subtitle">' + subtitle + '</div></div>'));
            this.loading(false);
            Lampa.Controller.enable('content');
        };

        this.loading = function(status) {
            if (status) this.activity.loader(true);
            else { this.activity.loader(false); this.activity.toggle(); }
        };

        this.create = function() { return this.render(); };
        this.render = function() { return files.render(); };
        this.pause = function() {};
        this.stop = function() {};
        this.destroy = function() { network.clear(); files.destroy(); scroll.destroy(); };

        this.start = function() {
            if (Lampa.Activity.active().activity !== this.activity) return;
            if (!initialized) { initialized = true; this.initialize(); }
            Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
            Lampa.Controller.add('content', {
                toggle: function() { Lampa.Controller.collectionSet(scroll.render(), files.render()); Lampa.Controller.collectionFocus(last || false, scroll.render()); },
                up: function() { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
                down: function() { Navigator.move('down'); },
                right: function() { if (Navigator.canmove('right')) Navigator.move('right'); else if (filterData.season.length > 1) filter.show('Сезон', 'filter'); },
                left: function() { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };
    }

    function addStyles() {
        var css = '.kinopub-card { display: flex; align-items: center; padding: 0.8em; margin: 0 1.5em 0.5em 1.5em; background: rgba(0,0,0,0.3); border-radius: 0.4em; position: relative; } .kinopub-card.focus::before { content: ""; position: absolute; top: -0.2em; left: -0.2em; right: -0.2em; bottom: -0.2em; border: 0.15em solid #fff; border-radius: 0.5em; pointer-events: none; } .kinopub-card__img { width: 7em; height: 4em; flex-shrink: 0; margin-right: 1em; border-radius: 0.3em; overflow: hidden; background: rgba(255,255,255,0.1); position: relative; } .kinopub-card__img img { width: 100%; height: 100%; object-fit: cover; } .kinopub-card__body { flex-grow: 1; min-width: 0; overflow: hidden; } .kinopub-card__title { font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .kinopub-card__info { font-size: 0.85em; color: rgba(255,255,255,0.5); margin-top: 0.2em; } .kinopub-card__quality { padding: 0.15em 0.4em; background: rgba(255,255,255,0.15); border-radius: 0.2em; font-size: 0.8em; } .kinopub-empty { padding: 2em; text-align: center; }';
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function startPlugin() {
        if (window.kinopub_plugin) return;
        window.kinopub_plugin = true;
        addStyles();
        Lampa.Component.add('kinopub', KinoPubComponent);
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                if (render.find('.kinopub-btn').length) return;
                var btn = $('<div class="full-start__button selector kinopub-btn" data-subtitle="KinoPub"><svg viewBox="0 0 24 24" fill="currentColor" style="width:1.5em; margin-right:0.5em"><path d="M8 5v14l11-7z"/></svg><span>KinoPub</span></div>');
                btn.on('hover:enter', function() {
                    Lampa.Activity.push({ title: 'KinoPub', component: 'kinopub', movie: e.data.movie, page: 1 });
                });
                render.find('.view--torrent, .view--online').first().before(btn);
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') startPlugin(); });

})();
                                                                                    
