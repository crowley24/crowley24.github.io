
/*
 * KINORIUM ORIGINAL SOUNDTRACK
 * Cloudflare Worker 1.2.0
 *
 * DIAGNOSTIC EDITION
 *
 * Source:
 * https://ua.kinorium.com/
 *
 * Purpose:
 * Inspect the real HTML structure of soundtrack
 * buttons on the MAIN movie page.
 *
 * Test movie:
 * Gladiator (2000), Kinorium ID 143897
 *
 * Endpoints:
 *
 * /
 * /?id=143897
 * /?id=143897&debug=1
 * /?id=143897&track=Now%20We%20Are%20Free
 *
 * This version does not claim audio is playable
 * without verifying its track association.
 */

const VERSION = '1.2.0';

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 15000,
    maxHTML: 2000000,
    maxOccurrences: 12,
    maxSnippets: 18,
    snippetBefore: 650,
    snippetAfter: 1400,
    maxMedia: 100
};

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS
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

        const track = String(
            url.searchParams.get('track') || ''
        ).trim();

        if (!id) {
            return json({
                success: true,
                service: 'Kinorium OST Test',
                version: VERSION,
                source: 'Kinorium',
                mode: 'main_page_diagnostic',
                endpoints: {
                    gladiator: '/?id=143897',
                    gladiatorDebug:
                        '/?id=143897&debug=1',
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
            const result = await inspect(
                id,
                track,
                debug
            );

            return json(result);
        } catch (error) {
            return json({
                success: false,
                version: VERSION,
                source: 'kinorium',
                id,
                playable: false,
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
                ...CORS,
                'Content-Type':
                    'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        }
    );
}

async function fetchPage(url) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.timeout
    );

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'Accept':
                    'text/html,application/xhtml+xml',
                'Accept-Language':
                    'uk-UA,uk;q=0.9,en;q=0.7',
                'User-Agent':
                    'Mozilla/5.0 (X11; Linux x86_64) ' +
                    'AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) ' +
                    'Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const contentType =
            response.headers.get('content-type') || '';

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                contentType,
                finalURL: response.url,
                html: ''
            };
        }

        if (!/text\/html/i.test(contentType)) {
            return {
                success: false,
                status: response.status,
                contentType,
                finalURL: response.url,
                html: ''
            };
        }

        const html = (
            await response.text()
        ).slice(0, CONFIG.maxHTML);

        return {
            success: true,
            status: response.status,
            contentType,
            finalURL: response.url,
            html
        };
    } finally {
        clearTimeout(timer);
    }
}

function decodeEntities(text) {
    return String(text || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
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

function stripTags(text) {
    return decodeEntities(
        String(text || '')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
    )
        .replace(/\s+/g, ' ')
        .trim();
}

function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function unique(items, getKey) {
    const seen = new Set();

    return items.filter(item => {
        const key = getKey(item);

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

function getTitle(html) {
    const match = html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    return match
        ? stripTags(match[1])
        : '';
}

function findOccurrences(
    html,
    phrase,
    limit = CONFIG.maxOccurrences
) {
    const results = [];

    if (!phrase) return results;

    const lowerHTML = html.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();

    let position = 0;

    while (results.length < limit) {
        const index = lowerHTML.indexOf(
            lowerPhrase,
            position
        );

        if (index < 0) break;

        const start = Math.max(
            0,
            index - CONFIG.snippetBefore
        );

        const end = Math.min(
            html.length,
            index +
            phrase.length +
            CONFIG.snippetAfter
        );

        const snippet = html.slice(start, end);

        results.push({
            index,
            context: classifyContext(
                html,
                index
            ),
            snippet,
            nearbyAudioURLs:
                extractMedia(snippet)
                    .map(item => item.url)
                    .slice(0, 5)
        });

        position = index + phrase.length;
    }

    return results;
}

function classifyContext(html, index) {
    /*
     * Identify whether a match is inside
     * a script, style, or ordinary markup.
     */

    const prefix = html.slice(0, index);

    const lastScriptOpen =
        prefix.lastIndexOf('<script');

    const lastScriptClose =
        prefix.lastIndexOf('</script');

    if (
        lastScriptOpen >= 0 &&
        lastScriptOpen > lastScriptClose
    ) {
        return 'script';
    }

    const lastStyleOpen =
        prefix.lastIndexOf('<style');

    const lastStyleClose =
        prefix.lastIndexOf('</style');

    if (
        lastStyleOpen >= 0 &&
        lastStyleOpen > lastStyleClose
    ) {
        return 'style';
    }

    return 'html';
}

function extractMedia(html) {
    const results = [];

    /*
     * Normalize escaped slashes and HTML
     * entities before searching for URLs.
     */

    const normalized = decodeEntities(
        String(html || '')
            .replace(/\\\//g, '/')
            .replace(/\\u002f/gi, '/')
            .replace(/\\u0026/gi, '&')
            .replace(/\\x2f/gi, '/')
            .replace(/\\x26/gi, '&')
    );

    const regex =
        /https?:\/\/[^\s"'<>\\]+/gi;

    let match;

    while (
        (match = regex.exec(normalized)) &&
        results.length < CONFIG.maxMedia
    ) {
        const raw = match[0]
            .replace(/[),;]+$/, '');

        let parsed;

        try {
            parsed = new URL(raw);
        } catch (_) {
            continue;
        }

        const url = parsed.href;

        const isAudio =
            /\.(aac|mp3|m4a|ogg|opus|wav)(?:[?#]|$)/i
                .test(url) ||
            /AudioPreview/i.test(url) ||
            /previewUrl=/i.test(url);

        if (!isAudio) continue;

        results.push({
            url,
            host: parsed.hostname,
            type: /itunes\.apple\.com/i
                .test(parsed.hostname)
                ? 'apple_preview'
                : 'audio_candidate'
        });
    }

    return unique(
        results,
        item => item.url
    );
}

function extractSoundtrackAnchors(html) {
    /*
     * Inspect occurrences of the word
     * Soundtrack / Саундтрек.
     *
     * Unlike version 1.1, this does not
     * assume that the first occurrence
     * is the soundtrack section.
     */

    const patterns = [
        'Саундтрек',
        'Soundtrack',
        'soundtrack',
        'musicTracks',
        'audioPreview',
        'previewUrl',
        'itunes'
    ];

    const results = {};

    for (const phrase of patterns) {
        const occurrences = findOccurrences(
            html,
            phrase,
            8
        );

        results[phrase] = {
            countSampled: occurrences.length,
            occurrences: occurrences.map(item => ({
                index: item.index,
                context: item.context,
                snippet: item.snippet.slice(0, 1200)
            }))
        };
    }

    return results;
}

function inspectButtons(html) {
    const result = {
        buttonCount: 0,
        audioElementCount: 0,
        sourceElementCount: 0,
        iframeCount: 0,
        scriptsCount: 0,
        soundtrackClassCandidates: [],
        dataAttributeCandidates: []
    };

    result.buttonCount =
        (html.match(/<button\b/gi) || []).length;

    result.audioElementCount =
        (html.match(/<audio\b/gi) || []).length;

    result.sourceElementCount =
        (html.match(/<source\b/gi) || []).length;

    result.iframeCount =
        (html.match(/<iframe\b/gi) || []).length;

    result.scriptsCount =
        (html.match(/<script\b/gi) || []).length;

    const tagRegex =
        /<[a-z][^>]{0,1200}>/gi;

    let match;

    while ((match = tagRegex.exec(html))) {
        const tag = match[0];

        if (
            /class\s*=\s*["'][^"']*(?:soundtrack|track|audio|music)[^"']*["']/i
                .test(tag)
        ) {
            if (
                result.soundtrackClassCandidates.length < 30
            ) {
                result.soundtrackClassCandidates.push({
                    index: match.index,
                    tag: tag.slice(0, 900)
                });
            }
        }

        if (
            /data-[\w-]*(?:audio|track|music|sound|preview)/i
                .test(tag)
        ) {
            if (
                result.dataAttributeCandidates.length < 30
            ) {
                result.dataAttributeCandidates.push({
                    index: match.index,
                    tag: tag.slice(0, 900)
                });
            }
        }
    }

    return result;
}

function extractScriptSources(html) {
    const results = [];

    const regex =
        /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

    let match;

    while (
        (match = regex.exec(html)) &&
        results.length < 80
    ) {
        results.push(
            decodeEntities(match[1])
        );
    }

    return unique(results, item => item);
}

function extractPotentialEndpoints(html) {
    const results = [];

    const patterns = [
        /["']([^"']{1,250}(?:soundtrack|audio|music|preview|itunes)[^"']{0,250})["']/gi,
        /(?:fetch|ajax|axios)\s*\([^)]{0,350}/gi
    ];

    for (const regex of patterns) {
        let match;

        while (
            (match = regex.exec(html)) &&
            results.length < 35
        ) {
            const value = match[1] || match[0];

            if (
                value.length > 500 ||
                value.length < 5
            ) {
                continue;
            }

            results.push({
                index: match.index,
                value
            });
        }
    }

    return unique(
        results,
        item => item.value
    );
}

function buildTrackDiagnostics(
    html,
    requestedTrack
) {
    const defaultTracks = [
        'The Battle',
        'Elysium',
        'Now We Are Free'
    ];

    const names = requestedTrack
        ? unique(
            [requestedTrack, ...defaultTracks],
            item => normalize(item)
        )
        : defaultTracks;

    return names.map(name => {
        const occurrences = findOccurrences(
            html,
            name
        );

        return {
            name,
            foundInHTML:
                occurrences.length > 0,
            occurrencesCount:
                occurrences.length,
            occurrences
        };
    });
}

async function inspect(id, requestedTrack, debug) {
    const pageURL =
        `${CONFIG.site}/${id}/`;

    const page = await fetchPage(pageURL);

    if (!page.success) {
        return {
            success: false,
            version: VERSION,
            source: 'kinorium',
            mode: 'main_page_diagnostic',
            id,
            playable: false,
            reason: 'page_fetch_failed',
            pageURL,
            httpStatus: page.status,
            contentType: page.contentType
        };
    }

    const html = page.html;

    const title = getTitle(html);

    const tracks = buildTrackDiagnostics(
        html,
        requestedTrack
    );

    const media = extractMedia(html);

    const foundTracks = tracks.filter(
        item => item.foundInHTML
    );

    const result = {
        success: true,
        version: VERSION,
        source: 'kinorium',
        mode: 'main_page_diagnostic',
        id,
        title,
        found: foundTracks.length > 0,
        playable: false,
        audioUrl: null,
        audioAssociationVerified: false,
        tracksCount: foundTracks.length,
        mediaCount: media.length,
        requestedTrack:
            requestedTrack || null,
        reason:
            foundTracks.length
                ? 'track_markup_requires_analysis'
                : 'track_names_not_found_in_html',
        pageURL
    };

    if (debug) {
        result.debug = {
            httpStatus: page.status,
            finalURL: page.finalURL,
            contentType: page.contentType,
            htmlLength: html.length,

            tracks,

            media: media.slice(0, 60),

            elements: inspectButtons(html),

            soundtrackAnchors:
                extractSoundtrackAnchors(html),

            potentialEndpoints:
                extractPotentialEndpoints(html),

            scriptSources:
                extractScriptSources(html),

            explanation:
                'Inspect track occurrences and ' +
                'soundtrack-related HTML attributes. ' +
                'No audio URL is assigned until ' +
                'track association is confirmed.'
        };
    }

    return result;
}
