/**
 * Firebase Service - Auth, Firestore real-time sync, and offline/demo store.
 * Seamless dual-mode: Real Firebase SDK when configured, reactive local sync when in demo mode.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.isLiveFirebase = false;

    // In-memory / local state for instant responsiveness & demo fallback
    this.likedSongIds = new Set();
    this.userPlaylists = [];
    this.history = [];

    // Reactive subscriptions
    this.subscribers = {
      auth: [],
      likedSongs: [],
      playlists: [],
      history: []
    };

    this._activeUnsubscribes = [];

    this._loadLocalCache();
    this._attemptAutoConnect();
  }

  _loadLocalCache() {
    try {
      const savedLikes = localStorage.getItem('spoticlone_liked_songs');
      if (savedLikes) {
        this.likedSongIds = new Set(JSON.parse(savedLikes));
      }
      const savedPlaylists = localStorage.getItem('spoticlone_user_playlists');
      if (savedPlaylists) {
        this.userPlaylists = JSON.parse(savedPlaylists);
      }
      const savedHistory = localStorage.getItem('spoticlone_history');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }
    } catch (e) {
      console.warn('Could not read localStorage cache:', e);
    }
  }

  _saveLocalCache() {
    try {
      localStorage.setItem('spoticlone_liked_songs', JSON.stringify(Array.from(this.likedSongIds)));
      localStorage.setItem('spoticlone_user_playlists', JSON.stringify(this.userPlaylists));
      localStorage.setItem('spoticlone_history', JSON.stringify(this.history));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  _attemptAutoConnect() {
    // 1. Check custom user config saved in localStorage
    let config = null;
    try {
      const stored = localStorage.getItem('spoticlone_firebase_config');
      if (stored) {
        config = JSON.parse(stored);
      }
    } catch (e) {}

    // 2. Or check Vite environment variables
    if (!config && import.meta.env?.VITE_FIREBASE_API_KEY) {
      config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
    }

    if (config && config.apiKey && config.projectId) {
      this.initFirebase(config);
    } else {
      // Default to demo/guest session
      this._initDemoUser();
    }
  }

  _initDemoUser() {
    this.isLiveFirebase = false;
    let savedDemo = null;
    try {
      const raw = localStorage.getItem('spoticlone_demo_user');
      if (raw) savedDemo = JSON.parse(raw);
    } catch (e) {}

    this.currentUser = savedDemo || {
      uid: 'guest_user_default',
      displayName: 'Guest Music Explorer',
      email: 'guest@spoticlone.demo',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      isAnonymous: true
    };

    this._notify('auth', this.currentUser);
    this._notify('likedSongs', Array.from(this.likedSongIds));
    this._notify('playlists', this.userPlaylists);
    this._notify('history', this.history);
  }

  initFirebase(config) {
    try {
      this._cleanupLiveListeners();
      const existingApps = getApps();
      this.app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isLiveFirebase = true;

      localStorage.setItem('spoticlone_firebase_config', JSON.stringify(config));

      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          this.currentUser = user;
          this._bindFirestoreListeners(user.uid);
        } else {
          this.currentUser = null;
          this._cleanupLiveListeners();
        }
        this._notify('auth', this.currentUser);
      });

      return { success: true };
    } catch (err) {
      console.error('Firebase initialization error:', err);
      this.isLiveFirebase = false;
      this._initDemoUser();
      return { success: false, error: err.message };
    }
  }

  _cleanupLiveListeners() {
    this._activeUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this._activeUnsubscribes = [];
  }

  _bindFirestoreListeners(uid) {
    this._cleanupLiveListeners();
    if (!this.db || !uid) return;

    try {
      // 1. Liked songs listener
      const likedDocRef = doc(this.db, 'users', uid, 'library', 'liked');
      const unsubLikes = onSnapshot(likedDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          this.likedSongIds = new Set(data.trackIds || []);
        }
        this._saveLocalCache();
        this._notify('likedSongs', Array.from(this.likedSongIds));
      }, (err) => console.warn('Firestore liked songs listen warning:', err));
      this._activeUnsubscribes.push(unsubLikes);

      // 2. Custom Playlists collection listener
      const playlistsColl = collection(this.db, 'users', uid, 'playlists');
      const unsubPlaylists = onSnapshot(playlistsColl, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) {
          this.userPlaylists = list;
          this._saveLocalCache();
        }
        this._notify('playlists', this.userPlaylists);
      }, (err) => console.warn('Firestore playlists listen warning:', err));
      this._activeUnsubscribes.push(unsubPlaylists);

      // 3. Play history collection listener
      const historyColl = collection(this.db, 'users', uid, 'history');
      const unsubHistory = onSnapshot(historyColl, (snap) => {
        const hist = [];
        snap.forEach(d => hist.push(d.data()));
        hist.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (hist.length > 0) {
          this.history = hist;
          this._saveLocalCache();
        }
        this._notify('history', this.history);
      }, (err) => console.warn('Firestore history listen warning:', err));
      this._activeUnsubscribes.push(unsubHistory);

    } catch (e) {
      console.warn('Could not establish Firestore live sync:', e);
    }
  }

  /* ---------------- Auth Actions ---------------- */
  async signInWithGoogle() {
    if (!this.isLiveFirebase || !this.auth) {
      // Demo Google login simulation
      this.currentUser = {
        uid: 'google_user_' + Date.now(),
        displayName: 'Alex Rivers',
        email: 'alex.rivers@gmail.com',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        providerId: 'google.com'
      };
      localStorage.setItem('spoticlone_demo_user', JSON.stringify(this.currentUser));
      this._notify('auth', this.currentUser);
      return { user: this.currentUser };
    }
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(this.auth, provider);
  }

  async signInWithEmail(email, password) {
    if (!this.isLiveFirebase || !this.auth) {
      const username = email.split('@')[0];
      this.currentUser = {
        uid: 'email_user_' + Date.now(),
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        email: email,
        photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
        providerId: 'password'
      };
      localStorage.setItem('spoticlone_demo_user', JSON.stringify(this.currentUser));
      this._notify('auth', this.currentUser);
      return { user: this.currentUser };
    }
    return await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUpWithEmail(email, password) {
    if (!this.isLiveFirebase || !this.auth) {
      return this.signInWithEmail(email, password);
    }
    return await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async signInAsGuest() {
    if (this.isLiveFirebase && this.auth) {
      return await signInAnonymously(this.auth);
    }
    this._initDemoUser();
    return { user: this.currentUser };
  }

  async logOut() {
    if (this.isLiveFirebase && this.auth) {
      await signOut(this.auth);
    }
    localStorage.removeItem('spoticlone_demo_user');
    this.currentUser = null;
    this._notify('auth', null);
  }

  /* ---------------- Liked Songs Sync ---------------- */
  isLiked(trackId) {
    return this.likedSongIds.has(trackId);
  }

  async toggleLikeSong(track) {
    if (!track) return false;
    const isNowLiked = !this.likedSongIds.has(track.id);

    if (isNowLiked) {
      this.likedSongIds.add(track.id);
    } else {
      this.likedSongIds.delete(track.id);
    }

    this._saveLocalCache();
    this._notify('likedSongs', Array.from(this.likedSongIds));

    if (this.isLiveFirebase && this.db && this.currentUser) {
      try {
        const likedRef = doc(this.db, 'users', this.currentUser.uid, 'library', 'liked');
        await setDoc(likedRef, {
          trackIds: Array.from(this.likedSongIds),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to sync like to Firestore:', e);
      }
    }

    return isNowLiked;
  }

  /* ---------------- Custom Playlist Management ---------------- */
  async createPlaylist({ title, description, cover }) {
    const newPlaylist = {
      id: 'custom-' + Date.now(),
      title: title || 'My Awesome Playlist',
      description: description || 'Created with SpotiClone',
      cover: cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(180deg, #1db954 0%, #121212 100%)',
      accentColor: '#1db954',
      likesCount: '1',
      creator: this.currentUser?.displayName || 'You',
      createdAt: Date.now(),
      trackIds: []
    };

    this.userPlaylists.unshift(newPlaylist);
    this._saveLocalCache();
    this._notify('playlists', this.userPlaylists);

    if (this.isLiveFirebase && this.db && this.currentUser) {
      try {
        const playlistDoc = doc(this.db, 'users', this.currentUser.uid, 'playlists', newPlaylist.id);
        await setDoc(playlistDoc, newPlaylist);
      } catch (e) {
        console.warn('Failed to sync playlist to Firestore:', e);
      }
    }

    return newPlaylist;
  }

  async addTrackToPlaylist(playlistId, trackId) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return false;

    if (!pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      this._saveLocalCache();
      this._notify('playlists', this.userPlaylists);

      if (this.isLiveFirebase && this.db && this.currentUser) {
        try {
          const playlistDoc = doc(this.db, 'users', this.currentUser.uid, 'playlists', playlistId);
          await setDoc(playlistDoc, { trackIds: pl.trackIds }, { merge: true });
        } catch (e) {}
      }
      return true;
    }
    return false;
  }

  async removeTrackFromPlaylist(playlistId, trackId) {
    const pl = this.userPlaylists.find(p => p.id === playlistId);
    if (!pl) return;

    pl.trackIds = pl.trackIds.filter(id => id !== trackId);
    this._saveLocalCache();
    this._notify('playlists', this.userPlaylists);

    if (this.isLiveFirebase && this.db && this.currentUser) {
      try {
        const playlistDoc = doc(this.db, 'users', this.currentUser.uid, 'playlists', playlistId);
        await setDoc(playlistDoc, { trackIds: pl.trackIds }, { merge: true });
      } catch (e) {}
    }
  }

  async deletePlaylist(playlistId) {
    this.userPlaylists = this.userPlaylists.filter(p => p.id !== playlistId);
    this._saveLocalCache();
    this._notify('playlists', this.userPlaylists);

    if (this.isLiveFirebase && this.db && this.currentUser) {
      try {
        const playlistDoc = doc(this.db, 'users', this.currentUser.uid, 'playlists', playlistId);
        await deleteDoc(playlistDoc);
      } catch (e) {}
    }
  }

  /* ---------------- Playback History Sync ---------------- */
  async recordHistory(track) {
    if (!track) return;

    const entry = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      playedAt: Date.now()
    };

    // Filter out duplicates and keep top 20
    this.history = [entry, ...this.history.filter(h => h.trackId !== track.id)].slice(0, 20);
    this._saveLocalCache();
    this._notify('history', this.history);

    if (this.isLiveFirebase && this.db && this.currentUser) {
      try {
        const histDoc = doc(this.db, 'users', this.currentUser.uid, 'history', track.id);
        await setDoc(histDoc, { ...entry, timestamp: serverTimestamp() });
      } catch (e) {}
    }
  }

  /* ---------------- Status & Subscribers ---------------- */
  getStatus() {
    return {
      isLiveFirebase: this.isLiveFirebase,
      currentUser: this.currentUser,
      projectId: this.app?.options?.projectId || null,
      likesCount: this.likedSongIds.size,
      customPlaylistsCount: this.userPlaylists.length
    };
  }

  disconnectLiveFirebase() {
    this._cleanupLiveListeners();
    localStorage.removeItem('spoticlone_firebase_config');
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isLiveFirebase = false;
    this._initDemoUser();
  }

  subscribe(channel, callback) {
    if (!this.subscribers[channel]) return () => {};
    this.subscribers[channel].push(callback);

    // Initial invoke with current state
    if (channel === 'auth') callback(this.currentUser);
    if (channel === 'likedSongs') callback(Array.from(this.likedSongIds));
    if (channel === 'playlists') callback(this.userPlaylists);
    if (channel === 'history') callback(this.history);

    return () => {
      this.subscribers[channel] = this.subscribers[channel].filter(cb => cb !== callback);
    };
  }

  _notify(channel, data) {
    if (this.subscribers[channel]) {
      this.subscribers[channel].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }
}

export const firebaseService = new FirebaseService();
