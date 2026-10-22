import { icons } from '../utils/icons.js';
import { PLAYLISTS } from '../data/musicData.js';
import { firebaseService } from '../services/firebaseService.js';

export function createSidebar({ onNavigate, onOpenCreatePlaylist, onOpenFirebaseModal }) {
  const container = document.createElement('aside');
  container.className = 'sidebar';

  container.innerHTML = `
    <!-- Top Navigation Box -->
    <div class="sidebar-box sidebar-nav">
      <div class="brand-header" id="brand-logo-btn">
        ${icons.spotifyLogo(36)}
        <span class="brand-title">Spotify</span>
      </div>

      <nav style="display: flex; flex-direction: column; gap: 4px;">
        <a class="nav-link active" data-nav="home" id="nav-home">
          ${icons.home(24)}
          <span>Home</span>
        </a>
        <a class="nav-link" data-nav="search" id="nav-search">
          ${icons.search(24)}
          <span>Search</span>
        </a>
      </nav>
    </div>

    <!-- Library Box -->
    <div class="sidebar-box sidebar-library">
      <div class="library-header">
        <button class="library-title-btn" id="nav-library">
          ${icons.library(24)}
          <span>Your Library</span>
        </button>
        <div class="library-actions">
          <button class="icon-btn-ghost" id="create-playlist-btn" title="Create playlist">
            ${icons.plus(20)}
          </button>
        </div>
      </div>

      <div class="library-filters">
        <button class="filter-chip active" data-filter="all">Playlists</button>
        <button class="filter-chip" data-filter="by-you">By You</button>
        <button class="filter-chip" data-filter="curated">Spotify</button>
      </div>

      <!-- Playlists Scroll Area -->
      <div class="library-items-list" id="sidebar-playlists-list">
        <!-- Liked Songs Pinned Item -->
        <div class="playlist-sidebar-item" data-nav="liked-songs" id="sidebar-liked-item">
          <div class="playlist-thumb playlist-thumb-gradient">
            ${icons.heart(22, true)}
          </div>
          <div class="playlist-item-meta">
            <span class="playlist-item-title">Liked Songs</span>
            <span class="playlist-item-sub" id="sidebar-likes-count">Playlist • 0 songs</span>
          </div>
        </div>

        <!-- Rendered custom & default playlists -->
        <div id="dynamic-playlists-container"></div>
      </div>

      <!-- Firebase Cloud Sync Status Footer -->
      <div class="sidebar-cloud-status" id="sidebar-cloud-btn" title="Click to manage Firebase Cloud Sync">
        <div class="cloud-status-left">
          <span class="cloud-dot demo" id="sidebar-cloud-dot"></span>
          <span id="sidebar-cloud-text">Local Demo Mode</span>
        </div>
        ${icons.cloud(18)}
      </div>
    </div>
  `;

  // Attach event listeners
  container.querySelector('#brand-logo-btn').addEventListener('click', () => onNavigate('home'));
  container.querySelector('#nav-home').addEventListener('click', () => onNavigate('home'));
  container.querySelector('#nav-search').addEventListener('click', () => onNavigate('search'));
  container.querySelector('#nav-library').addEventListener('click', () => onNavigate('home'));
  container.querySelector('#sidebar-liked-item').addEventListener('click', () => onNavigate('liked-songs'));
  container.querySelector('#create-playlist-btn').addEventListener('click', onOpenCreatePlaylist);
  container.querySelector('#sidebar-cloud-btn').addEventListener('click', onOpenFirebaseModal);

  // Filter chips in sidebar
  let currentFilter = 'all';
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderPlaylists();
    });
  });

  // Render playlists helper
  function renderPlaylists() {
    const target = container.querySelector('#dynamic-playlists-container');
    if (!target) return;

    const userPlaylists = firebaseService.userPlaylists;
    let list = [];

    if (currentFilter === 'all') {
      list = [...userPlaylists, ...PLAYLISTS];
    } else if (currentFilter === 'by-you') {
      list = [...userPlaylists];
    } else if (currentFilter === 'curated') {
      list = [...PLAYLISTS];
    }

    if (list.length === 0) {
      target.innerHTML = `
        <div style="padding: 16px 8px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
          No playlists here yet.<br>Click '+' to create one!
        </div>
      `;
      return;
    }

    target.innerHTML = list.map(p => `
      <div class="playlist-sidebar-item" data-playlist-id="${p.id}">
        <img src="${p.cover}" class="playlist-thumb" alt="${p.title}" loading="lazy"/>
        <div class="playlist-item-meta">
          <span class="playlist-item-title">${p.title}</span>
          <span class="playlist-item-sub">Playlist • ${p.creator || 'You'}</span>
        </div>
      </div>
    `).join('');

    target.querySelectorAll('.playlist-sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        onNavigate('playlist', { playlistId: item.dataset.playlistId });
      });
    });
  }

  // Reactive subscriptions
  firebaseService.subscribe('playlists', () => renderPlaylists());
  firebaseService.subscribe('likedSongs', (likedIds) => {
    const likesLabel = container.querySelector('#sidebar-likes-count');
    if (likesLabel) {
      likesLabel.textContent = `Playlist • ${likedIds.length} songs`;
    }
  });

  firebaseService.subscribe('auth', () => {
    const status = firebaseService.getStatus();
    const dot = container.querySelector('#sidebar-cloud-dot');
    const text = container.querySelector('#sidebar-cloud-text');
    if (dot && text) {
      if (status.isLiveFirebase) {
        dot.className = 'cloud-dot';
        text.textContent = `Firestore: ${status.projectId || 'Live'}`;
      } else {
        dot.className = 'cloud-dot demo';
        text.textContent = 'Demo Mode (Sync)';
      }
    }
    renderPlaylists();
  });

  return {
    element: container,
    setActiveNav: (navName) => {
      container.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const activeLink = container.querySelector(`[data-nav="${navName}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  };
}
