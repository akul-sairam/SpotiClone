import { icons } from './icons.js';
import { playerController } from '../services/playerController.js';
import { firebaseService } from '../services/firebaseService.js';

let activeMenu = null;

document.addEventListener('click', () => {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
});

export function renderTrackRow(track, index, playlistContext = null) {
  const isPlaying = playerController.currentTrack?.id === track.id && playerController.isPlaying;
  const isLiked = firebaseService.isLiked(track.id);

  const row = document.createElement('div');
  row.className = `track-row ${isPlaying ? 'playing' : ''}`;
  row.dataset.trackId = track.id;

  row.innerHTML = `
    <div class="track-index-col">
      <span class="index-num">${index + 1}</span>
      <span class="row-play-icon">${icons.play(16)}</span>
      <div class="equalizer-bars" style="display: none;">
        <span class="equalizer-bar"></span>
        <span class="equalizer-bar"></span>
        <span class="equalizer-bar"></span>
        <span class="equalizer-bar"></span>
      </div>
    </div>

    <div class="track-info-col">
      <img src="${track.cover}" class="track-table-thumb" alt="${track.title}" loading="lazy"/>
      <div class="track-titles-wrapper">
        <span class="track-title-text">${track.title}</span>
        <span class="track-artist-text">${track.artist}</span>
      </div>
    </div>

    <div class="track-album-col">${track.album}</div>

    <div class="track-date-col">${track.genre || 'Single'}</div>

    <div class="track-actions-col">
      <button class="row-heart-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Remove from Liked' : 'Save to Liked'}">
        ${icons.heart(18, isLiked)}
      </button>
      <span class="track-duration-text">${track.duration}</span>
      <button class="row-options-btn" title="More options">
        ${icons.more(18)}
      </button>
    </div>
  `;

  // Row click to play track
  row.addEventListener('click', (e) => {
    if (e.target.closest('.row-heart-btn') || e.target.closest('.row-options-btn')) return;
    playerController.playTrack(track, playlistContext);
  });

  // Heart like button toggle
  const heartBtn = row.querySelector('.row-heart-btn');
  heartBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const nowLiked = await firebaseService.toggleLikeSong(track);
    heartBtn.classList.toggle('liked', nowLiked);
    heartBtn.innerHTML = icons.heart(18, nowLiked);
  });

  // Options context menu
  const optionsBtn = row.querySelector('.row-options-btn');
  optionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeMenu) activeMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'user-dropdown-menu show';
    menu.style.position = 'fixed';
    menu.style.zIndex = '999';

    const rect = optionsBtn.getBoundingClientRect();
    menu.style.top = `${Math.min(window.innerHeight - 220, rect.bottom + 4)}px`;
    menu.style.left = `${Math.max(10, rect.right - 220)}px`;

    const userPlaylists = firebaseService.userPlaylists;
    const playlistOptions = userPlaylists.length > 0
      ? userPlaylists.map(p => `
          <button class="dropdown-item add-to-pl-btn" data-pl-id="${p.id}">
            <span>Add to: ${p.title}</span>
          </button>
        `).join('')
      : `<div style="padding: 6px 14px; font-size: 0.75rem; color: var(--text-muted);">No custom playlists</div>`;

    menu.innerHTML = `
      <button class="dropdown-item" id="menu-add-queue">
        <span>Add to Queue</span>
        ${icons.queue(16)}
      </button>
      <button class="dropdown-item" id="menu-play-next">
        <span>Play Next</span>
        ${icons.skipForward(16)}
      </button>
      <div class="dropdown-divider"></div>
      <div style="padding: 6px 14px 4px 14px; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Add to Playlist</div>
      ${playlistOptions}
      <div class="dropdown-divider"></div>
      <button class="dropdown-item" id="menu-copy-info">
        <span>Copy Track Name</span>
      </button>
    `;

    document.body.appendChild(menu);
    activeMenu = menu;

    menu.querySelector('#menu-add-queue').addEventListener('click', () => {
      playerController.addToQueue(track);
      menu.remove();
      activeMenu = null;
    });

    menu.querySelector('#menu-play-next').addEventListener('click', () => {
      playerController.playNext(track);
      menu.remove();
      activeMenu = null;
    });

    menu.querySelectorAll('.add-to-pl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        firebaseService.addTrackToPlaylist(btn.dataset.plId, track.id);
        menu.remove();
        activeMenu = null;
      });
    });

    menu.querySelector('#menu-copy-info').addEventListener('click', () => {
      navigator.clipboard?.writeText(`${track.title} by ${track.artist}`);
      menu.remove();
      activeMenu = null;
    });
  });

  return row;
}
