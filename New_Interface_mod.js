(function () {    
    'use strict';    
    
    // ===== БЛОК ЛОГОТИПІВ =====    
    var logoCache = {};    
    
    function getCachedLogo(itemId, language) {    
        var cacheKey = itemId + '_' + language;    
            
        if (logoCache[cacheKey]) {    
            return logoCache[cacheKey];    
        }    
            
        try {    
            var cached = localStorage.getItem('logo_cache_' + cacheKey);    
            if (cached) {    
                var parsed = JSON.parse(cached);    
                var now = Date.now();    
                if (now - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {    
                    logoCache[cacheKey] = parsed.data;    
                    return parsed.data;    
                }    
            }    
        } catch(e) {    
            console.error('[LogoPlugin] Помилка читання з localStorage:', e);    
        }    
            
        return null;    
    }    
    
    function setCachedLogo(itemId, language, logoPath) {    
        var cacheKey = itemId + '_' + language;    
        logoCache[cacheKey] = logoPath;    
            
        try {    
            localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({    
                data: logoPath,    
                timestamp: Date.now()    
            }));    
        } catch(e) {    
            console.error('[LogoPlugin] Помилка запису в localStorage:', e);    
        }    
    }    
    
    function loadAndRenderLogoForNewInterface(item, html) {    
        var $ = window.$ || window.jQuery;    
        if (!$ || !item || !item.id) return;    
            
        var apiKey = Lampa.TMDB.key();    
        if (!apiKey) return;    
            
        var mediaType = item.first_air_date && !item.release_date ? 'tv' : 'movie';    
        var currentLang = Lampa.Storage.get('language');    
            
        var cachedLogo = getCachedLogo(item.id, currentLang);    
        if (cachedLogo) {    
            renderLogoForNewInterface(cachedLogo, html, item, false);    
            return;    
        }    
            
        var url = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + currentLang);    
            
        function tryEnglishLogos() {    
            if (currentLang === 'en') return;    
                
            var enUrl = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');    
            $.get(enUrl, function (enResponse) {    
                if (enResponse.logos && enResponse.logos.length > 0) {    
                    var pngLogo = enResponse.logos.find(function(logo) {    
                        return !logo.file_path.endsWith('.svg');    
                    });    
                    var logoPath = pngLogo ? pngLogo.file_path : enResponse.logos[0].file_path;    
                        
                    setCachedLogo(item.id, 'en', logoPath);    
                    renderLogoForNewInterface(logoPath, html, item, true);    
                }    
            });    
        }    
            
        $.get(url, function (response) {    
            if (response.logos && response.logos.length > 0) {    
                var pngLogo = response.logos.find(function(logo) {    
                    return !logo.file_path.endsWith('.svg');    
                });    
                var logoPath = pngLogo ? pngLogo.file_path : response.logos[0].file_path;    
                    
                setCachedLogo(item.id, currentLang, logoPath);    
                renderLogoForNewInterface(logoPath, html, item, false);    
            } else {    
                tryEnglishLogos();    
            }    
        }).fail(tryEnglishLogos);    
    }    
    
    function renderLogoForNewInterface(logoPath, html, item, isEnglishLogo) {    
        if (!logoPath) return;    
            
        var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');    
        var showTitle = displayMode === 'logo_and_text' || (isEnglishLogo && displayMode === 'logo_only');    
            
        var titleElement = html.find('.new-interface-info__title');    
        if (!titleElement.length) return;    
            
        var titleText = showTitle ? (item.title || item.name) : '';    
            
        var logoSize = parseInt(Lampa.Storage.get('logo_size', '80'));    
        var containerStyle = 'display: inline-block; height: ' + logoSize + 'px; width: auto; max-width: 100%;';    
        var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block;';    
        var imgUrl = Lampa.TMDB.image('/t/p/w500' + logoPath.replace('.svg', '.png'));    
            
        var fallbackTitle = (item.title || item.name).replace(/'/g, "\\'");    
        var logoHtml = '<div style="' + containerStyle + '"><img style="' + imgStyle + '" src="' + imgUrl + '" alt="' + (item.title || item.name) + '" onerror="this.parentElement.parentElement.innerHTML=\'' + fallbackTitle + '\'" /></div>';    
            
        if (titleText) {    
            logoHtml += '<div style="margin-top: 0.5em;">' + titleText + '</div>';    
        }    
            
        titleElement.html(logoHtml);    
    }    
    // ===== КІНЕЦЬ БЛОКУ ЛОГОТИПІВ =====    
    
    function create() {    
      var html;    
      var timer;    
      var network = new Lampa.Reguest();    
      var loaded = {};    
    
      this.create = function () {    
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");    
      };    
    
      this.update = function (data) {    
        html.find('.new-interface-info__head,.new-interface-info__details').text('---');    
        html.find('.new-interface-info__title').text(data.title);    
        html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));    
        Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));    
        this.load(data);    
            
        // Завантаження логотипу    
        if (Lampa.Storage.get('logo_main') !== '1') {    
            loadAndRenderLogoForNewInterface(data, html);    
        }    
      };    
    
      this.draw = function (data) {    
        var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);    
        var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);    
        var head = [];    
        var details = [];    
        var countries = Lampa.Api.sources.tmdb.parseCountries(data);    
        var pg = Lampa.Api.sources.tmdb.parsePG(data);    
        if (create !== '0000') head.push('<span>' + create + '</span>');    
        if (countries.length > 0) head.push(countries.join(', '));    
        if (vote > 0) details.push('<div class="full-start__rate"><div>' + vote + '</div><div>TMDB</div></div>');    
        if (data.genres && data.genres.length > 0) details.push(data.genres.map(function (item) {    
          return Lampa.Utils.capitalizeFirstLetter(item.name);    
        }).join(' | '));    
        if (data.runtime) details.push(Lampa.Utils.secondsToTime(data.runtime * 60, true));    
        if (pg) details.push('<span class="full-start__pg" style="font-size: 0.9em;">' + pg + '</span>');    
        html.find('.new-interface-info__head').empty().append(head.join(', '));    
        html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));    
      };    
    
      this.load = function (data) {    
        var _this = this;    
    
        clearTimeout(timer);    
        var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));    
        if (loaded[url]) return this.draw(loaded[url]);    
        timer = setTimeout(function () {    
          network.clear();    
          network.timeout(5000);    
          network.silent(url, function (movie) {    
            loaded[url] = movie;    
    
            _this.draw(movie);    
          });    
        }, 300);    
      };    
    
      this.render = function () {    
        return html;    
      };    
    
      this.empty = function () {};    
    
      this.destroy = function () {    
        html.remove();    
        loaded = {};    
        html = null;    
      };    
    }    
    
    function component(object) {    
      var network = new Lampa.Reguest();    
      var scroll = new Lampa.Scroll({    
        mask: true,    
        over: true,    
        scroll_by_item: true    
      });    
      var items = [];    
      var html = $('<div class="new-interface"><img class="full-start__background"></div>');    
      var active = 0;    
      var newlampa = Lampa.Manifest.app_digital >= 166;    
      var info;    
      var lezydata;    
      var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';    
      var background_img = html.find('.full-start__background');    
      var background_last = '';    
      var background_timer;    
    
      this.create = function () {};    
    
      this.empty = function () {    
        var button;    
    
        if (object.source == 'tmdb') {    
          button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');    
          button.find('.selector').on('hover:enter', function () {    
            Lampa.Storage.set('source', 'cub');    
            Lampa.Activity.replace({    
              source: 'cub'    
            });    
          });    
        }    
    
        var empty = new Lampa.Empty();    
        html.append(empty.render(button));    
        this.start = empty.start;    
        this.activity.loader(false);    
        this.activity.toggle();    
      };    
    
      this.loadNext = function () {    
        var _this = this;    
    
        if (this.next && !this.next_wait && items.length) {    
          this.next_wait = true;    
          this.next(function (new_data) {    
            _this.next_wait = false;    
            new_data.forEach(_this.append.bind(_this));    
            Lampa.Layer.visible(items[active + 1].render(true));    
          }, function () {    
            _this.next_wait = false;    
          });    
        }    
      };    
    
      this.push = function () {};    
    
      this.build = function (data) {    
        var _this2 = this;    
    
        lezydata = data;    
        info = new create(object);    
        info.create();    
        scroll.minus(info.render());    
        data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this));    
        html.append(info.render());    
        html.append(scroll.render());    
    
        if (newlampa) {    
          Lampa.Layer.update(html);    
          Lampa.Layer.visible(scroll.render(true));    
          scroll.onEnd = this.loadNext.bind(this);    
    
          scroll.onWheel = function (step) {    
            if (!Lampa.Controller.own(_this2)) _this2.start();    
            if (step > 0) _this2.down();else if (active > 0) _this2.up();    
          };    
        }    
    
        this.activity.loader(false);    
        this.activity.toggle();    
      };    
    
      this.background = function (elem) {    
        var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');    
        clearTimeout(background_timer);    
        if (new_background == background_last) return;    
        background_timer = setTimeout(function () {    
          background_img.removeClass('loaded');    
    
          background_img[0].onload = function () {    
            background_img.addClass('loaded');    
          };    
    
          background_img[0].onerror = function () {    
            background_img.removeClass('loaded');    
          };    
    
          background_last = new_background;    
          setTimeout(function () {    
            background_img[0].src = background_last;    
          }, 300);    
        }, 1000);    
      };    
    
      this.append = function (element) {    
        var _this3 = this;    
    
        if (element.ready) return;    
        element.ready = true;    
        var item = new Lampa.InteractionLine(element, {    
          url: element.url,    
          card_small: true,    
          cardClass: element.cardClass,    
          genres: object.genres,    
          object: object,    
          card_wide: true,    
          nomore: element.nomore    
        });    
        item.create();    
        item.onDown = this.down.bind(this);    
        item.onUp = this.up.bind(this);    
        item.onBack = this.back.bind(this);    
    
        item.onToggle = function () {    
          active = items.indexOf(item);    
        };
          if (this.onMore) item.onMore = this.onMore.bind(this);  
  
        item.onFocus = function (elem) {  
          info.update(elem);  
          _this3.background(elem);  
        };  
  
        item.onHover = function (elem) {  
          info.update(elem);  
          _this3.background(elem);  
        };  
  
        item.onFocusMore = info.empty.bind(info);  
        scroll.append(item.render());  
        items.push(item);  
      };  
  
      this.back = function () {  
        Lampa.Activity.backward();  
      };  
  
      this.down = function () {  
        active++;  
        active = Math.min(active, items.length - 1);  
        if (!viewall) lezydata.slice(0, active + 2).forEach(this.append.bind(this));  
        items[active].toggle();  
        scroll.update(items[active].render());  
      };  
  
      this.up = function () {  
        active--;  
  
        if (active < 0) {  
          active = 0;  
          Lampa.Controller.toggle('head');  
        } else {  
          items[active].toggle();  
          scroll.update(items[active].render());  
        }  
      };  
  
      this.start = function () {  
        Lampa.Controller.add('content', {  
          toggle: function () {  
            Lampa.Controller.collectionSet(scroll.render());  
            Lampa.Controller.collectionFocus(false, scroll.render());  
          },  
          left: function () {  
            if (Navigator.canmove('left')) Navigator.move('left');  
            else Lampa.Controller.toggle('menu');  
          },  
          up: function () {  
            if (active > 0) {  
              this.up();  
            } else {  
              Lampa.Controller.toggle('head');  
            }  
          },  
          down: this.down.bind(this),  
          back: this.back.bind(this)  
        });  
        Lampa.Controller.toggle('content');  
      };  
  
      this.pause = function () {};  
  
      this.stop = function () {};  
  
      this.render = function () {  
        return html;  
      };  
  
      this.destroy = function () {  
        network.clear();  
        Lampa.Arrays.destroy(items);  
        scroll.destroy();  
        html.remove();  
        items = null;  
        network = null;  
      };  
    }  
  
    // Додавання локалізації для логотипів  
    Lampa.Lang.add({  
        logo_main_title: {  
            en: 'Logos instead of titles',  
            uk: 'Логотипи замість назв',  
            ru: 'Логотипы вместо названий'  
        },  
        logo_main_description: {  
            en: 'Displays movie logos instead of text',  
            uk: 'Відображає логотипи фільмів замість тексту',  
            ru: 'Отображает логотипы фильмов вместо текста'  
        },  
        logo_display_mode_title: {  
            en: 'Display mode',  
            uk: 'Режим відображення',  
            ru: 'Режим отображения'  
        },  
        logo_display_mode_logo_only: {  
            en: 'Logo only',  
            uk: 'Тільки логотип',  
            ru: 'Только логотип'  
        },  
        logo_display_mode_logo_and_text: {  
            en: 'Logo and text',  
            uk: 'Логотип і текст',  
            ru: 'Логотип и текст'  
        },  
        logo_size_title: {  
            en: 'Logo size',  
            uk: 'Розмір логотипа',  
            ru: 'Размер логотипа'  
        }  
    });  
  
    // Налаштування для увімкнення/вимкнення логотипів  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'logo_main',  
            type: 'select',  
            values: {  
                '1': Lampa.Lang.translate('settings_param_no'),  
                '0': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '0'  
        },  
        field: {  
            name: Lampa.Lang.translate('logo_main_title'),  
            description: Lampa.Lang.translate('logo_main_description')  
        }  
    });  
  
    // Налаштування режиму відображення  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'logo_display_mode',  
            type: 'select',  
            values: {  
                'logo_only': Lampa.Lang.translate('logo_display_mode_logo_only'),  
                'logo_and_text': Lampa.Lang.translate('logo_display_mode_logo_and_text')  
            },  
            default: 'logo_only'  
        },  
        field: {  
            name: Lampa.Lang.translate('logo_display_mode_title'),  
            show: function () {  
                return Lampa.Storage.get('logo_main') === '0';  
            }  
        }  
    });  
  
    // Налаштування розміру логотипа  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'logo_size',  
            type: 'select',  
            values: {  
                '60': '60px',  
                '80': '80px',  
                '100': '100px',  
                '120': '120px'  
            },  
            default: '80'  
        },  
        field: {  
            name: Lampa.Lang.translate('logo_size_title'),  
            show: function () {  
                return Lampa.Storage.get('logo_main') === '0';  
            }  
        }  
    });  
})();
