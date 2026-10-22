
/*
 * KINORIUM ORIGINAL SOUNDTRACK
 * Cloudflare Worker 1.1.0
 *
 * Separate experimental Worker for Lampa.
 *
 * Source:
 * https://ua.kinorium.com/
 *
 * Features:
 * - Main movie page soundtrack inspection
 * - Featured soundtrack extraction
 * - Apple audio preview discovery
 * - Track/audio association diagnostics
 * - Safe audio availability checks
 * - No random audio fallback
 * - CORS support
 *
 * Example:
 * /?id=143897
 * /?id=143897&debug=1
 * /?id=143897&track=Now%20We%20Are%20Free
 *
 * IMPORTANT:
 * This Worker does not guarantee that Kinorium's
 * embedded audio URLs can be played externally.
 */

const VERSION = '1.1.0';

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 12000,
    maxHTML: 1500000,
    maxMedia: 100,
    maxChecks: 6,
    cacheSeconds: 300
};

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
                error: 'method_not_allowed'
            }, 405);
        }

        const url = new URL(request.url);

        const id = String(
            url.searchParams.get('id') || ''
        ).trim();

        const debug =
            url.searchParams.get('debug') === '1';

        const requestedTrack = String(
            url.searchParams.get('track') || ''
        ).trim();

        if (!id) {
            return json({
                success: true,
                service: 'Kinorium OST Test',
                version: VERSION,
                source: 'Kinorium',
                mode: 'featured_soundtrack',
                endpoints: {
                    gladiator: '/?id=143897',
                    gladiatorDebug: '/?id=143897&debug=1',
                    preferredTrack:
                        '/?id=143897&track=Now%20We%20Are%20Free'
                }
            });
        }

        if (!/^\d{1,12}$/.test(id)) {
            return json({
                success: false,
                version: VERSION,
                error: 'invalid_movie_id'
            }, 400);
        }

        try {
            return json(
                await inspectMovie(id, requestedTrack, debug)
            );
        } catch (error) {
            return json({
                success: false,
                version: VERSION,
                source: 'kinorium',
                id,
                error: String(
                    error && error.message || error
                )
            }, 502);
        }
    }
};

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: {
                ...HEADERS,
                'Content-Type':
                    'application/json; charset=utf-8'
            }
        }
    );
}

async function fetchWithTimeout(url, options = {}) {
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

function decodeHTML(value) {
    return String(value || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#(\d+);/g, (_, n) =>
            String.fromCodePoint(Number(n))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
            String.fromCodePoint(parseInt(n, 16))
        );
}

function stripTags(value) {
    return decodeHTML(
        String(value || '')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
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
        .replace(/&amp;/g, '&')
        .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function unique(items, key) {
    const seen = new Set();

    return items.filter(item => {
        const value = key(item);

        if (!value || seen.has(value)) {
            return false;
        }

        seen.add(value);
        return true;
    });
}

function extractTitle(html) {
    const match = html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    return match
        ? stripTags(match[1])
        : '';
}

function findSoundtrackRegion(html) {
    /*
     * Locate the first visible soundtrack section.
     * Keep a limited region to avoid collecting
     * unrelated media from the whole movie page.
     */

    const patterns = [
        /<h[1-6][^>]*>\s*Саундтрек\s*<\/h[1-6]>/i,
        /<h[1-6][^>]*>\s*Саундтрек[\s\S]{0,100}?<\/h[1-6]>/i,
        /<h[1-6][^>]*>\s*Soundtrack\s*<\/h[1-6]>/i,
        />\s*Саундтрек\s*</i,
        />\s*Soundtrack\s*</i
    ];

    let start = -1;

    for (const pattern of patterns) {
        const match = pattern.exec(html);

        if (match) {
            start = match.index;
            break;
        }
    }

    if (start < 0) {
        return {
            found: false,
            html: '',
            offset: -1
        };
    }

    const region = html.slice(
        Math.max(0, start - 1500),
        Math.min(html.length, start + 35000)
    );

    return {
        found: true,
        html: region,
        offset: start
    };
}

function extractMedia(html) {
    const results = [];

    const patterns = [
        /https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:aac|mp3|m4a|ogg|opus|wav)(?:\?[^"'<>\\\s]*)?/gi,
        /https?:\/\/[^"'<> \s]+?AudioPreview[^"'<> \s]*/gi
    ];

    for (const pattern of patterns) {
        let match;

        while (
            (match = pattern.exec(html)) &&
            results.length < CONFIG.maxMedia
        ) {
            let value = match[0]
                .replace(/\\\//g, '/')
                .replace(/\\u002F/gi, '/')
                .replace(/\\u0026/gi, '&')
                .replace(/&amp;/gi, '&')
                .replace(/[),;]+$/, '');

            try {
                const parsed = new URL(value);

                if (
                    parsed.protocol !== 'https:' &&
                    parsed.protocol !== 'http:'
                ) {
                    continue;
                }

                results.push({
                    url: parsed.href,
                    source: 'html',
                    host: parsed.hostname,
                    isApplePreview:
                        parsed.hostname.endsWith(
                            'itunes.apple.com'
                        )
                });
            } catch (_) {}
        }
    }

    return unique(results, item => item.url);
}

function extractAudioAttributes(html) {
    const results = [];

    const regex =
        /<(?:audio|source)\b[^>]*>/gi;

    let match;

    while ((match = regex.exec(html))) {
        const tag = match[0];

        const src = tag.match(
            /\bsrc\s*=\s*["']([^"']+)["']/i
        );

        if (!src) continue;

        const url = decodeHTML(src[1]);

        results.push({
            url,
            source: 'audio_element',
            host: '',
            isApplePreview:
                url.includes('itunes.apple.com')
        });
    }

    return results;
}

function extractFeaturedCandidates(region) {
    const results = [];

    if (!region) return results;

    /*
     * Kinorium may use buttons, links, or
     * data attributes for audio controls.
     *
     * We collect candidates but do not
     * automatically claim that they are
     * playable or correctly associated.
     */

    const patterns = [
        /<button\b[^>]*>[\s\S]*?<\/button>/gi,
        /<a\b[^>]*>[\s\S]*?<\/a>/gi,
        /<div\b[^>]*(?:track|sound|audio|music)[^>]*>[\s\S]{0,1200}?<\/div>/gi
    ];

    for (const pattern of patterns) {
        let match;

        while (
            (match = pattern.exec(region)) &&
            results.length < 100
        ) {
            const raw = match[0];
            const text = stripTags(raw);

            if (
                !text ||
                text.length > 120 ||
                text.length < 3
            ) {
                continue;
            }

            if (
                /^(саундтрек|soundtrack|слухати|play|listen)$/i
                    .test(text)
            ) {
                continue;
            }

            const hasAudioHint =
                /play|audio|sound|track|music|itunes|preview/i
                    .test(raw);

            if (!hasAudioHint) continue;

            const urls = extractMedia(raw);

            results.push({
                name: text,
                source: 'featured_html',
                audioUrl:
                    urls.length === 1
                        ? urls[0].url
                        : null,
                association:
                    urls.length === 1
                        ? 'same_element_candidate'
                        : 'unverified',
                rawSnippet: raw.slice(0, 800)
            });
        }
    }

    return unique(
        results,
        item => normalize(item.name)
    ).slice(0, 30);
}

function findKnownTracks(region) {
    /*
     * Diagnostic fallback for soundtrack
     * names visible on the movie page.
     *
     * This list is not used as a universal
     * hardcoded soundtrack database.
     */

    const names = [
        'Now We Are Free',
        'The Battle',
        'Elysium'
    ];

    const text = stripTags(region);

    return names
        .filter(name =>
            normalize(text).includes(normalize(name))
        )
        .map(name => ({
            name,
            source: 'visible_text',
            audioUrl: null,
            association: 'unverified'
        }));
}

function mergeTracks(primary, secondary) {
    const map = new Map();

    for (const track of [
        ...primary,
        ...secondary
    ]) {
        const key = normalize(track.name);

        if (!key) continue;

        const previous = map.get(key);

        if (!previous) {
            map.set(key, track);
        } else if (
            !previous.audioUrl &&
            track.audioUrl
        ) {
            map.set(key, track);
        }
    }

    return [...map.values()];
}

function selectTrack(tracks, requested) {
    if (!tracks.length) return null;

    if (requested) {
        const exact = tracks.find(
            item =>
                normalize(item.name) ===
                normalize(requested)
        );

        if (exact) {
            return {
                ...exact,
                selection: 'requested_exact'
            };
        }

        const partial = tracks.find(
            item =>
                normalize(item.name).includes(
                    normalize(requested)
                )
        );

        if (partial) {
            return {
                ...partial,
                selection: 'requested_partial'
            };
        }

        return null;
    }

    const preferred = [
        'Now We Are Free',
        'Main Theme',
        'Main Title',
        'Theme',
        'The Battle',
        'Elysium'
    ];

    for (const name of preferred) {
        const found = tracks.find(
            item =>
                normalize(item.name) ===
                normalize(name)
        );

        if (found) {
            return {
                ...found,
                selection: 'preferred_theme'
            };
        }
    }

    return {
        ...tracks[0],
        selection: 'first_featured'
    };
}

async function checkMedia(url) {
    const result = {
        url,
        reachable: false,
        playableCandidate: false,
        httpStatus: null,
        contentType: '',
        reason: ''
    };

    try {
        const response = await fetchWithTimeout(
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

        result.reachable = response.ok;

        const audioType =
            /audio\/|application\/octet-stream/i
                .test(result.contentType);

        result.playableCandidate =
            response.ok && audioType;

        result.reason = !response.ok
            ? 'http_error'
            : audioType
                ? 'audio_response'
                : 'unexpected_content_type';

        if (response.body) {
            await response.body.cancel().catch(() => {});
        }
    } catch (error) {
        result.reason = String(
            error && error.message || error
        );
    }

    return result;
}

async function inspectMovie(
    id,
    requestedTrack,
    debug
) {
    const pageURL =
        `${CONFIG.site}/${id}/`;

    const response = await fetchWithTimeout(
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
                cacheTtl: CONFIG.cacheSeconds,
                cacheEverything: true
            }
        }
    );

    if (!response.ok) {
        return {
            success: false,
            version: VERSION,
            source: 'kinorium',
            id,
            found: false,
            playable: false,
            reason: 'kinorium_http_error',
            httpStatus: response.status,
            pageURL
        };
    }

    const contentType =
        response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) {
        return {
            success: false,
            version: VERSION,
            id,
            playable: false,
            reason: 'unexpected_page_type',
            contentType
        };
    }

    const html = (
        await response.text()
    ).slice(0, CONFIG.maxHTML);

    const title = extractTitle(html);

    const region = findSoundtrackRegion(html);

    const featured = extractFeaturedCandidates(
        region.html
    );

    const known = findKnownTracks(
        region.html
    );

    const tracks = mergeTracks(
        featured,
        known
    );

    const regionMedia = extractMedia(
        region.html
    );

    const allMedia = unique(
        [
            ...regionMedia,
            ...extractAudioAttributes(
                region.html
            )
        ],
        item => item.url
    );

    const selected = selectTrack(
        tracks,
        requestedTrack
    );

    const candidateURLs = [];

    if (
        selected &&
        selected.audioUrl
    ) {
        candidateURLs.push(
            selected.audioUrl
        );
    }

    /*
     * Other media URLs are checked for
     * diagnostics only. They are never
     * automatically assigned to a track.
     */

    const diagnosticURLs = unique(
        [
            ...candidateURLs,
            ...allMedia.map(item => item.url)
        ],
        item => item
    ).slice(0, CONFIG.maxChecks);

    const checks = [];

    for (const url of diagnosticURLs) {
        checks.push(
            await checkMedia(url)
        );
    }

    let audioUrl = null;
    let associationVerified = false;

    if (
        selected &&
        selected.audioUrl &&
        selected.association ===
            'same_element_candidate'
    ) {
        const check = checks.find(
            item =>
                item.url === selected.audioUrl
        );

        /*
         * Even a successful media response
         * does not prove track identity.
         * Therefore this remains a candidate
         * until structural association is
         * confirmed.
         */

        if (
            check &&
            check.playableCandidate
        ) {
            audioUrl = selected.audioUrl;
        }
    }

    const playable =
        Boolean(audioUrl) &&
        associationVerified;

    let reason = '';

    if (!region.found) {
        reason = 'soundtrack_section_not_found';
    } else if (!tracks.length) {
        reason = 'featured_tracks_not_found';
    } else if (!selected) {
        reason = 'requested_track_not_found';
    } else if (!selected.audioUrl) {
        reason = 'track_audio_not_associated';
    } else if (!audioUrl) {
        reason = 'audio_unavailable';
    } else {
        reason = 'association_not_verified';
    }

    const result = {
        success: true,
        version: VERSION,
        source: 'kinorium',
        mode: 'featured_soundtrack',
        found: region.found,
        playable,
        id,
        title,
        track: selected
            ? {
                name: selected.name,
                source: selected.source,
                selection: selected.selection,
                association:
                    selected.association
            }
            : null,
        audioUrl: playable
            ? audioUrl
            : null,
        audioAssociationVerified:
            associationVerified,
        tracksCount: tracks.length,
        mediaCount: allMedia.length,
        reason,
        pageURL
    };

    if (debug) {
        result.debug = {
            httpStatus: response.status,
            contentType,
            htmlLength: html.length,
            soundtrackRegionFound:
                region.found,
            soundtrackRegionLength:
                region.html.length,
            featuredTracks: tracks,
            media: allMedia.slice(0, 30),
            mediaChecks: checks,
            selectedAudioCandidate:
                audioUrl,
            note:
                'Playable remains false until ' +
                'the audio-to-track association ' +
                'is structurally verified.'
        };
    }

    return result;
}
