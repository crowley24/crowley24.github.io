(function () {
  'use strict';

  /* ======================================================
     INIT
  ====================================================== */
  function init() {
    if (!Lampa.Platform.screen('tv')) return;

    addTemplate();
    addStyles();
    attachListener();
  }

  /* ======================================================
     TEMPLATE (Netflix × Apple TV)
  ====================================================== */
  function addTemplate() {
    const template = `
      <div class="nf-card">
        <div class="nf-left">
          <div class="nf-logo"></div>
          <div class="nf-meta"></div>

          <div class="nf-buttons">
            <div class="nf-btn nf-btn--play selector button--play">
              ▶ <span>Play</span>
            </div>

            <div class="nf-btn selector">
              + <span>My List</span>
            </div>

            <div class="nf-btn selector">
              ⋯
            </div>
          </div>

          <div class="nf-desc"></div>
        </div>

        <div class="nf-right">
          <div class="full-start-new__reactions selector"></div>
        </div>
      </div>
    `;

    Lampa.Template.add('full_start_new', template);
  }

  /* ======================================================
     STYLES
  ====================================================== */
  function addStyles() {
    const css = `
      .nf-card {
        display: flex;
        height: 80vh;
        padding: 4vh 6vw;
        box-sizing: border-box;
      }

      .nf-left {
        flex: 1;
        max-width: 55vw;
      }

      .nf-logo img {
        max-height: 160px;
        max-width: 40vw;
        margin-bottom: 1em;
        opacity: 0;
        transform: translateY(20px);
        transition: all .4s ease;
      }

      .nf-logo.show img {
        opacity: 1;
        transform: translateY(0);
      }

      .nf-title {
        font-size: 3em;
        font-weight: 700;
        margin-bottom: .3em;
      }

      .nf-meta {
        font-size: 1.1em;
        opacity: 0;
        transform: translateY(15px);
        transition: all .4s ease .05s;
      }

      .nf-meta.show {
        opacity: .9;
        transform: translateY(0);
      }

      .nf-buttons {
        display: flex;
        gap: 1em;
        margin: 1.5em 0;
        opacity: 0;
        transform: translateY(15px);
        transition: all .4s ease .1s;
      }

      .nf-buttons.show {
        opacity: 1;
        transform: translateY(0);
      }

      .nf-btn {
        padding: .8em 1.4em;
        border-radius: .3em;
        background: rgba(255,255,255,.15);
        font-size: 1.1em;
      }

      .nf-btn--play {
        background: #fff;
        color: #000;
        font-weight: 600;
      }

      .nf-desc {
        font-size: .95em;
        max-width: 45vw;
        color: rgba(255,255,255,.7);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        opacity: 0;
        transform: translateY(15px);
        transition: all .4s ease .15s;
      }

      .nf-desc.show {
        opacity: 1;
        transform: translateY(0);
      }

      .nf-right {
        display: flex;
        align-items: flex-end;
      }
    `;

    $('body').append(`<style>${css}</style>`);
  }

  /* ======================================================
     DATA FILL
  ====================================================== */
  function fillUI(activity, data) {
    const render = activity.render();

    const meta = [];
    if (data.release_date || data.first_air_date) {
      meta.push((data.release_date || data.first_air_date).split('-')[0]);
    }

    if (data.genres && data.genres.length) {
      meta.push(data.genres.slice(0, 2).map(g => g.name).join(', '));
    }

    if (data.runtime) {
      meta.push(Math.floor(data.runtime / 60) + 'h ' + (data.runtime % 60) + 'm');
    }

    render.find('.nf-meta').text(meta.join(' · '));
    render.find('.nf-desc').text(data.overview || '');

    loadLogo(render, data);
    animateIn(activity);
  }

  /* ======================================================
     LOGO (TMDB)
  ====================================================== */
  function loadLogo(render, data) {
    const type = data.name ? 'tv' : 'movie';
    const lang = Lampa.Storage.get('language', 'en');

    const url = Lampa.TMDB.api(
      `${type}/${data.id}/images?api_key=${Lampa.TMDB.key()}`
    );

    $.get(url, res => {
      const logos = res.logos || [];
      const logo =
        logos.find(l => l.iso_639_1 === lang) ||
        logos.find(l => l.iso_639_1 === 'en') ||
        logos[0];

      if (logo) {
        const img = new Image();
        img.src = Lampa.TMDB.image(`/t/p/w500${logo.file_path}`);
        render.find('.nf-logo').html(img);
      } else {
        render.find('.nf-logo').html(
          `<div class="nf-title">${data.title || data.name}</div>`
        );
      }
    });
  }

  /* ======================================================
     ANIMATION (after background)
  ====================================================== */
  function animateIn(activity) {
    const render = activity.render();
    const bg = render.find('.full-start__background');

    const show = () => {
      render.find('.nf-logo').addClass('show');
      render.find('.nf-meta').addClass('show');
      render.find('.nf-buttons').addClass('show');
      render.find('.nf-desc').addClass('show');
    };

    if (bg.hasClass('loaded')) {
      setTimeout(show, 200);
    } else {
      const i = setInterval(() => {
        if (bg.hasClass('loaded')) {
          clearInterval(i);
          setTimeout(show, 200);
        }
      }, 50);
    }
  }

  /* ======================================================
     LISTENER
  ====================================================== */
  function attachListener() {
    Lampa.Listener.follow('full', e => {
      if (e.type !== 'complite') return;
      fillUI(e.object.activity, e.data.movie);
    });
  }

  /* ======================================================
     START
  ====================================================== */
  if (window.appready) init();
  else {
    Lampa.Listener.follow('app', e => {
      if (e.type === 'ready') init();
    });
  }

})();
