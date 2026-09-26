(function () {
    'use strict';

    var detailsCache = {}; 
    var currentActiveId = null;
    var pluginPath = 'https://crowley24.github.io/Icons/';
    var TMDB_LOGO_URL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg';
    var CUB_LOGO_URL = 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg';

    var settings_list = [
        { id: 'movie_card_logo_enabled', default: true },
        { id: 'movie_card_logo_studio', default: true },
        { id: 'movie_card_logo_tagline', default: true },
        { id: 'movie_card_logo_quality_badges', default: true },
        { id: 'movie_card_logo_size', default: '120' },
        { id: 'movie_card_logo_quality', default: 'w500' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var eliteBadgesConfig = [
        { id: '4k-ultra-hd', pattern: /\b(4k|2160p|uhd|ultra\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/4k_ultra_hd.png', group: 'resolution', priority: 3 },
        { id: '1080p-full-hd', pattern: /\b(1080p|fhd|full\s*hd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/1080p_full_hd.png', group: 'resolution', priority: 2 },
        { id: '720p-hd', pattern: /\b720p\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/720p_hd.png', group: 'resolution', priority: 1 },
        { id: 'dolby-vision', pattern: /\b(dolby\s*vision|dovi|dv)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_vision.png' },
        { id: 'hdr', pattern: /\b(hdr10\+|hdr10\s*plus\b|hdr\s*10\s*\+|hdr10|hdr\s*10|hdr)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/hdr.png', group: 'hdr' },
        { id: 'sdr', pattern: /\bsdr\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/SDR_transparent_4x.png' },
        { id: 'dolby-atmos', pattern: /\b(dolby\s*atmos|atmos)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_atmos.png' },
        { id: 'truehd', pattern: /\b(truehd|true\s*hd|dolby\s*truehd)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/truehd.png' },
        { id: 'dolby-digital-plus', pattern: /\b(ddp[\s._-]*[0-9][\s._-]*[0-9]|ddp|dd\+|dolby[\s._-]*digital[\s._-]*plus|e-?ac-?3)(?![a-z])/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital_plus.png' },
        { id: 'dolby-digital', pattern: /\b(dd[\s._-]*[0-9][\s._-]*[0-9]|dd|dolby[\s._-]*digital|ac-?3)(?![\s._-]*plus|\+|p|[a-z])/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital.png' },
        { id: 'dts-hd-master-audio', pattern: /\b(dts[\s._-]*hd[\s._-]*ma|dtshd\s*ma|dts[\s._-]*hd[\s._-]*master)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd_master_audio.png' },
        { id: 'dts-hd', pattern: /\b(dts[\s._-]*hd|dtshd)(?![\s._-]*(ma|master)|ma)\b/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd.png' },
        { id: 'dts', pattern: /\bdts\b(?![\s._:-]*(x|hd))/i, imageURL: 'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts.png' }
    ];

    function applyStyles() {
        var style = document.getElementById('movie-card-logo-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'movie-card-logo-styles';
            document.head.appendChild(style);
        }

        var lHeight = Lampa.Storage.get('movie_card_logo_size', '120'); 
        var showStudio = Lampa.Storage.get('movie_card_logo_studio', true);
        var showTagline = Lampa.Storage.get('movie_card_logo_tagline', true);
        var isEnabled = Lampa.Storage.get('movie_card_logo_enabled', true);
        
        var css = '';
        
        // Плавна поява картки та анімація для всіх вкладених зображень (ліквідація різких ривків)
        css += '@keyframes cardSmoothAppear { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } } ';
        css += '.full-start-new__body, .full-start__body { animation: cardSmoothAppear 0.3s ease-out forwards; will-change: opacity, transform; } ';
        css += '.full-start-new__title img, .studio-header-brand img, .card-quality-item img, .tmdb-rate-badge img { opacity: 0; animation: imgFadeIn 0.3s ease forwards; } ';
        css += '@keyframes imgFadeIn { to { opacity: 1; } } ';

        if (!isEnabled) {
            css += '.full-start-new__title { display: block !important; } ';
            css += '.full-start-new__title img { display: none !important; } ';
            css += '.studio-header-brand, .tmdb-rate-badge, .card-quality-row { display: none !important; } ';
        } else {
            css += '.full-start-new__title { font-size: 0 !important; color: transparent !important; user-select: none !important; } ';
            css += '.full-start-new__head, .full-start__tags { display: none !important; } ';
            
            css += '.card-tweaks__buttons { margin-top: 1.5em; width: 100%; clear: both; } ';
            css += '.card-tweaks__buttons .full-start-new__buttons, .card-tweaks__buttons .buttons--container { margin-top: 0.6em; } ';
            
            css += '.full-start-new__title { display: flex !important; justify-content: flex-start !important; align-items: center !important; height: auto !important; min-height: unset !important; overflow: visible !important; width: 100% !important; box-sizing: border-box !important; margin: 2px 0 !important; } ';
            css += '.full-start-new__title img { height: auto !important; max-height: ' + lHeight + 'px !important; width: auto !important; max-width: 55vw !important; object-fit: contain !important; filter: drop-shadow(0 4px 16px rgba(0,0,0,0.8)); margin: 0 !important; display: block; } ';
            
            css += '.full-start-new__tagline { display: ' + (showTagline ? 'block' : 'none') + ' !important; font-style: italic !important; font-size: 0.9em !important; margin: 4px 0 10px 0 !important; color: rgba(255,255,255,0.8) !important; text-align: left !important; } ';

            if (showStudio) {
                // Забезпечуємо ідеальну видимість студійних логотипів на чорному фоні через акуратну підкладку та фільтр
                css += '.studio-header-brand { width: 100%; display: flex; justify-content: flex-start; align-items: center; margin-bottom: 4px !important; } ';
                css += '.studio-header-brand img { height: 22px !important; width: auto; max-width: 130px; object-fit: contain; padding: 2px 6px; background: rgba(255, 255, 255, 0.08); border-radius: 4px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); } ';
            }

            css += '.full-start-new__info, .full-start__info { margin-top: 12px !important; } ';

            css += '.full-start-new__rate-line, .full-start__rate-line { position: absolute !important; top: 0.6em !important; right: 1.5em !important; left: auto !important; margin: 0 !important; background: none !important; background-color: transparent !important; padding: 0 !important; z-index: 10 !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; } ';
            
            css += '.full-start-new__rate-line > *:not(.tmdb-rate-badge):not(.card-quality-row) { display: none !important; } ';
            css += '.full-start__rate-line > *:not(.tmdb-rate-badge):not(.card-quality-row) { display: none !important; } ';
            css += '.full-start .info__rate, .full-start-new .info__rate { display: none !important; } ';
            
            css += '.tmdb-rate-badge { display: inline-flex !important; align-items: center !important; gap: 0.5em !important; } ';
            css += '.tmdb-rate-badge img { height: 1.1em !important; width: auto !important; display: block !important; } ';
            css += '.tmdb-rate-badge .tmdb-rate-value { font-size: 1.15em !important; font-weight: 700 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.7) !important; } ';

            css += '.card-quality-row { display: flex !important; flex-direction: column !important; align-items: flex-end !important; gap: 6px !important; margin-top: 8px !important; width: auto !important; } ';
            css += '.card-quality-item { height: 1.3em !important; display: flex !important; align-items: center !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)) !important; } ';
            css += '.card-quality-item img { height: 100% !important; width: auto !important; max-width: 80px !important; object-fit: contain !important; } ';
            css += '.card-rating-item { display: flex !important; align-items: center !important; gap: 6px !important; font-weight: 700 !important; font-size: 0.95em !important; color: #fff !important; margin-bottom: 2px !important; } ';
            css += '.card-rating-item img { height: 1.2em !important; width: auto !important; } ';
        }

        style.textContent = css;
    }

    function rateColor(v) {  
        if (v >= 7.5) return '#2ecc71';
        if (v >= 6) return '#feca57';
        if (v > 0) return '#ff4d4d';
        return '#fff';
    }

    function getCubRating(reactionsData, movieObject) {
        if (!reactionsData || !reactionsData.result) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        reactionsData.result.forEach(function(r) {
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }
        });
        if (cnt >= 5) {
            var isTv = movieObject && movieObject.method === 'tv';
            var avg = isTv ? 7.4 : 6.5, m = isTv ? 50 : 150;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
        return null;
    }

    function getEliteBadges(results) {
        var foundBadges = [];
        if (!results) return foundBadges;

        var combinedText = '';
        results.slice(0, 10).forEach(function(item) {
            combinedText += ' ' + (item.Title || item.title || '');
        });

        var matchedBadges = [];
        eliteBadgesConfig.forEach(function(badge) {
            if (badge.pattern && badge.pattern.test(combinedText)) {
                matchedBadges.push(badge);
            }
        });

        var highestResolution = null;
        matchedBadges.forEach(function(b) {
            if (b.group === 'resolution') {
                if (!highestResolution || b.priority > highestResolution.priority) {
                    highestResolution = b;
                }
            }
        });

        matchedBadges.forEach(function(badge) {
            if (badge.group !== 'resolution' || badge.id === highestResolution.id) {
                foundBadges.push(badge.imageURL);
            }
        });

        // Use English logo if Ukrainian is absent
        if (/ukr|укр/i.test(combinedText)) foundBadges.push(pluginPath + 'UKR.svg');
        if (/dub|дуб/i.test(combinedText)) foundBadges.push(pluginPath + 'DUB.svg');

        return foundBadges.filter(function(elem, pos, arr) { return arr.indexOf(elem) === pos; });
    }

    function applyMovieDetailsData(data, movie, $render, translations) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  

        window.requestAnimationFrame(function() {
            var body    = $render.find('.full-start-new__body');  
            var wrapper = $render.find('.card-tweaks__buttons');  
            if (body.length && !wrapper.length) {  
                wrapper = $('<div class="card-tweaks__buttons"></div>');  
                $render.find('.full-start-new__buttons, .buttons--container').each(function () {  
                    wrapper.append(this);  
                });  
                if (wrapper.children().length) body.after(wrapper);  
            }

            var rating = parseFloat(data.vote_average || movie.vote_average || 0);  
            var $rate = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();  
            if ($rate.length && !$rate.find('.tmdb-rate-badge').length && rating) {  
                var value = rating.toFixed(1);  
                var color = rateColor(rating);  
                var $badge = $('<div class="tmdb-rate-badge">' +  
                    '<img src="' + TMDB_LOGO_URL + '" alt="TMDB">' +  
                    '<span class="tmdb-rate-value" style="color:' + color + '">' + value + '</span>' +  
                '</div>');  
                $rate.append($badge);  
            }  

            var year = (data.release_date || data.first_air_date || '').split('-')[0];
            var countries = (data.production_countries && data.production_countries.length > 0) ? 
                data.production_countries.map(function(c) { return c.name; }).join(' • ') : '';
            
            var extraInfo = [];
            if (year) extraInfo.push(year);
            if (countries) extraInfo.push(countries);
            var formattedDetails = extraInfo.join(' • ');

            var $infoLine = $render.find('.full-start-new__info, .full-start__info');
            if ($infoLine.length > 0 && formattedDetails) {
                var originalText = $infoLine.attr('data-original-text');
                if (!originalText) {
                    originalText = $infoLine.text();
                    $infoLine.attr('data-original-text', originalText);
                }
                if (originalText.indexOf(formattedDetails) === -1) {
                    $infoLine.text(formattedDetails + ' • ' + originalText);
                }
            }

            if (data.images && data.images.logos && data.images.logos.length > 0) {
                var lang = Lampa.Storage.get('language') || 'uk';
                var logo = data.images.logos.filter(function(l) { return l.iso_639_1 === lang; })[0] || 
                           data.images.logos.filter(function(l) { return l.iso_639_1 === 'en'; })[0] || 
                           data.images.logos[0];
                
                if (logo && logo.file_path) {
                    var quality = Lampa.Storage.get('movie_card_logo_quality', 'w500');
                    var logoUrl = Lampa.TMDB.image('/t/p/' + quality + logo.file_path.replace('.svg', '.png'));
                    var $title = $render.find('.full-start-new__title');
                    
                    if ($title.length) {
                        var $logoImg = $('<img src="' + logoUrl + '" alt="' + (movie.title || movie.name || '') + '">');
                        $logoImg.on('error', function() { $logoImg.remove(); });
                        $title.html($logoImg);
                    }
                }
            }

            var taglineText = '';
            if (translations && translations.translations) {
                var uaTrans = translations.translations.find(function(t) { return t.iso_639_1 === 'uk'; });
                if (uaTrans && uaTrans.data && uaTrans.data.tagline) {
                    taglineText = uaTrans.data.tagline;
                }
            }
            if (!taglineText && data.tagline) {
                taglineText = data.tagline;
            }

            var $tagline = $render.find('.full-start-new__tagline');
            if (Lampa.Storage.get('movie_card_logo_tagline', true) && taglineText && taglineText.trim() !== '') {
                if ($tagline.length === 0) {
                    $tagline = $('<div class="full-start-new__tagline"></div>');
                    $render.find('.full-start-new__title').after($tagline);
                }
                $tagline.text(taglineText).show();
            } else {
                if ($tagline.length) $tagline.hide();
            }

            if (Lampa.Storage.get('movie_card_logo_quality_badges', true)) {
                $render.find('.card-quality-row').remove();
                var $qRow = $('<div class="card-quality-row"></div>');
                
                var cub = getCubRating(data.reactions, movie);
                if (cub) {
                    var $cubItem = $('<div class="card-rating-item"><img src="' + CUB_LOGO_URL + '"> <span style="color:' + rateColor(cub) + '">' + cub + '</span></div>');
                    $qRow.append($cubItem);
                }

                if (Lampa.Parser && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function(res) {
                        if (res && Array.isArray(res.Results)) {
                            var eliteBadgesList = getEliteBadges(res.Results);
                            eliteBadgesList.forEach(function(imgUrl) { 
                                var $badge = $('<div class="card-quality-item"><img src="' + imgUrl + '"></div>');
                                $qRow.append($badge);
                            });
                        }
                    });
                }

                var $rateLine = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();
                if ($rateLine.length) {
                    $rateLine.append($qRow);
                }
            }

            if (Lampa.Storage.get('movie_card_logo_studio', true)) {
                $render.find('.studio-header-brand').remove();
                var studio = null;

                if (data.networks && data.networks.length > 0) {
                    studio = data.networks.find(function(n) { return n.logo_path; });
                }
                if (!studio && data.production_companies && data.production_companies.length > 0) {
                    studio = data.production_companies.find(function(c) { return c.logo_path; });
                }

                if (studio && studio.logo_path) {
                    var studioLogoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);
                    var $brand = $('<div class="studio-header-brand"><img src="' + studioLogoUrl + '" alt="' + (studio.name || '') + '"></div>');
                    var $img = $brand.find('img');
                    $img.on('error', function() { $brand.remove(); });
                    
                    var $titleElem = $render.find('.full-start-new__title');
                    if ($titleElem.length) {
                        $titleElem.before($brand);
                    }
                }
            }
        });
    }  

    function loadMovieDetails(movie, $render) {  
        if (!Lampa.Storage.get('movie_card_logo_enabled', true)) return;  

        var movieId = movie.id;  
        currentActiveId = movieId;  

        // Якщо дані вже в кеші — застосовуємо їх миттєво без жодних затримок
        if (detailsCache[movieId]) {  
            applyMovieDetailsData(detailsCache[movieId].data, movie, $render, detailsCache[movieId].translations);  
            return;  
        }  

        var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';  
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=images,reactions&include_image_language=uk,en,null';  
        var transUrl = 'https://api.themoviedb.org/3/' + type + '/' + movieId + '/translations?api_key=' + Lampa.TMDB.key();  

        $.when(  
            $.ajax({ url: url, type: 'GET', dataType: 'json' }),  
            $.ajax({ url: transUrl, type: 'GET', dataType: 'json' })  
        ).done(function (resData, resTrans) {  
            if (currentActiveId !== movieId) return;  
            var data = resData[0];
            var translations = resTrans[0];

            detailsCache[movieId] = { data: data, translations: translations };  
            applyMovieDetailsData(data, movie, $render, translations);  
        });  
    }  

    function init() {  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'destroy' || e.type === 'onBeforeDestroy') {
                currentActiveId = null;
            }

            if (e.type === 'complite' || e.type === 'complete') {  
                loadMovieDetails(e.data.movie, e.object.activity.render());  
            }  
        });  
    }  

    function setupSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'movie_card_logo',  
            name: 'Картка',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" fill="white"/></svg>'  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_enabled', type: 'trigger', default: true },  
            field: { name: 'Увімкнути плагін', description: 'Відображати логотип фільму замість звичайної назви' },  
            onChange: applyStyles  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_studio', type: 'trigger', default: true },  
            field: { name: 'Логотип студії', description: 'Відображати логотип виробника на акуратній підкладці' },  
            onChange: applyStyles  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_tagline', type: 'trigger', default: true },  
            field: { name: 'Слоган фільму', description: 'Відображати слоган під логотипом' },  
            onChange: applyStats = applyStyles  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: { name: 'movie_card_logo_quality_badges', type: 'trigger', default: true },  
            field: { name: 'Бейджі якості та CUB', description: 'Відображати бейджі роздільної здатності, звуку та рейтинг CUB' },  
            onChange: applyStyles  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_size', type: 'select',  
                values: { '50': 'Дуже малий (50px)', '80': 'Малий (80px)', '120': 'Стандартний (120px)', '160': 'Великий (160px)', '210': 'Дуже великий (210px)' },  
                default: '120'  
            },  
            field: { name: 'Розмір логотипа назви фільму' },  
            onChange: applyStyles  
        });  

        Lampa.SettingsApi.addParam({  
            component: 'movie_card_logo',  
            param: {  
                name: 'movie_card_logo_quality', type: 'select',  
                values: { 'w300': 'Низька (w300)', 'w500': 'Середня (w500)', 'w780': 'Висока (w780)', 'original': 'Оригінал' },  
                default: 'w500'  
            },  
            field: { name: 'Якість логотипа' },  
            onChange: applyStyles  
        });  
    }  

    function startPlugin() {  
        applyStyles();  
        setupSettings();  
        init();  
    }  

    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });  
})();
