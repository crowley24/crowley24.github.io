(function () {
    'use strict';

    if (window.plugin_bluray_quality) return;
    window.plugin_bluray_quality = true;

    var cache = {};

    function esc(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalize(s) {
        return String(s || '')
            .replace(/[^\wа-яіїєґА-ЯІЇЄҐ\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getTitle(data) {
        return normalize(
            data.title ||
            data.name ||
            data.original_title ||
            data.original_name ||
            ''
        );
    }

    function getYear(data) {
        var date =
            data.release_date ||
            data.first_air_date ||
            data.year ||
            '';

        var m = String(date).match(/\d{4}/);
        return m ? m[0] : '';
    }

    function parsePage(html) {
        var text = String(html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/\s+/g, ' ');

        var result = {
            resolution: '',
            hdr: [],
            audio: [],
            codec: '',
            is4k: false,
            native: false,
            upscaled: false
        };

        if (/Native\s+4K\s*\(2160p\)/i.test(text)) {
            result.resolution = '4K';
            result.native = true;
            result.is4k = true;
        } else if (/Upscaled\s+4K\s*\(2160p\)/i.test(text)) {
            result.resolution = '4K';
            result.upscaled = true;
            result.is4k = true;
        } else if (/2160p/i.test(text)) {
            result.resolution = '2160p';
            result.is4k = true;
        } else if (/1080p/i.test(text)) {
            result.resolution = '1080p';
        } else if (/720p/i.test(text)) {
            result.resolution = '720p';
        }

        if (/Dolby\s+Vision/i.test(text))
            result.hdr.push('DV');

        if (/HDR10\+/i.test(text))
            result.hdr.push('HDR10+');

        if (/HDR10/i.test(text))
            result.hdr.push('HDR10');

        if (/\bHDR\b/i.test(text) && !result.hdr.length)
            result.hdr.push('HDR');

        if (/HEVC\s*\/?\s*H\.265/i.test(text))
            result.codec = 'HEVC';

        if (/Dolby\s+Atmos/i.test(text))
            result.audio.push('Atmos');

        if (/Dolby\s+TrueHD/i.test(text))
            result.audio.push('TrueHD');

        if (/DTS-HD\s+Master\s+Audio/i.test(text))
            result.audio.push('DTS-HD MA');

        if (/DTS:X/i.test(text))
            result.audio.push('DTS:X');

        return result;
    }

    function render(result) {
        if (!result || !result.is4k) {
            return '<div class="bluray-quality-empty">' +
                'Blu-ray.com: 4K реліз не знайдено' +
                '</div>';
        }

        var html = '<div class="bluray-quality">';

        html += '<div class="bluray-quality-title">Blu-ray.com</div>';

        if (result.resolution) {
            html += '<span class="bluray-badge">' +
                esc(result.resolution) +
                '</span>';
        }

        if (result.native) {
            html += '<span class="bluray-badge">NATIVE</span>';
        }

        if (result.upscaled) {
            html += '<span class="bluray-badge">UPSCALED</span>';
        }

        result.hdr.forEach(function (x) {
            html += '<span class="bluray-badge">' +
                esc(x) +
                '</span>';
        });

        result.audio.forEach(function (x) {
            html += '<span class="bluray-badge">' +
                esc(x) +
                '</span>';
        });

        if (result.codec) {
            html += '<span class="bluray-badge">' +
                esc(result.codec) +
                '</span>';
        }

        html += '</div>';

        return html;
    }

    function addStyle() {
        if (document.getElementById('bluray-quality-style')) return;

        var style = document.createElement('style');
        style.id = 'bluray-quality-style';

        style.textContent =
            '.bluray-quality{' +
                'display:flex;' +
                'flex-wrap:wrap;' +
                'gap:6px;' +
                'align-items:center;' +
                'margin:10px 0;' +
                'font-size:14px;' +
            '}' +

            '.bluray-quality-title{' +
                'width:100%;' +
                'font-size:13px;' +
                'opacity:.65;' +
                'margin-bottom:2px;' +
            '}' +

            '.bluray-badge{' +
                'display:inline-flex;' +
                'align-items:center;' +
                'padding:4px 8px;' +
                'border-radius:5px;' +
                'background:rgba(255,255,255,.12);' +
                'font-weight:600;' +
                'line-height:1;' +
            '}' +

            '.bluray-quality-empty{' +
                'font-size:13px;' +
                'opacity:.5;' +
                'margin:10px 0;' +
            '}';

        document.head.appendChild(style);
    }

    function request(url, success, error) {
        if (Lampa.Reguest && Lampa.Reguest.get) {
            Lampa.Reguest.get(
                url,
                success,
                error
            );
            return;
        }

        if (Lampa.Reguest && Lampa.Reguest.silent) {
            Lampa.Reguest.silent(
                url,
                success,
                error
            );
            return;
        }

        fetch(url)
            .then(function (r) {
                return r.text();
            })
            .then(success)
            .catch(error);
    }

    function search(title, year, done) {
        var query = encodeURIComponent(
            title + (year ? ' ' + year : '')
        );

        /*
         * Тестовий пошук Blu-ray.com.
         * Після першого тесту endpoint можна буде
         * скоригувати під фактичну відповідь сайту.
         */
        var url =
            'https://www.blu-ray.com/search/?quicksearch=' +
            query;

        request(
            url,
            function (html) {
                done(null, html);
            },
            function () {
                done('request_error');
            }
        );
    }

    function process(data) {
        if (!data) return;

        var title = getTitle(data);
        var year = getYear(data);

        if (!title) return;

        var key = title + '_' + year;

        if (cache[key]) {
            show(cache[key]);
            return;
        }

        search(title, year, function (err, html) {
            if (err || !html) {
                show(null);
                return;
            }

            var result = parsePage(html);

            cache[key] = result;

            show(result);
        });
    }

    function show(result) {
        addStyle();

        var old = document.querySelector(
            '.bluray-quality-test'
        );

        if (old) old.remove();

        var block = document.createElement('div');
        block.className = 'bluray-quality-test';

        block.innerHTML = render(result);

        /*
         * Поки що показуємо блок у body,
         * щоб перевірити отримання даних.
         *
         * Після успішного тесту перенесемо його
         * безпосередньо у потрібне місце NewCard.
         */
        document.body.appendChild(block);

        block.style.position = 'fixed';
        block.style.left = '20px';
        block.style.bottom = '20px';
        block.style.zIndex = '999999';
        block.style.padding = '10px 12px';
        block.style.borderRadius = '8px';
        block.style.background = 'rgba(0,0,0,.85)';
        block.style.maxWidth = '80vw';
    }

    function init() {
        addStyle();

        /*
         * Перехоплюємо відкриття card.
         */
        if (
            Lampa.Listener &&
            Lampa.Listener.follow
        ) {
            Lampa.Listener.follow(
                'full',
                function (e) {
                    if (!e || !e.data) return;

                    setTimeout(function () {
                        process(e.data);
                    }, 300);
                }
            );
        }

        /*
         * Додатковий варіант для різних версій Lampa.
         */
        if (
            Lampa.Listener &&
            Lampa.Listener.follow
        ) {
            Lampa.Listener.follow(
                'activity',
                function (e) {
                    if (!e || !e.object) return;

                    var data =
                        e.object.data ||
                        e.object.movie ||
                        e.object;

                    if (
                        data &&
                        (
                            data.title ||
                            data.name
                        )
                    ) {
                        setTimeout(function () {
                            process(data);
                        }, 500);
                    }
                }
            );
        }
    }

    if (window.Lampa) {
        init();
    } else {
        var timer = setInterval(function () {
            if (window.Lampa) {
                clearInterval(timer);
                init();
            }
        }, 500);
    }

})();
