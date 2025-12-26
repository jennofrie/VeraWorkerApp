import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Drawer } from '@/components/Drawer';
import { LocationMap } from '@/components/LocationMap';
import { ShiftNotesModal } from '@/components/ShiftNotesModal';
import { SuccessModal } from '@/components/SuccessModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { WorkerSchedule } from '@/types/schedule';

const WORKER_ID_KEY = '@veralink:workerId';

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WorkerSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Extract params - scheduleId is CRITICAL for updates
  const scheduleId = params.scheduleId as string | undefined;
  const clientName = (params.clientName as string) || schedule?.location_name || 'Cooper Gravenall';
  const serviceType = (params.serviceType as string) || 'Personal Care';
  const date = (params.date as string) || schedule?.scheduled_date || '2025-12-08';
  const startTime = (params.startTime as string) || (schedule ? `${schedule.start_time.slice(0, 5)}` : '9:00 AM');
  const endTime = (params.endTime as string) || (schedule ? `${schedule.end_time.slice(0, 5)}` : '5:00 PM');
  const location = (params.location as string) || schedule?.location_address || '512 Harris Street, Ultimo, NSW 2007, Australia';
  
  // Extract coordinates with defaults (Ultimo, Sydney coordinates)
  const latitude = params.latitude ? parseFloat(params.latitude as string) : -33.8825;
  const longitude = params.longitude ? parseFloat(params.longitude as string) : 151.1986;

  // Logout handler - runs outside Modal context for proper navigation
  const handleLogout = () => {
    setDrawerVisible(false);
    router.replace('/');
  };

  // Determine current status
  const currentStatus: 'BOOKED' | 'STARTED' | 'COMPLETED' = schedule?.status || 'BOOKED';
  const isClockedIn = currentStatus === 'STARTED';

  // Format date
  const formattedDate = React.useMemo(() => {
    try {
      const dateObj = new Date(date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayName = dayNames[dateObj.getDay()];
      const month = monthNames[dateObj.getMonth()];
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      return `${dayName} ${month} ${day}${getDaySuffix(day)} ${year}`;
    } catch {
      return 'Monday Dec 8th 2025';
    }
  }, [date]);

  function getDaySuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  // Load worker info and schedule data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load worker info
        const storedId = await AsyncStorage.getItem(WORKER_ID_KEY);
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
        if (storedId) setWorkerId(storedId);
        if (storedName) setWorkerName(storedName);
        if (storedEmail) setWorkerEmail(storedEmail);

        // Load schedule data if scheduleId is provided
        if (scheduleId && isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('worker_schedules')
            .select('*')
            .eq('id', scheduleId)
            .single();

          if (!error && data) {
            setSchedule(data as WorkerSchedule);
          } else if (__DEV__) {
            console.warn('Could not load schedule:', error?.message);
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error loading data:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [scheduleId]);

  // Get current location helper
  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      if (!Location || typeof Location.getCurrentPositionAsync !== 'function') {
        return null;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        return null;
      }

      let permissionStatus;
      try {
        permissionStatus = await Location.getForegroundPermissionsAsync();
      } catch (permError) {
        return null;
      }

      let { status } = permissionStatus;
      if (status === 'denied') {
        return null;
      }

      if (status !== 'granted') {
        try {
          const permissionResponse = await Location.requestForegroundPermissionsAsync();
          status = permissionResponse.status;
          if (status !== 'granted') {
            return null;
          }
        } catch (requestError) {
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

        if (!location?.coords) return null;

        const { latitude, longitude } = location.coords;
        if (
          typeof latitude !== 'number' ||
          typeof longitude !== 'number' ||
          isNaN(latitude) ||
          isNaN(longitude)
        ) {
          return null;
        }

        return { lat: latitude, lng: longitude };
      } catch (locationError: any) {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Clock In handler - updates worker_schedules table
  const handleClockIn = async () => {
    if (!scheduleId) {
      Alert.alert('Error', 'Schedule ID is missing. Cannot clock in.');
      return;
    }

    if (!workerId) {
      Alert.alert('Login Required', 'Please login to start your shift');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert('Configuration Error', 'Supabase is not configured. Please contact support.');
      return;
    }

    setIsProcessing(true);
    try {
      // Get location
      const location = await getCurrentLocation();

      // Update worker_schedules: set actual_start_time and status to 'STARTED'
      const updateData: any = {
        actual_start_time: new Date().toISOString(),
        status: 'STARTED',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('worker_schedules')
        .update(updateData)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.error('Clock in error:', error);
        }
        Alert.alert(
          'Clock In Failed',
          error.message || 'Failed to clock in. Please try again.'
        );
        return;
      }

      // Update local state
      if (data) {
        setSchedule(data as WorkerSchedule);
        // Store schedule ID for tracking
        await AsyncStorage.setItem('@veralink:currentScheduleId', scheduleId);
        
        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error clocking in:', error);
      }
      Alert.alert(
        'Clock In Failed',
        error.message || 'An error occurred. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Clock Out handler - updates worker_schedules table
  const handleClockOut = async (notes: string) => {
    if (!scheduleId) {
      Alert.alert('Error', 'Schedule ID is missing. Cannot clock out.');
      return;
    }

    if (!notes || !notes.trim()) {
      Alert.alert('Shift Notes Required!', 'Please enter shift notes before clocking out.');
      return;
    }

    if (!isSupabaseConfigured()) {
      Alert.alert('Configuration Error', 'Supabase is not configured. Please contact support.');
      return;
    }

    setIsProcessing(true);
    try {
      // Get location
      const location = await getCurrentLocation();

      // Calculate duration if we have actual_start_time
      let durationFormatted = null;
      if (schedule?.actual_start_time) {
        const startTime = new Date(schedule.actual_start_time);
        const endTime = new Date();
        const diff = endTime.getTime() - startTime.getTime();
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        durationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      // Update worker_schedules: set actual_end_time, notes, status to 'COMPLETED'
      const updateData: any = {
        actual_end_time: new Date().toISOString(),
        notes: notes.trim(),
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('worker_schedules')
        .update(updateData)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.error('Clock out error:', error);
        }
        Alert.alert(
          'Clock Out Failed',
          error.message || 'Failed to clock out. Please try again.'
        );
        return;
      }

      // Update local state
      if (data) {
        setSchedule(data as WorkerSchedule);
        // Clear stored schedule ID
        await AsyncStorage.removeItem('@veralink:currentScheduleId');
        
        // Redirect back to schedule list
        router.replace('/');
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error clocking out:', error);
      }
      Alert.alert(
        'Clock Out Failed',
        error.message || 'An error occurred. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewInstructions = () => {
    Alert.alert('Instructions', 'Instructions will be displayed here.');
  };

  const handleShiftForms = () => {
    Alert.alert('Shift Forms', 'Shift related forms will be displayed here.');
  };

  return (
    <LinearGradient
      colors={['#E6F4FE', '#F0F8FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#1F1D2B" weight="regular" />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>
            {clientName} - {serviceType}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5B9BD5" />
            <ThemedText style={styles.loadingText}>Loading shift details...</ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Map Section */}
          <View style={styles.mapWrapper}>
            <LocationMap
              latitude={latitude}
              longitude={longitude}
              address={location}
              height={200}
            />
          </View>

          {/* STAFF Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>STAFF</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <IconSymbol name="person.fill" size={20} color="#5B9BD5" weight="regular" />
              </View>
              <ThemedText style={styles.infoText}>
                {workerName || 'Jessa Mae Boloy Alibuyog'}
              </ThemedText>
            </View>
          </View>

          {/* CLIENT Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>CLIENT</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <IconSymbol name="person.fill" size={20} color="#5B9BD5" weight="regular" />
              </View>
              <ThemedText style={styles.infoText}>{clientName}</ThemedText>
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Details</ThemedText>
            </View>
            
            {/* Date */}
            <View style={styles.detailRow}>
              <IconSymbol name="calendar" size={18} color="#666" weight="regular" />
              <ThemedText style={styles.detailText}>{formattedDate}</ThemedText>
            </View>

            {/* Time */}
            <View style={styles.detailRow}>
              <IconSymbol name="clock" size={18} color="#666" weight="regular" />
              <ThemedText style={styles.detailText}>
                {startTime} - {endTime}
              </ThemedText>
            </View>

            {/* Location */}
            <View style={styles.detailRow}>
              <IconSymbol name="mappin" size={18} color="#666" weight="regular" />
              <ThemedText style={styles.detailText} numberOfLines={2}>
                {location}
              </ThemedText>
              <TouchableOpacity style={styles.navIcon}>
                <IconSymbol name="chevron.right" size={16} color="#5B9BD5" weight="regular" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Instructions Section */}
          <View style={styles.section}>
            <View style={styles.instructionsHeader}>
              <View style={styles.instructionsTitleRow}>
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FF6B6B" weight="regular" />
                <ThemedText style={styles.instructionsTitle}>Instructions</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={handleViewInstructions}
              >
                <ThemedText style={styles.viewButtonText}>View</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shift Related Forms */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.formsRow}
              onPress={handleShiftForms}
            >
              <IconSymbol name="doc.text.fill" size={20} color="#666" weight="regular" />
              <ThemedText style={styles.formsText}>Shift related forms</ThemedText>
              <IconSymbol name="chevron.right" size={16} color="#666" weight="regular" />
            </TouchableOpacity>
          </View>

          </ScrollView>
        )}

        {/* Sticky Footer Button - Only show if not loading */}
        {!isLoading && (
          <View style={styles.footer}>
          {currentStatus === 'BOOKED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.clockInButton]}
              onPress={handleClockIn}
              disabled={isProcessing || !scheduleId}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="clock.fill" size={20} color="#FFFFFF" weight="regular" />
                  <ThemedText style={styles.actionButtonText}>Clock In</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}

          {currentStatus === 'STARTED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.clockOutButton]}
              onPress={() => {
                if (__DEV__) {
                  console.log('Clock Out pressed, opening notes modal');
                }
                setShowNotesModal(true);
              }}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="stop.fill" size={20} color="#FFFFFF" weight="regular" />
                  <ThemedText style={styles.actionButtonText}>Clock Out</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}

          {currentStatus === 'COMPLETED' && (
            <View style={[styles.actionButton, styles.completedButton]}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" weight="regular" />
              <ThemedText style={styles.actionButtonText}>Shift Completed</ThemedText>
            </View>
          )}
          </View>
        )}

        {/* Success Modal */}
        <SuccessModal
          visible={showSuccessModal}
          title="Clock-In Successful"
          message="You have successfully clocked in. Your shift has started."
          onClose={() => setShowSuccessModal(false)}
          autoCloseDelay={3000}
        />

        {/* Shift Notes Modal */}
        <ShiftNotesModal
          visible={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          onSave={handleClockOut}
        />

        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onLogout={handleLogout}
          workerName={workerName}
          workerEmail={workerEmail}
        />
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#1F1D2B',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1D2B',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky footer
  },
  mapWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#1F1D2B',
    flex: 1,
  },
  navIcon: {
    padding: 4,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instructionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1D2B',
  },
  viewButton: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B9BD5',
  },
  formsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formsText: {
    fontSize: 16,
    color: '#1F1D2B',
    flex: 1,
  },
  clockInSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  clockInButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  clockInGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area for iOS
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 56,
  },
  clockInActionButton: {
    backgroundColor: '#00D4AA',
  },
  clockOutButton: {
    backgroundColor: '#FF6B6B',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

