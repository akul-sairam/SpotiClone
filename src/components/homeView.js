import { icons } from '../utils/icons.js';
import { PLAYLISTS, TRACKS } from '../data/musicData.js';
import { playerController } from '../services/playerController.js';
import { firebaseService } from '../services/firebaseService.js';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function createHomeView({ onNavigate }) {
  const container = document.createElement('div');
  container.className = 'view-content';

  const greeting = getGreeting();

  // Top quick picks items (combination of popular playlists + liked songs)
  const quickPicks = [
    {
      id: 'liked-songs',
      title: 'Liked Songs',
      type: 'liked',
      cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&auto=format&fit=crop&q=80',
      action: () => onNavigate('liked-songs')
    },
    ...PLAYLISTS.slice(0, 5).map(p => ({
      id: p.id,
      title: p.title,
      type: 'playlist',
      cover: p.cover,
      action: () => onNavigate('playlist', { playlistId: p.id }),
      playlistObj: p
    }))
  ];

  container.innerHTML = `
    <!-- Dynamic Top Gradient Backdrop -->
    <div class="hero-backdrop-gradient" style="background: linear-gradient(180deg, #1e3264 0%, rgba(18, 18, 18, 0) 100%);"></div>

    <div class="view-section" style="margin-top: 18px;">
      <h1 class="section-title" style="font-size: 2rem; margin-bottom: 20px;">${greeting}</h1>

      <!-- Quick 6-Pack Grid -->
      <div class="quick-picks-grid">
        ${quickPicks.map(item => `
          <div class="quick-pick-card" data-pick-id="${item.id}">
            <img src="${item.cover}" class="quick-pick-thumb" alt="${item.title}" loading="lazy"/>
            <span class="quick-pick-title">${item.title}</span>
            <button class="quick-pick-play-btn" data-play-id="${item.id}" title="Play ${item.title}">
              ${icons.play(20, '#000000')}
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Section 1: Featured Playlists -->
    <div class="view-section">
      <div class="section-header">
        <h2 class="section-title">Featured Playlists</h2>
        <span class="section-see-all" id="see-all-playlists">Show all</span>
      </div>

      <div class="cards-grid-auto">
        ${PLAYLISTS.map(p => `
          <div class="media-card" data-playlist-id="${p.id}">
            <div class="media-card-artwork-wrapper">
              <img src="${p.cover}" class="media-card-img" alt="${p.title}" loading="lazy"/>
              <button class="card-play-hover-btn" data-card-play="${p.id}" title="Play ${p.title}">
                ${icons.play(24, '#000000')}
              </button>
            </div>
            <div class="media-card-title">${p.title}</div>
            <div class="media-card-desc">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Section 2: Recommended Tracks -->
    <div class="view-section">
      <div class="section-header">
        <h2 class="section-title">Today's Trending Tracks</h2>
      </div>

      <div class="cards-grid-auto">
        ${TRACKS.slice(0, 6).map(track => `
          <div class="media-card track-card" data-track-id="${track.id}">
            <div class="media-card-artwork-wrapper">
              <img src="${track.cover}" class="media-card-img" alt="${track.title}" loading="lazy"/>
              <button class="card-play-hover-btn" data-track-play="${track.id}" title="Play ${track.title}">
                ${icons.play(24, '#000000')}
              </button>
            </div>
            <div class="media-card-title">${track.title}</div>
            <div class="media-card-desc">${track.artist} • ${track.album}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Section 3: Deep Focus & Lofi -->
    <div class="view-section">
      <div class="section-header">
        <h2 class="section-title">Chill, Lo-Fi & Ambient</h2>
      </div>

      <div class="cards-grid-auto">
        ${TRACKS.slice(6, 12).map(track => `
          <div class="media-card track-card" data-track-id="${track.id}">
            <div class="media-card-artwork-wrapper">
              <img src="${track.cover}" class="media-card-img" alt="${track.title}" loading="lazy"/>
              <button class="card-play-hover-btn" data-track-play="${track.id}" title="Play ${track.title}">
                ${icons.play(24, '#000000')}
              </button>
            </div>
            <div class="media-card-title">${track.title}</div>
            <div class="media-card-desc">${track.artist} • ${track.genre}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach Quick Picks click handlers
  quickPicks.forEach(item => {
    const cardEl = container.querySelector(`[data-pick-id="${item.id}"]`);
    if (!cardEl) return;

    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('.quick-pick-play-btn')) return;
      item.action();
    });

    const playBtn = cardEl.querySelector('.quick-pick-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.playlistObj) {
          const firstTrackId = item.playlistObj.trackIds[0];
          const tr = TRACKS.find(t => t.id === firstTrackId);
          if (tr) playerController.playTrack(tr, item.playlistObj);
        } else if (item.type === 'liked') {
          const likedIds = Array.from(firebaseService.likedSongIds);
          const firstLiked = TRACKS.find(t => likedIds.includes(t.id)) || TRACKS[0];
          playerController.playTrack(firstLiked);
        }
      });
    }
  });

  // Attach Playlist Cards click handlers
  container.querySelectorAll('.media-card[data-playlist-id]').forEach(card => {
    const pId = card.dataset.playlistId;
    const playlist = PLAYLISTS.find(p => p.id === pId);

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-play-hover-btn')) return;
      onNavigate('playlist', { playlistId: pId });
    });

    const playBtn = card.querySelector(`[data-card-play="${pId}"]`);
    if (playBtn && playlist) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const firstTrackId = playlist.trackIds[0];
        const tr = TRACKS.find(t => t.id === firstTrackId);
        if (tr) playerController.playTrack(tr, playlist);
      });
    }
  });

  // Attach Track Cards click handlers
  container.querySelectorAll('.track-card').forEach(card => {
    const trId = card.dataset.trackId;
    const track = TRACKS.find(t => t.id === trId);

    card.addEventListener('click', () => {
      if (track) playerController.playTrack(track);
    });
  });

  return { element: container };
}
