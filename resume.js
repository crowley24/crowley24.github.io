/*!
 * Lampa Resume Button Plugin
 *
 * Adds a "▶ Продолжить" button to the full movie card that jumps directly
 * to the last-watched episode/position in a single click.
 *
 * Works by:
 *   1. Hooking Lampa.Player.listener('start') → caches {url, quality, title,
 *      subtitles, translate, timeline, playlist} keyed by tmdb_id.
 *   2. Monkey-patching Lampa.Player.playlist(arr) → captures the lazy
 *      playlist online_mod builds (so next-episode works on resume too).
 *   3. On full-card render (Lampa.Listener.follow('full','complite')) →
 *      checks the cache for this tmdb_id; if present, injects a resume
 *      button into .buttons--container.
 *   4. On click → reads Lampa.Timeline.view(hash).percent. If < 0.85,
 *      replays the same episode (Lampa auto-seeks via timeline.hash);
 *      if ≥ 0.85, advances to the next item in the cached playlist.
 */
(function () {
    'use strict';

    if (!window.Lampa) {
        console.warn('[resume] Lampa not ready, aborting');
        return;
    }

    var STORAGE_KEY = 'resume_plugin_cache';
    var VERSION = '0.0.1';
    var DONE_THRESHOLD = 0.85;

    function getCache() {
        var raw = Lampa.Storage.get(STORAGE_KEY, '{}');
        try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); }
        catch (e) { return {}; }
    }

    function saveCache(obj) {
        // Prune entries older than 180 days — keeps localStorage small.
        var cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180;
        Object.keys(obj).forEach(function (k) {
            if (!obj[k] || obj[k].ts < cutoff) delete obj[k];
        });
        Lampa.Storage.set(STORAGE_KEY, JSON.stringify(obj));
    }

    function currentCardId() {
        try {
            var a = Lampa.Activity.active();
            if (a) {
                if (a.card && a.card.id) return a.card.id;
                if (a.component == 'full' && a.id) return a.id;
                if (a.movie && a.movie.id) return a.movie.id;
            }
            // Fallback: walk the activity stack (player may open a nested
            // component like `online_mod`, `player`, etc. that doesn't carry
            // the tmdb id directly — the parent `full` does).
            var stack = (Lampa.Activity.all && Lampa.Activity.all()) || [];
            for (var i = stack.length - 1; i >= 0; i--) {
                var s = stack[i];
                if (s && s.component == 'full' && s.id) return s.id;
                if (s && s.card && s.card.id) return s.card.id;
                if (s && s.movie && s.movie.id) return s.movie.id;
            }
        } catch (e) {}
        return null;
    }

    // ----- 1. Capture every Lampa.Player.play call -----
    // Lampa.Player fires 'start' with the play-data object directly (not
    // wrapped in {data: ...}). See lampa-source src/interaction/player.js:935.
    if (Lampa.Player && Lampa.Player.listener && Lampa.Player.listener.follow) {
        Lampa.Player.listener.follow('start', function (data) {
            if (!data || !data.url) return;

            var tmdb_id = (data.card && data.card.id) || currentCardId();
            if (!tmdb_id) return;

            var cache = getCache();
            var prev = cache[tmdb_id] || {};

            // Capture a minimal card snapshot for the "Continue Watching"
            // line on the main page (poster + title + year + media type).
            var cardInfo = null;
            if (data.card) {
                cardInfo = {
                    id: data.card.id,
                    title: data.card.title,
                    name: data.card.name,
                    original_title: data.card.original_title,
                    original_name: data.card.original_name,
                    poster_path: data.card.poster_path,
                    backdrop_path: data.card.backdrop_path,
                    release_date: data.card.release_date,
                    first_air_date: data.card.first_air_date,
                    vote_average: data.card.vote_average,
                    number_of_seasons: data.card.number_of_seasons,
                    source: data.card.source || 'tmdb',
                    media_type: data.card.media_type || (data.card.name ? 'tv' : 'movie')
                };
            }

            cache[tmdb_id] = {
                ts: Date.now(),
                url: data.url,
                quality: data.quality,
                title: data.title,
                subtitles: data.subtitles,
                translate: data.translate,
                timeline: data.timeline,       // {hash, time, duration, percent, ...}
                card_id: tmdb_id,
                card: cardInfo || (prev.card || null),
                // Keep last-seen playlist (written by monkey-patched playlist(arr))
                playlist: prev.playlist || null,
                // Fingerprint so we can match this `url` inside the playlist later
                source_hint: {
                    url: data.url,
                    hash: data.timeline && data.timeline.hash
                }
            };

            saveCache(cache);
        });
    }

    // ----- 2. Monkey-patch Lampa.Player.playlist to capture lazy playlists -----
    if (Lampa.Player && typeof Lampa.Player.playlist === 'function') {
        var _origPlaylist = Lampa.Player.playlist;
        Lampa.Player.playlist = function (arr) {
            try {
                var tmdb_id = currentCardId();
                if (tmdb_id && Array.isArray(arr)) {
                    var cache = getCache();
                    cache[tmdb_id] = cache[tmdb_id] || { ts: Date.now(), card_id: tmdb_id };
                    // Serialize: drop lazy fn urls (can't store functions), keep timeline+title.
                    // We mark lazy entries so we know to re-fetch via playlist mechanism.
                    cache[tmdb_id].playlist = arr.map(function (item) {
                        return {
                            title: item.title,
                            timeline: item.timeline,
                            url: typeof item.url === 'string' ? item.url : null,
                            lazy: typeof item.url === 'function'
                        };
                    });
                    cache[tmdb_id].ts = Date.now();
                    saveCache(cache);
                }
            } catch (err) {
                console.warn('[resume] playlist capture failed', err);
            }
            return _origPlaylist.apply(this, arguments);
        };
    }

    // ----- 3. Inject Resume button on full-card render -----
    function ensureStyles() {
        if (document.getElementById('resume-plugin-style')) return;
        // Keep defaults — Lampa's own button CSS handles color/size.
        // Nothing to override for now; kept for future theming hooks.
        var style = document.createElement('style');
        style.id = 'resume-plugin-style';
        style.textContent = '';
        document.head.appendChild(style);
    }

    function getTimelinePercent(entry) {
        try {
            var hash = entry.timeline && entry.timeline.hash;
            if (!hash) return 0;
            var view = Lampa.Timeline.view(hash);
            if (view && typeof view.percent === 'number') return view.percent / 100;
            if (view && view.duration && view.time) return view.time / view.duration;
        } catch (e) {}
        return 0;
    }

    function currentPlaylistIndex(entry) {
        if (!entry.playlist || !entry.playlist.length) return -1;
        var cur = entry.source_hint || {};
        var idx = -1;
        entry.playlist.forEach(function (p, i) {
            if (idx >= 0) return;
            if (cur.url && p.url && p.url === cur.url) idx = i;
            else if (cur.hash && p.timeline && p.timeline.hash === cur.hash) idx = i;
        });
        return idx;
    }

    function findNextInPlaylist(entry) {
        if (!entry.playlist || !entry.playlist.length) return null;
        var idx = currentPlaylistIndex(entry);
        if (idx < 0 || idx + 1 >= entry.playlist.length) return null;
        return entry.playlist[idx + 1];
    }

    // Skip the Resume button when there's nothing meaningful to resume:
    //   - fully-watched movie (no playlist)
    //   - fully-watched single-episode playlist
    //   - fully-watched LAST episode with no next available
    function shouldShowResume(entry) {
        var percent = getTimelinePercent(entry);
        if (percent < DONE_THRESHOLD) return true; // mid-episode → always resume

        var hasPlaylist = entry.playlist && entry.playlist.length > 0;
        if (!hasPlaylist) return false; // movie fully watched — nothing to resume

        if (entry.playlist.length === 1) return false; // single-item playlist, done

        var next = findNextInPlaylist(entry);
        if (!next) return false; // last episode, no next

        // Non-lazy next is clearly playable. Lazy-only next we still show (user
        // can press it; playEntryNext will Noty-warn and replay same).
        return true;
    }

    // Lampa seeks on resume using timeline.time (see player.js:93-99, requires
    // time > 10 and percent < 90). The timeline we captured at 'start' has
    // time=0, so we refresh from Lampa.Timeline.view(hash) which holds the
    // latest saved position written by timeupdate.
    function freshTimeline(timeline) {
        var base = timeline || {};
        if (!base.hash) return base;
        try {
            var view = Lampa.Timeline.view(base.hash);
            if (view && (view.time || view.percent)) {
                return {
                    hash: base.hash,
                    time: view.time || 0,
                    duration: view.duration || base.duration || 0,
                    percent: view.percent || 0,
                    profile: view.profile || base.profile || 0
                };
            }
        } catch (e) {}
        return base;
    }

    // Reconstruct a playable playlist from the cached one. Lazy entries
    // (online_mod stored a function instead of a URL) can't be restored —
    // drop them so player-panel next/prev land on real episodes only.
    function playablePlaylist(entry) {
        if (!entry.playlist || !entry.playlist.length) return null;
        var list = entry.playlist
            .filter(function (p) { return p && !p.lazy && p.url; })
            .map(function (p) {
                return {
                    url: p.url,
                    title: p.title,
                    timeline: freshTimeline(p.timeline)
                };
            });
        return list.length ? list : null;
    }

    // Lampa.Player.playlist(arr) is guarded by `if (work || preloader.wait)`
    // (player.js:1048), so calling it BEFORE play() is a no-op. We register
    // the playlist from a one-shot 'start' handler, which fires after `work`
    // is set and before Playlist.url(data.url) runs — so Playlist.set picks
    // up our array AND Playlist.url syncs `position` to the current episode.
    function registerPlaylistAfterStart(playlist) {
        if (!playlist || !playlist.length) return;
        var once = function () {
            try { Lampa.Player.playlist(playlist); } catch (e) {}
            try { Lampa.Player.listener.remove('start', once); } catch (e) {}
        };
        Lampa.Player.listener.follow('start', once);
    }

    function playEntrySame(entry) {
        var playlist = playablePlaylist(entry);
        registerPlaylistAfterStart(playlist);
        Lampa.Player.play({
            url: entry.url,
            quality: entry.quality,
            title: entry.title,
            subtitles: entry.subtitles,
            translate: entry.translate,
            timeline: freshTimeline(entry.timeline)
        });
    }

    function playEntryNext(entry, nextItem) {
        // Lazy entries (url as function at capture time) stored with url=null +
        // lazy=true. We can't call the original fn after reload, so fall back
        // to same-episode and notify.
        if (nextItem.lazy || !nextItem.url) {
            Lampa.Noty.show('Resume: следующая серия требует обычного запуска — открой источник', { time: 4000 });
            playEntrySame(entry);
            return;
        }
        var playlist = playablePlaylist(entry);
        registerPlaylistAfterStart(playlist);
        Lampa.Player.play({
            url: nextItem.url,
            title: nextItem.title,
            timeline: freshTimeline(nextItem.timeline)
        });
    }

    function onClickResume(tmdb_id) {
        var cache = getCache();
        var entry = cache[tmdb_id];
        if (!entry) return;

        var percent = getTimelinePercent(entry);

        if (percent >= DONE_THRESHOLD) {
            var next = findNextInPlaylist(entry);
            if (next) {
                playEntryNext(entry, next);
                return;
            }
            // No next known — replay same; user can navigate manually.
            Lampa.Noty.show('Resume: следующая серия не известна, продолжаю последнюю', { time: 3000 });
        }
        playEntrySame(entry);
    }

    function renderButton(container, tmdb_id, entry) {
        // Avoid duplicate insertion on re-render.
        var existing = container.find('.view--resume');
        if (existing.length) existing.remove();

        var label = 'Продолжить';
        if (entry.title) label += ' · ' + String(entry.title).slice(0, 40);

        var btn = $(
            '<div class="full-start__button selector view--resume" tabindex="0">' +
                '<svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M8 4 L26 15 L8 26 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
                    '<rect x="3" y="28.5" width="26" height="2.5" rx="1.25" opacity="0.35"/>' +
                    '<rect x="3" y="28.5" width="18" height="2.5" rx="1.25"/>' +
                '</svg>' +
                '<span>' + label + '</span>' +
            '</div>'
        );

        btn.on('hover:enter', function () { onClickResume(tmdb_id); });

        // Prepend so Resume is the first option when user presses Watch.
        container.prepend(btn);
    }

    function injectIntoFullActivity(activity) {
        try {
            if (!activity || activity.component !== 'full') return;
            var tmdb_id = (activity.card && activity.card.id) || activity.id || (activity.movie && activity.movie.id);
            if (!tmdb_id) return;

            var entry = getCache()[tmdb_id];
            if (!entry) return;
            if (!shouldShowResume(entry)) return;

            var render = activity.activity && activity.activity.render && activity.activity.render();
            if (!render || !render.find) return;

            var container = render.find('.full-start-new__buttons');
            if (!container.length) container = render.find('.buttons--container');
            if (!container.length) return;

            ensureStyles();
            renderButton(container, tmdb_id, entry);
        } catch (err) {
            console.warn('[resume] inject failed', err);
        }
    }

    // Fresh render of the card: inject + ask Controller to re-group buttons
    // so keyboard navigation picks the new one up.
    Lampa.Listener.follow('full', function (e) {
        if (!e || e.type !== 'complite') return;
        var movie = (e.data && e.data.movie) || (e.object && e.object.movie);
        if (!movie || !movie.id) return;

        var activity = e.object; // {component, id, card, movie, activity, ...}
        // Ensure activity has movie reference for the helper
        activity.movie = movie;
        injectIntoFullActivity(activity);

        try {
            if (e.link && e.link.items && e.link.items[0] && e.link.items[0].emit) {
                e.link.items[0].emit('groupButtons');
            }
        } catch(err) {}
    });

    // Pop-back to an already-rendered full card: 'complite' doesn't re-fire,
    // but Activity emits 'start' whenever an activity becomes active (including
    // after back-nav). Re-inject the button then — the card was built once and
    // kept its DOM, so we just need to re-add the element if it's gone.
    //
    // Timing note: on pop-back Lampa emits `activity/start[full]` BEFORE
    // restoring the full card's DOM from its archive, so an immediate inject
    // writes into the stale template and the text gets clobbered once the
    // archive is swapped in. Defer one tick so we prepend into the live DOM.
    if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('activity', function (e) {
            if (!e || e.type !== 'start') return;
            if (!e.object || e.object.component !== 'full') return;
            var obj = e.object;
            setTimeout(function () { injectIntoFullActivity(obj); }, 50);
        });
    }

    // ----- 4. "Continue Watching" line on main page -----

    function cacheAsList() {
        var cache = getCache();
        return Object.keys(cache)
            .map(function (k) { return cache[k]; })
            .filter(function (e) { return e && e.card && e.card.id; })
            .filter(function (e) {
                // Hide entries that are fully done with no next episode.
                if (getTimelinePercent(e) < DONE_THRESHOLD) return true;
                if (!e.playlist || !e.playlist.length) return false;
                if (e.playlist.length === 1) return false;
                return !!findNextInPlaylist(e);
            })
            .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    }

    function cardImgUrl(card) {
        var path = card.poster_path || card.backdrop_path;
        if (!path) return '';
        var base = 'https://image.tmdb.org/t/p/w342';
        try {
            if (Lampa.Utils && Lampa.Utils.proxyImg) return Lampa.Utils.proxyImg(base + path);
        } catch (e) {}
        return base + path;
    }

    function cardYear(card) {
        var d = card.release_date || card.first_air_date || '';
        return d ? String(d).slice(0, 4) : '';
    }

    function cardTitle(card) {
        return card.title || card.name || card.original_title || card.original_name || '';
    }

    function buildContinueLine(entries) {
        var title = 'Продолжить просмотр';
        var line = $(
            '<div class="items-line layer--visible layer--render view--continue-watching">' +
                '<div class="items-line__head">' +
                    '<div class="items-line__title">' + title + '</div>' +
                '</div>' +
                '<div class="items-line__body"></div>' +
            '</div>'
        );

        var body = line.find('.items-line__body');

        entries.forEach(function (entry) {
            var card = entry.card;
            var percent = Math.max(1, Math.round(getTimelinePercent(entry) * 100));
            var img = cardImgUrl(card);
            var node = $(
                '<div class="card selector layer--visible layer--render view--continue-card">' +
                    '<div class="card__view">' +
                        '<img class="card__img" loading="lazy" />' +
                        '<div class="card__promo view--resume-progress">' +
                            '<div class="card__promo-text" style="padding:0 .5em">' +
                                (entry.title ? String(entry.title).slice(0, 40) : '') +
                            '</div>' +
                            '<div style="height:3px;background:rgba(255,255,255,.2);border-radius:2px;margin:.3em .5em 0">' +
                                '<div style="height:100%;background:#42a5f5;width:' + percent + '%;border-radius:2px"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="card__title">' + cardTitle(card) + '</div>' +
                    '<div class="card__age">' + cardYear(card) + '</div>' +
                '</div>'
            );

            if (img) node.find('.card__img').attr('src', img);

            node.on('hover:enter', function () {
                try {
                    Lampa.Activity.push({
                        url: '',
                        component: 'full',
                        id: card.id,
                        method: card.media_type === 'tv' ? 'tv' : 'movie',
                        card: card,
                        source: card.source || 'tmdb'
                    });
                } catch (err) {
                    console.warn('[resume] open card failed', err);
                }
            });

            body.append(node);
        });

        return line[0];
    }

    function injectIntoMainActivity(activity) {
        try {
            if (!activity || activity.component !== 'main') return;
            var render = activity.activity && activity.activity.render && activity.activity.render();
            if (!render || !render.find) return;

            // Avoid duplicate insertion on re-render.
            render.find('.view--continue-watching').remove();

            var entries = cacheAsList();
            if (!entries.length) return;

            // Lampa's Main uses a scroll container with a .scroll__body that
            // holds items lines. Find the first items holder and prepend there.
            var scrollBody = render.find('.scroll__body').first();
            if (!scrollBody.length) scrollBody = render.find('.items-line').first().parent();
            if (!scrollBody.length) return;

            var line = buildContinueLine(entries);
            scrollBody.prepend(line);
        } catch (err) {
            console.warn('[resume] main inject failed', err);
        }
    }

    if (Lampa.Listener && Lampa.Listener.follow) {
        // On main-page initial build and on pop-back (activity start).
        Lampa.Listener.follow('activity', function (e) {
            if (!e || !e.object || e.object.component !== 'main') return;
            if (e.type !== 'start' && e.type !== 'archive') return;
            var obj = e.object;
            setTimeout(function () { injectIntoMainActivity(obj); }, 80);
        });
        // Main fires its own 'complite' via the Line subsystem; use a generic
        // hook too in case 'activity/start' fires before Main.build() runs.
        Lampa.Listener.follow('line', function (e) {
            try {
                var active = Lampa.Activity.active();
                if (active && active.component === 'main') {
                    setTimeout(function () { injectIntoMainActivity(active); }, 50);
                }
            } catch (err) {}
        });
    }

    console.log('[resume] plugin loaded, version', VERSION);
})();
