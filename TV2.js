(function () {  
  'use strict';  
  
  // Constants  
  const CONSTANTS = {  
    OSD_HIDE_TIMEOUT: 3000,  
    HISTORY_TRACKING_DELAY: 10000,  
    MAX_HISTORY_ITEMS: 100,  
    MAX_NEIGHBOR_CHANNELS: 5,  
    EPG_FADE_TIMEOUT: 350,  
    EPG_HIDE_TIMEOUT: 280,  
    MAX_SEARCH_RESULTS: 50,  
    MAX_VISIBLE_CHANNELS: 1000  
  };  
  
  const EPG_PRESETS = {  
    auto: { label: 'Авто' },  
    playlist: { label: 'Из плейлиста' },  
    epgpw_ru: { label: 'epg.pw — Россия', url: 'https://epg.pw/xmltv/epg_RU.xml.gz' },  
    epgpw_ua: { label: 'epg.pw — Украина', url: 'https://epg.pw/xmltv/epg_UA.xml.gz' },  
    epgpw_cy: { label: 'epg.pw — Кипр', url: 'https://epg.pw/xmltv/epg_CY.xml.gz' },  
    epgpw_de: { label: 'epg.pw — Германия', url: 'https://epg.pw/xmltv/epg_DE.xml.gz' },  
    epgpw_us: { label: 'epg.pw — США', url: 'https://epg.pw/xmltv/epg_US.xml.gz' },  
    epgpw_gb: { label: 'epg.pw — Великобритания', url: 'https://epg.pw/xmltv/epg_GB.xml.gz' },  
    epgpw_tr: { label: 'epg.pw — Турция', url: 'https://epg.pw/xmltv/epg_TR.xml.gz' },  
    epgpw_fr: { label: 'epg.pw — Франция', url: 'https://epg.pw/xmltv/epg_FR.xml.gz' },  
    custom: { label: 'Свой URL' }  
  };  
  
  const DEFAULTS = {  
    liptv_m3u_url: '',  
    liptv_epg_url: '',  
    liptv_epg_source: 'auto',  
    liptv_view_mode: 'list',  
    liptv_favorites: [],  
    liptv_history: [],  
    liptv_blacklist: []  
  };  
  
  const VIRTUAL_GROUPS = ['Все', 'Избранное', 'История'];  
  
  const KEY = {  
    CH_UP: [166, 33],  
    CH_DOWN: [167, 34],  
    OK: [13],  
    BACK: [8, 27],  
    LEFT: [37],  
    UP: [38],  
    DOWN: [40]  
  };  
  
  // Utility functions  
  function djb2(str) {  
    let hash = 5381;  
    for (let i = 0; i < str.length; i++) {  
      hash = ((hash << 5) + hash) + str.charCodeAt(i);  
      hash = hash & hash;  
    }  
    return Math.abs(hash).toString(36);  
  }  
  
  function esc(str) {  
    if (!str) return '';  
    return String(str)  
      .replace(/&/g, '&amp;')  
      .replace(/</g, '&lt;')  
      .replace(/>/g, '&gt;')  
      .replace(/"/g, '&quot;');  
  }  
  
  function validateUrl(url) {  
    if (!url || typeof url !== 'string') return false;  
    try {  
      const urlObj = new URL(url);  
      return ['http:', 'https:'].includes(urlObj.protocol);  
    } catch {  
      return false;  
    }  
  }  
  
  function isKey(keyCode, group) {  
    return group.indexOf(keyCode) !== -1;  
  }  
  
  function fmt(date) {  
    if (!date) return '';  
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });  
  }  
  
  function formatTime(ts) {  
    if (!ts) return '';  
    const d = (ts instanceof Date) ? ts : new Date(ts);  
    const h = d.getHours();  
    const m = d.getMinutes();  
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);  
  }  
  
  // M3U parsing  
  function parseM3U(text) {  
    if (!text || typeof text !== 'string') {  
      throw new Error('Invalid M3U data');  
    }  
  
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);  
    const channels = [];  
    const groupSet = new Set();  
    let playlistEpgUrl = null;  
  
    if (lines[0] && lines[0].startsWith('#EXTM3U')) {  
      const m = lines[0].match(/tvg-url="([^"]+)"/);  
      if (m) playlistEpgUrl = m[1];  
    }  
  
    for (let i = 0; i < lines.length; i++) {  
      const line = lines[i];  
      if (!line.startsWith('#EXTINF:')) continue;  
  
      const urlLine = lines[i + 1];  
      if (!urlLine || urlLine.startsWith('#')) continue;  
  
      const tvgId = (line.match(/tvg-id="([^"]*)"/) || ['', ''])[1];  
      const name = (line.match(/,(.+)$/) || ['', 'Unknown'])[1].trim();  
      const logo = (line.match(/tvg-logo="([^"]*)"/) || ['', ''])[1];  
      const group = (line.match(/group-title="([^"]*)"/) || ['', 'Other'])[1];  
  
      if (!name) continue;  
  
      groupSet.add(group);  
      const id = tvgId || djb2(name + urlLine);  
      channels.push({ id, name, url: urlLine, logo, group, tvgId });  
    }  
  
    return { channels, groups: [...groupSet], playlistEpgUrl };  
  }  
  
  async function fetchM3U(url) {  
    if (!validateUrl(url)) {  
      throw new Error('Invalid M3U URL');  
    }  
  
    try {  
      const response = await fetch(url, {   
        timeout: 10000,  
        headers: { 'User-Agent': 'Lampa-IPTV/1.0' }  
      });  
        
      if (!response.ok) {  
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);  
      }  
        
      const text = await response.text();  
      return parseM3U(text);  
    } catch (error) {  
      console.error('[lampa-iptv] M3U fetch error:', error);  
      throw new Error(`Не вдалося завантажити плейлист: ${error.message}`);  
    }  
  }  
  
  // EPG handling  
  function normalizeName(name) {  
    if (!name) return '';  
    let s = name.toLowerCase();  
    s = s.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');  
    s = s.replace(/\b(hd|sd|fhd|uhd|4k)\s*$/g, '');  
    s = s.replace(/\s+/g, ' ').trim();  
    return s;  
  }  
  
  function detectCountries(channels, maxCount) {  
    const counts = {};  
    channels.forEach(ch => {  
      if (!ch.tvgId) return;  
      const base = ch.tvgId.replace(/@.*$/, '');  
      const match = base.match(/\.([a-z]{2})$/i);  
      if (!match) return;  
      const cc = match[1].toUpperCase();  
      counts[cc] = (counts[cc] || 0) + 1;  
    });  
    return Object.entries(counts)  
      .sort((a, b) => b[1] - a[1])  
      .slice(0, maxCount)  
      .map(e => e[0]);  
  }  
  
  function buildChannelMapping(epgChannels, playlistChannels) {  
    const mapping = new Map();  
    const tvgIdToId = {};  
    const nameToId = {};  
  
    playlistChannels.forEach(ch => {  
      if (ch.tvgId) tvgIdToId[ch.tvgId] = ch.id;  
      const norm = normalizeName(ch.name);  
      if (norm && !nameToId[norm]) nameToId[norm] = ch.id;  
    });  
  
    epgChannels.forEach(epgCh => {  
      if (tvgIdToId[epgCh.id] !== undefined) {  
        mapping.set(epgCh.id, tvgIdToId[epgCh.id]);  
        return;  
      }  
      const norm = normalizeName(epgCh.displayName);  
      if (norm && nameToId[norm] !== undefined) {  
        mapping.set(epgCh.id, nameToId[norm]);  
      }  
    });  
    return mapping;  
  }  
  
  function resolveEpgUrls(sourceKey, channels, playlistEpgUrl, customUrl) {  
    if (sourceKey === 'auto') {  
      if (playlistEpgUrl && playlistEpgUrl.trim()) {  
        return { urls: [playlistEpgUrl.trim()], needsMapping: false };  
      }  
      const countries = detectCountries(channels, 3);  
      const withCountry = channels.filter(ch => {  
        if (!ch.tvgId) return false;  
        const base = ch.tvgId.replace(/@.*$/, '');  
        return /\.[a-z]{2}$/i.test(base);  
      }).length;  
        
      if (channels.length > 0 && withCountry / channels.length < 0.3) {  
        return { urls: [], needsMapping: true };  
      }  
        
      const urls = countries.map(cc => `https://epg.pw/xmltv/epg_${cc}.xml.gz`);  
      return { urls, needsMapping: true };  
    }  
      
    if (sourceKey === 'playlist') {  
      if (playlistEpgUrl && playlistEpgUrl.trim()) {  
        return { urls: [playlistEpgUrl.trim()], needsMapping: false };  
      }  
      return { urls: [], needsMapping: false };  
    }  
      
    if (sourceKey === 'custom') {  
      if (customUrl && customUrl.trim() && validateUrl(customUrl)) {  
        return { urls: [customUrl.trim()], needsMapping: false };  
      }  
      return { urls: [], needsMapping: false };  
    }  
      
    const preset = EPG_PRESETS[sourceKey];  
    if (preset && preset.url) {  
      return { urls: [preset.url], needsMapping: true };  
    }  
    return { urls: [], needsMapping: false };  
  }  
  
  function parseXmltvDate(str) {  
    if (!str) return null;  
    const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{2})(\d{2})/);  
    if (!m) return null;  
    const [, yr, mo, dy, hr, mn, sc, tzH, tzM] = m;  
    return new Date(`${yr}-${mo}-${dy}T${hr}:${mn}:${sc}${tzH}:${tzM}`);  
  }  
  
  function parseXMLTV(xmlText) {  
    if (!xmlText) return { programs: {}, channels: [] };  
      
    try {  
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');  
      const programs = {};  
      const channels = [];  
  
      doc.querySelectorAll('channel').forEach(node => {  
        const id = node.getAttribute('id');  
        const dn = node.querySelector('display-name');  
        if (id) channels.push({ id, displayName: dn ? dn.textContent : '' });  
      });  
  
      doc.querySelectorAll('programme').forEach(node => {  
        const channelId = node.getAttribute('channel');  
        const start = parseXmltvDate(node.getAttribute('start'));  
        const stop = parseXmltvDate(node.getAttribute('stop'));  
        const title = node.querySelector('title')?.textContent || '';  
        const desc = node.querySelector('desc')?.textContent || '';  
          
        if (!channelId || !start) return;  
        if (!programs[channelId]) programs[channelId] = [];  
        programs[channelId].push({ channelId, title, start, stop, desc });  
      });  
        
      Object.keys(programs).forEach(id => programs[id].sort((a, b) => a.start - b.start));  
      return { programs, channels };  
    } catch (error) {  
      console.error('[lampa-iptv] XMLTV parse error:', error);  
      return { programs: {}, channels: [] };  
    }  
  }  
  
  async function fetchXmlText(url) {  
    if (!validateUrl(url)) return null;  
  
    try {  
      const res = await fetch(url, { timeout: 15000 });  
      if (!res.ok) return null;  
        
      const buf = await res.arrayBuffer();  
      const bytes = new Uint8Array(buf);  
        
      if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {  
        if (typeof DecompressionStream !== 'undefined') {  
          try {  
            const ds = new DecompressionStream('gzip');  
            const stream = new Response(new Blob([buf]).stream().pipeThrough(ds));  
            return await stream.text();  
          } catch (e) {  
            console.warn('[lampa-iptv] Gzip decompression failed:', e);  
          }  
        }  
          
        const fallbackUrl = url.replace(/\.gz$/, '');  
        if (fallbackUrl !== url) {  
          try {  
            const res2 = await fetch(fallbackUrl, { timeout: 10000 });  
            if (res2.ok) return await res2.text();  
          } catch (e) {  
            console.warn('[lampa-iptv] Fallback fetch failed:', e);  
          }  
        }  
        return null;  
      }  
      return new TextDecoder().decode(buf);  
    } catch (error) {  
      console.error('[lampa-iptv] XML fetch error:', error);  
      return null;  
    }  
  }  
  
  // EPG module  
  const epg = {  
    _programs: {},  
    _urls: [],  
    _playlistChannels: [],  
    _needsMapping: false,  
    _listeners: new Set(),  
  
    reset() {  
      this._programs = {};  
      this._urls = [];  
      this._playlistChannels = [];  
      this._needsMapping = false;  
    },  
  
    init(urls, playlistChannels, needsMapping) {  
      this._urls = urls || [];  
      this._playlistChannels = playlistChannels || [];  
      this._needsMapping = !!needsMapping;  
    },  
  
    async fetchInBackground() {  
      if (this._urls.length === 0) return;  
        
      for (let i = 0; i < this._urls.length; i++) {  
        try {  
          const text = await fetchXmlText(this._urls[i]);  
          if (!text) continue;  
            
          const parsed = parseXMLTV(text);  
  
          if (this._needsMapping && this._playlistChannels.length > 0) {  
            const mapping = buildChannelMapping(parsed.channels, this._playlistChannels);  
            mapping.forEach((playlistId, epgId) => {  
              if (parsed.programs[epgId] && !this._programs[playlistId]) {  
                this._programs[playlistId] = parsed.programs[epgId];  
              }  
            });  
              
            Object.keys(parsed.programs).forEach(epgId => {  
              if (!this._programs[epgId]) this._programs[epgId] = parsed.programs[epgId];  
            });  
          } else {  
            Object.keys(parsed.programs).forEach(id => {  
              if (!this._programs[id]) this._programs[id] = parsed.programs[id];  
            });  
          }  
        } catch (e) {  
          console.warn('[lampa-iptv] EPG fetch failed:', e.message);  
        }  
      }  
        
      if (Object.keys(this._programs).length > 0) {  
        this._notifyListeners();  
      }  
    },  
  
    _notifyListeners() {  
      this._listeners.forEach(callback => {  
        try {  
          callback();  
        } catch (e) {  
          console.error('[lampa-iptv] EPG listener error:', e);  
        }  
      });  
    },  
  
    addListener(callback) {  
      this._listeners.add(callback);  
      return () => this._listeners.delete(callback);  
    },  
  
    getCurrent(channelId) {  
      const list = this._programs[channelId];  
      if (!list) return null;  
      const now = new Date();  
      return list.find(p => p.start <= now && (!p.stop || p.stop > now)) || null;  
    },  
  
    getNext(channelId) {  
      const list = this._programs[channelId];  
      if (!list) return null;  
      const now = new Date();  
      return list.find(p => p.start > now) || null;  
    },  
  
    getAll(channelId) {  
      return this._programs[channelId] || [];  
    }  
  };  
  
  // Storage module  
  function get(key) {   
    return Lampa.Storage.get(key, DEFAULTS[key]);   
  function set(key, val) {   
    Lampa.Storage.set(key, val);   
  }  
  
  const storage = {  
    getM3uUrl: () => get('liptv_m3u_url'),  
    setM3uUrl: (v) => set('liptv_m3u_url', v),  
    getEpgUrl: () => get('liptv_epg_url'),  
    setEpgUrl: (v) => set('liptv_epg_url', v),  
    getEpgSource: () => get('liptv_epg_source'),  
    setEpgSource: (v) => set('liptv_epg_source', v),  
    getViewMode: () => get('liptv_view_mode'),  
    setViewMode: (v) => set('liptv_view_mode', v),  
  
    getFavorites: () => get('liptv_favorites'),  
    addFavorite: (id) => {   
      const f = get('liptv_favorites');   
      if (!f.includes(id)) set('liptv_favorites', [...f, id]);   
    },  
    removeFavorite: (id) => set('liptv_favorites', get('liptv_favorites').filter(x => x !== id)),  
    isFavorite: (id) => get('liptv_favorites').includes(id),  
  
    getHistory: () => get('liptv_history'),  
    addHistory: (id) => {  
      let h = get('liptv_history').filter(x => x.id !== id);  
      h.unshift({ id, ts: Date.now() });  
      if (h.length > CONSTANTS.MAX_HISTORY_ITEMS) h = h.slice(0, CONSTANTS.MAX_HISTORY_ITEMS);  
      set('liptv_history', h);  
    },  
    clearHistory: () => set('liptv_history', []),  
  
    getBlacklist: () => get('liptv_blacklist'),  
    addBlacklist: (id) => {   
      const bl = get('liptv_blacklist');   
      if (!bl.includes(id)) set('liptv_blacklist', [...bl, id]);   
    },  
    removeBlacklist: (id) => set('liptv_blacklist', get('liptv_blacklist').filter(x => x !== id)),  
    isBlacklisted: (id) => get('liptv_blacklist').includes(id),  
  };  
  
  // CSS Styles  
  const CSS = `  
/* ── Layout ───────────────────────────────────── */  
.liptv-container {  
  width: 100%;  
  height: 100%;  
  overflow: hidden;  
}  
.liptv-wrap {  
  display: flex;  
  flex-direction: column;  
  height: 100%;  
}  
  
/* ── Toolbar ──────────────────────────────────── */  
.liptv-toolbar {  
  display: flex;  
  gap: 1em;  
  padding: 1em 1.5em 0.5em;  
  flex-shrink: 0;  
}  
.liptv-btn {  
  padding: 0.5em 1.2em;  
  border-radius: 0.5em;  
  background: rgba(255,255,255,0.08);  
  color: #fff;  
  font-size: 1em;  
  cursor: pointer;  
  white-space: nowrap;  
}  
.liptv-btn.focus {  
  background: rgba(255,255,255,0.28);  
  color: #fff;  
}  
  
/* ── Body: sidebar + channels ─────────────────── */  
.liptv-body {  
  display: flex;  
  flex: 1;  
  overflow: hidden;  
}  
  
/* ── Sidebar (groups) ─────────────────────────── */  
.liptv-sidebar {  
  width: 15em;  
  flex-shrink: 0;  
  overflow-y: auto;  
  padding: 0.5em 0 0.5em 1.5em;  
}  
.liptv-group {  
  padding: 0.5em 1em;  
  margin-bottom: 0.2em;  
  border-radius: 0.4em;  
  color: rgba(255,255,255,0.6);  
  font-size: 0.95em;  
  cursor: pointer;  
  white-space: nowrap;  
  overflow: hidden;  
  text-overflow: ellipsis;  
}  
.liptv-group.active {  
  color: #fff;  
  background: rgba(255,255,255,0.1);  
}  
.liptv-group.focus {  
  color: #fff;  
  background: rgba(255,255,255,0.22);  
}  
  
/* ── Channel list (list mode) ─────────────────── */  
.liptv-channels {  
  flex: 1;  
  overflow-y: auto;  
  padding: 0.5em 1.5em 2em 1em;  
}  
.liptv-row {  
  display: flex;  
  align-items: center;  
  gap: 1em;  
  padding: 0.6em 1em;  
  margin-bottom: 0.2em;  
  border-radius: 0.5em;  
  cursor: pointer;  
}  
.liptv-row.focus {  
  background: rgba(255,255,255,0.15);  
}  
.liptv-logo {  
  width: 3.5em;  
  height: 3.5em;  
  object-fit: contain;  
  flex-shrink: 0;  
  border-radius: 0.3em;  
}  
.liptv-no-logo {  
  background: rgba(255,255,255,0.05);  
}  
.liptv-row-info {  
  flex: 1;  
  min-width: 0;  
}  
.liptv-row-name {  
  color: #fff;  
  font-size: 1.05em;  
  white-space: nowrap;  
  overflow: hidden;  
  text-overflow: ellipsis;  
}  
.liptv-row-prog {  
  color: rgba(255,255,255,0.45);  
  font-size: 0.85em;  
  margin-top: 0.15em;  
  white-space: nowrap;  
  overflow: hidden;  
  text-overflow: ellipsis;  
}  
  
/* ── Channel grid (grid mode) ─────────────────── */  
.liptv-channels.grid {  
  display: flex;  
  flex-wrap: wrap;  
  gap: 1em;  
  align-content: flex-start;  
}  
.liptv-tile {  
  width: 8em;  
  display: flex;  
  flex-direction: column;  
  align-items: center;  
  padding: 0.8em;  
  border-radius: 0.5em;  
  cursor: pointer;  
}  
.liptv-tile.focus {  
  background: rgba(255,255,255,0.15);  
}  
.liptv-tile .liptv-logo {  
  width: 5em;  
  height: 5em;  
  margin-bottom: 0.4em;  
}  
.liptv-tile-name {  
  color: #fff;  
  font-size: 0.85em;  
  text-align: center;  
  max-width: 100%;  
  overflow: hidden;  
  text-overflow: ellipsis;  
  white-space: nowrap;  
}  
  
/* ── Empty state ──────────────────────────────── */  
.liptv-empty {  
  color: rgba(255,255,255,0.4);  
  font-size: 1.1em;  
  padding: 3em 1em;  
  text-align: center;  
}  
  
/* ── OSD mini-list (player overlay) ──────────── */  
.liptv-osd {  
  position: fixed;  
  bottom: 2em;  
  left: 2em;  
  z-index: 9999;  
  background: rgba(0,0,0,0.82);  
  -webkit-backdrop-filter: blur(10px);  
  backdrop-filter: blur(10px);  
  border-radius: 10px;  
  padding: 0.6em 0.8em;  
  min-width: 18em;  
  transform: translateX(-110%);  
  opacity: 0;  
  transition: transform 300ms ease-out, opacity 300ms ease-out;  
  pointer-events: none;  
}  
.liptv-osd.visible {  
  transform: translateX(0);  
  opacity: 1;  
  pointer-events: auto;  
}  
.liptv-osd.fade-out {  
  transform: translateX(0);  
  opacity: 0;  
  transition: opacity 300ms ease-in;  
}  
.liptv-osd-item {  
  display: flex;  
  align-items: center;  
  gap: 0.5em;  
  padding: 0.25em 0;  
  opacity: 0.4;  
}  
.liptv-osd-item.current {  
  opacity: 1;  
  background: rgba(255,255,255,0.1);  
  border-radius: 5px;  
  padding: 0.35em 0.5em;  
  margin: 0.15em -0.5em;  
}  
.liptv-osd-num {  
  color: #999;  
  font-size: 0.8em;  
  width: 2em;  
  text-align: right;  
  flex-shrink: 0;  
}  
.liptv-osd-item.current .liptv-osd-num {  
  background: #e63946;  
  color: #fff;  
  font-weight: bold;  
  font-size: 0.75em;  
  padding: 0.15em 0.35em;  
  border-radius: 3px;  
  width: auto;  
  text-align: center;  
}  
.liptv-osd-name {  
  color: #ccc;  
  font-size: 0.9em;  
  white-space: nowrap;  
  overflow: hidden;  
  text-overflow: ellipsis;  
}  
.liptv-osd-item.current .liptv-osd-name {  
  color: #fff;  
  font-weight: 600;  
}  
.liptv-osd-prog {  
  color: rgba(255,255,255,0.5);  
  font-size: 0.72em;  
  white-space: nowrap;  
  overflow: hidden;  
  text-overflow: ellipsis;  
}  
  
/* ── EPG sidebar ─────────────────────────────── */  
.liptv-epg {  
  position: fixed;  
  top: 0;  
  right: 0;  
  bottom: 0;  
  width: 40%;  
  z-index: 10000;  
  background: rgba(0,0,0,0.88);  
  -webkit-backdrop-filter: blur(12px);  
  backdrop-filter: blur(12px);  
  padding: 1.2em 1em;  
  overflow-y: auto;  
  transform: translateX(100%);  
  transition: transform 300ms ease-out;  
}  
.liptv-epg.visible {  
  transform: translateX(0);  
}  
.liptv-epg.hiding {  
  transform: translateX(100%);  
  transition: transform 250ms ease-in;  
}  
.liptv-epg-title {  
  color: #fff;  
  font-size: 1.05em;  
  font-weight: 600;  
  padding-bottom: 0.5em;  
  margin-bottom: 0.6em;  
  border-bottom: 1px solid rgba(255,255,255,0.1);  
}  
.liptv-epg-item {  
  padding: 0.4em 0.5em;  
  margin-bottom: 0.15em;  
  border-radius: 0 4px 4px 0;  
}  
.liptv-epg-item.past {  
  opacity: 0.35;  
}  
.liptv-epg-item.now {  
  background: rgba(230,57,70,0.2);  
  border-left: 3px solid #e63946;  
}  
.liptv-epg-item.focus {  
  background: rgba(255,255,255,0.1);  
}  
.liptv-epg-item.now.focus {  
  background: rgba(230,57,70,0.35);  
}  
.liptv-epg-time {  
  font-size: 0.75em;  
  color: rgba(255,255,255,0.4);  
}  
.liptv-epg-item.now .liptv-epg-time {  
  color: #e63946;  
  font-weight: 500;  
}  
.liptv-epg-prog-title {  
  font-size: 0.88em;  
  color: rgba(255,255,255,0.7);  
  margin-top: 0.1em;  
}  
.liptv-epg-item.now .liptv-epg-prog-title {  
  color: #fff;  
  font-weight: 500;  
}  
.liptv-epg-progress {  
  height: 2px;  
  background: rgba(255,255,255,0.15);  
  border-radius: 1px;  
  margin-top: 0.3em;  
  overflow: hidden;  
}  
.liptv-epg-progress-fill {  
  height: 100%;  
  background: #e63946;  
}  
.liptv-epg-empty {  
  color: rgba(255,255,255,0.4);  
  text-align: center;  
  padding: 3em 1em;  
  font-size: 0.95em;  
}  
`;  
  
  // Inject styles  
  function injectStyles() {  
    if (document.getElementById('liptv-styles')) return;  
    const style = document.createElement('style');  
    style.id = 'liptv-styles';  
    style.textContent = CSS;  
    document.head.appendChild(style);  
  }  
  
  // UI Components  
  function showEpgScreen(channel) {  
    const programs = epg.getAll(channel.id);  
    if (programs.length === 0) {  
      Lampa.Noty.show('Программа передач недоступна');  
      return;  
    }  
  
    const now = new Date();  
    Lampa.Select.show({  
      title: channel.name + ' — Программа',  
      items: programs.map(p => ({  
        title: fmt(p.start) + '–' + fmt(p.stop) + '  ' + p.title,  
        subtitle: p.desc || '',  
        selected: p.start <= now && (!p.stop || p.stop > now)  
      })),  
      onSelect: () => {}  
    });  
  }  
  
  function showCard(channel, onClose) {  
    const cur = epg.getCurrent(channel.id);  
    const next = epg.getNext(channel.id);  
    const isFav = storage.isFavorite(channel.id);  
  
    const actionItems = [  
      { title: '▶ Смотреть', fn: () => playChannel(channel) },  
      { title: isFav ? '★ Убрать из избранного' : '☆ В избранное',   
        fn: () => { toggleFav(channel); if (onClose) onClose(); } },  
      { title: '📋 Программа', fn: () => showEpgScreen(channel) },  
      { title: '🚫 Скрыть',   
        fn: () => { storage.addBlacklist(channel.id); Lampa.Noty.show('"' + channel.name + '" скрыт'); if (onClose) onClose(); } }  
    ];  
  
    Lampa.Select.show({  
      title: channel.name,  
      items: [  
        { title: cur ? 'Сейчас: ' + cur.title : 'Сейчас: —', noclick: true },  
        { title: next ? 'Далее: ' + next.title : 'Далее: —', noclick: true },  
        { separator: true }  
      ].concat(actionItems),  
      onSelect: (item) => {  
        if (typeof item.fn === 'function') item.fn();  
      }  
    });  
  }  
  
  let _onPlay = null;  
  function setOnPlay(fn) { _onPlay = fn; }  
  
  function playChannel(channel) {  
    if (typeof _onPlay === 'function') _onPlay(channel);  
    Lampa.Player.play({ url: channel.url, title: channel.name, iptv: true });  
  }  
  
  function toggleFav(channel) {  
    if (storage.isFavorite(channel.id)) {  
      storage.removeFavorite(channel.id);  
      Lampa.Noty.show('Удалено из избранного');  
    } else {  
      storage.addFavorite(channel.id);  
      Lampa.Noty.show('Добавлено в избранное');  
    }  
  }  
  
  // Channel filtering utility  
  function filterChannels(channels, currentGroup) {  
    const blacklist = storage.getBlacklist();  
    let list = channels.filter(ch => !blacklist.includes(ch.id));  
  
    if (currentGroup === 'Избранное') {  
      const favs = storage.getFavorites();  
      list = list.filter(ch => favs.includes(ch.id));  
    } else if (currentGroup === 'История') {  
      const history = storage.getHistory();  
      const rank = {};  
      history.forEach((h, i) => { rank[h.id] = i; });  
      list = list  
        .filter(ch => ch.id in rank)  
        .sort((a, b) => rank[a.id] - rank[b.id]);  
    } else if (currentGroup !== 'Все') {  
      list = list.filter(ch => ch.group === currentGroup);  
    }  
    return list;  
  }  
  
  // Main screen component  
  function createMainScreen(allChannels, onChannelSelect) {  
    let currentGroup = 'Все';  
    let viewMode = storage.getViewMode();  
    let _epgListenerCleanup = null;  
  
    const groups = VIRTUAL_GROUPS.concat(  
      [...new Set(allChannels.map(ch => ch.group))].filter(Boolean)  
    );  
  
    function channelHtml(ch) {  
      const cur = epg.getCurrent(ch.id);  
      const prog = cur ? esc(cur.title) : '';  
      const logo = ch.logo  
        ? '<img class="liptv-logo" src="' + esc(ch.logo) + '" onerror="this.style.display=\'none\'">'  
        : '<div class="liptv-logo liptv-no-logo"></div>';  
  
      if (viewMode === 'grid') {  
        return '<div class="liptv-tile selector" data-id="' + esc(ch.id) + '">'  
          + logo  
          + '<div class="liptv-tile-name">' + esc(ch.name) + '</div>'  
          + '</div>';  
      }  
      return '<div class="liptv-row selector" data-id="' + esc(ch.id) + '">'  
        + logo  
        + '<div class="liptv-row-info">'  
        + '<div class="liptv-row-name">' + esc(ch.name) + '</div>'  
        + '<div class="liptv-row-prog">' + prog + '</div>'  
        + '</div>'  
        + '</div>';  
    }  
  
    function render(body) {  
      const visible = filterChannels(allChannels, currentGroup);  
        
      // Limit visible channels for performance  
      const limitedVisible = visible.slice(0, CONSTANTS.MAX_VISIBLE_CHANNELS);  
        
      const groupsHtml = groups.map(g => {  
        return '<div class="liptv-group selector' + (g === currentGroup ? ' active' : '') + '" data-group="' + esc(g) + '">' + esc(g) + '</div>';  
      }).join('');  
        
      const channelsHtml = limitedVisible.length  
        ? limitedVisible.map(channelHtml).join('')  
        : '<div class="liptv-empty">Нет каналов</div>';  
  
      body.empty().append(  
        '<div class="liptv-wrap">'  
          + '<div class="liptv-toolbar">'  
          + '<div class="liptv-btn selector" data-action="search">Поиск</div>'  
          + '<div class="liptv-btn selector" data-action="toggle">'  
          + (viewMode === 'list' ? '⊞ Сетка' : '☰ Список')  
          + '</div>'  
          + '</div>'  
          + '<div class="liptv-body">'  
          + '<div class="liptv-sidebar">' + groupsHtml + '</div>'  
          + '<div class="liptv-channels ' + viewMode + '">' + channelsHtml + '</div>'  
          + '</div>'  
          + '</div>'  
      );  
  
      // Event handlers  
      body.find('[data-group]').on('hover:enter', function() {  
        currentGroup = $(this).data('group');  
        render(body);  
      });  
  
      body.find('[data-action="toggle"]').on('hover:enter', function() {  
        viewMode = viewMode === 'list' ? 'grid' : 'list';  
        storage.setViewMode(viewMode);  
        render(body);  
      });  
  
      body.find('[data-action="search"]').on('hover:enter', function() {  
        onChannelSelect(null, 'search');  
      });  
  
      body.find('[data-id]').on('hover:enter', function() {  
        const id = $(this).data('id');  
        const ch = allChannels.find(c => c.id === id);  
        if (ch) playChannel(ch);  
      }).on('hover:long', function() {  
        const id = $(this).data('id');  
        const ch = allChannels.find(c => c.id === id);  
        if (ch) onChannelSelect(ch, 'card');  
      });  
  
      Lampa.Controller.toggle('content');  
    }  
  
    // EPG update handler with proper cleanup  
    function onEpgLoaded() {  
      const channelElements = document.querySelectorAll('.liptv-row[data-id], .liptv-tile[data-id]');  
      channelElements.forEach(el => {  
        const cur = epg.getCurrent(el.dataset.id);  
        const progEl = el.querySelector('.liptv-row-prog');  
        if (progEl && cur) {  
          progEl.textContent = cur.title;  
        }  
      });  
    }  
  
    // Initialize EPG listener with cleanup  
    _epgListenerCleanup = epg.addListener(onEpgLoaded);  
  
    return {  
      render: render,  
      destroy: function() {  
        if (_epgListenerCleanup) {  
          _epgListenerCleanup();  
          _epgListenerCleanup = null;  
        }  
      }  
    };  
  }  
  
  // Search functionality  
  function showSearch(allChannels) {  
    if (Lampa.Keypad && typeof Lampa.Keypad.show === 'function') {  
      Lampa.Keypad.show({  
        title: 'Поиск',  
        value: '',  
        confirm: function(query) { doSearch(query, allChannels); }  
      });  
    } else {  
      const query = window.prompt('Поиск (название канала или передачи):');  
      if (query) doSearch(query, allChannels);  
    }  
  }  
  
  function doSearch(query, allChannels) {  
    const q = (query || '').toLowerCase().trim();  
    if (!q) return;  
  
    const byName = allChannels.filter(ch => ch.name.toLowerCase().includes(q));  
    const nameIds = new Set(byName.map(ch => ch.id));  
    const byProg = allChannels.filter(ch => {  
      return !nameIds.has(ch.id) &&  
        epg.getAll(ch.id).some(p => p.title.toLowerCase().includes(q));  
    });  
      
    const results = byName.concat(byProg).slice(0, CONSTANTS.MAX_SEARCH_RESULTS);  
  
    if (results.length === 0) {  
      Lampa.Noty.show('Ничего не найдено');  
      return;  
    }  
  
    Lampa.Select.show({  
      title: 'Результаты (' + results.length + ')',  
      items: results.map(ch => {  
        const cur = epg.getCurrent(ch.id);  
        return { title: ch.name, subtitle: cur ? cur.title : '', channel: ch };  
      }),  
      onSelect: function(item) { showCard(item.channel, function() {}); }  
    });  
  }  
  
  // URL input prompt  
  function promptUrl(title, current, callback) {  
    if (window.Lampa && Lampa.Keypad && typeof Lampa.Keypad.show === 'function') {  
      Lampa.Keypad.show({  
        title: title,  
        value: current,  
        confirm: callback  
      });  
    } else {  
      const val = window.prompt(title + ':', current);  
      if (val !== null) callback(val);  
    }  
  }  
  
  // Settings registration  
  function registerSettings(onM3uChange, onEpgChange) {  
    Lampa.SettingsApi.addComponent({  
      component: 'liptv',  
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>',  
      name: 'IPTV'  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: { name: 'liptv_m3u_url', type: 'trigger', default: false },  
      field: { name: 'M3U URL', description: storage.getM3uUrl() || 'Не задан' },  
      onChange: function() {  
        promptUrl('M3U URL', storage.getM3uUrl() || '', function(v) {  
          v = v.trim();  
          if (validateUrl(v)) {  
            storage.setM3uUrl(v);  
            if (typeof onM3uChange === 'function') onM3uChange(v);  
          } else {  
            Lampa.Noty.show('Некорректный URL');  
          }  
        });  
      }  
    });  
  
    const epgValues = {};  
    Object.keys(EPG_PRESETS).forEach(key => {  
      epgValues[key] = EPG_PRESETS[key].label;  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: {  
        name: 'liptv_epg_source',  
        type: 'select',  
        values: epgValues,  
        default: 'auto'  
      },  
      field: { name: 'Источник EPG' },  
      onChange: function() {  
        if (typeof onEpgChange === 'function') onEpgChange();  
      }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: { name: 'liptv_epg_url', type: 'trigger', default: false },  
      field: { name: 'EPG URL (свой)', description: storage.getEpgUrl() || 'Не задан' },  
      onChange: function() {  
        if (storage.getEpgSource() !== 'custom') {  
          Lampa.Noty.show('Выберите "Свой URL" в источнике EPG');  
          return;  
        }  
        promptUrl('EPG URL', storage.getEpgUrl() || '', function(v) {  
          v = v.trim();  
          if (validateUrl(v)) {  
            storage.setEpgUrl(v);  
            if (typeof onEpgChange === 'function') onEpgChange();  
          } else {  
            Lampa.Noty.show('Некорректный URL');  
          }  
        });  
      }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: {  
        name: 'liptv_view_mode',  
        type: 'select',  
        values: { list: 'Список', grid: 'Сетка' },  
        default: 'list'  
      },  
      field: { name: 'Режим отображения' },  
      onChange: function() { /* Lampa stores select value automatically */ }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: { name: 'liptv_hidden', type: 'trigger', default: false },  
      field: { name: 'Скрытые каналы', description: 'Каналы, убранные из списка' },  
      onChange: function() { showHiddenChannels(); }  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'liptv',  
      param: { name: 'liptv_clear_history', type: 'trigger', default: false },  
      field: { name: 'Очистить историю просмотров' },  
      onChange: function() {  
        storage.clearHistory();  
        Lampa.Noty.show('История очищена');  
      }  
    });  
  }  
  
  let _channelMap = {};  
  function setChannelMap(map) { _channelMap = map; }  
  
  function showHiddenChannels() {  
    const blacklist = storage.getBlacklist();  
    if (blacklist.length === 0) {  
      Lampa.Noty.show('Нет скрытых каналов');  
      return;  
    }  
  
    Lampa.Select.show({  
      title: 'Скрытые каналы',  
      items: blacklist.map(id => ({  
        title: _channelMap[id] || id,  
        subtitle: 'Нажмите для восстановления',  
        id: id  
      })),  
      onSelect: function(item) {  
        storage.removeBlacklist(item.id);  
        Lampa.Noty.show('Канал "' + item.title + '" восстановлен');  
      }  
    });  
  }  
  
  // OSD functionality  
  function getNeighbors(channels, currentIndex) {  
    const len = channels.length;  
    if (len === 0) return [];  
  
    const count = Math.min(CONSTANTS.MAX_NEIGHBOR_CHANNELS, len);  
    const half = Math.floor(count / 2);  
    const result = [];  
  
    for (let i = 0; i < count; i++) {  
      const offset = i - half;  
      const idx = ((currentIndex + offset) % len + len) % len;  
      result.push({  
        channel: channels[idx],  
        index: idx,  
        isCurrent: idx === currentIndex  
      });  
    }  
  
    return result;  
  }  
  
  function renderOsdHtml(neighbors) {  
    let html = '';  
    for (let i = 0; i < neighbors.length; i++) {  
      const item = neighbors[i];  
      const ch = item.channel;  
      const cls = 'liptv-osd-item' + (item.isCurrent ? ' current' : '');  
      let prog = '';  
  
      if (item.isCurrent) {  
        const cur = epg.getCurrent(ch.id);  
        prog = cur ? cur.title : '';  
      }  
  
      html += '<div class="' + cls + '">' +  
        '<span class="liptv-osd-num">' + (item.index + 1) + '</span>' +  
        '<span class="liptv-osd-name">' + esc(ch.name) + '</span>' +  
        (prog ? '<span class="liptv-osd-prog">' + esc(prog) + '</span>' : '') +  
        '</div>';  
    }  
    return html;  
  }  
  
  function renderEpgHtml(channel) {  
    const programs = epg.getAll(channel.id);  
    if (programs.length === 0) {  
      return '<div class="liptv-epg-title">' + esc(channel.name) + '</div>' +  
             '<div class="liptv-epg-empty">Нет данных о программе</div>';  
    }  
  
    const now = Date.now();  
    let html = '<div class="liptv-epg-title">' + esc(channel.name) + '</div>';  
  
    for (let i = 0; i < programs.length; i++) {  
      const p = programs[i];  
      const startMs = p.start ? p.start.getTime() : 0;  
      const stopMs = p.stop ? p.stop.getTime() : Infinity;  
      const isCurrent = startMs <= now && now < stopMs;  
      const isPast = stopMs <= now;  
  
      let cls = 'liptv-epg-item';  
      if (isPast) cls += ' past';  
      if (isCurrent) cls += ' now';  
  
      let progress = '';  
      if (isCurrent && p.stop && p.start) {  
        const total = stopMs - startMs;  
        const done = now - startMs;  
        const pct = total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;  
        progress = '<div class="liptv-epg-progress">' +  
                   '<div class="liptv-epg-progress-fill" style="width:' + pct + '%"></div>' +  
                   '</div>';  
      }  
  
      const timeStr = formatTime(p.start) + (p.stop ? ' – ' + formatTime(p.stop) : '');  
      const timeStrWithCurrent = timeStr + (isCurrent ? ' · Сейчас' : '');  
  
      html += '<div class="' + cls + '" data-epg-index="' + i + '">' +  
        '<div class="liptv-epg-time">' + timeStrWithCurrent + '</div>' +  
        '<div class="liptv-epg-prog-title">' + esc(p.title) + '</div>' +  
        progress +  
        '</div>';  
    }  
  
    return html;  
  }  
  
  function createOsd(channels, onSwitch) {  
    const osdEl = document.createElement('div');  
    osdEl.className = 'liptv-osd';  
  
    const epgEl = document.createElement('div');  
    epgEl.className = 'liptv-epg';  
  
    document.body.appendChild(osdEl);  
    document.body.appendChild(epgEl);  
  
    let _currentIndex = 0;  
    let _hideTimer = null;  
    let _epgVisible = false;  
    let _osdVisible = false;  
    let _epgItems = [];  
    let _epgFocusIdx = -1;  
  
    function show(currentIndex) {  
      _currentIndex = currentIndex;  
      _resetTimer();  
      _renderOsd();  
      osdEl.classList.add('visible');  
      osdEl.classList.remove('fade-out');  
      _osdVisible = true;  
    }  
  
    function hide() {  
      clearTimeout(_hideTimer);  
      _hideTimer = null;  
      osdEl.classList.remove('visible', 'fade-out');  
      _osdVisible = false;  
    }  
  
    function _renderOsd() {  
      const neighbors = getNeighbors(channels, _currentIndex);  
      osdEl.innerHTML = renderOsdHtml(neighbors);  
    }  
  
    function _resetTimer() {  
      clearTimeout(_hideTimer);  
      _hideTimer = setTimeout(() => {  
        osdEl.classList.add('fade-out');  
        setTimeout(() => {  
          osdEl.classList.remove('visible', 'fade-out');  
          _osdVisible = false;  
        }, CONSTANTS.EPG_FADE_TIMEOUT);  
      }, CONSTANTS.OSD_HIDE_TIMEOUT);  
    }  
  
    function showEpgSidebar(channel) {  
      hide();  
      epgEl.innerHTML = renderEpgHtml(channel);  
      epgEl.classList.add('visible');  
      epgEl.classList.remove('hiding');  
      _epgVisible = true;  
      _epgFocusIdx = -1;  
  
      _epgItems = epgEl.querySelectorAll('.liptv-epg-item');  
  
      const nowItem = epgEl.querySelector('.liptv-epg-item.now');  
      if (nowItem) {  
        const items = Array.prototype.slice.call(_epgItems);  
        _epgFocusIdx = items.indexOf(nowItem);  
        nowItem.classList.add('focus');  
        nowItem.scrollIntoView({ block: 'center', behavior: 'smooth' });  
      }  
    }  
  
    function hideEpgSidebar() {  
      epgEl.classList.add('hiding');  
      setTimeout(() => {  
        epgEl.classList.remove('visible', 'hiding');  
        _epgVisible = false;  
        _epgItems = [];  
        _epgFocusIdx = -1;  
      }, CONSTANTS.EPG_HIDE_TIMEOUT);  
    }  
  
    function _epgMoveFocus(direction) {  
      const items = epgEl.querySelectorAll('.liptv-epg-item');  
      if (items.length === 0) return;  
  
      if (_epgFocusIdx >= 0 && _epgFocusIdx < items.length) {  
        items[_epgFocusIdx].classList.remove('focus');  
      }  
  
      _epgFocusIdx += direction;  
      if (_epgFocusIdx < 0) _epgFocusIdx = 0;  
      if (_epgFocusIdx >= items.length) _epgFocusIdx = items.length - 1;  
  
      items[_epgFocusIdx].classList.add('focus');  
      items[_epgFocusIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });  
    }  
  
    function _switchChannel(direction) {  
      let next = _currentIndex + direction;  
      if (next >= channels.length) next = 0;  
      if (next < 0) next = channels.length - 1;  
      _currentIndex = next;  
      if (typeof onSwitch === 'function') onSwitch(channels[_currentIndex], _currentIndex);  
    }  
  
    function _onKeyDown(e) {  
      const kc = e.keyCode;  
  
      // Layer 3: EPG sidebar open  
      if (_epgVisible) {  
        if (isKey(kc, KEY.UP)) {  
          e.preventDefault(); e.stopPropagation();  
          _epgMoveFocus(-1);  
          return;  
        }  
        if (isKey(kc, KEY.DOWN)) {  
          e.preventDefault(); e.stopPropagation();  
          _epgMoveFocus(1);  
          return;  
        }  
        if (isKey(kc, KEY.LEFT) || isKey(kc, KEY.BACK)) {  
          e.preventDefault(); e.stopPropagation();  
          hideEpgSidebar();  
          return;  
        }  
        if (isKey(kc, KEY.CH_UP)) {  
          e.preventDefault(); e.stopPropagation();  
          _switchChannel(1);  
          showEpgSidebar(channels[_currentIndex]);  
          return;  
        }  
        if (isKey(kc, KEY.CH_DOWN)) {  
          e.preventDefault(); e.stopPropagation();  
          _switchChannel(-1);  
          showEpgSidebar(channels[_currentIndex]);  
          return;  
        }  
        return;  
      }  
  
      // Layer 2: OSD visible  
      if (_osdVisible) {  
        if (isKey(kc, KEY.CH_UP)) {  
          e.preventDefault(); e.stopPropagation();  
          _switchChannel(1);  
          show(_currentIndex);  
          return;  
        }  
        if (isKey(kc, KEY.CH_DOWN)) {  
          e.preventDefault(); e.stopPropagation();  
          _switchChannel(-1);  
          show(_currentIndex);  
          return;  
        }  
        if (isKey(kc, KEY.OK)) {  
          e.preventDefault(); e.stopPropagation();  
          showEpgSidebar(channels[_currentIndex]);  
          return;  
        }  
        if (isKey(kc, KEY.BACK)) {  
          e.preventDefault(); e.stopPropagation();  
          hide();  
          return;  
        }  
        return;  
      }  
  
      // Layer 1: nothing shown  
      if (isKey(kc, KEY.CH_UP)) {  
        e.preventDefault(); e.stopPropagation();  
        _switchChannel(1);  
        show(_currentIndex);  
        return;  
      }  
      if (isKey(kc, KEY.CH_DOWN)) {  
        e.preventDefault(); e.stopPropagation();  
        _switchChannel(-1);  
        show(_currentIndex);  
        return;  
      }  
    }  
  
    document.addEventListener('keydown', _onKeyDown, true);  
  
    function destroy() {  
      clearTimeout(_hideTimer);  
      document.removeEventListener('keydown', _onKeyDown, true);  
      if (osdEl.parentNode) osdEl.parentNode.removeChild(osdEl);  
      if (epgEl.parentNode) epgEl.parentNode.removeChild(epgEl);  
    }  
  
    return {  
      show: show,  
      hide: hide,  
      setIndex: function(idx) { _currentIndex = idx; },  
      showEpgSidebar: showEpgSidebar,  
      hideEpgSidebar: hideEpgSidebar,  
      destroy: destroy  
    };  
  }  
  
  // Main plugin initialization  
  (function() {  
    let historyTimer = null;  
    let _mainScreen = null;  
    let _body = null;  
    let _channels = [];  
    let _osd = null;  
    let _switching = false;  
  
    function startHistoryTracking(channelId) {  
      clearTimeout(historyTimer);  
      historyTimer = setTimeout(() => storage.addHistory(channelId), CONSTANTS.HISTORY_TRACKING_DELAY);  
    }  
  
    function stopHistoryTracking() {  
      clearTimeout(historyTimer);  
      historyTimer = null;  
    }  
  
    async function loadAndRender() {  
      const m3uUrl = storage.getM3uUrl();  
  
      if (!m3uUrl) {  
        Lampa.Noty.show('IPTV: укажите M3U URL в настройках');  
        Lampa.Activity.push({ component: 'settings', url: '', title: 'Настройки' });  
        return;  
      }  
  
      let parsed;  
      try {  
        parsed = await fetchM3U(m3uUrl);  
      } catch (e) {  
        Lampa.Noty.show('Не удалось загрузить плейлист: ' + e.message, { style: 'error', time: 5000 });  
        return;  
      }  
  
      const channels = parsed.channels;  
      const playlistEpgUrl = parsed.playlistEpgUrl;  
  
      _channels = channels;  
  
      const channelMap = {};  
      channels.forEach(ch => { channelMap[ch.id] = ch.name; });  
      setChannelMap(channelMap);  
  
      if (_mainScreen) _mainScreen.destroy();  
  
      _mainScreen = createMainScreen(channels, function(channel, action) {  
        if (action === 'search') return showSearch(channels);  
        if (action === 'card') return showCard(channel, function() { if (_body && _mainScreen) _mainScreen.render(_body); });  
      });  
  
      if (_body) _mainScreen.render(_body);  
  
      epg.reset();  
      const epgSource = storage.getEpgSource();  
      const resolved = resolveEpgUrls(epgSource, channels, playlistEpgUrl, storage.getEpgUrl());  
        
      if (resolved.urls.length === 0 && epgSource === 'auto' && !playlistEpgUrl) {  
        Lampa.Noty.show('Не удалось определить EPG автоматически, выберите источник в настройках');  
      }  
      if (resolved.urls.length === 0 && epgSource === 'playlist' && !playlistEpgUrl) {  
        Lampa.Noty.show('Плейлист не содержит EPG URL');  
      }  
      if (resolved.urls.length === 0 && epgSource === 'custom') {  
        Lampa.Noty.show('Укажите EPG URL в настройках');  
      }  
        
      epg.init(resolved.urls, channels, resolved.needsMapping);  
      epg.fetchInBackground();  
    }  
  
    function init() {  
      injectStyles();  
  
      class LiptvMain {  
        constructor(object) { this.activity = object; }  
        render() {  
          this.html = $('<div class="liptv-container"></div>');  
          _body = this.html;  
          loadAndRender();  
          return this.html[0];  
        }  
        create() { return this.render(); }  
        start() {}  
        pause() {}  
        stop() {}  
        destroy() {  
          stopHistoryTracking();  
          if (_mainScreen) { _mainScreen.destroy(); _mainScreen = null; }  
          _body = null;  
        }  
      }  
      Lampa.Component.add('liptv_main', LiptvMain);  
  
      setOnPlay(function(channel) {  
        _switching = true;  
        startHistoryTracking(channel.id);  
  
        if (!_osd) {  
          const blacklist = storage.getBlacklist();  
          const visible = _channels.filter(ch => !blacklist.includes(ch.id));  
          _osd = createOsd(visible, function(switchedChannel) {  
            playChannel(switchedChannel);  
          });  
        }  
  
        const blacklist = storage.getBlacklist();  
        const visible = _channels.filter(ch => !blacklist.includes(ch.id));  
        const idx = visible.findIndex(ch => ch.url === channel.url);  
        if (idx >= 0) _osd.setIndex(idx);  
        _switching = false;  
      });  
  
      Lampa.Player.listener.follow('destroy', function() {  
        stopHistoryTracking();  
        if (!_switching && _osd) { _osd.destroy(); _osd = null; }  
      });  
  
      registerSettings(  
        function() { loadAndRender(); },  
        function() { loadAndRender(); }  
      );  
  
      const menuIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>';  
      const menuItem = $('<li class="menu__item selector" data-action="liptv">' +  
        '<div class="menu__ico">' + menuIcon + '</div>' +  
        '<div class="menu__text">IPTV</div>' +  
        '</li>');  
  
      menuItem.on('hover:enter', function() {  
        Lampa.Activity.push({ component: 'liptv_main', url: '', title: 'IPTV' });  
      });  
  
      const settingsItem = $('.menu .menu__list .menu__item[data-action="settings"]');  
      if (settingsItem.length) {  
        settingsItem.before(menuItem);  
      } else {  
        $('.menu .menu__list').eq(0).append(menuItem);  
      }  
  
      Lampa.Activity.push({ component: 'liptv_main', url: '', title: 'IPTV' });  
    }  
  
    if (window.appready) {  
      init();  
    } else {  
      Lampa.Listener.follow('app', function(e) {  
        if (e.type === 'ready') init();  
      });  
    }  
  })();  
  
})();  
   
  
