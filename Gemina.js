(function () {
    'use strict';

    // Налаштування та збереження API ключа
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            // Можна додати свій розділ або пункт у налаштуваннях
        }
    });

    // Отримання або збереження API ключа через сховище Lampa
    function getApiKey() {
        return Lampa.Storage.get('gemina_api_key', '');
    }

    // Головна функція зв'язку з Gemini API
    function askGemina(promptText, callback) {
        let apiKey = getApiKey();
        if (!apiKey) {
            Lampa.Noty.show('Будь ласка, вкажіть Gemini API Key у налаштуваннях плагіна!');
            return;
        }

        // Використовуємо швидку та ефективну модель (наприклад, gemini-2.5-flash або gemini-1.5-flash)
        let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        let data = {
            contents: [{
                parts: [{
                    text: "Ти — Джеміна, розумна та дотепна помічниця у медіацентрі Lampa. Твоє завдання — допомагати користувачу, розповідати цікаві факти про фільми та давати рекомендації. Відповідай українською мовою, цікаво та лаконічно.\n\nЗапит користувача: " + promptText
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

    // Додаємо кнопку «Цікаві факти від Джеміни» у повну картку фільму/серіалу
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
                    let prompt = `Розкажи кілька найцікавіших фактів про фільм/серіал "${title}" (${year}).`;
                    
                    askGemina(prompt, function (answer) {
                        let html = $(`<div class="about">
                            <div class="about__body" style="padding: 20px; font-size: 22px; line-height: 1.5; max-height: 70vh; overflow-y: auto;">
                                <h3>Цікаві факти від Джеміни: ${title} (${year})</h3>
                                <p style="margin-top: 15px; white-space: pre-line;">${answer}</p>
                            </div>
                        </div>`);

                        Lampa.Modal.open({
                            title: 'Джеміна',
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

    // Реєстрація плагіна в системі Lampa
    Lampa.Plugins.add({
        name: 'Gemina Helper',
        version: '1.0.0',
        description: 'Твоя персональна помічна ШІ-суддя та порадниця у світі кіно',
        onStart: function () {
            console.log('Gemina plugin started');
            
            // Якщо ключа ще немає в сховищі, можна встановити дефолтний промпт або підказку
            if (!Lampa.Storage.get('gemina_api_key')) {
                // Можеш прописати свій ключ прямо тут для тесту або зробити поле в налаштуваннях
                // Lampa.Storage.set('gemina_api_key', 'ТВІЙ_КЛЮЧ_ТУТ');
            }
        }
    });

})();
