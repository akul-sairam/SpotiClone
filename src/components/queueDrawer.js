import { icons } from '../utils/icons.js';
import { playerController } from '../services/playerController.js';

export function createQueueDrawer({ onClose }) {
  const container = document.createElement('div');
  container.className = 'queue-drawer';

  container.innerHTML = `
    <div class="queue-drawer-header">
      <div class="queue-title-wrap">
        ${icons.queue(22)}
        <h2 class="queue-drawer-title">Play Queue</h2>
      </div>
      <div class="queue-header-actions">
        <button class="btn-clear-queue" id="btn-clear-queue">Clear Queue</button>
        <button class="modal-close-btn" id="btn-close-queue" title="Close queue">
          ${icons.close(18)}
        </button>
      </div>
    </div>

    <div class="queue-drawer-content" id="queue-drawer-content">
      <!-- Populated dynamically -->
    </div>
  `;

  const contentEl = container.querySelector('#queue-drawer-content');
  const clearBtn = container.querySelector('#btn-clear-queue');
  const closeBtn = container.querySelector('#btn-close-queue');

  closeBtn.addEventListener('click', onClose);
  clearBtn.addEventListener('click', () => {
    playerController.clearQueue();
  });

  function renderQueue(fullQueue) {
    const { current, userQueue, upcomingPlaylist } = fullQueue;

    let html = '';

    // 1. Now Playing Section
    if (current) {
      html += `
        <div>
          <div class="queue-section-title">Now Playing</div>
          <div class="queue-item active">
            <img src="${current.cover}" class="queue-item-thumb" alt="${current.title}"/>
            <div class="queue-item-details">
              <span class="queue-item-title">${current.title}</span>
              <span class="queue-item-artist">${current.artist}</span>
            </div>
            <div class="equalizer-bars">
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
              <span class="equalizer-bar"></span>
            </div>
          </div>
        </div>
      `;
    }

    // 2. User Explicit Queue
    html += `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <div class="queue-section-title" style="margin-bottom: 0;">Next in Queue (${userQueue.length})</div>
        </div>
    `;

    if (userQueue.length === 0) {
      html += `
        <div style="padding: 18px 8px; font-size: 0.85rem; color: var(--text-muted); text-align: center; border: 1px dashed var(--border-subtle); border-radius: 8px;">
          Your queue is empty.<br>Click "..." on any track to add it to your queue!
        </div>
      `;
    } else {
      html += userQueue.map((track, idx) => `
        <div class="queue-item" data-queue-idx="${idx}">
          <img src="${track.cover}" class="queue-item-thumb" alt="${track.title}"/>
          <div class="queue-item-details">
            <span class="queue-item-title">${track.title}</span>
            <span class="queue-item-artist">${track.artist}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-subdued); margin-right: 4px;">${track.duration}</span>
          <button class="queue-remove-btn" data-remove-idx="${idx}" title="Remove from queue">
            ${icons.trash(16)}
          </button>
        </div>
      `).join('');
    }
    html += `</div>`;

    // 3. Upcoming Playlist Tracks
    if (upcomingPlaylist && upcomingPlaylist.length > 0) {
      const playlistName = playerController.currentPlaylist?.title || 'Next Up';
      html += `
        <div>
          <div class="queue-section-title">Next from: ${playlistName} (${upcomingPlaylist.length})</div>
          ${upcomingPlaylist.slice(0, 10).map(track => `
            <div class="queue-item upcoming-track-item" data-track-id="${track.id}">
              <img src="${track.cover}" class="queue-item-thumb" alt="${track.title}"/>
              <div class="queue-item-details">
                <span class="queue-item-title">${track.title}</span>
                <span class="queue-item-artist">${track.artist}</span>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-subdued);">${track.duration}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    contentEl.innerHTML = html;

    // Attach row listeners
    contentEl.querySelectorAll('[data-queue-idx]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.queue-remove-btn')) return;
        const idx = parseInt(item.dataset.queueIdx, 10);
        playerController.playQueuedTrack(idx);
      });
    });

    contentEl.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.removeIdx, 10);
        playerController.removeFromQueue(idx);
      });
    });

    contentEl.querySelectorAll('.upcoming-track-item').forEach(item => {
      item.addEventListener('click', () => {
        const trId = item.dataset.trackId;
        const track = upcomingPlaylist.find(t => t.id === trId);
        if (track) {
          playerController.playTrack(track, playerController.currentPlaylist);
        }
      });
    });
  }

  // Subscribe to controller updates
  playerController.on('queueChange', renderQueue);
  playerController.on('trackChange', () => renderQueue(playerController.getFullQueue()));

  // Initial render
  renderQueue(playerController.getFullQueue());

  return {
    element: container,
    open: () => container.classList.add('open'),
    close: () => container.classList.remove('open'),
    toggle: () => container.classList.toggle('open'),
    isOpen: () => container.classList.contains('open')
  };
}
