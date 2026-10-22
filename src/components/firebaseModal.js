import { icons } from '../utils/icons.js';
import { firebaseService } from '../services/firebaseService.js';

export function createFirebaseModal({ onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const status = firebaseService.getStatus();
  const isLive = status.isLiveFirebase;
  const user = status.currentUser;

  backdrop.innerHTML = `
    <div class="modal-window" style="max-width: 580px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${icons.cloud(24, isLive)}
          <h2 class="modal-title">Firebase Cloud Sync & Sessions</h2>
        </div>
        <button class="modal-close-btn" id="close-fb-modal">${icons.close(18)}</button>
      </div>

      <!-- Live Status Banner -->
      <div class="firebase-status-banner ${isLive ? 'connected' : ''}">
        <span class="cloud-dot ${isLive ? '' : 'demo'}"></span>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-base);">
            ${isLive ? 'Connected to Firebase Firestore & Auth' : 'Local Demo Sync Mode Active'}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-subdued); margin-top: 2px;">
            ${isLive 
              ? `Project: ${status.projectId} • Real-time cloud sync across devices` 
              : 'All playlists, likes, and queue changes are stored and synced locally'}
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display: flex; border-bottom: 1px solid var(--border-subtle); gap: 16px;">
        <button class="filter-chip active" id="tab-auth-btn">User Session</button>
        <button class="filter-chip" id="tab-config-btn">Firebase Config</button>
        <button class="filter-chip" id="tab-hosting-btn">Hosting & Deploy</button>
      </div>

      <!-- Tab 1: Auth & User Session -->
      <div id="tab-auth-content" style="display: flex; flex-direction: column; gap: 16px;">
        ${user ? `
          <div style="display: flex; align-items: center; gap: 14px; padding: 14px; background: rgba(255,255,255,0.04); border-radius: 8px;">
            <img src="${user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;"/>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; color: var(--text-base);">${user.displayName || 'Guest User'}</div>
              <div style="font-size: 0.82rem; color: var(--text-subdued);">${user.email || 'Anonymous Guest'}</div>
              <div style="font-size: 0.75rem; color: var(--spotify-green); margin-top: 2px;">${status.likesCount} liked songs • ${status.customPlaylistsCount} custom playlists</div>
            </div>
            <button class="btn-secondary" id="logout-btn" style="color: var(--text-negative); font-size: 0.85rem;">Sign Out</button>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn-primary" id="google-login-btn" style="display: flex; align-items: center; justify-content: center; gap: 10px; background-color: #ffffff; color: #000000;">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            Continue with Google
          </button>

          <div style="display: flex; gap: 8px;">
            <input type="email" id="email-input" class="modal-input" placeholder="Email address" style="flex: 1;"/>
            <input type="password" id="pass-input" class="modal-input" placeholder="Password" style="flex: 1;"/>
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn-secondary" id="email-signin-btn" style="flex: 1; border: 1px solid var(--border-subtle); border-radius: 9999px;">Sign In with Email</button>
            <button class="btn-secondary" id="email-signup-btn" style="flex: 1; border: 1px solid var(--border-subtle); border-radius: 9999px;">Create Account</button>
          </div>

          <button class="btn-secondary" id="guest-login-btn" style="margin-top: 4px; font-size: 0.85rem; color: var(--text-subdued);">
            Continue in Guest Demo Session
          </button>
        </div>
      </div>

      <!-- Tab 2: Firebase Config Editor -->
      <div id="tab-config-content" style="display: none; flex-direction: column; gap: 14px;">
        <p style="font-size: 0.85rem; color: var(--text-subdued); line-height: 1.4;">
          Paste your Firebase Web App configuration JSON below to connect directly to your own Firebase project (Authentication & Cloud Firestore):
        </p>

        <textarea 
          id="fb-config-json" 
          class="modal-input modal-textarea" 
          style="min-height: 140px; font-family: monospace; font-size: 0.82rem;"
          placeholder='{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-app.firebaseapp.com",\n  "projectId": "my-app",\n  "storageBucket": "my-app.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'
        ></textarea>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <button class="btn-secondary" id="disconnect-fb-btn" style="color: var(--text-warning); font-size: 0.85rem;">
            Reset to Local Demo
          </button>
          <button class="btn-primary" id="save-fb-config-btn">Save & Connect</button>
        </div>
      </div>

      <!-- Tab 3: Hosting & Deployment Info -->
      <div id="tab-hosting-content" style="display: none; flex-direction: column; gap: 14px;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-base);">Deploying to Firebase Hosting</div>
        <p style="font-size: 0.85rem; color: var(--text-subdued); line-height: 1.5;">
          This Spotify Clone web app is pre-configured with <code>firebase.json</code>. You can build and deploy to Firebase Hosting in two easy commands:
        </p>
        <pre style="background: rgba(0,0,0,0.6); padding: 14px; border-radius: 6px; font-size: 0.85rem; color: var(--spotify-green); border: 1px solid var(--border-subtle); overflow-x: auto;">
npm run build
npx firebase deploy --only hosting</pre>
        <p style="font-size: 0.8rem; color: var(--text-muted);">
          Firestore security rules automatically ensure each authenticated user has isolated read/write permissions to their own liked songs and custom playlists.
        </p>
      </div>

    </div>
  `;

  // Close handlers
  const close = () => {
    backdrop.classList.remove('open');
    setTimeout(() => {
      backdrop.remove();
      if (onClose) onClose();
    }, 200);
  };

  backdrop.querySelector('#close-fb-modal').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Tab switching
  const tabAuthBtn = backdrop.querySelector('#tab-auth-btn');
  const tabConfigBtn = backdrop.querySelector('#tab-config-btn');
  const tabHostingBtn = backdrop.querySelector('#tab-hosting-btn');
  const tabAuthContent = backdrop.querySelector('#tab-auth-content');
  const tabConfigContent = backdrop.querySelector('#tab-config-content');
  const tabHostingContent = backdrop.querySelector('#tab-hosting-content');

  function showTab(tab) {
    [tabAuthBtn, tabConfigBtn, tabHostingBtn].forEach(b => b.classList.remove('active'));
    tabAuthContent.style.display = 'none';
    tabConfigContent.style.display = 'none';
    tabHostingContent.style.display = 'none';

    if (tab === 'auth') {
      tabAuthBtn.classList.add('active');
      tabAuthContent.style.display = 'flex';
    } else if (tab === 'config') {
      tabConfigBtn.classList.add('active');
      tabConfigContent.style.display = 'flex';
    } else if (tab === 'hosting') {
      tabHostingBtn.classList.add('active');
      tabHostingContent.style.display = 'flex';
    }
  }

  tabAuthBtn.addEventListener('click', () => showTab('auth'));
  tabConfigBtn.addEventListener('click', () => showTab('config'));
  tabHostingBtn.addEventListener('click', () => showTab('hosting'));

  // Auth actions
  backdrop.querySelector('#google-login-btn').addEventListener('click', async () => {
    await firebaseService.signInWithGoogle();
    close();
  });

  backdrop.querySelector('#guest-login-btn').addEventListener('click', async () => {
    await firebaseService.signInAsGuest();
    close();
  });

  const emailInput = backdrop.querySelector('#email-input');
  const passInput = backdrop.querySelector('#pass-input');

  backdrop.querySelector('#email-signin-btn').addEventListener('click', async () => {
    if (!emailInput.value || !passInput.value) {
      alert('Please enter an email and password');
      return;
    }
    await firebaseService.signInWithEmail(emailInput.value, passInput.value);
    close();
  });

  backdrop.querySelector('#email-signup-btn').addEventListener('click', async () => {
    if (!emailInput.value || !passInput.value) {
      alert('Please enter an email and password');
      return;
    }
    await firebaseService.signUpWithEmail(emailInput.value, passInput.value);
    close();
  });

  const logoutBtn = backdrop.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await firebaseService.logOut();
      close();
    });
  }

  // Firebase Config actions
  const configTextarea = backdrop.querySelector('#fb-config-json');
  try {
    const saved = localStorage.getItem('spoticlone_firebase_config');
    if (saved) configTextarea.value = JSON.stringify(JSON.parse(saved), null, 2);
  } catch (e) {}

  backdrop.querySelector('#save-fb-config-btn').addEventListener('click', () => {
    try {
      const cfg = JSON.parse(configTextarea.value);
      const res = firebaseService.initFirebase(cfg);
      if (res.success) {
        alert('Connected successfully to Firebase!');
        close();
      } else {
        alert('Firebase init error: ' + res.error);
      }
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  });

  backdrop.querySelector('#disconnect-fb-btn').addEventListener('click', () => {
    firebaseService.disconnectLiveFirebase();
    configTextarea.value = '';
    alert('Reset to Local Demo Mode.');
    close();
  });

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));

  return { close };
}
