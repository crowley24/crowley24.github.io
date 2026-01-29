(function() {  
    'use strict';  
  
    // Конфігурація для відображення українського прапора  
    var UKRAINE_FLAG_CONFIG = {  
        DISPLAY_MODE: 'flag_only', // 'flag_only', 'flag_count', 'text'  
        SHOW_FOR_MOVIES: true,  
        SHOW_FOR_TV_SERIES: true,  
        // Ручні перевизначення для конкретних ID  
        MANUAL_OVERRIDES: {  
            // 'ID_ФІЛЬМУ': { has_ukrainian: true },  
            // 'ID_СЕРІАЛУ': { has_ukrainian: false }  
        }  
    };  
  
    // Основна функція застосування стилів та шаблонів  
    function applyStyleAndTemplates() {  
        // Перевіряємо, чи вже додані стилі  
        if (document.getElementById('maxsm_lich_style')) {  
            return;  
        }  
          
        // Видаляємо старі стилі, якщо jQuery доступний  
        if (typeof window.$ !== 'undefined' && window.$ && window.$.fn) {  
            $('#maxsm_lich_style').remove();  
        }  
          
        // Створюємо елемент стилів  
        var style = document.createElement('style');  
        style.id = 'maxsm_lich_style';  
          
        // Оптимізовані об'єднані стилі з додатком прапора  
        var css = '' +      
            // Іконки закладок і т.д.  
            '.card__icons {' +  
                'top: 5em;' +  
            '}' +  
              
            // Рейтинг  
            '.card__vote {' +  
                'bottom: auto;' +  
                'top: 0.8em;' +  
                'right: 0em;' +   
                'left: auto;' +  
                'background: #000;' +  
                'color: #fff;' +  
                'padding: 0.4em 0.4em;' +  
                'border-radius: 0.3em 0 0 0.3em;' +  
                'font-weight: 700;' +  
                'font-size: 1.2em;' +  
            '}' +  
                         
            // Якість  
            '.card__quality {' +  
                'background-color: #ffc107;' +   
                'color: #000;' +   
                'bottom: auto;' +   
                'top: 4.2em;' +   
                'right: 0em;' +   
                'left: auto;' +  
                'border-radius: 0.3em 0 0 0.3em;' +  
                'font-weight: 700;' +  
                'font-size: 0.8em;' +  
            '}' +  
              
            // Тип серіал  
            '.card--tv .card__type {' +  
                'background-color: #dc3545;' +    
                'bottom: auto;' +   
                'top: 4.2em;' +   
                'right: 0em;' +   
                'left: auto;' +  
                'border-radius: 0.3em 0 0 0.3em;' +  
                'font-weight: 700;' +  
                'font-size: 0.8em;' +  
            '}' +  
  
            // Вік  
            '.card__age {' +  
                'position: absolute;' +  
                'bottom: 1.2em;' +  
                'top: auto;' +  
                'right: 0em;' +   
                'left: auto;' +  
                'background: #000;' +  
                'color: #fff;' +  
                'padding: 0.4em 0.4em;' +  
                'border-radius: 0.3em 0 0 0.3em;' +  
                'font-weight: 700;' +  
                'font-size: 0.8em;' +  
            '}' +  
  
            // === НОВЕ: Бейдж українського прапора ===  
            '.card__ukraine-badge {' +  
                'position: absolute !important;' +  
                'left: 0.3em !important;' +  
                'top: 0.3em !important;' +  
                'background: rgba(0,0,0,0.7) !important;' +  
                'color: #FFFFFF !important;' +  
                'font-size: 1.1em !important;' +  
                'padding: 0.2em 0.4em !important;' +  
                'border-radius: 0.8em !important;' +  
                'font-weight: 700 !important;' +  
                'z-index: 25 !important;' +  
                'display: flex !important;' +  
                'align-items: center !important;' +  
                'gap: 3px !important;' +  
                'min-width: fit-content !important;' +  
            '}' +  
  
            // CSS для прапора  
            '.card__ukraine-badge .flag-css {' +  
                'display: inline-block;' +  
                'width: 1.2em;' +  
                'height: 0.7em;' +  
                'vertical-align: middle;' +  
                'background: linear-gradient(to bottom, #0057B7 0%, #0057B7 50%, #FFD700 50%, #FFD700 100%);' +  
                'border-radius: 1px;' +  
                'border: none !important;' +  
                'box-shadow: 0 0 1px 0 rgba(0,0,0,0.6), inset 0px 1px 0px 0px #004593, inset 0px -1px 0px 0px #D0A800;' +  
            '}' +  
              
            // Заголовок картки максимум 3 рядки  
            '.card__title {' +  
                'height: 3.6em;' +  
                'text-overflow: ellipsis;' +  
                '-webkit-line-clamp: 3;' +  
                'line-clamp: 3;' +  
            '}' +  
              
            // Відстань між рядами  
            '.items-line.items-line--type-cards + .items-line.items-line--type-cards {' +  
                'margin-top: 1em;' +  
            '}' +  
            '.card--small .card__view {' +  
                'margin-bottom: 2em;' +  
            '}' +  
            '.items-line--type-cards {' +  
                'min-height: 18em;' +  
            '}' +  
              
            // Зміщення наповнення картки вниз для великих екранів  
            '@media screen and (min-width: 580px) {' +  
                '.full-start-new {' +  
                    'min-height: 80vh;' +  
                    'display: flex;' +  
                '}' +  
            '}' +  
              
            // Статус виходу та віковий рейтинг  
            '.full-start-new__rate-line .full-start__pg {' +  
                'font-size: 1em;' +  
                'background: #fff;' +  
                'color: #000;' +  
            '}' +  
            '.full-start__pg, .full-start__status {' +  
                'font-size: 1em;' +  
                'background: #fff;' +  
                'color: #000;' +  
            '}' +  
              
            // Меню зліва  
            '.menu__item.focus {' +  
                'border-radius: 0 0.5em 0.5em 0;' +  
            '}' +  
            '.menu__list {' +  
                'padding-left: 0em;' +  
            '}' +  
  
            // Зменшений бордер  
            '.full-episode.focus::after,' +  
            '.card-episode.focus .full-episode::after,' +  
            '.items-cards .selector.focus::after,' +  
            '.card-more.focus .card-more__box::after,' +  
            '.card-episode.hover .full-episode::after,' +  
            '.card.focus .card__view::after,' +  
            '.card.hover .card__view::after,' +  
            '.torrent-item.focus::after,' +  
            '.watched-history.selector.focus::after,' +  
            '.online-prestige.selector.focus::after,' +  
            '.online-prestige--full.selector.focus::after,' +  
            '.explorer-card__head-img.selector.focus::after,' +  
            '.extensions__item.focus::after,' +  
            '.extensions__block-add.focus::after,' +  
            '.full-review-add.focus::after {' +  
            '    border: 0.2em solid #fff;' +  
            '}' +  
              
            // Анімації  
            '.card, ' +  
            '.watched-history, ' +  
            '.torrent-item, ' +  
            '.online-prestige, ' +  
            '.extensions__item, ' +  
            '.extensions__block-add, ' +  
            '.full-review-add, ' +  
            '.full-review, ' +  
            '.tag-count, ' +  
            '.full-person, ' +  
            '.full-episode, ' +  
            '.simple-button, ' +  
            '.full-start__button, ' +  
            '.items-cards .selector, ' +  
            '.card-more, ' +  
            '.explorer-card__head-img.selector, ' +  
            '.card-episode {transform: scale(1); transition: transform 0.3s ease;}' +  
              
            '.card.focus, ' +  
            '.extensions__item.focus, ' +  
            '.extensions__block-add.focus, ' +  
            '.full-review-add.focus, ' +  
            '.full-review.focus, ' +  
            '.tag-count.focus, ' +  
            '.full-person.focus, ' +  
            '.full-episode.focus, ' +  
            '.simple-button.focus, ' +  
            '.full-start__button.focus, ' +  
            '.items-cards .selector.focus, ' +  
            '.card-more.focus, ' +  
            '.explorer-card__head-img.selector.focus, ' +  
            '.card-episode.focus {transform: scale(1.03);}' +  
              
            '.watched-history.focus, ' +  
            '.torrent-item.focus, ' +  
            '.online-prestige.focus {transform: scale(1.01);}' +  
              
            '.menu__item {transition: transform 0.3s ease;}' +  
              
            '.menu__item.focus {transform: translateX(-0.2em);}' +  
            '';  
          
        // Додаємо CSS  
        if (style.styleSheet) {  
            // Для IE  
            style.styleSheet.cssText = css;  
        } else {  
            style.appendChild(document.createTextNode(css));  
        }  
          
        document.head.appendChild(style);  
          
        // Додавання шаблонів, якщо доступний Lampa.Template  
        if (typeof Lampa !== 'undefined' && Lampa.Template) {  
            // Шаблон картки з роком вище назви  
            Lampa.Template.add('card',   
                '<div class="card selector layer--visible layer--render">' +  
                    '<div class="card__view">' +  
                        '<img src="../img/img_load.svg" class="card__img" />' +  
                        '<div class="card__icons">' +  
                            '<div class="card__icons-inner"></div>' +  
                        '</div>' +  
                        '<div class="card__age">{release_year}</div>' +  
                        '<div class="card__ukraine-badge" style="display:none;"></div>' +  
                    '</div>' +  
                    '<div class="card__title">{title}</div>' +  
                '</div>');  
              
            // Шаблон картки епізоду без футера  
            Lampa.Template.add('card_episode',  
                '<div class="card-episode selector layer--visible layer--render">' +  
                    '<div class="card-episode__body">' +  
                        '<div class="full-episode">' +  
                            '<div class="full-episode__img">' +  
                                '<img />' +  
                            '</div>' +  
                            '<div class="full-episode__body">' +  
                                '<div class="card__title">{title}</div>' +  
                                '<div class="card__age">{release_year}</div>' +  
                                '<div class="card__ukraine-badge" style="display:none;"></div>' +  
                                '<div class="full-episode__num hide">{num}</div>' +  
                                '<div class="full-episode__name">{name}</div>' +  
                                '<div class="full-episode__date">{date}</div>' +  
                            '</div>' +  
                        '</div>' +  
                    '</div>' +  
                    '<div class="card-episode__footer hide">' +  
                        '<div class="card__imgbox">' +  
                            '<div class="card__view">' +  
                                '<img class="card__img" />' +  
                            '</div>' +  
                        '</div>' +  
                        '<div class="card__left">' +  
                            '<div class="card__title">{title}</div>' +  
                            '<div class="card__age">{release_year}</div>' +  
                        '</div>' +  
                    '</div>' +  
                '</div>');  
        } else {  
            console.warn('Lampa.Template не знайдено, шаблони не додані');  
        }  
          
        // Додаємо українські переклади  
        Lampa.Lang.add({  
            tv_status_returning_series: {  
              ru: "Іде"  
            },  
            tv_status_planned: {  
              ru: "Заплановано"  
            },  
            tv_status_in_production: {  
              ru: "У виробництві"  
            },  
            tv_status_ended: {  
              ru: "Завершено"  
            },  
            tv_status_canceled: {  
              ru: "Скасовано"  
            },  
            tv_status_pilot: {  
              ru: "Пілот"  
            },  
            tv_status_released: {  
              ru: "Вийшов"  
            },  
            tv_status_rumored: {  
              ru: "За чутками"  
            },  
            tv_status_post_production: {  
              ru: "Скоро"  
            }  
        });  
  
        // Запускаємо функціонал українського прапора  
        initUkraineBadge();  
    }  
  
    // === НОВА ФУНКЦІЯ: Ініціалізація українського прапора ===  
    function initUkraineBadge() {  
        // Спостерігач за змінами в DOM для додавання прапорів до нових карток  
        var observer = new MutationObserver(function(mutations) {  
            mutations.forEach(function(mutation) {  
                mutation.addedNodes.forEach(function(node) {  
                    if (node.nodeType === 1) {  
                        // Шукаємо картки в доданих вузлах  
                        var cards = node.classList && node.classList.contains('card') ? [node] :   
                                   node.querySelectorAll ? node.querySelectorAll('.card') : [];  
                          
                        cards.forEach(processCard);  
                    }  
                });  
            });  
        });  
  
        // Починаємо спостереження  
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
  
        // Обробляємо існуючі картки  
        document.querySelectorAll('.card').forEach(processCard);  
    }  
  
    // === НОВА ФУНКЦІЯ: Обробка картки ===  
    function processCard(card) {  
        try {  
            // Пропускаємо, якщо картка вже оброблена  
            if (card.hasAttribute('data-ukraine-processed')) {  
                return;  
            }  
  
            // Отримуємо дані картки  
            var cardData = getCardData(card);  
            if (!cardData) return;  
  
            // Перевіряємо, чи потрібно показувати прапор  
            var shouldShow = shouldShowUkraineBadge(cardData);  
              
            // Знаходимо або створюємо контейнер для бейджа  
            var badgeContainer = card.querySelector('.card__ukraine-badge');  
            if (!badgeContainer) {  
                badgeContainer = document.createElement('div');  
                badgeContainer.className = 'card__ukraine-badge';  
                var cardView = card.querySelector('.card__view');  
                if (cardView) {  
                    cardView.appendChild(badgeContainer);  
                }  
            }  
  
            if (shouldShow) {  
                // Форматуємо бейдж відповідно до налаштувань  
                var badgeContent = formatUkraineBadge(shouldShow);  
                badgeContainer.innerHTML = badgeContent;  
                badgeContainer.style.display = 'flex';  
            } else {  
                badgeContainer.style.display = 'none';  
            }  
  
            // Позначаємо картку як оброблену  
            card.setAttribute('data-ukraine-processed', 'true');  
        } catch (e) {  
            console.error('Помилка обробки картки:', e);  
        }  
    }  
  
    // === НОВА ФУНКЦІЯ: Отримання даних картки ===  
    function getCardData(card) {  
        try {  
            // Спроба отримати дані з різних джерел  
            if (card.card_data) {  
                return card.card_data;  
            }  
              
            // Альтернативний спосіб отримання даних  
            var img = card.querySelector('.card__img');  
            if (img && img.dataset) {  
                return {  
                    id: img.dataset.id,  
                    title: img.dataset.title,  
                    original_title: img.dataset.original_title,  
                    type: img.dataset.type || 'movie',  
                    release_date: img.dataset.release_date  
                };  
            }  
              
            return null;  
        } catch (e) {  
            console.error('Помилка отримання даних картки:', e);  
            return null;  
        } catch (e) {  
            console.error('Помилка отримання даних картки:', e);  
            return null;  
        }  
    }  
  
    // === НОВА ФУНКЦІЯ: Перевірка чи показувати прапор ===  
    function shouldShowUkraineBadge(cardData) {  
        try {  
            // Перевіряємо ручні перевизначення  
            if (UKRAINE_FLAG_CONFIG.MANUAL_OVERRIDES[cardData.id]) {  
                var override = UKRAINE_FLAG_CONFIG.MANUAL_OVERRIDES[cardData.id];  
                return override.has_ukrainian ? { track_count: 1 } : null;  
            }  
  
            // Перевіряємо тип контенту  
            var isMovie = cardData.type === 'movie';  
            var isTVSeries = cardData.type === 'tv';  
  
            if (isMovie && !UKRAINE_FLAG_CONFIG.SHOW_FOR_MOVIES) return null;  
            if (isTVSeries && !UKRAINE_FLAG_CONFIG.SHOW_FOR_TV_SERIES) return null;  
  
            // Проста евристика для визначення українського контенту  
            // Можна розширити з API як у Lampa Track Finder  
            var title = (cardData.title || '').toLowerCase();  
            var originalTitle = (cardData.original_title || '').toLowerCase();  
              
            // Перевіряємо назви на ознаки українського контенту  
            var ukrainianKeywords = [  
                'українськ', 'україна', 'ukrainian', 'ukraine',  
                'київ', 'kyiv', 'львів', 'lviv'  
            ];  
              
            var hasUkrainianKeyword = ukrainianKeywords.some(keyword =>   
                title.includes(keyword) || originalTitle.includes(keyword)  
            );  
  
            if (hasUkrainianKeyword) {  
                return { track_count: 1 };  
            }  
  
            return null;  
        } catch (e) {  
            console.error('Помилка перевірки прапора:', e);  
            return null;  
        }  
    }  
  
    // === НОВА ФУНКЦІЯ: Форматування бейджа ===  
    function formatUkraineBadge(data) {  
        try {  
            var count = data.track_count || 1;  
              
            switch (UKRAINE_FLAG_CONFIG.DISPLAY_MODE) {  
                case 'flag_only':  
                    return '<i class="flag-css"></i>';  
                  
                case 'flag_count':  
                    return count === 1 ? '<i class="flag-css"></i>' : count + 'x<i class="flag-css"></i>';  
                  
                case 'text':  
                default:  
                    return count === 1 ? 'Ukr' : count + 'xUkr';  
            }  
        } catch (e) {  
            console.error('Помилка форматування бейджа:', e);  
            return '<i class="flag-css"></i>';  
        }  
    }  
  
    // Запуск при завантаженні додатку  
    function init() {  
        if (window.appready) {  
            applyStyleAndTemplates();  
        } else if (typeof Lampa !== 'undefined' && Lampa.Listener) {  
            Lampa.Listener.follow('app', function(event) {  
                if (event.type === 'ready') {  
                    applyStyleAndTemplates();  
                }  
            });  
        } else {  
            // Fallback: запускаємо при повному завантаженні DOM  
            if (document.readyState === 'loading') {  
                document.addEventListener('DOMContentLoaded', applyStyleAndTemplates);  
            } else {  
                applyStyleAndTemplates();  
            }  
        }  
    }  
  
    // Запускаємо ініціалізацію  
    init();  
})();
  
