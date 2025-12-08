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
      const storedWorkerId = await AsyncStorage.getItem(WORKER_ID_KEY);
      const storedWorkerName = await AsyncStorage.getItem('@veralink:workerName');
      const storedWorkerEmail = await AsyncStorage.getItem('@veralink:workerEmail');

      if (storedWorkerId && storedWorkerName && storedWorkerEmail) {
        if (isValidUUID(storedWorkerId)) {
          // User is already logged in, navigate to tabs
          router.replace('/(tabs)');
          return;
        } else {
          // Invalid UUID, clear it
          await AsyncStorage.multiRemove([WORKER_ID_KEY, '@veralink:workerName', '@veralink:workerEmail']);
        }
      }
      // No valid credentials, show login
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking auth:', error);
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
      
      // FIRST: Get worker record by email (using anonymous access - avoids RLS timing issues)
      // This query happens before authentication, so it uses anonymous policy
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, name, email')
        .eq('email', trimmedEmail)
        .single();

      if (workerError) {
        console.error('Worker lookup error:', workerError);
        
        // Provide specific error messages
        if (workerError.code === 'PGRST301' || workerError.message?.includes('permission denied') || workerError.message?.includes('403')) {
          setError('Permission denied. Please ensure RLS policy "Allow anonymous reads on workers" exists. See FIX_RLS_POLICIES.sql');
        } else if (workerError.code === 'PGRST116') {
          setError('Worker account not found. Please ensure the worker exists in the workers table with matching email.');
        } else {
          setError(`Database error: ${workerError.message || 'Please contact support.'}`);
        }
        setIsLoading(false);
        return;
      }

      if (!workerData) {
        setError('Worker account not found. Please ensure the worker exists in the workers table.');
        setIsLoading(false);
        return;
      }

      // SECOND: Authenticate with Supabase Auth (after we know worker exists)
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

      // Login successful - store worker info
      await AsyncStorage.multiSet([
        [WORKER_ID_KEY, workerData.id],
        ['@veralink:workerName', workerData.name],
        ['@veralink:workerEmail', workerData.email],
      ]);
      
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
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

            {/* Additional Info */}
            <View style={styles.infoSection}>
              <ThemedText style={styles.infoText}>
                Want to try Vera Link for your business?
              </ThemedText>
              <TouchableOpacity>
                <ThemedText style={styles.linkText}>
                  Start a 7-day free trial{' '}
                  <IconSymbol name="chevron.right" size={14} color="#00D4AA" />
                </ThemedText>
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
  infoSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
