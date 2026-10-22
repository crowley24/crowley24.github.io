
/*
 * KINORIUM OST
 * Cloudflare Worker 1.0.0
 *
 * Independent test service for Lampa.
 *
 * Source: Kinorium only.
 * No YouTube.
 * No OSTMusic.
 * No external soundtrack catalog.
 *
 * Test movie:
 * Gladiator (2000)
 * https://ua.kinorium.com/143897/soundtrack/
 *
 * Endpoints:
 * /
 * /?id=143897
 * /?id=143897&debug=1
 * /?id=143897&track=Now%20We%20Are%20Free
 *
 * IMPORTANT:
 * This worker does not bypass DRM, authentication,
 * access restrictions or protected streaming.
 */

const VERSION = '1.0.0';

const ORIGIN = 'https://ua.kinorium.com';

const TIMEOUT = 15000;

const CACHE_TTL = 300;

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
};

function json(data, status = 200) {
    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: HEADERS
        }
    );
}

function clean(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(value) {
    return clean(value)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function decodeHTML(value) {
    return String(value || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#(\d+);/g, (_, n) => {
            const code = Number(n);

            return code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : '';
        });
}

function stripTags(value) {
    return clean(
        decodeHTML(
            String(value || '')
                .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]*>/g, ' ')
        )
    );
}

function validId(value) {
    const id = String(value || '').trim();

    return /^\d{1,12}$/.test(id) ? id : '';
}

function pageURL(id) {
    return ORIGIN + '/' + id + '/soundtrack/';
}

function safeURL(value, base) {
    try {
        const url = new URL(
            decodeHTML(String(value || '').replace(/\\\//g, '/')),
            base
        );

        if (url.protocol !== 'https:') {
            return '';
        }

        return url.href;
    } catch (_) {
        return '';
    }
}

function isMediaURL(url) {
    try {
        const parsed = new URL(url);

        return /\.(mp3|m4a|aac|ogg|opus|wav|flac|mp4|m3u8)(?:$|[?#])/i
            .test(parsed.pathname + parsed.search);
    } catch (_) {
        return false;
    }
}

function unique(items, keyFn = x => x) {
    const seen = new Set();

    return items.filter(item => {
        const key = keyFn(item);

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);

        return true;
    });
}

async function fetchPage(id) {
    const url = pageURL(id);

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        TIMEOUT
    );

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'uk,en;q=0.8',
                'User-Agent':
                    'Mozilla/5.0 (compatible; KinoriumOSTTest/1.0)'
            },
            cf: {
                cacheTtl: CACHE_TTL,
                cacheEverything: true
            }
        });

        const contentType =
            response.headers.get('content-type') || '';

        const html = await response.text();

        return {
            ok: response.ok,
            status: response.status,
            finalURL: response.url,
            contentType,
            html
        };
    } finally {
        clearTimeout(timer);
    }
}

function extractPageTitle(html) {
    const match = html.match(
        /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );

    return match ? stripTags(match[1]) : '';
}

function extractHeadings(html) {
    const results = [];

    const regex =
        /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {
        const value = stripTags(match[2]);

        if (
            value.length >= 3 &&
            value.length <= 200
        ) {
            results.push(value);
        }

        if (results.length >= 100) {
            break;
        }
    }

    return unique(results);
}

function extractStructuredTracks(html) {
    const results = [];

    /*
     * JSON-LD MusicRecording data.
     */
    const blocks =
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

    let match;

    function visit(value, depth = 0) {
        if (!value || depth > 12) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(item => visit(item, depth + 1));
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        const type = value['@type'];

        const types = Array.isArray(type)
            ? type
            : [type];

        if (
            types.some(t =>
                t === 'MusicRecording' ||
                t === 'MusicComposition'
            )
        ) {
            const name = clean(value.name);

            if (name) {
                let artist = '';

                const by = value.byArtist;

                if (typeof by === 'string') {
                    artist = by;
                } else if (by && typeof by === 'object') {
                    artist = by.name || '';
                }

                results.push({
                    name,
                    artist: clean(artist),
                    duration: clean(value.duration),
                    source: 'json_ld'
                });
            }
        }

        Object.values(value).forEach(
            item => visit(item, depth + 1)
        );
    }

    while ((match = blocks.exec(html)) !== null) {
        try {
            visit(JSON.parse(match[1]));
        } catch (_) {}
    }

    return unique(
        results,
        track => normalize(track.name + ' ' + track.artist)
    );
}

function extractHTMLTracks(html) {
    const tracks = [];

    /*
     * Heuristic HTML extraction.
     *
     * It deliberately does not claim that every
     * matching element is a real audio track.
     */

    const regex =
        /<(?:tr|li|div)\b([^>]{0,500})>([\s\S]{0,3000}?)<\/(?:tr|li|div)>/gi;

    let match;
    let scanned = 0;

    while (
        (match = regex.exec(html)) !== null &&
        scanned < 2500
    ) {
        scanned++;

        const attrs = match[1];
        const body = match[2];

        const marker =
            /track|song|soundtrack|audio|music/i.test(attrs);

        const duration =
            stripTags(body).match(/\b\d{1,2}:\d{2}\b/);

        if (!marker && !duration) {
            continue;
        }

        const text = stripTags(body);

        if (
            text.length < 3 ||
            text.length > 220
        ) {
            continue;
        }

        let name = text;

        if (duration) {
            name = clean(
                text.replace(duration[0], '')
            );
        }

        if (
            !name ||
            name.length > 180 ||
            /^(play|pause|відтворити|слушать)$/i.test(name)
        ) {
            continue;
        }

        tracks.push({
            name,
            artist: '',
            duration: duration ? duration[0] : '',
            source: 'html_candidate'
        });

        if (tracks.length >= 100) {
            break;
        }
    }

    return unique(
        tracks,
        track => normalize(track.name)
    );
}

function extractMedia(html, baseURL) {
    const candidates = [];

    function add(value, source) {
        const url = safeURL(value, baseURL);

        if (!url) {
            return;
        }

        if (!isMediaURL(url)) {
            return;
        }

        candidates.push({
            url,
            source,
            type: /\.m3u8(?:$|[?#])/i.test(url)
                ? 'hls'
                : /\.(mp3|m4a|aac|ogg|opus|wav|flac)(?:$|[?#])/i.test(url)
                    ? 'audio'
                    : 'video',
            verified: false
        });
    }

    const tags =
        /<(?:audio|video|source|a)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;

    let match;

    while ((match = tags.exec(html)) !== null) {
        add(match[1], 'html_attribute');
    }

    const decoded = html
        .replace(/\\\//g, '/')
        .replace(/\\u0026/gi, '&');

    const urls =
        /https?:\/\/[^\s"'<>\\]{1,1000}?\.(?:mp3|m4a|aac|ogg|opus|wav|flac|mp4|m3u8)(?:\?[^\s"'<>\\]*)?/gi;

    while ((match = urls.exec(decoded)) !== null) {
        add(match[0], 'html_text');
    }

    return unique(
        candidates,
        item => item.url
    ).slice(0, 50);
}

function scoreTrack(track, preferred = '') {
    const name = normalize(track.name);
    const wanted = normalize(preferred);

    let score = 0;

    if (wanted) {
        if (name === wanted) {
            score += 200;
        } else if (
            wanted.length >= 5 &&
            name.includes(wanted)
        ) {
            score += 120;
        }
    }

    if (/\bmain theme\b/.test(name)) {
        score += 100;
    }

    if (/\bmain title\b/.test(name)) {
        score += 95;
    }

    if (/\btheme\b/.test(name)) {
        score += 70;
    }

    if (/\bopening\b/.test(name)) {
        score += 50;
    }

    if (/\btrailer\b|\bremix\b|\bkaraoke\b/.test(name)) {
        score -= 50;
    }

    return score;
}

function selectTrack(tracks, preferred = '') {
    if (!tracks.length) {
        return null;
    }

    const ranked = tracks
        .map((track, index) => ({
            track,
            index,
            score: scoreTrack(track, preferred)
        }))
        .sort((a, b) => b.score - a.score);

    if (
        ranked[0].score >= 85 &&
        (
            ranked.length === 1 ||
            ranked[0].score > ranked[1].score
        )
    ) {
        return {
            ...ranked[0].track,
            selection: 'theme_candidate',
            confidence: 'heuristic'
        };
    }

    return {
        ...tracks[0],
        selection: 'first_track_candidate',
        confidence: 'fallback'
    };
}

async function inspectMedia(item) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        8000
    );

    try {
        const response = await fetch(item.url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal
        });

        const type =
            response.headers.get('content-type') || '';

        const isAudio =
            /^audio\//i.test(type);

        const isHLS =
            /mpegurl/i.test(type);

        return {
            ...item,
            httpStatus: response.status,
            contentType: type,
            reachable: response.ok,
            verified:
                response.ok && (isAudio || isHLS),
            reason:
                response.ok
                    ? (isAudio || isHLS
                        ? 'media_content_type'
                        : 'unconfirmed_content_type')
                    : 'http_error'
        };
    } catch (error) {
        return {
            ...item,
            reachable: false,
            verified: false,
            reason: String(
                error.message || error
            )
        };
    } finally {
        clearTimeout(timer);
    }
}

function soundtrackResult(id, page) {
    const structured =
        extractStructuredTracks(page.html);

    const heuristic =
        extractHTMLTracks(page.html);

    const tracks = unique(
        [...structured, ...heuristic],
        track => normalize(track.name)
    );

    const media =
        extractMedia(page.html, page.finalURL || pageURL(id));

    return {
        id,
        pageURL: pageURL(id),
        finalURL: page.finalURL,
        httpStatus: page.status,
        contentType: page.contentType,
        htmlLength: page.html.length,
        pageTitle: extractPageTitle(page.html),
        headings: extractHeadings(page.html),
        tracks,
        tracksCount: tracks.length,
        media,
        mediaCount: media.length,
        selectedTrack: null,
        audioUrl: null,
        playable: false
    };
}

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

        const id = validId(
            url.searchParams.get('id')
        );

        const debug =
            url.searchParams.get('debug') === '1';

        const preferred =
            clean(url.searchParams.get('track'));

        if (!id) {
            return json({
                success: true,
                service: 'Kinorium OST Test',
                version: VERSION,
                source: 'Kinorium',
                mode: 'diagnostic',
                endpoints: {
                    gladiator:
                        '/?id=143897',
                    gladiatorDebug:
                        '/?id=143897&debug=1',
                    preferredTrack:
                        '/?id=143897&track=Now%20We%20Are%20Free'
                },
                note:
                    'Provide a Kinorium movie ID to inspect its soundtrack page.'
            });
        }

        try {
            const page = await fetchPage(id);

            if (!page.ok) {
                return json({
                    success: true,
                    version: VERSION,
                    found: false,
                    playable: false,
                    source: 'kinorium',
                    id,
                    reason: 'kinorium_http_error',
                    httpStatus: page.status,
                    pageURL: pageURL(id),
                    htmlLength: page.html.length
                });
            }

            if (
                !/html/i.test(page.contentType)
            ) {
                return json({
                    success: true,
                    version: VERSION,
                    found: false,
                    playable: false,
                    source: 'kinorium',
                    id,
                    reason: 'unexpected_content_type',
                    contentType: page.contentType
                });
            }

            const result = soundtrackResult(
                id,
                page
            );

            result.selectedTrack = selectTrack(
                result.tracks,
                preferred
            );

            /*
             * Media URLs are inspected separately.
             * They are NOT automatically assumed to
             * belong to the selected track.
             */

            const checked = [];

            for (
                const item of result.media.slice(0, 5)
            ) {
                checked.push(
                    await inspectMedia(item)
                );
            }

            const verifiedMedia = checked.filter(
                item => item.verified
            );

            /*
             * A playable URL is only returned when
             * the page exposes exactly one verified
             * audio/HLS candidate. Association with
             * a specific soundtrack track remains
             * unverified.
             */

            if (verifiedMedia.length === 1) {
                result.audioUrl =
                    verifiedMedia[0].url;

                result.playable = true;
            }

            const output = {
                success: true,
                version: VERSION,
                source: 'kinorium',
                found: result.tracksCount > 0,
                playable: result.playable,
                id,
                title: result.pageTitle,
                album: {
                    id,
                    title: result.pageTitle,
                    tracksCount: result.tracksCount
                },
                track: result.selectedTrack,
                audioUrl: result.audioUrl,
                audioAssociationVerified: false,
                selection:
                    result.selectedTrack?.selection || null,
                tracksCount: result.tracksCount,
                mediaCount: result.mediaCount,
                reason:
                    result.playable
                        ? 'media_candidate_found'
                        : result.mediaCount
                            ? 'no_unique_verified_media'
                            : result.tracksCount
                                ? 'tracks_without_direct_audio'
                                : 'no_tracks_detected',
                pageURL: result.pageURL
            };

            if (debug) {
                output.debug = {
                    httpStatus: result.httpStatus,
                    finalURL: result.finalURL,
                    contentType: result.contentType,
                    htmlLength: result.htmlLength,
                    headings: result.headings,
                    tracks: result.tracks,
                    media: result.media,
                    mediaChecks: checked
                };
            }

            return json(output);
        } catch (error) {
            return json({
                success: false,
                version: VERSION,
                source: 'kinorium',
                id,
                playable: false,
                error: 'kinorium_request_failed',
                message: String(
                    error.message || error
                )
            }, 502);
        }
    }
};
