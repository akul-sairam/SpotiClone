import { icons } from '../utils/icons.js';
import { playerController } from '../services/playerController.js';
import { firebaseService } from '../services/firebaseService.js';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function createPlayerBar({ onToggleQueue, onToggleLyrics, onOpenTrackView }) {
  const container = document.createElement('footer');
  container.className = 'player-bar';

  container.innerHTML = `
    <!-- Left: Track Details -->
    <div class="player-track-info">
      <div class="player-cover-container" id="player-cover-btn" title="Open visualizer & lyrics">
        <img 
          src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80" 
          class="player-cover-img" 
          id="player-current-cover" 
          alt="Album art"
        />
        <div class="player-cover-expand-overlay">
          ${icons.maximize(18)}
        </div>
      </div>
      <div class="player-meta">
        <span class="player-title" id="player-current-title">Neon Skyline</span>
        <span class="player-artist" id="player-current-artist">Luna Eclipse</span>
      </div>
      <button class="player-like-btn" id="player-heart-btn" title="Save to Liked Songs">
        ${icons.heart(20, false)}
      </button>
    </div>

    <!-- Center: Playback & Timeline Scrubber -->
    <div class="player-controls-center">
      <div class="player-buttons-row">
        <button class="control-btn shuffle-btn" id="player-shuffle-btn" title="Enable shuffle">
          ${icons.shuffle(19, false)}
        </button>
        <button class="control-btn" id="player-prev-btn" title="Previous">
          ${icons.skipBack(20)}
        </button>
        <button class="play-pause-main-btn" id="player-play-btn" title="Play">
          ${icons.play(20, '#000000')}
        </button>
        <button class="control-btn" id="player-next-btn" title="Next">
          ${icons.skipForward(20)}
        </button>
        <button class="control-btn repeat-btn" id="player-repeat-btn" title="Enable repeat">
          ${icons.repeat(19, 'off')}
        </button>
      </div>

      <div class="player-timeline-row">
        <span class="time-label" id="player-current-time">0:00</span>
        <div class="custom-slider-container" id="player-timeline-slider">
          <div class="slider-track">
            <div class="slider-fill" id="player-timeline-fill"></div>
          </div>
          <div class="slider-thumb" id="player-timeline-thumb"></div>
        </div>
        <span class="time-label" id="player-duration">0:00</span>
      </div>
    </div>

    <!-- Right: Tools, Queue & Volume -->
    <div class="player-tools-right">
      <button class="control-btn" id="player-lyrics-btn" title="Lyrics & Audio Visualizer">
        ${icons.mic(19)}
      </button>
      <div class="queue-btn-wrapper">
        <button class="control-btn" id="player-queue-btn" title="Queue">
          ${icons.queue(20)}
        </button>
        <span class="queue-badge-count" id="player-queue-badge" style="display: none;">0</span>
      </div>
      <div class="volume-wrapper">
        <button class="volume-icon-btn" id="player-volume-btn" title="Mute/Unmute">
          ${icons.volumeHigh(20)}
        </button>
        <div class="custom-slider-container" id="player-volume-slider">
          <div class="slider-track">
            <div class="slider-fill" id="player-volume-fill" style="width: 80%;"></div>
          </div>
          <div class="slider-thumb" id="player-volume-thumb" style="left: 80%;"></div>
        </div>
      </div>
      <button class="control-btn" id="player-fullscreen-btn" title="Full screen">
        ${icons.maximize(18)}
      </button>
    </div>
  `;

  // Element handles
  const coverImg = container.querySelector('#player-current-cover');
  const titleEl = container.querySelector('#player-current-title');
  const artistEl = container.querySelector('#player-current-artist');
  const heartBtn = container.querySelector('#player-heart-btn');
  const playBtn = container.querySelector('#player-play-btn');
  const prevBtn = container.querySelector('#player-prev-btn');
  const nextBtn = container.querySelector('#player-next-btn');
  const shuffleBtn = container.querySelector('#player-shuffle-btn');
  const repeatBtn = container.querySelector('#player-repeat-btn');
  const currentTimeEl = container.querySelector('#player-current-time');
  const durationEl = container.querySelector('#player-duration');
  const timelineFill = container.querySelector('#player-timeline-fill');
  const timelineThumb = container.querySelector('#player-timeline-thumb');
  const timelineSlider = container.querySelector('#player-timeline-slider');
  const lyricsBtn = container.querySelector('#player-lyrics-btn');
  const queueBtn = container.querySelector('#player-queue-btn');
  const queueBadge = container.querySelector('#player-queue-badge');
  const volumeBtn = container.querySelector('#player-volume-btn');
  const volumeSlider = container.querySelector('#player-volume-slider');
  const volumeFill = container.querySelector('#player-volume-fill');
  const volumeThumb = container.querySelector('#player-volume-thumb');
  const fullscreenBtn = container.querySelector('#player-fullscreen-btn');

  // Bind Buttons
  playBtn.addEventListener('click', () => playerController.togglePlay());
  prevBtn.addEventListener('click', () => playerController.previous());
  nextBtn.addEventListener('click', () => playerController.next());

  shuffleBtn.addEventListener('click', () => {
    const isShuffle = playerController.toggleShuffle();
    shuffleBtn.classList.toggle('active', isShuffle);
    shuffleBtn.innerHTML = icons.shuffle(19, isShuffle);
  });

  repeatBtn.addEventListener('click', () => {
    const mode = playerController.cycleRepeat();
    repeatBtn.classList.toggle('active', mode !== 'off');
    repeatBtn.innerHTML = icons.repeat(19, mode);
  });

  heartBtn.addEventListener('click', async () => {
    if (playerController.currentTrack) {
      heartBtn.classList.add('pop');
      setTimeout(() => heartBtn.classList.remove('pop'), 400);
      const isLiked = await firebaseService.toggleLikeSong(playerController.currentTrack);
      updateHeartState(isLiked);
    }
  });

  container.querySelector('#player-cover-btn').addEventListener('click', onToggleLyrics);
  lyricsBtn.addEventListener('click', onToggleLyrics);
  queueBtn.addEventListener('click', onToggleQueue);

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Timeline scrubber scrubbing logic
  let isScrubbing = false;

  function handleSeek(e) {
    const rect = timelineSlider.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = pos * (playerController.duration || 1);
    timelineFill.style.width = `${pos * 100}%`;
    timelineThumb.style.left = `${pos * 100}%`;
    currentTimeEl.textContent = formatTime(targetSeconds);
    if (!isScrubbing) {
      playerController.seek(targetSeconds);
    }
  }

  timelineSlider.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    handleSeek(e);
    const onMouseMove = (moveEvent) => {
      if (isScrubbing) handleSeek(moveEvent);
    };
    const onMouseUp = (upEvent) => {
      if (isScrubbing) {
        isScrubbing = false;
        handleSeek(upEvent);
        const rect = timelineSlider.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (upEvent.clientX - rect.left) / rect.width));
        playerController.seek(pos * (playerController.duration || 1));
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  // Volume slider scrubbing logic
  function handleVolume(e) {
    const rect = volumeSlider.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    volumeFill.style.width = `${pos * 100}%`;
    volumeThumb.style.left = `${pos * 100}%`;
    playerController.setVolume(pos);
    updateVolumeIcon(pos, false);
  }

  volumeSlider.addEventListener('mousedown', (e) => {
    handleVolume(e);
    const onMouseMove = (moveEvent) => handleVolume(moveEvent);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  volumeBtn.addEventListener('click', () => {
    const isMuted = playerController.toggleMute();
    if (isMuted) {
      volumeFill.style.width = '0%';
      volumeThumb.style.left = '0%';
      volumeBtn.innerHTML = icons.volumeMute(20);
    } else {
      const vol = playerController.volume || 0.8;
      volumeFill.style.width = `${vol * 100}%`;
      volumeThumb.style.left = `${vol * 100}%`;
      updateVolumeIcon(vol, false);
    }
  });

  function updateVolumeIcon(vol, isMuted) {
    if (isMuted || vol === 0) {
      volumeBtn.innerHTML = icons.volumeMute(20);
    } else if (vol < 0.5) {
      volumeBtn.innerHTML = icons.volumeLow(20);
    } else {
      volumeBtn.innerHTML = icons.volumeHigh(20);
    }
  }

  function updateHeartState(isLiked) {
    heartBtn.classList.toggle('liked', isLiked);
    heartBtn.innerHTML = icons.heart(20, isLiked);
  }

  // Reactive player events
  playerController.on('trackChange', (track) => {
    if (!track) return;
    coverImg.src = track.cover;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    durationEl.textContent = track.duration || formatTime(track.durationSec);
    updateHeartState(firebaseService.isLiked(track.id));
    firebaseService.recordHistory(track);
  });

  playerController.on('stateChange', ({ isPlaying }) => {
    if (isPlaying) {
      playBtn.innerHTML = icons.pause(20, '#000000');
      playBtn.title = 'Pause';
    } else {
      playBtn.innerHTML = icons.play(20, '#000000');
      playBtn.title = 'Play';
    }
  });

  playerController.on('timeUpdate', ({ currentTime, duration }) => {
    if (isScrubbing) return;
    currentTimeEl.textContent = formatTime(currentTime);
    if (duration > 0) {
      durationEl.textContent = formatTime(duration);
      const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      timelineFill.style.width = `${pct}%`;
      timelineThumb.style.left = `${pct}%`;
    }
  });

  playerController.on('queueChange', (fullQueue) => {
    const count = fullQueue.userQueue.length;
    if (count > 0) {
      queueBadge.style.display = 'flex';
      queueBadge.textContent = count > 99 ? '99+' : count;
    } else {
      queueBadge.style.display = 'none';
    }
  });

  firebaseService.subscribe('likedSongs', () => {
    if (playerController.currentTrack) {
      updateHeartState(firebaseService.isLiked(playerController.currentTrack.id));
    }
  });

  // Initial populate
  if (playerController.currentTrack) {
    const t = playerController.currentTrack;
    coverImg.src = t.cover;
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    durationEl.textContent = t.duration;
    updateHeartState(firebaseService.isLiked(t.id));
  }

  return { element: container };
}
