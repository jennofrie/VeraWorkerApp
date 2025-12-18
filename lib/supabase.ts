import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey.length > 20; // Basic validation

if (!hasValidConfig) {
  const missingVars = [];
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey || supabaseAnonKey.length <= 20) {
    missingVars.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  if (__DEV__) {
    console.error(
      `❌ Missing or invalid Supabase environment variables: ${missingVars.join(', ')}\n` +
      `Please create a .env file in the project root with:\n` +
      `EXPO_PUBLIC_SUPABASE_URL=your_supabase_url\n` +
      `EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`
    );
  }
}

// Only use AsyncStorage on native platforms, not web
const storageAdapter = Platform.OS === 'web' ? undefined : AsyncStorage;

// Create Supabase client only if we have valid configuration
// This prevents network timeouts from invalid placeholder URLs
let supabaseInstance: SupabaseClient | null = null;

if (hasValidConfig) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        ...(storageAdapter && { storage: storageAdapter }), // Only set storage on native
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web', // Only detect URL on web
      },
      global: {
        // Add shorter timeout for faster failures (10 seconds for auth, 20 seconds for data)
        // This prevents long waits during app startup
        fetch: (url, options = {}) => {
          const controller = new AbortController();
          // Shorter timeout for auth endpoints (faster startup)
          const isAuthEndpoint = typeof url === 'string' && url.includes('/auth/');
          const timeout = isAuthEndpoint ? 5000 : 20000; // 5s for auth, 20s for data (increased from 15s)
          const timeoutId = setTimeout(() => {
            controller.abort();
            if (__DEV__) {
              console.warn(`[Supabase] Request timeout after ${timeout}ms:`, typeof url === 'string' ? url : 'unknown');
            }
          }, timeout);
          
          return fetch(url, {
            ...options,
            signal: options.signal || controller.signal,
          }).catch((error) => {
            // Provide better error message for AbortError
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
              const timeoutError = new Error('Request timed out. Please check your internet connection.');
              timeoutError.name = 'AbortError';
              throw timeoutError;
            }
            throw error;
          }).finally(() => {
            clearTimeout(timeoutId);
          });
        },
      },
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to create Supabase client:', error);
    }
    supabaseInstance = null;
  }
}

// Export helper to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return supabaseInstance !== null;
};

// Safe helper function to get Supabase client (returns null if not configured)
export const getSupabaseClient = (): SupabaseClient | null => {
  return supabaseInstance;
};

// Safe sign out helper - won't crash if Supabase isn't configured
export const safeSignOut = async (): Promise<{ error: Error | null }> => {
  if (!supabaseInstance) {
    // Supabase not configured, just return success (nothing to sign out from)
    return { error: null };
  }
  try {
    const { error } = await supabaseInstance.auth.signOut();
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    if (__DEV__) {
      console.error('Error during sign out:', err);
    }
    return { error: err instanceof Error ? err : new Error('Sign out failed') };
  }
};

// Export the Supabase client
// IMPORTANT: Always check isSupabaseConfigured() before using this client
// If configuration is invalid, this will throw an error when accessed
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!supabaseInstance) {
      throw new Error(
        'Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }
    return (supabaseInstance as any)[prop];
  },
});

