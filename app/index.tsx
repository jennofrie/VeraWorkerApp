import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

const WORKER_ID_KEY = '@veralink:workerId';

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
};

export default function LoginScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // OPTIMIZATION: Check AsyncStorage first (fast, local) before network call
      // This allows UI to show immediately if user has no stored credentials
      const storageKeys = [WORKER_ID_KEY, '@veralink:workerName', '@veralink:workerEmail'];
      const storedData = await AsyncStorage.multiGet(storageKeys);
      const storedWorkerId = storedData[0][1];
      const storedWorkerName = storedData[1][1];
      const storedWorkerEmail = storedData[2][1];

      // If no stored credentials, show login immediately (no network call needed)
      if (!storedWorkerId || !storedWorkerName || !storedWorkerEmail || !isValidUUID(storedWorkerId)) {
        setIsChecking(false);
        return;
      }

      // User has stored credentials, now check Supabase session (with timeout)
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
      
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        if (__DEV__) {
          console.warn('Supabase is not configured. Skipping auth check.');
        }
        // Clear invalid stored data
        await AsyncStorage.multiRemove(storageKeys);
        setIsChecking(false);
        return;
      }
      
      // OPTIMIZATION: Add timeout to session check (5 seconds max)
      // This prevents long waits if network is slow
      let session = null;
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (error) {
          if (__DEV__) {
            console.warn('Error getting session:', error.message);
          }
        } else {
          session = data?.session || null;
        }
      } catch (sessionError: any) {
        // Handle network timeouts and other errors gracefully
        if (__DEV__) {
          console.warn('Session check failed (timeout or network issue):', sessionError.message);
        }
        // Continue without session - user will need to login
      }
      
      // If no session, clear stored data and show login
      if (!session) {
        await AsyncStorage.multiRemove(storageKeys);
        setIsChecking(false);
        return;
      }
      
      // Session exists and we have stored worker data - user is logged in
      if (storedWorkerId && storedWorkerName && storedWorkerEmail && isValidUUID(storedWorkerId)) {
        // User is already logged in, navigate to tabs
        router.replace('/(tabs)');
        return;
      } else {
        // Session exists but no worker data - clear and show login
        await AsyncStorage.multiRemove(storageKeys);
        await supabase.auth.signOut();
      }
      
      // No valid credentials, show login
      setIsChecking(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking auth:', error);
      }
      setIsChecking(false);
    }
  };

  const handleEmailLogin = async () => {
    // Client-side validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter email and password');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Password validation
    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { supabase } = await import('@/lib/supabase');
      
      // FIRST: Authenticate with Supabase Auth (faster - single network call)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (authError || !authData.user) {
        // Provide user-friendly error messages
        if (authError?.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (authError?.message?.includes('Email not confirmed')) {
          setError('Please verify your email before logging in.');
        } else {
          setError(authError?.message || 'Login failed. Please check your credentials and try again.');
        }
        setIsLoading(false);
        return;
      }

      // SECOND: Get worker record by email (now authenticated - uses authenticated RLS policy)
      // This is faster because we're already authenticated
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, name, email')
        .eq('email', trimmedEmail)
        .single();

      if (workerError) {
        if (__DEV__) {
          console.error('Worker lookup error:', workerError);
        }
        
        // Sign out if worker lookup fails
        await supabase.auth.signOut();
        
        // Provide specific error messages
        if (workerError.code === 'PGRST301' || workerError.message?.includes('permission denied') || workerError.message?.includes('403')) {
          setError('Permission denied. Please ensure RLS policy allows authenticated users to read workers.');
        } else if (workerError.code === 'PGRST116') {
          setError('Worker account not found. Please ensure the worker exists in the workers table with matching email.');
        } else {
          setError(`Database error: ${workerError.message || 'Please contact support.'}`);
        }
        setIsLoading(false);
        return;
      }

      if (!workerData) {
        await supabase.auth.signOut();
        setError('Worker account not found. Please ensure the worker exists in the workers table.');
        setIsLoading(false);
        return;
      }

      // Login successful - store worker info
      await AsyncStorage.multiSet([
        [WORKER_ID_KEY, workerData.id],
        ['@veralink:workerName', workerData.name],
        ['@veralink:workerEmail', workerData.email],
      ]);
      
      // Navigate immediately after storing data
      router.replace('/(tabs)');
    } catch (err: any) {
      if (__DEV__) {
        console.error('Login error:', err);
      }
      setError(err.message || 'Login failed. Please try again.');
      // Try to sign out on error
      try {
        const { supabase } = await import('@/lib/supabase');
        await supabase.auth.signOut();
      } catch (signOutErr) {
        if (__DEV__) {
          console.error('Error signing out after login error:', signOutErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };


  if (isChecking) {
    return (
      <LinearGradient
        colors={['#1F1D2B', '#2B2B40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#1F1D2B', '#2B2B40']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.scrollView}
          >
            <View style={styles.contentWrapper}>
              {/* Top Right - Australia */}
              <View style={styles.topBar}>
                <View style={styles.regionContainer}>
                  <ThemedText style={styles.regionText}>Australia</ThemedText>
                  <IconSymbol name="chevron.right" size={16} color="rgba(255, 255, 255, 0.7)" />
                </View>
              </View>

              {/* Logo Section */}
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <ThemedText style={styles.logoText}>Vera Link</ThemedText>
                </View>
              </View>

              {/* Login Form */}
              <View style={styles.formContainer}>
            <ThemedText style={styles.loginTitle}>Login to the app</ThemedText>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleEmailLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Login'}
              </ThemedText>
            </TouchableOpacity>

            {/* Request Access Section */}
            <View style={styles.requestAccessSection}>
              <ThemedText style={styles.requestAccessText}>
                Vera Link is an invite-only platform for NDIS providers.
              </ThemedText>
              <TouchableOpacity
                style={styles.requestAccessButton}
                onPress={() => {
                  const email = 'onboarding@veralink.online';
                  const subject = 'Vera Link Access Request';
                  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
                  Linking.openURL(mailtoUrl).catch((err) => {
                    if (__DEV__) {
                      console.error('Error opening email:', err);
                    }
                  });
                }}
              >
                <ThemedText style={styles.requestAccessButtonText}>
                  Request Access
                </ThemedText>
                <IconSymbol name="envelope" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Legal Links */}
            <View style={styles.legalLinksSection}>
              <TouchableOpacity
                style={styles.legalLink}
                onPress={() => {
                  Linking.openURL('https://veralinkcrm.online/privacy-policy').catch((err) => {
                    if (__DEV__) {
                      console.error('Error opening Privacy Policy:', err);
                    }
                  });
                }}
              >
                <ThemedText style={styles.legalLinkText}>Privacy Policy</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.legalSeparator}>•</ThemedText>
              <TouchableOpacity
                style={styles.legalLink}
                onPress={() => {
                  Linking.openURL('https://veralinkcrm.online/terms-of-service').catch((err) => {
                    if (__DEV__) {
                      console.error('Error opening Terms of Service:', err);
                    }
                  });
                }}
              >
                <ThemedText style={styles.legalLinkText}>Terms of Service</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentWrapper: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 0,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 30,
  },
  regionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  regionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 0,
    zIndex: 100,
    elevation: 100,
    position: 'relative',
  },
  logoContainer: {
    backgroundColor: 'rgba(31, 29, 43, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 101,
    elevation: 101,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    backgroundColor: 'transparent',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 56,
    zIndex: 102,
    elevation: 102,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 87, 87, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 87, 0.5)',
  },
  errorText: {
    color: '#FF5757',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButton: {
    backgroundColor: '#5B9BD5',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  requestAccessSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  requestAccessText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00D4AA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  requestAccessButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  legalLinksSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  legalLink: {
    paddingVertical: 4,
  },
  legalLinkText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
