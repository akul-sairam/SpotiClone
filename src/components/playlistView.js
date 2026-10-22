import { icons } from '../utils/icons.js';
import { getPlaylistById, getTrackById, TRACKS } from '../data/musicData.js';
import { renderTrackRow } from '../utils/trackRow.js';
import { playerController } from '../services/playerController.js';
import { firebaseService } from '../services/firebaseService.js';

export function createPlaylistView({ playlistId, onNavigate }) {
  const container = document.createElement('div');
  container.className = 'view-content';

  // Check if it's a curated playlist or custom user playlist
  let playlist = getPlaylistById(playlistId);
  let isCustom = false;

  if (!playlist) {
    playlist = firebaseService.userPlaylists.find(p => p.id === playlistId);
    isCustom = true;
  }

  if (!playlist) {
    container.innerHTML = `
      <div style="padding: 60px 20px; text-align: center; color: var(--text-subdued);">
        <h2>Playlist not found</h2>
        <p style="margin-top: 10px;">The requested playlist does not exist or has been removed.</p>
        <button class="btn-primary" style="margin-top: 20px;" id="back-home-btn">Go to Home</button>
      </div>
    `;
    container.querySelector('#back-home-btn')?.addEventListener('click', () => onNavigate('home'));
    return { element: container };
  }

  // Resolve tracks
  const tracks = (playlist.trackIds || [])
    .map(id => getTrackById(id))
    .filter(Boolean);

  const totalSeconds = tracks.reduce((acc, t) => acc + (t.durationSec || 0), 0);
  const totalMins = Math.floor(totalSeconds / 60);

  const accentColor = playlist.accentColor || '#1db954';
  const heroGradient = playlist.gradient || `linear-gradient(180deg, ${accentColor} 0%, rgba(18, 18, 18, 0.4) 100%)`;

  container.innerHTML = `
    <!-- Top Hero Banner with dynamic gradient -->
    <div class="playlist-hero" style="--hero-bg: ${heroGradient};">
      <img src="${playlist.cover}" class="hero-cover-art" alt="${playlist.title}"/>
      <div class="hero-details">
        <span class="hero-type-label">Public Playlist</span>
        <h1 class="hero-title">${playlist.title}</h1>
        <p class="hero-description">${playlist.description || ''}</p>
        <div class="hero-meta-row">
          <span class="creator-name">${playlist.creator || 'You'}</span>
          <span class="meta-dot">•</span>
          <span>${playlist.likesCount ? `${playlist.likesCount} likes` : '1 like'}</span>
          <span class="meta-dot">•</span>
          <span>${tracks.length} songs, about ${totalMins} min</span>
        </div>
      </div>
    </div>

    <!-- Action Bar -->
    <div class="playlist-action-bar">
      <button class="playlist-play-btn-large" id="playlist-hero-play-btn" title="Play ${playlist.title}">
        ${icons.play(26, '#000000')}
      </button>
      <button class="playlist-header-action-btn" id="playlist-hero-heart-btn" title="Save to Your Library">
        ${icons.heart(32, false)}
      </button>
      ${isCustom ? `
        <button class="playlist-header-action-btn" id="playlist-delete-btn" title="Delete playlist" style="color: var(--text-subdued);">
          ${icons.trash(24)}
        </button>
      ` : ''}
    </div>

    <!-- Tracks Table -->
    <div class="tracks-table-container">
      <div class="tracks-table-header">
        <div>#</div>
        <div>Title</div>
        <div>Album</div>
        <div>Genre</div>
        <div>${icons.clock(16)}</div>
      </div>

      <div id="playlist-tracks-body"></div>
    </div>
  `;

  // Render track rows
  const tableBody = container.querySelector('#playlist-tracks-body');
  if (tracks.length === 0) {
    tableBody.innerHTML = `
      <div style="padding: 40px 0; text-align: center; color: var(--text-muted);">
        <p style="font-size: 1rem; margin-bottom: 12px;">This playlist is currently empty.</p>
        <p style="font-size: 0.85rem;">Find songs in Search or Home and click "..." to add them to this playlist!</p>
      </div>
    `;
  } else {
    tracks.forEach((track, index) => {
      tableBody.appendChild(renderTrackRow(track, index, playlist));
    });
  }

  // Play button on hero
  const playBtn = container.querySelector('#playlist-hero-play-btn');
  playBtn.addEventListener('click', () => {
    if (tracks.length > 0) {
      if (playerController.currentPlaylist?.id === playlist.id && playerController.isPlaying) {
        playerController.togglePlay();
      } else {
        playerController.playTrack(tracks[0], playlist);
      }
    }
  });

  // Delete button if custom
  if (isCustom) {
    const deleteBtn = container.querySelector('#playlist-delete-btn');
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
        await firebaseService.deletePlaylist(playlist.id);
        onNavigate('home');
      }
    });
  }

  // Reactive play button state
  const updatePlayState = () => {
    const isCurrent = playerController.currentPlaylist?.id === playlist.id && playerController.isPlaying;
    playBtn.innerHTML = isCurrent ? icons.pause(26, '#000000') : icons.play(26, '#000000');
  };
  playerController.on('stateChange', updatePlayState);
  playerController.on('trackChange', updatePlayState);
  updatePlayState();

  return { element: container };
}
