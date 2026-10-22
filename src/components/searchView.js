import { icons } from '../utils/icons.js';
import { TRACKS, PLAYLISTS, GENRE_CATEGORIES } from '../data/musicData.js';
import { renderTrackRow } from '../utils/trackRow.js';
import { playerController } from '../services/playerController.js';

export function createSearchView({ onNavigate }) {
  const container = document.createElement('div');
  container.className = 'view-content';

  let currentQuery = '';
  let activeGenreFilter = null;

  function render() {
    if (!currentQuery.trim() && !activeGenreFilter) {
      // Default: Browse All Genre Categories
      container.innerHTML = `
        <div class="view-section" style="margin-top: 24px;">
          <h2 class="section-title">Browse All</h2>
          <div class="genre-cards-grid">
            ${GENRE_CATEGORIES.map(cat => `
              <div class="genre-card" data-genre-id="${cat.id}" data-genre-name="${cat.name}" style="background-color: ${cat.color};">
                <span class="genre-card-title">${cat.name}</span>
                <img src="${cat.cover}" class="genre-card-image" alt="${cat.name}" loading="lazy"/>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('.genre-card').forEach(card => {
        card.addEventListener('click', () => {
          activeGenreFilter = card.dataset.genreName;
          render();
        });
      });
      return;
    }

    // Filter results
    const q = currentQuery.toLowerCase().trim();
    let matchingTracks = TRACKS.filter(t => {
      if (activeGenreFilter) {
        return t.genre.toLowerCase() === activeGenreFilter.toLowerCase();
      }
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );
    });

    let matchingPlaylists = PLAYLISTS.filter(p => {
      if (activeGenreFilter) {
        return p.title.toLowerCase().includes(activeGenreFilter.toLowerCase()) ||
               p.description.toLowerCase().includes(activeGenreFilter.toLowerCase());
      }
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });

    const topResult = matchingTracks[0] || null;

    container.innerHTML = `
      <div class="view-section" style="margin-top: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h2 class="section-title" style="font-size: 1.4rem;">
            ${activeGenreFilter ? `Genre: ${activeGenreFilter}` : `Results for "${currentQuery}"`}
          </h2>
          ${activeGenreFilter ? `
            <button class="filter-chip" id="clear-genre-btn">
              Clear filter ${icons.close(14)}
            </button>
          ` : ''}
        </div>

        ${matchingTracks.length === 0 && matchingPlaylists.length === 0 ? `
          <div style="padding: 40px 0; text-align: center; color: var(--text-subdued);">
            <h3>No results found for "${currentQuery || activeGenreFilter}"</h3>
            <p style="margin-top: 8px; font-size: 0.9rem;">Please check your spelling or search for another artist, song, or genre.</p>
          </div>
        ` : `
          <!-- Top Result & Songs Split View -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px;">
            ${topResult ? `
              <div>
                <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 14px;">Top Result</h3>
                <div class="media-card" id="top-result-card" style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
                  <img src="${topResult.cover}" style="width: 92px; height: 92px; border-radius: 6px; object-fit: cover; box-shadow: var(--shadow-card);" alt="${topResult.title}"/>
                  <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-base); line-height: 1.1;">
                    ${topResult.title}
                  </div>
                  <div style="font-size: 0.9rem; color: var(--text-subdued); display: flex; align-items: center; gap: 8px;">
                    <span>Song</span>
                    <span>•</span>
                    <span style="color: var(--text-base); font-weight: 600;">${topResult.artist}</span>
                    <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${topResult.genre}</span>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Songs List -->
            <div style="flex: 1;">
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 14px;">Songs</h3>
              <div id="search-tracks-list" style="display: flex; flex-direction: column;"></div>
            </div>
          </div>

          <!-- Matching Playlists -->
          ${matchingPlaylists.length > 0 ? `
            <div class="view-section">
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 14px;">Playlists</h3>
              <div class="cards-grid-auto">
                ${matchingPlaylists.map(p => `
                  <div class="media-card" data-playlist-id="${p.id}">
                    <div class="media-card-artwork-wrapper">
                      <img src="${p.cover}" class="media-card-img" alt="${p.title}" loading="lazy"/>
                    </div>
                    <div class="media-card-title">${p.title}</div>
                    <div class="media-card-desc">${p.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `}
      </div>
    `;

    // Clear genre filter button
    const clearBtn = container.querySelector('#clear-genre-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        activeGenreFilter = null;
        render();
      });
    }

    // Top result play handler
    const topResultCard = container.querySelector('#top-result-card');
    if (topResultCard && topResult) {
      topResultCard.addEventListener('click', () => {
        playerController.playTrack(topResult);
      });
    }

    // Render track rows in search list
    const tracksContainer = container.querySelector('#search-tracks-list');
    if (tracksContainer) {
      matchingTracks.slice(0, 5).forEach((t, i) => {
        tracksContainer.appendChild(renderTrackRow(t, i));
      });
    }

    // Attach playlist clicks
    container.querySelectorAll('.media-card[data-playlist-id]').forEach(card => {
      card.addEventListener('click', () => {
        onNavigate('playlist', { playlistId: card.dataset.playlistId });
      });
    });
  }

  render();

  return {
    element: container,
    search: (query) => {
      currentQuery = query;
      activeGenreFilter = null;
      render();
    }
  };
}
