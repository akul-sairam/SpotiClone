import { icons } from '../utils/icons.js';
import { getTrackById } from '../data/musicData.js';
import { renderTrackRow } from '../utils/trackRow.js';
import { playerController } from '../services/playerController.js';
import { firebaseService } from '../services/firebaseService.js';

export function createLikedSongsView({ onNavigate }) {
  const container = document.createElement('div');
  container.className = 'view-content';

  function render() {
    const likedIds = Array.from(firebaseService.likedSongIds);
    const tracks = likedIds.map(id => getTrackById(id)).filter(Boolean);

    const totalSeconds = tracks.reduce((acc, t) => acc + (t.durationSec || 0), 0);
    const totalMins = Math.floor(totalSeconds / 60);

    container.innerHTML = `
      <div class="playlist-hero" style="--hero-bg: linear-gradient(180deg, #4f22bd 0%, rgba(18, 18, 18, 0.4) 100%);">
        <div class="hero-cover-placeholder" style="background: linear-gradient(135deg, #450af5, #8e8ee5);">
          ${icons.heart(80, true)}
        </div>
        <div class="hero-details">
          <span class="hero-type-label">Playlist</span>
          <h1 class="hero-title">Liked Songs</h1>
          <div class="hero-meta-row">
            <span class="creator-name">${firebaseService.currentUser?.displayName || 'You'}</span>
            <span class="meta-dot">•</span>
            <span>${tracks.length} songs, about ${totalMins} min</span>
          </div>
        </div>
      </div>

      <div class="playlist-action-bar">
        <button class="playlist-play-btn-large" id="liked-hero-play-btn" title="Play Liked Songs">
          ${icons.play(26, '#000000')}
        </button>
      </div>

      <div class="tracks-table-container">
        <div class="tracks-table-header">
          <div>#</div>
          <div>Title</div>
          <div>Album</div>
          <div>Genre</div>
          <div>${icons.clock(16)}</div>
        </div>

        <div id="liked-tracks-body"></div>
      </div>
    `;

    const tableBody = container.querySelector('#liked-tracks-body');
    if (tracks.length === 0) {
      tableBody.innerHTML = `
        <div style="padding: 50px 0; text-align: center; color: var(--text-muted);">
          <h3 style="font-size: 1.2rem; color: var(--text-base); margin-bottom: 8px;">Songs you like will appear here</h3>
          <p style="font-size: 0.9rem;">Save songs by tapping the heart icon on any track or in the player.</p>
        </div>
      `;
    } else {
      tracks.forEach((track, index) => {
        tableBody.appendChild(renderTrackRow(track, index, { id: 'liked-songs', title: 'Liked Songs', trackIds: likedIds }));
      });
    }

    const playBtn = container.querySelector('#liked-hero-play-btn');
    playBtn.addEventListener('click', () => {
      if (tracks.length > 0) {
        playerController.playTrack(tracks[0], { id: 'liked-songs', title: 'Liked Songs', trackIds: likedIds });
      }
    });
  }

  render();
  firebaseService.subscribe('likedSongs', render);

  return { element: container };
}
