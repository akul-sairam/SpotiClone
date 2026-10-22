import './style.css';
import { createSidebar } from './components/sidebar.js';
import { createNavbar } from './components/navbar.js';
import { createPlayerBar } from './components/playerBar.js';
import { createQueueDrawer } from './components/queueDrawer.js';
import { createMobileNav } from './components/mobileNav.js';
import { createHomeView } from './components/homeView.js';
import { createSearchView } from './components/searchView.js';
import { createPlaylistView } from './components/playlistView.js';
import { createLikedSongsView } from './components/likedSongsView.js';
import { createPlaylistModal } from './components/createPlaylistModal.js';
import { createFirebaseModal } from './components/firebaseModal.js';
import { createLyricsVisualizerModal } from './components/lyricsVisualizerModal.js';
import { playerController } from './services/playerController.js';
import { firebaseService } from './services/firebaseService.js';

function initApp() {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  appRoot.innerHTML = '';

  let currentRoute = { name: 'home', params: {} };
  let searchViewInstance = null;

  // 1. Navigation router
  function navigate(name, params = {}) {
    currentRoute = { name, params };

    sidebar.setActiveNav(name);
    mobileNav.setActiveNav(name);

    // Show/hide search input in top navbar
    if (name === 'search') {
      navbar.showSearch(true, params.query || '');
    } else {
      navbar.showSearch(false);
    }

    renderCurrentView();
  }

  // 2. Main content view renderer
  function renderCurrentView() {
    mainViewScrollArea.innerHTML = '';
    mainViewScrollArea.scrollTop = 0;

    if (currentRoute.name === 'home') {
      const view = createHomeView({ onNavigate: navigate });
      mainViewScrollArea.appendChild(view.element);
    } else if (currentRoute.name === 'search') {
      searchViewInstance = createSearchView({ onNavigate: navigate });
      mainViewScrollArea.appendChild(searchViewInstance.element);
      if (currentRoute.params.query) {
        searchViewInstance.search(currentRoute.params.query);
      }
    } else if (currentRoute.name === 'playlist') {
      const view = createPlaylistView({
        playlistId: currentRoute.params.playlistId,
        onNavigate: navigate
      });
      mainViewScrollArea.appendChild(view.element);
    } else if (currentRoute.name === 'liked-songs') {
      const view = createLikedSongsView({ onNavigate: navigate });
      mainViewScrollArea.appendChild(view.element);
    }
  }

  // 3. Modals & Drawers handlers
  function openCreatePlaylistModal() {
    createPlaylistModal({
      onCreated: (newPlaylist) => {
        navigate('playlist', { playlistId: newPlaylist.id });
      }
    });
  }

  function openFirebaseModal() {
    createFirebaseModal({});
  }

  function openLyricsModal() {
    createLyricsVisualizerModal({});
  }

  // 4. Instantiate Components
  const sidebar = createSidebar({
    onNavigate: navigate,
    onOpenCreatePlaylist: openCreatePlaylistModal,
    onOpenFirebaseModal: openFirebaseModal
  });

  const navbar = createNavbar({
    onNavigate: navigate,
    onSearch: (query) => {
      if (currentRoute.name !== 'search') {
        navigate('search', { query });
      } else if (searchViewInstance) {
        searchViewInstance.search(query);
      }
    },
    onOpenFirebaseModal: openFirebaseModal
  });

  const mainViewContainer = document.createElement('main');
  mainViewContainer.className = 'main-view-container';

  const mainViewScrollArea = document.createElement('div');
  mainViewScrollArea.style.flex = '1';
  mainViewScrollArea.style.display = 'flex';
  mainViewScrollArea.style.flexDirection = 'column';

  mainViewContainer.appendChild(navbar.element);
  mainViewContainer.appendChild(mainViewScrollArea);

  // Sticky top nav background blur on scroll
  mainViewContainer.addEventListener('scroll', () => {
    if (mainViewContainer.scrollTop > 40) {
      navbar.element.classList.add('scrolled');
    } else {
      navbar.element.classList.remove('scrolled');
    }
  });

  const queueDrawer = createQueueDrawer({
    onClose: () => queueDrawer.close()
  });

  const playerBar = createPlayerBar({
    onToggleQueue: () => queueDrawer.toggle(),
    onToggleLyrics: openLyricsModal
  });

  const mobileNav = createMobileNav({
    onNavigate: navigate
  });

  // Assemble App DOM
  appRoot.appendChild(sidebar.element);
  appRoot.appendChild(mainViewContainer);
  appRoot.appendChild(playerBar.element);
  appRoot.appendChild(mobileNav.element);
  document.body.appendChild(queueDrawer.element);

  // Initial View
  renderCurrentView();

  // 5. Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in inputs or textareas
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      playerController.togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      playerController.seek(playerController.currentTime + 5);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      playerController.seek(Math.max(0, playerController.currentTime - 5));
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      playerController.toggleMute();
    } else if (e.code === 'KeyQ') {
      e.preventDefault();
      queueDrawer.toggle();
    } else if (e.code === 'KeyL') {
      e.preventDefault();
      if (playerController.currentTrack) {
        firebaseService.toggleLikeSong(playerController.currentTrack);
      }
    }
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
