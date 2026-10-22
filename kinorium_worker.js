
/*
 * ORIGINAL SOUNDTRACK
 * KINORIUM WORKER 1.5.4
 *
 * Cloudflare Workers
 *
 * Automatic search:
 * ?title=Titanic&year=1997
 *
 * TV series:
 * ?title=Friends&year=1994
 *
 * Direct Kinorium ID:
 * ?id=108983
 *
 * Diagnostics:
 * ?title=Friends&year=1994&debug=1
 *
 * Track selection:
 * ?id=108983&track=Rose
 * ?id=108983&song_id=205745739
 *
 * Disable audio verification:
 * ?id=108983&verify=0
 *
 * 1.5.4 FIXES:
 * - No hardcoded TV-series IDs.
 * - Strict title matching using title-like
 *   page metadata instead of arbitrary HTML.
 * - Search more candidates before resolving.
 * - Exact-year matches are preferred.
 * - One-year tolerance is a secondary pass.
 * - Detect film / TV-series page type.
 * - Cache candidate pages during each request.
 * - Preserve direct ID and audio verification.
 */

'use strict';

const VERSION = '1.5.4';

const CONFIG = {
    site: 'https://ua.kinorium.com',
    timeout: 15000,
    maxHTML: 2000000,
    maxTracks: 30,
    maxCandidates: 50,
    maxVerifyCandidates: 20,
    maxTotalVerifyCandidates: 35,
    cacheSeconds: 300,
    yearTolerance: 1,
    maxSearchVariants: 5
};

/*
 * Legacy known-movie fallbacks.
 *
 * No TV-series IDs are hardcoded.
 * Regular automatic search is always attempted
 * before these movie fallbacks are used.
 */

const KNOWN_MOVIES = [
    {
        id: '143897',
        title: 'Gladiator',
        year: 2000,
        aliases: [
            'Gladiator',
            'Гладіатор',
            'Гладиатор'
        ]
    },
    {
        id: '108983',
        title: 'Titanic',
        year: 1997,
        aliases: [
            'Titanic',
            'Титанік',
            'Титаник'
        ]
    }
];

const JSON_HEADERS = {
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

        const debug =
            params.get('debug') === '1';

        const verify =
            params.get('verify') !== '0';

        if (!id && !title) {
            return json({
                success: true,
                service: 'Kinorium Original Soundtrack',
                version: VERSION,
                source: 'kinorium',
                endpoints: {
                    automatic:
                        '?title=Titanic&year=1997',
                    series:
                        '?title=Friends&year=1994',
                    direct:
                        '?id=108983',
                    debug:
                        '?title=Friends&year=1994&debug=1',
                    track:
                        '?id=108983&track=Rose',
                    verifyOff:
                        '?id=108983&verify=0'
                }
            });
        }

        if (
            id &&
            !/^\d{1,12}$/.test(id)
        ) {
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

        try {
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
                debug
            });

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
            headers: JSON_HEADERS
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
            'Mozilla/5.0 (compatible; KinoriumOST/1.4)'
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
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
        .replace(/&rsquo;/gi, '’')
        .replace(/&#(\d+);/g, (_, n) => {
            const number = Number(n);

            return number > 0 &&
                number <= 0x10ffff
                ? String.fromCodePoint(number)
                : '';
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
            const number = parseInt(n, 16);

            return number > 0 &&
                number <= 0x10ffff
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

function findKnownMovie(title, year) {
    if (!year) return null;

    const normalizedTitle = normalize(title);

    return KNOWN_MOVIES.find(entry =>
        entry.year === year &&
        entry.aliases.some(alias =>
            normalize(alias) === normalizedTitle
        )
    ) || null;
}

/*
 * TITLE VARIANTS
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
            clean.length < 3
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

    return variants.slice(
        0,
        CONFIG.maxSearchVariants
    );
}

/*
 * SEARCH RESULT PARSING
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

        const before = html.slice(
            Math.max(0, match.index - 800),
            match.index
        );

        const after = html.slice(
            regex.lastIndex,
            Math.min(
                html.length,
                regex.lastIndex + 300
            )
        );

        const context = stripTags(
            before + ' ' + tag + ' ' + after
        );

        const yearMatches = [
            ...context.matchAll(
                /\b(?:18|19|20)\d{2}\b/g
            )
        ];

        const years = [
            ...new Set(
                yearMatches.map(item =>
                    Number(item[0])
                )
            )
        ];

        const titleAttribute =
            extractAttribute(tag, 'title');

        const label = stripTags(
            tag.replace(
                /^<a\b[^>]*>/i,
                ''
            ).replace(/<\/a>$/i, '')
        );

        seen.add(id);

        results.push({
            id,
            label,
            titleAttribute,
            context: context.slice(-650),
            years
        });
    }

    return results;
}

function extractSearchResultTitle(context, year) {
    if (!context || !year) {
        return '';
    }

    const regex = new RegExp(
        '\\b' +
        String(year) +
        '\\s*,\\s*([^<\\n]{1,140})',
        'i'
    );

    const match = context.match(regex);

    if (!match) {
        return '';
    }

    let value = match[1]
        .replace(
            /\s+(?:В улюблених|Буду дивитися).*$/i,
            ''
        )
        .trim();

    value = value.split(/\s{2,}/)[0];

    return value.slice(0, 140);
}

function getCandidateTitleMatch(
    candidate,
    title,
    year
) {
    const requested = normalize(title);

    if (!requested || !year) {
        return {
            matched: false,
            title: '',
            year: 0,
            score: 0,
            yearDifference: 999
        };
    }

    /*
     * Only use years actually found near this
     * search result. Never invent years that
     * could belong to a neighboring result.
     */

    const candidateYears = [
        ...new Set(candidate.years || [])
    ].filter(item =>
        item >= 1880 &&
        item <= 2200 &&
        Math.abs(item - year) <=
            CONFIG.yearTolerance
    );

    let best = {
        matched: false,
        title: '',
        year: 0,
        score: 0,
        yearDifference: 999
    };

    for (const candidateYear of candidateYears) {
        const originalTitle =
            extractSearchResultTitle(
                candidate.context || '',
                candidateYear
            );

        const normalizedOriginal =
            normalize(originalTitle);

        const normalizedLabel =
            normalize(candidate.label || '');

        const normalizedTitleAttribute =
            normalize(candidate.titleAttribute || '');

        let score = 0;

        if (
            normalizedOriginal === requested
        ) {
            score = 120;
        } else if (
            normalizedLabel === requested ||
            normalizedTitleAttribute === requested
        ) {
            score = 110;
        } else if (
            normalizedOriginal.startsWith(
                requested + ' '
            )
        ) {
            score = 75;
        } else if (
            normalizedOriginal.includes(requested) &&
            requested.length >= 4
        ) {
            score = 45;
        }

        const yearDifference =
            Math.abs(candidateYear - year);

        if (yearDifference === 1 && score > 0) {
            score -= 15;
        }

        if (score > best.score) {
            best = {
                matched: score > 0,
                title: originalTitle,
                year: candidateYear,
                score,
                yearDifference
            };
        }
    }

    return best;
}

function scoreCandidate(candidate, title, year) {
    if (!year) return 0;

    const titleMatch = getCandidateTitleMatch(
        candidate,
        title,
        year
    );

    if (!titleMatch.matched) {
        return 0;
    }

    let score = titleMatch.score;

    if (titleMatch.yearDifference === 0) {
        score += 20;
    }

    return score;
}

/*
 * PAGE TITLE AND TYPE EXTRACTION
 *
 * Do not use an arbitrary occurrence of the
 * requested word anywhere in the HTML as proof
 * that the candidate is the requested work.
 */

function cleanPageName(value) {
    let result = stripTags(value);

    result = result
        .replace(/\s*[|–—-]\s*Kinorium.*$/i, '')
        .replace(/\s*[|–—-]\s*Кинориум.*$/i, '')
        .replace(/\s*\((?:фільм|фильм|серіал|сериал|film|series|tv series)[^)]*\)\s*$/i, '')
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

    /*
     * Read title-like metadata only.
     * Description text is deliberately excluded
     * because it often mentions unrelated titles.
     */

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

        const content = extractAttribute(
            tag,
            'content'
        );

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

    /*
     * Main visible heading is a useful source
     * when Kinorium uses a localized page title.
     */

    const h1Regex =
        /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;

    let h1Match;

    while ((h1Match = h1Regex.exec(head))) {
        add(h1Match[1]);
    }

    /*
     * Look for common original/alternate-title
     * properties in structured page data.
     */

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

    /*
     * Extract title values from tags explicitly
     * marked as original or alternate titles.
     */

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

function extractMoviePageYear(html) {
    const title = extractTitle(html);

    /*
     * On series pages the first year in the
     * page title is normally the starting year,
     * e.g. 1994–2004.
     */

    const titleMatch = title.match(
        /\b(?:18|19|20)\d{2}\b/
    );

    if (titleMatch) {
        return Number(titleMatch[0]);
    }

    const patterns = [
        /"datePublished"\s*:\s*"(\d{4})/i,
        /"releaseDate"\s*:\s*"(\d{4})/i,
        /"startDate"\s*:\s*"(\d{4})/i,
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

    const head = String(html || '').slice(
        0,
        250000
    );

    const combined = (
        title + ' ' +
        head
    ).toLowerCase();

    if (
        /\(\s*(?:серіал|сериал|tv series|television series|series)\b/i.test(title) ||
        /itemprop=["'](?:tvSeries|series)["']/i.test(head) ||
        /"@type"\s*:\s*"(?:TVSeries|TVEpisode)"/i.test(head) ||
        /"@type"\s*:\s*\[[^\]]*"TVSeries"/i.test(head) ||
        /\b(?:tv series|television series)\b/i.test(title)
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
        /\b(?:season|сезон|episode|епізод|серия)\b/i.test(
            combined.slice(0, 5000)
        )
    ) {
        return 'series';
    }

    return 'unknown';
}

function titleNameMatches(pageName, requestedTitle) {
    const page = normalize(
        cleanPageName(pageName)
    );

    const requested = normalize(
        requestedTitle
    );

    if (!page || !requested) {
        return false;
    }

    /*
     * Exact normalized title match only.
     * For example:
     * "Friends" matches "Friends".
     * "Natsu no niwa: The Friends" does not
     * match "Friends" merely because it contains
     * the word Friends.
     */

    return page === requested;
}

function moviePageMatches(
    html,
    title,
    year,
    tolerance = 0
) {
    if (!html || !year) {
        return false;
    }

    const pageYear = extractMoviePageYear(html);

    if (
        !pageYear ||
        Math.abs(pageYear - year) > tolerance
    ) {
        return false;
    }

    const pageNames = extractPageNames(html);

    return pageNames.some(name =>
        titleNameMatches(name, title)
    );
}

/*
 * SEARCH AND VERIFY
 *
 * Pass 1:
 *   Verify exact-year candidates.
 *
 * Pass 2:
 *   If no exact-year match is found, allow
 *   the configured year tolerance.
 *
 * Candidate pages are cached within the
 * current request. No series IDs are hardcoded.
 */

async function resolveMovie(title, year) {
    const diagnostics = [];
    const allCandidates = [];

    const searchVariants =
        buildSearchTitleVariants(title);

    if (!year) {
        return {
            id: null,
            method: 'year_required_for_search',
            candidates: [],
            diagnostics,
            searchVariants
        };
    }

    const candidateMap = new Map();

    /*
     * Search all title variants before selecting
     * a candidate. Keep the best search context
     * for each distinct Kinorium ID.
     */

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
                searchTitle,
                url: searchURL,
                error: String(
                    error && error.message ||
                    error
                )
            });

            continue;
        }

        if (!page.ok) {
            diagnostics.push({
                searchTitle,
                url: searchURL,
                status: page.status,
                htmlLength: page.length,
                candidatesFound: 0
            });

            continue;
        }

        const candidates =
            extractSearchCandidates(page.html);

        diagnostics.push({
            searchTitle,
            url: searchURL,
            status: page.status,
            htmlLength: page.length,
            pageTitle: extractTitle(page.html),
            candidatesFound: candidates.length
        });

        const ranked = candidates
            .map(candidate => {
                const titleMatch =
                    getCandidateTitleMatch(
                        candidate,
                        searchTitle,
                        year
                    );

                return {
                    ...candidate,
                    searchTitle,
                    score: scoreCandidate(
                        candidate,
                        searchTitle,
                        year
                    ),
                    titleMatch
                };
            })
            .filter(candidate =>
                candidate.score > 0
            )
            .sort((a, b) =>
                b.score - a.score
            );

        for (const candidate of ranked) {
            allCandidates.push({
                id: candidate.id,
                label: candidate.label,
                titleAttribute: candidate.titleAttribute,
                context: candidate.context,
                years: candidate.years,
                score: candidate.score,
                searchTitle: candidate.searchTitle,
                titleMatch: candidate.titleMatch
            });

            const existing =
                candidateMap.get(candidate.id);

            if (
                !existing ||
                candidate.score > existing.score
            ) {
                candidateMap.set(candidate.id, {
                    id: candidate.id,
                    score: candidate.score,
                    searchTitle: candidate.searchTitle,
                    titleMatch: candidate.titleMatch,
                    label: candidate.label,
                    context: candidate.context,
                    years: candidate.years
                });
            }
        }
    }

    /*
     * Verify more than the first few search
     * results. A series can appear lower in
     * the results than a similarly named film.
     */

    const candidatePairs = [
        ...candidateMap.values()
    ]
        .sort((a, b) =>
            b.score - a.score
        )
        .slice(0, CONFIG.maxTotalVerifyCandidates);

    const pageCache = new Map();

    async function getCandidatePage(candidateId) {
        if (!pageCache.has(candidateId)) {
            pageCache.set(
                candidateId,
                fetchHTML(
                    CONFIG.site +
                    '/' +
                    candidateId +
                    '/'
                )
            );
        }

        return pageCache.get(candidateId);
    }

    /*
     * Verify exact year first, then tolerance.
     */

    const tolerances = [0];

    if (CONFIG.yearTolerance > 0) {
        tolerances.push(CONFIG.yearTolerance);
    }

    for (const tolerance of tolerances) {
        for (const candidate of candidatePairs) {
            try {
                const moviePage =
                    await getCandidatePage(
                        candidate.id
                    );

                const pageTitle =
                    extractTitle(moviePage.html);

                const pageYear =
                    extractMoviePageYear(
                        moviePage.html
                    );

                const pageType =
                    extractPageType(
                        moviePage.html
                    );

                const yearDifference =
                    pageYear
                        ? Math.abs(pageYear - year)
                        : null;

                const yearMatches =
                    moviePage.ok &&
                    pageYear > 0 &&
                    yearDifference <= tolerance;

                /*
                 * Match the actual requested title
                 * against title-like metadata.
                 * Do not accept a random occurrence
                 * of the word in the whole HTML.
                 */

                let matchedTitle = '';

                if (yearMatches) {
                    const pageNames =
                        extractPageNames(
                            moviePage.html
                        );

                    matchedTitle =
                        pageNames.find(name =>
                            titleNameMatches(
                                name,
                                title
                            )
                        ) || '';
                }

                const titleMatches =
                    Boolean(matchedTitle);

                diagnostics.push({
                    searchTitle: candidate.searchTitle,
                    candidateId: candidate.id,
                    candidateScore: candidate.score,
                    candidateContextTitle:
                        candidate.titleMatch
                            ? candidate.titleMatch.title
                            : '',
                    candidateContextYear:
                        candidate.titleMatch
                            ? candidate.titleMatch.year
                            : 0,
                    candidateYear: pageYear,
                    requestedYear: year,
                    yearDifference,
                    yearToleranceUsed: tolerance,
                    moviePageStatus: moviePage.status,
                    moviePageTitle: pageTitle,
                    pageType,
                    pageNames: moviePage.ok
                        ? extractPageNames(
                            moviePage.html
                        ).slice(0, 12)
                        : [],
                    matchedTitle,
                    pageMatches:
                        Boolean(titleMatches)
                });

                if (
                    moviePage.ok &&
                    yearMatches &&
                    titleMatches
                ) {
                    const method =
                        tolerance === 0
                            ? 'search_verified_exact_title'
                            : 'search_verified_exact_title_year_tolerance';

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
                    searchTitle: candidate.searchTitle,
                    candidateId: candidate.id,
                    error: String(
                        error && error.message ||
                        error
                    )
                });
            }
        }
    }

    /*
     * Known movie fallback retained for backward
     * compatibility. No TV-series fallback IDs.
     */

    const knownMovie =
        findKnownMovie(title, year);

    if (knownMovie) {
        diagnostics.push({
            fallback: 'known_movie',
            id: knownMovie.id,
            title: knownMovie.title,
            year: knownMovie.year
        });

        return {
            id: knownMovie.id,
            method: 'known_movie_fallback',
            candidates: allCandidates,
            diagnostics,
            searchVariants
        };
    }

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

        const audioUrl =
            validateAudioURL(
                data.preview_url
            );

        tracks.push({
            id,
            name,
            artist: String(
                data.artist_name || ''
            ),
            duration: Number(
                data.duration || 0
            ),
            isMain:
                Number(data.isMain || 0) === 1,
            audioUrl
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
        const requested =
            normalize(requestedTrack);

        const exact = tracks.find(
            item =>
                normalize(item.name) === requested
        );

        if (exact) return exact;

        return tracks.find(
            item =>
                normalize(item.name).includes(
                    requested
                )
        ) || null;
    }

    return tracks.find(
        item =>
            item.isMain &&
            item.audioUrl
    ) || tracks[0] || null;
}

/*
 * AUDIO VERIFICATION
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

        result.httpStatus =
            response.status;

        result.contentType =
            response.headers.get(
                'content-type'
            ) || '';

        result.contentRange =
            response.headers.get(
                'content-range'
            ) || '';

        result.reachable =
            response.ok;

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

/*
 * SOUNDTRACK ENDPOINT
 */

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
                selected.audioUrl
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
            featuredControlsFound: tracks.length,
            selectedTrackId:
                selected ? selected.id : null,
            selectedTrackName:
                selected ? selected.name : null,
            previewVerificationEnabled: verify,
            audioCheck
        };
    }

    return result;
}
