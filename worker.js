
// Original Soundtrack Worker 2.8.3
// Cloudflare Workers — OSTMusic.org + YouTube catalog sources

const VERSION = '2.8.3';
const BASE = 'https://www.ostmusic.org';
const CATALOG_URL = 'https://crowley24.github.io/OST/ost_catalog.json';

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
 ['Pirates of the Caribbean: The Curse of the Black Pearl',2003,"He's a Pirate"],
 ["Harry Potter and the Philosopher's Stone",2001,"Hedwig's Theme"],
 ['The Dark Knight',2008,'Why So Serious?'],
 ['Batman Begins',2005,'Molossus'],
 ['The Dark Knight Rises',2012,'Rise'],
 ['Gladiator',2000,'Now We Are Free'],
 ['Braveheart',1995,'For the Love of a Princess'],
 ['The Last of the Mohicans',1992,'Promentory'],
 ['Jurassic Park',1993,'Theme from Jurassic Park'],
 ['Star Wars',1977,'Main Title'],
 ['Star Wars: The Empire Strikes Back',1980,'The Imperial March'],
 ['The Godfather',1972,'Love Theme'],
 ["Schindler's List",1993,"Theme from Schindler's List"],
 ['Forrest Gump',1994,'Feather Theme'],
 ['The Lion King',1994,'Circle of Life'],
 ['Avatar',2009,'I See You'],
 ['Transformers',2007,'Arrival to Earth'],
 ['Man of Steel',2013,'Flight'],
 ['The Avengers',2012,'The Avengers'],
 ['The Da Vinci Code',2006,'Chevaliers de Sangreal'],
 ['Requiem for a Dream',2000,'Lux Aeterna'],
 ['The Good, the Bad and the Ugly',1966,'The Ecstasy of Gold'],
 ['Back to the Future',1985,'Main Title'],
 ['Mission: Impossible',1996,'Theme'],
 ['The Rock',1996,'Hummel Gets the Rockets']
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
 'the dark knight rises': ['Dark Knight Rises'],
 'star wars the empire strikes back': [
  'The Empire Strikes Back',
  'Star Wars Episode V'
 ],
 'the good the bad and the ugly': ['Good Bad Ugly'],
 'mission impossible': ['Mission Impossible']
};

function response(data, status = 200) {
 return new Response(JSON.stringify(data, null, 2), {
  status,
  headers: HEADERS
 });
}

function norm(v) {
 return String(v ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
}

function yearNum(v) {
 const m = String(v ?? '').match(/\b(?:18|19|20)\d{2}\b/);
 return m ? Number(m[0]) : 0;
}

function unique(values) {
 const seen = new Set();

 return values.filter(v => {
  const key = norm(v);

  if (!key || seen.has(key)) return false;

  seen.add(key);
  return true;
 });
}

/*
 * NEW 2.8.3
 *
 * OSTMusic distinguishes punctuation in search queries.
 *
 * "The X-Files" and "The X Files" must remain
 * separate search terms.
 */
function uniqueSearchTerms(values) {
 const seen = new Set();
 const result = [];

 for (const raw of values) {
  const value = String(raw ?? '')
   .replace(/\s+/g, ' ')
   .trim();

  if (norm(value).length < 3) continue;

  const key = value.toLowerCase();

  if (seen.has(key)) continue;

  seen.add(key);
  result.push(value);
 }

 return result;
}

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
  for (const [k, v] of map) {
   if (v.expires <= now) map.delete(k);
  }

  if (map.size > 250) {
   map.delete(map.keys().next().value);
  }
 }

 return promise;
}

async function getJSON(url) {
 const r = await fetch(url, {
  headers: {
   Accept: 'application/json'
  },
  signal: AbortSignal.timeout(TIMEOUT)
 });

 if (!r.ok) {
  throw Error('HTTP ' + r.status);
 }

 return r.json();
}

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

    if (!data || !Array.isArray(data.movies)) {
     throw Error('Invalid catalog format');
    }

    lastCatalog = {
     version: String(data.version || ''),
     movies: data.movies.filter(
      m => m && typeof m.title === 'string'
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
 if (!catalog) return null;

 const wanted = norm(title);

 const matches = catalog.movies.filter(m =>
  [
   m.title,
   ...(Array.isArray(m.aliases) ? m.aliases : [])
  ].some(n => norm(n) === wanted) &&
  (
   !year ||
   !yearNum(m.year) ||
   year === yearNum(m.year)
  )
 );

 if (year) {
  const exact = matches.filter(
   m => yearNum(m.year) === year
  );

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
 }

 return matches.length === 1 ? matches[0] : null;
}

/*
 * YouTube URL validation.
 *
 * Only supported YouTube domains and valid video IDs
 * are accepted.
 */
function youtubeURL(value) {
 try {
  const u = new URL(String(value || '').trim());

  if (u.protocol !== 'https:') return '';

  const host = u.hostname.toLowerCase();

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

  if (!allowed.includes(host)) return '';

  let id = '';

  if (
   host === 'youtu.be' ||
   host === 'www.youtu.be'
  ) {
   id = u.pathname.split('/').filter(Boolean)[0] || '';
  } else {
   id = u.searchParams.get('v') || '';

   if (!id) {
    const match = u.pathname.match(
     /^\/(?:embed|shorts|live)\/([^/?]+)/
    );

    if (match) id = match[1];
   }
  }

  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
   return '';
  }

  return 'https://www.youtube.com/watch?v=' + id;
 } catch (_) {
  return '';
 }
}

/*
 * NEW 2.8.3
 *
 * Generate punctuation-sensitive search variants.
 *
 * The X-Files -> The X Files
 * X-Files     -> X Files
 *
 * Both variants are retained.
 */
function variants(title, aliases = []) {
 const s = String(title || '').trim();

 const stripThe = v =>
  String(v).replace(/^the\s+/i, '');

 const spaceHyphens = v =>
  String(v).replace(/[-‐‑‒–—―]+/g, ' ');

 const base = [
  s,
  spaceHyphens(s),
  stripThe(s),
  spaceHyphens(stripThe(s)),
  s.split(':')[0],
  s.replace(/[:;,!?]/g, ' '),
  s.replace(/\s*[\(\[].*?[\)\]]/g, ''),
  ...aliases,
  ...(SEARCH_ALIASES[norm(s)] || [])
 ];

 const expanded = [];

 for (const item of base) {
  expanded.push(item);

  if (/[-‐‑‒–—―]/.test(item)) {
   expanded.push(spaceHyphens(item));
  }
 }

 return uniqueSearchTerms(expanded).slice(0, 12);
}

/*
 * NEW 2.8.3
 *
 * Cache keys preserve punctuation.
 *
 * Previously norm(term) made:
 * "The X-Files" and "The X Files"
 * share the same cache entry.
 */
async function searchAlbums(term, budget) {
 const key = String(term)
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

 const hit = caches.search.get(key);

 if (hit && hit.expires > Date.now()) {
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

   return Array.isArray(data) ? data : [];
  }
 );
}

function cleanTitle(v) {
 return norm(v)
  .replace(
   /\b(original motion picture soundtrack|original motion picture score|original television soundtrack|original television score|original tv soundtrack|original tv score|original soundtrack|motion picture soundtrack|official soundtrack|soundtrack album|soundtrack|film score|television score|tv series ost|tv series|ost)\b/g,
   ' '
  )
  .replace(/\s+/g, ' ')
  .trim();
}

function scoreAlbum(album, title, year, aliases = []) {
 const wanted = unique(
  [title, ...aliases].map(cleanTitle)
 );

 const names = [
  album.subtitle,
  album.name,
  album.name2
 ].map(cleanTitle).filter(Boolean);

 if (!names.some(n => wanted.includes(n))) {
  return -1;
 }

 let score = 140;

 const y = yearNum(album.year);

 if (year && y) {
  const diff = Math.abs(year - y);

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
 const terms = variants(title, aliases);

 const found = new Map();
 const searches = [];

 let exhausted = false;
 let failed = false;

 for (const term of terms) {
  if (exhausted) break;

  try {
   const albums = await searchAlbums(term, budget);

   searches.push({
    term,
    count: albums.length,
    error: null
   });

   for (const a of albums) {
    if (a && a.id) {
     found.set(String(a.id), a);
    }
   }
  } catch (e) {
   const msg = String(e.message || e);

   if (msg === 'search_budget_exhausted') {
    exhausted = true;
    break;
   }

   failed = true;

   searches.push({
    term,
    count: 0,
    error: msg
   });
  }

  const exact = [...found.values()].filter(
   a => scoreAlbum(a, title, year, aliases) >= 140
  );

  if (
   exact.length === 1 &&
   year &&
   yearNum(exact[0].year) === year
  ) {
   break;
  }
 }

 const candidates = [...found.values()].map(
  album => ({
   album,
   score: scoreAlbum(
    album,
    title,
    year,
    aliases
   )
  })
 );

 const ranked = candidates
  .filter(c => c.score >= 140)
  .sort((a, b) => b.score - a.score);

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

  candidates: candidates.map(c => ({
   id: String(c.album.id || ''),
   name: String(c.album.name || ''),
   subtitle: String(c.album.subtitle || ''),
   year: c.album.year || '',
   score: c.score
  })),

  variantsTried: searches.length,

  searchTerm: searches
   .map(s => s.term)
   .join(' | '),

  exhausted,
  failed
 };
}

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

   return Array.isArray(data) ? data : [];
  }
 );
}

function audioURL(v) {
 try {
  const u = new URL(v);

  return (
   u.protocol === 'https:' &&
   u.hostname === 'www.ostmusic.org'
  );
 } catch (_) {
  return false;
 }
}

function trackInfo(song) {
 const file = String(song.file || '');

 return {
  id: String(song.id || ''),
  albumId: String(song.album_id || ''),
  name: String(song.name || '').trim(),
  artist: String(song.artist_name || '').trim(),
  duration: Number(song.length || 0),
  position: String(song.position || ''),
  file: audioURL(file) ? file : '',
  playable: Number(song.isplayable) === 1
 };
}

function isPlayable(t) {
 return Boolean(
  t &&
  t.id &&
  t.file &&
  t.playable &&
  (
   !t.duration ||
   t.duration >= 35
  )
 );
}

function isClean(t) {
 return isPlayable(t) &&
  !/\b(remix|cover|karaoke|tribute|trailer|teaser|dialogue|dialog|interview|commentary|demo|unused|live|concert|reprise|instrumental cover)\b/i.test(
   norm(t.name + ' ' + t.artist)
  );
}

function matchCatalogTrack(songs, movie) {
 const tracks = songs
  .map(trackInfo)
  .filter(isPlayable);

 if (movie.trackId) {
  const found = tracks.find(
   t => t.id === String(movie.trackId)
  );

  if (found) return found;
 }

 const wanted = norm(movie.track);

 if (!wanted) return null;

 const matches = tracks.filter(
  t => norm(t.name) === wanted
 );

 return matches.length === 1 ? matches[0] : null;
}

/*
 * NEW 2.8.3
 *
 * Improved main-theme scoring.
 *
 * Main Title / Main Titles / Opening Credits
 * are recognized.
 *
 * A Cappella, vocal and end-credit versions
 * receive lower priority.
 */
function scoreTrack(t, title, preferred) {
 const name = norm(t.name);
 const wanted = norm(preferred);
 const movie = norm(title);

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

 if (/\bopening (?:titles?|credits)\b/.test(name)) {
  score += 85;
 }

 if (/\btheme\b/.test(name)) {
  score += 65;
 }

 if (/\boverture\b/.test(name)) {
  score += 50;
 }

 // Bonus when the track contains the movie/series title.
 if (
  movie.length >= 5 &&
  name.includes(movie) &&
  /\b(?:main|title|theme|opening)\b/.test(name)
 ) {
  score += 35;
 }

 // Prefer original score over alternate arrangements.
 if (
  /\b(?:a cappella|acapella|vocal|vocals|end credits?|ending credits?|alternate|alternative|version|season)\b/.test(name)
 ) {
  if (/\ba cappella\b|\bacapella\b/.test(name)) {
   score -= 85;
  }

  if (/\bend credits?\b|\bending credits?\b/.test(name)) {
   score -= 70;
  }

  if (/\bvocal\b|\bvocals\b/.test(name)) {
   score -= 35;
  }

  if (/\balternate\b|\balternative\b/.test(name)) {
   score -= 20;
  }
 }

 return score;
}

function rankTracks(songs, title, preferred = '') {
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
  .sort((a, b) => b.score - a.score);
}

function selectTrack(songs, title, preferred = '') {
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
   ranked[0].score > ranked[1].score
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

function albumInfo(album, songs) {
 return {
  id: String(album.id || ''),
  title: String(
   album.subtitle ||
   album.name ||
   ''
  ),
  year: yearNum(album.year),
  artist: String(album.artist_name || ''),
  tracksCount: songs.length
 };
}

async function resolveCatalog(movie) {
 let album;
 let songs;

 if (movie.albumId) {
  album = {
   id: String(movie.albumId),
   subtitle: movie.title,
   year: movie.year,
   artist_name: movie.artist || ''
  };

  songs = await getTracks(album.id);
 } else {
  const search = await findAlbum(
   movie.title,
   yearNum(movie.year)
  );

  if (!search.album) return null;

  album = search.album;
  songs = await getTracks(album.id);
 }

 const track = matchCatalogTrack(
  songs,
  movie
 );

 if (!track) return null;

 return {
  album: albumInfo(album, songs),
  track,
  confidence: movie.verified === true
   ? 'verified'
   : 'catalog_candidate',
  selection: 'catalog'
 };
}

/*
 * Single-title lookup.
 *
 * Priority:
 * 1. YouTube JSON catalog
 * 2. OSTMusic JSON catalog
 * 3. Automatic OSTMusic search
 */
async function singleSearch(title, year, debug) {
 const catalog = await loadCatalog();

 const existing = catalogMatch(
  catalog,
  title,
  year
 );

 // YouTube catalog entry.
 if (
  existing &&
  !debug &&
  String(existing.source || '').toLowerCase() === 'youtube'
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
    catalogTitle: existing.title,
    catalogVersion: catalog?.version || null
   });
  }

  return response({
   success: true,
   version: VERSION,
   found: true,
   source: 'youtube',
   title,
   year: yearNum(existing.year) || year || 0,

   album: {
    id: '',
    title: String(existing.title || title),
    year: yearNum(existing.year) || year || 0,
    artist: String(existing.artist || ''),
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
    artist: String(existing.artist || ''),
    duration: 0,
    position: '1',
    file: videoURL,
    playable: true,
    source: 'youtube'
   },

   confidence: existing.verified === true
    ? 'verified'
    : 'catalog',

   selection: 'catalog_youtube',
   catalogMatch: true,
   catalogTitle: existing.title,
   catalogVersion: catalog?.version || null,
   searchTerm: existing.title,
   variantsTried: 0
  });
 }

 // OSTMusic catalog entry.
 if (existing && !debug) {
  try {
   const found = await resolveCatalog(existing);

   if (found) {
    return response({
     success: true,
     version: VERSION,
     found: true,
     source: 'ostmusic',
     title,
     year,
     ...found,
     catalogVersion: catalog.version,
     searchTerm: existing.title,
     variantsTried: 0
    });
   }
  } catch (_) {}
 }

 // Automatic search.
 const search = await findAlbum(title, year);

 /*
  * NEW 2.8.3
  *
  * Search diagnostics now include track ranking
  * for the selected album.
  */
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
     albumId: String(search.album.id),
     tracksCount: songs.length,
     eligibleCount: ranked.length,
     selectedTrackId: selected?.track.id || null,
     selectionReason: selected?.selection ||
      'no_confident_playable_track',

     topTracks: ranked.slice(0, 12).map(x => ({
      id: x.track.id,
      name: x.track.name,
      artist: x.track.artist,
      duration: x.track.duration,
      score: x.score
     }))
    };
   } catch (e) {
    tracksDebug = {
     error: String(e.message || e)
    };
   }
  }

  return response({
   success: true,
   version: VERSION,
   mode: 'search_debug',
   title,
   year,
   catalogVersion: catalog?.version || null,
   catalogMatch: Boolean(existing),
   catalogSource: existing?.source || null,
   variantsTried: search.variantsTried,
   searches: search.searches,
   candidates: search.candidates,
   selectedAlbumId: search.album
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
   reason: search.failed
    ? 'search_source_error'
    : search.exhausted
     ? 'search_budget_exhausted'
     : 'album_not_found_or_ambiguous',
   catalogMatch: Boolean(existing),
   variantsTried: search.variantsTried
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
   reason: 'no_confident_playable_track',
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
  track: selected.track,
  confidence: selected.confidence,
  selection: selected.selection,
  catalogMatch: Boolean(existing),
  searchTerm: search.searchTerm,
  variantsTried: search.variantsTried
 });
}

function batchMovie(v) {
 if (typeof v === 'string') {
  return {
   title: v.trim(),
   year: 0,
   preferredTrack: '',
   aliases: []
  };
 }

 if (Array.isArray(v)) {
  return {
   title: String(v[0] || '').trim(),
   year: yearNum(v[1]),
   preferredTrack: String(v[2] || ''),
   aliases: []
  };
 }

 if (v && typeof v === 'object') {
  return {
   title: String(v.title || '').trim(),
   year: yearNum(v.year),
   preferredTrack: String(
    v.preferredTrack ||
    v.track ||
    ''
   ),
   aliases: Array.isArray(v.aliases)
    ? v.aliases
      .filter(a => typeof a === 'string')
      .slice(0, 10)
    : []
  };
 }

 return null;
}

function makeEntry(movie, albumId, track) {
 return {
  title: movie.title,
  year: movie.year,
  aliases: movie.aliases || [],
  albumId: String(albumId),
  trackId: String(track.id),
  track: track.name,
  artist: track.artist,
  verified: false
 };
}

function albumSummary(a) {
 return {
  id: String(a.id || ''),
  name: String(a.name || ''),
  subtitle: String(a.subtitle || ''),
  year: a.year || ''
 };
}

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

 if (existing && skipExisting) {
  return {
   status: 'existing',
   title: movie.title,
   year: movie.year,
   albumId: String(existing.albumId || ''),
   trackId: String(existing.trackId || ''),
   track: existing.track || '',
   verified: existing.verified === true
  };
 }

 let album;
 let search = null;
 let source = 'automatic';

 if (existing?.albumId) {
  album = {
   id: String(existing.albumId),
   subtitle: existing.title,
   year: existing.year
  };

  source = 'catalog_candidate';
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
  const candidates = search?.candidates || [];

  const ambiguous = candidates.some(
   c => c.score >= 0
  );

  return {
   status: search?.exhausted || search?.failed
    ? 'deferred'
    : ambiguous
     ? 'review'
     : 'notFound',

   title: movie.title,
   year: movie.year,

   reason: search?.exhausted
    ? 'search_budget_exhausted'
    : search?.failed
     ? 'search_source_error'
     : ambiguous
      ? 'ambiguous_album'
      : 'album_not_found',

   candidates: candidates.slice(0, 20),
   searches: search?.searches || []
  };
 }

 let songs;

 try {
  songs = await getTracks(album.id);
 } catch (e) {
  return {
   status: 'deferred',
   title: movie.title,
   year: movie.year,
   reason: 'tracks_source_error',
   message: String(e.message || e)
  };
 }

 const tracks = songs
  .map(trackInfo)
  .filter(isPlayable);

 if (!tracks.length) {
  return {
   status: 'review',
   title: movie.title,
   year: movie.year,
   reason: 'no_playable_tracks',
   album: albumSummary(album)
  };
 }

 if (existing) {
  const track = matchCatalogTrack(
   songs,
   existing
  );

  if (track) {
   const entry = makeEntry(
    movie,
    album.id,
    track
   );

   entry.aliases = Array.isArray(existing.aliases)
    ? existing.aliases
    : [];

   return {
    status: 'existing',
    title: movie.title,
    year: movie.year,
    verified: existing.verified === true,
    source: 'catalog',
    entry,
    track
   };
  }

  return {
   status: 'review',
   title: movie.title,
   year: movie.year,
   reason: 'existing_catalog_track_missing',
   album: albumSummary(album),
   catalogTrackId: String(existing.trackId || '')
  };
 }

 const clean = tracks.filter(isClean);
 const preferred = norm(movie.preferredTrack);

 if (preferred) {
  const exact = clean.filter(
   t => norm(t.name) === preferred
  );

  if (exact.length === 1) {
   return {
    status: 'ready',
    title: movie.title,
    year: movie.year,
    source,
    reason: 'preferred_track_match',
    entry: makeEntry(
     movie,
     album.id,
     exact[0]
    ),
    track: exact[0]
   };
  }

  if (exact.length > 1) {
   return {
    status: 'review',
    title: movie.title,
    year: movie.year,
    reason: 'duplicate_preferred_tracks',
    album: albumSummary(album),
    tracks: exact
   };
  }

  const partial = clean.filter(t =>
   preferred.length >= 5 &&
   norm(t.name).includes(preferred)
  );

  if (partial.length === 1) {
   return {
    status: 'ready',
    title: movie.title,
    year: movie.year,
    source,
    reason: 'unique_partial_track_match',
    entry: makeEntry(
     movie,
     album.id,
     partial[0]
    ),
    track: partial[0]
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
  .filter(x => x.score >= 85)
  .sort((a, b) => b.score - a.score);

 if (
  ranked.length &&
  (
   ranked.length === 1 ||
   ranked[0].score > ranked[1].score
  )
 ) {
  const track = ranked[0].track;

  return {
   status: 'ready',
   title: movie.title,
   year: movie.year,
   source,
   reason: 'unique_theme_candidate',
   entry: makeEntry(
    movie,
    album.id,
    track
   ),
   track
  };
 }

 return {
  status: 'review',
  title: movie.title,
  year: movie.year,
  reason: 'track_selection_required',
  album: albumSummary(album),
  preferredTrack: movie.preferredTrack,

  tracks: tracks.slice(0, 50).map(t => ({
   id: t.id,
   name: t.name,
   artist: t.artist,
   duration: t.duration,
   playable: t.playable
  }))
 };
}

async function mapLimited(
 items,
 concurrency,
 fn
) {
 const results = new Array(items.length);

 let cursor = 0;

 async function run() {
  while (cursor < items.length) {
   const i = cursor++;

   try {
    results[i] = await fn(items[i], i);
   } catch (e) {
    results[i] = {
     status: 'error',
     title: items[i].title,
     year: items[i].year,
     reason: String(e.message || e)
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
  .filter(m => {
   if (
    !m?.title ||
    m.title.length > 150
   ) {
    return false;
   }

   const key = norm(m.title) + '|' + m.year;

   if (seen.has(key)) return false;

   seen.add(key);
   return true;
  })
  .slice(0, limit);

 const catalog = await loadCatalog();

 const budget = {
  remaining: SEARCH_BUDGET,
  used: 0
 };

 const results = await mapLimited(
  movies,
  CONCURRENCY,
  m => inspectMovie(
   m,
   catalog,
   skipExisting,
   budget
  )
 );

 const group = s => results.filter(
  r => r.status === s
 );

 const ready = group('ready');
 const review = group('review');
 const notFound = group('notFound');
 const existing = group('existing');
 const deferred = group('deferred');
 const errors = group('error');

 const entries = ready.map(
  r => r.entry
 );

 return response({
  success: true,
  version: VERSION,
  mode: 'batch_catalog_builder',
  source: 'OSTMusic.org',
  catalogVersion: catalog?.version || null,
  skipExisting,

  searchBudget: {
   max: SEARCH_BUDGET,
   used: budget.used,
   remaining: budget.remaining
  },

  summary: {
   requested: movies.length,
   ready: ready.length,
   review: review.length,
   notFound: notFound.length,
   existing: existing.length,
   deferred: deferred.length,
   errors: errors.length
  },

  ready,
  review,
  notFound,
  existing,
  deferred,
  errors,

  catalogEntries: entries,

  catalogLines: entries.map(
   e => JSON.stringify(e)
  ),

  note: 'ready means candidate, not human-verified. Test track identity and playback before setting verified=true.'
 });
}

/*
 * Read-only track diagnostics.
 */
async function debugTracks(albumId) {
 if (!/^\d{1,10}$/.test(albumId)) {
  return response({
   success: false,
   version: VERSION,
   error: 'invalid_album_id'
  }, 400);
 }

 const songs = await getTracks(albumId);

 const tracks = songs.map(trackInfo);

 return response({
  success: true,
  version: VERSION,
  mode: 'tracks_debug',
  source: 'OSTMusic.org',
  albumId,
  tracksCount: tracks.length,

  playableCount: tracks.filter(
   isPlayable
  ).length,

  tracks: tracks.map(t => ({
   ...t,
   eligible: isClean(t)
  })),

  note: 'playable reflects source metadata, not an independent playback test. No catalog changes are made.'
 });
}

/*
 * Cloudflare Worker entry point.
 */
export default {
 async fetch(request) {
  if (request.method === 'OPTIONS') {
   return new Response(null, {
    status: 204,
    headers: HEADERS
   });
  }

  if (
   !['GET', 'POST'].includes(request.method)
  ) {
   return response({
    success: false,
    error: 'method_not_allowed'
   }, 405);
  }

  const url = new URL(request.url);

  try {
   if (request.method === 'POST') {
    let body;

    try {
     body = await request.json();
    } catch (_) {
     return response({
      success: false,
      version: VERSION,
      error: 'invalid_json'
     }, 400);
    }

    const raw = Array.isArray(body)
     ? body
     : body?.movies;

    const limit = Math.max(
     1,
     Math.min(
      MAX_BATCH,
      Number(body?.limit) || DEFAULT_LIMIT
     )
    );

    return batchSearch(
     raw,
     limit,
     body?.skipExisting !== false
    );
   }

   if (
    url.searchParams.get('debug') === 'tracks'
   ) {
    return debugTracks(
     String(
      url.searchParams.get('albumId') || ''
     ).trim()
    );
   }

   if (
    url.searchParams.get('batch') === '1'
   ) {
    const titles = url.searchParams.get('titles');

    const raw = titles
     ? titles
       .split('|')
       .map(s => s.trim())
       .filter(Boolean)
     : DEFAULT_MOVIES;

    const limit = Math.max(
     1,
     Math.min(
      MAX_BATCH,
      Number(
       url.searchParams.get('limit')
      ) || DEFAULT_LIMIT
     )
    );

    return batchSearch(
     raw,
     limit,
     url.searchParams.get('skipExisting') !== '0'
    );
   }

   const title = String(
    url.searchParams.get('title') || ''
   ).trim();

   const year = yearNum(
    url.searchParams.get('year')
   );

   const debug =
    url.searchParams.get('debug') === 'search';

   if (!title) {
    const catalog = await loadCatalog();

    return response({
     success: true,
     service: 'Original Soundtrack',
     version: VERSION,
     catalogUrl: CATALOG_URL,
     catalogVersion: catalog?.version || null,
     catalogMovies: catalog?.movies.length || 0,

     endpoints: {
      search: '?title=Interstellar&year=2014',
      debug: '?title=The%20X-Files&year=1993&debug=search',
      tracks: '?albumId=871&debug=tracks',
      batch: '?batch=1&limit=5',
      includeExisting: '?batch=1&skipExisting=0'
     },

     maxBatch: MAX_BATCH,
     searchBudget: SEARCH_BUDGET
    });
   }

   if (title.length > 150) {
    return response({
     success: false,
     error: 'title_too_long'
    }, 400);
   }

   return singleSearch(
    title,
    year,
    debug
   );
  } catch (e) {
   return response({
    success: false,
    version: VERSION,
    error: 'worker_error',
    message: String(e.message || e)
   }, 502);
  }
 }
};
