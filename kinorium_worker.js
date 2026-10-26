
/*
 * ORIGINAL SOUNDTRACK
 * KINORIUM WORKER 1.6.5
 *
 * Cloudflare Workers + KV
 * Binding: KINORIUM_CACHE
 *
 * Features:
 * - Custom OST catalog priority
 * - YouTube soundtrack catalog
 * - OSTMusic album/track resolution
 * - Kinorium fallback
 * - Automatic movie and TV series search
 * - Movie year tolerance +/- 1
 * - Exact start year for TV series
 * - Roman / Arabic movie sequel numbers
 * - Shared KV resolution cache
 * - Shared KV soundtrack cache
 * - Short-lived negative soundtrack cache
 * - Audio verification on every verified request
 * - Cache HIT / MISS diagnostics
 * - HTML inspection mode
 * - Graceful fallback if KV is unavailable
 * - No hardcoded movie mappings
 * - No Muzofond integration
 *
 * Custom catalog:
 * https://crowley24.github.io/OST/ost_custom.json
 *
 * Endpoints:
 * ?title=Titanic&year=1997
 * ?title=Friends&year=1994
 * ?id=108983
 * ?title=Titanic&year=1997&debug=1
 * ?id=108983&track=Rose
 * ?id=108983&song_id=205745739
 * ?id=108983&verify=0
 * ?id=2663934&debug=1&inspect=1&refresh=1
 */

'use strict';

const VERSION = '1.6.5';

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
    cacheSeconds: 300,
    yearTolerance: 1,
    maxSearchVariants: 5,

    kv: {
        prefix: 'kinorium:v160:',
        resolutionTTL: 7 * 86400,
        soundtrackTTL: 12 * 3600,
        emptySoundtrackTTL: 600,
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

/*
 * CUSTOM SOUNDTRACK CATALOG
 *
 * Priority:
 * 1. ost_custom.json
 * 2. Existing Kinorium lookup
 *
 * Supported sources:
 * - youtube
 * - ostmusic
 */

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

/*
 * ENTRY POINT
 */

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
                    soundtrackTTL: CONFIG.kv.soundtrackTTL
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
                    inspect: '?id=2663934&debug=1&inspect=1&refresh=1'
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
            errors: []
        };

        try {
            /*
             * STEP 0:
             * Check the custom OST catalog first.
             *
             * Direct Kinorium ID requests bypass this step.
             * If the custom catalog has no usable result,
             * normal Kinorium lookup continues unchanged.
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
                    /*
                     * YouTube:
                     * Return the canonical video URL.
                     *
                     * The Lampa plugin must handle source="youtube"
                     * with the YouTube IFrame Player.
                     * Do not pass this URL to new Audio().
                     */

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

                    /*
                     * OSTMusic:
                     * Resolve albumId and trackId to a direct
                     * audio URL. If resolution fails, continue
                     * to the normal Kinorium lookup.
                     */

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
             * Existing Kinorium resolution.
             *
             * This remains the fallback when the custom catalog
             * does not provide a usable result.
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

/*
 * JSON RESPONSE
 */

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: JSON_HEADERS
        }
    );
}

/*
 * CLOUDFLARE KV
 */

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

/*
 * HTTP
 */

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
            'Mozilla/5.0 (compatible; KinoriumOST/1.6.5)'
    };
}

async function fetchHTML(url) {
    const response = await fetchTimed(
        url,
        {
            headers: siteHeaders(),
            cf: {
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

/*
 * HTML UTILITIES
 */

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
        '\\s*=\\s*(["\'])([\\s\S]*?)\\1',
        'i'
    );

    const match = String(tag || '').match(regex);

    return match ? decodeEntities(match[2]) : '';
}

/*
 * SEARCH VARIANTS
 */

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

/*
 * SEARCH CANDIDATES
 */

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

/*
 * CANDIDATE SCORING
 */

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

/*
 * PAGE NAMES
 */

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

/*
 * PAGE YEAR AND TYPE
 */

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

/*
 * MOVIE SEQUEL NORMALIZATION
 */

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

/*
 * CANDIDATE PAGE VERIFICATION
 */

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

/*
 * AUTOMATIC RESOLUTION
 */

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

    /*
     * No hardcoded movie fallback.
     * If Kinorium cannot verify a match, return no result.
     */

    return {
        id: null,
        method: 'search_no_verified_match',
        candidates: allCandidates,
        diagnostics,
        searchVariants
    };
}

/*
 * AUDIO URL VALIDATION
 */

function validateAudioURL(value) {
    if (!value) return null;

    try {
        const url = new URL(value);

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

/*
 * FEATURED SOUNDTRACK EXTRACTION
 */

function extractFeaturedTracks(html) {
    const tracks = [];
    const seen = new Set();

    const regex = /<li\b[^>]*>/gi;
    let match;

    while (
        (match = regex.exec(html)) &&
        tracks.length < CONFIG.maxTracks
    ) {
        const tag = match[0];

        const classes = extractAttribute(
            tag,
            'class'
        ).split(/\s+/);

        if (
            !classes.includes(
                'film-page__soundtrack-control'
            )
        ) {
            continue;
        }

        const raw = extractAttribute(tag, 'data-song');

        if (!raw) continue;

        let data;

        try {
            data = JSON.parse(raw);
        } catch (_) {
            continue;
        }

        const name = String(data.song_name || '').trim();

        if (!name) continue;

        const id = String(data.song_id || '');
        const key = id || normalize(name);

        if (seen.has(key)) continue;

        seen.add(key);

        const audioUrl = validateAudioURL(data.preview_url);

        tracks.push({
            id,
            name,
            artist: String(data.artist_name || ''),
            duration: Number(data.duration || 0),
            isMain: Number(data.isMain || 0) === 1,
            audioUrl
        });
    }

    return tracks;
}

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

/*
 * TEMPORARY HTML INSPECTOR
 */

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

/*
 * AUDIO VERIFICATION
 *
 * Verification is intentionally not stored in KV.
 * Cached audio URLs are checked again when requested.
 */

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

/*
 * SOUNDTRACK ENDPOINT WITH KV
 */

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

    /*
     * STEP 1:
     * Read shared soundtrack cache.
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
     * Fetch Kinorium on a cache miss or refresh.
     */

    if (!soundtrackData) {
        cacheInfo.soundtrack =
            cacheBypass ? 'BYPASS' : 'MISS';

        page = await fetchHTML(pageURL);

        if (!page.ok) {
            return {
                success: false,
                version: VERSION,
                source: 'kinorium',
                id,
                found: false,
                playable: false,
                audioUrl: null,
                reason: 'page_fetch_failed',
                httpStatus: page.status,
                pageURL,
                ...(inspect
                    ? {
                        inspection: {
                            htmlLength: page.length,
                            contentType: page.contentType,
                            note: 'HTML inspection unavailable because the page fetch failed.'
                        }
                    }
                    : {})
            };
        }

        soundtrackData = {
            title: extractTitle(page.html),
            tracks: extractFeaturedTracks(page.html)
        };

        /*
         * Cache valid page results.
         * Empty soundtracks expire sooner.
         */

        const ttl = soundtrackData.tracks.length
            ? CONFIG.kv.soundtrackTTL
            : CONFIG.kv.emptySoundtrackTTL;

        await cache.put(
            soundtrackKey,
            soundtrackData,
            ttl,
            cacheInfo
        );
    }

    /*
     * STEP 3:
     * Select the requested track.
     */

    const title = soundtrackData.title;
    const tracks = soundtrackData.tracks;

    const selected = selectTrack(
        tracks,
        track,
        songId
    );

    /*
     * STEP 4:
     * Verify audio independently of KV.
     */

    let audioCheck = null;

    if (selected && selected.audioUrl && verify) {
        audioCheck = await checkAudio(selected.audioUrl);
    }

    const playable = Boolean(
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

    let reason = 'ok';

    if (!tracks.length) {
        reason = 'featured_tracks_not_found';
    } else if (!selected) {
        reason = 'requested_track_not_found';
    } else if (!selected.audioUrl) {
        reason = 'preview_url_missing';
    } else if (!verify) {
        reason = 'audio_not_checked';
    } else if (!playable) {
        reason = 'audio_check_failed';
    }

    const result = {
        success: true,
        version: VERSION,
        source: 'kinorium',
        mode: 'featured_soundtrack',
        found: tracks.length > 0,
        playable,
        id,
        title,
        track: selected
            ? {
                id: selected.id,
                name: selected.name,
                artist: selected.artist,
                duration: selected.duration
            }
            : null,
        audioUrl: selected ? selected.audioUrl : null,
        audioAssociationVerified: Boolean(
            selected && selected.audioUrl
        ),
        tracksCount: tracks.length,
        tracks: tracks.map(item => ({
            id: item.id,
            name: item.name,
            artist: item.artist,
            audioUrl: item.audioUrl,
            isMain: item.isMain
        })),
        audioCheck,
        reason,
        pageURL
    };

    /*
     * HTML inspection only works when the page was fetched
     * during this request. If KV supplied the soundtrack,
     * refresh=1 is needed to inspect fresh HTML.
     */

    if (inspect) {
        result.inspection = page
            ? inspectSoundtrackHTML(page.html)
            : {
                available: false,
                reason: 'page_not_fetched_use_refresh_1'
            };
    }

    if (debug) {
        result.debug = {
            httpStatus: page ? page.status : null,
            finalURL: page ? page.url : pageURL,
            contentType: page ? page.contentType : null,
            htmlLength: page ? page.length : null,
            featuredControlsFound: tracks.length,
            selectedTrackId: selected ? selected.id : null,
            selectedTrackName: selected ? selected.name : null,
            previewVerificationEnabled: verify,
            audioCheck,
            kv: {
                enabled: cache.enabled,
                resolution: cacheInfo.resolution,
                soundtrack: cacheInfo.soundtrack
            }
        };
    }

    return result;
}
