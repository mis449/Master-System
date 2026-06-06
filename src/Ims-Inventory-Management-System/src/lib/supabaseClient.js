import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configurations are missing in environmental variables.');
}

// Synchronously wipe the invalid auth token before the client even initializes
try {
  localStorage.removeItem('sb-iyvbjmecoihcqfzyhkgq-auth-token');
} catch (e) {
  // Ignore
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
