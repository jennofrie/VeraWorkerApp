import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClockInScreen } from './clock-in';
import { Drawer } from '@/components/Drawer';
import { LocationMap } from '@/components/LocationMap';

const WORKER_ID_KEY = '@veralink:workerId';

export default function ClientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerName, setWorkerName] = useState<string | null>(null);
  const [workerEmail, setWorkerEmail] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showClockInScreen, setShowClockInScreen] = useState(false);

  // Extract params with defaults
  const clientName = (params.clientName as string) || 'Cooper Gravenall';
  const serviceType = (params.serviceType as string) || 'Personal Care';
  const date = (params.date as string) || '2025-12-08';
  const startTime = (params.startTime as string) || '9:00 AM';
  const endTime = (params.endTime as string) || '5:00 PM';
  const location = (params.location as string) || '512 Harris Street, Ultimo, NSW 2007, Australia';
  
  // Extract coordinates with defaults (Ultimo, Sydney coordinates)
  const latitude = params.latitude ? parseFloat(params.latitude as string) : -33.8825;
  const longitude = params.longitude ? parseFloat(params.longitude as string) : 151.1986;

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

  useEffect(() => {
    const loadWorkerInfo = async () => {
      try {
        const storedId = await AsyncStorage.getItem(WORKER_ID_KEY);
        const storedName = await AsyncStorage.getItem('@veralink:workerName');
        const storedEmail = await AsyncStorage.getItem('@veralink:workerEmail');
        if (storedId) setWorkerId(storedId);
        if (storedName) setWorkerName(storedName);
        if (storedEmail) setWorkerEmail(storedEmail);

        // Check if already clocked in
        const shiftId = await AsyncStorage.getItem('@veralink:currentShiftId');
        if (shiftId) {
          setIsClockedIn(true);
          setShowClockInScreen(true);
        }
      } catch (error) {
        console.error('Error loading worker info:', error);
      }
    };
    loadWorkerInfo();
  }, []);

  const handleClockIn = () => {
    setIsClockedIn(true);
    setShowClockInScreen(true);
  };

  const handleClockOut = () => {
    setIsClockedIn(false);
    setShowClockInScreen(false);
    router.replace('/(tabs)/');
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

          {/* Clock In/Out Section */}
          <View style={styles.clockInSection}>
            {!isClockedIn ? (
              showClockInScreen ? (
                <View style={styles.clockedInContainer}>
                  <ClockInScreen
                    workerId={workerId}
                    workerName={workerName}
                    workerEmail={workerEmail}
                    onClockIn={() => {
                      setIsClockedIn(true);
                      handleClockIn();
                    }}
                    onClockOut={() => {
                      setIsClockedIn(false);
                      setShowClockInScreen(false);
                      handleClockOut();
                    }}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.clockInButton}
                  onPress={() => {
                    // Show clock in screen - user will click "Start Shift" to clock in
                    setShowClockInScreen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1E3A8A', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.clockInGradient}
                  >
                    <ThemedText style={styles.clockInButtonText}>Clock In</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              )
            ) : (
              <View style={styles.clockedInContainer}>
                <ClockInScreen
                  workerId={workerId}
                  workerName={workerName}
                  workerEmail={workerEmail}
                  onClockIn={() => {
                    setIsClockedIn(true);
                    handleClockIn();
                  }}
                  onClockOut={() => {
                    setIsClockedIn(false);
                    setShowClockInScreen(false);
                    handleClockOut();
                  }}
                />
              </View>
            )}
          </View>
        </ScrollView>

        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
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
    paddingBottom: 20,
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
  clockedInContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

