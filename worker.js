// Automatic deployment test
/*
 * ORIGINAL SOUNDTRACK
 * Cloudflare Worker 2.8.4
 *
 * Sources:
 * - OSTMusic.org
 * - YouTube entries from JSON catalog
 *
 * Catalog:
 * https://crowley24.github.io/OST/ost_catalog.json
 *
 * Compatible with:
 * - Lampa Original Soundtrack 2.5.1
 * - Android TV / Mobile
 *
 * NEW IN 2.8.4:
 * - Better punctuation handling
 * - Abbreviation variants: M.D. / MD
 * - Automatic short-title search
 * - Safer alternative-title matching
 * - Theme Song recognition
 * - Artist-prefixed track recognition
 * - Improved diagnostic track ranking
 *
 * No automatic catalog modifications.
 */

const VERSION = '2.8.4';

const BASE = 'https://www.ostmusic.org';

const CATALOG_URL =
 'https://crowley24.github.io/OST/ost_catalog.json';

const TIMEOUT = 12000;

const CATALOG_TTL = 300000;
const SEARCH_TTL = 600000;
const TRACK_TTL = 600000;

const MAX_BATCH = 10;
const DEFAULT_LIMIT = 5;
const SEARCH_BUDGET = 12;
const CONCURRENCY = 2;

const HEADERS = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 'Content-Type': 'application/json; charset=utf-8',
 'Cache-Control': 'no-store'
};

const DEFAULT_MOVIES = [
 ['Pirates of the Caribbean: The Curse of the Black Pearl', 2003, "He's a Pirate"],
 ["Harry Potter and the Philosopher's Stone", 2001, "Hedwig's Theme"],
 ['The Dark Knight', 2008, 'Why So Serious?'],
 ['Batman Begins', 2005, 'Molossus'],
 ['The Dark Knight Rises', 2012, 'Rise'],
 ['Gladiator', 2000, 'Now We Are Free'],
 ['Braveheart', 1995, 'For the Love of a Princess'],
 ['The Last of the Mohicans', 1992, 'Promentory'],
 ['Jurassic Park', 1993, 'Theme from Jurassic Park'],
 ['Star Wars', 1977, 'Main Title'],
 ['Star Wars: The Empire Strikes Back', 1980, 'The Imperial March'],
 ['The Godfather', 1972, 'Love Theme'],
 ["Schindler's List", 1993, "Theme from Schindler's List"],
 ['Forrest Gump', 1994, 'Feather Theme'],
 ['The Lion King', 1994, 'Circle of Life'],
 ['Avatar', 2009, 'I See You'],
 ['Transformers', 2007, 'Arrival to Earth'],
 ['Man of Steel', 2013, 'Flight'],
 ['The Avengers', 2012, 'The Avengers'],
 ['The Da Vinci Code', 2006, 'Chevaliers de Sangreal'],
 ['Requiem for a Dream', 2000, 'Lux Aeterna'],
 ['The Good, the Bad and the Ugly', 1966, 'The Ecstasy of Gold'],
 ['Back to the Future', 1985, 'Main Title'],
 ['Mission: Impossible', 1996, 'Theme'],
 ['The Rock', 1996, 'Hummel Gets the Rockets']
];

const SEARCH_ALIASES = {
 'pirates of the caribbean the curse of the black pearl': [
  'Pirates of the Caribbean',
  'Curse of the Black Pearl'
 ],
 'harry potter and the philosopher s stone': [
  'Harry Potter and the Sorcerers Stone',
  'Harry Potter'
 ],
 'the dark knight rises': [
  'Dark Knight Rises'
 ],
 'star wars the empire strikes back': [
  'The Empire Strikes Back',
  'Star Wars Episode V'
 ],
 'the good the bad and the ugly': [
  'Good Bad Ugly'
 ],
 'mission impossible': [
  'Mission Impossible'
 ]
};

/* =========================================================
   RESPONSES
========================================================= */

function response(data, status = 200) {
 return new Response(
  JSON.stringify(data, null, 2),
  {
   status,
   headers: HEADERS
  }
 );
}

/* =========================================================
   NORMALIZATION
========================================================= */

function norm(value) {
 return String(value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

function yearNum(value) {
 const match = String(value ?? '')
  .match(/\b(?:18|19|20)\d{2}\b/);

 return match ? Number(match[0]) : 0;
}

function unique(values) {
 const seen = new Set();

 return values.filter(value => {
  const key = norm(value);

  if (!key || seen.has(key)) {
   return false;
  }

  seen.add(key);
  return true;
 });
}

/*
 * Search terms must preserve punctuation.
 *
 * The X-Files != The X Files for OSTMusic API.
 */
function uniqueSearchTerms(values) {
 const seen = new Set();
 const result = [];

 for (const raw of values) {
  const value = String(raw ?? '')
   .replace(/\s+/g, ' ')
   .trim();

  if (norm(value).length < 3) {
   continue;
  }

  const key = value.toLowerCase();

  if (seen.has(key)) {
   continue;
  }

  seen.add(key);
  result.push(value);
 }

 return result;
}

/* =========================================================
   TITLE MATCHING — NEW 2.8.4
========================================================= */

/*
 * Removes common title formatting differences.
 *
 * House M.D.
 * House, M.D.
 * House MD
 *
 * All become:
 * house md
 */
function matchTitle(value) {
 let s = String(value ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '');

 s = s.replace(
  /\b([a-z])\.(?=[a-z]\.)/g,
  '$1'
 );

 s = s.replace(
  /\b([a-z])\.(?=\s|$)/g,
  '$1'
 );

 return s
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

/*
 * Removes terminal professional abbreviations.
 *
 * House M.D. -> House
 *
 * Used only as an alternative search/match,
 * not as an unconditional album acceptance rule.
 */
function stripTitleSuffix(value) {
 return String(value ?? '')
  .replace(
   /[\s,.-]+(?:m\s*\.?\s*d\s*\.?|md)\s*$/i,
   ''
  )
  .trim();
}

/*
 * Produces normalized alternatives for album matching.
 *
 * Short names are allowed only if sufficiently specific.
 */
function titleMatchKeys(title, aliases = []) {
 const values = [
  title,
  ...aliases
 ];

 const keys = [];

 for (const value of values) {
  const original = matchTitle(value);

  if (original) {
   keys.push(original);
  }

  const stripped = matchTitle(
   stripTitleSuffix(value)
  );

  if (
   stripped &&
   stripped !== original &&
   stripped.length >= 5
  ) {
   keys.push(stripped);
  }
 }

 return unique(keys);
}

/* =========================================================
   CACHE
========================================================= */

const caches = {
 catalog: new Map(),
 search: new Map(),
 tracks: new Map()
};

function cached(map, key, ttl, fn) {
 const now = Date.now();

 const hit = map.get(key);

 if (hit && hit.expires > now) {
  return hit.promise;
 }

 const promise = Promise.resolve().then(fn);

 map.set(key, {
  expires: now + ttl,
  promise
 });

 promise.catch(() => {
  if (map.get(key)?.promise === promise) {
   map.delete(key);
  }
 });

 if (map.size > 250) {
  for (const [k, value] of map) {
   if (value.expires <= now) {
    map.delete(k);
   }
  }

  if (map.size > 250) {
   map.delete(map.keys().next().value);
  }
 }

 return promise;
}

async function getJSON(url) {
 const result = await fetch(url, {
  headers: {
   Accept: 'application/json'
  },
  signal: AbortSignal.timeout(TIMEOUT)
 });

 if (!result.ok) {
  throw Error('HTTP ' + result.status);
 }

 return result.json();
}

/* =========================================================
   JSON CATALOG
========================================================= */

let lastCatalog = null;

async function loadCatalog() {
 try {
  return await cached(
   caches.catalog,
   'catalog',
   CATALOG_TTL,
   async () => {
    const data = await getJSON(
     CATALOG_URL +
     '?v=' +
     Math.floor(Date.now() / CATALOG_TTL)
    );

    if (
     !data ||
     !Array.isArray(data.movies)
    ) {
     throw Error('Invalid catalog format');
    }

    lastCatalog = {
     version: String(data.version || ''),
     movies: data.movies.filter(
      movie =>
       movie &&
       typeof movie.title === 'string'
     )
    };

    return lastCatalog;
   }
  );
 } catch (_) {
  return lastCatalog;
 }
}

function catalogMatch(catalog, title, year) {
 if (!catalog) {
  return null;
 }

 const wanted = norm(title);

 const matches = catalog.movies.filter(movie => {
  const names = [
   movie.title,
   ...(
    Array.isArray(movie.aliases)
     ? movie.aliases
     : []
   )
  ];

  const nameMatches = names.some(
   name => norm(name) === wanted
  );

  const yearMatches =
   !year ||
   !yearNum(movie.year) ||
   yearNum(movie.year) === year;

  return nameMatches && yearMatches;
 });

 if (year) {
  const exact = matches.filter(
   movie => yearNum(movie.year) === year
  );

  if (exact.length === 1) {
   return exact[0];
  }

  if (exact.length > 1) {
   return null;
  }
 }

 return matches.length === 1
  ? matches[0]
  : null;
}

/* =========================================================
   YOUTUBE CATALOG
========================================================= */

function youtubeURL(value) {
 try {
  const url = new URL(
   String(value || '').trim()
  );

  if (url.protocol !== 'https:') {
   return '';
  }

  const host = url.hostname.toLowerCase();

  const allowed = [
   'youtube.com',
   'www.youtube.com',
   'm.youtube.com',
   'music.youtube.com',
   'youtu.be',
   'www.youtu.be',
   'youtube-nocookie.com',
   'www.youtube-nocookie.com'
  ];

  if (!allowed.includes(host)) {
   return '';
  }

  let id = '';

  if (
   host === 'youtu.be' ||
   host === 'www.youtu.be'
  ) {
   id = url.pathname
    .split('/')
    .filter(Boolean)[0] || '';
  } else {
   id = url.searchParams.get('v') || '';

   if (!id) {
    const match = url.pathname.match(
     /^\/(?:embed|shorts|live)\/([^/?]+)/
    );

    if (match) {
     id = match[1];
    }
   }
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
   return '';
  }

  return (
   'https://www.youtube.com/watch?v=' +
   id
  );
 } catch (_) {
  return '';
 }
}

/* =========================================================
   SEARCH VARIANTS — NEW 2.8.4
========================================================= */

function variants(title, aliases = []) {
 const original = String(title || '').trim();

 const withoutThe = value =>
  String(value).replace(/^the\s+/i, '');

 const spaceHyphens = value =>
  String(value)
   .replace(/[-‐-‒–—―]+/g, ' ');

 const noSuffix = stripTitleSuffix(original);

 const candidates = [
  original,
  spaceHyphens(original),

  // House M.D. -> House MD
  original.replace(/\./g, ''),

  // House M.D. -> House M D
  original.replace(/\./g, ' '),

  // House M.D. -> House
  noSuffix,

  withoutThe(original),
  spaceHyphens(withoutThe(original)),

  original.split(':')[0],

  original.replace(/[:;,!?]/g, ' '),

  original.replace(
   /\s*[\(\[].*?[\)\]]/g,
   ''
  ),

  ...aliases,

  ...(SEARCH_ALIASES[norm(original)] || [])
 ];

 const expanded = [];

 for (const item of candidates) {
  expanded.push(item);

  if (/[-‐-‒–—―]/.test(item)) {
   expanded.push(spaceHyphens(item));
  }
 }

 return uniqueSearchTerms(expanded)
  .slice(0, 12);
}

/* =========================================================
   OSTMusic SEARCH
========================================================= */

async function searchAlbums(term, budget) {
 const key = String(term)
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

 const hit = caches.search.get(key);

 if (
  hit &&
  hit.expires > Date.now()
 ) {
  return hit.promise;
 }

 if (budget) {
  if (budget.remaining <= 0) {
   throw Error('search_budget_exhausted');
  }

  budget.remaining--;
  budget.used++;
 }

 return cached(
  caches.search,
  key,
  SEARCH_TTL,
  async () => {
   const data = await getJSON(
    BASE +
    '/index.php?option=com_muscol' +
    '&task=search' +
    '&search=albums' +
    '&searchword=' +
    encodeURIComponent(term)
   );

   return Array.isArray(data)
    ? data
    : [];
  }
 );
}

function cleanTitle(value) {
 return matchTitle(value)
  .replace(
   /\b(original motion picture soundtrack|original motion picture score|original television soundtrack|original television score|original tv soundtrack|original tv score|original soundtrack|motion picture soundtrack|official soundtrack|soundtrack album|soundtrack|film score|television score|tv series ost|tv series|ost)\b/g,
   ' '
  )
  .replace(/\s+/g, ' ')
  .trim();
}

/*
 * NEW 2.8.4
 *
 * Match album against original and alternate titles.
 *
 * Full exact match is preferred.
 *
 * Short suffix-stripped matches require an exact year.
 */
function scoreAlbum(
 album,
 title,
 year,
 aliases = []
) {
 const wanted = titleMatchKeys(
  title,
  aliases
 );

 const originalKey = cleanTitle(title);

 const names = [
  album.subtitle,
  album.name,
  album.name2
 ].map(cleanTitle).filter(Boolean);

 let score = -1;

 if (names.includes(originalKey)) {
  score = 140;
 } else {
  const matched = names.some(
   name => wanted.includes(name)
  );

  if (matched) {
   score = 125;
  }
 }

 if (score < 0) {
  return -1;
 }

 const albumYear = yearNum(album.year);

 if (year && albumYear) {
  const diff = Math.abs(
   year - albumYear
  );

  if (diff === 0) {
   score += 45;
  } else if (diff === 1) {
   score += 5;
  } else {
   return -1;
  }
 }

 return score;
}

async function findAlbum(
 title,
 year,
 aliases = [],
 budget = null
) {
 const terms = variants(
  title,
  aliases
 );

 const found = new Map();
 const searches = [];

 let exhausted = false;
 let failed = false;

 for (const term of terms) {
  if (exhausted) {
   break;
  }

  try {
   const albums = await searchAlbums(
    term,
    budget
   );

   searches.push({
    term,
    count: albums.length,
    error: null
   });

   for (const album of albums) {
    if (album && album.id) {
     found.set(
      String(album.id),
      album
     );
    }
   }
  } catch (error) {
   const message = String(
    error.message || error
   );

   if (
    message ===
    'search_budget_exhausted'
   ) {
    exhausted = true;
    break;
   }

   failed = true;

   searches.push({
    term,
    count: 0,
    error: message
   });
  }

  const matching = [
   ...found.values()
  ].filter(
   album =>
    scoreAlbum(
     album,
     title,
     year,
     aliases
    ) >= 125
  );

  if (
   matching.length === 1 &&
   year &&
   yearNum(matching[0].year) === year
  ) {
   break;
  }
 }

 const candidates = [
  ...found.values()
 ].map(album => ({
  album,
  score: scoreAlbum(
   album,
   title,
   year,
   aliases
  )
 }));

 const ranked = candidates
  .filter(item => item.score >= 125)
  .sort(
   (a, b) => b.score - a.score
  );

 const selected = (
  ranked.length === 1 ||
  (
   ranked.length > 1 &&
   ranked[0].score > ranked[1].score
  )
 ) ? ranked[0].album : null;

 return {
  album: selected,
  searches,

  candidates: candidates.map(item => ({
   id: String(item.album.id || ''),
   name: String(item.album.name || ''),
   subtitle: String(
    item.album.subtitle || ''
   ),
   year: item.album.year || '',
   score: item.score
  })),

  variantsTried: searches.length,

  searchTerm: searches
   .map(item => item.term)
   .join(' | '),

  exhausted,
  failed
 };
}

/* =========================================================
   TRACK FETCHING
========================================================= */

async function getTracks(albumId) {
 return cached(
  caches.tracks,
  String(albumId),
  TRACK_TTL,
  async () => {
   const data = await getJSON(
    BASE +
    '/index.php?option=com_muscol' +
    '&task=get_album_songs' +
    '&id=' +
    encodeURIComponent(albumId)
   );

   return Array.isArray(data)
    ? data
    : [];
  }
 );
}

function audioURL(value) {
 try {
  const url = new URL(value);

  return (
   url.protocol === 'https:' &&
   url.hostname === 'www.ostmusic.org'
  );
 } catch (_) {
  return false;
 }
}

function trackInfo(song) {
 const file = String(
  song.file || ''
 );

 return {
  id: String(song.id || ''),
  albumId: String(
   song.album_id || ''
  ),
  name: String(
   song.name || ''
  ).trim(),
  artist: String(
   song.artist_name || ''
  ).trim(),
  duration: Number(
   song.length || 0
  ),
  position: String(
   song.position || ''
  ),
  file: audioURL(file)
   ? file
   : '',
  playable:
   Number(song.isplayable) === 1
 };
}

function isPlayable(track) {
 return Boolean(
  track &&
  track.id &&
  track.file &&
  track.playable &&
  (
   !track.duration ||
   track.duration >= 35
  )
 );
}

function isClean(track) {
 return isPlayable(track) &&
  !/\b(remix|cover|karaoke|tribute|trailer|teaser|dialogue|dialog|interview|commentary|demo|unused|live|concert|reprise|instrumental cover)\b/i.test(
   norm(
    track.name +
    ' ' +
    track.artist
   )
  );
}

function matchCatalogTrack(
 songs,
 movie
) {
 const tracks = songs
  .map(trackInfo)
  .filter(isPlayable);

 if (movie.trackId) {
  const found = tracks.find(
   track =>
    track.id ===
    String(movie.trackId)
  );

  if (found) {
   return found;
  }
 }

 const wanted = norm(
  movie.track
 );

 if (!wanted) {
  return null;
 }

 const matches = tracks.filter(
  track =>
   norm(track.name) === wanted
 );

 return matches.length === 1
  ? matches[0]
  : null;
}

/* =========================================================
   TRACK SCORING — NEW 2.8.4
========================================================= */

function scoreTrack(
 track,
 title,
 preferred
) {
 const name = norm(
  track.name
 );

 const wanted = norm(
  preferred
 );

 const movie = norm(
  title
 );

 let score = 0;

 if (wanted) {
  if (name === wanted) {
   score += 150;
  } else if (
   wanted.length >= 5 &&
   name.includes(wanted)
  ) {
   score += 110;
  }
 }

 if (name === movie) {
  score += 100;
 }

 if (/\bmain theme\b/.test(name)) {
  score += 100;
 }

 if (/\bmain titles?\b/.test(name)) {
  score += 95;
 }

 if (/\btitle theme\b/.test(name)) {
  score += 90;
 }

 if (/\bopening theme\b/.test(name)) {
  score += 85;
 }

 if (
  /\bopening (?:titles?|credits)\b/.test(name)
 ) {
  score += 85;
 }

 // NEW: Theme Song
 if (/\btheme song\b/.test(name)) {
  score += 105;
 }

 if (/\btheme\b/.test(name)) {
  score += 65;
 }

 if (/\boverture\b/.test(name)) {
  score += 50;
 }

 // The X-Files Main Title
 // House M.D. Theme Song
 if (
  movie.length >= 5 &&
  name.includes(movie) &&
  /\b(?:main|title|theme|opening)\b/.test(name)
 ) {
  score += 35;
 }

 // Artist - Track (Series Theme Song)
 if (
  /\btheme song\b/.test(name) &&
  /\s-\s/.test(track.name)
 ) {
  score += 15;
 }

 // Penalize alternate versions.
 if (
  /\ba cappella\b|\bacapella\b/.test(name)
 ) {
  score -= 85;
 }

 if (
  /\bend credits?\b|\bending credits?\b/.test(name)
 ) {
  score -= 70;
 }

 if (
  /\bvocal\b|\bvocals\b/.test(name)
 ) {
  score -= 35;
 }

 if (
  /\balternate\b|\balternative\b/.test(name)
 ) {
  score -= 20;
 }

 return score;
}

function rankTracks(
 songs,
 title,
 preferred = ''
) {
 return songs
  .map(trackInfo)
  .filter(isClean)
  .map(track => ({
   track,
   score: scoreTrack(
    track,
    title,
    preferred
   )
  }))
  .sort(
   (a, b) => b.score - a.score
  );
}

function selectTrack(
 songs,
 title,
 preferred = ''
) {
 const ranked = rankTracks(
  songs,
  title,
  preferred
 );

 if (
  ranked.length &&
  ranked[0].score >= 85 &&
  (
   ranked.length === 1 ||
   ranked[0].score >
    ranked[1].score
  )
 ) {
  return {
   track: ranked[0].track,
   confidence: 'heuristic',
   selection: preferred
    ? 'preferred_or_theme'
    : 'theme_title'
  };
 }

 return null;
}

function albumInfo(
 album,
 songs
) {
 return {
  id: String(
   album.id || ''
  ),
  title: String(
   album.subtitle ||
   album.name ||
   ''
  ),
  year: yearNum(
   album.year
  ),
  artist: String(
   album.artist_name || ''
  ),
  tracksCount: songs.length
 };
}

/* =========================================================
   CATALOG TRACK RESOLUTION
========================================================= */

async function resolveCatalog(movie) {
 let album;
 let songs;

 if (movie.albumId) {
  album = {
   id: String(movie.albumId),
   subtitle: movie.title,
   year: movie.year,
   artist_name:
    movie.artist || ''
  };

  songs = await getTracks(
   album.id
  );
 } else {
  const search = await findAlbum(
   movie.title,
   yearNum(movie.year),
   Array.isArray(movie.aliases)
    ? movie.aliases
    : []
  );

  if (!search.album) {
   return null;
  }

  album = search.album;

  songs = await getTracks(
   album.id
  );
 }

 const track = matchCatalogTrack(
  songs,
  movie
 );

 if (!track) {
  return null;
 }

 return {
  album: albumInfo(
   album,
   songs
  ),
  track,
  confidence:
   movie.verified === true
    ? 'verified'
    : 'catalog_candidate',
  selection: 'catalog'
 };
}

/* =========================================================
   SINGLE SEARCH
========================================================= */

async function singleSearch(
 title,
 year,
 debug
) {
 const catalog = await loadCatalog();

 const existing = catalogMatch(
  catalog,
  title,
  year
 );

 // YouTube catalog priority.
 if (
  existing &&
  !debug &&
  String(
   existing.source || ''
  ).toLowerCase() === 'youtube'
 ) {
  const videoURL = youtubeURL(
   existing.audioUrl ||
   existing.youtubeUrl ||
   existing.url
  );

  if (!videoURL) {
   return response({
    success: true,
    version: VERSION,
    found: false,
    title,
    year,
    source: 'youtube',
    reason: 'invalid_youtube_url',
    catalogMatch: true,
    catalogTitle:
     existing.title,
    catalogVersion:
     catalog?.version || null
   });
  }

  return response({
   success: true,
   version: VERSION,
   found: true,
   source: 'youtube',
   title,
   year:
    yearNum(existing.year) ||
    year ||
    0,

   album: {
    id: '',
    title: String(
     existing.title || title
    ),
    year:
     yearNum(existing.year) ||
     year ||
     0,
    artist: String(
     existing.artist || ''
    ),
    tracksCount: 1
   },

   track: {
    id: videoURL.split('v=')[1],
    albumId: '',
    name: String(
     existing.track ||
     existing.trackName ||
     'Original Soundtrack'
    ),
    artist: String(
     existing.artist || ''
    ),
    duration: 0,
    position: '1',
    file: videoURL,
    playable: true,
    source: 'youtube'
   },

   confidence:
    existing.verified === true
     ? 'verified'
     : 'catalog',

   selection: 'catalog_youtube',
   catalogMatch: true,
   catalogTitle:
    existing.title,
   catalogVersion:
    catalog?.version || null,
   searchTerm:
    existing.title,
   variantsTried: 0
  });
 }

 // OSTMusic catalog priority.
 if (existing && !debug) {
  try {
   const found =
    await resolveCatalog(existing);

   if (found) {
    return response({
     success: true,
     version: VERSION,
     found: true,
     source: 'ostmusic',
     title,
     year,
     ...found,
     catalogVersion:
      catalog.version,
     searchTerm:
      existing.title,
     variantsTried: 0
    });
   }
  } catch (_) {}
 }

 const search = await findAlbum(
  title,
  year
 );

 // Search diagnostics.
 if (debug) {
  let tracksDebug = null;

  if (search.album) {
   try {
    const songs = await getTracks(
     search.album.id
    );

    const ranked = rankTracks(
     songs,
     title
    );

    const selected = selectTrack(
     songs,
     title
    );

    tracksDebug = {
     albumId: String(
      search.album.id
     ),
     tracksCount:
      songs.length,
     eligibleCount:
      ranked.length,
     selectedTrackId:
      selected?.track.id || null,
     selectionReason:
      selected?.selection ||
      'no_confident_playable_track',

     topTracks: ranked
      .slice(0, 12)
      .map(item => ({
       id:
        item.track.id,
       name:
        item.track.name,
       artist:
        item.track.artist,
       duration:
        item.track.duration,
       score:
        item.score
      }))
    };
   } catch (error) {
    tracksDebug = {
     error: String(
      error.message || error
     )
    };
   }
  }

  return response({
   success: true,
   version: VERSION,
   mode: 'search_debug',
   title,
   year,
   catalogVersion:
    catalog?.version || null,
   catalogMatch:
    Boolean(existing),
   catalogSource:
    existing?.source || null,
   variantsTried:
    search.variantsTried,
   searches:
    search.searches,
   candidates:
    search.candidates,
   selectedAlbumId:
    search.album
     ? String(search.album.id)
     : null,
   tracksDebug
  });
 }

 if (!search.album) {
  return response({
   success: true,
   version: VERSION,
   found: false,
   title,
   year,
   reason:
    search.failed
     ? 'search_source_error'
     : search.exhausted
      ? 'search_budget_exhausted'
      : 'album_not_found_or_ambiguous',
   catalogMatch:
    Boolean(existing),
   variantsTried:
    search.variantsTried
  });
 }

 const songs = await getTracks(
  search.album.id
 );

 const selected = selectTrack(
  songs,
  title
 );

 if (!selected) {
  return response({
   success: true,
   version: VERSION,
   found: false,
   title,
   year,
   reason:
    'no_confident_playable_track',
   album: albumInfo(
    search.album,
    songs
   )
  });
 }

 return response({
  success: true,
  version: VERSION,
  found: true,
  source: 'ostmusic',
  title,
  year,
  album: albumInfo(
   search.album,
   songs
  ),
  track:
   selected.track,
  confidence:
   selected.confidence,
  selection:
   selected.selection,
  catalogMatch:
   Boolean(existing),
  searchTerm:
   search.searchTerm,
  variantsTried:
   search.variantsTried
 });
}

/* =========================================================
   BATCH INPUT
========================================================= */

function batchMovie(value) {
 if (typeof value === 'string') {
  return {
   title: value.trim(),
   year: 0,
   preferredTrack: '',
   aliases: []
  };
 }

 if (Array.isArray(value)) {
  return {
   title: String(
    value[0] || ''
   ).trim(),
   year: yearNum(
    value[1]
   ),
   preferredTrack: String(
    value[2] || ''
   ),
   aliases: []
  };
 }

 if (
  value &&
  typeof value === 'object'
 ) {
  return {
   title: String(
    value.title || ''
   ).trim(),
   year: yearNum(
    value.year
   ),
   preferredTrack: String(
    value.preferredTrack ||
    value.track ||
    ''
   ),
   aliases:
    Array.isArray(value.aliases)
     ? value.aliases
      .filter(
       alias =>
        typeof alias === 'string'
      )
      .slice(0, 10)
     : []
  };
 }

 return null;
}

function makeEntry(
 movie,
 albumId,
 track
) {
 return {
  title:
   movie.title,
  year:
   movie.year,
  aliases:
   movie.aliases || [],
  albumId:
   String(albumId),
  trackId:
   String(track.id),
  track:
   track.name,
  artist:
   track.artist,
  verified:
   false
 };
}

function albumSummary(album) {
 return {
  id: String(
   album.id || ''
  ),
  name: String(
   album.name || ''
  ),
  subtitle: String(
   album.subtitle || ''
  ),
  year:
   album.year || ''
 };
}

/* =========================================================
   BATCH INSPECTION
========================================================= */

async function inspectMovie(
 movie,
 catalog,
 skipExisting,
 budget
) {
 const existing = catalogMatch(
  catalog,
  movie.title,
  movie.year
 );

 if (
  existing &&
  skipExisting
 ) {
  return {
   status: 'existing',
   title:
    movie.title,
   year:
    movie.year,
   albumId: String(
    existing.albumId || ''
   ),
   trackId: String(
    existing.trackId || ''
   ),
   track:
    existing.track || '',
   verified:
    existing.verified === true
  };
 }

 let album;
 let search = null;
 let source = 'automatic';

 if (existing?.albumId) {
  album = {
   id: String(
    existing.albumId
   ),
   subtitle:
    existing.title,
   year:
    existing.year
  };

  source =
   'catalog_candidate';
 } else {
  search = await findAlbum(
   movie.title,
   movie.year,
   movie.aliases,
   budget
  );

  album = search.album;
 }

 if (!album) {
  const candidates =
   search?.candidates || [];

  const ambiguous =
   candidates.some(
    item => item.score >= 0
   );

  return {
   status:
    search?.exhausted ||
    search?.failed
     ? 'deferred'
     : ambiguous
      ? 'review'
      : 'notFound',

   title:
    movie.title,
   year:
    movie.year,

   reason:
    search?.exhausted
     ? 'search_budget_exhausted'
     : search?.failed
      ? 'search_source_error'
      : ambiguous
       ? 'ambiguous_album'
       : 'album_not_found',

   candidates:
    candidates.slice(0, 20),
   searches:
    search?.searches || []
  };
 }

 let songs;

 try {
  songs = await getTracks(
   album.id
  );
 } catch (error) {
  return {
   status: 'deferred',
   title:
    movie.title,
   year:
    movie.year,
   reason:
    'tracks_source_error',
   message:
    String(
     error.message || error
    )
  };
 }

 const tracks = songs
  .map(trackInfo)
  .filter(isPlayable);

 if (!tracks.length) {
  return {
   status: 'review',
   title:
    movie.title,
   year:
    movie.year,
   reason:
    'no_playable_tracks',
   album:
    albumSummary(album)
  };
 }

 if (existing) {
  const track =
   matchCatalogTrack(
    songs,
    existing
   );

  if (track) {
   const entry = makeEntry(
    movie,
    album.id,
    track
   );

   entry.aliases =
    Array.isArray(existing.aliases)
     ? existing.aliases
     : [];

   return {
    status: 'existing',
    title:
     movie.title,
    year:
     movie.year,
    verified:
     existing.verified === true,
    source:
     'catalog',
    entry,
    track
   };
  }

  return {
   status: 'review',
   title:
    movie.title,
   year:
    movie.year,
   reason:
    'existing_catalog_track_missing',
   album:
    albumSummary(album),
   catalogTrackId:
    String(
     existing.trackId || ''
    )
  };
 }

 const clean = tracks.filter(
  isClean
 );

 const preferred = norm(
  movie.preferredTrack
 );

 if (preferred) {
  const exact = clean.filter(
   track =>
    norm(track.name) === preferred
  );

  if (exact.length === 1) {
   return {
    status: 'ready',
    title:
     movie.title,
    year:
     movie.year,
    source,
    reason:
     'preferred_track_match',
    entry:
     makeEntry(
      movie,
      album.id,
      exact[0]
     ),
    track:
     exact[0]
   };
  }

  if (exact.length > 1) {
   return {
    status: 'review',
    title:
     movie.title,
    year:
     movie.year,
    reason:
     'duplicate_preferred_tracks',
    album:
     albumSummary(album),
    tracks:
     exact
   };
  }

  const partial = clean.filter(
   track =>
    preferred.length >= 5 &&
    norm(track.name).includes(
     preferred
    )
  );

  if (partial.length === 1) {
   return {
    status: 'ready',
    title:
     movie.title,
    year:
     movie.year,
    source,
    reason:
     'unique_partial_track_match',
    entry:
     makeEntry(
      movie,
      album.id,
      partial[0]
     ),
    track:
     partial[0]
   };
  }
 }

 const ranked = clean
  .map(track => ({
   track,
   score: scoreTrack(
    track,
    movie.title,
    movie.preferredTrack
   )
  }))
  .filter(
   item => item.score >= 85
  )
  .sort(
   (a, b) =>
    b.score - a.score
  );

 if (
  ranked.length &&
  (
   ranked.length === 1 ||
   ranked[0].score >
    ranked[1].score
  )
 ) {
  const track =
   ranked[0].track;

  return {
   status: 'ready',
   title:
    movie.title,
   year:
    movie.year,
   source,
   reason:
    'unique_theme_candidate',
   entry:
    makeEntry(
     movie,
     album.id,
     track
    ),
   track
  };
 }

 return {
  status: 'review',
  title:
   movie.title,
  year:
   movie.year,
  reason:
   'track_selection_required',
  album:
   albumSummary(album),
  preferredTrack:
   movie.preferredTrack,

  tracks: tracks
   .slice(0, 50)
   .map(track => ({
    id:
     track.id,
    name:
     track.name,
    artist:
     track.artist,
    duration:
     track.duration,
    playable:
     track.playable
   }))
 };
}

/* =========================================================
   CONCURRENT BATCH PROCESSING
========================================================= */

async function mapLimited(
 items,
 concurrency,
 fn
) {
 const results = new Array(
  items.length
 );

 let cursor = 0;

 async function run() {
  while (
   cursor < items.length
  ) {
   const index = cursor++;

   try {
    results[index] =
     await fn(
      items[index],
      index
     );
   } catch (error) {
    results[index] = {
     status: 'error',
     title:
      items[index].title,
     year:
      items[index].year,
     reason:
      String(
       error.message || error
      )
    };
   }
  }
 }

 await Promise.all(
  Array.from(
   {
    length: Math.min(
     concurrency,
     items.length
    )
   },
   () => run()
  )
 );

 return results;
}

/* =========================================================
   BATCH CATALOG BUILDER
========================================================= */

async function batchSearch(
 raw,
 limit,
 skipExisting
) {
 if (!Array.isArray(raw)) {
  return response({
   success: false,
   version: VERSION,
   error: 'invalid_batch'
  }, 400);
 }

 const seen = new Set();

 const movies = raw
  .map(batchMovie)
  .filter(movie => {
   if (
    !movie?.title ||
    movie.title.length > 150
   ) {
    return false;
   }

   const key =
    norm(movie.title) +
    '|' +
    movie.year;

   if (seen.has(key)) {
    return false;
   }

   seen.add(key);
   return true;
  })
  .slice(0, limit);

 const catalog = await loadCatalog();

 const budget = {
  remaining:
   SEARCH_BUDGET,
  used: 0
 };

 const results = await mapLimited(
  movies,
  CONCURRENCY,
  movie =>
   inspectMovie(
    movie,
    catalog,
    skipExisting,
    budget
   )
 );

 const group = status =>
  results.filter(
   result =>
    result.status === status
  );

 const ready =
  group('ready');

 const review =
  group('review');

 const notFound =
  group('notFound');

 const existing =
  group('existing');

 const deferred =
  group('deferred');

 const errors =
  group('error');

 const entries = ready.map(
  result => result.entry
 );

 return response({
  success: true,
  version: VERSION,
  mode:
   'batch_catalog_builder',
  source:
   'OSTMusic.org',
  catalogVersion:
   catalog?.version || null,
  skipExisting,

  searchBudget: {
   max:
    SEARCH_BUDGET,
   used:
    budget.used,
   remaining:
    budget.remaining
  },

  summary: {
   requested:
    movies.length,
   ready:
    ready.length,
   review:
    review.length,
   notFound:
    notFound.length,
   existing:
    existing.length,
   deferred:
    deferred.length,
   errors:
    errors.length
  },

  ready,
  review,
  notFound,
  existing,
  deferred,
  errors,

  catalogEntries:
   entries,

  catalogLines:
   entries.map(
    entry =>
     JSON.stringify(entry)
   ),

  note:
   'Ready entries are candidates, not human-verified. Test track identity and playback before setting verified=true.'
 });
}

/* =========================================================
   TRACK DIAGNOSTICS
========================================================= */

async function debugTracks(albumId) {
 if (
  !/^\d{1,10}$/.test(
   albumId
  )
 ) {
  return response({
   success: false,
   version: VERSION,
   error:
    'invalid_album_id'
  }, 400);
 }

 const songs = await getTracks(
  albumId
 );

 const tracks = songs.map(
  trackInfo
 );

 return response({
  success: true,
  version: VERSION,
  mode:
   'tracks_debug',
  source:
   'OSTMusic.org',
  albumId,
  tracksCount:
   tracks.length,

  playableCount:
   tracks.filter(
    isPlayable
   ).length,

  tracks: tracks.map(
   track => ({
    ...track,
    eligible:
     isClean(track)
   })
  ),

  note:
   'Playable reflects source metadata, not an independent playback test. No catalog changes are made.'
 });
}

/* =========================================================
   CLOUDFLARE WORKER
========================================================= */

export default {
 async fetch(request) {
  if (
   request.method ===
   'OPTIONS'
  ) {
   return new Response(
    null,
    {
     status: 204,
     headers: HEADERS
    }
   );
  }

  if (
   !['GET', 'POST'].includes(
    request.method
   )
  ) {
   return response({
    success: false,
    error:
     'method_not_allowed'
   }, 405);
  }

  const url = new URL(
   request.url
  );

  try {
   if (
    request.method ===
    'POST'
   ) {
    let body;

    try {
     body =
      await request.json();
    } catch (_) {
     return response({
      success: false,
      version: VERSION,
      error:
       'invalid_json'
     }, 400);
    }

    const raw =
     Array.isArray(body)
      ? body
      : body?.movies;

    const limit = Math.max(
     1,
     Math.min(
      MAX_BATCH,
      Number(
       body?.limit
      ) || DEFAULT_LIMIT
     )
    );

    return batchSearch(
     raw,
     limit,
     body?.skipExisting !== false
    );
   }

   if (
    url.searchParams.get(
     'debug'
    ) === 'tracks'
   ) {
    return debugTracks(
     String(
      url.searchParams.get(
       'albumId'
      ) || ''
     ).trim()
    );
   }

   if (
    url.searchParams.get(
     'batch'
    ) === '1'
   ) {
    const titles =
     url.searchParams.get(
      'titles'
     );

    const raw = titles
     ? titles
      .split('|')
      .map(
       value => value.trim()
      )
      .filter(Boolean)
     : DEFAULT_MOVIES;

    const limit = Math.max(
     1,
     Math.min(
      MAX_BATCH,
      Number(
       url.searchParams.get(
        'limit'
       )
      ) || DEFAULT_LIMIT
     )
    );

    return batchSearch(
     raw,
     limit,
     url.searchParams.get(
      'skipExisting'
     ) !== '0'
    );
   }

   const title = String(
    url.searchParams.get(
     'title'
    ) || ''
   ).trim();

   const year = yearNum(
    url.searchParams.get(
     'year'
    )
   );

   const debug =
    url.searchParams.get(
     'debug'
    ) === 'search';

   if (!title) {
    const catalog =
     await loadCatalog();

    return response({
     success: true,
     service:
      'Original Soundtrack',
     version:
      VERSION,
     catalogUrl:
      CATALOG_URL,
     catalogVersion:
      catalog?.version || null,
     catalogMovies:
      catalog?.movies.length || 0,

     endpoints: {
      search:
       '?title=House%20M.D.&year=2004',
      debug:
       '?title=House%20M.D.&year=2004&debug=search',
      tracks:
       '?albumId=370&debug=tracks',
      batch:
       '?batch=1&limit=5',
      includeExisting:
       '?batch=1&skipExisting=0'
     },

     maxBatch:
      MAX_BATCH,
     searchBudget:
      SEARCH_BUDGET
    });
   }

   if (
    title.length > 150
   ) {
    return response({
     success: false,
     error:
      'title_too_long'
    }, 400);
   }

   return singleSearch(
    title,
    year,
    debug
   );
  } catch (error) {
   return response({
    success: false,
    version: VERSION,
    error:
     'worker_error',
    message:
     String(
      error.message || error
     )
   }, 502);
  }
 }
};
