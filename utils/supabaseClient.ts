import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const cloudEnabled = !!(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
