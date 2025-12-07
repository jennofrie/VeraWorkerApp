import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
}

// Only use AsyncStorage on native platforms, not web
const storageAdapter = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      ...(storageAdapter && { storage: storageAdapter }), // Only set storage on native
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web', // Only detect URL on web
    },
  }
);

