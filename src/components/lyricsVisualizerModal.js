import { icons } from '../utils/icons.js';
import { audioEngine } from '../services/audioEngine.js';
import { playerController } from '../services/playerController.js';

export function createLyricsVisualizerModal({ onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const track = playerController.currentTrack;
  const lyrics = track?.lyrics || [
    { time: 0, text: "♪ Enjoying the instrumental groove ♪" },
    { time: 10, text: "♪ Feel the rhythm and acoustic frequencies ♪" },
    { time: 25, text: "♪ Immersive soundscapes by SpotiClone ♪" }
  ];

  backdrop.innerHTML = `
    <div class="modal-window lyrics-modal" style="background: linear-gradient(180deg, ${track?.color || '#1e3264'} 0%, #0d131a 100%);">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${track?.cover || ''}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover; box-shadow: var(--shadow-card);" />
          <div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff;">${track?.title || 'Unknown Track'}</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">${track?.artist || 'Unknown Artist'} • ${track?.album || ''}</div>
          </div>
        </div>
        <button class="modal-close-btn" id="close-lyrics-modal" style="color: #ffffff;">${icons.close(20)}</button>
      </div>

      <!-- Live Spectrum Visualizer Canvas -->
      <canvas id="visualizer-canvas" class="visualizer-canvas" width="600" height="90"></canvas>

      <!-- Synchronized Lyrics Scroll Container -->
      <div class="lyrics-scroll-box" id="lyrics-scroll-box">
        ${lyrics.map((l, idx) => `
          <div class="lyrics-line" data-time="${l.time}" data-line-idx="${idx}">
            ${l.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const canvas = backdrop.querySelector('#visualizer-canvas');
  const canvasCtx = canvas.getContext('2d');
  const scrollBox = backdrop.querySelector('#lyrics-scroll-box');
  const lines = backdrop.querySelectorAll('.lyrics-line');

  let animationId = null;

  // Real-time canvas spectrum rendering loop
  function drawVisualizer() {
    animationId = requestAnimationFrame(drawVisualizer);
    const freq = audioEngine.getFrequencyData();
    const width = canvas.width;
    const height = canvas.height;

    canvasCtx.clearRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = (width / barCount) - 3;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const binIndex = Math.floor((i / barCount) * freq.length);
      const val = freq[binIndex] || 0;
      const barHeight = Math.max(4, (val / 255) * height);

      const grad = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
      grad.addColorStop(0, '#1db954');
      grad.addColorStop(0.7, '#1ed760');
      grad.addColorStop(1, '#6ee7b7');

      canvasCtx.fillStyle = grad;
      canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + 3;
    }
  }

  // Synchronized lyric highlighting
  let lastActiveIdx = -1;
  const onTimeUpdate = ({ currentTime }) => {
    let activeIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIdx = i;
      }
    }

    if (activeIdx !== lastActiveIdx) {
      lastActiveIdx = activeIdx;
      lines.forEach((line, idx) => {
        if (idx === activeIdx) {
          line.classList.add('active');
          line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          line.classList.remove('active');
        }
      });
    }
  };

  // Click on lyric line to seek
  lines.forEach(line => {
    line.addEventListener('click', () => {
      const time = parseFloat(line.dataset.time);
      playerController.seek(time);
    });
  });

  playerController.on('timeUpdate', onTimeUpdate);

  const close = () => {
    if (animationId) cancelAnimationFrame(animationId);
    playerController.off('timeUpdate', onTimeUpdate);
    backdrop.classList.remove('open');
    setTimeout(() => {
      backdrop.remove();
      if (onClose) onClose();
    }, 200);
  };

  backdrop.querySelector('#close-lyrics-modal').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => {
    backdrop.classList.add('open');
    drawVisualizer();
  });

  return { close };
}
