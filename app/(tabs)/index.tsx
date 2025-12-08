import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ShiftNotesModal } from '@/components/ShiftNotesModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { retryOperation, isNetworkError, isSupabaseError } from '@/lib/utils/retry';
import { getNetworkErrorMessage } from '@/lib/utils/network';

const BUTTON_SIZE = 250;
const STORAGE_KEY = '@veralink:currentShiftId';
const WORKER_ID_KEY = '@veralink:workerId';

// UUID validation helper
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
};

export default function HomeScreen() {
  const router = useRouter();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftDuration, setShiftDuration] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  // Breathing animation for button when clocked in
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);

  useEffect(() => {
    if (isClockedIn) {
      // Breathing pulse animation
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      // Glow pulse animation
      buttonGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      buttonScale.value = withTiming(1, { duration: 300 });
      buttonGlow.value = withTiming(0, { duration: 300 });
    }
  }, [isClockedIn]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: buttonGlow.value,
    transform: [{ scale: 1 + buttonGlow.value * 0.1 }],
  }));

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        // Load worker ID and validate it
        try {
          const storedWorkerId = await AsyncStorage.getItem(WORKER_ID_KEY);
          const storedWorkerName = await AsyncStorage.getItem('@veralink:workerName');
          const storedWorkerEmail = await AsyncStorage.getItem('@veralink:workerEmail');
          
          if (storedWorkerId && storedWorkerName && storedWorkerEmail) {
            // Validate UUID format - clear if invalid
            if (isValidUUID(storedWorkerId)) {
              setWorkerId(storedWorkerId);
              setWorkerName(storedWorkerName);
              setWorkerEmail(storedWorkerEmail);
            } else {
              console.log('Invalid UUID stored, clearing it');
              await AsyncStorage.multiRemove([WORKER_ID_KEY, '@veralink:workerName', '@veralink:workerEmail']);
            }
          }
        } catch (e) {
          console.log('Could not load worker ID:', e);
        }

        // Check for existing shift
        try {
          const shiftId = await AsyncStorage.getItem(STORAGE_KEY);
          if (shiftId && isValidUUID(shiftId)) {
            // Verify shift still exists in database with retry logic
            try {
              const result = await retryOperation(
                async () => {
                  const queryResult = await supabase
                    .from('shifts')
                    .select('id, clock_out_time, clock_in_time')
                    .eq('id', shiftId)
                    .single();
                  
                  if (queryResult.error) throw queryResult.error;
                  return queryResult;
                },
                { maxRetries: 2, initialDelay: 500 }
              );

              const { data, error } = result;

              if (!error && data && !data.clock_out_time) {
                setCurrentShiftId(shiftId);
                setIsClockedIn(true);
                // Restore clock-in time for timer
                if (data.clock_in_time) {
                  setClockInTime(new Date(data.clock_in_time));
                }
              } else {
                // Shift completed or doesn't exist, clear storage
                await AsyncStorage.removeItem(STORAGE_KEY);
                setCurrentShiftId(null);
                setIsClockedIn(false);
              }
            } catch (dbError) {
              console.log('Could not verify shift in database:', dbError);
              // Don't assume shift is active if verification fails
              // Clear the stored shift ID to prevent orphaned state
              await AsyncStorage.removeItem(STORAGE_KEY);
              setCurrentShiftId(null);
              setIsClockedIn(false);
            }
          } else if (shiftId) {
            // Invalid UUID stored, clear it
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        } catch (e) {
          console.log('Could not check shift:', e);
        }
      } catch (e) {
        console.error('Init error:', e);
        setError('Initialization error');
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // Timer effect - updates every second when clocked in
  useEffect(() => {
    if (!isClockedIn || !clockInTime) {
      setShiftDuration({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    // Initial calculation
    const calculateDuration = () => {
      if (!clockInTime) return;
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setShiftDuration({ hours, minutes, seconds });
    };

    // Calculate immediately
    calculateDuration();

    // Set up interval
    const interval = setInterval(calculateDuration, 1000);

    // Cleanup function - ensure interval is cleared on unmount or when dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isClockedIn, clockInTime]);

  // Cleanup effect on unmount to ensure timer is stopped
  useEffect(() => {
    return () => {
      // Component is unmounting, ensure all intervals are cleared
      setShiftDuration({ hours: 0, minutes: 0, seconds: 0 });
    };
  }, []);

  const handleWorkerLogin = async (id: string, name: string, email: string) => {
    try {
      setWorkerId(id);
      setWorkerName(name);
      setWorkerEmail(email);
      await AsyncStorage.multiSet([
        [WORKER_ID_KEY, id],
        ['@veralink:workerName', name],
        ['@veralink:workerEmail', email],
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save worker info');
    }
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    // Platform check - Location not available on web
    if (Platform.OS === 'web') {
      console.log('Location service not available on web platform');
      return null;
    }

    try {
      // Check if Location module is available
      if (!Location || typeof Location.getCurrentPositionAsync !== 'function') {
        console.log('Location service not available on this device');
        return null;
      }

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        console.log('Location services are disabled on this device');
        return null;
      }

      // Check current permission status first
      let permissionStatus;
      try {
        permissionStatus = await Location.getForegroundPermissionsAsync();
      } catch (permError) {
        console.error('Error checking location permissions:', permError);
        return null;
      }

      let { status } = permissionStatus;
      
      // If permanently denied, don't request again (iOS/Android behavior)
      if (status === 'denied') {
        console.log('Location permission permanently denied');
        return null;
      }

      // Request permission if not granted
      if (status !== 'granted') {
        try {
          const permissionResponse = await Location.requestForegroundPermissionsAsync();
          status = permissionResponse.status;
          
          if (status !== 'granted') {
            console.log('Location permission denied by user');
            return null;
          }
        } catch (requestError) {
          console.error('Error requesting location permission:', requestError);
          return null;
        }
      }

      // Get location with timeout and better error handling
      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // Optional: update interval
          }),
          // Timeout promise
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location request timeout')), 8000)
          )
        ]) as Location.LocationObject;

        // Validate location data
        if (!location || !location.coords) {
          console.log('Invalid location data received');
          return null;
        }

        const { latitude, longitude } = location.coords;

        // Validate coordinates are valid numbers
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          console.log('Invalid coordinates received:', { latitude, longitude });
          return null;
        }

        return {
          lat: latitude,
          lng: longitude,
        };
      } catch (locationError: any) {
        // Handle timeout and other location errors
        if (locationError.message === 'Location request timeout') {
          console.log('Location request timed out after 8 seconds');
        } else {
          console.error('Error getting location:', locationError);
        }
        return null;
      }
    } catch (error: any) {
      // Catch-all for any unexpected errors
      console.error('Unexpected error in getCurrentLocation:', error);
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!workerId) {
      Alert.alert('Login Required', 'Please login to start your shift');
      return;
    }

    // Validate UUID format
    if (!isValidUUID(workerId)) {
      Alert.alert(
        'Invalid Worker ID',
        'Worker ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000).\n\nPlease check your Worker ID and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verify worker exists in database before clocking in with retry
    try {
      const workerResult = await retryOperation(
        async () => {
          const queryResult = await supabase
            .from('workers')
            .select('id, name, email')
            .eq('id', workerId)
            .single();
          
          if (queryResult.error) throw queryResult.error;
          return queryResult;
        },
        { maxRetries: 2, initialDelay: 500 }
      );

      const { data: workerData, error: workerError } = workerResult;

      if (workerError || !workerData) {
        Alert.alert(
          'Worker Not Found',
          'Your worker account was not found in the database. Please login again.',
          [
            { text: 'OK', onPress: () => {
              setWorkerId(null);
              setWorkerName(null);
              setWorkerEmail(null);
              AsyncStorage.multiRemove([WORKER_ID_KEY, '@veralink:workerName', '@veralink:workerEmail']);
              // User must login - redirect handled by root index
            }}
          ]
        );
        return;
      }
    } catch (verifyError: any) {
      console.error('Error verifying worker:', verifyError);
      const errorMessage = isNetworkError(verifyError)
        ? 'Network connection issue. Please check your internet and try again.'
        : 'Failed to verify your worker account. Please try again.';
      Alert.alert('Verification Error', errorMessage, [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      // Get location (optional - won't fail if unavailable)
      const location = await getCurrentLocation();

      // Save to database with retry logic
      const shiftResult = await retryOperation(
        async () => {
          // Start with required fields only
          let shiftData: any = {
            worker_id: workerId,
            clock_in_time: new Date().toISOString(),
          };

          // Try to insert with location first
          if (location) {
            shiftData.clock_in_lat = location.lat;
            shiftData.clock_in_lng = location.lng;
          }

          let result = await supabase
            .from('shifts')
            .insert(shiftData)
            .select()
            .single();

          // If error is about missing columns, retry without location
          if (result.error && (result.error.message?.includes('clock_in_lat') || result.error.message?.includes('clock_in_lng') || result.error.code === '42703')) {
            console.log('Location columns not found, retrying without location');
            shiftData = {
              worker_id: workerId,
              clock_in_time: new Date().toISOString(),
            };
            result = await supabase
              .from('shifts')
              .insert(shiftData)
              .select()
              .single();
          }

          if (result.error) throw result.error;
          return result;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          shouldRetry: (err) => isNetworkError(err) || (err?.code && ['08000', '08003', '08006', '08001'].includes(err.code)), // SQL connection errors
        }
      );

      const { data, error } = shiftResult;

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Provide context-specific error messages
        let errorMessage: string;
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          errorMessage = 'Database configuration error. Please contact support.';
        } else if (isNetworkError(error)) {
          errorMessage = getNetworkErrorMessage(error);
        } else if (isSupabaseError(error)) {
          errorMessage = error.details || error.hint || error.message || 'Database error. Please try again.';
        } else {
          errorMessage = error.message || 'Failed to clock in. Please try again.';
        }
        
        Alert.alert('Clock In Failed', errorMessage);
        return;
      }

      if (data) {
        setCurrentShiftId(data.id);
        setIsClockedIn(true);
        setClockInTime(new Date(data.clock_in_time));
        await AsyncStorage.setItem(STORAGE_KEY, data.id);
        Alert.alert('Success', 'Clocked in successfully!');
      }
    } catch (error: any) {
      console.error('Error clocking in:', error);
      const errorMessage = isNetworkError(error)
        ? getNetworkErrorMessage(error)
        : error.details || error.hint || error.message || 'Failed to clock in. Please try again.';
      Alert.alert('Clock In Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async (notes: string = '') => {
    if (!currentShiftId) {
      Alert.alert('Error', 'No active shift found.');
      return;
    }

    // Require shift notes
    if (!notes || !notes.trim()) {
      Alert.alert('Shift Notes Required!', 'Please add shift notes before clocking out.');
      return;
    }

    setIsLoading(true);
    try {
      // Get location (optional)
      const location = await getCurrentLocation();

      // Calculate shift duration
      const now = new Date();
      let durationFormatted = '00:00:00';
      if (clockInTime) {
        const diff = now.getTime() - clockInTime.getTime();
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        durationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      // Update shift in database with retry logic
      const updateResult = await retryOperation(
        async () => {
          // Start with required fields
          let updateData: any = {
            clock_out_time: now.toISOString(),
            shift_duration: durationFormatted,
          };

          // Add shift notes if provided
          if (notes && notes.trim()) {
            updateData.shift_notes = notes.trim();
          }

          // Add location if available
          if (location) {
            updateData.clock_out_lat = location.lat;
            updateData.clock_out_lng = location.lng;
          }

          let result = await supabase
            .from('shifts')
            .update(updateData)
            .eq('id', currentShiftId);

          // If error is about missing columns, retry without them
          if (result.error && (result.error.message?.includes('clock_out_lat') || result.error.message?.includes('clock_out_lng') || result.error.message?.includes('shift_duration'))) {
            console.log('Some columns not found, retrying with minimal data');
            updateData = {
              clock_out_time: now.toISOString(),
            };
            // Try to include shift_duration if column exists
            if (!result.error.message?.includes('shift_duration')) {
              updateData.shift_duration = durationFormatted;
            }
            if (notes && notes.trim()) {
              updateData.shift_notes = notes.trim();
            }
            result = await supabase
              .from('shifts')
              .update(updateData)
              .eq('id', currentShiftId);
          }

          if (result.error) throw result.error;
          return result;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          shouldRetry: (err) => isNetworkError(err) || (err?.code && ['08000', '08003', '08006', '08001'].includes(err.code)), // SQL connection errors
        }
      );

      const { error } = updateResult;

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Provide context-specific error messages
        let errorMessage: string;
        if (isNetworkError(error)) {
          errorMessage = getNetworkErrorMessage(error);
        } else if (isSupabaseError(error)) {
          errorMessage = error.details || error.hint || error.message || 'Database error. Please try again.';
        } else {
          errorMessage = error.message || 'Failed to clock out. Please try again.';
        }
        
        Alert.alert('Clock Out Failed', errorMessage);
        return;
      }

      // Clear local storage - remove shift and worker credentials for security
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        WORKER_ID_KEY,
        '@veralink:workerName',
        '@veralink:workerEmail',
      ]);
      setCurrentShiftId(null);
      setIsClockedIn(false);
      setClockInTime(null);
      setShiftDuration({ hours: 0, minutes: 0, seconds: 0 });
      // Clear worker credentials - force re-login for security
      setWorkerId(null);
      setWorkerName(null);
      setWorkerEmail(null);
      Alert.alert('Success', 'Clocked out successfully! You will need to login again to start a new shift.');
      // Navigate back to login screen
      router.replace('/');
    } catch (error: any) {
      console.error('Error clocking out:', error);
      const errorMessage = isNetworkError(error)
        ? getNetworkErrorMessage(error)
        : error.details || error.hint || error.message || 'Failed to clock out. Please try again.';
      Alert.alert('Clock Out Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <LinearGradient
        colors={['#1F1D2B', '#2B2B40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#22B07D" />
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#1F1D2B', '#2B2B40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.centerContent}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setError(null)}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
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
      <View style={styles.content}>
        {/* Header with Sign Out */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ThemedText type="title" style={styles.title}>
              Vera Link Shift
            </ThemedText>
          </View>
          {workerName && (
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={async () => {
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Sign Out',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await AsyncStorage.multiRemove([
                            WORKER_ID_KEY,
                            '@veralink:workerName',
                            '@veralink:workerEmail',
                            STORAGE_KEY,
                          ]);
                          setWorkerId(null);
                          setWorkerName(null);
                          setWorkerEmail(null);
                          setCurrentShiftId(null);
                          setIsClockedIn(false);
                          router.replace('/');
                        } catch (error) {
                          console.error('Error signing out:', error);
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <IconSymbol name="chevron.right" size={20} color="rgba(255, 255, 255, 0.8)" />
            </TouchableOpacity>
          )}
        </View>

        <ThemedText style={[styles.subtitle, isClockedIn && styles.subtitleActive]}>
          {isClockedIn ? 'You are currently clocked in' : 'Ready to start your shift'}
        </ThemedText>

        <View style={styles.buttonContainer}>
          {isClockedIn && (
            <BlurView intensity={80} tint="dark" style={styles.timerBlurContainer}>
              <ThemedText style={styles.timerLabel}>Shift Duration</ThemedText>
              <ThemedText style={styles.timerText}>
                {String(shiftDuration.hours).padStart(2, '0')}:
                {String(shiftDuration.minutes).padStart(2, '0')}:
                {String(shiftDuration.seconds).padStart(2, '0')}
              </ThemedText>
            </BlurView>
          )}
          <View style={styles.buttonWrapper}>
            {/* Glow effect behind button */}
            {isClockedIn && (
              <Animated.View style={[styles.buttonGlow, animatedGlowStyle]} />
            )}
            <Animated.View style={animatedButtonStyle}>
              <TouchableOpacity
                style={[styles.button, styles.circleButton]}
                onPress={() => {
                  if (isClockedIn) {
                    setShowNotesModal(true);
          } else {
                    handleClockIn();
                  }
                }}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isClockedIn ? (
                  <LinearGradient
                    colors={['#FF754C', '#ff5e62']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <ThemedText style={styles.buttonText}>End Shift</ThemedText>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={['#00D4AA', '#00A8CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                  >
                    <ThemedText style={styles.buttonText}>Start Shift</ThemedText>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>


        {workerName && (
          <ThemedText style={styles.workerInfoText}>
            Logged in as: {workerName}
          </ThemedText>
        )}

        {isLoading && (
          <ActivityIndicator size="small" color="#00D4AA" style={styles.loader} />
        )}
      </View>

      <ShiftNotesModal
        visible={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSave={handleClockOut}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 60,
    textAlign: 'center',
    opacity: 0.8,
    color: '#FFFFFF',
  },
  subtitleActive: {
    color: '#22B07D',
    opacity: 1,
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonGlow: {
    position: 'absolute',
    width: BUTTON_SIZE * 1.2,
    height: BUTTON_SIZE * 1.2,
    borderRadius: (BUTTON_SIZE * 1.2) / 2,
    backgroundColor: '#FF754C',
    opacity: 0.3,
    zIndex: -1,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#FF754C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  circleButton: {
    // Additional styles if needed
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  workerIdButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    alignItems: 'center',
  },
  workerIdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  workerInfoText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  timerBlurContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: 220,
    overflow: 'hidden',
  },
  timerLabel: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontVariant: ['tabular-nums'],
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    opacity: 0.6,
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#00D4AA',
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#00D4AA',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
