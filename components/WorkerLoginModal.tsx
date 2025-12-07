import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from './themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface WorkerLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: (workerId: string, name: string, email: string) => void;
}

export function WorkerLoginModal({ visible, onClose, onLogin }: WorkerLoginModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [uuidLast4, setUuidLast4] = useState('');
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
      setName('');
      setUuidLast4('');
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
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedUuid = uuidLast4.trim().toLowerCase();

    if (!trimmedEmail || !trimmedName || !trimmedUuid) {
      setError('Please enter email, name, and UUID last 4 digits');
      return;
    }

    // UUID last 4 validation (must be 4 characters, hexadecimal)
    if (trimmedUuid.length !== 4) {
      setError('UUID must be exactly 4 characters');
      return;
    }

    const uuidRegex = /^[0-9a-f]{4}$/i;
    if (!uuidRegex.test(trimmedUuid)) {
      setError('UUID must be 4 hexadecimal characters (0-9, a-f)');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Name validation (at least 2 characters)
    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Look up worker by email and name (case-insensitive for email, exact match for name)
      const { supabase } = await import('@/lib/supabase');
      const { data, error: lookupError } = await supabase
        .from('workers')
        .select('id, name, email')
        .ilike('email', trimmedEmail.toLowerCase())
        .eq('name', trimmedName)
        .single();

      if (lookupError) {
        console.error('Database lookup error:', lookupError);
        if (lookupError.code === 'PGRST116') {
          // No rows returned
          setError('Worker not found. Please check your email and name match the database.');
        } else {
          setError('Database error. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('Worker not found. Please check your email and name match the database.');
        setIsLoading(false);
        return;
      }

      // Verify the worker exists and is valid
      if (!data.id) {
        setError('Invalid worker data. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Verify UUID last 4 matches
      const trimmedUuid = uuidLast4.trim().toLowerCase();
      if (trimmedUuid.length !== 4) {
        setError('UUID must be exactly 4 characters');
        setIsLoading(false);
        return;
      }

      const workerUuidLast4 = data.id.slice(-4).toLowerCase();
      if (workerUuidLast4 !== trimmedUuid) {
        setError('UUID verification failed. Please check the last 4 digits of your UUID.');
        setIsLoading(false);
        return;
      }

      // Worker found and validated, return their UUID
      onLogin(data.id, data.name, data.email);
      setEmail('');
      setName('');
      setUuidLast4('');
    } catch (err: any) {
      console.error('Error looking up worker:', err);
      setError(err.message || 'Failed to verify worker. Please try again.');
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
              Enter your email, name, and UUID last 4 digits to start your shift
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
              onChangeText={(text) => {
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
              placeholder="Full Name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError(null);
              }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="UUID Last 4 (e.g., 0341)"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={uuidLast4}
              onChangeText={(text) => {
                // Only allow hexadecimal characters, max 4 characters
                const filtered = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 4);
                setUuidLast4(filtered);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={4}
              editable={!isLoading}
              keyboardType="default"
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

