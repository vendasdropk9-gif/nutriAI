import { createClient } from '@supabase/supabase-js';

// Safe environment variable getter to support both Vite client-side (import.meta.env)
// and Node server-side (process.env)
const getEnvVar = (name: string): string => {
  let val = '';
  try {
    if (name === 'SUPABASE_URL') {
      val = import.meta.env.VITE_SUPABASE_URL || (import.meta.env as any).SUPABASE_URL || '';
    } else if (name === 'SUPABASE_ANON_KEY') {
      val = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta.env as any).SUPABASE_ANON_KEY || '';
    }
  } catch (e) {}

  if (!val && typeof process !== 'undefined' && process.env) {
    val = (process.env[`VITE_${name}`] || process.env[name] || '') as string;
  }
  return (val || '').trim().replace(/^["']|["']$/g, '');
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');

// A valid Supabase anon key must be present, must NOT equal the URL, and must start with "eyJ" (classic JWT) or "sb_" (new publishable key format)
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseAnonKey.startsWith('http') &&
  (supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.startsWith('sb_'))
);

if (!isSupabaseConfigured) {
  if (supabaseUrl && supabaseAnonKey && (supabaseAnonKey.startsWith('http') || (!supabaseAnonKey.startsWith('eyJ') && !supabaseAnonKey.startsWith('sb_')))) {
    console.error(
      'CRITICAL CONFIGURATION ERROR: The Supabase API key (SUPABASE_ANON_KEY) is INVALID.\n' +
      'It should start with "eyJ" (standard JWT) but is currently set to a URL or a placeholder.\n' +
      'Please check your project Secrets/Environment variables settings.\n' +
      'To prevent crashes, the application will automatically fall back to an in-memory/localStorage database.'
    );
  } else {
    console.warn(
      'Supabase environment variables (SUPABASE_URL / SUPABASE_ANON_KEY) are not set.\n' +
      'The application will automatically fall back to an in-memory/localStorage database.'
    );
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('Supabase connection error:', error.message);
      return false;
    }
    console.log('Supabase successfully connected!');
    return true;
  } catch (err) {
    console.error('Failed to connect to Supabase:', err);
    return false;
  }
}
