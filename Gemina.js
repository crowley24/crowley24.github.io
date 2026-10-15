(function () {
    'use strict';

    // Ініціалізація початкового ключа або порожнього значення
    if (!Lampa.Storage.get('gemina_api_key')) {
        Lampa.Storage.set('gemina_api_key', '');
    }

    function getApiKey() {
        return Lampa.Storage.get('gemina_api_key', '');
    }

    // Головна функція запиту до Gemini API
    function askGemina(promptText, callback) {
        let apiKey = getApiKey();
        if (!apiKey) {
            Lampa.Noty.show('Вкажіть Gemini API Key у налаштуваннях Lampa!');
            return;
        }

        let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let data = {
            contents: [{
                parts: [{
                    text: "Ти — Джеміна, подруга та розумна ШІ-помічниця у медіацентрі Lampa. Відповідай українською мовою, дружньо, життєрадісно та лаконічно. Допомагай підбирати фільми, розповідай цікаві факти та відповідай на питання користувача.\n\nЗапит: " + promptText
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
                let text = data.candidates[0].content.parts[0].text;
                callback(text);
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

    // 1. Розділ у Налаштуваннях Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            let item = $(`
                <div class="settings-folder selector" data-component="gemina_settings">
                    <div class="settings-folder__icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 8v8M8 12h8"/>
                        </svg>
                    </div>
                    <div class="settings-folder__title">Помічник Джеміна</div>
                    <div class="settings-folder__descr">Налаштування Gemini API та ШІ-помічника</div>
                </div>
            `);

            item.on('click', function () {
                Lampa.Settings.main().render().find('.settings__content').empty().append(renderSettings());
            });

            e.body.find('.settings-param').first().before(item);
        }
    });

    function renderSettings() {
        let body = $('<div class="settings-list"></div>');

        let keyInput = $(`
            <div class="settings-param selector" data-type="input">
                <div class="settings-param__name">Gemini API Key</div>
                <div class="settings-param__value">${getApiKey() || 'Не вказано'}</div>
                <div class="settings-param__descr">Введіть ваш безкоштовний ключ з Google AI Studio</div>
            </div>
        `);

        keyInput.on('click', function () {
            Lampa.Input.edit({
                title: 'Gemini API Key',
                value: getApiKey(),
                free: true
            }, function (value) {
                Lampa.Storage.set('gemina_api_key', value.trim());
                keyInput.find('.settings-param__value').text(value.trim() || 'Не вказано');
            });
        });

        body.append(keyInput);
        return body;
    }

    // 2. Відкриття інтерактивного чату Джеміни
    function openChatModal() {
        let chatHtml = $(`
            <div class="gemina-chat" style="padding: 15px; font-size: 18px; max-height: 70vh; display: flex; flex-direction: column; gap: 15px;">
                <div class="gemina-messages" style="overflow-y: auto; max-height: 50vh; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;">
                    <div class="gemina-msg bot" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; align-self: flex-start;">
                        Привіт! Я Джеміна. Що ти хочеш подивитися сьогодні або про що розказати?
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

    // 3. Додавання пункту в головне меню Lampa (лівий бар)
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
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
    });

    // 4. Кнопка Джеміни в картці фільму
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            let cardData = e.data.movie;
            let title = cardData.title || cardData.name;
            let year = (cardData.release_date || cardData.first_air_date || '').substring(0, 4);

            let render = e.object.activity.render();
            let buttonsContainer = render.find('.full-start__buttons');

            if (buttonsContainer.length) {
                let btn = $(`
                    <div class="full-start__button selector">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <span>Джеміна</span>
                    </div>
                `);

                btn.on('click', function () {
                    let prompt = `Розкажи кілька найцікавіших фактів або короткий огляд без спойлерів про "${title}" (${year}).`;

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

    // Реєстрація плагіна
    Lampa.Plugins.add({
        name: 'Gemina Helper',
        version: '1.1.0',
        description: 'Персональна ШІ-помічниця Джеміна для Lampa',
        onStart: function () {
            console.log('Gemina plugin 1.1.0 loaded');
        }
    });

})();
