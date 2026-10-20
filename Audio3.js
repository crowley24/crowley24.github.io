
(function () {
    'use strict';

    if (window.ost_network_test_100) return;
    window.ost_network_test_100 = true;

    var URL = 'https://www.ostmusic.org/album/id/62';
    var results = [];
    var running = false;

    function notify(message) {
        console.log('[OST Network]', message);

        try {
            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    function summarize(html) {
        var text = typeof html === 'string'
            ? html
            : JSON.stringify(html || '');

        return {
            length: text.length,
            isHTML: /<html|<!doctype/i.test(text),
            interstellar: /interstellar/i.test(text),
            tracks: (
                text.match(/view\/track\/id\/\d+/gi) || []
            ).length,
            preview: text.substring(0, 150)
        };
    }

    function record(name, success, detail) {
        results.push({
            method: name,
            success: success,
            detail: detail
        });

        console.log(
            '[OST Network]',
            name,
            success ? 'SUCCESS' : 'FAILED',
            detail
        );

        notify(
            name + ': ' +
            (success ? 'OK' : 'ПОМИЛКА')
        );
    }

    function testXHR(done) {
        var xhr = new XMLHttpRequest();
        var finished = false;

        function finish(ok, info) {
            if (finished) return;
            finished = true;

            record('XHR', ok, info);
            done();
        }

        xhr.open('GET', URL, true);
        xhr.timeout = 12000;

        xhr.onload = function () {
            var ok = xhr.status >= 200 &&
                     xhr.status < 300;

            finish(
                ok,
                ok
                    ? summarize(xhr.responseText)
                    : 'HTTP ' + xhr.status
            );
        };

        xhr.onerror = function () {
            finish(false, 'Network/CORS');
        };

        xhr.ontimeout = function () {
            finish(false, 'Timeout');
        };

        try {
            xhr.send();
        } catch (e) {
            finish(false, e.message);
        }
    }

    function testReguest(done) {
        if (!Lampa.Reguest) {
            record(
                'Lampa.Reguest',
                false,
                'API відсутній'
            );
            done();
            return;
        }

        var finished = false;
        var timeout = null;

        function finish(ok, info) {
            if (finished) return;
            finished = true;

            clearTimeout(timeout);

            record('Lampa.Reguest', ok, info);
            done();
        }

        timeout = setTimeout(function () {
            finish(false, 'Timeout');
        }, 12000);

        try {
            var request = new Lampa.Reguest();

            request.silent(
                URL,
                function (data) {
                    finish(true, summarize(data));
                },
                function (error) {
                    finish(
                        false,
                        error
                            ? String(error.status ||
                                     error.message ||
                                     error)
                            : 'Request failed'
                    );
                },
                false,
                {
                    dataType: 'text',
                    timeout: 10000
                }
            );
        } catch (e) {
            finish(false, e.message);
        }
    }

    function testFetch(done) {
        if (typeof fetch !== 'function') {
            record('fetch', false, 'API відсутній');
            done();
            return;
        }

        var finished = false;
        var timeout = setTimeout(function () {
            finish(false, 'Timeout');
        }, 12000);

        function finish(ok, info) {
            if (finished) return;
            finished = true;

            clearTimeout(timeout);

            record('fetch', ok, info);
            done();
        }

        fetch(URL).then(function (response) {
            if (!response.ok) {
                throw new Error(
                    'HTTP ' + response.status
                );
            }

            return response.text();
        }).then(function (html) {
            finish(true, summarize(html));
        }).catch(function (error) {
            finish(false, error.message);
        });
    }

    function run() {
        if (running) {
            notify('Тест уже виконується');
            return;
        }

        running = true;
        results = [];

        notify('Починаємо мережевий тест...');

        testXHR(function () {
            testReguest(function () {
                testFetch(function () {
                    running = false;

                    var successful = results.filter(
                        function (item) {
                            return item.success;
                        }
                    ).length;

                    notify(
                        'Готово: ' +
                        successful +
                        '/3 способи працюють'
                    );

                    console.log(
                        '[OST Network] FULL REPORT',
                        JSON.stringify(results, null, 2)
                    );
                });
            });
        });
    }

    function showReport() {
        if (!results.length) {
            notify('Спочатку запусти тест');
            return;
        }

        var message = results.map(function (item) {
            return item.method + ': ' +
                (item.success ? 'OK' : 'FAIL');
        }).join(' | ');

        notify(message);

        console.log(
            '[OST Network] REPORT',
            results
        );
    }

    function init() {
        try {
            Lampa.SettingsApi.addComponent({
                component: 'ost_network_test',
                name: 'OSTMusic Network Test',
                icon: 'music'
            });

            Lampa.SettingsApi.addParam({
                component: 'ost_network_test',
                param: {
                    name: 'ost_network_run',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Перевірити мережевий доступ',
                    description:
                        'XHR / Lampa.Reguest / fetch'
                },
                onChange: run
            });

            Lampa.SettingsApi.addParam({
                component: 'ost_network_test',
                param: {
                    name: 'ost_network_report',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: 'Показати результат'
                },
                onChange: showReport
            });

            console.log('[OST Network] Ready 1.0');
        } catch (e) {
            console.error('[OST Network]', e);
        }
    }

    if (window.Lampa) {
        init();
    } else {
        var attempts = 0;
        var wait = setInterval(function () {
            attempts++;

            if (window.Lampa) {
                clearInterval(wait);
                init();
            } else if (attempts >= 40) {
                clearInterval(wait);
            }
        }, 500);
    }

})();
