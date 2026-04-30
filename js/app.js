'use strict';

const SUPABASE_URL = 'https://xrmezfmvtqeysgoavxfh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybWV6Zm12dHFleXNnb2F2eGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNTg0OTYsImV4cCI6MjA5MjkzNDQ5Nn0.cxzy8d37SFMaE4L_ZGEij-FicmKCqsbzk_33v_8iZGg';

const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
let _user = null;

// ── Storage : localStorage (fast/offline) + Supabase sync ────────────────────

window.storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    return v !== null ? { value: v } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    if (_user) {
      _supa.from('user_storage')
        .upsert({ user_id: _user.id, key, value, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,key' })
        .then(({ error }) => { if (error) console.error('[Supabase] write error:', error.message); });
    }
  }
};

// ── Sync helpers ─────────────────────────────────────────────────────────────

async function pushLocalToSupabase(userId) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('habits:') || k.startsWith('fruits:'));
  if (!keys.length) return;
  const rows = keys.map(key => ({
    user_id: userId, key, value: localStorage.getItem(key),
    updated_at: new Date().toISOString()
  }));
  await _supa.from('user_storage').upsert(rows, { onConflict: 'user_id,key' }).catch(() => {});
}

async function pullSupabaseToLocal(userId) {
  const { data } = await _supa.from('user_storage').select('key,value').eq('user_id', userId).catch(() => ({ data: null }));
  if (!data?.length) return false;
  data.forEach(row => localStorage.setItem(row.key, row.value));
  return true;
}

async function onLogin(user) {
  _user = user;

  const localKeys = Object.keys(localStorage).filter(k => k.startsWith('habits:') || k.startsWith('fruits:'));

  if (localKeys.length > 0) {
    // Push all local data to Supabase (local wins)
    const rows = localKeys.map(key => ({
      user_id: user.id, key, value: localStorage.getItem(key),
      updated_at: new Date().toISOString()
    }));
    const { error } = await _supa.from('user_storage').upsert(rows, { onConflict: 'user_id,key' });
    if (error) console.error('[Supabase] push error:', error.message);
  } else {
    // No local data → pull from Supabase
    const pulled = await pullSupabaseToLocal(user.id);
    if (pulled && window.reloadAppData) await window.reloadAppData();
  }

  document.getElementById('authOverlay')?.style.setProperty('display', 'none');
  updateAuthUI(user.email);
}

function updateAuthUI(email) {
  const el = document.getElementById('authUserEmail');
  if (el) el.textContent = email || '';
  const loginBtn = document.getElementById('authLoginBtn');
  const logoutBtn = document.getElementById('authLogoutBtn');
  if (loginBtn) loginBtn.style.display = email ? 'none' : 'block';
  if (logoutBtn) logoutBtn.style.display = email ? 'block' : 'none';
}

// ── Auth init ─────────────────────────────────────────────────────────────────

async function initAuth() {
  // 1. Session Supabase valide → connexion auto
  const { data: { session } } = await _supa.auth.getSession();
  if (session?.user) {
    await onLogin(session.user);
    return;
  }

  // 2. Données locales présentes → pas besoin de forcer l'auth
  const hasData = Object.keys(localStorage).some(k =>
    k.startsWith('habits:') || k.startsWith('fruits:') || k.startsWith('yearly:') || k.startsWith('monthly:')
  );
  if (hasData) {
    document.getElementById('authOverlay').style.display = 'none';
    return;
  }

  // 3. Première utilisation → afficher l'overlay
  const savedEmail = localStorage.getItem('auth:email');
  if (savedEmail) {
    const inp = document.getElementById('authEmail');
    if (inp) inp.value = savedEmail;
  }
  document.getElementById('authOverlay').style.display = 'flex';

  _supa.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      await onLogin(session.user);
    } else {
      _user = null;
      updateAuthUI(null);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  // Auth form
  document.getElementById('authSendBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('authEmail')?.value.trim();
    if (!email) return;
    localStorage.setItem('auth:email', email);
    const btn = document.getElementById('authSendBtn');
    btn.disabled = true; btn.textContent = '…';
    const { error } = await _supa.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.href }
    });
    if (!error) {
      document.getElementById('authSentMsg').style.display = 'block';
      document.getElementById('authEmail').style.display = 'none';
      btn.style.display = 'none';
    } else {
      btn.disabled = false; btn.textContent = 'Envoyer le lien';
    }
  });

  document.getElementById('authSkipBtn')?.addEventListener('click', () => {
    document.getElementById('authOverlay').style.display = 'none';
  });

  document.getElementById('authLogoutBtn')?.addEventListener('click', async () => {
    await _supa.auth.signOut();
    _user = null;
    updateAuthUI(null);
  });
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
