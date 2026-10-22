import { audioEngine } from './audioEngine.js';
import { TRACKS, getTrackById } from '../data/musicData.js';

class PlayerController {
  constructor() {
    this.currentTrack = null;
    this.currentPlaylist = null;
    this.isPlaying = false;
    this.queue = []; // Explicit user queued tracks
    this.playlistContextTracks = []; // Remaining tracks from current playlist
    this.history = []; // Previously played tracks
    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'
    this.currentTime = 0;
    this.duration = 0;

    this.listeners = {
      trackChange: [],
      stateChange: [],
      timeUpdate: [],
      queueChange: [],
      modeChange: []
    };

    this._bindAudioEvents();
    this._loadPersistedState();
  }

  _bindAudioEvents() {
    audioEngine.on('play', () => {
      this.isPlaying = true;
      this._emit('stateChange', { isPlaying: true });
    });

    audioEngine.on('pause', () => {
      this.isPlaying = false;
      this._emit('stateChange', { isPlaying: false });
    });

    audioEngine.on('timeupdate', ({ currentTime, duration }) => {
      this.currentTime = currentTime;
      this.duration = duration;
      this._emit('timeUpdate', { currentTime, duration });
    });

    audioEngine.on('ended', () => {
      this._handleTrackEnded();
    });
  }

  _loadPersistedState() {
    try {
      const savedVolume = localStorage.getItem('spoticlone_volume');
      if (savedVolume !== null) {
        audioEngine.setVolume(parseFloat(savedVolume));
      }
      const savedTrackId = localStorage.getItem('spoticlone_last_track');
      if (savedTrackId) {
        const tr = getTrackById(savedTrackId);
        if (tr) {
          this.currentTrack = tr;
          this.duration = tr.durationSec;
        }
      }
      if (!this.currentTrack && TRACKS.length > 0) {
        this.currentTrack = TRACKS[0];
        this.duration = TRACKS[0].durationSec;
      }
    } catch (e) {
      console.warn('Failed to load persisted state:', e);
      if (TRACKS.length > 0) {
        this.currentTrack = TRACKS[0];
        this.duration = TRACKS[0].durationSec;
      }
    }
  }

  playTrack(track, playlistContext = null) {
    if (!track) return;

    if (this.currentTrack && this.currentTrack.id !== track.id) {
      this.history.push(this.currentTrack);
      if (this.history.length > 50) this.history.shift();
    }

    this.currentTrack = track;
    if (playlistContext) {
      this.currentPlaylist = playlistContext;
      // Filter out played track and populate upcoming playlist context tracks
      const allPlaylistTracks = playlistContext.trackIds
        .map(id => getTrackById(id))
        .filter(Boolean);
      const currentIndex = allPlaylistTracks.findIndex(t => t.id === track.id);
      if (currentIndex !== -1) {
        this.playlistContextTracks = allPlaylistTracks.slice(currentIndex + 1);
      } else {
        this.playlistContextTracks = allPlaylistTracks.filter(t => t.id !== track.id);
      }
    }

    try {
      localStorage.setItem('spoticlone_last_track', track.id);
    } catch (e) {}

    audioEngine.loadAndPlay(track);
    this._emit('trackChange', track);
    this._emit('queueChange', this.getFullQueue());
  }

  togglePlay() {
    if (!this.currentTrack) {
      this.playTrack(TRACKS[0]);
      return;
    }

    if (this.isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  }

  next() {
    if (this.repeatMode === 'one' && this.currentTrack) {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    // 1. Check explicit user queue
    if (this.queue.length > 0) {
      const nextTrack = this.queue.shift();
      this.playTrack(nextTrack, this.currentPlaylist);
      this._emit('queueChange', this.getFullQueue());
      return;
    }

    // 2. Check playlist context tracks
    if (this.playlistContextTracks.length > 0) {
      let nextTrack;
      if (this.isShuffle) {
        const randIndex = Math.floor(Math.random() * this.playlistContextTracks.length);
        nextTrack = this.playlistContextTracks.splice(randIndex, 1)[0];
      } else {
        nextTrack = this.playlistContextTracks.shift();
      }
      this.playTrack(nextTrack, this.currentPlaylist);
      this._emit('queueChange', this.getFullQueue());
      return;
    }

    // 3. Repeat all behavior
    if (this.repeatMode === 'all' && this.currentPlaylist) {
      const allTracks = this.currentPlaylist.trackIds
        .map(id => getTrackById(id))
        .filter(Boolean);
      if (allTracks.length > 0) {
        this.playTrack(allTracks[0], this.currentPlaylist);
        return;
      }
    }

    // Default: loop within all available tracks
    const allTracks = TRACKS;
    const currentIndex = allTracks.findIndex(t => t.id === this.currentTrack?.id);
    const nextIndex = (currentIndex + 1) % allTracks.length;
    this.playTrack(allTracks[nextIndex]);
  }

  previous() {
    if (this.currentTime > 3) {
      audioEngine.seek(0);
      return;
    }

    if (this.history.length > 0) {
      const prevTrack = this.history.pop();
      if (this.currentTrack) {
        // Put current back in queue head
        this.queue.unshift(this.currentTrack);
      }
      this.playTrack(prevTrack, this.currentPlaylist);
      return;
    }

    // Fallback: previous in all tracks
    const allTracks = TRACKS;
    const currentIndex = allTracks.findIndex(t => t.id === this.currentTrack?.id);
    const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
    this.playTrack(allTracks[prevIndex]);
  }

  _handleTrackEnded() {
    if (this.repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
    } else {
      this.next();
    }
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    if (this.isShuffle && this.playlistContextTracks.length > 1) {
      // Shuffle upcoming playlist tracks
      for (let i = this.playlistContextTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playlistContextTracks[i], this.playlistContextTracks[j]] = [
          this.playlistContextTracks[j],
          this.playlistContextTracks[i]
        ];
      }
    }
    this._emit('modeChange', { isShuffle: this.isShuffle, repeatMode: this.repeatMode });
    this._emit('queueChange', this.getFullQueue());
    return this.isShuffle;
  }

  cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    this._emit('modeChange', { isShuffle: this.isShuffle, repeatMode: this.repeatMode });
    return this.repeatMode;
  }

  seek(seconds) {
    audioEngine.seek(seconds);
  }

  setVolume(level) {
    audioEngine.setVolume(level);
    try {
      localStorage.setItem('spoticlone_volume', level.toString());
    } catch (e) {}
  }

  toggleMute() {
    return audioEngine.toggleMute();
  }

  /* ---------------- Queue Management ---------------- */
  addToQueue(track) {
    if (!track) return;
    this.queue.push(track);
    this._emit('queueChange', this.getFullQueue());
  }

  playNext(track) {
    if (!track) return;
    this.queue.unshift(track);
    this._emit('queueChange', this.getFullQueue());
  }

  removeFromQueue(index) {
    if (index >= 0 && index < this.queue.length) {
      this.queue.splice(index, 1);
      this._emit('queueChange', this.getFullQueue());
    }
  }

  clearQueue() {
    this.queue = [];
    this._emit('queueChange', this.getFullQueue());
  }

  reorderQueue(fromIndex, toIndex) {
    if (
      fromIndex >= 0 &&
      fromIndex < this.queue.length &&
      toIndex >= 0 &&
      toIndex < this.queue.length
    ) {
      const [moved] = this.queue.splice(fromIndex, 1);
      this.queue.splice(toIndex, 0, moved);
      this._emit('queueChange', this.getFullQueue());
    }
  }

  playQueuedTrack(queueIndex) {
    if (queueIndex >= 0 && queueIndex < this.queue.length) {
      const track = this.queue.splice(queueIndex, 1)[0];
      this.playTrack(track, this.currentPlaylist);
      this._emit('queueChange', this.getFullQueue());
    }
  }

  getFullQueue() {
    return {
      current: this.currentTrack,
      userQueue: [...this.queue],
      upcomingPlaylist: [...this.playlistContextTracks]
    };
  }

  /* ---------------- Event Dispatcher ---------------- */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export const playerController = new PlayerController();
