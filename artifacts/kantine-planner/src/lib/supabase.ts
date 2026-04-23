import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

// Must run before createClient — Supabase removes the hash after processing it
if (typeof window !== 'undefined' && (
  window.location.hash.includes('type=invite') ||
  window.location.hash.includes('type=recovery')
)) {
  sessionStorage.setItem('pending_password_setup', 'true');
}

export const supabase = createClient(url, key);
