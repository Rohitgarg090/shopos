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
 
export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',                    // secure code exchange flow
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
