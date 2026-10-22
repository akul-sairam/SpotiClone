import { icons } from '../utils/icons.js';
import { firebaseService } from '../services/firebaseService.js';

export function createNavbar({ onNavigate, onSearch, onOpenFirebaseModal }) {
  const container = document.createElement('header');
  container.className = 'top-nav';

  container.innerHTML = `
    <div class="nav-history-controls">
      <button class="history-btn" id="history-back-btn" title="Go back">
        ${icons.chevronLeft(20)}
      </button>
      <button class="history-btn" id="history-forward-btn" title="Go forward">
        ${icons.chevronRight(20)}
      </button>

      <!-- Search Input Container -->
      <div class="header-search-wrapper" id="header-search-container" style="display: none;">
        <span class="search-input-icon">${icons.search(18)}</span>
        <input 
          type="text" 
          id="global-search-input" 
          class="search-input-field" 
          placeholder="What do you want to play?"
          autocomplete="off"
        />
        <button class="search-clear-btn" id="search-clear-btn" style="display: none;">
          ${icons.close(16)}
        </button>
      </div>
    </div>

    <div class="header-actions">
      <!-- Firebase Cloud Sync Quick Pill -->
      <button class="cloud-badge-btn" id="navbar-cloud-badge" title="Firebase Real-time Sync Status">
        ${icons.cloud(16, false)}
        <span id="navbar-cloud-text">Cloud Sync</span>
      </button>

      <!-- User Profile Dropdown Button -->
      <button class="user-profile-btn" id="user-profile-trigger">
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
          class="user-avatar-img" 
          id="user-avatar-img" 
          alt="User Profile"
        />
        <span class="user-name-text" id="user-display-name">Guest</span>
      </button>

      <!-- Dropdown Menu -->
      <div class="user-dropdown-menu" id="user-dropdown-menu">
        <div style="padding: 10px 14px 6px 14px;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Signed in as</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-base); word-break: break-all;" id="dropdown-user-email">
            guest@spoticlone.demo
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" id="dropdown-firebase-btn">
          <span>Firebase Cloud Sync</span>
          ${icons.sliders(16)}
        </button>
        <button class="dropdown-item" id="dropdown-auth-btn">
          <span id="dropdown-auth-text">Sign In / Switch</span>
          ${icons.cloud(16)}
        </button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" id="dropdown-logout-btn" style="color: var(--text-negative);">
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#global-search-input');
  const searchClear = container.querySelector('#search-clear-btn');
  const searchWrapper = container.querySelector('#header-search-container');
  const userProfileBtn = container.querySelector('#user-profile-trigger');
  const userDropdown = container.querySelector('#user-dropdown-menu');

  // Search input listeners
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    searchClear.style.display = val ? 'flex' : 'none';
    onSearch(val);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    onSearch('');
    searchInput.focus();
  });

  // User profile dropdown toggle
  userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
  });

  container.querySelector('#navbar-cloud-badge').addEventListener('click', onOpenFirebaseModal);
  container.querySelector('#dropdown-firebase-btn').addEventListener('click', () => {
    userDropdown.classList.remove('show');
    onOpenFirebaseModal();
  });
  container.querySelector('#dropdown-auth-btn').addEventListener('click', () => {
    userDropdown.classList.remove('show');
    onOpenFirebaseModal();
  });
  container.querySelector('#dropdown-logout-btn').addEventListener('click', async () => {
    userDropdown.classList.remove('show');
    await firebaseService.logOut();
    onOpenFirebaseModal();
  });

  // History controls
  container.querySelector('#history-back-btn').addEventListener('click', () => window.history.back());
  container.querySelector('#history-forward-btn').addEventListener('click', () => window.history.forward());

  // Reactive user profile and firebase status update
  firebaseService.subscribe('auth', (user) => {
    const nameEl = container.querySelector('#user-display-name');
    const emailEl = container.querySelector('#dropdown-user-email');
    const avatarEl = container.querySelector('#user-avatar-img');
    const cloudText = container.querySelector('#navbar-cloud-text');
    const authText = container.querySelector('#dropdown-auth-text');
    const isLive = firebaseService.isLiveFirebase;

    if (user) {
      nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'User';
      emailEl.textContent = user.email || 'Anonymous Guest';
      if (user.photoURL) avatarEl.src = user.photoURL;
      authText.textContent = 'Account & Sync Settings';
    } else {
      nameEl.textContent = 'Sign In';
      emailEl.textContent = 'Not signed in';
      authText.textContent = 'Sign In to Sync';
    }

    if (isLive) {
      cloudText.textContent = 'Firestore Sync';
      container.querySelector('#navbar-cloud-badge').style.borderColor = 'rgba(29, 185, 84, 0.5)';
      container.querySelector('#navbar-cloud-badge').style.color = '#1ed760';
    } else {
      cloudText.textContent = 'Demo Mode';
      container.querySelector('#navbar-cloud-badge').style.borderColor = 'rgba(255, 255, 255, 0.2)';
      container.querySelector('#navbar-cloud-badge').style.color = 'var(--text-base)';
    }
  });

  return {
    element: container,
    showSearch: (show, initialQuery = '') => {
      searchWrapper.style.display = show ? 'block' : 'none';
      if (show) {
        searchInput.value = initialQuery;
        searchClear.style.display = initialQuery ? 'flex' : 'none';
        searchInput.focus();
      }
    },
    setSearchQuery: (query) => {
      searchInput.value = query;
      searchClear.style.display = query ? 'flex' : 'none';
    }
  };
}
