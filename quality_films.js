(function() {    // РџРѕС‡Р°С‚РѕРє Р°РЅРѕРЅС–РјРЅРѕС— С„СѓРЅРєС†С–С—-РѕР±РіРѕСЂС‚РєРё
    'use strict';

// ===================== LQE_CONFIG =====================
    var LQE_CONFIG = {
        CACHE_VERSION: 2,
        LOGGING_GENERAL: false,
        LOGGING_QUALITY: true,
        LOGGING_CARDLIST: false,
        CACHE_VALID_TIME_MS: 24 * 60 * 60 * 1000, // 24 РіРѕРґРёРЅРё
        CACHE_REFRESH_THRESHOLD_MS: 12 * 60 * 60 * 1000, // 12 РіРѕРґРёРЅ РґР»СЏ С„РѕРЅРѕРІРѕРіРѕ РѕРЅРѕРІР»РµРЅРЅСЏ
        CACHE_KEY: 'lampa_quality_cache',
        JACRED_PROTOCOL: 'http://',
        JACRED_URL: 'jacred.xyz',
        JACRED_API_KEY: '',
        PROXY_LIST: [
            'http://api.allorigins.win/raw?url=',
            'http://cors.bwa.workers.dev/'
        ],
        PROXY_TIMEOUT_MS: 5000,
        SHOW_QUALITY_FOR_TV_SERIES: true,
        MAX_PARALLEL_REQUESTS: 12, // Lite-С‡РµСЂРіР°: СЂРµРіСѓР»СЊРѕРІР°РЅРµ С‡РёСЃР»Рѕ РїР°СЂР°Р»РµР»СЊРЅРёС… РїРѕС€СѓРєС–РІ (10-15 СЂРµРєРѕРјРµРЅРґРѕРІР°РЅРѕ)
        FULL_CARD_LABEL_BORDER_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_FONT_WEIGHT: 'normal',
        FULL_CARD_LABEL_FONT_SIZE: '1.2em',
        FULL_CARD_LABEL_FONT_STYLE: 'normal',
        LIST_CARD_LABEL_BORDER_COLOR: '#3DA18D',
        LIST_CARD_LABEL_BACKGROUND_COLOR: 'rgba(61, 161, 141, 0.8)',
        LIST_CARD_LABEL_BACKGROUND_TRANSPARENT: false,
        LIST_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        LIST_CARD_LABEL_FONT_WEIGHT: '600',
        LIST_CARD_LABEL_FONT_SIZE: '1.3em',
        LIST_CARD_LABEL_FONT_STYLE: 'normal',
        MANUAL_OVERRIDES: {
            '90802': { quality_code: 2160, full_label: '4K Web-DLRip' },
            '20873': { quality_code: 2160, full_label: '4K BDRip' },
            '1128655': { quality_code: 2160, full_label: '4K Web-DL' },
            '46010': { quality_code: 1080, full_label: '1080p Web-DLRip' },
            '9564': { quality_code: 1080, full_label: '1080p BDRemux' },
            '32334': { quality_code: 1080, full_label: '1080p Web-DLRip' },
            '21028': { quality_code: 1080, full_label: '1080p BDRemux' },
            '20932': { quality_code: 1080, full_label: '1080p HDTVRip' },
            '57778': { quality_code: 2160, full_label: '4K Web-DL' },
            '20977': { quality_code: 1080, full_label: 'HDTVRip-AVC' },
            '33645': { quality_code: 720, full_label: '720p HDTVRip' }
        }
    };

    var currentGlobalMovieId = null;

// ===================== QUALITY_DISPLAY_MAP (РѕСЂРёРіС–РЅР°Р»СЊРЅС– РІР°СЂС–Р°РЅС‚Рё СЏРє fallback) =====================
    var QUALITY_DISPLAY_MAP = {
        "WEBRip 1080p | AVC @ Р·РІСѓРє СЃ TS": "1080P WEBRip/TS",
        "TeleSynch 1080P": "TS",
        "4K Web-DL 10bit HDR P81 HEVC": "4K WEB-DL",
        "Telecine [H.264/1080P] [Р·РІСѓРє СЃ TS] [AD]": "1080P TS",
        "WEB-DLRip @ РЎРёРЅРµРјР° РЈРЎ": "WEB-DLRip",
        "UHD Blu-ray disc 2160p": "4K Blu-ray",
        "Blu-ray disc 1080P]": "1080P Blu-ray",
        "Blu-Ray Remux (1080P)": "1080P BDRemux",
        "BDRemux 1080P] [РљСЂСѓРїРЅРёР№ РїР»Р°РЅ]": "1080P BDRemux",
        "Blu-ray disc (custom) 1080P]": "1080P WEB-DLRip",
        "DVDRip [AV1/2160p] [4K, SDR, 10-bit] [hand made Upscale AI]": "4K Upscale AI",
        "Hybrid (2160p)": "4K Hybrid",
        "Blu-ray disc] [Mastered in 4K] [Extended Cut]": "4K Blu-ray",
        "4K, HEVC, HDR / Blu-Ray Remux (2160p)": "4K BDRemux",
        "4K, HEVC, HDR, HDR10+, Dolby Vision / Hybrid (2160p)": "4K Hybrid",
        "4K, HEVC, HDR, Dolby Vision P7 / Blu-Ray Remux (2160p)": "4K BDRemux",
        "4K, HEVC, HDR, Dolby Vision / Blu-Ray Remux (2160p)": "4K BDRemux",
        "Blu-Ray Remux 2160p | 4K | HDR | Dolby Vision P7": "4K BDRemux",
        "4K, HEVC, HDR / WEB-DLRip (2160p)": "4K WEB-DLRip",
        "Blu-ray disc (custom) 1080P] [StudioCanal]": "1080P BDRip",
        "HDTVRip [H.264/720p]": "720p HDTVRip",
        "HDTVRip 720p": "720p HDTVRip",
        "2025 / Р›Рњ / TC": "Telecine",

        "2160p": "4K",
        "4k": "4K",
        "4Рљ": "4K",
        "1080p": "1080p",
        "1080": "1080p",
        "1080i": "1080p",
        "hdtv 1080i": "1080i FHDTV",
        "blu-ray remux (2160p)": "4K BDRemux",
        "hdtvrip 2160p": "4K HDTVRip",
        "hybrid 2160p": "4K Hybrid",
        "480p": "SD",
        "480": "SD",
        "web-dl": "WEB-DL",
        "webrip": "WEBRip",
        "web-dlrip (2160p)": "4K WEB-DLRip",
        "web-dlrip": "WEB-DLRip",
        "1080p web-dlrip": "1080p WEB-DLRip",
        "webdlrip": "WEB-DLRip",
        "hdtvrip-avc": "HDTVRip-AVC",
        "bluray": "BluRay",
        "bdrip": "BDRip",
        "bdremux": "BDRemux",
        "HDTVRip (1080p)": "1080p FHDTVRip",
        "hdrip": "HDRip",
        "hdtvrip (720p)": "720p HDTVRip",
        "dvdrip": "DVDRip",
        "hdtv": "HDTV",
        "dsrip": "DSRip",
        "satrip": "SATRip",
        "ts": "TS",
        "camrip": "CAMRip",
        "telecine": "Telecine",
        "tc": "Telecine",
        "ts": "TeleSync"
    };

// ===================== RESOLUTION_MAP & SOURCE_MAP (РЅРѕРІС– РјР°РїРё) =====================
    var RESOLUTION_MAP = {
    "2160p":"4K", "4k":"4K", "4Рє":"4K", "uhd":"4K", "ultra hd":"4K", "ultrahd":"4K", "dci 4k":"4K",
    "1440p":"1440p", "2k":"1440p", "qhd":"1440p",
    "1080p":"1080p", "1080":"1080p", "1080i":"1080i", "full hd":"1080p", "fhd":"1080p",
    "720p":"720p", "720":"720p", "hd":"720p", "hd ready":"720p",
    "576p":"576p", "576":"576p", "pal":"576p",
    "480p":"480p", "480":"480p", "sd":"480p", "standard definition":"480p", "ntsc":"480p",
    "360p":"360p", "360":"360p", "low":"360p"
    };

    var SOURCE_MAP = {
    "blu-ray remux":"BDRemux", "uhd bdremux":"4K BDRemux", "bdremux":"BDRemux", "remux":"BDRemux",
    "blu-ray disc":"Blu-ray", "bluray":"Blu-ray", "blu-ray":"Blu-ray", "bdrip":"BDRip", "brrip":"BDRip",
    "uhd blu-ray":"4K Blu-ray", "4k blu-ray":"4K Blu-ray",
    "web-dl":"WEB-DL", "webdl":"WEB-DL", "web dl":"WEB-DL",
    "web-dlrip":"WEB-DLRip", "webdlrip":"WEB-DLRip", "web dlrip":"WEB-DLRip",
    "webrip":"WEBRip", "web rip":"WEBRip",
    "hdtvrip":"HDTVRip", "hdtv":"HDTVRip", "hdrip":"HDRip",
    "dvdrip":"DVDRip", "dvd rip":"DVDRip", "dvd":"DVD",
    "dvdscr":"DVDSCR", "scr":"SCR", "bdscr":"BDSCR",
    "r5":"R5",
    "telecine":"TC", "tc":"TC", "hdtc":"TC",
    "telesync":"TS", "ts":"TS", "hdts":"TS",
    "camrip":"CAMRip", "cam":"CAMRip", "hdcam":"CAMRip",
    "vhsrip":"VHSRip", "vcdrip":"VCDRip",
    "dcp":"DCP", "workprint":"Workprint", "preair":"Preair", "tv":"TVRip",
    "line":"Line Audio",
    "hybrid":"Hybrid", "uhd hybrid":"4K Hybrid",
    "upscale":"Upscale", "ai upscale":"AI Upscale",
    "bd3d":"3D Blu-ray", "3d blu-ray":"3D Blu-ray"
    };

// ===================== РЎРўРР›Р† =====================
var styleLQE = "<style id=\"lampa_quality_styles\">" +
    ".full-start-new__rate-line {" +
    "visibility: hidden;" +
    "flex-wrap: wrap;" +
    "gap: 0.4em 0;" +
    "}" +
    ".full-start-new__rate-line > * {" +
    "margin-right: 0.5em;" +
    "flex-shrink: 0;" +
    "flex-grow: 0;" +
    "}" +
    ".lqe-quality {" +
    "min-width: 2.8em;" +
    "text-align: center;" +
    "text-transform: none;" +
    "border: 1px solid " + LQE_CONFIG.FULL_CARD_LABEL_BORDER_COLOR + " !important;" +
    "color: " + LQE_CONFIG.FULL_CARD_LABEL_TEXT_COLOR + " !important;" +
    "font-weight: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_WEIGHT + " !important;" +
    "font-size: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_SIZE + " !important;" +
    "font-style: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_STYLE + " !important;" +
    "border-radius: 0.2em;" +
    "padding: 0.3em;" +
    "height: 1.72em;" +
    "display: flex;" +
    "align-items: center;" +
    "justify-content: center;" +
    "box-sizing: border-box;" +
    "}" +
    ".card__view {" +
    " position: relative; " +
    "}" +
    ".card__quality {" +
    " position: absolute; " +
    " bottom: 0.50em; " +
    " left: 0; " +
    " background-color: " + (LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_TRANSPARENT ? "transparent" : LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_COLOR) + " !important;" +
    " z-index: 10;" +
    " width: fit-content; " +
    " max-width: calc(100% - 1em); " +
    " border-radius: 0 0.8em 0.8em 0.3em; " +
    " overflow: hidden;" +
    "}" +
    ".card__quality div {" +
    " text-transform: uppercase; " +
    " font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif; " +
    " font-weight: 700; " +
    " letter-spacing: 0.1px; " +
    " font-size: 1.30em; " +
    " color: " + LQE_CONFIG.LIST_CARD_LABEL_TEXT_COLOR + " !important;" +
    " padding: 0.1em 0.1em 0.08em 0.1em; " +
    " white-space: nowrap;" +
    " text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3); " +
    "}" +
    "</style>";

    Lampa.Template.add('lampa_quality_css', styleLQE);
    $('body').append(Lampa.Template.get('lampa_quality_css', {}, true));

// ===================== OPTIONAL FADE-IN (РјРѕР¶РЅР° РІРёРјРєРЅСѓС‚Рё РІРёРґР°Р»РµРЅРЅСЏРј Р±Р»РѕРєСѓ) =====================
/* === OPTIONAL FADE-IN START === */
var fadeStyles = "<style id='lampa_quality_fade'>" +
    ".card__quality, .full-start__status.lqe-quality {" +
    "opacity: 0;" +
    "transition: opacity 0.22s ease-in-out;" +
    "}" +
    ".card__quality.show, .full-start__status.lqe-quality.show {" +
    "opacity: 1;" +
    "}" +
    "</style>";
Lampa.Template.add('lampa_quality_fade', fadeStyles);
$('body').append(Lampa.Template.get('lampa_quality_fade', {}, true));
/* === OPTIONAL FADE-IN END === */


// ===================== loading animation styles =====================
    var loadingStylesLQE = "<style id=\"lampa_quality_loading_animation\">" +
        ".loading-dots-container {" +
        "    position: absolute;" +
        "    top: 50%;" +
        "    left: 0;" +
        "    right: 0;" +
        "    text-align: left;" +
        "    transform: translateY(-50%);" +
        "    z-index: 10;" +
        "}" +
        ".full-start-new__rate-line {" +
        "    position: relative;" +
        "}" +
        ".loading-dots {" +
        "    display: inline-flex;" +
        "    align-items: center;" +
        "    gap: 0.4em;" +
        "    color: #ffffff;" +
        "    font-size: 0.7em;" +
        "    background: rgba(0, 0, 0, 0.3);" +
        "    padding: 0.6em 1em;" +
        "    border-radius: 0.5em;" +
        "}" +
        ".loading-dots__text {" +
        "    margin-right: 1em;" +
        "}" +
        ".loading-dots__dot {" +
        "    width: 0.5em;" +
        "    height: 0.5em;" +
        "    border-radius: 50%;" +
        "    background-color: currentColor;" +
        "    opacity: 0.3;" +
        "    animation: loading-dots-fade 1.5s infinite both;" +
        "}" +
        ".loading-dots__dot:nth-child(1) {" +
        "    animation-delay: 0s;" +
        "}" +
        ".loading-dots__dot:nth-child(2) {" +
        "    animation-delay: 0.5s;" +
        "}" +
        ".loading-dots__dot:nth-child(3) {" +
        "    animation-delay: 1s;" +
        "}" +
        "@keyframes loading-dots-fade {" +
        "    0%, 90%, 100% { opacity: 0.3; }" +
        "    35% { opacity: 1; }" +
        "}" +
        "@media screen and (max-width: 480px) { .loading-dots-container { -webkit-justify-content: center; justify-content: center; text-align: center; max-width: 100%; }}" +
        "</style>";

    Lampa.Template.add('lampa_quality_loading_animation_css', loadingStylesLQE);
    $('body').append(Lampa.Template.get('lampa_quality_loading_animation_css', {}, true));


// ===================== network helper with proxy and timeouts =====================
    function fetchWithProxy(url, cardId, callback) {
        var currentProxyIndex = 0;
        var callbackCalled = false;

        function tryNextProxy() {
            if (currentProxyIndex >= LQE_CONFIG.PROXY_LIST.length) {
                if (!callbackCalled) {
                    callbackCalled = true;
                    callback(new Error('All proxies failed for ' + url));
                }
                return;
            }
            var proxyUrl = LQE_CONFIG.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);
            if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Fetch with proxy: " + proxyUrl);
            var timeoutId = setTimeout(function() {
                if (!callbackCalled) {
                    currentProxyIndex++;
                    tryNextProxy();
                }
            }, LQE_CONFIG.PROXY_TIMEOUT_MS);
            fetch(proxyUrl)
                .then(function(response) {
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error('Proxy error: ' + response.status);
                    return response.text();
                })
                .then(function(data) {
                    if (!callbackCalled) {
                        callbackCalled = true;
                        clearTimeout(timeoutId);
                        callback(null, data);
                    }
                })
                .catch(function(error) {
                    console.error("LQE-LOG", "card: " + cardId + ", Proxy fetch error for " + proxyUrl + ":", error);
                    clearTimeout(timeoutId);
                    if (!callbackCalled) {
                        currentProxyIndex++;
                        tryNextProxy();
                    }
                });
        }
        tryNextProxy();
    }

// ===================== loading animation helpers =====================
    function addLoadingAnimation(cardId, renderElement) {
        if (!renderElement) return;
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Add loading animation");
        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (!rateLine.length || $('.loading-dots-container', rateLine).length) return;
        rateLine.append(
            '<div class="loading-dots-container">' +
            '<div class="loading-dots">' +
            '<span class="loading-dots__text">Р—Р°РіСЂСѓР·РєР°...</span>' +
            '<span class="loading-dots__dot"></span>' +
            '<span class="loading-dots__dot"></span>' +
            '<span class="loading-dots__dot"></span>' +
            '</div>' +
            '</div>'
        );
        $('.loading-dots-container', rateLine).css({
            'opacity': '1',
            'visibility': 'visible'
        });
    }

    function removeLoadingAnimation(cardId, renderElement) {
        if (!renderElement) return;
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Remove loading animation");
        $('.loading-dots-container', renderElement).remove();
    }

// ===================== utilities =====================
    function getCardType(cardData) {
        var type = cardData.media_type || cardData.type;
        if (type === 'movie' || type === 'tv') return type;
        return cardData.name || cardData.original_name ? 'tv' : 'movie';
    }

    function sanitizeTitle(title) {
        if (!title) return '';
        // lower, replace various separators with spaces, remove extra spaces
        return title.toString().toLowerCase().replace(/[\._\-\[\]\(\),]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

// ===================== translateQualityLabel (РЅРѕРІРёР№ РїР°СЂСЃРµСЂ Р· mapР°РјРё) =====================

function translateQualityLabel(qualityCode, fullTorrentTitle) {
    // РќРѕРІРёР№ РїС–РґС…С–Рґ: resolution + source -> final label.
    // DV/HDR/РєРѕРґРµРєРё С–РіРЅРѕСЂСѓС”РјРѕ РїРѕРІРЅС–СЃС‚СЋ, РІРѕРЅРё РЅРµ РІРїР»РёРІР°СЋС‚СЊ РЅР° СЏСЂР»РёРє.
    if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "translateQualityLabel (clean):", qualityCode, fullTorrentTitle);

    var title = sanitizeTitle(fullTorrentTitle || '');
    var titleForSearch = ' ' + title + ' ';

    // 1) Р·РЅР°Р№С‚Рё СЂРѕР·РґС–Р»СЊРЅС–СЃС‚СЊ
    var resolution = '';
    var bestResKey = '';
    var bestResLen = 0;
    for (var rKey in RESOLUTION_MAP) {
        if (!RESOLUTION_MAP.hasOwnProperty(rKey)) continue;
        var lk = rKey.toString().toLowerCase();
        if (titleForSearch.indexOf(' ' + lk + ' ') !== -1 || title.indexOf(lk) !== -1) {
            if (lk.length > bestResLen) {
                bestResLen = lk.length;
                bestResKey = rKey;
            }
        }
    }
    if (bestResKey) resolution = RESOLUTION_MAP[bestResKey];

    // 2) Р·РЅР°Р№С‚Рё РґР¶РµСЂРµР»Рѕ (source)
    var source = '';
    var bestSrcKey = '';
    var bestSrcLen = 0;
    for (var sKey in SOURCE_MAP) {
        if (!SOURCE_MAP.hasOwnProperty(sKey)) continue;
        var lk2 = sKey.toString().toLowerCase();
        if (titleForSearch.indexOf(' ' + lk2 + ' ') !== -1 || title.indexOf(lk2) !== -1) {
            if (lk2.length > bestSrcLen) {
                bestSrcLen = lk2.length;
                bestSrcKey = sKey;
            }
        }
    }
    if (bestSrcKey) source = SOURCE_MAP[bestSrcKey];

    // 3) Р¤РѕСЂРјСѓС”РјРѕ С„С–РЅР°Р»СЊРЅРёР№ Р»РµР№Р±Р»: resolution + source (Р±РµР· РґСѓР±Р»СЏ)
    var finalLabel = '';
    if (resolution && source) {
        if (source.toLowerCase().includes(resolution.toLowerCase())) {
            finalLabel = source;
        } else {
            finalLabel = resolution + ' ' + source;
        }
    } else if (resolution) {
        finalLabel = resolution;
    } else if (source) {
        finalLabel = source;
    }

    // 4) РЇРєС‰Рѕ РЅРµ Р·РЅР°Р№С€Р»Рё РЅС– resolution, РЅС– source - fallback РЅР° QUALITY_DISPLAY_MAP
    if (!finalLabel || finalLabel.trim() === '') {
        var bestDirectKey = '';
        var maxDirectLen = 0;
        for (var qk in QUALITY_DISPLAY_MAP) {
            if (!QUALITY_DISPLAY_MAP.hasOwnProperty(qk)) continue;
            var lkq = qk.toString().toLowerCase();
            if (title.indexOf(lkq) !== -1) {
                if (lkq.length > maxDirectLen) {
                    maxDirectLen = lkq.length;
                    bestDirectKey = qk;
                }
            }
        }
        if (bestDirectKey) {
            finalLabel = QUALITY_DISPLAY_MAP[bestDirectKey];
        }
    }

    // 5) РћСЃС‚Р°РЅРЅС–Р№ fallback вЂ” raw code Р°Р±Рѕ РїРѕРІРЅР° РЅР°Р·РІР°
    if (!finalLabel || finalLabel.trim() === '') {
        if (qualityCode) {
            var qc = String(qualityCode).toLowerCase();
            finalLabel = QUALITY_DISPLAY_MAP[qc] || qualityCode;
        } else {
            finalLabel = fullTorrentTitle || '';
        }
    }

    if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "translateQualityLabel (clean): Final:", finalLabel);
    return finalLabel;
}

// ============================== Request queue (Lite-С‡РµСЂРіР°) ===============================
    var requestQueue = [];
    var activeRequests = 0;

    function enqueueTask(fn) {
        requestQueue.push(fn);
        processQueue();
    }

    function processQueue() {
        if (activeRequests >= LQE_CONFIG.MAX_PARALLEL_REQUESTS) return;
        var task = requestQueue.shift();
        if (!task) return;
        activeRequests++;
        try {
            task(function onTaskDone() {
                activeRequests--;
                // process next in next tick to avoid recursion
                setTimeout(processQueue, 0);
            });
        } catch (e) {
            activeRequests--;
            setTimeout(processQueue, 0);
        }
    }

// getBestReleaseFromJacred (Р±РµР· Р·РјС–РЅ Р»РѕРіС–РєРё, Р°Р»Рµ С‡РµСЂРµР· С‡РµСЂРіСѓ)     

// ===================== FIXED getBestReleaseFromJacred (РѕРЅРѕРІР»РµРЅР°) =====================

// ===================== getBestReleaseFromJacred (РѕРЅРѕРІР»РµРЅР°) =====================
function getBestReleaseFromJacred(normalizedCard, cardId, callback) {
    enqueueTask(function (done) {

        // --- Р‘Р›РћРљ 0: РњР°Р№Р±СѓС‚РЅС–Р№ СЂРµР»С–Р· ---
        var relDate = normalizedCard.release_date ? new Date(normalizedCard.release_date) : null;
        if (relDate && relDate.getTime() > Date.now()) {
            // РЅРµ С€СѓРєР°С”РјРѕ JacRed РґР»СЏ РјР°Р№Р±СѓС‚РЅСЊРѕРіРѕ СЂРµР»С–Р·Сѓ
            callback(null);
            done();
            return;
        }

        if (!LQE_CONFIG.JACRED_URL) {
            callback(null);
            done();
            return;
        }

        // --- Р‘Р›РћРљ 1: Р С–Рє СЂРµР»С–Р·Сѓ ---
        var year = '';
        if (normalizedCard.release_date && normalizedCard.release_date.length >= 4) {
            year = normalizedCard.release_date.substring(0, 4);
        }
        if (!year || isNaN(year)) {
            callback(null);
            done();
            return;
        }
        var searchYearNum = parseInt(year, 10);
        var currentYear = new Date().getFullYear();

        // --- Р‘Р›РћРљ 2: Р”РѕРїРѕРјС–Р¶РЅС– С„СѓРЅРєС†С–С— ---
        function extractNumericQualityFromTitle(title) {
            var lower = (title || '').toLowerCase();
            if (/2160p|4k/.test(lower)) return 2160;
            if (/1080p/.test(lower)) return 1080;
            if (/720p/.test(lower)) return 720;
            if (/480p/.test(lower)) return 480;
            if (/ts|telesync/.test(lower)) return 1;
            if (/camrip|РєР°РјСЂРёРї/.test(lower)) return 2;
            return 0;
        }

        function extractYearFromTitle(title) {
            var regex = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/g;
            var match, lastYear = 0;
            while ((match = regex.exec(title)) !== null) {
                var extractedYear = parseInt(match[1], 10);
                if (extractedYear >= 1900 && extractedYear <= currentYear + 1) {
                    lastYear = extractedYear;
                }
            }
            return lastYear;
        }

        // РїРµСЂРµРІС–СЂРєР° РїРѕРІРЅРѕРіРѕ СЃР»РѕРІР° Сѓ РЅР°Р·РІС–
        function containsWholeWord(haystack, needle) {
            if (!needle) return false;
            var regex = new RegExp("\\b" + needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\b", "i");
            return regex.test(haystack.toLowerCase());
        }

        // --- Р‘Р›РћРљ 3: API Р·Р°РїРёС‚ ---
        function searchJacredApi(searchTitle, searchYear, exactMatch, contentType, apiCallback) {
            var userId = Lampa.Storage.get('lampac_unic_id', '');
            var apiUrl = LQE_CONFIG.JACRED_PROTOCOL + LQE_CONFIG.JACRED_URL + '/api/v1.0/torrents?search=' +
                encodeURIComponent(searchTitle) +
                '&year=' + searchYear +
                (exactMatch ? '&exact=true' : '');
            if (contentType) {
                var jacredType = contentType === 'movie' ? 'movie' : 'serial';
                apiUrl += '&type=' + jacredType;
            }
            apiUrl += '&uid=' + userId;

            var timeoutId = setTimeout(function () {
                apiCallback(null);
            }, LQE_CONFIG.PROXY_TIMEOUT_MS * LQE_CONFIG.PROXY_LIST.length + 1000);

            fetchWithProxy(apiUrl, cardId, function (error, responseText) {
                clearTimeout(timeoutId);
                if (error || !responseText) {
                    apiCallback(null);
                    return;
                }
                try {
                    var torrents = JSON.parse(responseText);
                    if (!Array.isArray(torrents) || torrents.length === 0) {
                        apiCallback(null);
                        return;
                    }

                    var bestScore = -1;
                    var bestTorrent = null;

                    for (var i = 0; i < torrents.length; i++) {
                        var t = torrents[i];
                        var qualityNum = t.quality;
                        if (typeof qualityNum !== 'number' || qualityNum === 0) {
                            var q = extractNumericQualityFromTitle(t.title);
                            if (q > 0) qualityNum = q; else continue;
                        }

                        // С„С–Р»СЊС‚СЂР°С†С–СЏ С‚РёРїСѓ
                        if (contentType) {
                            var torrentType = String(t.type || '').toLowerCase();
                            var okType = contentType === 'movie'
                                ? torrentType.includes('movie') || torrentType.includes('С„С–Р»СЊРј')
                                : torrentType.includes('serial') || torrentType.includes('СЃРµСЂС–Р°Р»');
                            if (!okType) continue;
                        }

                        // РџРµСЂРµРІС–СЂРєР° СЂРѕРєСѓ В±1
                        var parsedYear = parseInt(t.relased, 10);
                        if (!parsedYear || isNaN(parsedYear)) parsedYear = extractYearFromTitle(t.title);
                        var yearDiff = Math.abs(parsedYear - searchYearNum);
                        if (yearDiff > 1) continue;

                        // РђРЅР°Р»С–Р· РЅР°Р·РІ
                        var titleBonus = 0;
                        if (containsWholeWord(t.title, normalizedCard.original_title)) {
                            titleBonus = 500; // РІРµР»РёРєРёР№ Р±РѕРЅСѓСЃ РѕСЂРёРіС–РЅР°Р»
                        } else if (containsWholeWord(t.title, normalizedCard.title)) {
                            titleBonus = 50; // РјР°Р»РµРЅСЊРєРёР№ Р±РѕРЅСѓСЃ Р»РѕРєР°Р»С–Р·РѕРІР°РЅР°
                        }

                        // Р±РѕРЅСѓСЃ СЂРѕРєСѓ
                        var yearBonus = 0;
                        if (parsedYear === searchYearNum) yearBonus = 200;
                        else if (yearDiff === 1) yearBonus = 50;

                        var score = qualityNum + titleBonus + yearBonus;
                        if (score > bestScore) {
                            bestScore = score;
                            bestTorrent = t;
                        }
                    }

                    if (bestTorrent) {
                        apiCallback({
                            quality: bestTorrent.quality || extractNumericQualityFromTitle(bestTorrent.title),
                            full_label: bestTorrent.title
                        });
                    } else {
                        apiCallback(null);
                    }

                } catch (e) {
                    apiCallback(null);
                }
            });
        }

        // --- Р‘Р›РћРљ 4: РЎС‚СЂР°С‚РµРіС–С— РїРѕС€СѓРєСѓ ---
        var searchStrategies = [];
        var isTvSeries = (normalizedCard.type === 'tv');

        // 1. РћСЂРёРіС–РЅР°Р»СЊРЅР° + С‚РёРї
        if (normalizedCard.original_title && normalizedCard.original_title.trim()) {
            searchStrategies.push({
                title: normalizedCard.original_title.trim(),
                year: year,
                exact: true,
                contentType: isTvSeries ? 'tv' : 'movie'
            });
        }

        // 2. РћСЂРёРіС–РЅР°Р»СЊРЅР° Р±РµР· С‚РёРїСѓ
        if (normalizedCard.original_title && normalizedCard.original_title.trim()) {
            searchStrategies.push({
                title: normalizedCard.original_title.trim(),
                year: year,
                exact: true,
                contentType: null
            });
        }

        // 3. Р›РѕРєР°Р»С–Р·РѕРІР°РЅР° (СЂРµР·РµСЂРІ)
        if (normalizedCard.title && normalizedCard.title.trim() &&
            normalizedCard.title !== normalizedCard.original_title) {
            searchStrategies.push({
                title: normalizedCard.title.trim(),
                year: year,
                exact: true,
                contentType: isTvSeries ? 'tv' : 'movie'
            });
        }

        // --- Р‘Р›РћРљ 5: Р’РёРєРѕРЅР°РЅРЅСЏ ---
        function executeNextStrategy(index) {
            if (index >= searchStrategies.length) {
                callback(null);
                done();
                return;
            }
            var s = searchStrategies[index];
            searchJacredApi(s.title, s.year, s.exact, s.contentType, function (result) {
                if (result !== null) {
                    callback(result);
                    done();
                } else {
                    executeNextStrategy(index + 1);
                }
            });
        }

        if (searchStrategies.length > 0) executeNextStrategy(0);
        else {
            callback(null);
            done();
        }
    });
}

                    
// ===================== /getBestReleaseFromJacred =====================
// ===================== CACHE HELPERS =====================
    function getQualityCache(key) {
        var cache = Lampa.Storage.get(LQE_CONFIG.CACHE_KEY) || {};
        var item = cache[key];
        var isCacheValid = item && (Date.now() - item.timestamp < LQE_CONFIG.CACHE_VALID_TIME_MS);
        if (LQE_CONFIG.LOGGING_QUALITY) {
            console.log("LQE-QUALITY", "Cache: Checking quality cache for key:", key, "Found:", !!item, "Valid:", isCacheValid);
        }
        return isCacheValid ? item : null;
    }

    function saveQualityCache(key, data, cardId) {
        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "Cache: Saving quality cache for key:", key, "Data:", data);
        var cache = Lampa.Storage.get(LQE_CONFIG.CACHE_KEY) || {};
        cache[key] = {
            quality_code: data.quality_code,
            full_label: data.full_label,
            timestamp: Date.now()
        };
        Lampa.Storage.set(LQE_CONFIG.CACHE_KEY, cache);
    }

    function removeExpiredCacheEntries() {
        var cache = Lampa.Storage.get(LQE_CONFIG.CACHE_KEY) || {};
        var changed = false;
        var now = Date.now();
        for (var k in cache) {
            if (!cache.hasOwnProperty(k)) continue;
            var item = cache[k];
            if (!item || !item.timestamp || (now - item.timestamp) > LQE_CONFIG.CACHE_VALID_TIME_MS) {
                delete cache[k];
                changed = true;
            }
        }
        if (changed) Lampa.Storage.set(LQE_CONFIG.CACHE_KEY, cache);
    }

    // РІС‹Р·С‹РІР°РµРј РїСЂРё РёРЅРёС†РёР°Р»РёР·Р°С†РёРё
    removeExpiredCacheEntries();

// ===================== UI helpers =====================
    function clearFullCardQualityElements(cardId, renderElement) {
        if (renderElement) {
            var existingElements = $('.full-start__status.lqe-quality', renderElement);
            if (existingElements.length > 0) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Clearing existing quality elements on full card.");
                existingElements.remove();
            }
        }
    }

    function showFullCardQualityPlaceholder(cardId, renderElement) {
        if (!renderElement) return;
        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (!rateLine.length) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Cannot show placeholder, .full-start-new__rate-line not found.");
            return;
        }
        if (!$('.full-start__status.lqe-quality', rateLine).length) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Adding quality placeholder on full card.");
            var placeholder = document.createElement('div');
            placeholder.className = 'full-start__status lqe-quality';
            placeholder.textContent = 'Р—Р°РіСЂСѓР·РєР°...';
            placeholder.style.opacity = '0.7';
            rateLine.append(placeholder);
        } else {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Placeholder already exists on full card, skipping.");
        }
    }

    function updateFullCardQualityElement(qualityCode, fullTorrentTitle, cardId, renderElement, bypassTranslation) {
        if (!renderElement) return;
        var element = $('.full-start__status.lqe-quality', renderElement);
        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (!rateLine.length) return;

        var displayQuality = bypassTranslation ? fullTorrentTitle : translateQualityLabel(qualityCode, fullTorrentTitle);

        if (element.length) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', Updating existing element with quality "' + displayQuality + '" on full card.');
            element.text(displayQuality).css('opacity', '1').addClass('show');
        } else {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Creating new element with quality '" + displayQuality + "' on full card.");
            var div = document.createElement('div');
            div.className = 'full-start__status lqe-quality';
            div.textContent = displayQuality;
            rateLine.append(div);
            // slight delay to allow fade-in CSS to apply
            setTimeout(function(){ $('.full-start__status.lqe-quality', renderElement).addClass('show'); }, 20);
        }
    }

    function updateCardListQualityElement(cardView, qualityCode, fullTorrentTitle, bypassTranslation) {
        var displayQuality = bypassTranslation ? fullTorrentTitle : translateQualityLabel(qualityCode, fullTorrentTitle);

        var existingQualityElements = cardView.getElementsByClassName('card__quality');
        Array.from(existingQualityElements).forEach(el => el.parentNode.removeChild(el));

        var qualityDiv = document.createElement('div');
        qualityDiv.className = 'card__quality';
        var innerElement = document.createElement('div');
        innerElement.textContent = displayQuality;
        qualityDiv.appendChild(innerElement);
        cardView.appendChild(qualityDiv);
        // fade-in
        setTimeout(function(){ qualityDiv.classList.add('show'); }, 20);
    }

// ===================== processFullCardQuality (Р»РѕРіС–РєР° РїРѕРІРЅРѕС— РєР°СЂС‚РєРё) =====================
    function processFullCardQuality(cardData, renderElement) {
        if (!renderElement) {
            console.error("LQE-LOG", "Render element is null in processFullCardQuality. Aborting.");
            return;
        }
        var cardId = cardData.id;
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Processing full card. Data: ", cardData);
        var normalizedCard = {
            id: cardData.id,
            title: cardData.title || cardData.name || '',
            original_title: cardData.original_title || cardData.original_name || '',
            type: getCardType(cardData),
            release_date: cardData.release_date || cardData.first_air_date || ''
        };
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Normalized full card data: ", normalizedCard);
        var rateLine = $('.full-start-new__rate-line', renderElement);
        if (rateLine.length) {
            rateLine.css('visibility', 'hidden');
            rateLine.addClass('done');
            addLoadingAnimation(cardId, renderElement);
        } else {
            if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", .full-start-new__rate-line not found, skipping loading animation.");
        }
        var isTvSeries = (normalizedCard.type === 'tv' || normalizedCard.name);
        var cacheKey = LQE_CONFIG.CACHE_VERSION + '_' + (isTvSeries ? 'tv_' : 'movie_') + normalizedCard.id;

        var manualOverrideData = LQE_CONFIG.MANUAL_OVERRIDES[cardId];
        if (manualOverrideData) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Found manual override:", manualOverrideData);
            updateFullCardQualityElement(null, manualOverrideData.full_label, cardId, renderElement, true);
            removeLoadingAnimation(cardId, renderElement);
            rateLine.css('visibility', 'visible');
            return;
        }

        var cachedQualityData = getQualityCache(cacheKey);
        if (!(isTvSeries && LQE_CONFIG.SHOW_QUALITY_FOR_TV_SERIES === false)) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', Quality feature enabled for this content, starting processing.');
            if (cachedQualityData) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Quality data found in cache:", cachedQualityData);
                updateFullCardQualityElement(cachedQualityData.quality_code, cachedQualityData.full_label, cardId, renderElement);

                if (Date.now() - cachedQualityData.timestamp > LQE_CONFIG.CACHE_REFRESH_THRESHOLD_MS) {
                    if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Cache is old, scheduling background refresh AND UI update.");
                    getBestReleaseFromJacred(normalizedCard, cardId, function(jrResult) {
                        if (jrResult && jrResult.quality && jrResult.quality !== 'NO') {
                            saveQualityCache(cacheKey, {
                                quality_code: jrResult.quality,
                                full_label: jrResult.full_label
                            }, cardId);
                            updateFullCardQualityElement(jrResult.quality, jrResult.full_label, cardId, renderElement);
                            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Background cache and UI refresh completed.");
                        }
                    });
                }

                removeLoadingAnimation(cardId, renderElement);
                rateLine.css('visibility', 'visible');
            } else {
                clearFullCardQualityElements(cardId, renderElement);
                showFullCardQualityPlaceholder(cardId, renderElement);
                getBestReleaseFromJacred(normalizedCard, cardId, function(jrResult) {
                    if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', JacRed callback received for full card. Result:', jrResult);
                    var qualityCode = (jrResult && jrResult.quality) || null;
                    var fullTorrentTitle = (jrResult && jrResult.full_label) || null;
                    if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "JacRed returned - qualityCode:", qualityCode, "full label:", fullTorrentTitle);
                    if (qualityCode && qualityCode !== 'NO') {
                        if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', JacRed found quality code: ' + qualityCode + ', full label: ' + fullTorrentTitle);
                        saveQualityCache(cacheKey, {
                            quality_code: qualityCode,
                            full_label: fullTorrentTitle
                        }, cardId);
                        updateFullCardQualityElement(qualityCode, fullTorrentTitle, cardId, renderElement);
                    } else {
                        if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", 'card: ' + cardId + ', No quality found from JacRed or it was "NO". Clearing quality elements.');
                        clearFullCardQualityElements(cardId, renderElement);
                    }
                    removeLoadingAnimation(cardId, renderElement);
                    rateLine.css('visibility', 'visible');
                });
            }
        } else {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log('LQE-QUALITY', 'card: ' + cardId + ', Quality feature disabled for TV series (as configured), skipping quality fetch.');
            clearFullCardQualityElements(cardId, renderElement);
            removeLoadingAnimation(cardId, renderElement);
            rateLine.css('visibility', 'visible');
        }
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "card: " + cardId + ", Full card quality processing initiated.");
    }

// ===================== updateCardListQuality (СЃРїРёСЃРєРѕРІС– РєР°СЂС‚РєРё) =====================
    function updateCardListQuality(cardElement) {
        if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "updateCardListQuality called for card.");
        if (cardElement.hasAttribute('data-lqe-quality-processed')) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Card already processed, skipping:", cardElement.card_data ? cardElement.card_data.id : 'N/A');
            return;
        }
        var cardView = cardElement.querySelector('.card__view');
        var cardData = cardElement.card_data;
        if (!cardData || !cardView) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "cardData or cardView is null for card, skipping quality fetch.");
            return;
        }
        var isTvSeries = (getCardType(cardData) === 'tv');
        if (isTvSeries && LQE_CONFIG.SHOW_QUALITY_FOR_TV_SERIES === false) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Skipping TV series for quality update (as configured). Card:", cardData.id);
            return;
        }
        var normalizedCard = {
            id: cardData.id || '',
            title: cardData.title || cardData.name || '',
            original_title: cardData.original_title || cardData.original_name || '',
            type: getCardType(cardData),
            release_date: cardData.release_date || cardData.first_air_date || ''
        };
        var cardId = normalizedCard.id;
        var cacheKey = LQE_CONFIG.CACHE_VERSION + '_' + normalizedCard.type + '_' + cardId;
        cardElement.setAttribute('data-lqe-quality-processed', 'true');

        var manualOverrideData = LQE_CONFIG.MANUAL_OVERRIDES[cardId];
        if (manualOverrideData) {
            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Found manual override for card list:", manualOverrideData);
            updateCardListQualityElement(cardView, null, manualOverrideData.full_label, true);
            return;
        }

        var cachedQualityData = getQualityCache(cacheKey);
        if (cachedQualityData) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', Quality data found in cache for card list:', cachedQualityData);
            updateCardListQualityElement(cardView, cachedQualityData.quality_code, cachedQualityData.full_label);

            if (Date.now() - cachedQualityData.timestamp > LQE_CONFIG.CACHE_REFRESH_THRESHOLD_MS) {
                if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Cache is old, scheduling background refresh.");
                getBestReleaseFromJacred(normalizedCard, cardId, function(jrResult) {
                    if (jrResult && jrResult.quality && jrResult.quality !== 'NO') {
                        saveQualityCache(cacheKey, {
                            quality_code: jrResult.quality,
                            full_label: jrResult.full_label
                        }, cardId);
                        if (document.body.contains(cardElement)) {
                            updateCardListQualityElement(cardView, jrResult.quality, jrResult.full_label);
                            if (LQE_CONFIG.LOGGING_QUALITY) console.log("LQE-QUALITY", "card: " + cardId + ", Background cache and UI refresh completed for list card.");
                        }
                    }
                });
            }
            return;
        }

        // No cache -> run search (queued)
        getBestReleaseFromJacred(normalizedCard, cardId, function(jrResult) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', JacRed callback received for card list. Result:', jrResult);
            if (!document.body.contains(cardElement)) {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'Card removed from DOM during quality fetch:', cardId);
                return;
            }
            var qualityCode = (jrResult && jrResult.quality) || null;
            var fullTorrentTitle = (jrResult && jrResult.full_label) || null;
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST: JacRed returned - qualityCode:", qualityCode, "full label:", fullTorrentTitle);
            if (qualityCode && qualityCode !== 'NO') {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', JacRed found quality code: ' + qualityCode + ', full label: ' + fullTorrentTitle);
                saveQualityCache(cacheKey, {
                    quality_code: qualityCode,
                    full_label: fullTorrentTitle
                }, cardId);
                updateCardListQualityElement(cardView, qualityCode, fullTorrentTitle);
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', Added new quality element to card list.');
            } else {
                if (LQE_CONFIG.LOGGING_CARDLIST) console.log('LQE-CARDLIST', 'card: ' + cardId + ', No quality found from JacRed or it was "NO" for card list.');
            }
        });
    }

// ===================== MutationObserver optimization =====================
    var observer = new MutationObserver(function(mutations) {
        var newCards = [];
        for (var m = 0; m < mutations.length; m++) {
            var mutation = mutations[m];
            if (mutation.addedNodes) {
                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];
                    if (node.nodeType !== 1) continue;
                    if (node.classList && node.classList.contains('card')) {
                        newCards.push(node);
                    }
                    // also consider nodes that contain cards
                    try {
                        var nestedCards = node.querySelectorAll && node.querySelectorAll('.card');
                        if (nestedCards && nestedCards.length) {
                            for (var k = 0; k < nestedCards.length; k++) {
                                newCards.push(nestedCards[k]);
                            }
                        }
                    } catch (e) {}
                }
            }
        }
        if (newCards.length) {
            if (LQE_CONFIG.LOGGING_CARDLIST) console.log("LQE-CARDLIST", "Observer detected new cards. Total new cards:", newCards.length);
            newCards.forEach(updateCardListQuality);
        }
    });

    function attachObserver() {
        // try to observe known card containers to reduce noise
        var containers = document.querySelectorAll('.cards, .card-list, .content, .main, .cards-list, .preview__list');
        if (containers && containers.length) {
            for (var i = 0; i < containers.length; i++) {
                try {
                    observer.observe(containers[i], { childList: true, subtree: true });
                } catch (e) {
                    // fallback to body if any errors
                }
            }
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

// ===================== Initialization =====================
    function initializeLampaQualityPlugin() {
        if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "Lampa Quality Enhancer: Plugin Initialization Started!");
        window.lampaQualityPlugin = true;
        attachObserver();
        if (LQE_CONFIG.LOGGING_GENERAL) console.log('LQE-LOG: Initial observer for card lists started.');
        Lampa.Listener.follow('full', function(event) {
            if (event.type == 'complite') {
                var renderElement = event.object.activity.render();
                currentGlobalMovieId = event.data.movie.id;
                if (LQE_CONFIG.LOGGING_GENERAL) console.log("LQE-LOG", "Full card event 'complite' for ID:", currentGlobalMovieId);
                processFullCardQuality(event.data.movie, renderElement);
            }
        });
    }

    if (!window.lampaQualityPlugin) {
        initializeLampaQualityPlugin();
    }

})();
