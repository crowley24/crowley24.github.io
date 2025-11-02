(function() {
    'use strict'; // Р’РёРєРѕСЂРёСЃС‚Р°РЅРЅСЏ СЃСѓРІРѕСЂРѕРіРѕ СЂРµР¶РёРјСѓ РґР»СЏ Р·Р°РїРѕР±С–РіР°РЅРЅСЏ РїРѕРјРёР»РѕРє

    // ===================== РљРћРќР¤Р†Р“РЈР РђР¦Р†РЇ =====================
    var LQE_CONFIG = {
        CACHE_VERSION: 2, // Р’РµСЂСЃС–СЏ РєРµС€Сѓ РґР»СЏ С–РЅРІР°Р»С–РґР°С†С–С— СЃС‚Р°СЂРёС… РґР°РЅРёС…
        LOGGING_GENERAL: false, // Р—Р°РіР°Р»СЊРЅРµ Р»РѕРіСѓРІР°РЅРЅСЏ РґР»СЏ РЅР°Р»Р°РіРѕРґР¶РµРЅРЅСЏ
        LOGGING_QUALITY: false, // Р›РѕРіСѓРІР°РЅРЅСЏ РїСЂРѕС†РµСЃСѓ РІРёР·РЅР°С‡РµРЅРЅСЏ СЏРєРѕСЃС‚С–
        LOGGING_CARDLIST: false, // Р›РѕРіСѓРІР°РЅРЅСЏ РґР»СЏ СЃРїРёСЃРєРѕРІРёС… РєР°СЂС‚РѕРє
        CACHE_VALID_TIME_MS: 24 * 60 * 60 * 1000, // Р§Р°СЃ Р¶РёС‚С‚СЏ РєРµС€Сѓ (24 РіРѕРґРёРЅРё)
        CACHE_REFRESH_THRESHOLD_MS: 12 * 60 * 60 * 1000, // Р§Р°СЃ РґР»СЏ С„РѕРЅРѕРІРѕРіРѕ РѕРЅРѕРІР»РµРЅРЅСЏ РєРµС€Сѓ (12 РіРѕРґРёРЅ)
        CACHE_KEY: 'lampa_quality_cache', // РљР»СЋС‡ РґР»СЏ Р·Р±РµСЂС–РіР°РЅРЅСЏ РєРµС€Сѓ РІ LocalStorage
        JACRED_PROTOCOL: 'http://', // РџСЂРѕС‚РѕРєРѕР» РґР»СЏ API JacRed
        JACRED_URL: 'jacred.xyz', // Р”РѕРјРµРЅ API JacRed
        JACRED_API_KEY: '', // РљР»СЋС‡ API (РЅРµ РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”С‚СЊСЃСЏ РІ РґР°РЅС–Р№ РІРµСЂСЃС–С—)
        PROXY_LIST: [ // РЎРїРёСЃРѕРє РїСЂРѕРєСЃС– СЃРµСЂРІРµСЂС–РІ РґР»СЏ РѕР±С…РѕРґСѓ CORS РѕР±РјРµР¶РµРЅСЊ
            'http://api.allorigins.win/raw?url=',
            'http://cors.bwa.workers.dev/'
        ],
        PROXY_TIMEOUT_MS: 4000, // РўР°Р№РјР°СѓС‚ РґР»СЏ РїСЂРѕРєСЃС– Р·Р°РїРёС‚С–РІ (4 СЃРµРєСѓРЅРґРё)
        SHOW_QUALITY_FOR_TV_SERIES: true, // вњ… РџРѕРєР°Р·СѓРІР°С‚Рё СЏРєС–СЃС‚СЊ РґР»СЏ СЃРµСЂС–Р°Р»С–РІ
        MAX_PARALLEL_REQUESTS: 12, // РњР°РєСЃРёРјР°Р»СЊРЅР° РєС–Р»СЊРєС–СЃС‚СЊ РїР°СЂР°Р»РµР»СЊРЅРёС… Р·Р°РїРёС‚С–РІ
        
        USE_SIMPLE_QUALITY_LABELS: true, // вњ… Р’РёРєРѕСЂРёСЃС‚РѕРІСѓРІР°С‚Рё СЃРїСЂРѕС‰РµРЅС– РјС–С‚РєРё СЏРєРѕСЃС‚С– (4K, FHD, TS, TC С‚РѕС‰Рѕ) "true" - С‚Р°Рє /  "false" - РЅС–
        
        // РЎС‚РёР»С– РґР»СЏ РІС–РґРѕР±СЂР°Р¶РµРЅРЅСЏ СЏРєРѕСЃС‚С– РЅР° РїРѕРІРЅС–Р№ РєР°СЂС‚С†С–
        FULL_CARD_LABEL_BORDER_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        FULL_CARD_LABEL_FONT_WEIGHT: 'normal',
        FULL_CARD_LABEL_FONT_SIZE: '1.2em',
        FULL_CARD_LABEL_FONT_STYLE: 'normal',
        
        // РЎС‚РёР»С– РґР»СЏ РІС–РґРѕР±СЂР°Р¶РµРЅРЅСЏ СЏРєРѕСЃС‚С– РЅР° СЃРїРёСЃРєРѕРІРёС… РєР°СЂС‚РєР°С…
        LIST_CARD_LABEL_BORDER_COLOR: '#3DA18D',
        LIST_CARD_LABEL_BACKGROUND_COLOR: 'rgba(61, 161, 141, 0.9)', //РЎС‚Р°РЅРґР°СЂС‚РЅР° РїСЂРѕР·РѕСЂС–СЃС‚СЊ С„РѕРЅСѓ 0.8 (1 - С„РѕРЅ РЅРµ РїСЂРѕР·РѕСЂРёР№)
        LIST_CARD_LABEL_BACKGROUND_TRANSPARENT: false,
        LIST_CARD_LABEL_TEXT_COLOR: '#FFFFFF',
        LIST_CARD_LABEL_FONT_WEIGHT: '600',
        LIST_CARD_LABEL_FONT_SIZE: '1.1em',
        LIST_CARD_LABEL_FONT_STYLE: 'normal',
        
        // Р СѓС‡РЅС– РїРµСЂРµРІРёР·РЅР°С‡РµРЅРЅСЏ СЏРєРѕСЃС‚С– РґР»СЏ РєРѕРЅРєСЂРµС‚РЅРёС… ID РєРѕРЅС‚РµРЅС‚Сѓ
        MANUAL_OVERRIDES: {
            /*'90802': { quality_code: 2160, full_label: '4K WEB-DLRip' },*/
            /*'20873': { quality_code: 2160, full_label: '4K BDRip' },*/
            /*'1128655': { quality_code: 2160, full_label: '4K Web-DL' },*/
            /*'46010': { quality_code: 1080, full_label: '1080p WEB-DLRip' },*/
            /*'9564': { quality_code: 1080, full_label: '1080p BDRemux' },*/
            /*'32334': { quality_code: 1080, full_label: '1080p WEB-DLRip' },*/
            /*'21028': { quality_code: 1080, full_label: '1080p BDRemux' },*/
            /*'20932': { quality_code: 1080, full_label: '1080p HDTVRip' },*/
            /*'57778': { quality_code: 2160, full_label: '4K Web-DL' },*/
            /*'20977': { quality_code: 1080, full_label: 'HDTVRip-AVC' },*/
            /*'33645': { quality_code: 720, full_label: '720p HDTVRip' }*/
        }
    };
    var currentGlobalMovieId = null; // Р—РјС–РЅРЅР° РґР»СЏ РІС–РґСЃС‚РµР¶РµРЅРЅСЏ РїРѕС‚РѕС‡РЅРѕРіРѕ ID С„С–Р»СЊРјСѓ

    // ===================== РњРђРџР Р”Р›РЇ РџРђР РЎРРќР“РЈ РЇРљРћРЎРўР† =====================
    
    // РњР°РїР° РґР»СЏ РїСЂСЏРјРёС… РІС–РґРїРѕРІС–РґРЅРѕСЃС‚РµР№ РЅР°Р·РІ СЏРєРѕСЃС‚С– (fallback)
    var QUALITY_DISPLAY_MAP = {
        "WEBRip 1080p | AVC @ Р·РІСѓРє СЃ TS": "1080P WEBRip/TS",
        "TeleSynch 1080P": "1080P TS",
        "4K Web-DL 10bit HDR P81 HEVC": "4K WEB-DL",
        "Telecine [H.264/1080P] [Р·РІСѓРє СЃ TS] [AD]": "1080P TS",
        "WEB-DLRip @ РЎРёРЅРµРјР° РЈРЎ": "WEB-DLRip",
        "UHD Blu-ray disc 2160p": "4K Blu-ray",
        "Blu-ray disc 1080P]": "1080P Blu-ray",
        "Blu-Ray Remux (1080P)": "1080P BDRemux",
        "BDRemux 1080P] [РљСЂСѓРїРЅРёР№ РїР»Р°РЅ]": "1080P BDRemux",
        "Blu-ray disc (custom) 1080P]": "1080P BDRip",
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
        "2025 / Р›Рњ / TC": "TC", // Telecine
      
        // РЎС‚Р°РЅРґР°СЂС‚РЅС– РІР°СЂС–Р°РЅС‚Рё СЏРєРѕСЃС‚С–
        "2160p": "4K", "4k": "4K", "4Рљ": "4K", "1080p": "1080p", "1080": "1080p", 
        "1080i": "1080p", "hdtv 1080i": "1080i FHDTV", "480p": "SD", "480": "SD",
        "web-dl": "WEB-DL", "webrip": "WEBRip", "web-dlrip": "WEB-DLRip",
        "bluray": "BluRay", "bdrip": "BDRip", "bdremux": "BDRemux",
        "hdtvrip": "HDTVRip", "dvdrip": "DVDRip", "ts": "TS", "camrip": "CAMRip",
  	  
        "blu-ray remux (2160p)": "4K BDRemux", "hdtvrip 2160p": "4K HDTVRip", "hybrid 2160p": "4K Hybrid",
        "web-dlrip (2160p)": "4K WEB-DLRip",
        "1080p web-dlrip": "1080p WEB-DLRip", "webdlrip": "WEB-DLRip", "hdtvrip-avc": "HDTVRip-AVC",
        "HDTVRip (1080p)": "1080p FHDTVRip", "hdrip": "HDRip",
        "hdtvrip (720p)": "720p HDTVRip",
        "dvdrip": "DVDRip", "hdtv": "HDTV", "dsrip": "DSRip", "satrip": "SATRip",
		"telecine": "TC", "tc": "TC", "ts": "TS"
      
    };

    // РњР°РїР° РґР»СЏ РІРёР·РЅР°С‡РµРЅРЅСЏ СЂРѕР·РґС–Р»СЊРЅРѕСЃС‚С– Р· РЅР°Р·РІРё
    var RESOLUTION_MAP = {
        "2160p":"4K", "2160":"4K", "4k":"4K", "4Рє":"4K", "uhd":"4K", "ultra hd":"4K", "ultrahd":"4K", "dci 4k":"4K",
        "1440p":"QHD", "1440":"QHD", "2k":"QHD", "qhd":"QHD",
        "1080p":"1080p", "1080":"1080p", "1080i":"1080i", "full hd":"1080p", "fhd":"1080p",
        "720p":"720p", "720":"720p", "hd":"720p", "hd ready":"720p",
        "576p":"576p", "576":"576p", "pal":"576p", 
        "480p":"480p", "480":"480p", "sd":"480p", "standard definition":"480p", "ntsc":"480p",
        "360p":"360p", "360":"360p", "low":"360p"
    };
    // РњР°РїР° РґР»СЏ РІРёР·РЅР°С‡РµРЅРЅСЏ РґР¶РµСЂРµР»Р° РІС–РґРµРѕ
    var SOURCE_MAP = {
        "blu-ray remux":"BDRemux", "uhd bdremux":"4K BDRemux", "bdremux":"BDRemux", 
        "remux":"BDRemux", "blu-ray disc":"Blu-ray", "bluray":"Blu-ray", 
        "blu-ray":"Blu-ray", "bdrip":"BDRip", "brrip":"BDRip",
        "uhd blu-ray":"4K Blu-ray", "4k blu-ray":"4K Blu-ray",
        "web-dl":"WEB-DL", "webdl":"WEB-DL", "web dl":"WEB-DL",
        "web-dlrip":"WEB-DLRip", "webdlrip":"WEB-DLRip", "web dlrip":"WEB-DLRip",
        "webrip":"WEBRip", "web rip":"WEBRip", "hdtvrip":"HDTVRip", 
        "hdtv":"HDTVRip", "hdrip":"HDRip", "dvdrip":"DVDRip", "dvd rip":"DVDRip", 
        "dvd":"DVD", "dvdscr":"DVDSCR", "scr":"SCR", "bdscr":"BDSCR", "r5":"R5",
        "hdrip": "HDRip",
        "screener": "SCR",
        "telecine":"TC", "tc":"TC", "hdtc":"TC", "telesync":"TS", "ts":"TS", 
        "hdts":"TS", "camrip":"CAMRip", "cam":"CAMRip", "hdcam":"CAMRip",
        "vhsrip":"VHSRip", "vcdrip":"VCDRip", "dcp":"DCP", "workprint":"Workprint", 
        "preair":"Preair", "tv":"TVRip", "line":"Line Audio", "hybrid":"Hybrid", 
        "uhd hybrid":"4K Hybrid", "upscale":"Upscale", "ai upscale":"AI Upscale",
        "bd3d":"3D Blu-ray", "3d blu-ray":"3D Blu-ray"
    };
    // РњР°РїР° РґР»СЏ СЃРїСЂРѕС‰РµРЅРЅСЏ РїРѕРІРЅРёС… РЅР°Р·РІ СЏРєРѕСЃС‚С– РґРѕ РєРѕСЂРѕС‚РєРёС… С„РѕСЂРјР°С‚С–РІ
    var QUALITY_SIMPLIFIER_MAP = {
    // РЇРєС–СЃС‚СЊ (СЂРѕР·РґС–Р»СЊРЅС–СЃС‚СЊ)
    "2160p": "4K", "2160": "4K", "4k": "4K", "4Рє": "4K", "uhd": "4K", "ultra hd": "4K", "dci 4k": "4K", "ultrahd": "4K",
    "1440p": "QHD", "1440": "QHD", "2k": "QHD", "qhd": "QHD",
    "1080p": "FHD", "1080": "FHD", "1080i": "FHD", "full hd": "FHD", "fhd": "FHD",
    "720p": "HD", "720": "HD", "hd ready": "HD", "hd": "HD",
    "480p": "SD", "480": "SD", "sd": "SD", "pal": "SD", "ntsc": "SD", "576p": "SD", "576": "SD",
    "360p": "LQ", "360": "LQ",

    // РџРѕРіР°РЅР° СЏРєС–СЃС‚СЊ (РґР¶РµСЂРµР»Рѕ) - РјР°СЋС‚СЊ РїСЂС–РѕСЂРёС‚РµС‚ РЅР°Рґ СЂРѕР·РґС–Р»СЊРЅС–СЃС‚СЋ РїСЂРё РІС–РґРѕР±СЂР°Р¶РµРЅРЅС–
    "camrip": "CamRip", "cam": "CamRip", "hdcam": "CamRip", "РєР°РјСЂРёРї": "CamRip",
    "telesync": "TS", "ts": "TS", "hdts": "TS", "С‚РµР»РµСЃРёРЅРє": "TS",
    "telecine": "TC", "tc": "TC", "hdtc": "TC", "С‚РµР»РµСЃРёРЅ": "TC",
    "dvdscr": "SCR", "scr": "SCR", "bdscr": "SCR", "screener": "SCR",

    // РЇРєС–СЃРЅС– РґР¶РµСЂРµР»Р°
    "remux": "Remux", "bdremux": "Remux", "blu-ray remux": "Remux",
    "bluray": "BR", "blu-ray": "BR", "bdrip": "BRip", "brrip": "BRip",
    "web-dl": "WebDL", "webdl": "WebDL",
    "webrip": "WebRip", "web-dlrip": "WebDLRip", "webdlrip": "WebDLRip",
    "hdtv": "HDTV", "hdtvrip": "HDTV",
    "hdrip": "HDRip",
    "dvdrip": "DVDRip", "dvd": "DVD"
    };
    // ===================== РЎРўРР›Р† CSS =====================
    
    // РћСЃРЅРѕРІРЅС– СЃС‚РёР»С– РґР»СЏ РІС–РґРѕР±СЂР°Р¶РµРЅРЅСЏ СЏРєРѕСЃС‚С–
    var styleLQE = "<style id=\"lampa_quality_styles\">" +
        ".full-start-new__rate-line {" + // РљРѕРЅС‚РµР№РЅРµСЂ РґР»СЏ Р»С–РЅС–С— СЂРµР№С‚РёРЅРіСѓ РїРѕРІРЅРѕС— РєР°СЂС‚РєРё
        "visibility: hidden;" + // РџСЂРёС…РѕРІР°РЅРѕ РїС–Рґ С‡Р°СЃ Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
        "flex-wrap: wrap;" + // Р”РѕР·РІРѕР»РёС‚Рё РїРµСЂРµРЅРѕСЃ РµР»РµРјРµРЅС‚С–РІ
        "gap: 0.4em 0;" + // Р’С–РґСЃС‚СѓРїРё РјС–Р¶ РµР»РµРјРµРЅС‚Р°РјРё
        "}" +
        ".full-start-new__rate-line > * {" + // РЎС‚РёР»С– РґР»СЏ РІСЃС–С… РґС–С‚РµР№ Р»С–РЅС–С— СЂРµР№С‚РёРЅРіСѓ
        "margin-right: 0.5em;" + // Р’С–РґСЃС‚СѓРї РїСЂР°РІРѕСЂСѓС‡
        "flex-shrink: 0;" + // Р—Р°Р±РѕСЂРѕРЅРёС‚Рё СЃС‚РёСЃРєР°РЅРЅСЏ
        "flex-grow: 0;" + // Р—Р°Р±РѕСЂРѕРЅРёС‚Рё СЂРѕР·С‚СЏРіСѓРІР°РЅРЅСЏ
        "}" +
        ".lqe-quality {" + // РЎС‚РёР»С– РґР»СЏ РјС–С‚РєРё СЏРєРѕСЃС‚С– РЅР° РїРѕРІРЅС–Р№ РєР°СЂС‚С†С–
        "min-width: 2.8em;" + // РњС–РЅС–РјР°Р»СЊРЅР° С€РёСЂРёРЅР°
        "text-align: center;" + // Р’РёСЂС–РІРЅСЋРІР°РЅРЅСЏ С‚РµРєСЃС‚Сѓ РїРѕ С†РµРЅС‚СЂСѓ
        "text-transform: none;" + // Р‘РµР· С‚СЂР°РЅСЃС„РѕСЂРјР°С†С–С— С‚РµРєСЃС‚Сѓ
        "border: 1px solid " + LQE_CONFIG.FULL_CARD_LABEL_BORDER_COLOR + " !important;" + // РљРѕР»С–СЂ СЂР°РјРєРё Р· РєРѕРЅС„С–РіСѓСЂР°С†С–С—
        "color: " + LQE_CONFIG.FULL_CARD_LABEL_TEXT_COLOR + " !important;" + // РљРѕР»С–СЂ С‚РµРєСЃС‚Сѓ
        "font-weight: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_WEIGHT + " !important;" + // РўРѕРІС‰РёРЅР° С€СЂРёС„С‚Сѓ
        "font-size: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_SIZE + " !important;" + // Р РѕР·РјС–СЂ С€СЂРёС„С‚Сѓ
        "font-style: " + LQE_CONFIG.FULL_CARD_LABEL_FONT_STYLE + " !important;" + // РЎС‚РёР»СЊ С€СЂРёС„С‚Сѓ
        "border-radius: 0.2em;" + // Р—Р°РєСЂСѓРіР»РµРЅРЅСЏ РєСѓС‚С–РІ
        "padding: 0.3em;" + // Р’РЅСѓС‚СЂС–С€РЅС– РІС–РґСЃС‚СѓРїРё
        "height: 1.72em;" + // Р¤С–РєСЃРѕРІР°РЅР° РІРёСЃРѕС‚Р°
        "display: flex;" + // Flexbox РґР»СЏ С†РµРЅС‚СЂСѓРІР°РЅРЅСЏ
        "align-items: center;" + // Р’РµСЂС‚РёРєР°Р»СЊРЅРµ С†РµРЅС‚СЂСѓРІР°РЅРЅСЏ
        "justify-content: center;" + // Р“РѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРµ С†РµРЅС‚СЂСѓРІР°РЅРЅСЏ
        "box-sizing: border-box;" + // Box-model
        "}" +
        ".card__view {" + // РљРѕРЅС‚РµР№РЅРµСЂ РґР»СЏ РєР°СЂС‚РєРё Сѓ СЃРїРёСЃРєСѓ
        " position: relative; " + // Р’С–РґРЅРѕСЃРЅРµ РїРѕР·РёС†С–РѕРЅСѓРІР°РЅРЅСЏ
        "}" +
        ".card__quality {" + // РЎС‚РёР»С– РґР»СЏ РјС–С‚РєРё СЏРєРѕСЃС‚С– РЅР° СЃРїРёСЃРєРѕРІС–Р№ РєР°СЂС‚С†С–
        " position: absolute; " + // РђР±СЃРѕР»СЋС‚РЅРµ РїРѕР·РёС†С–РѕРЅСѓРІР°РЅРЅСЏ
        " bottom: 0.50em; " + // Р’С–РґСЃС‚СѓРї РІС–Рґ РЅРёР·Сѓ
        " left: 0; " + // Р’РёСЂС–РІРЅСЋРІР°РЅРЅСЏ РїРѕ Р»С–РІРѕРјСѓ РєСЂР°СЋ
		" margin-left: -0.78em; " + //Р’Р†Р”РЎРўРЈРџ Р·Р° Р»С–РІРёР№ РєСЂР°Р№ 
        " background-color: " + (LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_TRANSPARENT ? "transparent" : LQE_CONFIG.LIST_CARD_LABEL_BACKGROUND_COLOR) + " !important;" + // РљРѕР»С–СЂ С„РѕРЅСѓ
        " z-index: 10;" + // Z-index РґР»СЏ РїРѕРІРµСЂС… С–РЅС€РёС… РµР»РµРјРµРЅС‚С–РІ
        " width: fit-content; " + // РЁРёСЂРёРЅР° РїРѕ РІРјС–СЃС‚Сѓ
        " max-width: calc(100% - 1em); " + // РњР°РєСЃРёРјР°Р»СЊРЅР° С€РёСЂРёРЅР°
        " border-radius: 0.3em 0.3em 0.3em 0.3em; " + // Р—Р°РєСЂСѓРіР»РµРЅРЅСЏ РєСѓС‚С–РІ
        " overflow: hidden;" + // РћР±СЂС–Р·Р°РЅРЅСЏ РїРµСЂРµРїРѕРІРЅРµРЅРЅСЏ
        "}" +
        ".card__quality div {" + // РЎС‚РёР»С– РґР»СЏ С‚РµРєСЃС‚Сѓ РІСЃРµСЂРµРґРёРЅС– РјС–С‚РєРё СЏРєРѕСЃС‚С–
        " text-transform: uppercase; " + // Р’РµР»РёРєС– Р»С–С‚РµСЂРё
        " font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif; " + // РЁСЂРёС„С‚
        " font-weight: 700; " + // Р–РёСЂРЅРёР№ С€СЂРёС„С‚
        " letter-spacing: 0.1px; " + // Р’С–РґСЃС‚Р°РЅСЊ РјС–Р¶ Р»С–С‚РµСЂР°РјРё
        " font-size: 1.10em; " + // Р РѕР·РјС–СЂ С€СЂРёС„С‚Сѓ
        " color: " + LQE_CONFIG.LIST_CARD_LABEL_TEXT_COLOR + " !important;" + // РљРѕР»С–СЂ С‚РµРєСЃС‚Сѓ
        " padding: 0.1em 0.1em 0.08em 0.1em; " + // Р’РЅСѓС‚СЂС–С€РЅС– РІС–РґСЃС‚СѓРїРё
        " white-space: nowrap;" + // Р—Р°Р±РѕСЂРѕРЅРёС‚Рё РїРµСЂРµРЅРѕСЃ С‚РµРєСЃС‚Сѓ
        " text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3); " + // РўС–РЅСЊ С‚РµРєСЃС‚Сѓ
        "}" +
        "</style>";
    // Р”РѕРґР°С”РјРѕ СЃС‚РёР»С– РґРѕ DOM
    Lampa.Template.add('lampa_quality_css', styleLQE);
    $('body').append(Lampa.Template.get('lampa_quality_css', {}, true));
    // РЎС‚РёР»С– РґР»СЏ РїР»Р°РІРЅРѕРіРѕ Р·'СЏРІР»РµРЅРЅСЏ РјС–С‚РѕРє СЏРєРѕСЃС‚С–
	var fadeStyles = "<style id='lampa_quality_fade'>" +
   		".card__quality, .full-start__status.lqe-quality {" + // Р•Р»РµРјРµРЅС‚Рё РґР»СЏ Р°РЅС–РјР°С†С–С—
        "opacity: 0;" + // РџРѕС‡Р°С‚РєРѕРІРѕ РїСЂРѕР·РѕСЂС–
        "transition: opacity 0.22s ease-in-out;" + // РџР»Р°РІРЅР° Р·РјС–РЅР° РїСЂРѕР·РѕСЂРѕСЃС‚С–
    	"}" +
    	".card__quality.show, .full-start__status.lqe-quality.show {" + // РљР»Р°СЃ РґР»СЏ РїРѕРєР°Р·Сѓ
        "opacity: 1;" + // РџРѕРІРЅС–СЃС‚СЋ РІРёРґРёРјС–
    	"}" +
    	".card__quality.show.fast, .full-start__status.lqe-quality.show.fast {" + // Р’РёРјРєРЅРµРЅРЅСЏ РїРµСЂРµС…РѕРґСѓ
        "transition: none !important;" +
    	"}" +
		"</style>";

    Lampa.Template.add('lampa_quality_fade', fadeStyles);
    $('body').append(Lampa.Template.get('lampa_quality_fade', {}, true));

    // РЎС‚РёР»С– РґР»СЏ Р°РЅС–РјР°С†С–С— Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ (РєСЂР°РїРєРё)
    var loadingStylesLQE = "<style id=\"lampa_quality_loading_animation\">" +
        ".loading-dots-container {" + // РљРѕРЅС‚РµР№РЅРµСЂ РґР»СЏ Р°РЅС–РјР°С†С–С— Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
        "    position: absolute;" + // РђР±СЃРѕР»СЋС‚РЅРµ РїРѕР·РёС†С–РѕРЅСѓРІР°РЅРЅСЏ
        "    top: 50%;" + // РџРѕ С†РµРЅС‚СЂСѓ РІРµСЂС‚РёРєР°Р»С–
        "    left: 0;" + // Р›С–РІРёР№ РєСЂР°Р№
        "    right: 0;" + // РџСЂР°РІРёР№ РєСЂР°Р№
        "    text-align: left;" + // Р’РёСЂС–РІРЅСЋРІР°РЅРЅСЏ С‚РµРєСЃС‚Сѓ Р»С–РІРѕСЂСѓС‡
        "    transform: translateY(-50%);" + // Р¦РµРЅС‚СЂСѓРІР°РЅРЅСЏ РїРѕ РІРµСЂС‚РёРєР°Р»С–
        "    z-index: 10;" + // РџРѕРІРµСЂС… С–РЅС€РёС… РµР»РµРјРµРЅС‚С–РІ
        "}" +
        ".full-start-new__rate-line {" + // Р›С–РЅС–СЏ СЂРµР№С‚РёРЅРіСѓ
        "    position: relative;" + // Р’С–РґРЅРѕСЃРЅРµ РїРѕР·РёС†С–РѕРЅСѓРІР°РЅРЅСЏ РґР»СЏ Р°Р±СЃРѕР»СЋС‚РЅРёС… РґС–С‚РµР№
        "}" +
        ".loading-dots {" + // РљРѕРЅС‚РµР№РЅРµСЂ РєСЂР°РїРѕРє Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
        "    display: inline-flex;" + // Inline-flex РґР»СЏ РІРёСЂС–РІРЅСЋРІР°РЅРЅСЏ
        "    align-items: center;" + // Р¦РµРЅС‚СЂСѓРІР°РЅРЅСЏ РїРѕ РІРµСЂС‚РёРєР°Р»С–
        "    gap: 0.4em;" + // Р’С–РґСЃС‚СѓРїРё РјС–Р¶ РµР»РµРјРµРЅС‚Р°РјРё
        "    color: #ffffff;" + // РљРѕР»С–СЂ С‚РµРєСЃС‚Сѓ
        "    font-size: 0.7em;" + // Р РѕР·РјС–СЂ С€СЂРёС„С‚Сѓ
        "    background: rgba(0, 0, 0, 0.3);" + // РќР°РїС–РІРїСЂРѕР·РѕСЂРёР№ С„РѕРЅ
        "    padding: 0.6em 1em;" + // Р’РЅСѓС‚СЂС–С€РЅС– РІС–РґСЃС‚СѓРїРё
        "    border-radius: 0.5em;" + // Р—Р°РєСЂСѓРіР»РµРЅРЅСЏ РєСѓС‚С–РІ
        "}" +
        ".loading-dots__text {" + // РўРµРєСЃС‚ "РџРѕС€СѓРє..."
        "    margin-right: 1em;" + // Р’С–РґСЃС‚СѓРї РїСЂР°РІРѕСЂСѓС‡
        "}" +
        ".loading-dots__dot {" + // РћРєСЂРµРјС– РєСЂР°РїРєРё
        "    width: 0.5em;" + // РЁРёСЂРёРЅР° РєСЂР°РїРєРё
        "    height: 0.5em;" + // Р’РёСЃРѕС‚Р° РєСЂР°РїРєРё
        "    border-radius: 50%;" + // РљСЂСѓРіР»Р° С„РѕСЂРјР°
        "    background-color: currentColor;" + // РљРѕР»С–СЂ СЏРє Сѓ С‚РµРєСЃС‚Сѓ
        "    opacity: 0.3;" + // РќР°РїС–РІРїСЂРѕР·РѕСЂС–СЃС‚СЊ
        "    animation: loading-dots-fade 1.5s infinite both;" + // РђРЅС–РјР°С†С–СЏ
        "}" +
        ".loading-dots__dot:nth-child(1) {" + // РџРµСЂС€Р° РєСЂР°РїРєР°
        "    animation-delay: 0s;" + // Р‘РµР· Р·Р°С‚СЂРёРјРєРё
        "}" +
        ".loading-dots__dot:nth-child(2) {" + // Р”СЂСѓРіР° РєСЂР°РїРєР°
        "    animation-delay: 0.5s;" + // Р—Р°С‚СЂРёРјРєР° 0.5СЃ
        "}" +
        ".loading-dots__dot:nth-child(3) {" + // РўСЂРµС‚СЏ РєСЂР°РїРєР°
        "    animation-delay: 1s;" + // Р—Р°С‚СЂРёРјРєР° 1СЃ
        "}" +
        "@keyframes loading-dots-fade {" + // РђРЅС–РјР°С†С–СЏ РјРёРіРѕС‚С–РЅРЅСЏ РєСЂР°РїРѕРє
        "    0%, 90%, 100% { opacity: 0.3; }" + // РќРёР·СЊРєР° РїСЂРѕР·РѕСЂС–СЃС‚СЊ
        "    35% { opacity: 1; }" + // РџС–Рє РІРёРґРёРјРѕСЃС‚С–
        "}" +
        "@media screen and (max-width: 480px) { .loading-dots-container { -webkit-justify-content: center; justify-content: center; text-align: center; max-width: 100%; }}" + // РђРґР°РїС‚Р°С†С–СЏ РґР»СЏ РјРѕР±С–Р»СЊРЅРёС…
        "</style>";

    Lampa.Template.add('lampa_quality_loading_animation_css', loadingStylesLQE);
    $('body').append(Lampa.Template.get('lampa_quality_loading_animation_css', {}, true));

    // ===================== РњР•Р Р•Р–Р•Р’Р† Р¤РЈРќРљР¦Р†Р‡ =====================
    
    /**
     * Р’РёРєРѕРЅСѓС” Р·Р°РїРёС‚ С‡РµСЂРµР· РїСЂРѕРєСЃС– Р· РѕР±СЂРѕР±РєРѕСЋ РїРѕРјРёР»РѕРє
     * @param {string} url - URL РґР»СЏ Р·Р°РїРёС‚Сѓ
     * @param {string} cardId - ID РєР°СЂС‚РєРё РґР»СЏ Р»РѕРіСѓРІР°РЅРЅСЏ
     * @param {function} callback - Callback С„СѓРЅРєС†С–СЏ
     */
    function fetchWithProxy(url, cardId, callback) {
        var currentProxyIndex = 0; // РџРѕС‚РѕС‡РЅРёР№ С–РЅРґРµРєСЃ РїСЂРѕРєСЃС– РІ СЃРїРёСЃРєСѓ
        var callbackCalled = false; // РџСЂР°РїРѕСЂРµС†СЊ РІРёРєР»РёРєСѓ callback

        // Р РµРєСѓСЂСЃРёРІРЅР° С„СѓРЅРєС†С–СЏ СЃРїСЂРѕР± С‡РµСЂРµР· СЂС–Р·РЅС– РїСЂРѕРєСЃС–
        function tryNextProxy() {
            // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РЅРµ РІРёС‡РµСЂРїР°РЅРѕ РІСЃС– РїСЂРѕРєСЃС–
            if (currentProxyIndex >= LQE_CONFIG.PROXY_LIST.length) {
                if (!callbackCalled) { // РЇРєС‰Рѕ callback С‰Рµ РЅРµ РІРёРєР»РёРєР°РЅРѕ
                    callbackCa
