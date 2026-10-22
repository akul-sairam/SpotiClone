import confetti from 'canvas-confetti';
import { icons } from '../utils/icons.js';
import { firebaseService } from '../services/firebaseService.js';

export function createPlaylistModal({ onCreated, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const defaultCovers = [
    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80'
  ];

  let selectedCover = defaultCovers[0];

  backdrop.innerHTML = `
    <div class="modal-window">
      <div class="modal-header">
        <h2 class="modal-title">Create New Playlist</h2>
        <button class="modal-close-btn" id="close-modal-x">${icons.close(18)}</button>
      </div>

      <div class="modal-form-group">
        <label class="modal-label">Playlist Name</label>
        <input 
          type="text" 
          id="playlist-name-input" 
          class="modal-input" 
          placeholder="e.g. Late Night Vibes" 
          value="My Playlist #${firebaseService.userPlaylists.length + 1}"
        />
      </div>

      <div class="modal-form-group">
        <label class="modal-label">Description (Optional)</label>
        <textarea 
          id="playlist-desc-input" 
          class="modal-input modal-textarea" 
          placeholder="Give your playlist a catchy description..."
        ></textarea>
      </div>

      <div class="modal-form-group">
        <label class="modal-label">Choose Cover Art</label>
        <div style="display: flex; gap: 10px; overflow-x: auto; padding: 4px 0;" id="cover-presets-row">
          ${defaultCovers.map((c, i) => `
            <img 
              src="${c}" 
              class="cover-preset-thumb ${i === 0 ? 'selected' : ''}" 
              data-cover="${c}"
              style="width: 60px; height: 60px; border-radius: 6px; object-fit: cover; cursor: pointer; border: 2px solid ${i === 0 ? 'var(--spotify-green)' : 'transparent'};"
            />
          `).join('')}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" id="cancel-playlist-btn">Cancel</button>
        <button class="btn-primary" id="save-playlist-btn">Create Playlist</button>
      </div>
    </div>
  `;

  const nameInput = backdrop.querySelector('#playlist-name-input');
  const descInput = backdrop.querySelector('#playlist-desc-input');
  const saveBtn = backdrop.querySelector('#save-playlist-btn');
  const cancelBtn = backdrop.querySelector('#cancel-playlist-btn');
  const closeX = backdrop.querySelector('#close-modal-x');

  // Cover selection
  backdrop.querySelectorAll('.cover-preset-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      backdrop.querySelectorAll('.cover-preset-thumb').forEach(t => t.style.borderColor = 'transparent');
      thumb.style.borderColor = 'var(--spotify-green)';
      selectedCover = thumb.dataset.cover;
    });
  });

  const close = () => {
    backdrop.classList.remove('open');
    setTimeout(() => {
      backdrop.remove();
      if (onClose) onClose();
    }, 200);
  };

  closeX.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  saveBtn.addEventListener('click', async () => {
    const title = nameInput.value.trim() || 'My Playlist';
    const description = descInput.value.trim();

    const created = await firebaseService.createPlaylist({
      title,
      description,
      cover: selectedCover
    });

    // Confetti explosion
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    close();
    if (onCreated) onCreated(created);
  });

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  nameInput.focus();

  return { close };
}
