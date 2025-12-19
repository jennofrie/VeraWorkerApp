import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { ShiftNotesModal } from '@/components/ShiftNotesModal';
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

interface ClockInScreenProps {
  workerId: string | null;
  workerName: string | null;
  workerEmail: string | null;
  onClockIn?: () => void;
  onClockOut?: () => void;
}

export function ClockInScreen({ workerId, workerName, workerEmail, onClockIn, onClockOut }: ClockInScreenProps) {
  const router = useRouter();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shiftDuration, setShiftDuration] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  // Breathing animation for button when clocked in
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);

  useEffect(() => {
    if (isClockedIn) {
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
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
        const shiftId = await AsyncStorage.getItem(STORAGE_KEY);
        if (shiftId && isValidUUID(shiftId)) {
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
              if (data.clock_in_time) {
                setClockInTime(new Date(data.clock_in_time));
              }
            } else {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setCurrentShiftId(null);
              setIsClockedIn(false);
            }
          } catch (dbError) {
            if (__DEV__) {
              console.log('Could not verify shift in database:', dbError);
            }
            await AsyncStorage.removeItem(STORAGE_KEY);
            setCurrentShiftId(null);
            setIsClockedIn(false);
          }
        } else if (shiftId) {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        if (__DEV__) {
          console.log('Could not check shift:', e);
        }
      }
    };

    init();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isClockedIn || !clockInTime) {
      setShiftDuration({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateDuration = () => {
      if (!clockInTime) return;
      const now = new Date();
      const diff = now.getTime() - clockInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setShiftDuration({ hours, minutes, seconds });
    };

    calculateDuration();
    const interval = setInterval(calculateDuration, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isClockedIn, clockInTime]);

  useEffect(() => {
    return () => {
      setShiftDuration({ hours: 0, minutes: 0, seconds: 0 });
    };
  }, []);

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (Platform.OS === 'web') {
      if (__DEV__) {
        console.log('Location service not available on web platform');
      }
      return null;
    }

    try {
      if (!Location || typeof Location.getCurrentPositionAsync !== 'function') {
        if (__DEV__) {
          console.log('Location service not available on this device');
        }
        return null;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        if (__DEV__) {
          console.log('Location services are disabled on this device');
        }
        return null;
      }

      let permissionStatus;
      try {
        permissionStatus = await Location.getForegroundPermissionsAsync();
      } catch (permError) {
        if (__DEV__) {
          console.error('Error checking location permissions:', permError);
        }
        return null;
      }

      let { status } = permissionStatus;
      
      if (status === 'denied') {
        if (__DEV__) {
          console.log('Location permission permanently denied');
        }
        return null;
      }

      if (status !== 'granted') {
        try {
          const permissionResponse = await Location.requestForegroundPermissionsAsync();
          status = permissionResponse.status;
          
          if (status !== 'granted') {
            if (__DEV__) {
              console.log('Location permission denied by user');
            }
            return null;
          }
        } catch (requestError) {
          if (__DEV__) {
            console.error('Error requesting location permission:', requestError);
          }
          return null;
        }
      }

      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location request timeout')), 8000)
          )
        ]) as Location.LocationObject;

        if (!location || !location.coords) {
          if (__DEV__) {
            console.log('Invalid location data received');
          }
          return null;
        }

        const { latitude, longitude } = location.coords;

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
          if (__DEV__) {
            console.log('Invalid coordinates received:', { latitude, longitude });
          }
          return null;
        }

        return {
          lat: latitude,
          lng: longitude,
        };
      } catch (locationError: any) {
        if (__DEV__) {
          if (locationError.message === 'Location request timeout') {
            console.log('Location request timed out after 8 seconds');
          } else {
            console.error('Error getting location:', locationError);
          }
        }
        return null;
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Unexpected error in getCurrentLocation:', error);
      }
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!workerId) {
      Alert.alert('Login Required', 'Please login to start your shift');
      return;
    }

    if (!isValidUUID(workerId)) {
      Alert.alert(
        'Invalid Worker ID',
        'Worker ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000).\n\nPlease check your Worker ID and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!workerEmail) {
      Alert.alert(
        'Login Required',
        'Worker email not found. Please login again.',
        [
          { text: 'OK', onPress: () => {
            router.replace('/');
          }}
        ]
      );
      return;
    }

    try {
      const workerResult = await retryOperation(
        async () => {
          let queryResult = await supabase
            .from('workers')
            .select('id, name, email')
            .eq('email', workerEmail)
            .single();
          
          if (queryResult.error && (queryResult.error.code === 'PGRST301' || queryResult.error.message?.includes('permission denied'))) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await new Promise(resolve => setTimeout(resolve, 200));
              queryResult = await supabase
                .from('workers')
                .select('id, name, email')
                .eq('email', workerEmail)
                .single();
            }
          }
          
          if (queryResult.error) throw queryResult.error;
          return queryResult;
        },
        { maxRetries: 2, initialDelay: 500 }
      );

      const { data: workerData, error: workerError } = workerResult;

      if (workerError || !workerData) {
        if (__DEV__) {
          console.error('Worker verification error:', workerError);
        }
        
        if (workerError?.code === 'PGRST301' || workerError?.message?.includes('permission denied') || workerError?.message?.includes('403')) {
          Alert.alert(
            'Permission Error',
            'Unable to verify worker account. Please check your RLS policies in Supabase.',
            [
              { text: 'OK', onPress: () => {
                router.replace('/');
              }}
            ]
          );
        } else {
          Alert.alert(
            'Worker Not Found',
            'Your worker account was not found in the database. Please login again.',
            [
              { text: 'OK', onPress: () => {
                router.replace('/');
              }}
            ]
          );
        }
        return;
      }

      if (workerData.id !== workerId) {
        if (__DEV__) {
          console.warn('Worker ID mismatch - updating stored ID');
        }
        await AsyncStorage.setItem(WORKER_ID_KEY, workerData.id);
      }
    } catch (verifyError: any) {
      if (__DEV__) {
        console.error('Error verifying worker:', verifyError);
      }
      const errorMessage = isNetworkError(verifyError)
        ? 'Network connection issue. Please check your internet and try again.'
        : 'Failed to verify your worker account. Please try again.';
      Alert.alert('Verification Error', errorMessage, [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      const location = await getCurrentLocation();

      const shiftResult = await retryOperation(
        async () => {
          let shiftData: any = {
            worker_id: workerId,
            clock_in_time: new Date().toISOString(),
          };

          if (location) {
            shiftData.clock_in_lat = location.lat;
            shiftData.clock_in_lng = location.lng;
          }

          let result = await supabase
            .from('shifts')
            .insert(shiftData)
            .select()
            .single();

          if (result.error && (result.error.message?.includes('clock_in_lat') || result.error.message?.includes('clock_in_lng') || result.error.code === '42703')) {
            if (__DEV__) {
              console.log('Location columns not found, retrying without location');
            }
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
          shouldRetry: (err) => isNetworkError(err) || (err?.code && ['08000', '08003', '08006', '08001'].includes(err.code)),
        }
      );

      const { data, error } = shiftResult;

      if (error) {
        if (__DEV__) {
          console.error('Supabase error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        
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
        onClockIn?.();
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error clocking in:', error);
      }
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

    if (!notes || !notes.trim()) {
      Alert.alert('Shift Notes Required!', 'Please add shift notes before clocking out.');
      return;
    }

    setIsLoading(true);
    try {
      const location = await getCurrentLocation();

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

      const updateResult = await retryOperation(
        async () => {
          let updateData: any = {
            clock_out_time: now.toISOString(),
            shift_duration: durationFormatted,
          };

          if (notes && notes.trim()) {
            updateData.shift_notes = notes.trim();
          }

          if (location) {
            updateData.clock_out_lat = location.lat;
            updateData.clock_out_lng = location.lng;
          }

          let result = await supabase
            .from('shifts')
            .update(updateData)
            .eq('id', currentShiftId);

          if (result.error && (result.error.message?.includes('clock_out_lat') || result.error.message?.includes('clock_out_lng') || result.error.message?.includes('shift_duration'))) {
            if (__DEV__) {
              console.log('Some columns not found, retrying with minimal data');
            }
            updateData = {
              clock_out_time: now.toISOString(),
            };
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
          shouldRetry: (err) => isNetworkError(err) || (err?.code && ['08000', '08003', '08006', '08001'].includes(err.code)),
        }
      );

      const { error } = updateResult;

      if (error) {
        if (__DEV__) {
          console.error('Supabase error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        
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

      // Sign out from Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        if (__DEV__) {
          console.error('Error signing out from Supabase:', signOutError);
        }
      }

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
      
      Alert.alert(
        'Success', 
        'Clocked out successfully! You will need to login again to start a new shift.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/');
              onClockOut?.();
            }
          }
        ]
      );
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error clocking out:', error);
      }
      const errorMessage = isNetworkError(error)
        ? getNetworkErrorMessage(error)
        : error.details || error.hint || error.message || 'Failed to clock out. Please try again.';
      Alert.alert('Clock Out Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <ShiftNotesModal
        visible={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSave={handleClockOut}
      />
    </View>
  );
}

/**
 * expo-router requires route files to export a default component.
 * This wrapper keeps the existing `ClockInScreen` (used elsewhere via named import)
 * and satisfies routing to remove warnings and route-table inconsistencies.
 */
export default function ClockInRoute() {
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [id, name, email] = await AsyncStorage.multiGet([
          WORKER_ID_KEY,
          '@veralink:workerName',
          '@veralink:workerEmail',
        ]);
        if (!isMounted) return;
        setWorkerId(id[1] || null);
        setWorkerName(name[1] || null);
        setWorkerEmail(email[1] || null);
      } finally {
        if (isMounted) setIsHydrating(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isHydrating) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5B9BD5" />
      </View>
    );
  }

  return <ClockInScreen workerId={workerId} workerName={workerName} workerEmail={workerEmail} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  circleButton: {},
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
  workerInfoText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    color: '#FFFFFF',
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
  loader: {
    marginTop: 20,
  },
});

