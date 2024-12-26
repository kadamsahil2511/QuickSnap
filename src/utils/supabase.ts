import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { LocalStorage } from './storage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const getStorageProvider = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Using local storage fallback - Supabase environment variables not configured');
    return LocalStorage;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  // Return Supabase storage implementation here when ready
  return LocalStorage; // Temporary fallback
};

export const storage = getStorageProvider();