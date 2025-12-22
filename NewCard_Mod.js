(function () {
  'use strict';

  if (!Lampa.Platform.screen('tv')) return;

  /* =========================
     1. TEMPLATE (ГОЛОВНЕ)
     ========================= */

  Lampa.Template.add('full_start', `
    <div class="nf-full">
      <div class="nf-left">
        <div class="nf-studio"></div>
        <div class="nf-logo"></div>
        <div class="nf-meta"></div>
        <div class="nf-desc"></div>
        <div class="nf-buttons"></div>
      </div>
    </div>
  `);

  /* =========================
     2. СТИЛІ
     ========================= */

  const css = `
    .nf-full {
      padding: 4vh 5vw;
      height: 100%;
      display: flex;
      align-items: flex-end;
      background: linear-gradient(to right, rgba(0,0,0,.85) 40%, transparent);
    }
    .nf-logo img {
      max-width: 40vw;
      max-height: 200px;
      margin-bottom: 1em;
    }
    .nf-studio img {
      max-height: 40px;
      margin-bottom: 1em;
      filter: invert(1);
    }
    .nf-meta {
      font-size: 1.1em;
      opacity: .9;
      margin-bottom: .8em;
    }
    .nf-desc {
      max-width: 40vw;
      line-height: 1.5;
      opacity: .8;
      margin-bottom: 1.2em;
    }
  `;
  $('head').append(`<style>${css}</style>`);

  /* =========================
     3. ДАНІ (LOGO / META)
     ========================= */

  function loadData(event) {
    const data = event?.data?.movie;
    const activity = event?.object?.activity;
    if (!data || !activity) return;

    const render = activity.render();

    /* META */
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    const genres = (data.genres || []).slice(0, 2).map(g => g.name).join(' · ');
    const runtime = data.runtime
      ? Math.floor(data.runtime / 60) + 'h ' + (data.runtime % 60) + 'm'
      : '';

    render.find('.nf-meta').text(
      [year, genres, runtime].filter(Boolean).join(' · ')
    );

    render.find('.nf-desc').text(data.overview || '');

    /* STUDIO LOGO */
    const studio = (data.networks || data.production_companies || [])[0];
    if (studio?.logo_path) {
      const img = Lampa.Api.img(studio.logo_path, 'w300');
      render.find('.nf-studio').html(`<img src="${img}">`);
    }

    /* MOVIE LOGO (TMDB) */
    const type = data.name ? 'tv' : 'movie';
    const lang = Lampa.Storage.get('language', 'en');

    $.get(
      Lampa.TMDB.api(`${type}/${data.id}/images`),
      res => {
        const logos = res?.logos || [];
        const logo =
          logos.find(l => l.iso_639_1 === lang) ||
          logos.find(l => l.iso_639_1 === 'en') ||
          logos[0];

        if (logo) {
          const img = Lampa.TMDB.image('/t/p/original' + logo.file_path);
          render.find('.nf-logo').html(`<img src="${img}">`);
        }
      }
    );
  }

  /* =========================
     4. ПІДКЛЮЧЕННЯ
     ========================= */

  Lampa.Listener.follow('full', e => {
    if (e.type === 'complite') loadData(e);
  });

})();
