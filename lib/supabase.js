// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseKey) {
//   throw new Error('Missing Supabase env vars. Check .env.local');
// }

// export const supabase = createClient(supabaseUrl, supabaseKey);



import { createClient } from '@supabase/supabase-js';
 
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 
if (!url || !key) throw new Error('Missing Supabase env vars. Check .env.local');
 
// Use sessionStorage for true browser/tab isolation instead of localStorage
// This prevents login from persisting across normal and incognito windows
const sessionStorageAdapter = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return null; // Incognito/private mode may throw
    }
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      // Incognito/private mode may throw - silently fail
    }
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore errors in private mode
    }
  },
  key: (index) => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.key(index);
    } catch (e) {
      return null;
    }
  },
  get length() {
    if (typeof window === 'undefined') return 0;
    try {
      return window.sessionStorage.length;
    } catch (e) {
      return 0;
    }
  },
};

export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',                    // secure code exchange flow
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: sessionStorageAdapter,      // Use sessionStorage for isolation
  },
});
