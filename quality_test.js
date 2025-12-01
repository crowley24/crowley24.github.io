(function () {
    'use strict';
    
    // =======================================================
    // I. КОНФІГУРАЦІЯ (ЗМІНЕНО: Q_LOGGING завжди true для діагностики)
    // =======================================================
    var Q_LOGGING = true; // УВІМКНЕНО для діагностики помилок
    var Q_CACHE_TIME = 24 * 60 * 60 * 1000; 
    var QUALITY_CACHE = 'maxsm_ratings_quality_cache';
    var JACRED_PROTOCOL = 'http://';
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz'; 
    var JACRED_API_KEY = Lampa.Storage.get(''); 
    var PROXY_TIMEOUT = 5000;
    
    // ОНОВЛЕНО: Додано новий, потенційно більш надійний проксі
    var PROXY_LIST = [
        'https://api.allorigins.win/raw?url=', // Змінено на HTTPS
        'https://api.codetabs.com/v1/proxy?quest=', // Новий, надійний проксі
        'http://cors.bwa.workers.dev/'
    ];

    // ... (Стилі та getCardType без змін) ...

    // Функція для роботи з проксі (ОНОВЛЕНО: додано try/catch для fetch)
    function fetchWithProxy(url, cardId, callback) {
        var currentProxyIndex = 0;
        var callbackCalled = false;

        function tryNextProxy() {
            if (currentProxyIndex >= PROXY_LIST.length) {
                if (!callbackCalled) {
                    callbackCalled = true;
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: All proxies failed for " + url);
                    callback(new Error('All proxies failed for ' + url));
                }
                return;
            }
            
            // Використовуємо HTTPS для проксі, якщо доступно, для більшої надійності
            var currentProxy = PROXY_LIST[currentProxyIndex];
            var proxyUrl = currentProxy + encodeURIComponent(url);
            
            if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", Fetch with proxy: " + proxyUrl);
            
            var timeoutId = setTimeout(function() {
                if (!callbackCalled) {
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: Proxy request timed out: " + currentProxy);
                    currentProxyIndex++;
                    tryNextProxy();
                }
            }, PROXY_TIMEOUT);
            
            fetch(proxyUrl)
                .then(function(response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) {
                        // Якщо проксі повернув помилку, переходимо до наступного
                        throw new Error('Proxy error: ' + response.status + ' from ' + currentProxy);
                    }
                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        clearTimeout(timeoutId);
                        callback(null, data);
                    }
                })
                .catch(function(error) {
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", Proxy fetch error for " + currentProxy + ":", error);
                    clearTimeout(timeoutId);
                    if (!callbackCalled) {
                        currentProxyIndex++;
                        tryNextProxy();
                    }
                });
        }
        tryNextProxy();
    }

    // Функція отримання якості з JacRed (ОНОВЛЕНО: додано try/catch для JSON.parse)
    function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
        // ... (перевірки року та формування URL без змін) ...

        function searchJacredApi(searchTitle, searchYear, exactMatch, strategyName, apiCallback) {
            // ... (формування apiUrl без змін) ...

            var timeoutId = setTimeout(function() {
                if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " request timed out.");
                apiCallback(null);
            }, PROXY_TIMEOUT * PROXY_LIST.length + 1000);

            fetchWithProxy(apiUrl, cardId, function(error, responseText) {
                clearTimeout(timeoutId);
                if (error || !responseText) {
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " request failed:", error || "Empty response");
                    apiCallback(null);
                    return;
                }
                
                try {
                    // АРХІВАЖЛИВО: Огортаємо парсинг у try...catch
                    var torrents = JSON.parse(responseText);
                    
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        if (Q_LOGGING) console.log("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " received no torrents.");
                        apiCallback(null);
                        return;
                    }
                    
                    // ... (Логіка визначення найкращого торрента без змін) ...

                    // ... (обчислення display та виклик apiCallback) ...
                    
                } catch (e) {
                    // Виводимо помилку парсингу, якщо відповідь не є валідним JSON
                    console.error("MAXSM-RATINGS", "card: " + cardId + ", quality: JacRed: " + strategyName + " error parsing response. Response was: " + responseText.substring(0, 100) + '...', e);
                    apiCallback(null);
                }
            });
        }
        
        // ... (Логіка стратегій пошуку без змін) ...
    }
    
    // ... (Усі інші функції без змін) ...
    
    // Ініціалізація плагіна
    function startPlugin() {
        console.log("MAXSM-RATINGS-QUALITY", "Plugin started!");
        
        // ... (Налаштування localStorage без змін) ...

        // Запуск observer, якщо включено відображення якості в списках
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {
            try {
                observer.observe(document.body, { childList: true, subtree: true });
                console.log('MAXSM-RATINGS: observer Start');
            } catch (e) {
                console.error('MAXSM-RATINGS: Failed to start MutationObserver', e);
            }
            
            // Обробка вже існуючих карток
            var existingCards = document.querySelectorAll('.card');
            if (existingCards.length) updateCards(existingCards);
        }
    }

    if (!window.maxsmRatingsQualityPlugin) {
        window.maxsmRatingsQualityPlugin = true;
        startPlugin();
    }
})();
