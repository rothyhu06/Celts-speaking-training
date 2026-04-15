import { createClient } from '@supabase/supabase-js';

// Vercel build will fail if these are undefined during the build step 
// because Vercel CLI does not upload .env.local for security.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
