(function () {
    'use strict';

    // Кеш для логотипов: ключ - ID фильма, значение - URL изображения
    // Вынесен на уровень модуля для доступа из всех функций
    var logoCache = {};
    
    // Функция предзагрузки логотипа в кеш
    var preloadLogo = function(data) {
        if (!data || !data.id || Lampa.Storage.get('interface_logo_enabled') == '1') {
          return;
        }
        
        // Если уже в кеше, пропускаем
        if (logoCache[data.id]) {
          return;
        }
        
        var type = data.name ? 'tv' : 'movie';
        var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));
        
        // Загружаем данные о логотипах в фоне
        $.get(url, function(imagesData) {
          if (imagesData.logos && imagesData.logos[0]) {
            var logo = imagesData.logos[0].file_path;
            if (logo != '') {
              var quality = Lampa.Storage.get('interface_logo_quality') || 'w500';
              var imagePath = logo.replace('.svg', '.png');
              var imageUrl = Lampa.TMDB.image('/t/p/' + quality + imagePath);
              
              // Кешируем URL логотипа
              logoCache[data.id] = imageUrl;
              
              // Предзагружаем изображение в браузерный кеш
              var img = new Image();
              img.src = imageUrl;
            }
          }
        }).fail(function() {
          // При ошибке помечаем как отсутствующий логотип
          logoCache[data.id] = null;
        });
    };

    function create() {
      var html;
      var timer;
      var network = new Lampa.Reguest();
      var loaded = {};
      var logoLoaded = false;

      this.create = function () {
        html = $("<div class=\"new-interface-info\">\n            <div class=\"new-interface-info__body\">\n                <div class=\"new-interface-info__head\"></div>\n                <div class=\"new-interface-info__title\"></div>\n                <div class=\"new-interface-info__details\"></div>\n                <div class=\"new-interface-info__description\"></div>\n            </div>\n        </div>");
      };

      // Функция для загрузки и применения логотипа
      var loadLogo = function(data, titleContainer) {
        if (!data || !data.id || Lampa.Storage.get('interface_logo_enabled') == '1') {
          return false;
        }
        
        // Сохраняем оригинальный текст для восстановления при отключении логотипов
        var titleText = data.title || '';
        titleContainer.data('original-title', titleText);
        
        // Сначала очищаем контейнер, чтобы не показывать текст до загрузки логотипа
        titleContainer.empty();
        
        // Проверяем кеш - если логотип уже загружен, используем его сразу
        if (logoCache[data.id]) {
          var cachedImageUrl = logoCache[data.id];
          var img = $('<img class="interface-logo-img" alt="' + titleText + '"/>');
          
          img.on('load', function() {
            logoLoaded = true;
          });
          
          img.on('error', function() {
            titleContainer.text(titleText);
            logoLoaded = false;
          });
          
          titleContainer.html(img);
          img.attr('src', cachedImageUrl);
          return true;
        }
        
        // Если в кеше нет, загружаем как обычно
        var type = data.name ? 'tv' : 'movie';
        var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));
        
        $.get(url, function(imagesData) {
          if (imagesData.logos && imagesData.logos[0]) {
            var logo = imagesData.logos[0].file_path;
            if (logo != '') {
              // Получаем настройки качества (размер фиксированный)
              var quality = Lampa.Storage.get('interface_logo_quality') || 'w500';
              
              // Определяем путь к изображению
              var imagePath = logo.replace('.svg', '.png');
              var imageUrl = Lampa.TMDB.image('/t/p/' + quality + imagePath);
              
              // Кешируем для будущего использования
              logoCache[data.id] = imageUrl;
              
              // Создаем элемент изображения
              var img = $('<img class="interface-logo-img" alt="' + titleText + '"/>');
              
              // Обработчик успешной загрузки изображения
              img.on('load', function() {
                logoLoaded = true;
              });
              
              // Обработчик ошибки загрузки изображения - показываем текст
              img.on('error', function() {
                titleContainer.text(titleText);
                logoLoaded = false;
              });
              
              // Вставляем изображение в контейнер и начинаем загрузку
              titleContainer.html(img);
              img.attr('src', imageUrl);
            } else {
              // Если логотип не найден, показываем текст
              logoCache[data.id] = null; // Помечаем как отсутствующий
              titleContainer.text(titleText);
            }
          } else {
            // Если логотип не найден, показываем текст
            logoCache[data.id] = null; // Помечаем как отсутствующий
            titleContainer.text(titleText);
          }
        }).fail(function() {
          // При ошибке загрузки API показываем текст
          logoCache[data.id] = null; // Помечаем как отсутствующий
          titleContainer.text(titleText);
        });
        
        return true;
      };

      this.update = function (data) {
        try {
          logoLoaded = false;
          // Сохраняем текущие данные для обновления логотипа
          this.currentData = data;
          
          var body = html.find('.new-interface-info__body');
          
          // Плавное исчезновение перед обновлением
          body.addClass('fade-out');
          
          setTimeout(function() {
            var headElement = html.find('.new-interface-info__head');
            var detailsElement = html.find('.new-interface-info__details');
            var titleContainer = html.find('.new-interface-info__title');
            var descriptionElement = html.find('.new-interface-info__description');
            
            // Добавляем fade-out для всех элементов
            headElement.addClass('fade-out');
            detailsElement.addClass('fade-out');
            titleContainer.addClass('fade-out');
            descriptionElement.addClass('fade-out');
            
            setTimeout(function() {
              headElement.text('---');
              detailsElement.text('---');
              
              // Пытаемся загрузить логотип, если не получится - покажем текст
              if (!loadLogo(data, titleContainer)) {
                titleContainer.text(data.title || '');
              }
              
              descriptionElement.text(data.overview || Lampa.Lang.translate('full_notext'));
              
              // Плавное появление после обновления
              body.removeClass('fade-out').addClass('fade-in');
              headElement.removeClass('fade-out').addClass('fade-in');
              detailsElement.removeClass('fade-out').addClass('fade-in');
              titleContainer.removeClass('fade-out').addClass('fade-in');
              descriptionElement.removeClass('fade-out').addClass('fade-in');
              
              setTimeout(function() {
                body.removeClass('fade-in');
                headElement.removeClass('fade-in');
                detailsElement.removeClass('fade-in');
                titleContainer.removeClass('fade-in');
                descriptionElement.removeClass('fade-in');
              }, 300);
            }, 150);
          }, 50);
          
        Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));
        this.load(data);
        } catch (e) {
          console.log('Interface', 'ERROR in update():', e);
        }
      };

      this.draw = function (data) {
        try {
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
          
          var headElement = html.find('.new-interface-info__head');
          var detailsElement = html.find('.new-interface-info__details');
          
          // Плавное обновление содержимого через классы
          headElement.addClass('fade-out');
          detailsElement.addClass('fade-out');
          
          setTimeout(function() {
            headElement.empty().append(head.join(', '));
            detailsElement.html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
            
            headElement.removeClass('fade-out').addClass('fade-in');
            detailsElement.removeClass('fade-out').addClass('fade-in');
            
            setTimeout(function() {
              headElement.removeClass('fade-in');
              detailsElement.removeClass('fade-in');
            }, 300);
          }, 150);
        } catch (e) {
          console.log('Interface', 'ERROR in draw():', e);
        }
      };

      this.load = function (data) {
        var _this = this;

        clearTimeout(timer);
        try {
        var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '?api_key=' + Lampa.TMDB.key() + '&append_to_response=content_ratings,release_dates&language=' + Lampa.Storage.get('language'));
          if (loaded[url]) {
            return this.draw(loaded[url]);
          }
        timer = setTimeout(function () {
          network.clear();
          network.timeout(5000);
          network.silent(url, function (movie) {
            loaded[url] = movie;
            _this.draw(movie);
          });
        }, 300);
        } catch (e) {
          console.log('Interface', 'ERROR in load():', e);
        }
      };

      this.render = function () {
        return html;
      };

      this.empty = function () {};
      
      // Функция для обновления логотипа при изменении настроек
      this.updateLogo = function(data) {
        if (!data || !data.id) return;
        
        var titleContainer = html.find('.new-interface-info__title');
        var img = titleContainer.find('.interface-logo-img');
        
        // Сохраняем оригинальный текст
        var titleText = data.title || '';
        titleContainer.data('original-title', titleText);
        
        // Если логотип уже отображается, обновляем его
        if (img.length > 0 && Lampa.Storage.get('interface_logo_enabled') != '1') {
          var quality = Lampa.Storage.get('interface_logo_quality') || 'w500';
          
          // Получаем текущий src и извлекаем путь к логотипу
          var currentSrc = img.attr('src');
          if (currentSrc) {
            var logoMatch = currentSrc.match(/\/(w\d+|original)(.+\.(png|jpg|jpeg))/i);
            if (logoMatch && logoMatch[2]) {
              var logoPath = logoMatch[2];
              var imagePath = logoPath.replace('.svg', '.png');
              var imageUrl = Lampa.TMDB.image('/t/p/' + quality + imagePath);
              
              // Обновляем кеш с новым качеством
              logoCache[data.id] = imageUrl;
              
              // Обновляем изображение
              img.attr('src', imageUrl + '?t=' + Date.now());
            }
          }
        } else if (Lampa.Storage.get('interface_logo_enabled') == '1') {
          // Если логотипы отключены, показываем текст
          titleContainer.find('.interface-logo-img').remove();
          titleContainer.text(titleText);
        } else {
          // Если логотип не отображается, но должен, загружаем его заново
          loadLogo(data, titleContainer);
        }
      };

      this.destroy = function () {
        html.remove();
        loaded = {};
        html = null;
      };
    }

    function component(object) {
      var network, scroll, items, html, active, newlampa, info, lezydata, viewall, background_img, background_last, background_timer;
      
      try {
        // Попытка найти activity в разных местах
        if (object && object.activity) {
          this.activity = object.activity;
        } else if (object && object.context && object.context.activity) {
          this.activity = object.context.activity;
        } else {
          // Попробуем получить activity из Lampa.Activity
          if (typeof Lampa !== 'undefined' && Lampa.Activity && Lampa.Activity.active) {
            try {
              var activeActivity = Lampa.Activity.active();
              if (activeActivity && activeActivity.activity) {
                this.activity = activeActivity.activity;
              }
            } catch (e) {
              console.log('Interface', 'ERROR getting activity from Lampa.Activity:', e);
            }
          }
        }
        
        network = new Lampa.Reguest();
        scroll = new Lampa.Scroll({
        mask: true,
        over: true,
        scroll_by_item: true
      });
        items = [];
        html = $('<div class="new-interface"><img class="full-start__background"></div>');
        active = 0;
        newlampa = Lampa.Manifest.app_digital >= 166;
        info = undefined;
        lezydata = undefined;
        viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        background_img = html.find('.full-start__background');
        background_last = '';
        background_timer = undefined;
      } catch (e) {
        console.log('Interface', 'ERROR in component() constructor:', e);
        throw e;
      }

      this.create = function () {};

      this.empty = function () {
        var button;

        try {
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
          
          if (this.activity && typeof this.activity.loader === 'function') {
        this.activity.loader(false);
          }
          
          if (this.activity && typeof this.activity.toggle === 'function') {
        this.activity.toggle();
          }
        } catch (e) {
          console.log('Interface', 'ERROR in empty():', e);
        }
      };

      this.loadNext = function () {
        var _this = this;

        if (this.next && !this.next_wait && items.length) {
          this.next_wait = true;
          this.next(function (new_data) {
            _this.next_wait = false;
            // Предзагружаем логотипы для новых карточек
            new_data.forEach(function(element) {
              if (element && element.id) {
                preloadLogo(element);
              }
            });
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

        try {
          if (!this.activity) {
            console.log('Interface', 'ERROR: this.activity is not defined');
            throw new Error('this.activity is not defined');
          }

        lezydata = data;
        info = new create(object);
        info.create();
        scroll.minus(info.render());
        
        // Предзагружаем логотипы для первых карточек
        var initialData = data.slice(0, viewall ? data.length : 2);
        initialData.forEach(function(element) {
          if (element && element.id) {
            preloadLogo(element);
          }
        });
          
        initialData.forEach(this.append.bind(this));
          
        html.append(info.render());
        html.append(scroll.render());

          // ВАЖНО: Добавляем HTML в activity.body
          if (this.activity && this.activity.body) {
            this.activity.body.empty().append(html);
          }

        if (newlampa) {
            if (typeof Lampa.Layer !== 'undefined') {
          Lampa.Layer.update(html);
          Lampa.Layer.visible(scroll.render(true));
            }
          scroll.onEnd = this.loadNext.bind(this);

          scroll.onWheel = function (step) {
            if (!Lampa.Controller.own(_this2)) _this2.start();
            if (step > 0) _this2.down();else if (active > 0) _this2.up();
          };
        }

          if (typeof this.activity.loader === 'function') {
        this.activity.loader(false);
          }
          
          if (typeof this.activity.toggle === 'function') {
        this.activity.toggle();
          }
        } catch (e) {
          console.log('Interface', 'ERROR in build():', e);
          console.log('Interface', 'ERROR message:', e.message);
          console.log('Interface', 'ERROR stack:', e.stack);
          throw e;
        }
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
          // Уменьшена задержка для более быстрой реакции
          setTimeout(function () {
            background_img[0].src = background_last;
          }, 50);
        }, 150);
      };

      this.append = function (element) {
        var _this3 = this;

        if (element.ready) return;
        element.ready = true;
        try {
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
            // Сохраняем текущие данные для обновления логотипа
            if (info && info.currentData) {
              info.currentData = elem;
            }
        };

        item.onHover = function (elem) {
          info.update(elem);
          _this3.background(elem);
            // Сохраняем текущие данные для обновления логотипа
            if (info && info.currentData) {
              info.currentData = elem;
            }
        };
        
        // Предзагружаем логотип при добавлении карточки
        if (element && element.id) {
          preloadLogo(element);
        }

        item.onFocusMore = info.empty.bind(info);
        scroll.append(item.render());
        items.push(item);
        } catch (e) {
          console.log('Interface', 'ERROR in append():', e);
        }
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
        var _this4 = this;

        try {
          if (typeof Lampa.Controller === 'undefined') {
            return;
          }

        Lampa.Controller.add('content', {
          link: this,
          toggle: function toggle() {
              try {
                if (_this4.activity && typeof _this4.activity.canRefresh === 'function' && _this4.activity.canRefresh()) {
                  return false;
                }
            if (items.length) {
              items[active].toggle();
                }
              } catch (e) {
                console.log('Interface', 'ERROR in toggle():', e);
            }
          },
          update: function update() {},
          left: function left() {
              try {
                if (typeof Navigator !== 'undefined' && Navigator.canmove && Navigator.canmove('left')) {
                  Navigator.move('left');
                } else {
                  Lampa.Controller.toggle('menu');
                }
              } catch (e) {
                console.log('Interface', 'ERROR in left():', e);
              }
          },
          right: function right() {
              try {
                if (typeof Navigator !== 'undefined' && Navigator.move) {
            Navigator.move('right');
                }
              } catch (e) {
                console.log('Interface', 'ERROR in right():', e);
              }
          },
          up: function up() {
              try {
                if (typeof Navigator !== 'undefined' && Navigator.canmove && Navigator.canmove('up')) {
                  Navigator.move('up');
                } else {
                  Lampa.Controller.toggle('head');
                }
              } catch (e) {
                console.log('Interface', 'ERROR in up():', e);
              }
          },
          down: function down() {
              try {
                if (typeof Navigator !== 'undefined' && Navigator.canmove && Navigator.canmove('down')) {
                  Navigator.move('down');
                }
              } catch (e) {
                console.log('Interface', 'ERROR in down():', e);
              }
          },
          back: this.back
        });
        Lampa.Controller.toggle('content');
        } catch (e) {
          console.log('Interface', 'ERROR in start():', e);
        }
      };

      this.refresh = function () {
        try {
          if (this.activity && typeof this.activity.loader === 'function') {
        this.activity.loader(true);
          }
          
          if (this.activity) {
        this.activity.need_refresh = true;
          }
        } catch (e) {
          console.log('Interface', 'ERROR in refresh():', e);
        }
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
        if (info) info.destroy();
        html.remove();
        items = null;
        network = null;
        lezydata = null;
      };
    }

    function startPlugin() {
      try {
        // Проверка наличия необходимых API
        if (typeof Lampa === 'undefined' || typeof Lampa.InteractionMain === 'undefined' || typeof Lampa.Template === 'undefined') {
          console.log('Interface', 'ERROR: Required Lampa APIs not available');
          return;
        }
        
      window.plugin_interface_ready = true;
      var old_interface = Lampa.InteractionMain;
      var new_interface = component;
      } catch (e) {
        console.log('Interface', 'ERROR in startPlugin():', e);
        return;
      }

      var wrappedInteractionMain = function (object) {
        var use = new_interface;
        var source = object ? object.source : 'unknown';
        var width = window.innerWidth;
        
        // Проверка source
        if (!(source == 'tmdb' || source == 'cub')) {
          use = old_interface;
        }
        
        // Проверка ширины
        if (width < 767) {
          use = old_interface;
        }
        
        // Проверка premium
        // try {
        //   if (typeof Lampa.Account !== 'undefined' && typeof Lampa.Account.hasPremium === 'function') {
        //     if (!Lampa.Account.hasPremium()) {
        //       use = old_interface;
        //     }
        //   }
        // } catch (e) {
        //   // Игнорируем ошибки проверки premium
        // }
        
        // Проверка версии приложения
        try {
          if (typeof Lampa.Manifest !== 'undefined' && typeof Lampa.Manifest.app_digital !== 'undefined') {
            if (Lampa.Manifest.app_digital < 153) {
              use = old_interface;
            }
          }
        } catch (e) {
          // Игнорируем ошибки проверки версии
        }
        
        try {
        return new use(object);
        } catch (e) {
          console.log('Interface', 'ERROR creating interface:', e);
          // Попробуем использовать старый интерфейс как fallback
          if (use === new_interface) {
            try {
              return new old_interface(object);
            } catch (e2) {
              throw e;
            }
          } else {
            throw e;
          }
        }
      };
      
       // Устанавливаем обертку с дополнительным логированием
       // Используем Proxy для отслеживания всех обращений к функции
       var proxiedWrapper = null;
       
       // Сначала оборачиваем старую функцию напрямую
       var originalInteractionMain = Lampa.InteractionMain;
       
       // Переопределяем Lampa.InteractionMain напрямую
       Lampa.InteractionMain = function() {
         // Вызываем нашу обертку
         if (new.target) {
           return new wrappedInteractionMain(...arguments);
         } else {
           return wrappedInteractionMain.apply(this, arguments);
         }
       };
       
       // Копируем свойства для совместимости
       Lampa.InteractionMain.prototype = originalInteractionMain.prototype;
       Lampa.InteractionMain._isWrapped = true;
       Lampa.InteractionMain._original = old_interface;
       
       try {
         proxiedWrapper = new Proxy(Lampa.InteractionMain, {
          apply: function(target, thisArg, argumentsList) {
            return target.apply(thisArg, argumentsList);
          },
          construct: function(target, argumentsList, newTarget) {
            return new target(...argumentsList);
          }
        });
        
        Lampa.InteractionMain = proxiedWrapper;
        proxiedWrapper._isWrapped = true;
        proxiedWrapper._original = old_interface;
      } catch (e) {
        // Если Proxy не поддерживается, используем прямую обертку
        // Lampa.InteractionMain уже установлен выше
      }
       
       wrappedInteractionMain._isWrapped = true;
       wrappedInteractionMain._original = old_interface;
      
       // Защита от перезаписи - проверяем каждые 2 секунды
       var checkInterval = setInterval(function() {
         var current = Lampa.InteractionMain;
         
         // Проверяем, что функция все еще наша
         if (!current._isWrapped) {
           // Восстанавливаем проксированную обертку или прямую обертку
           if (proxiedWrapper && proxiedWrapper._isWrapped) {
             Lampa.InteractionMain = proxiedWrapper;
           } else {
             // Пересоздаем прямую обертку
             Lampa.InteractionMain = function() {
               if (new.target) {
                 return new wrappedInteractionMain(...arguments);
               } else {
                 return wrappedInteractionMain.apply(this, arguments);
               }
             };
             Lampa.InteractionMain.prototype = originalInteractionMain.prototype;
             Lampa.InteractionMain._isWrapped = true;
             Lampa.InteractionMain._original = old_interface;
           }
         }
       }, 2000);
      
      // Останавливаем проверку через 60 секунд
      setTimeout(function() {
        clearInterval(checkInterval);
      }, 60000);
      
      // Перехватываем события Activity для отслеживания создания интерфейса
      if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        try {
          Lampa.Listener.follow('activity', function(e) {
            if (e.object) {
              
              // Особое внимание к компоненту main - там должен использоваться InteractionMain
              if (e.object.component === 'main' && (e.object.source === 'tmdb' || e.object.source === 'cub')) {
                // Проверяем, есть ли уже компонент
                if (e.object.activity && e.object.activity.component) {
                  // Сохраняем оригинальный компонент
                  var originalComponent = e.object.activity.component;
                  
                  // Пытаемся создать наш интерфейс
                  try {
                    var ourInterface = new component(e.object);
                    
                    // Заменяем компонент на наш интерфейс
                    // НО ТОЛЬКО если это событие create или start
                    if (e.type === 'create' || e.type === 'start') {
                      // Сохраняем оригинальные методы для fallback
                      if (!originalComponent._originalMethods) {
                        originalComponent._originalMethods = {
                          build: originalComponent.build,
                          render: originalComponent.render,
                          empty: originalComponent.empty
                        };
                      }
                      
                      // Заменяем методы компонента на методы нашего интерфейса
                      if (ourInterface.build) {
                        originalComponent.build = ourInterface.build.bind(ourInterface);
                      }
                      if (ourInterface.render) {
                        originalComponent.render = ourInterface.render.bind(ourInterface);
                      }
                      if (ourInterface.empty) {
                        originalComponent.empty = ourInterface.empty.bind(ourInterface);
                      }
                      if (ourInterface.start) {
                        originalComponent.start = ourInterface.start.bind(ourInterface);
                      }
                      
                      // Сохраняем ссылку на наш интерфейс
                      originalComponent._ourInterface = ourInterface;
                    }
                  } catch (err) {
                    console.log('Interface', 'ERROR creating our interface:', err);
                    console.log('Interface', 'ERROR stack:', err.stack);
                  }
                }
              }
              
              // Проверяем activity объект и компонент
              if (e.object.activity && e.object.activity.component) {
                // Пытаемся перехватить build метод компонента, если он есть
                if (e.object.activity.component && e.object.activity.component.build && typeof e.object.activity.component.build === 'function') {
                  // Проверяем, не обернули ли мы уже этот метод
                  if (!e.object.activity.component.build._isWrapped) {
                    var originalComponentBuild = e.object.activity.component.build;
                    e.object.activity.component.build = function(data) {
                      // Проверяем, есть ли наш интерфейс
                      if (this._ourInterface && typeof this._ourInterface.build === 'function') {
                        try {
                          return this._ourInterface.build(data);
                        } catch (err) {
                          console.log('Interface', 'ERROR in our interface build:', err);
                          // Fallback к оригинальному методу
                          if (this._originalMethods && this._originalMethods.build) {
                            return this._originalMethods.build.apply(this, arguments);
                          }
                          throw err;
                        }
                      } else {
                        // Используем оригинальный метод
                        return originalComponentBuild.apply(this, arguments);
                      }
                    };
                    e.object.activity.component.build._isWrapped = true;
                  }
                }
              }
            }
            
          });
        } catch (e) {
          console.log('Interface', 'ERROR setting up Activity listener:', e);
        }
      }
      

      Lampa.Template.add('new_interface_style', "\n        <style>\n        .new-interface .card--small.card--wide {\n            width: 18.3em;\n        }\n        \n        .new-interface-info {\n            position: relative;\n            padding: 1.5em;\n            height: 24em;\n        }\n        \n        .new-interface-info__body {\n            width: 80%;\n            padding-top: 1.1em;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__body.fade-out {\n            opacity: 0;\n            transform: translateY(-10px);\n        }\n        \n        .new-interface-info__body.fade-in {\n            opacity: 1;\n            transform: translateY(0);\n        }\n        \n        .new-interface-info__body > * {\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__head {\n            color: rgba(255, 255, 255, 0.6);\n            margin-bottom: 1em;\n            font-size: 1.3em;\n            min-height: 1em;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__head.fade-out {\n            opacity: 0;\n            transform: translateY(-5px);\n        }\n        \n        .new-interface-info__head.fade-in {\n            opacity: 1;\n            transform: translateY(0);\n        }\n        \n        .new-interface-info__head span {\n            color: #fff;\n        }\n        \n        .new-interface-info__title {\n            font-size: 4em;\n            font-weight: 600;\n            margin-bottom: 0.3em;\n            overflow: hidden;\n            -o-text-overflow: \".\";\n            text-overflow: \".\";\n            display: -webkit-box;\n            -webkit-line-clamp: 1;\n            line-clamp: 1;\n            -webkit-box-orient: vertical;\n            margin-left: -0.03em;\n            line-height: 1.3;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__title.fade-out {\n            opacity: 0;\n            transform: translateY(-5px);\n        }\n        \n        .new-interface-info__title.fade-in {\n            opacity: 1;\n            transform: translateY(0);\n        }\n        \n        /* Стили для логотипа в интерфейсе - фиксированный размер */\n        .interface-logo-img {\n            display: block;\n            margin-top: 0.3em;\n            width: auto;\n            height: 125px;\n            max-width: 100%;\n            object-fit: contain;\n            object-position: left center;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n            opacity: 0;\n            animation: fadeInLogo 0.4s ease forwards;\n        }\n        \n        @keyframes fadeInLogo {\n            from {\n                opacity: 0;\n                transform: translateY(-10px);\n            }\n            to {\n                opacity: 1;\n                transform: translateY(0);\n            }\n        }\n        \n        /* Адаптивность для разных устройств */\n        @media (max-width: 767px) {\n            .interface-logo-img {\n                height: 80px !important;\n            }\n        }\n        \n        @media (min-width: 768px) and (max-width: 1279px) {\n            .interface-logo-img {\n                height: 150px;\n            }\n        }\n        \n        @media (min-width: 1920px) {\n            .interface-logo-img {\n                height: 180px;\n            }\n        }\n        \n        @media (min-width: 3840px) {\n            .interface-logo-img {\n                height: 240px;\n            }\n        }\n        \n        .new-interface-info__details {\n            margin-bottom: 1.6em;\n            display: -webkit-box;\n            display: -webkit-flex;\n            display: -moz-box;\n            display: -ms-flexbox;\n            display: flex;\n            -webkit-box-align: center;\n            -webkit-align-items: center;\n            -moz-box-align: center;\n            -ms-flex-align: center;\n            align-items: center;\n            -webkit-flex-wrap: wrap;\n            -ms-flex-wrap: wrap;\n            flex-wrap: wrap;\n            min-height: 1.9em;\n            font-size: 1.1em;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__details.fade-out {\n            opacity: 0;\n            transform: translateY(-5px);\n        }\n        \n        .new-interface-info__details.fade-in {\n            opacity: 1;\n            transform: translateY(0);\n        }\n        \n        .new-interface-info__split {\n            margin: 0 1em;\n            font-size: 0.7em;\n        }\n        \n        .new-interface-info__description {\n            font-size: 1.2em;\n            font-weight: 300;\n            line-height: 1.5;\n            overflow: hidden;\n            -o-text-overflow: \".\";\n            text-overflow: \".\";\n            display: -webkit-box;\n            -webkit-line-clamp: 4;\n            line-clamp: 4;\n            -webkit-box-orient: vertical;\n            width: 70%;\n            transition: opacity 0.3s ease, transform 0.3s ease;\n        }\n        \n        .new-interface-info__description.fade-out {\n            opacity: 0;\n            transform: translateY(-5px);\n        }\n        \n        .new-interface-info__description.fade-in {\n            opacity: 1;\n            transform: translateY(0);\n        }\n        \n        .new-interface .card-more__box {\n            padding-bottom: 95%;\n        }\n        \n        .new-interface .full-start__background {\n            height: 108%;\n            top: -6em;\n        }\n        \n        .new-interface .full-start__rate {\n            font-size: 1.3em;\n            margin-right: 0;\n        }\n        \n        .new-interface .card__promo {\n            display: none;\n        }\n        \n        .new-interface .card.card--wide+.card-more .card-more__box {\n            padding-bottom: 95%;\n        }\n        \n        .new-interface .card.card--wide .card-watched {\n            display: none !important;\n        }\n        \n        body.light--version .new-interface-info__body {\n            width: 69%;\n            padding-top: 1.5em;\n        }\n        \n        body.light--version .new-interface-info {\n            height: 25.3em;\n        }\n\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{\n            animation: animation-card-focus 0.2s\n        }\n        body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{\n            animation: animation-trigger-enter 0.2s forwards\n        }\n        </style>\n    ");
      $('body').append(Lampa.Template.get('new_interface_style', {}, true));
      
      // Настройка: показывать/скрывать логотипы в интерфейсе
      Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
          name: 'interface_logo_enabled',
          type: 'select',
          values: {
            1: 'Скрыть',
            0: 'Отображать',
          },
          default: '0',
        },
        field: {
          name: 'Логотипы вместо названий в меню',
          description: 'Отображает логотипы фильмов вместо текста в главном меню',
        }
      });
      
      // Настройка: качество логотипа в интерфейсе
      Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
          name: 'interface_logo_quality',
          type: 'select',
          values: {
            'w300': 'Низкое (w300)',
            'w500': 'Среднее (w500)',
            'w780': 'Высокое (w780)',
            'original': 'Оригинал',
          },
          default: 'w500',
        },
        field: {
          name: 'Качество логотипа в меню',
          description: 'Качество загружаемого изображения логотипа в главном меню',
        }
      });
      
      // Слушаем изменения настроек логотипов для обновления
      if (typeof Lampa !== 'undefined' && Lampa.Storage && Lampa.Storage.listener) {
        Lampa.Storage.listener.follow('change', function(e) {
          if (e.name === 'interface_logo_quality' || e.name === 'interface_logo_enabled') {
            // Очищаем кеш при изменении качества, чтобы перезагрузить с новым качеством
            if (e.name === 'interface_logo_quality') {
              logoCache = {};
            }
            setTimeout(function() {
              // Обновляем все видимые логотипы в новом интерфейсе
              $('.new-interface-info__title').each(function() {
                var titleContainer = $(this);
                var img = titleContainer.find('.interface-logo-img');
                
                if (img.length > 0 && Lampa.Storage.get('interface_logo_enabled') != '1') {
                  var quality = Lampa.Storage.get('interface_logo_quality') || 'w500';
                  
                  var currentSrc = img.attr('src');
                  if (currentSrc) {
                    var logoMatch = currentSrc.match(/\/(w\d+|original)(.+\.(png|jpg|jpeg))/i);
                    if (logoMatch && logoMatch[2]) {
                      var logoPath = logoMatch[2];
                      var imagePath = logoPath.replace('.svg', '.png');
                      var imageUrl = Lampa.TMDB.image('/t/p/' + quality + imagePath);
                      
                      img.attr('src', imageUrl + '?t=' + Date.now());
                    }
                  }
                } else if (Lampa.Storage.get('interface_logo_enabled') == '1') {
                  // Если логотипы отключены, удаляем их и показываем текст
                  var titleText = titleContainer.data('original-title') || '';
                  titleContainer.find('.interface-logo-img').remove();
                  if (titleText) {
                    titleContainer.text(titleText);
                  }
                }
              });
            }, 100);
          }
        });
      }
    }

    if (!window.plugin_interface_ready) {
      try {
        startPlugin();
      } catch (e) {
        console.log('Interface', 'ERROR initializing plugin:', e);
      }
    }

})();
