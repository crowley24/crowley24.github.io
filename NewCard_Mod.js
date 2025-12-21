// ===============================================
// NETFLIX-LIKE LOGO PLUGIN FOR LAMPA (IIFE VERSION)
// ===============================================

(function () {
  'use strict';

  const API_KEY = 'YOUR_TMDB_API_KEY'; // <--- !!! ВАЖЛИВО: ЗАМІНІТЬ НА ВАШ КЛЮЧ !!!
  const BASE_IMAGE_URL = 'https://image.tmdb.org/t/p/w500'; 

  class NetflixLogoPlugin {
      
      constructor() {
          if (API_KEY === 'YOUR_TMDB_API_KEY') {
              console.error('NetflixLogoPlugin: Please replace "YOUR_TMDB_API_KEY" with your actual TMDb key.');
          }
          this.componentName = 'netflix_logo_plugin_details';
          this.addBaseStyles();
      }

      /**
       * Додає базові CSS-стилі
       */
      addBaseStyles() {
          const style = document.createElement('style');
          style.innerHTML = `
              /* Стиль для елемента-заміни (логотипу) */
              .netflix-logo-style {
                  max-width: 60%; 
                  height: auto;
                  margin-top: 15px;
                  margin-bottom: 5px;
                  display: block;
                  filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.9)); 
              }
          `;
          document.head.appendChild(style);
      }

      /**
       * Отримання URL логотипу фільму з TMDb
       */
      async getMovieLogoUrl(tmdb_id) {
          if (!tmdb_id || API_KEY === 'YOUR_TMDB_API_KEY') return null;

          const url = `https://api.themoviedb.org/3/movie/${tmdb_id}/images?api_key=${API_KEY}`;
          
          try {
              const response = await fetch(url);
              if (!response.ok) return null;

              const data = await response.json();
              const logos = data.logos;

              if (logos && logos.length > 0) {
                  const preferredLogo = logos.find(logo => logo.iso_639_1 === 'uk') || 
                                        logos.find(logo => logo.iso_639_1 === 'en') || 
                                        logos[0]; 

                  return BASE_IMAGE_URL + preferredLogo.file_path;
              }

              return null;
              
          } catch (e) {
              console.error('NetflixLogoPlugin: Error fetching logo from TMDb:', e);
              return null;
          }
      }

      /**
       * Заміна текстової назви на елемент зображення.
       */
      replaceTitleWithLogo(container, title, logoUrl) {
          
          let titleElement = container.querySelector('.full-card__title'); 
          
          if (!titleElement) {
               titleElement = container.querySelector('h1');
          }

          if (titleElement) {
              console.log('NetflixLogoPlugin: Title element FOUND! Replacing with logo.');
              
              const logoImage = document.createElement('img');
              logoImage.src = logoUrl;
              logoImage.alt = title;
              logoImage.className = 'netflix-logo-style'; 

              titleElement.parentNode.insertBefore(logoImage, titleElement);
              titleElement.style.display = 'none'; 
              
          } else {
              console.error('NetflixLogoPlugin: Title element NOT found. Check DOM structure/selector.');
          }
      }


      /**
       * Основна функція для підключення до подій Lampa
       */
      attachHooks() {
          console.log('NetflixLogoPlugin: Attaching to full_card events...');
          
          // Lampa.Listener.follow дозволяє нам "вклинитися" в життєвий цикл компонента
          Lampa.Listener.follow('full_card', (event) => {
              
              if (event.type === 'render' && event.data.movie) {
                  const movie = event.data.movie;
                  const tmdbId = movie.tmdb_id || movie.id; 

                  console.log('NetflixLogoPlugin: Event fired for movie:', movie.name, 'ID:', tmdbId);
                  
                  if (tmdbId) {
                      this.getMovieLogoUrl(tmdbId).then(logoUrl => {
                          if (logoUrl) {
                              this.replaceTitleWithLogo(event.data.element, movie.name, logoUrl);
                          } else {
                              console.log('NetflixLogoPlugin: No logo found, keeping original title.');
                          }
                      });
                  }
              }
          });
      }

      // Функції життєвого циклу, необхідні для реєстрації в Lampa
      init() {
          this.attachHooks();
      }
      build() {}
      destroy() {}
  }

  // -----------------------------------------------
  // РЕЄСТРАЦІЯ ПЛАГІНА В СИСТЕМІ LAMPA
  // -----------------------------------------------

  if (window.Lampa) {
      if (!window.plugins) {
          window.plugins = {};
      }
      
      const logoPlugin = new NetflixLogoPlugin();
      
      // Реєстрація та ініціалізація
      window.plugins[logoPlugin.componentName] = logoPlugin;
      logoPlugin.init();
      
      console.log(`NetflixLogoPlugin (${logoPlugin.componentName}): Successfully registered and initialized.`);
  }

})(); // Кінець IIFE

