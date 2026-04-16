(function () {    
    'use strict';    
    
    // Перевірка на повторний запуск    
    if (window.plugin_tmdb_mod_ready) return;    
    window.plugin_tmdb_mod_ready = true;    
    
    // Динамічні дати    
    var today = new Date().toISOString().slice(0, 10);    
    var currentYear = new Date().getFullYear();    
    var lastYear = currentYear - 1;    
    
    // Конфігурація підбірок (БЕЗ російського контенту)    
    var collectionsConfig = [    
        // ФІЛЬМИ    
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'tmdb_mod_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },    
        { id: 'trending_movies', emoji: '🔥', name_key: 'tmdb_mod_c_trend_movie', request: 'trending/movie/week' },    
        { id: 'fresh_online', emoji: '👀', name_key: 'tmdb_mod_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },    
        { id: 'cult_cinema', emoji: '🍿', name_key: 'tmdb_mod_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },    
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'tmdb_mod_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },    
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'tmdb_mod_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },    
        { id: 'best_of_last_year_movies', emoji: '🏆', name_key: 'tmdb_mod_c_best_last_y', request: 'discover/movie?primary_release_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=500' },    
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'tmdb_mod_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },    
        { id: 'documentary', emoji: '🔬', name_key: 'tmdb_mod_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },    
    
        // СЕРІАЛИ    
        { id: 'trending_tv', emoji: '🔥', name_key: 'tmdb_mod_c_trend_tv', request: 'trending/tv/week' },    
        { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?with_origin_country=US|GB|FR|DE|JP|KR&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=100' },    
        { id: 'ukrainian_series', emoji: '🇺🇦', name_key: 'tmdb_mod_c_ukr_series', request: 'discover/tv?with_origin_country=UA&sort_by=popularity.desc&vote_average.gte=6&vote_count.gte=10' },    
        { id: 'best_of_current_year_tv', emoji: '🌟', name_key: 'tmdb_mod_c_best_current_y_tv', request: 'discover/tv?first_air_date.year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=50' },    
        { id: 'best_of_last_year_tv', emoji: '🏆', name_key: 'tmdb_mod_c_best_last_y_tv', request: 'discover/tv?first_air_date.year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=100' },    
        { id: 'animation_tv', emoji: '🧑‍🎤', name_key: 'tmdb_mod_c_animation_tv', request: 'discover/tv?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=100' }    
    ];    
    
    var maxRetries = 30;    
    var settingsListener = null;    
    
    var pluginSettings = {    
        enabled: true,    
        wideCards: true,    
        collections: collectionsConfig.reduce(function(acc, c) { acc[c.id] = true; return acc; }, {})    
    };    
    
    function addTranslations() {    
        Lampa.Lang.add({    
            tmdb_mod_plugin_name: 'Головна сторінка +',    
            tmdb_mod_wide_cards: 'Горизонтальні картки',    
            tmdb_mod_wide_cards_descr: 'Використовувати широкі горизонтальні картки замість стандартних',    
            tmdb_mod_noty_reload: 'Потрібно перезавантажити сторінку для застосування змін',    
            tmdb_mod_c_hot_new: 'Гарячі новинки',    
            tmdb_mod_c_trend_movie: 'Трендові фільми',    
            tmdb_mod_c_watching_now: 'Дивляться зараз',    
            tmdb_mod_c_cult: 'Культове кіно',    
            tmdb_mod_c_top_studios: 'Найкращі студії',    
            tmdb_mod_c_best_current_y: 'Найкраще ' + currentYear + ' року',    
            tmdb_mod_c_best_last_y: 'Найкраще ' + lastYear + ' року',    
            tmdb_mod_c_animation: 'Анімація',    
            tmdb_mod_c_documentary: 'Документальні',    
            tmdb_mod_c_trend_tv: 'Трендові серіали',    
            tmdb_mod_c_world_hits: 'Світові хіти',    
            tmdb_mod_c_ukr_series: 'Українські серіали',    
            tmdb_mod_c_best_current_y_tv: 'Найкращі серіали ' + currentYear + ' року',    
            tmdb_mod_c_best_last_y_tv: 'Найкращі серіали ' + lastYear + ' року',    
            tmdb_mod_c_animation_tv: 'Анімаційні серіали'    
        });    
    }    
    
    function loadSettings() {    
        if (Lampa.Storage) {    
            pluginSettings.enabled = Lampa.Storage.get('tmdb_mod_enabled', true);    
            pluginSettings.wideCards = Lampa.Storage.get('tmdb_mod_wide_cards', true);    
            collectionsConfig.forEach(function(cfg) {    
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('tmdb_mod_collection_' + cfg.id, true);    
            });    
        }    
        return pluginSettings;    
    }    
    
    function saveSettings() {    
        if (Lampa.Storage) {    
            Lampa.Storage.set('tmdb_mod_enabled', pluginSettings.enabled);    
            Lampa.Storage.set('tmdb_mod_wide_cards', pluginSettings.wideCards);    
            collectionsConfig.forEach(function(cfg) {    
                Lampa.Storage.set('tmdb_mod_collection_' + cfg.id, pluginSettings.collections[cfg.id]);    
            });    
        }    
    }    
    
    function getColor(rating, alpha) {    
        var rgb = '';    
        if (rating >= 0 && rating <= 3) rgb = '231, 76, 60';    
        else if (rating > 3 && rating <= 5) rgb = '230, 126, 34';    
        else if (rating > 5 && rating <= 6.5) rgb = '241, 196, 15';    
        else if (rating > 6.5 && rating < 8) rgb = '52, 152, 219';    
        else if (rating >= 8 && rating <= 10) rgb = '46, 204, 113';    
        return rgb ? 'rgba(' + rgb + ', ' + alpha + ')' : null;    
    }    
    
    function fetchLogo(movie, itemElement) {    
        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');    
        var langPref = Lampa.Storage.get('ym_logo_lang', 'uk_en');    
        var quality = Lampa.Storage.get('ym_img_quality', 'w300');    
          
        function applyTextLogo() {    
            var textLogo = document.createElement('div');    
            textLogo.className = 'card-custom-logo-text';    
            var txt = movie.title || movie.name;    
            if (langPref === 'en' || langPref === 'text_en') {    
                txt = movie.original_title || movie.original_name || txt;    
            }    
            textLogo.innerText = txt;    
            itemElement.find('.card__view').append(textLogo);    
        }    
    
        if (langPref === 'text_uk' || langPref === 'text_en') {    
            applyTextLogo();    
            return;    
        }    
    
        var cacheKey = 'logo_uas_v8_' + quality + '_' + langPref + '_' + mType + '_' + movie.id;    
        var cachedUrl = Lampa.Storage.get(cacheKey);    
    
        function applyLogo(url) {    
            if (url && url !== 'none') {    
                var img = new Image();    
                img.crossOrigin = "anonymous";     
                img.className = 'card-custom-logo';    
                img.onload = function() { itemElement.find('.card__view').append(img); };    
                img.onerror = applyTextLogo;    
                img.src = url;    
            } else {    
                applyTextLogo();    
            }    
        }    
          
        if (cachedUrl) { applyLogo(cachedUrl); return; }    
    
        let endpoint = 'https://api.themoviedb.org/3/' + mType + '/' + movie.id + '/images?include_image_language=uk,en,null&api_key=' + (Lampa.TMDB && Lampa.TMDB.key ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96');    
        fetch('https://cors.lampa.stream/' + endpoint).then(r=>r.json()).then(function(res) {    
            var finalLogo = 'none';    
            if (res.logos && res.logos.length > 0) {    
                var found = null;    
                if (langPref === 'uk') {    
                    found = res.logos.find(l => l.iso_639_1 === 'uk');    
                } else if (langPref === 'en') {    
                    found = res.logos.find(l => l.iso_639_1 === 'en');    
                } else {    
                    found = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en');    
                }    
    
                if (found) finalLogo = 'https://cors.lampa.stream/' + Lampa.TMDB.image('t/p/' + quality + found.file_path);    
            }    
            Lampa.Storage.set(cacheKey, finalLogo);    
            applyLogo(finalLogo);    
        }).catch(function() {    
            Lampa.Storage.set(cacheKey, 'none');    
            applyLogo('none');    
        });    
    }    
    
    function loadHistoryRow(callback, settings) {    
        let hist = [];    
        let allFavs = {};    
        try {    
            if (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.all === 'function') {    
                allFavs = Lampa.Favorite.all() || {};    
                if (allFavs.history) {    
                    hist = allFavs.history;    
                }    
            }    
        } catch(e) {}    
          
        let results = [];    
          
        if (hist && hist.length > 0) {    
            let unique = {};    
            let validItems = hist.filter(h => {    
                if (h && h.id && (h.title || h.name) && !unique[h.id]) {    
                    unique[h.id] = true;    
                    return true;    
                }    
                return false;    
            }).slice(0, 20);    
    
            if (validItems.length > 0) {    
                if (settings && settings.wideCards) {    
                    results = results.concat(validItems.map(makeWideCardItem));    
                } else {    
                    results = results.concat(validItems.map(makeHistoryCardItem));    
                }    
            }    
        }    
    
        if (results.length > 0) {    
            callback({    
                results: results,    
                title: '🕒 Продовжити перегляд',    
                uas_content_row: true,    
                params: { items: { mapping: 'line', view: 15 } }    
            });    
        } else {    
            callback({ results: [] });    
        }    
    }    
    
    function makeHistoryCardItem(movie) {    
        return {    
            title: movie.title || movie.name,    
            params: {    
                createInstance: function () {    
                    return Lampa.Maker.make('Card', movie, function (module) {    
                        return module.only('Card', 'Callback');    
                    });    
                },    
                emit: {    
                    onCreate: function () {    
                        var item = $(this.html);    
                        item.addClass('card--history-custom');    
                        var view = item.find('.card__view');    
                        view.empty();    
                          
                        var quality = Lampa.Storage.get('ym_img_quality', 'w300');    
                        var imgUrl = 'https://image.tmdb.org/t/p/' + quality + (movie.backdrop_path || movie.poster_path);    
                        view.css({    
                            'background-image': 'url(' + imgUrl + ')',    
                            'background-size': 'cover',    
                            'background-position': 'center',    
                            'padding-bottom': '56.25%',    
                            'height': '0',    
                            'position': 'relative'    
                        });    
                          
                        view.append('<div class="card-backdrop-overlay"></div>');    
    
                        var voteVal = parseFloat(movie.vote_average);    
                        if (!isNaN(voteVal) && voteVal > 0) {    
                            var voteDiv = document.createElement('div');    
                            voteDiv.className = 'card__vote';    
                            voteDiv.innerText = voteVal.toFixed(1);    
                            var color = getColor(voteVal, 0.8);    
                            if (color) voteDiv.style.backgroundColor = color;    
                            view.append(voteDiv);    
                        }    
    
                        fetchLogo(movie, item);    
                    },    
                    onlyEnter: function () {    
                        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');    
                        Lampa.Activity.push({    
                            url: '',    
                            component: 'full',    
                            id: movie.id,    
                            method: mType,    
                            card: movie,    
                            source: movie.source || 'tmdb'    
                        });    
                    }    
                }    
            }    
        };    
    }    
    
    function makeWideCardItem(movie) {    
        return {    
            title: movie.title || movie.name,    
            params: {    
                createInstance: function () {    
                    return Lampa.Maker.make('Card', movie, function (module) {    
                        return module.only('Card', 'Callback');    
                    });    
                },    
                emit: {    
                    onCreate: function () {    
                        var item = $(this.html);    
                        item.addClass('card--wide-custom');    
                        var view = item.find('.card__view');    
                        view.empty();    
                          
                        var quality = Lampa.Storage.get('ym_img_quality', 'w300');    
                        var imgUrl = 'https://image.tmdb.org/t/p/' + quality + movie.backdrop_path;    
                        view.css({    
                            'background-image': 'url(' + imgUrl + ')',    
                            'background-size': 'cover',    
                            'background-position': 'center',    
                            'padding-bottom': '56.25%',    
                            'height': '0',    
                            'position': 'relative'    
                        });    
                          
                        view.append('<div class="card-backdrop-overlay"></div>');    
    
                        var voteVal = parseFloat(movie.vote_average);    
                        if (!isNaN(voteVal) && voteVal > 0) {    
                            var voteDiv = document.createElement('div');    
                            voteDiv.className = 'card__vote';    
                            voteDiv.innerText = voteVal.toFixed(1);    
                            var color = getColor(voteVal, 0.8);    
                            if (color) voteDiv.style.backgroundColor = color;    
                            view.append(voteDiv);    
                        }    
    
                        var yearStr = (movie.release_date || movie.first_air_date || '').toString().substring(0, 4);    
                        if (yearStr && yearStr.length === 4) {    
                            var ageDiv = document.createElement('div');    
                            ageDiv.className = 'card-badge-age';    
                            ageDiv.innerText = yearStr;    
                            view.append(ageDiv);    
                        }    
    
                        fetchLogo(movie, item);    
    
                        var descText = movie.overview || 'Опис відсутній.';    
                        item.append('<div class="custom-title-bottom">' + (movie.title || movie.name) + '</div>');    
                        item.append('<div class="custom-overview-bottom">' + descText + '</div>');    
                    },    
                    onlyEnter: function () {    
                        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');    
                        Lampa.Activity.push({    
                            url: '',    
                            component: 'full',    
                            id: movie.id,    
                            method: mType,    
                            card: movie,    
                            source: movie.source || 'tmdb'    
                        });    
                    }    
                }    
            }    
        };    
    }    
    
    function loadHistoryRow(callback, settings) {    
        let hist = [];    
        let allFavs = {};    
        try {    
            if (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.all === 'function') {    
                allFavs = Lampa.Favorite.all() || {};    
                if (allFavs.history) {    
                    hist = allFavs.history;    
                }    
            }    
        } catch(e) {}    
          
        let results = [];    
          
        if (hist && hist.length > 0) {    
            let unique = {};    
            let validItems = hist.filter(h => {    
                if (h && h.id && (h.title || h.name) && !unique[h.id]) {    
                    unique[h.id] = true;    
                    return true;    
                }    
                return false;    
            }).slice(0, 20);    
    
            if (validItems.length > 0) {    
                // Використовуємо правильний тип карток залежно від налаштувань    
                if (settings && settings.wideCards) {    
                    results = results.concat(validItems.map(makeWideCardItem));    
                } else {    
                    results = results.concat(validItems.map(makeHistoryCardItem));    
                }    
            }    
        }    
    
        if (results.length > 0) {    
            callback({    
                results: results,    
                title: '🕒 Продовжити перегляд',    
                uas_content_row: true,    
                params: { items: { mapping: 'line', view: 15 } }    
            });    
        } else {    
            callback({ results: [] });    
        }    
    }    
    
    function makeHistoryCardItem(movie) {    
        return {    
            title: movie.title || movie.name,    
            params: {    
                createInstance: function () {    
                    return Lampa.Maker.make('Card', movie, function (module) {    
                        return module.only('Card', 'Callback');    
                    });    
                },    
                emit: {    
                    onCreate: function () {    
                        var item = $(this.html);    
                        item.addClass('card--history-custom');    
                        var view = item.find('.card__view');    
                        view.empty();    
                          
                        var quality = Lampa.Storage.get('ym_img_quality', 'w300');    
                        var imgUrl = 'https://image.tmdb.org/t/p/' + quality + (movie.backdrop_path || movie.poster_path);    
                        view.css({    
                            'background-image': 'url(' + imgUrl + ')',    
                            'background-size': 'cover',    
                            'background-position': 'center',    
                            'padding-bottom': '56.25%',    
                            'height': '0',    
                            'position': 'relative'    
                        });    
                          
                        view.append('<div class="card-backdrop-overlay"></div>');    
    
                        var voteVal = parseFloat(movie.vote_average);    
                        if (!isNaN(voteVal) && voteVal > 0) {    
                            var voteDiv = document.createElement('div');    
                            voteDiv.className = 'card__vote';    
                            voteDiv.innerText = voteVal.toFixed(1);    
                            var color = getColor(voteVal, 0.8);    
                            if (color) voteDiv.style.backgroundColor = color;    
                            view.append(voteDiv);    
                        }    
    
                        fetchLogo(movie, item);    
                        // НЕ додаємо назву тут, щоб уникнути дублювання    
                    },    
                    onlyEnter: function () {    
                        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');    
                        Lampa.Activity.push({    
                            url: '',    
                            component: 'full',    
                            id: movie.id,    
                            method: mType,    
                            card: movie,    
                            source: movie.source || 'tmdb'    
                        });    
                    }    
                }    
            }    
        };    
    }    
    
    var createDiscoveryMain = function (parent) {    
        return function () {    
            var params = arguments[0] || {};    
            var oncomplete = arguments[1];    
            var onerror = arguments[2];    
    
            var hasSequentials = Lampa.Api && Lampa.Api.sequentials && typeof Lampa.Api.sequentials === 'function';    
            var hasPartNext = Lampa.Api && Lampa.Api.partNext && typeof Lampa.Api.partNext === 'function';    
    
            if (!hasSequentials && !hasPartNext) {     
                if (onerror) onerror();     
                return;     
            }    
    
            var settings = loadSettings();    
            var parts_data = [];    
    
            // Додаємо завантаження історії перегляду    
            parts_data.push(function (call) {    
                loadHistoryRow(function(json) {    
                    if (json.results && json.results.length > 0) {    
                        // Перетворюємо результати у відповідний тип карток    
                        if (settings.wideCards) {    
                            json.results = json.results.map(makeWideCardItem);    
                        }    
                    }    
                    call(json);    
                }, settings); // Передаємо settings    
            });    
    
            collectionsConfig.forEach(function(cfg) {    
                if (settings.collections[cfg.id]) {    
                    parts_data.push(function (call) {     
                        parent.get(cfg.request, params, function (json) {     
                            var translatedName = Lampa.Lang.translate(cfg.name_key);    
                            json.title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;     
                                
                            if (json.results && json.results.length > 0) {    
                                if (settings.wideCards) {    
                                    json.results = json.results.map(makeWideCardItem);    
                                }    
                            }    
                                
                            if (Lampa.Utils && Lampa.Utils.addSource) {    
                                Lampa.Utils.addSource(json, 'tmdb');    
                            }    
                                
                            call(json);     
                        }, function(err) {    
                            console.error('[TMDB_MOD] Помилка завантаження підбірки "' + cfg.id + '":', err);    
                            var translatedName = Lampa.Lang.translate(cfg.name_key);    
                            var title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;    
                            call({ source: 'tmdb', results: [], title: title });    
                        });     
                    });    
                }    
            });    
    
            if (parts_data.length === 0) {    
                if (onerror) onerror();    
                return function () {};    
            }    
    
            var methodToUse = Lampa.Api.sequentials || Lampa.Api.partNext;    
            methodToUse(parts_data, parts_data.length, oncomplete, onerror);     
            return function () {};    
        };    
    };    
    
    function syncCheckboxes() {    
        requestAnimationFrame(function() {    
            collectionsConfig.forEach(function(cfg) {    
                document.querySelectorAll('[data-name="tmdb_mod_collection_' + cfg.id + '"]').forEach(function(el) {    
                    if (el.type === 'checkbox') el.checked = pluginSettings.collections[cfg.id];    
                });    
            });    
        });    
    }    
    
   function addSettings() {      
    loadSettings();       
    
    if (!Lampa.SettingsApi) return;      
          
    Lampa.SettingsApi.addComponent({      
        component: 'tmdb_mod',      
        name: Lampa.Lang.translate('tmdb_mod_plugin_name'),      
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'      
    });      
    
    // Додаємо налаштування для широких карток  
    Lampa.SettingsApi.addParam({      
        component: 'tmdb_mod',      
        param: { name: 'tmdb_mod_wide_cards', type: 'trigger', default: true },      
        field: { name: Lampa.Lang.translate('tmdb_mod_wide_cards'), description: Lampa.Lang.translate('tmdb_mod_wide_cards_descr') },      
        onChange: function (value) {      
            pluginSettings.wideCards = value;      
            saveSettings();      
            Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));      
        }      
    });  
    
    // Додаємо налаштування для мови логотипів  
    var langValues = {  
        'uk': 'Тільки українською',  
        'uk_en': 'Укр + Англ (За замовчуванням)',  
        'en': 'Тільки англійською',  
        'text_uk': 'Завжди текст (Укр)',  
        'text_en': 'Завжди текст (Англ)'  
    };  
  
    Lampa.SettingsApi.addParam({  
        component: 'tmdb_mod',  
        param: { name: 'ym_logo_lang', type: 'select', values: langValues, default: 'uk_en' },  
        field: { name: 'Мова логотипів', description: 'Оберіть пріоритет мови для логотипів' }  
    });  
  
    var qualValues = {  
        'w300': 'w300 (За замовчуванням)',  
        'w500': 'w500',  
        'w780': 'w780',  
        'original': 'Оригінал'  
    };  
  
    Lampa.SettingsApi.addParam({  
        component: 'tmdb_mod',  
        param: { name: 'ym_img_quality', type: 'select', values: qualValues, default: 'w300' },  
        field: { name: 'Якість зображень (Фон/Лого)', description: 'Впливає на швидкість завантаження сторінки' }  
    });  
    
    if (settingsListener && Lampa.Settings.listener.remove) {      
        Lampa.Settings.listener.remove('open', settingsListener);      
    }      
    
    settingsListener = function (e) {      
        if (e.name === 'tmdb_mod') {      
            syncCheckboxes();      
        }      
    };      
    
    if (Lampa.Settings && Lampa.Settings.listener) {      
        Lampa.Settings.listener.follow('open', settingsListener);      
    }      
}   
    
    function initPlugin() {    
        try {    
            if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) {    
                console.error('[TMDB_MOD] Lampa API не готовий');    
                if (Lampa.Noty) {    
                    Lampa.Noty.show('TMDB_MOD: Помилка ініціалізації');    
                }    
                return false;    
            }    
    
            var originalTMDB = Lampa.Api.sources.tmdb;    
            var settings = loadSettings();    
                
            var tmdb_mod = Object.assign({}, originalTMDB);    
            Lampa.Api.sources.tmdb_mod = tmdb_mod;    
            Object.defineProperty(Lampa.Api.sources, 'tmdb_mod', {     
                get: function() { return tmdb_mod; }     
            });    
    
            var originalMain = originalTMDB.main;     
    
            tmdb_mod.main = function () {    
                var args = Array.from(arguments);    
                    
                if (loadSettings().enabled && this.type !== 'movie' && this.type !== 'tv') {    
                    return createDiscoveryMain(tmdb_mod).apply(this, args);    
                }    
                    
                return originalMain.apply(this, args);    
            };    
    
            if (Lampa.Params && Lampa.Params.select) {    
                try {    
                    var sources = Lampa.Params.values && Lampa.Params.values.source ? Lampa.Params.values.source : {};    
                    if (!sources.tmdb_mod) {    
                        sources.tmdb_mod = 'Головна сторінка +';     
                        Lampa.Params.select('source', sources, 'tmdb');     
                    }    
                } catch (e) {    
                    console.error('[TMDB_MOD] Помилка реєстрації джерела:', e);    
                }    
            }    
    
            return true;    
        } catch (e) {    
            console.error('[TMDB_MOD] Критична помилка ініціалізації:', e);    
            return false;    
        }    
    }    
    
    function addWideCardStyles() {  
        var style = document.createElement('style');  
        style.innerHTML = `  
            .card--wide-custom {   
                width: 25em !important;   
                margin-right: 0.2em !important;   
                margin-bottom: 0 !important;   
                position: relative;   
                cursor: pointer;   
                transition: transform 0.2s ease, z-index 0.2s ease;   
                z-index: 1;   
            }  
              
            .card--wide-custom .card__view {   
                border-radius: 0.4em !important;   
                overflow: hidden !important;   
                box-shadow: 0 3px 6px rgba(0,0,0,0.5);   
            }  
              
            .card--wide-custom .card-backdrop-overlay {   
                position: absolute;   
                top: 0;   
                left: 0;   
                right: 0;   
                bottom: 0;   
                background: rgba(0, 0, 0, 0.5);   
                pointer-events: none;   
                border-radius: 0.4em !important;   
                z-index: 1;   
            }  
              
            .card--wide-custom.focus {   
                z-index: 99 !important;   
                transform: scale(1.08);   
            }  
              
            .card--wide-custom.focus .card__view {   
                box-shadow: 0 10px 25px rgba(0,0,0,0.9) !important;   
                border: 3px solid #fff !important;   
                outline: none !important;   
            }  
              
            .card-custom-logo {   
                position: absolute;   
                top: 50%;   
                left: 50%;   
                transform: translate(-50%, -50%);   
                width: 70% !important;   
                height: 70% !important;   
                max-width: 70% !important;   
                max-height: 70% !important;   
                padding: 0 !important;   
                margin: 0 !important;   
                object-fit: contain;   
                z-index: 5;   
                filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.8));   
                pointer-events: none;   
                transition: filter 0.3s ease;   
            }  
              
            .card-custom-logo-text {   
                position: absolute;   
                top: 50%;   
                left: 50%;   
                transform: translate(-50%, -50%);   
                width: 80%;   
                max-height: 70%;   
                text-align: center;   
                font-size: 2em;   
                font-weight: 600;   
                color: #fff;   
                text-shadow: none !important;   
                z-index: 5;   
                pointer-events: none;   
                word-wrap: break-word;   
                white-space: normal;   
                line-height: 1.2;   
                font-family: sans-serif;   
                display: flex;   
                align-items: center;   
                justify-content: center;   
            }  
              
            .card--history-custom {   
                width: 16em !important;   
                margin-right: 0.2em !important;   
                margin-bottom: 0 !important;   
                position: relative;   
                cursor: pointer;   
                transition: transform 0.2s ease, z-index 0.2s ease;   
                z-index: 1;   
            }  
              
            .card--history-custom .card__view {   
                border-radius: 0.8em !important;   
                overflow: hidden !important;   
                box-shadow: 0 3px 6px rgba(0,0,0,0.5);   
            }  
              
            .card--history-custom .card-backdrop-overlay {   
                position: absolute;   
                top: 0;   
                left: 0;   
                right: 0;   
                bottom: 0;   
                background: rgba(0, 0, 0, 0.3);   
                pointer-events: none;   
                border-radius: 0.8em !important;   
                z-index: 1;   
            }  
              
            .card--history-custom.focus {   
                z-index: 99 !important;   
                transform: scale(1.05);   
            }  
              
            .card--history-custom.focus .card__view {   
                box-shadow: 0 8px 20px rgba(0,0,0,0.8) !important;   
                border: 2px solid #fff !important;   
                outline: none !important;   
            }  
              
            .custom-title-bottom {   
                width: 100%;   
                text-align: left;   
                font-size: 1.1em;   
                font-weight: bold;   
                margin-top: 0.3em;   
                color: #fff;   
                white-space: nowrap;   
                overflow: hidden;   
                text-overflow: ellipsis;   
                padding: 0 0.2em;   
            }  
              
            .custom-overview-bottom {   
                width: 100%;   
                text-align: left;   
                font-size: 0.85em;   
                color: #bbb;   
                line-height: 1.2;   
                margin-top: 0.2em;   
                padding: 0 0.2em;   
                display: -webkit-box;   
                -webkit-line-clamp: 2;   
                -webkit-box-orient: vertical;   
                overflow: hidden;   
                white-space: normal;   
            }  
              
            .card-badge-age {   
                display: block !important;   
                right: 0 !important;   
                top: 0 !important;   
                padding: 0.2em 0.45em !important;   
                background: rgba(0, 0, 0, 0.6) !important;   
                position: absolute !important;   
                margin-top: 0 !important;   
                font-size: 1.1em !important;   
                z-index: 10 !important;   
                color: #fff !important;   
                font-weight: bold !important;  
            }  
              
            .card__vote {   
                right: 0 !important;   
                bottom: 0 !important;   
                padding: 0.2em 0.45em !important;   
                z-index: 2;   
                position: absolute !important;   
                font-weight: bold;   
                background: rgba(0,0,0,0.6);   
            }  
              
            /* Приховуємо стандартну назву Lampa для широких карток */  
            .card--wide-custom .card__title {  
                display: none !important;  
            }  
              
            /* Приховуємо стандартну назву Lampa для карток історії */  
            .card--history-custom .card__title {  
                display: none !important;  
            }  
              
            /* Мобільна адаптація */  
            @media (orientation: portrait), (max-width: 768px) {  
                .card--wide-custom {   
                    width: 14em !important;   
                }  
                  
                .card--wide-custom .custom-overview-bottom {   
                    display: none !important;   
                }  
                  
                .card--wide-custom .custom-title-bottom {   
                    font-size: 1em !important;   
                    margin-top: 0.1em;   
                }  
                  
                .card--history-custom {  
                    width: 14em !important;  
                }  
            }  
        `;  
        document.head.appendChild(style);  
    }  
    
    function waitForApp(retries) {    
        retries = retries || 0;    
        if (retries > maxRetries) {    
            console.error('[TMDB_MOD] Не вдалося завантажити Lampa після ' + maxRetries + ' спроб');    
            return;    
        }    
    
        function onAppReady() {    
            addTranslations();    
            if (initPlugin()) {    
                addSettings();    
                addWideCardStyles();    
            }    
        }    
    
        if (window.appready) {    
            onAppReady();    
        } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {    
            Lampa.Listener.follow('app', function (e) {    
                if (e.type === 'ready') {    
                    onAppReady();    
                }    
            });    
        } else {    
            setTimeout(function() {     
                waitForApp(retries + 1);     
            }, 1000);    
        }    
    }    
    
    waitForApp();    
    
})();
