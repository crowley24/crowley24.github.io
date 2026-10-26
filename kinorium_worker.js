/*
 * ORIGINAL SOUNDTRACK
 * KINORIUM WORKER 1.6.7
 *
 * Cloudflare Workers + KV
 * Binding: KINORIUM_CACHE
 *
 * Features:
 * - Custom OST catalog priority
 * - YouTube soundtrack catalog
 * - OSTMusic album/track resolution
 * - Kinorium featured-track lookup
 * - Full-album fallback: /{id}/soundtrack/
 * - Automatic movie and TV series search
 * - Movie year tolerance +/- 1
 * - Exact start year for TV series
 * - Roman / Arabic movie sequel numbers
 * - Shared KV resolution cache
 * - Separate featured and album soundtrack caches
 * - Short-lived negative soundtrack cache
 * - Audio verification on every verified request
 * - Cache HIT / MISS diagnostics
 * - HTML inspection mode
 * - Featured-track parser diagnostics
 * - Album-track parser diagnostics
 * - Graceful fallback if KV is unavailable
 * - No hardcoded movie mappings
 * - No Muzofond integration
 *
 * Custom catalog:
 * https://crowley24.github.io/OST/ost_custom.json
 */

'use strict';

const VERSION = '1.6.7';

const CUSTOM_CATALOG = {
    url: 'https://crowley24.github.io/OST/ost_custom.json',
    timeout: 10000,
    cacheSeconds: 300,
    maxEntries: 5000
};

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 15000,
    maxHTML: 2000000,
    maxTracks: 30,
    maxCandidates: 80,
    maxVerifyCandidates: 35,
    maxTotalVerifyCandidates: 35,
    maxAlbumVerifyCandidates: 12,
    cacheSeconds: 300,
    yearTolerance: 1,
    maxSearchVariants: 5,

    kv: {
        prefix: 'kinorium:v167:',
        resolutionTTL: 7 * 86400,
        soundtrackTTL: 12 * 3600,
        emptySoundtrackTTL: 600,
        albumTTL: 12 * 3600,
        emptyAlbumTTL: 600,
        schema: 1
    }
};

const JSON_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers':
        'Content-Type, Content-Length, Content-Range',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
};

/* =========================================================
 * CUSTOM SOUNDTRACK CATALOG
 * ========================================================= */

async function fetchCustomCatalog() {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CUSTOM_CATALOG.timeout
    );

    let response;

    try {
        response = await fetch(
            CUSTOM_CATALOG.url,
            {
                headers: {
                    Accept: 'application/json'
                },
                cf: {
                    cacheEverything: true,
                    cacheTtl: CUSTOM_CATALOG.cacheSeconds
                },
                signal: controller.signal
            }
        );
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error(
            'custom_catalog_http_' + response.status
        );
    }

    const data = await response.json();

    const entries = Array.isArray(data)
        ? data
        : Array.isArray(data.movies)
            ? data.movies
            : Array.isArray(data.entries)
                ? data.entries
                : [];

    if (entries.length > CUSTOM_CATALOG.maxEntries) {
        throw new Error('custom_catalog_too_many_entries');
    }

    return entries;
}

function normalizeCustomTitle(value) {
    return normalize(
        String(value || '')
            .replace(/\(\s*\d{4}\s*\)/g, ' ')
            .replace(/\b(?:film|movie|фільм|фильм)\b/gi, ' ')
    );
}

function getYouTubeVideoURL(value) {
    if (!value) return null;

    try {
        const url = new URL(String(value).trim());

        if (url.protocol !== 'https:') return null;

        const host = url.hostname.toLowerCase();
        let videoId = '';

        if (
            host === 'youtu.be' ||
            host === 'www.youtu.be'
        ) {
            videoId =
                url.pathname.split('/').filter(Boolean)[0] || '';
        } else if (
            host === 'youtube.com' ||
            host === 'www.youtube.com' ||
            host === 'm.youtube.com' ||
            host === 'music.youtube.com'
        ) {
            if (url.pathname === '/watch') {
                videoId = url.searchParams.get('v') || '';
            } else {
                const match = url.pathname.match(
                    /^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/
                );

                videoId = match ? match[1] : '';
            }
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            return null;
        }

        return 'https://www.youtube.com/watch?v=' + videoId;

    } catch (_) {
        return null;
    }
}

function customEntryMatches(entry, title, year) {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    const requestedTitle = normalizeCustomTitle(title);

    if (!requestedTitle) return false;

    const entryYear = Number(entry.year || 0);

    if (
        year &&
        entryYear &&
        entryYear !== Number(year)
    ) {
        return false;
    }

    const names = [
        entry.title,
        entry.originalTitle,
        entry.name,
        ...(Array.isArray(entry.aliases) ? entry.aliases : [])
    ]
        .filter(value => typeof value === 'string')
        .map(normalizeCustomTitle)
        .filter(Boolean);

    return names.includes(requestedTitle);
}

async function findCustomSoundtrack(title, year) {
    if (!title) return null;

    try {
        const entries = await fetchCustomCatalog();

        const entry = entries.find(item =>
            customEntryMatches(item, title, year)
        );

        if (!entry) return null;

        const source = String(
            entry.source || 'ostmusic'
        ).toLowerCase();

        if (source === 'youtube') {
            const youtubeURL = getYouTubeVideoURL(
                entry.audioUrl ||
                entry.youtubeUrl ||
                entry.url
            );

            if (!youtubeURL) {
                return {
                    matched: true,
                    valid: false,
                    source: 'youtube',
                    reason: 'invalid_custom_youtube_url',
                    entry
                };
            }

            return {
                matched: true,
                valid: true,
                source: 'youtube',
                title: entry.title || title,
                year: Number(entry.year || year || 0),
                audioUrl: youtubeURL,
                track: {
                    id: String(entry.trackId || entry.song_id || ''),
                    name: String(
                        entry.track ||
                        entry.trackName ||
                        entry.title ||
                        'Original soundtrack'
                    ),
                    artist: String(entry.artist || ''),
                    duration: Number(entry.duration || 0)
                },
                verified: Boolean(entry.verified)
            };
        }

        if (source === 'ostmusic') {
            return {
                matched: true,
                valid: true,
                source: 'ostmusic',
                title: entry.title || title,
                year: Number(entry.year || year || 0),
                albumId: String(entry.albumId || ''),
                trackId: String(entry.trackId || ''),
                track: {
                    id: String(entry.trackId || ''),
                    name: String(
                        entry.track ||
                        entry.trackName ||
                        'Original soundtrack'
                    ),
                    artist: String(entry.artist || ''),
                    duration: Number(entry.duration || 0)
                },
                verified: Boolean(entry.verified)
            };
        }

        return {
            matched: true,
            valid: false,
            source,
            reason: 'unsupported_custom_source',
            entry
        };

    } catch (error) {
        return {
            matched: false,
            catalogError: String(
                error && error.message || error
            )
        };
    }
}

/* =========================================================
 * CUSTOM OSTMusic RESOLVER
 * ========================================================= */

const OSTMUSIC_BASE = 'https://www.ostmusic.org';

function validateOstMusicURL(value) {
    try {
        const url = new URL(String(value || ''));

        if (
            url.protocol !== 'https:' ||
            url.hostname !== 'www.ostmusic.org'
        ) {
            return '';
        }

        return url.href;
    } catch (_) {
        return '';
    }
}

function normalizeOstTrackName(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9а-яіїєґ]+/gi, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function extractOstSongs(data) {
    if (Array.isArray(data)) return data;

    if (!data || typeof data !== 'object') return [];

    if (Array.isArray(data.songs)) return data.songs;
    if (Array.isArray(data.tracks)) return data.tracks;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;

    return [];
}

async function getCustomOstTracks(albumId) {
    const id = String(albumId || '').trim();

    if (!/^\d+$/.test(id)) {
        throw new Error('invalid_ostmusic_album_id');
    }

    const url =
        OSTMUSIC_BASE +
        '/index.php?option=com_muscol&task=get_album_songs&id=' +
        encodeURIComponent(id);

    const response = await fetchTimed(url, {
        headers: {
            Accept: 'application/json, text/plain, */*'
        }
    });

    if (!response.ok) {
        throw new Error(
            'ostmusic_tracks_http_' + response.status
        );
    }

    const data = await response.json();

    return extractOstSongs(data);
}

function mapCustomOstTrack(song) {
    if (!song || typeof song !== 'object') return null;

    const id = String(song.id || '').trim();

    const albumId = String(
        song.album_id || song.albumId || ''
    ).trim();

    const file = validateOstMusicURL(
        song.file || song.url || ''
    );

    const duration = Number(
        song.length || song.duration || 0
    );

    const playableFlag =
        song.isplayable === 1 ||
        song.isplayable === '1' ||
        song.playable === true;

    if (!id || !file || !playableFlag) return null;
    if (duration > 0 && duration < 35) return null;

    return {
        id,
        albumId,
        name: String(song.name || song.title || '').trim(),
        artist: String(
            song.artist_name || song.artist || ''
        ).trim(),
        duration,
        position: String(song.position || ''),
        audioUrl: file,
        playable: true
    };
}

function findCustomOstTrack(songs, entry) {
    const mapped = (Array.isArray(songs) ? songs : [])
        .map(mapCustomOstTrack)
        .filter(Boolean);

    const wantedTrackId = String(
        entry.trackId || ''
    ).trim();

    if (wantedTrackId) {
        const exact = mapped.find(function (track) {
            return track.id === wantedTrackId;
        });

        return exact || null;
    }

    const wantedName = normalizeOstTrackName(
        entry.track || entry.trackName || ''
    );

    if (!wantedName) return null;

    const matches = mapped.filter(function (track) {
        return normalizeOstTrackName(track.name) === wantedName;
    });

    return matches.length === 1 ? matches[0] : null;
}

async function resolveCustomOstMusic(entry) {
    if (!entry || !entry.albumId) return null;

    try {
        const songs = await getCustomOstTracks(entry.albumId);
        const track = findCustomOstTrack(songs, entry);

        if (!track) {
            return {
                found: false,
                reason: 'custom_ostmusic_track_not_found'
            };
        }

        return {
            found: true,
            source: 'ostmusic',
            customCatalog: true,
            title: String(entry.title || ''),
            year: Number(entry.year || 0),
            audioUrl: track.audioUrl,
            playable: true,
            track: {
                id: track.id,
                name: track.name || String(
                    entry.track || entry.trackName || ''
                ),
                artist: track.artist || String(entry.artist || ''),
                duration: track.duration,
                audioUrl: track.audioUrl,
                playable: true
            },
            album: {
                id: String(entry.albumId),
                title: String(
                    entry.albumTitle || entry.title || ''
                ),
                year: Number(entry.year || 0),
                artist: String(entry.artist || ''),
                tracksCount: songs.length
            },
            confidence: entry.verified === true
                ? 'verified'
                : 'catalog_candidate'
        };
    } catch (error) {
        return {
            found: false,
            reason: 'custom_ostmusic_resolve_failed',
            error: String(error && error.message || error)
        };
    }
}

/* =========================================================
 * ENTRY POINT
 * ========================================================= */

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: JSON_HEADERS
            });
        }

        if (request.method !== 'GET') {
            return json({
                success: false,
                version: VERSION,
                error: 'method_not_allowed'
            }, 405);
        }

        const url = new URL(request.url);
        const params = url.searchParams;

        const id = String(
            params.get('id') || ''
        ).trim();

        const title = String(
            params.get('title') || ''
        ).trim();

        const yearString = String(
            params.get('year') || ''
        ).trim();

        const year = yearString
            ? Number(yearString)
            : 0;

        const track = String(
            params.get('track') || ''
        ).trim();

        const songId = String(
            params.get('song_id') || ''
        ).trim();

        const debug = params.get('debug') === '1';
        const inspect = params.get('inspect') === '1';
        const albumDebug = params.get('album_debug') === '1';
        const verify = params.get('verify') !== '0';

        const cacheBypass =
            params.get('refresh') === '1';

        const cache = createCache(env);

        if (!id && !title) {
            return json({
                success: true,
                service: 'Kinorium Original Soundtrack',
                version: VERSION,
                source: 'kinorium',
                kv: {
                    enabled: cache.enabled,
                    binding: 'KINORIUM_CACHE',
                    resolutionTTL: CONFIG.kv.resolutionTTL,
                    soundtrackTTL: CONFIG.kv.soundtrackTTL,
                    albumTTL: CONFIG.kv.albumTTL
                },
                customCatalog: {
                    url: CUSTOM_CATALOG.url,
                    priority: 1,
                    sources: ['youtube', 'ostmusic']
                },
                endpoints: {
                    automatic: '?title=Titanic&year=1997',
                    series: '?title=Friends&year=1994',
                    direct: '?id=108983',
                    debug: '?title=Titanic&year=1997&debug=1',
                    track: '?id=108983&track=Rose',
                    verifyOff: '?id=108983&verify=0',
                    refresh: '?title=Titanic&year=1997&refresh=1',
                    inspect: '?id=348789&debug=1&inspect=1&refresh=1&verify=0',
                    albumDebug: '?id=11990768&album_debug=1&refresh=1'
                }
            });
        }

        if (id && !/^\d{1,12}$/.test(id)) {
            return json({
                success: false,
                version: VERSION,
                error: 'invalid_movie_id'
            }, 400);
        }

        if (title.length > 160) {
            return json({
                success: false,
                version: VERSION,
                error: 'title_too_long'
            }, 400);
        }

        if (
            yearString &&
            (
                !/^\d{4}$/.test(yearString) ||
                year < 1880 ||
                year > 2200
            )
        ) {
            return json({
                success: false,
                version: VERSION,
                error: 'invalid_year'
            }, 400);
        }

        const cacheInfo = {
            enabled: cache.enabled,
            resolution: id ? 'DIRECT' : 'MISS',
            soundtrack: 'MISS',
            album: 'MISS',
            errors: []
        };

        try {
            /*
             * ALBUM DIAGNOSTICS
             *
             * This mode inspects the full soundtrack page without
             * changing the regular response consumed by Lampa.
             */

            if (albumDebug && id) {
                const albumPage = await fetchHTML(
                    CONFIG.site + '/' + id + '/soundtrack/',
                    { bypassCache: cacheBypass }
                );

                if (!albumPage.ok) {
                    return json({
                        success: false,
                        version: VERSION,
                        mode: 'album_debug',
                        id,
                        pageURL: albumPage.url,
                        status: albumPage.status,
                        contentType: albumPage.contentType,
                        htmlLength: albumPage.length,
                        error: 'album_page_fetch_failed'
                    });
                }

                const albumDiagnostics = {};
                const albumTracks = extractAlbumTracks(
                    albumPage.html,
                    albumDiagnostics
                );

                return json({
                    success: true,
                    version: VERSION,
                    mode: 'album_debug',
                    id,
                    pageURL: albumPage.url,
                    status: albumPage.status,
                    contentType: albumPage.contentType,
                    htmlLength: albumPage.length,
                    pageTitle: extractTitle(albumPage.html),
                    parserDiagnostics: albumDiagnostics,
                    tracksCount: albumTracks.length,
                    tracks: albumTracks,
                    inspection: inspectSoundtrackHTML(
                        albumPage.html
                    )
                });
            }

            /*
             * STEP 0:
             * Check custom OST catalog first.
             * Direct Kinorium ID requests bypass this step.
             */

            if (!id && title) {
                const custom = await findCustomSoundtrack(
                    title,
                    year
                );

                if (
                    custom &&
                    custom.matched &&
                    custom.valid
                ) {
                    if (
                        custom.source === 'youtube' &&
                        custom.audioUrl
                    ) {
                        return json({
                            success: true,
                            version: VERSION,
                            mode: 'custom_catalog',
                            found: true,
                            playable: true,
                            source: 'youtube',
                            customCatalog: true,
                            title: custom.title || title,
                            year: Number(
                                custom.year || year || 0
                            ),
                            audioUrl: custom.audioUrl,
                            track: {
                                id: String(
                                    custom.track &&
                                    custom.track.id || ''
                                ),
                                name: String(
                                    custom.track &&
                                    custom.track.name ||
                                    custom.title ||
                                    title
                                ),
                                artist: String(
                                    custom.track &&
                                    custom.track.artist || ''
                                ),
                                duration: Number(
                                    custom.track &&
                                    custom.track.duration || 0
                                ),
                                playable: true
                            },
                            audioAssociationVerified:
                                Boolean(custom.verified),
                            reason: 'custom_youtube_match',
                            search: {
                                method: 'custom_catalog',
                                matched: true,
                                fallback: false
                            }
                        });
                    }

                    if (custom.source === 'ostmusic') {
                        const resolvedCustom =
                            await resolveCustomOstMusic(custom);

                        if (
                            resolvedCustom &&
                            resolvedCustom.found &&
                            resolvedCustom.audioUrl
                        ) {
                            return json({
                                success: true,
                                version: VERSION,
                                mode: 'custom_catalog',
                                found: true,
                                playable: true,
                                source: 'ostmusic',
                                customCatalog: true,
                                title:
                                    resolvedCustom.title ||
                                    title,
                                year: Number(
                                    resolvedCustom.year ||
                                    year ||
                                    0
                                ),
                                audioUrl:
                                    resolvedCustom.audioUrl,
                                track: resolvedCustom.track,
                                album: resolvedCustom.album,
                                confidence:
                                    resolvedCustom.confidence,
                                audioAssociationVerified: true,
                                reason: 'custom_ostmusic_match',
                                search: {
                                    method: 'custom_catalog',
                                    matched: true,
                                    fallback: false
                                }
                            });
                        }
                    }
                }
            }

            /*
             * STEP 1:
             * Kinorium ID resolution.
             */

            let resolved;

            if (id) {
                resolved = {
                    id,
                    method: 'direct_id',
                    candidates: [],
                    diagnostics: [],
                    searchVariants: []
                };
            } else {
                const resolutionKey =
                    makeResolutionKey(title, year);

                let cachedResolution = null;

                if (!cacheBypass) {
                    cachedResolution = await cache.get(
                        resolutionKey,
                        cacheInfo
                    );
                }

                if (
                    cachedResolution &&
                    cachedResolution.id &&
                    /^\d{1,12}$/.test(
                        String(cachedResolution.id)
                    )
                ) {
                    resolved = {
                        id: String(cachedResolution.id),
                        method:
                            cachedResolution.method ||
                            'kv_resolution',
                        candidates: [],
                        diagnostics: [],
                        searchVariants:
                            buildSearchTitleVariants(title)
                    };

                    cacheInfo.resolution = 'HIT';
                } else {
                    cacheInfo.resolution =
                        cacheBypass ? 'BYPASS' : 'MISS';

                    resolved = await resolveMovie(
                        title,
                        year
                    );

                    if (resolved.id) {
                        await cache.put(
                            resolutionKey,
                            {
                                id: resolved.id,
                                method: resolved.method,
                                title,
                                year
                            },
                            CONFIG.kv.resolutionTTL,
                            cacheInfo
                        );
                    }
                }
            }

            if (!resolved.id) {
                return json({
                    success: true,
                    version: VERSION,
                    source: 'kinorium',
                    mode: 'automatic_search',
                    found: false,
                    playable: false,
                    id: null,
                    title,
                    year,
                    audioUrl: null,
                    tracksCount: 0,
                    tracks: [],
                    reason: 'movie_not_resolved',
                    cache: cacheInfo,
                    search: {
                        method: resolved.method,
                        variants: debug
                            ? resolved.searchVariants
                            : [],
                        candidates: debug
                            ? resolved.candidates
                            : [],
                        diagnostics: debug
                            ? resolved.diagnostics
                            : []
                    }
                });
            }

            const result = await getSoundtrack({
                id: resolved.id,
                track,
                songId,
                verify,
                debug,
                inspect,
                cache,
                cacheInfo,
                cacheBypass
            });

            result.cache = cacheInfo;

            result.search = {
                requestedTitle: title || null,
                requestedYear: year || null,
                resolvedId: resolved.id,
                method: resolved.method,
                variants: debug
                    ? resolved.searchVariants
                    : [],
                candidates: debug
                    ? resolved.candidates
                    : [],
                diagnostics: debug
                    ? resolved.diagnostics
                    : []
            };

            return json(result);

        } catch (error) {
            return json({
                success: false,
                version: VERSION,
                source: 'kinorium',
                found: false,
                playable: false,
                audioUrl: null,
                cache: cacheInfo,
                error: String(
                    error && error.message || error
                )
            }, 502);
        }
    }
};

/* =========================================================
 * JSON RESPONSE
 * ========================================================= */

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: JSON_HEADERS
        }
    );
}

/* =========================================================
 * CLOUDFLARE KV
 * ========================================================= */

function createCache(env) {
    const namespace =
        env && env.KINORIUM_CACHE;

    const enabled = Boolean(
        namespace &&
        typeof namespace.get === 'function' &&
        typeof namespace.put === 'function'
    );

    return {
        enabled,

        async get(key, info) {
            if (!enabled) return null;

            try {
                const value = await namespace.get(
                    key,
                    'json'
                );

                if (
                    !value ||
                    value.schema !== CONFIG.kv.schema ||
                    !value.data
                ) {
                    return null;
                }

                return value.data;

            } catch (error) {
                info.errors.push({
                    operation: 'get',
                    message: String(
                        error && error.message || error
                    )
                });

                return null;
            }
        },

        async put(key, data, ttl, info) {
            if (!enabled) return false;

            try {
                await namespace.put(
                    key,
                    JSON.stringify({
                        schema: CONFIG.kv.schema,
                        savedAt: new Date().toISOString(),
                        data
                    }),
                    {
                        expirationTtl: ttl
                    }
                );

                return true;

            } catch (error) {
                info.errors.push({
                    operation: 'put',
                    message: String(
                        error && error.message || error
                    )
                });

                return false;
            }
        }
    };
}

function makeResolutionKey(title, year) {
    return CONFIG.kv.prefix +
        'resolve:' +
        year +
        ':' +
        encodeURIComponent(normalize(title));
}

function makeSoundtrackKey(id) {
    return CONFIG.kv.prefix +
        'soundtrack:' +
        String(id);
}

function makeAlbumKey(id) {
    return CONFIG.kv.prefix +
        'album:' +
        String(id);
}

/* =========================================================
 * HTTP
 * ========================================================= */

async function fetchTimed(url, options = {}) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout
    );

    try {
        return await fetch(url, {
            ...options,
            redirect: 'follow',
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

function siteHeaders() {
    return {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.7',
        'User-Agent':
            'Mozilla/5.0 (compatible; KinoriumOST/1.6.7)'
    };
}

async function fetchHTML(url, options = {}) {
    const bypassCache = options.bypassCache === true;

    const response = await fetchTimed(
        url,
        {
            headers: siteHeaders(),
            cf: bypassCache
                ? {
                    cacheEverything: false,
                    cacheTtl: 0
                }
                : {
                    cacheEverything: true,
                    cacheTtl: CONFIG.cacheSeconds
                }
        }
    );

    const contentType =
        response.headers.get('content-type') || '';

    const html =
        response.ok &&
        /text\/html/i.test(contentType)
            ? (await response.text()).slice(
                0,
                CONFIG.maxHTML
            )
            : '';

    return {
        status: response.status,
        ok: response.ok,
        url: response.url,
        contentType,
        html,
        length: html.length
    };
}

/* =========================================================
 * HTML UTILITIES
 * ========================================================= */

function decodeEntities(value) {
    return String(value || '')
        .replace(/&quot;/gi, '"')
        .replace(/&#34;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
        .replace(/&rsquo;/gi, '’')
        .replace(/&#(\d+);/g, (_, n) => {
            const number = Number(n);

            return number > 0 && number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
            const number = parseInt(n, 16);

            return number > 0 && number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        });
}

function stripTags(value) {
    return decodeEntities(
        String(value || '')
            .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
    )
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTitle(html) {
    const match = String(html || '').match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    return match ? stripTags(match[1]) : '';
}

function extractAttribute(tag, name) {
    const escaped = name.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );

    const regex = new RegExp(
        '\\b' +
        escaped +
        '\\s*=\\s*(["\'])([\\s\\S]*?)\\1',
        'i'
    );

    const match = String(tag || '').match(regex);

    return match ? decodeEntities(match[2]) : '';
}

/* =========================================================
 * SEARCH VARIANTS
 * ========================================================= */

function buildSearchTitleVariants(title) {
    const original = String(title || '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!original) return [];

    const variants = [];
    const seen = new Set();

    function add(value) {
        const clean = String(value || '')
            .replace(/\s+/g, ' ')
            .replace(/^[\s:;,\-–—]+/, '')
            .replace(/[\s:;,\-–—]+$/, '')
            .trim();

        const key = normalize(clean);

        if (
            !clean ||
            !key ||
            seen.has(key) ||
            clean.length < 2
        ) {
            return;
        }

        seen.add(key);
        variants.push(clean);
    }

    add(original);

    const separators = /[:：|–—]/;

    if (separators.test(original)) {
        const parts = original.split(separators);

        if (parts.length > 1) {
            add(parts[0]);

            for (
                let i = 2;
                i < parts.length &&
                variants.length < CONFIG.maxSearchVariants;
                i++
            ) {
                add(parts.slice(0, i).join(' '));
            }
        }
    }

    if (
        variants.length < CONFIG.maxSearchVariants &&
        /\s*\([^)]{3,}\)\s*$/.test(original)
    ) {
        add(
            original.replace(
                /\s*\([^)]{3,}\)\s*$/,
                ''
            )
        );
    }

    return variants.slice(0, CONFIG.maxSearchVariants);
}

/* =========================================================
 * SEARCH CANDIDATES
 * ========================================================= */

function extractSearchCandidates(html) {
    const results = [];
    const seen = new Set();

    const regex =
        /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?<\/a>/gi;

    let match;

    while (
        (match = regex.exec(html)) &&
        results.length < CONFIG.maxCandidates
    ) {
        const tag = match[0];
        const href = decodeEntities(match[2]);

        let candidateURL;

        try {
            candidateURL = new URL(href, CONFIG.site);
        } catch (_) {
            continue;
        }

        if (
            candidateURL.hostname !== 'ua.kinorium.com' &&
            candidateURL.hostname !== 'www.kinorium.com'
        ) {
            continue;
        }

        const idMatch = candidateURL.pathname.match(
            /^\/(\d{1,12})\/?$/
        );

        if (!idMatch) continue;

        const id = idMatch[1];

        if (seen.has(id)) continue;

        const before = html.slice(
            Math.max(0, match.index - 1000),
            match.index
        );

        const after = html.slice(
            regex.lastIndex,
            Math.min(html.length, regex.lastIndex + 500)
        );

        const context = stripTags(
            before + ' ' + tag + ' ' + after
        );

        const titleAttribute = extractAttribute(tag, 'title');
        const ariaLabel = extractAttribute(tag, 'aria-label');

        const label = stripTags(
            tag.replace(/^<a\b[^>]*>/i, '')
                .replace(/<\/a>$/i, '')
        );

        const yearMatches = [
            ...context.matchAll(/\b(?:18|19|20)\d{2}\b/g)
        ];

        const years = [
            ...new Set(
                yearMatches.map(item => Number(item[0]))
            )
        ];

        seen.add(id);

        results.push({
            id,
            label,
            titleAttribute,
            ariaLabel,
            context: context.slice(-900),
            years,
            order: results.length
        });
    }

    return results;
}

/* =========================================================
 * CANDIDATE SCORING
 * ========================================================= */

function scoreCandidate(candidate, title, year) {
    const requested = normalize(title);

    if (!requested) return 0;

    const label = normalize(candidate.label || '');
    const titleAttribute = normalize(candidate.titleAttribute || '');
    const ariaLabel = normalize(candidate.ariaLabel || '');
    const context = normalize(candidate.context || '');

    let score = 0;

    if (label === requested) {
        score = Math.max(score, 150);
    }

    if (titleAttribute === requested) {
        score = Math.max(score, 145);
    }

    if (ariaLabel === requested) {
        score = Math.max(score, 145);
    }

    if (
        label.startsWith(requested + ' ') ||
        titleAttribute.startsWith(requested + ' ') ||
        ariaLabel.startsWith(requested + ' ')
    ) {
        score = Math.max(score, 115);
    }

    if (label.includes(requested) && requested.length >= 4) {
        score = Math.max(score, 85);
    }

    if (
        titleAttribute.includes(requested) &&
        requested.length >= 4
    ) {
        score = Math.max(score, 85);
    }

    if (context.includes(requested) && requested.length >= 3) {
        score = Math.max(score, 35);
    }

    const candidateYears = candidate.years || [];

    if (year && candidateYears.includes(year)) {
        score += 8;
    }

    if (year && candidateYears.includes(year - 1)) {
        score += 2;
    }

    if (year && candidateYears.includes(year + 1)) {
        score += 2;
    }

    score += Math.max(
        0,
        10 - Math.floor((candidate.order || 0) / 5)
    );

    return score;
}

/* =========================================================
 * PAGE NAMES
 * ========================================================= */

function cleanPageName(value) {
    let result = stripTags(value);

    result = result
        .replace(/\s*[|–—-]\s*Kinorium.*$/i, '')
        .replace(/\s*[|–—-]\s*Кинориум.*$/i, '')
        .replace(
            /\s*\((?:фільм|фильм|серіал|сериал|film|series|tv series)[^)]*\)\s*$/i,
            ''
        )
        .replace(/\s*\((?:18|19|20)\d{2}[^)]*\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    return result;
}

function extractPageNames(html) {
    const names = [];
    const seen = new Set();

    function add(value) {
        const clean = cleanPageName(value);
        const key = normalize(clean);

        if (
            !clean ||
            !key ||
            key.length < 2 ||
            seen.has(key)
        ) {
            return;
        }

        seen.add(key);
        names.push(clean);
    }

    add(extractTitle(html));

    const head = String(html || '').slice(0, 250000);

    const metaRegex = /<meta\b[^>]*>/gi;
    let metaMatch;

    while ((metaMatch = metaRegex.exec(head))) {
        const tag = metaMatch[0];

        const property = (
            extractAttribute(tag, 'property') ||
            extractAttribute(tag, 'name') ||
            extractAttribute(tag, 'itemprop')
        ).toLowerCase();

        const content = extractAttribute(tag, 'content');

        if (
            content &&
            (
                property === 'og:title' ||
                property === 'twitter:title' ||
                property === 'title' ||
                property === 'headline' ||
                property === 'name'
            )
        ) {
            add(content);
        }
    }

    const h1Regex = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
    let h1Match;

    while ((h1Match = h1Regex.exec(head))) {
        add(h1Match[1]);
    }

    const propertyPatterns = [
        /["'](?:originalTitle|original_title|title_original|originalName|original_name|nameOriginal|name_original|alternateName|alternativeHeadline)["']\s*:\s*["']([^"'<>]{2,180})["']/gi,
        /\b(?:originalTitle|original_title|title_original|originalName|original_name|nameOriginal|name_original|alternateName|alternativeHeadline)\s*=\s*["']([^"'<>]{2,180})["']/gi
    ];

    for (const pattern of propertyPatterns) {
        let propertyMatch;

        while (
            (propertyMatch = pattern.exec(head)) &&
            names.length < 40
        ) {
            add(propertyMatch[1]);
        }
    }

    const markedTagRegex =
        /<(?:span|div|p|a|strong|b)\b[^>]*(?:original[_-]?title|alternate[_-]?title|original[_-]?name|alternate[_-]?name)[^>]*>([\s\S]*?)<\/(?:span|div|p|a|strong|b)>/gi;

    let markedMatch;

    while (
        (markedMatch = markedTagRegex.exec(head)) &&
        names.length < 40
    ) {
        add(markedMatch[1]);
    }

    return names;
}

/* =========================================================
 * PAGE YEAR AND TYPE
 * ========================================================= */

function extractMoviePageYear(html) {
    const title = extractTitle(html);

    const titleMatch = title.match(/\b(?:18|19|20)\d{2}\b/);

    if (titleMatch) {
        return Number(titleMatch[0]);
    }

    const patterns = [
        /"startDate"\s*:\s*"(\d{4})/i,
        /"datePublished"\s*:\s*"(\d{4})/i,
        /"releaseDate"\s*:\s*"(\d{4})/i,
        /<meta[^>]+property=["']video:release_date["'][^>]+content=["'](\d{4})/i
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);

        if (match) {
            return Number(match[1]);
        }
    }

    return 0;
}

function extractPageType(html) {
    const title = extractTitle(html);
    const head = String(html || '').slice(0, 250000);

    if (
        /\(\s*(?:серіал|сериал|tv series|television series|series)\b/i.test(title) ||
        /itemprop=["'](?:tvSeries|series)["']/i.test(head) ||
        /"@type"\s*:\s*"(?:TVSeries|TVEpisode)"/i.test(head) ||
        /"@type"\s*:\s*\[[^\]]*"TVSeries"/i.test(head) ||
        /\b(?:tv series|television series)\b/i.test(title) ||
        /\b(?:серіал|сериал)\b/i.test(title)
    ) {
        return 'series';
    }

    if (
        /\(\s*(?:фільм|фильм|film)\b/i.test(title) ||
        /"@type"\s*:\s*"Movie"/i.test(head) ||
        /itemprop=["']movie["']/i.test(head)
    ) {
        return 'movie';
    }

    if (
        /\b(?:season|сезон|episode|епізод|серия)\b/i.test(title)
    ) {
        return 'series';
    }

    return 'unknown';
}

/* =========================================================
 * MOVIE SEQUEL NORMALIZATION
 * ========================================================= */

function normalizeMovieTitle(value) {
    let result = normalize(cleanPageName(value));

    if (!result) return '';

    const romanNumbers = {
        i: '1',
        ii: '2',
        iii: '3',
        iv: '4',
        v: '5',
        vi: '6',
        vii: '7',
        viii: '8',
        ix: '9',
        x: '10'
    };

    const parts = result.split(' ');

    if (parts.length > 1) {
        const last = parts[parts.length - 1];

        if (
            Object.prototype.hasOwnProperty.call(
                romanNumbers,
                last
            )
        ) {
            parts[parts.length - 1] = romanNumbers[last];
            result = parts.join(' ');
        }
    }

    return result;
}

function titleNameMatches(pageName, requestedTitle, pageType) {
    const page = normalize(cleanPageName(pageName));
    const requested = normalize(requestedTitle);

    if (!page || !requested) {
        return false;
    }

    if (page === requested) {
        return true;
    }

    if (pageType === 'movie') {
        return normalizeMovieTitle(pageName) ===
            normalizeMovieTitle(requestedTitle);
    }

    return false;
}

/* =========================================================
 * CANDIDATE PAGE VERIFICATION
 * ========================================================= */

function verifyCandidatePage(html, title, year) {
    const pageTitle = extractTitle(html);
    const pageYear = extractMoviePageYear(html);
    const pageType = extractPageType(html);
    const pageNames = extractPageNames(html);

    const matchedTitle =
        pageNames.find(name =>
            titleNameMatches(name, title, pageType)
        ) || '';

    const yearDifference =
        pageYear ? Math.abs(pageYear - year) : null;

    let yearMatches = false;

    if (pageYear && year) {
        if (pageType === 'movie') {
            yearMatches =
                yearDifference <= CONFIG.yearTolerance;
        } else {
            yearMatches = pageYear === year;
        }
    }

    const titleMatches = Boolean(matchedTitle);

    return {
        matched: yearMatches && titleMatches,
        pageTitle,
        pageYear,
        pageType,
        pageNames,
        matchedTitle,
        yearDifference,
        yearMatches,
        titleMatches
    };
}

/* =========================================================
 * AUTOMATIC RESOLUTION
 * ========================================================= */

async function resolveMovie(title, year) {
    const diagnostics = [];
    const allCandidates = [];

    const searchVariants = buildSearchTitleVariants(title);

    if (!year) {
        return {
            id: null,
            method: 'year_required_for_search',
            candidates: [],
            diagnostics,
            searchVariants
        };
    }

    if (!searchVariants.length) {
        return {
            id: null,
            method: 'empty_search_title',
            candidates: [],
            diagnostics,
            searchVariants
        };
    }

    const candidateMap = new Map();

    for (const searchTitle of searchVariants) {
        const searchURL =
            CONFIG.site +
            '/search/?q=' +
            encodeURIComponent(searchTitle);

        let page;

        try {
            page = await fetchHTML(searchURL);
        } catch (error) {
            diagnostics.push({
                stage: 'search',
                searchTitle,
                url: searchURL,
                error: String(error && error.message || error)
            });

            continue;
        }

        if (!page.ok) {
            diagnostics.push({
                stage: 'search',
                searchTitle,
                url: searchURL,
                status: page.status,
                htmlLength: page.length,
                candidatesFound: 0
            });

            continue;
        }

        const candidates = extractSearchCandidates(page.html);

        diagnostics.push({
            stage: 'search',
            searchTitle,
            url: searchURL,
            status: page.status,
            htmlLength: page.length,
            pageTitle: extractTitle(page.html),
            candidatesFound: candidates.length
        });

        for (const candidate of candidates) {
            const score = scoreCandidate(
                candidate,
                searchTitle,
                year
            );

            const entry = {
                ...candidate,
                searchTitle,
                score
            };

            allCandidates.push({
                id: entry.id,
                label: entry.label,
                titleAttribute: entry.titleAttribute,
                context: entry.context,
                years: entry.years,
                score: entry.score,
                searchTitle: entry.searchTitle
            });

            const existing = candidateMap.get(entry.id);

            if (!existing || entry.score > existing.score) {
                candidateMap.set(entry.id, {
                    id: entry.id,
                    score: entry.score,
                    searchTitle: entry.searchTitle,
                    label: entry.label,
                    titleAttribute: entry.titleAttribute,
                    ariaLabel: entry.ariaLabel,
                    context: entry.context,
                    years: entry.years,
                    order: entry.order
                });
            }
        }
    }

    const candidatePairs = [...candidateMap.values()]
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return (a.order || 0) - (b.order || 0);
        })
        .slice(
            0,
            Math.min(
                CONFIG.maxVerifyCandidates,
                CONFIG.maxTotalVerifyCandidates
            )
        );

    const pageCache = new Map();

    async function getCandidatePage(candidateId) {
        if (!pageCache.has(candidateId)) {
            pageCache.set(
                candidateId,
                fetchHTML(
                    CONFIG.site + '/' + candidateId + '/'
                )
            );
        }

        return pageCache.get(candidateId);
    }

    for (const candidate of candidatePairs) {
        try {
            const candidatePage =
                await getCandidatePage(candidate.id);

            const verified = candidatePage.ok
                ? verifyCandidatePage(
                    candidatePage.html,
                    title,
                    year
                )
                : {
                    matched: false,
                    pageTitle: '',
                    pageYear: 0,
                    pageType: 'unknown',
                    pageNames: [],
                    matchedTitle: '',
                    yearDifference: null,
                    yearMatches: false,
                    titleMatches: false
                };

            diagnostics.push({
                stage: 'candidate_verification',
                searchTitle: candidate.searchTitle,
                candidateId: candidate.id,
                candidateScore: candidate.score,
                candidateLabel: candidate.label,
                candidateContext: candidate.context,
                candidateYears: candidate.years,
                requestedTitle: title,
                requestedYear: year,
                candidatePageStatus: candidatePage.status,
                candidatePageTitle: verified.pageTitle,
                pageType: verified.pageType,
                pageNames: verified.pageNames.slice(0, 12),
                matchedTitle: verified.matchedTitle,
                candidateYear: verified.pageYear,
                yearDifference: verified.yearDifference,
                yearMatches: verified.yearMatches,
                titleMatches: verified.titleMatches,
                pageMatches: verified.matched
            });

            if (candidatePage.ok && verified.matched) {
                let method;

                if (verified.pageType === 'series') {
                    method =
                        'search_verified_exact_title_year_series';
                } else if (
                    verified.pageType === 'movie' &&
                    verified.yearDifference > 0
                ) {
                    method =
                        'search_verified_movie_title_year_tolerance';
                } else if (verified.pageType === 'movie') {
                    method =
                        'search_verified_exact_title_year_movie';
                } else {
                    method =
                        'search_verified_exact_title_year';
                }

                return {
                    id: candidate.id,
                    method,
                    candidates: allCandidates,
                    diagnostics,
                    searchVariants
                };
            }

        } catch (error) {
            diagnostics.push({
                stage: 'candidate_verification',
                searchTitle: candidate.searchTitle,
                candidateId: candidate.id,
                error: String(error && error.message || error)
            });
        }
    }

    return {
        id: null,
        method: 'search_no_verified_match',
        candidates: allCandidates,
        diagnostics,
        searchVariants
    };
}

/* =========================================================
 * AUDIO URL VALIDATION
 * ========================================================= */

function validateAudioURL(value) {
    if (!value) return null;

    try {
        const url = new URL(String(value).trim());

        if (url.protocol !== 'https:') {
            return null;
        }

        if (
            url.hostname !== 'audio-ssl.itunes.apple.com' &&
            url.hostname !== 'audio.itunes.apple.com'
        ) {
            return null;
        }

        return url.href;

    } catch (_) {
        return null;
    }
}

/* =========================================================
 * SOUNDTRACK TRACK DATA NORMALIZATION
 * ========================================================= */

function normalizeKinoriumTrack(data) {
    if (!data || typeof data !== 'object') return null;

    const name = String(
        data.song_name ||
        data.name ||
        data.track_name ||
        data.trackName ||
        data.title ||
        ''
    ).trim();

    if (!name) return null;

    const id = String(
        data.song_id ||
        data.songId ||
        data.id ||
        data.track_id ||
        data.trackId ||
        ''
    ).trim();

    const audioValue =
        data.preview_url ||
        data.previewUrl ||
        data.audio_url ||
        data.audioUrl ||
        data.file ||
        data.url ||
        '';

    const audioUrl = validateAudioURL(audioValue);

    const duration = Number(
        data.duration ||
        data.length ||
        data.track_duration ||
        0
    );

    const mainValue =
        data.isMain ??
        data.is_main ??
        data.main ??
        false;

    const isMain =
        mainValue === true ||
        mainValue === 1 ||
        mainValue === '1' ||
        mainValue === 'true';

    return {
        id,
        name,
        artist: String(
            data.artist_name ||
            data.artistName ||
            data.artist ||
            ''
        ).trim(),
        duration,
        isMain,
        audioUrl
    };
}

function parseSongJSON(raw) {
    const source = decodeEntities(String(raw || '')).trim();

    if (!source) return null;

    const attempts = [
        source,
        source.replace(/\\"/g, '"'),
        source.replace(/\\+"/g, '"'),
        source.replace(/\\\\/g, '\\')
    ];

    for (const attempt of attempts) {
        try {
            const parsed = JSON.parse(attempt);

            if (
                parsed &&
                typeof parsed === 'object' &&
                !Array.isArray(parsed)
            ) {
                return parsed;
            }

            if (Array.isArray(parsed)) {
                const candidate = parsed.find(
                    item => item && typeof item === 'object'
                );

                if (candidate) return candidate;
            }
        } catch (_) {}
    }

    return null;
}

function addUniqueTrack(tracks, seen, track) {
    if (!track || !track.name) return false;

    const key = track.id
        ? 'id:' + track.id
        : 'name:' + normalize(track.name) +
            '|artist:' + normalize(track.artist);

    if (seen.has(key)) return false;

    seen.add(key);
    tracks.push(track);

    return true;
}

/* =========================================================
 * FEATURED SOUNDTRACK EXTRACTION
 * ========================================================= */

function extractFeaturedTracks(html, diagnostics) {
    const source = String(html || '');
    const tracks = [];
    const seen = new Set();

    const stats = diagnostics || {};

    stats.liTagsFound = 0;
    stats.soundtrackControlsFound = 0;
    stats.dataSongAttributesFound = 0;
    stats.jsonParsed = 0;
    stats.jsonParseErrors = 0;
    stats.missingSongNames = 0;
    stats.duplicateTracks = 0;
    stats.tracksExtracted = 0;
    stats.parseErrors = [];

    const tagRegex =
        /<li\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

    let match;

    while (
        (match = tagRegex.exec(source)) &&
        tracks.length < CONFIG.maxTracks
    ) {
        stats.liTagsFound++;

        const tag = match[0];

        const classValue = extractAttribute(tag, 'class');

        const classes = classValue
            .split(/\s+/)
            .filter(Boolean);

        if (!classes.includes('film-page__soundtrack-control')) {
            continue;
        }

        stats.soundtrackControlsFound++;

        let raw = extractAttribute(tag, 'data-song');

        if (!raw) {
            if (stats.parseErrors.length < 10) {
                stats.parseErrors.push({
                    stage: 'attribute',
                    reason: 'data_song_missing',
                    tag: tag.slice(0, 300)
                });
            }

            continue;
        }

        stats.dataSongAttributesFound++;

        const data = parseSongJSON(raw);

        if (!data) {
            stats.jsonParseErrors++;

            if (stats.parseErrors.length < 10) {
                stats.parseErrors.push({
                    stage: 'json',
                    reason: 'data_song_json_invalid',
                    attributeStart: String(raw).slice(0, 240)
                });
            }

            continue;
        }

        stats.jsonParsed++;

        const track = normalizeKinoriumTrack(data);

        if (!track) {
            stats.missingSongNames++;

            if (stats.parseErrors.length < 10) {
                stats.parseErrors.push({
                    stage: 'data',
                    reason: 'song_name_missing',
                    songId: String(data.song_id || '')
                });
            }

            continue;
        }

        if (!addUniqueTrack(tracks, seen, track)) {
            stats.duplicateTracks++;
        }
    }

    stats.tracksExtracted = tracks.length;

    return tracks;
}

/* =========================================================
 * FULL ALBUM TRACK EXTRACTION
 *
 * Album pages may use a different HTML structure than the
 * featured list. Therefore, this parser searches all tags
 * with data-song attributes and embedded song JSON objects.
 * ========================================================= */

function extractAlbumTracks(html, diagnostics) {
    const source = String(html || '');
    const tracks = [];
    const seen = new Set();

    const stats = diagnostics || {};

    stats.tagsScanned = 0;
    stats.dataSongAttributesFound = 0;
    stats.jsonParsed = 0;
    stats.jsonParseErrors = 0;
    stats.embeddedObjectsFound = 0;
    stats.duplicateTracks = 0;
    stats.tracksExtracted = 0;
    stats.audioURLsFound = 0;
    stats.parseErrors = [];

    /*
     * First pass: inspect data-song attributes on any tag.
     * The album page may not use the featured-track class.
     */

    const tagRegex =
        /<[a-z][a-z0-9:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

    let tagMatch;

    while (
        (tagMatch = tagRegex.exec(source)) &&
        tracks.length < CONFIG.maxTracks
    ) {
        stats.tagsScanned++;

        const tag = tagMatch[0];
        const raw = extractAttribute(tag, 'data-song');

        if (!raw) continue;

        stats.dataSongAttributesFound++;

        const data = parseSongJSON(raw);

        if (!data) {
            stats.jsonParseErrors++;

            if (stats.parseErrors.length < 12) {
                stats.parseErrors.push({
                    stage: 'data-song',
                    reason: 'invalid_json',
                    tagStart: tag.slice(0, 260)
                });
            }

            continue;
        }

        stats.jsonParsed++;

        const track = normalizeKinoriumTrack(data);

        if (!track) {
            if (stats.parseErrors.length < 12) {
                stats.parseErrors.push({
                    stage: 'data-song',
                    reason: 'track_name_missing',
                    keys: Object.keys(data).slice(0, 20)
                });
            }

            continue;
        }

        if (track.audioUrl) stats.audioURLsFound++;

        if (!addUniqueTrack(tracks, seen, track)) {
            stats.duplicateTracks++;
        }
    }

    /*
     * Second pass: scan JSON-like objects that explicitly
     * contain song fields. This helps with script-embedded
     * data when no data-song attribute is present.
     */

    const fieldRegex =
        /["'](?:song_name|songName|track_name|trackName)["']\s*:/gi;

    let fieldMatch;
    const inspectedPositions = new Set();

    while (
        (fieldMatch = fieldRegex.exec(source)) &&
        tracks.length < CONFIG.maxTracks
    ) {
        const fieldPosition = fieldMatch.index;

        /*
         * Find the nearest preceding opening brace, then
         * scan forward while respecting quoted strings.
         */

        let start = source.lastIndexOf('{', fieldPosition);

        if (start < 0) continue;

        let depth = 0;
        let quote = '';
        let escaped = false;
        let end = -1;

        for (
            let i = start;
            i < source.length && i < start + 12000;
            i++
        ) {
            const ch = source[i];

            if (quote) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === quote) {
                    quote = '';
                }

                continue;
            }

            if (ch === '"' || ch === "'") {
                quote = ch;
                continue;
            }

            if (ch === '{') depth++;

            if (ch === '}') {
                depth--;

                if (depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }

        if (end < 0) continue;

        const objectText = source.slice(start, end);
        const positionKey = start + ':' + end;

        if (inspectedPositions.has(positionKey)) continue;
        inspectedPositions.add(positionKey);

        const data = parseSongJSON(objectText);

        if (!data) continue;

        const hasSongFields = Boolean(
            data.song_name ||
            data.songName ||
            data.track_name ||
            data.trackName
        );

        if (!hasSongFields) continue;

        stats.embeddedObjectsFound++;

        const track = normalizeKinoriumTrack(data);

        if (!track) continue;

        if (track.audioUrl) stats.audioURLsFound++;

        if (!addUniqueTrack(tracks, seen, track)) {
            stats.duplicateTracks++;
        }
    }

    /*
     * Third pass: the featured-track parser remains useful
     * for album pages that reuse the same <li> structure.
     */

    if (tracks.length < CONFIG.maxTracks) {
        const featuredStats = {};
        const featured = extractFeaturedTracks(
            source,
            featuredStats
        );

        for (const track of featured) {
            if (tracks.length >= CONFIG.maxTracks) break;

            if (!addUniqueTrack(tracks, seen, track)) {
                stats.duplicateTracks++;
            }
        }

        stats.featuredParser = featuredStats;
    }

    stats.tracksExtracted = tracks.length;

    return tracks.slice(0, CONFIG.maxTracks);
}

/* =========================================================
 * TRACK SELECTION
 * ========================================================= */

function selectTrack(tracks, requestedTrack, requestedSongId) {
    if (requestedSongId) {
        return tracks.find(
            item => item.id === requestedSongId
        ) || null;
    }

    if (requestedTrack) {
        const requested = normalize(requestedTrack);

        const exact = tracks.find(
            item => normalize(item.name) === requested
        );

        if (exact) return exact;

        return tracks.find(
            item => normalize(item.name).includes(requested)
        ) || null;
    }

    return tracks.find(
        item => item.isMain && item.audioUrl
    ) || tracks[0] || null;
}

/* =========================================================
 * HTML INSPECTOR
 * ========================================================= */

function inspectSoundtrackHTML(html) {
    const source = String(html || '');

    const patterns = [
        'film-page__soundtrack-control',
        'data-song',
        'song_name',
        'song_id',
        'preview_url',
        'soundtrack',
        'soundtrack-control',
        'itunes.apple.com',
        'audio-ssl.itunes.apple.com'
    ];

    const keywords = {};
    const fragments = [];
    const seen = new Set();

    for (const keyword of patterns) {
        const regex = new RegExp(
            keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'gi'
        );

        let match;
        let count = 0;
        const positions = [];

        while (
            (match = regex.exec(source)) &&
            count < 1000
        ) {
            count++;

            if (positions.length < 3) {
                positions.push(match.index);
            }

            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }

        keywords[keyword] = {
            count,
            positions
        };

        for (const index of positions) {
            const start = Math.max(0, index - 350);
            const end = Math.min(
                source.length,
                index + keyword.length + 550
            );

            const key = start + ':' + end;

            if (seen.has(key)) continue;

            seen.add(key);

            fragments.push({
                keyword,
                position: index,
                html: source.slice(start, end)
            });

            if (fragments.length >= 18) break;
        }

        if (fragments.length >= 18) break;
    }

    return {
        htmlLength: source.length,
        keywords,
        fragments
    };
}

/* =========================================================
 * AUDIO VERIFICATION
 * ========================================================= */

async function checkAudio(url) {
    const result = {
        checked: true,
        reachable: false,
        playableCandidate: false,
        httpStatus: null,
        contentType: '',
        contentRange: '',
        reason: ''
    };

    if (!url) {
        result.reason = 'missing_audio_url';
        return result;
    }

    try {
        const response = await fetchTimed(
            url,
            {
                method: 'GET',
                headers: {
                    Range: 'bytes=0-1023',
                    Accept: 'audio/*,*/*'
                }
            }
        );

        result.httpStatus = response.status;

        result.contentType =
            response.headers.get('content-type') || '';

        result.contentRange =
            response.headers.get('content-range') || '';

        result.reachable = response.ok;

        result.playableCandidate =
            response.ok &&
            (
                /^audio\//i.test(result.contentType) ||
                /^application\/octet-stream/i.test(
                    result.contentType
                )
            );

        result.reason =
            !response.ok
                ? 'http_error'
                : result.playableCandidate
                    ? 'audio_response'
                    : 'unexpected_content_type';

        if (response.body) {
            try {
                await response.body.cancel();
            } catch (_) {}
        }

    } catch (error) {
        result.reason = String(
            error && error.message || error
        );
    }

    return result;
}

/* =========================================================
 * ALBUM CACHE AND FALLBACK
 * ========================================================= */

async function getAlbumTracks(options) {
    const {
        id,
        cache,
        cacheInfo,
        cacheBypass
    } = options;

    const albumURL = CONFIG.site + '/' + id + '/soundtrack/';
    const albumKey = makeAlbumKey(id);

    let albumData = null;
    let page = null;

    if (!cacheBypass) {
        const cached = await cache.get(
            albumKey,
            cacheInfo
        );

        if (
            cached &&
            Array.isArray(cached.tracks) &&
            typeof cached.title === 'string'
        ) {
            const validTracks = cached.tracks.every(
                item =>
                    item &&
                    typeof item.id === 'string' &&
                    typeof item.name === 'string' &&
                    (
                        item.audioUrl === null ||
                        (
                            typeof item.audioUrl === 'string' &&
                            validateAudioURL(item.audioUrl) ===
                                item.audioUrl
                        )
                    )
            );

            if (validTracks) {
                albumData = cached;
                cacheInfo.album = 'HIT';
            }
        }
    }

    if (!albumData) {
        cacheInfo.album = cacheBypass ? 'BYPASS' : 'MISS';

        page = await fetchHTML(
            albumURL,
            {
                bypassCache: cacheBypass
            }
        );

        if (!page.ok) {
            return {
                success: false,
                page,
                albumURL,
                data: {
                    title: '',
                    tracks: [],
                    parserDiagnostics: null
                },
                reason: 'album_page_fetch_failed'
            };
        }

        const parserDiagnostics = {};

        const tracks = extractAlbumTracks(
            page.html,
            parserDiagnostics
        );

        albumData = {
            title: extractTitle(page.html),
            tracks,
            parserDiagnostics
        };

        const ttl = tracks.some(item => item.audioUrl)
            ? CONFIG.kv.albumTTL
            : CONFIG.kv.emptyAlbumTTL;

        await cache.put(
            albumKey,
            albumData,
            ttl,
            cacheInfo
        );
    }

    return {
        success: true,
        page,
        albumURL,
        data: albumData,
        reason: 'ok'
    };
}

async function findPlayableAlbumTrack(options) {
    const {
        tracks,
        requestedTrack,
        requestedSongId,
        verify
    } = options;

    const list = Array.isArray(tracks) ? tracks : [];

    if (!list.length) {
        return {
            selected: null,
            audioCheck: null,
            checkedCandidates: 0,
            reason: 'album_tracks_not_found'
        };
    }

    /*
     * Explicit track requests are respected. The fallback does
     * not silently replace a requested track with another one.
     */

    if (requestedTrack || requestedSongId) {
        const requested = selectTrack(
            list,
            requestedTrack,
            requestedSongId
        );

        if (!requested) {
            return {
                selected: null,
                audioCheck: null,
                checkedCandidates: 0,
                reason: 'requested_track_not_found'
            };
        }

        if (!requested.audioUrl) {
            return {
                selected: requested,
                audioCheck: null,
                checkedCandidates: 0,
                reason: 'requested_track_has_no_audio_url'
            };
        }

        if (!verify) {
            return {
                selected: requested,
                audioCheck: null,
                checkedCandidates: 0,
                reason: 'audio_not_checked'
            };
        }

        const audioCheck = await checkAudio(
            requested.audioUrl
        );

        return {
            selected: requested,
            audioCheck,
            checkedCandidates: 1,
            reason: audioCheck.playableCandidate
                ? 'ok'
                : 'requested_track_audio_check_failed'
        };
    }

    /*
     * Prefer the main theme when it has an audio URL, then
     * try other tracks in album order.
     */

    const ordered = [
        ...list.filter(item => item.isMain && item.audioUrl),
        ...list.filter(item => !item.isMain && item.audioUrl)
    ];

    const candidates = [];
    const seen = new Set();

    for (const item of ordered) {
        const key = item.id || normalize(item.name);

        if (seen.has(key)) continue;

        seen.add(key);
        candidates.push(item);

        if (
            candidates.length >=
            CONFIG.maxAlbumVerifyCandidates
        ) {
            break;
        }
    }

    if (!candidates.length) {
        return {
            selected: list[0] || null,
            audioCheck: null,
            checkedCandidates: 0,
            reason: 'album_preview_url_missing'
        };
    }

    if (!verify) {
        return {
            selected: candidates[0],
            audioCheck: null,
            checkedCandidates: 0,
            reason: 'audio_not_checked'
        };
    }

    let lastSelected = null;
    let lastCheck = null;
    let checkedCandidates = 0;

    for (const candidate of candidates) {
        checkedCandidates++;

        const audioCheck = await checkAudio(
            candidate.audioUrl
        );

        lastSelected = candidate;
        lastCheck = audioCheck;

        if (audioCheck.playableCandidate) {
            return {
                selected: candidate,
                audioCheck,
                checkedCandidates,
                reason: 'ok'
            };
        }
    }

    return {
        selected: lastSelected,
        audioCheck: lastCheck,
        checkedCandidates,
        reason: 'album_audio_check_failed'
    };
}

/* =========================================================
 * SOUNDTRACK ENDPOINT WITH KV AND ALBUM FALLBACK
 * ========================================================= */

async function getSoundtrack(options) {
    const {
        id,
        track,
        songId,
        verify,
        debug,
        inspect,
        cache,
        cacheInfo,
        cacheBypass
    } = options;

    const pageURL = CONFIG.site + '/' + id + '/';
    const soundtrackKey = makeSoundtrackKey(id);

    let soundtrackData = null;
    let page = null;
    let parserDiagnostics = null;

    /*
     * STEP 1:
     * Read shared featured-soundtrack cache.
     */

    if (!cacheBypass) {
        const cached = await cache.get(
            soundtrackKey,
            cacheInfo
        );

        if (
            cached &&
            Array.isArray(cached.tracks) &&
            typeof cached.title === 'string'
        ) {
            const validTracks = cached.tracks.every(
                item =>
                    item &&
                    typeof item.id === 'string' &&
                    typeof item.name === 'string' &&
                    (
                        item.audioUrl === null ||
                        (
                            typeof item.audioUrl === 'string' &&
                            validateAudioURL(item.audioUrl) ===
                                item.audioUrl
                        )
                    )
            );

            if (validTracks) {
                soundtrackData = cached;
                cacheInfo.soundtrack = 'HIT';
            }
        }
    }

    /*
     * STEP 2:
     * Fetch the main movie page on cache miss or refresh.
     */

    if (!soundtrackData) {
        cacheInfo.soundtrack =
            cacheBypass ? 'BYPASS' : 'MISS';

        page = await fetchHTML(
            pageURL,
            {
                bypassCache: cacheBypass
            }
        );

        if (page.ok) {
            parserDiagnostics = {};

            soundtrackData = {
                title: extractTitle(page.html),
                tracks: extractFeaturedTracks(
                    page.html,
                    parserDiagnostics
                ),
                parserDiagnostics
            };

            const ttl = soundtrackData.tracks.length
                ? CONFIG.kv.soundtrackTTL
                : CONFIG.kv.emptySoundtrackTTL;

            await cache.put(
                soundtrackKey,
                soundtrackData,
                ttl,
                cacheInfo
            );
        } else {
            soundtrackData = {
                title: '',
                tracks: [],
                parserDiagnostics: {
                    error: 'main_page_fetch_failed',
                    status: page.status
                }
            };
        }
    } else {
        parserDiagnostics =
            soundtrackData.parserDiagnostics || null;
    }

    const title = soundtrackData.title;
    const tracks = soundtrackData.tracks || [];

    /*
     * STEP 3:
     * Try the featured list first.
     */

    const selected = selectTrack(
        tracks,
        track,
        songId
    );

    let audioCheck = null;

    if (selected && selected.audioUrl && verify) {
        audioCheck = await checkAudio(selected.audioUrl);
    }

    let playable = Boolean(
        selected &&
        selected.audioUrl &&
        (
            !verify ||
            (
                audioCheck &&
                audioCheck.playableCandidate
            )
        )
    );

    let featuredReason = 'ok';

    if (!tracks.length) {
        featuredReason = 'featured_tracks_not_found';
    } else if (!selected) {
        featuredReason = 'requested_track_not_found';
    } else if (!selected.audioUrl) {
        featuredReason = 'preview_url_missing';
    } else if (!verify) {
        featuredReason = 'audio_not_checked';
    } else if (!playable) {
        featuredReason = 'audio_check_failed';
    }

    /*
     * STEP 4:
     * If the featured list does not produce playable audio,
     * automatically fetch the full soundtrack album.
     */

    const needsAlbumFallback = !playable;

    let albumResult = null;
    let albumSelection = null;

    if (needsAlbumFallback) {
        albumResult = await getAlbumTracks({
            id,
            cache,
            cacheInfo,
            cacheBypass
        });

        if (albumResult.success) {
            albumSelection = await findPlayableAlbumTrack({
                tracks: albumResult.data.tracks,
                requestedTrack: track,
                requestedSongId: songId,
                verify
            });
        } else {
            albumSelection = {
                selected: null,
                audioCheck: null,
                checkedCandidates: 0,
                reason: albumResult.reason
            };
        }
    }

    const albumSelected =
        albumSelection && albumSelection.selected;

    const albumPlayable = Boolean(
        albumSelected &&
        albumSelected.audioUrl &&
        (
            !verify ||
            (
                albumSelection.audioCheck &&
                albumSelection.audioCheck.playableCandidate
            )
        )
    );

    /*
     * Prefer the featured track if it was verified as playable.
     * Otherwise, use the first verified playable album track.
     */

    const useAlbum = !playable && albumPlayable;

    const finalSelected = useAlbum
        ? albumSelected
        : selected;

    const finalAudioCheck = useAlbum
        ? albumSelection.audioCheck
        : audioCheck;

    playable = useAlbum || playable;

    const finalTitle = title ||
        (
            albumResult &&
            albumResult.data &&
            albumResult.data.title
        ) ||
        '';

    let reason = featuredReason;
    let mode = 'featured_soundtrack';
    let sourcePage = pageURL;

    if (useAlbum) {
        reason = 'album_fallback_playable';
        mode = 'album_fallback';
        sourcePage = albumResult.albumURL;
    } else if (
        needsAlbumFallback &&
        albumResult &&
        albumResult.success
    ) {
        mode = 'album_fallback_unplayable';

        reason = albumSelection
            ? albumSelection.reason
            : 'album_fallback_no_selection';
    } else if (
        needsAlbumFallback &&
        albumResult &&
        !albumResult.success
    ) {
        mode = 'featured_and_album_failed';
        reason = albumResult.reason;
    }

    const finalTracks = useAlbum
        ? albumResult.data.tracks
        : tracks;

    const result = {
        success: true,
        version: VERSION,
        source: 'kinorium',
        mode,
        found: Boolean(
            finalSelected ||
            tracks.length ||
            (
                albumResult &&
                albumResult.data &&
                albumResult.data.tracks &&
                albumResult.data.tracks.length
            )
        ),
        playable,
        id,
        title: finalTitle,
        track: finalSelected
            ? {
                id: finalSelected.id,
                name: finalSelected.name,
                artist: finalSelected.artist,
                duration: finalSelected.duration,
                audioUrl: finalSelected.audioUrl,
                playable
            }
            : null,
        audioUrl: finalSelected
            ? finalSelected.audioUrl
            : null,
        audioAssociationVerified: Boolean(
            finalSelected &&
            finalSelected.audioUrl &&
            (
                !verify ||
                (
                    finalAudioCheck &&
                    finalAudioCheck.playableCandidate
                )
            )
        ),
        tracksCount: finalTracks.length,
        tracks: finalTracks.map(item => ({
            id: item.id,
            name: item.name,
            artist: item.artist,
            duration: item.duration,
            audioUrl: item.audioUrl,
            isMain: item.isMain
        })),
        audioCheck: finalAudioCheck,
        reason,
        pageURL: sourcePage,
        fallback: {
            attempted: needsAlbumFallback,
            used: useAlbum,
            albumURL: albumResult
                ? albumResult.albumURL
                : CONFIG.site + '/' + id + '/soundtrack/',
            albumFetchSucceeded: Boolean(
                albumResult && albumResult.success
            ),
            albumTracksCount: albumResult &&
                albumResult.data &&
                Array.isArray(albumResult.data.tracks)
                    ? albumResult.data.tracks.length
                    : 0,
            albumPlayableCandidatesChecked:
                albumSelection
                    ? albumSelection.checkedCandidates
                    : 0,
            albumReason: albumSelection
                ? albumSelection.reason
                : albumResult
                    ? albumResult.reason
                    : null
        }
    };

    if (inspect) {
        result.inspection = page
            ? inspectSoundtrackHTML(page.html)
            : {
                available: false,
                reason: 'main_page_not_fetched'
            };

        if (albumResult && albumResult.page) {
            result.albumInspection = inspectSoundtrackHTML(
                albumResult.page.html
            );
        }
    }

    if (debug) {
        result.debug = {
            httpStatus: page ? page.status : null,
            finalURL: page ? page.url : pageURL,
            contentType: page ? page.contentType : null,
            htmlLength: page ? page.length : null,
            featuredControlsFound:
                parserDiagnostics
                    ? parserDiagnostics.soundtrackControlsFound
                    : tracks.length,
            parserDiagnostics,
            selectedFeaturedTrackId: selected
                ? selected.id
                : null,
            selectedFeaturedTrackName: selected
                ? selected.name
                : null,
            selectedFinalTrackId: finalSelected
                ? finalSelected.id
                : null,
            selectedFinalTrackName: finalSelected
                ? finalSelected.name
                : null,
            previewVerificationEnabled: verify,
            audioCheck: finalAudioCheck,
            fallback: {
                attempted: needsAlbumFallback,
                used: useAlbum,
                albumStatus: albumResult &&
                    albumResult.page
                        ? albumResult.page.status
                        : null,
                albumURL: albumResult
                    ? albumResult.albumURL
                    : CONFIG.site + '/' + id + '/soundtrack/',
                albumHTMLLength: albumResult &&
                    albumResult.page
                        ? albumResult.page.length
                        : null,
                albumParserDiagnostics: albumResult &&
                    albumResult.data
                        ? albumResult.data.parserDiagnostics
                        : null,
                albumTracksCount: albumResult &&
                    albumResult.data &&
                    Array.isArray(albumResult.data.tracks)
                        ? albumResult.data.tracks.length
                        : 0,
                albumSelection,
                albumAudioCheck: albumSelection
                    ? albumSelection.audioCheck
                    : null
            },
            kv: {
                enabled: cache.enabled,
                resolution: cacheInfo.resolution,
                soundtrack: cacheInfo.soundtrack,
                album: cacheInfo.album
            }
        };
    }

    return result;
}
