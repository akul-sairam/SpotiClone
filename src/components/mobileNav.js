import { icons } from '../utils/icons.js';

export function createMobileNav({ onNavigate }) {
  const container = document.createElement('nav');
  container.className = 'mobile-bottom-nav';

  container.innerHTML = `
    <div class="mobile-nav-item active" data-nav="home">
      ${icons.home(22)}
      <span>Home</span>
    </div>
    <div class="mobile-nav-item" data-nav="search">
      ${icons.search(22)}
      <span>Search</span>
    </div>
    <div class="mobile-nav-item" data-nav="liked-songs">
      ${icons.heart(22)}
      <span>Liked</span>
    </div>
  `;

  container.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      onNavigate(item.dataset.nav);
    });
  });

  return {
    element: container,
    setActiveNav: (navName) => {
      container.querySelectorAll('.mobile-nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.nav === navName);
      });
    }
  };
}
