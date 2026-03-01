    function applyStyles() {
        var styleId = 'lampa-apple-tv-nuclear-clean';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 1. ПОВНЕ ВИДАЛЕННЯ СТАНДАРТНИХ ПАНЕЛЕЙ */
            /* Ми робимо їх прозорими і прибираємо будь-які маски/градієнти */
            .full-start-new, 
            .full-start-new__right, 
            .full-start-new__details,
            .full-start-new__details:before,
            .full-start-new__details:after {
                background: none !important;
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
                -webkit-mask-image: none !important;
                mask-image: none !important;
            }

            /* 2. ГОЛОВНИЙ ГРАДІЄНТ (Тільки один на весь екран) */
            .full-start-new {
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, transparent 100%) !important;
            }

            /* 3. ПОЗИЦІОНУВАННЯ КОНТЕНТУ */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 60px 5% !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 10 !important;
            }

            /* 4. ЛОГОТИП (Згідно з правилом UK/EN) */
            .apple-logo-container {
                margin-bottom: 10px;
                display: block !important;
            }
            
            .apple-logo-container img {
                max-width: 480px;
                max-height: 160px;
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
            }

            /* 5. МЕТА ТА РЕЙТИНГ */
            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 1.3rem;
                font-weight: 500;
                color: #fff;
                text-shadow: 0 2px 5px rgba(0,0,0,0.9);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
                letter-spacing: 0.5px;
            }

            /* 6. ОПИС (Обмеження 3 рядки, без фону) */
            .full-start-new__description {
                background: none !important;
                padding: 0 !important;
                margin: 0 0 30px 0 !important;
                font-size: 1.2rem !important;
                line-height: 1.6 !important;
                color: rgba(255,255,255,0.85) !important;
                max-width: 800px !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            }

            /* 7. КНОПКИ (Стиль Apple) */
            .full-start-new__buttons {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 15px !important;
                background: none !important;
                margin: 0 !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.12) !important;
                border: 1px solid rgba(255,255,255,0.05) !important;
                border-radius: 12px !important;
                backdrop-filter: blur(15px);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.08) translateY(-3px) !important;
                box-shadow: 0 10px 20px rgba(0,0,0,0.4) !important;
            }

            /* ПРИХОВУЄМО ВСЕ СТАРЕ */
            .full-start-new__left, 
            .full-start-new__title, 
            .full-start-new__tagline, 
            .full-start-new__status,
            .full-start-new__info {
                display: none !important;
            }
        </style>`;
        document.head.appendChild(style);
    }
