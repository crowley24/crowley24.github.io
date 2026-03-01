    function applyStyles() {
        var styleId = 'lampa-apple-tv-final-clean';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 1. ТОТАЛЬНА АНІГІЛЯЦІЯ ФОНУ ТА ГРАДІЄНТІВ */
            .full-start-new__details,
            .full-start-new__details:before,
            .full-start-new__details:after,
            .full-start-new__right,
            .full-start-new__right:before,
            .full-start-new__right:after,
            .full-start-new { 
                background: none !important; 
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
                -webkit-mask-image: none !important;
                mask-image: none !important;
            }

            /* 2. НОВИЙ ЧИСТИЙ ЛЕЙАУТ ПРАВОЇ ПАНЕЛІ */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 60px 5% !important;
                /* Тільки один м'який градієнт знизу для всього екрана */
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 35%, transparent 100%) !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 100 !important;
            }

            /* 3. ОЧИЩЕННЯ ОПИСУ ТА ТЕКСТУ */
            .full-start-new__description {
                background: transparent !important;
                padding: 0 !important;
                margin: 0 0 25px 0 !important;
                max-width: 750px !important;
                font-size: 1.15rem !important;
                color: rgba(255,255,255,0.85) !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.7) !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
            }

            /* 4. APPLE-STYLE ЛОГО */
            .apple-logo-container {
                margin-bottom: 10px;
                z-index: 101;
            }

            .apple-logo-container img {
                max-width: 450px;
                max-height: 140px;
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
            }

            /* 5. МЕТА-ДАНІ ТА РЕЙТИНГ */
            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 1.25rem;
                color: #fff;
                font-weight: 500;
                text-shadow: 0 2px 5px rgba(0,0,0,0.8);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
            }

            /* 6. КНОПКИ (Прозорі з блюром) */
            .full-start-new__buttons {
                display: flex !important;
                gap: 15px !important;
                background: transparent !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.12) !important;
                backdrop-filter: blur(15px);
                border-radius: 14px !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.08);
            }

            /* Приховуємо все зайве */
            .full-start-new__left, .full-start-new__tagline, 
            .full-start-new__status, .full-start-new__title,
            .full-start-new__info { 
                display: none !important; 
            }
        </style>`;
        document.head.appendChild(style);
    }
