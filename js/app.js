'use strict';

window.storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => console.log('[SW] Registered'))
      .catch(err => console.warn('[SW] Failed:', err));
  });
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.hidden = false;
});

window.addEventListener('appinstalled', () => {
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.hidden = true;
});
