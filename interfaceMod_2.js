(function () {
    'use strict';

    // ============================================
    // THEME MANAGER - Керування кольоровими темами
    // ============================================
    var ThemeManager = {
        themes: {
            default: {
                primary: '#6666ff',
                secondary: '#ff66a8',
                accent: '#00d9ff',
                gradient: 'linear-gradient(135deg, #6666ff 0%, #ff66a8 100%)'
            },
            sunset: {
                primary: '#ff6b6b',
                secondary: '#feca57',
                accent: '#ee5a6f',
                gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)'
            },
            ocean: {
                primary: '#4facfe',
                secondary: '#00f2fe',
                accent: '#43e97b',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
            },
            forest: {
                primary: '#11998e',
                secondary: '#38ef7d',
                accent: '#89f7fe',
                gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
            },
            purple: {
                primary: '#a044ff',
                secondary: '#6a3093',
                accent: '#e94057',
                gradient: 'linear-gradient(135deg, #a044ff 0%, #6a3093 100%)'
            }
        },

        getCurrentTheme: function () {
            var themeName = Lampa.Storage.get('enhanced_interface_theme', 'default');
            return this.themes[themeName] || this.themes.default;
        },

        applyTheme: function () {
            var theme = this.getCurrentTheme();
            var root = document.documentElement;
            root.style.setProperty('--ei-primary', theme.primary);
            root.style.setProperty('--ei-secondary', theme.secondary);
            root.style.setProperty('--ei-accent', theme.accent);
            root.style.setProperty('--ei-gradient', theme.gradient);
        }
    };

    // ============================================
    // ANIMATION MANAGER - Керування анімаціями
    // ============================================
    var AnimationManager = {
        animateElement: function (element, animation, duration) {
            duration = duration || 600;
            element.css('animation', animation + ' ' + duration + 'ms ease-out');
            setTimeout(function () {
                element.css('animation', '');
            }, duration);
        },

        fadeIn: function (element, duration) {
            this.animateElement(element, 'fadeIn', duration);
        },

        slideUp: function (element, duration) {
            this.animateElement(element, 'slideUp', duration);
        },

        scale: function (element, duration) {
            this.animateElement(element, 'scaleIn', duration);
        }
    };

    // ============================================
    // ENHANCED INFO COMPONENT
    // ============================================
    function EnhancedInfoCreate() {
        var html;
        var timer;
        var network = new Lampa.Reguest();
        var loaded = {};
        var ratingStars;

        this.create = function () {
            html = $(`<div class="new-interface-info enhanced-interface-info">
                <div class="new-interface-info__body">
                    <div class="ei-badge-container"></div>
                    <div class="new-interface-info__head"></div>
                    <div class="new-interface-info__title"></div>
                    <div class="new-interface-info__rating">
                        <div class="ei-stars"></div>
                        <div class="ei-rating-value"></div>
                    </div>
                    <div class="new-interface-info__details"></div>
                    <div class="ei-additional-info"></div>
                    <div class="new-interface-info__description"></div>
                </div>
                <div class="ei-glow-effect"></div>
            </div>`);

            // Створюємо анімовані зірки рейтингу
            ratingStars = html.find('.ei-stars');
            for (var i = 0; i < 5; i++) {
                ratingStars.append('<span class="ei-star">★</span>');
            }

            AnimationManager.fadeIn(html, 800);
        };

        this.update = function (data) {
            html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            html.find('.new-interface-info__title').text(data.title || data.name);
            html.find('.new-interface-info__description').text(data.overview || Lampa.Lang.translate('full_notext'));

            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w200'));

            this.load(data);
            AnimationManager.slideUp(html.find('.new-interface-info__title'), 400);
        };

        this.updateRating = function (vote) {
            var rating = parseFloat(vote || 0);
            var stars = Math.round(rating / 2);

            html.find('.ei-rating-value').text(rating.toFixed(1));

            html.find('.ei-star').each(function (index) {
                var star = $(this);
                if (index < stars) {
                    star.addClass('ei-star--filled');
                    setTimeout(function () {
                        star.addClass('ei-star--animate');
                    }, index * 100);
                } else {
                    star.removeClass('ei-star--filled ei-star--animate');
                }
            });
        };

        this.draw = function (data) {
            var create = ((data.release_date || data.first_air_date || '0000') + '').slice(0, 4);
            var vote = parseFloat((data.vote_average || 0) + '').toFixed(1);
            var head = [];
            var details = [];
            var additionalInfo = [];
            var countries = Lampa.Api.sources.tmdb.parseCountries(data);
            var pg = Lampa.Api.sources.tmdb.parsePG(data);

            // Обчислення тривалості
            var hoursMinutes = '';
            if (data.runtime) {
                var hours = Math.floor(data.runtime / 60);
                var minutes = data.runtime % 60;
                hoursMinutes = hours + 'ч ' + minutes + 'хв';
            }

            // Badges
            var badgeContainer = html.find('.ei-badge-container');
            badgeContainer.empty();

            if (data.vote_average >= 8) {
                badgeContainer.append('<span class="ei-badge ei-badge--gold">★ Топ</span>');
            }
            if (create === new Date().getFullYear().toString()) {
                badgeContainer.append('<span class="ei-badge ei-badge--new">Новинка</span>');
            }

            // Head info
            if (create !== '0000') head.push('<span class="ei-year">' + create + '</span>');
            if (countries.length > 0) head.push(countries.join(', '));

            // Details
            if (pg) details.push('<span class="ei-pg">' + pg + '</span>');
            if (hoursMinutes) details.push('<span class="ei-duration">⏱ ' + hoursMinutes + '</span>');
            if (data.number_of_seasons) {
                details.push('<span class="ei-seasons">📺 Сезонів: ' + data.number_of_seasons + '</span>');
            }

            if (data.genres && data.genres.length > 0 && Lampa.Storage.field('Genres') !== false) {
                var genresHtml = data.genres.slice(0, 3).map(function (item) {
                    return '<span class="ei-genre">' + Lampa.Utils.capitalizeFirstLetter(item.name) + '</span>';
                }).join('');
                details.push(genresHtml);
            }

            // Additional info (director, cast, etc.)
            if (data.created_by && data.created_by.length > 0) {
                additionalInfo.push('👤 ' + data.created_by[0].name);
            }
            if (data.production_companies && data.production_companies.length > 0) {
                additionalInfo.push('🎬 ' + data.production_companies[0].name);
            }

            html.find('.new-interface-info__head').empty().html(head.join(' <span class="ei-separator">•</span> '));
            html.find('.new-interface-info__details').html(details.join(' <span class="ei-separator">•</span> '));
            html.find('.ei-additional-info').html(additionalInfo.join(' <span class="ei-separator">•</span> '));

            this.updateRating(vote);
        };

        this.load = function (data) {
            var _this = this;
            clearTimeout(timer);

            var url = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id +
                '?api_key=' + Lampa.TMDB.key() +
                '&append_to_response=content_ratings,release_dates,credits' +
                '&language=' + Lampa.Storage.get('language'));

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

        this.empty = function () { };

        this.destroy = function () {
            html.remove();
            loaded = {};
            network.clear();
            html = null;
        };
    }

    // ============================================
    // ENHANCED COMPONENT
    // ============================================
    function EnhancedComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            scroll_by_item: true
        });
        var items = [];
        var html = $('<div class="new-interface enhanced-interface"><img class="full-start__background ei-background"></div>');
        var active = 0;
        var newlampa = Lampa.Manifest.app_digital >= 166;
        var info;
        var lezydata;
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';
        var background_img = html.find('.ei-background');
        var background_last = '';
        var background_timer;

        this.create = function () {
            ThemeManager.applyTheme();
        };

        this.empty = function () {
            var button;

            if (object.source == 'tmdb') {
                button = $('<div class="empty__footer"><div class="simple-button selector">' +
                    Lampa.Lang.translate('change_source_on_cub') + '</div></div>');
                button.find('.selector').on('hover:enter', function () {
                    Lampa.Storage.set('source', 'cub');
                    Lampa.Activity.replace({ source: 'cub' });
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

        this.push = function () { };

        this.build = function (data) {
            var _this = this;

            lezydata = data;
            info = new EnhancedInfoCreate(object);
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
                    if (!Lampa.Controller.own(_this)) _this.start();
                    if (step > 0) _this.down();
                    else if (active > 0) _this.up();
                };
            }

            this.activity.loader(false);
            this.activity.toggle();

            // Анімація появи
            setTimeout(function () {
                html.addClass('ei-loaded');
            }, 100);
        };

        this.background = function (elem) {
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');
            clearTimeout(background_timer);
            if (new_background == background_last) return;

            background_timer = setTimeout(function () {
                background_img.removeClass('ei-bg-loaded');

                background_img[0].onload = function () {
                    background_img.addClass('ei-bg-loaded');
                };

                background_img[0].onerror = function () {
                    background_img.removeClass('ei-bg-loaded');
                };

                background_last = new_background;
                setTimeout(function () {
                    background_img[0].src = background_last;
                }, 300);
            }, 800);
        };

        this.append = function (element) {
            var _this = this;

            if (element.ready) return;
            element.ready = true;

            var item = new Lampa.InteractionLine(element, {
                url: element.url,
                card_small: true,
                cardClass: element.cardClass,
                genres: object.genres,
                object: object,
                card_wide: Lampa.Storage.field('WidePosters'),
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
                _this.background(elem);
            };

            item.onHover = function (elem) {
                info.update(elem);
                _this.background(elem);
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
            var _this = this;

            Lampa.Controller.add('content', {
                link: this,
                toggle: function toggle() {
                    if (_this.activity.canRefresh()) return false;
                    if (items.length) {
                        items[active].toggle();
                    }
                },
                update: function update() { },
                left: function left() {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: function right() {
                    Navigator.move('right');
                },
                up: function up() {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function down() {
                    if (Navigator.canmove('down')) Navigator.move('down');
                },
                back: this.back
            });
            Lampa.Controller.toggle('content');
        };

        this.refresh = function () {
            this.activity.loader(true);
            this.activity.need_refresh = true;
        };

        this.pause = function () { };
        this.stop = function () { };

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

    // ============================================
    // PLUGIN INITIALIZATION
    // ============================================
    function startPlugin() {
        window.plugin_enhanced_interface_ready = true;

        var old_interface = Lampa.InteractionMain;
        var new_interface = EnhancedComponent;

        // Додавання налаштувань
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'enhanced_interface_theme',
                type: 'select',
                values: {
                    default: 'За замовчуванням (Фіолетовий)',
                    sunset: 'Захід сонця (Помаранчевий)',
                    ocean: 'Океан (Синій)',
                    forest: 'Ліс (Зелений)',
                    purple: 'Пурпур'
                },
                default: 'default'
            },
            field: {
                name: 'Кольорова тема',
                description: 'Виберіть кольорову схему інтерфейсу'
            },
            onChange: function (value) {
                ThemeManager.applyTheme();
                Lampa.Settings.update();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'WidePosters',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Широкі постери',
                description: 'Використовувати широкий формат постерів'
            },
            onChange: function (value) {
                Lampa.Settings.update();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'Genres',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Показувати жанри',
                description: 'Відображати жанри в деталях'
            },
            onChange: function (value) {
                Lampa.Settings.update();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'HeightControl',
                type: 'select',
                values: {
                    Control_Low: 'Низьке',
                    Control_Middle: 'Середнє'
                },
                default: 'Control_Middle'
            },
            field: {
                name: 'Положення стрічки',
                description: 'Положення постерів відносно опису'
            },
            onChange: function (value) {
                Lampa.Settings.update();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'enhanced_animations',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Анімації',
                description: 'Увімкнути плавні анімації та переходи'
            },
            onChange: function (value) {
                if (value) {
                    $('body').addClass('ei-animations-enabled');
                } else {
                    $('body').removeClass('ei-animations-enabled');
                }
                Lampa.Settings.update();
            }
        });

        // Заміна основного інтерфейсу
        Lampa.InteractionMain = function (object) {
            var use = new_interface;
            var reasons = [];

            // Debug logging
            console.log('[Enhanced Interface] Checking activation conditions...');
            console.log('[Enhanced Interface] Source:', object.source);
            console.log('[Enhanced Interface] Window width:', window.innerWidth);
            console.log('[Enhanced Interface] Lampa version:', Lampa.Manifest.app_digital);

            if (!(object.source == 'tmdb' || object.source == 'cub')) {
                use = old_interface;
                reasons.push('source not TMDB/CUB');
            }
            if (window.innerWidth < 767) {
                use = old_interface;
                reasons.push('screen too narrow');
            }
            if (Lampa.Manifest.app_digital < 153) {
                use = old_interface;
                reasons.push('Lampa version too old');
            }
            if (Lampa.Platform.screen('mobile')) {
                use = old_interface;
                reasons.push('mobile platform');
            }

            if (use === new_interface) {
                console.log('[Enhanced Interface] ✅ ACTIVATED!');
            } else {
                console.log('[Enhanced Interface] ❌ NOT activated. Reasons:', reasons.join(', '));
            }

            return new use(object);
        };

        // Застосування теми при завантаженні
        ThemeManager.applyTheme();

        // Додавання класу для анімацій
        if (Lampa.Storage.field('enhanced_animations') !== false) {
            $('body').addClass('ei-animations-enabled');
        }

        // Ін'єкція стилів
        injectStyles();
    }

    // ============================================
    // STYLES INJECTION
    // ============================================
    function injectStyles() {
        var heightValue = Lampa.Storage.field('HeightControl') == 'Control_Low' ? '23' : '20';
        var posterWidth = Lampa.Storage.field('WidePosters') ? '18.3em' : '18.3em';
        var cardPadding = Lampa.Storage.field('WidePosters') ? '95%' : '150%';

        var styles = `
        <style id="enhanced-interface-styles">
        /* ============================================ */
        /* CSS VARIABLES */
        /* ============================================ */
        :root {
            --ei-primary: #6666ff;
            --ei-secondary: #ff66a8;
            --ei-accent: #00d9ff;
            --ei-gradient: linear-gradient(135deg, #6666ff 0%, #ff66a8 100%);
            --ei-transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            --ei-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            --ei-glow: 0 0 20px rgba(102, 102, 255, 0.3);
        }

        /* ============================================ */
        /* ANIMATIONS */
        /* ============================================ */
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @keyframes slideUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes scaleIn {
            from {
                transform: scale(0.9);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        @keyframes shimmer {
            0% {
                background-position: -1000px 0;
            }
            100% {
                background-position: 1000px 0;
            }
        }

        @keyframes glow {
            0%, 100% {
                opacity: 0.5;
            }
            50% {
                opacity: 1;
            }
        }

        @keyframes starFill {
            from {
                transform: scale(0) rotate(-180deg);
                opacity: 0;
            }
            to {
                transform: scale(1) rotate(0deg);
                opacity: 1;
            }
        }

        /* ============================================ */
        /* MAIN INTERFACE */
        /* ============================================ */
        .enhanced-interface {
            position: relative;
            overflow: hidden;
        }

        .enhanced-interface.ei-loaded .new-interface-info {
            animation: fadeIn 0.8s ease-out;
        }

        .enhanced-interface .ei-background {
            height: 108%;
            top: -6em;
            transition: var(--ei-transition);
            filter: blur(0px);
            transform: scale(1);
        }

        .enhanced-interface .ei-background.ei-bg-loaded {
            filter: blur(8px);
            transform: scale(1.05);
        }

        /* ============================================ */
        /* INFO PANEL */
        /* ============================================ */
        .new-interface-info {
            position: relative;
            padding: 1.5em;
            height: ${heightValue}em;
            z-index: 2;
        }

        .new-interface-info__body {
            width: 80%;
            padding-top: 1.1em;
            position: relative;
            z-index: 3;
        }

        /* Glassmorphism effect */
        .enhanced-interface-info .new-interface-info__body::before {
            content: '';
            position: absolute;
            top: -1em;
            left: -1em;
            right: -1em;
            bottom: -1em;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: -1;
            opacity: 0;
            transition: var(--ei-transition);
        }

        body.ei-animations-enabled .enhanced-interface-info:hover .new-interface-info__body::before {
            opacity: 1;
        }

        /* Glow effect */
        .ei-glow-effect {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--ei-gradient);
            opacity: 0;
            filter: blur(100px);
            animation: glow 3s ease-in-out infinite;
            pointer-events: none;
            z-index: 1;
        }

        /* Badges */
        .ei-badge-container {
            display: flex;
            gap: 0.8em;
            margin-bottom: 1em;
            flex-wrap: wrap;
        }

        .ei-badge {
            padding: 0.4em 1em;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
            display: inline-block;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: scaleIn 0.4s ease-out;
        }

        .ei-badge--gold {
            background: linear-gradient(135deg, #f9d423 0%, #ff4e50 100%);
            box-shadow: 0 4px 15px rgba(249, 212, 35, 0.4);
        }

        .ei-badge--new {
            background: var(--ei-gradient);
            box-shadow: 0 4px 15px rgba(102, 102, 255, 0.4);
        }

        /* Head */
        .new-interface-info__head {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 1em;
            font-size: 1.3em;
            min-height: 1em;
        }

        .new-interface-info__head .ei-year {
            color: #fff;
            font-weight: 600;
            background: var(--ei-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .ei-separator {
            color: rgba(255, 255, 255, 0.3);
            margin: 0 0.5em;
        }

        /* Title */
        .new-interface-info__title {
            font-size: 4em;
            font-weight: 700;
            margin-bottom: 0.3em;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            -webkit-box-orient: vertical;
            margin-left: -0.03em;
            line-height: 1.3;
            background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 2px 20px rgba(255, 255, 255, 0.3);
        }

        /* Rating Stars */
        .new-interface-info__rating {
            display: flex;
            align-items: center;
            gap: 1em;
            margin-bottom: 1em;
        }

        .ei-stars {
            display: flex;
            gap: 0.3em;
        }

        .ei-star {
            font-size: 1.8em;
            color: rgba(255, 255, 255, 0.2);
            transition: var(--ei-transition);
            display: inline-block;
        }

        .ei-star--filled {
            color: #ffd700;
            filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
        }

        body.ei-animations-enabled .ei-star--animate {
            animation: starFill 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .ei-rating-value {
            font-size: 1.8em;
            font-weight: 700;
            color: #ffd700;
            text-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
        }

        /* Details */
        .new-interface-info__details {
            margin-bottom: 1.2em;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.8em;
            min-height: 1.9em;
            font-size: 1.1em;
        }

        .ei-pg, .ei-duration, .ei-seasons {
            padding: 0.3em 0.8em;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.95em;
        }

        .ei-genre {
            padding: 0.3em 0.8em;
            background: rgba(102, 102, 255, 0.2);
            border-radius: 8px;
            border: 1px solid rgba(102, 102, 255, 0.3);
            font-size: 0.9em;
            transition: var(--ei-transition);
        }

        body.ei-animations-enabled .ei-genre:hover {
            background: rgba(102, 102, 255, 0.3);
            transform: translateY(-2px);
        }

        /* Additional Info */
        .ei-additional-info {
            margin-bottom: 1.2em;
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.05em;
        }

        /* Description */
        .new-interface-info__description {
            font-size: 1.2em;
            font-weight: 300;
            line-height: 1.6;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            line-clamp: 4;
            -webkit-box-orient: vertical;
            width: 70%;
            color: rgba(255, 255, 255, 0.85);
        }

        /* ============================================ */
        /* CARDS */
        /* ============================================ */
        .new-interface .card--small.card--wide {
            width: ${posterWidth};
            transition: var(--ei-transition);
        }

        body.ei-animations-enabled .new-interface .card--small.card--wide:hover {
            transform: translateY(-8px) scale(1.05);
            box-shadow: var(--ei-shadow), var(--ei-glow);
        }

        .new-interface .card-more__box {
            padding-bottom: ${cardPadding};
        }

        .new-interface .card.card--wide + .card-more .card-more__box {
            padding-bottom: 95%;
        }

        .new-interface .card.card--wide .card-watched {
            display: none !important;
        }

        .new-interface .card__promo {
            display: none;
        }

        /* Card overlay effect */
        .new-interface .card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--ei-gradient);
            opacity: 0;
            transition: var(--ei-transition);
            border-radius: inherit;
            pointer-events: none;
        }

        body.ei-animations-enabled .new-interface .card.focus::after {
            opacity: 0.2;
        }

        /* ============================================ */
        /* RATE DISPLAY */
        /* ============================================ */
        .new-interface .full-start__rate {
            font-size: 1.3em;
            margin-right: 0;
            padding: 0.5em 1em;
            background: rgba(255, 215, 0, 0.15);
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 215, 0, 0.3);
        }

        .new-interface .full-start__rate > div:first-child {
            color: #ffd700;
            text-shadow: 0 2px 10px rgba(255, 215, 0, 0.5);
        }

        /* ============================================ */
        /* LIGHT VERSION ADJUSTMENTS */
        /* ============================================ */
        body.light--version .new-interface-info__body {
            width: 69%;
            padding-top: 1.5em;
        }

        body.light--version .new-interface-info {
            height: 25.3em;
        }

        body.light--version .new-interface-info__title {
            color: #1a1a1a;
            background: linear-gradient(135deg, #1a1a1a 0%, rgba(26, 26, 26, 0.8) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        body.light--version .ei-badge {
            color: #1a1a1a;
        }

        /* ============================================ */
        /* RESPONSIVE */
        /* ============================================ */
        @media screen and (max-width: 1280px) {
            .new-interface-info__title {
                font-size: 3em;
            }
            
            .new-interface-info__description {
                width: 80%;
            }
        }

        @media screen and (max-width: 767px) {
            .enhanced-interface {
                display: none;
            }
        }
        </style>
        `;

        $('#enhanced-interface-styles').remove();
        $('body').append(styles);
    }

    // ============================================
    // AUTO-START
    // ============================================
    if (!window.plugin_enhanced_interface_ready) {
        startPlugin();
    }

})();
