
(function () {
    'use strict';

    var PLUGIN_ID = 'chaturbate_bridge_test_110';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var panel = null;

    function showPanel() {
        if (panel) {
            panel.remove();
            panel = null;
        }

        panel = document.createElement('div');

        panel.style.cssText = [
            'position:fixed',
            'z-index:999999',
            'top:10%',
            'left:5%',
            'width:90%',
            'max-width:650px',
            'max-height:80%',
            'overflow:auto',
            'box-sizing:border-box',
            'padding:20px',
            'background:#171717',
            'color:#fff',
            'border:1px solid #555',
            'border-radius:12px',
            'font-family:Arial,sans-serif'
        ].join(';');

        panel.innerHTML = `
            <div style="font-size:21px;font-weight:bold;margin-bottom:15px">
                CHaturbate Bridge Test 1.1.0
            </div>

            <div style="font-size:14px;color:#bbb;margin-bottom:15px">
                Вибери тест. Відкриття example.com може перевести
                Lampa до зовнішнього браузера.
            </div>

            <button id="cb_test_native"
                style="width:100%;padding:14px;margin-bottom:10px;
                background:#315b9b;color:white;border:0;border-radius:7px">
                1. Тест AndroidJS.openBrowser
            </button>

            <button id="cb_test_lampa"
                style="width:100%;padding:14px;margin-bottom:10px;
                background:#38734a;color:white;border:0;border-radius:7px">
                2. Тест Lampa.Android.openBrowser
            </button>

            <pre id="cb_test_result"
                style="white-space:pre-wrap;overflow-wrap:anywhere;
                background:#080808;padding:12px;border-radius:7px;
                color:#ddd;font-size:13px;min-height:100px">Очікування тесту...</pre>

            <button id="cb_test_close"
                style="width:100%;padding:12px;background:#555;
                color:white;border:0;border-radius:7px">
                Закрити
            </button>
        `;

        document.body.appendChild(panel);

        var result = panel.querySelector('#cb_test_result');

        function print(text) {
            result.textContent = text;
        }

        function describeError(error) {
            var output = '';

            try {
                output += 'Тип: ' + (error && error.name || 'невідомий') + '\n';
                output += 'Повідомлення: ' + (error && error.message || String(error)) + '\n';

                if (error && error.stack) {
                    output += '\nStack:\n' + error.stack;
                }
            } catch (e) {
                output += 'Не вдалося прочитати помилку: ' + String(e);
            }

            return output;
        }

        function runTest(label, callback) {
            print('Виконується: ' + label + '\n\nОчікуйте...');

            try {
                var response = callback();

                var output = 'ВИКЛИК ВИКОНАНО БЕЗ СИНХРОННОЇ ПОМИЛКИ\n\n';
                output += 'Тип результату: ' + typeof response + '\n';

                if (response !== undefined) {
                    try {
                        output += 'Результат: ' + String(response);
                    } catch (e) {
                        output += 'Результат не вдалося перетворити на текст.';
                    }
                } else {
                    output += 'Результат: undefined';
                }

                print(output);
            } catch (error) {
                print('ПОМИЛКА ПІД ЧАС ВИКЛИКУ\n\n' + describeError(error));
            }
        }

        panel.querySelector('#cb_test_native').onclick = function () {
            runTest('AndroidJS.openBrowser', function () {
                if (typeof AndroidJS === 'undefined') {
                    throw new Error('AndroidJS не знайдено');
                }

                if (typeof AndroidJS.openBrowser !== 'function') {
                    throw new Error('AndroidJS.openBrowser недоступний');
                }

                return AndroidJS.openBrowser('https://example.com/');
            });
        };

        panel.querySelector('#cb_test_lampa').onclick = function () {
            runTest('Lampa.Android.openBrowser', function () {
                if (!window.Lampa || !Lampa.Android) {
                    throw new Error('Lampa.Android не знайдено');
                }

                if (typeof Lampa.Android.openBrowser !== 'function') {
                    throw new Error('Lampa.Android.openBrowser недоступний');
                }

                return Lampa.Android.openBrowser('https://example.com/');
            });
        };

        panel.querySelector('#cb_test_close').onclick = function () {
            panel.remove();
            panel = null;
        };
    }

    function addButton() {
        if (document.getElementById('cb_bridge_test_button')) return;

        var button = document.createElement('button');

        button.id = 'cb_bridge_test_button';
        button.textContent = 'BRIDGE TEST';

        button.style.cssText = [
            'position:fixed',
            'z-index:999998',
            'right:20px',
            'bottom:100px',
            'padding:14px 20px',
            'background:#315b9b',
            'color:white',
            'border:0',
            'border-radius:8px',
            'font-size:15px',
            'font-weight:bold'
        ].join(';');

        button.onclick = showPanel;

        document.body.appendChild(button);
    }

    function init() {
        addButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    setTimeout(init, 2000);
})();
