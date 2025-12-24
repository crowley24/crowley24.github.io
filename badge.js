(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    const CACHE_TIME = 24 * 60 * 60 * 1000;
    const CACHE_KEY = 'applecation_quality_cache_v1';

    /* =========================
       CSS
    ========================= */
    if (!window.applecation_badges_style) {
        window.applecation_badges_style = true;

        $('head').append(`
        <style>
        .applecation-badges {
            position: absolute;
            top: 0.6em;
            left: 0.6em;
            display: flex;
            gap: 0.35em;
            z-index: 6;
            pointer-events: none;
            flex-wrap: wrap;
        }

        .applecation-badge {
            font-size: 0.7em;
            padding: 0.25em 0.5em;
            border-radius: 0.35em;
            font-weight: 600;
            line-height: 1;
            color: #fff;
            background: rgba(0,0,0,0.75);
            backdrop-filter: blur(6px);
            white-space: nowrap;
        }

        .applecation-badge--4k { background: #e50914; }
        .applecation-badge--hdr { background: #0db6ff; }
        .applecation-badge--dv { background: #6b4eff; }
        .applecation-badge--audio { background: #2ecc71; }
        .applecation-badge--dub { background: #f39c12; }

        body.light--version .applecation-badge {
            background: rgba(255,255,255,0.9);
            color: #111;
        }
        </style>
        `);
    }

    /* =========================
       CACHE
    ========================= */
    function getCache() {
        return Lampa.Storage.get(CACHE_KEY, {});
    }

    function setCache(id, data) {
        const cache = getCache();
        cache[id] = {
            time: Date.now(),
            data: data
        };
        Lampa.Storage.set(CACHE_KEY, cache);
    }

    function getCached(id) {
        const cache = getCache();
        if (!cache[id]) return null;
        if (Date.now() - cache[id].time > CACHE_TIME) return null;
        return cache[id].data;
    }

    /* =========================
       FFPROBE ANALYZE
    ========================= */
    function analyzeContentQuality(ffprobe) {
        if (!Array.isArray(ffprobe)) return null;

        const q = {
            quality: null,
            hdr: false,
            dv: false,
            hdr_type: null,
            sound: null,
            dub: false
        };

        const video = ffprobe.find(s => s.codec_type === 'video');
        if (video) {
            const w = video.width || 0;
            const h = video.height || 0;

            if (h >= 2160 || w >= 3840) q.quality = '4K';
            else if (h >= 1440 || w >= 2560) q.quality = '2K';
            else if (h >= 1080 || w >= 1920) q.quality = 'FULL HD';
            else if (h >= 720 || w >= 1280) q.quality = 'HD';

            if (video.side_data_list) {
                video.side_data_list.forEach(d => {
                    if (d.side_data_type.includes('Dolby')) {
                        q.dv = true;
                        q.hdr = true;
                    }
                    if (d.side_data_type.includes('HDR') ||
                        d.side_data_type.includes('Mastering')) {
                        q.hdr = true;
                    }
                });
            }

            if (video.color_transfer) {
                if (video.color_transfer.includes('2084')) {
                    q.hdr = true;
                    q.hdr_type = 'HDR10';
                }
            }
        }

        let maxChannels = 0;
        ffprobe.filter(s => s.codec_type === 'audio').forEach(a => {
            if (a.channels && a.channels > maxChannels) maxChannels = a.channels;

            if (a.tags) {
                const lang = (a.tags.language || '').toLowerCase();
                const title = (a.tags.title || '').toLowerCase();
                if ((lang === 'ru' || lang === 'rus') &&
                    (title.includes('dub') || title.includes('дуб'))) {
                    q.dub = true;
                }
            }
        });

        if (maxChannels >= 8) q.sound = '7.1';
        else if (maxChannels >= 6) q.sound = '5.1';
        else if (maxChannels >= 2) q.sound = '2.0';

        return q;
    }

    /* =========================
       PARSER ANALYZE
    ========================= */
    function analyzeMovie(movie) {
        if (!movie || !movie.id || !Lampa.Parser) return;

        const cached = getCached(movie.id);
        if (cached) {
            movie.applecation_quality = cached;
            return;
        }

        Lampa.Parser.get({
            search: movie.title || movie.name,
            movie: movie,
            page: 1
        }, (res) => {
            if (!res || !res.Results) return;

            const final = {
                quality: null,
                hdr: false,
                dv: false,
                hdr_type: null,
                sound: null,
                dub: false
            };

            res.Results.forEach(t => {
                if (t.ffprobe) {
                    const q = analyzeContentQuality(t.ffprobe);
                    if (!q) return;

                    if (!final.quality || q.quality === '4K') final.quality = q.quality || final.quality;
                    final.hdr = final.hdr || q.hdr;
                    final.dv = final.dv || q.dv;
                    final.sound = final.sound || q.sound;
                    final.dub = final.dub || q.dub;
                }

                const title = (t.Title || '').toLowerCase();
                if (title.includes('dolby vision') || title.includes('dv')) {
                    final.dv = true;
                    final.hdr = true;
                }
                if (title.includes('hdr10+')) final.hdr_type = 'HDR10+';
                else if (title.includes('hdr')) final.hdr = true;
            });

            movie.applecation_quality = final;
            setCache(movie.id, final);
        });
    }

    /* =========================
       BADGES
    ========================= */
    function renderBadges(card) {
        if (!card || !card.data || card.__applecation) return;

        const q = card.data.applecation_quality;
        if (!q) return;

        const el = card.render(true);
        if (!el) return;

        const wrap = document.createElement('div');
        wrap.className = 'applecation-badges';

        function add(text, cls) {
            const b = document.createElement('div');
            b.className = 'applecation-badge ' + cls;
            b.textContent = text;
            wrap.appendChild(b);
        }

        if (q.quality) add(q.quality, 'applecation-badge--4k');
        if (q.dv) add('DV', 'applecation-badge--dv');
        else if (q.hdr) add(q.hdr_type || 'HDR', 'applecation-badge--hdr');
        if (q.sound) add(q.sound, 'applecation-badge--audio');
        if (q.dub) add('DUB', 'applecation-badge--dub');

        el.style.position = 'relative';
        el.appendChild(wrap);

        card.__applecation = wrap;
    }

    /* =========================
       CARD HOOK
    ========================= */
    const origUse = Lampa.Card.prototype.use;
    Lampa.Card.prototype.use = function (obj) {
        const card = this;

        const wrap = {
            onVisible() {
                if (card.data) {
                    analyzeMovie(card.data);
                    renderBadges(card);
                }
                obj.onVisible && obj.onVisible.call(card);
            },
            onDestroy() {
                if (card.__applecation) card.__applecation.remove();
                obj.onDestroy && obj.onDestroy.call(card);
            }
        };

        return origUse.call(card, Object.assign({}, obj, wrap));
    };

})();
