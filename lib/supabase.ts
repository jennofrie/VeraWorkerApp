import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Supabase Client Configuration
 * 
 * Uses environment variables following Expo convention (EXPO_PUBLIC_ prefix).
 * Required environment variables:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 * 
 * These should be set in a .env file in the project root (not committed to git).
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  console.error(
    `❌ Missing Supabase environment variables: ${missingVars.join(', ')}\n` +
    `Please create a .env file in the project root with:\n` +
    `EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n` +
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`
  );
  
  // In development, warn but continue (allows app to start for UI testing)
  // In production, this should fail fast - consider throwing an error
  if (__DEV__) {
    console.warn('⚠️ Continuing with placeholder values - app may not function correctly');
  }
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

