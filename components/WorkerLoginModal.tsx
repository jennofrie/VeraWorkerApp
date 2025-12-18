import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';

interface WorkerLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: (workerId: string, name: string, email: string) => void;
}

export function WorkerLoginModal({ visible, onClose, onLogin }: WorkerLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 300 });
      setError(null);
      setEmail('');
      setPassword('');
    } else {
      translateY.value = withTiming(500, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handleLogin = async () => {
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
          setError('Permission denied. Please ensure RLS policy "Allow anonymous reads on workers" exists. See SQL/FIX_RLS_POLICIES.sql');
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

      // Worker found and validated, return their UUID
      onLogin(workerData.id, workerData.name, workerData.email);
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      console.error('Error during login:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1F1D2B', '#2B2B40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View style={[styles.modalContainer, animatedStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.blurContent}>
            <View style={styles.handle} />
            <ThemedText type="title" style={styles.title}>
              Worker Login
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your email and password to start your shift
            </ThemedText>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
              autoFocus={Platform.OS === 'android'}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                setError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              onPress={handleLogin}
              style={styles.loginButtonContainer}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#00D4AA', '#00A8CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                <ThemedText style={styles.loginButtonText}>
                  {isLoading ? 'Verifying...' : 'Login & Start Shift'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
          </BlurView>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: Platform.OS === 'android' ? '90%' : '80%',
    minHeight: Platform.OS === 'android' ? 400 : undefined,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 40,
    borderRadius: 30,
  },
  scrollView: {
    maxHeight: Platform.OS === 'android' ? 200 : undefined,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardView: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 87, 87, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 87, 0.3)',
  },
  errorText: {
    color: '#FF5757',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 50,
    color: '#FFFFFF',
  },
  loginButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 16,
  },
});

