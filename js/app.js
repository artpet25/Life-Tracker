'use strict';

const SUPABASE_URL = 'https://xrmezfmvtqeysgoavxfh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybWV6Zm12dHFleXNnb2F2eGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTg0OTYsImV4cCI6MjA5MjkzNDQ5Nn0.cxzy8d37SFMaE4L_ZGEij-FicmKCqsbzk_33v_8iZGg';

const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const SYNC_ROW_ID = 'main';
const ALLOWED_PREFIXES = ['habits:', 'fruits:', 'yearly:', 'monthly:', 'weekly:'];
let _syncTimer = null;

// ── Storage : localStorage + debounced Supabase JSON sync ────────────────────

window.storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    schedulePush();
  }
};

function schedulePush() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(pushToSupabase, 2000);
}

async function pushToSupabase() {
  const data = {};
  Object.keys(localStorage)
    .filter(k => ALLOWED_PREFIXES.some(p => k.startsWith(p)))
    .forEach(k => { data[k] = localStorage.getItem(k); });

  const { error } = await _supa
    .from('app_data')
    .upsert({ id: SYNC_ROW_ID, data, updated_at: new Date().toISOString() });
  if (error) console.error('[Supabase] push error:', error.message);
  else console.log('[Supabase] synced', Object.keys(data).length, 'keys');
}

async function pullFromSupabase() {
  const { data: row, error } = await _supa
    .from('app_data')
    .select('data')
    .eq('id', SYNC_ROW_ID)
    .single();

  if (error || !row?.data) return false;

  Object.entries(row.data).forEach(([key, value]) => {
    if (ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
      localStorage.setItem(key, value);
    }
  });
  return true;
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function initSync() {
  const pulled = await pullFromSupabase();
  if (pulled && window.reloadAppData) await window.reloadAppData();

  // Push any local-only data that isn't in Supabase yet
  schedulePush();
}

document.addEventListener('DOMContentLoaded', () => {
  initSync();
});

// ── Service worker ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('[SW] Registered'))
      .catch(err => console.warn('[SW] Failed:', err));
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = false;
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = true;
});
