/**
 * AudioEngine - Hybrid HTML5 Audio + Web Audio API Engine
 * Includes real-time spectrum AnalyserNode and procedural Web Audio synth fallback.
 */

class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.synthGain = null;

    this.isSynthActive = false;
    this.synthInterval = null;
    this.synthTime = 0;
    this.synthDuration = 240; // 4 mins virtual duration
    this.simulatedTimer = null;

    this.volume = 0.8;
    this.isMuted = false;
    this.currentTrack = null;

    this.listeners = {
      play: [],
      pause: [],
      timeupdate: [],
      ended: [],
      error: [],
      trackloaded: []
    };

    this._bindNativeEvents();
  }

  _bindNativeEvents() {
    this.audio.addEventListener('play', () => this._emit('play'));
    this.audio.addEventListener('pause', () => this._emit('pause'));
    this.audio.addEventListener('timeupdate', () => {
      if (!this.isSynthActive) {
        this._emit('timeupdate', {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration || (this.currentTrack ? this.currentTrack.durationSec : 0)
        });
      }
    });
    this.audio.addEventListener('ended', () => {
      if (!this.isSynthActive) {
        this._emit('ended');
      }
    });
    this.audio.addEventListener('error', (e) => {
      console.warn('Audio stream error. Activating procedural Web Audio fallback:', e);
      this._activateSynthFallback();
    });
  }

  _initAudioContext() {
    if (this.audioContext) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;

      try {
        this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      } catch (err) {
        // Source already connected or restricted
        console.warn('Web Audio node connection warning:', err);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resumeContext() {
    this._initAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  async loadAndPlay(track) {
    this.resumeContext();
    this.stopSynth();
    this.currentTrack = track;

    if (!track) return;

    try {
      this.audio.src = track.audioUrl;
      this.audio.currentTime = 0;
      this.audio.volume = this.isMuted ? 0 : this.volume;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      this._emit('trackloaded', track);
    } catch (err) {
      console.warn('Direct audio play failed or was blocked. Falling back to synth engine:', err);
      this._activateSynthFallback();
    }
  }

  play() {
    this.resumeContext();
    if (this.isSynthActive) {
      this._resumeSynth();
      this._emit('play');
      return;
    }
    if (this.audio.src) {
      this.audio.play().catch(() => {
        this._activateSynthFallback();
      });
    }
  }

  pause() {
    if (this.isSynthActive) {
      this._pauseSynth();
      this._emit('pause');
      return;
    }
    this.audio.pause();
  }

  seek(seconds) {
    if (this.isSynthActive) {
      this.synthTime = Math.max(0, Math.min(seconds, this.synthDuration));
      this._emit('timeupdate', {
        currentTime: this.synthTime,
        duration: this.synthDuration
      });
      return;
    }
    if (Number.isFinite(seconds) && this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
    }
  }

  setVolume(val) {
    const clamped = Math.max(0, Math.min(1, val));
    this.volume = clamped;
    this.isMuted = clamped === 0;
    this.audio.volume = clamped;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioContext?.currentTime || 0);
    }
    if (this.synthGain) {
      this.synthGain.gain.setValueAtTime(clamped * 0.15, this.audioContext?.currentTime || 0);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const target = this.isMuted ? 0 : this.volume;
    this.audio.volume = target;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(target, this.audioContext?.currentTime || 0);
    }
    if (this.synthGain) {
      this.synthGain.gain.setValueAtTime(target * 0.15, this.audioContext?.currentTime || 0);
    }
    return this.isMuted;
  }

  getFrequencyData() {
    if (!this.analyser) {
      // Generate pleasing animated pseudo-spectrum if Web Audio not bound
      const arr = new Uint8Array(64);
      if (this.isPlaying()) {
        const time = Date.now() / 200;
        for (let i = 0; i < 64; i++) {
          arr[i] = Math.floor(80 + 70 * Math.sin(time + i * 0.3) + 40 * Math.cos(time * 0.5 - i * 0.1));
        }
      }
      return arr;
    }
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  isPlaying() {
    if (this.isSynthActive) return this.synthInterval !== null;
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  getCurrentTime() {
    if (this.isSynthActive) return this.synthTime;
    return this.audio.currentTime || 0;
  }

  getDuration() {
    if (this.isSynthActive) return this.synthDuration;
    return this.audio.duration || (this.currentTrack ? this.currentTrack.durationSec : 0);
  }

  /* ---------------- Procedural Synth Engine Fallback ---------------- */
  _activateSynthFallback() {
    this.isSynthActive = true;
    this.synthTime = 0;
    this.synthDuration = this.currentTrack ? this.currentTrack.durationSec : 240;
    this._resumeSynth();
    this._emit('play');
    this._emit('trackloaded', this.currentTrack);
  }

  _resumeSynth() {
    if (this.synthInterval) return;
    this._initAudioContext();

    // Procedural Lo-Fi / Synth chord generator
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C maj
      [220.00, 261.63, 329.63, 440.00], // A min
      [174.61, 220.00, 261.63, 349.23], // F maj
      [196.00, 246.94, 293.66, 392.00]  // G maj
    ];

    let chordStep = 0;
    const playChord = () => {
      if (!this.audioContext || this.audioContext.state === 'suspended') return;
      const ctx = this.audioContext;
      const chord = chords[chordStep % chords.length];
      chordStep++;

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime((this.volume * 0.08) / chord.length, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        if (this.analyser) gain.connect(this.analyser);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.9);
      });
    };

    playChord();
    this.synthChordTimer = setInterval(playChord, 1800);

    this.synthInterval = setInterval(() => {
      this.synthTime += 0.25;
      if (this.synthTime >= this.synthDuration) {
        this.stopSynth();
        this._emit('ended');
      } else {
        this._emit('timeupdate', {
          currentTime: this.synthTime,
          duration: this.synthDuration
        });
      }
    }, 250);
  }

  _pauseSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthChordTimer) {
      clearInterval(this.synthChordTimer);
      this.synthChordTimer = null;
    }
  }

  stopSynth() {
    this._pauseSynth();
    this.isSynthActive = false;
    this.synthTime = 0;
  }

  /* ---------------- Event System ---------------- */
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

export const audioEngine = new AudioEngine();
