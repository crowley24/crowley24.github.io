
/*
 * ORIGINAL SOUNDTRACK
 * KINORIUM WORKER 1.3.0
 *
 * Cloudflare Workers
 * Lampa / Android TV / Mobile
 *
 * SOURCE:
 * https://ua.kinorium.com/
 *
 * FEATURES:
 * - Main movie page soundtrack parsing
 * - Featured soundtrack controls
 * - Exact data-song JSON extraction
 * - Direct Apple audio preview URLs
 * - Track selection by name or song ID
 * - Audio availability verification
 * - Safe response when audio unavailable
 * - CORS support
 * - Diagnostic mode
 *
 * EXAMPLES:
 *
 * /
 *
 * /?id=143897
 *
 * /?id=143897&debug=1
 *
 * /?id=143897&track=The%20Battle
 *
 * /?id=143897&track=Elysium
 *
 * /?id=143897&track=Now%20We%20Are%20Free
 *
 * /?id=143897&song_id=1440563164
 *
 * /?id=143897&verify=0
 *
 * NOTE:
 * Preview audio is usually around 30 seconds.
 * Album duration is not preview duration.
 */

'use strict';

const VERSION = '1.3.0';

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 15000,
    maxHTML: 2000000,
    maxTracks: 30,
    cacheSeconds: 300
};

const RESPONSE_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers':
        'Content-Type, Range',
    'Access-Control-Expose-Headers':
        'Content-Type, Content-Length, Content-Range',
    'Cache-Control': 'no-store'
};

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: RESPONSE_HEADERS
            });
        }

        if (request.method !== 'GET') {
            return sendJSON({
                success: false,
                version: VERSION,
                error: 'method_not_allowed'
            }, 405);
        }

        const url = new URL(request.url);

        const id = String(
            url.searchParams.get('id') || ''
        ).trim();

        const requestedTrack = String(
            url.searchParams.get('track') || ''
        ).trim();

        const requestedSongId = String(
            url.searchParams.get('song_id') || ''
        ).trim();

        const debug =
            url.searchParams.get('debug') === '1';

        const verify =
            url.searchParams.get('verify') !== '0';

        if (!id) {
            return sendJSON({
                success: true,
                service: 'Kinorium Original Soundtrack',
                version: VERSION,
                source: 'kinorium',
                mode: 'featured_soundtrack',
                endpoints: {
                    movie:
                        '/?id=143897',
                    debug:
                        '/?id=143897&debug=1',
                    theBattle:
                        '/?id=143897&track=The%20Battle',
                    elysium:
                        '/?id=143897&track=Elysium',
                    nowWeAreFree:
                        '/?id=143897&track=Now%20We%20Are%20Free',
                    songId:
                        '/?id=143897&song_id=1440563164'
                }
            });
        }

        if (!/^\d{1,12}$/.test(id)) {
            return sendJSON({
                success: false,
                version: VERSION,
                error: 'invalid_movie_id'
            }, 400);
        }

        try {
            const result = await getSoundtrack({
                id,
                requestedTrack,
                requestedSongId,
                debug,
                verify
            });

            return sendJSON(result);
        } catch (error) {
            return sendJSON({
                success: false,
                version: VERSION,
                source: 'kinorium',
                id,
                found: false,
                playable: false,
                audioUrl: null,
                error: String(
                    error && error.message || error
                )
            }, 502);
        }
    }
};

function sendJSON(data, status = 200) {
    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: {
                ...RESPONSE_HEADERS,
                'Content-Type':
                    'application/json; charset=utf-8'
            }
        }
    );
}

async function fetchTimed(url, options = {}) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout
    );

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
            redirect: 'follow'
        });
    } finally {
        clearTimeout(timer);
    }
}

function decodeEntities(value) {
    return String(value || '')
        .replace(/&quot;/gi, '"')
        .replace(/&#34;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#(\d+);/g, (_, n) => {
            const number = Number(n);

            return number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
            const number = parseInt(n, 16);

            return number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        });
}

function stripTags(value) {
    return decodeEntities(
        String(value || '')
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
    const match = html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    return match
        ? stripTags(match[1])
        : '';
}

function extractAttribute(tag, name) {
    const escapedName = name.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );

    const regex = new RegExp(
        '\\b' +
        escapedName +
        '\\s*=\\s*(["\'])([\\s\\S]*?)\\1',
        'i'
    );

    const match = tag.match(regex);

    return match
        ? decodeEntities(match[2])
        : '';
}

function parseSongData(tag) {
    const raw = extractAttribute(
        tag,
        'data-song'
    );

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function validateAudioURL(value) {
    if (!value) return null;

    try {
        const url = new URL(value);

        if (url.protocol !== 'https:') {
            return null;
        }

        /*
         * Only known Apple preview domains.
         * Prevents arbitrary media URLs.
         */

        const host = url.hostname.toLowerCase();

        if (
            host !== 'audio-ssl.itunes.apple.com' &&
            host !== 'audio.itunes.apple.com'
        ) {
            return null;
        }

        return url.href;
    } catch (_) {
        return null;
    }
}

function extractFeaturedTracks(html) {
    const results = [];

    /*
     * Exact markup found on Kinorium:
     *
     * <li class='song isMain
     * film-page__soundtrack-control'
     * data-song='{"song_name":"...",
     * "preview_url":"..."}'>
     *
     * Extract only these featured controls.
     */

    const regex = /<li\b[^>]*>/gi;

    let match;

    while (
        (match = regex.exec(html)) &&
        results.length < CONFIG.maxTracks
    ) {
        const tag = match[0];

        const className = extractAttribute(
            tag,
            'class'
        );

        if (
            !className.split(/\s+/).includes(
                'film-page__soundtrack-control'
            )
        ) {
            continue;
        }

        const data = parseSongData(tag);

        if (!data) continue;

        const name = String(
            data.song_name || ''
        ).trim();

        if (!name) continue;

        const audioURL = validateAudioURL(
            data.preview_url
        );

        const track = {
            id: String(
                data.song_id || ''
            ),
            name,
            artist: String(
                data.artist_name || ''
            ),
            albumId: String(
                data.album_id || ''
            ),
            duration: Number(
                data.duration || 0
            ),
            trackNumber: Number(
                data.trackNumber || 0
            ),
            isMain:
                Number(data.isMain || 0) === 1,
            audioUrl: audioURL,
            audioSource:
                audioURL
                    ? 'apple_preview'
                    : null,
            associationVerified:
                Boolean(audioURL),
            selectionSource:
                'featured_data_song'
        };

        results.push(track);
    }

    const seen = new Set();

    return results.filter(track => {
        const key =
            track.id ||
            normalize(track.name);

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

function selectTrack(
    tracks,
    requestedTrack,
    requestedSongId
) {
    if (!tracks.length) return null;

    if (requestedSongId) {
        const found = tracks.find(
            track =>
                track.id === requestedSongId
        );

        return found
            ? {
                ...found,
                selection: 'requested_song_id'
            }
            : null;
    }

    if (requestedTrack) {
        const exact = tracks.find(
            track =>
                normalize(track.name) ===
                normalize(requestedTrack)
        );

        if (exact) {
            return {
                ...exact,
                selection: 'requested_exact'
            };
        }

        const partial = tracks.find(
            track =>
                normalize(track.name).includes(
                    normalize(requestedTrack)
                )
        );

        return partial
            ? {
                ...partial,
                selection: 'requested_partial'
            }
            : null;
    }

    /*
     * Kinorium marks main compositions.
     * Preserve the site's original order.
     */

    const preferred = tracks.find(
        track =>
            track.isMain &&
            track.audioUrl
    );

    return {
        ...(preferred || tracks[0]),
        selection: 'first_main_theme'
    };
}

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
            response.headers.get(
                'content-type'
            ) || '';

        result.contentRange =
            response.headers.get(
                'content-range'
            ) || '';

        result.reachable = response.ok;

        result.playableCandidate =
            response.ok &&
            (
                /^audio\//i.test(
                    result.contentType
                ) ||
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

async function fetchMoviePage(id) {
    const pageURL =
        `${CONFIG.site}/${id}/`;

    /*
     * Keep the User-Agent that returned
     * the complete movie page in tests.
     */

    const response = await fetchTimed(
        pageURL,
        {
            headers: {
                Accept:
                    'text/html,application/xhtml+xml',
                'Accept-Language':
                    'uk-UA,uk;q=0.9,en;q=0.7',
                'User-Agent':
                    'Mozilla/5.0 (compatible; KinoriumOST/1.1)'
            },
            cf: {
                cacheEverything: true,
                cacheTtl: CONFIG.cacheSeconds
            }
        }
    );

    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    const html = response.ok
        ? (
            await response.text()
        ).slice(0, CONFIG.maxHTML)
        : '';

    return {
        ok: response.ok,
        status: response.status,
        contentType,
        html,
        finalURL: response.url,
        pageURL
    };
}

async function getSoundtrack(options) {
    const {
        id,
        requestedTrack,
        requestedSongId,
        debug,
        verify
    } = options;

    const page = await fetchMoviePage(id);

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
            pageURL: page.pageURL
        };
    }

    if (
        !/text\/html/i.test(
            page.contentType
        )
    ) {
        return {
            success: false,
            version: VERSION,
            source: 'kinorium',
            id,
            found: false,
            playable: false,
            audioUrl: null,
            reason: 'unexpected_content_type',
            contentType: page.contentType
        };
    }

    const title = extractTitle(
        page.html
    );

    const tracks = extractFeaturedTracks(
        page.html
    );

    const selected = selectTrack(
        tracks,
        requestedTrack,
        requestedSongId
    );

    let audioCheck = null;

    if (
        selected &&
        selected.audioUrl &&
        verify
    ) {
        audioCheck = await checkAudio(
            selected.audioUrl
        );
    }

    const associationVerified =
        Boolean(
            selected &&
            selected.associationVerified
        );

    const playable =
        Boolean(
            selected &&
            selected.audioUrl &&
            associationVerified &&
            (
                !verify ||
                (
                    audioCheck &&
                    audioCheck.playableCandidate
                )
            )
        );

    let reason = '';

    if (!tracks.length) {
        reason = 'featured_tracks_not_found';
    } else if (!selected) {
        reason = 'requested_track_not_found';
    } else if (!selected.audioUrl) {
        reason = 'preview_url_missing';
    } else if (
        verify &&
        !playable
    ) {
        reason = 'audio_check_failed';
    } else if (!verify) {
        reason = 'audio_not_checked';
    } else {
        reason = 'ok';
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
                duration: selected.duration,
                selection:
                    selected.selection
            }
            : null,
        audioUrl: selected
            ? selected.audioUrl
            : null,
        audioAssociationVerified:
            associationVerified,
        tracksCount: tracks.length,
        tracks: tracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artist,
            audioUrl: track.audioUrl,
            isMain: track.isMain
        })),
        audioCheck,
        reason,
        pageURL: page.pageURL
    };

    if (debug) {
        result.debug = {
            httpStatus: page.status,
            finalURL: page.finalURL,
            contentType: page.contentType,
            htmlLength: page.html.length,
            featuredControlsFound:
                tracks.length,
            selectedTrackId:
                selected ? selected.id : null,
            selectedTrackName:
                selected ? selected.name : null,
            previewVerificationEnabled:
                verify,
            audioCheck,
            note:
                'Audio URL is extracted from ' +
                'the exact data-song attribute ' +
                'of its featured soundtrack control.'
        };
    }

    return result;
}
