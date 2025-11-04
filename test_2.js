(function() {    
    'use strict';    
    
    // Конфігурація    
    const PLUGIN_NAME = 'BackgroundTrailer';    
    const TMDB_API_KEY = '4045c616742d57a88740bd49b7ed31d7';  
    let DEBOUNCE_DELAY = 800;  
        
    let currentPlayer = null;    
    let debounceTimer = null;    
    let trailerCache = {};  
    
    // CSS стилі для фонового відео    
    function injectStyles() {    
        if (document.getElementById('bg-trailer-styles')) return;    
            
        const css = `    
            .card__view {    
                position: relative;    
                overflow: hidden;    
            }    
                
            .card__trailer-overlay {    
                position: absolute;    
                top: 0;    
                left: 0;    
                width: 100%;    
                height: 100%;    
                z-index: 1;    
                opacity: 0;    
                transition: opacity 0.5s ease;    
                pointer-events: none;    
            }    
                
            .card__trailer-overlay.active {    
                opacity: 1;    
            }    
                
            .card__trailer-overlay iframe {    
                width: 100%;    
                height: 100%;    
                border: none;    
            }    
                
            .card__img {    
                position: relative;    
                z-index: 2;    
                transition: opacity 0.5s ease;    
            }    
                
            .card.has-trailer-playing .card__img {    
                opacity: 0;    
            }    
        `;    
            
        const style = document.createElement('style');    
        style.id = 'bg-trailer-styles';    
        style.textContent = css;    
        document.head.appendChild(style);    
    }    
    
    // Завантаження YouTube IFrame API    
    function loadYouTubeAPI() {    
        if (window.YT && window.YT.Player) return Promise.resolve();    
            
        return new Promise((resolve) => {    
            if (window.onYouTubeIframeAPIReady) {    
                const oldCallback = window.onYouTubeIframeAPIReady;    
                window.onYouTubeIframeAPIReady = function() {    
                    oldCallback();    
                    resolve();    
                };    
            } else {    
                window.onYouTubeIframeAPIReady = resolve;    
            }    
                
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {    
                const tag = document.createElement('script');    
                tag.src = 'https://www.youtube.com/iframe_api';    
                document.head.appendChild(tag);    
            }    
        });    
    }    
    
    // Отримання трейлера через Lampac proxy  
    async function fetchTrailer(tmdbId, mediaType = 'movie') {    
        const cacheKey = `${mediaType}_${tmdbId}`;    
        if (trailerCache[cacheKey]) {    
            return trailerCache[cacheKey];    
        }    
    
        try {  
            // Використовуємо Lampac TMDB proxy замість прямого запиту  
            const url = `{localhost}/tmdb/api/3/${mediaType}/${tmdbId}/videos`;  
            const response = await fetch(url);    
            const data = await response.json();    
                
            if (data.results && data.results.length > 0) {    
                const trailer = data.results.find(v =>     
                    v.site === 'YouTube' &&     
                    (v.type === 'Trailer' || v.type === 'Teaser')    
                ) || data.results.find(v => v.site === 'YouTube');    
                    
                if (trailer) {    
                    trailerCache[cacheKey] = trailer.key;    
                    return trailer.key;    
                }    
            }    
        } catch (error) {    
            console.error('[BackgroundTrailer] Error fetching trailer:', error);    
        }    
            
        return null;    
    }    
    
    // Створення YouTube плеєра    
    function createPlayer(container, videoId) {    
        return new Promise((resolve) => {    
            const playerId = 'bg-trailer-' + Date.now();    
            const iframe = document.createElement('div');    
            iframe.id = playerId;    
            container.appendChild(iframe);    
                
            const player = new YT.Player(playerId, {    
                videoId: videoId,    
                playerVars: {    
                    autoplay: 1,    
                    mute: 1,    
                    controls: 0,    
                    showinfo: 0,    
                    modestbranding: 1,    
                    loop: 1,    
                    playlist: videoId,  
                    rel: 0,    
                    fs: 0,    
                    playsinline: 1    
                },    
                events: {    
                    onReady: () => resolve(player),    
                    onError: () => {    
                        console.error('[BackgroundTrailer] Player error');    
                        resolve(null);    
                    }    
                }    
            });    
        });    
    }    
    
    // Обробка фокусу на картці    
    async function handleCardFocus(cardElement) {    
        if (debounceTimer) {    
            clearTimeout(debounceTimer);    
        }    
    
        debounceTimer = setTimeout(async () => {    
            if (!Lampa.Storage.get('bg_trailer_enabled', true)) return;    
    
            const cardData = $(cardElement).data('card') || {};    
            const tmdbId = cardData.id;    
            const mediaType = cardData.name ? 'tv' : 'movie';  
    
            if (!tmdbId) return;    
    
            const cardView = cardElement.querySelector('.card__view');    
            if (!cardView) return;    
    
            let overlay = cardView.querySelector('.card__trailer-overlay');    
            if (!overlay) {    
                overlay = document.createElement('div');    
                overlay.className = 'card__trailer-overlay';    
                cardView.insertBefore(overlay, cardView.firstChild);    
            }    
    
            const trailerKey = await fetchTrailer(tmdbId, mediaType);    
            if (!trailerKey) return;    
    
            await loadYouTubeAPI();    
    
            overlay.innerHTML = '';  
            const player = await createPlayer(overlay, trailerKey);    
                
            if (player) {    
                currentPlayer = { player, cardElement, overlay };    
                overlay.classList.add('active');    
                cardElement.classList.add('has-trailer-playing');    
            }    
        }, DEBOUNCE_DELAY);    
    }    
    
    // Обробка втрати фокусу    
    function handleCardBlur(cardElement) {    
        if (debounceTimer) {    
            clearTimeout(debounceTimer);    
            debounceTimer = null;    
        }    
    
        if (currentPlayer && currentPlayer.cardElement === cardElement) {    
            try {    
                if (currentPlayer.player && currentPlayer.player.destroy) {    
                    currentPlayer.player.destroy();    
                }    
                if (currentPlayer.overlay) {    
                    currentPlayer.overlay.classList.remove('active');    
                    currentPlayer.overlay.innerHTML = '';    
                }    
                cardElement.classList.remove('has-trailer-playing');    
            } catch (error) {    
                console.error('[BackgroundTrailer] Error stopping player:', error);    
            }    
            currentPlayer = null;    
        }    
    }    
    
    // Додавання обробників подій до карток    
    function attachCardListeners() {    
        $(document).on('mouseenter', '.card', function() {    
            handleCardFocus(this);    
        });    
    
        $(document).on('mouseleave', '.card', function() {    
            handleCardBlur(this);    
        });    
    
        Lampa.Listener.follow('card', function(e) {    
            if (e.type === 'focus') {    
                handleCardFocus(e.card);    
            } else if (e.type === 'blur') {    
                handleCardBlur(e.card);    
            }    
        });    
    }    
    
    // Додавання налаштувань    
    function addSettings() {    
        Lampa.SettingsApi.addComponent({    
            component: 'bg_trailer',    
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',    
            name: 'Фонові трейлери'    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'bg_trailer',    
            param: {    
                name: 'bg_trailer_enabled',    
                type: 'trigger',    
                default: true    
            },    
            field: {    
                name: 'Увімкнути фонові трейлери при наведенні'    
            }    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'bg_trailer',    
            param: {    
                name: 'bg_trailer_delay',    
                type: 'select',    
                values: {    
                    500: '0.5 секунди',    
                    800: '0.8 секунди',    
                    1000: '1 секунда',    
                    1500: '1.5 секунди'    
                },    
                default: 800    
            },    
            field: {    
                name: 'Затримка перед запуском'    
            },    
            onChange: function(value) {    
                DEBOUNCE_DELAY = parseInt(value);    
            }    
        });    
    }    
    
    // Ініціалізація плагіна    
    function init() {    
        if (window.bg_trailer_ready) return;    
        window.bg_trailer_ready = true;    
    
        console.log('[BackgroundTrailer] Initializing...');    
            
        injectStyles();    
        addSettings();    
        attachCardListeners();    
            
        console.log('[BackgroundTrailer] Ready!');    
    }    
    
    // Запуск при готовності додатку    
    if (window.appready) {    
        init();    
    } else {    
        Lampa.Listener.follow('app', function(e) {    
            if (e.type === 'ready') {    
                init();    
            }    
        });    
    }    
})(); // <-- ВАЖЛИВО: Закриваюча дужка першої IIFE  
  
(function() {    
    'use strict';    
        
    function modifyCardifyStyles() {    
        const oldStyle = document.getElementById('cardify-compact-style');    
        if (oldStyle) oldStyle.remove();    
            
        const style = document.createElement('style');    
        style.id = 'cardify-compact-style';    
        style.textContent = `    
            .cardify {    
                position: fixed !important;    
                top: 50% !important;    
                left: 50% !important;    
                transform: translate(-50%, -50%) !important;    
                width: 70% !important;    
                height: 60% !important;    
                max-width: 1200px !important;    
                max-height: 700px !important;    
                z-index: 1000 !important;    
                border-radius: 12px !important;    
                overflow: hidden !important;    
                box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;    
            }    
                
            .cardify::before {    
                content: '' !important;    
                position: fixed !important;    
                top: 0 !important;    
                left: 0 !important;    
                right: 0 !important;    
                bottom: 0 !important;    
                background: rgba(0,0,0,0.7) !important;    
                z-index: -1 !important;    
                backdrop-filter: blur(8px) !important;    
                -webkit-backdrop-filter: blur(8px) !important;    
            }    
                
            .cardify iframe {    
                width: 100% !important;    
                height: 100% !important;    
                border: none !important;    
            }    
                
            .cardify__close {    
                position: absolute !important;    
                top: 20px !important;    
                right: 20px !important;    
                width: 40px !important;    
                height: 40px !important;    
                background: rgba(0,0,0,0.8) !important;    
                border-radius: 50% !important;    
                cursor: pointer !important;    
                z-index: 10 !important;    
                display: flex !important;    
                align-items: center !important;    
                justify-content: center !important;    
                transition: all 0.3s ease !important;    
            }    
                
            .cardify__close:hover {    
                background: rgba(255,255,255,0.2) !important;    
                transform: scale(1.1) !important;    
            }    
                
            .cardify__close::before,    
            .cardify__close::after {    
                content: '' !important;    
                position: absolute !important;    
                width: 20px !important;    
                height: 2px !important;    
                background: white !important;    
            }    
                
            .cardify__close::before {    
                transform: rotate(45deg) !important;    
            }    
                
            .cardify__close::after {    
                transform: rotate(-45deg) !important;    
            }    
                
            @media (max-width: 768px) {    
                .cardify {    
                    width: 90% !important;    
                    height: 50% !important;    
                }    
            }    
                
            @keyframes cardify-fadein {    
                from {    
                    opacity: 0;    
                    transform: translate(-50%, -50%) scale(0.9);    
                }    
                to {    
                    opacity: 1;    
                    transform: translate(-50%, -50%) scale(1);    
                }    
            }    
                
            .cardify {    
                animation: cardify-fadein 0.3s ease-out !important;    
            }    
        `;    
            
        document.head.appendChild(style);    
        console.log('[Cardify Compact] Стилі застосовано');    
    }    
        
    // Запускаємо після завантаження Cardify    
    if (window.appready) {    
        setTimeout(modifyCardifyStyles, 1000);    
    } else {    
        Lampa.Listener.follow('app', function(e) {    
            if (e.type === 'ready') {    
                setTimeout(modifyCardifyStyles, 1000);    
            }    
        });    
    }    
})();
