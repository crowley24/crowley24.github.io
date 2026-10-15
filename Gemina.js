(function () {
    'use strict';

    // Ініціалізація
    if (!Lampa.Storage.get('gemina_api_key')) {
        Lampa.Storage.set('gemina_api_key', '');
    }
    if (!Lampa.Storage.get('gemina_model')) {
        Lampa.Storage.set('gemina_model', 'gemini-2.5-flash');
    }

    function getApiKey() {
        return Lampa.Storage.get('gemina_api_key', '');
    }

    function getModel() {
        return Lampa.Storage.get('gemina_model', 'gemini-2.5-flash');
    }

    // Запит до Gemini API
    function askGemina(promptText, callback) {
        let apiKey = getApiKey();
        if (!apiKey) {
            Lampa.Noty.show('Вкажіть Gemini API Key у Налаштуваннях (Gemina)!');
            return;
        }

        let model = getModel();
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        let data = {
            contents: [{
                parts: [{
                    text: "Ти — Джеміна, подруга та розумна ШІ-помічниця у медіацентрі Lampa. Відповідай українською мовою, дружньо, життєрадісно та лаконічно.\n\nЗапит: " + promptText
                }]
            }]
        };

        Lampa.Noty.show('Джеміна думає...');

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            try {
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    let text = data.candidates[0].content.parts[0].text;
                    callback(text);
                } else if (data.error) {
                    Lampa.Noty.show('Помилка Gemini API: ' + (data.error.message || 'Перевірте ваш API Key'));
                } else {
                    Lampa.Noty.show('Отримано порожню відповідь від Gemini');
                }
            } catch (err) {
                console.error('Gemina Error:', err, data);
                Lampa.Noty.show('Помилка обробки відповіді від Джеміни');
            }
        })
        .catch(error => {
            console.error('Gemina Fetch Error:', error);
            Lampa.Noty.show('Помилка мережі при запиті до Джеміни');
        });
    }

    // Реєстрація окремого розділу налаштувань через SettingsApi
    function registerSettings() {
        // Додаємо компонент-розділ
        if (Lampa.SettingsApi.add) {
            Lampa.SettingsApi.add({
                component: 'gemina_settings',
                name: 'Gemina',
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                    <path d="M12 6v6l4 2"/>
                </svg>`
            });
        }

        // Параметр: API Key
        Lampa.SettingsApi.addParam({
            component: 'gemina_settings',
            param: {
                name: 'gemina_api_key',
                type: 'input',
                values: '',
                default: ''
            },
            field: {
                name: 'Gemini API Key',
                description: 'Введіть безкоштовний ключ з Google AI Studio'
            },
            onChange: function (value) {
                Lampa.Storage.set('gemina_api_key', (value || '').trim());
            }
        });

        // Параметр: Вибір моделі
        Lampa.SettingsApi.addParam({
            component: 'gemina_settings',
            param: {
                name: 'gemina_model',
                type: 'select',
                values: {
                    'gemini-2.5-flash': 'gemini-2.5-flash (Рекомендована)',
                    'gemini-1.5-flash': 'gemini-1.5-flash',
                    'gemini-1.5-pro': 'gemini-1.5-pro'
                },
                default: 'gemini-2.5-flash'
            },
            field: {
                name: 'Модель ШІ',
                description: 'Оберіть робочу модель Gemini'
            },
            onChange: function (value) {
                Lampa.Storage.set('gemina_model', value);
            }
        });
    }

    // Чат у модальному вікні
    function openChatModal() {
        let chatHtml = $(`
            <div class="gemina-chat" style="padding: 15px; font-size: 18px; max-height: 70vh; display: flex; flex-direction: column; gap: 15px;">
                <div class="gemina-messages" style="overflow-y: auto; max-height: 50vh; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;">
                    <div class="gemina-msg bot" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; align-self: flex-start;">
                        Привіт! Я Джеміна. Про що хочеш дізнатися або що порадити?
                    </div>
                </div>
                <div class="gemina-controls" style="display: flex; gap: 10px; margin-top: 10px;">
                    <div class="gemina-btn-ask selector" style="background: #2b5278; padding: 12px 20px; border-radius: 8px; text-align: center; cursor: pointer; flex-grow: 1;">
                        Запитати Джеміну
                    </div>
                </div>
            </div>
        `);

        let messagesContainer = chatHtml.find('.gemina-messages');
        let askBtn = chatHtml.find('.gemina-btn-ask');

        askBtn.on('click', function () {
            Lampa.Input.edit({
                title: 'Запитання для Джеміни',
                value: '',
                free: true
            }, function (query) {
                if (!query) return;

                messagesContainer.append(`
                    <div class="gemina-msg user" style="background: rgba(43, 82, 120, 0.4); padding: 12px; border-radius: 10px; align-self: flex-end; text-align: right;">
                        ${query}
                    </div>
                `);

                askGemina(query, function (answer) {
                    messagesContainer.append(`
                        <div class="gemina-msg bot" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; align-self: flex-start; white-space: pre-line;">
                            ${answer}
                        </div>
                    `);
                    messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
                });
            });
        });

        Lampa.Modal.open({
            title: 'Чат з Джеміною',
            html: chatHtml,
            size: 'medium',
            onBack: function () {
                Lampa.Modal.close();
            }
        });
    }

    // Додавання пункту в бокове меню Lampa
    function addMenuItem() {
        if ($('.menu .menu__list [data-action="gemina_chat"]').length) return;

        let menuItem = $(`
            <li class="menu__item selector" data-action="gemina_chat">
                <div class="menu__ico">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div class="menu__text">Джеміна</div>
            </li>
        `);

        menuItem.on('click', function () {
            openChatModal();
        });

        $('.menu .menu__list').append(menuItem);
    }

    // Кнопка у картці фільму
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            let cardData = e.data.movie;
            let title = cardData.title || cardData.name;
            let year = (cardData.release_date || cardData.first_air_date || '').substring(0, 4);

            let render = e.object.activity.render();
            let buttonsContainer = render.find('.full-start__buttons');

            if (buttonsContainer.length && !buttonsContainer.find('.btn-gemina').length) {
                let btn = $(`
                    <div class="full-start__button selector btn-gemina">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <span>Джеміна</span>
                    </div>
                `);

                btn.on('click', function () {
                    let prompt = `Розкажи кілька найцікавіших фактів про фільм/серіал "${title}" (${year}).`;

                    askGemina(prompt, function (answer) {
                        let html = $(`<div class="about">
                            <div class="about__body" style="padding: 20px; font-size: 20px; line-height: 1.5; max-height: 70vh; overflow-y: auto; white-space: pre-line;">
                                ${answer}
                            </div>
                        </div>`);

                        Lampa.Modal.open({
                            title: `Джеміна: ${title} (${year})`,
                            html: html,
                            size: 'medium',
                            onBack: function () {
                                Lampa.Modal.close();
                            }
                        });
                    });
                });

                buttonsContainer.append(btn);
            }
        }
    });

    // Ініціалізація
    function startPlugin() {
        registerSettings();
        addMenuItem();

        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                addMenuItem();
            }
        });
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }

    Lampa.Plugins.add({
        name: 'Gemina Helper',
        version: '1.4.0',
        description: 'Персональна ШІ-помічниця Джеміна',
        onStart: function () {
            Lampa.Noty.show('Плагін Gemina успішно завантажено!');
        }
    });

})();
