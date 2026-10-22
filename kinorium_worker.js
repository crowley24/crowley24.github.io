
/*
 * ORIGINAL SOUNDTRACK
 * KINORIUM WORKER 1.4.0
 *
 * Cloudflare Workers
 *
 * Direct Kinorium ID:
 *   ?id=143897
 *
 * Automatic title search:
 *   ?title=Gladiator&year=2000
 *
 * Diagnostics:
 *   ?title=Gladiator&year=2000&debug=1
 *
 * Select soundtrack:
 *   ?id=143897&track=Now%20We%20Are%20Free
 *
 * Skip audio check:
 *   ?id=143897&verify=0
 *
 * Existing OSTMusic Worker is not affected.
 */

'use strict';

const VERSION = '1.4.0';

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 15000,
    maxHTML: 2000000,
    maxTracks: 30,
    maxCandidates: 30,
    cacheSeconds: 300
};

/*
 * Confirmed film mapping.
 *
 * This is only a safe fallback.
 * Automatic search is attempted first.
 */
const KNOWN_MOVIES = [
    {
        id: '143897',
        title: 'Gladiator',
        aliases: [
            'Gladiator',
            'Гладіатор',
            'Гладиатор'
        ],
        year: 2000
    }
];

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers':
        'Content-Type, Content-Length, Content-Range',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
};

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: HEADERS
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

        const id = String(
            url.searchParams.get('id') || ''
        ).trim();

        const title = String(
            url.searchParams.get('title') || ''
        ).trim();

        const yearValue = String(
            url.searchParams.get('year') || ''
        ).trim();

        const year = yearValue
            ? Number(yearValue)
            : 0;

        const track = String(
            url.searchParams.get('track') || ''
        ).trim();

        const songId = String(
            url.searchParams.get('song_id') || ''
        ).trim();

        const debug =
            url.searchParams.get('debug') === '1';

        const verify =
            url.searchParams.get('verify') !== '0';

        if (!id && !title) {
            return json({
                success: true,
                service: 'Kinorium Original Soundtrack',
                version: VERSION,
                source: 'kinorium',
                endpoints: {
                    direct:
                        '/?id=143897',
                    automatic:
                        '/?title=Gladiator&year=2000',
                    searchDebug:
                        '/?title=Gladiator&year=2000&debug=1',
                    selectedTrack:
                        '/?id=143897&track=Elysium',
                    noVerification:
                        '/?id=143897&verify=0'
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
            yearValue &&
            (
                !/^\d{4}$/.test(yearValue) ||
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

        try {
            let resolved = null;

            if (id) {
                resolved = {
                    id,
                    title: title || '',
                    year,
                    method: 'direct_id',
                    candidates: [],
                    searchDebug: []
                };
            } else {
                resolved = await resolveMovie(
                    title,
                    year
                );
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
                    search: {
                        method: resolved.method,
                        candidates: resolved.candidates,
                        ...(debug ? {
                            diagnostics:
                                resolved.searchDebug
                        } : {})
                    }
                });
            }

            const result = await getSoundtrack({
                id: resolved.id,
                track,
                songId,
                verify,
                debug
            });

            result.search = {
                requestedTitle: title || null,
                requestedYear: year || null,
                resolvedId: resolved.id,
                method: resolved.method,
                candidates: debug
                    ? resolved.candidates
                    : [],
                ...(debug ? {
                    diagnostics:
                        resolved.searchDebug
                } : {})
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
                error: String(
                    error && error.message || error
                )
            }, 502);
        }
    }
};

function json(value, status = 200) {
    return new Response(
        JSON.stringify(value, null, 2),
        {
            status,
            headers: HEADERS
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
            redirect: 'follow',
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

function siteHeaders() {
    return {
        Accept:
            'text/html,application/xhtml+xml',
        'Accept-Language':
            'uk-UA,uk;q=0.9,en;q=0.7',
        'User-Agent':
            'Mozilla/5.0 (compatible; KinoriumOST/1.1)'
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
        response.headers.get(
            'content-type'
        ) || '';

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

    const match = tag.match(regex);

    return match
        ? decodeEntities(match[2])
        : '';
}

function isSameTitle(a, b) {
    return normalize(a) === normalize(b);
}

function findKnownMovie(title, year) {
    if (!year) return null;

    return KNOWN_MOVIES.find(movie => {
        if (movie.year !== year) {
            return false;
        }

        return movie.aliases.some(alias =>
            isSameTitle(alias, title)
        );
    }) || null;
}

function getSearchURLs(title) {
    /*
     * Experimental Kinorium search routes.
     *
     * Their response structure has not yet
     * been confirmed. Each is inspected,
     * not blindly trusted.
     */

    const encoded = encodeURIComponent(title);

    return [
        CONFIG.site +
            '/search/?q=' + encoded,

        CONFIG.site +
            '/search/?query=' + encoded,

        CONFIG.site +
            '/?q=' + encoded
    ];
}

function extractSearchCandidates(html) {
    const results = [];
    const seen = new Set();

    /*
     * Find links that point to a Kinorium
     * movie page: /123456/
     *
     * This only produces candidates.
     * It does not establish a match.
     */

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
            candidateURL = new URL(
                href,
                CONFIG.site
            );
        } catch (_) {
            continue;
        }

        if (
            candidateURL.hostname !==
            'ua.kinorium.com'
        ) {
            continue;
        }

        const idMatch =
            candidateURL.pathname.match(
                /^\/(\d{1,12})\/?$/
            );

        if (!idMatch) continue;

        const id = idMatch[1];

        if (seen.has(id)) continue;

        const label = stripTags(
            tag.replace(
                /^<a\b[^>]*>/i,
                ''
            ).replace(/<\/a>$/i, '')
        );

        const titleAttribute =
            extractAttribute(tag, 'title');

        const surrounding = stripTags(
            html.slice(
                Math.max(0, match.index - 200),
                Math.min(
                    html.length,
                    regex.lastIndex + 250
                )
            )
        );

        seen.add(id);

        results.push({
            id,
            label:
                label.slice(0, 180),
            titleAttribute:
                titleAttribute.slice(0, 180),
            context:
                surrounding.slice(0, 350)
        });
    }

    return results;
}

function candidateMatches(candidate, title, year) {
    /*
     * Conservative matching:
     * exact title and year must be visible
     * in the candidate's search context.
     *
     * Final movie page will be checked too.
     */

    if (!year) return false;

    const fields = [
        candidate.label,
        candidate.titleAttribute
    ];

    const titleMatched = fields.some(field => {
        const clean = normalize(field);

        const expected = normalize(title);

        return (
            clean === expected ||
            clean === expected + ' ' + year ||
            clean === expected + ' фільм ' + year
        );
    });

    if (!titleMatched) return false;

    return new RegExp(
        '\\b' + year + '\\b'
    ).test(candidate.context);
}

function extractMoviePageYear(html) {
    const patterns = [
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

    const title = extractTitle(html);

    const match = title.match(
        /\b(18|19|20)\d{2}\b/
    );

    return match
        ? Number(match[0])
        : 0;
}

function moviePageMatches(html, title, year) {
    if (!html || !year) return false;

    const pageTitle = extractTitle(html);
    const pageYear = extractMoviePageYear(html);

    if (pageYear !== year) {
        return false;
    }

    const normalizedTitle = normalize(title);
    const normalizedPage = normalize(pageTitle);

    /*
     * Allow a full title with a year
     * and a localized "film" suffix.
     */

    return (
        normalizedPage === normalizedTitle ||
        normalizedPage.startsWith(
            normalizedTitle + ' '
        ) ||
        normalizedPage.startsWith(
            normalizedTitle + ' фільм '
        )
    );
}

async function resolveMovie(title, year) {
    const diagnostics = [];
    const candidates = [];

    const searchURLs = getSearchURLs(title);

    for (const url of searchURLs) {
        try {
            const page = await fetchHTML(url);

            const found = extractSearchCandidates(
                page.html
            );

            diagnostics.push({
                url,
                finalURL: page.url,
                status: page.status,
                htmlLength: page.length,
                pageTitle:
                    extractTitle(page.html),
                candidatesFound:
                    found.length,
                possibleBlock:
                    page.length > 0 &&
                    page.length < 10000
            });

            for (const candidate of found) {
                if (
                    !candidates.some(
                        item =>
                            item.id === candidate.id
                    )
                ) {
                    candidates.push(candidate);
                }
            }

        } catch (error) {
            diagnostics.push({
                url,
                error: String(
                    error && error.message ||
                    error
                )
            });
        }
    }

    const matches = candidates.filter(
        candidate =>
            candidateMatches(
                candidate,
                title,
                year
            )
    );

    /*
     * Validate candidates by opening
     * their actual movie pages.
     */

    for (const candidate of matches.slice(0, 5)) {
        try {
            const page = await fetchHTML(
                CONFIG.site +
                '/' +
                candidate.id +
                '/'
            );

            if (
                page.ok &&
                moviePageMatches(
                    page.html,
                    title,
                    year
                )
            ) {
                return {
                    id: candidate.id,
                    method:
                        'search_verified',
                    candidates,
                    searchDebug: diagnostics
                };
            }
        } catch (_) {}
    }

    /*
     * Preserve the known working test
     * even if Kinorium search routes
     * are unavailable.
     */

    const known = findKnownMovie(
        title,
        year
    );

    if (known) {
        return {
            id: known.id,
            method:
                'known_movie_fallback',
            candidates,
            searchDebug: diagnostics
        };
    }

    return {
        id: null,
        method:
            'search_no_verified_match',
        candidates,
        searchDebug: diagnostics
    };
}

function validateAudioURL(value) {
    if (!value) return null;

    try {
        const url = new URL(value);

        if (url.protocol !== 'https:') {
            return null;
        }

        if (
            url.hostname !==
                'audio-ssl.itunes.apple.com' &&
            url.hostname !==
                'audio.itunes.apple.com'
        ) {
            return null;
        }

        return url.href;

    } catch (_) {
        return null;
    }
}

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

        const raw = extractAttribute(
            tag,
            'data-song'
        );

        if (!raw) continue;

        let data;

        try {
            data = JSON.parse(raw);
        } catch (_) {
            continue;
        }

        const name = String(
            data.song_name || ''
        ).trim();

        if (!name) continue;

        const id = String(
            data.song_id || ''
        );

        const key = id || normalize(name);

        if (seen.has(key)) continue;

        seen.add(key);

        tracks.push({
            id,
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
            audioUrl: validateAudioURL(
                data.preview_url
            ),
            associationVerified: Boolean(
                validateAudioURL(
                    data.preview_url
                )
            )
        });
    }

    return tracks;
}

function selectTrack(
    tracks,
    requestedTrack,
    requestedSongId
) {
    if (requestedSongId) {
        return tracks.find(
            item =>
                item.id === requestedSongId
        ) || null;
    }

    if (requestedTrack) {
        const exact = tracks.find(
            item =>
                normalize(item.name) ===
                normalize(requestedTrack)
        );

        if (exact) return exact;

        return tracks.find(
            item =>
                normalize(item.name).includes(
                    normalize(requestedTrack)
                )
        ) || null;
    }

    return tracks.find(
        item =>
            item.isMain &&
            item.audioUrl
    ) || tracks[0] || null;
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
            error && error.message ||
            error
        );
    }

    return result;
}

async function getSoundtrack(options) {
    const {
        id,
        track,
        songId,
        verify,
        debug
    } = options;

    const pageURL =
        CONFIG.site + '/' + id + '/';

    const page = await fetchHTML(
        pageURL
    );

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
            pageURL
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
        track,
        songId
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
        audioUrl: selected
            ? selected.audioUrl
            : null,
        audioAssociationVerified:
            Boolean(
                selected &&
                selected.associationVerified
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

    if (debug) {
        result.debug = {
            httpStatus: page.status,
            finalURL: page.url,
            contentType: page.contentType,
            htmlLength: page.length,
            featuredControlsFound:
                tracks.length,
            selectedTrackId:
                selected
                    ? selected.id
                    : null,
            selectedTrackName:
                selected
                    ? selected.name
                    : null,
            previewVerificationEnabled:
                verify,
            audioCheck
        };
    }

    return result;
}
