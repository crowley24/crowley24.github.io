(function () {
    'use strict';

    // Іконка плагіна
    const PLUGIN_ICON = '<svg viewBox="110 90 180 210"xmlns=http://www.w3.org/2000/svg><g id=sphere><circle cx=200 cy=140 fill="hsl(200, 80%, 40%)"opacity=0.3 r=1.2 /><circle cx=230 cy=150 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=170 cy=155 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=245 cy=175 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=155 cy=180 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=215 cy=165 fill="hsl(200, 80%, 46%)"opacity=0.36 r=1.2 /><circle cx=185 cy=170 fill="hsl(200, 80%, 43%)"opacity=0.33 r=1.3 /><circle cx=260 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=140 cy=200 fill="hsl(200, 80%, 50%)"opacity=0.4 r=1.5 /><circle cx=250 cy=220 fill="hsl(200, 80%, 48%)"opacity=0.38 r=1.4 /><circle cx=150 cy=225 fill="hsl(200, 80%, 47%)"opacity=0.37 r=1.4 /><circle cx=235 cy=240 fill="hsl(200, 80%, 45%)"opacity=0.35 r=1.3 /><circle cx=165 cy=245 fill="hsl(200, 80%, 44%)"opacity=0.34 r=1.3 /><circle cx=220 cy=255 fill="hsl(200, 80%, 42%)"opacity=0.32 r=1.2 /><circle cx=180 cy=258 fill="hsl(200, 80%, 41%)"opacity=0.31 r=1.2 /><circle cx=200 cy=120 fill="hsl(200, 80%, 60%)"opacity=0.5 r=1.8 /><circle cx=240 cy=135 fill="hsl(200, 80%, 65%)"opacity=0.55 r=2 /><circle cx=160 cy=140 fill="hsl(200, 80%, 62%)"opacity=0.52 r=1.9 /><circle cx=270 cy=165 fill="hsl(200, 80%, 70%)"opacity=0.6 r=2.2 /><circle cx=130 cy=170 fill="hsl(200, 80%, 67%)"opacity=0.57 r=2.1 /><circle cx=255 cy=190 fill="hsl(200, 80%, 72%)"opacity=0.62 r=2.3 /><circle cx=145 cy=195 fill="hsl(200, 80%, 69%)"opacity=0.59 r=2.2 /><circle cx=280 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=120 cy=200 fill="hsl(200, 80%, 75%)"opacity=0.65 r=2.5 /><circle cx=275 cy=215 fill="hsl(200, 80%, 73%)"opacity=0.63 r=2.4 /><circle cx=125 cy=220 fill="hsl(200, 80%, 71%)"opacity=0.61 r=2.3 /><circle cx=260 cy=235 fill="hsl(200, 80%, 68%)"opacity=0.58 r=2.2 /><circle cx=140 cy=240 fill="hsl(200, 80%, 66%)"opacity=0.56 r=2.1 /><circle cx=245 cy=255 fill="hsl(200, 80%, 63%)"opacity=0.53 r=2 /><circle cx=155 cy=260 fill="hsl(200, 80%, 61%)"opacity=0.51 r=1.9 /><circle cx=225 cy=270 fill="hsl(200, 80%, 58%)"opacity=0.48 r=1.8 /><circle cx=175 cy=272 fill="hsl(200, 80%, 56%)"opacity=0.46 r=1.7 /><circle cx=200 cy=100 fill="hsl(200, 80%, 85%)"opacity=0.8 r=2.8 /><circle cx=230 cy=115 fill="hsl(200, 80%, 90%)"opacity=0.85 r=3 /><circle cx=170 cy=120 fill="hsl(200, 80%, 87%)"opacity=0.82 r=2.9 /><circle cx=250 cy=140 fill="hsl(200, 80%, 92%)"opacity=0.88 r=3.2 /><circle cx=150 cy=145 fill="hsl(200, 80%, 89%)"opacity=0.84 r=3.1 /><circle cx=265 cy=170 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.4 /><circle cx=135 cy=175 fill="hsl(200, 80%, 93%)"opacity=0.87 r=3.3 /><circle cx=275 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=125 cy=200 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.5 /><circle cx=200 cy=200 fill="hsl(200, 80%, 100%)"opacity=1 r=4 /><circle cx=220 cy=195 fill="hsl(200, 80%, 98%)"opacity=0.95 r=3.8 /><circle cx=180 cy=205 fill="hsl(200, 80%, 97%)"opacity=0.93 r=3.7 /><circle cx=240 cy=210 fill="hsl(200, 80%, 96%)"opacity=0.92 r=3.6 /><circle cx=160 cy=215 fill="hsl(200, 80%, 95%)"opacity=0.9 r=3.5 /><circle cx=270 cy=230 fill="hsl(200, 80%, 94%)"opacity=0.88 r=3.4 /><circle cx=130 cy=235 fill="hsl(200, 80%, 92%)"opacity=0.86 r=3.3 /><circle cx=255 cy=250 fill="hsl(200, 80%, 90%)"opacity=0.84 r=3.2 /><circle cx=145 cy=255 fill="hsl(200, 80%, 88%)"opacity=0.82 r=3.1 /><circle cx=235 cy=265 fill="hsl(200, 80%, 86%)"opacity=0.8 r=3 /><circle cx=165 cy=268 fill="hsl(200, 80%, 84%)"opacity=0.78 r=2.9 /><circle cx=215 cy=280 fill="hsl(200, 80%, 82%)"opacity=0.76 r=2.8 /><circle cx=185 cy=282 fill="hsl(200, 80%, 80%)"opacity=0.74 r=2.7 /><circle cx=200 cy=290 fill="hsl(200, 80%, 78%)"opacity=0.72 r=2.6 /><circle cx=210 cy=130 fill="hsl(200, 80%, 88%)"opacity=0.83 r=2.5 /><circle cx=190 cy=135 fill="hsl(200, 80%, 86%)"opacity=0.81 r=2.4 /><circle cx=225 cy=155 fill="hsl(200, 80%, 91%)"opacity=0.86 r=2.8 /><circle cx=175 cy=160 fill="hsl(200, 80%, 89%)"opacity=0.84 r=2.7 /><circle cx=245 cy=185 fill="hsl(200, 80%, 94%)"opacity=0.89 r=3.3 /><circle cx=155 cy=190 fill="hsl(200, 80%, 92%)"opacity=0.87 r=3.2 /><circle cx=260 cy=210 fill="hsl(200, 80%, 95%)"opacity=0.91 r=3.4 /><circle cx=140 cy=215 fill="hsl(200, 80%, 93%)"opacity=0.88 r=3.3 /><circle cx=250 cy=230 fill="hsl(200, 80%, 91%)"opacity=0.85 r=3.2 /><circle cx=150 cy=235 fill="hsl(200, 80%, 89%)"opacity=0.83 r=3.1 /><circle cx=230 cy=245 fill="hsl(200, 80%, 87%)"opacity=0.81 r=3 /><circle cx=170 cy=250 fill="hsl(200, 80%, 85%)"opacity=0.79 r=2.9 /><circle cx=210 cy=260 fill="hsl(200, 80%, 83%)"opacity=0.77 r=2.8 /><circle cx=190 cy=265 fill="hsl(200, 80%, 81%)"opacity=0.75 r=2.7 /></g></svg>';

    // Главная функция плагина
    function initializePlugin() {
        console.log('Applecation', 'v1.0.0 (Modified)');
        
        if (!Lampa.Platform.screen('tv')) {
            console.log('Applecation', 'TV mode only');
            return;
        }

        patchApiImg();
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLogoLoader();
        // >>>>>>> ПОЧАТОК ЗМІНИ (Додавання логіки затемнення) <<<<<<<
        addFullStartBackgroundLogic(); 
        // <<<<<<< КІНЕЦЬ ЗМІНИ (Додавання логіки затемнення) >>>>>>>
    }

    // Переводы для настроек
    const translations = {
        show_ratings: {
            ru: 'Показывать рейтинги',
            en: 'Show ratings',
            uk: 'Показувати рейтинги',
        },
        show_ratings_desc: {
            ru: 'Отображать рейтинги IMDB и КиноПоиск',
            en: 'Display IMDB and KinoPoisk ratings',
            uk: 'Відображати рейтинги IMDB та КіноПошук',
        },
        hide_reactions: {
            ru: 'Скрыть реакции Lampa',
            en: 'Hide Lampa reactions',
            uk: 'Сховати реакції Lampa',
        },
        hide_reactions_desc: {
            ru: 'Скрыть блок с реакциями',
            en: 'Hide reactions block',
            uk: 'Сховати блок з реакціями',
        },
        ratings_position: {
            ru: 'Расположение рейтингов',
            en: 'Ratings position',
            uk: 'Розташування рейтингів',
        },
        ratings_position_desc: {
            ru: 'Выберите где отображать рейтинги',
            en: 'Choose where to display ratings',
            uk: 'Виберіть де відображати рейтинги',
        },
        position_card: {
            ru: 'В карточке',
            en: 'In card',
            uk: 'У картці',
        },
        position_corner: {
            ru: 'В левом нижнем углу',
            en: 'Bottom left corner',
            uk: 'У лівому нижньому куті',
        },
        logo_size: {
            ru: 'Размер логотипа',
            en: 'Logo size',
            uk: 'Розмір логотипу',
        },
        logo_size_desc: {
            ru: 'Выберите максимальный размер логотипа',
            en: 'Choose maximum logo size',
            uk: 'Виберіть максимальний розмір логотипу',
        },
        size_small: {
            ru: 'Маленький',
            en: 'Small',
            uk: 'Маленький',
        },
        size_medium: {
            ru: 'Средний',
            en: 'Medium',
            uk: 'Середній',
        },
        size_large: {
            ru: 'Большой',
            en: 'Large',
            uk: 'Великий',
        }
    };
    
    // >>>>>>> ПОЧАТОК ЗМІНИ (Коригування локалізації в t) <<<<<<<
    function t(key) {
        // Оновлено: використовуємо лише ru/en/uk для пошуку
        const lang = Lampa.Storage.get('language'); // Просто отримуємо код мови
        
        // Перевіряємо, чи підтримується мова. Якщо ні, або якщо перекладу немає, використовуємо 'ru'
        if (translations[key] && translations[key][lang]) {
            return translations[key][lang];
        }
        
        // Використовуємо 'uk' як запасний варіант після поточної мови, якщо вона не 'ru'
        if (lang !== 'ru' && translations[key] && translations[key]['uk']) {
             return translations[key]['uk'];
        }
        
        // За замовчуванням завжди повертаємо 'ru', якщо інше не знайдено
        return translations[key] && translations[key].ru || key;
    }
    // <<<<<<< КІНЕЦЬ ЗМІНИ (Коригування локалізації в t) >>>>>>>

    // Добавляем настройки плагина
    function addSettings() {
        // ... (Ваш оригінальний код налаштувань) ...
        // Ініціалізуємо значення за замовчуванням
        if (Lampa.Storage.get('applecation_show_ratings') === undefined) {
            Lampa.Storage.set('applecation_show_ratings', false);
        }
        if (Lampa.Storage.get('applecation_hide_reactions') === undefined) {
            Lampa.Storage.set('applecation_hide_reactions', false);
        }
        if (Lampa.Storage.get('applecation_ratings_position') === undefined) {
            Lampa.Storage.set('applecation_ratings_position', 'card');
        }
        // Добавляем значение по умолчанию для размера логотипа
        if (Lampa.Storage.get('applecation_logo_size') === undefined) {
            Lampa.Storage.set('applecation_logo_size', 'medium');
        }

        // Создаем раздел настроек
        Lampa.SettingsApi.addComponent({
            component: 'applecation_settings',
            name: 'Applecation',
            icon: PLUGIN_ICON
        });
        
        // --- ВИДАЛЕНО: Додавання інформації про плагін ---

        // Показывать рейтинги
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_show_ratings',
                type: 'trigger',
                default: false
            },
            field: {
                name: t('show_ratings'),
                description: t('show_ratings_desc')
            },
            onChange: function(value) {
                if (value) {
                    $('body').removeClass('applecation--hide-ratings');
                } else {
                    $('body').addClass('applecation--hide-ratings');
                }
            }
        });

        // Расположение рейтингов
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_ratings_position',
                type: 'select',
                values: {
                    card: t('position_card'),
                    corner: t('position_corner')
                },
                default: 'card'
            },
            field: {
                name: t('ratings_position'),
                description: t('ratings_position_desc')
            },
            onChange: function(value) {
                Lampa.Storage.set('applecation_ratings_position', value);
                $('body').removeClass('applecation--ratings-card applecation--ratings-corner');
                $('body').addClass('applecation--ratings-' + value);
                // Обновляем шаблон и перезагружаем активность
                addCustomTemplate();
                Lampa.Activity.back();
            }
        });

        // Размер логотипа (НОВАЯ НАСТРОЙКА)
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_logo_size',
                type: 'select',
                values: {
                    small: t('size_small'),
                    medium: t('size_medium'),
                    large: t('size_large')
                },
                default: 'medium'
            },
            field: {
                name: t('logo_size'),
                description: t('logo_size_desc')
            },
            onChange: function(value) {
                Lampa.Storage.set('applecation_logo_size', value);
                // Обновляем класс на body для стилей
                $('body').removeClass('applecation--logo-small applecation--logo-medium applecation--logo-large');
                $('body').addClass('applecation--logo-' + value);
            }
        });

        // Скрыть реакции
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_hide_reactions',
                type: 'trigger',
                default: false
            },
            field: {
                name: t('hide_reactions'),
                description: t('hide_reactions_desc')
            },
            onChange: function(value) {
                if (value) {
                    $('body').addClass('applecation--hide-reactions');
                } else {
                    $('body').removeClass('applecation--hide-reactions');
                }
            }
        });

        // Применяем текущие настройки
        if (!Lampa.Storage.get('applecation_show_ratings', false)) {
            $('body').addClass('applecation--hide-ratings');
        }
        $('body').addClass('applecation--ratings-' + Lampa.Storage.get('applecation_ratings_position', 'card'));
        if (Lampa.Storage.get('applecation_hide_reactions', false)) {
            $('body').addClass('applecation--hide-reactions');
        }
        // Применяем текущую настройку размера логотипа
        $('body').addClass('applecation--logo-' + Lampa.Storage.get('applecation_logo_size', 'medium'));
    }

    function addCustomTemplate() {
        const ratingsPosition = Lampa.Storage.get('applecation_ratings_position', 'card');
        
        // Блок с рейтингами
        const ratingsBlock = `<div class="applecation__ratings">
                        <div class="rate--imdb hide">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                        <div class="rate--kp hide">
                            <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                    </div>`;
        
          // >>>>>>> ПОЧАТОК ЗМІНИ (Коригування локалізації в t) <<<<<<<
    function t(key) {
        // Оновлено: використовуємо лише ru/en/uk для пошуку
        const lang = Lampa.Storage.get('language'); // Просто отримуємо код мови
        
        // Перевіряємо, чи підтримується мова. Якщо ні, або якщо перекладу немає, використовуємо 'ru'
        if (translations[key] && translations[key][lang]) {
            return translations[key][lang];
        }
        
        // Використовуємо 'uk' як запасний варіант після поточної мови, якщо вона не 'ru'
        if (lang !== 'ru' && translations[key] && translations[key]['uk']) {
             return translations[key]['uk'];
        }
        
        // За замовчуванням завжди повертаємо 'ru', якщо інше не знайдено
        return translations[key] && translations[key].ru || key;
    }
    // <<<<<<< КІНЕЦЬ ЗМІНИ (Коригування локалізації в t) >>>>>>>

    // Добавляем настройки плагина
    function addSettings() {
        // ... (Ваш оригінальний код налаштувань) ...
        // Ініціалізуємо значення за замовчуванням
        if (Lampa.Storage.get('applecation_show_ratings') === undefined) {
            Lampa.Storage.set('applecation_show_ratings', false);
        }
        if (Lampa.Storage.get('applecation_hide_reactions') === undefined) {
            Lampa.Storage.set('applecation_hide_reactions', false);
        }
        if (Lampa.Storage.get('applecation_ratings_position') === undefined) {
            Lampa.Storage.set('applecation_ratings_position', 'card');
        }
        // Добавляем значение по умолчанию для размера логотипа
        if (Lampa.Storage.get('applecation_logo_size') === undefined) {
            Lampa.Storage.set('applecation_logo_size', 'medium');
        }

        // Создаем раздел настроек
        Lampa.SettingsApi.addComponent({
            component: 'applecation_settings',
            name: 'Applecation',
            icon: PLUGIN_ICON
        });
        
        // --- ВИДАЛЕНО: Додавання інформації про плагін ---

        // Показывать рейтинги
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_show_ratings',
                type: 'trigger',
                default: false
            },
            field: {
                name: t('show_ratings'),
                description: t('show_ratings_desc')
            },
            onChange: function(value) {
                if (value) {
                    $('body').removeClass('applecation--hide-ratings');
                } else {
                    $('body').addClass('applecation--hide-ratings');
                }
            }
        });

        // Расположение рейтингов
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_ratings_position',
                type: 'select',
                values: {
                    card: t('position_card'),
                    corner: t('position_corner')
                },
                default: 'card'
            },
            field: {
                name: t('ratings_position'),
                description: t('ratings_position_desc')
            },
            onChange: function(value) {
                Lampa.Storage.set('applecation_ratings_position', value);
                $('body').removeClass('applecation--ratings-card applecation--ratings-corner');
                $('body').addClass('applecation--ratings-' + value);
                // Обновляем шаблон и перезагружаем активность
                addCustomTemplate();
                Lampa.Activity.back();
            }
        });

        // Размер логотипа (НОВАЯ НАСТРОЙКА)
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_logo_size',
                type: 'select',
                values: {
                    small: t('size_small'),
                    medium: t('size_medium'),
                    large: t('size_large')
                },
                default: 'medium'
            },
            field: {
                name: t('logo_size'),
                description: t('logo_size_desc')
            },
            onChange: function(value) {
                Lampa.Storage.set('applecation_logo_size', value);
                // Обновляем класс на body для стилей
                $('body').removeClass('applecation--logo-small applecation--logo-medium applecation--logo-large');
                $('body').addClass('applecation--logo-' + value);
            }
        });

        // Скрыть реакции
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: {
                name: 'applecation_hide_reactions',
                type: 'trigger',
                default: false
            },
            field: {
                name: t('hide_reactions'),
                description: t('hide_reactions_desc')
            },
            onChange: function(value) {
                if (value) {
                    $('body').addClass('applecation--hide-reactions');
                } else {
                    $('body').removeClass('applecation--hide-reactions');
                }
            }
        });

        // Применяем текущие настройки
        if (!Lampa.Storage.get('applecation_show_ratings', false)) {
            $('body').addClass('applecation--hide-ratings');
        }
        $('body').addClass('applecation--ratings-' + Lampa.Storage.get('applecation_ratings_position', 'card'));
        if (Lampa.Storage.get('applecation_hide_reactions', false)) {
            $('body').addClass('applecation--hide-reactions');
        }
        // Применяем текущую настройку размера логотипа
        $('body').addClass('applecation--logo-' + Lampa.Storage.get('applecation_logo_size', 'medium'));
    }

    function addCustomTemplate() {
        const ratingsPosition = Lampa.Storage.get('applecation_ratings_position', 'card');
        
        // Блок с рейтингами
        const ratingsBlock = `<div class="applecation__ratings">
                        <div class="rate--imdb hide">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                        <div class="rate--kp hide">
                            <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" fill="none">
                                <path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10"/>
                            </svg>
                            <div>0.0</div>
                        </div>
                    </div>`;
        
        // >>>>>>> ПОЧАТОК ЗМІНИ (Додавання класу applecation--wrapper для затемнення) <<<<<<<
// Додаємо клас applecation--wrapper, щоб можна було стилізувати backdrop
        const template = `<div class="full-start-new applecation applecation--wrapper"> 
        <div class="full-start-new__body">
            <div class="full-start-new__left hide">
                <div class="full-start-new__poster">
                    <img class="full-start-new__img full--poster" />
                </div>
            </div>

            <div class="full-start-new__right">
                <div class="applecation__left">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title" style="display: none;">{title}</div>
                    
                    <div class="applecation__meta">
                        <div class="applecation__meta-left">
                            <span class="applecation__network"></span>
                            <span class="applecation__meta-text"></span>
                            <div class="full-start__pg hide"></div>
                        </div>
                    </div>
                    
                    ${ratingsPosition === 'card' ? ratingsBlock : ''}
                    
                    
                    <div class="applecation__info"></div>
                    
                    <div class="full-start-new__head" style="display: none;"></div>
                    <div class="full-start-new__details" style="display: none;"></div>
                    
                    <div class="applecation__scrollable"> 
                    
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play">
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>
                                    <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>
                                </svg>
                                <span>#{title_watch}</span>
                            </div>

                            <div class="full-start__button selector button--book">
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                                </svg>
                                <span>#{settings_input_links}</span>
                            </div>

                            <div class="full-start__button selector button--reaction">
                                <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>
                                    <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>
                                </svg>
                                <span>#{title_reactions}</span>
                            </div>

                            <div class="full-start__button selector button--subscribe hide">
                                <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>
                                    <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>
                                </svg>
                                <span>#{title_subscribe}</span>
                            </div>

                            <div class="full-start__button selector button--options">
                                <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>
                                    <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>
                                    <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="hide buttons--container">
                            <div class="full-start__button view--torrent hide">
                                </div>

                            <div class="full-start__button selector view--trailer">
                                </div>
                        </div>
                        
                    </div>
                </div>

                <div class="applecation__right">
                    <div class="full-start-new__reactions selector">
                        <div>#{reactions_none}</div>
                    </div>
                    
                    ${ratingsPosition === 'corner' ? ratingsBlock : ''}

                    <div class="full-start-new__rate-line">
                        <div class="full-start__status hide"></div>
                    </div>
                    
                    <div class="rating--modss" style="display: none;"></div>
                </div>
            </div>
        </div>
    </div>`;
        // <<<<<<< КІНЕЦЬ ЗМІНИ (Додавання класу applecation--wrapper для затемнення) >>>>>>>

        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `<style>
/* Основной контейнер */
.applecation {
    transition: all .3s;
}

/* >>>>>>> ПОЧАТОК ЗМІНИ (Виправлення смуги та затемнення) <<<<<<< */

/* Виправлення смуги/границь */
.applecation--wrapper {
    /* Робимо кореневий контейнер активності прокручуваним */
    height: 100vh;
    overflow: hidden; 
    position: relative;
}

/* Обгортка для контенту, що прокручується */
.applecation__scrollable {
    /* Дозволяємо прокрутку тільки для цієї частини */
    height: 100%; 
    overflow-y: auto;
    overflow-x: hidden; /* Додатково, щоб уникнути горизонтальної смуги */
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 3; /* Поверх фону та оверлея */
}

/* Фон, який ми замінюємо */
.full-start__background {
    /* Залишаємо його на місці, але додаємо наш оверлей */
    position: fixed !important; 
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important; 
    z-index: 1; 
    transition: opacity 0.6s ease-out, filter 0.3s ease-out !important;
    animation: none !important;
    transform: none !important;
    will-change: opacity, filter;
}

.full-start__background.loaded.applecation-animated {
    opacity: 1 !important;
}

/* Оверлей для Затемнення */
.full-start__background::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    /* Початковий рівень затемнення */
    background-color: rgba(0, 0, 0, 0.1); 
    /* Миттєвий перехід */
    transition: background-color 0.05s linear; 
}

/* КЛАС ЗАТЕМНЕННЯ: Активується при скролі */
.applecation--dim .full-start__background::after {
    /* Максимальне затемнення для читабельності */
    background-color: rgba(0, 0, 0, 0.65); 
}

/* Оверлей внизу для плавного переходу */
.full-start-new__body {
    height: 80vh;
    /* Додаємо градієнт, щоб контент картки плавно переходив у фон */
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.4) 100%);
    position: relative; /* Щоб body був над backdrop */
    z-index: 3;
}

/* Скидання прокрутки для body плагіна Lampa, щоб запобігти подвійному скролу */
.applecation .full-start-new__body > div:last-child {
    overflow: hidden !important; 
}

/* Фон - переопределяем стандартную анимацию на fade */
/* ... (Ваш оригінальний код для .full-start__background) ... */
/* ... */
/* <<<<<<< КІНЕЦЬ ЗМІНИ (Виправлення смуги та затемнення) >>>>>>> */


.applecation .full-start-new__body {
    height: 80vh;
}

.applecation .full-start-new__right {
    display: flex;
    align-items: flex-end;
}
/* ... (Ваш оригінальний CSS) ... */

/* Удерживаем opacity при загрузке нового фона */
.full-start__background.loaded.applecation-animated {
    opacity: 1 !important;
}

body:not(.menu--open) .full-start__background {
    mask-image: none;
}

/* Отключаем стандартную анимацию Lampa для фона */
body.advanced--animation:not(.no--animation) .full-start__background.loaded {
    animation: none !important;
}

/* Скрываем статус для предотвращения выхода реакций за экран */
.applecation .full-start__status {
    display: none;
}

/* ВИДАЛЕНО .applecation__overlay стилі */

</style>`;
        
        Lampa.Template.add('applecation_css', styles);
        $('body').append(Lampa.Template.get('applecation_css', {}, true));
    }

    // >>>>>>> ПОЧАТОК ЗМІНИ (Логіка затемнення при скролі) <<<<<<<
    function addFullStartBackgroundLogic() {
        // Логіка запускається при відкритті будь-якої активності (зокрема full)
        Lampa.Listener.follow('activity', (event) => {
            if (event.type === 'start') {
                // Відстежуємо лише активність full (картку фільму)
                if (event.object.component === 'full') {
                    const activityElement = event.object.render();
                    
                    // Шукаємо прокручуваний елемент, який ми створили
                    const scrollableContent = activityElement.find('.applecation__scrollable');
                    
                    if (scrollableContent.length) {
                        scrollableContent.on('scroll', function() {
                            const container = activityElement.find('.applecation--wrapper');
                            
                            // Миттєве затемнення: активується, як тільки прокрутка більша за поріг (наприклад, 10 пікселів)
                            if (this.scrollTop > 10) { 
                                container.addClass('applecation--dim');
                            } else {
                                container.removeClass('applecation--dim');
                            }
                        });
                    }
                }
            }
        });
    }
    // <<<<<<< КІНЕЦЬ ЗМІНИ (Логіка затемнення при скролі) >>>>>>>
    
    // Патчим Api.img для улучшенного качества фона
    function patchApiImg() {
        // ... (Ваш оригінальний код patchApiImg) ...
        const originalImg = Lampa.Api.img;
        
        Lampa.Api.img = function(src, size) {
            // Улучшаем качество backdrop фонов в соответствии с poster_size
            if (size === 'w1280') {
                const posterSize = Lampa.Storage.field('poster_size');
                
                // Маппинг poster_size на backdrop размеры
                const sizeMap = {
                    'w200': 'w780',      // Низкое → минимальный backdrop
                    'w300': 'w1280',     // Среднее → стандартный backdrop
                    'w500': 'original'   // Высокое → оригинальный backdrop
                };
                
                size = sizeMap[posterSize] || 'w1280';
            }
            return originalImg.call(this, src, size);
        };
    }

    // ... (Ваш оригінальний код getLogoQuality, selectBestLogo, getMediaType, formatSeasons, loadNetworkIcon, fillMetaInfo, fillAdditionalInfo) ...
    // ...

    // Получаем качество логотипа на основе poster_size
    function getLogoQuality() {
        const posterSize = Lampa.Storage.field('poster_size');
        const qualityMap = {
            'w200': 'w300',      // Низкое постера → низкое лого
            'w300': 'w500',      // Среднее постера → среднее лого
            'w500': 'original'   // Высокое постера → оригинальное лого
        };
        return qualityMap[posterSize] || 'w500';
    }
    
    // Новая функция для выбора лучшего логотипа
    function selectBestLogo(logos, currentLang) {
        // Приорітети мов: 1. Поточна мова, 2. Англійська ('en'), 3. Будь-яка.
        
                // 1. Поточна мова
const preferred = logos.filter(l => l.iso_639_1 === currentLang);
        if (preferred.length > 0) {
            // Беремо логотип з найвищим рейтингом серед відповідних мов
            preferred.sort((a, b) => b.vote_average - a.vote_average);
            return preferred[0];
        }

        // 2. Англійська мова
        const english = logos.filter(l => l.iso_639_1 === 'en');
        if (english.length > 0) {
            english.sort((a, b) => b.vote_average - a.vote_average);
            return english[0];
        }
        
        // 3. Будь-яка мова (за найвищим рейтингом)
        if (logos.length > 0) {
            logos.sort((a, b) => b.vote_average - a.vote_average);
            return logos[0];
        }

        return null;
    }

    // Получаем локализованный тип медиа
function getMediaType(data) {
        const lang = Lampa.Storage.get('language', 'ru');
        const isTv = !!data.name;
        
        const types = {
            ru: isTv ? 'Сериал' : 'Фильм',
            en: isTv ? 'TV Series' : 'Movie',
            uk: isTv ? 'Серіал' : 'Фільм',
        };
        
        return types[lang] || types['en'];
    }

    // Загружаем иконку студии/сети
    function loadNetworkIcon(activity, data) {
        const networkContainer = activity.render().find('.applecation__network');
        
        // Для сериалов - телесеть
        if (data.networks && data.networks.length) {
            const network = data.networks[0];
            if (network.logo_path) {
                const logoUrl = Lampa.Api.img(network.logo_path, 'w200');
                networkContainer.html(`<img src="${logoUrl}" alt="${network.name}">`);
                return;
            }
        }
        
        // Для фильмов - студия
        if (data.production_companies && data.production_companies.length) {
            const company = data.production_companies[0];
            if (company.logo_path) {
                const logoUrl = Lampa.Api.img(company.logo_path, 'w200');
                networkContainer.html(`<img src="${logoUrl}" alt="${company.name}">`);
                return;
            }
        }
        
        // Если нет иконки - скрываем контейнер
        networkContainer.remove();
    }

    // Заполняем мета информацию (Тип/Жанр/поджанр)
    function fillMetaInfo(activity, data) {
        const metaTextContainer = activity.render().find('.applecation__meta-text');
        const metaParts = [];

        // Тип контента
        metaParts.push(getMediaType(data));

        // Жанры (первые 2-3)
        if (data.genres && data.genres.length) {
            const genres = data.genres.slice(0, 2).map(g => 
                Lampa.Utils.capitalizeFirstLetter(g.name)
            );
            metaParts.push(...genres);
        }

        metaTextContainer.html(metaParts.join(' · '));
        
        // Загружаем иконку студии/сети
        loadNetworkIcon(activity, data);
    }

    // Склонение сезонов с локализацией
    function formatSeasons(count) {
        const lang = Lampa.Storage.get('language', 'ru');
        
        // Славянские языки (ru, uk) - сложное склонение
        if (['ru', 'uk'].includes(lang)) {
            const cases = [2, 0, 1, 1, 1, 2];
            const titles = {
                ru: ['сезон', 'сезона', 'сезонов'],
                uk: ['сезон', 'сезони', 'сезонів'],
            };
            
            const langTitles = titles[lang] || titles['ru'];
            const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
            
            return `${count} ${langTitles[caseIndex]}`;
        }
        
        // Английский
        if (lang === 'en') {
            return count === 1 ? `${count} Season` : `${count} Seasons`;
        }
        
        // Остальные языки - базовое склонение (Видалено cs, he, pt, zh)
        const seasonWord = Lampa.Lang.translate('full_season');
        return count === 1 ? `${count} ${seasonWord}` : `${count} ${seasonWord}s`;
    }

    // Заполняем дополнительную информацию (Год/длительность)
    function fillAdditionalInfo(activity, data) {
        const infoContainer = activity.render().find('.applecation__info');
        const infoParts = [];

        // Год выпуска
        const releaseDate = data.release_date || data.first_air_date || '';
        if (releaseDate) {
            const year = releaseDate.split('-')[0];
            infoParts.push(year);
        }

        // Длительность
        if (data.name) {
            // Сериал - показываем и продолжительность эпизода, и количество сезонов
            if (data.episode_run_time && data.episode_run_time.length) {
                const avgRuntime = data.episode_run_time[0];
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');
                infoParts.push(`${avgRuntime} ${timeM}`);
            }
            
            // Всегда показываем количество сезонов для сериалов
            const seasons = Lampa.Utils.countSeasons(data);
            if (seasons) {
                infoParts.push(formatSeasons(seasons));
            }
        } else {
            // Фильм - общая продолжительность
            if (data.runtime && data.runtime > 0) {
                const hours = Math.floor(data.runtime / 60);
                const minutes = data.runtime % 60;
                const timeH = Lampa.Lang.translate('time_h').replace('.', '');
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');
                const timeStr = hours > 0 
                    ? `${hours} ${timeH} ${minutes} ${timeM}` 
                    : `${minutes} ${timeM}`;
                infoParts.push(timeStr);
            }
        }

        infoContainer.html(infoParts.join(' · '));
    }


    // Загружаем логотип фильма
    function loadLogo(event) {
        const data = event.data.movie;
        const activity = event.object.activity;
        
        if (!data || !activity) return;

        // ВИПРАВЛЕННЯ ДУБЛЮВАННЯ (залишаємо)
        const detailsContainer = activity.render().find('.full-start-new__details');
        if (detailsContainer.length) {
            detailsContainer.hide().empty();
        }
        const headContainer = activity.render().find('.full-start-new__head');
        if (headContainer.length) {
            headContainer.hide().empty();
        }
        
        // Заполняем основную информацию
        fillMetaInfo(activity, data);       // <-- ЗАЛИШИТИ! (Студія, Тип, Жанр)
        // fillDescription(activity, data);  // <-- ВИДАЛЕНО! (Опис)
        fillAdditionalInfo(activity, data); // <-- ЗАЛИШИТИ! (Рік, Тривалість, Сезони)

        // Ждем когда фон загрузится и появится
        waitForBackgroundLoad(activity, () => {
            // После загрузки фона показываем контент
            activity.render().find('.applecation__meta').addClass('show');      // <-- ЗАЛИШИТИ!
            // activity.render().find('.applecation__description').addClass('show'); // <-- ВИДАЛЕНО!
            activity.render().find('.applecation__info').addClass('show');       // <-- ЗАЛИШИТИ!
            activity.render().find('.applecation__ratings').addClass('show');    // <-- ЗАЛИШИТИ!
        });

        // Загружаем логотип
        const mediaType = data.name ? 'tv' : 'movie';
        const currentLang = Lampa.Storage.get('language', 'ru');
        
        // Запрос всех логотипов (TMDb images endpoint)
        const apiUrl = Lampa.TMDB.api(
            `${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}` // Убрали локализацию, чтобы получить все доступные лого
        );

        $.get(apiUrl, (imagesData) => {
            const logoContainer = activity.render().find('.applecation__logo');
            const titleElement = activity.render().find('.full-start-new__title');

            const bestLogo = selectBestLogo(imagesData.logos, currentLang);

            if (bestLogo) {
                const logoPath = bestLogo.file_path;
                const quality = getLogoQuality();
                const logoUrl = Lampa.TMDB.image(`/t/p/${quality}${logoPath}`);

                const img = new Image();
                img.onload = () => {
                    logoContainer.html(`<img src="${logoUrl}" alt="" />`);
                    waitForBackgroundLoad(activity, () => {
                        logoContainer.addClass('loaded');
                    });
                };
                img.src = logoUrl;
            } else {
                // Нет логотипа - показываем текстовое название
                titleElement.show();
                waitForBackgroundLoad(activity, () => {
                    logoContainer.addClass('loaded');
                });
            }
        }).fail(() => {
            // При ошибке показываем текстовое название
            activity.render().find('.full-start-new__title').show();
            waitForBackgroundLoad(activity, () => {
                activity.render().find('.applecation__logo').addClass('loaded');
            });
        });
    }

    // Ждем загрузки и появления фона
    function waitForBackgroundLoad(activity, callback) {
        // Залишаємо вибір фону, але прибираємо оверлей з фільтра
        const background = activity.render().find('.full-start__background');
        
        if (!background.length) {
            callback();
            return;
        }

        // Если фон уже загружен и анимация завершена
        if (background.hasClass('loaded') && background.hasClass('applecation-animated')) {
            callback();
            return;
        }

        // Если фон загружен но анимация еще идет
        if (background.hasClass('loaded')) {
            // Ждем завершения transition + небольшая задержка для надежности
            setTimeout(() => {
                background.addClass('applecation-animated');
                callback();
            }, 650); // 600ms transition + 50ms запас
            return;
        }

        // Ждем загрузки фона
        const checkInterval = setInterval(() => {
            if (background.hasClass('loaded')) {
                clearInterval(checkInterval);
                // Ждем завершения transition + небольшая задержка
                setTimeout(() => {
                    background.addClass('applecation-animated');
                    callback();
                }, 650); // 600ms transition + 50ms запас
            }
        }, 50);

        // Таймаут на случай если что-то пошло не так
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!background.hasClass('applecation-animated')) {
                background.addClass('applecation-animated');
                callback();
            }
        }, 2000);
    }

    // Подключаем загрузку логотипов
    function attachLogoLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                loadLogo(event);
            }
        });
    }

    // Регистрация плагина в манифесте
    var pluginManifest = {
        type: 'other',
        version: '1.0.0',
        name: 'Applecation',
        description: 'Измененный интерфейс карточки фильма, оптимизированный под 4K.',
        author: '@darkestclouds (Modified)',
        icon: PLUGIN_ICON
    };

    // Регистрируем плагин
    if (Lampa.Manifest && Lampa.Manifest.plugins) {
        Lampa.Manifest.plugins = pluginManifest;
    }

    // Запуск плагина
    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (event) => {
            if (event.type === 'ready') {
                initializePlugin();
            }
        });
    }

})();
    
