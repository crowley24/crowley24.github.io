
(function () {
    'use strict';

    if (window.ost_search_diag_100) return;
    window.ost_search_diag_100 = true;

    var BASE = 'https://www.ostmusic.org';
    var PREFIX = '[OSTMusic Search]';
    var lastReport = null;
    var busy = false;

    function notify(message) {
        console.log(PREFIX, message);

        try {
            if (window.Lampa &&
                Lampa.Noty &&
                Lampa.Noty.show) {
                Lampa.Noty.show(message);
            }
        } catch (e) {}
    }

    function request(url, callback) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url, true);
        xhr.timeout = 12000;

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 &&
                xhr.status < 300) {
                callback(null, xhr.responseText);
            } else {
                callback(
                    new Error('HTTP ' + xhr.status),
                    null
                );
            }
        };

        xhr.onerror = function () {
            callback(new Error('Network/CORS'), null);
        };

        xhr.ontimeout = function () {
            callback(new Error('Timeout'), null);
        };

        try {
            xhr.send();
        } catch (e) {
            callback(e, null);
        }
    }

    function analyze(html) {
        var result = {
            bytes: html.length,
            tracks: [],
            albums: [],
            title: ''
        };

        var doc = new DOMParser().parseFromString(
            html,
            'text/html'
        );

        result.title = doc.title || '';

        var links = doc.querySelectorAll('a[href]');
        var seen = {};

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            var href = link.getAttribute('href') || '';
            var name = (
                link.textContent || ''
            ).replace(/\s+/g, ' ').trim();

            var trackMatch = href.match(
                /(?:view\/track\/id\/|[?&]id=)(\d+)/i
            );

            if (trackMatch &&
                /track|view=file/i.test(href)) {
                var trackId = trackMatch[1];

                if (!seen['t' + trackId]) {
                    seen['t' + trackId] = true;

                    result.tracks.push({
                        id: trackId,
                        name: name,
                        url: href
                    });
                }
            }

            var albumMatch = href.match(
                /album\/id\/(\d+)/i
            );

            if (albumMatch) {
                var albumId = albumMatch[1];

                if (!seen['a' + albumId]) {
                    seen['a' + albumId] = true;

                    result.albums.push({
                        id: albumId,
                        name: name,
                        url: href
                    });
                }
            }
        }

        return result;
    }

    function probe(label, url, callback) {
        notify('Перевірка: ' + label);

        request(url, function (error, html) {
            if (error) {
                callback({
                    label: label,
                    url: url,
                    ok: false,
                    error: error.message
                });

                return;
            }

            var parsed = analyze(html);

            callback({
                label: label,
                url: url,
                ok: true,
                bytes: parsed.bytes,
                title: parsed.title,
                tracks: parsed.tracks,
                albums: parsed.albums
            });
        });
    }

    function run() {
        if (busy) {
            notify('Перевірка вже виконується');
            return;
        }

        busy = true;

        var tests = [
            {
                label: 'Interstellar — альбом',
                url: BASE + '/album/id/62'
            },
            {
                label: 'Inception — альбом',
                url: BASE + '/album/id/67'
            },
            {
                label: 'Каталог фільмів',
                url: BASE + '/movies'
            },
            {
                label: 'Пошуковий запит',
                url: BASE +
                    '/?searchword=Interstellar'
            }
        ];

        var report = [];
        var index = 0;

        function next() {
            if (index >= tests.length) {
                busy = false;
                lastReport = report;

                var success = 0;
                var tracks = 0;
                var albums = 0;

                report.forEach(function (item) {
                    if (item.ok) {
                        success++;
                        tracks += item.tracks.length;
                        albums += item.albums.length;
                    }

                    console.log(
                        PREFIX,
                        JSON.stringify(item, null, 2)
                    );
                });

                notify(
                    'Готово: ' + success +
                    '/4 сторінки; треків: ' +
                    tracks + '; альбомів: ' +
                    albums
                );

                return;
            }

            var test = tests[index++];

            probe(
                test.label,
                test.url,
                function (result) {
                    report.push(result);

                    if (result.ok) {
                        notify(
                            test.label +
                            ': OK, треків ' +
                            result.tracks.length
                        );
                    } else {
                        notify(
                            test.label +
                            ': ' + result.error
                        );
                    }

                    next();
                }
            );
        }

        next();
    }

    function showReport() {
        if (!lastReport) {
            notify('Спочатку запусти перевірку');
            return;
        }

        var lines = lastReport.map(function (item) {
            return item.label + ': ' +
                (item.ok
                    ? 'OK, tracks=' +
                      item.tracks.length +
                      ', albums=' +
                      item.albums.length
                    : item.error);
        });

        notify(lines.join(' | '));

        console.log(
            PREFIX,
            'Повний звіт:',
            lastReport
        );
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'ost_search_diag',
            name: 'OSTMusic Search Diagnostic',
            icon: 'music'
        });

        Lampa.SettingsApi.addParam({
            component: 'ost_search_diag',
            param: {
                name: 'ost_diag_run',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Перевірити OSTMusic',
                description:
                    'Доступ до альбомів, треків і каталогу'
            },
            onChange: run
        });

        Lampa.SettingsApi.addParam({
            component: 'ost_search_diag',
            param: {
                name: 'ost_diag_report',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Показати результат'
            },
            onChange: showReport
        });
    }

    window.OSTMusicDiagnostic = {
        version: '1.0',
        run: run,
        report: function () {
            return lastReport;
        }
    };

    function init() {
        try {
            addSettings();
            console.log(PREFIX, 'Ready 1.0');
        } catch (e) {
            console.error(PREFIX, e);
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
